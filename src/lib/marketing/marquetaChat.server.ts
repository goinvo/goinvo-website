/**
 * Answering somebody who spoke to Marqueta.
 *
 * Server-only: every answer is a read of the private dataset, or a write she
 * already knows how to make. No model call — a question about the runway must
 * be answered from the runway record or not at all, because a plausible wrong
 * number here is worse than "I don't know".
 *
 * What this file owns, beyond picking the answer:
 *
 * - **Reading what Slack delivered.** The event text arrives escaped
 *   (`AT&amp;T`, `<mailto:…|…>`, `<@U…>`). It is decoded here, ONCE — her
 *   mention and a leading "Marqueta," are taken off the raw text first, then
 *   the rest is decoded. Decoding twice is not harmless (a quote saying
 *   "<5% … >3%" would be read as a link and eaten), so the route hands over the
 *   raw text and nothing else decodes it.
 * - **Who may ask.** Outreach names prospects and the runway says how close
 *   the studio is to running out of money. Everything except help and capture
 *   is gated on `getSlackUserProfile`, which fails CLOSED: a guest, a member of
 *   another workspace sharing the channel, or a profile Slack would not return
 *   all get a polite no, and no record is read or written.
 * - **Who may READ the answer.** The gate above checks the person asking, but
 *   an answer in a channel is read by everyone in it — and a channel she has
 *   been invited to may hold guests or be shared with a client. She cannot see
 *   who is in a channel (that needs `channels:read`, which she does not have
 *   and will not be given), so anything about the work is answered only where
 *   the audience is known: a DM, or the marketing channels she is configured
 *   for. Anywhere else she says where to ask. Availability is the exception —
 *   it is about the person telling her, in the room they chose to say it in.
 * - **Where contact details go.** A call outline is for the room; an email
 *   address or a phone number is for the caller. In a DM they are appended to
 *   the outline; in a channel they come back as `ephemeral`, for the route to
 *   send to the requester alone. They are never in `blocks` in a channel.
 * - **Whose name a write carries.** Availability and a logged call are written
 *   under the person's BOARD name (`resolvePresserName`), never their Slack
 *   display name — "Juhan Sonin" written where the board says "Juhan" splits
 *   one person into two lists. And a display name is never enough to BECOME a
 *   name on the board that is already linked to somebody else's Slack account
 *   (see `presser`).
 *
 * Every reply is data (`MarquetaReply`); posting it — the thread, the
 * follow-up, the ephemeral — is the route's job.
 */
import 'server-only'
import { getSlackUserProfile } from '@/lib/chat/slack'
import { isRevisionConflict } from './apiBoundary'
import {
  availabilityDocId,
  parseAvailabilityCommand,
  resolveOwnerName,
  TEAM_AVAILABILITY_TYPE,
  type AvailabilityStatus,
  type TeamMemberAvailability,
} from './availability'
import { guessCallOutcome, type CallOutcomeKey } from './callLog'
import { logCallFromSlack, type CallLogResult } from './callLog.server'
import { newContactDocument, parsePrepRequest, resolvePrepTarget, type PrepContact } from './callPrep'
import { loadPrepData, prepCallFor, prepCallList, scrubPrepCandidates, type PrepData } from './callPrep.server'
import { estimateOperationMinutes, formatMinutes } from './effort'
import { followUpLine, followUpOrganization, followUpPersonLabel, listFollowUps, type FollowUpContact } from './followUps'
import { CHECKIN_HEARTBEAT_DOC_ID, heartbeatHealth, HEARTBEAT_DOC_ID, tickDidSomething, type HeartbeatRecord } from './heartbeat'
import { captureFromMessage, ideasNeedingReview } from './ideaCapture.server'
import { encodeCallLogUndo, encodeContactRef, MARQUETA_ACTION } from './marquetaActions'
import { captureConfirmation, marquetaHelpText, parseMarquetaIntent, stripAddress, type MarquetaIntent } from './marquetaChat'
import { MARKETING_OPERATION_TYPE } from './operations'
import { getOutreachClient } from './outreachClient.server'
import { summarizeOutreach } from './outreachPulse'
import { clipSlackText, decodeSlackText, escapeSlackText, marquetaHandle, SLACK_LIMITS, slackLink } from './slackText'
import { moneyAnswerText, pipelineAnswerText, strategyAnswerText } from './strategyCheck'
import { loadStrategySnapshot } from './strategyCheck.server'
import { loadTeamAvailability, resolvePresserName, slackIdForOwner } from './team.server'
import { buildCheckInTaskBlocks, isSlipping, type CheckInTask } from './weeklyCheckIn'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * What to post back. `text` is mrkdwn (already escaped) — the whole answer
 * when there are no blocks, the notification fallback when there are.
 *
 * - `blocks`: omitted (or empty) for a text answer; the route sends blocks
 *   only when there are some.
 * - `thread`: a second message for the same thread — the call outline's
 *   offer, voicemail and email draft, kept off the first screen so the opener
 *   is readable without scrolling.
 * - `ephemeral`: plain mrkdwn for the requester ONLY (contact details asked
 *   for in a channel). Text only: nothing interactive belongs in an ephemeral
 *   message, which the app can neither update nor act on afterwards.
 */
export type MarquetaReply = {
  text: string
  blocks?: Block[]
  thread?: { text: string; blocks: Block[] }
  ephemeral?: string
}

/** Planner records are the plan itself, not work on it. */
const WEEKLY_PLAN_PREFIX = 'weekly-plan/'
const DAY_MS = 86_400_000
const MAX_MINE_TASKS = 12
const MAX_MINE_FOLLOW_UPS = 5
const MAX_LOG_CANDIDATES = 5

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const safe = (value: unknown, max: number) => clipSlackText(escapeSlackText(clean(value)), max)
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

const section = (text: string): Block => ({
  type: 'section',
  text: { type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) || ' ' },
})
const context = (text: string): Block => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) || ' ' }],
})

/** A button, or null when its value would make Slack refuse the whole message. */
function button(label: string, actionId: string, value: string, primary = false): Block | null {
  if (!value || value.length > SLACK_LIMITS.buttonValue) return null
  const text = clean(label).slice(0, SLACK_LIMITS.buttonText) || 'Open'
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text, emoji: true },
    value,
    ...(primary ? { style: 'primary' } : {}),
  }
}

const actions = (...elements: (Block | null)[]): Block[] => {
  const usable = elements.filter((element): element is Block => Boolean(element))
  return usable.length ? [{ type: 'actions', elements: usable }] : []
}

// ── Fixed copy ───────────────────────────────────────────────────────────────

const FAILED = 'Something went wrong looking that up. The Studio still has the real answer.'
const COULD_NOT_CHECK_WHO =
  'I couldn’t check who you are in Slack just now, so I’m not answering that — try again in a minute.'
const TEAM_ONLY = 'Outreach, money and the plan are for the studio team, so I can’t help with that here.'
const COULD_NOT_READ_TEAM = 'I couldn’t read the team list just now, so nothing changed — try again in a minute.'
const COULD_NOT_FIND_YOURS = 'I couldn’t read the team list just now, so I can’t tell which work is yours — try again in a minute.'
const NOT_ON_BOARD =
  'I couldn’t tell which name on the board is yours. Link it from the “Which name is yours?” prompt on the Monday digest and ask me again.'
const WHO_WAS_IT =
  'Who was the call with? Tell me a name or an organisation — for example `called Sam Rivera at Acme, left a voicemail`.'
const OUTREACH_READ_FAILED =
  'I couldn’t reach the outreach records just now. The Studio’s Outreach tab can log it.'

/** Where the Studio's This week view is. MUST name a view: an unknown or missing one restores whatever was open last. */
function thisWeekStudioUrl(): string | undefined {
  const base = clean(process.env.MARKETING_PUBLIC_BASE_URL).replace(/\/+$/, '')
  return /^https?:\/\//i.test(base) ? `${base}/studio/marketing?view=thisWeek` : undefined
}

// ── Who is asking ────────────────────────────────────────────────────────────

/**
 * The requester's board name, worked out at most once per message and only
 * when an answer needs it. `boardName()` THROWS when the team list cannot be
 * read — each caller decides what that means (a write refuses; a read falls
 * back) — and returns null when the person cannot be named, because
 * `resolveOwnerName`'s "Someone" written as an owner is a person who does not
 * exist.
 *
 * It also returns null for a NAMESAKE. `resolvePresserName` falls back to an
 * exact display-name match, and that match used to win even when the roster
 * record was already linked to a different Slack account — so anybody whose
 * display name read "Juhan" was Juhan: they saw his list, logged calls as him,
 * and "I'm away" relinked his record to their id and wiped his allocation. A
 * name linked to someone else is theirs; only the linked account may use it.
 * (`team.server.ts` has the same fallback for the button paths; the guard
 * belongs there too.)
 */
function presser(input: { slackUserId?: string; personName: string }) {
  let roster: Promise<TeamMemberAvailability[]> | undefined
  const entries = () => (roster ||= loadTeamAvailability())
  const displayName = /^someone$/i.test(clean(input.personName)) ? '' : clean(input.personName)
  const slackUserId = clean(input.slackUserId)
  const boardName = async (): Promise<string | null> => {
    const team = await entries()
    const name = clean(await resolvePresserName({ slackUserId, displayName, entries: team }))
    if (!name || /^someone$/i.test(name)) return null
    const linkedIds = team
      .filter((entry) => clean(entry.ownerName).toLowerCase() === name.toLowerCase())
      .map((entry) => clean(entry.slackUserId))
      .filter(Boolean)
    if (linkedIds.length && !linkedIds.includes(slackUserId)) return null
    return name
  }
  /** The board name when it can be had, else the display name — for words said aloud, never for writes. */
  const spokenName = async (): Promise<string> => {
    try {
      return (await boardName()) || displayName || 'someone from GoInvo'
    } catch {
      return displayName || 'someone from GoInvo'
    }
  }
  return { entries, boardName, spokenName }
}

type Presser = ReturnType<typeof presser>

/** Answers that anybody in the channel may have: nothing in them is outreach or money. */
const UNGATED: ReadonlySet<MarquetaIntent['kind']> = new Set(['help', 'capture'])

/**
 * Team-only, but answerable in any channel: the reply is about the person who
 * said it, in the room they chose to say it in. Everything else gated is about
 * the work — prospects, the pipeline, the runway, the plan — and is answered
 * only where the audience is known (`answerableHere`).
 *
 * Availability is gated at all because it WRITES: a guest could otherwise put
 * a colleague's name on the board as away, and a record is a record whoever
 * made it.
 */
const ANSWERABLE_ANYWHERE: ReadonlySet<MarquetaIntent['kind']> = new Set(['availability'])

/**
 * Null when this person may be answered; otherwise the sentence to say instead.
 * `getSlackUserProfile` fails closed, and so does this.
 */
async function teamOnly(slackUserId: string | undefined): Promise<string | null> {
  const profile = await getSlackUserProfile(slackUserId)
  if (!profile.ok) return COULD_NOT_CHECK_WHO
  if (profile.isGuest || profile.isBot) return TEAM_ONLY
  return null
}

const IN_A_DM = (channel: string) => clean(channel).startsWith('D')

/**
 * The rooms whose audience is the studio: her own (`SLACK_MARKETING_CHANNEL_ID`)
 * and the marketing channels she is configured to sit in. The list is
 * configuration, not discovery — she has no `channels:read` and cannot check
 * who is in a room — so a channel is internal because somebody said so, and
 * any other channel is treated as one a guest or a client could be reading.
 */
function internalChannels(): Set<string> {
  return new Set(
    [process.env.SLACK_MARKETING_CHANNEL_IDS, process.env.SLACK_MARKETING_CHANNEL_ID]
      .join(',')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
}

const answerableHere = (channel: string) => IN_A_DM(channel) || internalChannels().has(clean(channel))

/** Where to ask instead, naming her own room when it is configured. */
function askMeElsewhere(): string {
  const own = clean(process.env.SLACK_MARKETING_CHANNEL_ID)
  const room = /^[CG][A-Z0-9]+$/.test(own) ? ` or in <#${own}>` : ''
  return (
    `I only talk about outreach, money and the plan in a DM${room} — ` +
    'people outside the studio can be in a channel like this one. Ask me there and I’ll answer.'
  )
}

// ── The week, the ideas, the heartbeat ───────────────────────────────────────

export const WEEK_QUERY = `*[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
  && status in ["queued", "working", "needsHuman"]
  && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]
  | order(coalesce(dueAt, "9999") asc)[0...40]{
    title, ownerName, suggestedOwner, kind, priority, estimatedMinutes
  }`

type OpenTask = {
  title?: string | null
  ownerName?: string | null
  suggestedOwner?: string | null
  kind?: string | null
  priority?: string | null
  estimatedMinutes?: number | null
}

/** The week, as a person would ask about it. */
async function answerWeek(): Promise<MarquetaReply> {
  const tasks = (await getOutreachClient().fetch<OpenTask[] | null>(WEEK_QUERY, { planPrefix: WEEKLY_PLAN_PREFIX })) || []
  if (!tasks.length) {
    return { text: 'Nothing open on the board — which is either very good news or a sign nobody has planned the week.' }
  }

  const minutes = tasks.reduce(
    (sum, task) =>
      sum +
      estimateOperationMinutes({
        kind: task.kind || undefined,
        priority: task.priority || undefined,
        estimatedMinutes: typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : undefined,
      }).minutes,
    0,
  )
  const unclaimed = tasks.filter((task) => !clean(task.ownerName))

  const lines = [`*${tasks.length} open*, about ${formatMinutes(minutes)} of work.`, `*${unclaimed.length} nobody has taken.*`]
  for (const task of unclaimed.slice(0, 5)) {
    const suggested = clean(task.suggestedOwner)
    lines.push(`• ${safe(task.title || 'Untitled task', 200)}${suggested ? ` _(suggested: ${safe(suggested, 80)})_` : ''}`)
  }
  if (unclaimed.length > 5) lines.push(`• …and ${unclaimed.length - 5} more`)
  return { text: lines.join('\n') }
}

async function answerIdeas(): Promise<MarquetaReply> {
  const pending = await ideasNeedingReview(10)
  if (!pending.length) return { text: 'Nothing waiting on a yes or no — the board is clear.' }
  return {
    text: [
      `*${pending.length}* I caught that still need a yes or no:`,
      ...pending.map((idea) => `• ${safe(idea.title || 'Untitled idea', 200)}`),
      '_Judge them on the This week tab in the Studio._',
    ].join('\n'),
  }
}

/** Both schedules' records, in one read. Same type and dataset, different ids. */
export const HEARTBEAT_QUERY = `{
  "tick": *[_id == $tick][0]{ week, ranAt, lastHealthyAt, steps, error },
  "checkin": *[_id == $checkin][0]{ week, ranAt, lastHealthyAt, steps, error, postedWeek }
}`

function stepLines(record: HeartbeatRecord | null | undefined): string[] {
  return (record?.steps || [])
    .filter(Boolean)
    .map((step) => `${step.ok ? '✓' : '✗'} ${safe(step.name, 40)} — ${safe(step.detail, 400)}`)
}

/**
 * Whether the schedules are actually alive — Monday's tick AND Thursday's
 * check-in, each from its own record, because one working says nothing about
 * the other.
 *
 * The answer names what the last run DID, not merely that it succeeded: a tick
 * that reports ok while planning nothing is the exact shape of an inert
 * mechanism, and this codebase has been caught by that class of bug before.
 */
async function answerHeartbeat(now: Date): Promise<MarquetaReply> {
  const data = await getOutreachClient().fetch<{
    tick?: HeartbeatRecord | null
    checkin?: HeartbeatRecord | null
  } | null>(HEARTBEAT_QUERY, { tick: HEARTBEAT_DOC_ID, checkin: CHECKIN_HEARTBEAT_DOC_ID })

  const tick = heartbeatHealth(data?.tick, now)
  const checkIn = heartbeatHealth(data?.checkin, now, 'Thursday check-in')
  const lines = [escapeSlackText(tick.summary), ...stepLines(data?.tick)]
  if (tick.healthy && !tickDidSomething(data?.tick?.steps || [])) {
    lines.push('_It ran, but none of its steps changed anything — that is what an inert schedule looks like._')
  }
  lines.push('', escapeSlackText(checkIn.summary), ...stepLines(data?.checkin))
  if (!tick.everRan && !checkIn.everRan) {
    lines.push('', '_Once the crons are deployed this answers with what each run actually did._')
  }
  return { text: lines.join('\n') }
}

// ── Money, strategy, pipeline ────────────────────────────────────────────────

/** Monday 00:00 UTC of the ISO week containing `now` — the check-in's week. */
function isoWeekStart(now: Date): number {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  return today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS
}

/**
 * "Runway", "money", "finances": the date, any disagreement with a hand-set
 * bin, the check-in if one is due (including "a deal was won — did it move
 * the date?"), and the pipeline — because "how are we for money?" in a studio
 * that does not keep its books in Slack means "how long, and what is coming".
 */
async function answerMoney(now: Date): Promise<MarquetaReply> {
  const loaded = await loadStrategySnapshot(now)
  const { runway } = loaded
  const checkInLine = runway.checkIn.due ? clean(`${runway.checkIn.reason} ${runway.checkIn.question}`) : undefined
  return {
    text: [
      moneyAnswerText({
        runwaySummary: runway.summary,
        disagreement: runway.resolved.disagreement,
        checkInLine,
        pipeline: loaded.snapshot.pipeline,
      }),
      '_Confirm it or record signed work from the Runway card on the Monday digest (or in the Studio) — the whole plan follows it._',
    ].join('\n'),
  }
}

async function answerStrategy(now: Date): Promise<MarquetaReply> {
  const loaded = await loadStrategySnapshot(now)
  return { text: strategyAnswerText(loaded.snapshot, loaded.due) }
}

/** Counts only — never who logged what, which in a channel is a leaderboard. */
async function answerPipeline(now: Date): Promise<MarquetaReply> {
  const loaded = await loadStrategySnapshot(now)
  const from = isoWeekStart(now)
  const week = summarizeOutreach(loaded.contacts, {
    from: new Date(from).toISOString(),
    to: new Date(from + 7 * DAY_MS).toISOString(),
    now,
  })
  return { text: pipelineAnswerText(week, loaded.snapshot.thisMonth, loaded.snapshot.pipeline) }
}

// ── "My tasks" ───────────────────────────────────────────────────────────────

export const MINE_DATA_QUERY = `{
  "tasks": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && defined(ownerName) && !(status in ["done", "dismissed"])
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]{
      _id, _createdAt, _updatedAt, title, ownerName, status, kind, priority,
      dueAt, estimatedMinutes, blocker, humanQuestion, lastOutcome, sourceKey
    },
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**")) && defined(followUpAt)]{
      _id, name, email, organization, owner, status, warmth, followUpAt,
      "interactions": interactions[]{ at, by, statusAfter }
    }
}`

type StoredTask = {
  _id: string
  _createdAt?: string | null
  _updatedAt?: string | null
  title?: string | null
  ownerName?: string | null
  status?: string | null
  kind?: string | null
  priority?: string | null
  dueAt?: string | null
  estimatedMinutes?: number | null
  blocker?: string | null
  humanQuestion?: string | null
  lastOutcome?: string | null
  sourceKey?: string | null
}

const orUndefined = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value)

function toCheckInTask(task: StoredTask): CheckInTask {
  return {
    _id: task._id,
    title: clean(task.title) || 'Untitled task',
    ownerName: orUndefined(task.ownerName),
    status: orUndefined(task.status),
    kind: orUndefined(task.kind),
    priority: orUndefined(task.priority),
    dueAt: orUndefined(task.dueAt),
    minutes: typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : undefined,
    blocker: orUndefined(task.blocker),
    humanQuestion: orUndefined(task.humanQuestion),
    lastOutcome: orUndefined(task.lastOutcome),
    updatedAt: orUndefined(task._updatedAt),
    createdAt: orUndefined(task._createdAt),
    sourceKey: orUndefined(task.sourceKey),
  }
}

const dayOf = (value: string | undefined) => {
  const ms = value ? Date.parse(value) : Number.NaN
  return Number.isNaN(ms) ? null : Math.floor(ms / DAY_MS) * DAY_MS
}

/** The check-in's reading order: slipping, overdue, stuck, then by date, undated last. */
function mineOrder(now: Date) {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  const rank = (task: CheckInTask) => {
    const due = dayOf(task.dueAt)
    return [
      isSlipping(task, now) ? 0 : 1,
      due !== null && due < today ? 0 : 1,
      clean(task.status) === 'blocked' ? 0 : 1,
      due === null ? Number.MAX_SAFE_INTEGER : due,
    ]
  }
  return (a: CheckInTask, b: CheckInTask) => {
    const left = rank(a)
    const right = rank(b)
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index]
    }
    return a.title.localeCompare(b.title) || a._id.localeCompare(b._id)
  }
}

/**
 * "My tasks": everything open with the person's board name on it, as the same
 * cards the Thursday check-in uses — so Done, Stuck and Hand back work here
 * too, and a press redraws just that card in this thread — then the
 * follow-ups on their contacts, with Prep and Log.
 *
 * A task is theirs by its owner NAME, or because the roster links that name to
 * their Slack id (two records for one person). Never by the Slack id stamped
 * on the task: that goes stale on a reassignment, and would show somebody the
 * work they no longer have.
 */
async function answerMine(input: {
  who: Presser
  slackUserId?: string
  botUserId?: string
  now: Date
}): Promise<MarquetaReply> {
  let entries: TeamMemberAvailability[]
  let name: string | null
  try {
    entries = await input.who.entries()
    name = await input.who.boardName()
  } catch (error) {
    console.error('[marqueta] could not read the team roster', error)
    return { text: COULD_NOT_FIND_YOURS }
  }
  if (!name) return { text: NOT_ON_BOARD }

  const data = await getOutreachClient().fetch<{
    tasks?: StoredTask[] | null
    contacts?: FollowUpContact[] | null
  } | null>(MINE_DATA_QUERY, { planPrefix: WEEKLY_PLAN_PREFIX })

  const me = name.toLowerCase()
  const id = clean(input.slackUserId)
  const isMine = (ownerName: string | null | undefined) =>
    clean(ownerName).toLowerCase() === me || Boolean(id && slackIdForOwner(entries, ownerName, null) === id)

  const tasks = (data?.tasks || [])
    .filter((task) => task && task._id && isMine(task.ownerName))
    .map(toCheckInTask)
    .sort(mineOrder(input.now))
  const followUps = listFollowUps((data?.contacts || []).filter((contact) => contact && contact._id), {
    now: input.now,
    resolveOwner: (raw) => resolveOwnerName({ displayName: raw, entries }),
  }).filter((entry) => entry.ownerName && isMine(entry.ownerName))

  const who = safe(name, 80)
  if (!tasks.length && !followUps.length) {
    return {
      text: `Nothing open on the board has your name on it, ${who}, and no follow-ups are due this week. Ask me \`week\` for what nobody has taken.`,
    }
  }

  const studioUrl = thisWeekStudioUrl()
  const handle = marquetaHandle(input.botUserId)
  const blocks: Block[] = [
    section(
      `*What’s on your list, ${who}* — ${plural(tasks.length, 'open task')}` +
        (followUps.length ? `, ${plural(followUps.length, 'follow-up')} due` : ''),
    ),
  ]
  for (const task of tasks.slice(0, MAX_MINE_TASKS)) blocks.push(...buildCheckInTaskBlocks(task, { now: input.now }))
  if (tasks.length > MAX_MINE_TASKS) {
    const more = tasks.length - MAX_MINE_TASKS
    blocks.push(context(`+${more} more ${studioUrl ? slackLink(studioUrl, 'in the Studio') : 'in the Studio'}`))
  }

  if (followUps.length) {
    blocks.push(section('*Follow-ups due*'))
    for (const entry of followUps.slice(0, MAX_MINE_FOLLOW_UPS)) {
      const line = followUpLine(entry, input.now)
      const ref = encodeContactRef({ contactId: entry.contactId, organization: entry.organization, name: entry.personLabel })
      blocks.push(section(`${line.label}\n${line.detail}`))
      blocks.push(
        ...actions(
          button('Prep', MARQUETA_ACTION.prepCall, ref),
          button('Log how it went', MARQUETA_ACTION.logCall, ref),
        ),
      )
    }
    if (followUps.length > MAX_MINE_FOLLOW_UPS) {
      const more = followUps.length - MAX_MINE_FOLLOW_UPS
      blocks.push(context(`${plural(more, 'more follow-up')} — ask ${handle} \`my calls\` for the whole list.`))
    }
  }
  if (studioUrl) {
    blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open the plan' }, url: studioUrl }] })
  }

  return {
    text: `${plural(tasks.length, 'open task')} and ${plural(followUps.length, 'follow-up')} for ${who}.`,
    blocks,
  }
}

// ── Call prep ────────────────────────────────────────────────────────────────

/**
 * "Prep Jane Doe at Acme": the outline, its threaded follow-up, and the
 * contact details routed to the requester alone.
 */
async function answerPrep(input: {
  target: string
  format: 'call' | 'email'
  channel: string
  who: Presser
  now: Date
}): Promise<MarquetaReply> {
  const prep = await prepCallFor({ text: input.target, senderName: await input.who.spokenName(), now: input.now })
  // Every PrepReply `text` is already mrkdwn-safe (the outline's title is
  // escaped by its builder; the rest is fixed copy). Escaping again would
  // show "AT&amp;T" to the person reading it.
  if (prep.kind === 'text') return { text: prep.text }
  if (prep.kind === 'candidates') return { text: prep.text, blocks: prep.blocks }

  const details = prep.contactDetails.map((line) => clean(line)).filter(Boolean)
  const first = [...prep.first]
  let ephemeral: string | undefined
  if (details.length) {
    const lines = details.map((line) => safe(line, 300)).join('\n')
    if (IN_A_DM(input.channel)) {
      // A DM is already private: the details go where the caller is reading.
      first.push(context(`*Contact details* (only in this DM)\n${lines}`))
    } else {
      ephemeral = clipSlackText(`Contact details for this call — only you can see this:\n${lines}`, SLACK_LIMITS.sectionText)
    }
  }

  const title = clean(prep.text) || 'Call prep'
  return {
    text: title,
    blocks: first,
    ...(prep.second.length
      ? {
          thread: {
            text: input.format === 'email' ? `${title} — the email draft` : `${title} — offer, voicemail and email draft`,
            blocks: prep.second,
          },
        }
      : {}),
    ...(ephemeral ? { ephemeral } : {}),
  }
}

// ── Logging a call from a message ────────────────────────────────────────────

/** "Jane Doe (Acme)" or "someone at Acme" — never an email address. */
function contactLabel(contact: Pick<PrepContact, 'name' | 'email' | 'organization'>): string {
  const person = followUpPersonLabel({ name: contact.name, email: contact.email, organization: contact.organization })
  const organization = followUpOrganization(contact.organization)
  return !/^someone\b/i.test(person) && organization ? `${person} (${organization})` : person
}

/**
 * The value a "Log how it went" button carries: the contact, and what the
 * person already said — so the form opens with their words in the notes and
 * the outcome picked. The outcome travels as a `CallOutcomeKey`.
 *
 * A button's value travels in the channel message like its text does, so the
 * organisation is scrubbed of contact details (an imported record's
 * "organisation" is sometimes just an email address) and the name is a label,
 * never an address. The note is only ever what the person just typed there.
 */
function logRef(contact: PrepContact, note: string, outcome: CallOutcomeKey | undefined): string {
  return encodeContactRef({
    contactId: contact._id,
    organization: followUpOrganization(contact.organization),
    name: contactLabel(contact),
    note,
    ...(outcome ? { outcome } : {}),
  })
}

function logButtonReply(lead: string, contact: PrepContact, note: string, outcome: CallOutcomeKey | undefined): MarquetaReply {
  return {
    text: lead,
    blocks: [section(lead), ...actions(button('Log how it went', MARQUETA_ACTION.logCall, logRef(contact, note, outcome), true))],
  }
}

/** Several people it could have been — each with its own Log button. */
function logCandidatesReply(contacts: PrepContact[], note: string, outcome: CallOutcomeKey | undefined, more = 0): MarquetaReply {
  const lead = 'Which one was it?'
  const blocks: Block[] = [section(lead)]
  for (const contact of contacts.slice(0, MAX_LOG_CANDIDATES)) {
    const logButton = button('Log it', MARQUETA_ACTION.logCall, logRef(contact, note, outcome))
    blocks.push({ ...section(`*${safe(contactLabel(contact), 300)}*`), ...(logButton ? { accessory: logButton } : {}) })
  }
  if (more > 0) blocks.push(context(`…and ${more} more on file there. Tell me their name and I’ll log it.`))
  return { text: lead, blocks }
}

function loggedReply(result: CallLogResult): MarquetaReply {
  const text = safe(result.message, 600)
  const undo = result.undo ? button('Undo', MARQUETA_ACTION.callLogUndo, encodeCallLogUndo(result.undo)) : null
  return { text, blocks: [section(text), ...actions(undo)] }
}

/**
 * "Called Jane at Acme, left a voicemail."
 *
 * Logged straight away only when all of it is certain: exactly one contact on
 * file, an outcome `guessCallOutcome` is sure of, a board name to log it
 * under, and a write the Undo button can take back exactly
 * (`onlyIfReversible`). Anything less gets the form, already filled in with
 * what was said — a wrong touch written in one press costs more than one more
 * press. Somebody not on file gets "Add them to outreach" instead, because
 * there is nothing to log against yet.
 *
 * The interaction key is the message's own (`slack-msg-<channel>-<ts>`), so a
 * redelivered event finds the touch it already wrote.
 */
async function answerLogCall(input: {
  text: string
  target: string
  channel: string
  ts: string
  who: Presser
  now: Date
}): Promise<MarquetaReply> {
  const request = parsePrepRequest(input.target)
  if (!clean(input.target) || (!request.name && !request.organization)) return { text: WHO_WAS_IT }

  let data: PrepData
  try {
    data = await loadPrepData()
  } catch (error) {
    console.error('[marqueta] call log read failed', error)
    return { text: OUTREACH_READ_FAILED }
  }

  const match = resolvePrepTarget(request, data.contacts, data.research)
  const outcome = guessCallOutcome(input.text)
  const note = input.text

  if (match.kind === 'contact') {
    const contact = match.contact
    const label = safe(contactLabel(contact), 200)
    if (!outcome) return logButtonReply(`What happened with *${label}*? Your note is already in the form.`, contact, note, outcome)

    let byName: string | null = null
    try {
      byName = await input.who.boardName()
    } catch (error) {
      console.error('[marqueta] could not read the team roster', error)
    }
    // No board name, no one-press write: the form resolves the name itself.
    if (!byName) return logButtonReply(`Log the call with *${label}* here:`, contact, note, outcome)

    const result = await logCallFromSlack({
      contactId: contact._id,
      outcomeKey: outcome,
      notes: note,
      followUp: 'default',
      byName,
      key: `slack-msg-${clean(input.channel)}-${clean(input.ts)}`,
      now: input.now,
      onlyIfReversible: true,
    })
    // A redelivery finds its own touch already written: say so, with no second Undo.
    if (result.ok) return result.undo && !result.skipped ? loggedReply(result) : { text: safe(result.message, 600) }
    // Not written (the Undo could not take it back exactly, or the save
    // failed): the form is the way forward, with what they said already in it.
    return logButtonReply(safe(result.message, 600), contact, note, outcome)
  }

  if (match.kind === 'organization' && match.contacts.length === 1) {
    const contact = match.contacts[0]
    return logButtonReply(`Was that *${safe(contactLabel(contact), 200)}*? Log it here:`, contact, note, outcome)
  }
  if (match.kind === 'organization' && match.contacts.length > 1) {
    return logCandidatesReply(match.contacts, note, outcome, match.contacts.length - MAX_LOG_CANDIDATES)
  }

  if (match.kind === 'ambiguous') {
    const people = match.candidates
      .map((candidate) => (candidate.contactId ? data.contacts.find((contact) => contact._id === candidate.contactId) : undefined))
      .filter((contact): contact is PrepData['contacts'][number] => Boolean(contact))
    if (people.length) return logCandidatesReply(people, note, outcome)
    // Imported records put email addresses in `organization`; this line is
    // posted in the channel, so the places are scrubbed like every other
    // label, and one that was only an address is not named at all.
    const places = scrubPrepCandidates(match.candidates)
      .map((candidate) => safe(candidate.organization, 120))
      .filter(Boolean)
    if (places.length === 1) {
      return { text: `Did you mean *${places[0]}*? Say it again with the full name and I’ll log it.` }
    }
    return {
      text: places.length
        ? `I know more than one place by that name: ${places.join(' · ')}. Say it again with the full name and I’ll log it.`
        : 'I know more than one place by that name. Say it again with the full name and I’ll log it.',
    }
  }

  // Nobody on file (or an organisation only our research knows): offer to add them.
  const organization = match.kind === 'organization' ? match.organization : request.organization
  const typed = { name: request.name, organization, role: request.role }
  // Not the message as `note`: an added contact stores its note as "how we
  // know them", and "called her, left a voicemail" is not a relationship.
  if (!newContactDocument({ ...typed, note: '', ownerName: '', now: input.now })) return { text: WHO_WAS_IT }
  const who = clean(request.name) || clean(organization)
  const lead =
    `*${safe(who, 200)}* isn’t in outreach yet, so there’s nothing to log it against. ` +
    'Add them and I’ll give you a button to log the call.'
  const add = button(
    `Add ${who.length > 50 ? `${who.slice(0, 49)}…` : who} to outreach`,
    MARQUETA_ACTION.addContact,
    encodeContactRef({ ...typed, ...(outcome ? { outcome } : {}) }),
    true,
  )
  return { text: lead, blocks: [section(lead), ...actions(add)] }
}

// ── Availability ─────────────────────────────────────────────────────────────

/**
 * What a message about time off turned out to be.
 *
 * Only `statement` is ever written. The intent parser routes ANY message with
 * a time-off word here — "who's away this week?", "is Juhan away next week?",
 * "what does the pipeline look like with Eric away?" — and each of those used
 * to mark the person ASKING as away from today to Sunday: zero hours in the
 * plan, skipped for asks, their work flagged for reassignment, and a bare
 * "Marked away" reply. Availability is the one answer that writes on the
 * strength of a keyword, so it is the one that has to be sure the sentence is
 * the sender saying something about themselves.
 */
export type TimeOffReading =
  | { kind: 'statement'; status: AvailabilityStatus; from: string; until?: string; weeklyHours?: number }
  | { kind: 'question' }
  | { kind: 'someoneElse' }
  | { kind: 'notFirstPerson' }
  | { kind: 'unclearDates' }

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/g

/** "fyi, heads up: I'm away…" — the preamble before the sentence that matters. */
const TIME_OFF_PREAMBLE = /^(?:(?:hey|hi|hello|fyi|btw|heads[- ]up|just so you know|jsyk|quick note|note|so|ok|okay|also|and)\b[\s,:;.!—–-]*)+/

/** Opens like a question. A question mark anywhere counts too. */
const QUESTION_OPENER =
  /^(?:who|who's|whos|whom|whose|is|isn't|are|aren't|was|were|when|does|do|did|what|what's|whats|which|how|how's|hows|where|will|would|can|could|should|has|have|anyone|anybody|everyone|everybody|any)\b/

/** Somebody else is the subject, or at least in the sentence. */
const THIRD_PERSON =
  /\b(?:he|she|they|he's|she's|they're|hes|shes|theyre|his|her|hers|their|theirs|him|them|someone|somebody|everyone|everybody|anyone|anybody|nobody)\b/

/**
 * The sender saying it about themselves, at the START of the sentence: "I'm
 * away…", "I'll be out…", "I'm taking Friday off", "I'm going on holiday",
 * "mark me away", "called in sick". The subject has to lead: "I heard Bob is
 * away" and "I'm sure Eric is out" contain an "I", and are about Bob and Eric.
 * Present and future only — "I was away last week" is not something to book.
 */
const FIRST_PERSON_TIME_OFF = new RegExp(
  '^(?:' +
    [
      String.raw`(?:i'?m|im|i am|i'?ll be|ill be|i will be|i'?m going to be|i am going to be|i'?m gonna be)\s+(?:(?:also|now|officially|actually|still|probably|definitely|going)\s+)*(?:away|out|off|ooo|back|available|sick|on (?:holiday|vacation|leave|pto|annual leave|sick leave|parental leave|medical leave))`,
      String.raw`(?:i'?m taking|i am taking|i'?ll be taking|i will be taking|i'?ll take|i will take|i'?m going on|i am going on|i need|i'?d like|i want)\s+(?:(?:a|some|the|a few|two|three|\d+)\s+)?(?:(?:day|days|week|weeks|time|afternoon|morning)\s+off|(?:monday|tuesday|wednesday|thursday|friday|today|tomorrow|next week|this week)\s+off|holiday|vacation|leave|pto)`,
      String.raw`(?:mark|put|count) me\b`,
      String.raw`(?:i\s+)?(?:just\s+)?(?:called|calling)\s+(?:in|out)\s+sick`,
    ].join('|') +
    String.raw`)\b`,
)

/** The imperative the help text teaches: "away next week", "back", "ooo 2026-10-05". */
const TIME_OFF_COMMAND = /^(?:away|ooo|out|off|back|sick|out sick|on (?:holiday|vacation|leave|pto)|holiday|vacation|pto|leave)\b/

/** Date words the reader below does NOT resolve. Any of them left over means "ask", not "guess". */
const UNRESOLVED_DATE_WORD =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|until|till|til|through|thru|from|since|starting|weeks|days|month|months|fortnight|weekend|next|last|\d+)\b/

const DAY = 86_400_000
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

/** This week's Sunday (UTC) — "this week" in Slack means the rest of the working week, as the digest's button does. */
function sundayOf(today: string): string {
  const ms = dayMs(today)
  return isoDay(ms + ((7 - new Date(ms).getUTCDay()) % 7) * DAY)
}

/** The first and last day of next week, as example dates the parser reads exactly. */
function exampleDates(today: string): { first: string; last: string } {
  const monday = dayMs(sundayOf(today)) + DAY
  return { first: isoDay(monday), last: isoDay(monday + 4 * DAY) }
}

/**
 * The days a statement means, or null when they cannot be read for certain.
 *
 * `parseAvailabilityCommand` is deliberately narrow, and wrapped here rather
 * than trusted with its defaults: it reads "away until 2026-10-02" as away
 * FROM the 2nd with no end, a single date as open-ended, and "away next week"
 * as today — and the old write then filled a missing end with this Sunday. So:
 * two dates are a range; one date is that day, or "until" it from today; with
 * no dates, "next week", "this week", "today" and "tomorrow" are resolved and
 * a bare "I'm away" means the rest of this week (the digest button's meaning,
 * and the reply says the dates out loud). Any other date word — "Friday",
 * "October", "for 2 weeks" — is a question back, never a guess.
 */
function timeOffDates(
  body: string,
  status: AvailabilityStatus,
  today: string,
): { from: string; until?: string } | null {
  const dates = body.match(ISO_DATE) || []
  if (status === 'available') {
    // "I'm back 2026-10-05" or "back on Monday", said while away, means away
    // until then; recorded as "available from then" it would end the holiday
    // today instead. Only "back" (today) is certain.
    if (dates.length > 1) return null
    if (!dates.length && UNRESOLVED_DATE_WORD.test(body.replace(/\b(?:today|now)\b/g, ' ').replace(/\btomorrow\b/g, ' 1 '))) return null
    const from = dates[0] || today
    return from > today ? null : { from }
  }
  if (dates.length > 2) return null
  if (dates.length === 2) {
    const [from, until] = dates
    return until < from || until < today ? null : { from, until }
  }
  if (dates.length === 1) {
    const [date] = dates
    if (new RegExp(String.raw`\b(?:until|till|til|through|thru|to|up to)\s+${date}`).test(body)) {
      return date < today ? null : { from: today, until: date }
    }
    if (new RegExp(String.raw`\b(?:from|starting|after|since)\s+${date}`).test(body)) return null
    return date < today ? null : { from: date, until: date }
  }

  const phrases: Array<[RegExp, () => { from: string; until: string }]> = [
    [/\bnext week\b/, () => ({ from: isoDay(dayMs(sundayOf(today)) + DAY), until: isoDay(dayMs(sundayOf(today)) + 7 * DAY) })],
    [/\b(?:this week|rest of (?:the|this) week)\b/, () => ({ from: today, until: sundayOf(today) })],
    [/\b(?:today|sick)\b/, () => ({ from: today, until: today })],
    [/\btomorrow\b/, () => ({ from: isoDay(dayMs(today) + DAY), until: isoDay(dayMs(today) + DAY) })],
  ]
  const found = phrases.filter(([pattern]) => pattern.test(body))
  if (found.length > 1) return null
  const rest = found.reduce((text, [pattern]) => text.replace(new RegExp(pattern.source, 'g'), ' '), body)
  if (UNRESOLVED_DATE_WORD.test(rest)) return null
  return found.length ? found[0][1]() : { from: today, until: sundayOf(today) }
}

/**
 * Read a time-off message: is it the sender saying something about their own
 * time, and which days. Pure. Names on the roster are checked separately
 * (`namesSomeoneElse`), after the roster is read — this needs nothing but the
 * text, so a question is turned away without a single lookup.
 */
export function readTimeOff(text: string, opts: { today: string; mentionsSomeoneElse?: boolean }): TimeOffReading {
  const plain = clean(text).replace(/[‘’]/g, "'").toLowerCase()
  const body = plain.replace(TIME_OFF_PREAMBLE, '').trim()
  // A colleague's mention is dropped by decoding, so it is checked first: in
  // "<@U…> is away next week" what is left reads like a question, and the
  // honest answer is that the message was about somebody else.
  if (opts.mentionsSomeoneElse) return { kind: 'someoneElse' }
  if (plain.includes('?') || QUESTION_OPENER.test(body)) return { kind: 'question' }
  if (THIRD_PERSON.test(body)) return { kind: 'someoneElse' }
  if (!FIRST_PERSON_TIME_OFF.test(body) && !TIME_OFF_COMMAND.test(body)) return { kind: 'notFirstPerson' }

  // "away 2026-09-28, back 2026-10-05" reads as BOTH to the parser (and it
  // picks "back"). Two answers is no answer.
  const away = /\b(?:away|out|off|ooo|holiday|vacation|pto|leave|sick)\b/.test(body)
  const back = /\b(?:back|available|returning)\b/.test(body)
  if (away && back) return { kind: 'unclearDates' }

  const parsed = parseAvailabilityCommand(
    body.replace(/\b(?:ooo|out of (?:the )?office|sick)\b/g, 'away'),
    opts.today,
  )
  if (!parsed) return { kind: 'unclearDates' }
  if (parsed.status === 'reduced') {
    // "Put me down for 2 hours this week": the hours are the allocation, and
    // the days are read like a holiday's — the "2" is not a date.
    if (typeof parsed.weeklyHours !== 'number') return { kind: 'unclearDates' }
    const dates = timeOffDates(body.replace(/\b\d+(?:\.\d+)?\s*(?:h|hrs?|hours?)\b/g, ' '), 'reduced', opts.today)
    return dates ? { kind: 'statement', status: 'reduced', ...dates, weeklyHours: parsed.weeklyHours } : { kind: 'unclearDates' }
  }
  const dates = timeOffDates(body, parsed.status, opts.today)
  if (!dates) return { kind: 'unclearDates' }
  return { kind: 'statement', status: parsed.status, ...dates }
}

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A colleague named in the message: "I'm away, and Eric is too" is partly
 * about Eric, and a sentence about two people is not one to book from.
 *
 * A full name ("Eric Benoit") matches in any case. A single name only matches
 * CAPITALISED and not as the first word, because first names are ordinary
 * words often enough to matter — a colleague called Will or Mark would
 * otherwise make "I will be away" and "mark me away" unwritable for everyone.
 * Missing a lower-case "eric" costs nothing: the sentence still leads with the
 * sender saying it about themselves, and only they are written.
 */
function namesSomeoneElse(text: string, me: string, entries: TeamMemberAvailability[]): boolean {
  const typed = clean(text)
  const lower = typed.toLowerCase()
  const afterFirstWord = typed.replace(/^\S+\s*/, ' ')
  const mine = clean(me).toLowerCase()
  const myFirst = mine.split(' ')[0]
  const whole = (word: string, flags: string) =>
    new RegExp(String.raw`(?:^|[^\p{L}\p{N}])${escapeForRegExp(word)}(?![\p{L}\p{N}])`, `u${flags}`)
  return entries.some((entry) => {
    const name = clean(entry.ownerName)
    if (!name || name.toLowerCase() === mine) return false
    if (name.includes(' ') && whole(name.toLowerCase(), '').test(lower)) return true
    const first = name.split(' ')[0]
    if (first.length < 3 || first.toLowerCase() === myFirst) return false
    const capitalised = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    return whole(capitalised, '').test(afterFirstWord)
  })
}

/** A Slack mention of anybody but her and the sender, in the RAW text (decoding drops mentions). */
function mentionsSomeoneElse(raw: string, sender: string | undefined, botUserId: string | undefined): boolean {
  return [...String(raw || '').matchAll(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g)].some(
    ([, id]) => id !== clean(botUserId) && id !== clean(sender),
  )
}

type StoredAvailability = {
  _id: string
  _rev?: string | null
  ownerName?: string | null
  slackUserId?: string | null
  status?: string | null
  from?: string | null
  until?: string | null
  weeklyHours?: number | null
}

export const AVAILABILITY_RECORD_QUERY = `*[_type == "${TEAM_AVAILABILITY_TYPE}" && _id == $id][0]{ _id, _rev, ownerName, slackUserId, status, from, until, weeklyHours }`

type TimeOffStatement = Extract<TimeOffReading, { kind: 'statement' }>

/**
 * Write the sender's own time off onto their availability record.
 *
 * PATCHED, never replaced. The record is also where a person's Slack link,
 * their weekly-hours allocation and a note live, and the old
 * `createOrReplace` wiped all three every time somebody said "I'm away" —
 * and relinked the record to whoever said it. Only status and dates change
 * here; nothing links an identity (that is the "Which name is yours?" prompt,
 * which asks first).
 *
 * Refuses a record linked to a different Slack account, or one whose name is
 * not this name (two names can share an id slug). Conditional on the revision
 * it read; a conflict is re-read and re-checked once. Read and written through
 * `getOutreachClient`, the dataset the roster is read from, so the check and
 * the write can never be looking at two different copies.
 */
async function recordOwnTimeOff(input: {
  name: string
  slackUserId: string
  statement: TimeOffStatement
  now: Date
}): Promise<{ ok: true; prior: StoredAvailability | null } | { ok: false; reason: 'notYours' | 'busy' }> {
  const client = getOutreachClient()
  const _id = availabilityDocId(input.name)
  const { status, from, until, weeklyHours } = input.statement
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prior = await client.fetch<StoredAvailability | null>(AVAILABILITY_RECORD_QUERY, { id: _id })
    const linked = clean(prior?.slackUserId)
    if (prior && ((linked && linked !== input.slackUserId) || clean(prior.ownerName).toLowerCase() !== input.name.toLowerCase())) {
      return { ok: false, reason: 'notYours' }
    }
    if (!prior) {
      await client.createIfNotExists({ _id, _type: TEAM_AVAILABILITY_TYPE, ownerName: input.name, status: 'available' })
    }
    let patch = client.patch(_id).set({
      status,
      from,
      ...(until ? { until } : {}),
      ...(typeof weeklyHours === 'number' ? { weeklyHours } : {}),
      updatedAt: input.now.toISOString(),
    })
    if (!until) patch = patch.unset(['until'])
    if (prior?._rev) patch = patch.ifRevisionId(prior._rev)
    try {
      await patch.commit()
      return { ok: true, prior }
    } catch (error) {
      if (!isRevisionConflict(error)) throw error
      if (attempt > 0) return { ok: false, reason: 'busy' }
    }
  }
  return { ok: false, reason: 'busy' }
}

function describeTimeOff(record: { status?: string | null; from?: string | null; until?: string | null; weeklyHours?: number | null }): string {
  const from = clean(record.from)
  const until = clean(record.until)
  const days = from && until ? (from === until ? `on ${from}` : `${from} to ${until}`) : from ? `from ${from}` : until ? `until ${until}` : ''
  if (record.status === 'away') return `away ${days}`.trim()
  if (record.status === 'reduced') {
    const hours = typeof record.weeklyHours === 'number' ? `${record.weeklyHours}h a week` : 'reduced hours'
    return `on ${hours} ${days}`.trim()
  }
  return `available ${days}`.trim()
}

/**
 * "I'm away next week", said to her.
 *
 * Written only when all of it is certain (see `readTimeOff`): the sender is the
 * subject, nobody else is named, the days are exact, the sender has a board
 * name that is theirs, and the record is not linked to anybody else. Anything
 * less is answered with the exact sentence that would work, and nothing
 * changes.
 *
 * The reply says the dates it wrote, what it replaced, and how to take it back
 * — in words: a button would need a handler in the interactions route, and
 * "I'm back" already IS the reverse of "I'm away".
 */
async function answerAvailability(input: {
  text: string
  rawText: string
  slackUserId?: string
  botUserId?: string
  who: Presser
  now: Date
}): Promise<MarquetaReply> {
  const today = input.now.toISOString().slice(0, 10)
  const example = exampleDates(today)
  const phrase = `\`I’m away ${example.first} ${example.last}\``
  const sayThis = `${phrase} (first day, last day)`
  const reading = readTimeOff(input.text, {
    today,
    mentionsSomeoneElse: mentionsSomeoneElse(input.rawText, input.slackUserId, input.botUserId),
  })
  if (reading.kind === 'question') {
    return { text: `That sounded like a question, so I haven’t changed anything. If you’re telling me you’re away, say ${sayThis}.` }
  }
  if (reading.kind === 'someoneElse') {
    return {
      text:
        'That sounded like it was about someone else, so I haven’t changed anything — I only note time off for the person telling me. ' +
        `If it’s you, say ${sayThis}.`,
    }
  }
  if (reading.kind === 'notFirstPerson') {
    return { text: `Did you mean you’re away? Say ${sayThis} and I’ll note it. Nothing has changed yet.` }
  }
  if (reading.kind === 'unclearDates') {
    return { text: `Which days? Tell me the first and last day — ${phrase} — and I’ll note exactly that. Nothing has changed yet.` }
  }

  // The record is keyed by the owner name the board uses; written under a
  // Slack display name it would be a second person, and the plan would keep
  // giving the real one work while "they" are away.
  let name: string | null
  let entries: TeamMemberAvailability[]
  try {
    entries = await input.who.entries()
    name = await input.who.boardName()
  } catch (error) {
    console.error('[marqueta] could not read the team roster', error)
    return { text: COULD_NOT_READ_TEAM }
  }
  if (!name) return { text: NOT_ON_BOARD }
  if (namesSomeoneElse(input.text, name, entries)) {
    return {
      text:
        'That mentions someone else, so I haven’t changed anything — I only note time off for the person telling me. ' +
        `If it’s you, say ${sayThis}.`,
    }
  }

  let result: Awaited<ReturnType<typeof recordOwnTimeOff>>
  try {
    result = await recordOwnTimeOff({ name, slackUserId: clean(input.slackUserId), statement: reading, now: input.now })
  } catch (error) {
    console.error('[marqueta] availability write failed', error)
    return { text: 'I couldn’t save that just now, so nothing changed — try again in a minute.' }
  }
  if (!result.ok) {
    return { text: result.reason === 'notYours' ? NOT_ON_BOARD : 'Someone was updating that at the same moment, so nothing changed — say it again.' }
  }

  const who = safe(name, 80)
  const now = describeTimeOff(reading)
  const lines =
    reading.status === 'away'
      ? [`Noted, ${who}: you’re ${now}. I won’t ask you to take anything then, and the digest will point your open work at whoever is free.`]
      : reading.status === 'reduced'
        ? [`Noted, ${who}: you’re ${now}. I’ll plan your share of the week around that.`]
        : [`Noted, ${who}: you’re ${now}.`]
  const prior = result.prior
  if (prior && (clean(prior.status) !== 'available' || clean(prior.until)) && describeTimeOff(prior) !== now) {
    lines.push(`_Before this I had you ${safe(describeTimeOff(prior), 200)}._`)
  }
  lines.push(
    reading.status === 'available'
      ? `Wrong? Tell me the days you’re away — ${sayThis}.`
      : 'Wrong? Tell me `I’m back` and I’ll take it off.',
  )
  return { text: lines.join('\n') }
}

// ── Capture ──────────────────────────────────────────────────────────────────

async function answerCapture(input: {
  intent: Extract<MarquetaIntent, { kind: 'capture' }>
  personName: string
  channel: string
  ts: string
}): Promise<MarquetaReply> {
  const result = await captureFromMessage({
    text: input.intent.text,
    personName: input.personName,
    channel: input.channel,
    ts: input.ts,
  })
  if (!result.ok) {
    // Only reachable when the classifier declined an EXPLICIT capture —
    // say so rather than swallowing it.
    return { text: `I could not file that: ${safe(result.message || 'it did not look like anything I keep.', 400)}` }
  }
  if (result.alreadyCaptured || result.mergedInto) return { text: 'Already have that one.' }
  const title = result.draft?.title || result.idea?.title || input.intent.text.slice(0, 80)
  return {
    text: captureConfirmation({
      kind: result.kind === 'draft' ? 'draft' : 'idea',
      title,
      explicit: input.intent.explicit,
    }),
  }
}

// ── The entry point ──────────────────────────────────────────────────────────

/**
 * Reply to a message addressed to Marqueta.
 *
 * `text` is the message EXACTLY as Slack delivered it — escaped, with her
 * mention in it. It is stripped and decoded here, once (see the header).
 *
 * Returns null when there is nothing worth saying — silence is a valid answer
 * and better than an acknowledgement nobody needs. Never throws: a failure is
 * answered in words, because the person asked and deserves to know it failed.
 */
export async function answerMarqueta(input: {
  text: string
  personName: string
  slackUserId?: string
  channel: string
  ts: string
  /** The thread the message was in, when it was a reply. Carried for the record; replies are threaded by the route. */
  threadTs?: string
  botUserId?: string
  now?: Date
}): Promise<MarquetaReply | null> {
  const now = input.now || new Date()
  const who = presser({ slackUserId: input.slackUserId, personName: input.personName })

  try {
    const intent = parseMarquetaIntent(decodeSlackText(stripAddress(input.text || '', input.botUserId)))
    if (!UNGATED.has(intent.kind)) {
      // Where first, then who: the room is known without a lookup, and an
      // answer nobody here should read is refused whoever asked for it.
      if (!ANSWERABLE_ANYWHERE.has(intent.kind) && !answerableHere(input.channel)) return { text: askMeElsewhere() }
      const refusal = await teamOnly(input.slackUserId)
      if (refusal) return { text: refusal }
    }

    const reply = await (async (): Promise<MarquetaReply> => {
      switch (intent.kind) {
        case 'help':
          return { text: marquetaHelpText(marquetaHandle(input.botUserId)) }
        case 'capture':
          return answerCapture({ intent, personName: input.personName, channel: input.channel, ts: input.ts })
        case 'availability':
          return answerAvailability({
            text: intent.text,
            rawText: input.text || '',
            slackUserId: input.slackUserId,
            botUserId: input.botUserId,
            who,
            now,
          })
        case 'prep':
          return answerPrep({ target: intent.target, format: intent.format, channel: input.channel, who, now })
        case 'prepList': {
          // "Yours" needs the roster; the team-wide list is still a useful
          // answer when it cannot be read.
          let entries: TeamMemberAvailability[] | null = null
          let personName: string | undefined
          try {
            entries = await who.entries()
            personName = (await who.boardName()) || undefined
          } catch (error) {
            console.error('[marqueta] could not read the team roster', error)
          }
          const roster = entries
          const list = await prepCallList({
            now,
            personName,
            handle: marquetaHandle(input.botUserId),
            ...(roster ? { resolveOwner: (raw: string) => resolveOwnerName({ displayName: raw, entries: roster }) } : {}),
          })
          return list.blocks.length ? { text: list.text, blocks: list.blocks } : { text: list.text }
        }
        case 'logCall':
          return answerLogCall({ text: intent.text, target: intent.target, channel: input.channel, ts: input.ts, who, now })
        case 'mine':
          return answerMine({ who, slackUserId: input.slackUserId, botUserId: input.botUserId, now })
        case 'week':
          return answerWeek()
        case 'runway':
          return answerMoney(now)
        case 'strategy':
          return answerStrategy(now)
        case 'pipeline':
          return answerPipeline(now)
        case 'ideas':
          return answerIdeas()
        case 'heartbeat':
          return answerHeartbeat(now)
        default:
          return { text: marquetaHelpText(marquetaHandle(input.botUserId)) }
      }
    })()

    return { ...reply, text: clipSlackText(reply.text, SLACK_LIMITS.fallbackText - 100) || ' ' }
  } catch (error) {
    console.error('[marqueta] answering failed', error)
    return { text: FAILED }
  }
}
