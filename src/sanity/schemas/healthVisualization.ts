import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'healthVisualization',
  title: 'Health Visualization',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Preview Image',
      type: 'image',
      description: 'Poster preview image. Recommended: 800×600 px or larger.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 3,
      description: 'Short description of the visualization',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'string',
      description: 'Publication date (e.g. "Oct.2021")',
    }),
    defineField({
      name: 'downloadLink',
      title: 'Download Link',
      type: 'url',
      description: 'URL to the downloadable PDF',
      validation: (Rule) =>
        Rule.uri({ allowRelative: true, scheme: ['https', 'http'] }),
    }),
    defineField({
      name: 'learnMoreLink',
      title: 'Learn More Link',
      type: 'string',
      description: 'Link to a related feature or case study (relative path or full URL)',
    }),
    defineField({
      name: 'order',
      title: 'Sort Order',
      type: 'number',
      description: 'Display position (lower numbers appear first)',
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
      subtitle: 'date',
      media: 'image',
    },
  },
})
