import { describe, expect, it } from 'vitest'
import {
  STRIPE_CATALOG_SOURCE,
  marketingProductIdForVisualization,
  skuForVisualization,
  stripeCatalogIdempotencyKey,
  stripePriceLookupKey,
  stripePriceParams,
  stripeProductParams,
  type StripeCatalogProduct,
} from '@/lib/shop/stripeCatalog'

const product: StripeCatalogProduct = {
  _id: 'marketingProduct.healthVisualization-123',
  title: 'Determinants of Health',
  slug: 'determinants-of-health',
  description: 'The forces shaping health and wellbeing.',
  status: 'active',
  kind: 'physical',
  sku: 'PRINT-DETERMINANTS-OF-HEALTH',
  price: 6,
  currency: 'USD',
  imageUrl: 'https://cdn.sanity.io/images/example/poster.jpg',
  visualizationId: 'healthVisualization-determinants',
}

describe('Stripe catalog sync helpers', () => {
  it('generates deterministic Sanity IDs, SKUs, lookup keys, and idempotency keys', () => {
    expect(marketingProductIdForVisualization('visualization-1')).toBe(
      marketingProductIdForVisualization('visualization-1'),
    )
    expect(marketingProductIdForVisualization('visualization-1')).not.toBe(
      marketingProductIdForVisualization('visualization-2'),
    )
    expect(skuForVisualization('determinants-of-health')).toBe(
      'PRINT-DETERMINANTS-OF-HEALTH',
    )
    expect(skuForVisualization('a-very-long-visualization-slug-'.repeat(5))).toHaveLength(80)
    expect(stripePriceLookupKey(product._id, 'USD')).toMatch(/^goinvo_shop_[a-f0-9]{24}_usd$/)
    expect(stripeCatalogIdempotencyKey('product', product._id)).toHaveLength(92)
  })

  it('maps one CMS product to a reusable Stripe product and price', () => {
    expect(stripeProductParams(product)).toEqual(
      expect.objectContaining({
        name: 'Determinants of Health',
        active: true,
        shippable: true,
        images: [product.imageUrl],
        metadata: expect.objectContaining({
          catalog_source: STRIPE_CATALOG_SOURCE,
          kind: 'poster',
          marketing_product_id: product._id,
          visualization_id: product.visualizationId,
        }),
      }),
    )
    expect(stripePriceParams(product, 'prod_123')).toEqual(
      expect.objectContaining({
        product: 'prod_123',
        currency: 'usd',
        unit_amount: 600,
        transfer_lookup_key: true,
        metadata: expect.objectContaining({
          catalog_source: STRIPE_CATALOG_SOURCE,
          marketing_product_id: product._id,
        }),
      }),
    )
  })
})
