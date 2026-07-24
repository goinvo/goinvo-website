/**
 * Linked-draft CASCADE builders for the portable marketing CMS.
 *
 * `createResearchProjectRecords` faithfully replicates the Studio tool's
 * `createResearchProjectGeneratedRecords`
 * (src/sanity/tools/marketingTool.tsx, ~line 20860): from an approved/selected
 * research project it creates 1 marketingFunnel, 1 marketingCampaign, 1–2
 * (marketingCalendarItem + marketingLinkItem) pairs, ensures 0–3 marketingChannel
 * documents, and finally patches the project to status 'converted' with the
 * generated refs appended.
 *
 * Field-for-field behavior is kept identical to the tool. The only differences
 * are structural: this module takes the resolved project (with its selected /
 * approved results inlined) instead of the tool's in-memory `MarketingData`
 * snapshot, and it uses the portable core helpers (slugify / randomKey /
 * refsFromIds / referenceFromId, the date utilities, and `ensureMarketingChannel`
 * from seed.ts) rather than the tool-local copies.
 */
import type { SanityClient } from '@sanity/client'
import { randomKey, referenceFromId, refsFromIds, slugify } from './derive'
import { addDays, dateInputToIso, toDateInputValue } from './dates'
import { inferTopicCluster } from './infer'
import { buildCreatePayload, type MarketingCreatePayload, type MarketingFields } from './crud'
import { DEFAULT_CHANNELS, ensureMarketingChannel } from './seed'

// --- Inbound document shapes ------------------------------------------------
//
// These mirror the tool's MarketingResearchProject / MarketingResearchResult
// interfaces, narrowed to the fields the cascade actually reads. The project is
// expected to carry its selected + approved results inlined (the route fetches
// them that way), matching what `getResearchResultsForProject` resolves in the
// Studio.

/** A reference summary as Sanity returns it (or a raw reference). */
export interface CascadeRefSummary {
  _id?: string
  _ref?: string
}

/** Minimal shape of a research result the cascade reads. */
export interface CascadeResearchResult {
  _id: string
  title?: string
  resultType?: string
  status?: string
  selectedForSynthesis?: boolean
  keyword?: string
  searchIntent?: string
  scoreSource?: string
  volume?: number
  difficulty?: number
  canonicalUrl?: string
  sourceUrl?: string
  sourceTitle?: string
  claim?: string
  collaboratorName?: string
  organization?: string
  topicArea?: string
}

/** Minimal shape of the research project the cascade reads. */
export interface CascadeResearchProject {
  _id: string
  /** Revision used to make the conversion transaction an atomic claim. */
  _rev?: string
  title?: string
  status?: string
  brief?: string
  audience?: string
  campaignObjective?: string
  positioning?: string
  canonicalUrl?: string
  /** Results explicitly approved/selected for setup use. */
  selectedResults?: CascadeResearchResult[]
  approvedResults?: CascadeResearchResult[]
  /** Existing generated refs, so we append rather than replace. */
  generatedCampaigns?: CascadeRefSummary[]
  generatedFunnels?: CascadeRefSummary[]
  generatedCalendarItems?: CascadeRefSummary[]
  generatedLinkItems?: CascadeRefSummary[]
}

/** Options for the cascade. */
export interface CreateResearchProjectRecordsOptions {
  /**
   * Restrict the cascade to these result ids. When omitted, every approved /
   * selected result attached to the project is used (the route's default).
   */
  selectedResultIds?: string[]
  /**
   * The highest existing `marketingLinkItem.order` in the dataset, used to place
   * new links after current ones (the tool reads this from its in-memory
   * snapshot). When omitted, it is fetched from Sanity.
   */
  highestLinkOrder?: number
}

/** The ids created by the cascade, returned to the caller. */
export interface CreatedResearchProjectRecords {
  funnelId: string
  campaignId: string
  calendarItemIds: string[]
  linkItemIds: string[]
  /** The `key` of every channel ensured (instagram / linkedin / website). */
  channelKeys: string[]
  projectId: string
  /** True when another request already committed this project's conversion. */
  reused: boolean
}

// --- Ported helpers (faithful to the tool) ----------------------------------

/** True when a research result is approved/selected. Ported from the tool. */
function isResearchResultApproved(result: CascadeResearchResult): boolean {
  return result.status === 'approved' || result.status === 'selected'
}

function getRecordId(record?: CascadeRefSummary): string {
  if (!record) return ''
  if (record._ref) return record._ref
  return record._id || ''
}

function refIdsFromRecords(records: CascadeRefSummary[] | undefined): string[] {
  return (records || []).map((record) => getRecordId(record)).filter(Boolean)
}

function mergeIds(existing: string[], next: string[]): string[] {
  return Array.from(new Set([...existing, ...next].filter(Boolean)))
}

/** Stable Sanity id for every document owned by one research conversion. */
export function researchConversionDocumentId(projectId: string, suffix: string): string {
  const publishedProjectId = projectId.replace(/^drafts\./, '')
  const safeProjectId = publishedProjectId.replace(/[^A-Za-z0-9_.-]/g, '-').slice(-80) || 'project'
  const safeSuffix = suffix.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 28) || 'record'
  return `research-conversion.${safeProjectId}.${safeSuffix}`.slice(0, 128)
}

function completedConversion(project: CascadeResearchProject): CreatedResearchProjectRecords | null {
  const campaignIds = refIdsFromRecords(project.generatedCampaigns)
  const funnelIds = refIdsFromRecords(project.generatedFunnels)
  const calendarItemIds = refIdsFromRecords(project.generatedCalendarItems)
  const linkItemIds = refIdsFromRecords(project.generatedLinkItems)
  if (!campaignIds[0] || !funnelIds[0] || calendarItemIds.length === 0) return null
  return {
    campaignId: campaignIds[0],
    funnelId: funnelIds[0],
    calendarItemIds,
    linkItemIds,
    channelKeys: ['instagram', 'linkedin', 'website'],
    projectId: project._id,
    reused: true,
  }
}

function isRevisionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { statusCode?: unknown; status?: unknown; response?: { statusCode?: unknown } }
  return candidate.statusCode === 409 || candidate.status === 409 || candidate.response?.statusCode === 409
}

function formatOptionalNumber(value?: number): string {
  return value === undefined || Number.isNaN(value) ? 'n/a' : new Intl.NumberFormat().format(value)
}

/**
 * Free-text description of a research result, used as a claim/source fallback.
 * Ported from the tool's `describeResearchResult`.
 */
function describeResearchResult(result: CascadeResearchResult): string {
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

/** A single generated content opportunity (carousel + follow-up post). */
interface ResearchResultOpportunity {
  title: string
  channel: string
  format: string
  callToAction: string
  destinationUrl: string
  sourceMaterial: string
  seoQuery: string
  notes: string
  resultIds: string[]
}

/** Builds 1–2 content opportunities. Ported from `buildResearchResultOpportunities`. */
function buildResearchResultOpportunities(
  project: CascadeResearchProject,
  results: CascadeResearchResult[],
  destinationUrl: string,
): ResearchResultOpportunity[] {
  const seoResults = results.filter((result) => result.resultType === 'seoKeyword')
  const evidenceResults = results.filter((result) => result.resultType !== 'seoKeyword')
  const primary = seoResults[0] || results[0]
  const secondary = seoResults[1] || evidenceResults[0] || results[1]
  const baseTitle = project.title || primary?.keyword || primary?.title || 'Research-backed content'
  const opportunities: ResearchResultOpportunity[] = [
    {
      title: `${baseTitle} Instagram carousel`,
      channel: 'instagram',
      format: 'carousel',
      callToAction: 'See link in bio',
      destinationUrl,
      sourceMaterial: primary ? describeResearchResult(primary) : '',
      seoQuery: primary?.keyword || '',
      notes: buildGeneratedCalendarBrief(project, [primary].filter(Boolean) as CascadeResearchResult[]),
      resultIds: [primary?._id].filter(Boolean) as string[],
    },
  ]

  if (secondary && secondary._id !== primary?._id) {
    opportunities.push({
      title: `${baseTitle} follow-up post`,
      channel: 'linkedin',
      format: 'linkPost',
      callToAction: 'Read the source',
      destinationUrl,
      sourceMaterial: describeResearchResult(secondary),
      seoQuery: secondary.keyword || primary?.keyword || '',
      notes: buildGeneratedCalendarBrief(project, [secondary]),
      resultIds: [secondary._id],
    })
  }

  return opportunities
}

/** Builds a calendar-item brief. Ported from `buildGeneratedCalendarBrief`. */
function buildGeneratedCalendarBrief(
  project: CascadeResearchProject,
  results: CascadeResearchResult[],
): string {
  return [
    `Research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    project.audience ? `Audience: ${project.audience}` : '',
    ...results.map((result) => `Trusted finding: ${describeResearchResult(result)}`),
    'Designer task: make the content from the trusted finding without inventing scores or unsupported claims.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Builds the funnel evidence summary. Ported from `buildResearchResultEvidenceSummary`. */
function buildResearchResultEvidenceSummary(
  project: CascadeResearchProject,
  results: CascadeResearchResult[],
): string {
  return [
    `Generated from research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    'Trusted findings:',
    ...results.map((result) => `- ${describeResearchResult(result)}`),
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Resolves the next link order. The tool reads `nextLinkOrder(data.linkItems)`
 * from its in-memory snapshot: `max(order) + 10`. Here we either accept the
 * caller-provided highest order or query Sanity for it.
 */
async function resolveNextLinkOrder(
  client: SanityClient,
  highestLinkOrder?: number,
): Promise<number> {
  if (typeof highestLinkOrder === 'number') return highestLinkOrder + 10
  const highest = await client.fetch<number | null>(
    'math::max(*[_type == "marketingLinkItem"].order)',
  )
  return (highest || 0) + 10
}

// --- The cascade ------------------------------------------------------------

/**
 * Replicates the Studio tool's `createResearchProjectGeneratedRecords` for a
 * resolved research project document. Creates the funnel, campaign, calendar +
 * link pairs, and channels, then patches the project to status 'converted' with
 * the generated refs appended, and returns the created ids.
 *
 * Every generated id is deterministic and all generated documents plus the
 * project reference update commit atomically. The project revision is the
 * conversion claim: concurrent callers either win that revision or reuse the
 * complete conversion committed by the winner.
 */
export async function createResearchProjectRecords(
  client: SanityClient,
  project: CascadeResearchProject,
  opts: CreateResearchProjectRecordsOptions = {},
): Promise<CreatedResearchProjectRecords> {
  const alreadyConverted = completedConversion(project)
  if (alreadyConverted) return alreadyConverted
  if (!project._rev) {
    throw new Error('Research project revision is required for an atomic conversion.')
  }

  // Resolve the approved/selected results carried by the project. The tool pulls
  // these from `getResearchResultsForProject` + an explicit selectedResultIds
  // list; here the project already carries its selected/approved results inline.
  const allResults = uniqueResults([
    ...(project.selectedResults || []),
    ...(project.approvedResults || []),
  ])
  const selected = allResults.filter((result) => {
    if (!isResearchResultApproved(result)) return false
    if (opts.selectedResultIds && opts.selectedResultIds.length > 0) {
      return opts.selectedResultIds.includes(result._id)
    }
    return true
  })
  if (selected.length === 0) throw new Error('No selected trusted findings were found.')

  const today = new Date()
  const title = project.title || 'Research-backed marketing setup'
  const slug = slugify(title)
  const destinationUrl =
    project.canonicalUrl ||
    selected.find((result) => result.canonicalUrl)?.canonicalUrl ||
    selected.find((result) => result.sourceUrl)?.sourceUrl ||
    'https://www.goinvo.com/'
  const topicCluster = inferTopicCluster(title)
  const targetQueries = selected.map((result) => result.keyword || '').filter(Boolean)
  const primaryKeyword = targetQueries[0] || topicCluster
  const searchIntent = selected.find((result) => result.searchIntent)?.searchIntent || 'learn'

  // Ensure the three channels the tool always sets up, in order. We use the
  // portable seed.ts ensureMarketingChannel, looking each channel up in
  // DEFAULT_CHANNELS so the created channel content types match the schema.
  const channels = ['instagram', 'linkedin', 'website']
  const channelIds: Record<string, string> = {}
  for (const channelKey of channels) {
    const def = channelDefForKey(channelKey)
    const { channel } = await ensureMarketingChannel(client, def)
    channelIds[channelKey] = channel._id
  }

  const resultRefs = refsFromIds(selected.map((result) => result._id))

  const funnelId = researchConversionDocumentId(project._id, 'funnel')
  const campaignId = researchConversionDocumentId(project._id, 'campaign')

  // 1 marketingFunnel.
  const funnelPayload = buildCreatePayload('marketingFunnel', {
    _id: funnelId,
    title: `${title} research path`,
    status: 'draft',
    audience:
      project.audience || 'People who need this topic explained through useful GoInvo content.',
    conversionGoal: `Move from a research-backed content artifact to ${destinationUrl}.`,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    stages: normalizeFunnelStages([
      {
        stage: 'awareness',
        goal: 'Use a trusted finding as the first visible hook.',
        offer: primaryKeyword,
        callToAction: 'Open the source',
        destinationUrl,
        metrics: ['Reach', 'Saves', 'Profile visits'],
      },
      {
        stage: 'interest',
        goal: 'Show enough evidence for the audience to understand why the topic matters.',
        offer: 'Trusted finding',
        callToAction: 'Read the source',
        destinationUrl,
        metrics: ['Engaged visits', 'Quick Link clicks'],
      },
      {
        stage: 'conversion',
        goal: 'Invite the right people to contact GoInvo, reuse the work, or explore related work.',
        offer: 'Canonical destination',
        callToAction: 'Start a conversation',
        destinationUrl,
        metrics: ['CTA clicks', 'Contact starts', 'Qualified conversations'],
      },
    ]),
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: buildResearchResultEvidenceSummary(project, selected),
  }) as MarketingCreatePayload & { _id: string }
  // 1 marketingCampaign.
  const campaignPayload = buildCreatePayload('marketingCampaign', {
    _id: campaignId,
    title,
    slug: { _type: 'slug', current: slug },
    status: 'planned',
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(addDays(today, 21)),
    primaryGoal: project.brief || `Turn trusted ${title} findings into a small content runway.`,
    campaignObjective: project.campaignObjective || 'awareness',
    audience: project.audience || '',
    topicCluster,
    searchIntent,
    targetQueries,
    positioning: project.positioning || '',
    canonicalUrl: destinationUrl,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    channels,
    channelRefs: refsFromIds(Object.values(channelIds)),
    funnels: refsFromIds([funnelId]),
    primaryKpi: 'Useful visits from reviewed research-backed content',
    utmCampaign: slug,
    successMetrics: normalizeSuccessMetrics([
      {
        label: 'Useful visits',
        target: 'People reach the canonical destination from promoted links.',
      },
      {
        label: 'Saved or shared content',
        target:
          'The audience signals the research-backed idea was useful enough to keep or pass along.',
      },
    ]),
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes:
      'Generated from trusted Research findings. Edit before publishing if strategy changes.',
  }) as MarketingCreatePayload & { _id: string }
  // 1–2 (marketingCalendarItem + marketingLinkItem) pairs.
  const opportunities = buildResearchResultOpportunities(project, selected, destinationUrl)
  const createdCalendarItems = opportunities.map((_, index) =>
    researchConversionDocumentId(project._id, `calendar-${index + 1}`),
  )
  const createdLinkItems = opportunities.map((_, index) =>
    researchConversionDocumentId(project._id, `link-${index + 1}`),
  )
  const baseLinkOrder = await resolveNextLinkOrder(client, opts.highestLinkOrder)
  let transaction = client
    .transaction()
    .createIfNotExists(funnelPayload)
    .createIfNotExists(campaignPayload)

  for (const [index, opportunity] of opportunities.entries()) {
    const publishDate = dateInputToIso(toDateInputValue(addDays(today, 7 + index * 4)))
    const calendarId = createdCalendarItems[index]
    const linkId = createdLinkItems[index]
    const calendarPayload = buildCreatePayload('marketingCalendarItem', {
      _id: calendarId,
      title: opportunity.title,
      status: 'drafting',
      publishAt: publishDate,
      contentType: opportunity.format,
      channel: opportunity.channel,
      channelRef: {
        _type: 'reference',
        _ref: channelIds[opportunity.channel] || channelIds.instagram,
      },
      campaign: { _type: 'reference', _ref: campaignId },
      funnel: { _type: 'reference', _ref: funnelId },
      funnelStage: index === 0 ? 'awareness' : 'interest',
      workingUrl: opportunity.destinationUrl,
      brief: opportunity.notes,
      callToAction: opportunity.callToAction,
      utmCampaign: slug,
      topicCluster,
      searchIntent,
      targetQueries: Array.from(new Set([opportunity.seoQuery, ...targetQueries].filter(Boolean))),
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
      linkItems: refsFromIds([linkId]),
    }) as MarketingCreatePayload & { _id: string }

    const linkPayload = buildCreatePayload('marketingLinkItem', {
      _id: linkId,
      title: opportunity.title,
      url: opportunity.destinationUrl,
      description: opportunity.sourceMaterial || `Research-backed link for ${title}.`,
      type: 'article',
      status: 'draft',
      featured: index === 0,
      order: baseLinkOrder + index,
      publishAt: publishDate,
      sourceChannel: opportunity.channel,
      campaign: { _type: 'reference', _ref: campaignId },
      calendarItem: { _type: 'reference', _ref: calendarId },
      calendarItems: refsFromIds([calendarId]),
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    }) as MarketingCreatePayload & { _id: string }
    transaction = transaction
      .createIfNotExists(calendarPayload)
      .createIfNotExists(linkPayload)
  }

  // The revision guard is the atomic claim. It protects unrelated references
  // added after the route fetched the project from being overwritten by a stale
  // full-array set.
  transaction = transaction.patch(project._id, (patch) =>
    patch.ifRevisionId(project._rev as string).set({
      status: 'converted',
      selectedResults: refsFromIds(selected.map((result) => result._id)),
      approvedResults: refsFromIds(selected.map((result) => result._id)),
      generatedCampaigns: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedCampaigns), [campaignId]),
      ),
      generatedFunnels: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedFunnels), [funnelId]),
      ),
      generatedCalendarItems: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedCalendarItems), createdCalendarItems),
      ),
      generatedLinkItems: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedLinkItems), createdLinkItems),
      ),
    }),
  )

  try {
    await transaction.commit()
  } catch (error) {
    if (!isRevisionConflict(error)) throw error
    const winner = await client.fetch<CascadeResearchProject | null>(
      `*[_type == "marketingResearchProject" && _id == $id][0]{
        _id,
        _rev,
        generatedCampaigns[]{_ref},
        generatedFunnels[]{_ref},
        generatedCalendarItems[]{_ref},
        generatedLinkItems[]{_ref}
      }`,
      { id: project._id },
    )
    const completed = winner ? completedConversion(winner) : null
    if (completed) return completed
    throw error
  }

  return {
    funnelId,
    campaignId,
    calendarItemIds: createdCalendarItems,
    linkItemIds: createdLinkItems,
    channelKeys: channels,
    projectId: project._id,
    reused: false,
  }
}

/**
 * Compatibility cleanup helper for callers that created records with the old
 * sequential implementation. New conversions do not need it because their
 * create/reference mutation is a single atomic transaction.
 */
export async function rollbackCreatedRecords(client: SanityClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    const transaction = ids.reduce((next, id) => next.delete(id), client.transaction())
    await transaction.commit({ visibility: 'async' })
  } catch {
    // Compatibility behavior: never mask the writer failure that triggered cleanup.
  }
}

// --- Local helpers ----------------------------------------------------------

/** Dedupe results by `_id`, keeping first-seen order. */
function uniqueResults(results: CascadeResearchResult[]): CascadeResearchResult[] {
  const seen = new Map<string, CascadeResearchResult>()
  for (const result of results) {
    if (!result?._id) continue
    if (!seen.has(result._id)) seen.set(result._id, result)
  }
  return Array.from(seen.values())
}

/** Looks up a DEFAULT_CHANNELS definition by key, falling back to a generic one. */
function channelDefForKey(key: string) {
  const found = DEFAULT_CHANNELS.find((channel) => channel.key === key)
  if (found) return found
  return {
    title: key,
    key,
    platform: 'other',
    contentTypes: [{ label: 'Post', value: 'post' }],
  }
}

/** Stamps `_key`/`_type` onto funnel stages. Ported from `normalizeFunnelStages`. */
function normalizeFunnelStages(
  stages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return stages.map((stage) => ({
    ...stage,
    _key: typeof stage._key === 'string' && stage._key ? stage._key : randomKey(),
    _type: 'funnelStage',
  }))
}

/** Stamps `_key`/`_type` onto success metrics. Ported from `normalizeSuccessMetrics`. */
function normalizeSuccessMetrics(
  metrics: Array<{ _key?: string; label?: string; target?: string }>,
): MarketingFields[] {
  return metrics
    .filter((metric) => metric.label || metric.target)
    .map((metric) => {
      const normalized: MarketingFields = {
        _key: metric._key || randomKey(),
        _type: 'successMetric',
        label: metric.label || 'Metric',
      }
      if (metric.target) normalized.target = metric.target
      return normalized
    })
}
