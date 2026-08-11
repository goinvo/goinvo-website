import type Stripe from 'stripe'
import { z } from 'zod'

// Default print price when a marketingProduct doc doesn't override it.
// $30 per Juhan, 2026-08-07 (was $6 at launch).
export const SHOP_PRINT_PRICE_CENTS = 3000

/**
 * Per-piece prices for items a flat print price gets wrong. Own Your Health
 * Data is a comic book, not a poster, and $30 is too much for it (Jon,
 * 2026-08-10).
 *
 * This lives here, next to the default, because BOTH the storefront's
 * displayed price and the server-side checkout price resolve through
 * shopPriceCentsFor. Pricing an item in one place and not the other would show
 * a visitor one number and charge them another.
 *
 * A marketingProduct document still wins over this: the CMS is the real
 * pricing surface, this is the fallback for pieces that have no document yet.
 */
export const SHOP_PRICE_CENTS_BY_SLUG: Record<string, number> = {
  'own-your-health-data': 900,
}

/** How a piece is produced, as set on its marketingProduct document. */
export type ProductProduction = 'print-on-demand' | 'from-stock'

export type ProductAvailabilityInput = {
  status?: string
  orderable?: boolean
  trackInventory?: boolean
  inventoryQuantity?: number
  allowBackorder?: boolean
}

/**
 * Whether a piece can be ordered, decided from its CMS document rather than a
 * hardcoded list of slugs.
 *
 * Three ways to take something off sale, in the order an editor would reach for
 * them: archive/unpublish it, switch "Can be ordered" off, or let tracked
 * inventory run to zero without backorders. Availability has to come from ONE
 * place because the card, the buy button and the structured data all consume
 * it, and Google penalises a page whose markup disagrees with what it shows.
 *
 * Absent a product document the piece stays orderable: the catalog is the
 * exception list, not the permission list, so a new visualization is on sale by
 * default exactly as it was before any of this existed.
 */
export function isProductOrderable(product: ProductAvailabilityInput | undefined): boolean {
  if (!product) return true
  if (product.status && product.status !== 'active') return false
  if (product.orderable === false) return false
  if (product.trackInventory && !product.allowBackorder && (product.inventoryQuantity || 0) <= 0) {
    return false
  }
  return true
}

export function shopPriceCentsFor(slug: string | undefined): number {
  const override = slug ? SHOP_PRICE_CENTS_BY_SLUG[slug] : undefined
  return typeof override === 'number' ? override : SHOP_PRINT_PRICE_CENTS
}
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
