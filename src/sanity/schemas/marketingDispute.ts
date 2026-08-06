import { WarningOutlineIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * A Stripe dispute (inquiry or chargeback) mirrored into the PRIVATE outreach
 * dataset — it carries the cardholder's claim text and the customer's email.
 *
 * Every field except `notes` is worker-owned and read-only: the record is
 * recomputed from live Stripe state on each event and on a daily reconcile, so
 * a hand edit would be silently overwritten. Notes are the one place a human
 * writes, and they become the evidence draft.
 */

export const disputeStatusOptions = [
  { title: 'Needs response', value: 'needs_response' },
  { title: 'Under review', value: 'under_review' },
  { title: 'Inquiry — needs response', value: 'warning_needs_response' },
  { title: 'Inquiry — under review', value: 'warning_under_review' },
  { title: 'Inquiry — closed', value: 'warning_closed' },
  { title: 'Won', value: 'won' },
  { title: 'Lost', value: 'lost' },
  { title: 'Prevented', value: 'prevented' },
]

export default defineType({
  name: 'marketingDispute',
  title: 'Shop Dispute',
  type: 'document',
  icon: WarningOutlineIcon,
  groups: [
    { name: 'dispute', title: 'Dispute', default: true },
    { name: 'response', title: 'Response' },
    { name: 'slack', title: 'Chat channel' },
  ],
  fields: [
    defineField({
      name: 'disputeId',
      title: 'Stripe dispute ID',
      type: 'string',
      group: 'dispute',
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'dispute',
      readOnly: true,
      options: { list: disputeStatusOptions },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'stage',
      title: 'Stage',
      type: 'string',
      group: 'dispute',
      readOnly: true,
      description: 'An inquiry holds no funds. A chargeback has already pulled the money back.',
      options: {
        list: [
          { title: 'Inquiry — no funds held', value: 'inquiry' },
          { title: 'Chargeback — funds held', value: 'chargeback' },
        ],
      },
    }),
    defineField({ name: 'reason', title: 'Reason', type: 'string', group: 'dispute', readOnly: true }),
    defineField({ name: 'amount', title: 'Disputed amount', type: 'number', group: 'dispute', readOnly: true }),
    defineField({ name: 'currency', title: 'Currency', type: 'string', group: 'dispute', readOnly: true }),
    defineField({ name: 'chargeId', title: 'Stripe charge ID', type: 'string', group: 'dispute', readOnly: true }),
    defineField({
      name: 'paymentIntentId',
      title: 'Stripe payment intent ID',
      type: 'string',
      group: 'dispute',
      readOnly: true,
      description: 'How this dispute is matched back to an order.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'reference',
      to: [{ type: 'marketingOrder' }],
      group: 'dispute',
      readOnly: true,
      description: 'The matched order, when one was found.',
    }),
    defineField({ name: 'orderNumber', title: 'Order number', type: 'string', group: 'dispute', readOnly: true }),
    defineField({ name: 'customerEmail', title: 'Customer email', type: 'string', group: 'dispute', readOnly: true }),
    defineField({ name: 'customerName', title: 'Customer name', type: 'string', group: 'dispute', readOnly: true }),
    defineField({ name: 'openedAt', title: 'Opened at', type: 'datetime', group: 'dispute', readOnly: true }),
    defineField({
      name: 'dueBy',
      title: 'Evidence due by',
      type: 'datetime',
      group: 'response',
      readOnly: true,
      description: 'A hard Stripe deadline. Missing it forfeits the dispute automatically.',
    }),
    defineField({
      name: 'canRespond',
      title: 'Can still respond',
      type: 'boolean',
      group: 'response',
      readOnly: true,
    }),
    defineField({
      name: 'submissionCount',
      title: 'Evidence submissions',
      type: 'number',
      group: 'response',
      readOnly: true,
      description: 'Stripe normally accepts only one submission, and it cannot be retracted.',
    }),
    defineField({
      name: 'evidenceSubmittedAt',
      title: 'Evidence submitted at',
      type: 'datetime',
      group: 'response',
      readOnly: true,
    }),
    defineField({
      name: 'evidenceSubmittedBy',
      title: 'Evidence submitted by',
      type: 'string',
      group: 'response',
      readOnly: true,
    }),
    defineField({
      name: 'notes',
      title: 'Response notes',
      type: 'array',
      group: 'response',
      description:
        'Everything typed in the dispute channel lands here. Nothing is sent anywhere until someone explicitly submits it.',
      of: [
        {
          name: 'disputeNote',
          title: 'Note',
          type: 'object',
          fields: [
            defineField({ name: 'authorName', title: 'Author', type: 'string' }),
            defineField({ name: 'text', title: 'Text', type: 'text', rows: 3 }),
            defineField({ name: 'createdAt', title: 'Created at', type: 'datetime' }),
            defineField({ name: 'slackMessageTs', title: 'Slack message ts', type: 'string' }),
            defineField({
              name: 'source',
              title: 'Source',
              type: 'string',
              options: { list: [{ title: 'Slack', value: 'slack' }, { title: 'System', value: 'system' }] },
            }),
          ],
          preview: {
            select: { title: 'authorName', subtitle: 'text' },
          },
        },
      ],
    }),
    defineField({
      name: 'slack',
      title: 'Slack',
      type: 'object',
      group: 'slack',
      readOnly: true,
      fields: [
        defineField({
          name: 'channelId',
          title: 'Dedicated channel ID',
          type: 'string',
          description:
            'Only ever a channel created for THIS dispute. Replies here become notes, so a shared channel must never be stored.',
        }),
        defineField({ name: 'channelName', title: 'Channel name', type: 'string' }),
        defineField({ name: 'alertMessageTs', title: 'Card message ts', type: 'string' }),
        defineField({
          name: 'alertChannelId',
          title: 'Channel the card was posted to',
          type: 'string',
          description: 'May be the shared shop channel; never used to capture replies.',
        }),
        defineField({ name: 'announceClaimAt', title: 'Announce claimed at', type: 'string' }),
        defineField({ name: 'channelError', title: 'Channel error', type: 'string' }),
      ],
    }),
    defineField({
      name: 'syncedAt',
      title: 'Last synced from Stripe',
      type: 'datetime',
      group: 'dispute',
      readOnly: true,
    }),
    defineField({ name: 'livemode', title: 'Stripe live mode', type: 'boolean', group: 'dispute', readOnly: true }),
  ],
  preview: {
    select: { title: 'orderNumber', status: 'status', amount: 'amount', currency: 'currency', stage: 'stage' },
    prepare({ title, status, amount, currency, stage }) {
      const formatted =
        typeof amount === 'number'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount)
          : 'Unknown amount'
      return {
        title: `Dispute · ${title || 'Unmatched order'}`,
        subtitle: `${status || 'unknown'} · ${stage || 'unknown stage'} · ${formatted}`,
      }
    },
  },
  orderings: [
    { title: 'Deadline first', name: 'dueByAsc', by: [{ field: 'dueBy', direction: 'asc' }] },
  ],
})
