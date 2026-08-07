import { BasketIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const productStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]

export const productKindOptions = [
  { title: 'Physical product', value: 'physical' },
  { title: 'Digital product', value: 'digital' },
  { title: 'Service', value: 'service' },
]

export default defineType({
  name: 'marketingProduct',
  title: 'Shop Product',
  type: 'document',
  icon: BasketIcon,
  groups: [
    { name: 'storefront', title: 'Storefront', default: true },
    { name: 'inventory', title: 'Inventory' },
    { name: 'checkout', title: 'Checkout' },
    { name: 'marketing', title: 'Marketing' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Product name',
      type: 'string',
      group: 'storefront',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'storefront',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sourceVisualization',
      title: 'Source health visualization',
      type: 'reference',
      group: 'storefront',
      to: [{ type: 'healthVisualization' }],
      description: 'Links this print to the visualization that supplies its downloadable source.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'storefront',
      options: { list: productStatusOptions, layout: 'radio' },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Product type',
      type: 'string',
      group: 'storefront',
      options: { list: productKindOptions, layout: 'radio' },
      initialValue: 'physical',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Storefront description',
      type: 'text',
      rows: 4,
      group: 'storefront',
      validation: (Rule) => Rule.max(800),
    }),
    defineField({
      name: 'image',
      title: 'Product image',
      type: 'image',
      group: 'storefront',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (Rule) => Rule.max(180),
        }),
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured product',
      type: 'boolean',
      group: 'storefront',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      group: 'storefront',
      initialValue: 100,
      description: 'Lower numbers appear first.',
    }),
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: 'inventory',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'trackInventory',
      title: 'Track inventory',
      type: 'boolean',
      group: 'inventory',
      initialValue: true,
    }),
    defineField({
      name: 'inventoryQuantity',
      title: 'Quantity on hand',
      type: 'number',
      group: 'inventory',
      initialValue: 0,
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: 'lowStockThreshold',
      title: 'Low-stock threshold',
      type: 'number',
      group: 'inventory',
      initialValue: 5,
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: 'allowBackorder',
      title: 'Allow backorders',
      type: 'boolean',
      group: 'inventory',
      initialValue: false,
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      group: 'checkout',
      validation: (Rule) => Rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      group: 'checkout',
      initialValue: 'USD',
      validation: (Rule) => Rule.required().regex(/^[A-Z]{3}$/, { name: 'ISO currency code' }),
    }),
    defineField({
      name: 'checkoutUrl',
      title: 'Payment link',
      type: 'url',
      group: 'checkout',
      description:
        'A hosted payment link from Stripe, Square, PayPal, Shopify, or another processor. Leave blank to show “Contact to order.”',
    }),
    defineField({
      name: 'stripeProductId',
      title: 'Stripe product ID',
      type: 'string',
      group: 'checkout',
      readOnly: true,
      description: 'Managed by the Stripe catalog sync.',
    }),
    defineField({
      name: 'stripePriceId',
      title: 'Stripe price ID',
      type: 'string',
      group: 'checkout',
      readOnly: true,
      description: 'Current reusable Stripe Price managed by the catalog sync.',
    }),
    defineField({
      name: 'stripePriceUnitAmount',
      title: 'Synced Stripe amount in cents',
      type: 'number',
      group: 'checkout',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'stripePriceCurrency',
      title: 'Synced Stripe currency',
      type: 'string',
      group: 'checkout',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'stripeSyncedAt',
      title: 'Last synced to Stripe',
      type: 'datetime',
      group: 'checkout',
      readOnly: true,
    }),
    defineField({
      name: 'campaign',
      title: 'Campaign',
      type: 'reference',
      group: 'marketing',
      to: [{ type: 'marketingCampaign' }],
    }),
    defineField({
      name: 'audiences',
      title: 'Audiences',
      type: 'array',
      group: 'marketing',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
    }),
    defineField({
      name: 'notes',
      title: 'Internal notes',
      type: 'text',
      rows: 3,
      group: 'marketing',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      sku: 'sku',
      price: 'price',
      currency: 'currency',
      quantity: 'inventoryQuantity',
      status: 'status',
      media: 'image',
    },
    prepare({ title, sku, price, currency, quantity, status, media }) {
      const formattedPrice =
        typeof price === 'number'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price)
          : 'No price'
      return {
        title: title || 'Untitled product',
        subtitle: `${status || 'draft'} · ${sku || 'no SKU'} · ${formattedPrice} · ${quantity ?? 0} in stock`,
        media,
      }
    },
  },
})
