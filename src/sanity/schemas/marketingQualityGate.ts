import { defineField, defineType } from 'sanity'

const qualityGateStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]

const qualityGateCheckFields = [
  defineField({
    name: 'label',
    title: 'Check',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'category',
    title: 'Category',
    type: 'string',
    options: {
      list: [
        { title: 'Source Safety', value: 'sourceSafety' },
        { title: 'Claims', value: 'claims' },
        { title: 'Accessibility', value: 'accessibility' },
        { title: 'CTA', value: 'cta' },
        { title: 'UTM', value: 'utm' },
        { title: 'Alt Text', value: 'altText' },
        { title: 'Review Readiness', value: 'reviewReadiness' },
      ],
    },
  }),
  defineField({
    name: 'guidance',
    title: 'Guidance',
    type: 'text',
    rows: 2,
  }),
  defineField({
    name: 'required',
    title: 'Required',
    type: 'boolean',
    initialValue: false,
    description: 'V1 warns and guides; required checks are advisory until GoInvo decides to hard-block publishing.',
  }),
]

export default defineType({
  name: 'marketingQualityGate',
  title: 'Marketing Quality Gate',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Quality Gate Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: qualityGateStatusOptions, layout: 'radio' },
      initialValue: 'active',
    }),
    defineField({
      name: 'whenToUse',
      title: 'When To Use',
      type: 'text',
      rows: 3,
      description: 'Plain-language guidance for designers choosing the right checklist.',
    }),
    defineField({
      name: 'checks',
      title: 'Checklist',
      type: 'array',
      of: [
        {
          name: 'qualityGateCheck',
          title: 'Quality Gate Check',
          type: 'object',
          fields: qualityGateCheckFields,
          preview: { select: { title: 'label', subtitle: 'category' } },
        },
      ],
      validation: (Rule) => Rule.min(1).warning('Add at least one check so this gate can guide review.'),
    }),
    defineField({
      name: 'notes',
      title: 'Designer Notes',
      type: 'text',
      rows: 4,
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', whenToUse: 'whenToUse' },
    prepare({ title, status, whenToUse }) {
      return {
        title: title || 'Untitled quality gate',
        subtitle: [status || 'active', whenToUse].filter(Boolean).join(' / '),
      }
    },
  },
})

export { qualityGateCheckFields, qualityGateStatusOptions }
