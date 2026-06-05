import { parse, type HTMLElement } from 'node-html-parser'
import {
  DEFAULT_PRIORITY_WEIGHTS,
  type SeoFinding,
  type SeoFindingCategory,
  type SeoFindingSeverity,
} from './seoAudit'

// GEO / AI-readiness pack for the SEO audit engine — the persona panel's #1
// priority, pulled forward from Phase 4 to Phase 1 (see
// docs/seo-suite-revamp-plan.md §12). This is the half of the engine that asks
// "can an AI answer engine (ChatGPT, Perplexity, Google AI Overviews, Claude)
// actually lift and CITE this page", not just "will Google rank it".
//
// It emits the two finding categories the core engine declares but never
// fills: `'geo'` (AI-answer citability + AI-crawler access) and `'eeat'`
// (Experience, Expertise, Authoritativeness, Trust — the credibility bar that
// matters most for YMYL "Your Money or Your Life" topics like healthcare).
//
// Everything is parse-based and reuses the same conventions as seoAudit.ts:
//  - the unified `SeoFinding` model + the configurable severity weights (§3/§5).
//  - pure, deterministic `(url, html) -> findings` so the checks are trivially
//    unit-testable; only `auditAiCrawlerAccess` touches the network, and it is
//    GRACEFUL (a robots.txt fetch failure degrades to a single notice, never a
//    throw), mirroring seoAuditIndexation.ts.
//  - designer-friendly, un-abbreviated copy: bots are named in plain terms,
//    "structured data (JSON-LD)" and "Open Graph" are spelled out on first use,
//    and every finding names the actual offending value (§6 actionability).

// ---------------------------------------------------------------------------
// Shared helpers — kept local so this pack stays a clean additive module rather
// than reaching into seoAudit.ts internals.
// ---------------------------------------------------------------------------

function findingId(category: SeoFindingCategory, check: string): string {
  return `${category}:${check}`
}

function attr(el: HTMLElement | null | undefined, name: string): string {
  return (el?.getAttribute(name) || '').trim()
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

// A finding factory bound to a category — mirrors the `base`/`make` closures in
// seoAudit.ts so the emitted findings are shape-identical across the engine.
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

// Pull just the visible body text (drop script/style/nav/footer chrome) so the
// word-count and narrative heuristics measure what a reader and an AI extractor
// actually see.
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

// Is this a content page worth holding to the GEO / E-E-A-T bar? The homepage
// and obvious utility routes (thank-you, search, login…) are exempt — they are
// not the cited-research pages AI engines surface. Mirrors the structural,
// network-free spirit of classifyPageKind in seoAudit.ts.
function isContentPage(url: string, root: HTMLElement): boolean {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // keep raw url as path
  }
  const normalized = path.replace(/\/+$/, '')
  if (normalized === '' || normalized === '/') return false
  if (/thank-you|thanks|search|login|signin|sign-in|404|cart|checkout/i.test(path)) {
    return false
  }
  // Needs enough prose to be an "answer" page rather than a thin index/landing.
  return wordCount(visibleText(root)) >= 150
}

// ---------------------------------------------------------------------------
// auditAiReadiness — category 'geo'. Parse-based checks for whether an AI
// answer engine can lift and cite this page: direct-answer-first lead, quotable
// statistics WITH an inline source, FAQ question-and-answer structure, tables /
// structured lists, chunkable paragraphs, and freshness signals.
// ---------------------------------------------------------------------------

// Phrases that read as a narrative warm-up rather than a direct answer — the
// classic "In today's fast-paced world…" intro AI engines skip over.
const NARRATIVE_OPENERS =
  /^(in (today|recent|this)|over the (past|last)|as (the|we|you|more)|when it comes to|imagine|picture|it('?s| is) no secret|these days|nowadays|for (years|decades|many)|throughout|the world of|welcome to|have you ever|let('?s| us)|there (is|are) (a |an |no )?|we (are|believe|think|live)|at goinvo)/i

// A numeric/statistical claim: a percentage, a dollar figure, an "N in M"
// ratio, or a large bare number — the quotable facts AI engines love to cite,
// but only when a source sits right next to them.
const STAT_PATTERNS: RegExp[] = [
  /\b\d{1,3}(?:\.\d+)?\s?%/, // 12% / 12.5 %
  /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:billion|million|trillion|k|b|m)?\b/i, // $4.5 billion
  /\b\d[\d,]*(?:\.\d+)?\s+(?:in|out of|of every|per)\s+\d[\d,]*\b/i, // 1 in 5 / 3 out of 4
  /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/, // 1,200,000
  /\b\d+(?:\.\d+)?\s?(?:billion|million|trillion)\b/i, // 4 million
]

// A citation signal sitting next to a stat: an inline link, a <cite>, a
// footnote/superscript reference, or a "(Source: …)" / "according to …" phrase.
const CITATION_NEAR =
  /\b(source\s*:|according to|per the|\bcited\b|\bstudy\b|\bsurvey\b|\breport(?:ed|s)?\b|\(20\d{2}\)|\[\d+\]|et al\.)/i

export function auditAiReadiness(url: string, html: string): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const root = parse(html, { comment: false })
  const make = makeFinder('geo', url, detectedAt)

  const contentPage = isContentPage(url, root)
  const body = root.querySelector('body') || root

  // --- (a) Direct-answer-first lead ---------------------------------------
  // Read the first ~40–60 words after the H1. If they open with a narrative
  // warm-up instead of directly answering the page's question, AI engines have
  // nothing to lift into an answer box.
  const h1 = root.querySelector('h1')
  if (contentPage && h1) {
    // First paragraph after the H1 (fall back to the lead body text).
    let lead = ''
    let cursor = h1.nextElementSibling
    while (cursor) {
      if (cursor.tagName && cursor.tagName.toLowerCase() === 'p') {
        lead = collapse(cursor.text)
        if (lead) break
      }
      cursor = cursor.nextElementSibling
    }
    if (!lead) {
      const firstP = body.querySelector('p')
      lead = collapse(firstP?.text || '')
    }
    const leadWords = lead.split(/\s+/).slice(0, 60).join(' ')
    if (leadWords && NARRATIVE_OPENERS.test(leadWords)) {
      findings.push(
        make(
          'notice',
          'direct-answer-missing',
          `The opening of this page reads like a narrative introduction rather than a direct answer: "${leadWords.slice(0, 160)}${leadWords.length > 160 ? '…' : ''}".`,
          'AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude) lift the sentence that most directly answers the page’s question into their answer box. A scene-setting introduction gives them nothing concrete to quote, so a competitor’s more direct page gets cited instead.',
          'Rewrite the first one or two sentences after the main heading to answer the page’s core question outright — state the conclusion first, then add the context. Aim for a self-contained 40–60 word answer an AI engine could quote verbatim.',
        ),
      )
    }
  }

  // --- (b) Quotable statistics WITHOUT an inline source -------------------
  // GoInvo's biggest lever: it publishes original, quotable healthcare numbers,
  // but an AI engine will only cite a statistic it can attribute. Count numeric
  // claims and flag the ones with no citation signal in the same block.
  if (contentPage) {
    const blocks = body.querySelectorAll('p, li, td, th, blockquote, figcaption')
    let statBlocks = 0
    let unsourcedStats = 0
    const examples: string[] = []
    for (const block of blocks) {
      const text = collapse(block.text)
      if (!text) continue
      const hasStat = STAT_PATTERNS.some((re) => re.test(text))
      if (!hasStat) continue
      statBlocks++
      const hasInlineLink = block.querySelector('a[href], cite, sup a, sup') != null
      const hasCitationPhrase = CITATION_NEAR.test(text)
      if (!hasInlineLink && !hasCitationPhrase) {
        unsourcedStats++
        if (examples.length < 3) examples.push(`"${text.slice(0, 90)}${text.length > 90 ? '…' : ''}"`)
      }
    }
    if (unsourcedStats > 0) {
      // More than a couple of unsourced numbers reads as a credibility gap, not
      // a one-off — escalate to a warning so it ranks above the softer notices.
      const severity: SeoFindingSeverity = unsourcedStats >= 3 ? 'warning' : 'notice'
      findings.push(
        make(
          severity,
          'stats-uncited',
          `${unsourcedStats} of ${statBlocks} statistic${statBlocks === 1 ? '' : 's'} on this page have no source cited right next to the number, e.g. ${examples.join('; ')}.`,
          'A quotable statistic is the single most cite-able thing on a page — but an AI answer engine will only repeat a number it can attribute to a source. An uncited figure is treated as an unverifiable claim and skipped, so GoInvo’s original healthcare data goes uncredited and undiscovered.',
          'Put a source next to each flagged statistic: an inline link to the underlying study or dataset, a "(Source: …)" note, or a footnote/citation. For GoInvo’s own original numbers, link to the open dataset or publication so AI engines can attribute the figure to you.',
        ),
      )
    }
  }

  // --- (c) FAQ question-and-answer structure absent -----------------------
  // A content page that poses no explicit questions misses the question→answer
  // shape AI engines map directly onto user prompts. (Framed as GEO extraction
  // help, NOT a rich-result win — FAQ rich results are being retired.)
  if (contentPage) {
    const headings = root.querySelectorAll(HEADING_TAGS.join(','))
    const questionHeadings = headings.filter((h) => collapse(h.text).endsWith('?')).length
    const looksLikeGuide = /guide|how-to|how to|what-is|what is|faq|questions|explained/i.test(url)
    if (questionHeadings === 0 && looksLikeGuide) {
      findings.push(
        make(
          'notice',
          'faq-structure-missing',
          'This page reads like an explainer or guide but has no question-and-answer structure (no headings phrased as the questions a reader would actually ask).',
          'AI answer engines match a user’s question to content phrased as that same question. A page with explicit question headings followed by concise answers maps directly onto prompts, making it far more likely to be the source an AI engine quotes. (This is about AI extraction, not the FAQ rich-result listing Google is retiring in 2026.)',
          'Add a short question-and-answer section using the real questions readers ask (as level-2 or level-3 headings ending in "?"), each followed by a concise, self-contained answer. Mirror the phrasing people would type into a search or chatbot.',
        ),
      )
    }
  }

  // --- (d) No tables / structured lists on a long page --------------------
  // AI engines preferentially extract tables and lists. A long wall of prose
  // with neither hides its facts from extraction.
  if (contentPage) {
    const totalWords = wordCount(visibleText(root))
    const tables = root.querySelectorAll('table').length
    const lists = root.querySelectorAll('ul, ol').length
    if (totalWords >= 600 && tables === 0 && lists === 0) {
      findings.push(
        make(
          'notice',
          'no-structured-lists',
          `This is a long page (~${totalWords} words) with no tables and no bulleted or numbered lists.`,
          'AI answer engines preferentially extract facts from tables and lists, because the structure tells them exactly what the discrete data points are. A long page that buries everything in paragraphs hands its facts over far less reliably.',
          'Break out comparable facts, steps, or option sets into a table or a bulleted/numbered list. Even one well-structured table of the page’s key data points markedly improves how cleanly an AI engine can lift it.',
        ),
      )
    }
  }

  // --- (e) Chunkability — very long paragraphs ----------------------------
  // AI engines retrieve in passages; a 120+-word paragraph is hard to lift as a
  // single clean answer chunk.
  if (contentPage) {
    const paras = body.querySelectorAll('p')
    let longest = 0
    let longCount = 0
    for (const p of paras) {
      const w = wordCount(collapse(p.text))
      if (w > longest) longest = w
      if (w > 120) longCount++
    }
    if (longCount > 0) {
      findings.push(
        make(
          'notice',
          'paragraphs-too-long',
          `${longCount} paragraph${longCount === 1 ? '' : 's'} on this page run very long (the longest is ~${longest} words).`,
          'AI answer engines retrieve and quote content in short passages (chunks). A paragraph well over ~120 words is hard to lift as one clean, self-contained answer, so a more concisely chunked competitor page is easier to cite.',
          'Split the flagged paragraphs into shorter ones of roughly 40–80 words, each making a single point. Lead each with its key sentence so it stands on its own as a quotable chunk.',
        ),
      )
    }
  }

  // --- (f) Freshness — no visible date and no dateModified in schema ------
  // AI engines and searchers both down-weight content they can't date. Look for
  // a visible published/updated date in the DOM OR dateModified/datePublished
  // in any JSON-LD block.
  if (contentPage) {
    const text = visibleText(root)
    const hasVisibleDate =
      root.querySelector('time[datetime]') != null ||
      /\b(updated|published|last (?:updated|modified)|posted)\b/i.test(text) ||
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}\b/i.test(text) ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(text)

    let hasSchemaDate = false
    for (const block of root.querySelectorAll('script[type="application/ld+json"]')) {
      const raw = block.text.trim()
      if (!raw) continue
      // Cheap string probe — a malformed block is the structured-data check's
      // problem, not ours, so we don't re-parse JSON here.
      if (/"date(?:Modified|Published|Created)"\s*:/.test(raw)) {
        hasSchemaDate = true
        break
      }
    }

    if (!hasVisibleDate && !hasSchemaDate) {
      findings.push(
        make(
          'notice',
          'freshness-missing',
          'This page shows no date a reader or machine can see — there is neither a visible published or updated date in the page nor a "dateModified" / "datePublished" value in its structured data (JSON-LD).',
          'AI answer engines and searchers both favor content they can confirm is current, and demote anything they cannot date. Healthcare guidance especially is trusted far less when its age is unknown, so an undated GoInvo page is less likely to be surfaced or cited even when it is up to date.',
          'Show a published or last-updated date in the page where readers can see it, and add a "datePublished" (and "dateModified" when you revise it) to the page’s Article structured data (JSON-LD) so machines can read it too.',
        ),
      )
    }
  }

  return findings
}

// ---------------------------------------------------------------------------
// auditEeat — category 'eeat'. YMYL credibility: a visible author byline, a
// linked author/bio, Person/Author structured data, and outbound citations to
// authoritative domains. For a healthcare studio this is the top trust lever
// and the foundation everything in GEO stands on.
// ---------------------------------------------------------------------------

// Domains AI engines and Google treat as authoritative for health / YMYL
// topics. `.gov` / `.edu` are caught by suffix; the named hosts cover the big
// non-suffix authorities.
const AUTHORITATIVE_HOSTS = [
  'nih.gov',
  'cdc.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'who.int',
  'nejm.org',
  'thelancet.com',
  'jamanetwork.com',
  'bmj.com',
  'cochrane.org',
  'healthit.gov',
  'medlineplus.gov',
]

function isAuthoritativeHost(host: string): boolean {
  const h = host.toLowerCase()
  if (/\.gov$/.test(h) || /\.edu$/.test(h)) return true
  return AUTHORITATIVE_HOSTS.some((d) => h === d || h.endsWith(`.${d}`))
}

// A byline phrase in the visible text ("By Juhan Sonin", "Written by …").
const BYLINE_RE = /\b(by|written by|authored by|author)\b[:\s]+[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,3}/

export function auditEeat(url: string, html: string): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const root = parse(html, { comment: false })
  const make = makeFinder('eeat', url, detectedAt)

  // Only hold genuine content pages to the authorship/citation bar.
  if (!isContentPage(url, root)) return findings

  const body = root.querySelector('body') || root
  const text = visibleText(root)

  // --- Author / byline -----------------------------------------------------
  // Signals an authored page: a visible byline phrase, an explicit author
  // element/attribute, a link to an author/bio/team page, or Person/Author
  // structured data.
  const hasBylinePhrase = BYLINE_RE.test(text)
  const hasAuthorEl =
    body.querySelector('[rel="author"], [itemprop="author"], .author, .byline, [class*="author"]') != null
  const hasAuthorLink =
    body
      .querySelectorAll('a[href]')
      .some((a) => /\/(author|authors|team|about|people|bio)\b/i.test(attr(a, 'href'))) ||
    body.querySelector('a[rel="author"]') != null

  let hasPersonSchema = false
  for (const block of root.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = block.text.trim()
    if (!raw) continue
    // String probe is enough — Person/Author presence anywhere in the block.
    if (/"@type"\s*:\s*"?(?:Person)"?/.test(raw) || /"author"\s*:/.test(raw)) {
      hasPersonSchema = true
      break
    }
  }

  const namedAuthor = hasBylinePhrase || hasAuthorEl || hasPersonSchema
  if (!namedAuthor) {
    findings.push(
      make(
        'warning',
        'author-missing',
        'This content page names no author — there is no visible byline, no author element, and no Person/Author structured data (JSON-LD) identifying who wrote it.',
        'For healthcare and other "Your Money or Your Life" (YMYL) topics, Google and AI answer engines weigh authorship heavily as a trust signal: they want to know a qualified, named person stands behind the claims. Anonymous health content is held to a much higher bar and is far less likely to rank or be cited.',
        'Add a visible byline naming the author, link it to an author or team bio page that establishes their relevant expertise, and add Person/Author structured data (JSON-LD) so machines can read the authorship too.',
      ),
    )
  } else if (!hasAuthorLink && !hasPersonSchema) {
    // Named, but the name is a dead end — no bio to establish expertise.
    findings.push(
      make(
        'notice',
        'author-bio-missing',
        'This page names an author but does not link to an author or biography page, and has no Person/Author structured data (JSON-LD).',
        'A name alone does not establish expertise. Google’s and AI engines’ trust signal is strongest when the author links to a bio that shows their relevant credentials and experience — the "Expertise" and "Authoritativeness" in E-E-A-T.',
        'Link the byline to an author or team bio page that lays out the author’s relevant healthcare or design credentials, and mirror that in Person/Author structured data (JSON-LD).',
      ),
    )
  }

  // --- Outbound citations to authoritative sources ------------------------
  // Count outbound links to authoritative health/research domains. None on a
  // healthcare content page is the top YMYL credibility gap.
  const ownHost = (() => {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return ''
    }
  })()

  const authoritativeLinks = new Set<string>()
  for (const a of body.querySelectorAll('a[href]')) {
    const href = attr(a, 'href')
    if (!/^https?:\/\//i.test(href)) continue
    let host = ''
    try {
      host = new URL(href).hostname.toLowerCase()
    } catch {
      continue
    }
    if (host === ownHost || host === `www.${ownHost}` || `www.${host}` === ownHost) continue
    if (isAuthoritativeHost(host)) authoritativeLinks.add(host)
  }

  if (authoritativeLinks.size === 0) {
    findings.push(
      make(
        'warning',
        'citations-missing',
        'This content page links to no authoritative outside source — there are no outbound citations to recognized authorities such as NIH (nih.gov), the CDC (cdc.gov), PubMed, the WHO, or any .gov / .edu site.',
        'Citing recognized authorities is how a page earns trust for "Your Money or Your Life" (YMYL) healthcare topics, and AI answer engines lean on well-cited pages because the citations let them verify and attribute the claims. An uncited healthcare page reads as opinion, not evidence.',
        'Cite the authoritative sources behind the page’s health claims with outbound links to the underlying studies, datasets, or guidance (for example NIH, CDC, PubMed, the WHO, or a relevant .gov / .edu source). Link directly to the specific page that supports each claim.',
      ),
    )
  } else {
    // Healthy state — surface once so the section isn't silently empty, and so
    // the designer sees which authorities were credited.
    const list = [...authoritativeLinks].slice(0, 5).join(', ')
    findings.push(
      make(
        'notice',
        'citations-present',
        `This page cites ${authoritativeLinks.size} authoritative source${authoritativeLinks.size === 1 ? '' : 's'} (${list}).`,
        'Outbound citations to recognized authorities are a strong trust signal for healthcare ("Your Money or Your Life") content and give AI answer engines verifiable claims they can attribute — exactly what makes a page cite-worthy.',
        'No action needed. Keep each citation pointed at the specific source page that supports the claim, and refresh links if a source moves.',
      ),
    )
  }

  return findings
}

// ---------------------------------------------------------------------------
// auditAiCrawlerAccess — category 'geo'. Fetch the site's robots.txt and check
// whether the AI search/citation crawlers can reach pages at all. An AI engine
// that cannot fetch a page can never cite it, so blocking a SEARCH/CITATION bot
// is an error; blocking a TRAINING bot is a legitimate policy choice we surface
// as a notice with the tradeoff named.
//
// GRACEFUL like seoAuditIndexation.ts: a robots fetch failure / non-2xx /
// timeout collapses to one `notice` ("AI-crawler access unavailable"), never a
// throw.
// ---------------------------------------------------------------------------

const ROBOTS_TIMEOUT_MS = Number(process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 10000)

// SEARCH / CITATION bots — these fetch a live page to answer a query and put a
// citation in front of a user. Blocking one means losing the citation outright.
const SEARCH_CITATION_BOTS: { token: string; label: string }[] = [
  { token: 'OAI-SearchBot', label: 'ChatGPT search (OpenAI’s OAI-SearchBot)' },
  { token: 'ChatGPT-User', label: 'ChatGPT browsing on a user’s behalf (ChatGPT-User)' },
  { token: 'PerplexityBot', label: 'Perplexity’s answer engine (PerplexityBot)' },
  { token: 'Perplexity-User', label: 'Perplexity browsing on a user’s behalf (Perplexity-User)' },
  { token: 'Claude-SearchBot', label: 'Claude’s search crawler (Claude-SearchBot)' },
  { token: 'Claude-User', label: 'Claude browsing on a user’s behalf (Claude-User)' },
  { token: 'ClaudeBot', label: 'Anthropic’s Claude crawler (ClaudeBot)' },
  { token: 'Googlebot', label: 'Google Search and AI Overviews (Googlebot)' },
  { token: 'Bingbot', label: 'Microsoft Bing and Copilot (Bingbot)' },
]

// TRAINING bots — these collect content for model training, not live answering.
// Blocking them is a defensible policy choice (it does NOT cost you citations),
// so we report it as a notice that names the tradeoff, not an error.
const TRAINING_BOTS: { token: string; label: string }[] = [
  { token: 'GPTBot', label: 'OpenAI’s model-training crawler (GPTBot)' },
  { token: 'CCBot', label: 'Common Crawl, a dataset many AI models train on (CCBot)' },
  { token: 'Google-Extended', label: 'Google’s AI model-training opt-out token (Google-Extended)' },
  { token: 'anthropic-ai', label: 'Anthropic’s legacy training token (anthropic-ai)' },
]

// A parsed robots.txt as a map of user-agent token (lowercased) -> its Disallow
// path rules, plus the catch-all `*` group.
type RobotsRules = Map<string, string[]>

// Parse robots.txt into per-user-agent Disallow rules. Handles grouped agents
// (several `User-agent:` lines sharing one rule block), the way the spec does.
export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = new Map()
  const lines = text.split(/\r?\n/)
  let currentAgents: string[] = []
  let sawDirectiveSinceAgent = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      // A new user-agent line that immediately follows a directive starts a new
      // group; consecutive user-agent lines share the next directive block.
      if (sawDirectiveSinceAgent) {
        currentAgents = []
        sawDirectiveSinceAgent = false
      }
      const agent = value.toLowerCase()
      currentAgents.push(agent)
      if (!rules.has(agent)) rules.set(agent, [])
    } else if (field === 'disallow' || field === 'allow') {
      sawDirectiveSinceAgent = true
      if (currentAgents.length === 0) continue
      // We only track Disallow for the access verdict; an Allow line is recorded
      // as a non-blocking marker so a bare "Disallow:" isn't misread.
      for (const agent of currentAgents) {
        const arr = rules.get(agent) || []
        if (field === 'disallow') arr.push(value)
        rules.set(agent, arr)
      }
    } else {
      // Sitemap / Crawl-delay / etc. don't change grouping.
      sawDirectiveSinceAgent = true
    }
  }
  return rules
}

// Is `agentToken` fully disallowed — i.e. its applicable group (its own, else
// the `*` catch-all) blocks the site root with `Disallow: /`? A bare
// `Disallow:` (empty) means "allow everything", so it does NOT count.
function isFullyDisallowed(rules: RobotsRules, agentToken: string): boolean {
  const own = rules.get(agentToken.toLowerCase())
  const group = own ?? rules.get('*')
  if (!group) return false
  return group.some((path) => path === '/' || path === '/*')
}

// Pure mapping from parsed robots rules to findings — exported so the verdict is
// unit-testable without stubbing fetch.
export function mapRobotsAccess(siteUrl: string, rules: RobotsRules): SeoFinding[] {
  const findings: SeoFinding[] = []
  const detectedAt = new Date().toISOString()
  const make = makeFinder('geo', siteUrl, detectedAt)

  // (a) SEARCH / CITATION bots fully blocked → error.
  const blockedSearch = SEARCH_CITATION_BOTS.filter((b) => isFullyDisallowed(rules, b.token))
  if (blockedSearch.length > 0) {
    const names = blockedSearch.map((b) => b.label).join('; ')
    findings.push(
      make(
        'error',
        'ai-search-bot-blocked',
        `The site’s robots file (robots.txt) fully blocks ${blockedSearch.length} AI search or citation crawler${blockedSearch.length === 1 ? '' : 's'}: ${names}.`,
        'These crawlers fetch a live page to answer a user’s question and put a citation to it in front of them. An AI engine that is blocked from fetching a page can never cite it — so blocking these bots directly forfeits the AI-answer visibility that is GoInvo’s strategic opportunity.',
        `Remove the "Disallow: /" rule for ${names} in the site’s robots file (robots.txt) so these AI search and citation crawlers can reach the pages you want surfaced. Unlike the model-training crawlers, blocking these costs you citations with no privacy upside.`,
      ),
    )
  }

  // (b) TRAINING bots blocked → notice (a policy choice, with the tradeoff).
  const blockedTraining = TRAINING_BOTS.filter((b) => isFullyDisallowed(rules, b.token))
  if (blockedTraining.length > 0) {
    const names = blockedTraining.map((b) => b.label).join('; ')
    findings.push(
      make(
        'notice',
        'ai-training-bot-blocked',
        `The site’s robots file (robots.txt) blocks ${blockedTraining.length} AI model-training crawler${blockedTraining.length === 1 ? '' : 's'}: ${names}.`,
        'These crawlers collect content to TRAIN AI models, not to answer live questions, so blocking them does NOT cost you any AI-answer citations — it only opts your content out of model training. This is a legitimate policy choice, noted here so it is a deliberate decision rather than an accident.',
        `No fix needed if opting out of AI model training is intentional. If instead you want GoInvo’s research to appear in AI-generated answers, note that these training rules do not affect that — the live search and citation crawlers (handled separately) are what matter for citations. Re-allow ${names} only if you also want your content used for model training.`,
      ),
    )
  }

  // Nothing blocked — surface a single PASS notice so the section reads as
  // "checked and clear" rather than empty.
  if (findings.length === 0) {
    findings.push(
      make(
        'notice',
        'ai-crawler-access-ok',
        'The site’s robots file (robots.txt) does not block any of the major AI search, citation, or training crawlers from reaching the site.',
        'AI search and citation crawlers (such as OpenAI’s OAI-SearchBot, PerplexityBot, ClaudeBot, Googlebot, and Bingbot) can fetch the site’s pages, which is the precondition for any of GoInvo’s research being cited in an AI-generated answer.',
        'No action needed. Re-check after any change to the robots file (robots.txt).',
      ),
    )
  }

  return findings
}

// The graceful fallback — returned whenever robots.txt can't be reached, so the
// engine never throws (mirrors unavailableFinding in seoAuditIndexation.ts).
function robotsUnavailableFinding(siteUrl: string, reason: string): SeoFinding {
  const make = makeFinder('geo', siteUrl, new Date().toISOString())
  return make(
    'notice',
    'ai-crawler-access-unavailable',
    'AI-crawler access unavailable — the site’s robots file (robots.txt) could not be fetched, so this audit cannot confirm whether AI search and citation crawlers are allowed to reach the site.',
    'Whether AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews) can fetch the site’s pages is governed by the robots file (robots.txt). It is currently unreachable, so this is a data-availability gap, not a confirmed problem with the site.',
    `Confirm ${new URL('/robots.txt', siteUrl).href} loads in a browser and returns plain text, then re-run the audit. Diagnostic detail: ${reason}.`,
  )
}

export async function auditAiCrawlerAccess(
  siteUrl = 'https://www.goinvo.com/',
): Promise<SeoFinding[]> {
  let robotsUrl: string
  try {
    robotsUrl = new URL('/robots.txt', siteUrl).href
  } catch {
    return [robotsUnavailableFinding(siteUrl, `"${siteUrl}" is not a valid site URL`)]
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS)
  try {
    const res = await fetch(robotsUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)',
        Accept: 'text/plain,*/*;q=0.8',
      },
    })
    if (!res.ok) {
      return [robotsUnavailableFinding(siteUrl, `robots.txt returned ${res.status}`)]
    }
    const text = await res.text()
    return mapRobotsAccess(siteUrl, parseRobots(text))
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    return [robotsUnavailableFinding(siteUrl, reason)]
  } finally {
    clearTimeout(timeout)
  }
}
