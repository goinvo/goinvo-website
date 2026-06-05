import { afterEach, describe, expect, it, vi } from 'vitest'
import { crawlSite, type CrawlStats } from '@/lib/marketing/seoCrawl'

// ---------------------------------------------------------------------------
// These tests stub the global `fetch` to model a tiny fake site entirely in
// memory, so the bounded BFS crawler in seoCrawl.ts can be exercised without
// ever touching the network. The crawler uses redirect:'manual', so the stub
// returns real 301/302 responses with a Location header to model redirects.
//
// The fake site (all under https://www.goinvo.com/):
//   /                — homepage; links to /about, /work, /broken,
//                      /chain-start, /a (the click-depth chain root), and
//                      /under-linked (via generic "click here" anchor text)
//   /about           — links to /work and /outside-sitemap
//   /work            — leaf, in the sitemap, TWO inbound links (NOT an orphan,
//                      NOT under-linked)
//   /under-linked    — in the sitemap, exactly ONE inbound link (from the
//                      homepage) → under-linked, distinct from an orphan
//   /outside-sitemap — reachable by link but ABSENT from the sitemap
//   /orphan          — in the sitemap, NOTHING links to it (an orphan)
//   /broken          — returns 404 (a broken internal link)
//   /chain-start     — 301 → /chain-mid → 301 → /chain-end (a redirect chain)
//   /chain-end       — 200 leaf
//   /a → /b → /c → /deep — a 4-deep chain; /deep is >3 clicks (too deep)
//
// The homepage's link to /under-linked uses the generic anchor text
// "click here", which the generic-anchor-text check must flag.
// ---------------------------------------------------------------------------

const ORIGIN = 'https://www.goinvo.com'

// Sitemap lists the pages we WANT indexed. Note: /orphan is here but nothing
// links to it; /outside-sitemap is deliberately omitted.
const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${ORIGIN}/</loc></url>
  <url><loc>${ORIGIN}/about</loc></url>
  <url><loc>${ORIGIN}/work</loc></url>
  <url><loc>${ORIGIN}/under-linked</loc></url>
  <url><loc>${ORIGIN}/orphan</loc></url>
  <url><loc>${ORIGIN}/broken</loc></url>
  <url><loc>${ORIGIN}/chain-start</loc></url>
  <url><loc>${ORIGIN}/a</loc></url>
  <url><loc>${ORIGIN}/b</loc></url>
  <url><loc>${ORIGIN}/c</loc></url>
  <url><loc>${ORIGIN}/deep</loc></url>
</urlset>`

// Each page's outgoing internal links. An entry is either a bare href (which
// renders with descriptive anchor text) or an [href, anchorText] pair so a test
// can model a specific (e.g. generic) anchor.
type LinkSpec = string | [href: string, anchorText: string]

const PAGE_LINKS: Record<string, LinkSpec[]> = {
  // The homepage links to /under-linked with the generic anchor "click here".
  '/': [
    '/about',
    '/work',
    '/broken',
    '/chain-start',
    '/a',
    ['/under-linked', 'click here'],
  ],
  '/about': ['/work', '/outside-sitemap'],
  '/work': [],
  '/under-linked': [],
  '/outside-sitemap': [],
  '/orphan': [],
  '/chain-end': [],
  '/a': ['/b'],
  '/b': ['/c'],
  '/c': ['/deep'],
  '/deep': [],
}

function hrefOf(link: LinkSpec): string {
  return Array.isArray(link) ? link[0] : link
}

// Default anchor text is descriptive (derived from the destination path) so the
// generic-anchor check only fires for the links we deliberately make generic.
function anchorOf(link: LinkSpec): string {
  if (Array.isArray(link)) return link[1]
  return `Visit ${link}`
}

function pageHtml(path: string): string {
  const links = (PAGE_LINKS[path] || [])
    .map((link) => `<a href="${hrefOf(link)}">${anchorOf(link)}</a>`)
    .join('\n')
  return `<!doctype html><html><head><title>${path}</title></head><body>
    <h1>${path}</h1>
    ${links}
  </body></html>`
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function redirectResponse(location: string, status = 301): Response {
  return new Response('', {
    status,
    headers: { Location: `${ORIGIN}${location}` },
  })
}

// The model: map a requested URL to a Response. Handles the sitemap, the
// redirect chain, the 404, and every normal HTML page.
function respondFor(url: string): Response {
  if (url === `${ORIGIN}/sitemap.xml`) {
    return new Response(SITEMAP_XML, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    })
  }

  // Redirect chain: /chain-start → /chain-mid → /chain-end (2 hops).
  if (url === `${ORIGIN}/chain-start`) return redirectResponse('/chain-mid')
  if (url === `${ORIGIN}/chain-mid`) return redirectResponse('/chain-end')

  // Broken internal link.
  if (url === `${ORIGIN}/broken`) return htmlResponse('not found', 404)

  // Normal pages — derive the path and serve link-bearing HTML.
  const path = url.slice(ORIGIN.length) || '/'
  if (path in PAGE_LINKS || path === '/chain-end') {
    return htmlResponse(pageHtml(path))
  }

  // Anything unmodeled → 404 so an accidental request is visible, not silently
  // treated as a live page.
  return htmlResponse('not found', 404)
}

function stubSiteFetch() {
  return vi.fn(async (input: unknown) => {
    const reqUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url)
    return respondFor(reqUrl)
  })
}

function idsOf(findings: { id: string }[]): string[] {
  return findings.map((f) => f.id)
}

describe('crawlSite — bounded BFS over a fake site', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = realFetch
  })

  it('detects a broken internal link (404) as a technical error', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings } = await crawlSite()
    const f = findings.find((x) => x.id === 'technical:crawl-broken-internal-links')
    expect(f).toBeDefined()
    expect(f?.category).toBe('technical')
    expect(f?.severity).toBe('error')
    // §6: names the actual offending URL.
    expect(f?.affectedUrls).toContain(`${ORIGIN}/broken`)
    expect(f?.what).toContain('/broken')
  })

  it('detects a redirect chain (two hops before 200) as a warning', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings } = await crawlSite()
    const f = findings.find((x) => x.id === 'technical:crawl-redirect-chains')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
    expect(f?.affectedUrls).toContain(`${ORIGIN}/chain-start`)
  })

  it('detects an orphan page (in sitemap, no inbound links) on a COMPLETE crawl', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    // Default maxPages (120) far exceeds the ~10-page fake site, so the crawl
    // runs to completion — only then is "no inbound links" trustworthy.
    const { findings, stats } = await crawlSite()
    expect(stats.capped).toBe(false)
    const f = findings.find((x) => x.id === 'technical:crawl-orphan-pages')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
    expect(f?.affectedUrls).toContain(`${ORIGIN}/orphan`)
    // A page WITH inbound links must NOT be reported as an orphan.
    expect(f?.affectedUrls).not.toContain(`${ORIGIN}/work`)
  })

  it('detects an under-linked page (in sitemap, exactly ONE inbound link)', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings, stats } = await crawlSite()
    expect(stats.capped).toBe(false)
    const f = findings.find((x) => x.id === 'technical:crawl-under-linked-pages')
    expect(f).toBeDefined()
    expect(f?.category).toBe('technical')
    expect(f?.severity).toBe('notice')
    // /under-linked has a single inbound link (from the homepage).
    expect(f?.affectedUrls).toContain(`${ORIGIN}/under-linked`)
    // /work has TWO inbound links → not under-linked.
    expect(f?.affectedUrls).not.toContain(`${ORIGIN}/work`)
    // /orphan has ZERO inbound → reported as an orphan, NOT as under-linked
    // (the two findings must not double-count the same URL).
    expect(f?.affectedUrls).not.toContain(`${ORIGIN}/orphan`)
  })

  it('does NOT report under-linked pages on a CAPPED crawl', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    // Like orphans, an inbound count is only trustworthy after a complete crawl.
    const { findings, stats } = await crawlSite({ maxPages: 2 })
    expect(stats.capped).toBe(true)
    expect(idsOf(findings)).not.toContain('technical:crawl-under-linked-pages')
  })

  it('detects generic / non-descriptive internal anchor text', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings, stats } = await crawlSite()
    const f = findings.find((x) => x.id === 'technical:crawl-generic-anchor-text')
    expect(f).toBeDefined()
    expect(f?.category).toBe('technical')
    expect(f?.severity).toBe('notice')
    // The homepage links to /under-linked with the anchor text "click here".
    expect(f?.affectedUrls).toContain(`${ORIGIN}/`)
    expect(stats.genericAnchorLinks).toBeGreaterThanOrEqual(1)
    // Descriptive anchors ("Visit /about", …) must NOT trip the check, so the
    // count stays small — only our one deliberately-generic link.
    expect(stats.genericAnchorLinks).toBe(1)
  })

  it('does NOT report orphans on a CAPPED crawl (un-reached pages are not orphans)', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    // Cap below the crawlable page count so the crawl stops early. Un-reached
    // sitemap URLs would look like orphans (zero inbound links seen), but that
    // is a false positive — the finding must be suppressed entirely when capped.
    const { findings, stats } = await crawlSite({ maxPages: 2 })
    expect(stats.capped).toBe(true)
    expect(idsOf(findings)).not.toContain('technical:crawl-orphan-pages')
    // The sitemap-reconciliation finding is suppressed the same way, for the
    // same reason — both require a complete crawl.
    expect(idsOf(findings)).not.toContain('technical:crawl-sitemap-not-crawled')
  })

  it('detects excessive click-depth (>3 clicks from the homepage)', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings } = await crawlSite()
    const f = findings.find((x) => x.id === 'technical:crawl-excessive-click-depth')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
    // /deep is homepage→/a→/b→/c→/deep = 4 clicks.
    expect(f?.affectedUrls).toContain(`${ORIGIN}/deep`)
    expect(f?.what).toContain('/deep')
    // /a (1 click), /b (2), /c (3) are within the limit and must NOT be flagged.
    expect(f?.affectedUrls).not.toContain(`${ORIGIN}/a`)
    expect(f?.affectedUrls).not.toContain(`${ORIGIN}/c`)
  })

  it('reconciles the sitemap: flags a crawled page absent from the sitemap', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { findings } = await crawlSite()
    const f = findings.find((x) => x.id === 'technical:crawl-crawled-not-in-sitemap')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('notice')
    expect(f?.affectedUrls).toContain(`${ORIGIN}/outside-sitemap`)
  })

  it('returns coherent stats (pages crawled, sitemap count, not capped)', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    const { stats } = await crawlSite()
    expect(stats.sitemapAvailable).toBe(true)
    expect(stats.sitemapUrlCount).toBe(11)
    expect(stats.pagesCrawled).toBeGreaterThan(0)
    expect(stats.capped).toBe(false)
    expect(stats.brokenLinks).toBeGreaterThanOrEqual(1)
    expect(stats.redirectChains).toBeGreaterThanOrEqual(1)
    expect(stats.orphanPages).toBeGreaterThanOrEqual(1)
    expect(stats.underLinkedPages).toBeGreaterThanOrEqual(1)
    expect(stats.genericAnchorLinks).toBeGreaterThanOrEqual(1)
    expect(stats.tooDeepPages).toBeGreaterThanOrEqual(1)
  })
})

describe('crawlSite — bounds and graceful degradation', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = realFetch
  })

  it('honors the maxPages cap and flags the crawl as capped', async () => {
    vi.stubGlobal('fetch', stubSiteFetch())
    // Cap below the number of crawlable pages so the cap must bite.
    const { stats } = await crawlSite({ maxPages: 2 })
    expect(stats.pagesCrawled).toBeLessThanOrEqual(2)
    expect(stats.capped).toBe(true)
  })

  it('never throws and returns a single graceful notice when every fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    let result: Awaited<ReturnType<typeof crawlSite>> | undefined
    await expect(
      (async () => {
        result = await crawlSite()
      })(),
    ).resolves.toBeUndefined()
    expect(result).toBeDefined()
    expect(result!.findings).toHaveLength(1)
    expect(result!.findings[0].id).toBe('technical:crawl-unavailable')
    expect(result!.findings[0].severity).toBe('notice')
    const stats = result!.stats as CrawlStats
    expect(stats.pagesCrawled).toBe(0)
    expect(stats.sitemapAvailable).toBe(false)
  })

  it('still crawls from the homepage when the sitemap is unavailable (no throw)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const reqUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url)
        if (reqUrl === `${ORIGIN}/sitemap.xml`) {
          return new Response('nope', { status: 500 })
        }
        return respondFor(reqUrl)
      }),
    )
    const { findings, stats } = await crawlSite()
    expect(stats.sitemapAvailable).toBe(false)
    // The homepage seed still drives a crawl, so we can still catch the broken
    // link even without a sitemap.
    expect(stats.pagesCrawled).toBeGreaterThan(0)
    expect(idsOf(findings)).toContain('technical:crawl-broken-internal-links')
    // Orphan + sitemap-reconciliation findings require the sitemap, so they are
    // correctly suppressed when it is unavailable.
    expect(idsOf(findings)).not.toContain('technical:crawl-orphan-pages')
  })
})
