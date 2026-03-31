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
      name: 'heading',
      title: 'Page Heading',
      type: 'string',
      description: 'Override title for the page h1 (defaults to title if empty)',
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
      description: 'Primary image used on the card and page hero. Recommended: 1600×900 px. The hotspot (crosshair) marks the focal point that stays visible when cropped for cards or mobile.',
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
      name: 'authors',
      title: 'Authors',
      type: 'array',
      description: 'Team members who authored this case study',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      description: 'Full case study body — use headings, images, columns, and quotes',
    }),
    defineField({
      name: 'upNext',
      title: 'Up Next',
      type: 'array',
      description: 'Related case studies shown at the bottom of the page',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    defineField({
      name: 'time',
      title: 'Time',
      type: 'string',
      description: 'Project duration (e.g. "1.5 designers for 6 months")',
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
