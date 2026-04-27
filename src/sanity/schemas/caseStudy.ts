import { defineField, defineType } from 'sanity'
import { orderRankField } from '@sanity/orderable-document-list'
import { CategoriesInput } from '../components/CategoriesInput'

export default defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  groups: [
    // Properties and Main Content map to the actual page; Advanced
    // Settings holds rare overrides. Field order within each group
    // follows the visual order on the rendered case study page so
    // editors can fill in the page top-to-bottom.
    { name: 'properties', title: 'Properties', default: true },
    { name: 'content', title: 'Main Content' },
    { name: 'advanced', title: 'Advanced Settings' },
  ],
  fields: [
    orderRankField({ type: 'caseStudy', newItemPosition: 'before' }),

    // --- Properties (visual order on the page) -----------------------
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'properties',
      description: 'The case study headline shown on the listing card and page header',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'properties',
      description: 'URL path segment (e.g. "hgraph" → /work/hgraph). Click Generate.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      group: 'properties',
      description: 'Primary image used on the card and page hero. Recommended: 1600×900 px. The hotspot (crosshair) marks the focal point that stays visible when cropped for cards or mobile.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      group: 'properties',
      description: 'Client or partner name shown beneath the title',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 3,
      group: 'properties',
      description: 'Short summary shown on the listing card (1-2 sentences)',
    }),
    defineField({
      name: 'time',
      title: 'Time',
      type: 'string',
      group: 'properties',
      description: 'Project duration (e.g. "1.5 designers for 6 months"). Rendered in the page metadata row.',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'properties',
      description:
        'Pick from the canonical list. Main Categories (Healthcare, Enterprise, Government, AI) drive the filter chips on /work. Additional categories (Patient Engagement, Open Source, etc.) just display on the case study page. Toggle the Main Category checkbox on the Category document to move one between groups.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'category' }],
        },
      ],
      components: {
        input: CategoriesInput,
      },
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      group: 'properties',
      description: 'Team members who authored this case study. Shown after the article body.',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }],
    }),
    defineField({
      name: 'upNext',
      title: 'Up Next',
      type: 'array',
      group: 'properties',
      description:
        'Related case studies or vision articles shown at the bottom. Add an external link entry for off-site resources (e.g. Carrier Testing on GitHub Pages).',
      of: [
        { type: 'reference', to: [{ type: 'caseStudy' }, { type: 'feature' }] },
        {
          type: 'object',
          name: 'externalUpNextItem',
          title: 'External link',
          fields: [
            { name: 'title', type: 'string', validation: (Rule) => Rule.required() },
            {
              name: 'url',
              type: 'url',
              validation: (Rule) => Rule.required().uri({ allowRelative: true, scheme: ['http', 'https'] }),
            },
            { name: 'caption', type: 'text', rows: 2, description: 'Short description shown on the card' },
            { name: 'image', type: 'image', options: { hotspot: true } },
          ],
          preview: {
            select: { title: 'title', subtitle: 'url', media: 'image' },
          },
        },
      ],
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      group: 'properties',
      description: 'SEO description for search engines (max ~160 characters)',
    }),

    // --- Main Content ------------------------------------------------
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      group: 'content',
      description: 'Full case study body — use headings, images, columns, and quotes',
    }),

    // --- Advanced Settings -------------------------------------------
    defineField({
      name: 'heading',
      title: 'Page Heading',
      type: 'string',
      group: 'advanced',
      description: 'Override the h1 used on the page (defaults to the Title field).',
    }),
    defineField({
      name: 'hideClientSubtitle',
      title: 'Hide Client Subtitle',
      type: 'boolean',
      group: 'advanced',
      description: 'Hide the "for {client}" subtitle on the page while still keeping the client value for listing and metadata.',
      initialValue: false,
    }),
    defineField({
      name: 'metadataLayout',
      title: 'Metadata Layout',
      type: 'string',
      group: 'advanced',
      description: 'How Time and Tags are grouped in the page metadata row.',
      options: {
        list: [
          { title: 'Stacked', value: 'stacked' },
          { title: 'Inline', value: 'inline' },
        ],
        layout: 'radio',
      },
      initialValue: 'stacked',
    }),
    defineField({
      name: 'hidden',
      title: 'Hidden',
      type: 'boolean',
      group: 'advanced',
      description: 'Hide this case study from the /work listing. It can still be visited directly by URL.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'client',
      media: 'image',
    },
  },
})
