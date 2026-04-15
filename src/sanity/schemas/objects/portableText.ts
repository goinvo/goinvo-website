import { defineType, defineArrayMember } from 'sanity'
import { SectionTitleStyle, CalloutStyle } from '../../components/BlockStyleComponents'
import { sectionBackgroundOptions } from '../../../lib/sectionBackgrounds'

export default defineType({
  title: 'Portable Text',
  name: 'portableText',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Normal (extra bottom space)', value: 'normalSpacious' },
        { title: 'Serif Large Paragraph', value: 'serifLarge' },
        { title: 'Serif Large Paragraph (no top margin)', value: 'serifLargeNoTop' },
        { title: 'H2', value: 'h2' },
        { title: 'H2 (large)', value: 'h2Large' },
        { title: 'H2 (large centered)', value: 'h2LargeCentered' },
        {
          title: 'H2 (centered)',
          value: 'sectionTitle',
          component: SectionTitleStyle,
        },
        { title: 'H3', value: 'h3' },
        { title: 'H3 (centered)', value: 'h3Centered' },
        { title: 'H3 (orange)', value: 'h3Orange' },
        { title: 'H4', value: 'h4' },
        { title: 'H4 (with bullet)', value: 'h4Bullet' },
        { title: 'Centered', value: 'textCenter' },
        { title: 'Serif Large Centered', value: 'serifLargeCentered' },
        { title: 'Serif Large Centered (tight)', value: 'serifLargeCenteredTight' },
        { title: 'Quote', value: 'blockquote' },
        {
          title: 'Callout',
          value: 'callout',
          component: CalloutStyle,
        },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
          {
            title: 'Superscript',
            value: 'sup',
            icon: () => 'X²',
          },
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
            title: 'Text Color',
            name: 'textColor',
            type: 'object',
            icon: () => 'A',
            fields: [
              {
                title: 'Color',
                name: 'color',
                type: 'string',
                description: 'Select a brand color',
                options: {
                  list: [
                    { title: 'Emerald Teal (#007385)', value: 'teal' },
                    { title: 'Vibrant Orange (#E36216)', value: 'orange' },
                    { title: 'Deep Charcoal (#263238)', value: 'charcoal' },
                    { title: 'Warm Gray (#787473)', value: 'gray' },
                    { title: 'Ocean Blue (#486393)', value: 'blue' },
                  ],
                },
                initialValue: 'teal',
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
          name: 'link',
          type: 'url',
          title: 'Image Link',
          description: 'Optional URL to open when the image is clicked',
          validation: (Rule) =>
            Rule.uri({ allowRelative: true, scheme: ['https', 'http', 'mailto'] }),
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
              { title: 'Full bleed (viewport width)', value: 'bleed' },
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
        {
          name: 'border',
          type: 'string',
          title: 'Border',
          description: 'Optional colored border around the image',
          options: {
            list: [
              { title: 'None', value: 'none' },
              { title: 'Peach (#FFEEE4)', value: 'peach' },
              { title: 'Gray (#e0e0e0)', value: 'gray' },
              { title: 'Teal (#007385)', value: 'teal' },
            ],
          },
          initialValue: 'none',
        },
      ],
    }),
    defineArrayMember({
      name: 'columns',
      title: 'Columns',
      type: 'object',
      preview: {
        select: { layout: 'layout', caption: 'caption' },
        prepare({ layout, caption }) {
          return { title: caption || `${layout || '2'}-column layout`, subtitle: 'Columns' }
        },
      },
      fields: [
        {
          name: 'layout',
          title: 'Layout',
          type: 'string',
          description: 'Column layout — equal or asymmetric widths',
          options: {
            list: [
              { title: '2 columns (equal)', value: '2' },
              { title: '2 columns (2:1 ratio)', value: '2:1' },
              { title: '2 columns (1:2 ratio)', value: '1:2' },
              { title: '3 columns', value: '3' },
              { title: '4 columns', value: '4' },
              { title: 'Storyboard (image above text, vertically stacked)', value: 'storyboard' },
            ],
          },
          initialValue: '2',
        },
        {
          name: 'size',
          title: 'Width',
          type: 'string',
          description: 'Override the column container width',
          options: {
            list: [
              { title: 'Default (follow article width)', value: 'default' },
              { title: 'Wide (1020px)', value: 'wide' },
              { title: 'Full bleed', value: 'bleed' },
            ],
          },
          initialValue: 'default',
        },
        {
          name: 'variant',
          title: 'Variant',
          type: 'string',
          description: 'Optional presentation style for the column items',
          options: {
            list: [
              { title: 'Default', value: 'default' },
              { title: 'Centered comparison', value: 'centered' },
              { title: 'Cards', value: 'cards' },
            ],
          },
          initialValue: 'default',
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
        {
          name: 'background',
          title: 'Background',
          type: 'string',
          description: 'Optional background color for the columns container',
          options: {
            list: [
              { title: 'None', value: 'none' },
              { title: 'Gray', value: 'gray' },
              { title: 'Teal', value: 'teal' },
              { title: 'Warm', value: 'warm' },
            ],
          },
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
        {
          name: 'background',
          title: 'Background',
          type: 'string',
          description: 'Optional quote background treatment',
          options: {
            list: [
              { title: 'White', value: 'white' },
              { title: 'Gray', value: 'gray' },
            ],
          },
          initialValue: 'white',
        },
        {
          name: 'refNumber',
          title: 'Reference citation',
          type: 'string',
          description: 'Optional superscript citation appended to quote text (e.g. "5", "A1")',
        },
        {
          name: 'refTarget',
          title: 'Reference target',
          type: 'string',
          description: 'Anchor target for the citation link',
          options: { list: [{ title: 'References', value: 'references' }, { title: 'Methodology', value: 'methodology' }] },
        },
      ],
      preview: {
        select: { text: 'text', author: 'author' },
        prepare({ text, author }: { text?: string; author?: string }) {
          const quoteText = typeof text === 'string' ? text : String(text || '')
          return {
            title: quoteText.length > 0 ? `"${quoteText.substring(0, 80)}${quoteText.length > 80 ? '...' : ''}"` : 'Empty quote',
            subtitle: author ? `— ${author}` : undefined,
          }
        },
      },
    }),
    defineArrayMember({
      name: 'results',
      title: 'Results',
      type: 'object',
      preview: {
        select: { items: 'items', variant: 'variant' },
        prepare({ items, variant }) {
          const count = items?.length || 0
          return { title: `${count} result${count !== 1 ? 's' : ''} (${variant || 'row'})`, subtitle: 'Results / Stats' }
        },
      },
      fields: [
        {
          name: 'variant',
          title: 'Layout',
          type: 'string',
          description: 'How to arrange the stats.',
          options: {
            list: [
              { title: 'Horizontal row', value: 'row' },
              { title: '2-column grid', value: 'grid' },
              { title: 'Stacked (vertical)', value: 'stacked' },
            ],
          },
          initialValue: 'row',
        },
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
                { name: 'refNumber', title: 'Reference citation', type: 'string', description: 'Optional superscript citation (e.g. "4", "A3") — links to #references or #methodology' },
                { name: 'refTarget', title: 'Reference target', type: 'string', description: 'Anchor target for the citation link', options: { list: [{ title: 'References', value: 'references' }, { title: 'Methodology', value: 'methodology' }] } },
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
      name: 'cardGrid',
      title: 'Card Grid',
      type: 'object',
      preview: {
        select: { items: 'items', columns: 'columns' },
        prepare({ items, columns }) {
          const count = items?.length || 0
          return { title: `${count} card${count !== 1 ? 's' : ''} (${columns || '4'}-col)`, subtitle: 'Card Grid' }
        },
      },
      fields: [
        {
          name: 'columns',
          title: 'Columns',
          type: 'string',
          description: 'Number of columns in the grid',
          options: {
            list: [
              { title: '2 columns', value: '2' },
              { title: '3 columns', value: '3' },
              { title: '4 columns', value: '4' },
            ],
          },
          initialValue: '4',
        },
        {
          name: 'items',
          title: 'Cards',
          type: 'array',
          description: 'Cards displayed in a grid layout',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'label', title: 'Label', type: 'string', description: 'Bold uppercase label (e.g. "SAFETY")' },
                { name: 'description', title: 'Description', type: 'text', rows: 2, description: 'Card body text' },
              ],
              preview: {
                select: { title: 'label', subtitle: 'description' },
              },
            },
          ],
        },
        {
          name: 'background',
          title: 'Background',
          type: 'string',
          description: 'Optional background color',
          options: {
            list: [
              { title: 'None (white cards)', value: 'none' },
              { title: 'Gray', value: 'gray' },
              { title: 'Teal', value: 'teal' },
            ],
          },
          initialValue: 'none',
        },
      ],
    }),
    defineArrayMember({
      name: 'reviewCard',
      title: 'Review Card',
      type: 'object',
      preview: {
        select: { title: 'title', status: 'status' },
        prepare({ title, status }) {
          return { title: `${status?.toUpperCase() || 'REVIEW'}: ${title || 'Untitled'}`, subtitle: 'Review Card' }
        },
      },
      fields: [
        { name: 'title', title: 'Title', type: 'string', description: 'Card header (e.g. "Review result — cardiac insight v1.2")' },
        {
          name: 'status', title: 'Status', type: 'string',
          options: { list: [{ title: 'Rejected', value: 'rejected' }, { title: 'Certified', value: 'certified' }] },
        },
        { name: 'quote', title: 'Quote', type: 'text', rows: 2, description: 'The quoted AI output text' },
        { name: 'reason', title: 'Reason Label', type: 'string', description: 'e.g. "Why it fails" (optional)' },
        { name: 'description', title: 'Description', type: 'text', rows: 3, description: 'Explanation text' },
      ],
    }),
    defineArrayMember({
      name: 'references',
      title: 'References',
      type: 'object',
      preview: {
        select: { items: 'items' },
        prepare({ items }) {
          const count = items?.length || 0
          return { title: `${count} reference${count !== 1 ? 's' : ''}`, subtitle: 'References' }
        },
      },
      fields: [
        {
          name: 'background',
          title: 'Section background',
          type: 'string',
          description: 'Background behind the references block.',
          options: {
            list: [...sectionBackgroundOptions],
          },
          initialValue: 'white',
        },
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
      preview: {
        select: { color: 'color' },
        prepare({ color }) {
          return { title: `${color || 'gray'} background`, subtitle: 'Background Section' }
        },
      },
      fields: [
        {
          name: 'color',
          title: 'Background Color',
          type: 'string',
          options: {
            list: [
              { title: 'Light gray', value: 'gray' },
              { title: 'Teal', value: 'teal' },
              { title: 'Blue (pale)', value: 'blue' },
              { title: 'Warm (beige)', value: 'warm' },
              { title: 'Orange (light)', value: 'orange' },
              { title: 'Dark (charcoal)', value: 'dark' },
              { title: 'Red / Maroon', value: 'red' },
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
      preview: {
        select: { url: 'url', caption: 'caption' },
        prepare({ url, caption }) {
          return { title: caption || url || 'Video', subtitle: 'Video Embed' }
        },
      },
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
        {
          name: 'autoPlay',
          title: 'Auto-play',
          type: 'boolean',
          description: 'Auto-play the video (muted, looping). Enable for ambient/demo videos.',
          initialValue: false,
        },
        {
          name: 'size',
          title: 'Size',
          type: 'string',
          description: 'Video width. Default fits the article column. Use "Wide (75%)" for larger videos like healthcare-ai mockups.',
          options: {
            list: [
              { title: 'Default (article width)', value: 'default' },
              { title: 'Wide (75% viewport)', value: 'wide' },
              { title: 'Full width', value: 'full' },
            ],
          },
          initialValue: 'default',
        },
      ],
    }),
    defineArrayMember({
      name: 'iframeEmbed',
      title: 'Iframe Embed',
      type: 'object',
      preview: {
        select: { url: 'url', caption: 'caption' },
        prepare({ url, caption }) {
          return { title: caption || url || 'Embed', subtitle: 'Iframe Embed' }
        },
      },
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
        {
          name: 'fullWidth',
          title: 'Full width',
          type: 'boolean',
          description: 'Break out of the article container to fill the full viewport width',
          initialValue: false,
        },
      ],
    }),
    defineArrayMember({
      name: 'divider',
      title: 'Divider',
      type: 'object',
      preview: {
        prepare() {
          return { title: '— Divider —', subtitle: 'Horizontal rule' }
        },
      },
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
              { title: 'Button spacing', value: 'buttonSpacing' },
              { title: 'Arrow down', value: 'arrow' },
            ],
          },
          initialValue: 'default',
        },
      ],
    }),
    defineArrayMember({
      name: 'imageCarousel',
      title: 'Image Carousel',
      type: 'object',
      description: 'Slideshow with thumbnail navigation. Use for storyboards, step-by-step visuals, or multi-image galleries.',
      preview: {
        select: { caption: 'caption', images: 'images' },
        prepare({ caption, images }) {
          const count = images?.length || 0
          return { title: caption || `${count} image carousel`, subtitle: 'Image Carousel' }
        },
      },
      fields: [
        {
          name: 'images',
          title: 'Images',
          type: 'array',
          of: [
            {
              type: 'image',
              options: { hotspot: true },
              fields: [
                { name: 'alt', type: 'string', title: 'Alt text' },
              ],
            },
          ],
          description: 'Upload or select images for the carousel slides',
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption displayed below the carousel',
        },
        {
          name: 'thumbnailSize',
          title: 'Thumbnail Size',
          type: 'string',
          description: 'Size of the navigation thumbnails below the main image',
          options: {
            list: [
              { title: 'Small (30px)', value: 'sm' },
              { title: 'Medium (60px)', value: 'md' },
              { title: 'Large (100px)', value: 'lg' },
            ],
          },
          initialValue: 'sm',
        },
      ],
    }),
    defineArrayMember({
      name: 'imageEquationList',
      title: 'Image Equation List',
      type: 'object',
      description: 'Rows of [Image] + [Text] = [Image] (e.g., 3D render + prompt = output)',
      preview: {
        select: { heading1: 'headings.0', heading2: 'headings.1', heading3: 'headings.2' },
        prepare({ heading1, heading2, heading3 }) {
          return { title: [heading1, heading2, heading3].filter(Boolean).join(' + ') || 'Image Equation List', subtitle: 'Image + Text = Image rows' }
        },
      },
      fields: [
        {
          name: 'headings',
          title: 'Column Headings',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'e.g. "Rhino 3d Model Render", "Midjourney Re-texturizing Prompt", "Midjourney Output"',
        },
        {
          name: 'rows',
          title: 'Rows',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'inputImage', title: 'Input Image', type: 'image' },
                { name: 'prompt', title: 'Prompt Text', type: 'text', rows: 3 },
                { name: 'outputImage', title: 'Output Image', type: 'image' },
              ],
              preview: {
                select: { prompt: 'prompt' },
                prepare({ prompt }) { return { title: (prompt || '').substring(0, 50) } },
              },
            },
          ],
        },
      ],
    }),
    defineArrayMember({
      name: 'spacer',
      title: 'Spacer',
      type: 'object',
      description: 'Adds vertical spacing between content blocks',
      preview: {
        prepare() { return { title: '↕ Spacer', subtitle: 'Vertical space' } },
      },
      fields: [
        {
          name: 'size',
          title: 'Size',
          type: 'string',
          options: {
            list: [
              { title: 'Small (16px)', value: 'sm' },
              { title: 'Medium (32px)', value: 'md' },
              { title: 'Large (48px)', value: 'lg' },
              { title: 'Extra Large (64px)', value: 'xl' },
            ],
          },
          initialValue: 'md',
        },
      ],
    }),
    defineArrayMember({
      name: 'buttonGroup',
      title: 'Buttons',
      type: 'object',
      description: 'One or more buttons side by side',
      preview: {
        select: { buttons: 'buttons' },
        prepare({ buttons }) {
          const labels = (buttons || []).map((b: any) => b.label).filter(Boolean).join(', ') // eslint-disable-line @typescript-eslint/no-explicit-any
          return { title: labels || 'Buttons', subtitle: 'Button Group' }
        },
      },
      fields: [
        {
          name: 'buttons',
          title: 'Buttons',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() },
                { name: 'url', title: 'URL', type: 'url', validation: (Rule) => Rule.required().uri({ allowRelative: true, scheme: ['https', 'http', 'mailto'] }) },
                { name: 'variant', title: 'Variant', type: 'string', options: { list: [{ title: 'Primary', value: 'primary' }, { title: 'Secondary', value: 'secondary' }] }, initialValue: 'secondary' },
                { name: 'external', title: 'New tab', type: 'boolean', initialValue: true },
              ],
            },
          ],
        },
        {
          name: 'layout',
          title: 'Layout',
          type: 'string',
          description: 'How the buttons are displayed',
          options: {
            list: [
              { title: 'Inline (side by side)', value: 'inline' },
              { title: 'Full width (equal share)', value: 'fullWidth' },
              { title: 'Centered', value: 'centered' },
            ],
          },
          initialValue: 'inline',
        },
      ],
    }),
    defineArrayMember({
      name: 'contactForm',
      title: 'Contact Form',
      type: 'object',
      description: 'Embeds the "Get in touch" contact form (JotForm)',
      preview: {
        prepare() {
          return { title: 'Contact Form', subtitle: 'JotForm embed' }
        },
      },
      fields: [
        {
          name: 'showHeader',
          title: 'Show header',
          type: 'boolean',
          description: 'Show "Get in touch" heading and email link above the form',
          initialValue: true,
        },
        {
          name: 'background',
          title: 'Section background',
          type: 'string',
          description: 'Background behind the contact form card.',
          options: {
            list: [...sectionBackgroundOptions],
          },
          initialValue: 'white',
        },
      ],
    }),
    defineArrayMember({
      name: 'customComponent',
      title: 'Custom Component',
      type: 'object',
      description: 'Renders a hard-coded React component by name. Used for page-specific tables and visualizations that don\'t fit the generic block types.',
      preview: {
        select: { name: 'name' },
        prepare({ name }) {
          return { title: name || 'Custom Component', subtitle: 'Custom Component' }
        },
      },
      fields: [
        {
          name: 'name',
          title: 'Component name',
          type: 'string',
          description: 'Identifier the renderer dispatches on. Must match a known component (e.g. "virtualCareTop15Table").',
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
  ],
})
