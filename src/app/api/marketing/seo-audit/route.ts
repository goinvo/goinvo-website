import {
  auditPage,
  computeHealthScore,
  type PageAuditResult,
  type SeoFinding,
} from '@/lib/marketing/seoAudit'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  fetchSeoResource,
  readResponseTextLimited,
  SeoTargetError,
  validateSeoTargetUrl,
} from '@/lib/marketing/seoTarget'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

// Phase-1 SEO audit route (see docs/seo-suite-revamp-plan.md). Unlike the
// existing /api/marketing/seo route — which only ranks GSC demand and never
// looks at a page — this one FETCHES and PARSES pages and returns concrete
// findings using the unified SeoFinding model.
//
//   GET ?url=<page>   → audit that single page.
//   GET (no url)      → audit up to ~10 key pages discovered from the sitemap.
//
// Everything degrades gracefully: a single bad URL becomes a finding (auditPage
// never throws) and never fails the whole route.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITEMAP_URL = process.env.GOINVO_SITEMAP_URL || 'https://www.goinvo.com/sitemap.xml'
const MAX_PAGES = 10
const configuredSitemapTimeout = Number(process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 10000)
const SITEMAP_TIMEOUT_MS = Math.min(
  30_000,
  Math.max(1_000, Number.isFinite(configuredSitemapTimeout) ? configuredSitemapTimeout : 10_000),
)
const SEO_QUERY_URL_MAX_CHARS = 2_048
const SEO_KEYWORD_MAX_CHARS = 200
const SEO_LANG_MAX_CHARS = 16
const AUDIT_REPLAY_TTL_MS = 60_000
const AUDIT_CACHE_MAX_ENTRIES = 100

type AuditOptions = NonNullable<Parameters<typeof auditPage>[1]>
const auditInFlight = new Map<string, Promise<PageAuditResult>>()
const paidAuditCache = new Map<string, { expiresAt: number; result: PageAuditResult }>()

function rememberPaidAudit(key: string, result: PageAuditResult): void {
  paidAuditCache.set(key, { expiresAt: Date.now() + AUDIT_REPLAY_TTL_MS, result })
  while (paidAuditCache.size > AUDIT_CACHE_MAX_ENTRIES) {
    const oldest = paidAuditCache.keys().next().value as string | undefined
    if (!oldest) break
    paidAuditCache.delete(oldest)
  }
}

function auditPageOnce(url: string, options: AuditOptions): Promise<PageAuditResult> {
  const key = JSON.stringify([url, options])
  if (options.includeSemanticGap) {
    const cached = paidAuditCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.result)
    if (cached) paidAuditCache.delete(key)
  }
  const existing = auditInFlight.get(key)
  if (existing) return existing
  const pending = auditPage(url, options)
    .then((result) => {
      if (options.includeSemanticGap) rememberPaidAudit(key, result)
      return result
    })
    .finally(() => {
      if (auditInFlight.get(key) === pending) auditInFlight.delete(key)
    })
  auditInFlight.set(key, pending)
  return pending
}

// Prefer high-value pages when capping the sitemap to MAX_PAGES: the homepage,
// then shallow top-level routes (fewer path segments), so a designer sees the
// pages that matter most rather than a random slice of deep article URLs.
function rankSitemapUrl(url: string): number {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // keep raw
  }
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  if (trimmed === '') return 0 // homepage first
  return trimmed.split('/').length // shallower routes rank higher
}

async function fetchSitemapUrls(): Promise<string[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS)
  try {
    const res = await fetchSeoResource(SITEMAP_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)' },
    })
    if (!res.ok) throw new Error(`Sitemap returned ${res.status}`)
    const xml = await readResponseTextLimited(res)
    // Extract <loc> values without a full XML parser (sitemaps are flat).
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim())
    // De-dupe, keep only http(s), and rank by value.
    const unique = [...new Set(locs.filter((u) => /^https?:\/\//i.test(u)))]
    return unique.sort((a, b) => rankSitemapUrl(a) - rankSitemapUrl(b))
  } finally {
    clearTimeout(timeout)
  }
}

// Roll the per-page findings up into a site-level summary. Also back-fills each
// finding's pctSite so a finding can read "affects 30% of audited pages".
function summarize(results: PageAuditResult[]) {
  const totalPages = results.length || 1
  const byCategory: Record<string, number> = {}
  const bySeverity: Record<string, number> = {}
  let scoreSum = 0

  for (const result of results) {
    scoreSum += result.healthScore.score
    for (const finding of result.findings) {
      byCategory[finding.category] = (byCategory[finding.category] || 0) + 1
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1
    }
  }

  // Cross-page spread: how many of the audited pages share each finding id.
  const idToUrls = new Map<string, Set<string>>()
  for (const result of results) {
    for (const finding of result.findings) {
      const set = idToUrls.get(finding.id) || new Set<string>()
      for (const u of finding.affectedUrls) set.add(u)
      idToUrls.set(finding.id, set)
    }
  }
  for (const result of results) {
    for (const finding of result.findings) {
      const affected = idToUrls.get(finding.id)?.size || finding.affectedUrls.length
      finding.urlsAffected = affected
      finding.pctSite = Math.round((affected / totalPages) * 100)
    }
  }

  return {
    byCategory,
    bySeverity,
    avgHealthScore: Math.round(scoreSum / totalPages),
  }
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

  const { searchParams } = new URL(request.url)
  const allowedParams = new Set(['url', 'keyword', 'lang', 'paid'])
  for (const key of searchParams.keys()) {
    if (!allowedParams.has(key)) {
      return privateMarketingJson({ error: `Unknown query parameter \`${key}\`.` }, { status: 400 })
    }
    if (searchParams.getAll(key).length > 1) {
      return privateMarketingJson({ error: `Query parameter \`${key}\` may only be provided once.` }, { status: 400 })
    }
  }
  const requestedUrl = (searchParams.get('url') || '').trim()
  if (requestedUrl.length > SEO_QUERY_URL_MAX_CHARS) {
    return privateMarketingJson({ error: `\`url\` exceeds ${SEO_QUERY_URL_MAX_CHARS} characters.` }, { status: 400 })
  }
  let single = ''
  if (requestedUrl) {
    try {
      single = validateSeoTargetUrl(requestedUrl)
    } catch (error) {
      if (error instanceof SeoTargetError) {
        return privateMarketingJson({ error: error.message }, { status: 400 })
      }
      throw error
    }
  }
  // Optional overrides for the semantic-gap (topical-coverage) check: the target
  // search query and market. When omitted, the keyword is inferred from the
  // page's title / H1 / URL.
  const semanticKeywordRaw = (searchParams.get('keyword') || '').trim()
  const semanticLangRaw = (searchParams.get('lang') || '').trim()
  if (semanticKeywordRaw.length > SEO_KEYWORD_MAX_CHARS || /[\u0000-\u001f\u007f]/.test(semanticKeywordRaw)) {
    return privateMarketingJson({ error: `\`keyword\` must be ${SEO_KEYWORD_MAX_CHARS} printable characters or fewer.` }, { status: 400 })
  }
  if (semanticLangRaw.length > SEO_LANG_MAX_CHARS || (semanticLangRaw && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(semanticLangRaw))) {
    return privateMarketingJson({ error: '`lang` must be a market code such as en-US.' }, { status: 400 })
  }
  const paidRaw = searchParams.get('paid')
  if (paidRaw !== null && paidRaw !== '0' && paidRaw !== '1') {
    return privateMarketingJson({ error: '`paid` must be 0 or 1.' }, { status: 400 })
  }
  const includePaidChecks = paidRaw === '1'
  if (includePaidChecks && !single) {
    return privateMarketingJson({ error: '`paid=1` requires a single approved `url`.' }, { status: 400 })
  }
  if ((semanticKeywordRaw || semanticLangRaw) && !includePaidChecks) {
    return privateMarketingJson({ error: '`keyword` and `lang` require `paid=1`.' }, { status: 400 })
  }
  const semanticKeyword = semanticKeywordRaw || undefined
  const semanticLang = semanticLangRaw || undefined
  const warnings: string[] = []

  // Indexation (GSC URL Inspection) is a slower per-page call to Google, so it
  // is only enabled for the single ?url= mode. The multi-page sweep keeps it
  // OFF to stay under GSC's URL-Inspection rate limits (~2k/day, low QPS).
  const includeIndexation = Boolean(single)
  // AI-crawler access reads the site-wide robots.txt, so it's a once-per-site
  // check — only run it in single-page mode so it shows up exactly once, not
  // re-fetched per page across the multi-page sweep.
  const includeAiCrawlerAccess = Boolean(single)
  // Render-diff (raw HTML vs headless-Chrome rendered DOM) drives the page
  // through Puppeteer, which is far too slow for the multi-page sweep — only
  // enable it for the single ?url= mode.
  const includeRenderDiff = Boolean(single)
  // Core Web Vitals calls Google's PageSpeed Insights API (CrUX field data) —
  // a network round-trip with a low keyless quota, so only enable it for the
  // single ?url= mode, never the multi-page sweep.
  const includeCwv = Boolean(single)
  // Conversion-rate checks read GA4 (sessions + key-events) for the landing
  // page — a per-page network round-trip, and only meaningful on money pages —
  // so only enable it for the single ?url= mode, never the multi-page sweep.
  const includeConversion = Boolean(single)
  // Semantic-gap (topical-coverage) calls TextFocus's paid tf_semantic endpoint
  // per page, so only enable it for the single ?url= mode — never the
  // multi-page sweep, which would spend credits on every page.
  const includeSemanticGap = Boolean(single && includePaidChecks)
  if (single) {
    warnings.push('Indexation (GSC URL Inspection) is included for single-page audits.')
    warnings.push('AI-crawler access (robots.txt) and llms.txt are included for single-page audits.')
    warnings.push('Render check (raw HTML vs rendered page) is included for single-page audits.')
    warnings.push('Core Web Vitals (PageSpeed Insights — real-user field data) is included for single-page audits.')
    warnings.push('Conversion-rate checks (GA4 conversion rate + form/CTA design) are included for single-page audits on money pages.')
    warnings.push(includeSemanticGap
      ? 'Semantic-gap / topical-coverage is included and uses one paid TextFocus credit; pass &keyword= to set the target query.'
      : 'Semantic-gap / topical-coverage is off by default because it uses one paid TextFocus credit; pass &paid=1 to opt in.')
  } else {
    warnings.push(
      'Indexation (GSC URL Inspection) is disabled for the multi-page sweep to respect Search Console rate limits; pass ?url=<page> to include it.',
    )
    warnings.push(
      'AI-crawler access (robots.txt) and llms.txt are site-wide checks; pass ?url=<page> to include them once.',
    )
    warnings.push(
      'Conversion-rate checks (GA4) are a per-page money-page call; pass ?url=<page> to include them.',
    )
    warnings.push(
      'Render check (raw HTML vs rendered page) uses headless Chrome and is too slow for the sweep; pass ?url=<page> to include it.',
    )
    warnings.push(
      'Core Web Vitals (PageSpeed Insights) is a per-page API call with a low keyless quota; pass ?url=<page> to include it.',
    )
    warnings.push(
      'Semantic-gap / topical-coverage (TextFocus) is a paid per-page call and stays off during sweeps.',
    )
  }

  let targets: string[]
  if (single) {
    targets = [single]
  } else {
    try {
      const all = await fetchSitemapUrls()
      if (all.length > MAX_PAGES) {
        console.warn(
          `Marketing SEO audit: sitemap has ${all.length} URLs; capping to the top ${MAX_PAGES} key pages.`,
        )
        warnings.push(`Sitemap has ${all.length} URLs; audited the top ${MAX_PAGES} key pages.`)
      }
      targets = all.slice(0, MAX_PAGES)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      console.error('Marketing SEO audit: sitemap fetch failed:', error)
      return privateMarketingJson({
        generatedAt: new Date().toISOString(),
        sitemap: SITEMAP_URL,
        error: `Could not load the sitemap (${reason}). Pass ?url=<page> to audit a single page.`,
        results: [],
        summary: { byCategory: {}, bySeverity: {}, avgHealthScore: 0 },
        warnings,
      })
    }
  }

  if (targets.length === 0) {
    return privateMarketingJson({
      generatedAt: new Date().toISOString(),
      sitemap: single ? undefined : SITEMAP_URL,
      results: [],
      summary: { byCategory: {}, bySeverity: {}, avgHealthScore: 0 },
      warnings: single ? warnings : [...warnings, 'No URLs found in the sitemap.'],
    })
  }

  // Audit pages in parallel; auditPage never throws, but guard anyway so one
  // unexpected failure can't take down the route.
  const results = await Promise.all(
    targets.map(async (url): Promise<PageAuditResult> => {
      try {
        return await auditPageOnce(url, { includeIndexation, includeAiCrawlerAccess, includeRenderDiff, includeCwv, includeConversion, includeSemanticGap, semanticKeyword, semanticLang })
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error'
        const finding: SeoFinding = {
          id: 'technical:audit-failed',
          category: 'technical',
          severity: 'error',
          priorityWeight: 10,
          urlsAffected: 1,
          pctSite: 0,
          indexable: false,
          what: `Auditing this page failed unexpectedly (${reason}).`,
          why: 'The audit could not complete for this URL, so its findings are unknown.',
          howToFix: `Retry the audit for ${url}; if it keeps failing, check the page loads and returns HTML.`,
          affectedUrls: [url],
          source: 'html-parse',
          status: 'open',
          detectedAt: new Date().toISOString(),
        }
        return { url, findings: [finding], healthScore: computeHealthScore([finding], 1) }
      }
    }),
  )

  const summary = summarize(results)

  return privateMarketingJson({
    generatedAt: new Date().toISOString(),
    sitemap: single ? undefined : SITEMAP_URL,
    results,
    summary,
    warnings,
  })
}
