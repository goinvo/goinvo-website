import { defineField, defineType } from 'sanity'
import { targetSiteFields } from './marketingCampaign'

const analyticsProviderOptions = [
  { title: 'Google Analytics 4', value: 'ga4' },
  { title: 'Google Tag Manager', value: 'gtm' },
  { title: 'Vercel Web Analytics', value: 'vercelAnalytics' },
  { title: 'Vercel Speed Insights', value: 'vercelSpeedInsights' },
  { title: 'Looker Studio', value: 'lookerStudio' },
  { title: 'Other', value: 'other' },
]

const analyticsStatusOptions = [
  { title: 'Planned', value: 'planned' },
  { title: 'Connected', value: 'connected' },
  { title: 'Needs Review', value: 'needsReview' },
  { title: 'Disabled', value: 'disabled' },
]

export default defineType({
  name: 'marketingAnalyticsSource',
  title: 'Marketing Analytics Source',
  type: 'document',
  groups: [
    { name: 'connection', title: 'Connection', default: true },
    { name: 'coverage', title: 'Coverage' },
    { name: 'reporting', title: 'Reporting' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Source Name',
      type: 'string',
      group: 'connection',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      group: 'connection',
      options: { list: analyticsProviderOptions, layout: 'radio' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'connection',
      options: { list: analyticsStatusOptions, layout: 'radio' },
      initialValue: 'planned',
      validation: (Rule) =>
        Rule.required().custom((status, context) => {
          if (status !== 'connected') return true
          const document = context.document as {
            provider?: string
            propertyId?: string
            containerId?: string
            vercelProject?: string
            vercelProjectId?: string
            dashboardUrl?: string
          } | undefined
          if (document?.provider === 'ga4' && !document.propertyId?.trim()) return 'Add the GA4 Property ID before marking this source Connected.'
          if (document?.provider === 'gtm' && !document.containerId?.trim()) return 'Add the GTM Container ID before marking this source Connected.'
          if (
            (document?.provider === 'vercelAnalytics' || document?.provider === 'vercelSpeedInsights') &&
            !document.vercelProjectId?.trim() &&
            !document.vercelProject?.trim()
          ) return 'Add the Vercel project name or project ID before marking this source Connected.'
          if ((document?.provider === 'lookerStudio' || document?.provider === 'other') && !document.dashboardUrl?.trim()) {
            return 'Add the reporting dashboard URL before marking this source Connected.'
          }
          return true
        }),
    }),
    defineField({
      name: 'propertyId',
      title: 'GA4 Property ID',
      type: 'string',
      group: 'connection',
      hidden: ({ document }) => document?.provider !== 'ga4',
    }),
    defineField({
      name: 'measurementId',
      title: 'GA4 Measurement ID',
      type: 'string',
      group: 'connection',
      hidden: ({ document }) => document?.provider !== 'ga4',
    }),
    defineField({
      name: 'containerId',
      title: 'GTM Container ID',
      type: 'string',
      group: 'connection',
      hidden: ({ document }) => document?.provider !== 'gtm',
    }),
    defineField({
      name: 'vercelProject',
      title: 'Vercel Project',
      type: 'string',
      group: 'connection',
      hidden: ({ document }) =>
        document?.provider !== 'vercelAnalytics' && document?.provider !== 'vercelSpeedInsights',
    }),
    defineField({
      name: 'vercelProjectId',
      title: 'Vercel Project ID',
      type: 'string',
      group: 'connection',
      readOnly: true,
      hidden: ({ document }) =>
        document?.provider !== 'vercelAnalytics' && document?.provider !== 'vercelSpeedInsights',
    }),
    defineField({
      name: 'vercelTeamSlug',
      title: 'Vercel Team Slug',
      type: 'string',
      group: 'connection',
      readOnly: true,
      hidden: ({ document }) =>
        document?.provider !== 'vercelAnalytics' && document?.provider !== 'vercelSpeedInsights',
    }),
    defineField({
      name: 'productionUrl',
      title: 'Production URL',
      type: 'url',
      group: 'coverage',
      hidden: ({ document }) =>
        document?.provider !== 'vercelAnalytics' && document?.provider !== 'vercelSpeedInsights',
    }),
    defineField({
      name: 'lastSyncedAt',
      title: 'Last Synced from Vercel CLI',
      type: 'datetime',
      group: 'connection',
      readOnly: true,
      hidden: ({ document }) =>
        document?.provider !== 'vercelAnalytics' && document?.provider !== 'vercelSpeedInsights',
    }),
    defineField({
      name: 'dashboardUrl',
      title: 'Dashboard URL',
      type: 'url',
      group: 'reporting',
      description: 'Link to GA4, GTM, Vercel, Looker Studio, or another reporting surface.',
    }),
    defineField({
      name: 'reportingCadence',
      title: 'Reporting Cadence',
      type: 'string',
      group: 'reporting',
      options: {
        list: [
          { title: 'Daily', value: 'daily' },
          { title: 'Weekly', value: 'weekly' },
          { title: 'Monthly', value: 'monthly' },
          { title: 'Quarterly', value: 'quarterly' },
          { title: 'As needed', value: 'asNeeded' },
        ],
      },
      initialValue: 'monthly',
    }),
    defineField({
      name: 'targetSites',
      title: 'Covered Sites',
      type: 'array',
      group: 'coverage',
      of: [
        {
          name: 'targetSite',
          title: 'Covered Site',
          type: 'object',
          fields: targetSiteFields,
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        },
      ],
    }),
    defineField({
      name: 'keyMetrics',
      title: 'Key Metrics',
      type: 'array',
      group: 'reporting',
      of: [
        {
          name: 'keyMetric',
          title: 'Key Metric',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Metric', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'definition', title: 'Definition', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'definition' },
          },
        },
      ],
    }),
    defineField({
      name: 'implementationNotes',
      title: 'Implementation Notes',
      type: 'text',
      rows: 4,
      group: 'connection',
      description: 'Do not store API secrets here. Keep credentials in environment variables or provider access control.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      provider: 'provider',
      status: 'status',
    },
    prepare({ title, provider, status }) {
      const providerLabel = analyticsProviderOptions.find((option) => option.value === provider)?.title || 'Analytics'
      const statusLabel = analyticsStatusOptions.find((option) => option.value === status)?.title || 'Planned'

      return {
        title: title || providerLabel,
        subtitle: `${providerLabel} - ${statusLabel}`,
      }
    },
  },
})

export { analyticsProviderOptions, analyticsStatusOptions }
