import type Stripe from 'stripe'
import { centsToCurrency } from './checkout'

/**
 * The money ledger for an order after Stripe has had its say.
 *
 * Everything here is PURE and works in integer cents, converting to currency
 * only at the edge. That matters because this is the only place that decides
 * what we actually collected, and a rounding error here becomes a wrong number
 * on a revenue tile and a poster shipped for money we no longer hold.
 *
 * The central design rule: a settlement is always recomputed from the CURRENT
 * state of the charge and its disputes, never accumulated from events. Stripe
 * webhooks can arrive twice, out of order, or months late; because every field
 * is an absolute value derived from live state, a redelivered or late event
 * produces exactly the same answer as a first delivery.
 */

/** Dispute statuses where the outcome is settled and nothing further is held. */
export const TERMINAL_DISPUTE_STATUSES = new Set<Stripe.Dispute.Status>([
  'won',
  'lost',
  'warning_closed',
  'prevented',
])

export type DisputeStage = 'inquiry' | 'chargeback'

export type SettlementState =
  | 'collected'
  | 'partiallyRefunded'
  | 'refunded'
  | 'disputeInquiry'
  | 'disputeOpen'
  | 'disputeLost'

export type Settlement = {
  amountCaptured: number
  amountRefunded: number
  amountDisputeHeld: number
  amountLostToDispute: number
  netCollected: number
  settlementState: SettlementState
  openDisputeCount: number
}

/**
 * Stripe models an "inquiry" (a question from the cardholder's bank) and a
 * "chargeback" (money actually pulled back) as the same object, separated only
 * by the `warning_` prefix. An inquiry holds no funds, so treating the two
 * alike would understate revenue for something that may never cost anything.
 */
export function disputeStage(status: Stripe.Dispute.Status): DisputeStage {
  return status.startsWith('warning_') ? 'inquiry' : 'chargeback'
}

export function isTerminalDisputeStatus(status: Stripe.Dispute.Status): boolean {
  return TERMINAL_DISPUTE_STATUSES.has(status)
}

/** An order in any of these states must not be shipped. */
export function isDoNotShip(state: SettlementState): boolean {
  return state === 'disputeOpen' || state === 'disputeLost' || state === 'refunded'
}

type SettlementInput = {
  charge: Pick<Stripe.Charge, 'amount_captured' | 'amount_refunded'>
  disputes: Array<Pick<Stripe.Dispute, 'amount' | 'status'>>
}

export function computeSettlement({ charge, disputes }: SettlementInput): Settlement {
  const capturedCents = Math.max(0, Math.round(charge.amount_captured || 0))
  const refundedCents = Math.max(0, Math.round(charge.amount_refunded || 0))

  let heldCents = 0
  let lostCents = 0
  let openDisputeCount = 0
  let hasOpenInquiry = false

  for (const dispute of disputes) {
    const amount = Math.max(0, Math.round(dispute.amount || 0))
    // These branches are mutually exclusive BY CONSTRUCTION, not by a guard:
    // an unresolved dispute is held, a resolved one is either lost or costs
    // nothing. That is what makes it impossible to subtract a lost partial
    // dispute twice — the bug this arithmetic exists to prevent.
    if (!isTerminalDisputeStatus(dispute.status)) {
      openDisputeCount += 1
      if (disputeStage(dispute.status) === 'chargeback') {
        heldCents += amount
      } else {
        hasOpenInquiry = true
      }
    } else if (dispute.status === 'lost') {
      lostCents += amount
    }
  }

  const netCents = Math.max(0, capturedCents - refundedCents - lostCents - heldCents)

  return {
    amountCaptured: centsToCurrency(capturedCents),
    amountRefunded: centsToCurrency(refundedCents),
    amountDisputeHeld: centsToCurrency(heldCents),
    amountLostToDispute: centsToCurrency(lostCents),
    netCollected: centsToCurrency(netCents),
    openDisputeCount,
    settlementState: settlementStateFor({
      capturedCents,
      refundedCents,
      heldCents,
      lostCents,
      hasOpenInquiry,
    }),
  }
}

/**
 * Most severe first. An operator reads one word to decide whether to put a
 * poster in a tube, so the state that would cause the costliest mistake has to
 * win: money currently being pulled back outranks money already refunded.
 */
function settlementStateFor(input: {
  capturedCents: number
  refundedCents: number
  heldCents: number
  lostCents: number
  hasOpenInquiry: boolean
}): SettlementState {
  if (input.heldCents > 0) return 'disputeOpen'
  if (input.lostCents > 0) return 'disputeLost'
  // Compared against what was CAPTURED, never against `charge.amount`: a
  // partial capture would make `amount` overstate the take and misreport a
  // full refund as partial.
  if (input.capturedCents > 0 && input.refundedCents >= input.capturedCents) return 'refunded'
  if (input.hasOpenInquiry) return 'disputeInquiry'
  if (input.refundedCents > 0) return 'partiallyRefunded'
  return 'collected'
}

export const SETTLEMENT_STATE_LABELS: Record<SettlementState, string> = {
  collected: 'Collected',
  partiallyRefunded: 'Partially refunded',
  refunded: 'Refunded',
  disputeInquiry: 'Inquiry open',
  disputeOpen: 'Chargeback open',
  disputeLost: 'Chargeback lost',
}
