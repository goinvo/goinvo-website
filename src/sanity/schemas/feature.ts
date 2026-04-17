import { defineField, defineType } from 'sanity'
import { sectionBackgroundOptions } from '../../lib/sectionBackgrounds'
import {
  FeatureAuthoringStatusInput,
  FeaturePublishingChecklistInput,
} from '../components/FeatureAuthoringInputs'
import {
  hasFeatureCitations,
  hasFeaturePeople,
  hasFeatureReferences,
  hasMeaningfulFeatureBody,
  isStaticFeatureOverrideSlug,
} from '../../lib/featureAuthoring'

function getDocumentSlug(document: unknown): string | undefined {
  if (!document || typeof document !== 'object') return undefined

  const maybeSlug = (document as { slug?: { current?: string } }).slug
  if (!maybeSlug || typeof maybeSlug !== 'object') return undefined

  return maybeSlug.current
}

function isStaticOverrideDocument(document: unknown) {
  return isStaticFeatureOverrideSlug(getDocumentSlug(document))
}

function readOnlyForStaticOverride({ document }: { document?: unknown }) {
  return isStaticOverrideDocument(document)
}

function hasDocumentArrayItems(document: unknown, fieldName: 'authors' | 'contributors' | 'specialThanks') {
  if (!document || typeof document !== 'object') return false

  const value = (document as Record<string, unknown>)[fieldName]
  return Array.isArray(value) && value.length > 0
}

function documentHasAboutGoInvo(document: unknown) {
  if (!document || typeof document !== 'object') return false

  return (document as { showAboutGoInvo?: boolean }).showAboutGoInvo === true
}

export default defineType({
  name: 'feature',
  title: 'Feature',
  type: 'document',
  groups: [
    { name: 'properties', title: 'Properties', default: true },
    { name: 'content', title: 'Main Content' },
    { name: 'extras', title: 'Extra Content' },
  ],
  validation: (Rule) => [
    Rule.custom((document) => {
      const feature = document as {
        slug?: { current?: string }
        image?: unknown
        content?: any[]
        authors?: unknown[]
        contributors?: unknown[]
        specialThanks?: unknown[]
        previewReviewed?: boolean
      } | undefined

      if (!feature || isStaticOverrideDocument(feature)) return true
      if (!feature.image) {
        return 'Add a hero image before publishing so the article card and page header render correctly.'
      }
      return true
    }).warning(),
    Rule.custom((document) => {
      const feature = document as {
        slug?: { current?: string }
        content?: any[]
      } | undefined

      if (!feature || isStaticOverrideDocument(feature)) return true
      if (!hasMeaningfulFeatureBody(feature.content)) {
        return 'Add at least one real content block in the Body tab before publishing.'
      }
      return true
    }).warning(),
    Rule.custom((document) => {
      const feature = document as {
        slug?: { current?: string }
        content?: any[]
      } | undefined

      if (!feature || isStaticOverrideDocument(feature)) return true
      if (hasFeatureCitations(feature.content) && !hasFeatureReferences(feature.content)) {
        return 'This article uses citations, but there is no References block in the Body content.'
      }
      return true
    }).warning(),
    Rule.custom((document) => {
      const feature = document as {
        slug?: { current?: string }
        authors?: unknown[]
        contributors?: unknown[]
        specialThanks?: unknown[]
      } | undefined

      if (!feature || isStaticOverrideDocument(feature)) return true
      if (!hasFeaturePeople(feature)) {
        return 'Add at least one author, contributor, or special-thanks entry so the article credits are complete.'
      }
      return true
    }).warning(),
    Rule.custom((document) => {
      const feature = document as {
        slug?: { current?: string }
        previewReviewed?: boolean
      } | undefined

      if (!feature || isStaticOverrideDocument(feature)) return true
      if (!feature.previewReviewed) {
        return 'Open the Presentation tab and review the draft before publishing, then check "Draft preview reviewed".'
      }
      return true
    }).warning(),
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'properties',
      description: 'The main headline shown on the article page and in feature listings.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'properties',
      description: 'URL path segment (e.g. "determinants-of-health" → /vision/determinants-of-health)',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (isStaticFeatureOverrideSlug(value?.current)) {
            return 'This slug is rendered by a static page override. Studio body/layout edits here will not control the live article.'
          }
          return true
        }).warning(),
    }),
    defineField({
      name: 'authoringStatus',
      title: 'Authoring Status',
      type: 'string',
      group: 'properties',
      readOnly: true,
      description: 'Shows whether this page is fully CMS-driven, still code-assisted, or rendered by a static override.',
      components: {
        input: FeatureAuthoringStatusInput,
      },
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: 'properties',
      description: 'Hero/card image. Recommended: 1600×900 px. Use the hotspot (crosshair) to mark the focal point — when the image is cropped for cards or mobile, this area stays visible.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'heroPosition',
      title: 'Hero Image Position',
      type: 'string',
      group: 'properties',
      description: 'Where the focal point of the hero image is. Controls cropping on cards and mobile. Default is "center".',
      options: {
        list: [
          { title: 'Center (default)', value: 'center' },
          { title: 'Top center', value: 'top center' },
          { title: 'Bottom center', value: 'bottom center' },
          { title: 'Center top', value: 'center top' },
          { title: 'Left center', value: 'left center' },
          { title: 'Right center', value: 'right center' },
        ],
      },
      initialValue: 'center',
    }),
    defineField({
      name: 'fullImageCover',
      title: 'Full Image Cover',
      type: 'boolean',
      group: 'properties',
      description: 'Show the full hero image instead of cropping to 16:9. Use for infographic posters (e.g. Killer Truths) where the image IS the content.',
      initialValue: false,
    }),
    defineField({
      name: 'contentWidth',
      title: 'Content Width',
      type: 'string',
      group: 'content',
      readOnly: readOnlyForStaticOverride,
      description: 'Max width of the article content area. Most articles use Medium (711px). Use Wide for pages with larger images/diagrams.',
      options: {
        list: [
          { title: 'Narrow (648px)', value: 'narrow' },
          { title: 'Medium (711px) — default', value: 'medium' },
          { title: 'Wide (988px)', value: 'wide' },
        ],
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'bulletStyle',
      title: 'Bullet Style',
      type: 'string',
      group: 'content',
      readOnly: readOnlyForStaticOverride,
      description: 'List bullet style. Star (default) uses a custom star image. Disc uses standard round bullets (matching some Gatsby pages like healthcare-ai, eligibility-engine).',
      options: {
        list: [
          { title: 'Star (default)', value: 'star' },
          { title: 'Disc (standard)', value: 'disc' },
        ],
      },
      initialValue: 'star',
    }),
    defineField({
      name: 'video',
      title: 'Video URL',
      type: 'url',
      group: 'properties',
      description: 'CloudFront video URL for hero/listing card',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'properties',
      description: 'Short summary shown on the listing card (1-2 sentences)',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'properties',
      description: 'Select one or more categories for filtering on the Work page',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Healthcare', value: 'healthcare' },
          { title: 'Enterprise', value: 'enterprise' },
          { title: 'Government', value: 'government' },
          { title: 'AI', value: 'AI' },
          { title: 'Open Source', value: 'open-source' },
          { title: 'Public Health & Policy', value: 'public-health-and-policy' },
          { title: 'Health IT & Infrastructure', value: 'health-it-and-infrastructure' },
          { title: 'Patient Engagement', value: 'patient-engagement' },
          { title: 'Care Management', value: 'care-management' },
          { title: 'Precision Medicine & Genomics', value: 'precision-medicine-and-genomics' },
        ],
      },
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'string',
      group: 'properties',
      description: 'Display date (e.g. "Feb.2026")',
    }),
    defineField({
      name: 'showPageMeta',
      title: 'Show Page Meta',
      type: 'boolean',
      group: 'properties',
      readOnly: readOnlyForStaticOverride,
      description: 'Show the category/date row below the page title',
      initialValue: true,
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      group: 'properties',
      description: 'Client or partner name, if applicable',
    }),
    defineField({
      name: 'externalLink',
      title: 'External Link',
      type: 'url',
      group: 'properties',
      description: 'If set, the listing card links to this URL instead of /vision/[slug]',
    }),
    defineField({
      name: 'hiddenWorkPage',
      title: 'Hidden on Work Page',
      type: 'boolean',
      group: 'properties',
      description: 'Hide from the /work listing (still accessible at its direct URL)',
      initialValue: false,
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Team members who authored this feature. Use roleOverride for article-specific roles (e.g., "Editor" instead of the team member\'s default role).',
      of: [
        {
          type: 'object',
          name: 'authorCredit',
          fields: [
            { name: 'author', type: 'reference', to: [{ type: 'teamMember' }] },
            { name: 'roleOverride', type: 'string', title: 'Role Override', description: 'Article-specific role (e.g., "Editor"). Leave blank to use the team member\'s default role.' },
          ],
          preview: {
            select: { title: 'author.name', subtitle: 'roleOverride' },
          },
        },
      ],
    }),
    defineField({
      name: 'authorLayout',
      title: 'Author Layout',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'authors'),
      description: 'How to display the author section. "Equal" shows all authors the same size. "Primary + sidebar" highlights the first author and shows the rest in a bordered sidebar.',
      options: {
        list: [
          { title: 'Equal (all same size)', value: 'equal' },
          { title: 'Stacked rows (legacy author layout)', value: 'stacked' },
          { title: 'Primary + sidebar', value: 'primary-sidebar' },
          { title: 'Plain list', value: 'plain-list' },
          { title: 'Legacy text list', value: 'legacy-text-list' },
        ],
      },
      initialValue: 'equal',
    }),
    defineField({
      name: 'authorBackground',
      title: 'Author Background',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'authors'),
      description: 'Background behind the author section. White keeps the section unwrapped; the other options create a full-width brand-tinted band.',
      options: {
        list: [...sectionBackgroundOptions],
      },
      initialValue: 'white',
    }),
    defineField({
      name: 'contributors',
      title: 'Contributors',
      type: 'array',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Additional contributors (shown in a separate "Contributors" section below authors).',
      of: [
        {
          type: 'object',
          name: 'contributorCredit',
          fields: [
            { name: 'author', type: 'reference', to: [{ type: 'teamMember' }] },
            { name: 'roleOverride', type: 'string', title: 'Role Override', description: 'Contributor-specific role. Leave blank to use default.' },
            { name: 'link', type: 'url', title: 'External Link', description: 'Optional link to LinkedIn / website for this contributor.' },
          ],
          preview: {
            select: { title: 'author.name', subtitle: 'roleOverride' },
          },
        },
      ],
    }),
    defineField({
      name: 'contributorsLayout',
      title: 'Contributors Layout',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'contributors'),
      description: 'How to display the contributors section. Use "Plain list" for pages that should show names only, without photos.',
      options: {
        list: [
          { title: 'Cards (default)', value: 'equal' },
          { title: 'Stacked rows (legacy author layout)', value: 'stacked' },
          { title: 'Plain list', value: 'plain-list' },
          { title: 'Legacy text list', value: 'legacy-text-list' },
        ],
      },
      initialValue: 'equal',
    }),
    defineField({
      name: 'contributorsBackground',
      title: 'Contributors Background',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'contributors'),
      description: 'Background behind the contributors section when contributors are shown separately.',
      options: {
        list: [...sectionBackgroundOptions],
      },
      initialValue: 'white',
    }),
    defineField({
      name: 'newsletterBackground',
      title: 'Newsletter Background',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Background behind the newsletter/subscribe section shown below authors and special thanks.',
      options: {
        list: [...sectionBackgroundOptions],
      },
      initialValue: 'white',
    }),
    defineField({
      name: 'peopleSectionPosition',
      title: 'Authors/Contributors Position',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Whether the author, contributor, and special-thanks sections appear before or after the newsletter block.',
      options: {
        list: [
          { title: 'Before newsletter', value: 'beforeNewsletter' },
          { title: 'After newsletter', value: 'afterNewsletter' },
        ],
      },
      initialValue: 'beforeNewsletter',
    }),
    defineField({
      name: 'specialThanksHeading',
      title: 'Special Thanks Heading',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'specialThanks'),
      description: 'Custom heading for the special thanks section. Defaults to "Contributors" or "Special thanks to..." based on context.',
    }),
    defineField({
      name: 'specialThanksHeadingStyle',
      title: 'Special Thanks Heading Style',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !hasDocumentArrayItems(document, 'specialThanks'),
      description: 'Choose whether the Special Thanks heading uses the default small subheading or a larger legacy section heading.',
      options: {
        list: [
          { title: 'Small subheading', value: 'subheading' },
          { title: 'Large centered section heading', value: 'legacy-centered-h2' },
        ],
      },
      initialValue: 'subheading',
    }),
    defineField({
      name: 'specialThanks',
      title: 'Special Thanks',
      type: 'array',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Optional "Special thanks to..." section shown after Authors/Contributors. Use for acknowledging people who are not formal authors or contributors.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'showAboutGoInvo',
      title: 'Show "About GoInvo" Section',
      type: 'boolean',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      description: 'Show the standard "About GoInvo" blurb after the author/contributor sections.',
      initialValue: false,
    }),
    defineField({
      name: 'aboutGoInvoPosition',
      title: '"About GoInvo" Position',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !documentHasAboutGoInvo(document),
      description: 'Whether the About GoInvo section appears before or after the newsletter block',
      options: {
        list: [
          { title: 'Before newsletter', value: 'beforeNewsletter' },
          { title: 'After newsletter', value: 'afterNewsletter' },
        ],
      },
      initialValue: 'beforeNewsletter',
    }),
    defineField({
      name: 'aboutGoInvoVariant',
      title: '"About GoInvo" Copy',
      type: 'string',
      group: 'extras',
      readOnly: readOnlyForStaticOverride,
      hidden: ({ document }) => !documentHasAboutGoInvo(document),
      description: 'Choose which standard About GoInvo blurb to render',
      options: {
        list: [
          { title: 'Default', value: 'default' },
          { title: 'Practice', value: 'practice' },
        ],
      },
      initialValue: 'default',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'portableText',
      group: 'content',
      readOnly: readOnlyForStaticOverride,
      description: 'Full page content for internal vision pages',
    }),
    defineField({
      name: 'previewReviewed',
      title: 'Draft Preview Reviewed',
      type: 'boolean',
      group: 'properties',
      readOnly: readOnlyForStaticOverride,
      description: 'Check this after reviewing the draft in the Presentation tab and confirming it is ready to publish.',
      initialValue: false,
    }),
    defineField({
      name: 'publishingChecklist',
      title: 'Publishing Checklist',
      type: 'string',
      group: 'properties',
      readOnly: true,
      description: 'Quick acceptance checklist for this article before publishing.',
      components: {
        input: FeaturePublishingChecklistInput,
      },
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 2,
      group: 'properties',
      description: 'SEO description for search engines (max ~160 characters)',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      group: 'properties',
      description: 'Display order (lower numbers first)',
    }),
  ],
  orderings: [
    {
      title: 'Date (Newest)',
      name: 'dateDesc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'date',
      media: 'image',
    },
  },
})
