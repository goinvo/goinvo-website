import { NextResponse } from 'next/server'
import { getStripeCheckoutStatus } from '@/lib/shop/stripeConfig'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const status = getStripeCheckoutStatus()

  return NextResponse.json(
    {
      checkoutEnabled: status.enabled,
      mode: status.mode === 'test' || status.mode === 'live' ? status.mode : null,
      automaticTaxEnabled: status.automaticTaxEnabled,
      // Names the reason when a test-mode deployment is switched off, so
      // "checkoutEnabled: false" is diagnosable without reading the code.
      ...(status.sandboxIsolated ? {} : { blocked: 'sandbox-not-isolated' }),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
