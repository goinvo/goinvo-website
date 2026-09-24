import { NextRequest, NextResponse, after } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import {
  fetchSlackMessage,
  getSlackUserDisplayName,
  getSlackUserProfile,
  openSlackModal,
  postSlackEphemeral,
  postSlackMessage,
  updateSlackMessage,
  verifySlackRequest,
} from '@/lib/chat/slack'
import {
  MARKETING_ACTION,
  buildActionAcknowledgement,
  MARKETING_ANSWER_BLOCK,
  MARKETING_ANSWER_INPUT,
  buildTaskDetailBlocks,
  buildTaskDetailView,
  decodeActionValue,
  refreshTaskInAttachments,
  isMarketingAction,
  MARKETING_RUNWAY_CALLBACK,
  RUNWAY_MONTHS_BLOCK,
  buildRunwayView,
  readRunwaySubmission,
  decodeIdeaValue,
  MONEY_BLOCK_PREFIX,
} from '@/lib/marketing/slackDelegation'
import {
  buildCallLogReceiptBlocks,
  buildCallLogUndoneBlocks,
  buildCallLogView,
  CALL_LOG_RECEIPT_BLOCK,
  callLogReceiptLine,
  isCallOutcomeKey,
  needsConfirmation,
  readCallLogSubmission,
  type CallOutcomeKey,
} from '@/lib/marketing/callLog'
import { logCallFromSlack, undoCallLog } from '@/lib/marketing/callLog.server'
import { NEW_CONTACT_STATUS } from '@/lib/marketing/callPrep'
import { addContactFromSlack, prepCallFor } from '@/lib/marketing/callPrep.server'
import { followUpOrganization } from '@/lib/marketing/followUps'
import { discardCapturedIdea, keepCapturedIdea } from '@/lib/marketing/ideaCapture.server'
import {
  CALL_LOG_CALLBACK,
  CALL_OUTCOME_BLOCK,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_STUCK_CALLBACK,
  checkInTaskBlockId,
  decodeCallLogMetadata,
  decodeCallLogUndo,
  decodeContactRef,
  decodeStrategyValue,
  decodeTaskCardValue,
  decodeTaskStuckMetadata,
  encodeCallLogMetadata,
  encodeCallLogUndo,
  encodeContactRef,
  encodeTaskStuckMetadata,
  isMarquetaAction,
  type MarquetaActionId,
  type TaskCardMode,
} from '@/lib/marketing/marquetaActions'
import {
  askMarqueta,
  errorLine,
  LABEL,
  MARQUETA_IDENTITY,
  replaceBlocksByPrefix,
  STATE_EMOJI,
  stateNote,
} from '@/lib/marketing/marquetaStyle'
import { confirmRunway, readRunway, recordSignedWork, setRunway } from '@/lib/marketing/runway.server'
import { clipSlackText, escapeSlackText, SLACK_LIMITS, slackMention } from '@/lib/marketing/slackText'
import type { MoneyReceipt } from '@/lib/marketing/strategyCheck'
import { recordStrategyVerdict, renderMoneyAndDirection } from '@/lib/marketing/strategyCheck.server'
import {
  dropTask,
  handBackTask,
  markTaskDone,
  markTaskStuck,
  markTaskUnstuck,
  reopenTask,
  snoozeTask,
  takeTask,
  type TaskActionInput,
  type TaskActionResult,
} from '@/lib/marketing/taskActions.server'
import { MARKETING_VIEW_QUERY_PARAM, studioTaskUrl } from '@/lib/marketing/taskLinks'
import { resolvePresserName } from '@/lib/marketing/team.server'
import {
  buildTaskStuckView,
  checkInAcknowledgement,
  findTaskTitleInBlocks,
  readTaskStuckSubmission,
  replaceCheckInTask,
  type CheckInTask,
} from '@/lib/marketing/weeklyCheckIn'
import {
  claimMarketingTask,
  declineMarketingTask,
  answerMarketingTask,
  getMarketingTaskDetail,
  linkMarketingIdentity,
  restoreMarketingAvailability,
  setMarketingAvailability,
} from '@/lib/marketing/slackActions.server'
import { submitDisputeEvidence } from '@/lib/shop/disputeEvidence'
import { stripeDisputeDocumentId } from '@/lib/shop/ids'

export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

type SubmittedValues = Record<
  string,
  Record<string, { value?: string | null; selected_option?: { value?: string } | null }>
>

interface SlackInteractionPayload {
  /** The message the button lives in, so it can be rewritten in place. */
  message?: {
    ts?: string
    /** Set on a reply, and on a parent that has replies. */
    thread_ts?: string
    blocks?: Record<string, unknown>[]
    attachments?: Record<string, unknown>[]
    text?: string
  }
  /** Where the button was pressed. Absent on a view_submission. */
  channel?: { id?: string; name?: string }
  container?: {
    type?: string
    channel_id?: string
    message_ts?: string
    thread_ts?: string
    is_ephemeral?: boolean
  }

  type?: string
  user?: { id?: string; name?: string; username?: string }
  actions?: Array<{
    action_id?: string
    value?: string
    // static_select sends the chosen option here rather than in `value`.
    selected_option?: { value?: string }
  }>
  // Slack includes this on block_actions; POST a message here to reply.
  // A view_submission NEVER carries one.
  response_url?: string
  /** Valid for ~3 seconds; required to open a modal. */
  trigger_id?: string
  view?: {
    /** Stable for the life of the modal, so it keys a submission that Slack retries. */
    id?: string
    callback_id?: string
    private_metadata?: string
    state?: { values?: SubmittedValues }
  }
}

// For block_actions, the HTTP body is ignored — confirmations must be POSTed to
// the interaction's response_url.
async function postSlackResponse(
  responseUrl: string | undefined,
  text: string,
  blocks?: Block[],
) {
  if (!responseUrl) return
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        replace_original: false,
        text,
        ...(blocks?.length ? { blocks } : {}),
      }),
    })
  } catch (err) {
    console.error('[slack] response_url post failed', err)
  }
}


/**
 * Rewrite the message the button lives in.
 *
 * `replace_original` only works against the interaction's own response_url, and
 * only for the message that was clicked — which is exactly what is wanted here.
 */
async function replaceSlackMessage(
  responseUrl: string | undefined,
  payload: { blocks?: unknown[]; attachments?: unknown[]; text: string },
) {
  if (!responseUrl) return
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replace_original: true, ...payload }),
    })
  } catch (err) {
    console.error('[slack] replace_original failed', err)
  }
}

// ── Where a press happened, and where to answer it ──────────────────────────

/** Her name and icon, set per message: the app is shared with the website chat. */
const MARQUETA = MARQUETA_IDENTITY

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const safe = (value: unknown, max = 600) => clipSlackText(escapeSlackText(clean(value)), max)

/**
 * The conversation a press belongs to.
 *
 * `threadTs` is where a reply goes: always a thread's PARENT, since Slack asks
 * callers not to thread under a reply's own ts. `messageTs` is the message the
 * button is on, which may itself be a reply (a `mine` answer lives in a
 * thread) — it is what a redraw rewrites.
 */
type Where = { channel: string; threadTs: string; messageTs: string }

function whereFrom(payload: SlackInteractionPayload): Where {
  const messageTs = clean(payload.message?.ts) || clean(payload.container?.message_ts)
  return {
    channel: clean(payload.channel?.id) || clean(payload.container?.channel_id),
    messageTs,
    threadTs: clean(payload.message?.thread_ts) || clean(payload.container?.thread_ts) || messageTs,
  }
}

/** Slack gives every direct-message conversation an id beginning with D. */
const isDirectMessage = (channel: string) => channel.startsWith('D')

/**
 * Post as Marqueta in the thread a press came from.
 *
 * Refuses outright without a channel: `postSlackMessage` would otherwise fall
 * back to the website-chat channel, and an outreach note or a runway figure
 * landing in the middle of a visitor's conversation is the one place it must
 * never go. Never throws; false means nothing was posted.
 */
async function postInThread(where: { channel: string; threadTs?: string }, text: string, blocks?: Block[]): Promise<boolean> {
  const channel = clean(where.channel)
  if (!channel) return false
  try {
    const posted = await postSlackMessage({
      channel,
      ...(clean(where.threadTs) ? { threadTs: clean(where.threadTs) } : {}),
      ...MARQUETA,
      unfurl: false,
      text: clipSlackText(text, SLACK_LIMITS.fallbackText - 100) || 'Marqueta',
      ...(blocks?.length ? { blocks } : {}),
    })
    return Boolean(posted)
  } catch (error) {
    console.error('[slack] marqueta thread post failed', error)
    return false
  }
}

const section = (text: string): Block => ({
  type: 'section',
  text: { type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) || ' ' },
})

/**
 * A button, or null when its label or value would make Slack refuse the whole
 * message. Labels come from `LABEL` / `addContactLabel` — never typed here.
 */
function button(label: string, actionId: string, value: string, primary = false): Block | null {
  const text = clean(label).slice(0, SLACK_LIMITS.buttonText)
  if (!text || !value || value.length > SLACK_LIMITS.buttonValue) return null
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text, emoji: true },
    value,
    ...(primary ? { style: 'primary' } : {}),
  }
}

const actionsBlock = (...elements: (Block | null)[]): Block[] => {
  const usable = elements.filter((element): element is Block => Boolean(element))
  return usable.length ? [{ type: 'actions', elements: usable }] : []
}

/**
 * The same blocks with nothing to press. For an answer that can only go back
 * privately (response_url, ephemeral): a button in an ephemeral message
 * produces an interaction with no message behind it to act on.
 */
function withoutButtons(blocks: Block[]): Block[] {
  return blocks
    .filter((block) => block?.type !== 'actions')
    .map((block) => {
      if (block?.accessory?.type !== 'button') return block
      const rest = { ...block }
      delete rest.accessory
      return rest
    })
}

// ── Who pressed ─────────────────────────────────────────────────────────────

// Every refusal and failure is one shape (`errorLine`): ephemeral, second
// person, no buttons — what could not be done, that nothing changed, and
// where to do it instead.
const COULD_NOT_CHECK_WHO = errorLine('check who you are in Slack just now', 'Try again in a minute.')
const TEAM_ONLY = errorLine('do that', 'Outreach, money and the plan are for the studio team.')
const COULD_NOT_READ_TEAM = errorLine('read the team list just now', 'Try again in a minute.')
const LOST_TASK = errorLine('update that task', 'That button lost track of which task it was. Open This week.')
const LOST_CONTACT = errorLine('do that', `That button lost track of who it was for — say ${askMarqueta('prep Jane Doe at MGB')} instead.`)
/** A form that would not open, and the Studio tab where the same thing can be done. */
const formWouldNotOpen = (where: string) => errorLine('open that form', `Try again, or do it on ${where}.`)

/**
 * The team-only gate, for everything that reads or writes outreach or money.
 *
 * `getSlackUserProfile` fails CLOSED — a guest, a member of another workspace
 * sharing the channel, or a profile Slack would not return all come back as
 * "no" — and so does this. A button is visible to everybody in the channel it
 * was posted in; being able to press it is not being on the team.
 */
async function teamMember(userId: string): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const profile = await getSlackUserProfile(userId)
  if (!profile.ok) return { ok: false, message: COULD_NOT_CHECK_WHO }
  if (profile.isGuest || profile.isBot) return { ok: false, message: TEAM_ONLY }
  return { ok: true, name: clean(profile.name) }
}

/**
 * The presser's name as the BOARD writes it — "Juhan", not whatever Slack's
 * display name is this month (`resolvePresserName`).
 *
 * `resolved: false` means the team list could not be read and the name is the
 * Slack display name. That is good enough for a sentence in an activity log,
 * never for a write that says who OWNS or DID something: callers that record a
 * person (a logged call, an added contact, a take, a strategy answer) refuse
 * instead. "Someone" — the resolver's word for nobody it could name — comes
 * back as '' so it is never written as a person.
 */
async function presserName(userId: string, displayName?: string): Promise<{ name: string; resolved: boolean }> {
  try {
    const name = clean(await resolvePresserName({ slackUserId: userId, displayName: clean(displayName) || undefined }))
    return { name: /^someone$/i.test(name) ? '' : name, resolved: true }
  } catch (error) {
    console.error('[slack] could not read the team roster', error)
    let fallback = clean(displayName)
    if (!fallback) fallback = clean(await getSlackUserDisplayName(userId).catch(() => undefined))
    return { name: fallback, resolved: false }
  }
}

/** The one-time setup's refusal, for a presser the team list cannot name (a namesake, or nobody at all). */
const notOnTheList = (verb: string) =>
  errorLine(verb, 'I couldn’t tell which name on the team list is yours — pick it in the Monday plan’s one-time setup first.')

/**
 * The name a record says did something that is NOT ownership — "Confirmed by
 * Juhan" on the runway, "Answered in Slack by Juhan" on a decision.
 *
 * A note rather than an owner, so the Slack display name will do when the
 * team list cannot be read (`resolved: false`). What it must never do is
 * write the display name when the list WAS read and named nobody: that is a
 * namesake — someone whose Slack name matches a board name linked to another
 * account — and "Confirmed by Juhan" from someone who is not Juhan is the
 * impersonation the namesake guard (`resolvePresserName`) exists to stop.
 * Null means refuse (`notOnTheList`).
 */
async function recordedName(userId: string, member: { name: string }, slackName?: string): Promise<string | null> {
  const who = await presserName(userId, member.name)
  if (who.resolved) return who.name || null
  return who.name || member.name || clean(slackName) || 'Someone'
}

// ── The runway and task-answer modals: where to confirm ─────────────────────

/**
 * What the runway and task-answer modals remember between opening and submit.
 *
 * A view_submission carries NO response_url, so these modals' confirmations
 * used to be posted to `undefined` and never appeared — the person pressed
 * Save and heard nothing. They now carry the channel and thread the button was
 * pressed in, as JSON (`k` runway kind or `t` task id, plus `ch` and `th`),
 * and confirm there — plus `ts`, the message the button is ON, so the runway
 * form's answer can redraw that message's money group in place rather than
 * adding a reply beneath it, and `m`, the mode of the card an Answer… came
 * from, so the answer redraws that card as the card it was.
 *
 * Modals opened before this change are still open in people's Slack clients
 * with the old plain value — 'signed' / 'update', or a bare task id — so a
 * value that is not our JSON is read as exactly that, with nowhere to confirm.
 */
type ModalOrigin = { value: string; channel: string; threadTs: string; messageTs: string; mode: TaskCardMode }

function encodeModalOrigin(input: { runwayKind?: string; taskId?: string; where: Where; mode?: TaskCardMode }): string {
  return JSON.stringify({
    ...(input.runwayKind ? { k: clipTo(input.runwayKind, 20) } : {}),
    ...(input.taskId ? { t: clipTo(input.taskId, 180) } : {}),
    // The card's mode, so an answer redraws a plan card as a plan card. `mine` is the default and is left out.
    ...(input.mode === 'plan' ? { m: 'plan' } : {}),
    ch: clipTo(input.where.channel, 40),
    th: clipTo(input.where.threadTs, 40),
    ...(input.where.messageTs && input.where.messageTs !== input.where.threadTs ? { ts: clipTo(input.where.messageTs, 40) } : {}),
  })
}

const clipTo = (value: unknown, max: number) => String(value ?? '').slice(0, max)

function decodeModalOrigin(raw: string | undefined): ModalOrigin {
  const value = String(raw || '')
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.k || parsed.t)) {
      const threadTs = clean(parsed.th)
      // No `ts`: the button was on the thread's parent (or the modal predates `ts`).
      return {
        value: clean(parsed.k || parsed.t),
        channel: clean(parsed.ch),
        threadTs,
        messageTs: clean(parsed.ts) || threadTs,
        mode: parsed.m === 'plan' ? 'plan' : 'mine',
      }
    }
  } catch {
    // Not JSON: an old modal's plain value.
  }
  return { value: value.trim(), channel: '', threadTs: '', messageTs: '', mode: 'mine' }
}

/** Confirm a modal where it was opened from; an old modal has nowhere, and stays as quiet as it always was. */
async function confirmModal(origin: ModalOrigin, text: string) {
  if (origin.channel) await postInThread({ channel: origin.channel, threadTs: origin.threadTs }, text)
}

/** A refusal for one person, where their modal was opened — never the room. */
async function tellPrivately(origin: ModalOrigin, userId: string, text: string) {
  if (!origin.channel || !userId) return
  await postSlackEphemeral({
    channel: origin.channel,
    user: userId,
    threadTs: origin.threadTs || undefined,
    text,
    ...MARQUETA,
  })
}

// ── Marqueta's check-in cards ───────────────────────────────────────────────

const TASK_ACTIONS: Partial<Record<MarquetaActionId, (input: TaskActionInput) => Promise<TaskActionResult>>> = {
  [MARQUETA_ACTION.taskDone]: markTaskDone,
  [MARQUETA_ACTION.taskProgress]: markTaskUnstuck,
  [MARQUETA_ACTION.taskReopen]: reopenTask,
  [MARQUETA_ACTION.taskHandBack]: handBackTask,
  [MARQUETA_ACTION.taskTake]: takeTask,
  [MARQUETA_ACTION.taskDrop]: dropTask,
  [MARQUETA_ACTION.taskSnooze]: snoozeTask,
}

/** The absolute Studio base, for card titles and "Open This week" links on a redraw. */
const studioBase = () => clean(process.env.MARKETING_PUBLIC_BASE_URL) || undefined

/** `live`: read back from Slack just now, rather than the presser's possibly stale copy. */
type PressedMessage = { text: string; blocks: Block[]; attachments: unknown[]; live: boolean }

/**
 * The message a button lives on, as it stands NOW.
 *
 * Read back live first. The copy in the payload is the one the presser's
 * client last rendered, and two people pressing on one message within a
 * minute would each redraw it from their own stale copy — the second quietly
 * undoing the first's change. Falls back to the payload's copy when the live
 * read fails (a DM needs a history scope she does not have); null when there
 * is neither.
 */
async function readPressedMessage(where: Where, fallback?: SlackInteractionPayload['message']): Promise<PressedMessage | null> {
  const { channel, messageTs, threadTs } = where
  if (!channel || !messageTs) return null
  const live = await fetchSlackMessage({ channel, ts: messageTs, threadTs })
  if (live) return { text: live.text, blocks: live.blocks as Block[], attachments: live.attachments, live: true }
  if (!fallback?.blocks?.length) return null
  return { text: fallback.text || '', blocks: fallback.blocks as Block[], attachments: fallback.attachments || [], live: false }
}

/**
 * Put `next` in place of `source`'s blocks, keeping its attachments (the
 * digest's legacy task cards are attachments) and its text — unless the whole
 * message is being replaced, when `text.replace` says what it says now. Never
 * throws; false means nothing changed in Slack.
 */
async function rewritePressedMessage(
  where: Where,
  source: PressedMessage,
  next: Block[],
  text: { fallback?: string; replace?: string } = {},
): Promise<boolean> {
  return updateSlackMessage({
    channel: where.channel,
    ts: where.messageTs,
    text: text.replace || source.text || text.fallback || 'Marqueta',
    blocks: next,
    ...(source.attachments.length ? { attachments: source.attachments } : {}),
  })
}

/**
 * Redraw one task's card on the message it lives on.
 *
 * `replaceCheckInTask` swaps exactly this task's two blocks on the LIVE
 * message (`readPressedMessage`); everything else, attachments included, goes
 * back exactly as it was. False when there was nothing to redraw — no
 * message, or no card for this task on it — so the caller can say it another
 * way.
 *
 * `mode` is the one the pressed button carried (`decodeTaskCardValue`): a card
 * in the Monday plan or a `week` answer stays a plan card after a press —
 * "Taken by" and Hand back — instead of turning into somebody's own list.
 */
async function redrawTaskCard(input: {
  where: Where
  taskId: string
  task: CheckInTask
  note: string
  now: Date
  mode?: TaskCardMode
  fallback?: SlackInteractionPayload['message']
}): Promise<boolean> {
  const source = await readPressedMessage(input.where, input.fallback)
  if (!source) return false
  const next = replaceCheckInTask(source.blocks, input.taskId, input.task, {
    now: input.now,
    note: input.note,
    mode: input.mode,
    studioBaseUrl: studioBase(),
  })
  // Same array back means the card is not on this message.
  if (next === source.blocks) return false
  return rewritePressedMessage(input.where, source, next, { fallback: input.fallback?.text })
}

/** The first line a set of blocks says, as the notification text of a post made from them. */
function firstLineOf(blocks: Block[]): string {
  const block = (blocks || []).find((candidate) => candidate?.text?.text || candidate?.elements?.[0]?.text)
  return String(block?.text?.text || block?.elements?.[0]?.text || '').split('\n')[0]
}

/**
 * Answer a money press — the runway's three buttons, the runway form, the
 * strategy question — by redrawing the money group where it was asked.
 *
 * `renderMoneyAndDirection` re-reads the records after the write and draws the
 * receipt (with the button that reverses it) plus whichever question is due
 * next — so "Still right" on the runway turns, in the same spot, into the
 * receipt and then the strategy question, one at a time. The group is swapped
 * by its block ids (`mq_money…`) and every other block on the message, the
 * Monday plan's task cards included, stays the very same.
 *
 * A message posted before the group had ids has nothing to swap: the same
 * blocks go in its thread instead. False only when neither worked.
 */
async function answerMoneyInPlace(input: {
  where: Where
  receipt: MoneyReceipt
  now: Date
  fallback?: SlackInteractionPayload['message']
}): Promise<boolean> {
  const blocks = await renderMoneyAndDirection({ now: input.now, receipt: input.receipt })
  if (!blocks.length) return false
  const source = await readPressedMessage(input.where, input.fallback)
  if (source) {
    const next = replaceBlocksByPrefix(source.blocks, MONEY_BLOCK_PREFIX, blocks)
    if (next !== source.blocks && (await rewritePressedMessage(input.where, source, next, { fallback: input.fallback?.text }))) return true
  }
  return postInThread(input.where, firstLineOf(blocks), blocks)
}

/**
 * A contact's name as the receipt says it: "Jane Doe (Mass General Brigham)".
 * The organisation is scrubbed of contact details first — the newsletter
 * import put addresses where organisations go, and this line is posted in a
 * channel.
 */
function contactLabelFor(ref: { name?: string; organization?: string }): string {
  const name = clean(ref.name)
  const organization = followUpOrganization(ref.organization)
  if (name && organization && !name.toLowerCase().includes(organization.toLowerCase())) return `${name} (${organization})`
  return name || organization
}

/** A logged call's receipt (`buildCallLogReceiptBlocks`): its section and its Undo row share the id prefix. */
const isCallLogReceiptBlock = (block: Block) =>
  typeof block?.block_id === 'string' && (block.block_id === CALL_LOG_RECEIPT_BLOCK || block.block_id.startsWith(`${CALL_LOG_RECEIPT_BLOCK}_`))

/** Something only the presser needs to hear, where they pressed — ephemeral, never the room. */
async function tellPresser(where: { channel: string; threadTs?: string }, userId: string, text: string): Promise<boolean> {
  if (!clean(where.channel) || !userId) return false
  return Boolean(
    await postSlackEphemeral({
      channel: where.channel,
      user: userId,
      threadTs: clean(where.threadTs) || undefined,
      text: clipSlackText(text, SLACK_LIMITS.sectionText),
      ...MARQUETA,
    }),
  )
}

/**
 * Every Marqueta control — the check-in's task buttons, prep / log / add for a
 * call, Undo, the monthly strategy question — and the two modals behind them.
 *
 * Runs BEFORE the older handlers below, which is easy to undo by moving this:
 * the task-answer handler treats ANY view_submission with private_metadata as
 * "answer this task", and would swallow the call-log and Stuck modals. Modals
 * are routed by callback_id here, never by the mere presence of metadata.
 * (The delegation block used to read any marketing id it did not know as a
 * hand-back; it now refuses one, and tests/marqueta-wiring.test.ts fails CI on
 * a button with no handler.)
 *
 * Every button here is team-only (`teamMember`), task cards included: each one
 * reads or writes a private record, and a button is pressable by anyone who
 * can see the message. The two modals are not re-checked on submit because
 * they only ever open for someone who passed the gate on the button.
 *
 * The three-second rule shapes every branch. Anything that opens a modal does
 * it on the request path with NO Sanity read first (a trigger_id queued behind
 * a round trip to the dataset arrives expired); everything else answers Slack
 * at once and does its work in `after()`.
 *
 * Returns null for anything that is not Marqueta's, so the caller carries on.
 */
async function handleMarqueta(payload: SlackInteractionPayload): Promise<NextResponse | null> {
  const userId = clean(payload.user?.id)

  // ── The call-log modal ────────────────────────────────────────────────────
  if (payload.type === 'view_submission' && payload.view?.callback_id === CALL_LOG_CALLBACK) {
    const view = payload.view
    const submission = readCallLogSubmission(view.state?.values)
    // Inline, under the field, with the modal still open — the only place
    // "you forgot the outcome" is useful. Notes typed so far survive.
    if (!submission.outcomeKey) {
      return NextResponse.json({ response_action: 'errors', errors: { [CALL_OUTCOME_BLOCK]: 'Pick what happened.' } })
    }
    const meta = decodeCallLogMetadata(view.private_metadata)
    const viewId = clean(view.id)
    // The interaction key comes from the view: without it a retried
    // submission could not be told from a second call, so nothing is written.
    if (!meta || !viewId) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { [CALL_OUTCOME_BLOCK]: `This form lost track of who it was for. Close it and press ${LABEL.LOG} again.` },
      })
    }
    const outcomeKey = submission.outcomeKey
    const where = { channel: meta.channel, threadTs: meta.threadTs }

    after(async () => {
      try {
        // The modal only opened for a team member (the Log button is gated),
        // so the check here is only whose name the log carries. A log is a
        // record of who spoke to a prospect: with no board name it is not
        // written under a display name — the notes go back to the person
        // privately so nothing they typed is lost.
        const who = await presserName(userId)
        if (!who.resolved) {
          const notes = submission.notes ? `\nYour notes, so you don’t lose them:\n>${safe(submission.notes, 2000)}` : ''
          await tellPresser(where, userId, `${errorLine('log that', 'I couldn’t read the team list just now — try again in a minute.')}${notes}`)
          return
        }

        const now = new Date()
        const result = await logCallFromSlack({
          contactId: meta.contactId,
          outcomeKey,
          notes: submission.notes,
          followUp: submission.followUp,
          byName: who.name,
          key: `slack-${viewId}`,
          now,
        })
        // A retry of a submission already written: the first delivery said so.
        if (result.skipped) return
        if (!result.ok) {
          await tellPresser(where, userId, safe(result.message))
          return
        }
        // The room's receipt, with the Undo that takes it back: Undo redraws
        // THIS message (struck through, nothing left to press).
        const receipt = {
          presserId: userId,
          contactLabel: meta.label || result.label,
          outcomeKey,
          statusBefore: result.statusBefore,
          statusAfter: result.statusAfter,
          followUpAt: result.followUpAt,
          now,
        }
        const text = callLogReceiptLine(receipt)
        const blocks = buildCallLogReceiptBlocks({ ...receipt, undoValue: result.undo ? encodeCallLogUndo(result.undo) : undefined })
        if (!(await postInThread(where, text, blocks))) await tellPresser(where, userId, text)
      } catch (err) {
        console.error('[slack] call log submission failed', err)
        await tellPresser(where, userId, errorLine('log that', 'The Studio’s Outreach tab can log it.'))
      }
    })
    return NextResponse.json({})
  }

  // ── The Stuck modal ───────────────────────────────────────────────────────
  if (payload.type === 'view_submission' && payload.view?.callback_id === TASK_STUCK_CALLBACK) {
    const blocker = readTaskStuckSubmission(payload.view.state?.values)
    if (!blocker) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { [TASK_BLOCKER_BLOCK]: 'Say what’s in the way — a sentence is plenty.' },
      })
    }
    const meta = decodeTaskStuckMetadata(payload.view.private_metadata)
    if (!meta) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { [TASK_BLOCKER_BLOCK]: `This form lost track of which task it was for. Close it and press ${LABEL.STUCK} again.` },
      })
    }

    after(async () => {
      const where: Where = { channel: meta.channel, threadTs: meta.threadTs, messageTs: meta.messageTs }
      try {
        // No team check here: only this app can open this form, and it opens
        // only for someone who passed the check on the Stuck button.
        const now = new Date()
        const who = await presserName(userId)
        const result = await markTaskStuck({ taskId: meta.taskId, personName: who.name, slackUserId: userId, blocker, now })
        if (!result.ok || !result.task) {
          await tellPresser(where, userId, safe(result.message || errorLine('mark that stuck', 'Open This week.')))
          return
        }
        // Already stuck on exactly this: tell the presser, not the room.
        if (result.changed === false) {
          await tellPresser(where, userId, safe(result.message || 'Already noted.'))
          return
        }
        const mention = slackMention(userId, who.name)
        const note = checkInAcknowledgement(MARQUETA_ACTION.taskStuck, mention, now)
        // On the card, once — the same event said again in the thread is the
        // noise rule 5 exists for. There is no copy of the message in a
        // view_submission, so the card is only redrawn when the live message
        // can be read; when it cannot, the thread is the one place left to say it.
        const redrawn = await redrawTaskCard({ where, taskId: meta.taskId, task: result.task, note, now, mode: meta.mode })
        if (!redrawn) {
          await postInThread(where, `Stuck: *${safe(result.task.title, 300)}* — ${mention} added what’s in the way.`)
        }
      } catch (err) {
        console.error('[slack] stuck submission failed', err)
        await tellPresser(where, userId, errorLine('mark that stuck', 'Mark it stuck on This week.'))
      }
    })
    return NextResponse.json({})
  }

  if (payload.type !== 'block_actions') return null
  const action = payload.actions?.[0]
  const actionId = action?.action_id
  if (!isMarquetaAction(actionId)) return null

  const responseUrl = payload.response_url
  const where = whereFrom(payload)
  const respond = (text: string, blocks?: Block[]) => postSlackResponse(responseUrl, text, blocks)

  // ── Log it…: open the form, on the request path ───────────────────────────
  if (actionId === MARQUETA_ACTION.logCall) {
    // A Slack lookup, not a Sanity read: well inside the trigger's three seconds.
    const member = await teamMember(userId)
    if (!member.ok) {
      after(() => respond(member.message))
      return NextResponse.json({ ok: true })
    }
    const ref = decodeContactRef(action?.value)
    if (!ref?.contactId) {
      after(() => respond(errorLine('log that', 'They’re not in outreach yet. Add them to outreach first — then there’s something to log the call against.')))
      return NextResponse.json({ ok: true })
    }
    const label = contactLabelFor(ref) || 'this contact'
    const opened = await openSlackModal(
      payload.trigger_id || '',
      buildCallLogView({
        contactLabel: label,
        metadata: encodeCallLogMetadata({ contactId: ref.contactId, channel: where.channel, threadTs: where.threadTs, label }),
        prefillNotes: ref.note,
        prefillOutcome: isCallOutcomeKey(ref.outcome) ? ref.outcome : undefined,
      }),
    )
    if (!opened) after(() => respond(formWouldNotOpen('Outreach')))
    return NextResponse.json({ ok: true })
  }

  // ── Stuck: open "what's in the way?", on the request path ──────────────────
  if (actionId === MARQUETA_ACTION.taskStuck) {
    // Gated HERE, before the form, for the same reason as Log it…: the
    // submission writes a blocker onto a private task, and the only thing
    // standing between a guest and that write is whether the form opens for
    // them. A Slack lookup, not a Sanity read, so the trigger survives it.
    const member = await teamMember(userId)
    if (!member.ok) {
      after(() => respond(member.message))
      return NextResponse.json({ ok: true })
    }
    const decoded = decodeTaskCardValue(action?.value)
    if (!decoded) {
      after(() => respond(LOST_TASK))
      return NextResponse.json({ ok: true })
    }
    // The title comes from the card itself: there is no time to read the task.
    const opened = await openSlackModal(
      payload.trigger_id || '',
      buildTaskStuckView({
        taskTitle: findTaskTitleInBlocks(payload.message?.blocks as Block[] | undefined, decoded.taskId) || 'This task',
        metadata: encodeTaskStuckMetadata({
          taskId: decoded.taskId,
          channel: where.channel,
          threadTs: where.threadTs,
          messageTs: where.messageTs,
          mode: decoded.mode,
        }),
      }),
    )
    if (!opened) after(() => respond(formWouldNotOpen('This week')))
    return NextResponse.json({ ok: true })
  }

  // ── The check-in's task buttons ────────────────────────────────────────────
  const runTask = TASK_ACTIONS[actionId]
  if (runTask) {
    after(async () => {
      try {
        // Team only, before anything is read or written. These cards are not
        // confined to #marketing-bot — a `mine` answer is posted wherever she
        // was asked, #marketing included — and every button on them writes a
        // PRIVATE task. Take is the sharp one: somebody the roster does not
        // know resolves to their own display name, so without this a guest
        // pressing "I'll take it" became the task's OWNER, and the next
        // check-in would @-mention them as such.
        const member = await teamMember(userId)
        if (!member.ok) {
          await respond(member.message)
          return
        }
        // The card's own value: which task, the owner it was drawn with, and
        // the mode to redraw it in. A legacy value reads as a `mine` card.
        const decoded = decodeTaskCardValue(action?.value)
        if (!decoded) {
          await respond(LOST_TASK)
          return
        }
        const now = new Date()
        // The profile already has the display name: no second users.info.
        const who = await presserName(userId, member.name)
        // Take writes the presser in as the OWNER: never under a display name
        // (an empty name makes takeTask refuse with the reason). Every other
        // press only names them in the task's activity, and taskActions is
        // built to go ahead without the roster for those.
        const personName = actionId === MARQUETA_ACTION.taskTake && !who.resolved ? '' : who.name
        const result = await runTask({
          taskId: decoded.taskId,
          personName,
          slackUserId: userId,
          now,
          // Only an away cover may take a task off its owner — and only the
          // owner it was drawn for, while it is still theirs (takeTask).
          ...(actionId === MARQUETA_ACTION.taskTake && decoded.cover ? { coverFor: decoded.ownerName } : {}),
        })
        if (!result.ok || !result.task) {
          await respond(safe(result.message || errorLine('update that task', 'Open This week.')))
          return
        }
        // Already true, or a double-tap: say so to the presser and leave the
        // card (and whatever note is on it) alone.
        if (result.changed === false) {
          await respond(safe(result.message || 'Nothing to change.'))
          return
        }
        const note = checkInAcknowledgement(actionId, slackMention(userId, who.name), now)
        const redrawn = await redrawTaskCard({
          where,
          taskId: decoded.taskId,
          task: result.task,
          note,
          now,
          mode: decoded.mode,
          fallback: payload.message,
        })
        // No card to redraw (an older message): tell the presser what happened, in words.
        if (!redrawn) await respond(safe(result.message || 'Done.'))
      } catch (err) {
        console.error('[slack] check-in task action failed', err)
        await respond(errorLine('record that', 'Open This week.'))
      }
    })
    return NextResponse.json({ ok: true })
  }

  // Everything below reads or writes outreach or money: team only.
  after(async () => {
    try {
      const member = await teamMember(userId)
      if (!member.ok) {
        await respond(member.message)
        return
      }
      const now = new Date()

      // ── Prep ───────────────────────────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.prepCall) {
        const ref = decodeContactRef(action?.value)
        if (!ref) {
          await respond(LOST_CONTACT)
          return
        }
        const who = await presserName(userId, member.name)
        // Spoken, not written: the display name is fine when the board's is unknown.
        const prep = await prepCallFor({ ref, senderName: who.name || member.name || 'someone from GoInvo', now })
        await deliverPrep(prep, { where, userId, respond, ephemeral: Boolean(payload.container?.is_ephemeral) })
        return
      }

      // ── Add somebody to outreach (and log the call, when that is safe) ────
      if (actionId === MARQUETA_ACTION.addContact) {
        const ref = decodeContactRef(action?.value)
        if (!ref) {
          await respond(LOST_CONTACT)
          return
        }
        const who = await presserName(userId, member.name)
        if (!who.resolved || !who.name) {
          await respond(who.resolved ? notOnTheList('add them') : COULD_NOT_READ_TEAM)
          return
        }
        await addContactAndMaybeLog({ ref, who: who.name, userId, where, now, respond, pressed: payload.message, ephemeral: Boolean(payload.container?.is_ephemeral) })
        return
      }

      // ── Undo a logged call ─────────────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.callLogUndo) {
        const undo = decodeCallLogUndo(action?.value)
        if (!undo) {
          await respond(errorLine('undo that', 'That Undo button has lost track of what it was for — change it on Outreach.'))
          return
        }
        const who = await presserName(userId, member.name)
        const result = await undoCallLog(undo, who.name)
        if (!result.ok) {
          await respond(safe(result.message))
          return
        }
        // The receipt this Undo sits on is redrawn in place — struck through,
        // with who took it back and nothing left to press. No second message.
        const undone = buildCallLogUndoneBlocks({
          contactLabel: result.label || 'them',
          ...(isCallOutcomeKey(result.outcomeKey) ? { outcomeKey: result.outcomeKey } : {}),
          undoerId: userId,
        })
        const source = payload.container?.is_ephemeral ? null : await readPressedMessage(where, payload.message)
        // Just the receipt's own blocks when it has ids; an older receipt is the whole message.
        const swapped = source ? replaceBlocksByPrefix(source.blocks, CALL_LOG_RECEIPT_BLOCK, undone) : undone
        const next = source && swapped === source.blocks ? undone : swapped
        // The message's text (its notification and search text) changes only
        // when the receipt WAS the message. A receipt inside a call-prep
        // outline — "Add … and log it" answers in place — leaves the outline
        // its own "Call prep: Jane Doe (…)".
        const wholeMessage = source ? swapped === source.blocks || source.blocks.every(isCallLogReceiptBlock) : false
        const redrawn = source
          ? await rewritePressedMessage(where, source, next, wholeMessage ? { replace: firstLineOf(undone) } : { fallback: firstLineOf(undone) })
          : false
        if (!redrawn) await respond(safe(result.message))
        return
      }

      // ── Undo "I’m away" ───────────────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.availabilityUndo) {
        // Only the person who booked it may take it back — checked against the
        // Slack id in the value, inside restoreMarketingAvailability, along
        // with "has it changed since?" and "already undone".
        const result = await restoreMarketingAvailability({ undo: action?.value || '', slackUserId: userId, now })
        if (!result.ok || !result.changed || !result.receipt) {
          await respond(safe(result.message))
          return
        }
        // The receipt this Undo sits on is redrawn in place, struck through
        // and with nothing left to press — the room sees it was taken back,
        // and no live Undo is left behind.
        // Pressed on the private copy the presser got when the thread would not
        // take the receipt: that copy is replaced, in the second person, so
        // no live Undo is left there either.
        if (payload.container?.is_ephemeral) {
          await replaceSlackMessage(responseUrl, { text: safe(result.message), blocks: [section(safe(result.message))] })
          return
        }
        const redrawn =
          where.channel && where.messageTs
            ? await updateSlackMessage({
                channel: where.channel,
                ts: where.messageTs,
                text: clipSlackText(result.receipt, SLACK_LIMITS.fallbackText),
                blocks: [section(result.receipt)],
              })
            : false
        if (!redrawn) await respond(safe(result.message))
        return
      }

      // ── The monthly strategy question ──────────────────────────────────────
      if (actionId === MARQUETA_ACTION.strategyConfirm || actionId === MARQUETA_ACTION.strategyRethink) {
        const month = decodeStrategyValue(action?.value)
        if (!month) {
          await respond(errorLine('record that', `That button lost track of which month it was for — ask ${askMarqueta('strategy')}.`))
          return
        }
        const who = await presserName(userId, member.name)
        // The answer is stored with who gave it, and a rethink is suggested to them.
        if (!who.resolved || !who.name) {
          await respond(who.resolved ? notOnTheList('record that') : COULD_NOT_READ_TEAM)
          return
        }
        const stillFits = actionId === MARQUETA_ACTION.strategyConfirm
        const result = await recordStrategyVerdict({
          verdict: stillFits ? 'stillRight' : 'rethink',
          personName: who.name,
          monthKey: month.monthKey,
          now,
        })
        // An earlier month's card: nothing was written. This month's question
        // goes in the thread, with its own buttons, under what happened.
        if (result.stale) {
          const text = [safe(result.message), result.answer || ''].filter(Boolean).join('\n\n')
          const blocks = result.answerBlocks?.length ? [section(safe(result.message)), ...result.answerBlocks] : undefined
          if (!(await postInThread(where, text, blocks))) await respond(text)
          return
        }
        if (!result.ok) {
          await respond(safe(result.message))
          return
        }
        const mention = slackMention(userId, who.name)
        const receipt: MoneyReceipt = stillFits
          ? { kind: 'planConfirmed', who: mention, monthKey: month.monthKey }
          : {
              kind: 'rethink',
              who: mention,
              ...(result.decisionTaskId ? { decisionTaskId: result.decisionTaskId } : {}),
              suggestedTo: who.name,
              joined: result.filed === false,
            }
        if (!(await answerMoneyInPlace({ where, receipt, now, fallback: payload.message }))) await respond(safe(result.message))
        return
      }
    } catch (err) {
      console.error('[slack] marqueta action failed', err)
      await respond(errorLine('do that', 'The Studio still has the real answer — Open This week.'))
    }
  })
  return NextResponse.json({ ok: true })
}

/**
 * "Add <Name> to outreach" / "Add <Name> and log it".
 *
 * Adds the person (`addContactFromSlack` — a deterministic id, so a second
 * press finds the first one's record), and when the button carried what
 * happened on the call AND logging it cannot set a brand-new contact back
 * (`needsConfirmation`), logs it in the same press, keyed on the message the
 * button is on — so a double press is one touch, not two. Anything less
 * offers the "Log it…" form instead, with the outcome already chosen, so the
 * person sees the move before it is made.
 *
 * The answer goes where the Add button was, on the message it was pressed on
 * — the Add button is gone, so it cannot be pressed twice, and the room sees
 * one message, not a message and a reply. Only the Add button leaves its row:
 * whatever else was beside it ("Open Outreach" on a call-prep outline) stays,
 * as its own row under the answer. Where that cannot be done (an ephemeral
 * message, one that cannot be read or rewritten), the answer goes in the
 * thread instead.
 *
 * Only a contact this press CREATED is logged in one step: an existing record
 * could be anywhere in the pipeline, and a one-press log that moved someone
 * who had replied back to Contacted is exactly what the form is there to
 * prevent.
 *
 * Pressed twice (a double tap, or a second person on the same message), the
 * second press finds the live message already answered — no Add button left —
 * and does nothing: one record, one touch, one message. When the message
 * cannot be read back live (a private channel she has no history scope for),
 * the copy in the payload is the presser's own and may predate the first
 * press; a press that did not create anyone — which a second press never
 * does — is then answered privately, never by rewriting that copy over the
 * first press's receipt and its Undo.
 */
async function addContactAndMaybeLog(input: {
  ref: NonNullable<ReturnType<typeof decodeContactRef>>
  who: string
  userId: string
  where: Where
  now: Date
  respond: (text: string, blocks?: Block[]) => Promise<void>
  pressed?: SlackInteractionPayload['message']
  ephemeral: boolean
}) {
  const { ref, who, userId, where, now, respond } = input
  const outcome: CallOutcomeKey | undefined = isCallOutcomeKey(ref.outcome) ? ref.outcome : undefined
  const source = input.ephemeral ? null : await readPressedMessage(where, input.pressed)
  const addRow = (blocks: Block[]) =>
    blocks.findIndex(
      (block) => block?.type === 'actions' && (block.elements || []).some((element: Block) => element?.action_id === MARQUETA_ACTION.addContact),
    )
  // Already answered in place by an earlier press: nothing left to do.
  if (source?.live && addRow(source.blocks) < 0) return

  const result = await addContactFromSlack({ ref, ownerName: who, now })
  if (!result.ok) {
    await respond(safe(result.message))
    return
  }
  const label = contactLabelFor({ name: result.label, organization: ref.organization }) || result.label

  let blocks: Block[]
  if (outcome && result.created && !needsConfirmation({ status: NEW_CONTACT_STATUS }, outcome)) {
    // No notes: the button's note, when there is one, is "how we know them" —
    // what the new record keeps — not something said on this call.
    const logged = await logCallFromSlack({
      contactId: result.contactId,
      outcomeKey: outcome,
      followUp: 'default',
      byName: who,
      key: `slack-add-${clean(where.channel)}-${clean(where.messageTs)}`,
      now,
    })
    // Already logged by this very button (a Slack retry): its receipt stands.
    if (logged.ok && logged.skipped) return
    if (logged.ok) {
      blocks = buildCallLogReceiptBlocks({
        presserId: userId,
        contactLabel: label,
        outcomeKey: outcome,
        statusBefore: logged.statusBefore,
        statusAfter: logged.statusAfter,
        followUpAt: logged.followUpAt,
        undoValue: logged.undo ? encodeCallLogUndo(logged.undo) : undefined,
        now,
      })
    } else {
      // Added, but the log did not save: the room sees the add and the form;
      // why the log failed is for the presser alone.
      blocks = addedBlocks(safe(result.message), result.contactId, ref, label, outcome)
      await respond(safe(logged.message))
    }
  } else {
    blocks = addedBlocks(safe(result.message), result.contactId, ref, label, outcome)
  }

  const text = firstLineOf(blocks)
  if (source) {
    // A stale copy (see above): someone may already have answered this message.
    if (!source.live && (!result.created || source.blocks.some(isCallLogReceiptBlock))) {
      await respond(text)
      return
    }
    const row = addRow(source.blocks)
    if (row >= 0) {
      const next = [...source.blocks.slice(0, row), ...blocks, ...besideAdd(source.blocks[row]), ...source.blocks.slice(row + 1)]
      if (await rewritePressedMessage(where, source, next, { fallback: text })) return
    }
  }
  if (!(await postInThread(where, text, blocks))) await respond(text)
}

/**
 * What stays of the row an Add button was in: everything but the Add button —
 * and but a Log it… that was waiting for this very contact (no contact id in
 * its value), which the answer's own Log it… replaces. The rest ("Open
 * Outreach") keeps its row, under the answer.
 */
function besideAdd(row: Block): Block[] {
  const rest = (row?.elements || []).filter((element: Block) => {
    if (element?.action_id === MARQUETA_ACTION.addContact) return false
    if (element?.action_id === MARQUETA_ACTION.logCall) return Boolean(decodeContactRef(element.value)?.contactId)
    return true
  })
  return rest.length ? [{ ...row, elements: rest }] : []
}

/**
 * "Added Alex Chen (Beacon Health) to outreach." with "Log it…" for the new
 * record, the outcome already chosen when the button carried one. Not the
 * typed note: an added contact keeps it as "how we know them", which is not a
 * call note.
 */
function addedBlocks(line: string, contactId: string, ref: { organization: string }, label: string, outcome?: CallOutcomeKey): Block[] {
  const logRef = encodeContactRef({ contactId, organization: ref.organization, name: label, ...(outcome ? { outcome } : {}) })
  return [section(line), ...actionsBlock(button(LABEL.LOG, MARQUETA_ACTION.logCall, logRef, true))]
}

/**
 * Post a call outline where the Prep button was pressed.
 *
 * The opener goes first, in the thread, on its own — it must be readable
 * without scrolling; the offer, voicemail and email draft follow as a second
 * reply. Contact details never enter a channel message: inline in a DM, as an
 * ephemeral to the presser in a channel. Nothing after a failed first post is
 * sent — an email draft or an address with no outline above it is worse than
 * silence.
 *
 * A press inside an ephemeral message (or one with nowhere to post) is
 * answered privately through response_url, without buttons — and so is a
 * failure (`error`), which is for the person who pressed, not the room.
 */
async function deliverPrep(
  prep: Awaited<ReturnType<typeof prepCallFor>>,
  input: { where: Where; userId: string; respond: (text: string, blocks?: Block[]) => Promise<void>; ephemeral: boolean },
) {
  const { where, userId, respond } = input
  const privately = input.ephemeral || !where.channel

  if (prep.kind === 'text') {
    if (privately || prep.error || !(await postInThread(where, prep.text))) await respond(prep.text)
    return
  }
  if (prep.kind === 'candidates') {
    if (privately) {
      await respond(`${prep.text} Say it again with the full name — for example ${askMarqueta('prep Sam Rivera at Acme')}.`)
      return
    }
    if (!(await postInThread(where, prep.text, prep.blocks))) await respond(prep.text)
    return
  }

  const details = prep.contactDetails.map((line) => safe(line, 300)).filter(Boolean)
  if (privately) {
    await respond(prep.text, withoutButtons(prep.first))
    if (prep.second.length) await respond(prep.threadText || prep.text, withoutButtons(prep.second))
    if (details.length) await respond(`Contact details — only you can see this:\n${details.join('\n')}`)
    return
  }

  const direct = isDirectMessage(where.channel)
  const first = [...prep.first]
  if (details.length && direct) {
    first.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: clipSlackText(`*Contact details* (only in this DM)\n${details.join('\n')}`, SLACK_LIMITS.sectionText) }],
    })
  }
  if (!(await postInThread(where, prep.text, first))) {
    await respond(errorLine('post the outline here', 'The Studio’s Outreach tab has the same outline.'))
    return
  }
  if (prep.second.length) await postInThread(where, prep.threadText || prep.text, prep.second)
  if (details.length && !direct) {
    await tellPresser(where, userId, `Contact details for this call — only you can see this:\n${details.join('\n')}`)
  }
}

/** Does this link open This week? (Where a caught idea waits to be judged, and nowhere after.) */
function opensThisWeek(url: unknown): boolean {
  try {
    return new URL(String(url)).searchParams.get(MARKETING_VIEW_QUERY_PARAM) === 'thisWeek'
  } catch {
    return false
  }
}

/**
 * A caught idea's message with its buttons swapped for the judgement: the
 * row holding Keep it / Not an idea becomes the receipt. A link to This week
 * goes with the buttons — that is where an idea waits to be judged, and a
 * judged one is no longer there (kept, it is in the idea backlog; binned, it
 * is gone), so the link would open a page without it. Any other link ("Open
 * Calendar" on a draft) stays under the receipt. A message with no such row
 * (an older one) becomes the receipt alone.
 */
function withJudgement(blocks: Block[], receipt: string): Block[] {
  const judged = new Set<string>([MARKETING_ACTION.ideaKeep, MARKETING_ACTION.ideaDiscard])
  const row = blocks.findIndex(
    (block) => block?.type === 'actions' && (block.elements || []).some((element: Block) => judged.has(element?.action_id)),
  )
  const line: Block = { type: 'context', elements: [{ type: 'mrkdwn', text: receipt }] }
  if (row < 0) return [line]
  const links = (blocks[row].elements || []).filter(
    (element: Block) => element?.type === 'button' && element.url && !judged.has(element.action_id) && !opensThisWeek(element.url),
  )
  return [...blocks.slice(0, row), line, ...actionsBlock(...links), ...blocks.slice(row + 1)]
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifySlackRequest(request.headers, rawBody)) {
    return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 })
  }

  const params = new URLSearchParams(rawBody)
  const payloadValue = params.get('payload')
  if (!payloadValue) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const payload = JSON.parse(payloadValue) as SlackInteractionPayload
  const action = payload.actions?.[0]

  // Marqueta's own controls and modals first — see handleMarqueta for why the
  // order matters.
  const marqueta = await handleMarqueta(payload)
  if (marqueta) return marqueta

  // The runway modal. Checked before the task-answer handler below, which
  // treats any private_metadata as a task id - two modals sharing that field
  // would have made "we signed a SoW" try to answer a decision.
  if (payload.type === 'view_submission' && payload.view?.callback_id === MARKETING_RUNWAY_CALLBACK) {
    const origin = decodeModalOrigin(payload.view.private_metadata)
    const kind = origin.value === 'signed' ? 'signed' : 'update'
    const { months, label, basis } = readRunwaySubmission(payload.view.state?.values)
    const userId = payload.user?.id || ''

    // Slack shows this inline under the offending field and keeps the modal
    // open, which is the right place for "that is not a number" - far better
    // than closing it and posting a failure into the channel.
    if (months === null) {
      return NextResponse.json({
        response_action: 'errors',
        errors: {
          [RUNWAY_MONTHS_BLOCK]: 'Give a number of months, like 4.5.',
        },
      })
    }

    after(async () => {
      try {
        // The form opens only behind a gated button, but a form opened before
        // that gate existed can still be submitted — so the write checks too.
        const member = await teamMember(userId)
        if (!member.ok) {
          await tellPrivately(origin, userId, member.message)
          return
        }
        // A note on the record ("Confirmed by Juhan"), not an owner — but never
        // a namesake's display name (recordedName).
        const personName = await recordedName(userId, member, payload.user?.name)
        if (!personName) {
          await tellPrivately(origin, userId, notOnTheList('save the runway'))
          return
        }
        const now = new Date()
        if (kind === 'signed') await recordSignedWork({ label: label || 'Signed work', monthsAdded: months, personName, now })
        else await setRunway({ months, basis, personName, now })
        // An old form has nowhere to answer, and stays as quiet as it always was.
        if (!origin.channel) return
        const who = slackMention(userId, personName)
        const receipt: MoneyReceipt = kind === 'signed' ? { kind: 'runwaySigned', who, label: label || '' } : { kind: 'runwayUpdated', who }
        const where: Where = { channel: origin.channel, threadTs: origin.threadTs, messageTs: origin.messageTs }
        if (!(await answerMoneyInPlace({ where, receipt, now }))) {
          await tellPrivately(origin, userId, 'Saved — but I couldn’t show it in the thread. The Dashboard has the new runway.')
        }
      } catch (err) {
        console.error('[slack] runway update failed', err)
        await tellPrivately(origin, userId, errorLine('save the runway', 'Try again in a minute.'))
      }
    })
    return NextResponse.json({})
  }

  // A decision answered inside the modal. Returning an empty body closes it;
  // the write happens after, because Slack expects the response in ~3 seconds.
  //
  // The answer is said where Answer… was pressed, ONCE: the card it was on is
  // redrawn in place with the note "Answered by …" and whatever the task
  // offers now — so the live Answer… that could overwrite the answer is gone
  // too. Only a message with no card to redraw (an older one, or one that
  // cannot be read back) gets the answer as a reply in its thread instead.
  if (payload.type === 'view_submission' && payload.view?.private_metadata) {
    const origin = decodeModalOrigin(payload.view.private_metadata)
    const taskId = origin.value
    const answer =
      payload.view.state?.values?.[MARKETING_ANSWER_BLOCK]?.[MARKETING_ANSWER_INPUT]?.value || ''
    const userId = payload.user?.id || ''

    if (answer.trim() && taskId) {
      after(async () => {
        try {
          // Team only, before the task is read. The form opens only behind the
          // gated Details… / Answer… button, but a form opened before that gate
          // existed is still open in somebody's Slack — so the write checks too.
          const member = await teamMember(userId)
          if (!member.ok) {
            await tellPrivately(origin, userId, member.message)
            return
          }
          // Recorded as who answered it: the board name, never a namesake's display name.
          const personName = await recordedName(userId, member, payload.user?.name)
          if (!personName) {
            await tellPrivately(origin, userId, notOnTheList('save that answer'))
            return
          }
          const now = new Date()
          const result = await answerMarketingTask({ taskId, answer: answer.trim(), personName, slackUserId: userId })
          if (!result.ok) {
            await tellPrivately(origin, userId, safe(result.message || errorLine('save that answer', 'Answer it on This week.')))
            return
          }
          const mention = slackMention(userId, personName)
          const redrawn =
            origin.channel && result.task
              ? await redrawTaskCard({
                  where: { channel: origin.channel, threadTs: origin.threadTs, messageTs: origin.messageTs },
                  taskId,
                  task: result.task,
                  note: stateNote('answered', mention, now),
                  now,
                  mode: origin.mode,
                })
              : false
          if (redrawn) return
          // The same answer again (a retried submission) has been said already.
          if (result.changed === false) return
          await confirmModal(origin, `${STATE_EMOJI.done} ${mention} answered *${safe(result.taskTitle, 300)}*.`)
        } catch (err) {
          console.error('[slack] marketing answer failed', err)
          await tellPrivately(origin, userId, errorLine('save that answer', 'Answer it on This week.'))
        }
      })
    }
    return NextResponse.json({})
  }

  // Task detail. Handled ON the request path, not deferred: trigger_id expires
  // in about three seconds, so anything queued behind after() is too late and
  // Slack answers expired_trigger_id.
  if (payload.type === 'block_actions' && action?.action_id === MARKETING_ACTION.details) {
    // Team only, before the task is read: Details… and Answer… sit on cards
    // posted wherever she was asked, and the modal shows a private task (and
    // for a decision, takes its answer). A Slack lookup, well inside the
    // trigger's three seconds.
    const member = await teamMember(clean(payload.user?.id))
    if (!member.ok) {
      after(() => postSlackResponse(payload.response_url, member.message))
      return NextResponse.json({ ok: true })
    }
    const decoded = decodeActionValue(action.value)
    if (decoded) {
      const task = await getMarketingTaskDetail(decoded.taskId)
      if (task) {
        const detail = { ...task, minutes: task.estimatedMinutes }
        const blocks = buildTaskDetailBlocks(detail)
        const view = buildTaskDetailView(detail, {
          // Decisions land on This week, where they can be answered (resolveTaskView).
          studioUrl: studioTaskUrl({
            baseUrl: studioBase(),
            taskId: task._id,
            targetView: task.targetView,
            kind: task.kind,
            status: task.status,
            humanQuestion: task.humanQuestion,
          }),
        })
        const opened = await openSlackModal(payload.trigger_id || '', {
          ...view,
          // Where to say the answer was saved — see encodeModalOrigin.
          private_metadata: encodeModalOrigin({ taskId: task._id, where: whereFrom(payload), mode: decodeTaskCardValue(action.value)?.mode }),
        })
        // A modal can still fail (expired trigger, transient error). Falling back
        // to an ephemeral reply means the person gets the detail either way.
        if (!opened) {
          const lines = blocks
            .map((block) => (block.text?.text as string) || '')
            .filter(Boolean)
            .join(String.fromCharCode(10, 10))
          after(async () => {
            await postSlackResponse(payload.response_url, lines || task.title)
          })
        }
        return NextResponse.json({ ok: true })
      }
    }
    after(async () => {
      await postSlackResponse(payload.response_url, errorLine('open that task', 'I can’t find it any more. Open This week.'))
    })
    return NextResponse.json({ ok: true })
  }

  // Judging a captured idea (or a draft put on the calendar). Marqueta guessed
  // that a message was a proposal; this is the person saying whether she was
  // right. The answer takes the place of the buttons on her own message — the
  // title stays, a receipt says who decided, any link stays — so a settled
  // idea leaves one message behind instead of a conversation with itself.
  if (
    payload.type === 'block_actions' &&
    (action?.action_id === MARKETING_ACTION.ideaKeep || action?.action_id === MARKETING_ACTION.ideaDiscard)
  ) {
    const keep = action.action_id === MARKETING_ACTION.ideaKeep
    const decoded = decodeIdeaValue(action.value)
    const responseUrl = payload.response_url
    const userId = payload.user?.id || ''

    after(async () => {
      if (!decoded) {
        await postSlackResponse(responseUrl, errorLine('record that', 'That button lost track of which message it belonged to. Open This week.'))
        return
      }
      try {
        const member = await teamMember(userId)
        if (!member.ok) {
          await postSlackResponse(responseUrl, member.message)
          return
        }
        const personName = member.name || payload.user?.name || 'Someone'
        const result = keep
          ? await keepCapturedIdea({ ...decoded, personName })
          : await discardCapturedIdea({ ...decoded, personName })

        if (!result.ok) {
          await postSlackResponse(responseUrl, safe(result.message || errorLine('record that', 'Judge it on This week.')))
          return
        }
        const who = slackMention(clean(userId))
        // Where it is now, in the Studio's words: a kept idea leaves This week's
        // "Caught in Slack" for the idea backlog on the SEO tab (the Studio's
        // own Keep says the same).
        const receipt = keep
          ? `${STATE_EMOJI.done} Kept by ${who} — it’s in the idea backlog on the SEO tab.`
          : `Binned by ${who} — I’ll remember the miss.`
        await replaceSlackMessage(responseUrl, {
          text: payload.message?.text || receipt,
          blocks: withJudgement((payload.message?.blocks || []) as Block[], receipt),
        })
      } catch (err) {
        console.error('[slack] idea judgement failed', err)
        await postSlackResponse(responseUrl, errorLine('record that', 'Judge it on This week.'))
      }
    })
    return NextResponse.json({ ok: true })
  }

  // Runway buttons. The two that open a modal are handled inline rather than in
  // after(), for the same reason as task details: a trigger_id queued behind a
  // Sanity round trip is already expired when the modal call reaches Slack.
  if (
    payload.type === 'block_actions' &&
    (action?.action_id === MARKETING_ACTION.runwaySigned || action?.action_id === MARKETING_ACTION.runwayUpdate)
  ) {
    const kind = action.action_id === MARKETING_ACTION.runwaySigned ? 'signed' : 'update'
    // Money is team only, and the form shows the current runway: checked
    // before the read, as a Slack lookup that leaves the trigger time to spare.
    const member = await teamMember(clean(payload.user?.id))
    if (!member.ok) {
      after(() => postSlackResponse(payload.response_url, member.message))
      return NextResponse.json({ ok: true })
    }
    let current = ''
    try {
      current = (await readRunway()).summary
    } catch {
      // Showing the modal without the current number is worse than not showing
      // it at all only if the number is what you came to change - it is not.
    }
    const opened = await openSlackModal(payload.trigger_id || '', {
      ...buildRunwayView(kind, current),
      // The kind, plus where to confirm: a view_submission has no response_url.
      private_metadata: encodeModalOrigin({ runwayKind: kind, where: whereFrom(payload) }),
    })
    if (!opened) {
      after(async () => {
        await postSlackResponse(payload.response_url, formWouldNotOpen('the Dashboard'))
      })
    }
    return NextResponse.json({ ok: true })
  }

  // "Still right": the runway confirmed as it stands. Redrawn in place — the
  // receipt, then the strategy question if that is due next (answerMoneyInPlace).
  if (payload.type === 'block_actions' && action?.action_id === MARKETING_ACTION.runwayConfirm) {
    const responseUrl = payload.response_url
    const userId = clean(payload.user?.id)
    after(async () => {
      try {
        const member = await teamMember(userId)
        if (!member.ok) {
          await postSlackResponse(responseUrl, member.message)
          return
        }
        // A note on the record ("Confirmed by Juhan"), not an owner — but never a namesake's display name (recordedName).
        const personName = await recordedName(userId, member, payload.user?.name)
        if (!personName) {
          await postSlackResponse(responseUrl, notOnTheList('confirm the runway'))
          return
        }
        const now = new Date()
        const state = await confirmRunway({ personName, now })
        const receipt: MoneyReceipt = { kind: 'runwayConfirmed', who: slackMention(userId, personName) }
        if (!(await answerMoneyInPlace({ where: whereFrom(payload), receipt, now, fallback: payload.message }))) {
          await postSlackResponse(responseUrl, `Confirmed — ${safe(state.summary)}`)
        }
      } catch (err) {
        console.error('[slack] runway confirm failed', err)
        await postSlackResponse(responseUrl, errorLine('confirm the runway', 'Try again in a minute.'))
      }
    })
    return NextResponse.json({ ok: true })
  }

  // Marketing delegation: claim a task, hand it back, or say you are away.
  if (payload.type === 'block_actions' && isMarketingAction(action?.action_id)) {
    const responseUrl = payload.response_url
    const userId = clean(payload.user?.id)
    const actionId = action!.action_id!
    const respond = (text: string) => postSlackResponse(responseUrl, text)

    // Answer Slack immediately and do the write afterwards: an interaction that
    // takes longer than 3 seconds shows the user a failure even when it worked.
    after(async () => {
      try {
        // Team only, before anything is read or written — the same gate as
        // every Marqueta button. These are the Monday plan's buttons, and the
        // shared task card now carries "Not me" too, wherever it is posted: a
        // guest could otherwise pass on a private task, book time off under a
        // colleague's name, or link themselves to an unmapped board name.
        const member = await teamMember(userId)
        if (!member.ok) {
          await respond(member.message)
          return
        }
        const personName = member.name || payload.user?.name || payload.user?.username || 'Someone'
        const now = new Date()

        if (actionId === MARKETING_ACTION.linkIdentity) {
          const ownerName = action?.selected_option?.value || ''
          if (!ownerName) {
            await respond(errorLine('link that', 'Pick your name from the list.'))
            return
          }
          // Written for the presser already, success or refusal, as mrkdwn
          // with the name escaped (second person).
          const linked = await linkMarketingIdentity({ ownerName, slackUserId: userId })
          await respond(linked.message || (linked.ok ? 'Linked.' : errorLine('link that', 'Try again in a minute.')))
          return
        }

        if (actionId === MARKETING_ACTION.away) {
          const result = await setMarketingAvailability({ personName, slackUserId: userId, status: 'away', now })
          // A refusal, or nothing to change: only the presser needs to hear it.
          if (!result.ok || result.changed === false || !result.receipt) {
            await respond(result.message || errorLine('save that', 'Try again in a minute.'))
            return
          }
          // The room's receipt, in the plan's thread, with the Undo that takes
          // it back. When the thread will not take it, the presser hears what
          // was booked privately — WITH the Undo. It is the one button an
          // ephemeral message carries: the time off is already written, and
          // without it that could not be taken back from Slack at all.
          const undo = result.undoValue ? button(LABEL.UNDO, MARQUETA_ACTION.availabilityUndo, result.undoValue) : null
          const where = whereFrom(payload)
          if (!(await postInThread(where, result.receipt, [section(result.receipt), ...actionsBlock(undo)]))) {
            await postSlackResponse(responseUrl, result.message, [section(result.message), ...actionsBlock(undo)])
          }
          return
        }

        const claim = actionId === MARKETING_ACTION.claim
        const decline = actionId === MARKETING_ACTION.decline
        // Named, not "anything else": this block once read every id it did not
        // recognise as a decline, so a new MARKETING_ACTION id that missed its
        // own handler above would quietly pass on somebody's task. Now it
        // writes nothing (tests/marqueta-wiring.test.ts keeps every id handled).
        if (!claim && !decline) {
          console.error('[slack] unhandled marketing action', actionId)
          await respond(errorLine('do that', 'That button isn’t wired to anything yet — Open This week.'))
          return
        }

        // The card's value — a shared task card (`{t,o,s,m}`) or a legacy
        // attachment card (`{t,o,s}`), which reads as `mine`.
        const decoded = decodeTaskCardValue(action?.value)
        if (!decoded) {
          await respond(LOST_TASK)
          return
        }

        const result = claim
          ? // Only a legacy Monday plan still carries this button. It takes the
            // task only as that card showed it (`expectedOwner`), so a card
            // posted weeks ago cannot take the task from whoever has it now.
            await claimMarketingTask({ taskId: decoded.taskId, personName, slackUserId: userId, expectedOwner: decoded.ownerName })
          : await declineMarketingTask({ taskId: decoded.taskId, personName, slackUserId: userId })

        // Task-action sentences are plain text (a board name can hold anything): escaped here.
        if (!result.ok) {
          await respond(safe(result.message || errorLine('update that task', 'Open This week.')))
          return
        }
        if (result.changed === false) {
          await respond(safe(result.message || 'Nothing to change.'))
          return
        }

        // A shared task card: redraw exactly that card, in the mode it was
        // drawn in, with the note the press leaves.
        const where = whereFrom(payload)
        if (result.task) {
          const note = stateNote(claim ? 'taken' : 'passed', slackMention(userId, personName), now)
          const redrawn = await redrawTaskCard({
            where,
            taskId: decoded.taskId,
            task: result.task,
            note,
            now,
            mode: decoded.mode,
            fallback: payload.message,
          })
          if (redrawn) return
        }

        // A legacy Monday plan, whose cards are attachments: re-render that
        // card from the record, so it always offers whatever reverses its new
        // state, and leave the rest of the message as it was.
        const note = buildActionAcknowledgement({ action: actionId, userId, taskTitle: result.taskTitle })
        const hasCardBlocks = (payload.message?.blocks || []).some((block) => block?.block_id === checkInTaskBlockId(decoded.taskId))
        const fresh = !hasCardBlocks && payload.message?.attachments?.length ? await getMarketingTaskDetail(decoded.taskId) : null
        if (fresh && payload.message?.attachments) {
          await replaceSlackMessage(responseUrl, {
            text: payload.message.text || 'This week in marketing',
            blocks: (payload.message.blocks || []) as unknown[],
            attachments: refreshTaskInAttachments(
              (payload.message.attachments || []) as never[],
              decoded.taskId,
              {
                _id: fresh._id,
                title: fresh.title,
                ownerName: fresh.ownerName,
                minutes: fresh.estimatedMinutes,
                whyNow: fresh.whyNow,
                kind: fresh.kind,
                priority: fresh.priority,
                status: fresh.status,
                note,
              },
            ),
          })
        } else {
          await respond(safe(result.message || 'Done.'))
        }
      } catch (err) {
        console.error('[slack] marketing action failed', err)
        await respond(errorLine('record that', 'Open This week.'))
      }
    })

    return NextResponse.json({ ok: true })
  }

  if (
    payload.type === 'block_actions' &&
    action?.action_id === 'goinvo_chat_mark_resolved' &&
    action.value
  ) {
    const threadId = action.value
    const responseUrl = payload.response_url
    const userName = payload.user?.name

    // Slack requires an ack within ~3s or the button hangs ("didn't respond")
    // and Slack retries the interaction. Do the Sanity write (and the
    // confirmation) AFTER acking so a slow commit or an error can't hang it.
    after(async () => {
      const client = getChatSanityClient()
      if (!client) {
        await postSlackResponse(responseUrl, 'Chat is not configured.')
        return
      }
      try {
        await client
          .patch(threadId)
          .set({ status: 'resolved', resolvedAt: new Date().toISOString() })
          .commit()
        await postSlackResponse(
          responseUrl,
          `Marked chat thread as resolved${userName ? ` for ${userName}` : ''}.`,
        )
      } catch (err) {
        console.error('[slack] mark-resolved failed', err)
        await postSlackResponse(
          responseUrl,
          'Could not mark the thread resolved — please try again.',
        )
      }
    })

    // Immediate ack — stops the button spinner.
    return new NextResponse(null, { status: 200 })
  }

  if (
    payload.type === 'block_actions' &&
    action?.action_id === 'goinvo_dispute_submit_evidence' &&
    action.value
  ) {
    const disputeId = action.value
    const responseUrl = payload.response_url
    const userName = payload.user?.name || payload.user?.username

    // Same 3s-ack shape as above: Stripe calls and Sanity writes happen after
    // the ack so the button never hangs and Slack never retries the click.
    after(async () => {
      const result = await submitDisputeEvidence({
        disputeDocId: stripeDisputeDocumentId(disputeId),
        submittedBy: userName,
      })

      const messages: Record<string, string> = {
        'not-configured': 'The shop CMS is not configured, so nothing was sent.',
        'not-found': 'That dispute is not in the CMS — nothing was sent.',
        submitted: `Evidence submitted to Stripe${userName ? ` by ${userName}` : ''}.`,
      }
      await postSlackResponse(
        responseUrl,
        messages[result.status] ||
          ('message' in result ? result.message : 'Could not submit the evidence.'),
      )
    })

    return new NextResponse(null, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}
