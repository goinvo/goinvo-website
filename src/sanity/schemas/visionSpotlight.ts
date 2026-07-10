import { defineType, defineField } from 'sanity'
import { StarIcon } from '@sanity/icons'

/**
 * Singleton that curates the Spotlight at the top of /vision. An ordered list of
 * items — each either a Vision Piece (reference) or a custom card (title + image
 * + link, e.g. the Health Visualizations promo). The first item is shown large;
 * any others appear beside it. This replaced the old per-feature "Spotlight on
 * /vision" boolean + the hardcoded Health Visualizations tile: the spotlight is
 * now an explicit, editable, decoupled curation surface, independent of the
 * feature ordering scheme. Leave the list empty to hide the Spotlight section.
 */
export default defineType({
  name: 'visionSpotlight',
  title: 'Spotlight',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'items',
      title: 'Spotlight items',
      description:
        'Ordered list to feature at the top of /vision. Add a Vision Piece, or a custom card (for promos like Health Visualizations). The first item is shown large; any others appear beside it. Drag to reorder. Leave empty to hide the Spotlight section.',
      type: 'array',
      of: [
        { type: 'reference', title: 'Vision Piece', to: [{ type: 'feature' }] },
        {
          type: 'object',
          name: 'spotlightCard',
          title: 'Custom card',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
            defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'string',
              description: 'Internal path (e.g. /vision/health-visualizations) or a full external URL.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'link', media: 'image' } },
        },
      ],
    }),
  ],
  preview: {
    select: { items: 'items' },
    prepare({ items }: { items?: unknown[] }) {
      const count = Array.isArray(items) ? items.length : 0
      return {
        title: 'Spotlight',
        subtitle:
          count === 0
            ? 'Nothing spotlighted'
            : `${count} item${count === 1 ? '' : 's'} featured on /vision`,
      }
    },
  },
})
