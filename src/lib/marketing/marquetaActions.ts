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

function parseObject(value: string | undefined): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(String(value || ''))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Who a prep/log button is about.
 *
 * A contact id when we know the person; otherwise the organisation name, which
 * is enough to prep a call to "someone at" a company. Never both empty.
 */
export type ContactRef = { contactId: string; organization: string }

export function encodeContactRef(input: { contactId?: string; organization?: string }): string {
  return JSON.stringify({ c: clip(input.contactId, 180), o: clip(input.organization, 180) })
}

export function decodeContactRef(value: string | undefined): ContactRef | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const contactId = clip(parsed.c, 180).trim()
  const organization = clip(parsed.o, 180).trim()
  if (!contactId && !organization) return null
  return { contactId, organization }
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
}

export function encodeCallLogMetadata(input: CallLogMetadata): string {
  return JSON.stringify({ c: clip(input.contactId, 180), ch: clip(input.channel, 40), ts: clip(input.threadTs, 40) })
}

export function decodeCallLogMetadata(value: string | undefined): CallLogMetadata | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const contactId = clip(parsed.c, 180).trim()
  if (!contactId) return null
  return { contactId, channel: clip(parsed.ch, 40).trim(), threadTs: clip(parsed.ts, 40).trim() }
}

/** Same idea for the Stuck modal: which task, and where to say it was recorded. */
export type TaskStuckMetadata = {
  taskId: string
  channel: string
  messageTs: string
}

export function encodeTaskStuckMetadata(input: TaskStuckMetadata): string {
  return JSON.stringify({ t: clip(input.taskId, 180), ch: clip(input.channel, 40), ts: clip(input.messageTs, 40) })
}

export function decodeTaskStuckMetadata(value: string | undefined): TaskStuckMetadata | null {
  const parsed = parseObject(value)
  if (!parsed) return null
  const taskId = clip(parsed.t, 180).trim()
  if (!taskId) return null
  return { taskId, channel: clip(parsed.ch, 40).trim(), messageTs: clip(parsed.ts, 40).trim() }
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
