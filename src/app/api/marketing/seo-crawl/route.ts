import { NextResponse } from 'next/server'
import { crawlSite } from '@/lib/marketing/seoCrawl'

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
  const { searchParams } = new URL(request.url)
  const seedUrl = (searchParams.get('seed') || '').trim() || undefined
  const maxPagesParam = (searchParams.get('maxPages') || '').trim()
  const maxPages = maxPagesParam ? Number(maxPagesParam) : undefined

  try {
    const { findings, stats } = await crawlSite({
      seedUrl,
      maxPages: Number.isFinite(maxPages) ? maxPages : undefined,
    })

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      findings,
      stats,
    })
  } catch (error) {
    // crawlSite is designed never to throw, but guard anyway so the route can
    // never return a 500 — the SEO suite must always get a readable response.
    const reason = error instanceof Error ? error.message : 'unknown error'
    console.error('Marketing SEO crawl: unexpected failure:', error)
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      error: `The site crawl could not complete (${reason}).`,
      findings: [],
      stats: null,
    })
  }
}
