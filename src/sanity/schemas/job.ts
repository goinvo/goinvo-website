import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'job',
  title: 'Job',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Job title (e.g. "Senior UX Designer")',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'portableText',
      description: 'Full job description including responsibilities and requirements',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Office location or "Remote" (e.g. "Arlington, MA")',
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      description: 'Employment type',
      options: {
        list: [
          { title: 'Full-time', value: 'full-time' },
          { title: 'Part-time', value: 'part-time' },
          { title: 'Contract', value: 'contract' },
          { title: 'Internship', value: 'internship' },
        ],
      },
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      description: 'Uncheck to remove from the Careers page without deleting',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'type',
    },
  },
})
