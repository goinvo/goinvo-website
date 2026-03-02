import { defineType, defineArrayMember } from 'sanity'

export default defineType({
  title: 'Portable Text',
  name: 'portableText',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
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
                description: 'Full URL, relative path (/work/hgraph), or mailto: link',
                validation: (Rule) =>
                  Rule.uri({ allowRelative: true, scheme: ['https', 'http', 'mailto'] }),
              },
              {
                title: 'Open in new tab',
                name: 'blank',
                type: 'boolean',
                description: 'Check for external links so users stay on the site',
                initialValue: false,
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          description:
            'Describe the image for screen readers (e.g. "Doctor reviewing patient chart on tablet"). Leave empty for decorative images.',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
          description: 'Optional caption displayed below the image',
        },
        {
          name: 'size',
          type: 'string',
          title: 'Size',
          description: 'Controls image width in the page layout',
          options: {
            list: [
              { title: 'Small', value: 'small' },
              { title: 'Medium', value: 'medium' },
              { title: 'Large', value: 'large' },
              { title: 'Full width', value: 'full' },
            ],
          },
          initialValue: 'large',
        },
      ],
    }),
    defineArrayMember({
      name: 'columns',
      title: 'Columns',
      type: 'object',
      fields: [
        {
          name: 'layout',
          title: 'Layout',
          type: 'string',
          description: 'Number of equal-width columns',
          options: {
            list: [
              { title: '2 columns', value: '2' },
              { title: '3 columns', value: '3' },
            ],
          },
          initialValue: '2',
        },
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          description: 'Text and images distributed across the columns',
          of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption displayed below the columns',
        },
      ],
    }),
    defineArrayMember({
      name: 'quote',
      title: 'Quote',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Quote text',
          type: 'text',
          description: 'The quoted text (do not include quotation marks)',
        },
        {
          name: 'author',
          title: 'Author',
          type: 'string',
          description: 'Name of the person being quoted',
        },
        {
          name: 'role',
          title: 'Role / Title',
          type: 'string',
          description: 'Job title or affiliation of the quoted person',
        },
      ],
    }),
    defineArrayMember({
      name: 'results',
      title: 'Results',
      type: 'object',
      fields: [
        {
          name: 'items',
          title: 'Result items',
          type: 'array',
          description: 'Outcome metrics displayed in a stats row',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'stat', title: 'Statistic', type: 'string', description: 'The number or metric (e.g. "40%", "3x")' },
                { name: 'description', title: 'Description', type: 'string', description: 'What the stat represents' },
              ],
            },
          ],
        },
      ],
    }),
    defineArrayMember({
      name: 'references',
      title: 'References',
      type: 'object',
      fields: [
        {
          name: 'items',
          title: 'Reference items',
          type: 'array',
          description: 'Numbered list of source links',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'title', title: 'Title', type: 'string', description: 'Display text for the reference link' },
                { name: 'link', title: 'URL', type: 'url', description: 'Full URL to the source' },
              ],
            },
          ],
        },
      ],
    }),
    defineArrayMember({
      name: 'videoEmbed',
      title: 'Video Embed',
      type: 'object',
      fields: [
        {
          name: 'url',
          title: 'Video URL',
          type: 'url',
          description: 'CloudFront or YouTube video URL',
        },
        {
          name: 'poster',
          title: 'Poster image URL',
          type: 'url',
          description: 'Static image shown before the video plays',
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption displayed below the video',
        },
      ],
    }),
    defineArrayMember({
      name: 'divider',
      title: 'Divider',
      type: 'object',
      fields: [
        {
          name: 'style',
          title: 'Style',
          type: 'string',
          description: 'Visual weight of the horizontal rule',
          options: {
            list: [
              { title: 'Default', value: 'default' },
              { title: 'Thick', value: 'thick' },
            ],
          },
          initialValue: 'default',
        },
      ],
    }),
  ],
})
