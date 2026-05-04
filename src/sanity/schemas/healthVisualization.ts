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
      // Kept as string for backward-compat with existing entries that
      // store "Mar.2016", "Apr.2020", etc. The regex blocks future
      // editors from introducing different formats. A future migration
      // can flip this to type: 'date' and rewrite existing values.
      type: 'string',
      description:
        'Publication date in the format "MMM.YYYY", e.g. "Oct.2021". The first three letters of the month, then a period, then the four-digit year.',
      validation: (Rule) =>
        Rule.regex(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\d{4}$/, {
          name: 'MMM.YYYY format',
          invert: false,
        }).warning(
          'Use the format "MMM.YYYY" (e.g. "Oct.2021") so this date sorts and renders consistently across the site.',
        ),
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
