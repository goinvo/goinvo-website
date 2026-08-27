import { CreditCardIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const MARKETING_SHOP_SETTINGS_ID = 'marketingShopSettings'

export const paymentProviderOptions = [
  { title: 'Stripe', value: 'stripe' },
  { title: 'Square', value: 'square' },
  { title: 'PayPal', value: 'paypal' },
  { title: 'Shopify', value: 'shopify' },
  { title: 'Custom processor', value: 'custom' },
  { title: 'Not connected', value: 'none' },
]

export default defineType({
  name: 'marketingShopSettings',
  title: 'Shop Settings',
  type: 'document',
  icon: CreditCardIcon,
  groups: [
    { name: 'storefront', title: 'Storefront', default: true },
    { name: 'payments', title: 'Payments' },
    { name: 'contacts', title: 'Contacts' },
  ],
  fields: [
    defineField({
      name: 'storeName',
      title: 'Store name',
      type: 'string',
      group: 'storefront',
      initialValue: 'GoInvo Shop',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headline',
      title: 'Storefront headline',
      type: 'string',
      group: 'storefront',
      initialValue: 'Tools and artifacts for healthier systems.',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'description',
      title: 'Storefront description',
      type: 'text',
      rows: 3,
      group: 'storefront',
      initialValue: 'Practical objects, guides, and design resources created by GoInvo.',
      validation: (Rule) => Rule.max(500),
    }),
    defineField({
      name: 'storefrontEnabled',
      title: 'Publish the storefront',
      type: 'boolean',
      group: 'storefront',
      initialValue: false,
    }),
    defineField({
      name: 'supportEmail',
      title: 'Support email',
      type: 'email',
      group: 'storefront',
      initialValue: 'hello@goinvo.com',
    }),
    defineField({
      name: 'shippingFlatRate',
      title: 'Flat US shipping',
      type: 'number',
      group: 'storefront',
      description:
        'Charged once per order however many prints are in it. Both the storefront and the ' +
        'Stripe checkout read this, so they can never disagree. Leave empty to fall back to the ' +
        'built-in default.',
      validation: (Rule) => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'provider',
      title: 'Payment processor',
      type: 'string',
      group: 'payments',
      options: { list: paymentProviderOptions, layout: 'radio' },
      initialValue: 'none',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'connectionStatus',
      title: 'Connection status',
      type: 'string',
      group: 'payments',
      options: {
        list: [
          { title: 'Not connected', value: 'notConnected' },
          { title: 'Test mode', value: 'test' },
          { title: 'Connected', value: 'connected' },
          { title: 'Needs attention', value: 'error' },
        ],
        layout: 'radio',
      },
      initialValue: 'notConnected',
    }),
    defineField({
      name: 'accountLabel',
      title: 'Connected account label',
      type: 'string',
      group: 'payments',
      description: 'A safe display label such as “GoInvo Stripe”. Do not store API keys or secrets here.',
    }),
    defineField({
      name: 'dashboardUrl',
      title: 'Processor dashboard URL',
      type: 'url',
      group: 'payments',
    }),
    defineField({
      name: 'webhookStatus',
      title: 'Webhook status',
      type: 'string',
      group: 'payments',
      options: {
        list: [
          { title: 'Not configured', value: 'notConfigured' },
          { title: 'Configured', value: 'configured' },
          { title: 'Needs attention', value: 'error' },
        ],
      },
      initialValue: 'notConfigured',
    }),
    defineField({
      name: 'syncContacts',
      title: 'Sync customers to marketing contacts',
      type: 'boolean',
      group: 'contacts',
      initialValue: true,
      description: 'New shop customers are created or matched in Marketing → Outreach by email.',
    }),
    defineField({
      name: 'contactSegment',
      title: 'Default contact segment',
      type: 'string',
      group: 'contacts',
      initialValue: 'other',
    }),
    defineField({
      name: 'contactSourceNote',
      title: 'Contact source note',
      type: 'string',
      group: 'contacts',
      initialValue: 'GoInvo Shop customer',
    }),
  ],
  preview: {
    select: { title: 'storeName', provider: 'provider', status: 'connectionStatus' },
    prepare: ({ title, provider, status }) => ({
      title: title || 'Shop Settings',
      subtitle: `${provider || 'none'} · ${status || 'not connected'}`,
    }),
  },
})
