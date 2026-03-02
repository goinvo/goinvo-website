import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'homepageHeader',
  title: 'Homepage Header',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Large heading shown in the homepage hero',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 3,
      description: 'Supporting text displayed below the title',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Background image for the hero slide. Recommended: 1920×800 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Where clicking the hero navigates to (e.g. "/work/hgraph" or a full URL)',
      validation: (Rule) => Rule.uri({ allowRelative: true }),
    }),
    defineField({
      name: 'order',
      title: 'Sort Order',
      type: 'number',
      description: 'Carousel position (lower numbers appear first)',
    }),
  ],
  orderings: [
    {
      title: 'Sort Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
    },
  },
})
