/**
 * Pure "clone / derive" builders for the portable marketing CMS.
 *
 *  - `buildLinkFromPost` derives the fields of a `marketingLinkItem` from a
 *    calendar item, replicating the Studio tool's `createLinkFromPost`
 *    (src/sanity/tools/marketingTool.tsx, ~line 11940) without its closure state.
 *  - `buildProofPointFromResult` derives the fields of a `marketingProofPoint`
 *    from a research result, replicating the tool's
 *    `buildProofPointFromResearchResult` (~line 19863).
 *
 * Both are pure (no network, no Sanity client). The helper functions are ported
 * faithfully from the tool so the API and Studio produce identical documents.
 * They return loose field bags meant to be handed to `buildCreatePayload`, which
 * applies defaults, keys array items, and validates required fields.
 */
import { refsFromIds, type SanityReference } from './derive'
import { dateInputToIso, toDateInputValue } from './dates'

/** A loose field bag for a document being built (no `_id`, no `_type`). */
export type MarketingFieldBag = Record<string, unknown>

/** Minimal shape of a calendar item needed to derive a link. */
export interface CalendarItemForLink {
  _id: string
  title?: string
  brief?: string
  contentType?: string
  channel?: string
  channelRef?: { key?: string } | null
  status?: string
  publishAt?: string
  workingUrl?: string
  publishedUrl?: string
  campaign?: { _id?: string } | null
}

/** Minimal shape of a research result needed to derive a proof point. */
export interface ResearchResultForProof {
  _id: string
  title?: string
  resultType?: string
  status?: string
  sourceMethod?: string
  scoreSource?: string
  evidenceType?: string
  confidence?: string
  keyword?: string
  topicArea?: string
  sourceTitle?: string
  sourceUrl?: string
  canonicalUrl?: string
  claim?: string
  implication?: string
  contentGap?: string
  competitorName?: string
  competitorUrl?: string
  collaboratorName?: string
  organization?: string
  volume?: number
  difficulty?: number
}

/** Minimal shape of the originating research project. */
export interface ResearchProjectForProof {
  _id: string
  title?: string
}

// --- Link-from-post helpers (ported from marketingTool.tsx) ----------------

/** Collapse whitespace, trim, and cap a description at 150 chars (ported). */
function trimDescription(value?: string): string | undefined {
  const trimmed = (value || '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return undefined
  return trimmed.length > 150 ? `${trimmed.slice(0, 147)}...` : trimmed
}

/** Map a calendar content type to a link `type` value (ported). */
function calendarContentTypeToLinkType(contentType?: string): string {
  if (contentType === 'caseStudy') return 'caseStudy'
  if (['article', 'newsletter', 'socialPost', 'carousel', 'reel', 'post', 'video'].includes(contentType || '')) {
    return 'article'
  }
  if (contentType === 'event') return 'event'
  if (contentType === 'landingPage') return 'site'
  return 'other'
}

/** True when a calendar item is published-ready (scheduled/published, due) (ported). */
function isCalendarItemPublishReady(item: CalendarItemForLink): boolean {
  if (!['scheduled', 'published'].includes(item.status || '')) return false
  if (!item.publishAt) return true
  return new Date(item.publishAt).getTime() <= Date.now()
}

/**
 * Builds the `marketingLinkItem` fields derived from a calendar item.
 *
 * Mirrors the Studio tool's `createLinkFromPost`: the URL is the item's
 * published URL (preferred) or working URL; status is 'active' when the post is
 * publish-ready else 'draft'; sourceChannel comes from the channel ref key (or
 * the legacy `channel` string, defaulting to 'instagram'); publishAt is
 * round-tripped through the date helpers; and the link is linked back to the
 * originating calendar item (single ref + array) and its campaign when present.
 *
 * Returns a loose field bag for `buildCreatePayload('marketingLinkItem', ...)`,
 * which keys the `calendarItems` array and applies the default `order`/`type`.
 * Throws when the calendar item has no usable URL.
 */
export function buildLinkFromPost(calendarItem: CalendarItemForLink): MarketingFieldBag {
  const postUrl = calendarItem.publishedUrl || calendarItem.workingUrl || ''
  if (!postUrl) {
    throw new Error('Calendar item has no publishedUrl or workingUrl to turn into a link.')
  }

  const publishReady = isCalendarItemPublishReady(calendarItem)
  const campaignId = calendarItem.campaign?._id

  const fields: MarketingFieldBag = {
    title: calendarItem.title || 'Untitled post link',
    url: postUrl,
    description: trimDescription(calendarItem.brief),
    type: calendarContentTypeToLinkType(calendarItem.contentType),
    status: publishReady ? 'active' : 'draft',
    publishAt: calendarItem.publishAt
      ? dateInputToIso(toDateInputValue(calendarItem.publishAt))
      : undefined,
    sourceChannel: calendarItem.channelRef?.key || calendarItem.channel || 'instagram',
    calendarItem: { _type: 'reference', _ref: calendarItem._id },
    calendarItems: refsFromIds([calendarItem._id]),
    ...(campaignId ? { campaign: { _type: 'reference', _ref: campaignId } } : {}),
  }

  return fields
}

// --- Proof-from-result helpers (ported from marketingTool.tsx) -------------

const researchResultTypeOptions = [
  { title: 'SEO Keyword', value: 'seoKeyword' },
  { title: 'Source Evidence', value: 'sourceEvidence' },
  { title: 'Content Gap', value: 'contentGap' },
  { title: 'Analytics Signal', value: 'analyticsSignal' },
  { title: 'Competitor Example', value: 'competitorExample' },
  { title: 'Collaboration Signal', value: 'collaborationSignal' },
]

function labelForResultType(value?: string): string {
  return researchResultTypeOptions.find((option) => option.value === value)?.title || value || ''
}

/** Normalize a free-text URL into a canonical absolute URL, or '' (ported). */
function normalizeInspirationUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return new URL(trimmed).toString()
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`).toString()
      } catch {
        return ''
      }
    }
    return ''
  }
}

function formatOptionalNumber(value?: number): string {
  return value === undefined || Number.isNaN(value) ? 'n/a' : new Intl.NumberFormat().format(value)
}

/** True when a research result has been approved/selected (ported). */
function isResearchResultApproved(result: ResearchResultForProof): boolean {
  return result.status === 'approved' || result.status === 'selected'
}

/** Human label for the kind of research result (ported). */
function researchResultKindLabel(result: ResearchResultForProof): string {
  if (result.sourceMethod === 'manualInspiration') {
    return result.resultType === 'competitorExample' ? 'Inspiration example' : 'Captured inspiration'
  }
  if (result.resultType === 'sourceEvidence') {
    return result.confidence === 'needsValidation' || /source check needed/i.test(result.title || '')
      ? 'Source candidate'
      : 'Source finding'
  }
  if (result.resultType === 'seoKeyword') return result.scoreSource === 'provider' ? 'Keyword score' : 'Keyword idea'
  if (result.resultType === 'contentGap') return 'Content gap'
  if (result.resultType === 'analyticsSignal') return 'Analytics signal'
  if (result.resultType === 'competitorExample') return 'Example to review'
  if (result.resultType === 'collaborationSignal') return 'Collaborator signal'
  return labelForResultType(result.resultType) || 'Research item'
}

/** Free-text description of a research result, used as a claim fallback (ported). */
function describeResearchResult(result: ResearchResultForProof): string {
  if (result.resultType === 'seoKeyword') {
    const scoreLabel =
      result.scoreSource === 'provider'
        ? [
            result.volume !== undefined ? `volume ${formatOptionalNumber(result.volume)}` : '',
            result.difficulty !== undefined ? `KD ${formatOptionalNumber(result.difficulty)}` : '',
          ]
            .filter(Boolean)
            .join(', ')
        : result.scoreSource === 'aiEstimate'
          ? 'AI-estimated keyword signal, not provider-scored'
          : 'keyword signal without provider scores'
    return `${result.keyword || result.title || 'Keyword'}${scoreLabel ? ` (${scoreLabel})` : ''}`
  }
  if (result.claim) return result.claim
  if (result.sourceTitle || result.sourceUrl) return [result.sourceTitle, result.sourceUrl].filter(Boolean).join(' / ')
  if (result.collaboratorName || result.organization) {
    return [result.collaboratorName, result.organization, result.topicArea].filter(Boolean).join(' / ')
  }
  return result.title || 'Research result'
}

/** Derive the proof `proofType` from a research result's kind (ported). */
function proofTypeFromResearchResult(result: ResearchResultForProof): string {
  if (result.resultType === 'seoKeyword') return 'researchFinding'
  if (result.resultType === 'competitorExample' || result.evidenceType === 'competitorExample') return 'caseEvidence'
  if (result.evidenceType === 'teamKnowledge' || result.resultType === 'collaborationSignal') return 'teamKnowledge'
  if (result.evidenceType === 'visualArtifact') return 'visualArtifact'
  if (result.resultType === 'contentGap') return 'researchFinding'
  if (result.evidenceType === 'quote') return 'quote'
  if (result.evidenceType === 'statistic') return 'statistic'
  return 'researchFinding'
}

/**
 * Builds the `marketingProofPoint` fields derived from a research result.
 *
 * Mirrors the Studio tool's `buildProofPointFromResearchResult`: the title is
 * derived from the source/competitor/keyword title; the claim falls back through
 * claim → implication → contentGap → a generated description; the proofType is
 * inferred from the result kind; confidence defaults from approval status; the
 * proof links back to the source result via `researchResults`; and usageNotes
 * explain provenance and review state.
 *
 * Returns a loose field bag for `buildCreatePayload('marketingProofPoint', ...)`.
 */
export function buildProofPointFromResult(
  result: ResearchResultForProof,
  draft?: ResearchProjectForProof,
): MarketingFieldBag {
  const titleBasis =
    result.sourceTitle || result.competitorName || result.title || result.keyword || 'Research item'
  const sourceUrl = normalizeInspirationUrl(result.sourceUrl || result.competitorUrl || result.canonicalUrl || '')
  const sourceTitle = result.sourceTitle || result.competitorName || result.title || result.keyword || ''
  const claim = result.claim || result.implication || result.contentGap || describeResearchResult(result)
  const notes = [
    result.sourceMethod === 'manualInspiration'
      ? 'Created from captured inspiration. Confirm the source, claim, and framing before using it in content.'
      : `Created from ${researchResultKindLabel(result).toLowerCase()}.`,
    draft?.title ? `Research project: ${draft.title}.` : '',
    isResearchResultApproved(result)
      ? 'This finding was marked trusted for setup use.'
      : 'This proof still needs review before it should guide published work.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title: `${titleBasis} proof`,
    claim,
    proofType: proofTypeFromResearchResult(result),
    sourceTitle,
    ...(sourceUrl ? { sourceUrl } : {}),
    confidence: result.confidence || (isResearchResultApproved(result) ? 'medium' : 'needsValidation'),
    researchResults: refsFromIds([result._id]),
    topicCluster: result.keyword || result.topicArea || draft?.title || '',
    usageNotes: notes,
  }
}

export type { SanityReference }
