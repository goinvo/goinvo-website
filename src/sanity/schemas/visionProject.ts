import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'visionProject',
  title: 'Vision Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Vision project headline',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL path segment. Click Generate to create from title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Hero/card image. Recommended: 1600×900 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'portableText',
      description: 'Short summary shown on the listing card',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      description: 'Full vision project body content',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Category label (e.g. "Healthcare", "Open Source")',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'image',
    },
  },
})
