import { parse } from 'node-html-parser'
import { DEFAULT_PRIORITY_WEIGHTS, type SeoFinding } from './seoAudit'

// Lightweight site-crawl module — Phase 2 of the SEO-suite revamp (see
// docs/seo-suite-revamp-plan.md §12 "Site-graph crawl" + "Sitemap↔indexed↔
// crawled coverage reconciliation"). This is the Technical SEO persona's
// crawl-graph unlock: the per-page fetch-parse model in seoAudit.ts is
// structurally blind to graph-level issues (what links to what, what is
// reachable, what redirects). One bounded breadth-first crawl pass produces
// the findings that model cannot:
//
//   (a) broken internal links     — internal <a href> that returns 404/5xx
//   (b) redirect chains           — internal links that 3xx more than once
//                                    before reaching a final 200
//   (c) orphan pages              — sitemap URLs with ZERO internal inbound
//                                    links discovered during the crawl
//   (d) excessive click-depth     — pages more than 3 clicks from the homepage
//   (e) sitemap↔crawl reconciliation — sitemap URLs never reached by the
//                                    crawl, and pages crawled but absent from
//                                    the sitemap
//
// HARD RULES from the plan + brief this implements:
//  - BOUNDED: cap total pages (~40), bound depth, dedupe visited, per-fetch
//    timeout via AbortController. The crawl must terminate quickly on a large
//    or hostile site and never hang.
//  - GRACEFUL: never throws. A failed seed/sitemap fetch returns a single
//    designer-friendly notice; a failed individual fetch becomes a finding (or
//    is skipped), never an exception.
//  - ACTIONABLE (§6): every finding names the actual offending URL(s) and gives
//    a what / why / howToFix written for non-SEO designers — un-abbreviated.
//
// All findings are category 'technical'. The module reuses the unified
// SeoFinding model + severity weights from seoAudit.ts (imported read-only).

// ---------------------------------------------------------------------------
// Configuration — every bound is overridable by env so the route can tune the
// crawl without code changes, but the defaults are conservative.
// ---------------------------------------------------------------------------

const SITEMAP_URL =
  process.env.GOINVO_SITEMAP_URL || 'https://www.goinvo.com/sitemap.xml'
const HOMEPAGE_URL =
  process.env.GOINVO_HOMEPAGE_URL || 'https://www.goinvo.com/'

// Cap the number of distinct pages we will FETCH-and-parse. The orphan-page and
// sitemap↔crawl reconciliation findings are only trustworthy after a COMPLETE
// (un-capped) crawl — when the crawl stops early, un-reached sitemap URLs look
// like orphans even though they simply weren't visited yet, so those findings
// are suppressed while capped (see the `!capped` gates below). The default must
// therefore be high enough to crawl a typical sitemap to completion: the goinvo
// sitemap is ~80 URLs, so 120 leaves comfortable headroom for the whole site to
// be reached in one pass. Still env-overridable for tuning. Even at 120 the
// crawl stays bounded (page cap + depth bound + per-fetch timeout) and finishes
// in a handful of seconds on a healthy origin.
const DEFAULT_MAX_PAGES = Number(process.env.MARKETING_SEO_CRAWL_MAX_PAGES || 120)

// Bound the BFS depth too, so a deeply-nested site can't blow the page cap on
// one long chain. 4 = homepage (0) + three clicks, which is exactly the
// click-depth threshold we report against (>3 clicks = too deep).
const MAX_DEPTH = Number(process.env.MARKETING_SEO_CRAWL_MAX_DEPTH || 4)

// Click-depth beyond this many clicks from the homepage is "too deep".
const CLICK_DEPTH_LIMIT = 3

// Per-fetch timeout. Mirrors the seoAuditIndexation.ts / seoAudit.ts pattern:
// one AbortController per request, cleared in a finally.
const FETCH_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_CRAWL_FETCH_TIMEOUT_MS || 10000,
)

// How many redirect hops before a 200 we tolerate before calling it a "chain".
// A single 301 (e.g. http→https or /page→/page/) is normal and fine; two or
// more hops is the wasteful pattern that bleeds crawl budget and link equity.
const REDIRECT_CHAIN_THRESHOLD = 2

const USER_AGENT = 'GoInvo marketing SEO crawl (+https://www.goinvo.com)'

// ---------------------------------------------------------------------------
// Stats — returned alongside findings so the route/UI can show coverage.
// ---------------------------------------------------------------------------

export type CrawlStats = {
  seedUrl: string
  pagesCrawled: number // pages successfully fetched + parsed
  pagesAttempted: number // pages we tried to fetch (incl. failures)
  maxPages: number
  capped: boolean // did we hit the page cap before exhausting the frontier?
  maxDepthReached: number
  sitemapUrlCount: number
  sitemapAvailable: boolean
  internalLinksSeen: number
  brokenLinks: number
  redirectChains: number
  orphanPages: number
  tooDeepPages: number
  sitemapNotCrawled: number
  crawledNotInSitemap: number
}

export type CrawlResult = {
  findings: SeoFinding[]
  stats: CrawlStats
}

// ---------------------------------------------------------------------------
// URL helpers — normalize so the same page reached via "/x" and "/x/" and
// "/x#frag" and "/x?utm=…" collapses to one node in the graph.
// ---------------------------------------------------------------------------

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

// Normalize a URL for graph identity: strip the hash, drop a trailing slash
// (except the root), and lower-case the host. Query strings are KEPT (they can
// be distinct pages) but the fragment is always dropped (same document).
function normalizeUrl(raw: string, base?: string): string | undefined {
  let u: URL
  try {
    u = base ? new URL(raw, base) : new URL(raw)
  } catch {
    return undefined
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined
  u.hash = ''
  u.hostname = u.hostname.toLowerCase()
  // Collapse a trailing slash on a non-root path so "/about" === "/about/".
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '')
  }
  return u.toString()
}

// Two URLs are "same site" when their origins match. We treat the seed's
// origin as the site boundary; off-site links are never crawled or checked.
function isSameSite(url: string, siteOrigin: string): boolean {
  return originOf(url) === siteOrigin
}

// Click-depth from the homepage = number of path segments is NOT a reliable
// proxy (a deep URL can still be one click away). We measure REAL click-depth
// during the BFS instead; this helper is only the human label for a URL.
function pathOf(url: string): string {
  try {
    return new URL(url).pathname || '/'
  } catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// Finding factory — one place so every crawl finding is shaped identically.
// ---------------------------------------------------------------------------

function findingId(check: string): string {
  return `technical:crawl-${check}`
}

function makeFinding(
  check: string,
  severity: SeoFinding['severity'],
  what: string,
  why: string,
  howToFix: string,
  affectedUrls: string[],
  indexable = true,
): SeoFinding {
  return {
    id: findingId(check),
    category: 'technical',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: affectedUrls.length,
    pctSite: 0, // crawl-wide finding; the route can backfill against page count
    indexable,
    what,
    why,
    howToFix,
    affectedUrls,
    source: 'html-parse',
    status: 'open',
    detectedAt: new Date().toISOString(),
  }
}

// The single graceful notice returned when we cannot even start the crawl
// (no reachable seed). Mirrors the "unavailable" pattern in seoAuditIndexation.
function crawlUnavailableFinding(seedUrl: string, reason: string): SeoFinding {
  return makeFinding(
    'unavailable',
    'notice',
    'The site crawl could not start because neither the sitemap nor the homepage could be loaded.',
    'The crawl-graph checks (broken internal links, redirect chains, orphan pages, click-depth, and sitemap coverage) all depend on reaching at least one starting page. None of the seed pages responded, so this is a data-availability gap, not a confirmed problem with the site.',
    `Confirm the site is online and reachable, then re-run the crawl. The crawler tried the sitemap (${SITEMAP_URL}) and the homepage (${seedUrl}). Diagnostic detail: ${reason}.`,
    [seedUrl],
    true,
  )
}

// ---------------------------------------------------------------------------
// Sitemap — fetch the flat sitemap and extract <loc> values. Graceful: any
// failure returns an empty list (the crawl still runs from the homepage seed)
// plus a flag so the caller knows reconciliation can't be trusted.
// ---------------------------------------------------------------------------

async function fetchSitemapUrls(siteOrigin: string): Promise<{
  urls: string[]
  available: boolean
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(SITEMAP_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return { urls: [], available: false }
    const xml = await res.text()
    // Sitemaps are flat XML; a regex over <loc> is enough (the existing
    // seo-audit route does the same) and avoids a full XML parser dependency.
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) =>
      m[1].trim(),
    )
    const normalized = new Set<string>()
    for (const loc of locs) {
      const n = normalizeUrl(loc)
      // Only same-site, http(s) entries — a sitemap can reference sub-sitemaps
      // or other hosts we don't crawl.
      if (n && isSameSite(n, siteOrigin)) normalized.add(n)
    }
    return { urls: [...normalized], available: true }
  } catch {
    return { urls: [], available: false }
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Single-page fetch with manual redirect handling. We set redirect:'manual'
// so we can COUNT the hops (3xx chain detection) and record the final status.
// Bounded: at most a few hops, each with its own timeout, never throws.
// ---------------------------------------------------------------------------

type FetchOutcome = {
  // The final HTTP status reached (after following redirects), or 0 on a
  // network/timeout failure.
  finalStatus: number
  // The final URL after redirects (normalized), or the original on failure.
  finalUrl: string
  // Number of redirect hops followed before the final response (0 = direct).
  redirectHops: number
  // The HTML body of the final response, only when it's a 2xx text/html GET.
  html?: string
  // A human reason when the fetch failed outright (network/timeout).
  error?: string
}

const MAX_REDIRECT_HOPS = 5

// Follow up to MAX_REDIRECT_HOPS redirects manually, counting hops. `wantHtml`
// pulls the body only for the final 2xx response (we GET pages we crawl, and
// we also GET linked targets so a single call both validates the link AND, for
// crawlable pages, yields the HTML — fewer round-trips).
async function fetchWithRedirects(
  startUrl: string,
  siteOrigin: string,
  wantHtml: boolean,
): Promise<FetchOutcome> {
  let current = startUrl
  let hops = 0

  for (let i = 0; i <= MAX_REDIRECT_HOPS; i++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(current, {
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      })

      // A 3xx with a Location header is a redirect we follow + count.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        const next = location ? normalizeUrl(location, current) : undefined
        if (!next) {
          // Redirect with no usable target — treat the 3xx as the final state.
          return { finalStatus: res.status, finalUrl: current, redirectHops: hops }
        }
        hops++
        current = next
        // Stop crawling redirects that leave the site, but still report the
        // hop count (an off-site redirect is a valid final state for a link).
        if (!isSameSite(next, siteOrigin)) {
          return { finalStatus: res.status, finalUrl: next, redirectHops: hops }
        }
        continue
      }

      // Non-redirect: this is the final response.
      let html: string | undefined
      if (wantHtml && res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (/html/i.test(contentType) || contentType === '') {
          html = await res.text().catch(() => undefined)
        }
      }
      return { finalStatus: res.status, finalUrl: current, redirectHops: hops, html }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown fetch error'
      return { finalStatus: 0, finalUrl: current, redirectHops: hops, error: reason }
    } finally {
      clearTimeout(timeout)
    }
  }

  // Exhausted the hop budget — an effectively infinite redirect loop.
  return { finalStatus: 0, finalUrl: current, redirectHops: hops, error: 'too many redirects' }
}

// ---------------------------------------------------------------------------
// Link extraction — pull same-site internal <a href> targets from a page's
// HTML, normalized + deduped. Off-site, mailto:, tel:, javascript:, and #-only
// links are dropped here so the graph only ever contains crawlable page nodes.
// ---------------------------------------------------------------------------

function extractInternalLinks(
  html: string,
  pageUrl: string,
  siteOrigin: string,
): string[] {
  const root = parse(html, { comment: false })
  const out = new Set<string>()
  for (const a of root.querySelectorAll('a')) {
    const href = (a.getAttribute('href') || '').trim()
    if (!href) continue
    if (/^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue
    const normalized = normalizeUrl(href, pageUrl)
    if (!normalized) continue
    if (!isSameSite(normalized, siteOrigin)) continue
    if (normalized === pageUrl) continue // self-link is not a graph edge
    out.add(normalized)
  }
  return [...out]
}

// ---------------------------------------------------------------------------
// crawlSite — the public entry point. A bounded BFS from the sitemap +
// homepage seeds. NEVER throws; returns findings + stats.
// ---------------------------------------------------------------------------

export type CrawlOptions = {
  seedUrl?: string
  maxPages?: number
}

export async function crawlSite(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const seedUrl = normalizeUrl(opts.seedUrl || HOMEPAGE_URL) || HOMEPAGE_URL
  const maxPages = Math.max(1, opts.maxPages ?? DEFAULT_MAX_PAGES)
  const siteOrigin = originOf(seedUrl) || originOf(HOMEPAGE_URL) || ''

  // --- Seed from the sitemap + the homepage --------------------------------
  const { urls: sitemapUrls, available: sitemapAvailable } =
    await fetchSitemapUrls(siteOrigin)
  const sitemapSet = new Set(sitemapUrls)

  // BFS state. The frontier is processed STRICTLY in increasing click-depth
  // (a true breadth-first order): we always dequeue the lowest-depth pending
  // URL next. That guarantees a page's real (shortest) click-depth is settled
  // before we expand from it, and that the sitemap-only seeds below (depth
  // Infinity) are processed LAST — after the entire homepage link-tree — so
  // they never pollute the real depth of a page reachable by a link.
  const depthOf = new Map<string, number>() // normalized URL -> click-depth
  const pending = new Set<string>() // URLs still to fetch
  const enqueued = new Set<string>() // ever placed on the frontier (dedupe)
  const crawled = new Set<string>() // successfully fetched + parsed
  const attempted = new Set<string>() // every URL we tried to fetch

  // Inbound-link tally: which crawled pages link to each target. Used for
  // orphan detection (a sitemap URL with no inbound internal links).
  const inboundCount = new Map<string, number>()

  // Link-status cache so we validate each distinct internal link target at
  // most once even if many pages link to it.
  const linkOutcome = new Map<string, FetchOutcome>()

  function enqueue(url: string, depth: number): void {
    if (enqueued.has(url)) return
    if (depth > MAX_DEPTH) return
    enqueued.add(url)
    depthOf.set(url, depth)
    pending.add(url)
  }

  // Pull the lowest-depth pending URL (breadth-first). O(n) per pull, but n is
  // capped at ~40 so this is negligible and keeps the depth ordering exact.
  function dequeueShallowest(): string | undefined {
    let best: string | undefined
    let bestDepth = Number.POSITIVE_INFINITY
    for (const u of pending) {
      const d = depthOf.get(u) ?? Number.POSITIVE_INFINITY
      if (best === undefined || d < bestDepth) {
        best = u
        bestDepth = d
      }
    }
    if (best !== undefined) pending.delete(best)
    return best
  }

  // The homepage is the depth-0 root; the BFS owns click-depth from here.
  enqueue(seedUrl, 0)
  // Seed remaining sitemap URLs at "unknown" depth (Infinity) so they still get
  // crawled for link-graph coverage even if nothing links to them — but they do
  // NOT claim depth 0. Because the frontier is drained shallowest-first, these
  // Infinity seeds run only after every link-reachable page, so a page's real
  // depth is always set first; an orphan never gets a finite depth, which is
  // exactly how orphans fall out of the click-depth check.
  for (const u of sitemapUrls) {
    if (u === seedUrl) continue
    if (!enqueued.has(u)) {
      enqueued.add(u)
      depthOf.set(u, Number.POSITIVE_INFINITY)
      pending.add(u)
    }
  }

  let capped = false
  let maxDepthReached = 0
  let internalLinksSeen = 0

  const findings: SeoFinding[] = []
  const brokenLinkUrls: string[] = []
  const redirectChainUrls: string[] = []

  // --- The BFS loop --------------------------------------------------------
  // Bounded by `maxPages` distinct fetched pages and an exhausted frontier.
  while (pending.size > 0) {
    if (crawled.size >= maxPages) {
      capped = pending.size > 0
      break
    }
    const url = dequeueShallowest() as string
    const depth = depthOf.get(url) ?? 0

    attempted.add(url)
    // We may already have a cached outcome from validating this URL as a link
    // TARGET (wantHtml:false), in which case `html` is absent. To crawl the
    // page we need its body, so re-fetch when the cached outcome has no HTML
    // but the page is a live 2xx. (A cached 4xx/5xx/redirect never has HTML and
    // never will, so we don't waste a re-fetch on those.)
    const cached = linkOutcome.get(url)
    const cachedIsCrawlable =
      cached && cached.finalStatus >= 200 && cached.finalStatus < 300
    const outcome =
      cached && (cached.html !== undefined || !cachedIsCrawlable)
        ? cached
        : await fetchWithRedirects(url, siteOrigin, true)
    linkOutcome.set(url, outcome)

    // A broken seed/page (network failure or 4xx/5xx) can't be parsed for
    // links; record it (the inbound-link checks below report broken LINKS, but
    // a broken page reached directly from a seed deserves a note too) and move
    // on. We only treat it as a "broken internal link" when something linked to
    // it, which is handled when we process the linking page's hrefs.
    if (outcome.finalStatus < 200 || outcome.finalStatus >= 400 || !outcome.html) {
      continue
    }

    crawled.add(url)
    if (Number.isFinite(depth)) {
      maxDepthReached = Math.max(maxDepthReached, depth)
    }

    // Extract + record the internal link graph for this page.
    const links = extractInternalLinks(outcome.html, url, siteOrigin)
    for (const target of links) {
      internalLinksSeen++
      inboundCount.set(target, (inboundCount.get(target) || 0) + 1)

      // Newly-discovered page → enqueue at depth+1 (only finite depths grow
      // the BFS tree; we never expand from a sitemap-seeded Infinity node).
      const childDepth = Number.isFinite(depth) ? depth + 1 : Number.POSITIVE_INFINITY
      if (!enqueued.has(target)) {
        enqueue(target, childDepth)
      } else if (Number.isFinite(childDepth)) {
        // Already known — keep the SHORTEST real click-depth so click-depth
        // findings reflect the easiest path to the page.
        const known = depthOf.get(target) ?? Number.POSITIVE_INFINITY
        if (childDepth < known) depthOf.set(target, childDepth)
      }

      // Validate the link target's HTTP status (cached). We only need HEAD-ish
      // status info here, but reuse fetchWithRedirects (GET) so we also learn
      // redirect-hop counts in the same call.
      if (!linkOutcome.has(target)) {
        // Respect the overall budget: don't fire off unbounded validation
        // fetches once we're at the page cap. Links beyond the cap are simply
        // not validated (reported via the `capped` stat).
        if (linkOutcome.size < maxPages * 4) {
          const targetOutcome = await fetchWithRedirects(target, siteOrigin, false)
          linkOutcome.set(target, targetOutcome)
        }
      }

      const targetOutcome = linkOutcome.get(target)
      if (targetOutcome) {
        // (a) Broken internal link: final status is a 4xx/5xx or a hard failure.
        const status = targetOutcome.finalStatus
        const broken = status === 0 || status >= 400
        if (broken && !brokenLinkUrls.includes(target)) {
          brokenLinkUrls.push(target)
        }
        // (b) Redirect chain: more than one hop before the final response.
        if (
          targetOutcome.redirectHops >= REDIRECT_CHAIN_THRESHOLD &&
          !redirectChainUrls.includes(target)
        ) {
          redirectChainUrls.push(target)
        }
      }
    }
  }

  // capped is also true if we stopped because we hit the cap with a non-empty
  // frontier OR there were more enqueued URLs than we could fetch.
  if (crawled.size >= maxPages && pending.size > 0) capped = true

  // --- (a) Broken internal links -------------------------------------------
  if (brokenLinkUrls.length > 0) {
    const sample = brokenLinkUrls.slice(0, 8)
    findings.push(
      makeFinding(
        'broken-internal-links',
        'error',
        `The crawl found ${brokenLinkUrls.length} internal link${brokenLinkUrls.length === 1 ? '' : 's'} that lead to a page that no longer loads (it returns a "not found" or server error). Examples: ${sample.map((u) => pathOf(u)).join(', ')}.`,
        'A link on your own site that goes to a dead page sends both visitors and search engines to an error. It wastes the trust ("link equity") that internal links pass between pages, frustrates readers, and signals to Google that the site is poorly maintained.',
        `Open each broken link target and either restore the missing page, or update the link to point at the correct live URL (or remove the link). The broken targets are: ${sample.join(', ')}${brokenLinkUrls.length > sample.length ? `, and ${brokenLinkUrls.length - sample.length} more` : ''}.`,
        brokenLinkUrls,
        false,
      ),
    )
  }

  // --- (b) Redirect chains -------------------------------------------------
  if (redirectChainUrls.length > 0) {
    const sample = redirectChainUrls.slice(0, 8)
    findings.push(
      makeFinding(
        'redirect-chains',
        'warning',
        `The crawl found ${redirectChainUrls.length} internal link${redirectChainUrls.length === 1 ? '' : 's'} that bounce through two or more redirects before arriving at the final page. Examples: ${sample.map((u) => pathOf(u)).join(', ')}.`,
        'Each extra redirect (a forwarding step before the real page loads) slows the page down for visitors and makes search-engine crawlers do more work to reach your content. Long redirect chains can also dilute the ranking value passed along the link, and crawlers sometimes give up before the end.',
        `Update each of these internal links to point STRAIGHT at the final destination URL, so there are no in-between forwarding steps. The chained links are: ${sample.join(', ')}${redirectChainUrls.length > sample.length ? `, and ${redirectChainUrls.length - sample.length} more` : ''}.`,
        redirectChainUrls,
        true,
      ),
    )
  }

  // --- (c) Orphan pages ----------------------------------------------------
  // A sitemap URL that the crawl reached the page itself (or not) but which has
  // ZERO internal inbound links discovered. The homepage is never an orphan.
  //
  // CRITICAL: "no inbound links" is only trustworthy after a COMPLETE crawl. If
  // the crawl was CAPPED, most sitemap URLs were simply never reached — their
  // inbound count is 0 only because we stopped early, not because nothing links
  // to them. Reporting those as orphans is a false positive (a maxPages=8 crawl
  // of the ~80-URL goinvo sitemap wrongly flagged 31). So the orphan finding is
  // gated on `!capped`, exactly like the `sitemap-not-crawled` finding below
  // (both depend on a complete crawl). We still tally orphanUrls for the stats
  // either way, but only emit the finding when the crawl is un-capped.
  const orphanUrls: string[] = []
  if (sitemapAvailable) {
    for (const u of sitemapUrls) {
      if (u === seedUrl) continue
      const inbound = inboundCount.get(u) || 0
      if (inbound === 0) orphanUrls.push(u)
    }
  }
  if (orphanUrls.length > 0 && !capped) {
    const sample = orphanUrls.slice(0, 8)
    findings.push(
      makeFinding(
        'orphan-pages',
        'warning',
        `The crawl found ${orphanUrls.length} page${orphanUrls.length === 1 ? '' : 's'} that ${orphanUrls.length === 1 ? 'is' : 'are'} listed in the sitemap but ${orphanUrls.length === 1 ? 'has' : 'have'} no link pointing to ${orphanUrls.length === 1 ? 'it' : 'them'} from anywhere else on the site (an "orphan" page). Examples: ${sample.map((u) => pathOf(u)).join(', ')}.`,
        'A page that nothing links to is nearly invisible: visitors can only reach it by typing the exact address, and search engines struggle to discover it and judge how important it is. Internal links are how authority flows through a site, so an orphan page ranks far below its potential.',
        `Add at least one internal link to each orphan page from a relevant, related page (a section index, a parent page, or a "related work" list is ideal). The orphan pages are: ${sample.join(', ')}${orphanUrls.length > sample.length ? `, and ${orphanUrls.length - sample.length} more` : ''}.`,
        orphanUrls,
        true,
      ),
    )
  }

  // --- (d) Excessive click-depth -------------------------------------------
  // Pages whose shortest real path from the homepage is more than 3 clicks.
  const tooDeep: { url: string; depth: number }[] = []
  for (const url of crawled) {
    const depth = depthOf.get(url) ?? Number.POSITIVE_INFINITY
    if (Number.isFinite(depth) && depth > CLICK_DEPTH_LIMIT) {
      tooDeep.push({ url, depth })
    }
  }
  tooDeep.sort((a, b) => b.depth - a.depth)
  if (tooDeep.length > 0) {
    const sample = tooDeep.slice(0, 8)
    findings.push(
      makeFinding(
        'excessive-click-depth',
        'warning',
        `The crawl found ${tooDeep.length} page${tooDeep.length === 1 ? '' : 's'} that ${tooDeep.length === 1 ? 'sits' : 'sit'} more than ${CLICK_DEPTH_LIMIT} clicks away from the homepage. Examples: ${sample.map((d) => `${pathOf(d.url)} (${d.depth} clicks)`).join(', ')}.`,
        'Pages buried many clicks deep are crawled less often and seen as less important by search engines, and visitors rarely find them. As a rule of thumb every meaningful page should be reachable within about three clicks of the homepage.',
        `Bring these pages closer to the surface: add links to them from higher-level hub pages (the homepage, a section landing page, or a navigation menu) so they sit within ${CLICK_DEPTH_LIMIT} clicks. The deepest pages are: ${sample.map((d) => `${d.url} (${d.depth} clicks)`).join(', ')}${tooDeep.length > sample.length ? `, and ${tooDeep.length - sample.length} more` : ''}.`,
        tooDeep.map((d) => d.url),
        true,
      ),
    )
  }

  // --- (e) Sitemap ↔ crawl reconciliation ----------------------------------
  // (e1) Sitemap URLs the crawl never reached (within the cap). When capped we
  // cannot be sure these are truly unreachable, so the wording is careful.
  const sitemapNotCrawled: string[] = []
  if (sitemapAvailable) {
    for (const u of sitemapUrls) {
      if (!crawled.has(u)) sitemapNotCrawled.push(u)
    }
  }
  if (sitemapNotCrawled.length > 0 && !capped) {
    const sample = sitemapNotCrawled.slice(0, 8)
    findings.push(
      makeFinding(
        'sitemap-not-crawled',
        'warning',
        `The sitemap lists ${sitemapNotCrawled.length} page${sitemapNotCrawled.length === 1 ? '' : 's'} that the crawl could not reach by following links from the homepage. Examples: ${sample.map((u) => pathOf(u)).join(', ')}.`,
        'The sitemap is your list of pages you WANT found, but if no internal link leads to a page, search engines treat it as low-priority and may not crawl or rank it well even though it is in the sitemap. A gap between "in the sitemap" and "reachable by crawling" usually means missing internal links — or a page that should be removed from the sitemap.',
        `For each of these pages, either add an internal link path so the page is reachable from the homepage, or, if the page is intentionally gone or private, remove it from the sitemap so the sitemap stays an accurate list of live, linkable pages. The unreachable sitemap pages are: ${sample.join(', ')}${sitemapNotCrawled.length > sample.length ? `, and ${sitemapNotCrawled.length - sample.length} more` : ''}.`,
        sitemapNotCrawled,
        true,
      ),
    )
  }

  // (e2) Pages the crawl discovered that are absent from the sitemap.
  const crawledNotInSitemap: string[] = []
  if (sitemapAvailable) {
    for (const u of crawled) {
      if (u !== seedUrl && !sitemapSet.has(u)) crawledNotInSitemap.push(u)
    }
  }
  if (crawledNotInSitemap.length > 0) {
    const sample = crawledNotInSitemap.slice(0, 8)
    findings.push(
      makeFinding(
        'crawled-not-in-sitemap',
        'notice',
        `The crawl reached ${crawledNotInSitemap.length} live page${crawledNotInSitemap.length === 1 ? '' : 's'} by following internal links that ${crawledNotInSitemap.length === 1 ? 'is' : 'are'} NOT listed in the sitemap. Examples: ${sample.map((u) => pathOf(u)).join(', ')}.`,
        'The sitemap is meant to be the complete list of pages you want search engines to index. Live pages missing from it may be crawled less reliably and are easy to forget when auditing the site. (Some of these may be intentionally excluded — that is fine — but each one is worth a conscious decision.)',
        `Review each page below. If it should be findable in search, add it to the sitemap so search engines have a complete picture. If it is intentionally excluded (a thank-you page, a draft, a utility page), no action is needed. The pages found outside the sitemap are: ${sample.join(', ')}${crawledNotInSitemap.length > sample.length ? `, and ${crawledNotInSitemap.length - sample.length} more` : ''}.`,
        crawledNotInSitemap,
        true,
      ),
    )
  }

  // --- Could we even start? ------------------------------------------------
  // If we crawled NOTHING and the sitemap was unavailable, the site was
  // effectively unreachable — return the single graceful notice instead of an
  // empty, falsely-clean result.
  if (crawled.size === 0 && !sitemapAvailable) {
    const seedOutcome = linkOutcome.get(seedUrl)
    const reason =
      seedOutcome?.error ||
      (seedOutcome ? `homepage returned ${seedOutcome.finalStatus}` : 'no seed responded')
    return {
      findings: [crawlUnavailableFinding(seedUrl, reason)],
      stats: emptyStats(seedUrl, maxPages, sitemapUrls.length, sitemapAvailable),
    }
  }

  const stats: CrawlStats = {
    seedUrl,
    pagesCrawled: crawled.size,
    pagesAttempted: attempted.size,
    maxPages,
    capped,
    maxDepthReached,
    sitemapUrlCount: sitemapUrls.length,
    sitemapAvailable,
    internalLinksSeen,
    brokenLinks: brokenLinkUrls.length,
    redirectChains: redirectChainUrls.length,
    orphanPages: orphanUrls.length,
    tooDeepPages: tooDeep.length,
    sitemapNotCrawled: sitemapNotCrawled.length,
    crawledNotInSitemap: crawledNotInSitemap.length,
  }

  return { findings, stats }
}

function emptyStats(
  seedUrl: string,
  maxPages: number,
  sitemapUrlCount: number,
  sitemapAvailable: boolean,
): CrawlStats {
  return {
    seedUrl,
    pagesCrawled: 0,
    pagesAttempted: 0,
    maxPages,
    capped: false,
    maxDepthReached: 0,
    sitemapUrlCount,
    sitemapAvailable,
    internalLinksSeen: 0,
    brokenLinks: 0,
    redirectChains: 0,
    orphanPages: 0,
    tooDeepPages: 0,
    sitemapNotCrawled: 0,
    crawledNotInSitemap: 0,
  }
}
