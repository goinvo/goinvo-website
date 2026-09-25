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
 *   (`AT&amp;T`, `<mailto:…|…>`, `<@U…>`). Her mention is taken off the raw
 *   text, then the rest is decoded ONCE. Decoding twice is not harmless (a
 *   quote saying "<5% … >3%" would be read as a link and eaten), so the route
 *   hands over the raw text and nothing else decodes it.
 * - **Saying nothing.** "thanks!", "ok" and "👍" get no reply at all. Every one
 *   of them used to get the whole help page, which is the noise a bot gets
 *   muted for.
 * - **Who may ask.** Outreach names prospects and the runway says how close
 *   the studio is to running out of money. Everything except help, capture
 *   and "I didn't understand" is gated on `getSlackUserProfile`, which fails
 *   CLOSED: a guest, a member of another workspace sharing the channel, or a
 *   profile Slack would not return all get a polite no, and no record is read
 *   or written — not even to say whether a contact exists.
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
 * - **Undo on every write that came from a message.** A logged call carries
 *   the receipt's Undo; time off carries the Undo `setMarketingAvailability`
 *   hands back. Anything that could move a contact backwards is not written
 *   from a message at all — it opens the form, filled in.
 *
 * Every answer follows the Answer shape of the message design system
 * (marquetaStyle.ts): the first line is `*Summary* — the answer` and doubles
 * as the notification, it fits one phone screen, and it ends on exactly one
 * next thing — a row of buttons, or one `Marqueta, …` hint.
 *
 * Every reply is data (`MarquetaReply`); posting it — the thread, the
 * follow-up, the ephemeral — is the route's job.
 */
import 'server-only'
import { getSlackUserProfile } from '@/lib/chat/slack'
import {
  parseAvailabilityCommand,
  resolveOwnerName,
  whoIsAwayOn,
  type AvailabilityStatus,
  type TeamMemberAvailability,
} from './availability'
import {
  buildCallLogReceiptBlocks,
  callLogReceiptLine,
  confirmationPrompt,
  guessCallOutcome,
  needsConfirmation,
  type CallOutcomeKey,
} from './callLog'
import { logCallFromSlack } from './callLog.server'
import {
  buildPrepCandidatesBlocks,
  NEW_CONTACT_STATUS,
  newContactDocument,
  parsePrepRequest,
  resolvePrepTarget,
  type PrepContact,
} from './callPrep'
import { loadPrepData, prepCallFor, prepCallList, scrubPrepCandidates, type PrepData } from './callPrep.server'
import { getMarketingWriteClientFor } from './client'
import { estimateOperationMinutes, formatMinutes } from './effort'
import {
  followUpLine,
  followUpOrganization,
  followUpPersonLabel,
  followUpStatusLabel,
  listFollowUps,
  type FollowUpContact,
} from './followUps'
import { CHECKIN_HEARTBEAT_DOC_ID, heartbeatHealth, HEARTBEAT_DOC_ID, tickDidSomething, type HeartbeatRecord } from './heartbeat'
import { captureFromMessage, ideasNeedingReview } from './ideaCapture.server'
import { encodeCallLogUndo, encodeContactRef, MARQUETA_ACTION } from './marquetaActions'
import {
  captureConfirmation,
  marquetaHelpText,
  parseMarquetaIntent,
  removeMention,
  unknownReplyText,
  type MarquetaIntent,
} from './marquetaChat'
import {
  actionsRow,
  addContactLabel,
  askMarqueta,
  countLabel,
  errorLine,
  formatSlackDay,
  LABEL,
  openViewButton,
  slackDayKey,
  slackReadable,
  STATE_EMOJI,
} from './marquetaStyle'
import { MARKETING_OPERATION_TYPE } from './operations'
import { getOutreachClient } from './outreachClient.server'
import { summarizeOutreach } from './outreachPulse'
import { setMarketingAvailability } from './slackActions.server'
import { MARKETING_ACTION } from './slackDelegation'
import { clipSlackText, decodeSlackText, escapeSlackText, SLACK_LIMITS, slackLink } from './slackText'
import { moneyAnswer, pipelineAnswer, strategyAnswer } from './strategyCheck'
import { loadStrategySnapshot } from './strategyCheck.server'
import { studioViewUrl, type StudioFocus } from './taskLinks'
import { loadTeamAvailability, resolveOwnerNameForWrite, resolvePresserName, slackIdForOwner } from './team.server'
import { buildCheckInTaskBlocks, buildTaskCard, isDecisionTask, isSlipping, type CheckInTask } from './weeklyCheckIn'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * What to post back. `text` is mrkdwn (already escaped) — the whole answer
 * when there are no blocks, the notification when there are, so its first
 * line is always the summary.
 *
 * - `blocks`: omitted (or empty) for a text answer; the route sends blocks
 *   only when there are some.
 * - `thread`: a second message for the same thread — the call outline's
 *   offer, voicemail and email draft, kept off the first screen so the opener
 *   is readable without scrolling.
 * - `ephemeral`: plain mrkdwn for the requester ONLY (contact details asked
 *   for in a channel, or a failure). Text only: nothing interactive belongs in
 *   an ephemeral message, which the app can neither update nor act on
 *   afterwards.
 *
 * A reply whose `text` is empty and has no blocks posts nothing in the room —
 * only the `ephemeral`, to the person who asked (`failed`). In a DM the route
 * sends it as the reply itself: the room is already private.
 */
export type MarquetaReply = {
  text: string
  blocks?: Block[]
  thread?: { text: string; blocks: Block[] }
  ephemeral?: string
}

/**
 * Something went wrong: said to the person who asked and nobody else — the
 * Error shape of the message design system. A failure posted in the thread
 * tells the whole room that a lookup broke and gives them nothing to do about
 * it; the person who asked needs to know, and where to go instead.
 */
const failed = (line: string): MarquetaReply => ({ text: '', ephemeral: clipSlackText(line, SLACK_LIMITS.sectionText) })

/** Planner records are the plan itself, not work on it. */
const WEEKLY_PLAN_PREFIX = 'weekly-plan/'
const DAY_MS = 86_400_000
/** One phone screen of cards; the rest is on This week. */
const MAX_WEEK_CARDS = 3
const MAX_MINE_TASKS = 5
const MAX_MINE_FOLLOW_UPS = 3
const MAX_IDEAS_NAMED = 5

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const safe = (value: unknown, max: number) => clipSlackText(escapeSlackText(clean(value)), max)
/** A name as it sits inside bold or italics: escaped, and unable to end the formatting early. */
const inline = (value: unknown, max: number) => safe(value, max).replace(/[*_~`]/g, '')

const section = (text: string): Block => ({
  type: 'section',
  text: { type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) || ' ' },
})
const context = (text: string): Block => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) || ' ' }],
})

/** A button, or null when its value would make Slack refuse the whole message. */
function button(label: string, actionId: string, value?: string, primary = false): Block | null {
  if (value !== undefined && (!value || value.length > SLACK_LIMITS.buttonValue)) return null
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text: clean(label).slice(0, SLACK_LIMITS.buttonText), emoji: true },
    ...(value !== undefined ? { value } : {}),
    ...(primary ? { style: 'primary' } : {}),
  }
}

// ── Fixed copy ───────────────────────────────────────────────────────────────

const FAILED = errorLine('look that up', 'The Studio still has the real answer.')
const COULD_NOT_CHECK_WHO = errorLine('check who you are in Slack just now', 'Try again in a minute.')
/** The guest refusal. It never says whether a contact, a task or a number exists. */
const TEAM_ONLY = 'That’s for the GoInvo team, so I’ll leave it there.'
const COULD_NOT_READ_TEAM = errorLine('read the team list just now', 'Try again in a minute.')
const COULD_NOT_FIND_YOURS = errorLine('read the team list just now, so I can’t tell which work is yours', 'Try again in a minute.')
const NOT_ON_BOARD = errorLine(
  'tell which name on the team list is yours',
  'Pick your name in the Monday plan’s one-time setup, then ask me again.',
)
const WHO_WAS_IT =
  `Who was that with? Say ${askMarqueta('called Jane Doe at MGB, left a voicemail')}, ` +
  `or press ${LABEL.LOG} next to them in ${askMarqueta('my calls')}.`
const OUTREACH_READ_FAILED = errorLine('reach the outreach records just now', 'The Studio’s Outreach tab can log it.')

/** The Studio base URL, or undefined — every link built from it goes through `studioViewUrl`. */
const studioBase = () => clean(process.env.MARKETING_PUBLIC_BASE_URL) || undefined

/** DMs are only offered when they are actually wired up (`im:history` + `message.im`). */
const dmsWired = () => clean(process.env.SLACK_MARQUETA_DMS) === '1'

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
 * (`team.server.ts` carries the same guard for the button paths.)
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
  /**
   * The board name for a write filed UNDER it — who made a logged call
   * (`resolveOwnerNameForWrite`): null when the team list does not know them,
   * rather than a display name that would split one person into two.
   */
  const ownerName = async (): Promise<string | null> => {
    const name = clean(await resolveOwnerNameForWrite({ slackUserId, displayName, entries: await entries() }))
    return !name || /^someone$/i.test(name) ? null : name
  }
  /** The board name when it can be had, else the display name — for words said aloud, never for writes. */
  const spokenName = async (): Promise<string> => {
    try {
      return (await boardName()) || displayName || 'someone from GoInvo'
    } catch {
      return displayName || 'someone from GoInvo'
    }
  }
  return { entries, boardName, ownerName, spokenName }
}

type Presser = ReturnType<typeof presser>

/**
 * Answers that anybody in the channel may have: nothing in them is outreach
 * or money. (A greeting and help are answered to anybody too, but differently
 * to a guest — see `answerMarqueta`.)
 */
const UNGATED: ReadonlySet<MarquetaIntent['kind']> = new Set(['capture', 'unknown'])

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

/** Where to ask instead: her own room when it is configured, and a DM only when DMs are wired up. */
function askMeElsewhere(): string {
  const own = clean(process.env.SLACK_MARKETING_CHANNEL_ID)
  const rooms = [dmsWired() ? 'a DM' : '', /^[CG][A-Z0-9]+$/.test(own) ? `<#${own}>` : ''].filter(Boolean)
  const where = rooms.length ? rooms.join(' or in ') : 'the marketing channels'
  return (
    `I only talk about outreach, money and the plan in ${where} — ` +
    'people outside the studio can be in a channel like this one. Ask me there and I’ll answer.'
  )
}

// ── Hello, and help ──────────────────────────────────────────────────────────

/**
 * "hi": three lines at most, ending on this person's most useful thing — the
 * follow-ups they owe, then their open work, then the help. Only personal
 * where the answer is allowed to be (a team member, in a room whose audience
 * is known); anywhere else a hello gets the one-line introduction.
 */
async function answerGreeting(input: { who: Presser; slackUserId?: string; now: Date; personal: boolean }): Promise<MarquetaReply> {
  const intro = 'I keep GoInvo’s outreach list, the week’s marketing tasks and the runway.'
  if (!input.personal) return { text: `Hi. ${intro} ${askMarqueta('help')} for what I can do.` }

  let name: string | null = null
  let next = `${askMarqueta('help')} for what I can do.`
  try {
    name = await input.who.boardName()
    if (name) {
      const mine = await readMine({ who: input.who, name, slackUserId: input.slackUserId, now: input.now })
      if (mine.followUps.length) {
        next = `You have ${countLabel(mine.followUps.length, 'follow-up')} due — say ${askMarqueta('my calls')}.`
      } else if (mine.tasks.length) {
        next = `You have ${countLabel(mine.tasks.length, 'open task')} — say ${askMarqueta('my tasks')}.`
      }
    }
  } catch (error) {
    // A hello is still a hello when the records cannot be read.
    console.error('[marqueta] greeting lookup failed', error)
  }
  const hello = name ? `Hi ${inline(name, 60)}.` : 'Hi.'
  return { text: `${hello} ${intro}\n${next}` }
}

// ── The week, the ideas, the heartbeat ───────────────────────────────────────

export const WEEK_QUERY = `*[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
  && status in ["queued", "working", "needsHuman", "blocked"]
  && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]
  | order(select(defined(dueAt) && dueAt != "" => dueAt, "9999") asc)[0...60]{
    _id, _createdAt, _updatedAt, title, ownerName, kind, priority, estimatedMinutes,
    status, dueAt, blocker, humanQuestion, lastOutcome, sourceKey, targetView
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
  targetView?: string | null
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
    targetView: orUndefined(task.targetView),
  }
}

const taskMinutes = (task: CheckInTask) =>
  estimateOperationMinutes({ kind: task.kind, priority: task.priority, estimatedMinutes: task.minutes }).minutes

/** A decision still waiting for its answer — not something to "take". */
const awaitingDecision = (task: CheckInTask) => clean(task.status) === 'needsHuman' && isDecisionTask(task)

/** The studio's day for an instant (America/New_York), for "overdue". */
const studioDay = (value: string | Date | undefined) => slackDayKey(value ?? null) || ''

/** A link line to This week, or plain words when there is no Studio to link to. */
function onThisWeek(label: string, params: { owner?: string; focus?: StudioFocus } = {}): string {
  const url = studioViewUrl(studioBase(), 'thisWeek', params)
  return url ? slackLink(url, label) : escapeSlackText(label)
}

/**
 * "Marqueta, week": the room's view, one phone screen.
 *
 *   *This week* — you have 2 open, 1 overdue · `Marqueta, my tasks`
 *   12 open across the team, about 6h · 3 nobody has taken · 1 decision waiting
 *   🌴 Away this week: Eric
 *   [up to three cards for work nobody has — I'll take it]
 *   +2 more on This week
 *   [Open This week]
 *
 * Stuck work counts (it used to be left out of both this and the digest, so
 * the one task that most needed a hand was the one nobody saw). Decisions are
 * counted, not carded: they are answered, not taken. The cards carry no "ask"
 * — this answer never suggests a name, so it never suggests someone who is
 * away.
 */
async function answerWeek(input: { who: Presser; now: Date }): Promise<MarquetaReply> {
  const tasks = ((await getOutreachClient().fetch<StoredTask[] | null>(WEEK_QUERY, { planPrefix: WEEKLY_PLAN_PREFIX })) || [])
    .filter((task) => task && task._id)
    .map(toCheckInTask)
  const open = openViewButton('thisWeek', studioViewUrl(studioBase(), 'thisWeek'))

  let name: string | null = null
  let entries: TeamMemberAvailability[] = []
  try {
    entries = await input.who.entries()
    name = await input.who.boardName()
  } catch (error) {
    // The team's view is still worth giving when "yours" cannot be worked out.
    console.error('[marqueta] could not read the team roster', error)
  }

  if (!tasks.length) {
    const lead = '*This week* — nothing open. Either very good news, or nobody has planned the week yet.'
    return { text: lead, blocks: [section(lead), ...(open ? actionsRow([open]) : [context(`${askMarqueta('ideas')} shows what I’ve caught.`)])] }
  }

  const today = studioDay(input.now)
  const mine = name ? tasks.filter((task) => clean(task.ownerName).toLowerCase() === name!.toLowerCase()) : []
  const overdue = mine.filter((task) => task.dueAt && studioDay(task.dueAt) < today).length
  const decisions = tasks.filter(awaitingDecision)
  const unowned = tasks.filter((task) => !clean(task.ownerName) && !awaitingDecision(task))
  const minutes = tasks.reduce((sum, task) => sum + taskMinutes(task), 0)
  const away = whoIsAwayOn(entries, today)

  const team =
    `${countLabel(tasks.length, 'open task')} across the team, about ${formatMinutes(minutes)}` +
    (unowned.length ? ` · ${unowned.length} nobody has taken` : '') +
    (decisions.length ? ` · ${countLabel(decisions.length, 'decision')} waiting` : '')
  const first = name
    ? `*This week* — you have ${mine.length} open${overdue ? `, ${overdue} overdue` : ''} · ${askMarqueta('my tasks')}`
    : `*This week* — ${team}`
  const lines = [first, name ? team : '', away.length ? `${STATE_EMOJI.away} Away this week: ${away.map((person) => inline(person, 60)).join(', ')}` : '']

  const blocks: Block[] = [section(lines.filter(Boolean).join('\n'))]
  for (const task of unowned.slice(0, MAX_WEEK_CARDS)) {
    blocks.push(...buildTaskCard(task, { now: input.now, mode: 'plan', studioBaseUrl: studioBase() }))
  }
  if (unowned.length > MAX_WEEK_CARDS) blocks.push(context(`+${unowned.length - MAX_WEEK_CARDS} more nobody has taken — ${onThisWeek('on This week')}`))
  blocks.push(...(open ? actionsRow([open]) : [context(`${askMarqueta('my tasks')} for your own list.`)]))
  return { text: first, blocks }
}

/**
 * How many ideas are waiting, all of them. The list read is capped (only five
 * are named), and counting the capped list said "10 ideas" to a backlog of 40
 * — the same undercount the digest had. Same filter as `ideasNeedingReview`,
 * through the same routed client, so both read the dataset the ideas are in.
 */
export const IDEAS_PENDING_COUNT_QUERY = 'count(*[_type == $type && needsReview == true])'
const IDEA_TYPE = 'marketingIdea'

async function countIdeasNeedingReview(): Promise<number | null> {
  try {
    const count = await getMarketingWriteClientFor(IDEA_TYPE).fetch<number | null>(IDEAS_PENDING_COUNT_QUERY, { type: IDEA_TYPE })
    return typeof count === 'number' && Number.isFinite(count) ? count : null
  } catch (error) {
    console.error('[marqueta] idea count failed', error)
    return null
  }
}

async function answerIdeas(): Promise<MarquetaReply> {
  const [pending, counted] = await Promise.all([ideasNeedingReview(MAX_IDEAS_NAMED), countIdeasNeedingReview()])
  if (!pending.length) {
    return { text: `*Caught in Slack* — nothing waiting on a yes or no. ${askMarqueta('capture a booth at Town Day')} adds one.` }
  }
  // Never fewer than were just read, whatever the count said.
  const total = Math.max(counted ?? 0, pending.length)
  const lead = `*Caught in Slack* — ${countLabel(total, 'idea')} still ${total === 1 ? 'needs' : 'need'} a yes or no`
  const named = pending.slice(0, MAX_IDEAS_NAMED).map((idea) => `• ${safe(idea.title || 'Untitled idea', 200)}`)
  const more = total - named.length
  const open = openViewButton('thisWeek', studioViewUrl(studioBase(), 'thisWeek', { focus: 'caught' }))
  return {
    text: lead,
    blocks: [
      section([lead, ...named, ...(more > 0 ? [`…and ${more} more`] : [])].join('\n')),
      ...(open ? actionsRow([open]) : [context('Judge them on the This week tab in the Studio.')]),
    ],
  }
}

/** Both schedules' records, in one read. Same type and dataset, different ids. */
export const HEARTBEAT_QUERY = `{
  "tick": *[_id == $tick][0]{ week, ranAt, lastHealthyAt, steps, error },
  "checkin": *[_id == $checkin][0]{ week, ranAt, lastHealthyAt, steps, error, postedWeek }
}`

/**
 * A run's steps, one line each. The detail is prose the tick recorded for its
 * log ("11 item(s) planned for 2026-W36" in older records), so it is made
 * readable as it is shown (`slackReadable`) — the stored record stays as the
 * watchdog reads it.
 */
function stepLines(record: HeartbeatRecord | null | undefined, now: Date): string[] {
  return (record?.steps || [])
    .filter(Boolean)
    .map((step) => `${step.ok ? STATE_EMOJI.done : STATE_EMOJI.risk} ${safe(step.name, 40)} — ${safe(slackReadable(step.detail, now), 400)}`)
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
  const lines = [`*Schedules* — ${escapeSlackText(slackReadable(tick.summary, now))}`, ...stepLines(data?.tick, now)]
  if (tick.healthy && !tickDidSomething(data?.tick?.steps || [])) {
    lines.push('_It ran, but none of its steps changed anything — that is what an inert schedule looks like._')
  }
  lines.push('', escapeSlackText(slackReadable(checkIn.summary, now)), ...stepLines(data?.checkin, now))
  if (!tick.everRan && !checkIn.everRan) {
    lines.push('', '_Once the crons are deployed this answers with what each run actually did._')
  }
  lines.push('', `${askMarqueta('week')} shows what the plan holds now.`)
  return { text: lines.join('\n') }
}

// ── Money, strategy, pipeline ────────────────────────────────────────────────

/** Monday 00:00 UTC of the ISO week containing `now` — the check-in's week. */
function isoWeekStart(now: Date): number {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  return today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS
}

/**
 * "Runway", "money", "finances": the number, any disagreement with a hand-set
 * bin and the pipeline — ending on the runway's own three buttons when a
 * check-in is due (they redraw in place, as on the Monday plan), otherwise on
 * the next question worth asking. See `moneyAnswer`.
 */
async function answerMoney(now: Date): Promise<MarquetaReply> {
  const loaded = await loadStrategySnapshot(now)
  return moneyAnswer({ now, runway: loaded.runway, snapshot: loaded.snapshot })
}

async function answerStrategy(now: Date): Promise<MarquetaReply> {
  const loaded = await loadStrategySnapshot(now)
  return strategyAnswer({ now, snapshot: loaded.snapshot, due: loaded.due, runway: loaded.runway })
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
  return pipelineAnswer({ week, snapshot: loaded.snapshot })
}

/**
 * "We signed Acme for 3 months." Money is never written from a sentence: the
 * runway moves through its own form, which asks what was signed and for how
 * long and then extends the date. This says what it heard, so the form is
 * quick to fill, and hands over the button.
 */
function answerSigned(intent: Extract<MarquetaIntent, { kind: 'signed' }>): MarquetaReply {
  const what = clean(intent.label) ? inline(intent.label, 120) : 'new work'
  const months = typeof intent.months === 'number' ? ` for ${intent.months} ${intent.months === 1 ? 'month' : 'months'}` : ''
  const lead = `*Signed work* — ${what}${months}. Record it and the runway moves with it:`
  return { text: lead, blocks: [section(lead), ...actionsRow([button(LABEL.RUNWAY_SIGNED, MARKETING_ACTION.runwaySigned)])] }
}

// ── "My tasks" ───────────────────────────────────────────────────────────────

export const MINE_DATA_QUERY = `{
  "tasks": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && defined(ownerName) && !(status in ["done", "dismissed"])
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]{
      _id, _createdAt, _updatedAt, title, ownerName, status, kind, priority,
      dueAt, estimatedMinutes, blocker, humanQuestion, lastOutcome, sourceKey, targetView
    },
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**")) && defined(followUpAt)]{
      _id, name, email, organization, owner, status, warmth, followUpAt,
      "interactions": interactions[]{ at, by, statusAfter }
    }
}`

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
 * One person's open work and the follow-ups on their contacts.
 *
 * A task is theirs by its owner NAME, or because the roster links that name to
 * their Slack id (two records for one person). Never by the Slack id stamped
 * on the task: that goes stale on a reassignment, and would show somebody the
 * work they no longer have.
 */
async function readMine(input: { who: Presser; name: string; slackUserId?: string; now: Date }) {
  const entries = await input.who.entries()
  const data = await getOutreachClient().fetch<{
    tasks?: StoredTask[] | null
    contacts?: FollowUpContact[] | null
  } | null>(MINE_DATA_QUERY, { planPrefix: WEEKLY_PLAN_PREFIX })

  const me = input.name.toLowerCase()
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
  return { tasks, followUps }
}

/**
 * "My tasks": the same cards the Thursday check-in uses — so Done, Stuck and
 * Hand back work here too, and a press redraws just that card in this thread
 * — then the follow-ups on their contacts, with Prep and Log it….
 */
async function answerMine(input: { who: Presser; slackUserId?: string; now: Date }): Promise<MarquetaReply> {
  let name: string | null
  let mine: Awaited<ReturnType<typeof readMine>>
  try {
    name = await input.who.boardName()
    if (!name) return failed(NOT_ON_BOARD)
    mine = await readMine({ who: input.who, name, slackUserId: input.slackUserId, now: input.now })
  } catch (error) {
    console.error('[marqueta] could not read the list', error)
    return failed(COULD_NOT_FIND_YOURS)
  }
  const { tasks, followUps } = mine

  const who = inline(name, 80)
  if (!tasks.length && !followUps.length) {
    return {
      text: `*Your list* — nothing has your name on it, ${who}, and no follow-ups are due this week. ${askMarqueta('week')} shows what nobody has taken.`,
    }
  }

  const lead =
    `*Your list, ${who}* — ${countLabel(tasks.length, 'open task')}` +
    (followUps.length ? `, ${countLabel(followUps.length, 'follow-up')} due` : '')
  const blocks: Block[] = [section(lead)]
  for (const task of tasks.slice(0, MAX_MINE_TASKS)) {
    blocks.push(...buildCheckInTaskBlocks(task, { now: input.now, studioBaseUrl: studioBase() }))
  }
  if (tasks.length > MAX_MINE_TASKS) {
    blocks.push(context(`+${tasks.length - MAX_MINE_TASKS} more ${onThisWeek('on This week', { owner: name })}`))
  }

  if (followUps.length) {
    blocks.push(section('*Follow-ups due*'))
    for (const entry of followUps.slice(0, MAX_MINE_FOLLOW_UPS)) {
      const line = followUpLine(entry, input.now)
      const ref = encodeContactRef({ contactId: entry.contactId, organization: entry.organization, name: entry.personLabel })
      blocks.push(section(`${line.label}\n${line.detail}`))
      blocks.push(...actionsRow([button(LABEL.PREP, MARQUETA_ACTION.prepCall, ref), button(LABEL.LOG, MARQUETA_ACTION.logCall, ref)]))
    }
    if (followUps.length > MAX_MINE_FOLLOW_UPS) {
      blocks.push(context(`+${countLabel(followUps.length - MAX_MINE_FOLLOW_UPS, 'more follow-up', 'more follow-ups')} — ${askMarqueta('my calls')}`))
    }
  }
  const open = openViewButton('thisWeek', studioViewUrl(studioBase(), 'thisWeek', { owner: name }))
  if (open) blocks.push(...actionsRow([open]))

  return { text: lead, blocks }
}

// ── Call prep ────────────────────────────────────────────────────────────────

/**
 * "Prep Jane Doe at Acme": the outline, its threaded follow-up, and the
 * contact details routed to the requester alone.
 */
async function answerPrep(input: {
  target: string
  channel: string
  who: Presser
  now: Date
}): Promise<MarquetaReply> {
  const prep = await prepCallFor({ text: input.target, senderName: await input.who.spokenName(), now: input.now })
  // Every PrepReply `text` is already mrkdwn-safe (the outline's title is
  // escaped by its builder; the rest is fixed copy). Escaping again would
  // show "AT&amp;T" to the person reading it.
  if (prep.kind === 'text') return prep.error ? failed(prep.text) : { text: prep.text }
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

  return {
    text: clean(prep.text) || 'Call prep',
    blocks: first,
    ...(prep.second.length ? { thread: { text: prep.threadText, blocks: prep.second } } : {}),
    ...(ephemeral ? { ephemeral } : {}),
  }
}

// ── "Who's Jane Doe" ─────────────────────────────────────────────────────────

const WARMTH_WORD: Record<string, string> = { hot: 'hot', warm: 'warm', cool: 'cool', cold: 'cold' }

/** "15 Sep": a day already past needs no weekday (the follow-up line uses the same form). */
const pastDay = (at: Date, now: Date) => formatSlackDay(at, now).replace(/^[A-Z][a-z]{2}\s+/, '')

/** "last: Contacted on 15 Sep" — the status a touch left, never its notes. */
function lastTouchOf(contact: PrepContact, now: Date): string {
  const touches = (contact.interactions || [])
    .map((interaction) => ({ at: Date.parse(String(interaction?.at || '')), status: clean(interaction?.statusAfter) }))
    .filter((touch) => Number.isFinite(touch.at))
    .sort((a, b) => b.at - a.at)
  const latest = touches[0]
  if (latest) return `last: ${followUpStatusLabel(latest.status || contact.status)} on ${pastDay(new Date(latest.at), now)}`
  const contacted = Date.parse(String(contact.lastContactedAt || ''))
  if (Number.isFinite(contacted)) return `last: ${followUpStatusLabel(contact.status)} on ${pastDay(new Date(contacted), now)}`
  return 'not contacted yet'
}

/**
 * "Who's Jane Doe": one line about where things stand, and the two things to
 * do about it.
 *
 *   *Jane Doe* — CMIO, Mass General Brigham · warm · last: Contacted on 15 Sep
 *   · follow-up Tue 22 Sep (overdue) · owner Shirley            [Prep] [Log it…]
 *
 * Built from the enum and dates only — never a note — and never an email
 * address, which imported records keep in `name` and `organization`.
 */
async function answerContact(input: {
  target: string
  now: Date
  /** What to answer instead when nobody on file matches — set when the name was not typed like one. */
  otherwise?: () => Promise<MarquetaReply>
}): Promise<MarquetaReply> {
  const request = parsePrepRequest(input.target)
  if (!request.name && !request.organization) {
    return input.otherwise ? input.otherwise() : { text: `Who do you mean? Say ${askMarqueta('who’s Jane Doe')}.` }
  }
  let data: PrepData
  try {
    data = await loadPrepData()
  } catch (error) {
    console.error('[marqueta] contact read failed', error)
    return failed(errorLine('reach the outreach records just now', 'The Studio’s Outreach tab has the same information.'))
  }
  const match = resolvePrepTarget(request, data.contacts, data.research)
  const found =
    match.kind === 'contact' ||
    (match.kind === 'ambiguous' && match.candidates.length > 0) ||
    (match.kind === 'organization' && match.contacts.length > 0)
  // "who's got the newsletter" was never about a person: nobody on file by
  // that name means answer what it was actually asking.
  if (!found && input.otherwise) return input.otherwise()

  if (match.kind === 'ambiguous') {
    const blocks = buildPrepCandidatesBlocks(scrubPrepCandidates(match.candidates), 'Which one do you mean?')
    if (blocks.length) return { text: 'Which one do you mean?', blocks }
  }
  if (match.kind === 'organization' && match.contacts.length) {
    const place = followUpOrganization(match.organization) || 'there'
    const heading = `${countLabel(match.contacts.length, 'person', 'people')} on file at ${place}`
    const blocks = buildPrepCandidatesBlocks(
      scrubPrepCandidates(
        match.contacts.map((contact) => ({ label: contactLabel(contact), contactId: contact._id, organization: clean(contact.organization) })),
      ),
      heading,
    )
    if (blocks.length) return { text: escapeSlackText(heading), blocks }
  }
  if (match.kind !== 'contact') {
    return { text: `Nobody by that name is on file. ${askMarqueta('prep Sam Rivera at Acme')} puts an outline together anyway.` }
  }

  const contact = match.contact
  const person = followUpPersonLabel({ name: contact.name, email: contact.email, organization: contact.organization })
  const organization = followUpOrganization(contact.organization)
  const role = followUpOrganization(contact.role)
  const due = Date.parse(String(contact.followUpAt || ''))
  const followUp = Number.isFinite(due)
    ? `follow-up ${formatSlackDay(new Date(due), input.now)}${due < input.now.getTime() ? ' (overdue)' : ''}`
    : ''
  const facts = [
    [role, organization].filter(Boolean).join(', '),
    WARMTH_WORD[clean(contact.warmth).toLowerCase()] || '',
    lastTouchOf(contact, input.now),
    followUp,
    clean(contact.owner) ? `owner ${clean(contact.owner)}` : 'nobody owns it',
  ].filter(Boolean)
  const lead = `*${inline(person, 120)}* — ${facts.map((fact) => escapeSlackText(fact)).join(' · ')}`
  const ref = encodeContactRef({ contactId: contact._id, organization, name: contactLabel(contact) })
  return {
    text: clipSlackText(lead, 600),
    blocks: [section(lead), ...actionsRow([button(LABEL.PREP, MARQUETA_ACTION.prepCall, ref), button(LABEL.LOG, MARQUETA_ACTION.logCall, ref)])],
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
 * The value a "Log it…" button carries: the contact, and what the person
 * already said — so the form opens with their words in the notes and the
 * outcome picked. The outcome travels as a `CallOutcomeKey`.
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
    blocks: [section(lead), ...actionsRow([button(LABEL.LOG, MARQUETA_ACTION.logCall, logRef(contact, note, outcome), true)])],
  }
}

/**
 * Several people it could have been — each with its own "Log <name>…",
 * opening the form for that contact with what was said already in it.
 */
function logCandidatesReply(
  heading: string,
  candidates: Array<{ label: string; contactId?: string; organization: string }>,
  note: string,
  outcome: CallOutcomeKey | undefined,
): MarquetaReply | null {
  const blocks = buildPrepCandidatesBlocks(scrubPrepCandidates(candidates), heading, { action: 'log', note, outcome })
  return blocks.length ? { text: escapeSlackText(heading), blocks } : null
}

/**
 * "Called Jane at Acme, left a voicemail."
 *
 * Logged straight away only when all of it is certain: exactly one contact on
 * file, an outcome `guessCallOutcome` is sure of, an outcome that cannot set
 * the contact back (`needsConfirmation` — "keen but after the budget" is not
 * right now, and moving a contact who REPLIED to Dormant in one press is how
 * the call list loses somebody), a board name to log it under, and a write the
 * Undo can take back exactly (`onlyIfReversible`). The receipt says what was
 * logged, where the contact now stands, and the next follow-up, with Undo.
 *
 * Anything less gets the form, already filled in with what was said — a wrong
 * touch written in one press costs more than one more press. Two people who
 * fit get a "Log <name>…" each; somebody not on file gets one press that adds
 * them and logs it.
 *
 * The interaction key is the message's own (`slack-msg-<channel>-<ts>`), so a
 * redelivered event finds the touch it already wrote.
 */
async function answerLogCall(input: {
  text: string
  target: string
  channel: string
  ts: string
  slackUserId?: string
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
    return failed(OUTREACH_READ_FAILED)
  }

  const match = resolvePrepTarget(request, data.contacts, data.research)
  const outcome = guessCallOutcome(input.text)
  const note = input.text

  if (match.kind === 'contact') {
    const contact = match.contact
    const label = contactLabel(contact)
    if (!outcome) return logButtonReply(`What happened with *${inline(label, 200)}*? Your note’s already in the form.`, contact, note, outcome)
    if (needsConfirmation(contact, outcome)) {
      return logButtonReply(confirmationPrompt({ contactLabel: label, outcomeKey: outcome, statusBefore: contact.status }), contact, note, outcome)
    }

    let byName: string | null = null
    let known = true
    try {
      byName = await input.who.ownerName()
      known = Boolean(byName)
    } catch (error) {
      console.error('[marqueta] could not read the team roster', error)
    }
    // Read, and not anybody on the team list: the form would refuse too.
    if (!known) return failed(NOT_ON_BOARD)
    // No board name, no one-press write: the form resolves the name itself.
    if (!byName) return logButtonReply(`Log the call with *${inline(label, 200)}* here:`, contact, note, outcome)

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
    if (result.ok && result.skipped) return { text: safe(result.message, 600) }
    if (result.ok && result.undo) {
      const receipt = {
        presserId: clean(input.slackUserId) || undefined,
        contactLabel: label,
        outcomeKey: outcome,
        statusBefore: result.statusBefore,
        statusAfter: result.statusAfter,
        followUpAt: result.followUpAt,
        now: input.now,
      }
      return {
        text: callLogReceiptLine(receipt),
        blocks: buildCallLogReceiptBlocks({ ...receipt, undoValue: encodeCallLogUndo(result.undo) }),
      }
    }
    // Not written because the Undo could not have taken it back exactly: the
    // form is the way forward, with what they said already in it. That is a
    // next step, not a failure, so it stays in the thread with its button.
    if (result.needsForm) {
      return logButtonReply(
        `*${inline(label, 200)}* — this one needs the form, because I couldn’t undo it cleanly from here. Your note’s already in it.`,
        contact,
        note,
        outcome,
      )
    }
    // The save itself failed: said to the person who asked, with where to go.
    return failed(safe(result.message, 600))
  }

  if (match.kind === 'organization' && match.contacts.length === 1) {
    const contact = match.contacts[0]
    return logButtonReply(`Was that *${inline(contactLabel(contact), 200)}*?`, contact, note, outcome)
  }
  if (match.kind === 'organization' && match.contacts.length > 1) {
    const place = followUpOrganization(match.organization)
    const reply = logCandidatesReply(
      place ? `Who at ${place} did you call?` : 'Which one did you call?',
      match.contacts.map((contact) => ({ label: contactLabel(contact), contactId: contact._id, organization: clean(contact.organization) })),
      note,
      outcome,
    )
    if (reply) return reply
  }

  if (match.kind === 'ambiguous') {
    const named = clean(request.name) || clean(request.organization)
    const heading = named && !named.includes('@') ? `Which ${named} did you call?` : 'Which one did you call?'
    const reply = logCandidatesReply(heading, match.candidates.filter((candidate) => clean(candidate.contactId)), note, outcome)
    if (reply) return reply
    // Imported records put email addresses in `organization`; this line is
    // posted in the channel, so the places are scrubbed like every other
    // label, and one that was only an address is not named at all.
    const places = scrubPrepCandidates(match.candidates)
      .map((candidate) => safe(candidate.organization, 120))
      .filter(Boolean)
    const again = `Say it again with the full name — ${askMarqueta('called Jane Doe at MGB, left a voicemail')}.`
    if (places.length === 1) return { text: `Did you mean *${places[0].replace(/[*_~`]/g, '')}*? ${again}` }
    return {
      text: places.length ? `I know more than one place by that name: ${places.join(' · ')}. ${again}` : `I know more than one place by that name. ${again}`,
    }
  }

  // Nobody on file (or an organisation only our research knows): one press
  // adds them — and logs the call too, when what happened is clear AND would
  // not need a second look on a record that already existed.
  const organization = match.kind === 'organization' ? match.organization : request.organization
  const typed = { name: request.name, organization, role: request.role }
  // Not the message as `note`: an added contact stores its note as "how we
  // know them", and "called her, left a voicemail" is not a relationship.
  if (!newContactDocument({ ...typed, note: '', ownerName: '', now: input.now })) return { text: WHO_WAS_IT }
  const who = clean(request.name) || clean(organization)
  const shown = clean(request.name) && clean(organization) ? `${who} (${clean(organization)})` : who
  // A new contact starts as New. "Not a fit" or "not right now" would close
  // it or set it aside the moment it exists — exactly the move a contact
  // already on file is asked about first — so those are never promised as
  // one press: the button only adds, and the outcome rides along to prefill
  // the form that follows (the interactions route logs in the same press only
  // when `needsConfirmation` agrees, the C6 contract).
  const oneStep = Boolean(outcome && !needsConfirmation({ status: NEW_CONTACT_STATUS }, outcome))
  const lead =
    `*${inline(shown, 200)}* isn’t in outreach yet.` +
    (outcome && !oneStep ? `\n${confirmationPrompt({ contactLabel: shown, outcomeKey: outcome })}` : '')
  const add = button(
    addContactLabel(who, oneStep),
    MARQUETA_ACTION.addContact,
    encodeContactRef({ ...typed, ...(outcome ? { outcome } : {}) }),
    true,
  )
  return { text: lead.split('\n')[0], blocks: [section(lead), ...actionsRow([add])] }
}

// ── Availability ─────────────────────────────────────────────────────────────

/**
 * What a message about time off turned out to be.
 *
 * Only `statement` is ever written. The intent parser routes a message with a
 * time-off word here unless it is a question about one of her topics — "who's
 * away this week?" is the week — but "is Juhan away next week?" and "who is
 * out on PTO?" still arrive, and each of those used to mark the person ASKING
 * as away. Availability is the one answer that writes on the strength of a
 * keyword, so it is the one that has to be sure the sentence is the sender
 * saying something about themselves.
 */
export type TimeOffReading =
  | { kind: 'statement'; status: AvailabilityStatus; from: string; until?: string; weeklyHours?: number }
  | { kind: 'question' }
  | { kind: 'someoneElse' }
  | { kind: 'notFirstPerson' }
  | { kind: 'unclearDates' }

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

/** The imperative the help text teaches: "away next week", "back", "ooo Fri". */
const TIME_OFF_COMMAND = /^(?:away|ooo|out|off|back|sick|out sick|on (?:holiday|vacation|leave|pto)|holiday|vacation|pto|leave)\b/

/**
 * Read a time-off message: is it the sender saying something about their own
 * time, and which days. The days come from `parseAvailabilityCommand`, which
 * answers exactly or not at all ("next week" is next Monday to Sunday, "until
 * Fri" is today to Friday, "for 2 weeks" is a question back). Pure. Names on
 * the roster are checked separately (`namesSomeoneElse`), after the roster is
 * read — this needs nothing but the text, so a question is turned away
 * without a single lookup.
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

  const parsed = parseAvailabilityCommand(body.replace(/\bout of (?:the )?office\b/g, 'away'), opts.today)
  if (!parsed) return { kind: 'unclearDates' }
  if (parsed.status === 'reduced' && typeof parsed.weeklyHours !== 'number') return { kind: 'unclearDates' }
  return { kind: 'statement', ...parsed }
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

const SAY_AWAY = askMarqueta('away next week')

/**
 * "I'm away next week", said to her.
 *
 * Written only when all of it is certain (see `readTimeOff`): the sender is
 * the subject, nobody else is named, the days are exact, and the sender has a
 * board name that is theirs. The write is `setMarketingAvailability` — the
 * same one the Monday plan's "I’m away this week" button makes: patched, never
 * replaced (their Slack link, allocation and note survive), refused on a
 * record linked to somebody else, conditional on the revision it read, and
 * never cutting booked time off short. Its reply says the days in words and
 * what it replaced, and carries its Undo.
 *
 * Anything less is answered with the words that would work, and nothing
 * changes.
 */
async function answerAvailability(input: {
  text: string
  rawText: string
  slackUserId?: string
  botUserId?: string
  who: Presser
  now: Date
}): Promise<MarquetaReply> {
  const today = slackDayKey(input.now) || input.now.toISOString().slice(0, 10)
  const reading = readTimeOff(input.text, {
    today,
    mentionsSomeoneElse: mentionsSomeoneElse(input.rawText, input.slackUserId, input.botUserId),
  })
  if (reading.kind === 'question') {
    return { text: `That sounded like a question, so nothing changed. If you’re telling me you’re away, say ${SAY_AWAY}.` }
  }
  if (reading.kind === 'someoneElse') {
    return { text: `I only note time off for the person telling me, so nothing changed. If it’s you, say ${SAY_AWAY}.` }
  }
  if (reading.kind === 'notFirstPerson') {
    return { text: `Did you mean you’re away? Say ${SAY_AWAY} and I’ll note it. Nothing has changed yet.` }
  }
  if (reading.kind === 'unclearDates') {
    return { text: `Which days? For example ${SAY_AWAY}, \`away Fri\`, \`away 1–5 Oct\`. Nothing has changed yet.` }
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
    return failed(COULD_NOT_READ_TEAM)
  }
  if (!name) return failed(NOT_ON_BOARD)
  if (namesSomeoneElse(input.text, name, entries)) {
    return { text: `That mentions someone else, so nothing changed — I only note time off for the person telling me. If it’s you, say ${SAY_AWAY}.` }
  }

  const result = await setMarketingAvailability({
    personName: name,
    slackUserId: clean(input.slackUserId),
    status: reading.status,
    from: reading.from,
    ...(reading.until ? { until: reading.until } : {}),
    ...(typeof reading.weeklyHours === 'number' ? { weeklyHours: reading.weeklyHours } : {}),
    now: input.now,
  })
  const message = clipSlackText(result.message || errorLine('save that', 'Try again in a minute.'), SLACK_LIMITS.sectionText)
  if (!result.ok) return failed(message)
  // Already so ("you’re already down as away then"): a note, not a failure.
  if (!result.changed || !result.undoValue) return { text: message }
  return {
    text: message,
    blocks: [section(message), ...actionsRow([button(LABEL.UNDO, MARQUETA_ACTION.availabilityUndo, result.undoValue)])],
  }
}

// ── Capture ──────────────────────────────────────────────────────────────────

/**
 * Something said to her, filed. The reply is the capture receipt the channel
 * path posts, with the same buttons: Keep it · Not an idea for an idea (its
 * value names this message, which is how the idea's id was made), Not for the
 * calendar for a draft — and the tab it landed on.
 */
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
    return failed(errorLine('file that', result.message || 'It didn’t look like anything I keep.'))
  }
  if (result.alreadyCaptured || result.mergedInto) return { text: 'Already have that one — it’s with what I caught this week.' }

  const draft = result.kind === 'draft'
  const title = result.draft?.title || result.idea?.title || input.intent.text.slice(0, 80)
  const text = captureConfirmation({ kind: draft ? 'draft' : 'idea', title, explicit: input.intent.explicit })
  const value = JSON.stringify({ c: input.channel, ts: input.ts })
  const elements = draft
    ? [button(LABEL.DRAFT_DISCARD, MARKETING_ACTION.ideaDiscard, value), openViewButton('calendar', studioViewUrl(studioBase(), 'calendar'))]
    : [
        button(LABEL.IDEA_KEEP, MARKETING_ACTION.ideaKeep, value),
        button(LABEL.IDEA_DISCARD, MARKETING_ACTION.ideaDiscard, value),
        openViewButton('thisWeek', studioViewUrl(studioBase(), 'thisWeek', { focus: 'caught' })),
      ]
  const plainTitle = clipSlackText(escapeSlackText(clean(title)), 200)
  return {
    text: draft ? `Put on the calendar as a draft: ${plainTitle}` : `Filed as an idea: ${plainTitle}${input.intent.explicit ? '' : ' — keep it?'}`,
    blocks: [section(text), ...actionsRow(elements)],
  }
}

// ── The entry point ──────────────────────────────────────────────────────────

/**
 * Reply to a message addressed to Marqueta.
 *
 * `text` is the message EXACTLY as Slack delivered it — escaped, with her
 * mention in it. Her mention is taken off and the rest decoded here, once
 * (see the header).
 *
 * Returns null when there is nothing worth saying — "thanks!", "ok", "👍".
 * Silence is a valid answer and better than an acknowledgement nobody needs.
 * Never throws: a failure is answered in words, to the person who asked
 * (`failed`), because they deserve to know it failed and the room does not
 * need to.
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
    const intent = parseMarquetaIntent(decodeSlackText(removeMention(input.text || '', input.botUserId)))
    if (intent.kind === 'ack') return null

    // A hello and the help are answered to anybody — but a guest gets the
    // guest version, and a hello is only personal where the answer may be.
    if (intent.kind === 'greeting' || intent.kind === 'help') {
      const refusal = await teamOnly(input.slackUserId)
      if (refusal) return { text: marquetaHelpText({ guest: true }) }
      if (intent.kind === 'help') return { text: marquetaHelpText({ more: intent.more, dms: dmsWired() }) }
      return answerGreeting({ who, slackUserId: input.slackUserId, now, personal: answerableHere(input.channel) })
    }

    if (!UNGATED.has(intent.kind)) {
      // Where first, then who: the room is known without a lookup, and an
      // answer nobody here should read is refused whoever asked for it.
      if (!ANSWERABLE_ANYWHERE.has(intent.kind) && !answerableHere(input.channel)) return { text: askMeElsewhere() }
      const refusal = await teamOnly(input.slackUserId)
      // A guest hears the refusal where they asked; a lookup that failed is
      // for the asker alone, like every other failure.
      if (refusal) return refusal === TEAM_ONLY ? { text: refusal } : failed(refusal)
    }

    const answer = async (intent: Exclude<MarquetaIntent, { kind: 'ack' | 'greeting' | 'help' }>): Promise<MarquetaReply> => {
      switch (intent.kind) {
        case 'capture':
          return answerCapture({ intent, personName: input.personName, channel: input.channel, ts: input.ts })
        case 'unknown':
          return { text: unknownReplyText(intent) }
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
          return answerPrep({ target: intent.target, channel: input.channel, who, now })
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
            ...(roster ? { resolveOwner: (raw: string) => resolveOwnerName({ displayName: raw, entries: roster }) } : {}),
          })
          if (list.error) return failed(list.text)
          return list.blocks.length ? { text: list.text, blocks: list.blocks } : { text: list.text }
        }
        case 'logCall':
          return answerLogCall({
            text: intent.text,
            target: intent.target,
            channel: input.channel,
            ts: input.ts,
            slackUserId: input.slackUserId,
            who,
            now,
          })
        case 'contact': {
          // Only ever a topic or `unknown`, both of which this message has
          // already been cleared for: a contact is the most gated answer.
          const otherwise = intent.otherwise
          return answerContact({ target: intent.target, now, ...(otherwise ? { otherwise: () => answer(otherwise) } : {}) })
        }
        case 'signed':
          return answerSigned(intent)
        case 'mine':
          return answerMine({ who, slackUserId: input.slackUserId, now })
        case 'week':
          return answerWeek({ who, now })
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
          return { text: marquetaHelpText({ dms: dmsWired() }) }
      }
    }
    const reply = await answer(intent)

    const text = clipSlackText(reply.text, SLACK_LIMITS.fallbackText - 100)
    // An empty text is only right for a failure said privately (`failed`).
    return { ...reply, text: text || (reply.ephemeral && !reply.blocks?.length ? '' : ' ') }
  } catch (error) {
    console.error('[marqueta] answering failed', error)
    return failed(FAILED)
  }
}
