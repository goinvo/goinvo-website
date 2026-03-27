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
        { title: 'H2 (centered)', value: 'h2Center' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
        { title: 'Section Title', value: 'sectionTitle' },
        { title: 'Callout', value: 'callout' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
          { title: 'Superscript', value: 'sup' },
          { title: 'Teal', value: 'teal' },
          { title: 'Orange', value: 'orange' },
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
          {
            title: 'Reference Citation',
            name: 'refCitation',
            type: 'object',
            description: 'Superscript number linking to #references section',
            fields: [
              {
                title: 'Reference number',
                name: 'refNumber',
                type: 'string',
                description: 'The citation label (e.g. "1", "A1")',
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
              { title: 'Small (25%)', value: 'small' },
              { title: 'Medium (50%)', value: 'medium' },
              { title: 'Large (75%)', value: 'large' },
              { title: 'Full width', value: 'full' },
            ],
          },
          initialValue: 'full',
        },
        {
          name: 'align',
          type: 'string',
          title: 'Alignment',
          description: 'Horizontal alignment when size is less than full',
          options: {
            list: [
              { title: 'Left', value: 'left' },
              { title: 'Center', value: 'center' },
              { title: 'Right', value: 'right' },
            ],
          },
          initialValue: 'center',
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
              { title: '4 columns', value: '4' },
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
        {
          name: 'background',
          title: 'Background',
          type: 'string',
          description: 'Background color for the stats row',
          options: {
            list: [
              { title: 'None', value: 'none' },
              { title: 'Light gray', value: 'gray' },
              { title: 'Light teal', value: 'teal' },
            ],
          },
          initialValue: 'none',
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
      name: 'backgroundSection',
      title: 'Background Section',
      type: 'object',
      description: 'Full-width colored background wrapper for content',
      fields: [
        {
          name: 'color',
          title: 'Background Color',
          type: 'string',
          options: {
            list: [
              { title: 'Light gray', value: 'gray' },
              { title: 'Teal / Blue', value: 'teal' },
              { title: 'Warm (beige)', value: 'warm' },
              { title: 'Orange (light)', value: 'orange' },
            ],
          },
          initialValue: 'gray',
        },
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          of: [
            { type: 'block' },
            { type: 'image', options: { hotspot: true } },
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
      name: 'iframeEmbed',
      title: 'Iframe Embed',
      type: 'object',
      fields: [
        {
          name: 'url',
          title: 'URL',
          type: 'url',
          description: 'URL to embed (Figma prototype, Miro board, KnightLab Timeline, Google Sheets, etc.)',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption displayed below the embed',
        },
        {
          name: 'aspectRatio',
          title: 'Aspect Ratio',
          type: 'string',
          description: 'Controls the embed height proportionally',
          options: {
            list: [
              { title: '16:9 (video/slides)', value: '16/9' },
              { title: '4:3 (documents)', value: '4/3' },
              { title: '1:1 (square)', value: '1/1' },
              { title: '9:16 (tall/mobile prototype)', value: '9/16' },
            ],
          },
          initialValue: '16/9',
        },
        {
          name: 'height',
          title: 'Fixed Height (px)',
          type: 'number',
          description: 'Override aspect ratio with a fixed pixel height (e.g. 650 for timelines)',
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
    defineArrayMember({
      name: 'contactForm',
      title: 'Contact Form',
      type: 'object',
      description: 'Embeds the "Get in touch" contact form (JotForm)',
      fields: [
        {
          name: 'showHeader',
          title: 'Show header',
          type: 'boolean',
          description: 'Show "Get in touch" heading and email link above the form',
          initialValue: true,
        },
      ],
    }),
  ],
})
