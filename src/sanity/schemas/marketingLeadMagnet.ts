import { defineField, defineType } from 'sanity'
import { LEAD_MAGNET_STATUS_OPTIONS } from '../../lib/marketing/enums'

export default defineType({
  name: 'marketingLeadMagnet',
  title: 'Lead Magnet',
  type: 'document',
  groups: [
    { name: 'magnet', title: 'Magnet', default: true },
    { name: 'capture', title: 'Capture' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'magnet',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'magnet',
      options: { source: 'title', maxLength: 96 },
      description: 'Stable id the subscribe endpoint looks the magnet up by.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'magnet',
      options: { list: LEAD_MAGNET_STATUS_OPTIONS, layout: 'radio' },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
      description: 'Only LIVE magnets accept signups; draft/retired are refused by the API.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'magnet',
    }),
    defineField({
      name: 'articlePath',
      title: 'Article Path',
      type: 'string',
      group: 'magnet',
      description: 'Site-relative path of the ungated article (e.g. /vision/clinical-ai-pilot-pre-mortem).',
    }),
    defineField({
      name: 'gatedAsset',
      title: 'Gated Asset (PDF)',
      type: 'file',
      group: 'capture',
      options: { accept: 'application/pdf' },
      description:
        'The email-gated download (e.g. the facilitator’s kit). Note: assets in this dataset are public by CDN URL — the gate is email-before-link, not access control.',
    }),
    defineField({
      name: 'emailOctopusTag',
      title: 'EmailOctopus Tag',
      type: 'string',
      group: 'capture',
      description: 'Tag applied to subscribers captured through this magnet.',
    }),
    defineField({
      name: 'offerKey',
      title: 'Outreach Offer Key',
      type: 'string',
      group: 'capture',
      description:
        'Key of the marketingOffer this magnet feeds (plain string — offers live in the private outreach dataset).',
    }),
    defineField({
      name: 'createOutreachContacts',
      title: 'Create Outreach Contacts',
      type: 'boolean',
      group: 'capture',
      initialValue: true,
      description:
        'When on, each signup also creates a cold contact in the private Outreach dataset (deduped by email).',
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', tag: 'emailOctopusTag' },
    prepare({ title, status, tag }) {
      return {
        title: title || 'Untitled lead magnet',
        subtitle: [status, tag].filter(Boolean).join(' / '),
      }
    },
  },
})
