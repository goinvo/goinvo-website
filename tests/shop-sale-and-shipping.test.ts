import { describe, expect, it } from 'vitest'

import {
  SHOP_SHIPPING_PRICE_CENTS,
  buildShippingOptions,
  resolveShippingCents,
  shippingCentsFromSettings,
} from '@/lib/shop/checkout'
import { MARKETING_FIELDS } from '@/lib/marketing/fieldPolicy'
import { shopStorefrontQuery } from '@/sanity/lib/queries'

describe('flat shipping is CMS-owned but bounded', () => {
  it('converts a CMS dollar rate to cents', () => {
    expect(shippingCentsFromSettings(9)).toBe(900)
    expect(shippingCentsFromSettings(12.5)).toBe(1250)
    expect(shippingCentsFromSettings(0)).toBe(0)
  })

  it('falls back to the built-in rate for anything unusable', () => {
    // A blank field, a cleared field, or a bad value must never reach Stripe.
    for (const bad of [undefined, null, NaN, Infinity, -1]) {
      expect(shippingCentsFromSettings(bad as number)).toBe(SHOP_SHIPPING_PRICE_CENTS)
      expect(resolveShippingCents(bad as number)).toBe(SHOP_SHIPPING_PRICE_CENTS)
    }
  })

  it('charges the rate it is given, rounded to whole cents', () => {
    const [option] = buildShippingOptions(900)
    expect(option.shipping_rate_data?.fixed_amount?.amount).toBe(900)
    const [fractional] = buildShippingOptions(899.6)
    expect(fractional.shipping_rate_data?.fixed_amount?.amount).toBe(900)
  })

  it('defaults to the built-in rate when called with nothing', () => {
    const [option] = buildShippingOptions()
    expect(option.shipping_rate_data?.fixed_amount?.amount).toBe(SHOP_SHIPPING_PRICE_CENTS)
  })
})

describe('compare-at price is display only', () => {
  it('is writable through the marketing API', () => {
    expect(MARKETING_FIELDS.marketingProduct).toContain('compareAtPrice')
    expect(MARKETING_FIELDS.marketingShopSettings).toContain('shippingFlatRate')
  })

  it('is fetched for the storefront alongside the real price', () => {
    expect(shopStorefrontQuery).toContain('compareAtPrice')
    expect(shopStorefrontQuery).toContain('shippingFlatRate')
  })

  it('never appears in the checkout pricing path', async () => {
    // The guard that matters: whatever the CMS says a piece "was", the money
    // charged is resolved from `price` alone. If compareAtPrice ever reaches
    // this module, a sale would change what a customer is billed.
    const catalog = await import('node:fs/promises')
    const source = await catalog.readFile('src/lib/shop/catalog.ts', 'utf8')
    const checkoutSection = source.slice(source.indexOf('resolveCheckoutCatalog'))
    expect(checkoutSection).not.toContain('compareAtPrice')

    const checkoutSource = await catalog.readFile('src/lib/shop/checkout.ts', 'utf8')
    expect(checkoutSource).not.toContain('compareAtPrice')
  })
})
