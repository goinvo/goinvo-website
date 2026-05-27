import { defineField, defineType } from 'sanity'
import { researchMethodOptions } from './marketingResearchPlan'

const researchRunStatusOptions = [
  { title: 'Queued', value: 'queued' },
  { title: 'Running', value: 'running' },
  { title: 'Complete', value: 'complete' },
  { title: 'Partial', value: 'partial' },
  { title: 'Failed', value: 'failed' },
]

const researchRunProviderOptions = [
  { title: 'Semrush', value: 'semrush' },
  { title: 'CMS / Site Context', value: 'cms' },
  { title: 'Source Scan', value: 'sourceScan' },
  { title: 'Analytics Review', value: 'analytics' },
  { title: 'AI Assistant', value: 'ai' },
  { title: 'Manual', value: 'manual' },
]

export default defineType({
  name: 'marketingResearchRun',
  title: 'Marketing Research Run',
  type: 'document',
  groups: [
    { name: 'run', title: 'Run', default: true },
    { name: 'inputs', title: 'Inputs' },
    { name: 'outputs', title: 'Outputs' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Run Title',
      type: 'string',
      group: 'run',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'project',
      title: 'Research Project',
      type: 'reference',
      group: 'run',
      to: [{ type: 'marketingResearchProject' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      group: 'run',
      options: { list: researchRunProviderOptions },
      initialValue: 'semrush',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'run',
      options: { list: researchRunStatusOptions, layout: 'radio' },
      initialValue: 'queued',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime',
      group: 'run',
    }),
    defineField({
      name: 'completedAt',
      title: 'Completed At',
      type: 'datetime',
      group: 'run',
    }),
    defineField({
      name: 'methods',
      title: 'Methods',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'string', options: { list: researchMethodOptions } }],
    }),
    defineField({
      name: 'seedKeywords',
      title: 'Seed Keywords',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'seedUrls',
      title: 'Seed URLs',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'url' }],
    }),
    defineField({
      name: 'database',
      title: 'Provider Database',
      type: 'string',
      group: 'inputs',
      initialValue: 'us',
    }),
    defineField({
      name: 'rawInput',
      title: 'Raw Input',
      type: 'text',
      rows: 4,
      group: 'inputs',
    }),
    defineField({
      name: 'createdResults',
      title: 'Created Results',
      type: 'array',
      group: 'outputs',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
    }),
    defineField({
      name: 'warnings',
      title: 'Warnings',
      type: 'array',
      group: 'outputs',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'errors',
      title: 'Errors',
      type: 'array',
      group: 'outputs',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'rawOutputSummary',
      title: 'Raw Output Summary',
      type: 'text',
      rows: 4,
      group: 'outputs',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      provider: 'provider',
      startedAt: 'startedAt',
    },
    prepare({ title, status, provider, startedAt }) {
      const statusLabel = researchRunStatusOptions.find((option) => option.value === status)?.title || 'Queued'
      const providerLabel = researchRunProviderOptions.find((option) => option.value === provider)?.title || provider
      return {
        title: `${statusLabel}: ${title || 'Research run'}`,
        subtitle: [providerLabel, startedAt].filter(Boolean).join(' / '),
      }
    },
  },
  orderings: [
    {
      title: 'Started, newest first',
      name: 'startedDesc',
      by: [{ field: 'startedAt', direction: 'desc' }],
    },
  ],
})

export { researchRunProviderOptions, researchRunStatusOptions }
