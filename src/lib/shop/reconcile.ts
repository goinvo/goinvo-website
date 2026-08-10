import 'server-only'

import { createClient, type SanityClient } from '@sanity/client'
import type Stripe from 'stripe'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { computeSettlement, type Settlement } from './settlement'
import { getStripeClient } from './stripeConfig'

/**
 * Recomputes an order's money ledger from live Stripe state.
 *
 * A Stripe event is treated as a cache-invalidation ping and never as data:
 * we take one id off it, throw the rest away, and re-read the charge and its
 * disputes from the API. Every field written is an absolute SET derived from
 * that read, so a redelivered webhook, an out-of-order webhook, and the daily
 * reconcile all converge on the same answer. There is no event ledger to keep
 * and no sequence number to get wrong.
 */

export type ReconcileSource = 'refund' | 'dispute' | 'cron' | 'backfill' | 'manual'

export type ReconcileResult =
  | { status: 'not-configured' }
  | { status: 'no-charge'; reason: string }
  | { status: 'no-order'; chargeId: string; paymentIntentId?: string }
  | { status: 'applied'; orderId: string; chargeId: string; settlement: Settlement; livemode: boolean }

type OrderRow = { _id: string; orderNumber?: string; customerEmail?: string; customerName?: string }

let outreachClient: SanityClient | null = null

/**
 * Orders live in the PRIVATE outreach dataset. The shared marketing write
 * client points at the public one, so this module owns its own client rather
 * than borrowing a client that would silently write buyer PII to a
 * world-readable dataset.
 */
export function getOutreachWriteClient() {
  if (!projectId || !writeToken) return null
  if (!outreachClient) {
    outreachClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return outreachClient
}

/** Resolves the charge a refund/dispute event refers to, without trusting the event body. */
async function resolveCharge(input: {
  chargeId?: string
  paymentIntentId?: string
}): Promise<Stripe.Charge | null> {
  const stripe = getStripeClient()

  if (input.chargeId) {
    return stripe.charges.retrieve(input.chargeId)
  }
  if (input.paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId, {
      expand: ['latest_charge'],
    })
    const charge = intent.latest_charge
    if (charge && typeof charge !== 'string' && !('deleted' in charge)) return charge
  }
  return null
}

/** Every dispute on a charge, paginated — a truncated list would understate what is held. */
export async function listChargeDisputes(chargeId: string): Promise<Stripe.Dispute[]> {
  const stripe = getStripeClient()
  const disputes: Stripe.Dispute[] = []

  for await (const dispute of stripe.disputes.list({ charge: chargeId, limit: 100 })) {
    disputes.push(dispute)
  }
  return disputes
}

export async function findOrderForPayment(input: {
  paymentIntentId?: string
  chargeId?: string
}): Promise<OrderRow | null> {
  const cms = getOutreachWriteClient()
  if (!cms) return null

  // Matched on the payment intent, which fulfillment already stores on every
  // order — no extra Stripe round-trip to recover the checkout session.
  if (input.paymentIntentId) {
    const byIntent = await cms.fetch<OrderRow | null>(
      '*[_type == "marketingOrder" && processorPaymentId == $pi][0]{_id, orderNumber, customerEmail, customerName}',
      { pi: input.paymentIntentId },
    )
    if (byIntent) return byIntent
  }
  if (input.chargeId) {
    return cms.fetch<OrderRow | null>(
      '*[_type == "marketingOrder" && processorChargeId == $charge][0]{_id, orderNumber, customerEmail, customerName}',
      { charge: input.chargeId },
    )
  }
  return null
}

export async function reconcilePaymentSettlement(input: {
  chargeId?: string
  paymentIntentId?: string
  source: ReconcileSource
}): Promise<ReconcileResult> {
  const cms = getOutreachWriteClient()
  if (!cms) return { status: 'not-configured' }

  const charge = await resolveCharge(input)
  if (!charge) {
    return { status: 'no-charge', reason: 'No Stripe charge could be resolved for this event.' }
  }

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id || input.paymentIntentId

  const order = await findOrderForPayment({ paymentIntentId, chargeId: charge.id })
  if (!order) {
    // Payments taken outside this storefront (an invoice, a payment link) reach
    // the same webhook. Not finding an order is normal, not an error.
    return { status: 'no-order', chargeId: charge.id, paymentIntentId }
  }

  // `charge.disputed` is Stripe's own flag; skipping the list call when it is
  // false saves a request on the overwhelmingly common refund path.
  const disputes = charge.disputed ? await listChargeDisputes(charge.id) : []
  const settlement = computeSettlement({ charge, disputes })

  await cms
    .patch(order._id)
    .set({
      processorChargeId: charge.id,
      settlementState: settlement.settlementState,
      amountCaptured: settlement.amountCaptured,
      amountRefunded: settlement.amountRefunded,
      amountDisputeHeld: settlement.amountDisputeHeld,
      amountLostToDispute: settlement.amountLostToDispute,
      netCollected: settlement.netCollected,
      ledgerSyncedAt: new Date().toISOString(),
    })
    .unset(['ledgerSyncError'])
    .commit()

  return {
    status: 'applied',
    orderId: order._id,
    chargeId: charge.id,
    settlement,
    livemode: Boolean(charge.livemode),
  }
}

/**
 * Records that a reconcile failed, so a stale ledger is visible in the CMS
 * instead of quietly looking correct. Best-effort by design: the caller is
 * already on a failure path and must not be derailed by a second failure.
 */
export async function recordLedgerSyncError(orderId: string, message: string) {
  const cms = getOutreachWriteClient()
  if (!cms) return
  try {
    await cms
      .patch(orderId)
      .set({ ledgerSyncError: message.slice(0, 300), ledgerSyncedAt: new Date().toISOString() })
      .commit()
  } catch (error) {
    console.error(`Could not record ledger sync error on ${orderId}`, error)
  }
}
