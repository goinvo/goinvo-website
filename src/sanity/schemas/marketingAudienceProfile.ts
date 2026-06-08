import { defineField, defineType } from 'sanity'

const marketingAudiencePriorityOptions = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Niche / Experimental', value: 'niche' },
  { title: 'Paused', value: 'paused' },
]

export default defineType({
  name: 'marketingAudienceProfile',
  title: 'Marketing Audience Profile',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'motivation', title: 'Motivation' },
    { name: 'action', title: 'Action' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Audience Name',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      group: 'overview',
      options: { list: marketingAudiencePriorityOptions, layout: 'radio' },
      initialValue: 'secondary',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Who They Are',
      type: 'text',
      rows: 3,
      group: 'overview',
      description: 'Plain-language description designers can recognize when making content.',
    }),
    defineField({
      name: 'needs',
      title: 'Needs',
      type: 'array',
      group: 'motivation',
      of: [{ type: 'string' }],
      description: 'What this audience is trying to understand, decide, or do.',
    }),
    defineField({
      name: 'pains',
      title: 'Pains',
      type: 'array',
      group: 'motivation',
      of: [{ type: 'string' }],
      description: 'Problems, blockers, or frustrations content should acknowledge.',
    }),
    defineField({
      name: 'misconceptions',
      title: 'Misconceptions',
      type: 'array',
      group: 'motivation',
      of: [{ type: 'string' }],
      description: 'Assumptions this audience may bring that content should gently correct.',
    }),
    defineField({
      name: 'trustTriggers',
      title: 'Trust Triggers',
      type: 'array',
      group: 'motivation',
      of: [{ type: 'string' }],
      description: 'Signals that make this audience believe GoInvo is credible.',
    }),
    defineField({
      name: 'desiredActions',
      title: 'Desired Actions',
      type: 'array',
      group: 'action',
      of: [{ type: 'string' }],
      description: 'Actions this audience should be comfortable taking after good content.',
    }),
    defineField({
      name: 'objections',
      title: 'Objections',
      type: 'array',
      group: 'action',
      of: [{ type: 'string' }],
      description: 'Reasons this audience might not click, share, contact, or keep reading.',
    }),
    defineField({
      name: 'notes',
      title: 'Designer Notes',
      type: 'text',
      rows: 4,
      group: 'action',
    }),
  ],
  preview: {
    select: { title: 'title', priority: 'priority', audience: 'audience' },
    prepare({ title, priority, audience }) {
      const priorityLabel = marketingAudiencePriorityOptions.find((option) => option.value === priority)?.title || 'Secondary'
      return {
        title: title || 'Untitled audience',
        subtitle: [priorityLabel, audience].filter(Boolean).join(' / '),
      }
    },
  },
  orderings: [
    {
      title: 'Priority',
      name: 'priority',
      by: [{ field: 'priority', direction: 'asc' }],
    },
  ],
})

export { marketingAudiencePriorityOptions }
