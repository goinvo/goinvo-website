import { defineField, defineType } from 'sanity'
import { orderRankField } from '@sanity/orderable-document-list'

export default defineType({
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  fields: [
    orderRankField({ type: 'teamMember', newItemPosition: 'before' }),
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
      // Restricted block content — paragraphs with bold/italic/links only.
      // Image / Columns / headings / quotes are deliberately omitted so a
      // short biography can't accidentally drag in a layout block. The
      // underlying Portable Text shape is unchanged so existing bios in
      // Sanity continue to render through the same block renderer.
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Body paragraph', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                    description: 'Full URL or mailto: link',
                    validation: (Rule) =>
                      Rule.uri({
                        allowRelative: true,
                        scheme: ['https', 'http', 'mailto'],
                      }),
                  },
                  {
                    title: 'Open in new tab',
                    name: 'blank',
                    type: 'boolean',
                    initialValue: false,
                  },
                ],
              },
            ],
          },
        },
      ],
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
      name: 'showOnAboutPage',
      title: 'Show on About page',
      type: 'boolean',
      description: 'Uncheck to keep a team member entry in Sanity without showing it in the public team roster.',
      initialValue: true,
    }),
    defineField({
      name: 'isAlumni',
      title: 'Is Alumni',
      type: 'boolean',
      description: 'Check to move this person to the Alumni section',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
})
