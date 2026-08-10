import { createHash } from 'node:crypto'

export function shopContactDocumentId(email: string) {
  const digest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 24)
  return `marketingContact.shop-${digest}`
}

export function stripeOrderDocumentId(sessionId: string) {
  return `marketingOrder.stripe-${sessionId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96)}`
}

/**
 * Deterministic, like the order id above: a redelivered dispute webhook must
 * land on the same document rather than creating a second record of the same
 * chargeback.
 */
export function stripeDisputeDocumentId(disputeId: string) {
  return `marketingDispute.stripe-${disputeId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96)}`
}
