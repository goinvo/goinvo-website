import { defineField, defineType } from 'sanity'
import { campaignObjectiveOptions, searchIntentOptions } from './marketingCampaign'
import { funnelStageOptions } from './marketingFunnel'

const marketingTemplateKindOptions = [
  { title: 'Campaign', value: 'campaign' },
  { title: 'Funnel', value: 'funnel' },
]

const marketingTemplateStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]

export default defineType({
  name: 'marketingTemplate',
  title: 'Marketing Template',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'campaign', title: 'Campaign' },
    { name: 'funnel', title: 'Funnel' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Template Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Template Type',
      type: 'string',
      group: 'overview',
      options: { list: marketingTemplateKindOptions, layout: 'radio' },
      initialValue: 'campaign',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'overview',
      options: { list: marketingTemplateStatusOptions, layout: 'radio' },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      group: 'overview',
    }),
    defineField({
      name: 'whenToUse',
      title: 'When to Use',
      type: 'text',
      rows: 3,
      group: 'overview',
      description: 'Plain-language guidance so designers can pick the right template without marketing expertise.',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      group: 'overview',
      initialValue: 100,
      description: 'Lower numbers appear first in template pickers.',
    }),
    defineField({
      name: 'campaignObjective',
      title: 'Campaign Objective',
      type: 'string',
      group: 'campaign',
      options: { list: campaignObjectiveOptions },
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'primaryGoal',
      title: 'Primary Goal',
      type: 'text',
      rows: 3,
      group: 'campaign',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'primaryKpi',
      title: 'Primary KPI',
      type: 'string',
      group: 'campaign',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'text',
      rows: 3,
      group: 'campaign',
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic / Keyword Cluster',
      type: 'string',
      group: 'campaign',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'searchIntent',
      title: 'Search Intent',
      type: 'string',
      group: 'campaign',
      options: { list: searchIntentOptions },
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'targetQueries',
      title: 'Target Queries',
      type: 'array',
      group: 'campaign',
      of: [{ type: 'string' }],
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'positioning',
      title: 'Positioning',
      type: 'text',
      rows: 4,
      group: 'campaign',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'channels',
      title: 'Starter Channel Keys',
      type: 'array',
      group: 'campaign',
      of: [{ type: 'string' }],
      description: 'Use stable channel keys such as website, instagram, linkedin, or email.',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'successMetrics',
      title: 'Success Metrics',
      type: 'array',
      group: 'campaign',
      of: [
        {
          name: 'successMetric',
          title: 'Success Metric',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Metric', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'target', title: 'How to Judge It', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'target' },
          },
        },
      ],
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'designerGuidance',
      title: 'Designer Guidance',
      type: 'array',
      group: 'campaign',
      of: [{ type: 'string' }],
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 4,
      group: 'campaign',
      hidden: ({ document }) => document?.kind !== 'campaign',
    }),
    defineField({
      name: 'conversionGoal',
      title: 'Conversion Goal',
      type: 'text',
      rows: 3,
      group: 'funnel',
      hidden: ({ document }) => document?.kind !== 'funnel',
    }),
    defineField({
      name: 'stages',
      title: 'Stages',
      type: 'array',
      group: 'funnel',
      hidden: ({ document }) => document?.kind !== 'funnel',
      of: [
        {
          name: 'templateFunnelStage',
          title: 'Funnel Stage',
          type: 'object',
          fields: [
            defineField({
              name: 'stage',
              title: 'Stage',
              type: 'string',
              options: { list: funnelStageOptions },
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'goal', title: 'Goal', type: 'text', rows: 2 }),
            defineField({ name: 'offer', title: 'Offer', type: 'string' }),
            defineField({ name: 'callToAction', title: 'Call to Action', type: 'string' }),
            defineField({ name: 'destinationUrl', title: 'Destination URL', type: 'url' }),
            defineField({ name: 'metrics', title: 'Metrics', type: 'array', of: [{ type: 'string' }] }),
          ],
          preview: {
            select: { title: 'stage', subtitle: 'goal' },
            prepare({ title, subtitle }) {
              const label = funnelStageOptions.find((option) => option.value === title)?.title || title
              return { title: label || 'Funnel stage', subtitle }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      kind: 'kind',
      status: 'status',
    },
    prepare({ title, kind, status }) {
      const kindLabel = marketingTemplateKindOptions.find((option) => option.value === kind)?.title || 'Template'
      const statusLabel = marketingTemplateStatusOptions.find((option) => option.value === status)?.title || 'Active'

      return {
        title: title || `${kindLabel} template`,
        subtitle: `${kindLabel} - ${statusLabel}`,
      }
    },
  },
})

export { marketingTemplateKindOptions, marketingTemplateStatusOptions }
