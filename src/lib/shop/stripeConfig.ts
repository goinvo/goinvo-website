import 'server-only'

import Stripe from 'stripe'
import { projectId, writeToken } from '@/sanity/env'
import { stripeKeyMode } from './checkout'

export type StripeCheckoutMode = 'test' | 'live' | 'unconfigured' | 'invalid'

export type StripeCheckoutStatus = {
  enabled: boolean
  mode: StripeCheckoutMode
  secretKeyConfigured: boolean
  webhookConfigured: boolean
  sanityWriterConfigured: boolean
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
  const liveModeEnabled = process.env.STRIPE_LIVE_MODE_ENABLED === 'true'
  const testModeAllowed =
    process.env.VERCEL_ENV !== 'production' ||
    process.env.STRIPE_TEST_MODE_ON_PRODUCTION === 'true'
  const mode: StripeCheckoutMode = stripeKeyMode(secretKey)
  const secretKeyConfigured =
    (mode === 'test' && testModeAllowed) || (mode === 'live' && liveModeEnabled)
  const webhookConfigured = webhookSecret.startsWith('whsec_')
  const sanityWriterConfigured = Boolean(projectId && writeToken)

  return {
    enabled:
      !explicitlyDisabled &&
      secretKeyConfigured &&
      webhookConfigured &&
      sanityWriterConfigured,
    mode,
    secretKeyConfigured,
    webhookConfigured,
    sanityWriterConfigured,
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
