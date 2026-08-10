import 'server-only'

import { createHash } from 'node:crypto'
import { getSlackConfig } from '@/lib/chat/slack'
import { getOutreachWriteClient } from './reconcile'
import { getShopSlackChannelId } from './slack'

/**
 * Turns a Slack message typed in a dispute channel into a note on the dispute
 * record, so the conversation itself becomes the evidence draft.
 *
 * Nothing here sends anything anywhere. Typing accumulates a draft; reaching
 * Stripe or the customer is always a separate, explicit button press. That
 * separation is the whole safety property — an internal remark can never be
 * delivered to a hostile cardholder because there is no delivery path at all.
 */

type DisputeNoteTarget = {
  _id: string
  _rev?: string
  notes?: Array<{ slackMessageTs?: string }>
}

const PROJECTION = `{_id, _rev, notes[]{slackMessageTs}}`

/**
 * Shared channels can never be a dispute's conversation. This is defence in
 * depth: `syncDisputeFromStripe` already refuses to store one, but a row
 * written before that rule existed must not reopen the hole — a match here
 * would turn ordinary shop or chat traffic into evidence submitted to Stripe.
 */
function isSharedChannel(channelId: string) {
  const shared = [getShopSlackChannelId(), getSlackConfig().channelId].filter(Boolean)
  return shared.includes(channelId)
}

export async function findDisputeByChannel(channelId: string) {
  const cms = getOutreachWriteClient()
  if (!cms) return null
  if (isSharedChannel(channelId)) return null

  // Ordered, so a channel that somehow maps to more than one dispute resolves
  // deterministically to the newest rather than to an arbitrary row.
  return cms.fetch<DisputeNoteTarget | null>(
    `*[_type == "marketingDispute" && slack.channelId == $channelId] | order(openedAt desc)[0]${PROJECTION}`,
    { channelId },
  )
}

export async function appendDisputeNoteFromSlack(input: {
  channelId: string
  text: string
  authorName?: string
  slackUserId?: string
  slackMessageTs: string
  createdAt: string
}): Promise<boolean> {
  const cms = getOutreachWriteClient()
  if (!cms) return false

  let dispute = await findDisputeByChannel(input.channelId)
  if (!dispute) return false

  const note = {
    _key: createHash('sha256').update(input.slackMessageTs).digest('hex').slice(0, 16),
    _type: 'disputeNote',
    authorName: input.authorName || 'GoInvo',
    text: input.text,
    createdAt: input.createdAt,
    slackMessageTs: input.slackMessageTs,
    source: 'slack',
  }

  // Slack redelivers events, and two people can type at once. The revision
  // guard plus the ts dedupe make both harmless — same pattern the visitor
  // chat append uses.
  for (let attempt = 0; attempt < 3 && dispute; attempt += 1) {
    if ((dispute.notes || []).some((existing) => existing.slackMessageTs === input.slackMessageTs)) {
      return true
    }

    const patch = cms.patch(dispute._id).setIfMissing({ notes: [] }).append('notes', [note])
    if (dispute._rev) patch.ifRevisionId(dispute._rev)

    try {
      await patch.commit()
      return true
    } catch (error) {
      dispute = await cms
        .fetch<DisputeNoteTarget | null>(`*[_id == $id][0]${PROJECTION}`, { id: dispute._id })
        .catch(() => null)

      if ((dispute?.notes || []).some((existing) => existing.slackMessageTs === input.slackMessageTs)) {
        return true
      }
      if (attempt === 2) {
        console.error('Failed to append dispute note from Slack:', error)
      }
    }
  }

  return false
}
