import { defineField, defineType } from 'sanity'

const performanceProviderOptions = [
  { title: 'Google Search Console', value: 'gsc' },
  { title: 'GA4', value: 'ga4' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Vercel Analytics', value: 'vercel' },
  { title: 'Manual', value: 'manual' },
  { title: 'Other', value: 'other' },
]

const performanceSignalStatusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Reviewed', value: 'reviewed' },
  { title: 'Suggests Strategy Update', value: 'suggestsUpdate' },
  { title: 'Archived', value: 'archived' },
]

const performanceMetricFields = [
  defineField({
    name: 'label',
    title: 'Metric',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'value',
    title: 'Value',
    type: 'number',
  }),
  defineField({
    name: 'unit',
    title: 'Unit',
    type: 'string',
  }),
  defineField({
    name: 'change',
    title: 'Change',
    type: 'string',
    description: 'Example: +12% vs previous period.',
  }),
]

export default defineType({
  name: 'marketingPerformanceSignal',
  title: 'Marketing Performance Signal',
  type: 'document',
  groups: [
    { name: 'signal', title: 'Signal', default: true },
    { name: 'relationships', title: 'Relationships' },
    { name: 'interpretation', title: 'Interpretation' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Signal Name',
      type: 'string',
      group: 'signal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      group: 'signal',
      options: { list: performanceProviderOptions },
      initialValue: 'manual',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'signal',
      options: { list: performanceSignalStatusOptions, layout: 'radio' },
      initialValue: 'new',
    }),
    defineField({
      name: 'signalType',
      title: 'Signal Type',
      type: 'string',
      group: 'signal',
      description: 'Example: query, page, campaign, channel, quick-link, content item, conversion.',
    }),
    defineField({
      name: 'sourceLabel',
      title: 'Source Label',
      type: 'string',
      group: 'signal',
      description: 'Human-readable source, account, report, or import label.',
    }),
    defineField({
      name: 'query',
      title: 'Query',
      type: 'string',
      group: 'relationships',
    }),
    defineField({
      name: 'pageUrl',
      title: 'Page URL',
      type: 'url',
      group: 'relationships',
    }),
    defineField({
      name: 'campaign',
      title: 'Campaign',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingChannel' }],
    }),
    defineField({
      name: 'linkItem',
      title: 'Quick Link',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingLinkItem' }],
    }),
    defineField({
      name: 'calendarItem',
      title: 'Calendar Item',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCalendarItem' }],
    }),
    defineField({
      name: 'researchProject',
      title: 'Research Project',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingResearchProject' }],
    }),
    defineField({
      name: 'metricDate',
      title: 'Metric Date',
      type: 'date',
      group: 'signal',
    }),
    defineField({
      name: 'periodStart',
      title: 'Period Start',
      type: 'date',
      group: 'signal',
    }),
    defineField({
      name: 'periodEnd',
      title: 'Period End',
      type: 'date',
      group: 'signal',
    }),
    defineField({
      name: 'metrics',
      title: 'Metrics',
      type: 'array',
      group: 'signal',
      of: [
        {
          name: 'performanceMetric',
          title: 'Performance Metric',
          type: 'object',
          fields: performanceMetricFields,
          preview: { select: { title: 'label', subtitle: 'change' } },
        },
      ],
    }),
    defineField({
      name: 'interpretation',
      title: 'Interpretation',
      type: 'text',
      rows: 4,
      group: 'interpretation',
      description: 'What the signal means for strategy, research, content, or measurement.',
    }),
    defineField({
      name: 'recommendation',
      title: 'Recommended Action',
      type: 'text',
      rows: 3,
      group: 'interpretation',
    }),
    defineField({
      name: 'rawImport',
      title: 'Raw Import Data',
      type: 'text',
      rows: 5,
      group: 'interpretation',
      description: 'Optional pasted CSV row, report excerpt, or provider payload.',
    }),
  ],
  preview: {
    select: { title: 'title', provider: 'provider', status: 'status' },
    prepare({ title, provider, status }) {
      const providerLabel = performanceProviderOptions.find((option) => option.value === provider)?.title || 'Manual'
      return {
        title: title || 'Untitled performance signal',
        subtitle: [providerLabel, status || 'new'].filter(Boolean).join(' / '),
      }
    },
  },
  orderings: [
    {
      title: 'Metric date, newest first',
      name: 'metricDateDesc',
      by: [{ field: 'metricDate', direction: 'desc' }],
    },
  ],
})

export { performanceMetricFields, performanceProviderOptions, performanceSignalStatusOptions }
