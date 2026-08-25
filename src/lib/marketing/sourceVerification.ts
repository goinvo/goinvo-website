/**
 * Source verification for researched claims.
 *
 * Adapted from the PLIG framework's split between quote-existence and claim
 * entailment (`plig-framework/scripts/verify-quotes.ts` and `verify-claims.ts`),
 * and from the evidence-pipeline plan in `biopharma-stewardship-discovery`,
 * whose central rule is worth repeating here:
 *
 *   A claim becomes publishable because its source identity, exact evidence,
 *   scope and transformations are inspectable — not because a model agreed
 *   with it.
 *
 * Two stages, deliberately separate and in this order:
 *
 *   1. DETERMINISTIC. The quoted span must actually appear in the fetched page.
 *      This is plain string containment over normalised text. No model is
 *      involved and no fuzzy match counts — the plan is explicit that a
 *      word-window match is not proof a quotation is exact.
 *   2. ADVISORY. Only if the quote is real do we ask a model whether it
 *      actually supports the claim, and whether the claim overreaches it.
 *
 * The stages cannot be collapsed: a model that "verifies" a quote it was handed
 * will cheerfully confirm a quotation that does not exist.
 *
 * It also fixes a real defect in the org research. A record stored one claim
 * against a BAG of six sources, which is the "broadening a citation to every
 * quote from a source" anti-pattern the plan calls out. Verification binds a
 * claim to the specific source whose text supports it, and drops the rest.
 */

export type VerificationStatus =
  /** Quote found verbatim AND a model judged it to support the claim. */
  | 'verified'
  /** Quote found, but support is partial or the claim reaches past it. */
  | 'overreach'
  /** No cited source contained text supporting the claim. */
  | 'unsupported'
  /** Could not fetch or read the sources; says nothing either way. */
  | 'unchecked'

export type VerifiedEvidence = {
  url: string
  title: string
  /** The exact span, as it appears in the source. */
  quote: string
  /** Deep link that scrolls to and highlights the quote. */
  textFragmentUrl: string
}

/**
 * Normalise for comparison only — never for storage.
 *
 * Real pages differ from a model's transcription in whitespace, quote glyphs
 * and soft hyphens, and treating those as substantive would reject true quotes.
 * Everything else (wording, numbers, order) must still match exactly.
 */
export function normaliseForComparison(text: string): string {
  return String(text || '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/­/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Strip a fetched HTML document down to readable text. */
export function extractReadableText(html: string): string {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => codePoint(parseInt(dec, 10)))
    .replace(/&(nbsp|amp|lt|gt|quot|apos|mdash|ndash|rsquo|lsquo|ldquo|rdquo|hellip|middot|times|deg|reg|copy|trade|eacute|shy);/gi,
      (_m, name) => NAMED_ENTITIES[String(name).toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Numeric entities are the ones that actually bite.
 *
 * An SEC filing writes a non-breaking space as `&#160;`, and leaving it literal
 * broke exact-quote matching about forty characters into every quote from one.
 * That looked exactly like the model fabricating quotes, and it was this
 * function all along — so decode numerics, not just the handful of named ones.
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', hellip: '…', middot: '·',
  times: '×', deg: '°', reg: '®', copy: '©',
  trade: '™', eacute: 'é', shy: '',
}

function codePoint(value: number): string {
  if (!Number.isFinite(value) || value < 9 || value > 0x10ffff) return ' '
  try {
    return String.fromCodePoint(value)
  } catch {
    return ' '
  }
}

/**
 * Does this quote actually appear in this document?
 *
 * Containment after normalisation, and nothing cleverer. A quote shorter than a
 * few words is rejected outright: "AI" appears in every page about AI and would
 * make the check meaningless.
 */
export function quoteAppearsIn(documentText: string, quote: string): boolean {
  const needle = normaliseForComparison(quote)
  if (needle.length < 25) return false
  return normaliseForComparison(documentText).includes(needle)
}

/**
 * A deep link that highlights the quote in the page.
 *
 * Uses the start,end form for long quotes: browsers cap fragment length, and a
 * whole-paragraph fragment silently fails to match.
 */
export function buildTextFragmentUrl(url: string, quote: string): string {
  const clean = String(quote || '').replace(/\s+/g, ' ').trim()
  if (!clean) return url
  const base = url.split('#')[0]
  const words = clean.split(' ')
  const fragment =
    words.length > 12
      ? `${encodeURIComponent(words.slice(0, 6).join(' '))},${encodeURIComponent(words.slice(-6).join(' '))}`
      : encodeURIComponent(clean)
  return `${base}#:~:text=${fragment}`
}

/**
 * Fold the two stages into one status.
 *
 * `unchecked` is not a pass. A page we could not read tells us nothing, and
 * quietly treating that as verified is how an unverified claim reaches a call
 * sheet wearing a tick.
 */
export function resolveVerificationStatus(input: {
  sourcesTried: number
  sourcesReadable: number
  evidence: VerifiedEvidence[]
  entailment: 'supported' | 'partial' | 'unsupported' | null
}): VerificationStatus {
  if (input.sourcesReadable === 0) return 'unchecked'
  if (input.evidence.length === 0) {
    // "We read one of four pages and it did not happen to contain support" is
    // not the same as "the claim is unsupported". Paywalls and bot blocks are
    // extremely common, and reporting a fetch failure as a failed claim would
    // blame the research for the network.
    const readMost = input.sourcesReadable * 2 >= input.sourcesTried
    return readMost ? 'unsupported' : 'unchecked'
  }
  if (input.entailment === 'supported') return 'verified'
  if (input.entailment === 'unsupported') return 'unsupported'
  return 'overreach'
}

/** Only a fully verified claim is safe to put in front of someone. */
export function isPublishable(status: VerificationStatus): boolean {
  return status === 'verified'
}

export const QUOTE_EXTRACTION_SYSTEM = `You locate supporting evidence in a document.

Given a CLAIM and the TEXT of one web page, find the single passage in that text
that most directly supports the claim.

Rules:
- Copy the passage EXACTLY as it appears in the text, character for character.
  Do not paraphrase, tidy, translate, or join separated sentences.
- If the page does not support the claim, return an empty quote. A wrong quote is
  far worse than no quote: the next step checks your quote against the page, and
  an invented one will be caught and discarded.
- Keep the passage under 60 words.

Reply with ONLY: {"quote": "...", "supports": true | false}`

export const ENTAILMENT_SYSTEM = `You judge whether quoted evidence supports a claim.

You are given a CLAIM and one or more QUOTES, each already confirmed to appear
verbatim in the source cited beside it. Judge whether the quotes TOGETHER support
the claim as written.

- "supported": the quotes establish the claim, including any dates, numbers and
  named entities in it.
- "partial": the quotes are related and true, but the claim asserts more than they
  show — a bigger number, a firmer commitment, a wider scope, a date the
  quote does not give.
- "unsupported": the quotes do not establish the claim.

Being strict here is the point. This is the last check before somebody repeats
the claim to a customer.

Reply with ONLY: {"verdict": "supported" | "partial" | "unsupported", "reason": "one sentence"}`

/**
 * Which specifics does the claim assert that its quote does not contain?
 *
 * The prompt's rule - no date, number, or proper name unless it is in the quote
 * - is a rule about tokens, so it can be checked without a model at all. That
 * matters twice: a deterministic check costs nothing per claim, and it gives a
 * reason a person can audit ("the claim says 4,000, the quote does not") rather
 * than a verdict they have to take on trust.
 *
 * Three kinds of false positive were real enough to design against, because a
 * checker that cries wolf gets switched off:
 *
 *   - trailing punctuation ("Alcohol Use Disorder." vs "Alcohol Use Disorder");
 *   - a sentence-initial word glued to a name ("On December", "The FDA");
 *   - the organisation's own name missing from a first-person quote on its own
 *     site ("We have 38 locations" is CCH Healthcare saying it about itself).
 *
 * It deliberately does not judge meaning. A claim with no uncited specifics can
 * still misread its source, so this narrows the human's job rather than
 * replacing it.
 */
const PHRASE_LEAD_INS = new Set([
  'the', 'on', 'in', 'a', 'an', 'this', 'these', 'those', 'following', 'with',
  'by', 'for', 'at', 'from', 'its', 'their', 'our', 'and', 'to', 'as', 'after',
])

export function findUncitedSpecifics(
  claim: string,
  quote: string,
  options: { ignore?: string[] } = {},
): string[] {
  const haystack = normaliseForComparison(quote)
  const has = (token: string) => haystack.includes(normaliseForComparison(token))
  // Compare ignore-list entries with punctuation and spacing removed: the stored
  // organisation is "Pearlhealth" while the claim writes "Pearl Health", and a
  // space should not make one look like a different company from the other.
  const squash = (value: string) => normaliseForComparison(value).replace(/[^a-z0-9]/g, '')
  const ignored = (options.ignore || []).map(squash).filter(Boolean)
  const isIgnored = (token: string) => {
    const value = squash(token)
    return ignored.some((entry) => entry.includes(value) || value.includes(entry))
  }

  const uncited = new Set<string>()

  // Numbers: 4,000 / $116 / 1.5 / 38 / 300+ / 12%. Compared on digits alone so
  // "$116 million" still matches "116 million" in the source.
  for (const match of String(claim).matchAll(/[$]?[0-9][0-9,.]*[+]?[%]?/g)) {
    const token = match[0].replace(/[.,]+$/, '')
    const bare = token.replace(/[$,+%]/g, '')
    if (!bare) continue
    if (!has(bare) && !has(token)) uncited.add(token)
  }

  const MONTHS = /(January|February|March|April|May|June|July|August|September|October|November|December)/g
  for (const match of String(claim).matchAll(MONTHS)) {
    if (!has(match[0])) uncited.add(match[0])
  }

  for (const match of String(claim).matchAll(/([A-Z][A-Za-z0-9&.'-]*(?:[ ][A-Z][A-Za-z0-9&.'-]*)+)/g)) {
    let phrase = match[1].trim().replace(/[.,;:]+$/, '')
    // Peel sentence-initial words that are only capitalised by position.
    let words = phrase.split(/[ ]+/)
    while (words.length > 1 && PHRASE_LEAD_INS.has(words[0].toLowerCase())) words = words.slice(1)
    phrase = words.join(' ')
    if (words.length < 2) continue
    if (isIgnored(phrase)) continue
    if (!has(phrase)) uncited.add(phrase)
  }

  return [...uncited]
}
