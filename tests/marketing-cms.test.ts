import { describe, expect, it } from 'vitest'
import { schemaTypes } from '@/sanity/schemas'
import analyticsSchema from '@/sanity/schemas/marketingAnalyticsSource'
import audienceProfileSchema from '@/sanity/schemas/marketingAudienceProfile'
import calendarSchema, { calendarStatusOptions } from '@/sanity/schemas/marketingCalendarItem'
import campaignSchema from '@/sanity/schemas/marketingCampaign'
import channelSchema, { defaultMarketingChannels } from '@/sanity/schemas/marketingChannel'
import ctaSchema from '@/sanity/schemas/marketingCta'
import experimentSchema from '@/sanity/schemas/marketingExperiment'
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
  buildAnalyticsInterpretations,
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

describe('Marketing CMS schemas', () => {
  it('exposes marketing as a custom Studio tool, not another content structure list', () => {
    expect(marketingTool.name).toBe('marketing')
    expect(marketingTool.title).toBe('Marketing')
    expect(MARKETING_TOOL_VIEWS.map((view) => view.id)).toEqual([
      'dashboard',
      'attention',
      'research',
      'strategy',
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
      'strategy',
      'calendar',
      'channels',
      'linkTree',
    ])
  })

  it('offers guided autofill choices before open-ended prompting', () => {
    expect(getMarketingAutofillQuestions('campaign').map((question) => question.id)).toEqual(['source', 'goal', 'scope'])
    expect(getMarketingAutofillQuestions('calendarItem').map((question) => question.id)).toEqual(['source', 'format', 'scope'])
    expect(getMarketingAutofillQuestions('analyticsSource').map((question) => question.id)).toEqual(['source', 'measurement', 'scope'])
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
    expect(fieldNames(experimentSchema)).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'hypothesis',
        'expectedSignal',
        'campaign',
        'calendarItem',
        'performanceSignals',
        'result',
        'decision',
      ]),
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
