/**
 * The Thursday check-in: one message that asks each person how their week's
 * marketing work is going, and lets them answer with a button.
 *
 * The Monday digest says what the week is. Nothing ever asked, later in the
 * week, whether any of it happened — so a task could sit "queued" for a month
 * and the only sign was the same line reappearing every Monday. Stand-up style
 * check-ins fix that, but only if they are light enough that people do not
 * mute them. So this is built around what it leaves out:
 *
 *   - each person is mentioned ONCE, with at most three of their tasks and
 *     two follow-ups — the rest is one link away, on This week filtered to
 *     them;
 *   - the whole message aims at two phone screens (`MAX_CHECK_IN_PHONE_LINES`)
 *     and never exceeds Slack's fifty blocks, however much is open;
 *   - there is no "Still on it" button. Silence means still on it. A button
 *     whose only job is to reassure the bot turns a check-in into a chore,
 *     and a chore gets skipped.
 *
 * Every card offers the action that reverses its state — Done shows Reopen,
 * Hand back shows I'll take it, Drop shows Reopen — so a mis-press is one more
 * press, never a trip to the Studio. And the card is drawn from the record, not
 * edited in place: `replaceCheckInTask` swaps exactly one task's two blocks for
 * a fresh render and leaves every other byte of the message alone.
 *
 * The card itself (`buildTaskCard`) is shared: the Monday plan, `week`, `my
 * tasks` and this check-in all draw a task the same way, with the same words
 * (`taskStatusWords`, which the Studio's pill uses too) and the same buttons
 * for the same state — so a label a person has learned in one message does the
 * same thing in every other.
 *
 * Which tasks are in scope, and which are slipping, is decided in UTC. The
 * check-in runs on Vercel (UTC) and its tests run on laptops in Boston; a
 * local-time week would put a Sunday-evening task in a different week
 * depending on which machine did the arithmetic. The WORDS on a card ("due
 * today", "overdue since Tue 22 Sep") follow the studio's calendar
 * (`formatSlackDay`, America/New_York, named explicitly), because that is the
 * calendar the people reading them live on.
 *
 * Pure: no fetch, no Sanity, no environment. The server module reads the
 * records and posts the message; this decides what it says.
 */

import {
  checkInTaskActionsBlockId,
  checkInTaskBlockId,
  encodeTaskCardValue,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_BLOCKER_INPUT,
  TASK_STUCK_CALLBACK,
  type MarquetaActionId,
  type TaskCardMode,
} from './marquetaActions'
import {
  actionsRow,
  askMarqueta,
  countLabel,
  formatEffort,
  formatSlackDay,
  LABEL,
  openViewButton,
  slackDayKey,
  STATE_EMOJI,
  stateNote,
  type StateNoteKind,
} from './marquetaStyle'
import {
  canTransitionMarketingOperation,
  MARKETING_OPERATION_STATUSES,
  type MarketingOperationStatus,
} from './operations'
import { describePulse, type OutreachPulse } from './outreachPulse'
import { MARKETING_ACTION } from './slackDelegation'
import { clipSlackText, decodeSlackText, escapeSlackText, SLACK_LIMITS, slackLink, slackMention } from './slackText'
import { isAnswerableInSlack, isDecisionTask, studioTaskUrl, studioViewUrl } from './taskLinks'

export { isDecisionTask }
export type { TaskCardMode }

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

export type CheckInTask = {
  _id: string
  title: string
  ownerName?: string
  slackUserId?: string
  status?: string
  kind?: string
  priority?: string
  dueAt?: string
  minutes?: number
  blocker?: string
  humanQuestion?: string
  lastOutcome?: string
  updatedAt?: string
  createdAt?: string
  sourceKey?: string
  /** Where the card's title links (`studioTaskUrl`); a hint, see `resolveTaskView`. */
  targetView?: string
}

/**
 * A follow-up that is due, already rendered by the caller (followUps.ts owns
 * the wording and the escaping). It lives on the contact, not on the board, so
 * it gets Prep and Log buttons — never Done: a follow-up is finished by logging
 * what happened, which is what moves the contact's date on.
 */
export type CheckInFollowUp = {
  label: string
  detail: string
  contactRef: string
  /** Past its date — counted in the notification ("4 follow-ups (3 overdue)"). */
  overdue?: boolean
}

export type CheckInGroup = {
  ownerName: string
  slackUserId?: string
  tasks: CheckInTask[]
  /** In-scope tasks not shown, counted so the message can say so. */
  hidden: number
  followUps: CheckInFollowUp[]
}

/**
 * Slack's own ceiling. What keeps the check-in short enough to read is what it
 * shows per person (three tasks, two follow-ups, three cards nobody has
 * taken); this is only the backstop that decides what to give up when a
 * crowded week would otherwise be refused by Slack outright.
 */
export const MAX_CHECK_IN_BLOCKS = SLACK_LIMITS.blocksPerMessage
const DEFAULT_TASKS_PER_PERSON = 3
const MAX_FOLLOW_UPS_PER_PERSON = 2
const MAX_UNOWNED_CARDS = 3
/**
 * About two phone screens, 40 characters to a line (`checkInPhoneLines`). A
 * check-in longer than that is scrolled past, and then nobody presses Done.
 */
export const MAX_CHECK_IN_PHONE_LINES = 45

const DAY_MS = 24 * 3600 * 1000
const WEEKLY_PLAN_PREFIX = 'weekly-plan/'
const CLOSED = new Set(['done', 'dismissed'])
const ACTIVE = new Set(['working', 'blocked'])
const STATUS_SET = new Set<string>(MARKETING_OPERATION_STATUSES)

const text = (value: unknown) => String(value ?? '').trim()
const lower = (value: unknown) => text(value).toLowerCase()

/** Midnight UTC of the day an instant falls on, or null for no/invalid date. */
function dayStart(value: string | Date | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value))
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / DAY_MS) * DAY_MS
}

/** Monday 00:00 UTC of the ISO week containing `now`. */
function isoWeekStart(now: Date): number {
  const today = dayStart(now) ?? 0
  const weekday = (new Date(today).getUTCDay() + 6) % 7
  return today - weekday * DAY_MS
}

const isOpen = (task: CheckInTask) => !CLOSED.has(text(task.status))
const isOwned = (task: CheckInTask) => text(task.ownerName).length > 0
const isPlanRecord = (task: CheckInTask) => text(task.sourceKey).startsWith(WEEKLY_PLAN_PREFIX)

/** The most recent sign of life on a task, or null when the record carries none. */
function lastTouched(task: CheckInTask): number | null {
  const times = [task.updatedAt, task.createdAt]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => !Number.isNaN(value))
  return times.length ? Math.max(...times) : null
}

/** Whole days a task is past its due DAY. A task due today is not overdue yet. */
function daysOverdue(task: CheckInTask, now: Date): number {
  const due = dayStart(task.dueAt)
  const today = dayStart(now)
  if (due === null || today === null || due >= today) return 0
  return Math.round((today - due) / DAY_MS)
}

/**
 * Is this task something to ask its owner about this Thursday?
 *
 * Open, owned, not a planner record, and one of: overdue, due by the end of
 * NEXT week (a Thursday check-in that ignores Monday's deadlines is a day
 * late), or actively being worked or stuck whatever its date.
 *
 * Undated work counts as due now — the planner treats it the same way, between
 * due and future work — EXCEPT when it was picked up or touched within the last
 * seven days. Asking about something somebody took on Tuesday is nagging;
 * asking about something undated that has sat for a month is the point.
 */
export function inCheckInScope(task: CheckInTask, now: Date): boolean {
  if (!task || !isOpen(task) || !isOwned(task) || isPlanRecord(task)) return false
  if (ACTIVE.has(text(task.status))) return true

  const due = dayStart(task.dueAt)
  if (due === null) {
    const touched = lastTouched(task)
    return touched === null || now.getTime() - touched >= 7 * DAY_MS
  }
  return due < isoWeekStart(now) + 14 * DAY_MS
}

/**
 * Work that has quietly stopped: two weeks past its date, or stuck for a week
 * with nobody touching it. These get "Still worth doing?" instead of the usual
 * buttons, because the honest answer is often "no", and a board full of dead
 * tasks hides the live ones.
 *
 * A stuck task with no timestamps at all is NOT slipping — nudging somebody to
 * drop work needs evidence that it has stalled, not an absence of records.
 */
export function isSlipping(task: CheckInTask, now: Date): boolean {
  if (!task || !isOpen(task)) return false
  if (daysOverdue(task, now) >= 14) return true
  if (text(task.status) !== 'blocked') return false
  const touched = lastTouched(task)
  return touched !== null && now.getTime() - touched >= 7 * DAY_MS
}

/** Reading order inside one person's list: the thing most likely to need a word first. */
function checkInRank(task: CheckInTask, now: Date): number[] {
  const due = dayStart(task.dueAt)
  return [
    isSlipping(task, now) ? 0 : 1,
    daysOverdue(task, now) > 0 ? 0 : 1,
    text(task.status) === 'blocked' ? 0 : 1,
    due === null ? Number.MAX_SAFE_INTEGER : due,
  ]
}

function compareTasks(a: CheckInTask, b: CheckInTask, now: Date): number {
  const left = checkInRank(a, now)
  const right = checkInRank(b, now)
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return text(a.title).localeCompare(text(b.title)) || text(a._id).localeCompare(text(b._id))
}

/** First letter of each word up — only for a name we hold nothing but a lowercased key for. */
const titleCase = (value: string) => value.replace(/(^|\s)(\S)/g, (_match, space: string, first: string) => space + first.toUpperCase())

/** Only something Slack would turn into a mention counts as a person's identity. */
const SLACK_USER_ID = /^[UW][A-Z0-9]+$/
const slackUserIdOf = (value: unknown) => {
  const id = text(value)
  return SLACK_USER_ID.test(id) ? id : ''
}

export type CheckInTeamMember = { ownerName: string; slackUserId?: string }

/**
 * Who each name on the board is in Slack — with the team roster as the
 * authority and a task's own `slackUserId` as a last resort.
 *
 * A task's id is the least trustworthy thing on it. Claiming in Slack sets
 * `ownerSlackUserId`; nothing ever clears it. Reassign the task in the Studio
 * (which has no field for the id) or decline it in the digest, and the record
 * says "Eric" next to Juhan's id. Trusting that id put Eric's work in Juhan's
 * group, under Eric's name, and pinged Juhan about it in a shared channel —
 * while Eric, who is on the roster, was never mentioned at all. A wrong
 * mention is the one mistake this message cannot afford: a missing one costs
 * a notification, a wrong one tells a colleague in front of the room that
 * someone else's work is theirs.
 *
 * So, per NAME rather than per task:
 *
 *   1. A name the roster gives an id to is that id. Whatever a task says
 *      disagrees with the roster, and the roster wins.
 *   2. A task's id counts only for a name the roster has no id for, and only
 *      if the roster does not give that id to somebody else — an id the roster
 *      says is Juhan's, on a task owned by an unmapped "Eric", is the stale
 *      shape above, not evidence that Eric is Juhan.
 *   3. When the evidence for a name disagrees with itself (two roster records,
 *      or two tasks, naming different ids) there is no id: the person is
 *      listed by name and mentioned by nobody's id rather than possibly the
 *      wrong one.
 *
 * Names still merge when the evidence agrees — "Juhan" and "Juhan Sonin" that
 * the roster (or, absent a roster, their tasks) link to the same id are one
 * person, and mentioning them twice is the noise this message exists to avoid.
 */
function resolveIdentities(tasks: CheckInTask[], team: CheckInTeamMember[]) {
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key) || new Set<string>()
    set.add(value)
    map.set(key, set)
  }

  const rosterIdsByName = new Map<string, Set<string>>()
  const rosterNamesById = new Map<string, Set<string>>()
  const rosterDisplay = new Map<string, string>()
  for (const member of team || []) {
    const name = lower(member?.ownerName)
    if (!name) continue
    if (!rosterDisplay.has(name)) rosterDisplay.set(name, text(member.ownerName))
    const id = slackUserIdOf(member.slackUserId)
    if (!id) continue
    add(rosterIdsByName, name, id)
    add(rosterNamesById, id, name)
  }

  const taskIdsByName = new Map<string, Set<string>>()
  for (const task of tasks) {
    const name = lower(task.ownerName)
    const id = slackUserIdOf(task.slackUserId)
    // Rule 1 (the roster knows this name) and rule 2 (the roster knows this
    // id as somebody) both leave the task's id out of it.
    if (!name || !id || rosterIdsByName.has(name) || rosterNamesById.has(id)) continue
    add(taskIdsByName, name, id)
  }

  const onlyOne = (ids: Set<string> | undefined) => (ids && ids.size === 1 ? [...ids][0] : undefined)
  return {
    idFor: (name: string) => (rosterIdsByName.has(name) ? onlyOne(rosterIdsByName.get(name)) : onlyOne(taskIdsByName.get(name))),
    displayNameFor: (name: string) => rosterDisplay.get(name),
  }
}

/**
 * One group per person, with their three most pressing tasks and the
 * follow-ups on their contacts.
 *
 * People are keyed by name case-insensitively, and by Slack id where
 * `resolveIdentities` can vouch for one. Pass the roster as `team` — the
 * availability records that carry a Slack id — because without it the only
 * evidence of who somebody is in Slack is the id on their tasks, and that id
 * goes stale (see above). The roster also supplies display names and ids for
 * people who have follow-ups but no tasks, since a follow-up carries neither.
 *
 * Groups are alphabetical. Ordering by who has the most overdue work would put
 * the same colleague at the top every week — a leaderboard nobody asked for.
 */
export function groupCheckInTasks(
  tasks: CheckInTask[],
  opts: {
    now: Date
    perPerson?: number
    followUpsByOwner?: Record<string, CheckInFollowUp[]>
    team?: CheckInTeamMember[]
  },
): { groups: CheckInGroup[]; unowned: CheckInTask[] } {
  const now = opts.now
  const perPerson = Math.max(0, Math.floor(opts.perPerson ?? DEFAULT_TASKS_PER_PERSON))
  const seen = new Set<string>()
  const unique = (tasks || []).filter((task) => {
    if (!task || !text(task._id) || seen.has(task._id)) return false
    seen.add(task._id)
    return true
  })

  const identity = resolveIdentities(unique, opts.team || [])

  type Building = { names: string[]; displayName: string; slackUserId?: string; tasks: CheckInTask[] }
  const people = new Map<string, Building>()
  const person = (name: string, fallbackDisplayName: string) => {
    const id = identity.idFor(name)
    const key = id ? `id:${id}` : `name:${name}`
    let entry = people.get(key)
    if (!entry) {
      entry = { names: [], displayName: identity.displayNameFor(name) || fallbackDisplayName, slackUserId: id, tasks: [] }
      people.set(key, entry)
    }
    if (!entry.names.includes(name)) entry.names.push(name)
    return entry
  }

  for (const task of unique) {
    if (!inCheckInScope(task, now)) continue
    person(lower(task.ownerName), text(task.ownerName)).tasks.push(task)
  }

  // Somebody with follow-ups due and nothing on the board still gets asked:
  // outreach is the work that matters most right now.
  for (const [rawKey, followUps] of Object.entries(opts.followUpsByOwner || {})) {
    const name = lower(rawKey)
    if (!name || !(followUps || []).length) continue
    person(name, titleCase(name))
  }

  const groups: CheckInGroup[] = [...people.values()]
    .map((entry) => {
      const sorted = [...entry.tasks].sort((a, b) => compareTasks(a, b, now))
      const followUps = entry.names.flatMap((name) =>
        Object.entries(opts.followUpsByOwner || {})
          .filter(([key]) => lower(key) === name)
          .flatMap(([, list]) => list || []),
      )
      return {
        ownerName: entry.displayName,
        ...(entry.slackUserId ? { slackUserId: entry.slackUserId } : {}),
        tasks: sorted.slice(0, perPerson),
        hidden: Math.max(0, sorted.length - perPerson),
        followUps,
      }
    })
    .filter((group) => group.tasks.length > 0 || group.hidden > 0 || group.followUps.length > 0)
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName) || text(a.slackUserId).localeCompare(text(b.slackUserId)))

  const horizon = isoWeekStart(now) + 14 * DAY_MS
  const unowned = unique
    .filter((task) => isOpen(task) && !isOwned(task) && !isPlanRecord(task) && !isDecisionTask(task))
    .filter((task) => {
      const due = dayStart(task.dueAt)
      return due === null || due < horizon
    })
    .sort((a, b) => {
      const left = dayStart(a.dueAt) ?? Number.MAX_SAFE_INTEGER
      const right = dayStart(b.dueAt) ?? Number.MAX_SAFE_INTEGER
      return left - right || text(a.title).localeCompare(text(b.title))
    })

  return { groups, unowned }
}

/**
 * Text a caller hands us already rendered as mrkdwn (a follow-up line, an
 * acknowledgement) cannot be escaped again without mangling its mentions and
 * links. But it cannot be trusted either: one raw `<5%` from a record makes
 * Slack read a control sequence, and a stored `<!channel>` pings a room.
 *
 * So keep exactly the tokens our own helpers emit — user and channel mentions,
 * web and mailto links — and escape everything else. Idempotent: text that is
 * already escaped passes through unchanged.
 */
const KEEP_TOKEN = [/^@[UW][A-Z0-9]+$/, /^#C[A-Z0-9]+(\|[^<>]*)?$/, /^(https?:\/\/|mailto:)[^\s<>|]+(\|[^<>]*)?$/i]
const LOOSE_AMP = /&(?!(?:amp|lt|gt);)/g

function safeMrkdwn(value: string): string {
  return String(value || '').replace(/<([^<>]*)>|[<>]|&(?!(?:amp|lt|gt);)/g, (match: string, inner?: string) => {
    if (inner !== undefined) {
      if (KEEP_TOKEN.some((pattern) => pattern.test(inner))) return match
      return `&lt;${inner.replace(LOOSE_AMP, '&amp;')}&gt;`
    }
    if (match === '<') return '&lt;'
    if (match === '>') return '&gt;'
    return '&amp;'
  })
}

// ── Status words ─────────────────────────────────────────────────────────────

/**
 * The word for each status on work somebody owns, and the Studio's status
 * select. `taskStatusWords` adds the two cases a bare status cannot express:
 * who (if anyone) has it, and whether the question is a decision.
 */
export const TASK_STATUS_WORDS: Record<MarketingOperationStatus, string> = {
  queued: 'Not started',
  working: 'In progress',
  needsHuman: 'Needs someone',
  waiting: 'Waiting on someone',
  blocked: 'Stuck',
  scheduled: 'Scheduled',
  done: 'Done',
  dismissed: 'Dropped',
}

/**
 * Where a task stands, in words — one function for the Slack card and the
 * Studio's pill, so the two never describe one task two ways.
 *
 * Plain text: escape it before it goes into mrkdwn. Precedence, each for a
 * reason:
 *
 *   - Closed, stuck, waiting and scheduled say so, whoever owns them.
 *   - needsHuman is the one status that is waiting on a person, and a
 *     decision waiting says "Needs a decision" — that is what it is waiting
 *     for. Any other needsHuman is a task somebody passed on: it "Needs
 *     someone", which is what "Not me" leaves behind on purpose.
 *   - A decision in any OTHER status is not waiting on anyone. Answering one
 *     moves it to queued with the question kept (answerMarketingTask, the
 *     Studio banner), and one that someone is working on is in progress. The
 *     planner counts only needsHuman as a decision (`weeklyPlan.isDecision`),
 *     and the words agree, or an answered decision would read "Needs a
 *     decision" forever.
 *   - Work in progress with nobody on it is Marqueta's own ("Marqueta
 *     working"); not started with nobody on it is "Nobody has it", the thing
 *     the room most needs to see.
 *
 * An unknown status reads as not started, the way the board's own rules treat it.
 */
export function taskStatusWords(task: Pick<CheckInTask, 'status' | 'kind' | 'humanQuestion' | 'ownerName'>): string {
  const raw = text(task?.status)
  const status: MarketingOperationStatus = STATUS_SET.has(raw) ? (raw as MarketingOperationStatus) : 'queued'
  if (status === 'done' || status === 'dismissed' || status === 'blocked' || status === 'waiting' || status === 'scheduled') {
    return TASK_STATUS_WORDS[status]
  }
  if (status === 'needsHuman') return isDecisionTask({ ...task, status }) ? 'Needs a decision' : TASK_STATUS_WORDS.needsHuman
  const owned = text(task?.ownerName).length > 0
  if (status === 'working') return owned ? TASK_STATUS_WORDS.working : 'Marqueta working'
  return owned ? TASK_STATUS_WORDS.queued : 'Nobody has it'
}

/** The status word as it sits mid-sentence on a card: "due Fri 25 Sep · ~30m · in progress". */
function statusLabel(task: CheckInTask): string {
  const words = taskStatusWords(task)
  // "Marqueta" is a name; everything else reads lower-case mid-line.
  return escapeSlackText(words.startsWith('Marqueta') ? words : words.charAt(0).toLowerCase() + words.slice(1))
}

/** The day after a `YYYY-MM-DD` key. */
function nextDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

/** '' when the task has no readable date — each card decides whether to say "no date". */
function dueLabel(task: CheckInTask, now: Date): string {
  const due = slackDayKey(task.dueAt)
  const today = slackDayKey(now)
  if (!due || !today) return ''
  if (due < today) return `overdue since ${formatSlackDay(due, now)}`
  if (due === today) return 'due today'
  if (due === nextDayKey(today)) return 'due tomorrow'
  return `due ${formatSlackDay(due, now)}`
}

const plainTitle = (task: CheckInTask) => text(task.title).replace(/\s+/g, ' ') || 'Untitled task'

function taskTitle(task: CheckInTask): string {
  return clipSlackText(escapeSlackText(plainTitle(task)), 300)
}

/**
 * The card's title: bold, and a link to where the work happens when there is
 * a Studio to link to. The title IS the link — cards carry no "Open" button
 * of their own, which would cost one of their three.
 */
function linkedTitle(task: CheckInTask, studioBaseUrl: string | undefined): string {
  const url = studioTaskUrl({
    baseUrl: studioBaseUrl,
    taskId: text(task._id),
    targetView: task.targetView,
    kind: task.kind,
    status: task.status,
    humanQuestion: task.humanQuestion,
  })
  if (!url) return taskTitle(task)
  const title = plainTitle(task)
  return slackLink(url, title.length > 300 ? `${title.slice(0, 299).trimEnd()}…` : title)
}

// ── The card ────────────────────────────────────────────────────────────────

function button(actionId: string, label: string, value: string, primary = false): Block {
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text: label, emoji: true },
    value,
    ...(primary ? { style: 'primary' } : {}),
  }
}

/** Whether the board would accept the move — so a card never offers a button that fails. */
function canMove(task: CheckInTask, to: MarketingOperationStatus): boolean {
  const from = STATUS_SET.has(text(task.status)) ? (text(task.status) as MarketingOperationStatus) : 'queued'
  return canTransitionMarketingOperation(from, to)
}

/** Somebody the plan asked to take this task (ownerAsk.ts). Only a Slack id makes it a mention. */
export type TaskCardAsk = { slackUserId?: string; name?: string; reason?: 'suggested' | 'open' }

export type TaskCardOptions = {
  now: Date
  /** `plan`: the room's view (Monday plan, `week`). `mine`: one person's list (check-in, `my tasks`). */
  mode: TaskCardMode
  /** The plan asked this person to take it: "<@U>, could you take this one?" with Not me. */
  ask?: TaskCardAsk
  /** `away`: the owner is away and the work needs covering. `exhausted`: asked twice, nobody took it. */
  context?: 'away' | 'exhausted'
  /** For `away`: "Eric is away · free this week: Juhan, Shirley" (names, not mentions). */
  awayNote?: string
  /** The italic state note a press leaves (`stateNote`). */
  note?: string
  /** Makes the title a link to the task in the Studio. */
  studioBaseUrl?: string
}

type CardState =
  | 'closed'
  | 'decision'
  | 'ownDecision'
  | 'away'
  | 'exhausted'
  | 'asked'
  | 'unowned'
  | 'taken'
  | 'slipping'
  | 'blocked'
  | 'open'

/**
 * A decision still waiting for its answer — the same rule as the words
 * (`taskStatusWords`) and the planner: needsHuman. An answered decision is
 * queued again with its question kept, and is ordinary work from then on.
 */
const awaitingDecision = (task: CheckInTask) => text(task.status) === 'needsHuman' && isDecisionTask(task)

function cardState(task: CheckInTask, opts: TaskCardOptions): CardState {
  if (!isOpen(task)) return 'closed'
  // In its owner's own list a decision is still theirs to close or hand back,
  // not only to answer — so it keeps Done and Hand back beside Answer….
  if (awaitingDecision(task)) return isOwned(task) && opts.mode === 'mine' ? 'ownDecision' : 'decision'
  if (isOwned(task)) {
    if (opts.context === 'away') return 'away'
    if (opts.mode === 'plan') return 'taken'
    if (isSlipping(task, opts.now)) return 'slipping'
    if (text(task.status) === 'blocked') return 'blocked'
    return 'open'
  }
  if (opts.context === 'exhausted') return 'exhausted'
  if (text(opts.ask?.slackUserId) || text(opts.ask?.name)) return 'asked'
  return 'unowned'
}

/**
 * One task, drawn the same way in every message: a section with the title,
 * one meta line and an optional italic state note, then at most three buttons
 * — the one the message is asking for leftmost, and green only when it is
 * safe to press on reflex.
 *
 *   owned, open (mine)     due Fri 25 Sep · ~30m · in progress     Done★ · Stuck… · Hand back
 *   owned, stuck           … · stuck · in the way: <blocker>      Done★ · Unstuck · Hand back
 *   owned, slipping        overdue since … · … _Still worth doing?_ Done★ · Keep — next week · Drop it
 *   owned (plan)           Taken by <@U> · ~30m                    Hand back
 *   owned, stuck (plan)    Taken by <@U> · … · stuck · in the way  Hand back
 *   unowned                Nobody has it · due … · ~30m            I’ll take it★ · Details…
 *   unowned, asked         <@U>, could you take this one? · ~30m   I’ll take it★ · Not me · Details…
 *   away cover             🌴 Eric is away · free this week: …     I’ll take it · Details…
 *   exhausted              Asked twice, nobody took it — …         I’ll take it · Drop it · Details…
 *   decision               Needs a decision · due …                Answer…★
 *   decision, own (mine)   Needs a decision · due …                Answer…★ · Done · Hand back
 *   done / dropped         the state note                          Reopen
 *
 * Why the exceptions:
 *
 *   - Done stays leftmost on every owned card, so it is in the same place
 *     whatever else the card says — except on a decision its owner can answer
 *     here, where Answer… is the thing the card is asking for.
 *   - A slipping card offers Drop only where the board allows it (work in
 *     progress cannot be dismissed); otherwise Hand back takes the third slot,
 *     since "somebody else should do this" is a real answer to "still worth
 *     doing?".
 *   - Nothing is green on an exhausted card: two people have said no, and the
 *     honest question is whether to drop it, not a nudge to take it.
 *   - Nothing is green on an away cover either. Its "I’ll take it" is the same
 *     Take as everywhere else, but the task still has the away owner's name
 *     on it, and green is never for taking someone's work (a reflex press
 *     should not move a colleague's task). Its value says it is a cover
 *     (`cover`), which is the one thing that lets Take move the task off that
 *     owner — and only while it is still theirs, so a stale card cannot take
 *     it from whoever covered it first.
 *   - A decision that cannot be answered in Slack (no written question) gets
 *     Details…, not Answer…: a label ending in "…" promises a form to fill.
 *   - Once a press has left its note, the note says what changed, so the meta
 *     line does not say it again: no "Taken by" under "Taken by", and no
 *     "not started" under "Reopened by".
 *
 * Both blocks carry ids derived from the task, which is how a press redraws
 * exactly this card and nothing else.
 */
export function buildTaskCard(task: CheckInTask, opts: TaskCardOptions): Block[] {
  const id = text(task?._id)
  if (!id) return []
  const now = opts.now
  const mode: TaskCardMode = opts.mode === 'plan' ? 'plan' : 'mine'
  const state = cardState(task, { ...opts, mode })
  const status = text(task.status)

  const title = linkedTitle(task, opts.studioBaseUrl)
  const heading =
    status === 'done' ? `${STATE_EMOJI.done} *${title}*` : status === 'dismissed' ? `~*${title}*~` : `*${title}*`

  const note = clipSlackText(safeMrkdwn(text(opts.note)), 600)
  const due = dueLabel(task, now)
  const effort = formatEffort(Number(task.minutes))
  const blocker = text(task.blocker) ? `in the way: ${clipSlackText(escapeSlackText(text(task.blocker)), 400)}` : ''
  const urgent = task.priority === 'urgent' || task.priority === 'high' ? '*Urgent*' : ''

  let meta: string[]
  switch (state) {
    case 'closed':
      meta = note ? [] : [statusLabel(task)]
      break
    case 'decision':
    case 'ownDecision':
      meta = [urgent, 'Needs a decision', due, effort]
      break
    case 'away': {
      const away = clipSlackText(safeMrkdwn(text(opts.awayNote)), 300) || `${escapeSlackText(text(task.ownerName))} is away`
      meta = [urgent, `${STATE_EMOJI.away} ${away}`]
      break
    }
    case 'exhausted':
      meta = [urgent, 'Asked twice, nobody took it — still worth doing?']
      break
    case 'asked': {
      const who = slackMention(text(opts.ask?.slackUserId) || undefined, text(opts.ask?.name) || 'someone')
      meta = [urgent, `${who}, could you take this one?`, effort, opts.ask?.reason === 'suggested' ? 'the plan had you in mind' : '']
      break
    }
    case 'unowned':
      meta = [urgent, 'Nobody has it', due, effort, status === 'blocked' ? 'stuck' : '', blocker]
      break
    case 'taken': {
      // Stuck work in the room's view still says so — "Taken by" alone would hide it.
      const stuck = status === 'blocked' ? ['stuck', blocker] : []
      meta = note
        ? [urgent, due, effort, ...stuck]
        : [urgent, `Taken by ${slackMention(text(task.slackUserId) || undefined, text(task.ownerName))}`, effort, ...stuck]
      break
    }
    default:
      // open, blocked, slipping: the owner's own list, where "no date" is worth
      // saying. After a press the note says where it stands ("Reopened by …"),
      // so the status word is left off rather than contradicting it.
      meta = [urgent, due || 'no date', effort, note ? '' : statusLabel(task), blocker]
  }

  const lines = [heading]
  // The slipping question ends the meta line (§2.5), not a line of its own:
  // on a phone that line is one more to scroll past on every slipping card.
  const metaLine = [meta.filter(Boolean).join(' · '), state === 'slipping' ? '_Still worth doing?_' : ''].filter(Boolean).join(' ')
  if (metaLine) lines.push(metaLine)
  if (note) lines.push(note)

  const card = { taskId: id, ownerName: text(task.ownerName), status: status || undefined, mode }
  const value = encodeTaskCardValue(card)
  const take = (primary: boolean) => button(MARQUETA_ACTION.taskTake, LABEL.TAKE, value, primary)
  const details = button(MARKETING_ACTION.details, LABEL.DETAILS, value)
  const answer = button(MARKETING_ACTION.details, LABEL.ANSWER, value, true)
  const done = (primary: boolean) => button(MARQUETA_ACTION.taskDone, LABEL.DONE, value, primary)
  const handBack = button(MARQUETA_ACTION.taskHandBack, LABEL.HAND_BACK, value)
  const drop = button(MARQUETA_ACTION.taskDrop, LABEL.DROP, value)

  let elements: Block[]
  switch (state) {
    case 'closed':
      elements = [button(MARQUETA_ACTION.taskReopen, LABEL.REOPEN, value)]
      break
    case 'decision':
      elements = [isAnswerableInSlack(task) ? answer : details]
      break
    case 'ownDecision':
      elements = isAnswerableInSlack(task) ? [answer, done(false), handBack] : [done(true), details, handBack]
      break
    case 'away':
      // Take, as everywhere — the value marks it as a cover for this owner. Not green (see above).
      elements = [button(MARQUETA_ACTION.taskTake, LABEL.TAKE, encodeTaskCardValue({ ...card, cover: true })), details]
      break
    case 'exhausted':
      elements = [take(false), ...(canMove(task, 'dismissed') ? [drop] : []), details]
      break
    case 'asked':
      elements = [take(true), button(MARKETING_ACTION.decline, LABEL.NOT_ME, value), details]
      break
    case 'unowned':
      elements = [take(true), details]
      break
    case 'taken':
      elements = [handBack]
      break
    case 'slipping':
      elements = [done(true), button(MARQUETA_ACTION.taskSnooze, LABEL.KEEP_NEXT_WEEK, value), canMove(task, 'dismissed') ? drop : handBack]
      break
    case 'blocked':
      elements = [done(true), button(MARQUETA_ACTION.taskProgress, LABEL.UNSTUCK, value), handBack]
      break
    default:
      elements = [done(true), button(MARQUETA_ACTION.taskStuck, LABEL.STUCK, value), handBack]
  }

  return [
    {
      type: 'section',
      block_id: checkInTaskBlockId(id),
      text: { type: 'mrkdwn', text: clipSlackText(lines.join('\n'), SLACK_LIMITS.sectionText) },
    },
    { type: 'actions', block_id: checkInTaskActionsBlockId(id), elements },
  ]
}

/**
 * The check-in's card: `buildTaskCard` in `mine` mode. Kept under its old name
 * because the `my tasks` answer and the interactions route call it.
 */
export function buildCheckInTaskBlocks(task: CheckInTask, opts: { now: Date; note?: string; studioBaseUrl?: string }): Block[] {
  return buildTaskCard(task, { ...opts, mode: 'mine' })
}

function followUpBlocks(followUp: CheckInFollowUp): Block[] {
  const body = [text(followUp.label), text(followUp.detail)].filter(Boolean).join('\n')
  if (!body) return []
  const blocks: Block[] = [
    { type: 'section', text: { type: 'mrkdwn', text: clipSlackText(safeMrkdwn(body), SLACK_LIMITS.sectionText) } },
  ]
  // A ref Slack would refuse (or none) means no buttons, not a rejected message.
  const ref = String(followUp.contactRef || '')
  if (ref && ref.length <= SLACK_LIMITS.buttonValue) {
    blocks.push({
      type: 'actions',
      elements: [
        button(MARQUETA_ACTION.prepCall, LABEL.PREP, ref),
        button(MARQUETA_ACTION.logCall, LABEL.LOG, ref),
      ],
    })
  }
  return blocks
}

/**
 * Roughly how many lines a message takes on a phone: 40 characters to a line
 * of text, 46 in the smaller context type, 28 in a header, two buttons to a
 * row, mentions as a name and links as their label. Rough on purpose, and the
 * same rough for every message — it is the measure the check-in is held to
 * (`MAX_CHECK_IN_PHONE_LINES`), not a layout engine.
 */
export function checkInPhoneLines(blocks: Block[]): number {
  const plain = (value: unknown) =>
    String(value ?? '')
      .replace(/<@[UW][A-Z0-9]+>/g, '@someone')
      .replace(/<[^<>|]*\|([^<>]*)>/g, '$1')
      .replace(/<([^<>]*)>/g, '$1')
      .replace(/&(amp|lt|gt);/g, '&')
      .replace(/[*_~]/g, '')
  const wrap = (value: unknown, width: number) =>
    plain(value)
      .split('\n')
      .reduce((total, paragraph) => {
        let lines = 1
        let line = ''
        for (const word of paragraph.split(' ')) {
          if (line && `${line} ${word}`.length > width) {
            lines += 1
            line = word
          } else {
            line = line ? `${line} ${word}` : word
          }
        }
        return total + lines
      }, 0)
  let lines = 0
  for (const block of blocks || []) {
    if (block?.type === 'header') lines += wrap(block.text?.text, 28)
    else if (block?.type === 'divider') lines += 1
    else if (block?.type === 'context') lines += wrap((block.elements || []).map((element: Block) => element?.text || '').join(' '), 46)
    else if (block?.type === 'section') lines += wrap(block.text?.text, 40) + (block.accessory ? 1 : 0)
    else if (block?.type === 'actions') lines += Math.ceil((block.elements || []).length / 2)
    else lines += 1
  }
  return lines
}

type GroupPlan = {
  group: CheckInGroup
  tasks: CheckInTask[]
  hidden: number
  followUps: CheckInFollowUp[]
  moreFollowUps: number
  /** Every in-scope task of theirs, shown or not — what the heading counts. */
  taskTotal: number
  /** Every follow-up of theirs, shown or not. */
  followUpTotal: number
}

const context = (value: string, blockId?: string): Block => ({
  type: 'context',
  ...(blockId ? { block_id: blockId } : {}),
  elements: [{ type: 'mrkdwn', text: clipSlackText(value, SLACK_LIMITS.sectionText) || ' ' }],
})
const section = (value: string): Block => ({
  type: 'section',
  text: { type: 'mrkdwn', text: clipSlackText(value, SLACK_LIMITS.sectionText) || ' ' },
})
const DIVIDER: Block = { type: 'divider' }

/** Weekdays left in the studio's week, today included: Thursday → 2. None at the weekend. */
function workingDaysLeft(now: Date): number {
  const key = slackDayKey(now)
  if (!key) return 0
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6 ? 0 : 6 - weekday
}

/** "*<@U1>*" for a person Slack knows, "*Jon*" for one it does not — bold either way, and unable to end the bold early. */
const boldPerson = (mention: string) => `*${mention.startsWith('<@') ? mention : mention.replace(/[*_~`]/g, ' ').trim() || 'Someone'}*`

/** "2 tasks, 1 follow-up" — only the parts that are not zero. */
function workCount(tasks: number, followUps: number): string {
  return [tasks ? countLabel(tasks, 'task') : '', followUps ? countLabel(followUps, 'follow-up') : ''].filter(Boolean).join(', ')
}

/**
 * For a week with nothing logged: the likeliest reason is calls to people who
 * are not on file yet, and the fix is one sentence to her. It does not open
 * with "Nothing logged yet this week" — the outreach line under the header has
 * just said so, and saying it twice costs a phone line to tell nobody anything.
 *
 * The short form keeps the one example that logs something; it is what a
 * crowded week gets (see the budget in `buildWeeklyCheckInBlocks`).
 */
const ZERO_TOUCH_HINT =
  `Called someone not on file? Say ${askMarqueta('called Sam Rivera at Acme, no answer')}` +
  ` — or ${askMarqueta('prep Sam Rivera at Acme')} first.`
const ZERO_TOUCH_HINT_SHORT = `Called someone not on file? Say ${askMarqueta('called Sam Rivera at Acme, no answer')}.`

const ASK_ME = `Ask me: ${askMarqueta('my tasks')} · ${askMarqueta('my calls')} · ${askMarqueta('help')}`

/** The block id of the check-in's last row, so anything placed later knows where the end is. */
export const CHECK_IN_FOOTER_BLOCK = 'mq_footer'

/**
 * How the parts that can shrink are drawn this time. Everything else — the
 * header, each person's line and their tasks, the notes, the footer — is
 * always drawn in full.
 */
type CheckInLayout = {
  /** A divider above each person's list. The bold mention already separates people; the rule is only spacing. */
  dividers: boolean
  /** The zero-touch hint with both examples, or with the one that logs something. */
  hint: 'full' | 'short'
  /** Work nobody has taken: its cards (`cardCount` of them), their titles in one line, or only how many. */
  unowned: 'cards' | 'titles' | 'count'
  cardCount: number
  /** Everyone's heading in full with their overflow on its own line, or the overflow folded into the heading. */
  compact: boolean
  /** How many people get their own list; the rest are named together. */
  individually: number
}

/**
 * The Thursday check-in, top to bottom in the order people read it:
 *
 *   Thursday check-in
 *   Week of Mon 21 Sep · 2 working days left
 *   Outreach this week: 3 touches (2 people) · 1 reply.
 *   ──
 *   *@Juhan* · 2 tasks, 1 follow-up
 *     [cards: Done★ · Stuck… · Hand back]      [follow-ups: Prep · Log it…]
 *     +2 more — on This week                    (a link to This week, filtered to Juhan)
 *   ──
 *   *Nobody has taken*
 *     [up to three cards: I’ll take it★ · Details…]
 *   Follow-ups nobody owns … · 🌴 Away, so not asked …
 *   Called someone not on file? … — or, with calls logged, Ask me: …
 *   [Open This week]
 *
 * Each person is mentioned ONCE, in bold at the head of their own list, with
 * what the list holds, and gets at most three tasks and two follow-ups — the
 * rest is one link away, on This week filtered to them. The cards nobody has
 * are the room's cards (`plan`): a take there reads "Taken by <@U>" with Hand
 * back, rather than turning into somebody's own list under the wrong heading.
 *
 * ONE line at the foot teaches how to talk to her: on a week with nothing
 * logged it is the zero-touch hint (the thing most worth saying that week),
 * otherwise "Ask me: …". Two lines in a row of `Marqueta, …` phrases is the
 * kind of repetition that gets a message skimmed.
 *
 * `notes` are lines about work the message does not ask anybody about — the
 * follow-ups nobody owns, the people who are away and so were not asked. They
 * are placed by the builder, inside the block budget, so they can never be
 * the thing that did not fit: those are often the warmest leads on file.
 *
 * Two budgets, each giving things up in a fixed order, each step only while
 * the message is still over and each leaving a count behind:
 *
 *   - About two phone screens (`MAX_CHECK_IN_PHONE_LINES`): first what costs
 *     nothing to lose — the per-person dividers, then the zero-touch hint's
 *     second example — then each person's follow-ups beyond their most
 *     pressing one (the rest are one `my calls` away). Last, the cards nobody
 *     has taken become their titles on one line, then only how many — but
 *     ONLY if that brings the message within budget. Those cards carry the
 *     check-in's only "I’ll take it" buttons, and giving them up for a message
 *     that is still too long loses both ways. Nobody's own TASKS are ever
 *     hidden for length: Thursday exists to ask about exactly those.
 *   - Slack refuses more than fifty blocks outright, so below those floors a
 *     crowded week keeps giving up: follow-up rows, then cards nobody has
 *     taken, then tasks from whoever has the most showing. A person's own line
 *     is never dropped — being left out of a check-in reads as "you have
 *     nothing", which is worse than a short one. Only if there are more people
 *     than lines is the tail named together, still each mentioned once.
 *
 * With nothing on anyone's list, nothing nobody has taken and nothing to note,
 * the whole message is one line (and still posted: to the team a skipped post
 * looks exactly like a dead job).
 */
export function buildWeeklyCheckInBlocks(input: {
  /** "Week of Mon 21 Sep" (`weekOfLabel`); the builder adds the working days left. */
  weekLabel: string
  groups: CheckInGroup[]
  unowned: CheckInTask[]
  pulse: OutreachPulse | null
  now: Date
  /** Absolute base URL: card titles link to their task, "+2 more" to This week filtered to that person. */
  studioBaseUrl?: string
  /** Lines about work nobody is asked about (ownerless follow-ups, people away). mrkdwn; anything unsafe is escaped. */
  notes?: string[]
  /**
   * Ignored. Hints are phrases people type (`askMarqueta`), never a mention
   * of her — accepted only so a caller written for the old signature compiles.
   */
  handle?: string
}): Block[] {
  const groups = (input.groups || []).filter(Boolean)
  const unowned = (input.unowned || []).filter((task) => task && text(task._id))
  const notes = (input.notes || []).map((note) => clipSlackText(safeMrkdwn(text(note)), SLACK_LIMITS.sectionText)).filter(Boolean)
  const now = input.now
  const pulseLine = input.pulse ? escapeSlackText(describePulse(input.pulse, 'Outreach this week')) : ''
  const zeroTouch = Boolean(input.pulse && input.pulse.touches === 0)

  if (!groups.length && !unowned.length && !notes.length) {
    return [section(`*Thursday check-in:* nothing is on anyone’s list for this week or next.${pulseLine ? ` ${pulseLine}` : ''}`)]
  }

  const base = /^https?:\/\//i.test(text(input.studioBaseUrl)) ? text(input.studioBaseUrl) : ''
  const onThisWeek = (owner?: string) => {
    const url = studioViewUrl(base, 'thisWeek', owner ? { owner } : {})
    return url ? slackLink(url, 'on This week') : 'on This week'
  }

  const seenTasks = new Set<string>()
  const plans: GroupPlan[] = groups.map((group) => {
    const tasks = (group.tasks || []).filter((task) => {
      const id = text(task?._id)
      if (!id || seenTasks.has(id)) return false
      seenTasks.add(id)
      return true
    })
    const shown = tasks.slice(0, DEFAULT_TASKS_PER_PERSON)
    const hidden = Math.max(0, Math.floor(Number(group.hidden) || 0)) + (tasks.length - shown.length)
    const followUps = (group.followUps || []).filter((item) => item && (text(item.label) || text(item.detail)))
    return {
      group,
      tasks: shown,
      hidden,
      followUps: followUps.slice(0, MAX_FOLLOW_UPS_PER_PERSON),
      moreFollowUps: Math.max(0, followUps.length - MAX_FOLLOW_UPS_PER_PERSON),
      taskTotal: shown.length + hidden,
      followUpTotal: followUps.length,
    }
  })

  // Each person's mention appears once even if a caller built two groups for them.
  const mentionFor = (plan: GroupPlan, mentioned: Set<string>) => {
    const id = text(plan.group.slackUserId)
    const name = text(plan.group.ownerName) || 'Someone'
    if (id && mentioned.has(id)) return escapeSlackText(name)
    if (id) mentioned.add(id)
    return slackMention(id || undefined, name)
  }

  const overflowText = (plan: GroupPlan) =>
    [
      plan.hidden > 0 ? `+${plan.hidden} more — ${onThisWeek(text(plan.group.ownerName))}` : '',
      plan.moreFollowUps > 0 ? `${countLabel(plan.moreFollowUps, 'more follow-up')} — ask ${askMarqueta('my calls')}` : '',
    ]
      .filter(Boolean)
      .join(' · ')

  const days = workingDaysLeft(now)
  const week = [clipSlackText(escapeSlackText(text(input.weekLabel)), 300), days ? `${countLabel(days, 'working day')} left` : '']
    .filter(Boolean)
    .join(' · ')

  const render = (layout: CheckInLayout): Block[] => {
    const blocks: Block[] = [{ type: 'header', text: { type: 'plain_text', text: 'Thursday check-in', emoji: true } }]
    if (week) blocks.push(context(week))
    if (pulseLine) blocks.push(context(pulseLine))

    const mentioned = new Set<string>()
    plans.slice(0, layout.individually).forEach((plan) => {
      const overflow = overflowText(plan)
      const heading = `${boldPerson(mentionFor(plan, mentioned))} · ${workCount(plan.taskTotal, plan.followUpTotal) || 'nothing due'}`
      if (layout.dividers) blocks.push(DIVIDER)
      blocks.push(section(layout.compact && overflow ? `${heading}\n${overflow}` : heading))
      for (const task of plan.tasks) blocks.push(...buildTaskCard(task, { now, mode: 'mine', studioBaseUrl: base || undefined }))
      for (const followUp of plan.followUps) blocks.push(...followUpBlocks(followUp))
      if (!layout.compact && overflow) blocks.push(context(overflow))
    })

    const rest = plans.slice(layout.individually)
    if (rest.length) {
      const names = rest.map((plan) => mentionFor(plan, mentioned)).join(', ')
      blocks.push(DIVIDER, section(`Also with work on the list: ${names} — ask ${askMarqueta('my tasks')} to see yours.`))
    }

    // The work nobody is being asked about: the room's cards, or — on a
    // crowded week — one line about them, beside the notes.
    const loose = [...notes]
    const cards = unowned.length > 0 && layout.unowned === 'cards' && layout.cardCount > 0
    if (cards) {
      blocks.push(DIVIDER, section('*Nobody has taken*'))
      for (const task of unowned.slice(0, layout.cardCount)) {
        blocks.push(...buildTaskCard(task, { now, mode: 'plan', studioBaseUrl: base || undefined }))
      }
      const more = unowned.length - layout.cardCount
      if (more > 0) blocks.push(context(`+${more} more — ${onThisWeek()}`))
    } else if (unowned.length && layout.unowned === 'count') {
      loose.unshift(`*Nobody has taken:* ${countLabel(unowned.length, 'task')} — ${onThisWeek()}`)
    } else if (unowned.length) {
      const titles = unowned.slice(0, MAX_UNOWNED_CARDS).map((task) => clipSlackText(escapeSlackText(plainTitle(task)), 80))
      const more = unowned.length - titles.length
      loose.unshift(`*Nobody has taken:* ${titles.join(' · ')}${more > 0 ? ` and ${more} more` : ''} — ${onThisWeek()}`)
    }
    // Set apart from the last person's list, so a note is never read as theirs.
    if (loose.length && !cards) blocks.push(DIVIDER)
    // Ten to a block: Slack's limit for a context line.
    for (let index = 0; index < loose.length; index += SLACK_LIMITS.contextElements) {
      blocks.push({
        type: 'context',
        elements: loose.slice(index, index + SLACK_LIMITS.contextElements).map((line) => ({ type: 'mrkdwn', text: line })),
      })
    }
    // One line on how to talk to her: the one that matters this week.
    blocks.push(context(zeroTouch ? (layout.hint === 'short' ? ZERO_TOUCH_HINT_SHORT : ZERO_TOUCH_HINT) : ASK_ME))
    blocks.push(...actionsRow([openViewButton('thisWeek', studioViewUrl(base, 'thisWeek'))], CHECK_IN_FOOTER_BLOCK))
    return blocks
  }

  // Give things up one at a time, from whoever has the most of them showing.
  const largest = (count: (plan: GroupPlan) => number) =>
    plans.reduce<GroupPlan | null>((best, plan) => (count(plan) > 0 && (!best || count(plan) >= count(best)) ? plan : best), null)

  const layout: CheckInLayout = {
    dividers: true,
    hint: 'full',
    unowned: 'cards',
    cardCount: Math.min(MAX_UNOWNED_CARDS, unowned.length),
    compact: false,
    individually: plans.length,
  }
  const fits = (blocks: Block[]) => checkInPhoneLines(blocks) <= MAX_CHECK_IN_PHONE_LINES
  let blocks = render(layout)

  // Too long to read (see above for why this order).
  if (!fits(blocks)) {
    layout.dividers = false
    blocks = render(layout)
  }
  if (!fits(blocks) && zeroTouch) {
    layout.hint = 'short'
    blocks = render(layout)
  }
  while (!fits(blocks)) {
    const withFollowUps = largest((plan) => plan.followUps.length - 1)
    if (!withFollowUps) break
    withFollowUps.followUps.pop()
    withFollowUps.moreFollowUps += 1
    blocks = render(layout)
  }
  if (!fits(blocks) && unowned.length) {
    for (const form of ['titles', 'count'] as const) {
      const shorter = render({ ...layout, unowned: form })
      if (fits(shorter)) {
        layout.unowned = form
        blocks = shorter
        break
      }
    }
  }

  // Too many blocks for Slack, which would refuse the whole message: keep giving up, below those floors.
  while (blocks.length > MAX_CHECK_IN_BLOCKS) {
    const withFollowUps = largest((plan) => plan.followUps.length)
    if (withFollowUps) {
      withFollowUps.followUps.pop()
      withFollowUps.moreFollowUps += 1
    } else if (layout.unowned === 'cards' && layout.cardCount > 0) {
      layout.cardCount -= 1
      if (layout.cardCount === 0) layout.unowned = 'titles'
    } else {
      const withTasks = largest((plan) => plan.tasks.length)
      if (!withTasks) break
      withTasks.tasks.pop()
      withTasks.hidden += 1
    }
    blocks = render(layout)
  }
  if (blocks.length > MAX_CHECK_IN_BLOCKS) {
    layout.compact = true
    blocks = render(layout)
  }
  if (blocks.length > MAX_CHECK_IN_BLOCKS) {
    // The fixed part plus the "Also with work" line (a divider and a section).
    const fixed = render({ ...layout, individually: 0 }).length
    layout.individually = Math.max(0, Math.floor((MAX_CHECK_IN_BLOCKS - fixed) / 2))
    blocks = render(layout)
  }
  return blocks
}

/**
 * The top-level `text` for the check-in — what a phone's lock screen shows,
 * so the people it is addressed to come first, then what it is and how much:
 *
 *   <@U1> <@U2> — Thursday check-in: 7 open tasks, 4 follow-ups (3 overdue)
 *
 * Slack builds notifications from this text, so the mentions have to be here
 * as well as in the blocks — otherwise the message arrives and nobody it is
 * addressed to is told. Only real mentions: a name Slack cannot resolve
 * notifies nobody and only pushes the count off the end of the lock screen.
 * "Open tasks" counts everything the message covers: each person's list and
 * the work nobody has taken.
 */
export function checkInFallbackText(groups: CheckInGroup[], opts: { unowned?: number } = {}): string {
  const mentions: string[] = []
  const seen = new Set<string>()
  let tasks = Math.max(0, Math.floor(Number(opts.unowned) || 0))
  let followUps = 0
  let overdue = 0
  for (const group of groups || []) {
    if (!group) continue
    tasks += (group.tasks || []).length + Math.max(0, Math.floor(Number(group.hidden) || 0))
    followUps += (group.followUps || []).length
    overdue += (group.followUps || []).filter((item) => item?.overdue).length
    const id = slackUserIdOf(group.slackUserId)
    if (!id || seen.has(id)) continue
    seen.add(id)
    mentions.push(slackMention(id))
  }
  const counts = [
    tasks ? countLabel(tasks, 'open task') : '',
    followUps ? `${countLabel(followUps, 'follow-up')}${overdue ? ` (${overdue} overdue)` : ''}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  const what = counts ? `Thursday check-in: ${counts}` : 'Thursday check-in: nothing is on anyone’s list for this week or next.'
  return clipSlackText(mentions.length ? `${mentions.join(' ')} — ${what}` : what, SLACK_LIMITS.fallbackText)
}

/**
 * Swap one task's card for a fresh render, and touch nothing else.
 *
 * The message may be a check-in with twenty other people's tasks on it, or a
 * `mine` answer in a thread. Rebuilding it whole would need everybody else's
 * records re-read, and any drift between then and now would silently rewrite
 * somebody else's card. So: find the two blocks by id, replace them in place,
 * leave every other block as the very same object. Absent → unchanged.
 *
 * `mode` is the one the pressed button carried (`decodeTaskCardValue`): a card
 * in the Monday plan stays a plan card after a press, and a card in somebody's
 * own list stays theirs. Without it, `mine` — every card before modes existed
 * was a check-in card.
 */
export function replaceCheckInTask(
  blocks: Block[],
  taskId: string,
  fresh: CheckInTask,
  opts: { now: Date; note?: string; mode?: TaskCardMode; studioBaseUrl?: string },
): Block[] {
  if (!Array.isArray(blocks) || !text(taskId)) return blocks
  const sectionId = checkInTaskBlockId(taskId)
  const actionsId = checkInTaskActionsBlockId(taskId)
  const isCard = (block: Block) => block?.block_id === sectionId || block?.block_id === actionsId
  const at = blocks.findIndex(isCard)
  if (at === -1) return blocks

  const card = buildTaskCard({ ...fresh, _id: taskId }, { ...opts, mode: opts.mode === 'plan' ? 'plan' : 'mine' })
  const next: Block[] = []
  blocks.forEach((block, index) => {
    if (index === at) next.push(...card)
    if (!isCard(block)) next.push(block)
  })
  return next
}

/**
 * "What’s in the way?" — the modal behind Stuck.
 *
 * Required, because a stuck task with no blocker written down is the one
 * nobody else can help with. Capped at 600 so it fits on the task and in a
 * Slack line without being clipped mid-thought.
 */
export function buildTaskStuckView(input: { taskTitle: string; metadata: string }): Record<string, unknown> {
  const title = clipSlackText(escapeSlackText(text(input.taskTitle).replace(/\s+/g, ' ') || 'This task'), 300)
  return {
    type: 'modal',
    callback_id: TASK_STUCK_CALLBACK,
    private_metadata: String(input.metadata || ''),
    title: { type: 'plain_text', text: 'What’s in the way?' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\nA sentence is plenty. It goes on the task, so whoever can help knows what to help with.`,
        },
      },
      {
        type: 'input',
        block_id: TASK_BLOCKER_BLOCK,
        label: { type: 'plain_text', text: 'What is blocking it' },
        element: {
          type: 'plain_text_input',
          action_id: TASK_BLOCKER_INPUT,
          multiline: true,
          max_length: 600,
          placeholder: { type: 'plain_text', text: 'e.g. Need the case-study numbers before I can write it' },
        },
      },
    ],
  }
}

export function readTaskStuckSubmission(
  values: Record<string, Record<string, { value?: string | null }>> | undefined,
): string {
  const raw = values?.[TASK_BLOCKER_BLOCK]?.[TASK_BLOCKER_INPUT]?.value
  return String(raw ?? '').trim().slice(0, 600)
}

/**
 * The task's title, read back out of the message that was pressed.
 *
 * Slack gives a modal three seconds from the press to open, which leaves no
 * time for a Sanity read first. The card already names the task, so this
 * recovers it from there — as plain text, since the modal escapes it again.
 */
export function findTaskTitleInBlocks(blocks: Block[] | undefined, taskId: string): string {
  if (!Array.isArray(blocks) || !text(taskId)) return ''
  const section = blocks.find((block) => block?.block_id === checkInTaskBlockId(taskId))
  const firstLine = String(section?.text?.text || '').split('\n')[0]
  const bare = firstLine
    .replace(/^:[a-z0-9_+-]+:\s*/i, '')
    .replace(/^~?\*([\s\S]*)\*~?$/, '$1')
  // A title linked to the Studio (`<url|title>`) decodes to its label.
  return decodeSlackText(bare)
}

/** Which state note each card press leaves (§2.4 rule 11). */
const NOTE_FOR_PRESS: Partial<Record<string, StateNoteKind>> = {
  [MARQUETA_ACTION.taskDone]: 'done',
  [MARQUETA_ACTION.taskProgress]: 'unstuck',
  [MARQUETA_ACTION.taskStuck]: 'stuck',
  [MARQUETA_ACTION.taskHandBack]: 'handedBack',
  [MARQUETA_ACTION.taskReopen]: 'reopened',
  [MARQUETA_ACTION.taskTake]: 'taken',
  [MARQUETA_ACTION.taskDrop]: 'dropped',
  [MARQUETA_ACTION.taskSnooze]: 'snoozed',
  [MARKETING_ACTION.claim]: 'taken',
  [MARKETING_ACTION.decline]: 'passed',
}

/**
 * The line a press leaves on the card, so the channel sees what changed
 * without anybody re-reading the task: `stateNote` for the press, by action.
 *
 * It used to be its own sentence with the task's title in bold and a straight
 * apostrophe — on the very card that names the task. The note now says only
 * who did what (and when, where that matters); the card says which task.
 *
 * `who` is a mention; anything else is normalised and escaped so a display
 * name cannot smuggle markup into a shared channel (`stateNote`).
 */
export function checkInAcknowledgement(action: MarquetaActionId | string, who: string, now: Date): string {
  // An action with no note of its own falls to stateNote's "Updated by".
  return stateNote((NOTE_FOR_PRESS[action] ?? 'updated') as StateNoteKind, who, now)
}

