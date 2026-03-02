import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The case study headline shown on the listing card and page header',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL path segment (e.g. "hgraph" → /work/hgraph). Click Generate.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      description: 'Client or partner name shown beneath the title',
    }),
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      description: 'Primary image used on the card and page hero. Recommended: 1600×900 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on the listing card (1-2 sentences)',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      description: 'Tag this case study with one or more categories for filtering',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      description: 'Full case study body — use headings, images, columns, and quotes',
    }),
    defineField({
      name: 'results',
      title: 'Results',
      type: 'array',
      description: 'Key outcomes displayed in a stats banner (e.g. "40%" / "reduction in errors")',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'stat', title: 'Statistic', type: 'string', description: 'The number or metric (e.g. "40%", "3x")' },
            { name: 'description', title: 'Description', type: 'string', description: 'What the stat represents' },
          ],
        },
      ],
    }),
    defineField({
      name: 'references',
      title: 'References',
      type: 'array',
      description: 'Sources, articles, or related links shown at the bottom',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'string', description: 'Display text for the link' },
            { name: 'link', title: 'URL', type: 'url', description: 'Full URL to the reference' },
          ],
        },
      ],
    }),
    defineField({
      name: 'upNext',
      title: 'Up Next',
      type: 'array',
      description: 'Related case studies shown at the bottom of the page',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    defineField({
      name: 'hidden',
      title: 'Hidden',
      type: 'boolean',
      description: 'Hide this case study from the /work listing (it can still be accessed by URL)',
      initialValue: false,
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'SEO description for search engines (max ~160 characters)',
    }),
    defineField({
      name: 'order',
      title: 'Sort Order',
      type: 'number',
      description: 'Display position on the /work page (lower numbers appear first)',
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
      subtitle: 'client',
      media: 'image',
    },
  },
})
