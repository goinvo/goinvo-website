import { NextRequest, NextResponse } from 'next/server'
import { syncDisputeFromStripe } from '@/lib/shop/disputes'
import { getOutreachWriteClient, reconcilePaymentSettlement } from '@/lib/shop/reconcile'
import { getStripeCheckoutStatus, getStripeClient } from '@/lib/shop/stripeConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Daily safety net for the money ledger.
 *
 * Discovery deliberately does NOT depend on the webhook. If Stripe disables our
 * endpoint, a delivery is dropped, or Sanity was down when an event arrived,
 * this run still finds every recent dispute and re-derives every recent order's
 * settlement. The worst case becomes a day of latency instead of a missed
 * evidence deadline with money attached.
 *
 * Everything it calls is idempotent — a dispute already recorded is simply
 * re-synced to the same values.
 */

const DISPUTE_LOOKBACK_DAYS = 180
const ORDER_SWEEP_DAYS = 120
const ORDER_SWEEP_LIMIT = 25

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  const apiKey = process.env.MARKETING_API_KEY || ''
  const authorization = request.headers.get('authorization') || ''
  const headerKey = request.headers.get('x-marketing-api-key') || ''

  if (cronSecret && authorization === `Bearer ${cronSecret}`) return true
  if (apiKey && (authorization === `Bearer ${apiKey}` || headerKey === apiKey)) return true
  return false
}

async function run(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!getStripeCheckoutStatus().secretKeyConfigured) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }
  const cms = getOutreachWriteClient()
  if (!cms) {
    return NextResponse.json({ error: 'Sanity write access is not configured.' }, { status: 503 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  const stripe = getStripeClient()
  const since = Math.floor(Date.now() / 1000) - DISPUTE_LOOKBACK_DAYS * 24 * 60 * 60

  const disputes: string[] = []
  const errors: string[] = []

  for await (const dispute of stripe.disputes.list({ created: { gte: since }, limit: 100 })) {
    disputes.push(dispute.id)
    if (dryRun) continue
    try {
      await syncDisputeFromStripe(dispute)
    } catch (error) {
      errors.push(`dispute ${dispute.id}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }

  // Bounded settlement sweep: catches a refund whose webhook never arrived.
  const sweepSince = new Date(Date.now() - ORDER_SWEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const orders = await cms.fetch<Array<{ _id: string; processorChargeId?: string; processorPaymentId?: string }>>(
    `*[_type == "marketingOrder" && processor == "stripe" && placedAt > $since
       && (defined(processorPaymentId) || defined(processorChargeId))]
     | order(placedAt desc)[0...$limit]{_id, processorChargeId, processorPaymentId}`,
    { since: sweepSince, limit: ORDER_SWEEP_LIMIT },
  )

  let swept = 0
  for (const order of orders) {
    if (dryRun) continue
    try {
      const result = await reconcilePaymentSettlement({
        chargeId: order.processorChargeId,
        paymentIntentId: order.processorPaymentId,
        source: 'cron',
      })
      if (result.status === 'applied') swept += 1
    } catch (error) {
      errors.push(`order ${order._id}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    dryRun,
    disputesSeen: disputes.length,
    ordersConsidered: orders.length,
    ordersReconciled: swept,
    // Reported rather than thrown: one bad dispute must not stop the sweep.
    errors,
  })
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}
