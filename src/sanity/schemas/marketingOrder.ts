import { BillIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const orderStatusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Paid', value: 'paid' },
  { title: 'Processing', value: 'processing' },
  { title: 'Fulfilled', value: 'fulfilled' },
  { title: 'Canceled', value: 'canceled' },
  { title: 'Refunded', value: 'refunded' },
]

export default defineType({
  name: 'marketingOrder',
  title: 'Shop Order',
  type: 'document',
  icon: BillIcon,
  groups: [
    { name: 'order', title: 'Order', default: true },
    { name: 'customer', title: 'Customer' },
    { name: 'payment', title: 'Payment' },
    { name: 'attribution', title: 'Marketing attribution' },
    { name: 'settlement', title: 'Settlement (automatic)' },
  ],
  fields: [
    defineField({
      name: 'orderNumber',
      title: 'Order number',
      type: 'string',
      group: 'order',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'order',
      options: { list: orderStatusOptions, layout: 'radio' },
      initialValue: 'pending',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'placedAt',
      title: 'Placed at',
      type: 'datetime',
      group: 'order',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      group: 'order',
      description: 'May be empty for a pay-what-you-want support payment.',
      validation: (Rule) =>
        Rule.custom((items, context) => {
          const parent = context.parent as { donation?: number } | undefined
          return (Array.isArray(items) && items.length > 0) || (parent?.donation || 0) > 0
            ? true
            : 'Add at least one product or a support amount.'
        }),
      of: [
        {
          name: 'shopOrderItem',
          title: 'Order item',
          type: 'object',
          fields: [
            // Weak: orders live in the private outreach dataset, their targets
            // in the public one. A strong reference across datasets is rejected
            // outright, so Studio edits must not re-strengthen these.
            defineField({
              name: 'product',
              title: 'Product',
              type: 'reference',
              to: [{ type: 'marketingProduct' }],
              weak: true,
              description: 'Linked shop product when one exists (weak: lives in the public dataset).',
            }),
            defineField({
              name: 'visualization',
              title: 'Health visualization',
              type: 'reference',
              to: [{ type: 'healthVisualization' }],
              weak: true,
              description: 'Source visualization (weak: lives in the public dataset).',
            }),
            defineField({
              name: 'title',
              title: 'Product name snapshot',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'sku',
              title: 'SKU snapshot',
              type: 'string',
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              validation: (Rule) => Rule.required().integer().min(1),
            }),
            defineField({
              name: 'unitPrice',
              title: 'Unit price',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).precision(2),
            }),
          ],
          preview: {
            select: { title: 'title', quantity: 'quantity', unitPrice: 'unitPrice' },
            prepare: ({ title, quantity, unitPrice }) => ({
              title: `${quantity || 0} × ${title || 'Product'}`,
              subtitle: typeof unitPrice === 'number' ? `$${unitPrice.toFixed(2)} each` : undefined,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'subtotal',
      title: 'Subtotal',
      type: 'number',
      group: 'order',
      validation: (Rule) => Rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'shipping',
      title: 'Shipping',
      type: 'number',
      group: 'order',
      initialValue: 0,
      description: 'Shipping charged on this order, and already counted inside Total. Standard US shipping has been '
        + 'its own $6 line since 2026-08-05 - it is NOT included in the print price.',
      validation: (Rule) => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'donation',
      title: 'Optional support',
      type: 'number',
      group: 'order',
      initialValue: 0,
      validation: (Rule) => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'tax',
      title: 'Tax',
      type: 'number',
      group: 'order',
      initialValue: 0,
      validation: (Rule) => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'total',
      title: 'Total',
      type: 'number',
      group: 'order',
      validation: (Rule) => Rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      group: 'order',
      initialValue: 'USD',
      validation: (Rule) => Rule.required().regex(/^[A-Z]{3}$/, { name: 'ISO currency code' }),
    }),
    defineField({
      name: 'contact',
      title: 'Marketing contact',
      type: 'reference',
      group: 'customer',
      to: [{ type: 'marketingContact' }],
      description: 'Links the customer to Outreach and other marketing data.',
    }),
    defineField({
      name: 'customerName',
      title: 'Customer name snapshot',
      type: 'string',
      group: 'customer',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'customerEmail',
      title: 'Customer email snapshot',
      type: 'email',
      group: 'customer',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shippingAddress',
      title: 'Shipping address',
      type: 'text',
      rows: 4,
      group: 'customer',
    }),
    defineField({
      name: 'processor',
      title: 'Payment processor',
      type: 'string',
      group: 'payment',
    }),
    defineField({
      name: 'processorPaymentId',
      title: 'Processor payment ID',
      type: 'string',
      group: 'payment',
      description: 'Safe external reference only. Never paste card numbers or secret API keys here.',
    }),
    defineField({
      name: 'paymentUrl',
      title: 'Payment receipt or dashboard URL',
      type: 'url',
      group: 'payment',
    }),
    defineField({
      name: 'campaign',
      title: 'Campaign',
      type: 'reference',
      group: 'attribution',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({ name: 'utmSource', title: 'UTM source', type: 'string', group: 'attribution' }),
    defineField({ name: 'utmMedium', title: 'UTM medium', type: 'string', group: 'attribution' }),
    defineField({ name: 'utmCampaign', title: 'UTM campaign', type: 'string', group: 'attribution' }),
    defineField({
      name: 'notes',
      title: 'Internal notes',
      type: 'text',
      rows: 3,
      group: 'order',
    }),

    /**
     * Settlement is WORKER-OWNED and recomputed from live Stripe state, so all
     * of it is read-only: a hand edit would be overwritten by the next event or
     * the daily reconcile. `status` stays the human fulfilment lifecycle — the
     * two never contend, which is why a won dispute cannot clobber a shipment
     * someone already marked fulfilled.
     */
    defineField({
      name: 'livemode',
      title: 'Real payment',
      type: 'boolean',
      group: 'settlement',
      readOnly: true,
      description: 'False for Stripe sandbox orders. Test orders are excluded from revenue totals.',
    }),
    defineField({
      name: 'processorChargeId',
      title: 'Stripe charge ID',
      type: 'string',
      group: 'settlement',
      readOnly: true,
    }),
    defineField({
      name: 'settlementState',
      title: 'Settlement state',
      type: 'string',
      group: 'settlement',
      readOnly: true,
      description: 'Money truth, derived from Stripe. Do not ship on disputeOpen, disputeLost, or refunded.',
    }),
    defineField({ name: 'amountCaptured', title: 'Captured', type: 'number', group: 'settlement', readOnly: true }),
    defineField({ name: 'amountRefunded', title: 'Refunded', type: 'number', group: 'settlement', readOnly: true }),
    defineField({
      name: 'amountDisputeHeld',
      title: 'Held by open chargeback',
      type: 'number',
      group: 'settlement',
      readOnly: true,
    }),
    defineField({
      name: 'amountLostToDispute',
      title: 'Lost to chargeback',
      type: 'number',
      group: 'settlement',
      readOnly: true,
    }),
    defineField({
      name: 'netCollected',
      title: 'Net collected',
      type: 'number',
      group: 'settlement',
      readOnly: true,
      description: 'Captured minus refunds, chargeback losses, and funds currently held.',
    }),
    defineField({
      name: 'ledgerSyncedAt',
      title: 'Ledger synced at',
      type: 'datetime',
      group: 'settlement',
      readOnly: true,
    }),
    defineField({
      name: 'ledgerSyncError',
      title: 'Ledger sync error',
      type: 'string',
      group: 'settlement',
      readOnly: true,
      description: 'Set when the last reconcile failed, so a silent stale ledger is visible.',
    }),
  ],
  preview: {
    select: {
      title: 'orderNumber',
      customer: 'customerName',
      status: 'status',
      total: 'total',
      currency: 'currency',
    },
    prepare({ title, customer, status, total, currency }) {
      const formattedTotal =
        typeof total === 'number'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(total)
          : 'No total'
      return {
        title: title || 'Order',
        subtitle: `${status || 'pending'} · ${customer || 'Unknown customer'} · ${formattedTotal}`,
      }
    },
  },
  orderings: [
    {
      title: 'Newest first',
      name: 'placedAtDesc',
      by: [{ field: 'placedAt', direction: 'desc' }],
    },
  ],
})
