import { parse, type HTMLElement } from 'node-html-parser'
import { auditIndexation } from './seoAuditIndexation'
import {
  auditAiReadiness,
  auditEeat,
  auditAiCrawlerAccess,
} from './seoAuditGeo'
import { auditRenderGap } from './seoAuditRender'
import { auditCwv } from './seoAuditCwv'

// Re-export the indexation layer so callers can import everything from the
// engine entry point. (seoAuditIndexation imports the finding model + weights
// from here; the cycle is import-only and resolved lazily at call time.)
export { auditIndexation, mapInspection } from './seoAuditIndexation'

// Re-export the GEO / AI-readiness pack so callers (route + tests) can import
// the whole engine from this one entry point. Same import-only cycle as the
// indexation layer (seoAuditGeo imports the finding model + weights from here).
export {
  auditAiReadiness,
  auditEeat,
  auditAiCrawlerAccess,
  mapRobotsAccess,
  parseRobots,
} from './seoAuditGeo'

// Re-export the render-diff pack (raw HTML vs hydrated DOM) so callers can pull
// the whole engine from this one entry point. Same import-only cycle as the
// other packs — seoAuditRender imports the finding model + fetchPageHtml from
// here, resolved lazily at call time. Puppeteer is slow, so auditPage only runs
// it behind opts.includeRenderDiff (the route enables it for single-page mode).
export {
  auditRenderGap,
  mapRenderGap,
  fetchRenderedHtml,
} from './seoAuditRender'

// Re-export the Core Web Vitals pack (CrUX field data via the free PageSpeed
// Insights API, with a Lighthouse lab fallback) so callers can pull the whole
// engine from this one entry point. Same import-only cycle as the other packs —
// seoAuditCwv imports the finding model + weights from here, resolved lazily at
// call time. It's a network round-trip to Google, so auditPage only runs it
// behind opts.includeCwv (the route enables it for single-page mode).
export { auditCwv, mapCwv } from './seoAuditCwv'

// SEO audit engine — Phase 1 of the SEO-suite revamp (see
// docs/seo-suite-revamp-plan.md). This is the "actually inspect the page"
// half the old suite never had: it fetches a page, parses the HTML with a real
// parser (node-html-parser, already in the tree via next/sanity), and emits
// concrete, designer-friendly findings using the unified `SeoFinding` model.
//
// Hard rules from the plan it implements here:
//  - §3 unified finding model (one object per issue, uniform across categories).
//  - §4 on-page + structured-data check taxonomy, powered ONLY by direct HTML
//    parsing — no TextFocus (its MCP is down and is a later phase).
//  - §5 Health Score where ONLY `error`-severity findings move the number.
//  - §6 actionability: every finding names the actual offending value and gives
//    a what / why / howToFix written for non-SEO designers.
//
// Everything here is pure + deterministic given an (url, html) pair except
// fetchPageHtml/auditPage, so the checks are trivially unit-testable.

// ---------------------------------------------------------------------------
// §3 The unified finding model
// ---------------------------------------------------------------------------

export type SeoFindingCategory =
  | 'technical'
  | 'indexation'
  | 'onpage'
  | 'content'
  | 'structured-data'
  | 'performance'
  | 'internal-linking'
  | 'eeat'
  | 'geo'

export type SeoFindingSeverity = 'error' | 'warning' | 'notice'

export type SeoFindingSource =
  | 'gsc'
  | 'ga4'
  | 'textfocus'
  | 'html-parse'
  | 'citation-check'

export type SeoFindingStatus = 'open' | 'snoozed' | 'fixed'

export type SeoFinding = {
  id: string
  category: SeoFindingCategory
  severity: SeoFindingSeverity // only `error` moves the Health Score
  priorityWeight: number // configurable, data-driven (not hardcoded)
  urlsAffected: number
  pctSite: number
  indexable: boolean
  what: string // plain-language definition
  why: string // SEO/UX/business "so what"
  howToFix: string // concrete remediation, designer-friendly
  affectedUrls: string[]
  source: SeoFindingSource
  status: SeoFindingStatus
  detectedAt: string
}

// ---------------------------------------------------------------------------
// Severity weights — §5 says these are configurable DATA, not hardcoded into
// each check, so the score can be re-tiered without touching detection logic.
// A check declares which weight key it uses; the engine reads the number here.
// ---------------------------------------------------------------------------

export const DEFAULT_PRIORITY_WEIGHTS: Record<SeoFindingSeverity, number> = {
  error: 10,
  warning: 5,
  notice: 2,
}

// ---------------------------------------------------------------------------
// Fetch — reuse the timeout/User-Agent/no-store pattern from the marketing
// routes (citation-check + research/run). Throws on non-2xx or timeout; callers
// (auditPage) translate a throw into a finding so the engine never explodes.
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = Number(process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 10000)

export async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    })
    const html = await res.text()
    if (!res.ok) throw new Error(`Page returned ${res.status}`)
    return html
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Small parsing helpers
// ---------------------------------------------------------------------------

// A stable, human-readable finding id: `<category>:<check>` so the same issue on
// the same page is the same id audit-over-audit (needed for §7 resolution
// tracking / deltas). URL-specific data lives in affectedUrls, not the id.
function findingId(category: SeoFindingCategory, check: string): string {
  return `${category}:${check}`
}

function attr(el: HTMLElement | null | undefined, name: string): string {
  return (el?.getAttribute(name) || '').trim()
}

// Collapse whitespace the way a browser would when measuring visible text, so
// length checks (title/meta) match what Google actually sees.
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

// ---------------------------------------------------------------------------
// §4 On-page checks — title / meta / H1 / heading order / canonical / OG /
// Twitter / alt-text coverage. Pure: (url, html) -> findings. Every finding
// quotes the actual offending value (§6).
// ---------------------------------------------------------------------------

export function auditOnPage(url: string, html: string): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const root = parse(html, { comment: false })
  const head = root.querySelector('head') || root

  const base = (
    severity: SeoFindingSeverity,
    check: string,
    what: string,
    why: string,
    howToFix: string,
  ): SeoFinding => ({
    id: findingId('onpage', check),
    category: 'onpage',
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

  // --- Title ---------------------------------------------------------------
  const titleEl = head.querySelector('title')
  const title = collapse(titleEl?.text || '')
  if (!titleEl || !title) {
    findings.push(
      base(
        'error',
        'title-missing',
        'This page has no title tag (the page title in the HTML, or it is empty).',
        'The title is the clickable headline in Google results and the browser tab. Without one, Google invents text from the page and the listing looks broken — directly costing clicks.',
        'Add a unique page title of about 30–60 characters that names the page and "GoInvo", e.g. "Healthcare Data Visualization — GoInvo".',
      ),
    )
  } else if (title.length > 60) {
    findings.push(
      base(
        'warning',
        'title-too-long',
        `The page title is ${title.length} characters: "${title}".`,
        'Google truncates titles past ~60 characters with an ellipsis, so the end of your headline is cut off in results.',
        `Trim it to 60 characters or fewer. Lead with the most important words; the current title loses everything after roughly "${title.slice(0, 57).trimEnd()}…".`,
      ),
    )
  } else if (title.length < 30) {
    findings.push(
      base(
        'notice',
        'title-too-short',
        `The page title is only ${title.length} characters: "${title}".`,
        'Very short titles waste the most valuable space in the result and usually omit the keywords people actually search for.',
        `Expand "${title}" toward 30–60 characters by adding the page's topic and "GoInvo" (e.g. "${title} — GoInvo").`,
      ),
    )
  }

  // --- Meta description ----------------------------------------------------
  const descEl = head.querySelector('meta[name="description"]')
  const desc = collapse(attr(descEl, 'content'))
  if (!descEl || !desc) {
    findings.push(
      base(
        'warning',
        'meta-description-missing',
        'This page has no meta description (the snippet shown under the page title in search results).',
        'The meta description is the grey snippet under your title in search results. Without one Google auto-generates text that is often off-message, lowering click-through.',
        'Add a meta description tag of about 70–160 characters summarizing the page with a reason to click.',
      ),
    )
  } else if (desc.length > 160) {
    findings.push(
      base(
        'warning',
        'meta-description-too-long',
        `The meta description is ${desc.length} characters: "${desc}".`,
        'Google cuts descriptions off around 160 characters, so your call to action at the end is dropped from the snippet.',
        `Tighten it to 160 characters or fewer. The current text is cut after roughly "${desc.slice(0, 157).trimEnd()}…".`,
      ),
    )
  } else if (desc.length < 70) {
    findings.push(
      base(
        'notice',
        'meta-description-too-short',
        `The meta description is only ${desc.length} characters: "${desc}".`,
        'A thin description under-sells the page and leaves snippet space empty, which can reduce click-through.',
        `Expand "${desc}" toward 70–160 characters with a specific benefit or detail.`,
      ),
    )
  }

  // --- Single H1 -----------------------------------------------------------
  const h1s = root.querySelectorAll('h1')
  if (h1s.length === 0) {
    findings.push(
      base(
        'error',
        'h1-missing',
        'This page has no main heading (the H1, the single most important heading on the page).',
        'The main heading (H1) is the page’s primary on-page headline; search engines and screen readers use it to understand the primary topic. A page with no main heading reads as having no clear subject.',
        'Add exactly one main heading (H1) at the top of the main content that states what the page is about.',
      ),
    )
  } else if (h1s.length > 1) {
    const texts = h1s
      .slice(0, 3)
      .map((h) => `"${collapse(h.text)}"`)
      .join(', ')
    findings.push(
      base(
        'warning',
        'h1-multiple',
        `This page has ${h1s.length} main headings (H1 — the top-level heading there should only be one of) (e.g. ${texts}).`,
        'Multiple main headings (H1s) blur which heading is the page’s true subject and dilute the topical signal; assistive tech also expects a single top-level heading.',
        'Keep one main heading (H1) for the page title and demote the others to second- or third-level headings (H2/H3) so there is a single, clear main heading.',
      ),
    )
  }

  // --- Heading order (no skipped levels, e.g. h2 -> h4) --------------------
  const headings = root.querySelectorAll(HEADING_TAGS.join(','))
  let prevLevel = 0
  for (const h of headings) {
    const level = Number(h.tagName.slice(1))
    if (prevLevel > 0 && level > prevLevel + 1) {
      findings.push(
        base(
          'notice',
          'heading-order-skip',
          `The headings jump from a level-${prevLevel} heading (an <h${prevLevel}> tag) straight to a level-${level} heading (an <h${level}> tag), skipping the levels in between, at "${collapse(h.text).slice(0, 80)}".`,
          'Skipped heading levels break the document outline (the heading hierarchy H1 → H2 → H3 …) that search engines and screen-reader users rely on to navigate the page structure.',
          `Change this level-${level} heading (the <h${level}> tag) to a level-${prevLevel + 1} heading (an <h${prevLevel + 1}> tag), or add the missing intermediate heading, so levels increase one step at a time.`,
        ),
      )
      break // one representative finding per page; drill-to-URL covers the rest
    }
    prevLevel = level
  }

  // --- Canonical -----------------------------------------------------------
  const canonical = head.querySelector('link[rel="canonical"]')
  if (!canonical || !attr(canonical, 'href')) {
    findings.push(
      base(
        'warning',
        'canonical-missing',
        'This page has no canonical tag (the tag that tells search engines which URL is the primary version of this page).',
        'The canonical tag tells Google which URL is the "real" one. Without it, duplicate or parameter-laden (extra-query-string) versions of this page can split ranking signals or get indexed instead of the page you want.',
        `Add a canonical tag pointing at this page’s preferred URL (${url}) in the page’s <head> section (the hidden top section of the HTML where metadata lives).`,
      ),
    )
  }

  // --- Open Graph (title + image) -----------------------------------------
  const ogTitle = head.querySelector('meta[property="og:title"]')
  if (!ogTitle || !attr(ogTitle, 'content')) {
    findings.push(
      base(
        'notice',
        'og-title-missing',
        'This page has no Open Graph title (the og:title tag — an Open Graph / social-share preview tag that sets the headline on shared links).',
        'The Open Graph title is the headline shown when the page is shared on LinkedIn, Slack, Facebook, etc. Without it the share card falls back to a generic or wrong title, hurting referral clicks.',
        'Add an Open Graph title tag (og:title) with a share-friendly headline for this page.',
      ),
    )
  }
  const ogImage = head.querySelector('meta[property="og:image"]')
  if (!ogImage || !attr(ogImage, 'content')) {
    findings.push(
      base(
        'notice',
        'og-image-missing',
        'This page has no Open Graph image (the og:image tag — the Open Graph / social-share preview tag that sets the thumbnail on shared links).',
        'The Open Graph image is the preview thumbnail on social shares. Without it links to this page appear as a bare text card, which gets far fewer clicks.',
        'Add an Open Graph image tag (og:image) pointing at a 1200×630 preview image for this page.',
      ),
    )
  }

  // --- Twitter card --------------------------------------------------------
  const twitterCard = head.querySelector('meta[name="twitter:card"]')
  if (!twitterCard || !attr(twitterCard, 'content')) {
    findings.push(
      base(
        'notice',
        'twitter-card-missing',
        'This page has no Twitter/X card tag (the twitter:card tag, which controls how the page looks when shared on Twitter/X).',
        'The Twitter/X card tag controls how the page renders when shared on X/Twitter. Without it the link shows as plain text instead of a rich preview.',
        'Add a Twitter/X card tag (twitter:card) set to a large-image summary card, plus a Twitter/X title and image tag, in the page’s <head> section.',
      ),
    )
  }

  // --- Image alt-text coverage --------------------------------------------
  const imgs = root.querySelectorAll('img')
  if (imgs.length > 0) {
    // An image counts as covered if it has a non-empty alt OR an explicit
    // alt="" (intentional decorative marker), or is hidden from assistive tech.
    const missing = imgs.filter((img) => {
      const hasAltAttr = img.getAttribute('alt') !== undefined
      const ariaHidden = attr(img, 'aria-hidden') === 'true'
      const presentation = ['presentation', 'none'].includes(attr(img, 'role'))
      return !hasAltAttr && !ariaHidden && !presentation
    })
    if (missing.length > 0) {
      const pct = Math.round((missing.length / imgs.length) * 100)
      const examples = missing
        .slice(0, 3)
        .map((img) => attr(img, 'src') || attr(img, 'data-src') || '(inline image)')
        .join(', ')
      findings.push(
        base(
          missing.length === imgs.length ? 'warning' : 'notice',
          'image-alt-missing',
          `${missing.length} of ${imgs.length} images (${pct}%) have no alternative text (the description screen readers and search engines use for an image), e.g. ${examples}.`,
          'Alternative text is how Google Images and screen readers understand a picture. Missing alternative text loses image-search traffic and is an accessibility failure.',
          'Add a short, descriptive alternative text to each flagged image (or mark it as decorative with an empty alternative text if it is purely decorative). Start with the examples listed above.',
        ),
      )
    }
  }

  return findings
}

// ---------------------------------------------------------------------------
// §4 Structured-data checks — parse every JSON-LD block, report parse failures,
// collect @type values, and flag missing recommended schema for the page kind.
// Direct JSON-LD parse only (the "High reliability" path in the plan); no TF.
// ---------------------------------------------------------------------------

// Recursively collect @type strings from a JSON-LD node (handles @graph,
// arrays, and nested objects).
function collectTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const t = obj['@type']
    if (typeof t === 'string') out.add(t)
    else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') out.add(v)
    if (Array.isArray(obj['@graph'])) collectTypes(obj['@graph'], out)
  }
}

// Decide what kind of page this is so we know which schema to expect. A purely
// structural heuristic (URL + on-page signals) — no network calls.
function classifyPageKind(url: string, root: HTMLElement): 'home' | 'faq' | 'content' {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // keep raw url as path
  }
  const normalized = path.replace(/\/+$/, '')
  if (normalized === '' || normalized === '/') return 'home'

  // FAQ-like: several short heading-as-question + answer pairs, or "faq" in path.
  if (/faq|frequently-asked|questions/i.test(path)) return 'faq'
  const questionHeadings = root
    .querySelectorAll(HEADING_TAGS.join(','))
    .filter((h) => collapse(h.text).endsWith('?')).length
  if (questionHeadings >= 3) return 'faq'

  return 'content'
}

// Does this page look like a dataset / data visualization — GoInvo's open data,
// which is a citation magnet AI engines rarely see marked up in this space?
// Structural signal only: the URL path or the visible body copy. (§12 says add
// Dataset-schema recommendations for exactly these pages.)
//
// Tightened (§12 correction): the old version over-flagged the HOMEPAGE, which
// naturally mentions GoInvo's open-source data work in its overview copy. A
// genuine dataset page lives under a content route (/vision/ or /work/) — the
// determinants essay (/vision/determinants-of-health) is the canonical example
// — OR carries an unmistakable in-content data signal. The homepage / root path
// is exempt outright: it is a brand overview, not a citable dataset.
function looksLikeDataPage(url: string, root: HTMLElement): boolean {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // keep raw url as path
  }
  const normalized = path.replace(/\/+$/, '')

  // The homepage / root is a brand overview, never a dataset page — exempt it
  // outright so its open-data mentions don't trip this.
  if (normalized === '' || normalized === '/') return false

  // A genuine content/data page lives under one of GoInvo's article routes.
  const isContentRoute = /^\/(vision|work)\//.test(path)

  // The URL path itself names data/visualization/open-source/dataset — a strong
  // signal on its own, but only when it's NOT the root (handled above).
  const pathNamesData =
    /data|visuali[sz]ation|open-source|opensource|dataset|determinants/i.test(path)

  const body = root.querySelector('body') || root
  const text = collapse(body.text).toLowerCase()
  // Distinct data signals in the copy; two is the "strong in-content data
  // signal" bar so a one-off mention of the word "data" doesn't qualify.
  const signals = [
    /\bdata\s?set\b|\bdatasets\b/.test(text),
    /\bvisuali[sz]ation/.test(text),
    /\bopen[-\s]?source\b/.test(text),
    /\bdeterminants of health\b/.test(text),
  ].filter(Boolean).length

  // Fire when the page is on a content route AND looks like data (its path names
  // it, or the copy carries two data signals), OR — off a content route — only
  // when the path itself unambiguously names a dataset and the copy backs it up.
  if (isContentRoute) return pathNamesData || signals >= 2
  return pathNamesData && signals >= 2
}

// Collect the top-level schema OBJECTS (not just @type strings) so property
// validation can read required fields like headline/author/datePublished. Walks
// the same @graph / array / nested shape collectTypes does, but keeps the object
// whenever it carries an @type, keyed by its first @type for quick lookup.
function collectObjectsByType(node: unknown, out: Map<string, Record<string, unknown>>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectObjectsByType(item, out)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const t = obj['@type']
    const types: string[] = []
    if (typeof t === 'string') types.push(t)
    else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') types.push(v)
    for (const type of types) if (!out.has(type)) out.set(type, obj)
    if (Array.isArray(obj['@graph'])) collectObjectsByType(obj['@graph'], out)
  }
}

// Is a JSON-LD property present and non-empty (string, object, or array)?
function hasProp(obj: Record<string, unknown> | undefined, key: string): boolean {
  if (!obj) return false
  const v = obj[key]
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

export function auditStructuredData(url: string, html: string): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const root = parse(html, { comment: false })

  const make = (
    severity: SeoFindingSeverity,
    check: string,
    what: string,
    why: string,
    howToFix: string,
  ): SeoFinding => ({
    id: findingId('structured-data', check),
    category: 'structured-data',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0,
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source: 'html-parse',
    status: 'open',
    detectedAt,
  })

  const blocks = root.querySelectorAll('script[type="application/ld+json"]')
  const types = new Set<string>()
  const objectsByType = new Map<string, Record<string, unknown>>()
  let parsedOk = 0

  blocks.forEach((block, i) => {
    const raw = block.text.trim()
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      parsedOk++
      collectTypes(data, types)
      collectObjectsByType(data, objectsByType)
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown parse error'
      findings.push(
        make(
          'error',
          `json-ld-invalid-${i}`,
          `Structured-data block #${i + 1} contains broken code (it is not valid JSON: ${reason}). Structured data is the JSON-LD code that gives Google machine-readable facts about the page.`,
          'Invalid structured data is ignored by Google entirely, so any rich result (an enhanced search listing such as star ratings, FAQ drop-downs, or breadcrumb trails) this block was meant to produce silently fails.',
          `Fix the broken code in this structured-data (JSON-LD) block (the parser failed near: ${reason}). Validate it with Google’s free Rich Results Test at search.google.com/test/rich-results.`,
        ),
      )
    }
  })

  // Recommended-schema gap, scoped to the page kind (plan §4).
  const kind = classifyPageKind(url, root)
  const typeList = [...types]
  const typesLabel = typeList.length ? typeList.join(', ') : 'none'

  if (kind === 'home' && !types.has('Organization')) {
    findings.push(
      make(
        'warning',
        'schema-organization-missing',
        `The homepage has no Organization structured data — the JSON-LD code that describes the company to Google (found instead: ${typesLabel}).`,
        'Organization structured data feeds Google’s knowledge panel (the brand info box on the right of search results) — your logo, name, and social profiles. Without it Google may show no brand entity for GoInvo.',
        'Add an Organization structured-data (JSON-LD) block with the company name, website URL, logo, and links to your official social profiles in the homepage’s <head> section.',
      ),
    )
  }

  // Organization is present — validate the properties that actually power the
  // knowledge panel so a stub block doesn't silently pass.
  if (types.has('Organization')) {
    const org = objectsByType.get('Organization')
    const missingOrg = (['name', 'url', 'logo'] as const).filter((p) => !hasProp(org, p))
    if (missingOrg.length > 0) {
      findings.push(
        make(
          'notice',
          'schema-organization-incomplete',
          `The Organization structured data is missing recommended propert${missingOrg.length === 1 ? 'y' : 'ies'}: ${missingOrg.join(', ')}.`,
          'Google’s knowledge panel (the brand info box beside search results) is built from these Organization fields. A block missing the company name, website URL, or logo gives Google an incomplete brand entity and may show nothing at all.',
          `Add the missing Organization propert${missingOrg.length === 1 ? 'y' : 'ies'} (${missingOrg.join(', ')}) to the structured-data (JSON-LD) block — the official company name, the canonical website URL, and a logo image URL.`,
        ),
      )
    }
  }

  if (kind === 'content' && !types.has('Article') && !types.has('BlogPosting') && !types.has('NewsArticle')) {
    findings.push(
      make(
        'notice',
        'schema-article-missing',
        `This content page has no Article structured data — the JSON-LD code that marks it up as an article for Google (found instead: ${typesLabel}).`,
        'Article structured data makes a page eligible for richer results (a search listing showing the headline, author, and date) and helps Google and AI engines treat it as authored content rather than a generic page.',
        'Add an Article (or blog-post) structured-data (JSON-LD) block listing the headline, author, publication date, and a representative image.',
      ),
    )
  }

  // Article is present — validate the properties that make it eligible for the
  // richer result AND that AI engines lean on (headline, author, a date).
  const articleType = ['Article', 'BlogPosting', 'NewsArticle'].find((t) => types.has(t))
  if (articleType) {
    const article = objectsByType.get(articleType)
    const missingArticle: string[] = []
    if (!hasProp(article, 'headline')) missingArticle.push('headline')
    if (!hasProp(article, 'author')) missingArticle.push('author')
    if (!hasProp(article, 'datePublished') && !hasProp(article, 'dateModified')) {
      missingArticle.push('datePublished or dateModified')
    }
    if (missingArticle.length > 0) {
      findings.push(
        make(
          'notice',
          'schema-article-incomplete',
          `The ${articleType} structured data is missing recommended propert${missingArticle.length === 1 ? 'y' : 'ies'}: ${missingArticle.join(', ')}.`,
          'These are the fields Google and AI answer engines read to show (and trust) the headline, who wrote it, and how fresh it is. Without an author or a date especially, a healthcare ("Your Money or Your Life") page is held to a higher trust bar and is less likely to be surfaced or cited.',
          `Add the missing propert${missingArticle.length === 1 ? 'y' : 'ies'} (${missingArticle.join(', ')}) to the ${articleType} structured-data (JSON-LD) block — a headline, a named author, and a publication or last-modified date.`,
        ),
      )
    }
  }

  // Recommend author / Person schema on content pages — the YMYL trust signal
  // AI engines lean on. (Separate from the E-E-A-T page-level byline check; this
  // is specifically the machine-readable structured-data half.)
  if (kind === 'content' && !types.has('Person') && !objectsByType.get(articleType || '')?.['author']) {
    findings.push(
      make(
        'notice',
        'schema-person-missing',
        `This content page has no author identified in structured data — there is no Person structured data (the JSON-LD code that names and describes the author) and no author on an Article block (found instead: ${typesLabel}).`,
        'For healthcare and other "Your Money or Your Life" (YMYL) topics, Google and AI answer engines weigh a named, credentialed author heavily as a trust signal. Marking the author up as a Person (with their role and a link to a bio) makes that expertise machine-readable.',
        'Add an author to the page’s Article structured data (JSON-LD) as a Person — with the author’s name and a link to a bio page that establishes their relevant expertise.',
      ),
    )
  }

  // Recommend Dataset schema on pages that look like GoInvo's open data /
  // visualizations — a citation magnet AI engines rarely see marked up here.
  if (looksLikeDataPage(url, root) && !types.has('Dataset')) {
    findings.push(
      make(
        'notice',
        'schema-dataset-missing',
        `This page looks like open data or a data visualization but has no Dataset structured data — the JSON-LD code that describes a dataset to search and AI engines (found instead: ${typesLabel}).`,
        'Dataset structured data makes GoInvo’s open data discoverable in Google’s Dataset Search and gives AI answer engines a machine-readable handle on the underlying data — and GoInvo’s open healthcare data is exactly the kind of original, citable source AI engines rarely see marked up in this space.',
        'Add a Dataset structured-data (JSON-LD) block describing the data — its name, description, the license, the creator (GoInvo), and a link to download or explore it.',
      ),
    )
  }

  // Recommend BreadcrumbList everywhere off the homepage — cheap, and it feeds
  // the breadcrumb trail in search listings and the page’s place in the site.
  if (kind !== 'home' && !types.has('BreadcrumbList')) {
    findings.push(
      make(
        'notice',
        'schema-breadcrumb-missing',
        `This page has no breadcrumb structured data — the BreadcrumbList JSON-LD code that tells search engines where the page sits in the site hierarchy (found instead: ${typesLabel}).`,
        'Breadcrumb structured data lets Google show a breadcrumb trail (Home › Section › Page) in the search listing instead of a bare URL, and helps search and AI engines understand how the page relates to the rest of the site.',
        'Add a BreadcrumbList structured-data (JSON-LD) block listing the path from the homepage to this page, each step with its name and URL.',
      ),
    )
  }

  // FAQ markup — DEMOTED. FAQ rich results are being retired (May 2026), so we
  // do NOT present FAQPage as a rich-result win. If the page reads like an FAQ
  // and lacks the markup, suggest it ONLY as an AI-extraction (GEO) aid.
  if (kind === 'faq' && !types.has('FAQPage')) {
    findings.push(
      make(
        'notice',
        'schema-faqpage-missing',
        `This page reads like an FAQ (a frequently-asked-questions page) but has no FAQ-page structured data — the JSON-LD code that marks up its question-and-answer pairs (found instead: ${typesLabel}).`,
        'FAQ-page structured data no longer earns the question-and-answer rich result in Google (that listing is being retired in 2026), so this is NOT a rich-result win. It is still useful for AI answer engines (chatbots and AI Overviews), which lift clearly marked question-and-answer pairs to answer prompts.',
        'Optional, for AI extraction only: add an FAQ-page structured-data (JSON-LD) block listing each question and answer pair. Do not expect a rich result from it — the value now is helping AI answer engines quote your answers.',
      ),
    )
  }

  // If there is NO structured data at all, surface it once as a notice so the
  // page isn’t silently passing the recommended-schema checks above by virtue
  // of being un-classifiable.
  if (blocks.length === 0) {
    findings.push(
      make(
        'notice',
        'json-ld-none',
        'This page has no structured data at all (no JSON-LD code — the machine-readable facts that give Google details about the page).',
        'Structured data is how search and AI engines reliably extract facts (who, what, when). Pages without any are eligible for zero rich results (enhanced search listings).',
        'Add at least one relevant structured-data (JSON-LD) block: Organization on the homepage, Article on content pages, FAQ-page on question-and-answer pages.',
      ),
    )
  }

  return findings
}

// ---------------------------------------------------------------------------
// §5 Health Score.
//
// Formula (Ahrefs model): score = round( errorless URLs / total URLs × 100 ),
// where a URL is "errorless" if it has NO finding of severity `error`. Warnings
// and notices are reported but DO NOT move the score, so the number stays
// signal, not noise. A clean page (no errors) therefore always scores 100.
//
// For a single-page audit total URLs = 1, so the score is 100 (no errors) or 0
// (any error). For a multi-page audit the route passes the union of findings
// (each finding carries its affectedUrls) plus the full URL set; this helper
// derives the errorless count from affectedUrls so it works for both.
// ---------------------------------------------------------------------------

export type HealthScore = {
  score: number
  band: 'Weak' | 'Fair' | 'Good' | 'Excellent'
  errors: number
  warnings: number
  notices: number
}

function bandFor(score: number): HealthScore['band'] {
  if (score <= 30) return 'Weak'
  if (score <= 70) return 'Fair'
  if (score <= 90) return 'Good'
  return 'Excellent'
}

export function computeHealthScore(findings: SeoFinding[], totalUrls?: number): HealthScore {
  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warning').length
  const notices = findings.filter((f) => f.severity === 'notice').length

  // URLs that have at least one error.
  const urlsWithError = new Set<string>()
  for (const f of errors) for (const u of f.affectedUrls) urlsWithError.add(u)

  // Total URLs: explicit arg wins; otherwise infer from every finding's
  // affectedUrls; otherwise it's a single page.
  let total = totalUrls ?? 0
  if (!total) {
    const allUrls = new Set<string>()
    for (const f of findings) for (const u of f.affectedUrls) allUrls.add(u)
    total = allUrls.size || 1
  }

  const errorless = Math.max(0, total - urlsWithError.size)
  const score = Math.round((errorless / total) * 100)

  return {
    score,
    band: bandFor(score),
    errors: errors.length,
    warnings,
    notices,
  }
}

// ---------------------------------------------------------------------------
// auditPage — fetch + both audits + score. NEVER throws: a fetch/parse failure
// becomes a finding (technical category) and the page scores 0.
// ---------------------------------------------------------------------------

export type PageAuditResult = {
  url: string
  findings: SeoFinding[]
  healthScore: HealthScore
}

export type AuditPageOptions = {
  // Opt-in: also run the GSC URL Inspection indexation layer. Off by default
  // because it is a slower network round-trip to Google (auth + inspect) per
  // page, so the multi-page sweep keeps it off to stay under GSC rate limits.
  includeIndexation?: boolean
  // Opt-in: also run the AI-crawler access audit (fetches the site's
  // robots.txt). It's a SITE-level check, not a page-level one, so the route
  // only enables it for the single ?url= mode — running it once per page in the
  // multi-page sweep would just re-fetch the same robots.txt N times.
  includeAiCrawlerAccess?: boolean
  // Opt-in: also run the render-diff (raw HTML vs hydrated DOM) check. It drives
  // the page through headless Chrome (Puppeteer), so it's by far the slowest
  // check — OFF by default. The route enables it for the single ?url= mode only;
  // the multi-page sweep keeps it off. Graceful: degrades to one notice, never
  // throws.
  includeRenderDiff?: boolean
  // Opt-in: also run the Core Web Vitals check. It's a network round-trip to
  // Google's PageSpeed Insights API (CrUX field data as PRIMARY, with a
  // Lighthouse lab fallback), so it's OFF by default. The route enables it for
  // the single ?url= mode only — the multi-page sweep keeps it off to avoid N
  // PageSpeed calls (and its low keyless quota). Graceful: degrades to one
  // notice, never throws.
  includeCwv?: boolean
}

export async function auditPage(
  url: string,
  opts: AuditPageOptions = {},
): Promise<PageAuditResult> {
  let html: string
  try {
    html = await fetchPageHtml(url)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown fetch error'
    const finding: SeoFinding = {
      id: findingId('technical', 'fetch-failed'),
      category: 'technical',
      severity: 'error',
      priorityWeight: DEFAULT_PRIORITY_WEIGHTS.error,
      urlsAffected: 1,
      pctSite: 0,
      indexable: false,
      what: `The page could not be loaded (${reason}).`,
      why: 'If the audit tool — which identifies itself like a normal web browser — cannot load the page, search-engine crawlers (the bots that read pages for Google) may not be able to either, which means it cannot rank at all.',
      howToFix: `Open ${url} in a browser to confirm it loads. Check for a server error, a redirect loop (the page bouncing endlessly between URLs), a robots-file or firewall block on automated requests, or a slow response exceeding the ${FETCH_TIMEOUT_MS}ms timeout.`,
      affectedUrls: [url],
      source: 'html-parse',
      status: 'open',
      detectedAt: new Date().toISOString(),
    }
    return { url, findings: [finding], healthScore: computeHealthScore([finding], 1) }
  }

  // On-page + structured-data + the parse-based GEO / AI-readiness + E-E-A-T
  // packs always run: they're pure HTML parsing with no network cost, and GEO /
  // AI-search is the strategic center of the suite (plan §12).
  const findings = [
    ...auditOnPage(url, html),
    ...auditStructuredData(url, html),
    ...auditAiReadiness(url, html),
    ...auditEeat(url, html),
  ]

  // Opt-in indexation layer (GSC URL Inspection). auditIndexation never throws
  // — it degrades to a single `notice` if GSC is unreachable — so this stays
  // safe even when the service account is missing or rate-limited.
  if (opts.includeIndexation) {
    findings.push(...(await auditIndexation(url)))
  }

  // Opt-in AI-crawler access audit (fetches robots.txt). Site-level, so the
  // route only turns it on for single-page audits. Graceful — never throws.
  if (opts.includeAiCrawlerAccess) {
    const siteUrl = (() => {
      try {
        return new URL(url).origin + '/'
      } catch {
        return undefined
      }
    })()
    findings.push(...(await auditAiCrawlerAccess(siteUrl)))
  }

  // Opt-in render-diff (raw HTML vs headless-Chrome rendered DOM). Puppeteer is
  // slow, so the route only enables it for single-page audits. Graceful — a
  // launch/timeout/throw degrades to a single notice, never a throw.
  if (opts.includeRenderDiff) {
    findings.push(...(await auditRenderGap(url)))
  }

  // Opt-in Core Web Vitals (PageSpeed Insights — CrUX field data as primary,
  // Lighthouse lab as fallback). It's a network round-trip to Google, so the
  // route only enables it for single-page audits. Graceful — a non-2xx /
  // timeout / throw degrades to a single notice, never a throw.
  if (opts.includeCwv) {
    findings.push(...(await auditCwv(url)))
  }

  return { url, findings, healthScore: computeHealthScore(findings, 1) }
}
