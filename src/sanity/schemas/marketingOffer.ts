import { defineField, defineType } from 'sanity'
import { OFFER_STATUS_OPTIONS } from '@/lib/marketing/outreachEnums'

/**
 * A productized offer in the outreach catalog. The outreach research pass
 * matches each contact against ACTIVE offers to propose what GoInvo can present
 * on a call. Edit these (one-liner, price band, proof) without touching code —
 * the research prompt reads them live.
 */
export default defineType({
  name: 'marketingOffer',
  title: 'Outreach Offer',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Offer Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'key',
      title: 'Offer Key',
      type: 'string',
      description: 'Stable lowercase key referenced by contact research (e.g. ai-pilot-premortem).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: OFFER_STATUS_OPTIONS, layout: 'radio' },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'oneLiner',
      title: 'One-Liner',
      type: 'text',
      rows: 2,
      description: 'The offer in one sentence, as you would say it on a call.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'priceBand',
      title: 'Price Band',
      type: 'string',
      description: 'What a committee needs to see — e.g. "Fixed fee, $40–80K, 4–6 weeks".',
    }),
    defineField({
      name: 'idealBuyer',
      title: 'Ideal Buyer',
      type: 'text',
      rows: 2,
      description: 'Role + org type this offer is aimed at.',
    }),
    defineField({
      name: 'proofPoints',
      title: 'Proof Points',
      type: 'text',
      rows: 3,
      description: 'Named, verifiable proof supporting this offer (Ipsos Facto, CodeRyte…).',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 100,
      description: 'Sort order in lists (lower first).',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'oneLiner', status: 'status' },
    prepare({ title, subtitle, status }) {
      return {
        title: `${title || 'Untitled offer'}${status === 'paused' ? ' (paused)' : ''}`,
        subtitle,
      }
    },
  },
})
