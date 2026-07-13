import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { crawlSite, SEO_CRAWL_HARD_MAX_PAGES } from '@/lib/marketing/seoCrawl'
import { SeoTargetError, validateSeoTargetUrl } from '@/lib/marketing/seoTarget'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

// Phase-2 site-crawl route (see docs/seo-suite-revamp-plan.md §12 "Site-graph
// crawl" + "Sitemap↔indexed↔crawled coverage reconciliation"). This is the
// Technical persona's crawl-graph unlock: unlike the per-page /api/marketing/
// seo-audit route, this one walks the INTERNAL LINK GRAPH in one bounded
// breadth-first pass and returns the graph-level findings that model is blind
// to — broken internal links, redirect chains, orphan pages, excessive
// click-depth, and sitemap↔crawl coverage gaps.
//
//   GET                 → crawl from the sitemap + homepage seeds (cap ~40 pages).
//   GET ?seed=<url>      → start the crawl from a specific page.
//   GET ?maxPages=<n>    → override the page cap (still hard-bounded).
//
// Everything degrades gracefully: crawlSite never throws (a failed seed becomes
// a single notice finding), and this handler wraps it so even an unexpected
// error returns a readable JSON body rather than a 500.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  const requestedSeed = (searchParams.get('seed') || '').trim()
  let seedUrl: string | undefined
  if (requestedSeed) {
    try {
      seedUrl = validateSeoTargetUrl(requestedSeed)
    } catch (error) {
      if (error instanceof SeoTargetError) {
        return privateMarketingJson({ error: error.message }, { status: 400 })
      }
      throw error
    }
  }
  const maxPagesParam = (searchParams.get('maxPages') || '').trim()
  const maxPages = maxPagesParam ? Number(maxPagesParam) : undefined
  const boundedMaxPages = Number.isFinite(maxPages)
    ? Math.min(SEO_CRAWL_HARD_MAX_PAGES, Math.max(1, Math.floor(maxPages as number)))
    : undefined

  try {
    const { findings, stats } = await crawlSite({
      seedUrl,
      maxPages: boundedMaxPages,
    })

    return privateMarketingJson({
      generatedAt: new Date().toISOString(),
      findings,
      stats,
    })
  } catch (error) {
    // crawlSite is designed never to throw, but guard anyway so the route can
    // never return a 500 — the SEO suite must always get a readable response.
    const reason = error instanceof Error ? error.message : 'unknown error'
    console.error('Marketing SEO crawl: unexpected failure:', error)
    return privateMarketingJson({
      generatedAt: new Date().toISOString(),
      error: `The site crawl could not complete (${reason}).`,
      findings: [],
      stats: null,
    })
  }
}
