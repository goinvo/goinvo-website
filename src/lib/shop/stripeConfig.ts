import 'server-only'

import Stripe from 'stripe'
import { projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { stripeKeyMode } from './checkout'

export type StripeCheckoutMode = 'test' | 'live' | 'unconfigured' | 'invalid'

export type StripeCheckoutStatus = {
  enabled: boolean
  mode: StripeCheckoutMode
  secretKeyConfigured: boolean
  webhookConfigured: boolean
  sanityWriterConfigured: boolean
  /** False when test mode would write into the real outreach dataset. */
  sandboxIsolated: boolean
  automaticTaxEnabled: boolean
  promotionsConsentEnabled: boolean
}

let stripeClient: Stripe | null = null
let stripeClientKey = ''

function getStripeSecretKey() {
  return (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SEC_KEY || '').trim()
}

export function getStripeCheckoutStatus(): StripeCheckoutStatus {
  const secretKey = getStripeSecretKey()
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  const explicitlyDisabled = process.env.STRIPE_CHECKOUT_ENABLED === 'false'
  // A preview deployment may NEVER take a real payment. Without this, the only
  // thing standing between a sandbox branch and a live card charge is whether
  // someone scoped the production env vars correctly in Vercel — a convention,
  // not a guarantee. This makes it structural.
  const liveModeEnabled =
    process.env.STRIPE_LIVE_MODE_ENABLED === 'true' && process.env.VERCEL_ENV !== 'preview'
  const testModeAllowed =
    process.env.VERCEL_ENV !== 'production' ||
    process.env.STRIPE_TEST_MODE_ON_PRODUCTION === 'true'
  const mode: StripeCheckoutMode = stripeKeyMode(secretKey)
  const secretKeyConfigured =
    (mode === 'test' && testModeAllowed) || (mode === 'live' && liveModeEnabled)
  const webhookConfigured = webhookSecret.startsWith('whsec_')
  const sanityWriterConfigured = Boolean(projectId && writeToken)
  // Test-mode traffic must write to its own dataset. If it does not, a sandbox
  // purchase files a fake buyer alongside the real outreach contacts and can
  // attach a fake order to a REAL contact whose email the tester happens to
  // reuse. Fail closed rather than trusting the env var to have been set.
  const sandboxIsolated = mode !== 'test' || OUTREACH_DATASET !== 'outreach'

  return {
    enabled:
      !explicitlyDisabled &&
      secretKeyConfigured &&
      webhookConfigured &&
      sanityWriterConfigured &&
      sandboxIsolated,
    mode,
    secretKeyConfigured,
    webhookConfigured,
    sanityWriterConfigured,
    sandboxIsolated,
    automaticTaxEnabled: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true',
    promotionsConsentEnabled: process.env.STRIPE_PROMOTIONS_CONSENT_ENABLED === 'true',
  }
}

export function getStripeClient() {
  const status = getStripeCheckoutStatus()
  const secretKey = getStripeSecretKey()

  if (!status.secretKeyConfigured) {
    if (status.mode === 'live') {
      throw new Error(
        'Live Stripe checkout is locked. Set STRIPE_LIVE_MODE_ENABLED=true only after approval.',
      )
    }
    throw new Error('Stripe Checkout is not configured with a valid test secret key.')
  }

  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey, {
      appInfo: {
        name: 'GoInvo Website Shop',
        version: '1.0.0',
        url: 'https://www.goinvo.com/vision/health-visualizations',
      },
    })
    stripeClientKey = secretKey
  }

  return stripeClient
}

export function getStripeWebhookSecret() {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (!secret.startsWith('whsec_')) {
    throw new Error('Stripe webhook signing is not configured.')
  }
  return secret
}
