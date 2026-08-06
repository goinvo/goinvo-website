import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { fulfillStripeCheckout } from '@/lib/shop/fulfillment'
import { notifySlackShopOrder, notifySlackShopRefund } from '@/lib/shop/slack'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/shop/stripeConfig'
import { isMissingStripeResource } from '@/lib/shop/checkout'
import { reconcilePaymentSettlement } from '@/lib/shop/reconcile'
import { syncDisputeFromStripe } from '@/lib/shop/disputes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  let stripe
  try {
    stripe = getStripeClient()
  } catch (error) {
    console.error('Stripe webhook is not configured', error)
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 })
  }
  let event
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeWebhookSecret(),
    )
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error)
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 })
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      // Only fulfill sessions this storefront created. Any other checkout on
      // the same Stripe account (a payment link, an invoice) has no storefront
      // metadata and would throw — repeated 500s let Stripe disable the whole
      // webhook endpoint, which would silently stop recording real orders.
      const session = event.data.object as { id: string; metadata?: Record<string, string> | null }
      if (session.metadata?.source !== 'health-visualizations') {
        return NextResponse.json({ received: true, ignored: 'not-a-storefront-session' })
      }

      const fulfillment = await fulfillStripeCheckout(session.id)
      if (fulfillment.status !== 'unpaid') {
        // The order is already committed at this point, so a Slack outage must
        // not turn a recorded sale into a webhook failure: repeated 500s let
        // Stripe disable the endpoint, and then real orders WOULD be lost. The
        // alert is a convenience; the CMS is the record.
        try {
          await notifySlackShopOrder(fulfillment.notification)
        } catch (error) {
          console.error(
            `Shop order ${fulfillment.orderId} was recorded but its Slack alert failed.`,
            error,
          )
          return NextResponse.json({ received: true, alert: 'failed' })
        }
      }
    }

    // Money coming BACK. The event body is treated as a ping only: the ledger
    // is recomputed from live Stripe state, which is what makes a redelivered
    // or out-of-order event produce the same result as a first delivery.
    if (
      event.type === 'charge.refunded' ||
      event.type === 'charge.refund.updated' ||
      event.type === 'refund.updated' ||
      event.type === 'refund.failed'
    ) {
      const object = event.data.object as { id?: string; charge?: string | { id: string }; payment_intent?: string | { id: string } }
      const chargeId =
        event.type === 'charge.refunded'
          ? object.id
          : typeof object.charge === 'string'
            ? object.charge
            : object.charge?.id
      const paymentIntentId =
        typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id

      const result = await reconcilePaymentSettlement({ chargeId, paymentIntentId, source: 'refund' })
      if (result.status === 'applied') {
        try {
          await notifySlackShopRefund(result)
        } catch (error) {
          console.error(`Refund recorded for ${result.orderId} but the Slack alert failed.`, error)
        }
      }
      return NextResponse.json({ received: true, refund: result.status })
    }

    if (
      event.type === 'charge.dispute.created' ||
      event.type === 'charge.dispute.updated' ||
      event.type === 'charge.dispute.closed' ||
      event.type === 'charge.dispute.funds_withdrawn' ||
      event.type === 'charge.dispute.funds_reinstated'
    ) {
      const result = await syncDisputeFromStripe(event.data.object as Stripe.Dispute)
      return NextResponse.json({ received: true, dispute: result.status })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // A session Stripe cannot resolve will never resolve — retrying forever
    // just burns the endpoint's failure budget until Stripe disables it, which
    // would silently stop recording every real order. Acknowledge it loudly
    // instead. Transient faults still return 500 so Stripe DOES retry.
    if (isMissingStripeResource(error)) {
      console.error('Stripe webhook: referenced object no longer exists; acknowledging so retries stop.', error)
      return NextResponse.json({ received: true, ignored: 'session-not-found' })
    }
    console.error('Stripe webhook handling failed', error)
    return NextResponse.json({ error: 'Stripe webhook could not be processed.' }, { status: 500 })
  }
}
