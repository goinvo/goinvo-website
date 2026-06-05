import { NextResponse } from 'next/server'
import {
  auditPage,
  computeHealthScore,
  type PageAuditResult,
  type SeoFinding,
} from '@/lib/marketing/seoAudit'

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
const SITEMAP_TIMEOUT_MS = Number(process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 10000)

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
    const res = await fetch(SITEMAP_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)' },
    })
    if (!res.ok) throw new Error(`Sitemap returned ${res.status}`)
    const xml = await res.text()
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
  const { searchParams } = new URL(request.url)
  const single = (searchParams.get('url') || '').trim()
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
  if (single) {
    warnings.push('Indexation (GSC URL Inspection) is included for single-page audits.')
    warnings.push('AI-crawler access (robots.txt) is included for single-page audits.')
    warnings.push('Render check (raw HTML vs rendered page) is included for single-page audits.')
    warnings.push('Core Web Vitals (PageSpeed Insights — real-user field data) is included for single-page audits.')
  } else {
    warnings.push(
      'Indexation (GSC URL Inspection) is disabled for the multi-page sweep to respect Search Console rate limits; pass ?url=<page> to include it.',
    )
    warnings.push(
      'AI-crawler access (robots.txt) is a site-wide check; pass ?url=<page> to include it once.',
    )
    warnings.push(
      'Render check (raw HTML vs rendered page) uses headless Chrome and is too slow for the sweep; pass ?url=<page> to include it.',
    )
    warnings.push(
      'Core Web Vitals (PageSpeed Insights) is a per-page API call with a low keyless quota; pass ?url=<page> to include it.',
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
      return NextResponse.json({
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
    return NextResponse.json({
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
        return await auditPage(url, { includeIndexation, includeAiCrawlerAccess, includeRenderDiff, includeCwv })
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

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    sitemap: single ? undefined : SITEMAP_URL,
    results,
    summary,
    warnings,
  })
}
