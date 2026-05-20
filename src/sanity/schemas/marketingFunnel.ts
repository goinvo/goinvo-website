import { defineField, defineType } from 'sanity'
import { targetSiteFields } from './marketingCampaign'

const funnelStatusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Active', value: 'active' },
  { title: 'Optimizing', value: 'optimizing' },
  { title: 'Paused', value: 'paused' },
  { title: 'Archived', value: 'archived' },
]

const funnelStageOptions = [
  { title: 'Awareness', value: 'awareness' },
  { title: 'Interest', value: 'interest' },
  { title: 'Consideration', value: 'consideration' },
  { title: 'Conversion', value: 'conversion' },
  { title: 'Retention', value: 'retention' },
  { title: 'Advocacy', value: 'advocacy' },
]

export default defineType({
  name: 'marketingFunnel',
  title: 'Marketing Funnel',
  type: 'document',
  groups: [
    { name: 'strategy', title: 'Strategy', default: true },
    { name: 'stages', title: 'Stages' },
    { name: 'measurement', title: 'Measurement' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Funnel Name',
      type: 'string',
      group: 'strategy',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'strategy',
      options: { list: funnelStatusOptions, layout: 'radio' },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'text',
      rows: 3,
      group: 'strategy',
    }),
    defineField({
      name: 'conversionGoal',
      title: 'Conversion Goal',
      type: 'text',
      rows: 3,
      group: 'strategy',
      description: 'What a successful visitor action looks like.',
    }),
    defineField({
      name: 'targetSites',
      title: 'Target Sites',
      type: 'array',
      group: 'strategy',
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
      name: 'stages',
      title: 'Funnel Stages',
      type: 'array',
      group: 'stages',
      of: [
        {
          name: 'funnelStage',
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
            defineField({
              name: 'goal',
              title: 'Stage Goal',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'offer',
              title: 'Offer / Hook',
              type: 'string',
            }),
            defineField({
              name: 'callToAction',
              title: 'Call to Action',
              type: 'string',
            }),
            defineField({
              name: 'destinationUrl',
              title: 'Destination URL',
              type: 'url',
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'array',
              of: [
                {
                  type: 'reference',
                  to: [
                    { type: 'feature' },
                    { type: 'caseStudy' },
                    { type: 'marketingCalendarItem' },
                  ],
                },
              ],
            }),
            defineField({
              name: 'metrics',
              title: 'Metrics',
              type: 'array',
              of: [{ type: 'string' }],
            }),
          ],
          preview: {
            select: {
              stage: 'stage',
              goal: 'goal',
              callToAction: 'callToAction',
            },
            prepare({ stage, goal, callToAction }) {
              const stageLabel = funnelStageOptions.find((option) => option.value === stage)?.title || 'Stage'
              return {
                title: stageLabel,
                subtitle: callToAction || goal,
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.min(1).warning('Add at least one funnel stage so this can be used operationally.'),
    }),
    defineField({
      name: 'analyticsSources',
      title: 'Analytics Sources',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }],
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 5,
      group: 'strategy',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      audience: 'audience',
    },
    prepare({ title, status, audience }) {
      const statusLabel = funnelStatusOptions.find((option) => option.value === status)?.title || 'Draft'

      return {
        title: `${statusLabel}: ${title || 'Untitled funnel'}`,
        subtitle: audience,
      }
    },
  },
})

export { funnelStageOptions, funnelStatusOptions }
