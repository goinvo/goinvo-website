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
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  fetchedAnySource: boolean
  evidence: VerifiedEvidence[]
  entailment: 'supported' | 'partial' | 'unsupported' | null
}): VerificationStatus {
  if (!input.fetchedAnySource) return 'unchecked'
  if (input.evidence.length === 0) return 'unsupported'
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
