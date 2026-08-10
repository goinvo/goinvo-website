import 'server-only'

import type Stripe from 'stripe'
import { getStoredDispute } from './disputes'
import { getOutreachWriteClient } from './reconcile'
import { getStripeClient } from './stripeConfig'

/**
 * Sends the notes drafted in a dispute channel to Stripe as evidence.
 *
 * Stripe normally accepts ONE submission per dispute and it cannot be
 * retracted, so this is guarded four ways: the dispute must still be
 * respondable, there must be something to send, a prior submission blocks a
 * second, and the "claim" below is a compare-and-set so two people pressing the
 * button at the same moment cannot both submit.
 */

const MAX_EVIDENCE_CHARS = 20_000

export type EvidenceSubmitResult =
  | { status: 'not-configured' }
  | { status: 'not-found' }
  | { status: 'closed'; message: string }
  | { status: 'empty'; message: string }
  | { status: 'already-submitted'; message: string }
  | { status: 'claim-lost'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'submitted'; disputeId: string; characters: number }

export function buildEvidenceText(
  notes: Array<{ authorName?: string; text?: string }> | undefined,
): string {
  return (notes || [])
    .map((note) => (note.text || '').trim())
    .filter(Boolean)
    .map((text, index) => {
      const author = (notes || [])[index]?.authorName?.trim()
      return author ? `${author}: ${text}` : text
    })
    .join('\n\n')
    .slice(0, MAX_EVIDENCE_CHARS)
}

export async function submitDisputeEvidence(input: {
  disputeDocId: string
  submittedBy?: string
}): Promise<EvidenceSubmitResult> {
  const cms = getOutreachWriteClient()
  if (!cms) return { status: 'not-configured' }

  const dispute = await getStoredDispute(input.disputeDocId)
  if (!dispute?.disputeId) return { status: 'not-found' }

  if (dispute.evidenceSubmittedAt) {
    return {
      status: 'already-submitted',
      message: `Evidence was already submitted on ${new Date(dispute.evidenceSubmittedAt).toUTCString()}.`,
    }
  }
  if (!dispute.canRespond) {
    return {
      status: 'closed',
      message: 'Stripe is no longer accepting a response for this dispute.',
    }
  }

  const evidenceText = buildEvidenceText(dispute.notes)
  if (!evidenceText) {
    return {
      status: 'empty',
      message: 'There is nothing to submit yet — write the response in this channel first.',
    }
  }

  // Claim the submission BEFORE calling Stripe. The revision guard means a
  // second presser loses the race here rather than sending a duplicate.
  const claimedAt = new Date().toISOString()
  try {
    const claim = cms.patch(dispute._id).set({ evidenceSubmittedAt: claimedAt })
    if (dispute._rev) claim.ifRevisionId(dispute._rev)
    await claim.commit()
  } catch {
    return {
      status: 'claim-lost',
      message: 'Someone else is submitting this evidence right now — nothing was sent twice.',
    }
  }

  let updated: Stripe.Dispute
  try {
    updated = await getStripeClient().disputes.update(dispute.disputeId, {
      evidence: { uncategorized_text: evidenceText },
      submit: true,
    })
  } catch (error) {
    // Nothing reached Stripe, so release the claim and let it be retried.
    // Without this a transient error would permanently lock the dispute out of
    // a response it is still entitled to make.
    await cms.patch(dispute._id).unset(['evidenceSubmittedAt']).commit().catch(() => null)

    const message = error instanceof Error ? error.message : 'Unknown Stripe error'
    console.error(`Dispute evidence submission failed for ${dispute.disputeId}`, error)
    return { status: 'failed', message }
  }

  // Past this line the submission is IRREVERSIBLE. A failure to record it must
  // never release the claim — doing so would re-arm the button and let someone
  // submit a second time on top of a submission Stripe has already accepted.
  try {
    await cms
      .patch(dispute._id)
      .set({
        evidenceSubmittedBy: input.submittedBy || 'unknown',
        submissionCount: updated.evidence_details?.submission_count ?? 1,
        status: updated.status,
        canRespond: false,
      })
      .commit()
  } catch (error) {
    console.error(
      `Dispute ${dispute.disputeId}: evidence WAS submitted to Stripe but recording it failed.`,
      error,
    )
  }

  return { status: 'submitted', disputeId: dispute.disputeId, characters: evidenceText.length }
}
