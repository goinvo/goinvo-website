import { NextResponse } from 'next/server'
import { createSign } from 'node:crypto'

// The SEO opportunities engine. Authenticates as the marketing service account
// (the same one wired for the GA/GSC MCPs), pulls Search Console + GA4, and
// ranks pages/queries by an opportunity score so the marketing dashboard always
// shows "what to fix next". No Google SDK — the SA token is minted from a signed
// JWT with Node crypto, so this adds no dependency. Gated on an env var and
// degrades gracefully (returns configured:false) when it isn't set, matching the
// Semrush pattern in api/marketing/research/run.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GSC_SITE_URL = process.env.GOINVO_GSC_SITE_URL || 'https://www.goinvo.com/'
const GA4_PROPERTY_ID = process.env.GOINVO_GA4_PROPERTY_ID || '321528631'
// Only attribute GA4 key-events from the production host — never localhost /
// *.vercel.app preview sessions (mirrors api/marketing/analytics/ga4-ab).
const GA4_HOST = process.env.GOINVO_GA4_HOST || 'www.goinvo.com'

// Brand queries to exclude from the non-brand opportunity list.
const BRAND_RE = /goinvo|go invo|involution/i

// Position-adjusted expected click-through baseline. A decaying curve of the
// organic CTR a result typically earns at each SERP position — synthesized from
// public position×CTR studies (Advanced Web Ranking / Backlinko-style curves):
// ~28% at #1, ~15% at #2, ~11% at #3, then decaying into the low single digits
// by the bottom of page 1, and ~1% on page 2. These are deliberately
// conservative round numbers, not a precise model — they exist to find queries
// whose ACTUAL CTR sits far below what their position should earn, i.e. "ranks
// but isn't earning the click" → a title/meta rewrite is the cheap fix.
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.28,
  2: 0.15,
  3: 0.11,
  4: 0.08,
  5: 0.06,
  6: 0.05,
  7: 0.04,
  8: 0.035,
  9: 0.03,
  10: 0.025,
}

// Expected CTR for an (averaged, fractional) position. Interpolates between the
// two surrounding integer rungs on page 1; positions past 10 decay toward ~1%.
export function expectedCtrForPosition(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0
  if (position <= 1) return EXPECTED_CTR_BY_POSITION[1]
  if (position >= 10) {
    // Page 2+ floor: gently decay from the #10 value toward ~0.5%.
    if (position >= 20) return 0.005
    const tenth = EXPECTED_CTR_BY_POSITION[10]
    const t = (position - 10) / 10 // 0 at pos 10 → 1 at pos 20
    return tenth + (0.005 - tenth) * t
  }
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const lo = EXPECTED_CTR_BY_POSITION[lower] ?? 0.005
  const hi = EXPECTED_CTR_BY_POSITION[upper] ?? 0.005
  if (lower === upper) return lo
  return lo + (hi - lo) * (position - lower)
}

// A query "ranks but isn't earning the click" when it ranks on page 1 (≤ ~10),
// has enough impressions for the gap to be real, and its actual CTR is far below
// the position baseline. Returns the gap (expected − actual) when it qualifies,
// else null. The thresholds keep this to genuine, high-yield rewrite candidates.
const CTR_GAP_MIN_IMPRESSIONS = 100
const CTR_GAP_MAX_POSITION = 10
const CTR_GAP_MIN_ABSOLUTE = 0.02 // ≥2 pts below expected
const CTR_GAP_MIN_RELATIVE = 0.4 // and earning <60% of expected

export function ctrGapFor(
  position: number,
  ctr: number,
  impressions: number,
): { expectedCtr: number; gap: number; relative: number } | null {
  if (impressions < CTR_GAP_MIN_IMPRESSIONS) return null
  if (!Number.isFinite(position) || position <= 0 || position > CTR_GAP_MAX_POSITION) return null
  const expectedCtr = expectedCtrForPosition(position)
  if (expectedCtr <= 0) return null
  const gap = expectedCtr - ctr
  const relative = gap / expectedCtr // share of the expected click-through being left on the table
  if (gap < CTR_GAP_MIN_ABSOLUTE || relative < CTR_GAP_MIN_RELATIVE) return null
  return { expectedCtr, gap, relative }
}

// A query is junk/scraper noise (not real demand) if it is a boolean-quote
// search or an encyclopedia/name lookup. Long natural-language questions are NOT
// junk — they are answer/snippet opportunities, so length is deliberately not used.
function isJunkQuery(query: string): boolean {
  if (!query) return false
  const quotes = (query.match(/"/g) || []).length
  return quotes >= 2 || /\bwikipedia\b/i.test(query)
}

// Legacy/duplicate URLs (old /features/ + /old/ paths, .html files) are redirect
// candidates, not optimization targets, so they are flagged and demoted.
function isLegacyPath(path: string): boolean {
  return /^\/(features|old)\//.test(path) || path.endsWith('.html')
}

type ServiceAccount = { client_email: string; private_key: string }

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }

type PageOpportunity = {
  path: string
  url: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  pageViews: number
  // GA4 key-events (leads/conversions) attributed to this page. 0 when key
  // events aren't configured yet (see keyEventsConfigured on the response).
  keyEvents: number
  quality: number
  topQuery: string
  topQueries: string[]
  legacy: boolean
  score: number
  fix: 'ranking' | 'ctr' | 'maintain'
  fixHint: string
}

// A page-1 query whose actual CTR is far below its position baseline — a
// title/meta-rewrite quick win.
type CtrGap = {
  query: string
  page: string
  url: string
  impressions: number
  clicks: number
  position: number
  ctr: number
  expectedCtr: number
  // Clicks left on the table per quarter if the page earned its expected CTR.
  gap: number
  missedClicks: number
  score: number
  fixHint: string
}

// A single query that multiple goinvo.com pages compete for — Google has to
// pick which to rank, so impressions/clicks split and no page ranks as well as
// one consolidated page would.
type Cannibalization = {
  query: string
  impressions: number
  clicks: number
  pages: Array<{ path: string; url: string; impressions: number; clicks: number; position: number }>
  bestPosition: number
  score: number
}

type QueryOpportunity = {
  query: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  score: number
  fix: 'ranking' | 'ctr' | 'maintain'
  fixHint: string
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key }
    }
  } catch {
    // fall through
  }
  return null
}

async function getAccessToken(sa: ServiceAccount, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const unsigned = `${header}.${claim}`
  const signature = createSign('RSA-SHA256').update(unsigned).end().sign(sa.private_key).toString('base64url')
  const jwt = `${unsigned}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Google token exchange returned no access_token.')
  return data.access_token
}

async function gscQuery(token: string, body: Record<string, unknown>): Promise<GscRow[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  )
  if (!res.ok) throw new Error(`Search Console query failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as { rows?: GscRow[] }
  return data.rows || []
}

async function ga4PageViews(token: string, startDate: string, endDate: string): Promise<Map<string, number>> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 1000,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GA4 report failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as {
    rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
  }
  const map = new Map<string, number>()
  for (const row of data.rows || []) {
    const path = normalizePath(row.dimensionValues?.[0]?.value || '')
    const views = Number(row.metricValues?.[0]?.value || 0)
    map.set(path, (map.get(path) || 0) + views)
  }
  return map
}

// GA4 key-events (the configured "leads" — contact-form submits, RFP-CTA
// clicks, etc.) by landing page, host-filtered to production. Returns BOTH the
// per-page map and whether any key events came back at all: if the team hasn't
// marked their CTAs as GA4 key events yet, every page reports 0 and the engine
// must keep the demand-only score + flag keyEventsConfigured:false rather than
// silently zeroing everyone's business value. Tries the `keyEvents` metric
// (current GA4 name) and falls back to the legacy `conversions` metric, and the
// `landingPagePlusQueryString` dimension with a `pagePath` fallback.
async function ga4KeyEventsByPage(
  token: string,
  startDate: string,
  endDate: string,
): Promise<{ map: Map<string, number>; configured: boolean }> {
  const metricNames = ['keyEvents', 'conversions']
  const dimensionNames = ['landingPagePlusQueryString', 'pagePath']
  for (const metric of metricNames) {
    for (const dimension of dimensionNames) {
      try {
        const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: dimension }],
            metrics: [{ name: metric }],
            dimensionFilter: {
              filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: GA4_HOST } },
            },
            limit: 1000,
          }),
          cache: 'no-store',
        })
        if (!res.ok) {
          // An unknown-metric/dimension is a 400 — try the next combination
          // rather than failing the whole engine.
          continue
        }
        const data = (await res.json()) as {
          rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
        }
        const map = new Map<string, number>()
        let total = 0
        for (const row of data.rows || []) {
          const path = normalizePath(row.dimensionValues?.[0]?.value || '')
          const count = Number(row.metricValues?.[0]?.value || 0)
          if (!Number.isFinite(count) || count <= 0) continue
          map.set(path, (map.get(path) || 0) + count)
          total += count
        }
        // A successful call with zero key-events across the whole site means the
        // metric exists but nothing is configured/firing — report not-configured.
        return { map, configured: total > 0 }
      } catch {
        // network/parse error on this combo — try the next one
      }
    }
  }
  // Every combination failed → treat as not configured (graceful).
  return { map: new Map<string, number>(), configured: false }
}

// Boost an opportunity score by the page's GA4 key-events (leads). Converting
// pages should outrank pure-traffic pages. Multiplicative with diminishing
// returns so a page with leads can roughly double its score at most, and pages
// with zero leads keep their existing demand score unchanged.
const KEY_EVENT_BOOST_PER_LEAD = 0.15
const KEY_EVENT_BOOST_CAP = 1.0 // at most +100%
export function keyEventBoost(keyEvents: number): number {
  if (!Number.isFinite(keyEvents) || keyEvents <= 0) return 1
  return 1 + Math.min(KEY_EVENT_BOOST_CAP, KEY_EVENT_BOOST_PER_LEAD * Math.log2(1 + keyEvents))
}

// Normalize a page path/URL so the trailing-slash duplicates GSC and GA report
// separately (e.g. /work and /work/) merge into one logical page.
function normalizePath(input: string): string {
  let path = input
  try {
    if (/^https?:\/\//i.test(input)) path = new URL(input).pathname
  } catch {
    // keep input
  }
  const trimmed = path.replace(/^\/+|\/+$/g, '').toLowerCase()
  return trimmed ? `/${trimmed}` : '/'
}

// Page-2 results (positions ~6-20) are the sweet spot: enough demand to matter,
// close enough to move. Already-top results and very deep results score lower.
function positionFactor(position: number): number {
  if (position <= 3) return 0.15
  if (position <= 5) return 0.45
  if (position <= 10) return 1.0
  if (position <= 20) return 0.75
  return 0.3
}

function classifyFix(position: number, ctr: number): { fix: PageOpportunity['fix']; fixHint: string } {
  if (position > 8) {
    return {
      fix: 'ranking',
      fixHint:
        'Ranking problem (page 2). Improve content depth, add an answer block + structured data, fix headings, and consolidate/link to the page.',
    }
  }
  if (ctr < 0.03) {
    return {
      fix: 'ctr',
      fixHint: 'Ranks on page 1 but low click-through. Review the snippet/description and whether the page matches intent.',
    }
  }
  return { fix: 'maintain', fixHint: 'Performing reasonably for its position; monitor.' }
}

// --- Position-adjusted CTR-gap quick wins (no new data) --------------------
// From the [page, query] rows already pulled, find page-1 queries earning far
// fewer clicks than their position should — the cheapest, highest-yield win
// (rewrite the title/meta, leave the ranking alone). One row per (page, query)
// so a designer can act on an exact snippet.
export function buildCtrGaps(rows: GscRow[]): CtrGap[] {
  const gaps: CtrGap[] = []
  for (const row of rows) {
    const path = normalizePath(row.keys?.[0] || '')
    const query = row.keys?.[1] || ''
    if (!query || BRAND_RE.test(query) || isJunkQuery(query)) continue
    if (isLegacyPath(path)) continue
    const impressions = row.impressions || 0
    const clicks = row.clicks || 0
    const position = row.position || 0
    const ctr = impressions > 0 ? clicks / impressions : row.ctr || 0
    const gapInfo = ctrGapFor(position, ctr, impressions)
    if (!gapInfo) continue
    const missedClicks = gapInfo.gap * impressions
    gaps.push({
      query,
      page: path,
      url: `https://www.goinvo.com${path}`,
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      position: Number(position.toFixed(1)),
      ctr: Number(ctr.toFixed(4)),
      expectedCtr: Number(gapInfo.expectedCtr.toFixed(4)),
      gap: Number(gapInfo.gap.toFixed(4)),
      missedClicks: Math.round(missedClicks),
      // Rank by the clicks left on the table — that's the actual upside.
      score: Math.round(missedClicks),
      fixHint:
        `Ranks #${position.toFixed(1)} for "${query}" but only ${(ctr * 100).toFixed(1)}% click through ` +
        `vs ~${(gapInfo.expectedCtr * 100).toFixed(0)}% expected at that position. Rewrite the page title and ` +
        `meta description to match this query's intent and add a benefit/number — leave the ranking alone.`,
    })
  }
  return gaps.sort((a, b) => b.score - a.score)
}

// --- Keyword cannibalization (no new data) ---------------------------------
// From the same [page, query] rows, find queries where MULTIPLE non-legacy
// goinvo.com pages each draw real impressions — Google is splitting the query
// across competing pages, so none ranks as well as one consolidated page would.
const CANNIBAL_MIN_PAGE_IMPRESSIONS = 30 // ignore trace/noise pages for a query
const CANNIBAL_MIN_TOTAL_IMPRESSIONS = 100

export function buildCannibalization(rows: GscRow[]): Cannibalization[] {
  type Acc = { impressions: number; clicks: number; posWeighted: number }
  const byQuery = new Map<string, Map<string, Acc>>()
  for (const row of rows) {
    const path = normalizePath(row.keys?.[0] || '')
    const query = row.keys?.[1] || ''
    if (!query || BRAND_RE.test(query) || isJunkQuery(query)) continue
    if (isLegacyPath(path)) continue
    const impressions = row.impressions || 0
    if (impressions <= 0) continue
    const pages = byQuery.get(query) || new Map<string, Acc>()
    const entry = pages.get(path) || { impressions: 0, clicks: 0, posWeighted: 0 }
    entry.impressions += impressions
    entry.clicks += row.clicks || 0
    entry.posWeighted += (row.position || 0) * impressions
    pages.set(path, entry)
    byQuery.set(query, pages)
  }

  const out: Cannibalization[] = []
  for (const [query, pageMap] of byQuery) {
    const pages = [...pageMap.entries()]
      .filter(([, e]) => e.impressions >= CANNIBAL_MIN_PAGE_IMPRESSIONS)
      .map(([path, e]) => ({
        path,
        url: `https://www.goinvo.com${path}`,
        impressions: Math.round(e.impressions),
        clicks: Math.round(e.clicks),
        position: Number((e.impressions > 0 ? e.posWeighted / e.impressions : 0).toFixed(1)),
      }))
      .sort((a, b) => b.impressions - a.impressions)
    // Cannibalization needs at least two competing pages on the SAME query.
    if (pages.length < 2) continue
    const impressions = pages.reduce((acc, p) => acc + p.impressions, 0)
    if (impressions < CANNIBAL_MIN_TOTAL_IMPRESSIONS) continue
    const clicks = pages.reduce((acc, p) => acc + p.clicks, 0)
    const bestPosition = Math.min(...pages.map((p) => p.position))
    out.push({
      query,
      impressions,
      clicks,
      pages,
      bestPosition: Number(bestPosition.toFixed(1)),
      // Bigger demand + more competing pages = a more valuable consolidation.
      score: Math.round(impressions * pages.length),
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const sa = getServiceAccount()
  if (!sa) {
    return NextResponse.json({
      configured: false,
      message:
        'GOOGLE_SERVICE_ACCOUNT_JSON is not set. Add the marketing service-account JSON to enable live Search Console + GA4 opportunities.',
      pages: [],
      queries: [],
    })
  }

  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 90)
  const startDate = ymd(start)
  const endDate = ymd(today)
  const warnings: string[] = []

  try {
    const token = await getAccessToken(sa, [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ])

    const [pageRows, pageQueryRows, queryRows] = await Promise.all([
      gscQuery(token, { startDate, endDate, dimensions: ['page'], rowLimit: 500 }),
      gscQuery(token, { startDate, endDate, dimensions: ['page', 'query'], rowLimit: 10000 }),
      gscQuery(token, { startDate, endDate, dimensions: ['query'], rowLimit: 1000 }),
    ])

    let pageViews = new Map<string, number>()
    try {
      pageViews = await ga4PageViews(token, ymd(new Date(today.getTime() - 28 * 86400000)), endDate)
    } catch (gaError) {
      warnings.push(`GA4 page views unavailable: ${gaError instanceof Error ? gaError.message : 'unknown error'}`)
    }

    // Business-value signal: GA4 key-events (leads) by landing page over the
    // same 28-day GA window. Graceful — if the team hasn't registered their
    // contact/RFP CTAs as key events, this returns configured:false and every
    // page keeps its pure demand score.
    let keyEvents = new Map<string, number>()
    let keyEventsConfigured = false
    try {
      const ke = await ga4KeyEventsByPage(token, ymd(new Date(today.getTime() - 28 * 86400000)), endDate)
      keyEvents = ke.map
      keyEventsConfigured = ke.configured
    } catch (gaError) {
      warnings.push(`GA4 key-events unavailable: ${gaError instanceof Error ? gaError.message : 'unknown error'}`)
    }
    if (!keyEventsConfigured) {
      warnings.push(
        'GA4 key-events not configured: mark the contact-form / RFP-CTA actions as GA4 key events to rank converting pages higher (business-value boost is off until then).',
      )
    }

    // Accurate per-page totals from the [page] dimension (merging trailing-slash
    // variants into one logical page).
    type PageTotal = { impressions: number; clicks: number; posWeighted: number }
    const pageMap = new Map<string, PageTotal>()
    for (const row of pageRows) {
      const path = normalizePath(row.keys?.[0] || '')
      const impressions = row.impressions || 0
      const entry = pageMap.get(path) || { impressions: 0, clicks: 0, posWeighted: 0 }
      entry.impressions += impressions
      entry.clicks += row.clicks || 0
      entry.posWeighted += (row.position || 0) * impressions
      pageMap.set(path, entry)
    }

    // Demand quality from the [page, query] dimension: what share of a page's
    // impressions comes from junk/scraper queries, plus its top real query.
    type PageQuality = { junk: number; total: number; topQuery: string; topImpr: number; queries: Array<{ query: string; impr: number }> }
    const qualityMap = new Map<string, PageQuality>()
    for (const row of pageQueryRows) {
      const path = normalizePath(row.keys?.[0] || '')
      const query = row.keys?.[1] || ''
      const impressions = row.impressions || 0
      const q = qualityMap.get(path) || { junk: 0, total: 0, topQuery: '', topImpr: 0, queries: [] }
      q.total += impressions
      if (isJunkQuery(query)) {
        q.junk += impressions
      } else {
        if (impressions > q.topImpr) {
          q.topQuery = query
          q.topImpr = impressions
        }
        // Keep the real (non-brand) queries so the dashboard can show a designer
        // exactly which questions to answer on the page.
        if (query && !BRAND_RE.test(query)) q.queries.push({ query, impr: impressions })
      }
      qualityMap.set(path, q)
    }

    const pages: PageOpportunity[] = [...pageMap.entries()]
      .map(([path, e]) => {
        const ctr = e.impressions > 0 ? e.clicks / e.impressions : 0
        const position = e.impressions > 0 ? e.posWeighted / e.impressions : 0
        const q = qualityMap.get(path)
        const quality = q && q.total > 0 ? 1 - q.junk / q.total : 1
        const legacy = isLegacyPath(path)
        const pageKeyEvents = keyEvents.get(path) || 0
        const { fix, fixHint } = classifyFix(position, ctr)
        // Base demand score: impressions × page-2 position × quality, demoted
        // for legacy/duplicate URLs.
        const demandScore = e.impressions * positionFactor(position) * Math.max(0.1, quality) * (legacy ? 0.25 : 1)
        return {
          path,
          url: `https://www.goinvo.com${path}`,
          impressions: Math.round(e.impressions),
          clicks: Math.round(e.clicks),
          ctr: Number(ctr.toFixed(4)),
          position: Number(position.toFixed(1)),
          pageViews: pageViews.get(path) || 0,
          keyEvents: Math.round(pageKeyEvents),
          quality: Number(quality.toFixed(2)),
          topQuery: q?.topQuery || '',
          topQueries: (q?.queries || []).slice().sort((a, b) => b.impr - a.impr).slice(0, 8).map((x) => x.query),
          legacy,
          // Business-value boost: converting pages (GA4 key-events) outrank
          // pure-traffic pages. A no-op when key events aren't configured.
          score: Math.round(demandScore * keyEventBoost(pageKeyEvents)),
          fix,
          fixHint,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)

    const queries: QueryOpportunity[] = queryRows
      .filter((row) => row.keys?.[0] && !BRAND_RE.test(row.keys[0]))
      .map((row) => {
        const impressions = row.impressions || 0
        const ctr = row.ctr || 0
        const position = row.position || 0
        const { fix, fixHint } = classifyFix(position, ctr)
        return {
          query: row.keys![0],
          impressions: Math.round(impressions),
          clicks: Math.round(row.clicks || 0),
          ctr: Number(ctr.toFixed(4)),
          position: Number(position.toFixed(1)),
          score: Math.round(impressions * positionFactor(position)),
          fix,
          fixHint,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)

    // Title/meta-rewrite quick wins + keyword cannibalization, both derived
    // from the [page, query] rows already pulled (no extra API calls).
    const ctrGaps = buildCtrGaps(pageQueryRows).slice(0, 20)
    const cannibalization = buildCannibalization(pageQueryRows).slice(0, 15)

    return NextResponse.json({
      configured: true,
      generatedAt: new Date().toISOString(),
      range: { startDate, endDate },
      site: GSC_SITE_URL,
      keyEventsConfigured,
      pages,
      queries,
      ctrGaps,
      cannibalization,
      warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEO opportunities request failed.'
    console.error('Marketing SEO opportunities failed:', error)
    return NextResponse.json(
      { configured: true, error: message, keyEventsConfigured: false, pages: [], queries: [], ctrGaps: [], cannibalization: [], warnings },
      { status: 500 },
    )
  }
}
