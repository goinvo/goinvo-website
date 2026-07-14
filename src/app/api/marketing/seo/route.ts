import { createSign } from 'node:crypto'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { tfKeyword, withTextFocus } from '@/lib/marketing/textfocus'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

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
// *.vercel.app preview sessions.
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
  // TextFocus keyword enrichment (marketingIdea: seo-keyword-enrichment).
  // Present only when TextFocus is healthy AND returned this query in the one
  // batched tf_keyword call; absent (undefined) when TextFocus is down/capped or
  // didn't have the keyword, so the row renders exactly as before. `volume` =
  // monthly search volume, `difficulty` = 0–100 keyword difficulty (higher =
  // harder to rank), `cpc` = paid cost-per-click (TextFocus `cost`).
  volume?: number
  difficulty?: number
  cpc?: number
}

// A page that is losing search ground — its trailing-90d performance has
// declined vs the prior 90d. Each carries a recommended action so a designer
// knows whether to refresh the content, consolidate it, or leave it alone.
type DecayAction = 'refresh' | 'consolidate' | 'leave'
type DecayWatch = {
  path: string
  url: string
  // Recent (trailing ~90d) vs prior (the ~90d before that).
  recentImpressions: number
  priorImpressions: number
  recentClicks: number
  priorClicks: number
  recentPosition: number
  priorPosition: number
  // Signed deltas (negative impressions/clicks = decline; positive position
  // delta = slipped down the SERP, since a bigger position number is worse).
  impressionsDelta: number
  clicksDelta: number
  impressionsPctChange: number
  clicksPctChange: number
  positionDelta: number
  // How many of the three signals (impressions, clicks, position) declined —
  // 2+ is a "sustained" decline, not a single-metric blip.
  decliningSignals: number
  action: DecayAction
  score: number
  fixHint: string
}

// A search-intent class for a non-brand query, from the rule-based heuristic.
type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational'
// The classified profile of one top non-brand query.
type IntentProfileEntry = {
  query: string
  intent: SearchIntent
  // Confidence the heuristic places in the label (matched-pattern strength).
  confidence: number
  // The pattern keyword(s) that drove the classification — keeps it auditable
  // and gives an LLM refinement pass a starting signal.
  signals: string[]
  impressions: number
  clicks: number
  position: number
}
// A query whose intent doesn't match the kind of page currently ranking for it
// (e.g. a commercial query landing on a purely informational article).
type IntentMismatch = {
  query: string
  queryIntent: SearchIntent
  page: string
  url: string
  // The intent the ranking page reads as, from its URL/path shape.
  pageIntent: SearchIntent
  impressions: number
  clicks: number
  position: number
  score: number
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
// per-page map and whether the report request succeeded. A successful report
// with no events is valid zero activity, not a broken connection. Tries the `keyEvents` metric
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
        for (const row of data.rows || []) {
          const path = normalizePath(row.dimensionValues?.[0]?.value || '')
          const count = Number(row.metricValues?.[0]?.value || 0)
          if (!Number.isFinite(count) || count <= 0) continue
          map.set(path, (map.get(path) || 0) + count)
        }
        // A successful report is usable even when the period contains zero
        // events. Zero activity must not be presented as a broken connection.
        return { map, configured: true }
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

// --- TextFocus keyword enrichment (marketingIdea: seo-keyword-enrichment) ----
// Fold third-party keyword volume + difficulty (+ CPC) onto the ranked query
// opportunities so the engine reads "valuable AND winnable", not just "high
// demand in our own GSC". This is ADDITIVE and ENRICHMENT-ONLY: GSC impressions
// stay the primary demand signal; TextFocus is never a hard dependency, and a
// down/capped/misconfigured TextFocus leaves every opportunity exactly as it
// was (no volume/difficulty fields, original score + order). To respect both the
// 1-credit-per-batch economics and the 30-calls/day TextFocus cap, the whole
// refresh makes at most ONE tf_keyword call, batching the top-N queries' primary
// term into the JSON-array form.

// Cap on how many top opportunities we enrich in the single batched call. Keeps
// one refresh to ~1 credit and well under the daily cap; if the list is longer
// we enrich the top slice and log that we capped (we never split into N calls).
const KEYWORD_ENRICH_MAX = 25

// tf_keyword returns a map keyed by the keyword string, each value carrying
// loosely-typed (string OR number) `volume`, `difficulty` and `cost` (CPC).
// Verified live: e.g. { "healthcare design": { volume: 720, difficulty: 37,
// cost: "3.00", ... } }. Values come back as strings in some responses and
// numbers in others, so every field is coerced through Number().
type TfKeywordEntry = { volume?: unknown; difficulty?: unknown; cost?: unknown }
export type KeywordMetrics = { volume?: number; difficulty?: number; cpc?: number }

// Coerce a possibly-string/number/blank field to a finite number, or undefined.
function toFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

// Parse the raw tf_keyword batch payload into a query→metrics map. Tolerant of
// missing/odd shapes (returns an empty map) so a malformed response degrades
// gracefully rather than throwing. Exported for the test.
export function parseKeywordMetrics(raw: unknown): Map<string, KeywordMetrics> {
  const out = new Map<string, KeywordMetrics>()
  if (!raw || typeof raw !== 'object') return out
  for (const [keyword, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const entry = value as TfKeywordEntry
    const metrics: KeywordMetrics = {
      volume: toFiniteNumber(entry.volume),
      difficulty: toFiniteNumber(entry.difficulty),
      cpc: toFiniteNumber(entry.cost),
    }
    if (metrics.volume === undefined && metrics.difficulty === undefined && metrics.cpc === undefined) continue
    out.set(keyword, metrics)
  }
  return out
}

// A MODEST, documented re-rank multiplier from keyword difficulty: a low-
// difficulty keyword is more winnable, so it edges up; a high-difficulty one
// edges down. Bounded to ±~15% so the raw GSC demand still dominates the order
// (the demand score and the raw volume/difficulty stay visible on the row). No
// difficulty → 1 (no change). difficulty is 0..100 (higher = harder); we map it
// to a factor in [0.85, 1.15], centered at the mid-difficulty 50.
const DIFFICULTY_RERANK_SPREAD = 0.15
export function difficultyRerankFactor(difficulty: number | undefined): number {
  if (difficulty === undefined || !Number.isFinite(difficulty)) return 1
  const clamped = Math.max(0, Math.min(100, difficulty))
  // 0 → +spread (easiest, boost), 50 → 0 (neutral), 100 → −spread (hardest).
  return 1 + ((50 - clamped) / 50) * DIFFICULTY_RERANK_SPREAD
}

// Attach { volume, difficulty, cpc } to each opportunity whose primary query
// TextFocus returned, and fold difficulty into the score with the modest factor
// above (re-sorting after). Pure + exported so the test can drive it without the
// network. Opportunities TextFocus didn't cover are returned unchanged.
export function enrichQueriesWithKeywordMetrics(
  queries: QueryOpportunity[],
  metricsByQuery: Map<string, KeywordMetrics>,
): QueryOpportunity[] {
  if (metricsByQuery.size === 0) return queries
  const enriched = queries.map((q) => {
    const m = metricsByQuery.get(q.query)
    if (!m) return q
    return {
      ...q,
      volume: m.volume,
      difficulty: m.difficulty,
      cpc: m.cpc,
      // Modest "winnability" re-rank — keep raw demand (impressions) visible.
      score: Math.round(q.score * difficultyRerankFactor(m.difficulty)),
    }
  })
  // Re-sort so the difficulty adjustment actually reorders the list.
  return enriched.sort((a, b) => b.score - a.score)
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

// --- Content decay / freshness (GSC period comparison) ---------------------
// Compare each page's trailing ~90 days against the prior ~90 days. A page is
// "losing ground" when it has a SUSTAINED decline — 2+ of {impressions, clicks,
// avg-position} moving the wrong way — with enough prior demand for the signal
// to be real. Each watch-list entry carries a recommended action:
//   • refresh     — real demand still exists; rework the content (see copy note)
//   • consolidate — a legacy/duplicate page bleeding out → fold into the live one
//   • leave       — the drop is small or the page never had real demand → monitor
// IMPORTANT copy note (Google's "freshness" signals): the refresh recommendation
// is gated on SUBSTANTIVE content change — new sections, updated data, fresh
// examples — NOT a date bump or a one-line tweak, which Google detects and
// discounts. The fixHint says so explicitly.
const DECAY_MIN_PRIOR_IMPRESSIONS = 100 // ignore pages that never had real demand
const DECAY_MIN_IMPRESSIONS_DROP = 0.2 // ≥20% fewer impressions counts as a decline
const DECAY_MIN_CLICKS_DROP = 0.2 // ≥20% fewer clicks counts as a decline
const DECAY_MIN_POSITION_SLIP = 0.7 // ≥0.7 avg-position worse counts as a slip
const DECAY_MIN_SIGNALS = 2 // need a SUSTAINED (multi-signal) decline, not a blip

// Pick the recommended action for a decaying page from its shape + magnitude.
export function decayActionFor(
  path: string,
  impressionsPctChange: number,
  positionDelta: number,
  decliningSignals: number,
): DecayAction {
  // A legacy/duplicate URL that's fading is a consolidation/redirect target, not
  // a content-refresh candidate — folding it into the live page recovers equity.
  if (isLegacyPath(path)) return 'consolidate'
  // A genuine, sustained decline on a real page → refresh (substantively).
  if (decliningSignals >= DECAY_MIN_SIGNALS && (impressionsPctChange <= -0.3 || positionDelta >= 1)) {
    return 'refresh'
  }
  if (decliningSignals >= DECAY_MIN_SIGNALS) return 'refresh'
  return 'leave'
}

// Build the decay watch-list from the two [page] period pulls (recent + prior).
// Pure + exported so the test can exercise it without the network.
export function buildDecay(recentRows: GscRow[], priorRows: GscRow[]): DecayWatch[] {
  type Tot = { impressions: number; clicks: number; posWeighted: number }
  const fold = (rows: GscRow[]): Map<string, Tot> => {
    const m = new Map<string, Tot>()
    for (const row of rows) {
      const path = normalizePath(row.keys?.[0] || '')
      const impressions = row.impressions || 0
      const entry = m.get(path) || { impressions: 0, clicks: 0, posWeighted: 0 }
      entry.impressions += impressions
      entry.clicks += row.clicks || 0
      entry.posWeighted += (row.position || 0) * impressions
      m.set(path, entry)
    }
    return m
  }
  const recent = fold(recentRows)
  const prior = fold(priorRows)

  const out: DecayWatch[] = []
  for (const [path, p] of prior) {
    // Only judge pages that had REAL demand in the prior window — otherwise a
    // drop from a handful of impressions is noise, not decay.
    if (p.impressions < DECAY_MIN_PRIOR_IMPRESSIONS) continue
    const r = recent.get(path) || { impressions: 0, clicks: 0, posWeighted: 0 }
    const recentPos = r.impressions > 0 ? r.posWeighted / r.impressions : 0
    const priorPos = p.impressions > 0 ? p.posWeighted / p.impressions : 0

    const impressionsDelta = r.impressions - p.impressions
    const clicksDelta = r.clicks - p.clicks
    const impressionsPctChange = p.impressions > 0 ? impressionsDelta / p.impressions : 0
    const clicksPctChange = p.clicks > 0 ? clicksDelta / p.clicks : 0
    // A bigger position number is a worse rank, so a positive delta = slipped.
    const positionDelta = recentPos > 0 ? recentPos - priorPos : 0

    // Count how many of the three signals moved the wrong way past their floor.
    let decliningSignals = 0
    if (impressionsPctChange <= -DECAY_MIN_IMPRESSIONS_DROP) decliningSignals += 1
    if (p.clicks > 0 && clicksPctChange <= -DECAY_MIN_CLICKS_DROP) decliningSignals += 1
    if (recentPos > 0 && positionDelta >= DECAY_MIN_POSITION_SLIP) decliningSignals += 1
    if (decliningSignals < DECAY_MIN_SIGNALS) continue

    const action = decayActionFor(path, impressionsPctChange, positionDelta, decliningSignals)
    const refreshNote =
      'Make a SUBSTANTIVE update — add/rewrite sections, refresh the data and examples, answer new questions — ' +
      'not just a date change or one-line tweak (Google detects and discounts date-only edits).'
    const fixHint =
      action === 'consolidate'
        ? `Legacy/duplicate URL losing ground (impressions ${(impressionsPctChange * 100).toFixed(0)}%). ` +
          '301-redirect it into the live page in redirects.json to recover its link equity rather than reviving it.'
        : action === 'refresh'
          ? `Lost ground over the last 90 days (impressions ${(impressionsPctChange * 100).toFixed(0)}%, ` +
            `position ${positionDelta >= 0 ? '+' : ''}${positionDelta.toFixed(1)}). ${refreshNote}`
          : `Minor softening — monitor; only act if the decline continues. If you do refresh, ${refreshNote.charAt(0).toLowerCase()}${refreshNote.slice(1)}`

    out.push({
      path,
      url: `https://www.goinvo.com${path}`,
      recentImpressions: Math.round(r.impressions),
      priorImpressions: Math.round(p.impressions),
      recentClicks: Math.round(r.clicks),
      priorClicks: Math.round(p.clicks),
      recentPosition: Number(recentPos.toFixed(1)),
      priorPosition: Number(priorPos.toFixed(1)),
      impressionsDelta: Math.round(impressionsDelta),
      clicksDelta: Math.round(clicksDelta),
      impressionsPctChange: Number(impressionsPctChange.toFixed(3)),
      clicksPctChange: Number(clicksPctChange.toFixed(3)),
      positionDelta: Number(positionDelta.toFixed(1)),
      decliningSignals,
      action,
      // Rank by lost impressions × number of declining signals — the biggest,
      // most-sustained losses first. (Negative delta → positive magnitude.)
      score: Math.round(-impressionsDelta * decliningSignals),
      fixHint,
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

// --- Search-intent classification (rule-based heuristic) -------------------
// Classify a non-brand query into one of the four standard search intents using
// documented keyword patterns. Structured as an ordered, weighted ruleset so an
// LLM pass can later refine or override the label while keeping this as the
// cheap, deterministic first pass. Each pattern carries the signal word(s) it
// matched, so the result stays auditable.
//
//   • transactional — ready-to-act: hire, contact, request a quote, pricing/cost,
//     "near me", book/buy. The bottom of the funnel.
//   • commercial    — comparing/evaluating providers: agency, firm, studio,
//     consultancy, services, company, "best", reviews, portfolio, examples.
//   • navigational  — looking for a specific site/brand/known page (login, etc.).
//   • informational — learning: how/what/why/guide/definition/"is …". Default.
//
// Transactional is checked before commercial (a "hire a design agency" query is
// transactional even though it also contains a commercial word).
type IntentRule = { intent: SearchIntent; re: RegExp; confidence: number }
const INTENT_RULES: IntentRule[] = [
  {
    intent: 'transactional',
    re: /\b(hire|hiring|contact|quote|rfp|pricing|price|cost|costs|rates?|budget|book|buy|get a|request|near me|for hire)\b/i,
    confidence: 0.9,
  },
  {
    intent: 'commercial',
    re: /\b(agency|agencies|firm|firms|studio|studios|consultancy|consultant|consultants|company|companies|vendor|provider|providers|services?|solutions?|best|top|reviews?|portfolio|case stud(?:y|ies)|examples?|vs\.?|compare|comparison|alternatives?)\b/i,
    confidence: 0.8,
  },
  {
    intent: 'navigational',
    re: /\b(login|log in|sign in|dashboard|careers?|jobs?|contact page|homepage|official site|\.com)\b/i,
    confidence: 0.75,
  },
  {
    intent: 'informational',
    re: /\b(how|what|why|when|which|who|where|guide|tutorial|tips?|ideas?|examples? of|definition|meaning|explained?|learn|vs|difference|benefits?|types? of)\b/i,
    confidence: 0.7,
  },
]

export function classifyIntent(query: string): { intent: SearchIntent; confidence: number; signals: string[] } {
  const q = (query || '').toLowerCase()
  for (const rule of INTENT_RULES) {
    const match = q.match(rule.re)
    if (match) {
      // Collect the distinct matched signal words (global pass over the pattern).
      const all = q.match(new RegExp(rule.re.source, 'gi')) || [match[0]]
      const signals = [...new Set(all.map((m) => m.trim().toLowerCase()))].slice(0, 4)
      return { intent: rule.intent, confidence: rule.confidence, signals }
    }
  }
  // A long natural-language query with no signal word reads as informational
  // (people researching), a short one as navigational (a brand/name lookup).
  const words = q.split(/\s+/).filter(Boolean).length
  return words >= 3
    ? { intent: 'informational', confidence: 0.4, signals: [] }
    : { intent: 'navigational', confidence: 0.35, signals: [] }
}

// The intent a RANKING PAGE reads as, from its URL/path shape — the cheap
// proxy for "what kind of page is this" without fetching it. Service/contact
// paths read commercial/transactional; article/vision/blog paths read
// informational. Same family as classifyIntent so the two are comparable.
export function pageIntentFromPath(path: string): SearchIntent {
  const p = (path || '').toLowerCase()
  if (/(contact|get-started|request|quote|pricing|rfp)/.test(p)) return 'transactional'
  if (/(services?|work|portfolio|enterprise|consulting|agency|studio|hire)/.test(p)) return 'commercial'
  if (/(vision|article|blog|guide|news|research|about|story|stories)/.test(p)) return 'informational'
  // A short top-level path (e.g. /, /open-source) is hard to call → informational.
  return 'informational'
}

// Two intents "mismatch" when a buy-stage query (commercial/transactional) is
// answered by a purely informational page, or an informational query lands on a
// hard-sell commercial/transactional page. Same-family intents (commercial vs
// transactional) are close enough not to flag.
function intentsMismatch(queryIntent: SearchIntent, pageIntent: SearchIntent): boolean {
  const buyStage = (i: SearchIntent) => i === 'commercial' || i === 'transactional'
  if (buyStage(queryIntent) && pageIntent === 'informational') return true
  if (queryIntent === 'informational' && buyStage(pageIntent)) return true
  return false
}

// Build the per-query intent profile from the [query] rows, and the
// intent-mismatch list from the [page, query] rows (where a query's best
// ranking page disagrees with the query's intent). Both pure + exported.
const INTENT_PROFILE_MIN_IMPRESSIONS = 20
const INTENT_MISMATCH_MIN_IMPRESSIONS = 50

export function buildIntentProfile(queryRows: GscRow[]): IntentProfileEntry[] {
  const out: IntentProfileEntry[] = []
  for (const row of queryRows) {
    const query = row.keys?.[0] || ''
    if (!query || BRAND_RE.test(query) || isJunkQuery(query)) continue
    const impressions = row.impressions || 0
    if (impressions < INTENT_PROFILE_MIN_IMPRESSIONS) continue
    const { intent, confidence, signals } = classifyIntent(query)
    out.push({
      query,
      intent,
      confidence,
      signals,
      impressions: Math.round(impressions),
      clicks: Math.round(row.clicks || 0),
      position: Number((row.position || 0).toFixed(1)),
    })
  }
  return out.sort((a, b) => b.impressions - a.impressions)
}

export function buildIntentMismatches(pageQueryRows: GscRow[]): IntentMismatch[] {
  // For each non-brand query, keep only the single best (most-impressions)
  // ranking page — that's the page Google is actually serving for it.
  type Best = { path: string; impressions: number; clicks: number; posWeighted: number }
  const byQuery = new Map<string, Best>()
  const queryTotals = new Map<string, number>()
  for (const row of pageQueryRows) {
    const path = normalizePath(row.keys?.[0] || '')
    const query = row.keys?.[1] || ''
    if (!query || BRAND_RE.test(query) || isJunkQuery(query)) continue
    if (isLegacyPath(path)) continue
    const impressions = row.impressions || 0
    if (impressions <= 0) continue
    queryTotals.set(query, (queryTotals.get(query) || 0) + impressions)
    const best = byQuery.get(query)
    if (!best || impressions > best.impressions) {
      byQuery.set(query, {
        path,
        impressions,
        clicks: row.clicks || 0,
        posWeighted: (row.position || 0) * impressions,
      })
    }
  }

  const out: IntentMismatch[] = []
  for (const [query, best] of byQuery) {
    const total = queryTotals.get(query) || 0
    if (total < INTENT_MISMATCH_MIN_IMPRESSIONS) continue
    const { intent: queryIntent } = classifyIntent(query)
    const pageIntent = pageIntentFromPath(best.path)
    if (!intentsMismatch(queryIntent, pageIntent)) continue
    const position = best.impressions > 0 ? best.posWeighted / best.impressions : 0
    const buyStageQuery = queryIntent === 'commercial' || queryIntent === 'transactional'
    const fixHint = buyStageQuery
      ? `"${query}" is a ${queryIntent} (buy-stage) query, but it ranks an informational page. ` +
        'Point it at a services/contact page (or add a clear CTA + "work with us" path to this page), ' +
        'and internally link the buy-stage page so Google serves it instead.'
      : `"${query}" is an informational (research-stage) query, but it ranks a ${pageIntent} sales page. ` +
        'Searchers want to learn, not buy yet — add an explainer/guide page for this query and link it, ' +
        'so you capture the research-stage visit and nurture toward the sales page.'
    out.push({
      query,
      queryIntent,
      page: best.path,
      url: `https://www.goinvo.com${best.path}`,
      pageIntent,
      impressions: Math.round(total),
      clicks: Math.round(best.clicks),
      position: Number(position.toFixed(1)),
      // Bigger demand on a mismatched query = a bigger leak to fix.
      score: Math.round(total),
      fixHint,
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: 401 })
    }
    throw error
  }

  // The opportunities list is free to refresh. Keyword volume/difficulty uses
  // one paid TextFocus batch credit and must be explicitly requested by the UI.
  const includeKeywordMetrics = new URL(request.url).searchParams.get('enrich') === '1'

  const sa = getServiceAccount()
  if (!sa) {
    return privateMarketingJson({
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
  // The prior ~90-day window (the 90 days before the trailing window) for the
  // content-decay period comparison. End it the day before `start` so the two
  // windows don't overlap.
  const priorEnd = new Date(start)
  priorEnd.setDate(priorEnd.getDate() - 1)
  const priorStart = new Date(priorEnd)
  priorStart.setDate(priorStart.getDate() - 90)
  const priorStartDate = ymd(priorStart)
  const priorEndDate = ymd(priorEnd)
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

    // Prior-period [page] pull for the content-decay comparison. Graceful: if
    // GSC doesn't have data for the older window (a young property) or the call
    // fails, the decay watch-list is simply empty and the rest of the engine is
    // unaffected.
    let priorPageRows: GscRow[] = []
    try {
      priorPageRows = await gscQuery(token, {
        startDate: priorStartDate,
        endDate: priorEndDate,
        dimensions: ['page'],
        rowLimit: 500,
      })
    } catch (decayError) {
      warnings.push(
        `Content-decay comparison unavailable: ${decayError instanceof Error ? decayError.message : 'unknown error'}`,
      )
    }

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
        'GA4 key-event reporting is unavailable: verify Analytics access and that the contact-form / RFP-CTA actions are marked as key events.',
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

    let queries: QueryOpportunity[] = queryRows
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

    // TextFocus keyword enrichment (marketingIdea: seo-keyword-enrichment).
    // ONE batched tf_keyword call for the top-N opportunities' primary query —
    // credit-efficient (1 credit) and within the 30-calls/day cap. Gated by
    // withTextFocus so a down/capped/misconfigured TextFocus returns the
    // opportunities UNCHANGED (no volume/difficulty, original order). When it's
    // healthy, each covered opportunity gains { volume, difficulty, cpc } and a
    // modest difficulty re-rank (raw GSC demand stays the primary signal).
    if (includeKeywordMetrics && queries.length > 0) {
      const batchTerms = queries.slice(0, KEYWORD_ENRICH_MAX).map((q) => q.query)
      if (queries.length > KEYWORD_ENRICH_MAX) {
        console.warn(
          `SEO keyword enrichment: ${queries.length} query opportunities exceed the ${KEYWORD_ENRICH_MAX}-term batch cap; ` +
            `enriching only the top ${KEYWORD_ENRICH_MAX} in the single tf_keyword call.`,
        )
      }
      queries = await withTextFocus(async () => {
        // Array form → one tf_keyword call returning a keyword→metrics map.
        const raw = await tfKeyword(JSON.stringify(batchTerms), { lang: 'en-US' })
        const metricsByQuery = parseKeywordMetrics(raw)
        return enrichQueriesWithKeywordMetrics(queries, metricsByQuery)
      }, queries)
    }

    // Title/meta-rewrite quick wins + keyword cannibalization, both derived
    // from the [page, query] rows already pulled (no extra API calls).
    const ctrGaps = buildCtrGaps(pageQueryRows).slice(0, 20)
    const cannibalization = buildCannibalization(pageQueryRows).slice(0, 15)

    // Content decay (trailing 90d vs prior 90d, [page] dimension) + search-intent
    // classification (per top non-brand query) and intent mismatches (a query's
    // best ranking page disagreeing with the query's intent). All derived from
    // the rows already pulled — no extra API calls beyond the prior-period one.
    const decay = buildDecay(pageRows, priorPageRows).slice(0, 20)
    const intentProfile = buildIntentProfile(queryRows).slice(0, 50)
    const intentMismatches = buildIntentMismatches(pageQueryRows).slice(0, 20)

    return privateMarketingJson({
      configured: true,
      generatedAt: new Date().toISOString(),
      range: { startDate, endDate },
      priorRange: { startDate: priorStartDate, endDate: priorEndDate },
      site: GSC_SITE_URL,
      keyEventsConfigured,
      pages,
      queries,
      ctrGaps,
      cannibalization,
      decay,
      intentProfile,
      intentMismatches,
      warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEO opportunities request failed.'
    console.error('Marketing SEO opportunities failed:', error)
    return privateMarketingJson(
      {
        configured: true,
        error: message,
        keyEventsConfigured: false,
        pages: [],
        queries: [],
        ctrGaps: [],
        cannibalization: [],
        decay: [],
        intentProfile: [],
        intentMismatches: [],
        warnings,
      },
      { status: 500 },
    )
  }
}
