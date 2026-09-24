/**
 * Every Slack control Marqueta added after the weekly digest, in one place.
 *
 * Deliberately a SEPARATE namespace from `MARKETING_ACTION` in
 * slackDelegation.ts. The interactions route has a catch-all for that set that
 * treats anything it does not recognise as "hand this task back" — so an id
 * added there by mistake would silently decline somebody's task. These ids use
 * the `goinvo_marqueta_` prefix, are matched by `isMarquetaAction`, and must be
 * dispatched BEFORE that catch-all.
 *
 * Modals are routed by `callback_id`, never by the mere presence of
 * `private_metadata`: the older task-answer handler treats ANY private_metadata
 * as a task id, so every modal here must be handled ahead of it.
 *
 * Pure: constants plus the encoding of what travels in a button's `value` or a
 * modal's `private_metadata`. Slack caps both (2000 and 3000 characters), and a
 * value over the cap makes Slack drop the whole message, so everything here is
 * short ids and is clipped.
 */

export const MARQUETA_ACTION = {
  /** Post a call outline for a contact or organisation, in the thread. */
  prepCall: 'goinvo_marqueta_prep_call',
  /** Open the "how did it go" modal for a contact. */
  logCall: 'goinvo_marqueta_log_call',
  /** Weekly check-in: the task is finished. */
  taskDone: 'goinvo_marqueta_task_done',
  /** Weekly check-in: still on it, nothing to change. */
  taskProgress: 'goinvo_marqueta_task_progress',
  /** Weekly check-in: stuck — opens a modal asking what is in the way. */
  taskStuck: 'goinvo_marqueta_task_stuck',
  /** Weekly check-in: give it back to the board. */
  taskHandBack: 'goinvo_marqueta_task_hand_back',
  /** Undo "done" — every state offers the action that reverses it. */
  taskReopen: 'goinvo_marqueta_task_reopen',
  /** Take an unowned task from the check-in (or an ask addressed to you). */
  taskTake: 'goinvo_marqueta_task_take',
  /** A task that keeps slipping: drop it (dismissed — reversible with Reopen). */
  taskDrop: 'goinvo_marqueta_task_drop',
  /** A task that keeps slipping: keep it, and move it to next week. */
  taskSnooze: 'goinvo_marqueta_task_snooze',
  /** Put somebody who is not on file yet into outreach, from a prep or a log. */
  addContact: 'goinvo_marqueta_add_contact',
  /** Reverse a call Marqueta logged straight from a message. */
  callLogUndo: 'goinvo_marqueta_call_log_undo',
  /** Monthly strategy check: the plan still fits the money. */
  strategyConfirm: 'goinvo_marqueta_strategy_confirm',
  /** Monthly strategy check: it does not — put a decision on the board. */
  strategyRethink: 'goinvo_marqueta_strategy_rethink',
} as const

export type MarquetaActionId = (typeof MARQUETA_ACTION)[keyof typeof MARQUETA_ACTION]

export function isMarquetaAction(actionId: string | undefined): actionId is MarquetaActionId {
  return Object.values(MARQUETA_ACTION).includes(actionId as MarquetaActionId)
}

/** The call-log modal. */
export const CALL_LOG_CALLBACK = 'goinvo_marqueta_call_log'
export const CALL_OUTCOME_BLOCK = 'goinvo_call_outcome_block'
export const CALL_OUTCOME_INPUT = 'goinvo_call_outcome_input'
export const CALL_NOTES_BLOCK = 'goinvo_call_notes_block'
export const CALL_NOTES_INPUT = 'goinvo_call_notes_input'
export const CALL_FOLLOW_UP_BLOCK = 'goinvo_call_follow_up_block'
export const CALL_FOLLOW_UP_INPUT = 'goinvo_call_follow_up_input'

/** The "what's in the way?" modal behind the check-in's Stuck button. */
export const TASK_STUCK_CALLBACK = 'goinvo_marqueta_task_stuck_modal'
export const TASK_BLOCKER_BLOCK = 'goinvo_task_blocker_block'
export const TASK_BLOCKER_INPUT = 'goinvo_task_blocker_input'

/** Block ids for a task's line in the check-in, so a press can redraw exactly that task. */
export const checkInTaskBlockId = (taskId: string) => `mq_task_${taskId}`.slice(0, 255)
export const checkInTaskActionsBlockId = (taskId: string) => `mq_task_actions_${taskId}`.slice(0, 255)

const clip = (value: unknown, max: number) => String(value ?? '').slice(0, max)

/** Under Slack's 2,000-character button value cap, with room to spare. */
const BUTTON_VALUE_BUDGET = 1900

function parseObject(value: string | undefined): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(String(value || ''))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Who a prep/log/add button is about.
 *
 * A contact id when we know the person; otherwise the organisation, plus the
 * name and role the person TYPED — most calls the team makes are to people who
 * are not in the CMS yet, and "Add them to outreach" needs something to add.
 * Never all empty.
 *
 * `note` and `outcome` carry what somebody said when they reported a call
 * ("called Jane, left a voicemail") so the log form can open already filled
 * in: pressing the button delivers Marqueta's reply, not their message, so
 * anything not carried here is lost by the time the modal opens.
 */
export type ContactRef = {
  contactId: string
  organization: string
  name: string
  role: string
  note: string
  outcome: string
}

export function encodeContactRef(input: {
  contactId?: string
  organization?: string
  name?: string
  role?: string
  note?: string
  outcome?: string
}): string {
  return fitJson(
    {
      c: clip(input.contactId, 180),
      o: clip(input.organization, 180),
      ...(input.name ? { p: clip(input.name, 120) } : {}),
      ...(input.role ? { r: clip(input.role, 120) } : {}),
      ...(input.outcome ? { g: clip(input.outcome, 24) } : {}),
      ...(input.note ? { n: clip(input.note, 1200) } : {}),
    },
    // The note is the only part worth giving up: it just prefills a form.
    ['n', 'r', 'p', 'o'],
  )
}

/**
 * Encode, then shrink the named fields until the result fits a button value.
 *
 * Clipping characters BEFORE encoding is not enough: JSON doubles a quote or a
 * newline and turns a control character into six, so a 1,200-character note
 * of line breaks encodes to ~2,400 — over Slack's 2,000, which makes Slack
 * drop the whole message. Measuring the encoded string is the only honest cap.
 */
function fitJson(value: Record<string, string>, shrinkOrder: string[], max = BUTTON_VALUE_BUDGET): string {
  const next = { ...value }
  let encoded = JSON.stringify(next)
  for (const key of shrinkOrder) {
    while (encoded.length > max && next[key]) {
      next[key] = next[key].slice(0, Math.floor(next[key].length / 2))
      if (!next[key]) delete next[key]
      encoded = JSON.stringify(next)
    }
  }
  return encoded
}

export function decodeContactRef(value: string | undefined): ContactRef | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const ref: ContactRef = {
    contactId: clip(parsed.c, 180).trim(),
    organization: clip(parsed.o, 180).trim(),
    name: clip(parsed.p, 120).trim(),
    role: clip(parsed.r, 120).trim(),
    note: clip(parsed.n, 1200).trim(),
    outcome: clip(parsed.g, 24).trim(),
  }
  if (!ref.contactId && !ref.organization && !ref.name) return null
  return ref
}

/**
 * What the call-log modal needs to remember between opening and submitting.
 *
 * `channel` + `threadTs` say where to confirm, because a view_submission
 * carries no response_url — without them the confirmation has nowhere to go
 * and the person is left wondering whether it saved.
 */
export type CallLogMetadata = {
  contactId: string
  channel: string
  threadTs: string
  /** Who the form is about, for the confirmation — so it needs no extra read. */
  label?: string
}

export function encodeCallLogMetadata(input: CallLogMetadata): string {
  return JSON.stringify({
    c: clip(input.contactId, 180),
    ch: clip(input.channel, 40),
    ts: clip(input.threadTs, 40),
    ...(input.label ? { l: clip(input.label, 200) } : {}),
  })
}

export function decodeCallLogMetadata(value: string | undefined): CallLogMetadata | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const contactId = clip(parsed.c, 180).trim()
  if (!contactId) return null
  const label = clip(parsed.l, 200).trim()
  return {
    contactId,
    channel: clip(parsed.ch, 40).trim(),
    threadTs: clip(parsed.ts, 40).trim(),
    ...(label ? { label } : {}),
  }
}

/**
 * Same idea for the Stuck modal: which task, where to say it was recorded, and
 * which message to redraw.
 *
 * Two timestamps, because they answer different questions. `threadTs` is where
 * a note goes — always a thread's PARENT, since Slack asks callers not to
 * thread under a reply's ts. `messageTs` is the message holding the card, which
 * may itself be a reply (a "mine" answer lives in a thread).
 */
export type TaskStuckMetadata = {
  taskId: string
  channel: string
  threadTs: string
  messageTs: string
}

export function encodeTaskStuckMetadata(input: TaskStuckMetadata): string {
  return JSON.stringify({
    t: clip(input.taskId, 180),
    ch: clip(input.channel, 40),
    th: clip(input.threadTs, 40),
    ts: clip(input.messageTs, 40),
  })
}

export function decodeTaskStuckMetadata(value: string | undefined): TaskStuckMetadata | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const taskId = clip(parsed.t, 180).trim()
  if (!taskId) return null
  const messageTs = clip(parsed.ts, 40).trim()
  return {
    taskId,
    channel: clip(parsed.ch, 40).trim(),
    threadTs: clip(parsed.th, 40).trim() || messageTs,
    messageTs,
  }
}

/**
 * What "Undo" needs to put a contact back exactly as it was before a call was
 * logged straight from a message.
 *
 * Every field the quick log may change travels here with its PRIOR value, and
 * the interaction's own `_key`, so undo removes exactly that entry. An empty
 * string means the field was absent and must be unset again, not set to "".
 *
 * The close (`closedAt`, `closedValue`, `closeReason`) travels only when the
 * log changed it — a Lost contact that picked up again, or a live one marked
 * "Not a fit". Without it, "called Jane, no answer" about somebody lost last
 * spring would erase the loss date and reason with no way back from Slack.
 * `closedAt === undefined` means "not carried: leave the close alone";
 * `''` / `null` mean "was absent: unset it again".
 */
export type CallLogUndo = {
  contactId: string
  interactionKey: string
  prior: {
    status: string
    followUpAt: string
    lastContactedAt: string
    attributionChannel: string
    nextStep: string
    closedAt?: string
    closedValue?: number | null
    closeReason?: string
  }
}

/** The longest close reason an Undo button carries. A longer one is not carried at all. */
export const CALL_LOG_UNDO_CLOSE_REASON_MAX = 500

const BUTTON_VALUE_MAX = 2000

export function encodeCallLogUndo(input: CallLogUndo): string {
  const value: Record<string, unknown> = {
    c: clip(input.contactId, 180),
    k: clip(input.interactionKey, 120),
    s: clip(input.prior.status, 30),
    f: clip(input.prior.followUpAt, 40),
    l: clip(input.prior.lastContactedAt, 40),
    a: clip(input.prior.attributionChannel, 30),
    x: clip(input.prior.nextStep, 600),
  }
  if (input.prior.closedAt !== undefined) {
    const closedValue = input.prior.closedValue
    value.z = [
      clip(input.prior.closedAt, 40),
      typeof closedValue === 'number' && Number.isFinite(closedValue) ? closedValue : null,
      clip(input.prior.closeReason, CALL_LOG_UNDO_CLOSE_REASON_MAX),
    ]
  }
  // JSON escaping can double a quote- or newline-heavy string, and Slack drops
  // the whole message for one over-long value. The close goes first — an Undo
  // without it refuses, which is safe — then the next step, whose clipped copy
  // Undo already knows not to write over the full one.
  if (JSON.stringify(value).length > BUTTON_VALUE_MAX) delete value.z
  while (JSON.stringify(value).length > BUTTON_VALUE_MAX && String(value.x).length > 0) {
    value.x = String(value.x).slice(0, Math.floor(String(value.x).length / 2))
  }
  return JSON.stringify(value)
}

export function decodeCallLogUndo(value: string | undefined): CallLogUndo | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const contactId = clip(parsed.c, 180).trim()
  const interactionKey = clip(parsed.k, 120).trim()
  if (!contactId || !interactionKey) return null
  const close = Array.isArray(parsed.z) && parsed.z.length >= 3 ? parsed.z : null
  const closedValue = close?.[1]
  return {
    contactId,
    interactionKey,
    prior: {
      status: clip(parsed.s, 30).trim(),
      followUpAt: clip(parsed.f, 40).trim(),
      lastContactedAt: clip(parsed.l, 40).trim(),
      attributionChannel: clip(parsed.a, 30).trim(),
      nextStep: clip(parsed.x, 600),
      ...(close
        ? {
            closedAt: clip(close[0], 40).trim(),
            closedValue: typeof closedValue === 'number' && Number.isFinite(closedValue) ? closedValue : null,
            closeReason: clip(close[2], CALL_LOG_UNDO_CLOSE_REASON_MAX),
          }
        : {}),
    },
  }
}

/** The strategy buttons carry the month they were asked about, so a stale press is recognisable. */
export function encodeStrategyValue(monthKey: string): string {
  return JSON.stringify({ m: clip(monthKey, 7) })
}

export function decodeStrategyValue(value: string | undefined): { monthKey: string } | null {
  const parsed = parseObject(value)
  const monthKey = clip(parsed?.m, 7)
  return /^\d{4}-\d{2}$/.test(monthKey) ? { monthKey } : null
}
