import { NextRequest, NextResponse } from 'next/server'
import {
  checkoutRequestSchema,
  buildStripeLineItems,
  buildShippingOptions,
  isMissingStripeResource,
  withoutStoredStripePrices,
} from '@/lib/shop/checkout'
import { resolveCheckoutCatalog } from '@/lib/shop/catalog'
import { getStripeCheckoutStatus, getStripeClient } from '@/lib/shop/stripeConfig'
import { getKvClient } from '@/lib/marketing/drainSink'
import { isLikelyBot } from '@/lib/marketing/botFilter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_CHECKOUT_BODY_BYTES = 16_000
const STOREFRONT_PATH = '/vision/health-visualizations'

function getSameOrigin(request: NextRequest) {
  const source = request.headers.get('origin')
  if (!source) return null

  try {
    const sourceUrl = new URL(source)
    const requestUrl = new URL(request.url)
    return sourceUrl.origin === requestUrl.origin ? requestUrl.origin : null
  } catch {
    return null
  }
}

async function readCheckoutBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw Object.assign(new Error('Checkout requests must use JSON.'), { status: 415 })
  }

  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CHECKOUT_BODY_BYTES) {
    throw Object.assign(new Error('Checkout request is too large.'), { status: 413 })
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_CHECKOUT_BODY_BYTES) {
    throw Object.assign(new Error('Checkout request is too large.'), { status: 413 })
  }

  try {
    return JSON.parse(raw || '{}') as unknown
  } catch {
    throw Object.assign(new Error('Checkout request must be valid JSON.'), { status: 400 })
  }
}

/**
 * The Origin check stops browser CSRF but is not authentication — any script
 * can set the header. This endpoint mints live Stripe sessions, so it also
 * gets the per-IP cap the rest of the public API already uses: unbounded
 * session creation burns Stripe rate limit and serverless spend, and is the
 * first step of a card-testing funnel. Fail-CLOSED here (unlike the analytics
 * beacon): a shopper retrying beats an open payment endpoint.
 */
const CHECKOUT_RL_PREFIX = 'shop:checkout:rl:'
const CHECKOUT_RATE_LIMIT_PER_MINUTE = 10

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || ''
  return request.headers.get('x-real-ip')?.trim() || ''
}

async function isCheckoutRateLimited(request: NextRequest): Promise<boolean> {
  const kv = getKvClient()
  const ip = clientIp(request)
  if (!kv || !ip) return false
  try {
    const key = `${CHECKOUT_RL_PREFIX}${ip}:${Math.floor(Date.now() / 60000)}`
    const count = await kv.incr(key)
    if (count === 1) await kv.expire(key, 120)
    return count > CHECKOUT_RATE_LIMIT_PER_MINUTE
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (isLikelyBot(request.headers.get('user-agent'))) {
    return NextResponse.json({ error: 'Checkout request was rejected.' }, { status: 403 })
  }

  const origin = getSameOrigin(request)
  if (!origin) {
    return NextResponse.json({ error: 'Checkout request origin was rejected.' }, { status: 403 })
  }

  if (await isCheckoutRateLimited(request)) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a moment and try again.' },
      { status: 429 },
    )
  }

  const status = getStripeCheckoutStatus()
  if (!status.enabled) {
    return NextResponse.json(
      { error: 'Secure checkout is not connected yet. Please use the order request instead.' },
      { status: 503 },
    )
  }

  try {
    const parsed = checkoutRequestSchema.safeParse(await readCheckoutBody(request))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'The checkout cart is invalid. Refresh the page and try again.' },
        { status: 400 },
      )
    }

    const catalogItems = await resolveCheckoutCatalog(parsed.data)
    const currencies = new Set(catalogItems.map((item) => item.currency))
    if (catalogItems.length > 0 && currencies.size !== 1) {
      return NextResponse.json(
        { error: 'All items in a checkout must use the same currency.' },
        { status: 400 },
      )
    }
    const isDonationOnly = catalogItems.length === 0

    const stripe = getStripeClient()
    const createSession = (
      items: typeof catalogItems,
      idempotencySuffix = '',
    ) => stripe.checkout.sessions.create(
      {
        mode: 'payment',
        managed_payments: { enabled: false },
        line_items: buildStripeLineItems(items, parsed.data.donationCents),
        client_reference_id: parsed.data.checkoutId,
        customer_creation: 'always',
        billing_address_collection: 'auto',
        shipping_address_collection: isDonationOnly
          ? undefined
          : {
              allowed_countries: ['US'],
            },
        shipping_options: isDonationOnly ? undefined : buildShippingOptions(),
        name_collection: {
          individual: { enabled: true, optional: false },
          business: { enabled: true, optional: true },
        },
        consent_collection: status.promotionsConsentEnabled
          ? {
              promotions: 'auto',
            }
          : undefined,
        automatic_tax: status.automaticTaxEnabled ? { enabled: true } : undefined,
        submit_type: 'pay',
        success_url: `${origin}/shop/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${STOREFRONT_PATH}#catalog`,
        custom_text: {
          shipping_address: isDonationOnly
            ? undefined
            : {
                message:
                  'Standard US shipping is shown above. Contact GoInvo before ordering for expedited or international delivery.',
              },
          submit: {
            message: isDonationOnly
              ? 'Your contribution supports more open-source health and design resources.'
              : 'Your payment covers printing plus the shipping shown. Any optional support funds more open-source health design.',
          },
        },
        metadata: {
          source: 'health-visualizations',
          checkout_id: parsed.data.checkoutId,
          donation_cents: String(parsed.data.donationCents),
          checkout_kind: isDonationOnly ? 'donation' : 'print-order',
        },
        payment_intent_data: {
          metadata: {
            source: 'health-visualizations',
            checkout_id: parsed.data.checkoutId,
            checkout_kind: isDonationOnly ? 'donation' : 'print-order',
          },
        },
      },
      {
        idempotencyKey: `goinvo-shop-${parsed.data.checkoutId}${idempotencySuffix}`,
      },
    )

    let session
    try {
      session = await createSession(catalogItems)
    } catch (error) {
      // Catalog-synced price IDs belong to one Stripe account: after an account
      // switch every stored ID 404s. The CMS price is the source of truth, so
      // retry inline rather than failing the sale.
      if (!isMissingStripeResource(error)) throw error
      console.error(
        'Stripe checkout: stored catalog price IDs are not valid for this account — retrying with inline prices. Re-sync the shop catalog.',
        error,
      )
      session = await createSession(withoutStoredStripePrices(catalogItems), '-inline')
    }

    if (!session.url?.startsWith('https://')) {
      throw new Error('Stripe did not return a secure checkout URL.')
    }

    return NextResponse.json(
      { url: session.url, mode: status.mode },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const statusCode =
      typeof error === 'object' &&
      error &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500
    const safeMessage =
      statusCode >= 400 && statusCode < 500 && error instanceof Error
        ? error.message
        : 'Secure checkout could not be started. Please try again or use the order request.'

    console.error('Stripe checkout session creation failed', error)
    return NextResponse.json({ error: safeMessage }, { status: statusCode })
  }
}
