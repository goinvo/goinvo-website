import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { schemaTypes } from '@/sanity/schemas'
import analyticsSchema from '@/sanity/schemas/marketingAnalyticsSource'
import audienceProfileSchema from '@/sanity/schemas/marketingAudienceProfile'
import calendarSchema, { calendarStatusOptions } from '@/sanity/schemas/marketingCalendarItem'
import campaignSchema from '@/sanity/schemas/marketingCampaign'
import channelSchema, { defaultMarketingChannels } from '@/sanity/schemas/marketingChannel'
import ctaSchema from '@/sanity/schemas/marketingCta'
import experimentSchema, { experimentVariantFields } from '@/sanity/schemas/marketingExperiment'
import funnelSchema from '@/sanity/schemas/marketingFunnel'
import linkItemSchema from '@/sanity/schemas/marketingLinkItem'
import messagePillarSchema from '@/sanity/schemas/marketingMessagePillar'
import performanceSignalSchema from '@/sanity/schemas/marketingPerformanceSignal'
import proofPointSchema from '@/sanity/schemas/marketingProofPoint'
import qualityGateSchema from '@/sanity/schemas/marketingQualityGate'
import researchPlanSchema from '@/sanity/schemas/marketingResearchPlan'
import researchProjectSchema from '@/sanity/schemas/marketingResearchProject'
import researchResultSchema from '@/sanity/schemas/marketingResearchResult'
import researchRunSchema from '@/sanity/schemas/marketingResearchRun'
import templateSchema from '@/sanity/schemas/marketingTemplate'
import trackingRuleSchema from '@/sanity/schemas/marketingTrackingRule'
import { designerWorkflowTutorials, defaultDesignerWorkflowTutorial } from '@/sanity/tutorials/designerWorkflowTutorials'
import {
  MARKETING_TOOL_VIEWS,
  PRIMARY_MARKETING_VIEW_IDS,
  applyAutopilotCompletion,
  buildAbTestingInsights,
  buildAnalyticsInterpretations,
  buildInspirationResearchResultDocument,
  buildProofPointFromResearchResult,
  buildMarketingAssistantActions,
  buildMarketingAutopilotPlan,
  filterMarketingAssistantActions,
  getAbTestingStats,
  getCurrentAutopilotStep,
  getMarketingAutofillQuestions,
  getStrategyFillQuestions,
  marketingTool,
} from '@/sanity/tools/marketingTool'

function fieldNames(schema: { fields?: Array<{ name?: string }> }) {
  return (schema.fields || []).map((field) => field.name)
}

type SchemaWithFields = {
  fields?: Array<{
    name?: string
    hidden?: unknown
  }>
}

function getField(schema: SchemaWithFields, name: string) {
  const field = schema.fields?.find((candidate) => candidate.name === name)
  expect(field, `Expected field "${name}" to exist`).toBeDefined()
  return field as {
    name: string
    hidden?: unknown
  }
}

function runHidden(field: { hidden?: unknown }, provider: string) {
  if (typeof field.hidden !== 'function') return field.hidden
  return field.hidden({ document: { provider } })
}

function runHiddenWithDocument(field: { hidden?: unknown }, document: Record<string, unknown>) {
  if (typeof field.hidden !== 'function') return field.hidden
  return field.hidden({ document })
}

type MarketingDataInput = Parameters<typeof buildMarketingAutopilotPlan>[0]
type MarketingQuestionnaireInput = Parameters<typeof buildMarketingAutopilotPlan>[2]

function emptyMarketingData(overrides: Partial<MarketingDataInput> = {}): MarketingDataInput {
  return {
    calendarItems: [],
    campaigns: [],
    funnels: [],
    analyticsSources: [],
    audienceProfiles: [],
    messagePillars: [],
    proofPoints: [],
    ctas: [],
    trackingRules: [],
    qualityGates: [],
    experiments: [],
    performanceSignals: [],
    channels: [],
    linkItems: [],
    researchProjects: [],
    researchResults: [],
    researchRuns: [],
    researchPlans: [],
    templates: [],
    ...overrides,
  }
}

const defaultAutopilotQuestionnaire = {
  topic: 'Housing Truths Instagram carousel',
  objective: 'awareness',
  audience: 'Designers and civic health teams',
  destinationUrl: 'https://housingtruths.org',
  runway: 'twoWeeks',
  contentCapacity: 'multiChannel',
  primaryMetric: 'Useful visits',
  notes: 'Plan an Instagram carousel with a public source link.',
} satisfies MarketingQuestionnaireInput

describe('Marketing CMS schemas', () => {
  it('exposes marketing as a custom Studio tool, not another content structure list', () => {
    expect(marketingTool.name).toBe('marketing')
    expect(marketingTool.title).toBe('Marketing')
    expect(MARKETING_TOOL_VIEWS.map((view) => view.id)).toEqual([
      'dashboard',
      'attention',
      'research',
      'seo',
      'strategy',
      'strategyBrief',
      'abTesting',
      'calendar',
      'campaigns',
      'funnels',
      'templates',
      'channels',
      'analytics',
      'linkTree',
    ])
    expect(PRIMARY_MARKETING_VIEW_IDS).toEqual([
      'dashboard',
      'research',
      'seo',
      'strategy',
      'strategyBrief',
      'abTesting',
      'calendar',
      'channels',
      'linkTree',
    ])
  })

  it('keeps custom marketing tool actions discoverable and wired to visible feedback', () => {
    const source = readFileSync(new URL('../src/sanity/tools/marketingTool.tsx', import.meta.url), 'utf8')
    expect(source.length, 'Expected marketing tool source to be available for the action audit').toBeGreaterThan(1000)

    const anchorTags = [...source.matchAll(/<a\b[\s\S]*?>/g)].map((match) => match[0])
    expect(anchorTags.length, 'Expected the marketing tool to expose links worth auditing').toBeGreaterThan(0)
    expect(anchorTags.filter((tag) => !tag.includes('href='))).toEqual([])

    const buttonTags = [...source.matchAll(/<button\b[\s\S]*?>/g)].map((match) => match[0])
    expect(buttonTags.length, 'Expected the marketing tool to expose buttons worth auditing').toBeGreaterThan(0)
    expect(buttonTags.filter((tag) => !tag.includes('type='))).toEqual([])

    expect(source).toContain('aria-label="Open more marketing sections and actions"')
    expect(source).toContain('More')
    expect(source).toContain("requestMarketingView('campaigns')")
    expect(source).toContain("requestMarketingView('funnels')")
    expect(source).toContain("requestMarketingView('analytics')")
    expect(source).toContain("requestMarketingView('templates')")
    expect(source).toContain('MARKETING_UNSAVED_CHANGES_MESSAGE')
    expect(source).toContain("window.addEventListener('beforeunload'")
    expect(source).toContain('window.confirm')
    expect(source).toContain('onClickCapture={handleMarketingLinkCapture}')
    expect(source).toContain('Unsaved edits')
    expect(source).toContain('Regenerating will replace the current research setup draft. Continue?')
    expect(source).toContain('Filling from research can replace fields in the current unsaved answer. Continue?')
    expect(source).toContain('Compact readouts for live page tests.')
    expect(source).toContain('AbTestingSummaryChip')
    expect(source).toContain('AbTestingDashboardCard')
    expect(source).toContain('data-ab-dashboard-card="true"')
    expect(source).toContain('AbTestingComparisonRows')
    expect(source).toContain('Vercel Analytics readout')
    expect(source).toContain('Open Vercel dashboard')
    expect(source).toContain('New homepage and Vision article test creation flows are coming soon.')
    expect(source).toContain('How this test is going')
    expect(source).toContain('Suggested improvements')
    expect(source).toContain('Visits and events')
    expect(source).toContain('Fix result evidence')
    expect(source).toContain('Measurement blocked')
    expect(source).toContain('Variant visits and event counts captured')
    expect(source).toContain('variant key | event name')
    expect(source).toContain('Open setup')
    expect(source).toContain('Back to A/B tests')
    expect(source).toContain('Result comparison')
    expect(source).toContain('AbTestingLeaderSummary')
    expect(source).toContain('Which page is performing better?')
    expect(source).toContain('Better page')
    expect(source).toContain('Metric wins')
    expect(source).not.toContain('Setup is tucked away')
    expect(source).toContain('Finish setup before launch')
    expect(source).toContain('Write the result and decision')
    expect(source).toContain('aria-label="A/B test editor sections"')
    expect(source).toContain('AbTestingEditorTabButton')
    expect(source).toContain('Bet, page, versions, metrics')
    expect(source).toContain('Checklist, source, rollout')
    expect(source).toContain('Evidence, readout, decision')
    expect(source).toContain('Forced preview links')
    expect(source).toContain('Copy forced link')
    expect(source).toContain('custom preview link')

    expect(source).toContain("role={error ? 'alert' : 'status'}")
    expect(source).toContain('Saved changes.')
    expect(source).toContain('Created a new marketing record.')
    expect(source).toContain('Marketing data refreshed.')

    expect(source).toContain('Create reusable message')
    expect(source).not.toContain('Add message answer')
    expect(source).toContain('Answer setup questions')
    expect(source).toContain('Build campaign plans')
    expect(source).toContain('Map funnel paths')
    expect(source).toContain('Turn the saved answers into campaign briefs and launch plans.')
    expect(source).toContain('Browse all actions')
    expect(source).toContain('Saved sessions')
    expect(source).toContain('Open tutorial guide')
    expect(source).toContain('Fill current draft')
    expect(source).toContain('Reopen project')
    expect(source).toContain('Reopen plan')
    expect(source).toContain('Previous month')
    expect(source).toContain('Next month')
    expect(source).toContain('Add calendar item')
    expect(source).toContain('Create quick link')
    expect(source).toContain('Add analytics source')
    expect(source).toContain('Open full Sanity document')
    expect(source).toContain('Switch to chat mode')
    expect(source).toContain('Chat with Autopilot')
    expect(source).toContain('Highlight current step')
    expect(source).toContain('Ask Marketing Autopilot')
    expect(source).toContain('Start chat')
    expect(source).toContain("autopilotPlan: activeSession?.autopilotPlan || null")
    expect(source).toContain('data-tour-id={`autopilot-coach-choice-${step.id}-${choiceIndex}`}')
    expect(source).toContain('onClick={() => onChoice(step, choice, choiceIndex)}')
    expect(source).toContain('aria-label="Strategy workspace sections"')
    expect(source).not.toContain('Apply to draft')
    expect(source).not.toContain('Change request')
    expect(source).not.toContain('Continue setup')
  })

  it('offers guided autofill choices before open-ended prompting', () => {
    expect(getMarketingAutofillQuestions('campaign').map((question) => question.id)).toEqual(['source', 'goal', 'scope'])
    expect(getMarketingAutofillQuestions('calendarItem').map((question) => question.id)).toEqual(['source', 'format', 'scope'])
    expect(getMarketingAutofillQuestions('analyticsSource').map((question) => question.id)).toEqual(['source', 'measurement', 'scope'])
    expect(getMarketingAutofillQuestions('experiment').map((question) => question.id)).toEqual(['source', 'target', 'measurement', 'scope'])
    expect(getStrategyFillQuestions('ctas').map((question) => question.id)).toEqual(['source', 'intent'])
    expect(getStrategyFillQuestions('messages').map((question) => question.id)).toEqual(['source', 'use'])
  })

  it('registers marketing document types and chat threads in the shared schema registry', () => {
    const typeNames = schemaTypes.map((schema) => schema.name)

    expect(typeNames).toContain('chatThread')
    expect(typeNames).toContain('marketingCampaign')
    expect(typeNames).toContain('marketingChannel')
    expect(typeNames).toContain('marketingCalendarItem')
    expect(typeNames).toContain('marketingFunnel')
    expect(typeNames).toContain('marketingAnalyticsSource')
    expect(typeNames).toContain('marketingLinkItem')
    expect(typeNames).toContain('marketingAudienceProfile')
    expect(typeNames).toContain('marketingMessagePillar')
    expect(typeNames).toContain('marketingProofPoint')
    expect(typeNames).toContain('marketingCta')
    expect(typeNames).toContain('marketingTrackingRule')
    expect(typeNames).toContain('marketingQualityGate')
    expect(typeNames).toContain('marketingExperiment')
    expect(typeNames).toContain('marketingPerformanceSignal')
    expect(typeNames).toContain('marketingResearchPlan')
    expect(typeNames).toContain('marketingResearchProject')
    expect(typeNames).toContain('marketingResearchResult')
    expect(typeNames).toContain('marketingResearchRun')
    expect(typeNames).toContain('marketingTemplate')
  })

  it('models research-first projects, stored results, and provider runs', () => {
    expect(fieldNames(researchProjectSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'researchType',
        'brief',
        'audience',
        'audienceProfiles',
        'goals',
        'seedKeywords',
        'seedUrls',
        'targetGeography',
        'language',
        'methods',
        'researchQuestions',
        'collaborators',
        'messagePillars',
        'proofPoints',
        'performanceSignals',
        'selectedResults',
        'approvedResults',
        'generatedCampaigns',
        'generatedFunnels',
        'generatedCalendarItems',
        'generatedLinkItems',
        'legacyPlan',
      ]),
    )

    expect(fieldNames(researchResultSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'resultType',
        'status',
        'project',
        'run',
        'selectedForSynthesis',
        'proofPoints',
        'performanceSignals',
        'provider',
        'sourceMethod',
        'scoreSource',
        'database',
        'fetchedAt',
        'rawProviderMetadata',
        'keyword',
        'volume',
        'difficulty',
        'cpc',
        'competition',
        'resultsCount',
        'contentGap',
        'collaboratorName',
        'organization',
        'capacity',
      ]),
    )

    expect(fieldNames(researchRunSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'project',
        'provider',
        'status',
        'startedAt',
        'completedAt',
        'methods',
        'seedKeywords',
        'seedUrls',
        'database',
        'createdResults',
        'warnings',
        'errors',
      ]),
    )
  })

  it('captures inspiration as a reviewable research item instead of a plan shortcut', () => {
    const result = buildInspirationResearchResultDocument(
      { _id: 'project-1', title: 'Boston housing research' },
      {
        sourceKind: 'article',
        action: 'respond',
        title: 'Boston housing statistics article',
        url: 'example.org/boston-housing',
        note: 'Make a carousel explaining what the statistic means and where to learn more.',
      },
    )

    expect(result).toMatchObject({
      _type: 'marketingResearchResult',
      title: 'Boston housing statistics article',
      resultType: 'sourceEvidence',
      status: 'needsReview',
      project: { _type: 'reference', _ref: 'project-1' },
      selectedForSynthesis: false,
      provider: 'manual',
      sourceMethod: 'manualInspiration',
      scoreSource: 'none',
      sourceUrl: 'https://example.org/boston-housing',
      confidence: 'needsValidation',
      contentGap: 'Decide whether this is worth a response, explainer, or point-of-view content item.',
    })
    expect(String(result.rawProviderMetadata)).toContain('marketingResearchInspirationInbox')

    const example = buildInspirationResearchResultDocument(
      { _id: 'project-1', title: 'Boston housing research' },
      {
        sourceKind: 'competitor',
        action: 'model',
        title: 'Peer carousel format',
        url: 'https://example.org/peer-carousel',
        note: '',
      },
    )

    expect(example).toMatchObject({
      resultType: 'competitorExample',
      evidenceType: 'competitorExample',
      competitorUrl: 'https://example.org/peer-carousel',
    })
  })

  it('turns reviewed inspiration into a linked proof draft', () => {
    const result = buildInspirationResearchResultDocument(
      { _id: 'project-1', title: 'Boston housing research' },
      {
        sourceKind: 'article',
        action: 'evidence',
        title: 'Boston housing statistics article',
        url: 'https://example.org/boston-housing',
        note: 'This source may support a carousel about rent pressure in Boston.',
      },
    ) as unknown as Parameters<typeof buildProofPointFromResearchResult>[0]
    result._id = 'result-1'
    result.status = 'approved'

    const proof = buildProofPointFromResearchResult(result, { _id: 'project-1', title: 'Boston housing research' })

    expect(proof).toMatchObject({
      _type: 'marketingProofPoint',
      title: 'Boston housing statistics article proof',
      claim: 'This source may support a carousel about rent pressure in Boston.',
      proofType: 'researchFinding',
      sourceTitle: 'Boston housing statistics article',
      sourceUrl: 'https://example.org/boston-housing',
      confidence: 'needsValidation',
      researchResults: [{ _type: 'reference', _ref: 'result-1' }],
    })
    expect(String(proof.usageNotes)).toContain('captured inspiration')
  })

  it('models adaptive marketing research plans for release planning', () => {
    expect(fieldNames(researchPlanSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'summary',
        'audience',
        'positioning',
        'researchQuestions',
        'evidenceNotes',
        'assumptions',
        'seoTargets',
        'contentPillars',
        'channels',
        'collaborations',
        'releaseWindows',
        'contentOpportunities',
        'measurementGoals',
        'strategyAdjustments',
        'generatedCampaigns',
        'generatedFunnels',
        'generatedCalendarItems',
        'generatedLinkItems',
      ]),
    )
  })

  it('models the reusable strategy foundation for designers', () => {
    expect(fieldNames(audienceProfileSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'priority',
        'audience',
        'needs',
        'pains',
        'misconceptions',
        'trustTriggers',
        'desiredActions',
        'objections',
      ]),
    )
    expect(fieldNames(messagePillarSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'coreClaim',
        'supportingClaims',
        'approvedPhrases',
        'phrasesToAvoid',
        'topicCluster',
        'audiences',
        'proofPoints',
      ]),
    )
    expect(fieldNames(proofPointSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'claim',
        'proofType',
        'sourceTitle',
        'sourceUrl',
        'confidence',
        'researchResults',
        'audiences',
        'topicCluster',
      ]),
    )
    expect(fieldNames(ctaSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'label',
        'funnelStage',
        'destination',
        'successSignal',
        'audiences',
        'priority',
      ]),
    )
    expect(fieldNames(trackingRuleSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'utmSourceRule',
        'utmMediumRule',
        'utmCampaignPattern',
        'utmContentPattern',
        'allowedSources',
        'allowedMediums',
        'examples',
      ]),
    )
    expect(fieldNames(qualityGateSchema)).toEqual(
      expect.arrayContaining(['title', 'status', 'whenToUse', 'checks', 'notes']),
    )
    expect(experimentSchema.groups?.map((group) => group.name)).toEqual([
      'hypothesis',
      'pageTest',
      'result',
      'relationships',
    ])
    expect(fieldNames(experimentSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'hypothesis',
        'expectedSignal',
        'targetType',
        'targetPath',
        'targetFeature',
        'flagKey',
        'variants',
        'primaryMetric',
        'analyticsSource',
        'qaNotes',
        'rolloutStart',
        'rolloutEnd',
        'vercelDashboardUrl',
        'campaign',
        'calendarItem',
        'performanceSignals',
        'result',
        'decision',
      ]),
    )
    expect(fieldNames({ fields: experimentVariantFields })).toEqual(
      expect.arrayContaining(['key', 'label', 'notes', 'previewUrl']),
    )
    expect(fieldNames(performanceSignalSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'provider',
        'status',
        'signalType',
        'query',
        'pageUrl',
        'campaign',
        'channel',
        'linkItem',
        'calendarItem',
        'researchProject',
        'metrics',
        'interpretation',
        'recommendation',
      ]),
    )
    const performanceMetricsField = performanceSignalSchema.fields?.find((field) => field.name === 'metrics') as { of?: Array<{ fields?: Array<{ name?: string }> }> } | undefined
    expect(fieldNames(performanceMetricsField?.of?.[0] || {})).toEqual(
      expect.arrayContaining(['label', 'variantKey', 'eventName', 'value', 'unit', 'change']),
    )
  })

  it('models campaigns around strategy, planning, and measurement', () => {
    expect(campaignSchema.groups?.map((group) => group.name)).toEqual([
      'strategy',
      'planning',
      'measurement',
    ])

    expect(fieldNames(campaignSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'slug',
        'status',
        'owner',
        'primaryGoal',
        'campaignObjective',
        'audience',
        'audienceProfiles',
        'topicCluster',
        'searchIntent',
        'targetQueries',
        'messagePillars',
        'proofPoints',
        'ctas',
        'canonicalUrl',
        'targetSites',
        'channels',
        'channelRefs',
        'funnels',
        'primaryKpi',
        'utmCampaign',
        'trackingRule',
        'successMetrics',
        'analyticsSources',
        'qualityGates',
        'experiments',
        'performanceSignals',
        'researchProject',
        'researchResults',
      ]),
    )
  })

  it('models calendar items as cross-site planned content linked to campaigns and funnels', () => {
    expect(calendarSchema.groups?.map((group) => group.name)).toEqual([
      'planning',
      'content',
      'measurement',
    ])

    expect(fieldNames(calendarSchema)).toEqual(
      expect.arrayContaining([
        'publishAt',
        'contentType',
        'channel',
        'channelRef',
        'campaign',
        'funnel',
        'funnelStage',
        'topicCluster',
        'searchIntent',
        'targetQueries',
        'targetSites',
        'canonicalContent',
        'linkItems',
        'contentDraft',
        'draftFrames',
        'draftAltText',
        'draftHashtags',
        'contentProductionNotes',
        'utmCampaign',
        'analyticsSource',
        'researchProject',
        'researchResults',
        'audienceProfiles',
        'messagePillars',
        'proofPoints',
        'ctas',
        'trackingRule',
        'qualityGates',
        'experiments',
        'performanceSignals',
      ]),
    )

    expect(calendarStatusOptions.find((option) => option.value === 'drafting')?.title).toBe('Draft')
    expect(calendarStatusOptions.map((option) => option.value)).not.toContain('preview')
  })

  it('models managed channels with channel-specific content types including Instagram carousel support', () => {
    expect(fieldNames(channelSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'key',
        'status',
        'platform',
        'defaultFunnelStage',
        'analyticsSources',
        'contentTypes',
      ]),
    )

    const instagram = defaultMarketingChannels.find((channel) => channel.key === 'instagram')
    expect(instagram?.contentTypes.map((type) => type.value)).toEqual(
      expect.arrayContaining(['post', 'carousel', 'reel', 'story']),
    )
  })

  it('models reusable funnels with stages and analytics sources', () => {
    expect(fieldNames(funnelSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'audience',
        'audienceProfiles',
        'conversionGoal',
        'targetSites',
        'messagePillars',
        'proofPoints',
        'ctas',
        'stages',
        'analyticsSources',
        'qualityGates',
        'experiments',
        'researchProject',
        'researchResults',
      ]),
    )
  })

  it('models reusable marketing templates for campaign and funnel setup', () => {
    expect(templateSchema.groups?.map((group) => group.name)).toEqual([
      'overview',
      'campaign',
      'funnel',
    ])

    expect(fieldNames(templateSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'kind',
        'status',
        'description',
        'whenToUse',
        'order',
        'campaignObjective',
        'primaryGoal',
        'primaryKpi',
        'audience',
        'audienceProfiles',
        'topicCluster',
        'searchIntent',
        'targetQueries',
        'messagePillars',
        'proofPoints',
        'ctas',
        'trackingRule',
        'qualityGates',
        'channels',
        'successMetrics',
        'designerGuidance',
        'conversionGoal',
        'stages',
      ]),
    )

    expect(runHiddenWithDocument(getField(templateSchema, 'campaignObjective'), { kind: 'campaign' })).toBe(false)
    expect(runHiddenWithDocument(getField(templateSchema, 'campaignObjective'), { kind: 'funnel' })).toBe(true)
    expect(runHiddenWithDocument(getField(templateSchema, 'stages'), { kind: 'funnel' })).toBe(false)
    expect(runHiddenWithDocument(getField(templateSchema, 'stages'), { kind: 'campaign' })).toBe(true)
  })

  it('stores analytics connection metadata without exposing irrelevant provider fields', () => {
    expect(fieldNames(analyticsSchema)).toEqual(
      expect.arrayContaining([
        'provider',
        'status',
        'propertyId',
        'measurementId',
        'containerId',
        'vercelProject',
        'vercelProjectId',
        'vercelTeamSlug',
        'productionUrl',
        'lastSyncedAt',
        'dashboardUrl',
        'targetSites',
        'keyMetrics',
      ]),
    )

    expect(runHidden(getField(analyticsSchema, 'propertyId'), 'ga4')).toBe(false)
    expect(runHidden(getField(analyticsSchema, 'propertyId'), 'gtm')).toBe(true)
    expect(runHidden(getField(analyticsSchema, 'containerId'), 'gtm')).toBe(false)
    expect(runHidden(getField(analyticsSchema, 'vercelProject'), 'vercelAnalytics')).toBe(false)
    expect(runHidden(getField(analyticsSchema, 'vercelProject'), 'ga4')).toBe(true)
  })

  it('models link-in-bio items for the public social links page', () => {
    expect(fieldNames(linkItemSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'url',
        'description',
        'type',
        'image',
        'status',
        'featured',
        'order',
        'publishAt',
        'expiresAt',
        'sourceChannel',
        'campaign',
        'calendarItem',
        'calendarItems',
        'researchProject',
        'researchResults',
        'audienceProfiles',
        'messagePillars',
        'proofPoints',
        'cta',
        'trackingRule',
        'qualityGates',
        'experiments',
        'performanceSignals',
      ]),
    )
  })

  it('defines non-mutating Designer Workflow guided tutorials with stable anchors', () => {
    expect(defaultDesignerWorkflowTutorial.id).toBe('marketing-view-tour')
    expect(defaultDesignerWorkflowTutorial.title).toBe('Marketing view tour')
    expect(designerWorkflowTutorials.map((tutorial) => tutorial.id)).toEqual(
      expect.arrayContaining(['marketing-view-tour', 'designer-workflow-recommendation', 'designer-workflow-sessions']),
    )
    expect(defaultDesignerWorkflowTutorial.steps.map((step) => step.targetId)).toEqual(
      expect.arrayContaining([
        'designer-workflow-toggle',
        'designer-workflow-panel',
        'designer-workflow-sessions-button',
        'designer-workflow-path-plan',
      ]),
    )
    expect(defaultDesignerWorkflowTutorial.steps.map((step) => step.targetId)).not.toEqual(
      expect.arrayContaining([
        'designer-workflow-suggest-button',
        'designer-workflow-create-suggested-setup',
        'designer-workflow-recommendation-steps',
      ]),
    )
    expect(defaultDesignerWorkflowTutorial.steps.map((step) => step.id)).not.toContain('create-suggested-setup')

    const recommendationTutorial = designerWorkflowTutorials.find((tutorial) => tutorial.id === 'designer-workflow-recommendation')
    expect(recommendationTutorial?.steps.map((step) => step.targetId)).toEqual(
      expect.arrayContaining([
        'designer-workflow-recommendation-steps',
        'designer-workflow-open-next-step',
      ]),
    )
    expect(recommendationTutorial?.steps.map((step) => step.targetId)).not.toContain('designer-workflow-manual-setup')
  })

  it('builds a searchable assistant action catalog with multiple recommendations', () => {
    const actions = buildMarketingAssistantActions(emptyMarketingData())

    expect(actions.length).toBeGreaterThan(8)
    expect(actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'ask-strategist',
        'suggest-next-step',
        'set-up-ab-test',
        'find-evidence',
        'fill-strategy',
        'plan-calendar',
        'set-up-analytics',
        'create-quick-link',
      ]),
    )
    expect(actions.filter((action) => action.recommended).length).toBeGreaterThan(4)
    expect(actions[0].recommended).toBe(true)
  })

  it('filters assistant actions by title, tags, section, and recommendation reason', () => {
    const actions = buildMarketingAssistantActions(emptyMarketingData())

    expect(filterMarketingAssistantActions(actions, 'ab test').map((action) => action.id)).toContain('set-up-ab-test')
    expect(filterMarketingAssistantActions(actions, 'analytics').map((action) => action.id)).toContain('set-up-analytics')
    expect(filterMarketingAssistantActions(actions, 'homepage flags').map((action) => action.id)[0]).toBe('set-up-ab-test')
    expect(filterMarketingAssistantActions(actions, 'zzzz nope')).toEqual([])
  })

  it('uses semantic and fuzzy matching for assistant action search', () => {
    const actions = buildMarketingAssistantActions(emptyMarketingData())

    expect(filterMarketingAssistantActions(actions, 'split traffic').map((action) => action.id)[0]).toBe('set-up-ab-test')
    expect(filterMarketingAssistantActions(actions, 'mesurement readout').map((action) => action.id)).toContain('set-up-analytics')
    expect(filterMarketingAssistantActions(actions, 'prove claims').map((action) => action.id)).toContain('find-evidence')
    expect(filterMarketingAssistantActions(actions, 'ig destination').map((action) => action.id)).toContain('create-quick-link')
  })

  it('prioritizes a saved setup session before suggesting new assistant work', () => {
    const data = emptyMarketingData()
    const plan = buildMarketingAutopilotPlan(data, null, defaultAutopilotQuestionnaire)
    const actions = buildMarketingAssistantActions(data, {
      id: 'session-1',
      title: 'Housing Truths setup',
      autopilotPlan: plan,
    })

    expect(actions[0]).toMatchObject({
      id: 'continue-current-setup',
      recommended: true,
    })
    expect(actions[0].reason).toContain('Next decision:')
  })

  it('builds a research-first autopilot itinerary for an empty marketing state', () => {
    const plan = buildMarketingAutopilotPlan(emptyMarketingData(), null, defaultAutopilotQuestionnaire)
    const current = getCurrentAutopilotStep(plan)

    expect(plan.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        'research-project',
        'research-run',
        'research-approve',
        'research-generate',
        'strategy-audiences',
        'strategy-messages',
        'strategy-proof',
        'strategy-ctas',
        'strategy-tracking',
        'strategy-quality',
        'calendar-draft',
      ]),
    )
    expect(current).toMatchObject({
      id: 'research-project',
      status: 'current',
      view: 'research',
      targetId: 'autopilot-research-add-project',
    })
    expect(plan.steps.find((step) => step.id === 'quick-link')).toBeDefined()
  })

  it('moves the autopilot current step through completion events without resetting the session path', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [{ _id: 'project-1', title: 'Housing Truths research', status: 'draft' }],
      }),
      null,
      defaultAutopilotQuestionnaire,
    )

    expect(getCurrentAutopilotStep(plan)).toMatchObject({ id: 'research-run', recordId: 'project-1' })

    const afterRun = applyAutopilotCompletion(plan, { action: 'research:run', recordId: 'run-1' })
    expect(getCurrentAutopilotStep(afterRun)).toMatchObject({ id: 'research-approve' })

    const afterApprove = applyAutopilotCompletion(afterRun, { action: 'research:approve', recordId: 'result-1' })
    expect(getCurrentAutopilotStep(afterApprove)).toMatchObject({ id: 'research-generate' })
    expect(afterApprove.steps.find((step) => step.id === 'research-run')).toMatchObject({
      status: 'done',
      completedRefId: 'run-1',
    })
  })

  it('keeps Autopilot on research until a run has actual findings to review', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [{ _id: 'project-1', title: 'Housing Truths research', status: 'active' }],
        researchRuns: [
          {
            _id: 'run-1',
            title: 'Empty Semrush run',
            status: 'complete',
            project: { _id: 'project-1', title: 'Housing Truths research' },
            createdResults: [],
          },
        ],
      }),
      null,
      defaultAutopilotQuestionnaire,
    )

    expect(getCurrentAutopilotStep(plan)).toMatchObject({
      id: 'research-run',
      targetId: 'autopilot-research-run-panel',
      recordId: 'project-1',
    })
    expect(plan.steps.find((step) => step.id === 'research-approve')).toMatchObject({ status: 'upcoming' })
  })

  it('uses project-referenced selected findings even when result back-references are missing', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [
          {
            _id: 'project-1',
            title: 'Housing Truths Instagram research project',
            status: 'active',
            selectedResults: [{ _id: 'result-1', title: 'Housing Truths SEO keyword' }],
          },
        ],
        researchResults: [
          {
            _id: 'result-1',
            title: 'Housing Truths SEO keyword',
            resultType: 'seoKeyword',
            status: 'approved',
            keyword: 'housing truths',
          },
        ],
      }),
      null,
      defaultAutopilotQuestionnaire,
    )

    expect(plan.steps.find((step) => step.id === 'research-run')).toMatchObject({ status: 'done' })
    expect(plan.steps.find((step) => step.id === 'research-approve')).toMatchObject({
      status: 'done',
      completedRefId: 'result-1',
    })
    expect(getCurrentAutopilotStep(plan)).toMatchObject({ id: 'research-generate' })
  })

  it('walks through the expected next action for empty, partial, reviewed, generated, and ready data states', () => {
    const project = { _id: 'project-1', title: 'Housing Truths Instagram research project', status: 'active' }
    const unreviewedResult = {
      _id: 'result-1',
      title: 'Boston housing source',
      resultType: 'sourceEvidence',
      status: 'needsReview',
      project,
    }
    const selectedResult = {
      ...unreviewedResult,
      status: 'selected',
      selectedForSynthesis: false,
    }
    const campaign = { _id: 'campaign-1', title: 'Housing Truths Instagram', researchProject: project, topicCluster: 'housing truths' }
    const funnel = { _id: 'funnel-1', title: 'Housing Truths funnel', researchProject: project, audience: 'housing advocates' }
    const completeStrategy = {
      audienceProfiles: [{ _id: 'audience-1', title: 'Housing policy advocates', audience: 'Renters, civic designers, and housing policy advocates', priority: 'primary' }],
      messagePillars: [{ _id: 'message-1', title: 'Housing Truths message', coreClaim: 'Housing statistics need clear visual context.', topicCluster: 'housing truths' }],
      proofPoints: [{ _id: 'proof-1', title: 'Housing data proof', claim: 'Housing statistics reveal local affordability pressure.', topicCluster: 'housing truths' }],
      ctas: [{ _id: 'cta-1', title: 'Visit Housing Truths', label: 'See Housing Truths', destination: 'https://housingtruths.org', priority: 'primary' }],
      trackingRules: [{ _id: 'tracking-1', title: 'Standard UTM rule', status: 'active' }],
      qualityGates: [{ _id: 'quality-1', title: 'Social content quality gate', status: 'active' }],
    }
    const calendarDraft = {
      _id: 'calendar-1',
      title: 'Housing Truths carousel draft',
      status: 'draft',
      channel: 'instagram',
      contentType: 'carousel',
      brief: 'Draft an Instagram carousel about housing statistics.',
      researchProject: project,
    }
    const quickLink = {
      _id: 'link-1',
      title: 'Housing Truths',
      url: 'https://housingtruths.org',
      status: 'active',
      researchProject: project,
    }

    const cases: Array<{ name: string; data: MarketingDataInput; currentStepId: string | null; targetId?: string }> = [
      {
        name: 'empty',
        data: emptyMarketingData(),
        currentStepId: 'research-project',
        targetId: 'autopilot-research-add-project',
      },
      {
        name: 'project exists',
        data: emptyMarketingData({ researchProjects: [project] }),
        currentStepId: 'research-run',
        targetId: 'autopilot-research-run-panel',
      },
      {
        name: 'unreviewed findings',
        data: emptyMarketingData({ researchProjects: [project], researchResults: [unreviewedResult] }),
        currentStepId: 'research-approve',
        targetId: 'autopilot-research-review',
      },
      {
        name: 'selected finding',
        data: emptyMarketingData({
          researchProjects: [{ ...project, selectedResults: [{ _id: 'result-1', title: 'Boston housing source' }] }],
          researchResults: [selectedResult],
        }),
        currentStepId: 'research-generate',
        targetId: 'autopilot-research-create-setup',
      },
      {
        name: 'paired records generated',
        data: emptyMarketingData({
          researchProjects: [project],
          researchResults: [selectedResult],
          campaigns: [campaign],
          funnels: [funnel],
        }),
        currentStepId: 'strategy-audiences',
        targetId: 'autopilot-strategy-add',
      },
      {
        name: 'strategy ready',
        data: emptyMarketingData({
          researchProjects: [project],
          researchResults: [selectedResult],
          campaigns: [campaign],
          funnels: [funnel],
          ...completeStrategy,
        }),
        currentStepId: 'calendar-draft',
        targetId: 'autopilot-calendar-add',
      },
      {
        name: 'calendar ready, missing public destination link',
        data: emptyMarketingData({
          researchProjects: [project],
          researchResults: [selectedResult],
          campaigns: [campaign],
          funnels: [funnel],
          calendarItems: [calendarDraft],
          ...completeStrategy,
        }),
        currentStepId: 'quick-link',
        targetId: 'autopilot-link-add',
      },
      {
        name: 'setup complete',
        data: emptyMarketingData({
          researchProjects: [project],
          researchResults: [selectedResult],
          campaigns: [campaign],
          funnels: [funnel],
          calendarItems: [calendarDraft],
          linkItems: [quickLink],
          ...completeStrategy,
        }),
        currentStepId: null,
      },
    ]

    for (const state of cases) {
      const plan = buildMarketingAutopilotPlan(state.data, null, defaultAutopilotQuestionnaire)
      expect(getCurrentAutopilotStep(plan)?.id || null, state.name).toBe(state.currentStepId)
      if (state.targetId) expect(getCurrentAutopilotStep(plan)?.targetId, state.name).toBe(state.targetId)
    }
  })

  it('points Autopilot at work panels instead of isolated save/review buttons', () => {
    const project = { _id: 'project-1', title: 'Housing Truths Instagram research project', status: 'active' }
    const selectedResult = {
      _id: 'result-1',
      title: 'Boston housing source',
      resultType: 'sourceEvidence',
      status: 'selected',
      selectedForSynthesis: true,
      project,
    }
    const completeStrategy = {
      audienceProfiles: [{ _id: 'audience-1', title: 'Housing policy advocates', audience: 'Renters, civic designers, and housing policy advocates', priority: 'primary' }],
      messagePillars: [{ _id: 'message-1', title: 'Housing Truths message', coreClaim: 'Housing statistics need clear visual context.', topicCluster: 'housing truths' }],
      proofPoints: [{ _id: 'proof-1', title: 'Housing data proof', claim: 'Housing statistics reveal local affordability pressure.', topicCluster: 'housing truths' }],
      ctas: [{ _id: 'cta-1', title: 'Visit Housing Truths', label: 'See Housing Truths', destination: 'https://housingtruths.org', priority: 'primary' }],
      trackingRules: [{ _id: 'tracking-1', title: 'Standard UTM rule', status: 'active' }],
      qualityGates: [{ _id: 'quality-1', title: 'Social content quality gate', status: 'active' }],
    }
    const campaign = { _id: 'campaign-1', title: 'Housing Truths Instagram', researchProject: project, topicCluster: 'housing truths' }
    const funnel = { _id: 'funnel-1', title: 'Housing Truths funnel', researchProject: project, audience: 'housing advocates' }

    const researchPlan = buildMarketingAutopilotPlan(
      emptyMarketingData({ researchProjects: [project], researchResults: [selectedResult] }),
      null,
      defaultAutopilotQuestionnaire,
    )
    expect(researchPlan.steps.find((step) => step.id === 'research-project')?.targetId).toBe('autopilot-research-project-editor')
    expect(researchPlan.steps.find((step) => step.id === 'research-run')?.targetId).toBe('autopilot-research-run-panel')
    expect(researchPlan.steps.find((step) => step.id === 'research-approve')?.targetId).toBe('autopilot-research-review')
    expect(researchPlan.steps.find((step) => step.id === 'research-generate')?.targetId).toBe('autopilot-research-create-setup')

    const calendarPlan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [project],
        researchResults: [selectedResult],
        campaigns: [campaign],
        funnels: [funnel],
        calendarItems: [{ _id: 'calendar-1', title: 'Loose draft', status: 'draft', researchProject: project }],
        ...completeStrategy,
      }),
      null,
      defaultAutopilotQuestionnaire,
    )
    expect(calendarPlan.steps.find((step) => step.id === 'calendar-draft')?.targetId).toBe('autopilot-calendar-editor')
    expect(calendarPlan.steps.find((step) => step.id === 'calendar-save-draft')?.targetId).toBe('autopilot-calendar-editor')

    const linkPlan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [project],
        researchResults: [selectedResult],
        campaigns: [campaign],
        funnels: [funnel],
        calendarItems: [{ _id: 'calendar-1', title: 'Housing Truths carousel draft', status: 'draft', channel: 'instagram', contentType: 'carousel', brief: 'Draft the carousel.', researchProject: project }],
        linkItems: [{ _id: 'link-1', title: 'Existing unrelated link', url: 'https://example.com', status: 'active' }],
        ...completeStrategy,
      }),
      null,
      defaultAutopilotQuestionnaire,
    )
    expect(linkPlan.steps.find((step) => step.id === 'quick-link')?.targetId).toBe('autopilot-link-editor')
  })

  it('skips completed strategy assets and advances after a strategy save event', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [{ _id: 'project-1', title: 'Housing Truths research', status: 'draft' }],
        researchResults: [
          {
            _id: 'result-1',
            title: 'Boston housing query',
            status: 'approved',
            selectedForSynthesis: true,
            project: { _id: 'project-1', title: 'Housing Truths research' },
          },
        ],
        campaigns: [{ _id: 'campaign-1', title: 'Housing Truths', researchProject: { _id: 'project-1' } }],
        funnels: [{ _id: 'funnel-1', title: 'Housing Truths', researchProject: { _id: 'project-1' } }],
        audienceProfiles: [{ _id: 'audience-1', title: 'Civic design leaders', audience: 'Design and civic health teams' }],
      }),
      null,
      defaultAutopilotQuestionnaire,
    )

    expect(plan.steps.find((step) => step.id === 'strategy-audiences')).toMatchObject({
      status: 'done',
      completedRefId: 'audience-1',
    })
    expect(getCurrentAutopilotStep(plan)).toMatchObject({ id: 'strategy-messages' })

    const afterMessage = applyAutopilotCompletion(plan, { action: 'strategy:save:messages', recordId: 'message-1' })
    expect(afterMessage.steps.find((step) => step.id === 'strategy-messages')).toMatchObject({
      status: 'done',
      completedRefId: 'message-1',
    })
    expect(getCurrentAutopilotStep(afterMessage)).toMatchObject({ id: 'strategy-proof' })
  })

  it('reviews existing audiences instead of forcing a new audience when the fit is unclear', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [{ _id: 'project-1', title: 'Boston housing research', status: 'draft' }],
        researchResults: [
          {
            _id: 'result-1',
            title: 'Boston housing query',
            status: 'approved',
            selectedForSynthesis: true,
            project: { _id: 'project-1', title: 'Boston housing research' },
          },
        ],
        campaigns: [{ _id: 'campaign-1', title: 'Boston Housing', researchProject: { _id: 'project-1' } }],
        funnels: [{ _id: 'funnel-1', title: 'Boston Housing', researchProject: { _id: 'project-1' } }],
        audienceProfiles: [
          {
            _id: 'audience-1',
            title: 'Clinical operations executives',
            audience: 'Hospital executives focused on clinical workflow and operational purchasing.',
          },
        ],
      }),
      null,
      {
        ...defaultAutopilotQuestionnaire,
        topic: 'Boston housing statistics',
        audience: 'Renters and housing policy advocates',
      },
    )

    expect(plan.steps.find((step) => step.id === 'strategy-audiences')).toMatchObject({
      status: 'current',
      targetId: 'autopilot-strategy-editor-audiences',
      recordId: 'audience-1',
    })
    expect(plan.steps.find((step) => step.id === 'strategy-audiences')?.requiredAction).toContain('Review the saved answer')
  })

  it('reviews existing strategy records before asking designers to create more', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [{ _id: 'project-1', title: 'Boston housing research', status: 'draft' }],
        researchResults: [
          {
            _id: 'result-1',
            title: 'Boston housing query',
            status: 'approved',
            selectedForSynthesis: true,
            project: { _id: 'project-1', title: 'Boston housing research' },
          },
        ],
        campaigns: [{ _id: 'campaign-1', title: 'Boston Housing', researchProject: { _id: 'project-1' } }],
        funnels: [{ _id: 'funnel-1', title: 'Boston Housing', researchProject: { _id: 'project-1' } }],
        audienceProfiles: [{ _id: 'audience-1', title: 'Renters and housing advocates', audience: 'Renters and housing policy advocates' }],
        messagePillars: [{ _id: 'message-1', title: 'Clinical workflow reliability', coreClaim: 'Better workflows reduce clinical burden.' }],
        proofPoints: [{ _id: 'proof-1', title: 'EHR burden proof', claim: 'Documentation pressure is a clinical operations problem.' }],
        ctas: [{ _id: 'cta-1', title: 'Contact health design team', label: 'Contact GoInvo', destination: '/contact' }],
      }),
      null,
      {
        ...defaultAutopilotQuestionnaire,
        topic: 'Boston housing statistics',
        audience: 'Renters and housing policy advocates',
      },
    )

    expect(plan.steps.find((step) => step.id === 'strategy-audiences')).toMatchObject({ status: 'done' })
    expect(plan.steps.find((step) => step.id === 'strategy-messages')).toMatchObject({
      status: 'current',
      targetId: 'autopilot-strategy-editor-messages',
      recordId: 'message-1',
    })
    expect(plan.steps.find((step) => step.id === 'strategy-messages')?.requiredAction).toContain('Review the saved answer')
  })

  it('adds an experiment step when a strategist recommendation is accepted as a small test', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData(),
      {
        summary: 'Validate a course idea before building it.',
        rationale: ['High-effort marketing moves need a measurable small test first.'],
        strategistChat: {
          primaryRecommendation: {
            title: 'Validate course demand',
            opportunityType: 'course',
            recommendation: 'testSmall',
            summary: 'Test course demand before producing a full course.',
            experimentHypothesis: 'If people save or reply to the small learning asset, then the course idea is worth deeper setup.',
          },
        },
      },
      defaultAutopilotQuestionnaire,
    )

    const stepIds = plan.steps.map((step) => step.id)
    expect(stepIds).toContain('strategy-experiments')
    expect(stepIds.indexOf('strategy-experiments')).toBeGreaterThan(stepIds.indexOf('strategy-quality'))
    expect(stepIds.indexOf('strategy-experiments')).toBeLessThan(stepIds.indexOf('calendar-draft'))
  })

  it('does not mark downstream records confirmed before prerequisite research approval', () => {
    const plan = buildMarketingAutopilotPlan(
      emptyMarketingData({
        researchProjects: [
          {
            _id: 'project-1',
            title: 'Housing Truths Instagram research project',
            status: 'draft',
            audience: 'Designers and civic health teams',
            brief: 'Plan a Housing Truths Instagram carousel with a public source link.',
          },
        ],
        researchResults: [
          {
            _id: 'result-1',
            title: 'Unreviewed source evidence',
            status: 'new',
            project: { _id: 'project-1', title: 'Housing Truths Instagram research project' },
          },
        ],
        campaigns: [{ _id: 'campaign-1', title: 'Case study release', researchProject: { _id: 'project-1' } }],
        audienceProfiles: [{ _id: 'audience-1', title: 'Design and Healthcare Leaders', audience: 'Design and healthcare leaders' }],
      }),
      null,
      defaultAutopilotQuestionnaire,
    )

    expect(getCurrentAutopilotStep(plan)).toMatchObject({ id: 'research-approve' })
    expect(plan.steps.find((step) => step.id === 'research-generate')).toMatchObject({ status: 'blocked' })
    expect(plan.steps.find((step) => step.id === 'strategy-audiences')).toMatchObject({ status: 'blocked' })
    expect(plan.steps.filter((step) => step.status === 'done').map((step) => step.id)).toEqual([
      'research-project',
      'research-run',
    ])
  })
})

describe('Marketing analytics interpretation', () => {
  it('turns relationship gaps into designer-readable next actions', () => {
    const insights = buildAnalyticsInterpretations({
      analyticsSources: [
        {
          _id: 'source-planned',
          title: 'GA4 - GoInvo',
          provider: 'ga4',
          status: 'planned',
          reportingCadence: 'weekly',
        },
      ],
      campaigns: [
        {
          _id: 'campaign-1',
          title: 'Service Design Awareness',
          status: 'active',
          campaignObjective: '',
          primaryKpi: '',
          utmCampaign: '',
          analyticsSources: [],
          successMetrics: [],
        },
      ],
      funnels: [
        {
          _id: 'funnel-1',
          title: 'Consulting Funnel',
          status: 'active',
          stages: [{ _key: 'stage-1', stage: 'awareness', metrics: [] }],
          analyticsSources: [],
        },
      ],
      channels: [
        {
          _id: 'channel-1',
          title: 'Instagram',
          key: 'instagram',
          status: 'active',
          analyticsSources: [],
        },
      ],
      calendarItems: [
        {
          _id: 'calendar-1',
          title: 'Launch carousel',
          status: 'scheduled',
          publishAt: '2026-05-26',
          workingUrl: 'https://www.goinvo.com/services',
        },
      ],
      linkItems: [
        {
          _id: 'link-1',
          title: 'Services',
          url: 'https://www.goinvo.com/services',
          status: 'active',
        },
      ],
      audienceProfiles: [],
      messagePillars: [],
      proofPoints: [],
      ctas: [],
      trackingRules: [],
      qualityGates: [],
      experiments: [],
      performanceSignals: [],
      templates: [],
      researchProjects: [],
      researchResults: [],
      researchRuns: [],
      researchPlans: [],
    })

    expect(insights.map((insight) => insight.id)).toEqual(
      expect.arrayContaining([
        'no-connected-analytics-source',
        'campaign-measurement-gap',
        'campaign-plan-gap',
        'calendar-measurement-gap',
        'funnel-measurement-gap',
        'funnel-stage-metric-gap',
        'channel-measurement-gap',
        'quick-links-context-gap',
        'source-key-metric-gap',
      ]),
    )

    expect(insights.find((insight) => insight.id === 'campaign-measurement-gap')?.action).toContain('Attach a connected source')
  })

  it('reports a healthy interpretation when active marketing work is measurable', () => {
    const sourceRef = { _id: 'source-1', title: 'Vercel Web Analytics', provider: 'vercelAnalytics', status: 'connected' }
    const insights = buildAnalyticsInterpretations({
      analyticsSources: [
        {
          ...sourceRef,
          productionUrl: 'https://www.goinvo.com',
          reportingCadence: 'weekly',
          keyMetrics: [{ _key: 'metric-1', label: 'Qualified visits' }],
        },
      ],
      campaigns: [
        {
          _id: 'campaign-1',
          title: 'Service Design Awareness',
          status: 'active',
          campaignObjective: 'Grow qualified service-page visits',
          primaryKpi: 'Qualified visits',
          utmCampaign: 'service-design-awareness',
          analyticsSources: [sourceRef],
          successMetrics: [{ label: 'Qualified visits', target: '10%', source: sourceRef }],
        },
      ],
      funnels: [
        {
          _id: 'funnel-1',
          title: 'Consulting Funnel',
          status: 'active',
          stages: [{ _key: 'stage-1', stage: 'awareness', metrics: ['Qualified visits'] }],
          analyticsSources: [sourceRef],
        },
      ],
      channels: [
        {
          _id: 'channel-1',
          title: 'Instagram',
          key: 'instagram',
          status: 'active',
          analyticsSources: [sourceRef],
        },
      ],
      calendarItems: [
        {
          _id: 'calendar-1',
          title: 'Launch carousel',
          status: 'scheduled',
          publishAt: '2026-05-26',
          workingUrl: 'https://www.goinvo.com/services',
          analyticsSource: sourceRef,
        },
      ],
      linkItems: [
        {
          _id: 'link-1',
          title: 'Services',
          url: 'https://www.goinvo.com/services',
          status: 'active',
          campaign: { _id: 'campaign-1', title: 'Service Design Awareness' },
        },
      ],
      audienceProfiles: [{ _id: 'audience-1', title: 'Design leaders' }],
      messagePillars: [{ _id: 'message-1', title: 'Clear systems', coreClaim: 'Clear systems help people act.' }],
      proofPoints: [{ _id: 'proof-1', title: 'Case proof', claim: 'The work has evidence.' }],
      ctas: [{ _id: 'cta-1', title: 'Read source', label: 'Read the source' }],
      trackingRules: [{ _id: 'tracking-1', title: 'Default tracking' }],
      qualityGates: [{ _id: 'quality-1', title: 'Content review' }],
      experiments: [],
      performanceSignals: [],
      templates: [],
      researchProjects: [],
      researchResults: [],
      researchRuns: [],
      researchPlans: [],
    })

    expect(insights).toHaveLength(1)
    expect(insights[0]).toMatchObject({
      id: 'analytics-ready',
      severity: 'healthy',
    })
  })
})

describe('Marketing A/B testing insights', () => {
  it('flags page experiments that are not ready for launch or readout', () => {
    const data = emptyMarketingData({
      experiments: [
        {
          _id: 'experiment-1',
          title: 'Homepage concept',
          status: 'running',
          targetType: 'homepage',
          targetPath: '/',
          flagKey: '',
          variants: [{ _key: 'variant-1', key: 'concept', label: 'Concept' }],
          primaryMetric: '',
        },
      ],
    })

    expect(getAbTestingStats(data)).toMatchObject({
      total: 1,
      pageTests: 1,
      running: 0,
      blocked: 1,
      ready: 0,
      withAnalyticsSource: 0,
      withSignals: 0,
    })

    const insights = buildAbTestingInsights(data)
    expect(insights.map((insight) => insight.id)).toEqual(
      expect.arrayContaining([
        'abtest-missing-flag-setup',
        'abtest-missing-analytics-source',
        'abtest-measurement-blocked',
      ]),
    )
    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'abtest-missing-flag-setup',
          title: '1 page test needs setup before launch',
          action: 'Open Test setup and complete the missing launch-readiness items before starting or expanding traffic.',
        }),
        expect.objectContaining({
          id: 'abtest-measurement-blocked',
          title: '1 active test needs variant visits and event counts',
          action: 'Open Results evidence and add variant-keyed exposure and event-count metrics before reviewing, expanding traffic, or reporting a winner.',
        }),
      ]),
    )
  })

  it('reports healthy A/B testing setup when flags, sources, and signals are linked', () => {
    const sourceRef = { _id: 'source-1', title: 'Vercel Web Analytics', provider: 'vercelAnalytics', status: 'connected' }
    const signalRef = {
      _id: 'signal-1',
      title: 'Homepage concept readout',
      provider: 'vercelAnalytics',
      status: 'reviewed',
      signalType: 'conversion',
      metrics: [
        { _key: 'metric-concept-conversions', label: 'experiment_conversion', value: 24, unit: 'events', change: '+18%', variantKey: 'concept', eventName: 'experiment_conversion' },
        { _key: 'metric-control-conversions', label: 'experiment_conversion', value: 20, unit: 'events', variantKey: 'control', eventName: 'experiment_conversion' },
        { _key: 'metric-concept-visits', label: 'experiment_exposure', value: 300, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
        { _key: 'metric-control-visits', label: 'experiment_exposure', value: 300, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
      ],
    }
    const data = emptyMarketingData({
      analyticsSources: [
        {
          ...sourceRef,
          productionUrl: 'https://www.goinvo.com',
          keyMetrics: [{ _key: 'metric-1', label: 'Experiment conversions' }],
        },
      ],
      experiments: [
        {
          _id: 'experiment-1',
          title: 'Homepage concept',
          status: 'running',
          targetType: 'homepage',
          targetPath: '/',
          flagKey: 'home-2026-variant',
          variants: [
            { _key: 'variant-1', key: 'control', label: 'Current homepage' },
            { _key: 'variant-2', key: 'concept', label: 'Concept homepage' },
          ],
          primaryMetric: 'Qualified discovery-call clicks',
          trackedMetrics: [
            {
              _key: 'metric-qualified',
              key: 'qualified-discovery-call-clicks',
              label: 'Qualified discovery-call clicks',
              role: 'secondary',
              source: 'vercelEvent',
              eventName: 'experiment_conversion',
            },
          ],
          successTrackers: [
            {
              _key: 'tracker-qualified',
              title: 'Primary lift',
              trackerType: 'metricRule',
              metricKeys: ['qualified-discovery-call-clicks'],
              condition: 'increase',
              successWhen: 'Variant improves qualified discovery-call clicks.',
            },
          ],
          analyticsSource: sourceRef,
          performanceSignals: [signalRef],
        },
      ],
      performanceSignals: [signalRef],
    })

    expect(getAbTestingStats(data)).toMatchObject({
      ready: 1,
      withAnalyticsSource: 1,
      withSignals: 1,
    })
    expect(buildAbTestingInsights(data)).toEqual([
      expect.objectContaining({
        id: 'abtest-data-positive-experiment-1',
        severity: 'healthy',
        title: 'Homepage concept has evidence supporting the variant',
        affected: ['Qualified discovery-call clicks (24 events, +18%)'],
      }),
    ])
  })

  it('warns when linked result data violates an A/B test guardrail', () => {
    const sourceRef = { _id: 'source-1', title: 'Vercel Web Analytics', provider: 'vercelAnalytics', status: 'connected' }
    const signalRef = {
      _id: 'signal-1',
      title: 'Homepage concept readout',
      provider: 'vercelAnalytics',
      status: 'reviewed',
      signalType: 'conversion',
      metrics: [
        { _key: 'metric-concept-work', label: 'view_work_click', value: 80, unit: 'events', change: '-12%', variantKey: 'concept', eventName: 'view_work_click' },
        { _key: 'metric-control-work', label: 'view_work_click', value: 91, unit: 'events', variantKey: 'control', eventName: 'view_work_click' },
        { _key: 'metric-concept-visits', label: 'experiment_exposure', value: 300, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
        { _key: 'metric-control-visits', label: 'experiment_exposure', value: 300, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
      ],
    }
    const data = emptyMarketingData({
      analyticsSources: [sourceRef],
      experiments: [
        {
          _id: 'experiment-1',
          title: 'Homepage concept',
          status: 'running',
          targetType: 'homepage',
          targetPath: '/',
          flagKey: 'home-2026-variant',
          variants: [
            { _key: 'variant-1', key: 'control', label: 'Current homepage' },
            { _key: 'variant-2', key: 'concept', label: 'Concept homepage' },
          ],
          primaryMetric: 'Qualified discovery-call clicks',
          trackedMetrics: [
            {
              _key: 'metric-work',
              key: 'work-exploration-clicks',
              label: 'Work exploration clicks',
              role: 'guardrail',
              source: 'vercelEvent',
              eventName: 'view_work_click',
            },
          ],
          successTrackers: [
            {
              _key: 'tracker-work',
              title: 'Work exploration guardrail',
              trackerType: 'metricRule',
              metricKeys: ['work-exploration-clicks'],
              condition: 'notDecrease',
              successWhen: 'Work exploration clicks do not drop materially.',
            },
          ],
          analyticsSource: sourceRef,
          performanceSignals: [signalRef],
        },
      ],
      performanceSignals: [signalRef],
    })

    expect(buildAbTestingInsights(data)).toEqual([
      expect.objectContaining({
        id: 'abtest-data-negative-experiment-1',
        severity: 'urgent',
        title: 'Homepage concept has a guardrail failing',
        affected: ['Work exploration clicks (80 events, -12%)'],
      }),
    ])
  })

  it('asks designers to map result data when signal labels do not match tracked metrics', () => {
    const sourceRef = { _id: 'source-1', title: 'Vercel Web Analytics', provider: 'vercelAnalytics', status: 'connected' }
    const signalRef = {
      _id: 'signal-1',
      title: 'Homepage concept readout',
      provider: 'vercelAnalytics',
      status: 'reviewed',
      signalType: 'conversion',
      metrics: [{ _key: 'metric-1', label: 'cta_clicks_unmapped', value: 24, unit: 'events', change: '+18%' }],
    }
    const data = emptyMarketingData({
      analyticsSources: [sourceRef],
      experiments: [
        {
          _id: 'experiment-1',
          title: 'Homepage concept',
          status: 'running',
          targetType: 'homepage',
          targetPath: '/',
          flagKey: 'home-2026-variant',
          variants: [
            { _key: 'variant-1', key: 'control', label: 'Current homepage' },
            { _key: 'variant-2', key: 'concept', label: 'Concept homepage' },
          ],
          primaryMetric: 'Qualified discovery-call clicks',
          trackedMetrics: [
            {
              _key: 'metric-qualified',
              key: 'qualified-discovery-call-clicks',
              label: 'Qualified discovery-call clicks',
              role: 'primary',
              source: 'vercelEvent',
              eventName: 'experiment_conversion',
            },
          ],
          successTrackers: [
            {
              _key: 'tracker-qualified',
              title: 'Primary lift',
              trackerType: 'metricRule',
              metricKeys: ['qualified-discovery-call-clicks'],
              condition: 'increase',
              successWhen: 'Variant improves qualified discovery-call clicks.',
            },
          ],
          analyticsSource: sourceRef,
          performanceSignals: [signalRef],
        },
      ],
      performanceSignals: [signalRef],
    })

    expect(buildAbTestingInsights(data)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'abtest-measurement-blocked',
          severity: 'urgent',
        }),
        expect.objectContaining({
          id: 'abtest-data-unmapped-experiment-1',
          severity: 'opportunity',
          title: 'Homepage concept has result data that is not matched to a metric',
          affected: ['Homepage concept readout'],
        }),
      ]),
    )
  })
})
