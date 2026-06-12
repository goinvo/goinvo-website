import { defineField, defineType } from 'sanity'
import { funnelStageOptions } from './marketingFunnel'
import { searchIntentOptions, targetSiteFields } from './marketingCampaign'

const calendarStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Draft', value: 'drafting' },
  { title: 'Review', value: 'review' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Published', value: 'published' },
  { title: 'Canceled', value: 'canceled' },
]

const contentTypeOptions = [
  { title: 'Article', value: 'article' },
  { title: 'Case Study', value: 'caseStudy' },
  { title: 'Email', value: 'email' },
  { title: 'Newsletter', value: 'newsletter' },
  { title: 'Social Post', value: 'socialPost' },
  { title: 'Carousel', value: 'carousel' },
  { title: 'Reel', value: 'reel' },
  { title: 'Story', value: 'story' },
  { title: 'Static Post', value: 'post' },
  { title: 'Video', value: 'video' },
  { title: 'Landing Page', value: 'landingPage' },
  { title: 'Event', value: 'event' },
  { title: 'Ad', value: 'ad' },
  { title: 'Other', value: 'other' },
]

const channelOptions = [
  { title: 'Website', value: 'website' },
  { title: 'Email', value: 'email' },
  { title: 'LinkedIn', value: 'linkedin' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Newsletter', value: 'newsletter' },
  { title: 'Search', value: 'search' },
  { title: 'Events', value: 'events' },
  { title: 'Partner / Referral', value: 'partner' },
  { title: 'Other', value: 'other' },
]

// Worker-managed lifecycle for the auto-publishing pipeline. This is distinct
// from the human-facing `status` field: `status` is what an editor sets
// (idea → scheduled → published), while `publishState` is what the publish
// worker writes as it claims, posts, and confirms an item on a social channel.
const publishStateOptions = [
  { title: 'Queued', value: 'queued' },
  { title: 'Publishing', value: 'publishing' },
  { title: 'Published', value: 'published' },
  { title: 'Failed', value: 'failed' },
  { title: 'Skipped', value: 'skipped' },
]

export default defineType({
  name: 'marketingCalendarItem',
  title: 'Marketing Calendar Item',
  type: 'document',
  groups: [
    { name: 'planning', title: 'Planning', default: true },
    { name: 'content', title: 'Content' },
    { name: 'measurement', title: 'Measurement' },
    { name: 'publishing', title: 'Publishing' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'planning',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'planning',
      options: { list: calendarStatusOptions, layout: 'radio' },
      initialValue: 'idea',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishAt',
      title: 'Publish At',
      type: 'datetime',
      group: 'planning',
      description: 'Planned or actual publishing date/time.',
    }),
    defineField({
      name: 'contentType',
      title: 'Content Type',
      type: 'string',
      group: 'planning',
      options: { list: contentTypeOptions },
    }),
    defineField({
      name: 'channel',
      title: 'Primary Channel Key',
      type: 'string',
      group: 'planning',
      description: 'Stable channel key used for reporting and fallback display. Prefer Managed Channel when available.',
      options: { list: channelOptions },
    }),
    defineField({
      name: 'channelRef',
      title: 'Managed Channel',
      type: 'reference',
      group: 'planning',
      to: [{ type: 'marketingChannel' }],
      description: 'Optional managed channel document that controls the content type choices in the Marketing tool.',
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'reference',
      group: 'planning',
      to: [{ type: 'teamMember' }],
    }),
    defineField({
      name: 'campaign',
      title: 'Campaign',
      type: 'reference',
      group: 'planning',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({
      name: 'funnel',
      title: 'Funnel',
      type: 'reference',
      group: 'planning',
      to: [{ type: 'marketingFunnel' }],
    }),
    defineField({
      name: 'funnelStage',
      title: 'Funnel Stage',
      type: 'string',
      group: 'planning',
      options: { list: funnelStageOptions },
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic / Keyword Cluster',
      type: 'string',
      group: 'planning',
      description: 'SEO or campaign topic this item supports.',
    }),
    defineField({
      name: 'searchIntent',
      title: 'Search / Visitor Intent',
      type: 'string',
      group: 'planning',
      options: { list: searchIntentOptions },
    }),
    defineField({
      name: 'targetQueries',
      title: 'Target Queries / Phrases',
      type: 'array',
      group: 'planning',
      of: [{ type: 'string' }],
      description: 'Plain-language phrases this post or page should help answer.',
    }),
    defineField({
      name: 'targetSites',
      title: 'Target Sites',
      type: 'array',
      group: 'planning',
      of: [
        {
          name: 'targetSite',
          title: 'Target Site',
          type: 'object',
          fields: targetSiteFields,
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
    }),
    defineField({
      name: 'researchProject',
      title: 'Research Project',
      type: 'reference',
      group: 'planning',
      to: [{ type: 'marketingResearchProject' }],
      description: 'Research directive that justified this planned item.',
    }),
    defineField({
      name: 'researchResults',
      title: 'Research Results',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
      description: 'Approved findings used to generate or justify this planned item.',
    }),
    defineField({
      name: 'audienceProfiles',
      title: 'Audience Profiles',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
      description: 'Reusable audience records this item should speak to.',
    }),
    defineField({
      name: 'messagePillars',
      title: 'Message Pillars',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingMessagePillar' }] }],
    }),
    defineField({
      name: 'proofPoints',
      title: 'Proof Points',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingProofPoint' }] }],
    }),
    defineField({
      name: 'ctas',
      title: 'CTAs',
      type: 'array',
      group: 'planning',
      of: [{ type: 'reference', to: [{ type: 'marketingCta' }] }],
    }),
    defineField({
      name: 'canonicalContent',
      title: 'Canonical Site Content',
      type: 'array',
      group: 'content',
      description: 'Optional links to content documents this calendar item plans or promotes.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'feature' },
            { type: 'caseStudy' },
            { type: 'healthVisualization' },
          ],
        },
      ],
    }),
    defineField({
      name: 'workingUrl',
      title: 'Working URL',
      type: 'url',
      group: 'content',
      description: 'Draft, doc, issue, or planning URL.',
    }),
    defineField({
      name: 'publishedUrl',
      title: 'Published URL',
      type: 'url',
      group: 'content',
    }),
    defineField({
      name: 'linkItems',
      title: 'Link in Bio Links',
      type: 'array',
      group: 'content',
      description:
        'Links associated with this post. These can appear on /links automatically when the post is published.',
      of: [{ type: 'reference', to: [{ type: 'marketingLinkItem' }] }],
    }),
    defineField({
      name: 'brief',
      title: 'Brief',
      type: 'text',
      rows: 4,
      group: 'content',
    }),
    defineField({
      name: 'contentDraft',
      title: 'Draft Content / Caption',
      type: 'text',
      rows: 8,
      group: 'content',
      description: 'Editable AI or human-written copy for the planned item.',
    }),
    defineField({
      name: 'draftFrames',
      title: 'Draft Frames / Slides',
      type: 'array',
      group: 'content',
      description: 'Frame-level copy for carousels, videos, or other multi-part content.',
      of: [
        {
          name: 'draftFrame',
          title: 'Draft Frame',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'body', title: 'Body Copy', type: 'text', rows: 3 }),
            defineField({ name: 'visualDirection', title: 'Visual Direction', type: 'text', rows: 2 }),
            defineField({ name: 'altText', title: 'Alt Text', type: 'text', rows: 2 }),
            defineField({
              name: 'image',
              title: 'Slide Image',
              type: 'image',
              options: { hotspot: true },
              description: 'Image for this carousel slide. Auto-publishing uploads slides in order.',
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'body' },
            prepare({ title, subtitle }) {
              return {
                title: title || 'Draft frame',
                subtitle,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'socialImage',
      title: 'Social Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      description:
        'Primary image for a single-image social post (or the cover for a carousel). Required by Instagram, which cannot publish text-only posts.',
    }),
    defineField({
      name: 'draftAltText',
      title: 'Overall Draft Alt Text',
      type: 'text',
      rows: 3,
      group: 'content',
    }),
    defineField({
      name: 'draftHashtags',
      title: 'Draft Hashtags / Tags',
      type: 'array',
      group: 'content',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'contentProductionNotes',
      title: 'Content Production Notes',
      type: 'text',
      rows: 4,
      group: 'content',
      description: 'Source-checking, asset, accessibility, or review notes before publishing.',
    }),
    defineField({
      name: 'callToAction',
      title: 'Call to Action',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'utmCampaign',
      title: 'UTM Campaign',
      type: 'string',
      group: 'measurement',
    }),
    defineField({
      name: 'trackingRule',
      title: 'Tracking Rule',
      type: 'reference',
      group: 'measurement',
      to: [{ type: 'marketingTrackingRule' }],
    }),
    defineField({
      name: 'analyticsSource',
      title: 'Analytics Source',
      type: 'reference',
      group: 'measurement',
      to: [{ type: 'marketingAnalyticsSource' }],
    }),
    defineField({
      name: 'qualityGates',
      title: 'Quality Gates',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingQualityGate' }] }],
      description: 'Checklist guidance before this item is scheduled or published.',
    }),
    defineField({
      name: 'experiments',
      title: 'Experiments',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingExperiment' }] }],
    }),
    defineField({
      name: 'performanceSignals',
      title: 'Performance Signals',
      type: 'array',
      group: 'measurement',
      of: [{ type: 'reference', to: [{ type: 'marketingPerformanceSignal' }] }],
    }),
    defineField({
      name: 'performanceNotes',
      title: 'Performance Notes',
      type: 'text',
      rows: 4,
      group: 'measurement',
    }),
    defineField({
      name: 'autoPublish',
      title: 'Auto-publish to social channel',
      type: 'boolean',
      group: 'publishing',
      initialValue: false,
      description:
        'When on, the publish worker posts this item to its social channel at the scheduled time (status "Scheduled" and a past Publish At). Off by default — scheduling alone never posts.',
    }),
    defineField({
      name: 'publishState',
      title: 'Publish State',
      type: 'string',
      group: 'publishing',
      readOnly: true,
      options: { list: publishStateOptions },
      description: 'Set by the publish worker as it claims, posts, and confirms this item. Not edited by hand.',
    }),
    defineField({
      name: 'externalPostId',
      title: 'External Post ID',
      type: 'string',
      group: 'publishing',
      readOnly: true,
      description: 'Platform-assigned ID of the published post (e.g. Instagram media ID or LinkedIn post URN).',
    }),
    defineField({
      name: 'publishAttemptedAt',
      title: 'Last Publish Attempt',
      type: 'datetime',
      group: 'publishing',
      readOnly: true,
    }),
    defineField({
      name: 'publishError',
      title: 'Publish Error',
      type: 'text',
      rows: 3,
      group: 'publishing',
      readOnly: true,
      description: 'The most recent failure reason, cleared on a successful publish.',
    }),
    defineField({
      name: 'publishLockAt',
      title: 'Publish Lock',
      type: 'datetime',
      group: 'publishing',
      readOnly: true,
      hidden: true,
      description: 'Internal: when the worker claimed this item, so overlapping cron runs cannot double-post.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      publishAt: 'publishAt',
      channel: 'channel',
    },
    prepare({ title, status, publishAt, channel }) {
      const statusLabel = calendarStatusOptions.find((option) => option.value === status)?.title || 'Idea'
      const channelLabel = channelOptions.find((option) => option.value === channel)?.title
      const details = [channelLabel, publishAt].filter(Boolean).join(' - ')

      return {
        title: `${statusLabel}: ${title || 'Untitled calendar item'}`,
        subtitle: details || 'No publish date set',
      }
    },
  },
  orderings: [
    {
      title: 'Publish date, newest first',
      name: 'publishAtDesc',
      by: [{ field: 'publishAt', direction: 'desc' }],
    },
    {
      title: 'Publish date, oldest first',
      name: 'publishAtAsc',
      by: [{ field: 'publishAt', direction: 'asc' }],
    },
  ],
})

export { calendarStatusOptions, channelOptions, contentTypeOptions, publishStateOptions }
