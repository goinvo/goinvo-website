/**
 * Organisation-level research: what an organisation is publicly working on that
 * we could credibly open a conversation about.
 *
 * The registries (Clearbit, Wikidata) answer *who* an organisation is. They
 * cannot answer *what they are reachable about* — that is live, and it changes.
 * This is the part that genuinely needs a model with web search.
 *
 * Stored as `marketingOrgResearch`, managed purely through the data API rather
 * than as a Studio schema — the same approach as `previewShareLink` and the
 * financial-posture document. One record per organisation, not per contact:
 * nine people at Mass General Brigham share one answer, and duplicating it
 * across their records would mean nine things to correct when it goes stale.
 *
 * Pure and SDK-free so the prompt and the parsing can be tested without calling
 * anything.
 */

export const ORG_RESEARCH_TYPE = 'marketingOrgResearch'

/** Deterministic id, so re-running updates a record instead of forking it. */
export function orgResearchSlug(organization: string): string {
  return String(organization)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function orgResearchDocId(organization: string): string {
  return `${ORG_RESEARCH_TYPE}.${orgResearchSlug(organization)}`
}

export type OrgResearch = {
  organization: string
  /** One line on what they actually do. */
  whatTheyDo: string
  /** Only what the quoted passage proves. Nothing else. */
  recentSignal: string
  /** The exact passage the claim rests on. */
  quote: string
  /** Which cited URL the quote came from. */
  quoteUrl: string
  /** Wider picture the model could not tie to one passage. Never shown as fact. */
  context: string
  /** The opening we could credibly make. */
  reachableAbout: string
  /** Which of our offers this points at, if any. */
  suggestedOfferKey: string
  confidence: 'high' | 'medium' | 'low'
  sources: { title: string; url: string }[]
}

export const ORG_RESEARCH_SYSTEM = `You research healthcare organisations so a small
design studio can decide whether there is a credible reason to reach out.

GoInvo is a Boston healthcare design studio: clinical software, human factors for
regulated products, data visualisation, and open-source health work. It sells
fixed-scope engagements, not staff augmentation.

THE HARD RULE: every word of "recentSignal" must be provable from ONE passage you
quote. Not from your memory, not from three pages stitched together, not from
what you infer is probably also true. One passage, quoted exactly, that a
sceptical reader can open and check.

This is checked automatically afterwards. Your quote is searched for verbatim in
the page you attribute it to, and the claim is compared against it. A claim that
reaches past its quote is rejected, so padding it costs you the whole record.

Concretely:
- No date in the claim unless that date is in the quote.
- No number, headcount, dollar figure or percentage unless it is in the quote.
- No person's name, product name or partner name unless it is in the quote.
- No "leading", "major", "rapidly growing" - adjectives you cannot cite.
- If the quote says a partnership was announced, do not write that it launched.

Prefer a small true claim to a big shaky one. "Announced a partnership with X"
that survives checking is worth more than a paragraph that does not.

Everything else you learned - the wider picture, the numbers you saw elsewhere,
your read on what it means - goes in "context", which is clearly labelled as
unverified and is never repeated as fact.

If you cannot find one citable passage worth building an approach on, say so:
empty recentSignal, empty quote, confidence "low". That is a perfectly good
answer and much better than a confident guess.

Reply with ONLY a JSON object:
{
  "whatTheyDo": "one sentence",
  "recentSignal": "only what the quote below proves, or empty string",
  "quote": "the exact passage, copied character for character, or empty string",
  "quoteUrl": "the URL the quote came from, or empty string",
  "context": "wider unverified picture, may be empty",
  "reachableAbout": "the concrete opening this justifies, or empty string",
  "suggestedOfferKey": "one of the offer keys given, or empty string",
  "confidence": "high" | "medium" | "low"
}`

export function buildOrgResearchPrompt(input: {
  organization: string
  segment?: string
  contactCount?: number
  offers: { key?: string; title?: string; oneLiner?: string }[]
}): string {
  const offers = input.offers
    .filter((offer) => offer.key)
    .map((offer) => `- ${offer.key}: ${offer.title}${offer.oneLiner ? ` — ${offer.oneLiner}` : ''}`)
    .join('\n')

  return [
    `Organisation: ${input.organization}`,
    input.segment ? `Our working sector guess: ${input.segment}` : '',
    input.contactCount
      ? `We already have ${input.contactCount} newsletter subscriber(s) there (no prior contact).`
      : '',
    '',
    'Our offers:',
    offers || '- (none on file)',
    '',
    `Search the web for what ${input.organization} is publicly working on right now,`,
    'then answer with the JSON object described in the system prompt.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Normalise a model reply into a storable record.
 *
 * Confidence is clamped DOWN to "low" when nothing was cited. The model is
 * perfectly willing to sound sure about a signal it did not find, and an
 * uncited claim on a call sheet is exactly the failure this is meant to avoid.
 */
export function normaliseOrgResearch(input: {
  organization: string
  parsed: Record<string, unknown> | null
  sources: { title: string; url: string }[]
}): OrgResearch {
  const parsed = input.parsed || {}
  const str = (key: string) => {
    const value = parsed[key]
    return typeof value === 'string' ? value.trim() : ''
  }
  const sources = (input.sources || []).filter((source) => source && source.url)
  const claimed = String(parsed.confidence || '').toLowerCase()
  const stated: OrgResearch['confidence'] =
    claimed === 'high' || claimed === 'medium' || claimed === 'low' ? claimed : 'low'
  const signal = str('recentSignal')
  const confidence: OrgResearch['confidence'] =
    sources.length === 0 || !signal ? 'low' : stated

  return {
    organization: input.organization,
    whatTheyDo: str('whatTheyDo'),
    recentSignal: signal,
    quote: str('quote'),
    quoteUrl: str('quoteUrl'),
    context: str('context'),
    reachableAbout: str('reachableAbout'),
    suggestedOfferKey: str('suggestedOfferKey'),
    confidence,
    sources: sources.slice(0, 6),
  }
}

/**
 * Is this worth putting in front of a person?
 *
 * A quote is now part of the contract, not a nicety. Under the old prompt the
 * model returned a rich paragraph and a bag of links, and every one of the first
 * twenty claims failed verification. A record that cannot point at the passage
 * it rests on has nothing for the verifier to check, so it does not get stored.
 */
export function isUsableOrgResearch(research: OrgResearch): boolean {
  return Boolean(
    research.reachableAbout && research.recentSignal && research.quote && research.sources.length > 0,
  )
}
