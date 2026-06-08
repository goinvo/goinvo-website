import { defineField, defineType } from 'sanity'

const trackingRuleStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]

const trackingValueFields = [
  defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'value',
    title: 'Allowed Value',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'whenToUse',
    title: 'When To Use',
    type: 'text',
    rows: 2,
  }),
]

export default defineType({
  name: 'marketingTrackingRule',
  title: 'Marketing Tracking Rule',
  type: 'document',
  groups: [
    { name: 'rules', title: 'Rules', default: true },
    { name: 'examples', title: 'Examples' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Rule Name',
      type: 'string',
      group: 'rules',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'rules',
      options: { list: trackingRuleStatusOptions, layout: 'radio' },
      initialValue: 'active',
    }),
    defineField({
      name: 'utmSourceRule',
      title: 'UTM Source Rule',
      type: 'text',
      rows: 2,
      group: 'rules',
      description: 'How to choose utm_source.',
    }),
    defineField({
      name: 'utmMediumRule',
      title: 'UTM Medium Rule',
      type: 'text',
      rows: 2,
      group: 'rules',
      description: 'How to choose utm_medium.',
    }),
    defineField({
      name: 'utmCampaignPattern',
      title: 'UTM Campaign Pattern',
      type: 'string',
      group: 'rules',
      description: 'Example: lowercase-hyphenated-campaign-name.',
    }),
    defineField({
      name: 'utmContentPattern',
      title: 'UTM Content Pattern',
      type: 'string',
      group: 'rules',
      description: 'Example: channel-format-angle-date.',
    }),
    defineField({
      name: 'allowedSources',
      title: 'Allowed Source Values',
      type: 'array',
      group: 'rules',
      of: [
        {
          name: 'trackingValue',
          title: 'Allowed Source',
          type: 'object',
          fields: trackingValueFields,
          preview: { select: { title: 'value', subtitle: 'whenToUse' } },
        },
      ],
    }),
    defineField({
      name: 'allowedMediums',
      title: 'Allowed Medium Values',
      type: 'array',
      group: 'rules',
      of: [
        {
          name: 'trackingValue',
          title: 'Allowed Medium',
          type: 'object',
          fields: trackingValueFields,
          preview: { select: { title: 'value', subtitle: 'whenToUse' } },
        },
      ],
    }),
    defineField({
      name: 'examples',
      title: 'Examples',
      type: 'array',
      group: 'examples',
      of: [
        {
          name: 'trackingExample',
          title: 'Tracking Example',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'url', title: 'Example URL', type: 'url' }),
            defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        },
      ],
    }),
    defineField({
      name: 'notes',
      title: 'Designer Notes',
      type: 'text',
      rows: 4,
      group: 'examples',
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', pattern: 'utmCampaignPattern' },
    prepare({ title, status, pattern }) {
      return {
        title: title || 'Untitled tracking rule',
        subtitle: [status || 'active', pattern].filter(Boolean).join(' / '),
      }
    },
  },
})

export { trackingRuleStatusOptions, trackingValueFields }
