import 'server-only'

import { createHash } from 'node:crypto'
import { createClient, type SanityClient } from '@sanity/client'
import type Stripe from 'stripe'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { centsToCurrency } from './checkout'
import { shopContactDocumentId, stripeOrderDocumentId } from './ids'
import type { ShopOrderNotification } from './slack'
import { getStripeClient } from './stripeConfig'

type ShopSettings = {
  syncContacts?: boolean
  contactSegment?: string
  contactSourceNote?: string
}

type FulfillmentResult =
  | { status: 'created'; orderId: string; notification: ShopOrderNotification }
  | { status: 'already-created'; orderId: string; notification: ShopOrderNotification }
  | { status: 'unpaid'; orderId: string }

let fulfillmentClient: SanityClient | null = null
let settingsClient: SanityClient | null = null

/**
 * Orders and customer records hold PII — buyer name, email, and full shipping
 * address — so they live ONLY in the private outreach dataset. The production
 * dataset is world-readable by design (see outreachEnums.ts), which would make
 * every customer's home address an unauthenticated GROQ query away.
 */
function getFulfillmentClient() {
  if (!projectId || !writeToken) {
    throw new Error('Sanity order fulfillment is not configured.')
  }
  if (!fulfillmentClient) {
    fulfillmentClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return fulfillmentClient
}

/** Shop settings are configuration, not PII — they stay in the public dataset. */
function getSettingsClient() {
  if (!projectId || !writeToken) {
    throw new Error('Sanity order fulfillment is not configured.')
  }
  if (!settingsClient) {
    settingsClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return settingsClient
}

function orderNumberForSession(session: Stripe.Checkout.Session) {
  const date = new Date(session.created * 1000).toISOString().slice(0, 10).replaceAll('-', '')
  return `SHOP-${date}-${session.id.slice(-8).toUpperCase()}`
}

function formatShippingAddress(details: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null) {
  if (!details) return undefined
  const address = details.address
  return [
    details.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country,
  ]
    .filter(Boolean)
    .join('\n')
}

function expandedProduct(lineItem: Stripe.LineItem) {
  const product = lineItem.price?.product
  return product && typeof product !== 'string' && !('deleted' in product) ? product : null
}

function expandedPaymentIntent(session: Stripe.Checkout.Session) {
  return session.payment_intent && typeof session.payment_intent !== 'string'
    ? session.payment_intent
    : null
}

function receiptUrl(session: Stripe.Checkout.Session) {
  const paymentIntent = expandedPaymentIntent(session)
  const charge = paymentIntent?.latest_charge
  return charge && typeof charge !== 'string' && !('deleted' in charge)
    ? charge.receipt_url || undefined
    : undefined
}

function isConflictError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (('statusCode' in error && error.statusCode === 409) ||
        ('status' in error && error.status === 409)),
  )
}

export async function fulfillStripeCheckout(sessionId: string): Promise<FulfillmentResult> {
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent.latest_charge'],
  })
  const orderId = stripeOrderDocumentId(session.id)

  if (session.payment_status === 'unpaid') {
    return { status: 'unpaid', orderId }
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  })
  const posterItems = lineItems.data.filter(
    (lineItem) => expandedProduct(lineItem)?.metadata.kind === 'poster',
  )
  const donationItems = lineItems.data.filter(
    (lineItem) => expandedProduct(lineItem)?.metadata.kind === 'donation',
  )
  if (!posterItems.length && !donationItems.length) {
    throw new Error(`Stripe session ${session.id} has no fulfillable line items.`)
  }

  const shippingDetails = session.collected_information?.shipping_details || null
  const email = session.customer_details?.email?.trim().toLowerCase()
  const customerName =
    shippingDetails?.name ||
    session.customer_details?.individual_name ||
    session.customer_details?.name
  if (!email || !customerName) {
    throw new Error(`Stripe session ${session.id} is missing customer identity details.`)
  }

  const cms = getFulfillmentClient()
  const settings =
    (await getSettingsClient().fetch<ShopSettings | null>(
      '*[_id == "marketingShopSettings"][0]{syncContacts, contactSegment, contactSourceNote}',
    )) || {}
  const existingContact = settings.syncContacts === false
    ? null
    : await cms.fetch<{ _id: string } | null>(
        '*[_type == "marketingContact" && lower(email) == $email][0]{_id}',
        { email },
      )
  const contactId =
    settings.syncContacts === false ? null : existingContact?._id || shopContactDocumentId(email)
  const promotionalConsent = session.consent?.promotions || 'not_collected'
  const donationCents = donationItems.reduce(
    (total, lineItem) => total + (lineItem.amount_total || 0),
    0,
  )
  const printSubtotalCents = posterItems.reduce(
    (total, lineItem) => total + (lineItem.amount_subtotal || 0),
    0,
  )

  const orderItems = posterItems.map((lineItem) => {
    const product = expandedProduct(lineItem)
    const quantity = lineItem.quantity || 1
    const total = lineItem.amount_subtotal || 0
    const marketingProductId = product?.metadata.marketing_product_id
    const visualizationId = product?.metadata.visualization_id

    return {
      _key: createHash('sha256').update(lineItem.id).digest('hex').slice(0, 16),
      _type: 'shopOrderItem',
      product: marketingProductId
        ? { _type: 'reference', _ref: marketingProductId }
        : undefined,
      visualization: visualizationId
        ? { _type: 'reference', _ref: visualizationId }
        : undefined,
      title: lineItem.description || product?.name || 'GoInvo print',
      sku: product?.metadata.visualization_slug,
      quantity,
      unitPrice: centsToCurrency(Math.round(total / quantity)),
    }
  })

  const paymentIntent = expandedPaymentIntent(session)
  const orderDocument = {
    _id: orderId,
    _type: 'marketingOrder',
    orderNumber: orderNumberForSession(session),
    status: session.payment_status === 'paid' ? 'paid' : 'processing',
    placedAt: new Date(session.created * 1000).toISOString(),
    items: orderItems,
    subtotal: centsToCurrency(printSubtotalCents),
    donation: centsToCurrency(donationCents),
    shipping: centsToCurrency(session.total_details?.amount_shipping || 0),
    tax: centsToCurrency(session.total_details?.amount_tax || 0),
    total: centsToCurrency(session.amount_total || 0),
    currency: (session.currency || 'usd').toUpperCase(),
    contact: contactId ? { _type: 'reference', _ref: contactId } : undefined,
    customerName,
    customerEmail: email,
    shippingAddress: formatShippingAddress(shippingDetails),
    processor: 'stripe',
    processorPaymentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : paymentIntent?.id,
    paymentUrl: receiptUrl(session),
    notes: [
      `Stripe Checkout session: ${session.id}`,
      `Promotional email consent: ${promotionalConsent}`,
      session.livemode ? 'Stripe live mode' : 'Stripe test mode',
    ].join('\n'),
  }
  const notification: ShopOrderNotification = {
    orderId,
    orderNumber: orderDocument.orderNumber,
    placedAt: orderDocument.placedAt,
    customerName,
    customerEmail: email,
    items: orderItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
    })),
    supportAmount: orderDocument.donation,
    shipping: orderDocument.shipping,
    total: orderDocument.total,
    currency: orderDocument.currency,
    paymentUrl: orderDocument.paymentUrl,
    testMode: !session.livemode,
  }

  let transaction = cms.transaction()
  if (contactId && !existingContact) {
    transaction = transaction.createIfNotExists({
      _id: contactId,
      _type: 'marketingContact',
      name: customerName,
      email,
      segment: settings.contactSegment || 'other',
      status: 'new',
      warmth: 'unknown',
      currency: 'USD',
      sourceNotes:
        settings.contactSourceNote ||
        (posterItems.length ? 'GoInvo Shop customer' : 'GoInvo supporter'),
      howWeKnow: `${
        posterItems.length
          ? 'Purchased through the GoInvo Shop.'
          : 'Contributed through the GoInvo Shop.'
      } Promotional email consent: ${promotionalConsent}.`,
    })
  }
  transaction = transaction.create(orderDocument)

  try {
    await transaction.commit()
    return { status: 'created', orderId, notification }
  } catch (error) {
    if (isConflictError(error)) {
      return { status: 'already-created', orderId, notification }
    }
    throw error
  }
}
