import { defineField, defineType } from 'sanity'

// A lightweight ideas / findings backlog for the marketing CMS — the place to
// capture insights, opportunities, and next-actions (e.g. "build the SEO
// playbook into the /vision/[slug] template") so they live in the CMS instead
// of someone's notes.

export const marketingIdeaCategoryOptions = [
  { title: 'SEO', value: 'seo' },
  { title: 'Content', value: 'content' },
  { title: 'Product / Feature', value: 'product' },
  { title: 'Technical', value: 'technical' },
  { title: 'Measurement', value: 'measurement' },
  { title: 'Growth', value: 'growth' },
  { title: 'Process', value: 'process' },
]

export const marketingIdeaStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Exploring', value: 'exploring' },
  { title: 'Planned', value: 'planned' },
  { title: 'In Progress', value: 'inProgress' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Dropped', value: 'dropped' },
]

export const marketingIdeaPriorityOptions = [
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
]

export const marketingIdeaEffortOptions = [
  { title: 'Small', value: 'small' },
  { title: 'Medium', value: 'medium' },
  { title: 'Large', value: 'large' },
]

export default defineType({
  name: 'marketingIdea',
  title: 'Marketing Idea / Finding',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
      description: 'The idea, finding, or insight — what it is and why it matters.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: marketingIdeaCategoryOptions },
      initialValue: 'seo',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: marketingIdeaStatusOptions, layout: 'radio' },
      initialValue: 'idea',
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: { list: marketingIdeaPriorityOptions },
      initialValue: 'medium',
    }),
    defineField({
      name: 'effort',
      title: 'Effort',
      type: 'string',
      options: { list: marketingIdeaEffortOptions },
    }),
    defineField({
      name: 'nextAction',
      title: 'Next Action',
      type: 'text',
      rows: 2,
      description: 'The concrete next step.',
    }),
    defineField({
      name: 'relatedUrl',
      title: 'Related URL',
      type: 'url',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Where this came from, e.g. SEO analysis, strategist chat, Search Console.',
    }),
  ],
  preview: {
    select: { title: 'title', category: 'category', status: 'status', priority: 'priority' },
    prepare({ title, category, status, priority }) {
      const cat = marketingIdeaCategoryOptions.find((o) => o.value === category)?.title || 'Idea'
      return {
        title: title || 'Untitled idea',
        subtitle: [cat, status, priority].filter(Boolean).join(' / '),
      }
    },
  },
  orderings: [
    { title: 'Priority', name: 'priority', by: [{ field: 'priority', direction: 'asc' }] },
    { title: 'Status', name: 'status', by: [{ field: 'status', direction: 'asc' }] },
  ],
})
