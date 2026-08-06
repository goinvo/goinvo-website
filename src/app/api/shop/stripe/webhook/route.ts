import { NextResponse } from 'next/server'
import { fulfillStripeCheckout } from '@/lib/shop/fulfillment'
import { notifySlackShopOrder } from '@/lib/shop/slack'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/shop/stripeConfig'
import { isMissingStripeResource } from '@/lib/shop/checkout'

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
        await notifySlackShopOrder(fulfillment.notification)
      }
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
