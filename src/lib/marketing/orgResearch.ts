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
  /** Something specific and recent, with a date if there is one. */
  recentSignal: string
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

Rules, in order of importance:

1. Only state things you found and can cite. If you cannot find a recent, specific
   signal, say so plainly and set confidence "low". A vague but confident-sounding
   answer is worse than an empty one, because somebody will read it out on a call.
2. Prefer the concrete and dated: a named product, a published pilot, a funding
   round, a regulatory submission, a hiring push, a public commitment. Not
   adjectives about how innovative they are.
3. "reachableAbout" must be a specific opening a designer could say out loud, tied
   to the signal. Not "they care about patient experience".
4. Never invent statistics, and never attribute a claim to a source that does not
   make it.

Reply with ONLY a JSON object:
{
  "whatTheyDo": "one sentence",
  "recentSignal": "specific and dated, or empty string if none found",
  "reachableAbout": "the concrete opening, or empty string",
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
    reachableAbout: str('reachableAbout'),
    suggestedOfferKey: str('suggestedOfferKey'),
    confidence,
    sources: sources.slice(0, 6),
  }
}

/** Is this worth putting in front of a person? */
export function isUsableOrgResearch(research: OrgResearch): boolean {
  return Boolean(research.reachableAbout && research.sources.length > 0)
}
