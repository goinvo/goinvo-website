import { describe, expect, it } from 'vitest'
import { schemaTypes } from '@/sanity/schemas'
import analyticsSchema from '@/sanity/schemas/marketingAnalyticsSource'
import calendarSchema from '@/sanity/schemas/marketingCalendarItem'
import campaignSchema from '@/sanity/schemas/marketingCampaign'
import channelSchema, { defaultMarketingChannels } from '@/sanity/schemas/marketingChannel'
import funnelSchema from '@/sanity/schemas/marketingFunnel'
import linkItemSchema from '@/sanity/schemas/marketingLinkItem'
import templateSchema from '@/sanity/schemas/marketingTemplate'
import { MARKETING_TOOL_VIEWS, buildAnalyticsInterpretations, marketingTool } from '@/sanity/tools/marketingTool'

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
      'calendar',
      'campaigns',
      'funnels',
      'templates',
      'channels',
      'analytics',
      'linkTree',
    ])
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
    expect(typeNames).toContain('marketingTemplate')
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
        'topicCluster',
        'searchIntent',
        'targetQueries',
        'canonicalUrl',
        'targetSites',
        'channels',
        'channelRefs',
        'funnels',
        'primaryKpi',
        'utmCampaign',
        'successMetrics',
        'analyticsSources',
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
        'targetSites',
        'canonicalContent',
        'linkItems',
        'utmCampaign',
        'analyticsSource',
      ]),
    )
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
        'conversionGoal',
        'targetSites',
        'stages',
        'analyticsSources',
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
        'topicCluster',
        'searchIntent',
        'targetQueries',
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
      ]),
    )
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
      templates: [],
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
      templates: [],
    })

    expect(insights).toHaveLength(1)
    expect(insights[0]).toMatchObject({
      id: 'analytics-ready',
      severity: 'healthy',
    })
  })
})
