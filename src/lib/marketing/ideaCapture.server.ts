/**
 * Writing a captured idea, and what happens when somebody judges it.
 *
 * Server-only: `marketingIdea` is an internal type, so it resolves to the
 * private dataset through the router. Kept out of the events route so that
 * route stays a dispatcher.
 *
 * Every path is safe to run twice. Slack redelivers events it thinks failed,
 * and the deterministic document id means a redelivery updates one record
 * rather than filling the board with copies of one message.
 */
import { getMarketingWriteClientFor } from './client'
import { buildCapturedIdea, ideaDocIdForMessage, type CapturedIdea } from './ideaCapture'
import { getSlackPermalink } from '@/lib/chat/slack'

const IDEA_TYPE = 'marketingIdea'

const client = () => getMarketingWriteClientFor(IDEA_TYPE)

export type IdeaCaptureResult = {
  ok: boolean
  idea?: CapturedIdea
  /** True when this message had already been captured — a Slack retry. */
  alreadyCaptured?: boolean
  message?: string
}

/** Store a message as an idea awaiting review. */
export async function captureIdeaFromMessage(input: {
  text: string
  personName: string
  channel: string
  ts: string
}): Promise<IdeaCaptureResult> {
  const idea = buildCapturedIdea(input)

  // Ask Slack for the canonical link. The constructed one needs a workspace
  // domain nobody has configured, and a null link back to the conversation is
  // the single most useful thing missing from a captured idea.
  const permalink = await getSlackPermalink(input.channel, input.ts)
  if (permalink) idea.relatedUrl = permalink

  const existing = await client().fetch<{ _id: string } | null>(`*[_id == $id][0]{ _id }`, { id: idea._id })
  if (existing) return { ok: true, idea, alreadyCaptured: true }

  // createIfNotExists rather than create: two deliveries of the same event can
  // race past the check above, and losing that race should be a no-op, not a
  // 409 that logs as a failure.
  await client().createIfNotExists(idea)
  return { ok: true, idea }
}

/**
 * A person judges a captured idea.
 *
 * Keeping clears the review flag and re-stamps the source with who confirmed
 * it. Binning marks it dropped rather than deleting: deleting would let the
 * next redelivery of the same Slack event recreate it, and it loses the only
 * evidence of what the filter got wrong - which is the thing worth reading
 * when tuning it.
 */
async function judgeIdea(id: string, keep: boolean, personName: string): Promise<IdeaCaptureResult> {
  const fields = keep
    ? { needsReview: false, source: `Slack — ${personName}` }
    : { status: 'dropped', needsReview: false, source: `Slack — not an idea, per ${personName}` }
  try {
    const updated = await client().patch(id).set(fields).commit<CapturedIdea>()
    return { ok: true, idea: updated }
  } catch {
    return { ok: false, message: 'That idea is no longer on the board.' }
  }
}

/** Judged from the Slack thread, where the message was caught. */
export function keepCapturedIdea(input: { channel: string; ts: string; personName: string }) {
  return judgeIdea(ideaDocIdForMessage(input), true, input.personName)
}

export function discardCapturedIdea(input: { channel: string; ts: string; personName: string }) {
  return judgeIdea(ideaDocIdForMessage(input), false, input.personName)
}

/** Judged in the Studio, on the This week surface. */
export function keepIdeaById(id: string, personName: string) {
  return judgeIdea(id, true, personName)
}

export function discardIdeaById(id: string, personName: string) {
  return judgeIdea(id, false, personName)
}


/** Ideas still waiting on a human, for the digest to mention. */
export async function ideasNeedingReview(limit = 5): Promise<Array<{ _id: string; title: string }>> {
  return client().fetch(
    `*[_type == "${IDEA_TYPE}" && needsReview == true] | order(_createdAt desc)[0...$limit]{ _id, title }`,
    { limit },
  )
}
