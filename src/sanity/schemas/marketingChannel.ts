import { defineField, defineType } from 'sanity'
import { funnelStageOptions } from './marketingFunnel'

const channelStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Paused', value: 'paused' },
  { title: 'Archived', value: 'archived' },
]

const channelPlatformOptions = [
  { title: 'Website', value: 'website' },
  { title: 'Email', value: 'email' },
  { title: 'Social', value: 'social' },
  { title: 'Search', value: 'search' },
  { title: 'Event', value: 'event' },
  { title: 'Partner / Referral', value: 'partner' },
  { title: 'Other', value: 'other' },
]

const defaultMarketingChannels = [
  {
    title: 'Website',
    key: 'website',
    platform: 'website',
    contentTypes: [
      { label: 'Article', value: 'article' },
      { label: 'Case Study', value: 'caseStudy' },
      { label: 'Landing Page', value: 'landingPage' },
    ],
  },
  {
    title: 'Email',
    key: 'email',
    platform: 'email',
    contentTypes: [
      { label: 'Email', value: 'email' },
      { label: 'Newsletter', value: 'newsletter' },
      { label: 'Drip Email', value: 'dripEmail' },
    ],
  },
  {
    title: 'LinkedIn',
    key: 'linkedin',
    platform: 'social',
    contentTypes: [
      { label: 'Text Post', value: 'textPost' },
      { label: 'Link Post', value: 'linkPost' },
      { label: 'Carousel', value: 'carousel' },
      { label: 'Video', value: 'video' },
    ],
  },
  {
    title: 'Instagram',
    key: 'instagram',
    platform: 'social',
    contentTypes: [
      { label: 'Post', value: 'post' },
      { label: 'Carousel', value: 'carousel' },
      { label: 'Reel', value: 'reel' },
      { label: 'Story', value: 'story' },
    ],
  },
  {
    title: 'Newsletter',
    key: 'newsletter',
    platform: 'email',
    contentTypes: [
      { label: 'Newsletter', value: 'newsletter' },
      { label: 'Feature', value: 'feature' },
      { label: 'Announcement', value: 'announcement' },
    ],
  },
  {
    title: 'Search',
    key: 'search',
    platform: 'search',
    contentTypes: [
      { label: 'Ad', value: 'ad' },
      { label: 'Landing Page', value: 'landingPage' },
    ],
  },
  {
    title: 'Events',
    key: 'events',
    platform: 'event',
    contentTypes: [
      { label: 'Event', value: 'event' },
      { label: 'Talk', value: 'talk' },
      { label: 'Webinar', value: 'webinar' },
    ],
  },
]

export default defineType({
  name: 'marketingChannel',
  title: 'Marketing Channel',
  type: 'document',
  groups: [
    { name: 'setup', title: 'Setup', default: true },
    { name: 'planning', title: 'Planning' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Channel Name',
      type: 'string',
      group: 'setup',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'key',
      title: 'Channel Key',
      type: 'string',
      group: 'setup',
      description: 'Stable lowercase key used by calendar items, such as instagram or linkedin.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'setup',
      options: { list: channelStatusOptions, layout: 'radio' },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      group: 'setup',
      options: { list: channelPlatformOptions },
      initialValue: 'website',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'setup',
    }),
    defineField({
      name: 'defaultFunnelStage',
      title: 'Default Funnel Stage',
      type: 'string',
      group: 'planning',
      options: { list: funnelStageOptions },
    }),
    defineField({
      name: 'analyticsSources',
      title: 'Analytics Sources',
      type: 'array',
      group: 'planning',
      description: 'Reusable analytics sources that should measure this channel by default.',
      of: [{ type: 'reference', to: [{ type: 'marketingAnalyticsSource' }] }],
    }),
    defineField({
      name: 'contentTypes',
      title: 'Content Types',
      type: 'array',
      group: 'planning',
      description: 'The content type choices shown when this channel is selected in the marketing calendar.',
      of: [
        {
          name: 'channelContentType',
          title: 'Channel Content Type',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'Stable lowercase value saved on calendar items.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        },
      ],
      validation: (Rule) => Rule.min(1).warning('Add at least one content type so the calendar can use this channel.'),
    }),
    defineField({
      name: 'recommendedPostingTimes',
      title: 'Recommended Posting Times',
      type: 'array',
      group: 'planning',
      readOnly: true,
      description:
        'Best times to post on this channel, from live posting-time research. Used to default the calendar publishAt. Run "Research posting times" on the Channels tab to populate.',
      of: [
        {
          name: 'postingTimeSlot',
          type: 'object',
          fields: [
            defineField({ name: 'dayOfWeek', title: 'Day', type: 'string' }),
            defineField({ name: 'time', title: 'Time (HH:MM, 24h)', type: 'string' }),
            defineField({ name: 'timezone', title: 'Timezone (IANA)', type: 'string' }),
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'contentType', title: 'Best for content type', type: 'string' }),
            defineField({ name: 'rationale', title: 'Rationale', type: 'text', rows: 2 }),
            defineField({ name: 'confidence', title: 'Confidence', type: 'string' }),
          ],
          preview: {
            select: { day: 'dayOfWeek', time: 'time', tz: 'timezone', label: 'label' },
            prepare: ({ day, time, tz, label }) => ({
              title: `${day ?? '?'} ${time ?? ''} (${tz || 'ET'})`,
              subtitle: label,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'postingTimesResearch',
      title: 'Posting-Time Research',
      type: 'object',
      group: 'planning',
      readOnly: true,
      description: 'Provenance + cited sources for the recommended posting times.',
      fields: [
        defineField({ name: 'researchedAt', title: 'Researched At', type: 'datetime' }),
        defineField({ name: 'summary', title: 'Summary', type: 'text', rows: 2 }),
        defineField({ name: 'timezoneLogic', title: 'Timezone Logic', type: 'text', rows: 2 }),
        defineField({ name: 'avoid', title: 'Avoid', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'model', title: 'Model', type: 'string' }),
        defineField({
          name: 'sources',
          title: 'Sources',
          type: 'array',
          of: [
            {
              name: 'source',
              type: 'object',
              fields: [
                defineField({ name: 'title', title: 'Title', type: 'string' }),
                defineField({ name: 'url', title: 'URL', type: 'url' }),
              ],
              preview: { select: { title: 'title', subtitle: 'url' } },
            },
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      key: 'key',
      status: 'status',
      platform: 'platform',
    },
    prepare({ title, key, status, platform }) {
      const statusLabel = channelStatusOptions.find((option) => option.value === status)?.title || 'Active'
      const platformLabel = channelPlatformOptions.find((option) => option.value === platform)?.title || platform

      return {
        title: title || key || 'Untitled channel',
        subtitle: [statusLabel, platformLabel].filter(Boolean).join(' - '),
      }
    },
  },
})

export { channelPlatformOptions, channelStatusOptions, defaultMarketingChannels }
