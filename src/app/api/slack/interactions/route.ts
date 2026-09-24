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
} from '@/lib/marketing/slackDelegation'
import { buildCallLogView, isCallOutcomeKey, readCallLogSubmission } from '@/lib/marketing/callLog'
import { logCallFromSlack, undoCallLog } from '@/lib/marketing/callLog.server'
import { addContactFromSlack, prepCallFor } from '@/lib/marketing/callPrep.server'
import { discardCapturedIdea, keepCapturedIdea } from '@/lib/marketing/ideaCapture.server'
import {
  CALL_LOG_CALLBACK,
  CALL_OUTCOME_BLOCK,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_STUCK_CALLBACK,
  decodeCallLogMetadata,
  decodeCallLogUndo,
  decodeContactRef,
  decodeStrategyValue,
  decodeTaskStuckMetadata,
  encodeCallLogMetadata,
  encodeCallLogUndo,
  encodeContactRef,
  encodeTaskStuckMetadata,
  isMarquetaAction,
  type MarquetaActionId,
} from '@/lib/marketing/marquetaActions'
import { confirmRunway, readRunway, recordSignedWork, setRunway } from '@/lib/marketing/runway.server'
import { clipSlackText, escapeSlackText, SLACK_LIMITS, slackMention } from '@/lib/marketing/slackText'
import { recordStrategyVerdict } from '@/lib/marketing/strategyCheck.server'
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
import { studioTaskUrl } from '@/lib/marketing/taskLinks'
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
const MARQUETA = { username: 'Marqueta', iconEmoji: ':chart_with_upwards_trend:' } as const

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

/** A button, or null when its value would make Slack refuse the whole message. */
function button(label: string, actionId: string, value: string, primary = false): Block | null {
  if (!value || value.length > SLACK_LIMITS.buttonValue) return null
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text: clean(label).slice(0, SLACK_LIMITS.buttonText) || 'Open', emoji: true },
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

const COULD_NOT_CHECK_WHO =
  'I couldn’t check who you are in Slack just now, so I’m not doing that — try again in a minute.'
const TEAM_ONLY = 'Outreach, money and the plan are for the studio team, so I can’t help with that here.'
const COULD_NOT_READ_TEAM = 'I couldn’t read the team list just now, so nothing changed — try again in a minute.'
const FORM_WOULD_NOT_OPEN = 'That form would not open. Try again, or do it in the Studio.'

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

// ── The runway and task-answer modals: where to confirm ─────────────────────

/**
 * What the runway and task-answer modals remember between opening and submit.
 *
 * A view_submission carries NO response_url, so these modals' confirmations
 * used to be posted to `undefined` and never appeared — the person pressed
 * Save and heard nothing. They now carry the channel and thread the button was
 * pressed in, as JSON (`k` runway kind or `t` task id, plus `ch` and `th`),
 * and confirm there.
 *
 * Modals opened before this change are still open in people's Slack clients
 * with the old plain value — 'signed' / 'update', or a bare task id — so a
 * value that is not our JSON is read as exactly that, with nowhere to confirm.
 */
type ModalOrigin = { value: string; channel: string; threadTs: string }

function encodeModalOrigin(input: { runwayKind?: string; taskId?: string; where: Where }): string {
  return JSON.stringify({
    ...(input.runwayKind ? { k: clipTo(input.runwayKind, 20) } : {}),
    ...(input.taskId ? { t: clipTo(input.taskId, 180) } : {}),
    ch: clipTo(input.where.channel, 40),
    th: clipTo(input.where.threadTs, 40),
  })
}

const clipTo = (value: unknown, max: number) => String(value ?? '').slice(0, max)

function decodeModalOrigin(raw: string | undefined): ModalOrigin {
  const value = String(raw || '')
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.k || parsed.t)) {
      return { value: clean(parsed.k || parsed.t), channel: clean(parsed.ch), threadTs: clean(parsed.th) }
    }
  } catch {
    // Not JSON: an old modal's plain value.
  }
  return { value: value.trim(), channel: '', threadTs: '' }
}

/** Confirm a modal where it was opened from; an old modal has nowhere, and stays as quiet as it always was. */
async function confirmModal(origin: ModalOrigin, text: string) {
  if (origin.channel) await postInThread({ channel: origin.channel, threadTs: origin.threadTs }, text)
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

/**
 * Redraw one task's card on the message it lives on.
 *
 * The message is read back LIVE first. The copy in the payload is the one the
 * presser's client last rendered, and two people pressing on one check-in
 * within a minute would each redraw it from their own stale copy — the second
 * quietly undoing the first's card. `replaceCheckInTask` then swaps exactly
 * this task's two blocks; everything else, attachments included (the digest's
 * task cards are attachments), goes back exactly as it was.
 *
 * Falls back to the payload's copy when the live read fails (a DM needs a
 * history scope she does not have). False when there was nothing to redraw —
 * no message, or no card for this task on it — so the caller can say it
 * another way.
 */
async function redrawTaskCard(input: {
  where: Where
  taskId: string
  task: CheckInTask
  note: string
  now: Date
  fallback?: SlackInteractionPayload['message']
}): Promise<boolean> {
  const { channel, messageTs, threadTs } = input.where
  if (!channel || !messageTs) return false
  const live = await fetchSlackMessage({ channel, ts: messageTs, threadTs })
  const source =
    live ||
    (input.fallback?.blocks?.length
      ? { text: input.fallback.text || '', blocks: input.fallback.blocks, attachments: input.fallback.attachments || [] }
      : null)
  if (!source) return false
  const next = replaceCheckInTask(source.blocks as Block[], input.taskId, input.task, { now: input.now, note: input.note })
  // Same array back means the card is not on this message.
  if (next === source.blocks) return false
  return updateSlackMessage({
    channel,
    ts: messageTs,
    text: source.text || input.fallback?.text || 'Marqueta',
    blocks: next,
    ...(source.attachments.length ? { attachments: source.attachments } : {}),
  })
}

/**
 * Every Marqueta control — the check-in's task buttons, prep / log / add for a
 * call, Undo, the monthly strategy question — and the two modals behind them.
 *
 * Runs BEFORE the older handlers below, for two reasons that are easy to undo
 * by moving this: the task-answer handler treats ANY view_submission with
 * private_metadata as "answer this task", and would swallow the call-log and
 * Stuck modals; and the delegation catch-all treats an unrecognised marketing
 * action as a hand-back. Modals are routed by callback_id here, never by the
 * mere presence of metadata.
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
        errors: { [CALL_OUTCOME_BLOCK]: 'This form lost track of who it was for. Close it and press Log how it went again.' },
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
          if (where.channel && userId) {
            await postSlackEphemeral({
              channel: where.channel,
              user: userId,
              threadTs: where.threadTs || undefined,
              text: clipSlackText(`${COULD_NOT_READ_TEAM} The call isn’t logged yet.${notes}`, SLACK_LIMITS.sectionText),
              ...MARQUETA,
            })
          }
          return
        }

        const result = await logCallFromSlack({
          contactId: meta.contactId,
          outcomeKey,
          notes: submission.notes,
          followUp: submission.followUp,
          byName: who.name,
          key: `slack-${viewId}`,
          now: new Date(),
        })
        // A retry of a submission already written: the first delivery said so.
        if (result.skipped) return
        if (!result.ok) {
          await postInThread(where, safe(result.message))
          return
        }
        const text = `${slackMention(userId, who.name)} ${safe(result.message.replace(/^Logged:/, 'logged:'))}`
        const undo = result.undo ? button('Undo', MARQUETA_ACTION.callLogUndo, encodeCallLogUndo(result.undo)) : null
        await postInThread(where, text, [section(text), ...actionsBlock(undo)])
      } catch (err) {
        console.error('[slack] call log submission failed', err)
        await postInThread(where, 'Something went wrong logging that. The Studio’s Outreach tab can log it.')
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
        errors: { [TASK_BLOCKER_BLOCK]: 'This form lost track of which task it was for. Close it and press Stuck again.' },
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
          await postInThread(where, safe(result.message || 'That did not save.'))
          return
        }
        // Already stuck on exactly this: tell the presser, not the room.
        if (result.changed === false) {
          if (where.channel && userId) {
            await postSlackEphemeral({
              channel: where.channel,
              user: userId,
              threadTs: where.threadTs || undefined,
              text: safe(result.message || 'Already noted.'),
              ...MARQUETA,
            })
          }
          return
        }
        const note = checkInAcknowledgement(MARQUETA_ACTION.taskStuck, slackMention(userId, who.name), result.task.title)
        await postInThread(where, note)
        // There is no copy of the message in a view_submission, so the card is
        // only redrawn when the live message can be read.
        await redrawTaskCard({ where, taskId: meta.taskId, task: result.task, note, now })
      } catch (err) {
        console.error('[slack] stuck submission failed', err)
        await postInThread(where, 'Something went wrong recording that. The Studio’s This week tab can mark it stuck.')
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

  // ── Log how it went: open the form, on the request path ────────────────────
  if (actionId === MARQUETA_ACTION.logCall) {
    // A Slack lookup, not a Sanity read: well inside the trigger's three seconds.
    const member = await teamMember(userId)
    if (!member.ok) {
      after(() => respond(member.message))
      return NextResponse.json({ ok: true })
    }
    const ref = decodeContactRef(action?.value)
    if (!ref?.contactId) {
      after(() => respond('Add them to outreach first — then there’s something to log the call against.'))
      return NextResponse.json({ ok: true })
    }
    const label = ref.name || ref.organization || 'this contact'
    const opened = await openSlackModal(
      payload.trigger_id || '',
      buildCallLogView({
        contactLabel: label,
        metadata: encodeCallLogMetadata({ contactId: ref.contactId, channel: where.channel, threadTs: where.threadTs, label }),
        prefillNotes: ref.note,
        prefillOutcome: isCallOutcomeKey(ref.outcome) ? ref.outcome : undefined,
      }),
    )
    if (!opened) after(() => respond(`${FORM_WOULD_NOT_OPEN} (Outreach tab)`))
    return NextResponse.json({ ok: true })
  }

  // ── Stuck: open "what's in the way?", on the request path ──────────────────
  if (actionId === MARQUETA_ACTION.taskStuck) {
    // Gated HERE, before the form, for the same reason as Log how it went: the
    // submission writes a blocker onto a private task, and the only thing
    // standing between a guest and that write is whether the form opens for
    // them. A Slack lookup, not a Sanity read, so the trigger survives it.
    const member = await teamMember(userId)
    if (!member.ok) {
      after(() => respond(member.message))
      return NextResponse.json({ ok: true })
    }
    const decoded = decodeActionValue(action?.value)
    if (!decoded) {
      after(() => respond('That button is missing its task — try the plan in the Studio.'))
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
        }),
      }),
    )
    if (!opened) after(() => respond(FORM_WOULD_NOT_OPEN))
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
        const decoded = decodeActionValue(action?.value)
        if (!decoded) {
          await respond('That button is missing its task — try the plan in the Studio.')
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
        const result = await runTask({ taskId: decoded.taskId, personName, slackUserId: userId, now })
        if (!result.ok || !result.task) {
          await respond(safe(result.message || 'That did not work.'))
          return
        }
        // Already true, or a double-tap: say so to the presser and leave the
        // card (and whatever note is on it) alone.
        if (result.changed === false) {
          await respond(safe(result.message || 'Nothing to change.'))
          return
        }
        const note = checkInAcknowledgement(actionId, slackMention(userId, who.name), result.task.title)
        const redrawn = await redrawTaskCard({
          where,
          taskId: decoded.taskId,
          task: result.task,
          note,
          now,
          fallback: payload.message,
        })
        if (!redrawn) await respond(note)
      } catch (err) {
        console.error('[slack] check-in task action failed', err)
        await respond('Something went wrong recording that. The plan in the Studio is still correct.')
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

      // ── Prep this call ─────────────────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.prepCall) {
        const ref = decodeContactRef(action?.value)
        if (!ref) {
          await respond('That button lost track of who it was for. Ask me `prep <name>` instead.')
          return
        }
        const who = await presserName(userId, member.name)
        // Spoken, not written: the display name is fine when the board's is unknown.
        const prep = await prepCallFor({ ref, senderName: who.name || member.name || 'someone from GoInvo', now })
        await deliverPrep(prep, { where, userId, respond, ephemeral: Boolean(payload.container?.is_ephemeral) })
        return
      }

      // ── Add somebody to outreach ───────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.addContact) {
        const ref = decodeContactRef(action?.value)
        if (!ref) {
          await respond('That button lost track of who it was for.')
          return
        }
        const who = await presserName(userId, member.name)
        if (!who.resolved) {
          await respond(COULD_NOT_READ_TEAM)
          return
        }
        const result = await addContactFromSlack({ ref, ownerName: who.name, now })
        if (!result.ok) {
          await respond(safe(result.message))
          return
        }
        // Now there is a record to log against. Not the typed note: an added
        // contact keeps it as "how we know them", which is not a call note.
        const logRef = encodeContactRef({
          contactId: result.contactId,
          organization: ref.organization,
          name: result.label,
          ...(isCallOutcomeKey(ref.outcome) ? { outcome: ref.outcome } : {}),
        })
        const text = `${safe(result.message)} Log the call whenever you’re ready.`
        const blocks = [section(text), ...actionsBlock(button('Log how it went', MARQUETA_ACTION.logCall, logRef, true))]
        if (!(await postInThread(where, text, blocks))) await respond(text)
        return
      }

      // ── Undo a quick log ───────────────────────────────────────────────────
      if (actionId === MARQUETA_ACTION.callLogUndo) {
        const undo = decodeCallLogUndo(action?.value)
        if (!undo) {
          await respond('That undo button is no longer valid — change it in the Studio.')
          return
        }
        const who = await presserName(userId, member.name)
        const result = await undoCallLog(undo, who.name)
        const text = safe(result.message)
        if (!(await postInThread(where, text))) await respond(text)
        return
      }

      // ── The monthly strategy question ──────────────────────────────────────
      if (actionId === MARQUETA_ACTION.strategyConfirm || actionId === MARQUETA_ACTION.strategyRethink) {
        const month = decodeStrategyValue(action?.value)
        if (!month) {
          await respond('That button lost track of which month it was for. Ask me `strategy`.')
          return
        }
        const who = await presserName(userId, member.name)
        // The answer is stored with who gave it, and a rethink is suggested to them.
        if (!who.resolved || !who.name) {
          await respond(COULD_NOT_READ_TEAM)
          return
        }
        const result = await recordStrategyVerdict({
          verdict: actionId === MARQUETA_ACTION.strategyConfirm ? 'stillRight' : 'rethink',
          personName: who.name,
          monthKey: month.monthKey,
          now,
        })
        // In the thread, NEVER replace_original: the digest this lives on
        // carries the week's task cards as attachments, and replacing the
        // message would drop every one of them.
        const text = [safe(result.message), result.answer || ''].filter(Boolean).join('\n\n')
        if (!(await postInThread(where, text))) await respond(text)
        return
      }
    } catch (err) {
      console.error('[slack] marqueta action failed', err)
      await respond('Something went wrong with that. The Studio still has the real answer.')
    }
  })
  return NextResponse.json({ ok: true })
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
 * answered privately through response_url, without buttons.
 */
async function deliverPrep(
  prep: Awaited<ReturnType<typeof prepCallFor>>,
  input: { where: Where; userId: string; respond: (text: string, blocks?: Block[]) => Promise<void>; ephemeral: boolean },
) {
  const { where, userId, respond } = input
  const privately = input.ephemeral || !where.channel

  if (prep.kind === 'text') {
    if (privately || !(await postInThread(where, prep.text))) await respond(prep.text)
    return
  }
  if (prep.kind === 'candidates') {
    if (privately) {
      await respond(`${prep.text} Ask me again with the full name — for example \`prep Sam Rivera at Acme\`.`)
      return
    }
    if (!(await postInThread(where, prep.text, prep.blocks))) await respond(prep.text)
    return
  }

  const details = prep.contactDetails.map((line) => safe(line, 300)).filter(Boolean)
  if (privately) {
    await respond(prep.text, withoutButtons(prep.first))
    if (prep.second.length) await respond(`${prep.text} — offer, voicemail and email draft`, withoutButtons(prep.second))
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
    await respond('I couldn’t post the outline here. Ask me `prep <name>` in a DM instead.')
    return
  }
  if (prep.second.length) await postInThread(where, `${prep.text} — offer, voicemail and email draft`, prep.second)
  if (details.length && !direct && userId) {
    await postSlackEphemeral({
      channel: where.channel,
      user: userId,
      threadTs: where.threadTs || undefined,
      text: clipSlackText(`Contact details for this call — only you can see this:\n${details.join('\n')}`, SLACK_LIMITS.sectionText),
      ...MARQUETA,
    })
  }
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
        const personName = (await getSlackUserDisplayName(userId)) || payload.user?.name || 'Someone'
        const state =
          kind === 'signed'
            ? await recordSignedWork({ label: label || 'Signed work', monthsAdded: months, personName })
            : await setRunway({ months, basis, personName })
        await confirmModal(origin, `${slackMention(userId, personName)} updated the runway. ${safe(state.summary)}`)
      } catch (err) {
        console.error('[slack] runway update failed', err)
        await confirmModal(origin, 'That did not save. The runway is unchanged.')
      }
    })
    return NextResponse.json({})
  }

  // A decision answered inside the modal. Returning an empty body closes it;
  // the write happens after, because Slack expects the response in ~3 seconds.
  if (payload.type === 'view_submission' && payload.view?.private_metadata) {
    const origin = decodeModalOrigin(payload.view.private_metadata)
    const taskId = origin.value
    const answer =
      payload.view.state?.values?.[MARKETING_ANSWER_BLOCK]?.[MARKETING_ANSWER_INPUT]?.value || ''
    const userId = payload.user?.id || ''

    if (answer.trim() && taskId) {
      after(async () => {
        try {
          const personName =
            (await getSlackUserDisplayName(userId)) || payload.user?.name || 'Someone'
          const result = await answerMarketingTask({ taskId, answer: answer.trim(), personName })
          await confirmModal(
            origin,
            result.ok
              ? `${slackMention(userId, personName)} answered *${safe(result.taskTitle, 300)}*.`
              : safe(result.message || 'That did not save.'),
          )
        } catch (err) {
          console.error('[slack] marketing answer failed', err)
        }
      })
    }
    return NextResponse.json({})
  }

  // Task detail. Handled ON the request path, not deferred: trigger_id expires
  // in about three seconds, so anything queued behind after() is too late and
  // Slack answers expired_trigger_id.
  if (payload.type === 'block_actions' && action?.action_id === MARKETING_ACTION.details) {
    const decoded = decodeActionValue(action.value)
    if (decoded) {
      const task = await getMarketingTaskDetail(decoded.taskId)
      if (task) {
        const detail = { ...task, minutes: task.estimatedMinutes }
        const blocks = buildTaskDetailBlocks(detail)
        const view = buildTaskDetailView(detail, {
          studioUrl: studioTaskUrl({
            baseUrl: process.env.MARKETING_PUBLIC_BASE_URL,
            taskId: task._id,
            targetView: task.targetView,
            kind: task.kind,
          }),
        })
        const opened = await openSlackModal(payload.trigger_id || '', {
          ...view,
          // Where to say the answer was saved — see encodeModalOrigin.
          private_metadata: encodeModalOrigin({ taskId: task._id, where: whereFrom(payload) }),
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
      await postSlackResponse(payload.response_url, 'That task no longer exists.')
    })
    return NextResponse.json({ ok: true })
  }

  // Judging a captured idea. Marqueta guessed that a message was a proposal;
  // this is the person saying whether she was right. The reply REPLACES the
  // thread message rather than adding to it, so a settled idea leaves one line
  // behind instead of a conversation with itself.
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
        await postSlackResponse(responseUrl, 'That button lost track of which message it belonged to.')
        return
      }
      try {
        const personName = (await getSlackUserDisplayName(userId)) || payload.user?.name || 'Someone'
        const result = keep
          ? await keepCapturedIdea({ ...decoded, personName })
          : await discardCapturedIdea({ ...decoded, personName })

        if (!result.ok) {
          await postSlackResponse(responseUrl, result.message || 'That did not save.')
          return
        }
        await replaceSlackMessage(responseUrl, {
          text: keep ? 'Idea kept' : 'Not an idea',
          blocks: [
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: keep
                    ? `On the board, confirmed by <@${userId}>.`
                    : `<@${userId}> says this was not a proposal. Dropped, and I will keep the miss on file.`,
                },
              ],
            },
          ],
        })
      } catch (err) {
        console.error('[slack] idea judgement failed', err)
        await postSlackResponse(responseUrl, 'Something went wrong recording that.')
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
        await postSlackResponse(payload.response_url, 'That form would not open. Try again, or set it in the Studio.')
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (payload.type === 'block_actions' && action?.action_id === MARKETING_ACTION.runwayConfirm) {
    const responseUrl = payload.response_url
    const userId = payload.user?.id || ''
    after(async () => {
      try {
        const personName = (await getSlackUserDisplayName(userId)) || payload.user?.name || 'Someone'
        const state = await confirmRunway({ personName })
        await postSlackResponse(responseUrl, `<@${userId}> confirmed the runway. ${state.summary}`)
      } catch (err) {
        console.error('[slack] runway confirm failed', err)
        await postSlackResponse(responseUrl, 'That did not save.')
      }
    })
    return NextResponse.json({ ok: true })
  }

  // Marketing delegation: claim a task, hand it back, or say you are away.
  if (payload.type === 'block_actions' && isMarketingAction(action?.action_id)) {
    const responseUrl = payload.response_url
    const userId = payload.user?.id || ''
    const decoded = decodeActionValue(action?.value)
    const actionId = action!.action_id!

    // Answer Slack immediately and do the write afterwards: an interaction that
    // takes longer than 3 seconds shows the user a failure even when it worked.
    after(async () => {
      try {
        const personName =
          (await getSlackUserDisplayName(userId)) || payload.user?.name || payload.user?.username || 'Someone'

        if (actionId === MARKETING_ACTION.linkIdentity) {
          const ownerName = action?.selected_option?.value || ''
          if (!ownerName) {
            await postSlackResponse(responseUrl, 'No name was selected.')
            return
          }
          const linked = await linkMarketingIdentity({ ownerName, slackUserId: userId })
          await postSlackResponse(
            responseUrl,
            `${buildActionAcknowledgement({ action: actionId, userId })} ${linked.message || ''}`.trim(),
          )
          return
        }

        if (actionId === MARKETING_ACTION.away) {
          const result = await setMarketingAvailability({
            personName,
            slackUserId: userId,
            status: 'away',
          })
          await postSlackResponse(
            responseUrl,
            `${buildActionAcknowledgement({ action: actionId, userId })} ${result.message || ''}`.trim(),
          )
          return
        }

        if (!decoded) {
          await postSlackResponse(responseUrl, 'That button is missing its task — try the plan in the Studio.')
          return
        }

        const result =
          actionId === MARKETING_ACTION.claim
            ? await claimMarketingTask({ taskId: decoded.taskId, personName, slackUserId: userId })
            : await declineMarketingTask({ taskId: decoded.taskId, personName })

        const note = result.ok
          ? buildActionAcknowledgement({ action: actionId, userId, taskTitle: result.taskTitle })
          : result.message || 'That did not work.'

        // Check it off in the message itself, so the channel stops showing it as
        // available and nobody claims the same task twice.
        // Re-render the card from the record, so it always offers whatever
        // reverses its new state. Nothing collapses, so nothing gets stuck.
        const fresh = result.ok ? await getMarketingTaskDetail(decoded.taskId) : null
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
          await postSlackResponse(responseUrl, note)
        }
      } catch (err) {
        console.error('[slack] marketing action failed', err)
        await postSlackResponse(responseUrl, 'Something went wrong recording that. The plan in the Studio is still correct.')
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
