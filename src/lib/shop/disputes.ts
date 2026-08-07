import 'server-only'

import type Stripe from 'stripe'
import { stripeDisputeDocumentId } from './ids'
import {
  ensureDisputeChannel,
  postDisputeCard,
  postDisputeHubPointer,
  postDisputeNote,
  type DisputeCardInput,
} from './disputeSlack'
import {
  findOrderForPayment,
  getOutreachWriteClient,
  reconcilePaymentSettlement,
} from './reconcile'
import { disputeStage, isTerminalDisputeStatus } from './settlement'
import { centsToCurrency } from './checkout'

/**
 * Mirrors a Stripe dispute into the private outreach dataset, gives it a Slack
 * channel to be discussed in, and re-derives the order's ledger.
 *
 * Everything is recomputed from the dispute object Stripe just handed us and
 * from live charge state, so a redelivered or out-of-order event converges on
 * the same document. Human-written notes are never touched.
 */

export type DisputeSyncResult =
  | { status: 'not-configured' }
  | {
      status: 'synced'
      disputeDocId: string
      orderId?: string
      channelId?: string
      created: boolean
      statusChanged: boolean
    }

type StoredDispute = {
  _id: string
  _rev?: string
  status?: string
  evidenceSubmittedAt?: string
  slack?: {
    channelId?: string
    channelName?: string
    alertMessageTs?: string
    alertChannelId?: string
    announceClaimAt?: string
    lastNotedStatus?: string
  }
}

/**
 * Compare-and-set so only ONE delivery announces a dispute. Stripe can deliver
 * the same event twice concurrently; without this both would create a channel
 * and post a card, and the slower write would clobber the faster one's channel
 * id. The loser of the revision race simply skips announcing.
 */
async function claimAnnounce(
  cms: NonNullable<ReturnType<typeof getOutreachWriteClient>>,
  disputeDocId: string,
  rev: string | undefined,
): Promise<boolean> {
  try {
    const patch = cms.patch(disputeDocId).set({ 'slack.announceClaimAt': new Date().toISOString() })
    if (rev) patch.ifRevisionId(rev)
    await patch.commit()
    return true
  } catch {
    return false
  }
}

function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.id
}

export function disputeDueByIso(dispute: Stripe.Dispute): string | undefined {
  const dueBy = dispute.evidence_details?.due_by
  if (!dueBy || dueBy <= 0) return undefined
  return new Date(dueBy * 1000).toISOString()
}

export async function syncDisputeFromStripe(dispute: Stripe.Dispute): Promise<DisputeSyncResult> {
  const cms = getOutreachWriteClient()
  if (!cms) return { status: 'not-configured' }

  const disputeDocId = stripeDisputeDocumentId(dispute.id)
  const chargeId = idOf(dispute.charge)
  const paymentIntentId = idOf(dispute.payment_intent)

  const existing = await cms.getDocument<StoredDispute>(disputeDocId).catch(() => null)

  // Re-derive the order ledger first: the dispute card should quote a settled
  // order, and this is also what makes a dropped refund event self-heal.
  const ledger = await reconcilePaymentSettlement({
    chargeId,
    paymentIntentId,
    source: 'dispute',
  }).catch((error) => {
    console.error(`Dispute ${dispute.id}: ledger reconcile failed`, error)
    return null
  })

  const order =
    ledger?.status === 'applied'
      ? await findOrderForPayment({ paymentIntentId, chargeId })
      : await findOrderForPayment({ paymentIntentId, chargeId }).catch(() => null)

  const stage = disputeStage(dispute.status)
  const terminal = isTerminalDisputeStatus(dispute.status)
  // Submitting evidence makes Stripe fire dispute.updated, which lands back
  // here. Without the third clause that re-sync would set canRespond true again
  // and re-offer a button for a submission that has already been spent.
  const canRespond =
    !terminal && Boolean(dispute.evidence_details?.due_by) && !existing?.evidenceSubmittedAt
  const statusChanged = Boolean(existing) && existing?.status !== dispute.status

  const fields = {
    _type: 'marketingDispute',
    disputeId: dispute.id,
    status: dispute.status,
    stage,
    reason: dispute.reason,
    amount: centsToCurrency(dispute.amount || 0),
    currency: (dispute.currency || 'usd').toUpperCase(),
    chargeId,
    paymentIntentId,
    order: order ? { _type: 'reference', _ref: order._id } : undefined,
    orderNumber: order?.orderNumber,
    customerEmail: order?.customerEmail,
    customerName: order?.customerName,
    openedAt: new Date((dispute.created || 0) * 1000).toISOString(),
    dueBy: disputeDueByIso(dispute),
    canRespond,
    submissionCount: dispute.evidence_details?.submission_count ?? 0,
    syncedAt: new Date().toISOString(),
    livemode: Boolean(dispute.livemode),
  }

  await cms
    .transaction()
    .createIfNotExists({ _id: disputeDocId, _type: 'marketingDispute', disputeId: dispute.id, status: dispute.status })
    // An absolute SET of everything except `notes` and `slack`, both of which
    // accumulate and must survive a re-sync.
    .patch(disputeDocId, (patch) => patch.set(fields))
    .commit()

  const card: DisputeCardInput = {
    disputeId: dispute.id,
    status: dispute.status,
    stage,
    reason: dispute.reason,
    amount: fields.amount,
    currency: fields.currency,
    orderId: order?._id,
    orderNumber: order?.orderNumber,
    customerEmail: order?.customerEmail,
    customerName: order?.customerName,
    dueBy: fields.dueBy,
    canRespond,
    livemode: Boolean(dispute.livemode),
  }

  // Re-read to get a revision to race on, and to see the state the upsert left.
  const stored = await cms
    .fetch<{ _rev?: string; slack?: StoredDispute['slack'] } | null>(
      '*[_id == $id][0]{_rev, slack}',
      { id: disputeDocId },
    )
    .catch(() => null)

  let channelId = stored?.slack?.channelId
  const alreadyAnnounced = Boolean(stored?.slack?.alertMessageTs)

  if (!alreadyAnnounced && (await claimAnnounce(cms, disputeDocId, stored?._rev))) {
    const channel = await ensureDisputeChannel(dispute.id, Boolean(dispute.livemode)).catch(() => null)

    // Every field is written with a DOTTED path. Setting the whole `slack`
    // object would replace it, wiping a channel id stored by an earlier
    // delivery.
    if (channel?.status === 'created') {
      channelId = channel.channelId
      await cms
        .patch(disputeDocId)
        .set({ 'slack.channelId': channel.channelId, 'slack.channelName': channel.channelName })
        .unset(['slack.channelError'])
        .commit()
    } else if (channel?.status === 'exists') {
      // The channel is there from an earlier delivery whose id we never stored.
      // We cannot resolve the id without a channel-read scope, so we record the
      // gap rather than guessing — see the channelId note below.
      await cms
        .patch(disputeDocId)
        .set({
          'slack.channelName': channel.channelName,
          'slack.channelError': `#${channel.channelName} already exists but its id is unknown here, so replies in it are not captured.`,
        })
        .commit()
    } else if (channel?.status === 'failed') {
      await cms.patch(disputeDocId).set({ 'slack.channelError': channel.error.slice(0, 300) }).commit()
    }

    const posted = await postDisputeCard({ card, channelId }).catch((error) => {
      console.error(`Dispute ${dispute.id}: could not post card`, error)
      return null
    })
    if (posted?.ts) {
      // Record WHERE the card went separately from the dispute's own channel.
      // `postDisputeCard` falls back to the shared shop channel, and binding
      // that as `slack.channelId` would make every unrelated message in it a
      // note on this dispute — and those notes are submitted to Stripe as
      // evidence. Only a dedicated channel is ever this dispute's own.
      await cms
        .patch(disputeDocId)
        .set({ 'slack.alertMessageTs': posted.ts, 'slack.alertChannelId': posted.channel })
        .commit()

      // The card lives in the dispute's own channel; this makes it visible from
      // the channel the team already watches. Best-effort — a chargeback is
      // already recorded and alerted by this point.
      if (channelId) {
        await postDisputeHubPointer({ card, channelId }).catch((error) => {
          console.error(`Dispute ${dispute.id}: hub pointer failed`, error)
          return null
        })
      }
    }
  } else if (statusChanged && stored?.slack?.lastNotedStatus !== dispute.status) {
    // Stripe fires dispute.updated AND dispute.closed for one transition,
    // often in the same second — both syncs read the old status before either
    // wrote it. The note gets the same claim treatment as the announce: record
    // which status was announced under a revision guard, and the race's loser
    // stays silent instead of repeating the message.
    const claimed = await cms
      .patch(disputeDocId)
      .set({ 'slack.lastNotedStatus': dispute.status })
      .ifRevisionId(stored?._rev || '')
      .commit()
      .then(() => true)
      .catch(() => false)

    if (claimed) {
      await postDisputeNote({
        channelId,
        text: `${dispute.livemode ? '' : 'Sandbox: '}Dispute status changed to *${dispute.status}*${
          terminal ? ' — this dispute is now closed.' : '.'
        }`,
      }).catch(() => null)
    }
  }

  return {
    status: 'synced',
    disputeDocId,
    orderId: order?._id,
    channelId,
    created: !existing,
    statusChanged,
  }
}

/** Reads a dispute back out of the private dataset (used by the Slack reply + evidence paths). */
export async function getStoredDispute(disputeDocId: string) {
  const cms = getOutreachWriteClient()
  if (!cms) return null

  return cms.fetch<{
    _id: string
    _rev?: string
    disputeId?: string
    canRespond?: boolean
    submissionCount?: number
    evidenceSubmittedAt?: string
    notes?: Array<{ _key?: string; authorName?: string; text?: string; slackMessageTs?: string }>
    slack?: { channelId?: string }
  } | null>(
    `*[_type == "marketingDispute" && _id == $id][0]{
      _id, _rev, disputeId, canRespond, submissionCount, evidenceSubmittedAt,
      notes[]{_key, authorName, text, slackMessageTs},
      slack
    }`,
    { id: disputeDocId },
  )
}
