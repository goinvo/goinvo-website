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

const experimentTargetTypeOptions = [
  { title: 'Homepage', value: 'homepage' },
  { title: 'Vision Article', value: 'vision' },
  { title: 'Other Page', value: 'page' },
]

const experimentMetricSourceOptions = [
  { title: 'GA4 Event', value: 'ga4Event' },
  { title: 'Vercel Analytics Event', value: 'vercelEvent' },
  { title: 'Manual Readout', value: 'manual' },
  { title: 'Other', value: 'other' },
]

const experimentTrackerTypeOptions = [
  { title: 'Metric Rule', value: 'metricRule' },
  { title: 'Boolean Check', value: 'boolean' },
  { title: 'Composite Rule', value: 'composite' },
]

const experimentTrackerConditionOptions = [
  { title: 'Increase', value: 'increase' },
  { title: 'Decrease', value: 'decrease' },
  { title: 'Does Not Decrease', value: 'notDecrease' },
  { title: 'At Least Threshold', value: 'atLeast' },
  { title: 'At Most Threshold', value: 'atMost' },
  { title: 'Equals Threshold', value: 'equals' },
  { title: 'Any Selected Metric Passes', value: 'any' },
  { title: 'All Selected Metrics Pass', value: 'all' },
  { title: 'Manual Yes/No', value: 'manual' },
]

const experimentMetricRoleOptions = [
  { title: 'Secondary', value: 'secondary' },
  { title: 'Guardrail', value: 'guardrail' },
  { title: 'Diagnostic', value: 'diagnostic' },
]

const experimentMetricComparisonOptions = [
  { title: 'Comparative (control vs variant)', value: 'comparative' },
  { title: 'Conceptual (single-variant capture)', value: 'conceptual' },
]

const experimentVariantFields = [
  defineField({
    name: 'key',
    title: 'Variant Key',
    type: 'string',
    description: 'Must match the Vercel flag option value. Include control for the default page.',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'notes',
    title: 'Variant Notes',
    type: 'text',
    rows: 2,
  }),
  defineField({
    name: 'previewUrl',
    title: 'Custom Preview Link',
    type: 'string',
    description: 'Optional relative or absolute URL to use when sharing a forced preview for this version. Leave blank to use the target path.',
  }),
]

const experimentMetricFields = [
  defineField({
    name: 'key',
    title: 'Metric Key',
    type: 'string',
    description: 'Stable key used by success trackers, such as qualifiedCtaClicks.',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'label',
    title: 'Metric',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'role',
    title: 'Role',
    type: 'string',
    options: { list: experimentMetricRoleOptions },
    initialValue: 'secondary',
    description: 'Secondary metrics add context, guardrails protect the primary metric, and diagnostics explain why behavior changed.',
  }),
  defineField({
    name: 'comparison',
    title: 'Metric Kind',
    type: 'string',
    options: { list: experimentMetricComparisonOptions, layout: 'radio' },
    initialValue: 'comparative',
    description: 'Comparative metrics need both the current page and the variant to have data, decide the winner, and keep the test "Measurement blocked" until both sides are measured. Conceptual metrics are captured for whichever version can fire them (for example discovery form starts that only exist on the concept page) — they show in the readout but never block measurement or pick a winner.',
  }),
  defineField({
    name: 'source',
    title: 'Source',
    type: 'string',
    options: { list: experimentMetricSourceOptions },
    initialValue: 'vercelEvent',
  }),
  defineField({
    name: 'eventName',
    title: 'Event Name',
    type: 'string',
    description: 'Specific analytics event to watch, such as qualified_discovery_call_click, view_work_click, or discovery_form_start. Avoid the broad experiment_conversion event so control vs variant stays comparable.',
  }),
  defineField({
    name: 'unit',
    title: 'Unit',
    type: 'string',
  }),
  defineField({
    name: 'notes',
    title: 'Notes',
    type: 'text',
    rows: 2,
  }),
]

const experimentTrackerFields = [
  defineField({
    name: 'title',
    title: 'Tracker',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'trackerType',
    title: 'Tracker Type',
    type: 'string',
    options: { list: experimentTrackerTypeOptions },
    initialValue: 'metricRule',
  }),
  defineField({
    name: 'metricKeys',
    title: 'Metric Keys',
    type: 'array',
    of: [{ type: 'string' }],
    description: 'One or more metric keys this tracker evaluates.',
  }),
  defineField({
    name: 'condition',
    title: 'Condition',
    type: 'string',
    options: { list: experimentTrackerConditionOptions },
    initialValue: 'increase',
  }),
  defineField({
    name: 'threshold',
    title: 'Threshold',
    type: 'number',
    description: 'Optional numeric target for threshold conditions.',
  }),
  defineField({
    name: 'successWhen',
    title: 'Success When',
    type: 'text',
    rows: 2,
    description: 'Plain-language boolean or decision rule.',
  }),
  defineField({
    name: 'notes',
    title: 'Notes',
    type: 'text',
    rows: 2,
  }),
]

export default defineType({
  name: 'marketingExperiment',
  title: 'Marketing Experiment',
  type: 'document',
  groups: [
    { name: 'hypothesis', title: 'Hypothesis', default: true },
    { name: 'pageTest', title: 'Page Test' },
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
      name: 'measurementStart',
      title: 'Measuring Since',
      type: 'datetime',
      group: 'pageTest',
      description:
        'The moment the current measurement window began. Set (or reset) this when tracking changes — e.g. a new conversion event ships — and reset the first-party counters at the same time, so every metric compares variants over the same window instead of mixing lifetime clicks with day-old events.',
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
      name: 'targetType',
      title: 'Target Type',
      type: 'string',
      group: 'pageTest',
      options: { list: experimentTargetTypeOptions, layout: 'radio' },
      description: 'What kind of page this experiment changes.',
    }),
    defineField({
      name: 'targetPath',
      title: 'Target Path',
      type: 'string',
      group: 'pageTest',
      description: 'Public path tested by the flag, such as / or /vision/determinants-of-health.',
    }),
    defineField({
      name: 'targetFeature',
      title: 'Target Vision Article',
      type: 'reference',
      group: 'pageTest',
      to: [{ type: 'feature' }],
      hidden: ({ document }) => document?.targetType !== 'vision',
    }),
    defineField({
      name: 'flagKey',
      title: 'Vercel Flag Key',
      type: 'string',
      group: 'pageTest',
      description: 'The code/Vercel flag key that assigns traffic, such as home-2026-variant.',
    }),
    defineField({
      name: 'variants',
      title: 'Variants',
      type: 'array',
      group: 'pageTest',
      of: [
        {
          name: 'experimentVariant',
          title: 'Experiment Variant',
          type: 'object',
          fields: experimentVariantFields,
          preview: { select: { title: 'label', subtitle: 'key' } },
        },
      ],
      validation: (Rule) =>
        Rule.custom((variants) => {
          if (!Array.isArray(variants) || variants.length === 0) return true
          return (variants as Array<{ key?: string }>).some((variant) => variant.key === 'control')
            ? true
            : 'Include a control variant so reports have a stable baseline.'
        }).warning(),
    }),
    defineField({
      name: 'primaryMetric',
      title: 'Primary Metric',
      type: 'string',
      group: 'pageTest',
      description: 'The main metric this test should optimize, such as qualified CTA clicks.',
    }),
    defineField({
      name: 'trackedMetrics',
      title: 'Metrics',
      type: 'array',
      group: 'pageTest',
      of: [
        {
          name: 'experimentMetric',
          title: 'Experiment Metric',
          type: 'object',
          fields: experimentMetricFields,
          preview: { select: { title: 'label', subtitle: 'key' } },
        },
      ],
      description: 'Metrics that can be watched by one or more success trackers.',
    }),
    defineField({
      name: 'successTrackers',
      title: 'Success Trackers',
      type: 'array',
      group: 'pageTest',
      of: [
        {
          name: 'experimentSuccessTracker',
          title: 'Success Tracker',
          type: 'object',
          fields: experimentTrackerFields,
          preview: { select: { title: 'title', subtitle: 'condition' } },
        },
      ],
      description: 'Boolean, metric-based, or composite rules for deciding whether the test succeeded.',
    }),
    defineField({
      name: 'analyticsSource',
      title: 'Analytics Source',
      type: 'reference',
      group: 'pageTest',
      to: [{ type: 'marketingAnalyticsSource' }],
    }),
    defineField({
      name: 'qaNotes',
      title: 'QA Notes',
      type: 'text',
      rows: 3,
      group: 'pageTest',
      description: 'Visual checks, launch caveats, or browser/device notes before traffic is split.',
    }),
    defineField({
      name: 'rolloutStart',
      title: 'Rollout Start',
      type: 'datetime',
      group: 'pageTest',
    }),
    defineField({
      name: 'rolloutEnd',
      title: 'Rollout End',
      type: 'datetime',
      group: 'pageTest',
    }),
    defineField({
      name: 'vercelDashboardUrl',
      title: 'Vercel Dashboard URL',
      type: 'url',
      group: 'pageTest',
      description: 'Direct link to the flag or experiment in Vercel.',
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

export {
  experimentDecisionOptions,
  experimentStatusOptions,
  experimentTargetTypeOptions,
  experimentVariantFields,
}
