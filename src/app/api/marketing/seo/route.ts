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

// Brand queries to exclude from the non-brand opportunity list.
const BRAND_RE = /goinvo|go invo|involution/i

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
  quality: number
  topQuery: string
  topQueries: string[]
  legacy: boolean
  score: number
  fix: 'ranking' | 'ctr' | 'maintain'
  fixHint: string
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
        const { fix, fixHint } = classifyFix(position, ctr)
        return {
          path,
          url: `https://www.goinvo.com${path}`,
          impressions: Math.round(e.impressions),
          clicks: Math.round(e.clicks),
          ctr: Number(ctr.toFixed(4)),
          position: Number(position.toFixed(1)),
          pageViews: pageViews.get(path) || 0,
          quality: Number(quality.toFixed(2)),
          topQuery: q?.topQuery || '',
          topQueries: (q?.queries || []).slice().sort((a, b) => b.impr - a.impr).slice(0, 8).map((x) => x.query),
          legacy,
          // Demote pages that only rank for junk queries, and legacy/duplicate
          // URLs (redirect candidates, not optimization targets).
          score: Math.round(e.impressions * positionFactor(position) * Math.max(0.1, quality) * (legacy ? 0.25 : 1)),
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

    return NextResponse.json({
      configured: true,
      generatedAt: new Date().toISOString(),
      range: { startDate, endDate },
      site: GSC_SITE_URL,
      pages,
      queries,
      warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEO opportunities request failed.'
    console.error('Marketing SEO opportunities failed:', error)
    return NextResponse.json({ configured: true, error: message, pages: [], queries: [], warnings }, { status: 500 })
  }
}
