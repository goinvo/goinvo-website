import { parse, type HTMLElement } from 'node-html-parser'
import {
  DEFAULT_PRIORITY_WEIGHTS,
  fetchPageHtml,
  type SeoFinding,
  type SeoFindingSeverity,
} from './seoAudit'
import { tfSemantic, withTextFocus, type TfLooseResult } from './textfocus'

// Semantic-gap / topical-coverage pack for the SEO audit engine
// (marketingIdea: seo-semantic-gap). This is the half of the engine that asks
// "what do the pages that ALREADY rank for this topic talk about that this page
// doesn't?" — the topical-completeness signal a pure on-page parser can never
// produce on its own, because it needs to know what the competition covers.
//
// It is powered by TextFocus's tf_semantic endpoint, whose live shape was
// verified against the API before this module was written (do NOT guess it).
// For a given `keyword`, tf_semantic fetches the top ~20 ranking pages and
// returns the related terms they collectively use, with — per term — how widely
// the ranking cohort covers it. We treat that as the "what ranking pages cover"
// model, then deterministically diff it against THIS page's own visible text to
// find the terms/subtopics the page is missing.
//
// The verified tf_semantic `result` shape (en-US, /enterprise, keyword
// "healthcare software development"):
//
//   {
//     nbCompete: 20,            // # of ranking competitor pages analyzed
//     nbFound: 120,             // # of candidate related terms found
//     nbWordsContentMoy: 2505,  // avg word count of the ranking pages
//     nbWordsTitleMoy: 5.25,    // avg title word count
//     semantic: {               // an OBJECT map (string indices, some skipped),
//       "0": {                  // NOT an array — iterate Object.values()
//         id: "healthcare software development", // the source keyword
//         keyword: "enhance",   // the related term
//         kei: "100.00",        // keyword-effectiveness index (term importance)
//         ngram: "1",           // 1 = single word, 2 = bigram, …
//         used: "80.00",        // % of the ranking cohort that uses this term
//         occ: "38",            // avg occurrences among pages that use it
//         omin/omax/omoy/osd,   // occurrence distribution stats
//         nbwmoy: "749",        // avg words on pages using it
//         intitle: "0.00",      // % of cohort using it in their <title>
//         inhn: "0.00",         // % of cohort using it in a heading (H1–H6)
//         frequency: "3.02",    // avg frequency
//         tfidf: "0.0440",      // tf-idf weight
//         context: "a:3:{…}"    // PHP-serialized example phrases (decoded below)
//       },
//       …                       // ~100 terms total
//     }
//   }
//
// IMPORTANT shape quirks the code below depends on:
//  - `semantic` is an OBJECT keyed by stringified indices with gaps (e.g. "4"
//    can be absent), so we iterate Object.values(), never assume an array.
//  - every numeric field is a STRING ("80.00"), so we Number() them.
//  - `used` is cohort coverage, NOT this page's coverage. tf_semantic does not
//    hand back a clean "the page is missing X" flag, so we compute the page's
//    own coverage ourselves from its visible text. That keeps the gap call
//    deterministic and unit-testable rather than relying on the noisy way the
//    URL nudges the cohort percentages.
//
// RELIABILITY: TextFocus is an enrichment, never a hard dependency. The whole
// audit runs inside withTextFocus(fn, []) — a down / out-of-credits /
// misconfigured TextFocus short-circuits to [] — and every internal failure
// (no keyword derivable, page fetch fails, empty/!shaped result) also returns
// [] (or a single honest notice). This function NEVER throws.

// ---------------------------------------------------------------------------
// Finding builder — category 'content', source 'textfocus'. Mirrors the
// makeFinder closures in seoAudit.ts / seoAuditGeo.ts so emitted findings are
// shape-identical across the engine.
// ---------------------------------------------------------------------------

function findingId(check: string): string {
  return `content:${check}`
}

function makeFinding(
  url: string,
  severity: SeoFindingSeverity,
  check: string,
  what: string,
  why: string,
  howToFix: string,
): SeoFinding {
  return {
    id: findingId(check),
    category: 'content',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0, // single-page audit; the route fills this in across the set
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source: 'textfocus',
    status: 'open',
    detectedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Tuning constants — kept here as named data so the gap thresholds can be
// re-tuned without touching detection logic.
// ---------------------------------------------------------------------------

// A term only counts as "expected" if at least this share of the ranking cohort
// uses it. Below this it's a long-tail term, not a topical-completeness signal.
const WIDELY_USED_PCT = 70

// Number of missing terms at which the overall gap escalates from a soft
// `notice` to a `warning` (a real topical-coverage hole, not a nitpick).
const WARNING_GAP_COUNT = 8

// How many missing terms to actually name in a finding (keep the copy readable).
const MAX_TERMS_LISTED = 12

// Generic filler / stopword-ish single words that show up in almost any cohort
// and are useless as topic guidance — never report these as a "missing topic".
const STOPWORD_TERMS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'our',
  'are', 'can', 'will', 'has', 'have', 'into', 'out', 'about', 'how', 'why',
  'what', 'when', 'where', 'which', 'who', 'all', 'any', 'more', 'most', 'than',
  'then', 'them', 'they', 'their', 'its', 'it', 'is', 'be', 'as', 'at', 'by',
  'on', 'in', 'of', 'to', 'or', 'an', 'a', 'us', 'we', 'let', 'including',
  'across', 'making', 'better', 'key', 'enable', 'ensure', 'enhance',
  'enhancing', 'deliver', 'including', 'help', 'understanding', 'whether',
  'within', 'while', 'also', 'such', 'each', 'every', 'using', 'used', 'use',
])

// ---------------------------------------------------------------------------
// Parsing the (loosely typed) tf_semantic result.
// ---------------------------------------------------------------------------

export type SemanticTerm = {
  term: string
  used: number // % of the ranking cohort that uses this term
  kei: number // term-importance index
  inHeadings: number // % of cohort using it in a heading (H1–H6)
  inTitle: number // % of cohort using it in their <title>
  ngram: number // 1 = single word, 2+ = phrase
  contexts: string[] // decoded example phrases the cohort uses it in
}

export type SemanticModel = {
  competitors: number
  avgWords: number
  terms: SemanticTerm[]
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Decode TextFocus's PHP-serialized `context` field — e.g.
//   a:3:{i:0;s:20:"enhance patient care";i:1;s:31:"efficiency enhance patient care";…}
// into a plain string[] of the example phrases. We don't need a full PHP
// unserializer — pull out every  s:<len>:"<phrase>"  string token. Returns []
// on anything unexpected (this is best-effort flavor text, never load-bearing).
export function decodePhpContext(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return []
  const out: string[] = []
  const re = /s:\d+:"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const phrase = m[1].replace(/\\"/g, '"').trim()
    if (phrase) out.push(phrase)
  }
  return out
}

// Map the loose tf_semantic result onto our typed model. Exported + pure so it's
// unit-testable against a captured payload without any network. Returns null
// when the payload is missing / not shaped like a tf_semantic result, so the
// caller can degrade to [].
export function parseSemanticResult(result: TfLooseResult | null): SemanticModel | null {
  if (!result || typeof result !== 'object') return null
  const semantic = (result as Record<string, unknown>).semantic
  if (!semantic || typeof semantic !== 'object') return null

  const terms: SemanticTerm[] = []
  for (const entry of Object.values(semantic as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const term = typeof row.keyword === 'string' ? row.keyword.trim() : ''
    if (!term) continue
    terms.push({
      term,
      used: num(row.used),
      kei: num(row.kei),
      inHeadings: num(row.inhn),
      inTitle: num(row.intitle),
      ngram: num(row.ngram) || 1,
      contexts: decodePhpContext(row.context),
    })
  }

  if (terms.length === 0) return null

  return {
    competitors: num((result as Record<string, unknown>).nbCompete),
    avgWords: num((result as Record<string, unknown>).nbWordsContentMoy),
    terms,
  }
}

// ---------------------------------------------------------------------------
// Page-side coverage — does THIS page's visible text use a term?
// ---------------------------------------------------------------------------

// Pull the page's visible text (drop script/style/template chrome), lowercased,
// so the term-coverage check measures what a reader and a ranker actually see.
function pageVisibleText(html: string): string {
  const root: HTMLElement = parse(html, { comment: false })
  const body = root.querySelector('body') || root
  for (const el of body.querySelectorAll('script, style, noscript, template')) {
    el.remove()
  }
  return body.text.replace(/\s+/g, ' ').toLowerCase()
}

// Whole-word-ish presence test for a term (a single word or a short phrase).
function textHasTerm(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

// Is this term worth surfacing as a topic gap at all? Drop stopwords and very
// short single tokens — they're noise, not subtopics.
function isMeaningfulTerm(t: SemanticTerm): boolean {
  if (t.ngram <= 1) {
    if (t.term.length < 4) return false
    if (STOPWORD_TERMS.has(t.term.toLowerCase())) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Keyword derivation — tf_semantic REQUIRES a keyword (the live API returns
// "Aucun mot clé fourni" with no keyword). When the caller doesn't pass one,
// derive a sensible target query from the page itself: its <title> (minus the
// "— GoInvo" brand suffix) is the best single guess, falling back to the H1,
// then a de-slugged last path segment.
// ---------------------------------------------------------------------------

export function deriveKeyword(url: string, html: string): string {
  const root = parse(html, { comment: false })
  const head = root.querySelector('head') || root

  const clean = (s: string): string =>
    s
      .replace(/\s+/g, ' ')
      .trim()
      // Drop a trailing brand suffix after a dash/pipe: "… — GoInvo" / "… | GoInvo".
      .replace(/\s*[|–—-]\s*goinvo\s*$/i, '')
      .trim()

  const title = clean(head.querySelector('title')?.text || '')
  if (title.length >= 3) return title

  const h1 = clean(root.querySelector('h1')?.text || '')
  if (h1.length >= 3) return h1

  try {
    const seg = new URL(url).pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || ''
    const deslugged = seg.replace(/[-_]+/g, ' ').trim()
    if (deslugged.length >= 3) return deslugged
  } catch {
    // ignore
  }

  return ''
}

// ---------------------------------------------------------------------------
// mapSemanticGap — the PURE core: given the page text + a parsed competitor
// model + the keyword, produce findings. Exported + network-free so it's
// trivially unit-testable. Two findings at most:
//   1) content:semantic-gap        — high-coverage terms absent from the page
//      (warning if many, notice if a few). The headline gap finding.
//   2) content:semantic-coverage-ok — emitted ONLY when there's no gap, so the
//      section reads "checked and clear" rather than empty.
// ---------------------------------------------------------------------------

export function mapSemanticGap(
  url: string,
  pageText: string,
  model: SemanticModel,
  keyword: string,
): SeoFinding[] {
  // Candidate gap terms: widely used by the ranking cohort, meaningful (not a
  // stopword), and absent from THIS page's visible text.
  const widely = model.terms.filter(
    (t) => t.used >= WIDELY_USED_PCT && isMeaningfulTerm(t),
  )
  const missing = widely.filter((t) => !textHasTerm(pageText, t.term))

  // Nothing missing → a single reassuring notice (mirrors citations-present /
  // ai-crawler-access-ok elsewhere in the engine).
  if (missing.length === 0) {
    return [
      makeFinding(
        url,
        'notice',
        'semantic-coverage-ok',
        `This page already covers the topics that the pages ranking for “${keyword}” use — none of the ${widely.length} widely-covered related terms are missing from it.`,
        `Topical completeness — covering the related subtopics that competing pages cover — is a strong signal to both Google and AI answer engines that a page comprehensively answers the query. This page is not leaving obvious related topics on the table for “${keyword}”.`,
        'No action needed. Re-check after a major rewrite, or run the audit against a different target keyword to test the page’s coverage from another angle.',
      ),
    ]
  }

  // Rank the gaps so the most important come first and head the listed sample:
  // terms competitors put in HEADINGS (real subtopics) first, then by how widely
  // the cohort uses them, then by term importance (kei).
  const ranked = missing
    .slice()
    .sort(
      (a, b) =>
        b.inHeadings - a.inHeadings || b.used - a.used || b.kei - a.kei,
    )

  const listed = ranked.slice(0, MAX_TERMS_LISTED).map((t) => t.term)
  const more = ranked.length - listed.length

  // Subtopics = gap terms competitors use in their HEADINGS. Those are the
  // section-level topics this page is missing, the highest-value gaps to fix.
  const subtopics = ranked.filter((t) => t.inHeadings > 0).slice(0, 6)

  const severity: SeoFindingSeverity =
    missing.length >= WARNING_GAP_COUNT ? 'warning' : 'notice'

  const termsLabel =
    listed.map((t) => `“${t}”`).join(', ') +
    (more > 0 ? `, and ${more} more` : '')

  // Example phrases from the cohort give the designer concrete language to add.
  const examplePhrases = ranked
    .flatMap((t) => t.contexts)
    .filter((p, i, arr) => p.split(' ').length >= 2 && arr.indexOf(p) === i)
    .slice(0, 5)
  const phrasesNote = examplePhrases.length
    ? ` Phrases the ranking pages use that you could weave in include ${examplePhrases.map((p) => `“${p}”`).join(', ')}.`
    : ''

  const subtopicNote = subtopics.length
    ? ` In particular, ${subtopics.map((t) => `“${t.term}”`).join(', ')} appear as section HEADINGS on competing pages, which suggests they are subtopics readers expect — consider adding a section for each.`
    : ''

  const findings: SeoFinding[] = [
    makeFinding(
      url,
      severity,
      'semantic-gap',
      `Compared with the ${model.competitors || 'top'} pages currently ranking for “${keyword}”, this page is missing ${missing.length} related term${missing.length === 1 ? '' : 's'} that most of those pages cover: ${termsLabel}.`,
      `These are the related subtopics and terms that the pages already ranking for “${keyword}” have in common. When a page covers the topic shallowly relative to the competition, both Google and AI answer engines read it as less comprehensive and are less likely to rank or cite it. Closing this topical-coverage gap is how you signal the page fully answers the query — and for GoInvo it means a page is more likely to be the source an AI engine quotes.`,
      `Where it genuinely fits the page (do NOT keyword-stuff), add substantive content covering the missing terms — lead with ${listed.slice(0, 5).map((t) => `“${t}”`).join(', ')}.${subtopicNote}${phrasesNote} Each addition should be real, useful copy that a reader benefits from, not a list of keywords.`,
    ),
  ]

  return findings
}

// ---------------------------------------------------------------------------
// auditSemanticGap — the public entry point. Runs the whole thing inside
// withTextFocus(fn, []) so a down / out-of-credits / misconfigured TextFocus
// degrades to []. Internally: derive (or accept) a keyword → call tf_semantic →
// parse → fetch the page text → mapSemanticGap. Every failure path returns []
// (or a single honest notice when a keyword can't be derived). NEVER throws.
// ---------------------------------------------------------------------------

export async function auditSemanticGap(
  url: string,
  opts: { keyword?: string; lang?: string } = {},
): Promise<SeoFinding[]> {
  return withTextFocus<SeoFinding[]>(async () => {
    // We need the page HTML for two things: deriving a keyword when none was
    // given, and computing this page's own term coverage. Fetch it once.
    let html: string
    try {
      html = await fetchPageHtml(url)
    } catch {
      // Can't read the page → the on-page checks already flag the fetch failure
      // as an error; the semantic layer just stays silent rather than throwing.
      return []
    }

    const keyword = (opts.keyword || '').trim() || deriveKeyword(url, html)
    if (!keyword) {
      // tf_semantic requires a keyword (the live API rejects a missing one with
      // "Aucun mot clé fourni"). With nothing to target, emit one honest notice
      // telling the designer how to enable the check rather than silently doing
      // nothing or spending a credit on a doomed call.
      return [
        makeFinding(
          url,
          'notice',
          'semantic-gap-no-keyword',
          'The topical-coverage check could not run because this page has no usable title, main heading, or descriptive URL to infer a target search query from, and none was supplied.',
          'The topical-coverage check compares this page against the pages currently ranking for a target search query, so it needs to know which query to target. Without a title, heading, or descriptive URL there is nothing to infer the query from.',
          'Give the page a descriptive title and main heading (the on-page checks recommend this anyway), or re-run the audit passing an explicit target keyword for this page, to enable the topical-coverage comparison.',
        ),
      ]
    }

    // Paid call (tf_semantic costs credits). tfSemantic catches its own errors
    // and returns null on any failure; withTextFocus also guards the whole fn.
    const result = await tfSemantic(url, {
      lang: opts.lang,
      extra: { keyword },
    })
    const model = parseSemanticResult(result)
    if (!model) {
      // TextFocus returned nothing usable (null, or no `semantic` terms). Stay
      // silent — this is an enrichment, not a finding-worthy failure on its own.
      return []
    }

    const pageText = pageVisibleText(html)
    return mapSemanticGap(url, pageText, model, keyword)
  }, [])
}
