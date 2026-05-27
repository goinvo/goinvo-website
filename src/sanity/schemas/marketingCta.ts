import { defineField, defineType } from 'sanity'
import { funnelStageOptions } from './marketingFunnel'

const ctaPriorityOptions = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Contextual', value: 'contextual' },
  { title: 'Experimental', value: 'experimental' },
]

export default defineType({
  name: 'marketingCta',
  title: 'Marketing CTA',
  type: 'document',
  groups: [
    { name: 'cta', title: 'CTA', default: true },
    { name: 'fit', title: 'Audience / Measurement Fit' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'CTA Name',
      type: 'string',
      group: 'cta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'CTA Label',
      type: 'string',
      group: 'cta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'funnelStage',
      title: 'Funnel Stage',
      type: 'string',
      group: 'cta',
      options: { list: funnelStageOptions },
      description: 'Where this CTA belongs in the audience journey.',
    }),
    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'url',
      group: 'cta',
    }),
    defineField({
      name: 'successSignal',
      title: 'Success Signal',
      type: 'string',
      group: 'fit',
      description: 'The behavior or metric that says this CTA did its job.',
    }),
    defineField({
      name: 'audiences',
      title: 'Audience Fit',
      type: 'array',
      group: 'fit',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      group: 'fit',
      options: { list: ctaPriorityOptions, layout: 'radio' },
      initialValue: 'contextual',
    }),
    defineField({
      name: 'notes',
      title: 'Designer Notes',
      type: 'text',
      rows: 4,
      group: 'fit',
    }),
  ],
  preview: {
    select: { title: 'title', label: 'label', funnelStage: 'funnelStage' },
    prepare({ title, label, funnelStage }) {
      return {
        title: title || label || 'Untitled CTA',
        subtitle: [label, funnelStage].filter(Boolean).join(' / '),
      }
    },
  },
})

export { ctaPriorityOptions }
