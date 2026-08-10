import { describe, expect, it } from 'vitest'
import {
  SHOP_MAX_DONATION_CENTS,
  SHOP_PRINT_PRICE_CENTS,
  SHOP_SHIPPING_PRICE_CENTS,
  shopPriceCentsFor,
  buildShippingOptions,
  buildStripeLineItems,
  checkoutRequestSchema,
  isMissingStripeResource,
  withoutStoredStripePrices,
} from '@/lib/shop/checkout'
import { shopContactDocumentId, stripeOrderDocumentId } from '@/lib/shop/ids'
import { checkoutImageUrl } from '@/lib/shop/catalog'

const checkoutId = '017f22e2-79b0-4d1b-88f5-e7f8c18fe64b'

describe('Stripe storefront checkout', () => {
  it('accepts a bounded cart and rejects browser-supplied price fields', () => {
    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [{ slug: 'determinants-of-health', quantity: 1 }],
        donationCents: 1500,
      }).success,
    ).toBe(true)

    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [{ slug: 'determinants-of-health', quantity: 20 }],
        donationCents: 0,
      }).success,
    ).toBe(true)

    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [{ slug: 'determinants-of-health', quantity: 21 }],
        donationCents: 0,
      }).success,
    ).toBe(false)

    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [{ slug: 'determinants-of-health', quantity: 1, price: 1 }],
        donationCents: 1500,
      }).success,
    ).toBe(false)
  })

  it('rejects duplicate products and unbounded donations', () => {
    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [
          { slug: 'healthcare-dollars', quantity: 1 },
          { slug: 'healthcare-dollars', quantity: 1 },
        ],
        donationCents: 0,
      }).success,
    ).toBe(false)

    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [{ slug: 'healthcare-dollars', quantity: 1 }],
        donationCents: SHOP_MAX_DONATION_CENTS + 1,
      }).success,
    ).toBe(false)
  })

  it('allows pay-what-you-want support without a print but rejects an empty payment', () => {
    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [],
        donationCents: 1500,
      }).success,
    ).toBe(true)

    expect(
      checkoutRequestSchema.safeParse({
        checkoutId,
        items: [],
        donationCents: 0,
      }).success,
    ).toBe(false)

    const lineItems = buildStripeLineItems([], 1500)
    expect(lineItems).toHaveLength(1)
    expect(lineItems[0]).toEqual(
      expect.objectContaining({
        quantity: 1,
        price_data: expect.objectContaining({
          currency: 'usd',
          unit_amount: 1500,
          product_data: expect.objectContaining({
            name: 'Support open-source health design',
          }),
        }),
      }),
    )
  })

  it('builds Stripe line items from the trusted catalog price', () => {
    const lineItems = buildStripeLineItems(
      [
        {
          visualizationId: 'healthVisualization-1',
          marketingProductId: 'marketingProduct-1',
          slug: 'own-your-health-data',
          title: 'Own Your Health Data',
          currency: 'USD',
          unitAmount: 600,
          quantity: 1,
          imageUrl: 'https://cdn.example.com/own-your-health-data.jpg',
        },
      ],
      1500,
    )

    expect(lineItems).toHaveLength(2)
    expect(lineItems[0]).toEqual(
      expect.objectContaining({
        quantity: 1,
        price_data: expect.objectContaining({
          currency: 'usd',
          unit_amount: 600,
          product_data: expect.objectContaining({
            name: 'Own Your Health Data',
            metadata: expect.objectContaining({
              kind: 'poster',
              visualization_id: 'healthVisualization-1',
              marketing_product_id: 'marketingProduct-1',
            }),
          }),
        }),
      }),
    )
    expect(lineItems[1]).toEqual(
      expect.objectContaining({
        price_data: expect.objectContaining({
          unit_amount: 1500,
          product_data: expect.objectContaining({
            metadata: { kind: 'donation' },
          }),
        }),
      }),
    )
  })

  it('reuses a synced Stripe price instead of creating another catalog product', () => {
    const lineItems = buildStripeLineItems(
      [
        {
          visualizationId: 'healthVisualization-1',
          marketingProductId: 'marketingProduct-1',
          stripePriceId: 'price_synced_123',
          slug: 'own-your-health-data',
          title: 'Own Your Health Data',
          currency: 'USD',
          unitAmount: 600,
          quantity: 2,
        },
      ],
      0,
    )

    expect(lineItems).toEqual([
      {
        quantity: 2,
        price: 'price_synced_123',
      },
    ])
  })

  it('falls back to inline prices when catalog price IDs are foreign to the account', () => {
    // Price IDs are scoped to one Stripe account; after an account switch they
    // 404 and would otherwise break checkout for the entire catalog.
    const items = [
      {
        visualizationId: 'viz-1',
        slug: 'own-your-health-data',
        title: 'Own Your Health Data',
        currency: 'USD',
        unitAmount: 600,
        stripePriceId: 'price_from_the_old_account',
        quantity: 2,
      },
    ]
    expect(isMissingStripeResource({ code: 'resource_missing' })).toBe(true)
    expect(isMissingStripeResource({ message: "No such price: 'price_123'" })).toBe(true)
    expect(isMissingStripeResource(new Error('card_declined'))).toBe(false)

    const [storedLine] = buildStripeLineItems(items, 0)
    expect(storedLine.price).toBe('price_from_the_old_account')

    const [inlineLine] = buildStripeLineItems(withoutStoredStripePrices(items), 0)
    expect(inlineLine.price).toBeUndefined()
    expect(inlineLine.price_data).toMatchObject({ currency: 'usd', unit_amount: 600 })
    expect(inlineLine.quantity).toBe(2)
    // The original item is untouched, so a retry cannot corrupt the caller's data.
    expect(items[0].stripePriceId).toBe('price_from_the_old_account')
  })

  it('ships with one flat standard-US rate displayed as its own line', () => {
    const options = buildShippingOptions()
    expect(options).toHaveLength(1)
    expect(options[0].shipping_rate_data).toMatchObject({
      display_name: 'Standard US shipping',
      type: 'fixed_amount',
      fixed_amount: { amount: SHOP_SHIPPING_PRICE_CENTS, currency: 'usd' },
    })
    // The buyer-facing shipping price is never zero or hidden.
    expect(SHOP_SHIPPING_PRICE_CENTS).toBeGreaterThan(0)
  })

  it('uses deterministic CMS IDs so webhook retries cannot duplicate records', () => {
    expect(shopContactDocumentId(' Person@Example.com ')).toBe(
      shopContactDocumentId('person@example.com'),
    )
    expect(stripeOrderDocumentId('cs_test_123')).toBe(
      stripeOrderDocumentId('cs_test_123'),
    )
    expect(stripeOrderDocumentId('cs_test_123')).not.toBe(
      stripeOrderDocumentId('cs_test_456'),
    )
  })
})

describe('Per-piece pricing', () => {
  // The storefront card and the server-side checkout both resolve through
  // shopPriceCentsFor. If they ever stop agreeing, a visitor is shown one
  // number and charged another, which is the one bug in a shop that is never
  // acceptable.
  it('prices the comic book on its own and everything else at the print price', () => {
    expect(shopPriceCentsFor('own-your-health-data')).toBe(900)
    expect(shopPriceCentsFor('determinants-of-health')).toBe(SHOP_PRINT_PRICE_CENTS)
    expect(shopPriceCentsFor('a-slug-that-does-not-exist')).toBe(SHOP_PRINT_PRICE_CENTS)
    expect(shopPriceCentsFor(undefined)).toBe(SHOP_PRINT_PRICE_CENTS)
  })

  it('keeps every per-piece price a whole cent and above the Stripe floor', () => {
    for (const cents of [SHOP_PRINT_PRICE_CENTS, shopPriceCentsFor('own-your-health-data')]) {
      expect(Number.isSafeInteger(cents)).toBe(true)
      expect(cents).toBeGreaterThanOrEqual(50)
    }
  })

  it('carries the resolved price into the Stripe line item unchanged', () => {
    const [line] = buildStripeLineItems(
      [
        {
          visualizationId: 'viz-comic',
          slug: 'own-your-health-data',
          title: 'Own Your Health Data',
          currency: 'USD',
          unitAmount: shopPriceCentsFor('own-your-health-data'),
          quantity: 2,
        },
      ],
      0,
    )

    expect(line.price_data?.unit_amount).toBe(900)
    expect(line.quantity).toBe(2)
  })
})

describe('Checkout artwork', () => {
  it('asks Stripe for a sized copy of a Sanity poster, and leaves other hosts alone', () => {
    expect(
      checkoutImageUrl('https://cdn.sanity.io/images/a1wsimxr/production/abc-2000x2857.jpg'),
    ).toBe('https://cdn.sanity.io/images/a1wsimxr/production/abc-2000x2857.jpg?w=600&h=600&fit=max')
    expect(checkoutImageUrl('https://dd17w042cevyt.cloudfront.net/images/a.jpg')).toBe(
      'https://dd17w042cevyt.cloudfront.net/images/a.jpg',
    )
    expect(checkoutImageUrl(undefined)).toBeUndefined()
  })
})
