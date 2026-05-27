import { defineField, defineType } from 'sanity'

const campaignStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Planned', value: 'planned' },
  { title: 'Active', value: 'active' },
  { title: 'Paused', value: 'paused' },
  { title: 'Complete', value: 'complete' },
  { title: 'Archived', value: 'archived' },
]

const campaignObjectiveOptions = [
  { title: 'Awareness / POV', value: 'awareness' },
  { title: 'Audience growth', value: 'audienceGrowth' },
  { title: 'Service interest', value: 'serviceInterest' },
  { title: 'Qualified conversations', value: 'qualifiedConversations' },
  { title: 'Launch support', value: 'launchSupport' },
  { title: 'Adoption / reuse', value: 'adoption' },
]

const searchIntentOptions = [
  { title: 'Learning / discovery', value: 'learn' },
  { title: 'Comparing approaches', value: 'compare' },
  { title: 'Deciding / contacting', value: 'decide' },
  { title: 'Using / adopting', value: 'use' },
]

const targetSiteFields = [
  defineField({
    name: 'label',
    title: 'Site Label',
    type: 'string',
    description: 'Short internal label, such as GoInvo, Yes, or Open Source Health.',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'url',
    title: 'Site URL',
    type: 'url',
  }),
]

export default defineType({
  name: 'marketingCampaign',
  title: 'Marketing Campaign',
  type: 'document',
  groups: [
    { name: 'strategy', title: 'Strategy', default: true },
    { name: 'planning', title: 'Planning' },
    { name: 'measurement', title: 'Measurement' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Campaign Name',
      type: 'string',
      group: 'strategy',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Campaign Slug',
      type: 'slug',
      group: 'strategy',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'strategy',
      options: { list: campaignStatusOptions, layout: 'radio' },
      initialValue: 'idea',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'reference',
      group: 'strategy',
      to: [{ type: 'teamMember' }],
    }),
    defineField({
      name: 'primaryGoal',
      title: 'Primary Goal',
      type: 'text',
      rows: 3,
      group: 'strategy',
      description: 'The business outcome this campaign is trying to move.',
    }),
    defineField({
      name: 'campaignObjective',
      title: 'Objective',
      type: 'string',
      group: 'strategy',
      options: { list: campaignObjectiveOptions },
      description: 'The broad job this campaign is doing. Keep this higher-level than an individual post or case study release.',
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'text',
      rows: 3,
      group: 'strategy',
      description: 'Who this campaign is for and what they care about.',
    }),
    defineField({
      name: 'audienceProfiles',
      title: 'Audience Profiles',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
      description: 'Reusable strategy audience records this campaign should serve.',
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic / Keyword Cluster',
      type: 'string',
      group: 'strategy',
      description: 'The durable topic this campaign should build association with, such as healthcare service design or housing data visualization.',
    }),
    defineField({
      name: 'searchIntent',
      title: 'Search / Visitor Intent',
      type: 'string',
      group: 'strategy',
      options: { list: searchIntentOptions },
      description: 'What the visitor is trying to do when this work reaches them.',
    }),
    defineField({
      name: 'targetQueries',
      title: 'Target Queries / Phrases',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'string' }],
      description: 'Plain-language phrases people might search, say, or recognize. Useful prompts for titles, captions, and page copy.',
    }),
    defineField({
      name: 'positioning',
      title: 'Positioning / Message',
      type: 'text',
      rows: 4,
      group: 'strategy',
    }),
    defineField({
      name: 'messagePillars',
      title: 'Message Pillars',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'reference', to: [{ type: 'marketingMessagePillar' }] }],
      description: 'Approved message pillars to reuse in briefs, captions, and content drafts.',
    }),
    defineField({
      name: 'proofPoints',
      title: 'Proof Points',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'reference', to: [{ type: 'marketingProofPoint' }] }],
      description: 'Reusable evidence that supports the campaign claim.',
    }),
    defineField({
      name: 'ctas',
      title: 'CTA Ladder',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'reference', to: [{ type: 'marketingCta' }] }],
      description: 'Approved calls to action for each stage this campaign supports.',
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical Destination URL',
      type: 'url',
      group: 'planning',
      description: 'The main page or resource this campaign should point toward when there is one.',
    }),
    defineField({
      name: 'targetSites',
      title: 'Target Sites',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'targetSite',
          title: 'Target Site',
          type: 'object',
          fields: targetSiteFields,
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
    }),
    defineField({
      name: 'channels',
      title: 'Channel Keys',
      type: 'array',
      group: 'planning',
      description: 'Stable channel keys used for reporting and legacy calendar joins.',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Website', value: 'website' },
          { title: 'Email', value: 'email' },
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'Newsletter', value: 'newsletter' },
          { title: 'Search', value: 'search' },
          { title: 'Events', value: 'events' },
          { title: 'Partner / Referral', value: 'partner' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({
      name: 'channelRefs',
      title: 'Managed Channels',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingChannel' }] }],
      description: 'Managed channel documents used by the Marketing workspace.',
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
      group: 'planning',
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'date',
      group: 'planning',
    }),
    defineField({
      name: 'funnels',
      title: 'Related Funnels',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingFunnel' }] }],
    }),
    defineField({
      name: 'successMetrics',
      title: 'Success Metrics',
      type: 'array',
      group: 'measurement',
      of: [
        {
          name: 'successMetric',
          title: 'Success Metric',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Metric', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'target', title: 'Target', type: 'string' }),
            defineField({ name: 'source', title: 'Source', type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'target' },
          },
        },
      ],
    }),
    defineField({
      name: 'primaryKpi',
      title: 'Primary KPI',
      type: 'string',
      group: 'measurement',
      description: 'The one metric that matters most. Use this to avoid optimizing every channel for a different outcome.',
    }),
    defineField({
      name: 'utmCampaign',
      title: 'UTM Campaign Name',
      type: 'string',
      group: 'measurement',
      description: 'Stable lowercase campaign name for URLs and analytics, such as service-design-awareness.',
    }),
    defineField({
      name: 'trackingRule',
      title: 'Tracking Rule',
      type: 'reference',
      group: 'measurement',
      to: [{ type: 'marketingTrackingRule' }],
      description: 'Reusable UTM/source/medium naming guidance for this campaign.',
    }),
    defineField({
      name: 'analyticsSources',
      title: 'Analytics Sources',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }],
    }),
    defineField({
      name: 'qualityGates',
      title: 'Quality Gates',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingQualityGate' }] }],
      description: 'Reusable checklists that content in this campaign should satisfy before publishing.',
    }),
    defineField({
      name: 'experiments',
      title: 'Experiments',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingExperiment' }] }],
    }),
    defineField({
      name: 'performanceSignals',
      title: 'Performance Signals',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingPerformanceSignal' }] }],
      description: 'Manual or imported signals that should inform campaign strategy updates.',
    }),
    defineField({
      name: 'researchProject',
      title: 'Research Project',
      type: 'reference',
      group: 'strategy',
      to: [{ type: 'marketingResearchProject' }],
      description: 'Research directive that justified this campaign.',
    }),
    defineField({
      name: 'researchResults',
      title: 'Research Results',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
      description: 'Approved findings used to generate or justify this campaign.',
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 5,
      group: 'planning',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      startDate: 'startDate',
      endDate: 'endDate',
    },
    prepare({ title, status, startDate, endDate }) {
      const statusLabel = campaignStatusOptions.find((option) => option.value === status)?.title || 'Idea'
      const dates = [startDate, endDate].filter(Boolean).join(' - ')

      return {
        title: `${statusLabel}: ${title || 'Untitled campaign'}`,
        subtitle: dates || 'No dates set',
      }
    },
  },
  orderings: [
    {
      title: 'Start date, newest first',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
})

export { campaignObjectiveOptions, campaignStatusOptions, searchIntentOptions, targetSiteFields }
