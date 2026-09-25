/**
 * What actually happens when someone presses a button in the Slack digest.
 *
 * Server-only: it writes to the private dataset. Kept out of the interactions
 * route so that route stays a thin dispatcher, the way the chat and dispute
 * handlers already are.
 *
 * Every path here is written to be safe to run twice. Slack retries an
 * interaction it thinks failed, and a retry that appends a second "claimed by"
 * note or double-books a holiday is worse than one that does nothing. The two
 * task-card buttons go through `taskActions.server.ts`, whose writes are
 * conditional on the revision they were built from — a read-then-write here
 * once let a Take landing in between be silently undone.
 */
import { isRevisionConflict } from './apiBoundary'
import {
  TEAM_AVAILABILITY_TYPE,
  availabilityDocId,
  type AvailabilityStatus,
  type TeamMemberAvailability,
} from './availability'
import {
  decodeAvailabilityUndo,
  encodeAvailabilityUndo,
  type AvailabilitySnapshot,
  type AvailabilityUndo,
} from './marquetaActions'
import {
  askMarqueta,
  countLabel,
  errorLine,
  formatSlackDay,
  formatSlackRange,
  slackDayKey,
  STATE_EMOJI,
} from './marquetaStyle'
import { MARKETING_OPERATION_TYPE } from './operations'
import { getOutreachClient } from './outreachClient.server'
import { escapeSlackText, slackMention } from './slackText'
import { answerTask, passOnTask, takeOverTask, takeTask, type TaskActionResult } from './taskActions.server'
import {
  loadTeamAvailability,
  marketingTeamNames,
  OWNED_OPEN_TASKS_QUERY,
  resolveOwnerNameForWrite,
  resolvePresserName,
} from './team.server'
import type { CheckInTask } from './weeklyCheckIn'
import { utcIsoWeekKey } from './weeklyCheckIn.server'

export type MarketingSlackActionResult = {
  ok: boolean
  taskTitle?: string
  message?: string
  /**
   * What the task looked like BEFORE this action.
   *
   * Undo has to restore a specific previous state, not a guessed default:
   * declining a task that was already unowned must not invent an owner, and
   * claiming one that was queued must not send it back to needsHuman.
   */
  previous?: { ownerName: string; status: string }
  /** The task as it stands after the press — what a card is redrawn from. */
  task?: CheckInTask
  /** False when the press changed nothing (a retry, or already true). */
  changed?: boolean
}

const COULD_NOT_READ_TEAM = errorLine('read the team list', 'Try again in a minute.')

/** "Someone" is the resolver's word for a presser it could not name — including a namesake (team.server.ts). */
const unnamed = (name: string) => !name.trim() || /^someone$/i.test(name.trim())
/**
 * Word for word the chat's own refusal (marquetaChat.server.ts) and the
 * interactions route's: one situation, one sentence, wherever it is met. "The
 * team list", never "the board" — Slack copy names places people can find.
 */
const NOT_ON_BOARD_VERB = 'tell which name on the team list is yours'
const NOT_ON_BOARD = errorLine(NOT_ON_BOARD_VERB, 'Pick your name in the Monday plan’s one-time setup, then try again.')

/**
 * The presser's name as the BOARD writes it.
 *
 * The interactions route hands these functions Slack's display name ("Juhan
 * Sonin"), and writing that as an owner splits one person into two: two
 * check-in groups, two loads when the digest decides whom to ask, and an
 * identity prompt that keeps offering a name nobody uses. So the linked roster
 * record decides (`resolvePresserName`), and a roster that cannot be read is a
 * refusal — never a fall back to the display name.
 */
async function boardName(input: { slackUserId?: string; personName: string }): Promise<string | null> {
  try {
    return await resolvePresserName({
      slackUserId: String(input.slackUserId || '').trim() || undefined,
      displayName: String(input.personName || '').trim() || undefined,
    })
  } catch (error) {
    console.error('[slack] could not read the team roster', error)
    return null
  }
}

/**
 * The presser's name for a write that makes them an OWNER (`resolveOwnerNameForWrite`):
 * never a display name the team list does not know. Null when the roster
 * cannot be read; "Someone" when it can and does not know them.
 */
async function ownerBoardName(input: { slackUserId?: string; personName: string }): Promise<string | null> {
  try {
    return await resolveOwnerNameForWrite({
      slackUserId: String(input.slackUserId || '').trim() || undefined,
      displayName: String(input.personName || '').trim() || undefined,
    })
  } catch (error) {
    console.error('[slack] could not read the team roster', error)
    return null
  }
}

function toSlackActionResult(result: TaskActionResult): MarketingSlackActionResult {
  return {
    ok: result.ok,
    ...(result.task?.title ? { taskTitle: result.task.title } : {}),
    ...(result.message ? { message: result.message } : {}),
    ...(result.before ? { previous: result.before } : {}),
    ...(result.task ? { task: result.task } : {}),
    ...(typeof result.changed === 'boolean' ? { changed: result.changed } : {}),
  }
}

/**
 * The digest's legacy "I'll take it" / "Take it over" — attachment cards on
 * Monday plans posted before the shared task card, which stay in the channel
 * for weeks.
 *
 * Goes through the same conditional write as the check-in's Take, so the card
 * no longer does four things the first version did: write Slack's display
 * name as the owner, "take" a task that was already done or dropped,
 * overwrite whatever landed between its read and its write, and leave a task
 * somebody had passed on stuck in needsHuman with the stale "X passed on this
 * — who should pick it up?".
 *
 * `expectedOwner` is the owner the card was drawn with (its value's `o`, ''
 * for a task nobody had). With it, the press takes the task only if it still
 * stands as the card showed it: an unowned card never takes a task somebody
 * picked up since, and "Take it over" never takes from whoever covered it
 * after the card was posted. Without it (a caller that cannot say), the old
 * unconditional take-over.
 */
export async function claimMarketingTask(input: {
  taskId: string
  /** Slack's display name; resolved to the board name here. */
  personName: string
  slackUserId: string
  expectedOwner?: string
}): Promise<MarketingSlackActionResult> {
  const person = await ownerBoardName(input)
  if (person === null) return { ok: false, message: COULD_NOT_READ_TEAM }
  if (unnamed(person)) return { ok: false, message: NOT_ON_BOARD }
  const take = { taskId: input.taskId, personName: person, slackUserId: input.slackUserId }
  if (input.expectedOwner === undefined) return toSlackActionResult(await takeOverTask(take))
  return toSlackActionResult(await takeTask({ ...take, takeOverFrom: clean(input.expectedOwner) }))
}

/**
 * The digest card's "Not me" on an unclaimed task, and "Hand it back" on an
 * owned one (`passOnTask` has the rules).
 *
 * `slackUserId` is what makes the pass stick: it is recorded in the task's
 * `askHistory`, which is how the next digest knows never to ask this person
 * about this task again — whatever Slack's display name says — and it is how
 * an owned task is proven to be the presser's before their name is cleared off
 * it. Without it (an older caller) the pass is still recorded under the board
 * name, and an owned task can only be handed back by a presser whose name IS
 * the owner's: failing closed on someone else's work.
 */
export async function declineMarketingTask(input: {
  taskId: string
  /** Slack's display name; resolved to the board name here. */
  personName: string
  slackUserId?: string
}): Promise<MarketingSlackActionResult> {
  const person = await boardName(input)
  if (person === null) return { ok: false, message: COULD_NOT_READ_TEAM }
  // A pass is recorded under a name; "Someone passed on this" names nobody.
  if (unnamed(person)) return { ok: false, message: NOT_ON_BOARD }
  const now = new Date()
  return toSlackActionResult(
    await passOnTask({
      taskId: input.taskId,
      personName: person,
      slackUserId: String(input.slackUserId || '').trim(),
      now,
      week: utcIsoWeekKey(now),
    }),
  )
}

// ── Availability ─────────────────────────────────────────────────────────────

/** The availability record's own fields, as the write and its Undo read them. */
type StoredAvailability = {
  _id: string
  _rev?: string | null
  ownerName?: string | null
  slackUserId?: string | null
  status?: string | null
  from?: string | null
  until?: string | null
  weeklyHours?: number | null
  note?: string | null
}

/** One record, read through the dataset the roster is read from (`getOutreachClient`). */
export const AVAILABILITY_WRITE_QUERY = `*[_type == "${TEAM_AVAILABILITY_TYPE}" && _id == $id][0]{ _id, _rev, ownerName, slackUserId, status, from, until, weeklyHours, note }`

/** Open work somebody owns (team.server.ts): what "your 2 open tasks" counts. */
export { OWNED_OPEN_TASKS_QUERY }

/** Every record already linked to one Slack account — how "you’re already linked as Eric" is known. */
export const LINKED_RECORDS_QUERY = `*[_type == "${TEAM_AVAILABILITY_TYPE}" && slackUserId == $uid && !(_id in path("drafts.**"))]{ _id, ownerName }`

const BUSY = errorLine('save that', 'Someone was changing it at the same moment — try again.')

const clean = (value: unknown) => String(value ?? '').trim()
const lower = (value: unknown) => clean(value).toLowerCase()
const DAY_MS = 86_400_000
const dayMs = (key: string) => Date.parse(`${key}T00:00:00Z`)
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * A real calendar day. The shape is not enough: JavaScript reads "2026-02-31"
 * as the 3rd of March, and "2026-13-01" as no date at all — which used to throw
 * out of the date arithmetic instead of coming back as a refusal.
 */
function isRealDay(key: string): boolean {
  if (!ISO_DAY.test(key)) return false
  const ms = dayMs(key)
  return Number.isFinite(ms) && dayKey(ms) === key
}

const nextDay = (key: string) => dayKey(dayMs(key) + DAY_MS)

/** Sunday of the week (Mon–Sun) holding this `YYYY-MM-DD`. */
function sundayOf(key: string): string {
  const ms = dayMs(key)
  return dayKey(ms + ((7 - new Date(ms).getUTCDay()) % 7) * DAY_MS)
}
const mondayOf = (key: string) => dayKey(dayMs(sundayOf(key)) - 6 * DAY_MS)

function snapshotOf(record: Pick<StoredAvailability, 'status' | 'from' | 'until' | 'weeklyHours'> | null | undefined): AvailabilitySnapshot {
  const hours = record?.weeklyHours
  return {
    status: clean(record?.status) || 'available',
    from: clean(record?.from).slice(0, 10),
    until: clean(record?.until).slice(0, 10),
    weeklyHours: typeof hours === 'number' && Number.isFinite(hours) ? hours : null,
  }
}

/** Status and dates equal — and the hours too, when the write set them. */
function sameAvailability(a: AvailabilitySnapshot, b: AvailabilitySnapshot, compareHours: boolean): boolean {
  return a.status === b.status && a.from === b.from && a.until === b.until && (!compareHours || a.weeklyHours === b.weeklyHours)
}

/**
 * Does `outer` already say everything `inner` would? The same status (and
 * hours, when those are being set) over days that include all of `inner`'s. An
 * empty end is open: away with no last day covers every day after the first.
 */
function covers(outer: AvailabilitySnapshot, inner: AvailabilitySnapshot, compareHours: boolean): boolean {
  if (outer.status !== inner.status) return false
  if (compareHours && outer.weeklyHours !== inner.weeklyHours) return false
  const startsInTime = !outer.from || (Boolean(inner.from) && outer.from <= inner.from)
  const endsLateEnough = !outer.until || (Boolean(inner.until) && outer.until >= inner.until)
  return startsInTime && endsLateEnough
}

/** Time off (or a reduced week) that is in force today or still ahead. One that has ended is history, not a booking. */
function stillBooked(value: AvailabilitySnapshot, today: string): boolean {
  return value.status !== 'available' && (!value.until || value.until >= today)
}

/** Do two ranges overlap, or meet end to start (the 27th and the 28th)? */
function joins(a: AvailabilitySnapshot, b: AvailabilitySnapshot): boolean {
  const open = { start: '0000-01-01', end: '9999-12-31' }
  const aEnd = a.until ? nextDay(a.until) : open.end
  const bEnd = b.until ? nextDay(b.until) : open.end
  return (a.from || open.start) <= bEnd && (b.from || open.start) <= aEnd
}

/** One range spanning both, with `wanted`'s status and hours. An open end stays open. */
function joined(booked: AvailabilitySnapshot, wanted: AvailabilitySnapshot): AvailabilitySnapshot {
  const from = !booked.from || !wanted.from ? '' : booked.from < wanted.from ? booked.from : wanted.from
  const until = !booked.until || !wanted.until ? '' : booked.until > wanted.until ? booked.until : wanted.until
  return { ...wanted, from, until }
}

/**
 * "this week’s plan", "next week’s plan", "the plan for the week of Mon 5 Oct",
 * "those weeks’ plans". Counted from today when the time off started earlier:
 * last week's plan is not one anybody can be left out of any more.
 */
function whichPlan(from: string, until: string, now: Date): string {
  const today = slackDayKey(now) || dayKey(now.getTime())
  if (!until) return 'every plan until you’re back'
  const first = mondayOf(!from || from < today ? today : from)
  if (mondayOf(until) !== first) return 'those weeks’ plans'
  const thisMonday = mondayOf(today)
  if (first === thisMonday) return 'this week’s plan'
  if (first === dayKey(dayMs(thisMonday) + 7 * DAY_MS)) return 'next week’s plan'
  return `the plan for the week of ${formatSlackDay(first, now)}`
}

/** Their availability in words, for the Undo reply: "away Mon 5 – Fri 9 Oct", "on 2h a week", "available". */
function describeAvailability(value: AvailabilitySnapshot, now: Date): string {
  const days = value.from || value.until ? formatSlackRange(value.from, value.until, now) : ''
  if (value.status === 'away') return `away${days ? ` ${days}` : ''}`
  if (value.status === 'reduced') {
    const hours = value.weeklyHours !== null ? `on ${value.weeklyHours}h a week` : 'on reduced hours'
    return `${hours}${days ? ` ${days}` : ''}`
  }
  return 'available'
}

/** What a write took the place of, as the person would say it: "your time off Mon 5 – Fri 9 Oct". */
function bookedPhrase(value: AvailabilitySnapshot, now: Date): string {
  const days = value.from || value.until ? ` ${formatSlackRange(value.from, value.until, now)}` : ''
  if (value.status === 'away') return `your time off${days}`
  return `your ${value.weeklyHours !== null ? `${value.weeklyHours}h a week` : 'reduced hours'}${days}`
}

export type AvailabilityWriteResult = {
  ok: boolean
  /** Second person, for the presser (and for a chat reply). */
  message: string
  /**
   * Third person, for the room — the thread receipt under the Monday plan
   * ("🌴 <@U> is away Mon 21 – Sun 27 Sep — …"). Only when something changed.
   */
  receipt?: string
  /** False when the record already said this: nothing written, nothing to undo. */
  changed?: boolean
  /** The board name the record is filed under. */
  ownerName?: string
  status?: AvailabilityStatus
  from?: string
  until?: string
  /** For an Undo button (`MARQUETA_ACTION.availabilityUndo`), only when something changed. */
  undoValue?: string
  /** How many open tasks they own; absent when the count could not be read. */
  openTasks?: number
}

/** A name nobody files anything under, said with the name so the person can see what went wrong. */
const nobodyOnTheBoard = (name: string) =>
  errorLine(
    NOT_ON_BOARD_VERB,
    `Nothing is filed under “${escapeSlackText(name)}”. If your work is filed under another name, pick it in the Monday plan’s one-time setup.`,
  )

/**
 * Record somebody's availability — "I'm away this week" on the Monday plan,
 * and the same write for anything said to her in chat.
 *
 * The same safe write the chat path uses, for the same reasons:
 *
 *   - **The board's name for them, or nobody.** `resolvePresserName`
 *     (namesake guard included) decides whose record this is: the record
 *     linked to their Slack account, else the board name their display name
 *     exactly matches. A display name that matches NOTHING is used only if
 *     the board files open work under exactly that name (someone with tasks
 *     but no record yet) or it is on the marketing team (`marketingTeamNames`).
 *     Otherwise it is refused and pointed at the one-time setup, which lists
 *     the whole team: an unlinked Juhan whose Slack says "Juhan Sonin" would book a
 *     second "Juhan Sonin" off while the real "Juhan" kept getting work. A
 *     roster that cannot be read is a refusal too.
 *   - **Patched, never replaced.** The record also holds the person's Slack
 *     link, their weekly-hours allocation and a note. The old button's
 *     `createOrReplace` wiped all three on every press, and relinked the record
 *     to whoever pressed it. Only status and dates change here (and hours, for
 *     a reduced week); nothing here links an identity.
 *   - **Only your own record.** A record linked to a different Slack account,
 *     or filed under a different name that merely shares the id's slug, is
 *     refused.
 *   - **Never cuts booked time off short.** The record holds one range, and
 *     "away this week" used to overwrite whatever was there: pressed on
 *     Thursday by someone away until next Sunday, it deleted next week. Time
 *     off that already covers the days changes nothing; time off it overlaps
 *     or meets end to start is joined into one range; anything else still
 *     booked is replaced — and the reply says what it replaced, with Undo to
 *     put it back.
 *   - **Conditional on the revision read**, re-read and re-checked once on a
 *     conflict, so a change landing in between is never silently undone.
 *   - **Pressing twice changes nothing** the second time, and says so.
 *
 * `from` defaults to today and an away `until` to this Sunday — "this week"
 * means the rest of it, so a press on Friday does not book the next week too.
 * Today is the studio's day (America/New_York): a press at 9pm on a Sunday in
 * Boston is still that Sunday, not Monday in UTC and a whole week off. A date
 * that is given but not a real day is refused, never read as today.
 *
 * The result carries what was written, a receipt for the room, and an Undo
 * value that puts the record back exactly as it was
 * (`restoreMarketingAvailability`).
 */
export async function setMarketingAvailability(input: {
  /** Slack's display name; resolved to the board name here. */
  personName: string
  slackUserId: string
  status: AvailabilityStatus
  /** `YYYY-MM-DD`, inclusive. */
  from?: string
  /** `YYYY-MM-DD`, inclusive. */
  until?: string
  /** Only for a reduced week. */
  weeklyHours?: number
  now?: Date
}): Promise<AvailabilityWriteResult> {
  const now = input.now || new Date()
  const slackUserId = clean(input.slackUserId)
  const today = slackDayKey(now) || dayKey(now.getTime())
  const askedFrom = clean(input.from)
  const askedUntil = clean(input.until)
  if ((askedFrom && !isRealDay(askedFrom)) || (askedUntil && !isRealDay(askedUntil))) {
    return { ok: false, message: errorLine('save those days', 'One of them isn’t a real date.') }
  }
  const from = askedFrom || today
  const until = askedUntil || (input.status === 'away' ? sundayOf(from) : '')
  if (until && until < from) return { ok: false, message: errorLine('save those days', 'The last day is before the first.') }
  const hours =
    input.status === 'reduced' && typeof input.weeklyHours === 'number' && Number.isFinite(input.weeklyHours) && input.weeklyHours >= 0
      ? input.weeklyHours
      : null
  if (!slackUserId) return { ok: false, message: NOT_ON_BOARD }

  // The name and "is that name anybody?" come from ONE read of the roster.
  let entries: TeamMemberAvailability[]
  let name: string
  try {
    entries = await loadTeamAvailability()
    name = clean(await resolvePresserName({ slackUserId, displayName: clean(input.personName) || undefined, entries }))
  } catch (error) {
    console.error('[slack] could not read the team roster', error)
    return { ok: false, message: COULD_NOT_READ_TEAM }
  }
  if (unnamed(name)) return { ok: false, message: NOT_ON_BOARD }

  let openTasks: number | undefined
  const known = [...entries.map((entry) => entry.ownerName), ...marketingTeamNames()]
  if (!known.some((candidate) => lower(candidate) === lower(name))) {
    openTasks = await countOpenTasks(name)
    if (openTasks === undefined) return { ok: false, message: COULD_NOT_READ_TEAM }
    if (openTasks === 0) return { ok: false, message: nobodyOnTheBoard(name) }
  }

  const client = getOutreachClient()
  const _id = availabilityDocId(name)
  const wanted: AvailabilitySnapshot = { status: input.status, from, until, weeklyHours: hours }

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prior = await client.fetch<StoredAvailability | null>(AVAILABILITY_WRITE_QUERY, { id: _id })
      const linked = clean(prior?.slackUserId)
      if (prior && ((linked && linked !== slackUserId) || lower(prior.ownerName) !== lower(name))) {
        return { ok: false, message: NOT_ON_BOARD }
      }
      const before = prior ? snapshotOf(prior) : null
      if (before && covers(before, wanted, hours !== null)) {
        return {
          ok: true,
          changed: false,
          message: `You’re already down as ${describeAvailability(before, now)} — nothing changed.`,
          ownerName: name,
          status: input.status,
          ...(before.from ? { from: before.from } : {}),
          ...(before.until ? { until: before.until } : {}),
        }
      }
      const booked = before && stillBooked(before, today) ? before : null
      const joinsBooked = Boolean(booked && input.status === 'away' && booked.status === 'away' && joins(booked, wanted))
      const wrote = booked && joinsBooked ? joined(booked, wanted) : wanted
      const replaced = booked && !joinsBooked ? booked : null

      if (!prior) await client.createIfNotExists({ _id, _type: TEAM_AVAILABILITY_TYPE, ownerName: name, status: 'available' })
      let patch = client.patch(_id).set({
        status: input.status,
        ...(wrote.from ? { from: wrote.from } : {}),
        ...(wrote.until ? { until: wrote.until } : {}),
        ...(hours !== null ? { weeklyHours: hours } : {}),
        updatedAt: now.toISOString(),
      })
      const unset = [...(wrote.from ? [] : ['from']), ...(wrote.until ? [] : ['until'])]
      if (unset.length) patch = patch.unset(unset)
      if (prior?._rev) patch = patch.ifRevisionId(prior._rev)
      try {
        await patch.commit()
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        if (attempt === 0) continue
        return { ok: false, message: BUSY }
      }

      if (openTasks === undefined) openTasks = await countOpenTasks(name)
      return {
        ok: true,
        changed: true,
        message: availabilityMessage({
          status: input.status,
          from: wrote.from,
          until: wrote.until,
          hours,
          openTasks,
          now,
          joined: joinsBooked && !sameAvailability(wrote, wanted, false),
          replaced,
        }),
        receipt: availabilityReceipt({ who: slackMention(slackUserId, name), status: input.status, from: wrote.from, until: wrote.until, hours, now }),
        ownerName: name,
        status: input.status,
        ...(wrote.from ? { from: wrote.from } : {}),
        ...(wrote.until ? { until: wrote.until } : {}),
        undoValue: encodeAvailabilityUndo({ ownerName: name, slackUserId, wrote, prior: before }),
        ...(openTasks !== undefined ? { openTasks } : {}),
      }
    }
    return { ok: false, message: BUSY }
  } catch (error) {
    console.error('[slack] availability write failed', error)
    return { ok: false, message: errorLine('save that', 'Try again in a minute.') }
  }
}

/** Their open work, for the reply. Undefined on failure: a missing count beats a wrong one. */
async function countOpenTasks(name: string): Promise<number | undefined> {
  try {
    const count = await getOutreachClient().fetch<number | null>(OWNED_OPEN_TASKS_QUERY, { name: name.toLowerCase() })
    return typeof count === 'number' && Number.isFinite(count) ? count : undefined
  } catch (error) {
    console.error('[slack] could not count open tasks', error)
    return undefined
  }
}

function availabilityMessage(input: {
  status: AvailabilityStatus
  from: string
  until: string
  hours: number | null
  openTasks?: number
  now: Date
  /** The range written is wider than the one asked for: it met time off already booked. */
  joined?: boolean
  /** Time off (or a reduced week) still booked that this write took the place of. */
  replaced?: AvailabilitySnapshot | null
}): string {
  const days = formatSlackRange(input.from, input.until, input.now)
  const replaced = input.replaced ? ` This replaces ${bookedPhrase(input.replaced, input.now)}.` : ''
  if (input.status === 'away') {
    const joinedUp = input.joined ? ' (joined up with the time off you’d already booked)' : ''
    const work = input.openTasks ? `, and your ${countLabel(input.openTasks, 'open task')} will show as needing someone` : ''
    return `You’re away ${days}${joinedUp}. I’ll leave you out of ${whichPlan(input.from, input.until, input.now)}${work}.${replaced}`
  }
  if (input.status === 'reduced') {
    const hours = input.hours !== null ? `${input.hours}h a week` : 'reduced hours'
    return `You’re on ${hours} ${days}. I’ll plan your share of the week around that.${replaced}`
  }
  return `You’re available from ${formatSlackDay(input.from, input.now)}. I’ll plan work for you again.${replaced}`
}

/**
 * The room's line for the same write, posted under the Monday plan with Undo.
 * Third person because the room reads it; "them", never a pronoun guessed
 * from a name.
 */
function availabilityReceipt(input: {
  who: string
  status: AvailabilityStatus
  from: string
  until: string
  hours: number | null
  now: Date
}): string {
  const days = formatSlackRange(input.from, input.until, input.now)
  if (input.status === 'away') {
    return `${STATE_EMOJI.away} ${input.who} is away ${days} — I’ll leave them out of ${whichPlan(input.from, input.until, input.now)}.`
  }
  if (input.status === 'reduced') {
    const hours = input.hours !== null ? `${input.hours}h a week` : 'reduced hours'
    return `${input.who} is on ${hours} ${days} — I’ll plan their share of the week around that.`
  }
  return `${input.who} is available from ${formatSlackDay(input.from, input.now)} — I’ll plan work for them again.`
}

export type AvailabilityRestoreResult = {
  ok: boolean
  /** Second person, for whoever pressed Undo. */
  message: string
  changed?: boolean
  /**
   * The room's receipt, struck through — what the away receipt is redrawn as,
   * in place, so no live Undo is left behind. Only when something changed.
   */
  receipt?: string
}

/**
 * Undo "I'm away": put the record back exactly as it was before that press.
 *
 * Only the person who pressed may undo it — the button sits in a thread the
 * whole room can see. It undoes nothing that changed SINCE: if the record no
 * longer says what that press wrote, somebody (probably them) has changed it
 * again, and restoring an older state would throw that away. Pressing Undo
 * twice finds the record already restored and says so.
 *
 * With no record before, the record it created is removed — in the same
 * transaction as a revision check, so it is never removed out from under a
 * change — unless it has since gained a Slack link, an allocation or a note,
 * in which case only the time off is taken off it.
 */
export async function restoreMarketingAvailability(input: {
  /** The Undo button's value, or the decoded undo. */
  undo: string | AvailabilityUndo
  /** Who pressed Undo. */
  slackUserId: string
  now?: Date
}): Promise<AvailabilityRestoreResult> {
  const now = input.now || new Date()
  const undo = typeof input.undo === 'string' ? decodeAvailabilityUndo(input.undo) : input.undo
  if (!undo) return { ok: false, message: errorLine('undo that', 'That Undo button has lost track of what it was for.') }
  if (clean(input.slackUserId) !== undo.slackUserId) {
    return { ok: false, message: errorLine('undo that', 'Only the person who set that time off can undo it.') }
  }

  const client = getOutreachClient()
  const _id = availabilityDocId(undo.ownerName)
  const compareHours = undo.wrote.weeklyHours !== null
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const current = await client.fetch<StoredAvailability | null>(AVAILABILITY_WRITE_QUERY, { id: _id })
      const linked = clean(current?.slackUserId)
      if (current && linked && linked !== undo.slackUserId) {
        return { ok: false, message: errorLine('undo that', 'That record is linked to someone else now.') }
      }
      const present = current ? snapshotOf(current) : null
      const restored = undo.prior ? describeAvailability(undo.prior, now) : 'available'
      if (!current || !present) {
        return undo.prior
          ? { ok: false, message: errorLine('undo that', 'Your availability record is gone — set it again if you need to.') }
          : { ok: true, changed: false, message: 'Already undone.' }
      }
      if (!sameAvailability(present, undo.wrote, compareHours)) {
        const back = undo.prior ? sameAvailability(present, undo.prior, compareHours) : present.status === 'available' && !present.from && !present.until
        return back
          ? { ok: true, changed: false, message: 'Already undone.' }
          : {
              ok: false,
              message: errorLine('undo that', `Your time off has changed since. Tell me the days again — for example ${askMarqueta('away next week')}`),
            }
      }

      try {
        if (!undo.prior && !clean(current.slackUserId) && current.weeklyHours == null && !clean(current.note)) {
          // Nothing on it but what the press wrote: take the record away again.
          await client
            .transaction()
            .patch(_id, (patch) => patch.ifRevisionId(String(current._rev || '')).set({ updatedAt: now.toISOString() }))
            .delete(_id)
            .commit()
        } else {
          const prior = undo.prior || { status: 'available', from: '', until: '', weeklyHours: null }
          const set: Record<string, unknown> = { status: prior.status || 'available', updatedAt: now.toISOString() }
          const unset: string[] = []
          for (const field of ['from', 'until'] as const) {
            if (prior[field]) set[field] = prior[field]
            else unset.push(field)
          }
          // Hours go back only if the press changed them — an allocation set since is not ours to undo.
          if (compareHours) {
            if (prior.weeklyHours !== null) set.weeklyHours = prior.weeklyHours
            else unset.push('weeklyHours')
          }
          let patch = client.patch(_id).set(set)
          if (unset.length) patch = patch.unset(unset)
          if (current._rev) patch = patch.ifRevisionId(current._rev)
          await patch.commit()
        }
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        if (attempt === 0) continue
        return { ok: false, message: errorLine('undo that', 'Someone was changing it at the same moment — press Undo again.') }
      }
      const who = slackMention(undo.slackUserId, undo.ownerName)
      const backTo = undo.prior && undo.prior.status !== 'available' ? ` Back to ${describeAvailability(undo.prior, now)}.` : ''
      return {
        ok: true,
        changed: true,
        message: `Undone — you’re ${restored} again.`,
        receipt: `~${who} ${describeAvailability(undo.wrote, now)}~ — undone by ${who}.${backTo}`,
      }
    }
    return { ok: false, message: errorLine('undo that', 'Someone was changing it at the same moment — press Undo again.') }
  } catch (error) {
    console.error('[slack] availability undo failed', error)
    return { ok: false, message: errorLine('undo that', 'Try again in a minute.') }
  }
}

/** A board name as it sits in bold in a reply: escaped, and unable to end the bold early. */
const boldName = (name: string) => `*${escapeSlackText(name).replace(/[*_~`]/g, '') || 'that name'}*`

/**
 * Link a Slack user to the owner name used on operations.
 *
 * Patched onto the availability record rather than createOrReplace'd: somebody
 * linking their identity must not silently cancel the holiday they booked five
 * minutes earlier.
 *
 * One name per person, one person per name:
 *
 *   - **Never RE-links a name.** The select only offers unmapped names, but a
 *     digest stays in the channel for weeks, and pressing an old one used to
 *     move a colleague's record onto the presser's account — after which they
 *     were that colleague to every button. A name linked to someone else is
 *     refused; the write is conditional on the revision read, so a link
 *     landing in between is not overwritten either.
 *   - **Never links one account to a SECOND name.** Pressing "Juhan" and then
 *     "Eric" on two old digests made one account both: the owner of Eric's
 *     tasks for Hand back, and a board name that flipped between the two
 *     depending on which record the roster read returned first.
 *   - **The first of two simultaneous presses wins, and the second is told.**
 *     With no record yet there is no revision to condition on, so the id is
 *     written with `setIfMissing` and read back: whoever's id is stored is the
 *     one told "linked".
 *
 * Read and written through the dataset the roster is read from.
 */
export async function linkMarketingIdentity(input: {
  ownerName: string
  slackUserId: string
}): Promise<MarketingSlackActionResult> {
  const client = getOutreachClient()
  const ownerName = clean(input.ownerName)
  const slackUserId = clean(input.slackUserId)
  if (!ownerName || !slackUserId) return { ok: false, message: errorLine('link that', 'Pick your name from the list.') }
  const _id = availabilityDocId(ownerName)
  const linkedAs = `You’re linked as ${boldName(ownerName)} — I’ll @-mention you on your own tasks from now on.`
  const refuse = (why: string) => ({ ok: false, message: errorLine(`link you as ${escapeSlackText(ownerName)}`, why) })

  const already = await client.fetch<Array<{ _id: string; ownerName?: string | null }> | null>(LINKED_RECORDS_QUERY, { uid: slackUserId })
  const elsewhere = (already || []).find((record) => lower(record?.ownerName) !== lower(ownerName))
  if (elsewhere) return refuse(`You’re already linked as ${escapeSlackText(clean(elsewhere.ownerName)) || 'another name'}.`)

  const prior = await client.fetch<StoredAvailability | null>(AVAILABILITY_WRITE_QUERY, { id: _id })
  const linked = clean(prior?.slackUserId)
  if (prior && ((linked && linked !== slackUserId) || lower(prior.ownerName) !== lower(ownerName))) {
    return refuse('That name is already linked to someone else’s Slack.')
  }
  if (prior && linked === slackUserId) return { ok: true, message: linkedAs }

  try {
    await client
      .transaction()
      .createIfNotExists({ _id, _type: TEAM_AVAILABILITY_TYPE, ownerName, status: 'available' })
      .patch(_id, (patch) => {
        const next = patch.setIfMissing({ slackUserId }).set({ updatedAt: new Date().toISOString() })
        return prior?._rev ? next.ifRevisionId(prior._rev) : next
      })
      .commit()
  } catch (error) {
    if (!isRevisionConflict(error)) throw error
    return { ok: false, message: errorLine('link that', 'Someone was changing it at the same moment — try again.') }
  }

  // setIfMissing keeps an id that landed first; say "linked" only to whoever's it is.
  const stored = await client.fetch<StoredAvailability | null>(AVAILABILITY_WRITE_QUERY, { id: _id })
  if (clean(stored?.slackUserId) !== slackUserId) return refuse('Someone else linked that name just now.')
  return { ok: true, message: linkedAs }
}

/**
 * Fetch one task with everything needed to explain it.
 *
 * Through `getOutreachClient`, pinned to the private dataset, like every other
 * read and write of a task from Slack — never the router, whose escape hatch
 * can point internal types at the world-readable dataset.
 */
export async function getMarketingTaskDetail(taskId: string) {
  const client = getOutreachClient()
  return client.fetch<{
    _id: string
    title: string
    nextAction?: string
    whyNow?: string
    summary?: string
    humanQuestion?: string
    blocker?: string
    kind?: string
    priority?: string
    status?: string
    ownerName?: string
    dueAt?: string
    estimatedMinutes?: number
    targetView?: string
  } | null>(
    `*[_type == "${MARKETING_OPERATION_TYPE}" && _id == $id][0]{
      _id, title, nextAction, whyNow, summary, humanQuestion, blocker,
      kind, priority, status, ownerName, dueAt, estimatedMinutes, targetView
    }`,
    { id: taskId },
  )
}

/**
 * Record a decision made in Slack (`answerTask` has the rules).
 *
 * `personName` is the name the record says answered it — the route resolves
 * it against the roster first (a namesake is never recorded as the person
 * whose name they share). `slackUserId` lets the fresh task carry the owner's
 * mention, so the card the form was opened from is redrawn exactly as it
 * would be drawn anew.
 *
 * Read and written through the pinned private dataset, and conditional on the
 * revision read, so an answer never lands on top of a change made in between.
 */
export async function answerMarketingTask(input: {
  taskId: string
  answer: string
  personName: string
  slackUserId?: string
}): Promise<MarketingSlackActionResult> {
  return toSlackActionResult(
    await answerTask({
      taskId: input.taskId,
      answer: input.answer,
      personName: input.personName,
      slackUserId: String(input.slackUserId || '').trim(),
    }),
  )
}
