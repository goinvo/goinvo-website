import { defineType } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'SEO Title',
      type: 'string',
      description: 'Override the page title for search engines',
    },
    {
      name: 'description',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Description for search engines (max 160 characters)',
      validation: (Rule) => Rule.max(160),
    },
    {
      name: 'image',
      title: 'Social Share Image',
      type: 'image',
      description: 'Image shown when sharing on social media',
    },
  ],
})
