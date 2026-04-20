import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Category name (e.g. "Healthcare", "Open Source")',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier. Click Generate to create from title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isMainCategory',
      title: 'Main Category',
      type: 'boolean',
      description:
        'Check to make this category appear as a filter chip on /work AND be grouped under "Main Categories" on the case study page. Leave unchecked for additional categories that only display alongside the main ones.',
      initialValue: false,
    }),
    defineField({
      name: 'filterOrder',
      title: 'Filter position',
      type: 'number',
      description:
        'Optional sort order among Main Categories for the /work filter chips (lower numbers first). Ignored for non-main categories.',
      hidden: ({ parent }) => !parent?.isMainCategory,
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Optional description of this category',
    }),
  ],
  orderings: [
    {
      title: 'Main categories first',
      name: 'mainFirst',
      by: [
        { field: 'isMainCategory', direction: 'desc' },
        { field: 'filterOrder', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'title', isMain: 'isMainCategory' },
    prepare({ title, isMain }) {
      return { title, subtitle: isMain ? 'Main Category' : 'Additional category' }
    },
  },
})
