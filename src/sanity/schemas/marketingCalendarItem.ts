import { defineField, defineType } from 'sanity'
import { funnelStageOptions } from './marketingFunnel'
import { targetSiteFields } from './marketingCampaign'

const calendarStatusOptions = [
  { title: 'Idea', value: 'idea' },
  { title: 'Drafting', value: 'drafting' },
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

export default defineType({
  name: 'marketingCalendarItem',
  title: 'Marketing Calendar Item',
  type: 'document',
  groups: [
    { name: 'planning', title: 'Planning', default: true },
    { name: 'content', title: 'Content' },
    { name: 'measurement', title: 'Measurement' },
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
      name: 'analyticsSource',
      title: 'Analytics Source',
      type: 'reference',
      group: 'measurement',
      to: [{ type: 'marketingAnalyticsSource' }],
    }),
    defineField({
      name: 'performanceNotes',
      title: 'Performance Notes',
      type: 'text',
      rows: 4,
      group: 'measurement',
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

export { calendarStatusOptions, channelOptions, contentTypeOptions }
