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
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
