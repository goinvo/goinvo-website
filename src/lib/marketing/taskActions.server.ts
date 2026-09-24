/**
 * What the check-in's buttons actually do to a task.
 *
 * Each press is one small, reversible change — Done ⇄ Reopen, Take ⇄ Hand
 * back, Drop ⇄ Reopen, Stuck ⇄ Unstuck — and each returns the task as it now
 * stands, so the route can redraw exactly that card from the record rather
 * than from a guess about what the press probably did.
 *
 * Why the writes look the way they do:
 *
 * - **Status moves go through `buildOperationStatusPatch`.** It refuses moves
 *   the board would refuse (a task in progress cannot be dismissed; a done task
 *   only reopens to queued), stamps and unstamps `completedAt`, and appends the
 *   same activity entry the Studio's own route writes. A press in Slack leaves
 *   the record the Studio would have left.
 * - **Every write is conditional on the revision it was built from**
 *   (`ifRevisionId`). Two people pressing on one card within a second must not
 *   each apply their change to a state that no longer exists. On a conflict the
 *   task is read again and the change rebuilt ONCE; a second conflict is
 *   reported, not forced.
 * - **A repeated press is a no-op.** Slack retries a slow interaction, and
 *   people double-tap. A press whose effect is already true (done on a done
 *   task) changes nothing, and the same action by the same person within two
 *   minutes is treated as the same press — otherwise "Keep — next week" pressed
 *   twice would quietly move a task two weeks.
 * - **Nothing is assigned on anybody's behalf.** Take sets the presser as the
 *   owner and nobody else; hand back (and the digest's "Not me") clears the
 *   owner rather than choosing a new one; a task somebody else owns cannot be
 *   handed back from under them in a shared channel, nor taken by the
 *   check-in's Take. The one way to move a colleague's task is the digest
 *   card's explicitly labelled "Take it over", which puts the PRESSER's own
 *   name on it (`takeOverTask`).
 * - **Who owns a task is decided by the board name and the roster, never by
 *   the Slack id stamped on the task.** That stamp goes stale (Eric claims in
 *   Slack, the Studio reassigns to Juhan, the task still says Eric's id), and
 *   trusting it would let Eric clear Juhan's name off Juhan's work. When the
 *   answer depends on a roster that cannot be read, Take and Hand back refuse
 *   rather than guess.
 *
 * The fresh task is built by applying the patch to the record that was read —
 * exact, because the write only succeeds if that record was current — and its
 * Slack id comes from the roster first (availability), the task's own stored
 * id only as a last resort (see team.server.ts). That fallback is for drawing
 * the card, and only for drawing the card.
 *
 * Tasks live in the private outreach dataset; every read and write goes
 * through `getOutreachClient`.
 */
import 'server-only'
import { isRevisionConflict } from './apiBoundary'
import type { TeamMemberAvailability } from './availability'
import {
  buildOperationStatusPatch,
  MARKETING_OPERATION_TYPE,
  type MarketingOperationActivity,
  type MarketingOperationStatus,
} from './operations'
import { getOutreachClient } from './outreachClient.server'
import { ASK_HISTORY_KIND, askHistoryEntry } from './slackDelegation'
import { loadTeamAvailability, slackIdForOwner } from './team.server'
import type { CheckInTask } from './weeklyCheckIn'

export type TaskActionInput = {
  taskId: string
  /** The presser's BOARD name (resolvePresserName), never a raw Slack display name. */
  personName: string
  slackUserId: string
  now?: Date
}

export type TaskActionResult = {
  ok: boolean
  /** One plain-text sentence; the caller escapes it. */
  message?: string
  /** The task as it stands after the press (or as it stood, when nothing changed). */
  task?: CheckInTask
  /** False when the press changed nothing (already true, or a repeat of the same press). */
  changed?: boolean
  /** Who owned it and where it stood when the press was read — what an undo would restore. */
  before?: { ownerName: string; status: string }
}

type StoredTask = {
  _id: string
  _rev?: string
  _createdAt?: string
  _updatedAt?: string
  title?: string
  ownerName?: string
  ownerSlackUserId?: string
  status?: string
  kind?: string
  priority?: string
  dueAt?: string
  estimatedMinutes?: number
  blocker?: string
  humanQuestion?: string
  lastOutcome?: string
  sourceKey?: string
  activity?: MarketingOperationActivity[] | null
  /** Keys already in `askHistory`, so a repeated pass appends nothing. */
  askKeys?: (string | null)[] | null
}

const TASK_QUERY = `*[_type == "${MARKETING_OPERATION_TYPE}" && _id == $id][0]{
  _id, _rev, _createdAt, _updatedAt, title, ownerName, ownerSlackUserId, status, kind, priority,
  dueAt, estimatedMinutes, blocker, humanQuestion, lastOutcome, sourceKey, activity,
  "askKeys": askHistory[]._key
}`

/**
 * What a press decided: write this, or leave the task alone and say why.
 *
 * `append` adds entries to the end of an array field (created when missing) in
 * the SAME conditional write as the status change — so "Eric passed on this"
 * and "Eric is in the ask history" cannot land one without the other.
 */
type Plan =
  | {
      kind: 'write'
      set: Record<string, unknown>
      unset: string[]
      message: string
      append?: { field: string; items: Record<string, unknown>[] }
    }
  | { kind: 'noop'; message: string }
  | { kind: 'refuse'; message: string }

/**
 * The availability records, or null when they could not be read. The two are
 * different facts — "nobody has linked their Slack yet" versus "I don't know
 * who anybody is" — and only the second must stop an ownership decision.
 */
type Roster = TeamMemberAvailability[] | null

const DAY_MS = 86_400_000
/** A second identical press inside this window is the same press. */
const REPEAT_WINDOW_MS = 2 * 60 * 1000

const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const same = (a: unknown, b: unknown) => text(a).toLowerCase() === text(b).toLowerCase()
const CLOSED = new Set(['done', 'dismissed'])

const statusOf = (task: StoredTask): MarketingOperationStatus =>
  (text(task.status) || 'queued') as MarketingOperationStatus

/** Did this person just do exactly this? (Slack retry or a double-tap.) */
function repeatOf(task: StoredTask, action: string, now: Date): boolean {
  const last = (task.activity || [])[(task.activity || []).length - 1]
  if (!last || last.action !== action) return false
  const at = Date.parse(last.at)
  return Number.isFinite(at) && Math.abs(now.getTime() - at) <= REPEAT_WINDOW_MS
}

/**
 * The status write for `to`, with the bookkeeping. Null means the board would
 * not accept the move — callers turn that into a sentence, never a forced write.
 */
function move(
  task: StoredTask,
  to: MarketingOperationStatus,
  opts: { now: Date; action: string; outcome?: string; set?: Record<string, unknown>; unset?: string[] },
) {
  return buildOperationStatusPatch(
    { status: task.status, activity: task.activity || [] },
    to,
    { now: opts.now, actor: 'person', action: opts.action, outcome: opts.outcome, set: opts.set, unset: opts.unset },
  )
}

function toCheckInTask(task: StoredTask, entries: TeamMemberAvailability[]): CheckInTask {
  const slackUserId = slackIdForOwner(entries, task.ownerName, task.ownerSlackUserId)
  return {
    _id: task._id,
    title: text(task.title) || 'Untitled task',
    ...(text(task.ownerName) ? { ownerName: text(task.ownerName) } : {}),
    ...(slackUserId ? { slackUserId } : {}),
    ...(task.status ? { status: task.status } : {}),
    ...(task.kind ? { kind: task.kind } : {}),
    ...(task.priority ? { priority: task.priority } : {}),
    ...(task.dueAt ? { dueAt: task.dueAt } : {}),
    ...(typeof task.estimatedMinutes === 'number' ? { minutes: task.estimatedMinutes } : {}),
    ...(text(task.blocker) ? { blocker: task.blocker } : {}),
    ...(text(task.humanQuestion) ? { humanQuestion: task.humanQuestion } : {}),
    ...(text(task.lastOutcome) ? { lastOutcome: task.lastOutcome } : {}),
    ...(task._updatedAt ? { updatedAt: task._updatedAt } : {}),
    ...(task._createdAt ? { createdAt: task._createdAt } : {}),
    ...(task.sourceKey ? { sourceKey: task.sourceKey } : {}),
  }
}

/** The record after the patch — exact, because the write only lands on the revision it was built from. */
function applied(task: StoredTask, set: Record<string, unknown>, unset: string[], now: Date): StoredTask {
  const next: Record<string, unknown> = { ...task, ...set, _updatedAt: now.toISOString() }
  for (const field of unset) delete next[field]
  return next as StoredTask
}

/**
 * The roster, or null when it cannot be read.
 *
 * Done, Stuck, Reopen, Drop and Keep do not depend on who owns the task, so for
 * them an unreadable roster only costs the card's mention id and the write goes
 * ahead. Take and Hand back DO depend on it, and treat null as "could not
 * check" — never as an empty roster, which would quietly make the task's stamped
 * id the only evidence of ownership, exactly when it is least trustworthy.
 */
async function roster(): Promise<Roster> {
  try {
    return await loadTeamAvailability()
  } catch (error) {
    console.error('[marqueta] could not read the team roster', error)
    return null
  }
}

/** Where the presser stands relative to the task's owner. */
type Ownership = 'unowned' | 'presser' | 'someoneElse' | 'unknown'

const couldNotCheck = 'I couldn’t check who owns that one just now — try again in a minute.'

/**
 * Is the presser the task's owner?
 *
 * When the roster links the owner's name to a Slack id, that id decides: it
 * recognises a linked person whose display name differs from their board name,
 * and it stops a different person whose display name merely EQUALS the owner's
 * board name. Otherwise by board name — `personName` is already resolved
 * against the roster (resolvePresserName), and it is what Take writes, so an
 * owner who is not on the roster is still recognised as themselves.
 *
 * NEVER by `ownerSlackUserId`. That id was stamped when somebody last claimed
 * the task in Slack and nothing clears it on a reassignment in the Studio, so
 * on a reassigned task it names the PREVIOUS owner. As a mention it is an
 * acceptable last resort (a misdirected ping); as proof of ownership it would
 * let the previous owner hand back — clear the name off — the new owner's work,
 * and would tell them a colleague's task is "already yours".
 *
 * 'unknown' when only the roster could answer and it could not be read.
 */
function ownership(task: StoredTask, input: TaskActionInput, entries: Roster): Ownership {
  if (!text(task.ownerName)) return 'unowned'
  const presserId = text(input.slackUserId)
  // No task id passed: the roster's answer for this name, or none.
  const rosterId = entries ? slackIdForOwner(entries, task.ownerName, null) : undefined
  if (rosterId && presserId) return rosterId === presserId ? 'presser' : 'someoneElse'
  if (same(task.ownerName, input.personName)) return 'presser'
  return entries ? 'someoneElse' : 'unknown'
}

/**
 * Read, plan, write conditionally, retry once on a conflict, and hand back the
 * fresh task. Every action below is only its `plan`.
 */
async function runTaskAction(
  input: TaskActionInput,
  plan: (task: StoredTask, now: Date, entries: Roster) => Plan,
): Promise<TaskActionResult> {
  const now = input.now || new Date()
  const taskId = text(input.taskId)
  if (!taskId) return { ok: false, message: 'I don’t know which task that was.' }
  try {
    const client = getOutreachClient()
    const entries = await roster()
    // For drawing the card only: without a roster the stamped id is all there is.
    const drawWith = entries || []
    let task = await client.fetch<StoredTask | null>(TASK_QUERY, { id: taskId })
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!task) return { ok: false, message: 'That task no longer exists.' }
      const before = { ownerName: text(task.ownerName), status: statusOf(task) }
      const decision = plan(task, now, entries)
      if (decision.kind === 'refuse') return { ok: false, message: decision.message, task: toCheckInTask(task, drawWith), before }
      if (decision.kind === 'noop') {
        return { ok: true, changed: false, message: decision.message, task: toCheckInTask(task, drawWith), before }
      }

      const append = decision.append?.items.length ? decision.append : null
      let patch = client.patch(task._id)
      if (append) patch = patch.setIfMissing({ [append.field]: [] })
      patch = patch.set(decision.set)
      if (decision.unset.length) patch = patch.unset(decision.unset)
      if (append) patch = patch.insert('after', `${append.field}[-1]`, append.items)
      if (task._rev) patch = patch.ifRevisionId(task._rev)
      try {
        await patch.commit()
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        if (attempt === 0) {
          task = await client.fetch<StoredTask | null>(TASK_QUERY, { id: taskId })
          continue
        }
        break
      }
      return {
        ok: true,
        changed: true,
        message: decision.message,
        task: toCheckInTask(applied(task, decision.set, decision.unset, now), drawWith),
        before,
      }
    }
    return { ok: false, message: 'Somebody else changed that task at the same moment. Try again in a second.' }
  } catch (error) {
    console.error('[marqueta] task action failed', error)
    return { ok: false, message: 'I couldn’t update that task. The Studio’s This week tab can.' }
  }
}

const closedMessage = 'It’s already closed — press Reopen first.'

/** Done. The one press most worth making easy. */
export function markTaskDone(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  return runTaskAction(input, (task, now) => {
    if (statusOf(task) === 'done') return { kind: 'noop', message: 'Already done.' }
    const write = move(task, 'done', {
      now,
      action: 'Marked done in Slack',
      outcome: `By ${person}`,
      set: { lastOutcome: `Done — said in Slack by ${person}` },
    })
    if (!write) return { kind: 'refuse', message: 'The board won’t mark that one done from where it is — change it in the Studio.' }
    return { kind: 'write', ...write, message: 'Marked done.' }
  })
}

/**
 * Unstuck. A blocked task goes back to working, its blocker cleared. Anything
 * else keeps its status and only gains the note — in particular a task waiting
 * on a person's decision (`needsHuman`) is NEVER moved to working by this: the
 * decision is still owed, and "unstuck" from someone else does not answer it.
 */
export function markTaskUnstuck(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  const action = 'Unstuck in Slack'
  return runTaskAction(input, (task, now) => {
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: closedMessage }
    if (status !== 'blocked' && repeatOf(task, action, now)) return { kind: 'noop', message: 'Already noted.' }
    const write =
      status === 'blocked'
        ? move(task, 'working', {
            now,
            action,
            outcome: `By ${person}`,
            set: { lastOutcome: `Unstuck — said in Slack by ${person}` },
            unset: ['blocker'],
          })
        : move(task, status, {
            now,
            action,
            outcome: `By ${person}`,
            set: { lastOutcome: `Unstuck — said in Slack by ${person}` },
          })
    if (!write) return { kind: 'refuse', message: 'The board won’t move that one from where it is — change it in the Studio.' }
    return { kind: 'write', ...write, message: status === 'blocked' ? 'Back in progress.' : 'Noted.' }
  })
}

/** Stuck, with what is in the way — required, because a blocker nobody wrote down is one nobody can help with. */
export function markTaskStuck(input: TaskActionInput & { blocker: string }): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  const blocker = text(input.blocker).slice(0, 600)
  return runTaskAction(input, (task, now) => {
    if (!blocker) return { kind: 'refuse', message: 'Say what’s in the way and I’ll put it on the task.' }
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: closedMessage }
    if (status === 'blocked' && text(task.blocker) === blocker) return { kind: 'noop', message: 'Already noted.' }
    const write = move(task, 'blocked', {
      now,
      action: 'Marked stuck in Slack',
      outcome: blocker,
      set: { blocker, lastOutcome: `Stuck — said in Slack by ${person}` },
    })
    if (!write) return { kind: 'refuse', message: 'The board won’t mark that one stuck from where it is — change it in the Studio.' }
    return { kind: 'write', ...write, message: 'Marked stuck — what’s in the way is on the task.' }
  })
}

/** Reopen — the reverse of Done and of Drop. */
export function reopenTask(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  return runTaskAction(input, (task, now) => {
    if (!CLOSED.has(statusOf(task))) return { kind: 'noop', message: 'It’s already open.' }
    const write = move(task, 'queued', {
      now,
      action: 'Reopened in Slack',
      outcome: `By ${person}`,
      set: { lastOutcome: `Reopened in Slack by ${person}` },
      // A dropped task may carry a snooze date from the Studio; reopened, it is live now.
      unset: ['dismissedUntil'],
    })
    if (!write) return { kind: 'refuse', message: 'The board won’t reopen that one — change it in the Studio.' }
    return { kind: 'write', ...write, message: 'Reopened.' }
  })
}

/**
 * Hand back: the task goes back to the board with nobody's name on it.
 *
 * Both the owner and the stamped Slack id are cleared — leaving the id is
 * exactly the stale shape that once had Marqueta mention the wrong colleague.
 * The status stays as it is, and a `humanQuestion` is never touched: if the
 * task was waiting on a decision, it still is.
 *
 * Only the owner can hand a task back. In a shared channel anybody can press
 * anybody's button, and clearing a colleague's name off their work without
 * asking is the move this whole feature refuses to make on their behalf. A
 * task with no owner name but a leftover stamped id may be handed back by
 * anyone — that only clears an id the board no longer attaches to anybody.
 */
export function handBackTask(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  return runTaskAction(input, (task, now, entries) => {
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: closedMessage }
    if (!text(task.ownerName) && !text(task.ownerSlackUserId)) return { kind: 'noop', message: 'Nobody has it already.' }
    const who = ownership(task, input, entries)
    if (who === 'unknown') return { kind: 'refuse', message: couldNotCheck }
    if (who === 'someoneElse') {
      return {
        kind: 'refuse',
        message: `That one is ${text(task.ownerName)}’s — only they can hand it back. (Or change it in the Studio.)`,
      }
    }
    const write = move(task, status, {
      now,
      action: 'Handed back in Slack',
      outcome: `By ${person}`,
      set: { lastOutcome: `Handed back in Slack by ${person}` },
      unset: ['ownerName', 'ownerSlackUserId'],
    })
    if (!write) return { kind: 'refuse', message: 'The board won’t accept that change — do it in the Studio.' }
    return { kind: 'write', ...write, message: 'Handed back — anyone can take it.' }
  })
}

/** A task left in needsHuman by the digest's "Not me this week" — an owner search, not a decision. */
const DECLINED_BY_DIGEST = /passed on this/i

/** "Someone" is resolveOwnerName's answer for a presser it could not name. */
const unnamed = (person: string) => !person || /^someone$/i.test(person)
const unnamedMessage = 'I couldn’t tell who you are on the board — link your name from the digest first.'

/**
 * Take, and — from the digest card's "Take it over" — take over.
 *
 * The presser becomes the owner: the resolved board name and their own Slack
 * id, nobody else's. A task the digest parked in needsHuman only because
 * someone passed on it ("Jen passed on this — who should pick it up?") has
 * found its answer: it goes back to queued and the question is cleared. Any
 * other question is a real decision still owed, and stays.
 *
 * `takeOver` is the one difference between the check-in's Take and the
 * digest's card. The check-in never takes a colleague's task from under them;
 * the digest card offers "Take it over" by name on an owned task, and pressing
 * it is the presser putting THEIR OWN name on the work — nothing is assigned on
 * anyone's behalf, and the previous owner is named in the activity entry and
 * in the card's note. Everything else is shared: an unnamed presser is
 * refused rather than filed as "Someone", a closed task is refused, the move
 * goes through the board's transition rules, and the write is conditional on
 * the revision it was built from.
 */
function take(input: TaskActionInput, opts: { takeOver: boolean }): Promise<TaskActionResult> {
  const person = text(input.personName)
  return runTaskAction(input, (task, now, entries) => {
    // Writing "Someone" as an owner would put the task in nobody's list while looking taken.
    if (unnamed(person)) return { kind: 'refuse', message: unnamedMessage }
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: closedMessage }
    const who = ownership(task, input, entries)
    if (who === 'unknown') return { kind: 'refuse', message: couldNotCheck }
    if (who === 'someoneElse' && !opts.takeOver) {
      return { kind: 'refuse', message: `${text(task.ownerName)} already has that one.` }
    }
    const slackUserId = text(input.slackUserId)
    const declined = status === 'needsHuman' && DECLINED_BY_DIGEST.test(text(task.humanQuestion))
    // Owned already means owned by the presser (checked above), so the only
    // thing left to change is a missing or stale Slack id.
    const alreadyMine =
      who === 'presser' && (!slackUserId || text(task.ownerSlackUserId) === slackUserId) && !declined
    if (alreadyMine) return { kind: 'noop', message: 'It’s already yours.' }
    const previousOwner = who === 'someoneElse' ? text(task.ownerName) : ''
    const set = {
      // Recognised as the owner by Slack id under a different name ("Juhan
      // Sonin" pressing on Juhan's task): keep the board's name, or one person
      // becomes two. Taking over from someone else writes the presser's name.
      ownerName: who === 'presser' ? text(task.ownerName) || person : person,
      ...(slackUserId ? { ownerSlackUserId: slackUserId } : {}),
      lastOutcome: previousOwner ? `Taken over from ${previousOwner} in Slack by ${person}` : `Taken in Slack by ${person}`,
    }
    const action = previousOwner ? 'Taken over in Slack' : 'Taken in Slack'
    const outcome = previousOwner ? `By ${person}, from ${previousOwner}` : `By ${person}`
    const write = declined
      ? move(task, 'queued', { now, action, outcome, set, unset: ['humanQuestion'] })
      : move(task, status, { now, action, outcome, set })
    if (!write) return { kind: 'refuse', message: 'The board won’t accept that change — do it in the Studio.' }
    return { kind: 'write', ...write, message: previousOwner ? `It’s yours — taken over from ${previousOwner}.` : 'It’s yours.' }
  })
}

/**
 * Take (the check-in's button): a task somebody else already owns is not taken
 * from them — and "somebody else" is decided without the task's stamped id (see
 * `ownership`), so the previous owner of a reassigned task is told whose it is
 * now, not "It's already yours."
 */
export function takeTask(input: TaskActionInput): Promise<TaskActionResult> {
  return take(input, { takeOver: false })
}

/** The digest card's "I'll take it" / "Take it over" (see `take`). */
export function takeOverTask(input: TaskActionInput): Promise<TaskActionResult> {
  return take(input, { takeOver: true })
}

/**
 * Pass: the digest card's "Not me" on an unclaimed task, and its "Hand it back"
 * on an owned one.
 *
 * The owner is cleared rather than reassigned — picking somebody else without
 * asking them is how a plan loses the team's trust — and the task goes to
 * needsHuman with "<name> passed on this — who should pick it up?", unless it
 * already carries a real question. A DECISION keeps its question: "not me" on
 * a decision means somebody else should answer it, not that the question has
 * become "who should pick this up?". Only an earlier "passed on this" (a chain
 * of people passing is still an owner search) is replaced by the latest name.
 *
 * Three things this does that the first version, a bare read-then-write,
 * could not be trusted to:
 *
 *   - **Only the owner can hand an owned task back** — by roster id, exactly as
 *     the check-in's Hand back decides it. The card is visible to the whole
 *     channel, and anybody could otherwise clear a colleague's name off their
 *     work and record themselves as having passed on it.
 *   - **The passer is remembered by Slack id** in `askHistory`, in the same
 *     conditional write. The next digest never asks them about this task, and
 *     a task two people have answered is offered as "drop it?". Excluding them
 *     by the name in the question missed them whenever Slack's display name
 *     ("Shirley Wu") was not the roster's ("Shirley").
 *   - **The write is conditional on the revision it was built from**, so a Take
 *     or Done landing between the read and the write is not silently undone —
 *     the task is read again and the pass rebuilt once, or refused.
 *
 * `personName` must already be the BOARD name (resolvePresserName); the
 * question and the activity entry name the person the way the board does.
 */
export function passOnTask(input: TaskActionInput & { week?: string }): Promise<TaskActionResult> {
  const person = text(input.personName) || 'Someone'
  const slackUserId = text(input.slackUserId)
  const action = 'Passed on in Slack'
  return runTaskAction(input, (task, now, entries) => {
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: 'That task is already closed — reopen it in the Studio first.' }
    const who = ownership(task, input, entries)
    if (who === 'unknown') return { kind: 'refuse', message: couldNotCheck }
    if (who === 'someoneElse') {
      return {
        kind: 'refuse',
        message: `That one is ${text(task.ownerName)}’s — only they can hand it back. (Or change it in the Studio.)`,
      }
    }
    const question = text(task.humanQuestion)
    const isDecision = text(task.kind) === 'decision' || (question.length > 0 && !DECLINED_BY_DIGEST.test(question))
    const passedQuestion = `${person} passed on this — who should pick it up?`
    const entry = slackUserId
      ? askHistoryEntry({
          taskId: task._id,
          slackUserId,
          at: now.toISOString(),
          week: text(input.week),
          kind: ASK_HISTORY_KIND.passed,
        })
      : null
    const known = new Set((task.askKeys || []).map(text).filter(Boolean))

    // A Slack retry or a double-tap by the SAME person: already unowned, already
    // waiting on an owner, and already on record as theirs. Keyed on the person,
    // not on "the last action was a pass" — a colleague passing a minute later
    // is a second answer, and must be recorded as one.
    const declinedBy = `Declined in Slack by ${person}`
    const theirs = entry ? known.has(entry._key) : text(task.lastOutcome) === declinedBy
    const alreadyPassed =
      !text(task.ownerName) && status === 'needsHuman' && theirs && (isDecision || question === passedQuestion)
    if (alreadyPassed) return { kind: 'noop', message: 'Already passed on.' }
    const write = move(task, 'needsHuman', {
      now,
      action,
      outcome: `By ${person}`,
      set: {
        ownerName: '',
        ...(isDecision ? {} : { humanQuestion: passedQuestion }),
        lastOutcome: declinedBy,
      },
      unset: ['ownerSlackUserId'],
    })
    // The board refuses the move only from a closed state, caught above; kept
    // as a sentence rather than a forced write in case the rules change.
    if (!write) return { kind: 'refuse', message: 'That task is already closed — reopen it in the Studio first.' }
    return {
      kind: 'write',
      ...write,
      ...(entry && !known.has(entry._key) ? { append: { field: 'askHistory', items: [entry] } } : {}),
      message: 'Passed on — it needs another owner.',
    }
  })
}

/** Drop: dismissed, and reversible with Reopen. Only where the board allows it (not mid-progress). */
export function dropTask(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  return runTaskAction(input, (task, now) => {
    const status = statusOf(task)
    if (status === 'dismissed') return { kind: 'noop', message: 'Already dropped.' }
    if (status === 'done') return { kind: 'refuse', message: 'It’s already done.' }
    const write = move(task, 'dismissed', {
      now,
      action: 'Dropped in Slack',
      outcome: `By ${person}`,
      set: { lastOutcome: `Dropped from Slack by ${person}` },
    })
    if (!write) {
      return { kind: 'refuse', message: 'It’s in progress, so it can’t be dropped — mark it done, or hand it back.' }
    }
    return { kind: 'write', ...write, message: 'Dropped. Reopen brings it back.' }
  })
}

/**
 * Keep — next week: the due date moves seven days on from whichever is later,
 * today or the old date, so an overdue task lands next week rather than last.
 */
export function snoozeTask(input: TaskActionInput): Promise<TaskActionResult> {
  const person = text(input.personName) || 'someone'
  const action = 'Kept for next week in Slack'
  return runTaskAction(input, (task, now) => {
    const status = statusOf(task)
    if (CLOSED.has(status)) return { kind: 'refuse', message: closedMessage }
    if (repeatOf(task, action, now)) return { kind: 'noop', message: 'Already moved.' }
    const due = Date.parse(text(task.dueAt))
    const from = Number.isFinite(due) ? Math.max(now.getTime(), due) : now.getTime()
    const dueAt = new Date(from + 7 * DAY_MS).toISOString()
    const write = move(task, status, {
      now,
      action,
      outcome: `By ${person}`,
      set: { dueAt, lastOutcome: `Kept — moved to next week by ${person}` },
    })
    if (!write) return { kind: 'refuse', message: 'The board won’t accept that change — do it in the Studio.' }
    return { kind: 'write', ...write, message: 'Kept — moved to next week.' }
  })
}
