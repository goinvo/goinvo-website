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
import { buildCreatePayload, type MarketingFields } from './crud'
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
 * Creates are sequential (matching the tool, which awaits each create so a later
 * create can reference an earlier id) rather than a single transaction.
 */
export async function createResearchProjectRecords(
  client: SanityClient,
  project: CascadeResearchProject,
  opts: CreateResearchProjectRecordsOptions = {},
): Promise<CreatedResearchProjectRecords> {
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

  // 1 marketingFunnel.
  const funnelPayload = buildCreatePayload('marketingFunnel', {
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
  })
  // Best-effort transactional safety: track every doc we create so a mid-cascade
  // failure rolls them back (in one transaction, to resolve the calendar↔link
  // mutual references) instead of orphaning funnel/campaign/calendar/link docs.
  const rollbackIds: string[] = []
  try {
  const funnel = await client.create(funnelPayload)
  rollbackIds.push(funnel._id)

  // 1 marketingCampaign.
  const campaignPayload = buildCreatePayload('marketingCampaign', {
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
    funnels: refsFromIds([funnel._id]),
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
  })
  const campaign = await client.create(campaignPayload)
  rollbackIds.push(campaign._id)

  // 1–2 (marketingCalendarItem + marketingLinkItem) pairs.
  const opportunities = buildResearchResultOpportunities(project, selected, destinationUrl)
  const createdCalendarItems: string[] = []
  const createdLinkItems: string[] = []
  const baseLinkOrder = await resolveNextLinkOrder(client, opts.highestLinkOrder)

  for (const [index, opportunity] of opportunities.entries()) {
    const publishDate = dateInputToIso(toDateInputValue(addDays(today, 7 + index * 4)))
    const calendarPayload = buildCreatePayload('marketingCalendarItem', {
      title: opportunity.title,
      status: 'drafting',
      publishAt: publishDate,
      contentType: opportunity.format,
      channel: opportunity.channel,
      channelRef: {
        _type: 'reference',
        _ref: channelIds[opportunity.channel] || channelIds.instagram,
      },
      campaign: { _type: 'reference', _ref: campaign._id },
      funnel: { _type: 'reference', _ref: funnel._id },
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
    })
    const createdCalendar = await client.create(calendarPayload)
    rollbackIds.push(createdCalendar._id)
    createdCalendarItems.push(createdCalendar._id)

    const linkPayload = buildCreatePayload('marketingLinkItem', {
      title: opportunity.title,
      url: opportunity.destinationUrl,
      description: opportunity.sourceMaterial || `Research-backed link for ${title}.`,
      type: 'article',
      status: 'draft',
      featured: index === 0,
      order: baseLinkOrder + index,
      publishAt: publishDate,
      sourceChannel: opportunity.channel,
      campaign: { _type: 'reference', _ref: campaign._id },
      calendarItem: { _type: 'reference', _ref: createdCalendar._id },
      calendarItems: refsFromIds([createdCalendar._id]),
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    })
    const createdLink = await client.create(linkPayload)
    rollbackIds.push(createdLink._id)
    createdLinkItems.push(createdLink._id)

    // Patch the calendar item to reference its link (matches the tool).
    await client.patch(createdCalendar._id).set({ linkItems: refsFromIds([createdLink._id]) }).commit()
  }

  // Final patch: convert the project and append the generated refs.
  await client
    .patch(project._id)
    .set({
      status: 'converted',
      selectedResults: refsFromIds(selected.map((result) => result._id)),
      approvedResults: refsFromIds(selected.map((result) => result._id)),
      generatedCampaigns: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedCampaigns), [campaign._id]),
      ),
      generatedFunnels: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedFunnels), [funnel._id]),
      ),
      generatedCalendarItems: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedCalendarItems), createdCalendarItems),
      ),
      generatedLinkItems: refsFromIds(
        mergeIds(refIdsFromRecords(project.generatedLinkItems), createdLinkItems),
      ),
    })
    .commit()

  return {
    funnelId: funnel._id,
    campaignId: campaign._id,
    calendarItemIds: createdCalendarItems,
    linkItemIds: createdLinkItems,
    channelKeys: channels,
    projectId: project._id,
  }
  } catch (error) {
    await rollbackCreatedRecords(client, rollbackIds)
    throw error
  }
}

/**
 * Best-effort rollback for a partially-created cascade. Deletes every created
 * document in ONE transaction so the calendar↔link mutual references (each side
 * strong-references the other) can be removed together — Sanity rejects deleting
 * a doc that is still referenced unless its referrer is deleted in the same
 * transaction. Swallows cleanup errors; surfacing the original failure matters more.
 */
export async function rollbackCreatedRecords(client: SanityClient, ids: string[]): Promise<void> {
  if (!ids.length) return
  try {
    const tx = ids.reduce((transaction, id) => transaction.delete(id), client.transaction())
    await tx.commit({ visibility: 'async' })
  } catch {
    // Ignore cleanup errors.
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
