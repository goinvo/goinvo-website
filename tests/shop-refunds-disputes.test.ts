import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import {
  computeSettlement,
  disputeStage,
  isDoNotShip,
  isTerminalDisputeStatus,
} from '@/lib/shop/settlement'
import { buildDisputeCard, buildDisputeChannelName } from '@/lib/shop/disputeSlack'
import { buildEvidenceText } from '@/lib/shop/disputeEvidence'
import { stripeDisputeDocumentId } from '@/lib/shop/ids'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'
import { ARRAY_ITEM_TYPES, DEFAULTS, REQUIRED_FIELDS } from '@/lib/marketing/defaults'
import { MARKETING_FIELDS } from '@/lib/marketing/fieldPolicy'
import { OUTREACH_DATASET_TYPES } from '@/lib/marketing/outreachEnums'

/**
 * Refunds and disputes are the two ways money leaves after a sale looked
 * complete. These tests are adversarial about the ledger: every case asks
 * whether we could ship a poster for money we no longer hold, or report
 * revenue we already gave back.
 */

const charge = (captured: number, refunded = 0) =>
  ({ amount_captured: captured, amount_refunded: refunded }) as Stripe.Charge

const dispute = (amount: number, status: Stripe.Dispute.Status) =>
  ({ amount, status }) as Stripe.Dispute

describe('settlement math: what did we actually collect', () => {
  it('reports a clean sale as fully collected', () => {
    const result = computeSettlement({ charge: charge(1200), disputes: [] })

    expect(result.settlementState).toBe('collected')
    expect(result.netCollected).toBe(12)
    expect(result.amountRefunded).toBe(0)
  })

  it('distinguishes a partial refund from a full one', () => {
    expect(computeSettlement({ charge: charge(1200, 600), disputes: [] })).toMatchObject({
      settlementState: 'partiallyRefunded',
      netCollected: 6,
      amountRefunded: 6,
    })
    expect(computeSettlement({ charge: charge(1200, 1200), disputes: [] })).toMatchObject({
      settlementState: 'refunded',
      netCollected: 0,
    })
  })

  it('compares refunds against what was CAPTURED, not the authorized amount', () => {
    // A partial capture: authorized 1200, captured 600, refunded 600. That is a
    // FULL refund. Comparing against the authorization would call it partial
    // and leave the order looking shippable.
    const result = computeSettlement({ charge: charge(600, 600), disputes: [] })

    expect(result.settlementState).toBe('refunded')
    expect(isDoNotShip(result.settlementState)).toBe(true)
  })

  it('holds funds for an open chargeback but not for an inquiry', () => {
    const chargeback = computeSettlement({
      charge: charge(1200),
      disputes: [dispute(1200, 'needs_response')],
    })
    expect(chargeback).toMatchObject({ settlementState: 'disputeOpen', amountDisputeHeld: 12, netCollected: 0 })

    // An inquiry is a question, not a withdrawal — treating it as one would
    // understate revenue for something that may never cost anything.
    const inquiry = computeSettlement({
      charge: charge(1200),
      disputes: [dispute(1200, 'warning_needs_response')],
    })
    expect(inquiry).toMatchObject({ settlementState: 'disputeInquiry', amountDisputeHeld: 0, netCollected: 12 })
    expect(isDoNotShip(inquiry.settlementState)).toBe(false)
  })

  it('subtracts a LOST partial dispute exactly once', () => {
    // The regression this arithmetic exists to prevent: counting a lost dispute
    // as both "held" and "lost" would double-subtract and understate revenue.
    const result = computeSettlement({
      charge: charge(1200),
      disputes: [dispute(600, 'lost')],
    })

    expect(result.amountDisputeHeld).toBe(0)
    expect(result.amountLostToDispute).toBe(6)
    expect(result.netCollected).toBe(6)
    expect(result.settlementState).toBe('disputeLost')
  })

  it('restores the money when a dispute is won', () => {
    const result = computeSettlement({ charge: charge(1200), disputes: [dispute(1200, 'won')] })

    expect(result.netCollected).toBe(12)
    expect(result.settlementState).toBe('collected')
    expect(result.amountDisputeHeld).toBe(0)
  })

  it('treats a closed inquiry as costing nothing', () => {
    const result = computeSettlement({
      charge: charge(1200),
      disputes: [dispute(1200, 'warning_closed')],
    })

    expect(result.settlementState).toBe('collected')
    expect(result.netCollected).toBe(12)
  })

  it('combines a refund and a lost chargeback without going negative', () => {
    const result = computeSettlement({
      charge: charge(1200, 1000),
      disputes: [dispute(1200, 'lost')],
    })

    // Refunded 10 and lost 12 against 12 captured — arithmetic says -10.
    expect(result.netCollected).toBe(0)
  })

  it('ranks an open chargeback above an already-processed refund', () => {
    // Both are true at once; the operator must see the one that is still
    // moving money, and both mean do-not-ship anyway.
    const result = computeSettlement({
      charge: charge(1200, 1200),
      disputes: [dispute(1200, 'needs_response')],
    })

    expect(result.settlementState).toBe('disputeOpen')
    expect(isDoNotShip(result.settlementState)).toBe(true)
  })

  it('sums several open disputes on one charge', () => {
    const result = computeSettlement({
      charge: charge(3000),
      disputes: [dispute(1000, 'needs_response'), dispute(500, 'under_review'), dispute(500, 'won')],
    })

    expect(result.amountDisputeHeld).toBe(15)
    expect(result.openDisputeCount).toBe(2)
    expect(result.netCollected).toBe(15)
  })

  it('classifies every Stripe dispute status without throwing', () => {
    const statuses: Stripe.Dispute.Status[] = [
      'lost', 'needs_response', 'prevented', 'under_review',
      'warning_closed', 'warning_needs_response', 'warning_under_review', 'won',
    ]

    for (const status of statuses) {
      expect(['inquiry', 'chargeback']).toContain(disputeStage(status))
      expect(typeof isTerminalDisputeStatus(status)).toBe('boolean')
      expect(() => computeSettlement({ charge: charge(1200), disputes: [dispute(1200, status)] })).not.toThrow()
    }
  })

  it('survives missing amounts rather than producing NaN', () => {
    const result = computeSettlement({
      charge: { amount_captured: undefined, amount_refunded: undefined } as unknown as Stripe.Charge,
      disputes: [{ amount: undefined, status: 'needs_response' } as unknown as Stripe.Dispute],
    })

    expect(result.netCollected).toBe(0)
    expect(Number.isNaN(result.amountCaptured)).toBe(false)
  })
})

describe('dispute channels are deterministic, so redelivery cannot fork them', () => {
  it('derives the same channel name from the same dispute id', () => {
    expect(buildDisputeChannelName('du_1ABCdef')).toBe(buildDisputeChannelName('du_1ABCdef'))
  })

  it('produces a name Slack will accept', () => {
    const name = buildDisputeChannelName('du_1ABCdefGHIjklMNOpqr')

    expect(name).toMatch(/^[a-z0-9-]+$/)
    expect(name.length).toBeLessThanOrEqual(80)
    expect(name.startsWith('shop-dispute-')).toBe(true)
  })

  it('stays within Slack limits for an absurdly long id', () => {
    const name = buildDisputeChannelName(`du_${'x'.repeat(300)}`)

    expect(name.length).toBeLessThanOrEqual(80)
    expect(name.endsWith('-')).toBe(false)
  })

  it('derives a stable document id for the same dispute', () => {
    expect(stripeDisputeDocumentId('du_123')).toBe('marketingDispute.stripe-du_123')
    expect(stripeDisputeDocumentId('du_/../evil')).not.toContain('/')
  })
})

describe('the dispute card tells an operator what to do', () => {
  const base = {
    disputeId: 'du_1',
    status: 'needs_response',
    stage: 'chargeback' as const,
    reason: 'product_not_received',
    amount: 12,
    currency: 'USD',
    orderNumber: 'SHOP-20260806-ABCD1234',
    customerEmail: 'buyer@example.com',
    canRespond: true,
    livemode: true,
  }

  it('states the deadline and how long is left', () => {
    const soon = new Date('2026-08-10T12:00:00Z').toISOString()
    const card = buildDisputeCard({ ...base, dueBy: soon }, new Date('2026-08-06T12:00:00Z'))

    expect(card.text).toContain('4 days left')
  })

  it('says so plainly when the deadline has passed', () => {
    const past = new Date('2026-08-01T12:00:00Z').toISOString()
    const card = buildDisputeCard({ ...base, dueBy: past }, new Date('2026-08-06T12:00:00Z'))

    expect(card.text).toContain('deadline has passed')
  })

  it('offers the irreversible submit button only behind a confirmation', () => {
    const card = buildDisputeCard({ ...base, dueBy: new Date('2026-08-10T12:00:00Z').toISOString() })
    const serialized = JSON.stringify(card.blocks)

    expect(serialized).toContain('goinvo_dispute_submit_evidence')
    expect(serialized).toContain('cannot be taken back')
  })

  it('hides the submit button once Stripe will not accept a response', () => {
    const card = buildDisputeCard({ ...base, canRespond: false })

    expect(JSON.stringify(card.blocks)).not.toContain('goinvo_dispute_submit_evidence')
  })

  it('escapes a cardholder-supplied reason instead of letting it forge markup', () => {
    const card = buildDisputeCard({ ...base, reason: '<!channel> & "urgent"', canRespond: false })

    expect(JSON.stringify(card.blocks)).not.toContain('<!channel>')
    expect(card.text).toContain('&lt;!channel&gt;')
  })

  it('reaches the customer only through the operator\'s own mail client', () => {
    const serialized = JSON.stringify(buildDisputeCard(base).blocks)

    // No outbound send path exists, by design: an internal note must never be
    // deliverable to a hostile cardholder.
    expect(serialized).toContain('mailto:')
  })

  it('still renders when no order could be matched', () => {
    const card = buildDisputeCard({ ...base, orderNumber: undefined, customerEmail: undefined })

    expect(card.text).toBeTruthy()
    expect(JSON.stringify(card.blocks)).toContain('no matching order found')
  })
})

describe('an accepted Stripe submission is never re-armed', () => {
  const loadSubmit = async (options: { stripeFails?: boolean; recordFails?: boolean }) => {
    vi.resetModules()
    const unset: string[][] = []

    vi.doMock('server-only', () => ({}))
    // Only the stored-dispute reader is needed here; the real module would pull
    // in Slack and Stripe wiring this suite is not exercising.
    vi.doMock('@/lib/shop/disputes', () => ({
      getStoredDispute: async () => ({
        _id: 'marketingDispute.stripe-du_1',
        _rev: 'rev-1',
        disputeId: 'du_1',
        canRespond: true,
        notes: [{ authorName: 'Shirley', text: 'Delivered 2026-08-01.' }],
      }),
    }))
    vi.doMock('@/lib/shop/reconcile', () => ({
      getOutreachWriteClient: () => {
        let commits = 0
        const chain: Record<string, unknown> = {
          set: () => chain,
          unset: (fields: string[]) => { unset.push(fields); return chain },
          ifRevisionId: () => chain,
          commit: async () => {
            commits += 1
            // Commit 1 is the claim; commit 2 is recording the accepted
            // submission — that is the one this case makes fail.
            if (options.recordFails && commits === 2) throw new Error('sanity is down')
            return {}
          },
        }
        return { patch: () => chain }
      },
    }))
    vi.doMock('@/lib/shop/stripeConfig', () => ({
      getStripeClient: () => ({
        disputes: {
          update: async () => {
            if (options.stripeFails) throw new Error('stripe rejected it')
            return { status: 'under_review', evidence_details: { submission_count: 1 } }
          },
        },
      }),
    }))

    const { submitDisputeEvidence } = await import('@/lib/shop/disputeEvidence')
    const result = await submitDisputeEvidence({ disputeDocId: 'marketingDispute.stripe-du_1', submittedBy: 'shirley' })
    return { result, unset }
  }

  it('reports success and keeps the claim when Stripe accepted but recording failed', async () => {
    // Releasing the claim here would re-arm the button on top of a submission
    // Stripe has already taken — the one thing that must never happen.
    const { result, unset } = await loadSubmit({ recordFails: true })

    expect(result.status).toBe('submitted')
    expect(unset.flat()).not.toContain('evidenceSubmittedAt')
  })

  it('releases the claim when Stripe itself refused, so it can be retried', async () => {
    const { result, unset } = await loadSubmit({ stripeFails: true })

    expect(result.status).toBe('failed')
    expect(unset.flat()).toContain('evidenceSubmittedAt')
  })
})

describe('evidence is assembled from the channel, never sent implicitly', () => {
  it('joins the drafted notes in order with their authors', () => {
    const text = buildEvidenceText([
      { authorName: 'Shirley', text: 'Poster shipped 2026-08-01.' },
      { authorName: 'Juhan', text: 'Tracking shows delivered.' },
    ])

    expect(text).toContain('Shirley: Poster shipped')
    expect(text.indexOf('Shirley')).toBeLessThan(text.indexOf('Juhan'))
  })

  it('returns nothing when there is nothing drafted', () => {
    expect(buildEvidenceText([])).toBe('')
    expect(buildEvidenceText(undefined)).toBe('')
    expect(buildEvidenceText([{ text: '   ' }])).toBe('')
  })

  it('caps the payload so Stripe cannot reject an oversized submission', () => {
    const text = buildEvidenceText([{ text: 'x'.repeat(50_000) }])

    expect(text.length).toBeLessThanOrEqual(20_000)
  })
})

describe('the dispute type is registered in every lockstep registry', () => {
  it('is a managed marketing type stored in the private dataset', () => {
    expect(MANAGED_MARKETING_TYPES).toContain('marketingDispute')
    // Claim text and customer email — never the world-readable dataset.
    expect(OUTREACH_DATASET_TYPES).toContain('marketingDispute')
  })

  it('appears in the defaults, required, and array-item maps', () => {
    expect(DEFAULTS.marketingDispute).toEqual({})
    expect(REQUIRED_FIELDS.marketingDispute).toEqual(['disputeId', 'status'])
    expect(ARRAY_ITEM_TYPES.marketingDispute).toEqual({ notes: 'disputeNote' })
  })

  it('declares its fields in the policy the drift test enforces', () => {
    expect(MARKETING_FIELDS.marketingDispute).toContain('disputeId')
    expect(MARKETING_FIELDS.marketingDispute).toContain('notes')
    // The order's new settlement fields must be declared too.
    expect(MARKETING_FIELDS.marketingOrder).toContain('netCollected')
    expect(MARKETING_FIELDS.marketingOrder).toContain('settlementState')
  })
})

describe('syncing a dispute is idempotent across redelivery', () => {
  const SHARED_SHOP_CHANNEL = 'C_SHOPOPS'

  const loadSync = async (
    existingDispute: Record<string, unknown> | null,
    options: { channel?: Record<string, unknown>; claimFails?: boolean } = {},
  ) => {
    vi.resetModules()
    // resetModules clears the module cache but NOT the mock registry, so a mock
    // registered by another suite in this file would still be in force here.
    vi.doUnmock('@/lib/shop/disputes')
    const calls = { channelsCreated: 0, cardsPosted: 0, notesPosted: 0, hubPointers: 0 }
    const committed: Array<Record<string, unknown>> = []
    const patched: Array<Record<string, unknown>> = []

    vi.doMock('server-only', () => ({}))
    vi.doMock('@/lib/shop/reconcile', () => ({
      getOutreachWriteClient: () => ({
        getDocument: async () => existingDispute,
        fetch: async () => (existingDispute ? { _rev: 'rev-1', slack: existingDispute.slack } : { _rev: 'rev-1' }),
        transaction: () => {
          const transaction = {
            createIfNotExists: (doc: Record<string, unknown>) => { committed.push(doc); return transaction },
            patch: (_id: string, fn: (p: unknown) => unknown) => {
              fn({ set: (fields: Record<string, unknown>) => { committed.push(fields); return {} } })
              return transaction
            },
            commit: async () => ({}),
          }
          return transaction
        },
        patch: () => {
          const chain: Record<string, unknown> = {
            set: (fields: Record<string, unknown>) => { patched.push(fields); return chain },
            unset: () => chain,
            ifRevisionId: () => chain,
            commit: async () => {
              // The announce claim is the first patch; failing it simulates
              // losing the race to a concurrent delivery.
              if (options.claimFails && patched.some((p) => p['slack.announceClaimAt'])) {
                throw new Error('revision mismatch')
              }
              return {}
            },
          }
          return chain
        },
      }),
      reconcilePaymentSettlement: async () => ({ status: 'applied', orderId: 'marketingOrder.x', chargeId: 'ch_1', settlement: {} }),
      findOrderForPayment: async () => ({ _id: 'marketingOrder.x', orderNumber: 'SHOP-1', customerEmail: 'b@example.com' }),
    }))
    vi.doMock('@/lib/shop/disputeSlack', () => ({
      ensureDisputeChannel: async () => {
        calls.channelsCreated += 1
        return options.channel || { status: 'created', channelId: 'C123', channelName: 'shop-dispute-du-1' }
      },
      postDisputeCard: async (args: { channelId?: string }) => {
        calls.cardsPosted += 1
        // Mirrors the real fallback: with no dedicated channel, the card goes
        // to the shared shop channel.
        return { ts: '111.222', channel: args.channelId || SHARED_SHOP_CHANNEL }
      },
      postDisputeHubPointer: async () => { calls.hubPointers += 1; return { ts: '555.666' } },
      postDisputeNote: async () => { calls.notesPosted += 1; return { ts: '333.444' } },
    }))

    const { syncDisputeFromStripe } = await import('@/lib/shop/disputes')
    const result = await syncDisputeFromStripe({
      id: 'du_1',
      status: 'needs_response',
      reason: 'fraudulent',
      amount: 1200,
      currency: 'usd',
      created: 1_770_000_000,
      charge: 'ch_1',
      payment_intent: 'pi_1',
      livemode: true,
      evidence_details: { due_by: 1_772_000_000, submission_count: 0 },
    } as unknown as Stripe.Dispute)

    return { result, calls, committed, patched }
  }

  /**
   * The blocker this suite exists for: if the shared shop channel were stored
   * as the dispute's own channel, every unrelated message in it would become a
   * note — and notes are submitted to Stripe as evidence, carrying other
   * customers' details with them.
   */
  it.each([
    ['channel creation is disabled', { status: 'disabled' }],
    ['Slack refuses to create the channel', { status: 'failed', error: 'missing_scope' }],
    ['the channel already exists but its id is unknown', { status: 'exists', channelName: 'shop-dispute-du-1' }],
  ])('never binds the shared shop channel as the dispute channel when %s', async (_label, channel) => {
    const { patched, calls } = await loadSync(null, { channel })

    expect(calls.cardsPosted).toBe(1)
    const boundChannels = patched
      .map((fields) => fields['slack.channelId'])
      .filter(Boolean)
    expect(boundChannels).not.toContain(SHARED_SHOP_CHANNEL)
    // Where the card landed is still recorded — just not as the reply channel.
    expect(patched.some((fields) => fields['slack.alertChannelId'] === SHARED_SHOP_CHANNEL)).toBe(true)
  })

  it('binds only a channel created for this dispute', async () => {
    const { patched } = await loadSync(null)

    expect(patched.some((fields) => fields['slack.channelId'] === 'C123')).toBe(true)
  })

  it('announces the dispute in the watched channel, pointing at its own channel', async () => {
    const { calls } = await loadSync(null)

    expect(calls.hubPointers).toBe(1)
  })

  it('does not announce when there is no separate channel to point at', async () => {
    const { calls } = await loadSync(null, { channel: { status: 'disabled' } })

    // The card already went to the watched channel; a pointer to itself is noise.
    expect(calls.cardsPosted).toBe(1)
    expect(calls.hubPointers).toBe(0)
  })

  it('writes dotted paths so a later patch cannot wipe a stored channel id', async () => {
    const { patched } = await loadSync(null, { channel: { status: 'failed', error: 'missing_scope' } })

    // Setting a whole `slack` object would replace it and drop channelId.
    expect(patched.every((fields) => !('slack' in fields))).toBe(true)
  })

  it('lets only one concurrent delivery announce the dispute', async () => {
    const { calls } = await loadSync(null, { claimFails: true })

    expect(calls.channelsCreated).toBe(0)
    expect(calls.cardsPosted).toBe(0)
  })

  it('creates the channel and posts the card on first delivery', async () => {
    const { result, calls } = await loadSync(null)

    expect(result.status).toBe('synced')
    expect(calls.channelsCreated).toBe(1)
    expect(calls.cardsPosted).toBe(1)
  })

  it('does not open a second channel or repost the card on redelivery', async () => {
    const { calls } = await loadSync({
      _id: 'marketingDispute.stripe-du_1',
      status: 'needs_response',
      slack: { channelId: 'C123', alertMessageTs: '111.222' },
    })

    expect(calls.channelsCreated).toBe(0)
    expect(calls.cardsPosted).toBe(0)
    // Status is unchanged, so there is nothing worth saying either.
    expect(calls.notesPosted).toBe(0)
  })

  it('posts a status note — not a duplicate card — when the dispute moves on', async () => {
    const { calls } = await loadSync({
      _id: 'marketingDispute.stripe-du_1',
      status: 'under_review',
      slack: { channelId: 'C123', alertMessageTs: '111.222' },
    })

    expect(calls.cardsPosted).toBe(0)
    expect(calls.notesPosted).toBe(1)
  })

  it('does not repeat a status note already announced for this status', async () => {
    // dispute.updated and dispute.closed both fire for one transition; the
    // second delivery finds the status already announced and stays silent.
    const { calls } = await loadSync({
      _id: 'marketingDispute.stripe-du_1',
      status: 'under_review',
      slack: { channelId: 'C123', alertMessageTs: '111.222', lastNotedStatus: 'needs_response' },
    })

    // The incoming status in this harness is needs_response — same as noted.
    expect(calls.notesPosted).toBe(0)
  })

  it('stops offering the evidence button once a submission has been spent', async () => {
    // Submitting evidence makes Stripe fire dispute.updated. Recomputing
    // canRespond from status alone would re-arm a button for a submission
    // Stripe has already accepted.
    const { committed } = await loadSync({
      _id: 'marketingDispute.stripe-du_1',
      status: 'under_review',
      evidenceSubmittedAt: '2026-08-06T22:14:02.282Z',
      slack: { channelId: 'C123', alertMessageTs: '111.222' },
    })

    const fields = committed.find((doc) => 'canRespond' in doc)
    expect(fields?.canRespond).toBe(false)
  })

  it('writes the dispute to a deterministic id so redelivery updates one record', async () => {
    const { committed } = await loadSync(null)
    const created = committed.find((doc) => doc._id)

    expect(created?._id).toBe('marketingDispute.stripe-du_1')
  })
})

/**
 * Webhook-level robustness. Stripe redelivers, arrives out of order, and sends
 * events for payments that are not ours; Slack and Sanity fail independently.
 * None of that may lose a dispute or corrupt the ledger.
 */
describe('webhook robustness under redelivery, outages, and stray events', () => {
  const loadWebhook = async (overrides: {
    event: Record<string, unknown>
    reconcile?: () => Promise<unknown>
    syncDispute?: () => Promise<unknown>
    notifyRefund?: () => Promise<unknown>
  }) => {
    vi.resetModules()
    const calls = { reconcile: 0, syncDispute: 0, notifyRefund: 0 }

    vi.doMock('server-only', () => ({}))
    vi.doMock('@/lib/shop/stripeConfig', () => ({
      getStripeClient: () => ({
        webhooks: { constructEvent: () => overrides.event },
      }),
      getStripeWebhookSecret: () => 'whsec_test',
    }))
    vi.doMock('@/lib/shop/reconcile', () => ({
      reconcilePaymentSettlement: async () => {
        calls.reconcile += 1
        return overrides.reconcile
          ? await overrides.reconcile()
          : { status: 'applied', orderId: 'marketingOrder.x', chargeId: 'ch_1', settlement: {} }
      },
    }))
    vi.doMock('@/lib/shop/disputes', () => ({
      syncDisputeFromStripe: async () => {
        calls.syncDispute += 1
        return overrides.syncDispute ? await overrides.syncDispute() : { status: 'synced' }
      },
    }))
    vi.doMock('@/lib/shop/slack', () => ({
      notifySlackShopOrder: async () => ({ status: 'sent' }),
      notifySlackShopRefund: async () => {
        calls.notifyRefund += 1
        return overrides.notifyRefund ? await overrides.notifyRefund() : { status: 'sent' }
      },
    }))
    vi.doMock('@/lib/shop/fulfillment', () => ({ fulfillStripeCheckout: async () => ({ status: 'unpaid' }) }))
    vi.doMock('@/lib/shop/checkout', () => ({ isMissingStripeResource: () => false }))

    const { POST } = await import('@/app/api/shop/stripe/webhook/route')
    const response = await POST(
      new Request('https://www.goinvo.com/api/shop/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=deadbeef' },
        body: '{}',
      }),
    )
    return { response, body: await response.json(), calls }
  }

  it('records a refund and reports it', async () => {
    const { response, body, calls } = await loadWebhook({
      event: { type: 'charge.refunded', data: { object: { id: 'ch_1' } } },
    })

    expect(response.status).toBe(200)
    expect(body.refund).toBe('applied')
    expect(calls.reconcile).toBe(1)
    expect(calls.notifyRefund).toBe(1)
  })

  it('reconciles every refund event but alerts only once', async () => {
    // Stripe fires charge.refunded, charge.refund.updated and refund.updated
    // for a single refund. All must correct the ledger; only one may speak.
    for (const type of ['refund.updated', 'refund.failed', 'charge.refund.updated']) {
      const { response, body, calls } = await loadWebhook({
        event: { type, data: { object: { id: 're_1', charge: 'ch_1' } } },
      })

      expect(response.status).toBe(200)
      expect(body.refund).toBe('applied')
      expect(calls.reconcile).toBe(1)
      expect(calls.notifyRefund).toBe(0)
    }
  })

  it('keeps the refund recorded when Slack is down', async () => {
    // The ledger is already correct; a Slack outage must not turn that into a
    // 500, because repeated 500s let Stripe disable the endpoint entirely.
    const { response, body } = await loadWebhook({
      event: { type: 'charge.refunded', data: { object: { id: 'ch_1' } } },
      notifyRefund: async () => {
        throw new Error('slack is down')
      },
    })

    expect(response.status).toBe(200)
    expect(body.refund).toBe('applied')
  })

  it('acknowledges a refund for a payment that is not one of our orders', async () => {
    const { response, body } = await loadWebhook({
      event: { type: 'charge.refunded', data: { object: { id: 'ch_stranger' } } },
      reconcile: async () => ({ status: 'no-order', chargeId: 'ch_stranger' }),
    })

    expect(response.status).toBe(200)
    expect(body.refund).toBe('no-order')
  })

  it('routes every dispute lifecycle event to the same sync', async () => {
    for (const type of [
      'charge.dispute.created',
      'charge.dispute.updated',
      'charge.dispute.closed',
      'charge.dispute.funds_withdrawn',
      'charge.dispute.funds_reinstated',
    ]) {
      const { response, body, calls } = await loadWebhook({
        event: { type, data: { object: { id: 'du_1', status: 'needs_response' } } },
      })

      expect(response.status).toBe(200)
      expect(body.dispute).toBe('synced')
      expect(calls.syncDispute).toBe(1)
    }
  })

  it('fails loudly when the ledger write itself fails, so Stripe retries', async () => {
    // The opposite of the Slack case: if we could not record the refund, a 200
    // would permanently lose it.
    const { response } = await loadWebhook({
      event: { type: 'charge.refunded', data: { object: { id: 'ch_1' } } },
      reconcile: async () => {
        throw new Error('sanity is down')
      },
    })

    expect(response.status).toBe(500)
  })

  it('still ignores events it has no branch for', async () => {
    const { response, body, calls } = await loadWebhook({
      event: { type: 'customer.created', data: { object: {} } },
    })

    expect(response.status).toBe(200)
    expect(body.received).toBe(true)
    expect(calls.reconcile).toBe(0)
    expect(calls.syncDispute).toBe(0)
  })
})
