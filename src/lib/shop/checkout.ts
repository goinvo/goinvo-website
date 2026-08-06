import type Stripe from 'stripe'
import { z } from 'zod'

export const SHOP_PRINT_PRICE_CENTS = 600
// Flat standard-US rate shown to the buyer as its own shipping line (storefront
// summary + Stripe checkout). $6 per Shirley, 2026-08-05.
export const SHOP_SHIPPING_PRICE_CENTS = 600
export const SHOP_MAX_CART_ITEMS = 50
export const SHOP_MAX_DONATION_CENTS = 100_000

export const checkoutRequestSchema = z
  .object({
    checkoutId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            slug: z
              .string()
              .trim()
              .min(1)
              .max(96)
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            quantity: z.number().int().min(1).max(20),
          })
          .strict(),
      )
      .min(0)
      .max(SHOP_MAX_CART_ITEMS),
    donationCents: z.number().int().min(0).max(SHOP_MAX_DONATION_CENTS),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.items.length === 0 && value.donationCents === 0) {
      context.addIssue({
        code: 'custom',
        path: ['donationCents'],
        message: 'Choose at least one print or enter a support amount.',
      })
    }

    const slugs = value.items.map((item) => item.slug)
    if (new Set(slugs).size !== slugs.length) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Each print can appear only once in a checkout request.',
      })
    }
  })

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>

export type CheckoutCatalogItem = {
  visualizationId: string
  marketingProductId?: string
  stripePriceId?: string
  slug: string
  title: string
  currency: string
  unitAmount: number
  imageUrl?: string
}

export function buildStripeLineItems(
  items: Array<CheckoutCatalogItem & { quantity: number }>,
  donationCents: number,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) =>
    item.stripePriceId
      ? {
          quantity: item.quantity,
          price: item.stripePriceId,
        }
      : {
          quantity: item.quantity,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.unitAmount,
            product_data: {
              name: item.title.slice(0, 120),
              images: item.imageUrl?.startsWith('https://') ? [item.imageUrl] : undefined,
              metadata: {
                kind: 'poster',
                visualization_id: item.visualizationId,
                visualization_slug: item.slug,
                marketing_product_id: item.marketingProductId || '',
              },
            },
          },
        },
  )

  if (donationCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: items[0]?.currency.toLowerCase() || 'usd',
        unit_amount: donationCents,
        product_data: {
          name: 'Support open-source health design',
          description: 'Pay-what-you-want support for public health and design resources.',
          metadata: { kind: 'donation' },
        },
      },
    })
  }

  return lineItems
}

/**
 * One flat "Standard US shipping" rate per order, displayed by Stripe as its
 * own line (fulfillment reads it back from total_details.amount_shipping).
 */
export function buildShippingOptions(): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return [
    {
      shipping_rate_data: {
        display_name: 'Standard US shipping',
        type: 'fixed_amount',
        fixed_amount: { amount: SHOP_SHIPPING_PRICE_CENTS, currency: 'usd' },
      },
    },
  ]
}

/**
 * Drop catalog-synced Stripe price IDs so line items are built inline from the
 * trusted CMS price instead.
 *
 * Price IDs are scoped to one Stripe account: after an account switch (or a
 * price deleted in the dashboard) every stored ID 404s and checkout fails for
 * the whole catalog. The prices themselves live in the CMS, so falling back to
 * inline pricing is always correct — never let stale catalog metadata be the
 * reason a customer cannot pay.
 */
export function withoutStoredStripePrices<T extends { stripePriceId?: string }>(
  items: T[],
): T[] {
  return items.map(({ ...item }) => {
    delete item.stripePriceId
    return item
  })
}

export type StripeKeyMode = 'test' | 'live' | 'invalid' | 'unconfigured'

/**
 * Classify a Stripe API key by prefix.
 *
 * Both full secret keys (`sk_`) and RESTRICTED keys (`rk_`) are valid server
 * credentials; restricted keys are strongly preferred in production because
 * they can be scoped to just the permissions the site needs. Matching only
 * `sk_` would treat a restricted key as invalid — silently disabling checkout —
 * and, worse, would let a restricted LIVE key slip past live-mode guards.
 */
export function stripeKeyMode(key: string | undefined): StripeKeyMode {
  const trimmed = (key || '').trim()
  if (!trimmed) return 'unconfigured'
  if (/^[sr]k_test_/.test(trimmed)) return 'test'
  if (/^[sr]k_live_/.test(trimmed)) return 'live'
  return 'invalid'
}

/** True when Stripe rejected a request because a referenced object is gone. */
export function isMissingStripeResource(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  const message = (error as { message?: unknown }).message
  return code === 'resource_missing' || (typeof message === 'string' && /No such price/i.test(message))
}

export function centsToCurrency(amount: number) {
  return Math.round(amount) / 100
}
