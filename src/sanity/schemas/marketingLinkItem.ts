import { defineField, defineType } from 'sanity'

const linkItemStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]

const linkItemTypeOptions = [
  { title: 'Site', value: 'site' },
  { title: 'Article', value: 'article' },
  { title: 'Case Study', value: 'caseStudy' },
  { title: 'Campaign', value: 'campaign' },
  { title: 'Project', value: 'project' },
  { title: 'Event', value: 'event' },
  { title: 'Other', value: 'other' },
]

export default defineType({
  name: 'marketingLinkItem',
  title: 'Quick Link Item',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'automation', title: 'Automation' },
    { name: 'relationships', title: 'Relationships' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      group: 'content',
      options: { list: linkItemTypeOptions },
      initialValue: 'site',
    }),
    defineField({
      name: 'image',
      title: 'Thumbnail',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'automation',
      options: { list: linkItemStatusOptions, layout: 'radio' },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'automation',
      initialValue: false,
      description: 'Featured links render larger on the public link page.',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      group: 'automation',
      initialValue: 100,
      description: 'Lower numbers appear first.',
    }),
    defineField({
      name: 'publishAt',
      title: 'Show Starting',
      type: 'datetime',
      group: 'automation',
      description: 'Optional. Leave blank to show as soon as the item is active.',
    }),
    defineField({
      name: 'expiresAt',
      title: 'Hide After',
      type: 'datetime',
      group: 'automation',
      description: 'Optional. Useful for event or launch links.',
    }),
    defineField({
      name: 'sourceChannel',
      title: 'Promoted From',
      type: 'string',
      group: 'relationships',
      description: 'Optional. Where people are expected to find this link, such as instagram or linkedin. Leave blank for evergreen /links items.',
    }),
    defineField({
      name: 'campaign',
      title: 'Campaign',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({
      name: 'calendarItem',
      title: 'Calendar Item',
      type: 'reference',
      group: 'relationships',
      to: [{ type: 'marketingCalendarItem' }],
      description: 'Connects the link to the social post or content plan that created it.',
    }),
    defineField({
      name: 'calendarItems',
      title: 'Associated Posts',
      type: 'array',
      group: 'relationships',
      description: 'Posts that should surface this link when they are published.',
      of: [{ type: 'reference', to: [{ type: 'marketingCalendarItem' }] }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      url: 'url',
      media: 'image',
    },
    prepare({ title, status, url, media }) {
      const statusLabel = linkItemStatusOptions.find((option) => option.value === status)?.title || 'Active'

      return {
        title: `${statusLabel}: ${title || 'Untitled link'}`,
        subtitle: url,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Display order',
      name: 'displayOrder',
      by: [
        { field: 'order', direction: 'asc' },
        { field: '_updatedAt', direction: 'desc' },
      ],
    },
  ],
})

export { linkItemStatusOptions, linkItemTypeOptions }
