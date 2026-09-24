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
 *   - each person is mentioned ONCE, with at most three of their tasks;
 *   - the whole message stays under thirty blocks, however much is open;
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
 * Dates are UTC throughout. The check-in runs on Vercel (UTC) and its tests run
 * on laptops in Boston; a local-time week would put a Sunday-evening task in a
 * different week depending on which machine did the arithmetic.
 *
 * Pure: no fetch, no Sanity, no environment. The server module reads the
 * records and posts the message; this decides what it says.
 */

import {
  checkInTaskActionsBlockId,
  checkInTaskBlockId,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_BLOCKER_INPUT,
  TASK_STUCK_CALLBACK,
  type MarquetaActionId,
} from './marquetaActions'
import {
  canTransitionMarketingOperation,
  MARKETING_OPERATION_STATUSES,
  type MarketingOperationStatus,
} from './operations'
import { describePulse, type OutreachPulse } from './outreachPulse'
import { encodeActionValue } from './slackDelegation'
import { clipSlackText, decodeSlackText, escapeSlackText, SLACK_LIMITS, slackLink, slackMention } from './slackText'

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
}

/**
 * A follow-up that is due, already rendered by the caller (followUps.ts owns
 * the wording and the escaping). It lives on the contact, not on the board, so
 * it gets Prep and Log buttons — never Done: a follow-up is finished by logging
 * what happened, which is what moves the contact's date on.
 */
export type CheckInFollowUp = { label: string; detail: string; contactRef: string }

export type CheckInGroup = {
  ownerName: string
  slackUserId?: string
  tasks: CheckInTask[]
  /** In-scope tasks not shown, counted so the message can say so. */
  hidden: number
  followUps: CheckInFollowUp[]
}

/** The hard ceiling. Slack allows fifty; a check-in people read allows far fewer. */
export const MAX_CHECK_IN_BLOCKS = 30
const DEFAULT_TASKS_PER_PERSON = 3
const MAX_FOLLOW_UPS_PER_PERSON = 3
const MAX_UNOWNED_TITLES = 5

const DAY_MS = 24 * 3600 * 1000
const WEEKLY_PLAN_PREFIX = 'weekly-plan/'
const CLOSED = new Set(['done', 'dismissed'])
const ACTIVE = new Set(['working', 'blocked'])
const STATUS_SET = new Set<string>(MARKETING_OPERATION_STATUSES)

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

/** "Mon 21 Sep" — fixed English, because a locale default differs per machine. */
function shortDate(ms: number): string {
  const date = new Date(ms)
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
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
 * A question somebody senior has to answer, which is not something to ask the
 * room to "take".
 *
 * The digest's "Not me this week" also leaves a task in needsHuman with a
 * humanQuestion ("Jen passed on this — who should pick it up?"), but that is a
 * task looking for an owner, not a decision — exactly what "Nobody has taken"
 * is for. The same phrase is what the take action checks before clearing it.
 */
export function isDecisionTask(task: Pick<CheckInTask, 'kind' | 'status' | 'humanQuestion'>): boolean {
  if (text(task.kind) === 'decision') return true
  const question = text(task.humanQuestion)
  return text(task.status) === 'needsHuman' && question.length > 0 && !/passed on this/i.test(question)
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

function statusLabel(task: CheckInTask): string {
  const status = text(task.status) || 'queued'
  switch (status) {
    case 'queued':
      return 'not started'
    case 'working':
      return 'in progress'
    case 'blocked':
      return 'stuck'
    case 'waiting':
      return 'waiting on someone'
    case 'scheduled':
      return 'scheduled'
    case 'needsHuman':
      return isDecisionTask(task) ? 'needs a decision' : 'needs someone'
    case 'done':
      return 'done'
    case 'dismissed':
      return 'dropped'
    default:
      return escapeSlackText(status)
  }
}

function dueLabel(task: CheckInTask, now: Date): string {
  const due = dayStart(task.dueAt)
  const today = dayStart(now) ?? 0
  if (due === null) return 'no date'
  if (due < today) return `overdue since ${shortDate(due)}`
  if (due === today) return 'due today'
  if (due === today + DAY_MS) return 'due tomorrow'
  return `due ${shortDate(due)}`
}

function taskTitle(task: CheckInTask): string {
  return clipSlackText(escapeSlackText(text(task.title).replace(/\s+/g, ' ') || 'Untitled task'), 300)
}

function button(actionId: MarquetaActionId, label: string, value: string, primary = false): Block {
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

type CardState = 'closed' | 'unowned' | 'slipping' | 'blocked' | 'open'

function cardState(task: CheckInTask, now: Date): CardState {
  if (!isOpen(task)) return 'closed'
  if (!isOwned(task)) return 'unowned'
  if (isSlipping(task, now)) return 'slipping'
  if (text(task.status) === 'blocked') return 'blocked'
  return 'open'
}

/**
 * One task's card: a section naming it and where it stands, and the buttons
 * that make sense from that state.
 *
 *   open       Done · Stuck · Hand back
 *   stuck      Unstuck · Done · Hand back
 *   slipping   "Still worth doing?"  Keep — next week · Drop it · Done · Hand back
 *   done       Reopen          (dropped: Reopen)
 *   unowned    I'll take it    (what a hand back leaves behind)
 *
 * Hand back rides along on a slipping card too: it is the reverse of taking the
 * task, and "somebody else should do this" is a real answer to "still worth
 * doing?". Drop is only offered where the board allows the move — a task in
 * progress cannot go straight to dismissed, and a button that fails is worse
 * than no button.
 *
 * Both blocks carry ids derived from the task, which is how a press redraws
 * exactly this card and nothing else.
 */
export function buildCheckInTaskBlocks(task: CheckInTask, opts: { now: Date; note?: string }): Block[] {
  const id = text(task?._id)
  if (!id) return []
  const now = opts.now
  const state = cardState(task, now)
  const status = text(task.status)

  const title = taskTitle(task)
  const heading =
    status === 'done' ? `:white_check_mark: *${title}*` : status === 'dismissed' ? `~*${title}*~` : `*${title}*`

  const meta = [
    state === 'closed' ? '' : dueLabel(task, now),
    statusLabel(task),
    state === 'unowned' ? 'nobody has it' : '',
    state !== 'closed' && text(task.blocker) ? `in the way: ${clipSlackText(escapeSlackText(text(task.blocker)), 400)}` : '',
  ].filter(Boolean)

  const lines = [heading, meta.join(' · ')]
  if (state === 'slipping') lines.push('_Still worth doing?_')
  const note = safeMrkdwn(text(opts.note))
  if (note) lines.push(clipSlackText(note, 600))

  // The value is clipped field by field: encodeActionValue truncates the JSON
  // itself at 1900, and a truncated JSON string decodes to nothing at all.
  const value = encodeActionValue({
    taskId: id.slice(0, 180),
    ownerName: text(task.ownerName).slice(0, 120),
    status: status.slice(0, 30) || undefined,
  })

  const done = button(MARQUETA_ACTION.taskDone, 'Done', value, true)
  const handBack = button(MARQUETA_ACTION.taskHandBack, 'Hand back', value)
  let elements: Block[]
  switch (state) {
    case 'closed':
      elements = [button(MARQUETA_ACTION.taskReopen, 'Reopen', value)]
      break
    case 'unowned':
      elements = [button(MARQUETA_ACTION.taskTake, "I'll take it", value, true)]
      break
    case 'slipping':
      elements = [
        button(MARQUETA_ACTION.taskSnooze, 'Keep — next week', value),
        ...(canMove(task, 'dismissed') ? [button(MARQUETA_ACTION.taskDrop, 'Drop it', value)] : []),
        done,
        handBack,
      ]
      break
    case 'blocked':
      elements = [button(MARQUETA_ACTION.taskProgress, 'Unstuck', value), done, handBack]
      break
    default:
      elements = [done, button(MARQUETA_ACTION.taskStuck, 'Stuck', value), handBack]
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
        button(MARQUETA_ACTION.prepCall, 'Prep', ref),
        button(MARQUETA_ACTION.logCall, 'Log how it went', ref),
      ],
    })
  }
  return blocks
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

type GroupPlan = {
  group: CheckInGroup
  tasks: CheckInTask[]
  hidden: number
  followUps: CheckInFollowUp[]
  moreFollowUps: number
}

/**
 * The message.
 *
 * Header, the week, how outreach is going, then one short list per person, the
 * work nobody has taken, and a way into the Studio.
 *
 * The thirty-block ceiling is enforced by giving things up in a fixed order:
 * follow-up lines first (they are one `my calls` away), then tasks from
 * whoever has the most showing (counted into "+N more"). A person's own line is
 * never dropped — being left out of a check-in reads as "you have nothing",
 * which is worse than a short one. Only if there are more people than lines is
 * the tail named together in one section, still each mentioned once.
 */
export function buildWeeklyCheckInBlocks(input: {
  weekLabel: string
  groups: CheckInGroup[]
  unowned: CheckInTask[]
  pulse: OutreachPulse | null
  handle: string
  studioUrl?: string
  now: Date
}): Block[] {
  const groups = (input.groups || []).filter(Boolean)
  const unowned = (input.unowned || []).filter((task) => task && text(task._id))
  if (!groups.length && !unowned.length && !input.pulse) return []

  const now = input.now
  const handle = safeMrkdwn(text(input.handle)) || 'Marqueta'
  const studioUrl = /^https?:\/\//i.test(text(input.studioUrl)) ? text(input.studioUrl) : ''

  const seenTasks = new Set<string>()
  const plans: GroupPlan[] = groups.map((group) => {
    const tasks = (group.tasks || []).filter((task) => {
      const id = text(task?._id)
      if (!id || seenTasks.has(id)) return false
      seenTasks.add(id)
      return true
    })
    const shown = tasks.slice(0, DEFAULT_TASKS_PER_PERSON)
    const followUps = (group.followUps || []).filter((item) => item && (text(item.label) || text(item.detail)))
    return {
      group,
      tasks: shown,
      hidden: Math.max(0, Math.floor(Number(group.hidden) || 0)) + (tasks.length - shown.length),
      followUps: followUps.slice(0, MAX_FOLLOW_UPS_PER_PERSON),
      moreFollowUps: Math.max(0, followUps.length - MAX_FOLLOW_UPS_PER_PERSON),
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
      plan.hidden > 0 ? `+${plan.hidden} more ${studioUrl ? slackLink(studioUrl, 'in the Studio') : 'in the Studio'}` : '',
      plan.moreFollowUps > 0
        ? `${plural(plan.moreFollowUps, 'more follow-up', 'more follow-ups')} — ask ${handle} \`my calls\``
        : '',
    ]
      .filter(Boolean)
      .join(' · ')

  const render = (compact: boolean, individually: number): Block[] => {
    const blocks: Block[] = [{ type: 'header', text: { type: 'plain_text', text: 'Thursday check-in', emoji: true } }]
    const week = clipSlackText(escapeSlackText(text(input.weekLabel)), 300)
    if (week) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: week }] })

    if (input.pulse) {
      const lines = [escapeSlackText(describePulse(input.pulse, 'Outreach this week'))]
      if (input.pulse.touches === 0) {
        lines.push(
          `If you called people who aren't on file, tell me ${handle} \`called Sam Rivera at Acme\` and I'll add them` +
            ` — or ${handle} \`prep Sam Rivera\` before you call.`,
        )
      }
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clipSlackText(lines.join('\n'), SLACK_LIMITS.sectionText) } })
    }

    if (!plans.length) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: "Nothing is on anyone's list for this week or next." },
      })
    }

    const mentioned = new Set<string>()
    plans.slice(0, individually).forEach((plan) => {
      const overflow = overflowText(plan)
      const heading = `${mentionFor(plan, mentioned)} — here's what's on your list`
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: clipSlackText(compact && overflow ? `${heading}\n${overflow}` : heading, SLACK_LIMITS.sectionText),
        },
      })
      for (const task of plan.tasks) blocks.push(...buildCheckInTaskBlocks(task, { now }))
      for (const followUp of plan.followUps) blocks.push(...followUpBlocks(followUp))
      if (!compact && overflow) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: overflow }] })
    })

    const rest = plans.slice(individually)
    if (rest.length) {
      const names = rest.map((plan) => mentionFor(plan, mentioned)).join(', ')
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: clipSlackText(`Also with work on the list: ${names} — ask ${handle} \`my tasks\` to see yours.`, SLACK_LIMITS.sectionText),
        },
      })
    }

    if (unowned.length) {
      const titles = unowned.slice(0, MAX_UNOWNED_TITLES).map((task) => clipSlackText(escapeSlackText(text(task.title).replace(/\s+/g, ' ') || 'Untitled task'), 80))
      const more = unowned.length - titles.length
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: clipSlackText(`Nobody has taken: ${titles.join(' · ')}${more > 0 ? ` …and ${more} more` : ''}`, SLACK_LIMITS.sectionText),
          },
        ],
      })
    }

    if (studioUrl) {
      blocks.push({
        type: 'actions',
        elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open the plan' }, url: studioUrl }],
      })
    }
    return blocks
  }

  // Give things up one at a time, from whoever has the most of them showing.
  const largest = (count: (plan: GroupPlan) => number) =>
    plans.reduce<GroupPlan | null>((best, plan) => (count(plan) > 0 && (!best || count(plan) >= count(best)) ? plan : best), null)

  let blocks = render(false, plans.length)
  while (blocks.length > MAX_CHECK_IN_BLOCKS) {
    const withFollowUps = largest((plan) => plan.followUps.length)
    if (withFollowUps) {
      withFollowUps.followUps.pop()
      withFollowUps.moreFollowUps += 1
    } else {
      const withTasks = largest((plan) => plan.tasks.length)
      if (!withTasks) break
      withTasks.tasks.pop()
      withTasks.hidden += 1
    }
    blocks = render(false, plans.length)
  }
  if (blocks.length > MAX_CHECK_IN_BLOCKS) blocks = render(true, plans.length)
  if (blocks.length > MAX_CHECK_IN_BLOCKS) {
    const fixed = render(true, 0).length
    blocks = render(true, Math.max(0, MAX_CHECK_IN_BLOCKS - fixed))
  }
  return blocks
}

/**
 * The top-level `text` for the check-in. Slack builds notifications from it,
 * so the mentions have to be here as well as in the blocks — otherwise the
 * message arrives and nobody it is addressed to is told.
 */
export function checkInFallbackText(groups: CheckInGroup[]): string {
  const mentions: string[] = []
  const seen = new Set<string>()
  for (const group of groups || []) {
    const id = text(group?.slackUserId)
    const key = id || `name:${lower(group?.ownerName)}`
    if (seen.has(key)) continue
    seen.add(key)
    mentions.push(slackMention(id || undefined, text(group?.ownerName) || 'Someone'))
  }
  const base = mentions.length
    ? `Thursday check-in — ${mentions.join(' ')}: here's what's on your list.`
    : 'Thursday check-in.'
  return clipSlackText(base, SLACK_LIMITS.fallbackText)
}

/**
 * Swap one task's card for a fresh render, and touch nothing else.
 *
 * The message may be a check-in with twenty other people's tasks on it, or a
 * `mine` answer in a thread. Rebuilding it whole would need everybody else's
 * records re-read, and any drift between then and now would silently rewrite
 * somebody else's card. So: find the two blocks by id, replace them in place,
 * leave every other block as the very same object. Absent → unchanged.
 */
export function replaceCheckInTask(
  blocks: Block[],
  taskId: string,
  fresh: CheckInTask,
  opts: { now: Date; note?: string },
): Block[] {
  if (!Array.isArray(blocks) || !text(taskId)) return blocks
  const sectionId = checkInTaskBlockId(taskId)
  const actionsId = checkInTaskActionsBlockId(taskId)
  const isCard = (block: Block) => block?.block_id === sectionId || block?.block_id === actionsId
  const at = blocks.findIndex(isCard)
  if (at === -1) return blocks

  const card = buildCheckInTaskBlocks({ ...fresh, _id: taskId }, opts)
  const next: Block[] = []
  blocks.forEach((block, index) => {
    if (index === at) next.push(...card)
    if (!isCard(block)) next.push(block)
  })
  return next
}

/**
 * "What's in the way?" — the modal behind Stuck.
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
    title: { type: 'plain_text', text: "What's in the way?" },
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
  return decodeSlackText(bare)
}

/**
 * The line a press leaves on the card, so the channel sees what changed
 * without anybody re-reading the task.
 *
 * `who` is a mention; anything else is normalised and escaped so a display
 * name cannot smuggle markup into a shared channel.
 */
export function checkInAcknowledgement(action: MarquetaActionId, who: string, taskTitle: string): string {
  const raw = text(who)
  const person = /^<@[UW][A-Z0-9]+>$/.test(raw) ? raw : escapeSlackText(decodeSlackText(raw)) || 'Someone'
  const title = clipSlackText(escapeSlackText(text(taskTitle).replace(/\s+/g, ' ') || 'this task'), 120)
  switch (action) {
    case MARQUETA_ACTION.taskDone:
      return `${person} marked *${title}* done.`
    case MARQUETA_ACTION.taskProgress:
      return `${person} is unstuck on *${title}*.`
    case MARQUETA_ACTION.taskStuck:
      return `${person} is stuck on *${title}* — what's in the way is on the task.`
    case MARQUETA_ACTION.taskHandBack:
      return `${person} handed *${title}* back — anyone can take it.`
    case MARQUETA_ACTION.taskReopen:
      return `${person} reopened *${title}*.`
    case MARQUETA_ACTION.taskTake:
      return `${person} took *${title}*.`
    case MARQUETA_ACTION.taskDrop:
      return `${person} dropped *${title}*. Reopen brings it back.`
    case MARQUETA_ACTION.taskSnooze:
      return `${person} kept *${title}* — moved to next week.`
    default:
      return `${person} updated *${title}*.`
  }
}

