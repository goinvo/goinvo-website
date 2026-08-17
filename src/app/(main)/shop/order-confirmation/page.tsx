import type { Metadata } from 'next'
import Link from 'next/link'
import { getStripeClient } from '@/lib/shop/stripeConfig'
import { ClearCartOnPurchase } from '@/components/shop/ClearCartOnPurchase'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payment Confirmation',
  description: 'Confirmation for a GoInvo print order or contribution.',
  robots: { index: false, follow: false },
}

function formatAmount(amount: number | null, currency: string | null) {
  if (typeof amount !== 'number') return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(amount / 100)
}

export default async function ShopOrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  let confirmation:
    | {
        paid: boolean
        email?: string
        total?: string | null
        testMode: boolean
        donationOnly: boolean
      }
    | undefined

  if (sessionId && /^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId)
      confirmation = {
        paid: session.payment_status === 'paid' || session.payment_status === 'no_payment_required',
        email: session.customer_details?.email || undefined,
        total: formatAmount(session.amount_total, session.currency),
        testMode: !session.livemode,
        donationOnly: session.metadata?.checkout_kind === 'donation',
      }
    } catch (error) {
      console.error('Stripe order confirmation lookup failed', error)
    }
  }

  return (
    <div className="bg-[#f5f3ef] text-black">
      {/* Only on a server-confirmed paid session, so an abandoned checkout
          never wipes a cart the shopper still wants. */}
      {confirmation?.paid && <ClearCartOnPurchase />}
      <section className="min-h-[70vh] pt-[calc(var(--spacing-header-height)+5rem)] pb-20">
        <div className="max-width content-padding">
          <div className="mx-auto max-w-[700px] border border-[#d9d5ce] bg-white p-7 shadow-[0_18px_50px_rgba(36,67,77,.1)] sm:p-12">
            {confirmation?.testMode && (
              <p className="mb-6 inline-block bg-[#f2e8d5] px-3 py-2 text-xs font-bold uppercase tracking-[1.5px] text-[#7a451f]">
                Stripe test mode
              </p>
            )}
            <h1 className="mb-5 font-serif text-[2.5rem] font-light leading-tight sm:text-[3.4rem]">
              {confirmation?.paid
                ? confirmation.donationOnly
                  ? 'Thank you for supporting our work.'
                  : 'Your print order is in.'
                : 'We’re checking your payment.'}
            </h1>
            <p className="mb-6 text-lg leading-relaxed text-gray">
              {confirmation?.paid
                ? confirmation.donationOnly
                  ? 'Your contribution helps us create and share more open-source health and design resources.'
                  : 'Thank you. We’ll prepare your prints and send an update when they are on the way.'
                : 'If your payment completed, Stripe will notify us and we’ll email you as soon as the order is ready to process.'}
            </p>
            {(confirmation?.total || confirmation?.email) && (
              <dl className="mb-8 grid gap-4 border-y border-[#d9d5ce] py-5 sm:grid-cols-2">
                {confirmation.total && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[1.5px] text-gray">
                      {confirmation.donationOnly ? 'Your support' : 'Order total'}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold">{confirmation.total}</dd>
                  </div>
                )}
                {confirmation.email && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[1.5px] text-gray">
                      Confirmation
                    </dt>
                    <dd className="mt-1 break-words text-sm">{confirmation.email}</dd>
                  </div>
                )}
              </dl>
            )}
            {!confirmation && (
              <p className="mb-8 border-l-4 border-primary bg-[#fff7f2] px-4 py-3 text-sm leading-6 text-gray">
                We could not display the payment details here. If Stripe showed a successful
                payment, your order is still being processed. Contact us if you need help.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/vision/health-visualizations"
                className="bg-primary px-6 py-3 font-semibold text-white no-underline hover:bg-primary-dark"
              >
                Return to the collection
              </Link>
              <a
                href={`mailto:hello@goinvo.com?subject=${encodeURIComponent(
                  confirmation?.donationOnly
                    ? 'Question about my contribution'
                    : 'Question about my print order',
                )}`}
                className="border border-secondary px-6 py-3 font-semibold text-secondary no-underline hover:bg-secondary hover:text-white"
              >
                {confirmation?.donationOnly ? 'Ask about your support' : 'Ask about an order'}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
