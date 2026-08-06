import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The sandbox environment exists so a dispute can be rehearsed with fake cards.
 * These tests pin the two properties that make that safe: a preview deployment
 * cannot take a real payment, and test-mode traffic cannot write into the real
 * outreach dataset alongside genuine customers.
 */

const loadStatus = async (env: Record<string, string | undefined>, outreachDataset = 'outreach') => {
  vi.resetModules()
  vi.doMock('server-only', () => ({}))
  vi.doMock('@/sanity/env', () => ({ projectId: 'test', writeToken: 'token' }))
  vi.doMock('@/lib/marketing/outreachEnums', () => ({ OUTREACH_DATASET: outreachDataset }))

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

  it('accepts a test key on a preview deployment once it is isolated', async () => {
    const status = await loadStatus(
      {
        STRIPE_SECRET_KEY: TEST_KEY,
        STRIPE_WEBHOOK_SECRET: WEBHOOK,
        VERCEL_ENV: 'preview',
        STRIPE_LIVE_MODE_ENABLED: undefined,
        STRIPE_CHECKOUT_ENABLED: undefined,
      },
      'outreach-sandbox',
    )

    expect(status.mode).toBe('test')
    expect(status.enabled).toBe(true)
    expect(status.sandboxIsolated).toBe(true)
  })
})

describe('test-mode traffic cannot land in the real outreach dataset', () => {
  it('switches checkout off when a test key would write to the real dataset', async () => {
    const status = await loadStatus(
      {
        STRIPE_SECRET_KEY: TEST_KEY,
        STRIPE_WEBHOOK_SECRET: WEBHOOK,
        VERCEL_ENV: 'preview',
        STRIPE_CHECKOUT_ENABLED: undefined,
      },
      'outreach',
    )

    // Forgetting the dataset var must fail LOUDLY here rather than quietly
    // filing a fake buyer next to 1,962 real contacts.
    expect(status.sandboxIsolated).toBe(false)
    expect(status.enabled).toBe(false)
  })

  it('does not impose the isolation requirement on live mode', async () => {
    const status = await loadStatus(
      {
        STRIPE_SECRET_KEY: LIVE_KEY,
        STRIPE_WEBHOOK_SECRET: WEBHOOK,
        STRIPE_LIVE_MODE_ENABLED: 'true',
        VERCEL_ENV: 'production',
        STRIPE_CHECKOUT_ENABLED: undefined,
      },
      'outreach',
    )

    // Live orders belong in the real dataset — that is the whole point.
    expect(status.sandboxIsolated).toBe(true)
    expect(status.enabled).toBe(true)
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
