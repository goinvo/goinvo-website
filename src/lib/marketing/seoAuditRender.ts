import { parse, type HTMLElement } from 'node-html-parser'
import puppeteer from 'puppeteer'
import {
  DEFAULT_PRIORITY_WEIGHTS,
  fetchPageHtml,
  type SeoFinding,
  type SeoFindingCategory,
  type SeoFindingSeverity,
} from './seoAudit'
import {
  assertPublicNetworkUrl,
  SEO_RESPONSE_MAX_BYTES,
  validateSeoTargetUrl,
} from './seoTarget'

// Render-diff pack for the SEO audit engine — the Technical / GEO persona's top
// pick (see docs/seo-suite-revamp-plan.md §12, "raw-HTML-vs-hydrated-DOM render
// diff"). The rest of the engine fetches a page ONCE, the raw way, and parses
// that. But GoInvo's pages are React/Next, so anything injected only after the
// browser runs JavaScript is INVISIBLE to that raw fetch — and, crucially,
// invisible to the crawlers that matter most here: AI answer engines (ChatGPT,
// Perplexity, Claude) and Googlebot's first indexing wave do NOT run JavaScript.
// If the page's real content only appears after hydration, those crawlers read
// an empty shell and can't rank or cite it.
//
// So this module fetches the page TWO ways and compares:
//  (a) RAW — `fetchPageHtml(url)`, no JavaScript, exactly what a no-JS crawler
//      sees on its first pass.
//  (b) RENDERED — the page driven through headless Chrome (Puppeteer), letting
//      all JavaScript run, then reading `document.documentElement.outerHTML`.
//
// Content that is present in (b) but missing from (a) is a render gap, emitted
// as `'geo'` findings. Everything reuses the unified `SeoFinding` model and the
// designer-friendly copy conventions of seoAudit.ts / seoAuditGeo.ts.
//
// GRACEFUL like the rest of the engine: Puppeteer is slow and can fail to launch
// in some environments, so any launch/timeout/throw collapses to a single
// `'notice'` ("render check unavailable") — this never throws. Because of that
// cost it is OPT-IN (auditPage runs it only behind opts.includeRenderDiff; the
// route enables it for single-page audits only, never the sweep).

// ---------------------------------------------------------------------------
// Shared helpers — kept local so this stays a clean additive module.
// ---------------------------------------------------------------------------

function findingId(category: SeoFindingCategory, check: string): string {
  return `${category}:${check}`
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function makeFinder(category: SeoFindingCategory, url: string, detectedAt: string) {
  return (
    severity: SeoFindingSeverity,
    check: string,
    what: string,
    why: string,
    howToFix: string,
  ): SeoFinding => ({
    id: findingId(category, check),
    category,
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0, // single-page audit; the route fills this in across the set
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source: 'html-parse',
    status: 'open',
    detectedAt,
  })
}

// Visible body text only (drop script/style/template chrome) so the length
// comparison measures the words a reader and an AI extractor actually see, not
// the inline JSON/JS that bloats raw markup.
function visibleText(root: HTMLElement): string {
  const body = root.querySelector('body') || root
  for (const el of body.querySelectorAll('script, style, noscript, template')) {
    el.remove()
  }
  return collapse(body.text)
}

function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

// In-content links: anchors with a real href that live in the body, excluding
// pure navigation chrome (header/nav/footer) so we compare the links that carry
// the page's own content, not the site-wide menu.
function contentLinkCount(root: HTMLElement): number {
  const body = root.querySelector('body') || root
  let count = 0
  for (const a of body.querySelectorAll('a[href]')) {
    const href = (a.getAttribute('href') || '').trim()
    if (!href || href === '#' || href.startsWith('javascript:')) continue
    // Skip anchors nested in obvious chrome — they're the same in raw + rendered.
    if (a.closest('nav, header, footer')) continue
    count++
  }
  return count
}

// Does the page carry any JSON-LD structured data? (Presence only — the
// structured-data check validates the contents; here we only care whether the
// block exists at all in this rendering.)
function hasStructuredData(root: HTMLElement): boolean {
  return root
    .querySelectorAll('script[type="application/ld+json"]')
    .some((b) => b.text.trim().length > 0)
}

// ---------------------------------------------------------------------------
// The rendered-HTML source. Default implementation drives headless Chrome via
// Puppeteer; it is injectable so the mapping can be unit-tested without ever
// launching a browser (tests pass a stub that returns canned rendered HTML, or
// one that throws to exercise the graceful path).
// ---------------------------------------------------------------------------

export type RenderedHtmlSource = (url: string) => Promise<string>

const RENDER_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_RENDER_TIMEOUT_MS || process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 20000,
)

// Fetch the fully-hydrated DOM: launch headless Chrome, navigate, wait for the
// network to settle, give React a short beat to finish hydrating, then read the
// rendered outer HTML. Blocks nothing — we want to see the page exactly as a
// real browser (and a JS-running crawler) would. Always closes the browser.
export async function fetchRenderedHtml(url: string): Promise<string> {
  const safeUrl = validateSeoTargetUrl(url)
  const allowNoSandbox = process.env.MARKETING_SEO_PUPPETEER_NO_SANDBOX === 'true'
  const browser = await puppeteer.launch({
    // 'new' headless mode. Recent Puppeteer narrowed the option's type to
    // boolean | 'shell' (where `true` IS the new headless), so cast the literal
    // to keep the intent explicit while satisfying the type.
    headless: 'new' as unknown as boolean,
    ...(allowNoSandbox ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : {}),
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('GoInvo marketing SEO audit (+https://www.goinvo.com)')
    await page.setRequestInterception(true)
    const approvedHosts = new Map<string, Promise<void>>()
    page.on('request', (request) => {
      // Every network request stays inside the approved SEO origins. Third-party
      // analytics/fonts/images are irrelevant to the DOM-content comparison;
      // blocking them also prevents a page from turning Chrome into an SSRF
      // relay. Media, images and fonts are blocked outright to bound bandwidth.
      if (['image', 'media', 'font'].includes(request.resourceType())) {
        void request.abort('blockedbyclient')
        return
      }
      void (async () => {
        try {
          const requestUrl = new URL(request.url())
          if (requestUrl.protocol === 'data:' || requestUrl.protocol === 'blob:') {
            await request.continue()
            return
          }
          validateSeoTargetUrl(request.url())
          let hostCheck = approvedHosts.get(requestUrl.hostname)
          if (!hostCheck) {
            hostCheck = assertPublicNetworkUrl(request.url())
            approvedHosts.set(requestUrl.hostname, hostCheck)
          }
          await hostCheck
          await request.continue()
        } catch {
          await request.abort('blockedbyclient').catch(() => {})
        }
      })()
    })
    await page.goto(safeUrl, { waitUntil: 'networkidle2', timeout: RENDER_TIMEOUT_MS })
    // Short settle so client-side hydration / late content injection lands.
    await new Promise((resolve) => setTimeout(resolve, 750))
    return await page.evaluate(
      (maxChars) => document.documentElement.outerHTML.slice(0, maxChars),
      SEO_RESPONSE_MAX_BYTES,
    )
  } finally {
    await browser.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// The graceful fallback — returned whenever the rendered DOM can't be obtained,
// so the engine never throws (mirrors robotsUnavailableFinding in
// seoAuditGeo.ts and unavailableFinding in seoAuditIndexation.ts).
// ---------------------------------------------------------------------------

function renderUnavailableFinding(url: string, reason: string): SeoFinding {
  const make = makeFinder('geo', url, new Date().toISOString())
  return make(
    'notice',
    'render-check-unavailable',
    'Render check unavailable — this audit could not load the page in a real browser (headless Chrome), so it cannot compare what a no-JavaScript crawler sees against the fully rendered page.',
    'AI answer engines (ChatGPT, Perplexity, Claude) and Google’s first indexing pass do not run JavaScript, so if a page’s content only appears after the browser runs its scripts, those crawlers miss it. This check could not run, so that risk is currently unverified — a data-availability gap, not a confirmed problem.',
    `Re-run the single-page audit to retry the render check. If it keeps failing, confirm the headless browser can launch in this environment and that ${url} loads in a normal browser. Diagnostic detail: ${reason}.`,
  )
}

// ---------------------------------------------------------------------------
// mapRenderGap — the PURE comparison: given the raw HTML and the rendered HTML,
// emit the render-gap findings. Exported so the verdict is unit-testable without
// stubbing Puppeteer or fetch at all.
// ---------------------------------------------------------------------------

// How much longer the rendered text has to be before we call it a real gap. A
// little growth is normal (a date string, a cookie banner); 25%+ longer means a
// meaningful chunk of the page's words only exist after JavaScript runs.
const TEXT_GROWTH_THRESHOLD = 0.25

export function mapRenderGap(url: string, rawHtml: string, renderedHtml: string): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const make = makeFinder('geo', url, detectedAt)

  const rawRoot = parse(rawHtml, { comment: false })
  const renderedRoot = parse(renderedHtml, { comment: false })

  // --- (a) Body text only present after hydration -------------------------
  const rawWords = wordCount(visibleText(parse(rawHtml, { comment: false })))
  const renderedWords = wordCount(visibleText(parse(renderedHtml, { comment: false })))
  if (rawWords >= 0 && renderedWords > 0) {
    const growth = rawWords === 0 ? Infinity : (renderedWords - rawWords) / rawWords
    if (growth > TEXT_GROWTH_THRESHOLD) {
      const pct = growth === Infinity ? 100 : Math.round((growth / (1 + growth)) * 100)
      findings.push(
        make(
          'warning',
          'text-only-after-render',
          `Much of this page’s text is not in the initial HTML: a no-JavaScript fetch reads about ${rawWords} words, but the fully rendered page has about ${renderedWords} — roughly ${pct}% of the visible text appears only after the browser runs JavaScript.`,
          'Much of this page’s text isn’t in the initial HTML, so AI search crawlers that don’t run JavaScript can’t read it — and Google’s first indexing pass doesn’t either. Content that only appears after hydration is at risk of being indexed late, partially, or not at all, and is far less likely to be lifted into an AI-generated answer.',
          'Render the page’s main content on the server so it is present in the initial HTML (server-side rendering or static generation), rather than fetching and injecting it client-side after load. In Next.js, keep the primary copy in Server Components and avoid gating it behind client-only data fetches.',
        ),
      )
    }
  }

  // --- (b) Main heading (H1) present rendered but absent raw --------------
  const rawH1 = collapse(rawRoot.querySelector('h1')?.text || '')
  const renderedH1 = collapse(renderedRoot.querySelector('h1')?.text || '')
  if (!rawH1 && renderedH1) {
    findings.push(
      make(
        'warning',
        'h1-only-after-render',
        `This page’s main heading (its H1) only appears after JavaScript runs: the no-JavaScript HTML has no H1, but the rendered page’s main heading is "${renderedH1.slice(0, 120)}${renderedH1.length > 120 ? '…' : ''}".`,
        'The main heading (H1) is the single strongest on-page signal of what a page is about. If it only exists after hydration, the crawlers that don’t run JavaScript — AI answer engines and Google’s first indexing wave — read a page with no clear subject, which weakens both ranking and the chance of being cited.',
        'Render the main heading (H1) on the server so it is in the initial HTML. In Next.js, put the H1 in a Server Component (or static page output) rather than rendering it client-side after the page loads.',
      ),
    )
  }

  // --- (c) Structured data (JSON-LD) present rendered but absent raw ------
  const rawHasSchema = hasStructuredData(rawRoot)
  const renderedHasSchema = hasStructuredData(renderedRoot)
  if (!rawHasSchema && renderedHasSchema) {
    findings.push(
      make(
        'warning',
        'schema-only-after-render',
        'This page’s structured data (its JSON-LD code) only appears after JavaScript runs — the no-JavaScript HTML contains no structured-data block, but the rendered page does.',
        'Structured data (JSON-LD) is how search and AI engines reliably extract facts about a page (who, what, when). Google can process script-injected structured data on a later rendering pass, but it is slower and less reliable, and AI answer crawlers that don’t run JavaScript miss it entirely — so any rich result or AI-extractable fact it carries may not register.',
        'Emit the structured-data (JSON-LD) block in the server-rendered HTML rather than injecting it with client-side JavaScript. In Next.js, render the <script type="application/ld+json"> from a Server Component or the route’s metadata so it is in the initial HTML.',
      ),
    )
  }

  // --- (d) In-content links present rendered but absent raw --------------
  const rawLinks = contentLinkCount(rawRoot)
  const renderedLinks = contentLinkCount(renderedRoot)
  if (rawLinks === 0 && renderedLinks > 0) {
    findings.push(
      make(
        'notice',
        'links-only-after-render',
        `This page’s in-content links only appear after JavaScript runs: the no-JavaScript HTML has no body links, but the rendered page has about ${renderedLinks}.`,
        'Internal links in the page’s content are how crawlers discover other pages and how link value flows through the site. Links that exist only after hydration are followed late or missed by no-JavaScript crawlers, so the pages they point to can go undiscovered and the site’s internal-link signal is weakened.',
        'Render the page’s in-content links in the server HTML so crawlers can follow them on the first pass. In Next.js, use the framework’s <Link> from Server Components rather than building the links client-side after load.',
      ),
    )
  }

  return findings
}

// ---------------------------------------------------------------------------
// auditRenderGap — fetch the page both ways and run the pure comparison.
// NEVER throws: if the raw fetch fails OR the rendered DOM can't be obtained
// (Puppeteer launch/timeout/throw), it returns the single graceful notice.
//
// The two HTML sources are injectable so the mapping is unit-testable without a
// real browser: tests pass a stub `rendered` source (canned HTML, or one that
// throws to exercise the graceful path).
// ---------------------------------------------------------------------------

export type AuditRenderGapOptions = {
  // The raw, no-JavaScript HTML source. Defaults to the engine's fetchPageHtml.
  raw?: (url: string) => Promise<string>
  // The fully-rendered (post-JavaScript) HTML source. Defaults to headless
  // Chrome via Puppeteer (fetchRenderedHtml).
  rendered?: RenderedHtmlSource
}

export async function auditRenderGap(
  url: string,
  opts: AuditRenderGapOptions = {},
): Promise<SeoFinding[]> {
  const rawSource = opts.raw ?? fetchPageHtml
  const renderedSource = opts.rendered ?? fetchRenderedHtml

  let rawHtml: string
  try {
    rawHtml = await rawSource(url)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown fetch error'
    return [renderUnavailableFinding(url, `raw fetch failed: ${reason}`)]
  }

  let renderedHtml: string
  try {
    renderedHtml = await renderedSource(url)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown render error'
    return [renderUnavailableFinding(url, reason)]
  }

  if (!renderedHtml || !renderedHtml.trim()) {
    return [renderUnavailableFinding(url, 'the rendered page returned no HTML')]
  }

  return mapRenderGap(url, rawHtml, renderedHtml)
}
