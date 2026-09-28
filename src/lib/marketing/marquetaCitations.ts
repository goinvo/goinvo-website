/**
 * Turning verified research into a citation somebody can click and check.
 *
 * The rest of the suite already does the hard part: `orgResearch` makes the
 * model return the exact passage it relied on, and `sourceVerification` proves
 * that passage literally appears in the page it cites, binding the claim to the
 * one source whose text supports it. What was missing was a way to SHOW that —
 * in a Slack answer, or as grounding for something Marqueta writes.
 *
 * Two rules, both inherited from the call sheet and the audience brief, because
 * getting them wrong is what put "Carolinashealthcare" and twenty unverifiable
 * claims in front of people:
 *
 *   1. Cite the ACTUAL content. The href is a `#:~:text=` deep link that scrolls
 *      the reader to the exact quoted sentence, not the top of a homepage. And
 *      the quote itself is passed through VERBATIM — the passage that was
 *      confirmed to appear in the page, never a paraphrase of it.
 *   2. Verified leads; unverified is labelled. A claim whose quote could not be
 *      found in its page is not a citation, it is a lead — shown only when asked
 *      for, and always marked "do not repeat as fact".
 *
 * Pure and free: it formats records that were already fetched, so the prompt and
 * the Slack rendering can both be tested without a Sanity round-trip.
 */

import { escapeSlackText } from './slackText'

/** The shape a `marketingOrgResearch` document is read in, verification and all. */
export type ResearchRecordInput = {
  organization: string
  whatTheyDo?: string | null
  recentSignal?: string | null
  reachableAbout?: string | null
  /** The model's claimed passage. Only trusted once verification confirms it. */
  quote?: string | null
  quoteUrl?: string | null
  /** Wider unverified picture. Never repeated as fact. */
  context?: string | null
  suggestedOfferKey?: string | null
  confidence?: string | null
  sources?: { title?: string | null; url?: string | null }[] | null
  verification?: {
    status?: string | null
    /** Each quote here was confirmed to appear verbatim in the page cited beside it. */
    evidence?: { url?: string | null; quote?: string | null; textFragmentUrl?: string | null }[] | null
  } | null
}

export type ResearchCitation = {
  organization: string
  /** Only what the quoted passage proves. */
  signal: string
  /** The exact passage, copied through unchanged. Empty when unverified. */
  quote: string
  /** Deep link that highlights the quote in the source, or the bare URL. */
  sourceUrl: string
  sourceTitle: string
  /** The concrete opening this justifies. */
  opening: string
  offerKey: string
  /** True only when the quote was found verbatim in the page it cites. */
  verified: boolean
  /** Background that is NOT verified and must never be stated as fact. */
  context: string
}

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

// One escaper for the whole suite. This module carried its own copy before
// `slackText` existed; re-exported so callers of either path keep working.
export { escapeSlackText }

/**
 * The best citable evidence on a record, and whether it is proven.
 *
 * A verified record carries evidence whose quote was found in the page — that is
 * what gets the deep link and the verbatim quote. A record with the model's
 * quote but no verification is downgraded to a lead: its "quote" is dropped, so
 * nothing unproven is ever shown wearing quotation marks.
 */
export function toResearchCitation(record: ResearchRecordInput): ResearchCitation | null {
  const organization = clean(record.organization)
  const signal = clean(record.recentSignal)
  if (!organization || !signal) return null

  const evidence = (record.verification?.evidence || []).find((item) => clean(item?.quote))
  const verified = record.verification?.status === 'verified' && Boolean(evidence)

  if (verified && evidence) {
    const quote = clean(evidence.quote)
    const url = clean(evidence.textFragmentUrl) || clean(evidence.url) || clean(record.quoteUrl)
    if (!quote || !url) return null
    return {
      organization,
      signal,
      quote,
      sourceUrl: url,
      sourceTitle: titleForUrl(record, url),
      opening: clean(record.reachableAbout),
      offerKey: clean(record.suggestedOfferKey),
      verified: true,
      context: clean(record.context),
    }
  }

  // Unverified: a lead, not a citation. No quote is surfaced (it was never
  // confirmed to exist), and the link is to the page rather than a highlighted
  // span so it never looks like proof.
  const url = clean(record.quoteUrl) || clean(record.sources?.find((s) => clean(s?.url))?.url)
  if (!url) return null
  return {
    organization,
    signal,
    quote: '',
    sourceUrl: url,
    sourceTitle: titleForUrl(record, url),
    opening: clean(record.reachableAbout),
    offerKey: clean(record.suggestedOfferKey),
    verified: false,
    context: clean(record.context),
  }
}

function titleForUrl(record: ResearchRecordInput, url: string): string {
  const match = (record.sources || []).find((source) => clean(source?.url) === url)
  if (match && clean(match.title)) return clean(match.title)
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

/**
 * Build the citations for a set of research records.
 *
 * Verified first, because those are the ones safe to lead with. Unverified leads
 * are included only when explicitly asked for, and never outrank a verified one.
 */
export function buildResearchCitations(
  records: ResearchRecordInput[],
  options: { limit?: number; includeUnverified?: boolean } = {},
): ResearchCitation[] {
  const limit = options.limit ?? 5
  const citations = (records || [])
    .map(toResearchCitation)
    .filter((citation): citation is ResearchCitation => Boolean(citation))
    .filter((citation) => options.includeUnverified || citation.verified)

  return citations
    .sort(
      (a, b) =>
        Number(b.verified) - Number(a.verified) || a.organization.localeCompare(b.organization),
    )
    .slice(0, limit)
}

/**
 * One citation as Slack markdown.
 *
 * Verified: the organisation, what it proves, the passage itself in a
 * blockquote, and a deep link to read it in context. That is the whole point —
 * the reader can open the exact sentence and check it.
 *
 * Unverified: the same signal, marked plainly as unproven, linking to the page
 * rather than a highlighted quote.
 */
export function formatCitationForSlack(citation: ResearchCitation): string {
  const org = escapeSlackText(citation.organization)
  const signal = escapeSlackText(citation.signal.replace(/\s+/g, ' ').trim())

  if (citation.verified) {
    const quote = escapeSlackText(citation.quote.replace(/\s+/g, ' ').trim())
    return [
      `*${org}* — ${signal}`,
      `> ${quote}`,
      `<${citation.sourceUrl}|Read it in context>`,
    ].join('\n')
  }

  const source = escapeSlackText(citation.sourceTitle)
  return [
    `*${org}* — ${signal}`,
    `_Unverified — do not repeat as fact._ <${citation.sourceUrl}|${source}>`,
  ].join('\n')
}

/** A block of citations for a Slack section, or empty string when there are none. */
export function formatCitationsForSlack(citations: ResearchCitation[]): string {
  return citations.map(formatCitationForSlack).join('\n\n')
}

/**
 * The verified citations reshaped as grounding for a generation prompt.
 *
 * Only verified ones, and only the fields the model may build on: the signal,
 * the exact quote, the URL to cite, and the opening. The generator is told to
 * cite nothing that is not in this list and to copy each URL exactly — the same
 * discipline the research prompt itself runs under, carried one step downstream
 * so a drafted post cannot cite a page that was never checked.
 */
export function citationsForPrompt(
  citations: ResearchCitation[],
): { organization: string; signal: string; quote: string; url: string; opening: string }[] {
  return citations
    .filter((citation) => citation.verified && citation.quote)
    .map((citation) => ({
      organization: citation.organization,
      signal: citation.signal,
      quote: citation.quote,
      url: citation.sourceUrl,
      opening: citation.opening,
    }))
}
