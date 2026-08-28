/**
 * Writing what Marqueta caught, and what happens when somebody judges it.
 *
 * Server-only: both types resolve to the private dataset through the router.
 * Kept out of the events route so that route stays a dispatcher.
 *
 * Every path is safe to run twice. Slack redelivers events it thinks failed,
 * and the deterministic document ids mean a redelivery updates one record
 * rather than filling the board with copies of one message.
 */
import { getMarketingWriteClientFor } from './client'
import { getSlackPermalink } from '@/lib/chat/slack'
import {
  BURST_WINDOW_MINUTES,
  buildCapturedDraft,
  buildCapturedIdea,
  bulletsIn,
  classifyMessage,
  draftDocIdForMessage,
  ideaDocIdForMessage,
  messageProse,
  type CapturedDraft,
  type CapturedIdea,
  type CaptureKind,
} from './ideaCapture'

const IDEA_TYPE = 'marketingIdea'
const CALENDAR_TYPE = 'marketingCalendarItem'

const client = () => getMarketingWriteClientFor(IDEA_TYPE)
const calendarClient = () => getMarketingWriteClientFor(CALENDAR_TYPE)

export type IdeaCaptureResult = {
  ok: boolean
  kind?: CaptureKind
  idea?: CapturedIdea
  draft?: CapturedDraft
  /** True when this message had already been captured — a Slack retry. */
  alreadyCaptured?: boolean
  /** Set when this was folded into a thought captured moments ago. */
  mergedInto?: string
  message?: string
}

/**
 * Store what a message turned out to be.
 *
 * Two destinations, because a proposal and a finished draft are not the same
 * thing: an idea goes to the board, a draft goes to the calendar with the copy
 * attached. Filing a draft as an "idea" throws away the writing, which is the
 * only part that took any effort.
 */
export async function captureFromMessage(input: {
  text: string
  personName: string
  channel: string
  ts: string
}): Promise<IdeaCaptureResult> {
  const verdict = classifyMessage(input.text)
  if (!verdict.capture) return { ok: false, kind: 'none', message: verdict.reason }

  // Ask Slack for the canonical link. The constructed one needs a workspace
  // domain nobody has configured, and a null link back to the conversation is
  // the single most useful thing missing from anything caught here.
  const permalink = await getSlackPermalink(input.channel, input.ts)

  if (verdict.kind === 'draft') {
    const draft = buildCapturedDraft(input)
    if (permalink) draft.brief = `Drafted by ${input.personName} in Slack. ${permalink}`

    const already = await calendarClient().fetch<{ _id: string } | null>(`*[_id == $id][0]{ _id }`, {
      id: draft._id,
    })
    if (already) return { ok: true, kind: 'draft', draft, alreadyCaptured: true }

    await calendarClient().createIfNotExists(draft)
    return { ok: true, kind: 'draft', draft }
  }

  const idea = buildCapturedIdea(input)
  if (permalink) idea.relatedUrl = permalink

  const existing = await client().fetch<{ _id: string } | null>(`*[_id == $id][0]{ _id }`, { id: idea._id })
  if (existing) return { ok: true, kind: 'idea', idea, alreadyCaptured: true }

  // One thought said over several messages is ONE idea.
  const burst = await findBurstToJoin(input)
  if (burst) {
    await client()
      .patch(burst._id)
      .set({ summary: `${burst.summary}\n${followOnLine(input.text)}`.trim() })
      .commit()
    return { ok: true, kind: 'idea', idea, mergedInto: burst._id }
  }

  // createIfNotExists rather than create: two deliveries of the same event can
  // race past the check above, and losing that race should be a no-op, not a
  // 409 that logs as a failure.
  await client().createIfNotExists(idea)
  return { ok: true, kind: 'idea', idea }
}

/**
 * An idea this person started a moment ago that is still awaiting review.
 *
 * Juhan's merch post was four messages in one burst: the bulleted list, an
 * aside about t-shirts, "any other ideas?", and "patches and stickers are good,
 * inexpensive experiments". That is one thought. Four board entries for it is
 * exactly the noise that teaches people to ignore a board — and the follow-ons
 * are the least useful of the four, so the first message keeps the title.
 *
 * Only UNREVIEWED captures are joinable: once a person has judged an idea it is
 * theirs, and appending to it behind their back changes something they already
 * signed off.
 */
async function findBurstToJoin(input: {
  personName: string
  channel: string
  ts: string
}): Promise<{ _id: string; summary: string } | null> {
  const seconds = Number(String(input.ts).split('.')[0])
  if (!Number.isFinite(seconds)) return null
  const since = new Date((seconds - BURST_WINDOW_MINUTES * 60) * 1000).toISOString()

  return client().fetch<{ _id: string; summary: string } | null>(
    `*[_type == $type && needsReview == true && _createdAt > $since && source match $who
       && _id match $channelPrefix] | order(_createdAt desc)[0]{ _id, summary }`,
    {
      type: IDEA_TYPE,
      since,
      who: `*${input.personName}*`,
      channelPrefix: `${IDEA_TYPE}.slack-${input.channel}*`,
    },
  )
}

/** A follow-on message, kept as its own line so the thought stays readable. */
function followOnLine(text: string): string {
  const bullets = bulletsIn(text)
  if (bullets.length > 1) return bullets.map((bullet) => `• ${bullet}`).join('\n')
  return messageProse(text)
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
    return { ok: true, kind: 'idea', idea: updated }
  } catch {
    return { ok: false, message: 'That idea is no longer on the board.' }
  }
}

/** Judged from the Slack thread, where the message was caught. */
export function keepCapturedIdea(input: { channel: string; ts: string; personName: string }) {
  return judgeIdea(ideaDocIdForMessage(input), true, input.personName)
}

/**
 * Bin something caught in Slack, whichever kind it turned out to be.
 *
 * The same button sits under both replies, and the two live in different
 * documents - an idea on the board, a draft on the calendar. Trying the idea
 * first and falling back keeps one button honest for both, rather than a
 * "Not for the calendar" press silently doing nothing.
 */
export async function discardCapturedIdea(input: { channel: string; ts: string; personName: string }) {
  const asIdea = await judgeIdea(ideaDocIdForMessage(input), false, input.personName)
  if (asIdea.ok) return asIdea

  try {
    // Canceled, not deleted: same reasoning as a dropped idea, and it keeps the
    // copy somebody wrote rather than throwing it away on one press.
    await calendarClient()
      .patch(draftDocIdForMessage(input))
      .set({ status: 'canceled', brief: `Not for the calendar, per ${input.personName}.` })
      .commit()
    return { ok: true, kind: 'draft' as const }
  } catch {
    return { ok: false, message: 'That is no longer on the board or the calendar.' }
  }
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
    `*[_type == $type && needsReview == true] | order(_createdAt desc)[0...$limit]{ _id, title }`,
    { type: IDEA_TYPE, limit },
  )
}

/** Kept for the original call site, which only ever dealt with ideas. */
export const captureIdeaFromMessage = captureFromMessage
