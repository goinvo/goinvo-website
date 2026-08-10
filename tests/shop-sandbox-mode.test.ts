import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The sandbox environment exists so a dispute can be rehearsed with fake cards.
 * These tests pin the two properties that make that safe: a preview deployment
 * cannot take a real payment, and test-mode traffic cannot write into the real
 * outreach dataset alongside genuine customers.
 */

const loadStatus = async (env: Record<string, string | undefined>) => {
  vi.resetModules()
  vi.doMock('server-only', () => ({}))
  vi.doMock('@/sanity/env', () => ({ projectId: 'test', writeToken: 'token' }))

  const previous: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  const { getStripeCheckoutStatus } = await import('@/lib/shop/stripeConfig')
  const status = getStripeCheckoutStatus()

  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return status
}

const LIVE_KEY = 'sk_live_exampleexampleexample'
const TEST_KEY = 'sk_test_exampleexampleexample'
const WEBHOOK = 'whsec_example'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('a preview deployment can never take a real payment', () => {
  it('refuses a LIVE key on a preview deployment even when live mode is switched on', async () => {
    const status = await loadStatus({
      STRIPE_SECRET_KEY: LIVE_KEY,
      STRIPE_WEBHOOK_SECRET: WEBHOOK,
      STRIPE_LIVE_MODE_ENABLED: 'true',
      VERCEL_ENV: 'preview',
      STRIPE_CHECKOUT_ENABLED: undefined,
    })

    // Without this, correct env-var scoping in Vercel is the ONLY thing between
    // a sandbox branch and a real card charge.
    expect(status.mode).toBe('live')
    expect(status.secretKeyConfigured).toBe(false)
    expect(status.enabled).toBe(false)
  })

  it('still allows a live key on the production deployment', async () => {
    const status = await loadStatus({
      STRIPE_SECRET_KEY: LIVE_KEY,
      STRIPE_WEBHOOK_SECRET: WEBHOOK,
      STRIPE_LIVE_MODE_ENABLED: 'true',
      VERCEL_ENV: 'production',
      STRIPE_CHECKOUT_ENABLED: undefined,
    })

    expect(status.secretKeyConfigured).toBe(true)
    expect(status.enabled).toBe(true)
  })

  it('accepts a test key on a preview deployment', async () => {
    const status = await loadStatus({
      STRIPE_SECRET_KEY: TEST_KEY,
      STRIPE_WEBHOOK_SECRET: WEBHOOK,
      VERCEL_ENV: 'preview',
      STRIPE_LIVE_MODE_ENABLED: undefined,
      STRIPE_CHECKOUT_ENABLED: undefined,
    })

    expect(status.mode).toBe('test')
    expect(status.enabled).toBe(true)
  })
})

/**
 * Sandbox orders share the real dataset by design. What must NOT happen is a
 * fake buyer being filed among genuine outreach contacts, or a test order
 * attaching itself to a real person because a tester reused their email.
 */
describe('a sandbox purchase never touches the real contact list', () => {
  const loadFulfillment = async (livemode: boolean) => {
    vi.resetModules()
    const committed: Array<Record<string, unknown>> = []

    vi.doMock('server-only', () => ({}))
    vi.doMock('@/sanity/env', () => ({
      apiVersion: '2024-01-01', dataset: 'production', projectId: 'test', writeToken: 'token',
    }))
    vi.doMock('@/lib/shop/stripeConfig', () => ({
      getStripeClient: () => ({
        checkout: {
          sessions: {
            retrieve: async () => ({
              id: 'cs_1',
              created: 1_770_000_000,
              livemode,
              payment_status: 'paid',
              amount_total: 1200,
              currency: 'usd',
              customer_details: { email: 'tester@example.com', name: 'Test Buyer' },
              collected_information: {
                shipping_details: {
                  name: 'Test Buyer',
                  address: { line1: '1 Test St', city: 'Boston', state: 'MA', postal_code: '02118', country: 'US' },
                },
              },
              total_details: { amount_shipping: 600 },
              consent: { promotions: 'opt_in' },
            }),
            listLineItems: async () => ({
              data: [{
                id: 'li_1', description: 'Poster', quantity: 1, amount_total: 600, amount_subtotal: 600,
                price: { product: { metadata: { kind: 'poster' } } },
              }],
            }),
          },
        },
      }),
    }))
    vi.doMock('@sanity/client', () => ({
      createClient: () => {
        const transaction = {
          createIfNotExists: (doc: Record<string, unknown>) => { committed.push(doc); return transaction },
          create: (doc: Record<string, unknown>) => { committed.push(doc); return transaction },
          commit: async () => ({}),
        }
        return {
          fetch: async (query: string) =>
            query.includes('marketingShopSettings') ? { syncContacts: true } : null,
          transaction: () => transaction,
          getDocument: async () => null,
        }
      },
    }))

    const { fulfillStripeCheckout } = await import('@/lib/shop/fulfillment')
    await fulfillStripeCheckout('cs_1')
    return committed
  }

  it('creates no marketing contact for a sandbox order', async () => {
    const committed = await loadFulfillment(false)

    expect(committed.some((doc) => doc._type === 'marketingContact')).toBe(false)
    const order = committed.find((doc) => doc._type === 'marketingOrder')
    expect(order?.livemode).toBe(false)
    // Nothing to attach to, so the order carries no contact reference either.
    expect(order?.contact).toBeUndefined()
  })

  it('still syncs a contact for a real order', async () => {
    const committed = await loadFulfillment(true)

    expect(committed.some((doc) => doc._type === 'marketingContact')).toBe(true)
    expect(committed.find((doc) => doc._type === 'marketingOrder')?.livemode).toBe(true)
  })
})

describe('sandbox Slack traffic is labelled as such', () => {
  it('names a sandbox dispute channel distinctly', async () => {
    vi.resetModules()
    vi.doMock('server-only', () => ({}))
    const { buildDisputeChannelName } = await import('@/lib/shop/disputeSlack')

    expect(buildDisputeChannelName('du_1', false)).toBe('sandbox-shop-dispute-du-1')
    expect(buildDisputeChannelName('du_1', true)).toBe('shop-dispute-du-1')
    // Still within Slack's limit with the longer prefix.
    expect(buildDisputeChannelName(`du_${'x'.repeat(300)}`, false).length).toBeLessThanOrEqual(80)
  })

  it('marks a sandbox refund alert so it cannot be mistaken for a real one', async () => {
    vi.resetModules()
    vi.doMock('server-only', () => ({}))
    const { buildShopRefundSlackMessage } = await import('@/lib/shop/slack')

    const settlement = { amountCaptured: 12, amountRefunded: 12, netCollected: 0, settlementState: 'refunded' }
    const sandbox = buildShopRefundSlackMessage({ orderId: 'o1', chargeId: 'ch_1', livemode: false, settlement })
    const real = buildShopRefundSlackMessage({ orderId: 'o1', chargeId: 'ch_1', livemode: true, settlement })

    expect(sandbox.text).toContain('Sandbox')
    expect(real.text).not.toContain('Sandbox')
  })
})
