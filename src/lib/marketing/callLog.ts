/**
 * Logging a touch on a contact — one core, shared by the Studio and Slack.
 *
 * The Studio's "Save log" form had the only correct version of this, written
 * inline in a React handler: which fields a Won closes, which a reopened
 * contact must shed, when a follow-up is cleared rather than kept. Marqueta now
 * logs calls too (from a modal, or straight from "called Jane, left a
 * voicemail"), and a second copy of those rules would drift from the first the
 * week somebody fixed one of them. So the Studio's semantics moved here
 * unchanged (`buildContactLogWrite`), and the Slack quick log is a thin layer
 * over them (`buildQuickCallLog`) rather than a sibling.
 *
 * The quick log exists because cold calling is stressful and the moment right
 * after a call is the worst time to fill in a form. Eight outcomes cover what
 * actually happens on the phone; each carries the status it implies and a
 * sensible follow-up, so "Left a voicemail" is one press and the contact
 * resurfaces in three days without anybody picking a date.
 *
 * Two rules keep a one-press log from doing damage:
 *
 * - A quick outcome never moves a contact BACKWARDS. "No answer" on somebody
 *   already in a meeting is a touch, not a demotion to "contacted" — and Won
 *   absorbs everything: no quick outcome may unpick a closed deal's value.
 * - Everything it changes can be put back. The write returns an Undo carrying
 *   each prior value (the close included, when the log reopened or closed the
 *   contact) and the exact interaction key, and Undo refuses rather than
 *   guesses when the record has moved on since. `quickLogIsReversible` says in
 *   advance when a button could not carry enough to put it back, so a log from
 *   free text can open the form instead of writing something it cannot undo.
 *
 * Pure: no client, no fetch, no clock (`now` is passed in).
 */

import {
  CALL_FOLLOW_UP_BLOCK,
  CALL_FOLLOW_UP_INPUT,
  CALL_LOG_CALLBACK,
  CALL_LOG_UNDO_CLOSE_REASON_MAX,
  CALL_NOTES_BLOCK,
  CALL_NOTES_INPUT,
  CALL_OUTCOME_BLOCK,
  CALL_OUTCOME_INPUT,
  decodeCallLogUndo,
  encodeCallLogUndo,
  type CallLogUndo,
} from './marquetaActions'
import { buildInteractionEntry } from './outreach'
import { OUTREACH_STATUS_OPTIONS, type OutreachStatus } from './outreachEnums'
import { clipSlackText, escapeSlackText } from './slackText'

// ---- The outcomes --------------------------------------------------------

/**
 * What can happen on a call, in the words a person would use afterwards.
 *
 * `progress` separates an ATTEMPT or a step forward (which may only move a
 * contact up the pipeline) from an explicit DISPOSITION ("not right now",
 * "not a fit"), which is the caller saying where the contact now stands and so
 * is taken at its word.
 *
 * "Pointed me to someone else" has no default follow-up on purpose: the next
 * call is to the person they named, not back to this one.
 */
export const CALL_OUTCOMES: readonly {
  key: 'noAnswer' | 'voicemail' | 'emailed' | 'referred' | 'notNow' | 'interested' | 'meeting' | 'notAFit'
  label: string
  status: OutreachStatus
  channel: 'phone' | 'email'
  defaultFollowUpDays: number | null
  progress: boolean
}[] = [
  { key: 'noAnswer', label: 'No answer', status: 'contacted', channel: 'phone', defaultFollowUpDays: 2, progress: true },
  { key: 'voicemail', label: 'Left a voicemail', status: 'contacted', channel: 'phone', defaultFollowUpDays: 3, progress: true },
  { key: 'emailed', label: 'Sent an email', status: 'contacted', channel: 'email', defaultFollowUpDays: 5, progress: true },
  { key: 'referred', label: 'Pointed me to someone else', status: 'contacted', channel: 'phone', defaultFollowUpDays: null, progress: true },
  { key: 'notNow', label: 'Talked — not right now', status: 'dormant', channel: 'phone', defaultFollowUpDays: 60, progress: false },
  { key: 'interested', label: 'Talked — interested', status: 'responded', channel: 'phone', defaultFollowUpDays: 3, progress: true },
  { key: 'meeting', label: 'Meeting booked', status: 'meeting', channel: 'phone', defaultFollowUpDays: 1, progress: true },
  { key: 'notAFit', label: 'Not a fit', status: 'closed', channel: 'phone', defaultFollowUpDays: null, progress: false },
]

export type CallOutcomeKey = (typeof CALL_OUTCOMES)[number]['key']

export function isCallOutcomeKey(value: unknown): value is CallOutcomeKey {
  return typeof value === 'string' && CALL_OUTCOMES.some((outcome) => outcome.key === value)
}

const outcomeFor = (key: CallOutcomeKey) => CALL_OUTCOMES.find((outcome) => outcome.key === key)!

/**
 * When to bring the contact back up. "When the outcome suggests" is the
 * default because the outcome already knows: a voicemail wants a retry in days,
 * "not right now" wants one in two months.
 */
export const FOLLOW_UP_CHOICES: readonly {
  value: 'default' | '2' | '7' | '14' | '30' | 'none'
  label: string
  days: number | null
}[] = [
  { value: 'default', label: 'When the outcome suggests', days: null },
  { value: '2', label: 'In 2 days', days: 2 },
  { value: '7', label: 'In a week', days: 7 },
  { value: '14', label: 'In two weeks', days: 14 },
  { value: '30', label: 'In a month', days: 30 },
  { value: 'none', label: 'No follow-up', days: null },
]

type FollowUpChoice = (typeof FOLLOW_UP_CHOICES)[number]['value']

const isFollowUpChoice = (value: unknown): value is FollowUpChoice =>
  typeof value === 'string' && FOLLOW_UP_CHOICES.some((choice) => choice.value === value)

/**
 * Days until the follow-up for an outcome and a choice. Anything unrecognised
 * is read as "default" — a malformed value from Slack should fall back to the
 * outcome's own judgement, not silently drop the follow-up.
 */
export function resolveFollowUpDays(outcomeKey: CallOutcomeKey, followUp?: string): number | null {
  const choice = isFollowUpChoice(followUp) ? followUp : 'default'
  if (choice === 'default') return outcomeFor(outcomeKey).defaultFollowUpDays
  return FOLLOW_UP_CHOICES.find((option) => option.value === choice)?.days ?? null
}

// ---- Where the contact ends up -------------------------------------------

/** The pipeline, low to high. Anything not listed ranks below all of it. */
const PIPELINE_RANK: Record<string, number> = {
  new: 0,
  needsReview: 0,
  researched: 0,
  briefed: 0,
  contacted: 1,
  responded: 2,
  meeting: 3,
  opportunity: 4,
}

const TERMINAL_STATUSES = ['won', 'lost', 'closed']
const isTerminal = (status: unknown) => TERMINAL_STATUSES.includes(String(status || ''))

/** What a close consists of — what a reopen sheds and a Lost or "Not a fit" stamps. */
const CLOSED_FIELDS = ['closedAt', 'closedValue', 'closeReason'] as const

/**
 * The status a quick outcome leaves a contact at.
 *
 * - Won is absorbing. A paid engagement is not un-won by a voicemail, and the
 *   closed value on it is the number the runway check-in trusts.
 * - A progress outcome only ever moves UP the pipeline: "no answer" on a
 *   contact at `meeting` stays `meeting`. From lost, closed or dormant it
 *   reopens to the outcome's own status — they picked up, or we tried again,
 *   so the contact is live.
 * - An explicit disposition is the caller saying where things stand, so it is
 *   applied as given (still never over a Won).
 */
export function resolveStatusAfter(current: string | undefined, target: OutreachStatus, progress: boolean): OutreachStatus {
  if (current === 'won') return 'won'
  if (!progress) return target
  if (!current || current === 'lost' || current === 'closed' || current === 'dormant') return target
  const currentRank = PIPELINE_RANK[current] ?? -1
  const targetRank = PIPELINE_RANK[target] ?? -1
  return currentRank > targetRank ? current : target
}

// ---- The write the Studio's "Save log" makes -----------------------------

/**
 * The contact fields a log reads. `null` is accepted because a GROQ projection
 * returns null, not undefined, for a field the document does not have.
 */
export type ContactLogContact = {
  _id: string
  _rev?: string | null
  status?: string | null
  closedAt?: string | null
  closedValue?: number | null
  closeReason?: string | null
  followUpAt?: string | null
  lastContactedAt?: string | null
  attributionChannel?: string | null
  nextStep?: string | null
  interactions?: { _key?: string | null }[] | null
}

export type ContactLogInput = {
  contact: ContactLogContact
  at: string
  by?: string
  statusAfter: string
  channel: string
  outcome?: string
  intel?: string
  nextStep?: string
  offerKey?: string
  offerTitle?: string
  evidenceIds?: string[]
  value?: number
  followUpDays: number | null
  now: Date
  /** A deterministic interaction key, so a retried write can be recognised. Random when absent. */
  key?: string
}

/**
 * One patch's worth of change. Applied as
 * `setIfMissing({interactions: []}) → set → unset → ifRevisionId → insert after interactions[-1]`.
 */
export type ContactLogWrite = {
  set: Record<string, unknown>
  unset: string[]
  entry: Record<string, unknown>
  ifRevisionId?: string
  /** The follow-up date this write sets, if any — for the confirmation line. */
  followUpAt?: string
  /** The contact ends Won, Lost or Closed. */
  terminal: boolean
}

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/**
 * Exactly what the Studio's call-log form writes; `saveLog` in
 * OutreachWorkspace.tsx is now a caller of this.
 *
 * Why each branch is the way it is:
 * - A terminal status closes the contact: `closedAt` is the log's time and the
 *   outcome is the close reason. Lost records a closed value of 0 so a pipeline
 *   total never counts the estimate of a deal that did not happen.
 * - A terminal status also clears the next step and the follow-up. A closed
 *   contact must not keep resurfacing on somebody's call list.
 * - A NON-terminal status sheds any closed fields left from before, which is
 *   how a lost contact that picks up again stops reporting a stale close date.
 * - Next step and follow-up are replaced, not merged: the form shows the
 *   current next step pre-filled, so an empty field means the person cleared it.
 */
export function buildContactLogWrite(input: ContactLogInput): ContactLogWrite {
  const { contact, at, statusAfter, channel } = input
  const outcome = trimmed(input.outcome)
  const intel = trimmed(input.intel)
  const nextStep = trimmed(input.nextStep)
  const value =
    typeof input.value === 'number' && Number.isFinite(input.value) && input.value >= 0 ? input.value : undefined
  const evidenceIds = [...new Set((input.evidenceIds || []).filter(Boolean))].slice(0, 10)
  const terminal = isTerminal(statusAfter)

  const entry = buildInteractionEntry({
    key: input.key,
    at,
    by: input.by,
    outcome: outcome || undefined,
    intel: intel || undefined,
    nextStep: terminal ? undefined : nextStep || undefined,
    statusAfter,
    channel,
    offerKey: input.offerKey,
    offerTitle: input.offerTitle,
    evidenceIds,
    value,
  })

  // Key order matches the original handler, so the patch is byte-identical.
  const set: Record<string, unknown> = { status: statusAfter, lastContactedAt: at }
  set.attributionChannel = channel
  if (input.offerKey) set.attributedOfferKey = input.offerKey
  if (input.offerTitle) set.attributedOfferTitle = input.offerTitle
  if (evidenceIds.length > 0) set.attributedEvidenceIds = evidenceIds
  if (value !== undefined) {
    if (statusAfter === 'won') set.closedValue = value
    else set.estimatedValue = value
  }
  if (statusAfter === 'lost') set.closedValue = 0
  if (terminal) {
    set.closedAt = at
    if (outcome) set.closeReason = outcome
  }
  if (!terminal && nextStep) set.nextStep = nextStep
  if (!terminal && input.followUpDays !== null) {
    set.followUpAt = new Date(input.now.getTime() + input.followUpDays * 86400000).toISOString()
  }

  const unset: string[] = []
  if (terminal || !nextStep) unset.push('nextStep')
  if (terminal || input.followUpDays === null) unset.push('followUpAt')
  if (!terminal && (contact.closedAt || typeof contact.closedValue === 'number' || contact.closeReason)) {
    unset.push('closedAt', 'closedValue', 'closeReason')
  }

  return {
    set,
    unset,
    entry,
    ...(contact._rev ? { ifRevisionId: contact._rev } : {}),
    ...(typeof set.followUpAt === 'string' ? { followUpAt: set.followUpAt } : {}),
    terminal,
  }
}

// ---- The one-press log from Slack ----------------------------------------

const NOTES_MAX = 2000

/**
 * A call logged from Slack: an outcome, optional notes, a follow-up choice.
 *
 * Two deliberate differences from the Studio form, both because nobody is
 * looking at the record while pressing the button:
 *
 * - The contact's existing next step is carried forward, exactly as the Studio
 *   form does by pre-filling it. A one-press log has no field in which to
 *   change it, so it must not quietly erase it.
 * - On a contact that is already Won, Lost or Closed and STAYS that way, the
 *   log records the touch and nothing else. Re-running the terminal branch
 *   would restamp the close date and overwrite the close reason — rewriting
 *   when a deal closed because somebody rang them afterwards.
 *
 * `reversible` is false when the Undo button could not carry enough to put
 * the contact back exactly (in practice: a close reason too long for Slack's
 * button). The write is still correct — it is what the Studio form would do —
 * but it should go through the form, not a one-press log.
 */
export function buildQuickCallLog(input: {
  contact: ContactLogContact
  outcomeKey: CallOutcomeKey
  notes?: string
  followUp?: string
  by: string
  now: Date
  key: string
}): ContactLogWrite & { statusAfter: string; outcomeLabel: string; undo: CallLogUndo; reversible: boolean } {
  const { contact, now } = input
  const outcome = outcomeFor(input.outcomeKey)
  const at = now.toISOString()
  const by = trimmed(input.by)
  const notes = trimmed(input.notes).slice(0, NOTES_MAX)
  const current = contact.status || undefined
  const statusAfter = resolveStatusAfter(current, outcome.status, outcome.progress)

  const undo: CallLogUndo = {
    contactId: contact._id,
    interactionKey: '',
    prior: {
      status: contact.status || '',
      followUpAt: contact.followUpAt || '',
      lastContactedAt: contact.lastContactedAt || '',
      attributionChannel: contact.attributionChannel || '',
      nextStep: contact.nextStep || '',
    },
  }

  let write: ContactLogWrite
  if (isTerminal(current) && statusAfter === current) {
    const entry = buildInteractionEntry({
      key: input.key,
      at,
      by: by || undefined,
      outcome: outcome.label,
      intel: notes || undefined,
      statusAfter,
      channel: outcome.channel,
    })
    write = {
      set: { lastContactedAt: at },
      unset: [],
      entry,
      ...(contact._rev ? { ifRevisionId: contact._rev } : {}),
      terminal: true,
    }
  } else {
    write = buildContactLogWrite({
      contact,
      at,
      by: by || undefined,
      statusAfter,
      channel: outcome.channel,
      outcome: outcome.label,
      intel: notes,
      nextStep: contact.nextStep || undefined,
      followUpDays: resolveFollowUpDays(input.outcomeKey, input.followUp),
      now,
      key: input.key,
    })
    // "Not a fit" is a judgement somebody will want to revisit; say who made
    // it and where, so it is not mistaken for a decision taken in the Studio.
    if (input.outcomeKey === 'notAFit' && write.terminal) {
      write.set.closeReason = `Not a fit (logged in Slack${by ? ` by ${by}` : ''})${notes ? `: ${notes}` : ''}`
    }
  }

  // The close travels with the Undo only when this log changed it, and only
  // when it fits: a clipped close reason restored by Undo would silently lose
  // its tail, so an oversized one is not carried and Undo refuses instead.
  const touchesClose = CLOSED_FIELDS.some((field) => field in write.set || write.unset.includes(field))
  const priorReason = contact.closeReason || ''
  if (touchesClose && priorReason.length <= CALL_LOG_UNDO_CLOSE_REASON_MAX) {
    undo.prior.closedAt = contact.closedAt || ''
    undo.prior.closedValue =
      typeof contact.closedValue === 'number' && Number.isFinite(contact.closedValue) ? contact.closedValue : null
    undo.prior.closeReason = priorReason
  }
  const finalUndo: CallLogUndo = { ...undo, interactionKey: String(write.entry._key) }

  return {
    ...write,
    statusAfter,
    outcomeLabel: outcome.label,
    undo: finalUndo,
    reversible: undoSurvivesTheButton(contact, write, finalUndo, touchesClose),
  }
}

/**
 * Would the Undo, after travelling through a Slack button, put back every field
 * this write changed? Checked by actually encoding and decoding it, so the
 * answer cannot drift from the codec's caps.
 *
 * The next step is the one field allowed to arrive clipped, and only when the
 * write left it exactly as it was: Undo then sees the full text still on the
 * record and keeps it (see `buildCallLogUndoWrite`).
 */
function undoSurvivesTheButton(
  contact: ContactLogContact,
  write: ContactLogWrite,
  undo: CallLogUndo,
  touchesClose: boolean,
): boolean {
  const back = decodeCallLogUndo(encodeCallLogUndo(undo))
  if (!back || back.contactId !== undo.contactId || back.interactionKey !== undo.interactionKey) return false
  const { prior } = undo
  if (
    back.prior.status !== prior.status ||
    back.prior.followUpAt !== prior.followUpAt ||
    back.prior.lastContactedAt !== prior.lastContactedAt ||
    back.prior.attributionChannel !== prior.attributionChannel
  ) {
    return false
  }
  const nextStepUntouched = write.set.nextStep === (contact.nextStep ?? undefined) && !write.unset.includes('nextStep')
  const touchOnly = !('nextStep' in write.set) && !write.unset.includes('nextStep')
  if (back.prior.nextStep !== prior.nextStep && !nextStepUntouched && !touchOnly) return false
  if (touchesClose) {
    if (prior.closedAt === undefined || back.prior.closedAt !== prior.closedAt) return false
    if (back.prior.closedValue !== prior.closedValue || back.prior.closeReason !== prior.closeReason) return false
  }
  return true
}

/**
 * Can a one-press log of this outcome on this contact be undone from Slack?
 *
 * For the conversation path: when somebody writes "called Jane, no answer"
 * and Marqueta is about to log it straight away, a `false` here means open the
 * log form instead — the form's write is the same, but it is a deliberate one.
 */
export function quickLogIsReversible(contact: ContactLogContact, outcomeKey: CallOutcomeKey): boolean {
  return buildQuickCallLog({ contact, outcomeKey, by: '', now: new Date(0), key: 'reversibility-check' }).reversible
}

/** Keys pass through `buildInteractionEntry`'s cleaning, so compare them the same way. */
const interactionKey = (key: unknown) => (typeof key === 'string' ? key.trim().slice(0, 120) : '')

/**
 * Has this exact log already been written? Slack retries a slow request and a
 * person double-taps; the deterministic key makes the second one a no-op
 * instead of a second, identical touch in the history and the pulse.
 */
export function alreadyLogged(contact: ContactLogContact, key: string): boolean {
  const wanted = interactionKey(key)
  if (!wanted) return false
  return (contact.interactions || []).some((interaction) => interactionKey(interaction?._key) === wanted)
}

const statusTitle = (status: string) =>
  (OUTREACH_STATUS_OPTIONS.find((option) => option.value === status)?.title || status).split(' — ')[0]

/**
 * The patch that puts a contact back as it was before a quick log.
 *
 * It refuses — and says why — rather than restore over somebody else's work:
 *
 * - Only the LAST interaction can be undone. If anything was logged after it,
 *   the prior values in the button are no longer the prior values.
 * - A log that reopened or re-closed a Won, Lost or Closed contact is undone
 *   only when the button carried that contact's close (date, value, reason) —
 *   `buildQuickCallLog` includes it whenever it fits. A button without it
 *   (an oversized close reason, or one minted before the close travelled)
 *   refuses: restoring the status alone would leave a Lost contact with no
 *   close date, which is worse than the mistake.
 *
 * A field whose prior value was empty is unset again, not set to "". A next
 * step is never overwritten with a PREFIX of itself: the button caps what it
 * carries, and a quick log never lengthens a next step, so a longer current
 * value is the full text of a clipped prior (or an edit made since) — either
 * way it is the one to keep.
 */
export function buildCallLogUndoWrite(
  contact: ContactLogContact & { interactions?: { _key?: string | null }[] | null },
  undo: CallLogUndo,
): { ok: true; set: Record<string, unknown>; unset: string[]; removeKey: string } | { ok: false; reason: string } {
  if (contact._id !== undo.contactId) {
    return { ok: false, reason: 'That undo belongs to a different contact — change it in the Studio.' }
  }
  const key = interactionKey(undo.interactionKey)
  const interactions = contact.interactions || []
  if (!key || !interactions.some((interaction) => interactionKey(interaction?._key) === key)) {
    return { ok: false, reason: 'That call is no longer on the record — it may already have been undone.' }
  }
  if (interactionKey(interactions[interactions.length - 1]?._key) !== key) {
    return { ok: false, reason: 'Something else was logged since — change it in the Studio' }
  }

  const priorStatus = undo.prior.status
  const currentStatus = contact.status || ''
  const closeCarried = undo.prior.closedAt !== undefined
  if (!closeCarried && isTerminal(priorStatus) && currentStatus !== priorStatus) {
    return {
      ok: false,
      reason: `They were marked ${statusTitle(priorStatus)} before this call, and Slack can't put the closing details back — change it in the Studio.`,
    }
  }

  const set: Record<string, unknown> = {}
  const unset: string[] = []
  const restore = (field: 'status' | 'followUpAt' | 'lastContactedAt' | 'attributionChannel' | 'nextStep') => {
    const prior = undo.prior[field]
    if (!prior) {
      unset.push(field)
      return
    }
    const currentValue = contact[field]
    if (
      field === 'nextStep' &&
      typeof currentValue === 'string' &&
      currentValue.length > prior.length &&
      currentValue.startsWith(prior)
    ) {
      return
    }
    set[field] = prior
  }
  restore('status')
  restore('followUpAt')
  restore('lastContactedAt')
  restore('attributionChannel')
  restore('nextStep')

  if (closeCarried) {
    // Put the close back exactly: the loss a reopen shed, or the absence of
    // one that "Not a fit" stamped on a live contact.
    const { closedAt, closedValue, closeReason } = undo.prior
    if (closedAt) set.closedAt = closedAt
    else unset.push('closedAt')
    if (typeof closedValue === 'number') set.closedValue = closedValue
    else unset.push('closedValue')
    if (closeReason) set.closeReason = closeReason
    else unset.push('closeReason')
  } else if (!isTerminal(priorStatus) && isTerminal(currentStatus)) {
    // An older button with no close on it: the log closed a live contact
    // ("Not a fit"), so take back the close it stamped.
    unset.push('closedAt', 'closeReason')
  }

  return { ok: true, set, unset, removeKey: key }
}

// ---- The modal -----------------------------------------------------------

const plain = (text: string) => ({ type: 'plain_text', text })

/**
 * "How did it go?" — three questions, one required.
 *
 * Built to be answered in the ten seconds after hanging up: the outcome is a
 * pick-list, notes are optional, and the follow-up defaults to what the
 * outcome implies. When the person already said what happened ("left her a
 * voicemail"), the form opens with that chosen and their words in the notes.
 */
export function buildCallLogView(input: {
  contactLabel: string
  metadata: string
  prefillNotes?: string
  prefillOutcome?: CallOutcomeKey
}): Record<string, unknown> {
  const label = clipSlackText(escapeSlackText(trimmed(input.contactLabel) || 'this contact'), 500)
  const outcomeIndex = isCallOutcomeKey(input.prefillOutcome)
    ? CALL_OUTCOMES.findIndex((outcome) => outcome.key === input.prefillOutcome)
    : -1
  const notes = trimmed(input.prefillNotes).slice(0, NOTES_MAX)

  // initial_option is the very object in `options`: Slack rejects a view
  // whose initial option differs from its match in any byte.
  const outcomeOptions = CALL_OUTCOMES.map((outcome) => ({ text: plain(outcome.label), value: outcome.key }))
  const followUpOptions = FOLLOW_UP_CHOICES.map((choice) => ({ text: plain(choice.label), value: choice.value }))

  return {
    type: 'modal',
    callback_id: CALL_LOG_CALLBACK,
    title: plain('How did it go?'),
    submit: plain('Log it'),
    close: plain('Cancel'),
    private_metadata: input.metadata,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `Logging a touch with *${label}*.` },
      },
      {
        type: 'input',
        block_id: CALL_OUTCOME_BLOCK,
        label: plain('What happened?'),
        element: {
          type: 'static_select',
          action_id: CALL_OUTCOME_INPUT,
          placeholder: plain('Pick one'),
          options: outcomeOptions,
          ...(outcomeIndex >= 0 ? { initial_option: outcomeOptions[outcomeIndex] } : {}),
        },
      },
      {
        type: 'input',
        block_id: CALL_NOTES_BLOCK,
        optional: true,
        label: plain('Anything worth remembering?'),
        element: {
          type: 'plain_text_input',
          action_id: CALL_NOTES_INPUT,
          multiline: true,
          max_length: NOTES_MAX,
          ...(notes ? { initial_value: notes } : {}),
        },
      },
      {
        type: 'input',
        block_id: CALL_FOLLOW_UP_BLOCK,
        optional: true,
        label: plain('Follow up'),
        element: {
          type: 'static_select',
          action_id: CALL_FOLLOW_UP_INPUT,
          options: followUpOptions,
          initial_option: followUpOptions[0],
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'This goes on their outreach history. Nothing is sent to them.',
          },
        ],
      },
    ],
  }
}

type SubmittedValues =
  | Record<string, Record<string, { value?: string | null; selected_option?: { value?: string } | null }>>
  | undefined

/** What the person chose. Anything malformed reads as "not chosen", never as a guess. */
export function readCallLogSubmission(values: SubmittedValues): {
  outcomeKey: CallOutcomeKey | null
  notes: string
  followUp: string
} {
  const outcome = values?.[CALL_OUTCOME_BLOCK]?.[CALL_OUTCOME_INPUT]?.selected_option?.value
  const notes = values?.[CALL_NOTES_BLOCK]?.[CALL_NOTES_INPUT]?.value
  const followUp = values?.[CALL_FOLLOW_UP_BLOCK]?.[CALL_FOLLOW_UP_INPUT]?.selected_option?.value
  return {
    outcomeKey: isCallOutcomeKey(outcome) ? outcome : null,
    notes: trimmed(notes).slice(0, NOTES_MAX),
    followUp: isFollowUpChoice(followUp) ? followUp : 'default',
  }
}

// ---- Reading an outcome from what somebody wrote -------------------------

/** A touch that did not reach anyone: what happened is only that we tried. */
const ATTEMPTS = new Set<CallOutcomeKey>(['noAnswer', 'voicemail', 'emailed'])

/**
 * A question, a guess or a hope, up to 30 characters back in the same clause.
 * "Left a voicemail, she might be interested" reports a voicemail; the rest is
 * the caller's hunch, and a hunch must not move a contact to Responded.
 */
const DOUBT = String.raw`\b(?:if|whether|not sure|unsure|might|may|could|maybe|probably|perhaps|possibly|think|thought|hope|hoping|guess|wonder|wondering)\b[^.,;!?]{0,30}`

/**
 * A negation earlier in the same clause. Not only the word right before:
 * "couldn't get a meeting booked" and "no meeting booked yet" both put the
 * negation several words back. The clause ends at punctuation or at a word
 * that turns the story ("no answer at first but then booked a meeting").
 */
const NEGATED_CLAUSE = String.raw`(?:\b(?:no|not|nothing|never|nobody|yet|fully)|n't)\b(?:(?!\b(?:but|then|and|so|though|although|finally|eventually)\b)[^.,;!?]){0,40}`

/** A negation right before the verb, allowing one word in between ("not yet emailed"). */
const NEGATED_VERB = String.raw`(?:\bnot|\bnever|\bno|\bnobody|\bno one|n't)(?: \w+)? `

/**
 * "Interested" is the word most often used about somebody who is NOT: "asked
 * if she'd be interested", "I'm keen to follow up", "didn't seem that
 * interested", "no longer wants to talk". Each of those, read as interest,
 * would move a contact to Responded in one press. So a negated form is its own
 * outcome (not a fit), and a question, a doubt or the caller's own enthusiasm
 * is no signal at all.
 */
const INTEREST = new RegExp(
  `(?<!${DOUBT})(?<!\\b(?:i'm|i am|we're|we are) (?:\\w+ )?)\\b(?:interested|keen)\\b` +
    `|(?<!${DOUBT})(?<!(?:\\bno longer|\\bnot|\\bnever|n't) )\\bwants to talk\\b`,
)
/** Closing a contact is the most expensive guess, so "not sure if interested" and "probably not" are not a no. */
const NOT_A_FIT = new RegExp(
  `(?<!${DOUBT})(?:\\bnot (?:a|the) (?:\\w+ )?fit\\b|\\bno interest\\b|(?:\\bnot|\\bnever|\\bno longer|n't)(?: (?!sure\\b)\\w+){0,2} (?:interested|keen)\\b)`,
)

const OUTCOME_PATTERNS: [CallOutcomeKey, RegExp][] = [
  // "Left no message" left nothing.
  [
    'voicemail',
    new RegExp(
      `(?<!${NEGATED_VERB})\\bleft (?:(?!(?:no|nothing)\\b)\\w+ ){0,2}(?:voicemail|voice mail|vm|message|msg)\\b`,
    ),
  ],
  [
    'noAnswer',
    /\b(?:no answer|no pick ?up|(?:no one|nobody) (?:picked up|answered)|didn't pick up|did not pick up|didn't answer|did not answer|went to (?:voicemail|voice mail|vm))\b/,
  ],
  ['emailed', new RegExp(`(?<!${NEGATED_VERB})\\b(?:emailed|sent (?:an|a) email|dropped (?:\\w+ )?a note)\\b`)],
  // Not "fully booked" (they are busy), and nothing negated earlier in the clause.
  [
    'meeting',
    new RegExp(`(?<!${NEGATED_CLAUSE})(?:\\bbooked\\b|\\bmeeting (?:is )?set\\b|\\bscheduled (?:a|the) (?:call|meeting)\\b)`),
  ],
  ['notAFit', NOT_A_FIT],
  // "Will circle back" is the caller's own plan; "she said circle back after the holidays" is theirs.
  [
    'notNow',
    /\b(?:not now|not right now|next quarter|(?<!\b(?:i'll|i will|we'll|we will|will|i'd|we'd|i should|we should|should|need to|going to|gonna|let me|plan to|i can|we can) )circle back|after (?:the )?(?:holidays|budget))\b/,
  ],
  ['interested', INTEREST],
  // A referral names somebody ELSE saying where to go. "Sent me to voicemail"
  // is no referral, and "try reaching her again" is the caller's plan, not a
  // pointer — so "try reaching" counts only when somebody said or suggested it.
  [
    'referred',
    /\b(?:pointed me|referred me|sent me to(?! (?:voicemail|voice mail|vm)\b)|(?:said|says|told (?:me|us)|suggested)(?: (?:that )?(?:i|we))?(?: to)? try(?:ing)? (?:talking to|reaching|calling|emailing|contacting))\b/,
  ],
]

/**
 * Evidence that somebody was actually reached: they spoke, replied, picked up
 * or called back. Only this lets a reached outcome outrank an attempt — without
 * it, "no answer, she might be interested" or "emailed her about next quarter"
 * mentions an outcome nobody told us. "I called back" is the caller trying
 * again, and "never called back" is the opposite of evidence.
 */
const REACHED = new RegExp(
  `(?<!${NEGATED_VERB})\\b(?:spoke|spoken|speaking|talked|chatted|got through|picked up|answered|replied|responded|wrote back|got back to (?:me|us)|(?:she|he|they) (?:said|says|told|wants|asked|pointed|referred))\\b` +
    `|(?<!${NEGATED_VERB})(?<!\\b(?:i|we)(?: then| just)? )\\b(?:called|rang|emailed|texted|messaged) (?:me |us )?back\\b`,
)

/** Outcomes that make another one moot when both are mentioned. */
const OUTRANKS: [CallOutcomeKey, CallOutcomeKey][] = [
  ['voicemail', 'noAnswer'], // "went to voicemail, left a message"
  ['notAFit', 'interested'], // "not interested" contains "interested"
  ['meeting', 'interested'], // interested AND booked is a meeting
  ['meeting', 'notNow'], // "booked a meeting for next quarter"
  ['notNow', 'interested'], // "interested, but after the budget" is a not-now
]

/**
 * A best guess at the outcome from a message like "called Jane, left a
 * voicemail", used to pre-select the log form or to log straight away.
 *
 * Deliberately timid. It returns undefined whenever two readings survive —
 * "no answer, so I emailed" could be either — because a wrong guess logged in
 * one press is worse than a form with the answer already half filled in.
 *
 * When a message names both an attempt and something only a conversation
 * could produce, the attempt is the fact and the rest is usually a plan, a
 * topic or a hunch: "no answer, will circle back", "emailed her about next
 * quarter". So what the person REACHED outranks what they merely tried only
 * when the message shows somebody actually answered ("emailed her, she wants
 * to talk", "left a voicemail and she called back interested"); otherwise the
 * guess is undefined and the form asks. A short list of pairs where one
 * reading contains the other settles the rest.
 *
 * Expects text already decoded from Slack's escaping (`decodeSlackText`).
 */
export function guessCallOutcome(text: string): CallOutcomeKey | undefined {
  const lower = String(text || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  if (!lower) return undefined

  const found = new Set<CallOutcomeKey>()
  for (const [key, pattern] of OUTCOME_PATTERNS) if (pattern.test(lower)) found.add(key)
  // "Went to voicemail" is no answer — unless they left one. Not any "left":
  // "she left the company, no answer" left nobody a message.
  if (found.has('noAnswer') && /\bleft (?:her |him |them )?one\b/.test(lower)) found.add('voicemail')

  const attempts = [...found].filter((key) => ATTEMPTS.has(key))
  if (attempts.length > 0 && attempts.length < found.size) {
    if (!REACHED.test(lower)) return undefined
    for (const attempt of attempts) found.delete(attempt)
  }
  for (const [winner, loser] of OUTRANKS) if (found.has(winner)) found.delete(loser)

  return found.size === 1 ? [...found][0] : undefined
}
