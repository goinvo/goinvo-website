import { defineField, defineType } from 'sanity'

const experimentStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Running', value: 'running' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Decided', value: 'decided' },
  { title: 'Archived', value: 'archived' },
]

const experimentDecisionOptions = [
  { title: 'Keep', value: 'keep' },
  { title: 'Iterate', value: 'iterate' },
  { title: 'Stop', value: 'stop' },
  { title: 'Inconclusive', value: 'inconclusive' },
]

export default defineType({
  name: 'marketingExperiment',
  title: 'Marketing Experiment',
  type: 'document',
  groups: [
    { name: 'hypothesis', title: 'Hypothesis', default: true },
    { name: 'result', title: 'Result' },
    { name: 'relationships', title: 'Relationships' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Experiment Name',
      type: 'string',
      group: 'hypothesis',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'hypothesis',
      options: { list: experimentStatusOptions, layout: 'radio' },
      initialValue: 'idea',
    }),
    defineField({
      name: 'hypothesis',
      title: 'Hypothesis',
      type: 'text',
      rows: 4,
      group: 'hypothesis',
      description: 'If we change X, we expect Y because Z.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'expectedSignal',
      title: 'Expected Signal',
      type: 'string',
      group: 'hypothesis',
      description: 'What would suggest the hypothesis is working.',
    }),
    defineField({
      name: 'campaign',
      title: 'Linked Campaign',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({
      name: 'calendarItem',
      title: 'Linked Calendar Item',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCalendarItem' }],
    }),
    defineField({
      name: 'performanceSignals',
      title: 'Performance Signals',
      type: 'array',
      group: 'result',
      of: [{ type: 'reference', to: [{ type: 'marketingPerformanceSignal' }] }],
    }),
    defineField({
      name: 'result',
      title: 'Result',
      type: 'text',
      rows: 4,
      group: 'result',
    }),
    defineField({
      name: 'decision',
      title: 'Decision',
      type: 'string',
      group: 'result',
      options: { list: experimentDecisionOptions },
    }),
    defineField({
      name: 'decisionDate',
      title: 'Decision Date',
      type: 'date',
      group: 'result',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 4,
      group: 'result',
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', decision: 'decision' },
    prepare({ title, status, decision }) {
      return {
        title: title || 'Untitled experiment',
        subtitle: [status || 'idea', decision].filter(Boolean).join(' / '),
      }
    },
  },
})

export { experimentDecisionOptions, experimentStatusOptions }
