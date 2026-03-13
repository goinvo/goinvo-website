import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'feature',
  title: 'Feature',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Feature headline shown on the card and page header',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL path segment (e.g. "determinants-of-health" → /vision/determinants-of-health)',
      options: { source: 'title', maxLength: 96 },
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Hero/card image. Recommended: 1600×900 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'video',
      title: 'Video URL',
      type: 'url',
      description: 'CloudFront video URL for hero/listing card',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on the listing card (1-2 sentences)',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      description: 'Select one or more categories for filtering on the Work page',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Healthcare', value: 'healthcare' },
          { title: 'Enterprise', value: 'enterprise' },
          { title: 'Government', value: 'government' },
          { title: 'AI', value: 'AI' },
          { title: 'Open Source', value: 'open-source' },
          { title: 'Public Health & Policy', value: 'public-health-and-policy' },
          { title: 'Health IT & Infrastructure', value: 'health-it-and-infrastructure' },
          { title: 'Patient Engagement', value: 'patient-engagement' },
          { title: 'Care Management', value: 'care-management' },
          { title: 'Precision Medicine & Genomics', value: 'precision-medicine-and-genomics' },
        ],
      },
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'string',
      description: 'Display date (e.g. "Feb.2026")',
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      description: 'Client or partner name, if applicable',
    }),
    defineField({
      name: 'externalLink',
      title: 'External Link',
      type: 'url',
      description: 'If set, the listing card links to this URL instead of /vision/[slug]',
    }),
    defineField({
      name: 'hiddenWorkPage',
      title: 'Hidden on Work Page',
      type: 'boolean',
      description: 'Hide from the /work listing (still accessible at its direct URL)',
      initialValue: false,
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      description: 'Team members who authored this feature',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      description: 'Full page content for internal vision pages',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 2,
      description: 'SEO description for search engines (max ~160 characters)',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Display order (lower numbers first)',
    }),
  ],
  orderings: [
    {
      title: 'Date (Newest)',
      name: 'dateDesc',
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
