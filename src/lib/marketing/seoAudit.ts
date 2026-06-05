import { parse, type HTMLElement } from 'node-html-parser'

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
        'This page has no <title> tag (or it is empty).',
        'The title is the clickable headline in Google results and the browser tab. Without one, Google invents text from the page and the listing looks broken — directly costing clicks.',
        'Add a unique <title> of about 30–60 characters that names the page and "GoInvo", e.g. "Healthcare Data Visualization — GoInvo".',
      ),
    )
  } else if (title.length > 60) {
    findings.push(
      base(
        'warning',
        'title-too-long',
        `The <title> is ${title.length} characters: "${title}".`,
        'Google truncates titles past ~60 characters with an ellipsis, so the end of your headline is cut off in results.',
        `Trim it to 60 characters or fewer. Lead with the most important words; the current title loses everything after roughly "${title.slice(0, 57).trimEnd()}…".`,
      ),
    )
  } else if (title.length < 30) {
    findings.push(
      base(
        'notice',
        'title-too-short',
        `The <title> is only ${title.length} characters: "${title}".`,
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
        'This page has no meta description.',
        'The meta description is the grey snippet under your title in search results. Without one Google auto-generates text that is often off-message, lowering click-through.',
        'Add <meta name="description" content="…"> of about 70–160 characters summarizing the page with a reason to click.',
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
        'This page has no <h1> heading.',
        'The H1 is the page’s main on-page headline; search engines and screen readers use it to understand the primary topic. A page with no H1 reads as having no clear subject.',
        'Add exactly one <h1> at the top of the main content that states what the page is about.',
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
        `This page has ${h1s.length} <h1> headings (e.g. ${texts}).`,
        'Multiple H1s blur which heading is the page’s true subject and dilute the topical signal; assistive tech also expects a single top-level heading.',
        'Keep one <h1> for the page title and demote the others to <h2>/<h3> so there is a single, clear main heading.',
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
          `Heading levels skip from <h${prevLevel}> to <h${level}> at "${collapse(h.text).slice(0, 80)}".`,
          'Skipped heading levels break the document outline that search engines and screen-reader users rely on to navigate the page structure.',
          `Change this <h${level}> to <h${prevLevel + 1}>, or add the missing intermediate heading, so levels increase one step at a time.`,
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
        'This page has no canonical link (<link rel="canonical">).',
        'The canonical tag tells Google which URL is the "real" one. Without it, duplicate or parameterized versions of this page can split ranking signals or get indexed instead of the page you want.',
        `Add <link rel="canonical" href="${url}"> to the <head>, pointing at this page’s preferred URL.`,
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
        'This page has no og:title meta tag.',
        'og:title is the headline shown when the page is shared on LinkedIn, Slack, Facebook, etc. Without it the share card falls back to a generic or wrong title, hurting referral clicks.',
        'Add <meta property="og:title" content="…"> with a share-friendly headline for this page.',
      ),
    )
  }
  const ogImage = head.querySelector('meta[property="og:image"]')
  if (!ogImage || !attr(ogImage, 'content')) {
    findings.push(
      base(
        'notice',
        'og-image-missing',
        'This page has no og:image meta tag.',
        'og:image is the preview thumbnail on social shares. Without it links to this page appear as a bare text card, which gets far fewer clicks.',
        'Add <meta property="og:image" content="…"> pointing at a 1200×630 preview image for this page.',
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
        'This page has no twitter:card meta tag.',
        'twitter:card controls how the page renders when shared on X/Twitter. Without it the link shows as plain text instead of a rich preview.',
        'Add <meta name="twitter:card" content="summary_large_image"> (plus twitter:title/image) to the <head>.',
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
          `${missing.length} of ${imgs.length} images (${pct}%) have no alt attribute, e.g. ${examples}.`,
          'Alt text is how Google Images and screen readers understand a picture. Missing alt text loses image-search traffic and is an accessibility failure.',
          'Add a short, descriptive alt to each flagged image (or alt="" if it is purely decorative). Start with the examples listed above.',
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
  let parsedOk = 0

  blocks.forEach((block, i) => {
    const raw = block.text.trim()
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      parsedOk++
      collectTypes(data, types)
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown parse error'
      findings.push(
        make(
          'error',
          `json-ld-invalid-${i}`,
          `JSON-LD block #${i + 1} is not valid JSON (${reason}).`,
          'Invalid structured data is ignored by Google entirely, so any rich result (stars, FAQ, breadcrumbs) this block was meant to produce silently fails.',
          `Fix the JSON syntax in this <script type="application/ld+json"> block (the parser failed near: ${reason}). Validate it at search.google.com/test/rich-results.`,
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
        `The homepage has no Organization schema (found: ${typesLabel}).`,
        'Organization structured data feeds Google’s knowledge panel — your logo, name, and social profiles. Without it Google may show no brand entity for GoInvo.',
        'Add an Organization JSON-LD block with name, url, logo, and sameAs links to the homepage <head>.',
      ),
    )
  }

  if (kind === 'content' && !types.has('Article') && !types.has('BlogPosting') && !types.has('NewsArticle')) {
    findings.push(
      make(
        'notice',
        'schema-article-missing',
        `This content page has no Article schema (found: ${typesLabel}).`,
        'Article structured data makes a page eligible for richer results (headline, author, date) and helps Google and AI engines treat it as authored content rather than a generic page.',
        'Add an Article (or BlogPosting) JSON-LD block with headline, author, datePublished, and image.',
      ),
    )
  }

  if (kind === 'faq' && !types.has('FAQPage')) {
    findings.push(
      make(
        'notice',
        'schema-faqpage-missing',
        `This page reads like an FAQ but has no FAQPage schema (found: ${typesLabel}).`,
        'FAQPage structured data can show your questions and answers directly in search results and is a strong signal for AI answer engines, which lift Q&A content verbatim.',
        'Add a FAQPage JSON-LD block listing each question/answer pair shown on the page.',
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
        'This page has no JSON-LD structured data at all.',
        'Structured data is how search and AI engines reliably extract facts (who, what, when). Pages without any are eligible for zero rich results.',
        'Add at least one relevant JSON-LD block (Organization on the homepage, Article on content pages, FAQPage on Q&A pages).',
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

export async function auditPage(url: string): Promise<PageAuditResult> {
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
      what: `The page could not be fetched (${reason}).`,
      why: 'If the audit tool — using a normal browser User-Agent — cannot load the page, search-engine crawlers may not be able to either, which means it cannot rank at all.',
      howToFix: `Open ${url} in a browser to confirm it loads. Check for a server error, a redirect loop, a robots/firewall block on automated requests, or a slow response exceeding the ${FETCH_TIMEOUT_MS}ms timeout.`,
      affectedUrls: [url],
      source: 'html-parse',
      status: 'open',
      detectedAt: new Date().toISOString(),
    }
    return { url, findings: [finding], healthScore: computeHealthScore([finding], 1) }
  }

  const findings = [...auditOnPage(url, html), ...auditStructuredData(url, html)]
  return { url, findings, healthScore: computeHealthScore(findings, 1) }
}
