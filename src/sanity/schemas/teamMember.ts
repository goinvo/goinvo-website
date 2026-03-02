import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Full name as displayed on the About page',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'Job title (e.g. "Creative Director", "UX Designer")',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'portableText',
      description: 'Short biography shown on the team member detail view',
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      description: 'Headshot photo. Recommended: square, at least 400×400 px.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'social',
      title: 'Social Links',
      type: 'object',
      description: 'External profile links shown below the bio',
      fields: [
        { name: 'linkedin', title: 'LinkedIn', type: 'url', description: 'Full LinkedIn profile URL' },
        { name: 'twitter', title: 'Twitter', type: 'url', description: 'Full Twitter/X profile URL' },
        { name: 'medium', title: 'Medium', type: 'url', description: 'Full Medium profile URL' },
        { name: 'website', title: 'Website', type: 'url', description: 'Personal website URL' },
        { name: 'email', title: 'Email', type: 'string', description: 'Email address (without mailto:)' },
      ],
    }),
    defineField({
      name: 'isAlumni',
      title: 'Is Alumni',
      type: 'boolean',
      description: 'Check to move this person to the Alumni section',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Sort Order',
      type: 'number',
      description: 'Display position on the About page (lower numbers appear first)',
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
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
})
