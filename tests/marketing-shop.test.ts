import { describe, expect, it } from 'vitest'

import { buildCreatePayload } from '@/lib/marketing'
import { ARRAY_ITEM_TYPES, DEFAULTS, REQUIRED_FIELDS } from '@/lib/marketing/defaults'
import { MARKETING_FIELDS } from '@/lib/marketing/fieldPolicy'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'
import { MARKETING_OPERATION_TARGET_VIEWS } from '@/lib/marketing/operations'
import { shopStorefrontQuery } from '@/sanity/lib/queries'
import {
  MARKETING_SURFACES,
  MARKETING_TOOL_VIEWS,
  resolveMarketingViewParam,
} from '@/sanity/tools/marketingTool'
import { schemaTypes } from '@/sanity/schemas'
import productSchema from '@/sanity/schemas/marketingProduct'
import orderSchema from '@/sanity/schemas/marketingOrder'
import shopSettingsSchema, {
  MARKETING_SHOP_SETTINGS_ID,
} from '@/sanity/schemas/marketingShopSettings'
import { formatPosterInquiryMessage } from '@/lib/chat/entry'

type SchemaField = {
  name: string
  type?: string
  fields?: SchemaField[]
  of?: Array<{ name?: string; fields?: SchemaField[] }>
}
type DocumentSchema = { name: string; fields: SchemaField[] }

function field(schema: unknown, name: string) {
  const found = (schema as DocumentSchema).fields.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Expected ${String((schema as DocumentSchema).name)}.${name}`)
  return found
}

describe('marketing shop', () => {
  it('registers the commerce documents and workspace route', () => {
    const names = schemaTypes.map((schema) => (schema as { name: string }).name)
    expect(names).toEqual(
      expect.arrayContaining(['marketingProduct', 'marketingOrder', 'marketingShopSettings']),
    )
    expect(MARKETING_TOOL_VIEWS.some((view) => view.id === 'shop')).toBe(true)
    expect(MARKETING_SURFACES.find((surface) => surface.id === 'shop')).toEqual(
      expect.objectContaining({ landingView: 'shop' }),
    )
    expect(resolveMarketingViewParam('shop')).toBe('shop')
    expect(MARKETING_OPERATION_TARGET_VIEWS).toContain('shop')
  })

  it('keeps products, orders, and shop settings inside the fail-closed CRUD policy', () => {
    for (const type of ['marketingProduct', 'marketingOrder', 'marketingShopSettings'] as const) {
      expect(MANAGED_MARKETING_TYPES).toContain(type)
      expect(DEFAULTS[type]).toBeDefined()
      expect(ARRAY_ITEM_TYPES[type]).toBeDefined()
      expect(REQUIRED_FIELDS[type].length).toBeGreaterThan(0)
      expect(MARKETING_FIELDS[type].length).toBeGreaterThan(0)
    }
    expect(ARRAY_ITEM_TYPES.marketingOrder).toEqual({ items: 'shopOrderItem' })
  })

  it('models inventory and hosted checkout without storing payment secrets', () => {
    for (const name of [
      'sku',
      'trackInventory',
      'inventoryQuantity',
      'lowStockThreshold',
      'allowBackorder',
      'price',
      'currency',
      'checkoutUrl',
      'sourceVisualization',
      'stripeProductId',
      'stripePriceId',
      'stripeSyncedAt',
    ]) {
      field(productSchema, name)
    }
    expect(field(productSchema, 'checkoutUrl').type).toBe('url')
    expect(field(productSchema, 'sourceVisualization').type).toBe('reference')
    expect((productSchema as DocumentSchema).fields.map((candidate) => candidate.name)).not.toEqual(
      expect.arrayContaining(['apiKey', 'secret', 'cardNumber']),
    )
  })

  it('uses the health visualization catalog as the storefront inventory', () => {
    expect(String(shopStorefrontQuery)).toContain('_type == "healthVisualization"')
    expect(String(shopStorefrontQuery)).toContain('"visualizations"')
  })

  it('links order customers to marketing contacts and snapshots order items', () => {
    expect(field(orderSchema, 'contact').type).toBe('reference')
    const items = field(orderSchema, 'items')
    expect((items as unknown as { description?: string }).description).toContain('pay-what-you-want')
    const itemFields = items.of?.[0]?.fields?.map((candidate) => candidate.name) || []
    expect(itemFields).toEqual(
      expect.arrayContaining(['product', 'visualization', 'title', 'sku', 'quantity', 'unitPrice']),
    )

    const payload = buildCreatePayload('marketingOrder', {
      orderNumber: 'SHOP-20260728-00001',
      placedAt: '2026-07-28T15:00:00.000Z',
      items: [
        {
          product: { _type: 'reference', _ref: 'product-1' },
          title: 'Health Design Field Guide',
          sku: 'HD-FIELD-GUIDE',
          quantity: 2,
          unitPrice: 24,
        },
      ],
      subtotal: 48,
      total: 48,
      customerName: 'Avery Rivera',
      customerEmail: 'avery@example.com',
    })
    expect(payload.status).toBe('pending')
    expect(payload.currency).toBe('USD')
    expect(payload.donation).toBe(0)
    expect(payload.items).toEqual([
      expect.objectContaining({
        _key: expect.any(String),
        _type: 'shopOrderItem',
        quantity: 2,
      }),
    ])
  })

  it('uses a singleton shop settings document with contact sync and safe connection metadata', () => {
    expect(MARKETING_SHOP_SETTINGS_ID).toBe('marketingShopSettings')
    for (const name of [
      'storefrontEnabled',
      'provider',
      'connectionStatus',
      'accountLabel',
      'dashboardUrl',
      'webhookStatus',
      'syncContacts',
      'contactSourceNote',
    ]) {
      field(shopSettingsSchema, name)
    }
    expect(DEFAULTS.marketingShopSettings).toEqual(
      expect.objectContaining({
        storefrontEnabled: false,
        provider: 'none',
        connectionStatus: 'notConnected',
        syncContacts: true,
      }),
    )
  })

  it('formats guided poster requests for the staff chat handoff', () => {
    expect(
      formatPosterInquiryMessage({
        use: 'other',
        otherUse: 'A neighborhood health fair',
        posters: 'Determinants of Health and Health Cards',
        quantity: 'About 40',
        destination: 'Somerville, MA, USA',
        timeline: 'October 15',
      }),
    ).toBe(
      [
        'Poster print inquiry',
        'Intended use: A neighborhood health fair',
        'Posters or topics: Determinants of Health and Health Cards',
        'Approximate quantity: About 40',
        'Shipping destination: Somerville, MA, USA',
        'Needed by: October 15',
      ].join('\n'),
    )
  })
})
