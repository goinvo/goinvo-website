import { defineField, defineType } from 'sanity'
import { campaignObjectiveOptions, searchIntentOptions } from './marketingCampaign'

const researchPlanStatusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Active', value: 'active' },
  { title: 'Revising', value: 'revising' },
  { title: 'Complete', value: 'complete' },
  { title: 'Archived', value: 'archived' },
]

const researchPlanCadenceOptions = [
  { title: 'Weekly', value: 'weekly' },
  { title: 'Every two weeks', value: 'biweekly' },
  { title: 'Monthly', value: 'monthly' },
  { title: 'Campaign-based', value: 'campaignBased' },
  { title: 'Custom', value: 'custom' },
]

const researchPriorityOptions = [
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
]

const researchMethodOptions = [
  { title: 'Desk research', value: 'deskResearch' },
  { title: 'SEO / search review', value: 'seoReview' },
  { title: 'CMS / site scan', value: 'cmsScan' },
  { title: 'Analytics review', value: 'analyticsReview' },
  { title: 'Competitive scan', value: 'competitiveScan' },
  { title: 'Audience interview', value: 'audienceInterview' },
  { title: 'Stakeholder interview', value: 'stakeholderInterview' },
  { title: 'Survey', value: 'survey' },
  { title: 'Social / community listening', value: 'socialListening' },
  { title: 'Source / literature review', value: 'sourceReview' },
  { title: 'Other', value: 'other' },
]

const researchEvidenceTypeOptions = [
  { title: 'First-party analytics', value: 'firstPartyAnalytics' },
  { title: 'Search signal', value: 'searchSignal' },
  { title: 'Interview quote', value: 'interviewQuote' },
  { title: 'Survey result', value: 'surveyResult' },
  { title: 'Competitor example', value: 'competitorExample' },
  { title: 'Source article / report', value: 'sourceArticle' },
  { title: 'CMS / site content', value: 'siteContent' },
  { title: 'Team knowledge', value: 'teamKnowledge' },
  { title: 'Other', value: 'other' },
]

const researchConfidenceOptions = [
  { title: 'Strong', value: 'strong' },
  { title: 'Medium', value: 'medium' },
  { title: 'Early signal', value: 'early' },
  { title: 'Needs validation', value: 'needsValidation' },
]

const collaborationStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Invited', value: 'invited' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'In progress', value: 'inProgress' },
  { title: 'Complete', value: 'complete' },
  { title: 'Paused', value: 'paused' },
]

const collaborationRelationshipOptions = [
  { title: 'University intern', value: 'universityIntern' },
  { title: 'Advisor', value: 'advisor' },
  { title: 'Partner organization', value: 'partnerOrg' },
  { title: 'Guest contributor', value: 'guest' },
  { title: 'Community', value: 'community' },
  { title: 'Client / project partner', value: 'clientPartner' },
  { title: 'Other', value: 'other' },
]

const contributionTypeOptions = [
  { title: 'Subject expertise', value: 'subjectExpertise' },
  { title: 'Research', value: 'research' },
  { title: 'Writing', value: 'writing' },
  { title: 'Visual design', value: 'visualDesign' },
  { title: 'Data / analysis', value: 'dataAnalysis' },
  { title: 'Distribution', value: 'distribution' },
  { title: 'Review', value: 'review' },
  { title: 'Other', value: 'other' },
]

const opportunityReadinessOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Needs source material', value: 'needsSource' },
  { title: 'Ready to brief', value: 'readyToBrief' },
  { title: 'Ready to make', value: 'readyToMake' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Shipped', value: 'shipped' },
]

const contentFormatOptions = [
  { title: 'Article', value: 'article' },
  { title: 'Case study', value: 'caseStudy' },
  { title: 'Instagram carousel', value: 'carousel' },
  { title: 'LinkedIn post', value: 'linkPost' },
  { title: 'Newsletter', value: 'newsletter' },
  { title: 'Landing page', value: 'landingPage' },
  { title: 'Video', value: 'video' },
  { title: 'Event / talk', value: 'event' },
  { title: 'Quick Link', value: 'quickLink' },
  { title: 'Other', value: 'other' },
]

export default defineType({
  name: 'marketingResearchPlan',
  title: 'Marketing Research Plan',
  type: 'document',
  groups: [
    { name: 'strategy', title: 'Strategy', default: true },
    { name: 'research', title: 'Research Inputs' },
    { name: 'planning', title: 'Release Planning' },
    { name: 'generated', title: 'Generated Objects' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Plan Title',
      type: 'string',
      group: 'strategy',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'strategy',
      options: { list: researchPlanStatusOptions, layout: 'radio' },
      initialValue: 'draft',
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
      name: 'summary',
      title: 'Research Summary',
      type: 'text',
      rows: 4,
      group: 'strategy',
      description: 'Fast synthesis of the market/content research, written so a designer can act on it.',
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'text',
      rows: 3,
      group: 'strategy',
    }),
    defineField({
      name: 'positioning',
      title: 'Positioning',
      type: 'text',
      rows: 4,
      group: 'strategy',
    }),
    defineField({
      name: 'campaignObjective',
      title: 'Primary Objective',
      type: 'string',
      group: 'strategy',
      options: { list: campaignObjectiveOptions },
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical Destination URL',
      type: 'url',
      group: 'strategy',
    }),
    defineField({
      name: 'releaseCadence',
      title: 'Release Cadence',
      type: 'string',
      group: 'planning',
      options: { list: researchPlanCadenceOptions },
      initialValue: 'weekly',
    }),
    defineField({
      name: 'researchQuestions',
      title: 'Research Questions',
      type: 'array',
      group: 'research',
      description: 'The questions this plan needs to answer before designers make content.',
      of: [
        {
          name: 'researchQuestion',
          title: 'Research Question',
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Question', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'whyItMatters', title: 'Why It Matters', type: 'text', rows: 2 }),
            defineField({ name: 'method', title: 'Best Method', type: 'string', options: { list: researchMethodOptions } }),
            defineField({ name: 'decisionNeeded', title: 'Decision It Supports', type: 'text', rows: 2 }),
            defineField({ name: 'status', title: 'Status', type: 'string', options: { list: opportunityReadinessOptions } }),
          ],
          preview: { select: { title: 'question', subtitle: 'method' } },
        },
      ],
    }),
    defineField({
      name: 'evidenceNotes',
      title: 'Evidence Log',
      type: 'array',
      group: 'research',
      description: 'Claims, sources, confidence, and implications used to justify the plan.',
      of: [
        {
          name: 'evidenceNote',
          title: 'Evidence Note',
          type: 'object',
          fields: [
            defineField({ name: 'claim', title: 'Claim / Finding', type: 'text', rows: 2, validation: (Rule) => Rule.required() }),
            defineField({ name: 'sourceTitle', title: 'Source Title', type: 'string' }),
            defineField({ name: 'sourceUrl', title: 'Source URL', type: 'url' }),
            defineField({ name: 'evidenceType', title: 'Evidence Type', type: 'string', options: { list: researchEvidenceTypeOptions } }),
            defineField({ name: 'confidence', title: 'Confidence', type: 'string', options: { list: researchConfidenceOptions } }),
            defineField({ name: 'implication', title: 'Implication For Content', type: 'text', rows: 2 }),
            defineField({ name: 'gap', title: 'Still Unknown', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'claim', subtitle: 'confidence' } },
        },
      ],
    }),
    defineField({
      name: 'assumptions',
      title: 'Assumptions To Validate',
      type: 'array',
      group: 'research',
      description: 'What the plan assumes, why that could be risky, and which signal should validate it.',
      of: [
        {
          name: 'researchAssumption',
          title: 'Research Assumption',
          type: 'object',
          fields: [
            defineField({ name: 'assumption', title: 'Assumption', type: 'text', rows: 2, validation: (Rule) => Rule.required() }),
            defineField({ name: 'risk', title: 'Risk If Wrong', type: 'text', rows: 2 }),
            defineField({ name: 'validationSignal', title: 'Validation Signal', type: 'text', rows: 2 }),
            defineField({ name: 'confidence', title: 'Confidence', type: 'string', options: { list: researchConfidenceOptions } }),
          ],
          preview: { select: { title: 'assumption', subtitle: 'confidence' } },
        },
      ],
    }),
    defineField({
      name: 'contentPillars',
      title: 'Content Pillars',
      type: 'array',
      group: 'research',
      of: [
        {
          name: 'contentPillar',
          title: 'Content Pillar',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'audienceNeed', title: 'Audience Need', type: 'text', rows: 2 }),
            defineField({ name: 'angle', title: 'Angle', type: 'text', rows: 2 }),
            defineField({ name: 'exampleFormats', title: 'Example Formats', type: 'array', of: [{ type: 'string' }] }),
          ],
          preview: { select: { title: 'title', subtitle: 'angle' } },
        },
      ],
    }),
    defineField({
      name: 'seoTargets',
      title: 'SEO Targets',
      type: 'array',
      group: 'research',
      of: [
        {
          name: 'seoTarget',
          title: 'SEO Target',
          type: 'object',
          fields: [
            defineField({ name: 'query', title: 'Keyword / Query', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'intent', title: 'Search Intent', type: 'string', options: { list: searchIntentOptions } }),
            defineField({ name: 'priority', title: 'Priority', type: 'string', options: { list: researchPriorityOptions } }),
            defineField({ name: 'canonicalUrl', title: 'Canonical Destination', type: 'url' }),
            defineField({ name: 'contentGap', title: 'Content Gap', type: 'text', rows: 2 }),
            defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { title: 'query', subtitle: 'intent' },
          },
        },
      ],
    }),
    defineField({
      name: 'channels',
      title: 'Recommended Channels',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'recommendedChannel',
          title: 'Recommended Channel',
          type: 'object',
          fields: [
            defineField({ name: 'channelKey', title: 'Channel Key', type: 'string' }),
            defineField({ name: 'rationale', title: 'Rationale', type: 'text', rows: 2 }),
            defineField({ name: 'cadence', title: 'Cadence', type: 'string' }),
            defineField({ name: 'priority', title: 'Priority', type: 'string', options: { list: researchPriorityOptions } }),
          ],
          preview: { select: { title: 'channelKey', subtitle: 'rationale' } },
        },
      ],
    }),
    defineField({
      name: 'collaborations',
      title: 'Collaborations / Contributors',
      type: 'array',
      group: 'research',
      of: [
        {
          name: 'collaborationOpportunity',
          title: 'Collaboration Opportunity',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'organization', title: 'Organization', type: 'string' }),
            defineField({ name: 'relationshipType', title: 'Relationship Type', type: 'string', options: { list: collaborationRelationshipOptions } }),
            defineField({ name: 'topicArea', title: 'Topic Area', type: 'string' }),
            defineField({ name: 'availabilityStart', title: 'Available Starting', type: 'date' }),
            defineField({ name: 'availabilityEnd', title: 'Available Until', type: 'date' }),
            defineField({ name: 'contributionType', title: 'Contribution Type', type: 'string', options: { list: contributionTypeOptions } }),
            defineField({ name: 'expectedContribution', title: 'Expected Contribution', type: 'text', rows: 2 }),
            defineField({ name: 'status', title: 'Status', type: 'string', options: { list: collaborationStatusOptions } }),
            defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 3 }),
          ],
          preview: {
            select: { name: 'name', organization: 'organization', topicArea: 'topicArea' },
            prepare({ name, organization, topicArea }) {
              return {
                title: [name, organization].filter(Boolean).join(' / ') || 'Collaboration',
                subtitle: topicArea,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'releaseWindows',
      title: 'Release Windows',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'releaseWindow',
          title: 'Release Window',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'startDate', title: 'Start Date', type: 'date' }),
            defineField({ name: 'endDate', title: 'End Date', type: 'date' }),
            defineField({ name: 'goal', title: 'Goal', type: 'text', rows: 2 }),
            defineField({ name: 'priority', title: 'Priority', type: 'string', options: { list: researchPriorityOptions } }),
          ],
          preview: {
            select: { title: 'label', startDate: 'startDate', endDate: 'endDate' },
            prepare({ title, startDate, endDate }) {
              return {
                title: title || 'Release window',
                subtitle: [startDate, endDate].filter(Boolean).join(' - '),
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'contentOpportunities',
      title: 'Content Opportunities',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'contentOpportunity',
          title: 'Content Opportunity',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Proposed Item', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'channel', title: 'Channel', type: 'string' }),
            defineField({ name: 'format', title: 'Format', type: 'string', options: { list: contentFormatOptions } }),
            defineField({ name: 'owner', title: 'Owner / Contributor', type: 'string' }),
            defineField({ name: 'releaseWindow', title: 'Release Window', type: 'string' }),
            defineField({ name: 'callToAction', title: 'CTA', type: 'string' }),
            defineField({ name: 'sourceMaterial', title: 'Source Material', type: 'text', rows: 2 }),
            defineField({ name: 'destinationUrl', title: 'Destination URL', type: 'url' }),
            defineField({ name: 'readiness', title: 'Readiness', type: 'string', options: { list: opportunityReadinessOptions } }),
            defineField({ name: 'seoQuery', title: 'SEO Query', type: 'string' }),
            defineField({ name: 'priority', title: 'Priority', type: 'string', options: { list: researchPriorityOptions } }),
            defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 3 }),
            defineField({ name: 'generatedCalendarItem', title: 'Generated Calendar Item', type: 'reference', to: [{ type: 'marketingCalendarItem' }] }),
            defineField({ name: 'generatedLinkItem', title: 'Generated Quick Link', type: 'reference', to: [{ type: 'marketingLinkItem' }] }),
          ],
          preview: { select: { title: 'title', subtitle: 'format' } },
        },
      ],
    }),
    defineField({
      name: 'measurementGoals',
      title: 'Measurement Goals',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'measurementGoal',
          title: 'Measurement Goal',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Metric', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'target', title: 'How to Judge It', type: 'text', rows: 2 }),
            defineField({ name: 'source', title: 'Analytics Source', type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }),
          ],
          preview: { select: { title: 'label', subtitle: 'target' } },
        },
      ],
    }),
    defineField({
      name: 'strategyAdjustments',
      title: 'Strategy Adjustments',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'strategyAdjustment',
          title: 'Strategy Adjustment',
          type: 'object',
          fields: [
            defineField({ name: 'decisionDate', title: 'Decision Date', type: 'date' }),
            defineField({ name: 'trigger', title: 'Opportunity / Trigger', type: 'string' }),
            defineField({ name: 'reason', title: 'Why the Plan Changed', type: 'text', rows: 2 }),
            defineField({ name: 'recommendation', title: 'Recommendation', type: 'text', rows: 2 }),
            defineField({ name: 'affectedItems', title: 'Affected Campaigns / Items', type: 'array', of: [{ type: 'string' }] }),
            defineField({ name: 'decision', title: 'Decision', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'trigger', subtitle: 'decisionDate' } },
        },
      ],
    }),
    defineField({
      name: 'generatedCampaigns',
      title: 'Generated Campaigns',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingCampaign' }] }],
    }),
    defineField({
      name: 'generatedFunnels',
      title: 'Generated Funnels',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingFunnel' }] }],
    }),
    defineField({
      name: 'generatedCalendarItems',
      title: 'Generated Calendar Items',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingCalendarItem' }] }],
    }),
    defineField({
      name: 'generatedLinkItems',
      title: 'Generated Quick Links',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingLinkItem' }] }],
    }),
    defineField({
      name: 'generatedAnalyticsSources',
      title: 'Generated Analytics Sources',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }],
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      rows: 5,
      group: 'generated',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      cadence: 'releaseCadence',
    },
    prepare({ title, status, cadence }) {
      const statusLabel = researchPlanStatusOptions.find((option) => option.value === status)?.title || 'Draft'
      const cadenceLabel = researchPlanCadenceOptions.find((option) => option.value === cadence)?.title

      return {
        title: `${statusLabel}: ${title || 'Untitled research plan'}`,
        subtitle: cadenceLabel,
      }
    },
  },
})

export {
  collaborationRelationshipOptions,
  collaborationStatusOptions,
  contentFormatOptions,
  contributionTypeOptions,
  opportunityReadinessOptions,
  researchConfidenceOptions,
  researchEvidenceTypeOptions,
  researchMethodOptions,
  researchPlanCadenceOptions,
  researchPlanStatusOptions,
  researchPriorityOptions,
}
