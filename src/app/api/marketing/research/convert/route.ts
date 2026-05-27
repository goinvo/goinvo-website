import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

type ConvertResearchRequest = {
  projectId?: string
  resultIds?: string[]
  forceNew?: boolean
}

type ResearchProjectForConversion = {
  _id: string
  title?: string
  brief?: string
  audience?: string
  campaignObjective?: string
  positioning?: string
  canonicalUrl?: string
  audienceProfileIds?: string[]
  messagePillarIds?: string[]
  proofPointIds?: string[]
  performanceSignalIds?: string[]
  generatedCampaignIds?: string[]
  generatedFunnelIds?: string[]
  generatedCalendarItemIds?: string[]
  generatedLinkItemIds?: string[]
}

type ResearchResultForConversion = {
  _id: string
  title?: string
  resultType?: string
  keyword?: string
  searchIntent?: string
  volume?: number
  difficulty?: number
  canonicalUrl?: string
  sourceUrl?: string
  sourceTitle?: string
  claim?: string
  contentGap?: string
  implication?: string
  provider?: string
}

type MarketingChannelRef = {
  _id: string
  key?: string
}

let sanityClient: SanityClient | null = null

function getSanityClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return sanityClient
}

export async function POST(request: NextRequest) {
  const sanityClient = getSanityClient()
  if (!sanityClient) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const input = (await request.json()) as ConvertResearchRequest
  const projectId = sanitizeId(input.projectId)
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 })
  }

  const project = await sanityClient.fetch<ResearchProjectForConversion | null>(
    `*[_id == $projectId && _type == "marketingResearchProject"][0]{
      _id,
      title,
      brief,
      audience,
      campaignObjective,
      positioning,
      canonicalUrl,
      "audienceProfileIds": audienceProfiles[]._ref,
      "messagePillarIds": messagePillars[]._ref,
      "proofPointIds": proofPoints[]._ref,
      "performanceSignalIds": performanceSignals[]._ref,
      "generatedCampaignIds": generatedCampaigns[]._ref,
      "generatedFunnelIds": generatedFunnels[]._ref,
      "generatedCalendarItemIds": generatedCalendarItems[]._ref,
      "generatedLinkItemIds": generatedLinkItems[]._ref
    }`,
    { projectId },
  )

  if (!project) {
    return NextResponse.json({ error: 'Research project not found.' }, { status: 404 })
  }

  const existing = {
    campaignIds: cleanIds(project.generatedCampaignIds),
    funnelIds: cleanIds(project.generatedFunnelIds),
    calendarItemIds: cleanIds(project.generatedCalendarItemIds),
    linkItemIds: cleanIds(project.generatedLinkItemIds),
  }

  if (!input.forceNew && (existing.campaignIds.length || existing.funnelIds.length || existing.calendarItemIds.length || existing.linkItemIds.length)) {
    return NextResponse.json({
      status: 'alreadyConverted',
      message: 'This research project already has generated records. Pass forceNew: true to create another set.',
      ...existing,
    })
  }

  const requestedResultIds = cleanIds(input.resultIds)
  const results = await sanityClient.fetch<ResearchResultForConversion[]>(
    `*[
      _type == "marketingResearchResult" &&
      project._ref == $projectId &&
      status == "approved" &&
      selectedForSynthesis == true &&
      (count($resultIds) == 0 || _id in $resultIds)
    ]|order(priority asc, _updatedAt desc) {
      _id,
      title,
      resultType,
      keyword,
      searchIntent,
      volume,
      difficulty,
      canonicalUrl,
      sourceUrl,
      sourceTitle,
      claim,
      contentGap,
      implication,
      provider
    }`,
    { projectId, resultIds: requestedResultIds },
  )

  if (results.length === 0) {
    return NextResponse.json(
      { error: 'No approved, selected research results were found for this project.' },
      { status: 400 },
    )
  }

  const today = new Date()
  const title = project.title || 'Research-backed marketing setup'
  const slug = slugify(title)
  const destinationUrl = project.canonicalUrl || results.find((result) => result.canonicalUrl)?.canonicalUrl || results.find((result) => result.sourceUrl)?.sourceUrl || 'https://www.goinvo.com/'
  const topicCluster = inferTopicCluster(title)
  const targetQueries = uniqueStrings(results.map((result) => result.keyword))
  const primaryKeyword = targetQueries[0] || topicCluster
  const searchIntent = results.find((result) => result.searchIntent)?.searchIntent || 'learn'
  const channels = ['instagram', 'linkedin', 'website']
  const channelIds = await ensureMarketingChannels(sanityClient, channels)
  const resultRefs = refsFromIds(results.map((result) => result._id))
  const strategyRefs = {
    audienceProfiles: refsFromIds(cleanIds(project.audienceProfileIds)),
    messagePillars: refsFromIds(cleanIds(project.messagePillarIds)),
    proofPoints: refsFromIds(cleanIds(project.proofPointIds)),
    performanceSignals: refsFromIds(cleanIds(project.performanceSignalIds)),
  }

  const funnel = await sanityClient.create({
    _type: 'marketingFunnel',
    title: `${title} research path`,
    status: 'draft',
    audience: project.audience || 'People who need this topic explained through useful GoInvo content.',
    conversionGoal: `Move from a research-backed content artifact to ${destinationUrl}.`,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    stages: [
      buildFunnelStage('awareness', 'Use a reviewed finding as the first visible hook.', primaryKeyword, 'Open the source', destinationUrl, ['Reach', 'Saves', 'Profile visits']),
      buildFunnelStage('interest', 'Show enough evidence for the audience to understand why the topic matters.', 'Reviewed research result', 'Read the source', destinationUrl, ['Engaged visits', 'Quick Link clicks']),
      buildFunnelStage('conversion', 'Invite the right people to contact GoInvo, reuse the work, or explore related work.', 'Canonical destination', 'Start a conversation', destinationUrl, ['CTA clicks', 'Contact starts', 'Qualified conversations']),
    ],
    audienceProfiles: strategyRefs.audienceProfiles,
    messagePillars: strategyRefs.messagePillars,
    proofPoints: strategyRefs.proofPoints,
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: buildResearchResultEvidenceSummary(project, results),
  })

  const campaign = await sanityClient.create({
    _type: 'marketingCampaign',
    title,
    slug: { _type: 'slug', current: slug },
    status: 'planned',
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(addDays(today, 21)),
    primaryGoal: project.brief || `Turn approved ${title} research into a small content runway.`,
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
    audienceProfiles: strategyRefs.audienceProfiles,
    messagePillars: strategyRefs.messagePillars,
    proofPoints: strategyRefs.proofPoints,
    performanceSignals: strategyRefs.performanceSignals,
    primaryKpi: 'Useful visits from reviewed research-backed content',
    utmCampaign: slug,
    successMetrics: [
      { _key: randomKey(), _type: 'successMetric', label: 'Useful visits', target: 'People reach the canonical destination from promoted links.' },
      { _key: randomKey(), _type: 'successMetric', label: 'Saved or shared content', target: 'The audience signals the finding was useful enough to keep or pass along.' },
    ],
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: 'Generated from approved Research findings. Edit before publishing if strategy changes.',
  })

  const opportunities = buildResearchResultOpportunities(project, results, destinationUrl)
  const nextOrder = await nextLinkOrder(sanityClient)
  const createdCalendarItems: string[] = []
  const createdLinkItems: string[] = []

  for (const [index, opportunity] of opportunities.entries()) {
    const publishDate = dateInputToIso(toDateInputValue(addDays(today, 7 + index * 4)))
    const channelId = channelIds[opportunity.channel] || channelIds.instagram
    const createdCalendar = await sanityClient.create({
      _type: 'marketingCalendarItem',
      title: opportunity.title,
      status: 'drafting',
      publishAt: publishDate,
      contentType: opportunity.format,
      channel: opportunity.channel,
      channelRef: referenceFromId(channelId),
      campaign: referenceFromId(campaign._id),
      funnel: referenceFromId(funnel._id),
      funnelStage: index === 0 ? 'awareness' : 'interest',
      workingUrl: opportunity.destinationUrl,
      brief: opportunity.notes,
      callToAction: opportunity.callToAction,
      utmCampaign: slug,
      topicCluster,
      searchIntent,
      targetQueries: uniqueStrings([opportunity.seoQuery, ...targetQueries]),
      audienceProfiles: strategyRefs.audienceProfiles,
      messagePillars: strategyRefs.messagePillars,
      proofPoints: strategyRefs.proofPoints,
      performanceSignals: strategyRefs.performanceSignals,
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    })
    createdCalendarItems.push(createdCalendar._id)

    const createdLink = await sanityClient.create({
      _type: 'marketingLinkItem',
      title: opportunity.title,
      url: opportunity.destinationUrl,
      description: opportunity.sourceMaterial || `Research-backed link for ${title}.`,
      type: 'article',
      status: 'draft',
      featured: index === 0,
      order: nextOrder + index,
      publishAt: publishDate,
      sourceChannel: opportunity.channel,
      campaign: referenceFromId(campaign._id),
      calendarItem: referenceFromId(createdCalendar._id),
      calendarItems: refsFromIds([createdCalendar._id]),
      audienceProfiles: strategyRefs.audienceProfiles,
      messagePillars: strategyRefs.messagePillars,
      proofPoints: strategyRefs.proofPoints,
      performanceSignals: strategyRefs.performanceSignals,
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    })
    createdLinkItems.push(createdLink._id)

    await sanityClient.patch(createdCalendar._id).set({ linkItems: refsFromIds([createdLink._id]) }).commit()
  }

  await sanityClient
    .patch(project._id)
    .set({
      status: 'converted',
      selectedResults: resultRefs,
      approvedResults: resultRefs,
      generatedCampaigns: refsFromIds([campaign._id]),
      generatedFunnels: refsFromIds([funnel._id]),
      generatedCalendarItems: refsFromIds(createdCalendarItems),
      generatedLinkItems: refsFromIds(createdLinkItems),
    })
    .commit()

  return NextResponse.json({
    status: 'converted',
    campaignIds: [campaign._id],
    funnelIds: [funnel._id],
    calendarItemIds: createdCalendarItems,
    linkItemIds: createdLinkItems,
    usedResultIds: results.map((result) => result._id),
  })
}

async function ensureMarketingChannels(client: SanityClient, channelKeys: string[]) {
  const existing = await client.fetch<MarketingChannelRef[]>(
    `*[_type == "marketingChannel" && key in $channelKeys]{_id, key}`,
    { channelKeys },
  )
  const ids: Record<string, string> = {}
  for (const channel of existing) {
    if (channel.key) ids[channel.key] = channel._id
  }

  for (const key of channelKeys) {
    if (ids[key]) continue
    const defaults = defaultChannelForKey(key)
    const created = await client.create({
      _type: 'marketingChannel',
      title: defaults.title,
      key,
      status: 'active',
      platform: defaults.platform,
      defaultFunnelStage: defaults.defaultFunnelStage,
      contentTypes: defaults.contentTypes.map((type) => ({ _key: randomKey(), _type: 'channelContentType', ...type })),
    })
    ids[key] = created._id
  }

  return ids
}

function buildResearchResultOpportunities(
  project: ResearchProjectForConversion,
  results: ResearchResultForConversion[],
  destinationUrl: string,
) {
  const seoResults = results.filter((result) => result.resultType === 'seoKeyword')
  const evidenceResults = results.filter((result) => result.resultType !== 'seoKeyword')
  const primary = seoResults[0] || results[0]
  const secondary = seoResults[1] || evidenceResults[0] || results[1]
  const baseTitle = project.title || primary?.keyword || primary?.title || 'Research-backed content'
  const opportunities = [
    {
      title: `${baseTitle} Instagram carousel`,
      channel: 'instagram',
      format: 'carousel',
      callToAction: 'See link in bio',
      destinationUrl,
      sourceMaterial: primary ? describeResearchResult(primary) : '',
      seoQuery: primary?.keyword || '',
      notes: buildGeneratedCalendarBrief(project, [primary].filter(Boolean) as ResearchResultForConversion[]),
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

function buildGeneratedCalendarBrief(project: ResearchProjectForConversion, results: ResearchResultForConversion[]) {
  return [
    `Research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    project.audience ? `Audience: ${project.audience}` : '',
    ...results.map((result) => `Approved result: ${describeResearchResult(result)}`),
    'Designer task: make the content from the approved finding without inventing scores or unsupported claims.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildResearchResultEvidenceSummary(project: ResearchProjectForConversion, results: ResearchResultForConversion[]) {
  return [
    `Generated from research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    'Approved findings:',
    ...results.map((result) => `- ${describeResearchResult(result)}`),
  ]
    .filter(Boolean)
    .join('\n')
}

function describeResearchResult(result: ResearchResultForConversion) {
  const score = result.resultType === 'seoKeyword'
    ? [
        result.keyword || result.title,
        typeof result.volume === 'number' ? `volume ${result.volume}` : '',
        typeof result.difficulty === 'number' ? `difficulty ${result.difficulty}` : '',
      ].filter(Boolean).join(', ')
    : ''
  return [
    result.title || result.keyword || 'Research result',
    score ? `(${score})` : '',
    result.claim || result.implication || result.contentGap || '',
    result.sourceUrl || result.canonicalUrl || '',
  ]
    .filter(Boolean)
    .join(' - ')
}

function buildFunnelStage(stage: string, goal: string, offer: string, callToAction: string, destinationUrl: string, metrics: string[]) {
  return {
    _key: randomKey(),
    _type: 'funnelStage',
    stage,
    goal,
    offer,
    callToAction,
    destinationUrl,
    metrics,
  }
}

async function nextLinkOrder(client: SanityClient) {
  const highest = await client.fetch<number | null>(`coalesce(*[_type == "marketingLinkItem" && defined(order)]|order(order desc)[0].order, 0)`)
  return typeof highest === 'number' && Number.isFinite(highest) ? highest + 10 : 10
}

function defaultChannelForKey(key: string) {
  const defaults: Record<string, {
    title: string
    platform: string
    defaultFunnelStage: string
    contentTypes: Array<{ label: string; value: string; description?: string }>
  }> = {
    instagram: {
      title: 'Instagram',
      platform: 'social',
      defaultFunnelStage: 'awareness',
      contentTypes: [
        { label: 'Post', value: 'post' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Reel', value: 'reel' },
        { label: 'Story', value: 'story' },
      ],
    },
    linkedin: {
      title: 'LinkedIn',
      platform: 'social',
      defaultFunnelStage: 'interest',
      contentTypes: [
        { label: 'Text Post', value: 'textPost' },
        { label: 'Link Post', value: 'linkPost' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Video', value: 'video' },
      ],
    },
    website: {
      title: 'Website',
      platform: 'website',
      defaultFunnelStage: 'conversion',
      contentTypes: [
        { label: 'Article', value: 'article' },
        { label: 'Case Study', value: 'caseStudy' },
        { label: 'Landing Page', value: 'landingPage' },
      ],
    },
  }

  return defaults[key] || {
    title: titleCase(key),
    platform: 'other',
    defaultFunnelStage: 'awareness',
    contentTypes: [{ label: 'Post', value: 'post' }],
  }
}

function sanitizeId(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : ''
}

function cleanIds(values: unknown) {
  return Array.isArray(values)
    ? values
        .map((value) => (typeof value === 'string' && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : ''))
        .filter(Boolean)
    : []
}

function referenceFromId(id: string) {
  return { _type: 'reference', _ref: id }
}

function refsFromIds(ids: string[]) {
  return ids.map((id) => referenceFromId(id))
}

function randomKey() {
  return Math.random().toString(36).slice(2, 12)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString()
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'marketing-campaign'
}

function inferTopicCluster(value: string) {
  return value
    .replace(/\bresearch\b/gi, '')
    .replace(/\bproject\b/gi, '')
    .replace(/\bplan\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'marketing research'
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
