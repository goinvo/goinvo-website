import type { NextRequest } from 'next/server'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { getSlackBotUserId, postSlackMessage } from '@/lib/chat/slack'
import { buildOutreachCallSheet } from '@/lib/marketing/callSheet'
import {
  ASK_HISTORY_KIND,
  askHistoryEntry,
  buildIdeaReviewBlocks,
  buildIdentityPromptBlocks,
  buildRunwayBlocks,
  buildTaskAttachment,
  buildWeeklyDigestBlocks,
  encodeActionValue,
  MAX_DIGEST_FOLLOW_UPS,
  readAskHistory,
  type AskHistoryEntry,
  type DigestFollowUp,
  type DigestTask,
} from '@/lib/marketing/slackDelegation'
import { readRunway } from '@/lib/marketing/runway.server'
import { buildMoneyAndDirectionBlocks } from '@/lib/marketing/strategyCheck'
import { loadStrategySnapshot, type StrategyLoad } from '@/lib/marketing/strategyCheck.server'
import { ideasNeedingReview } from '@/lib/marketing/ideaCapture.server'
import { findReassignments, resolveOwnerName, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { DEFAULT_WEEKLY_MARKETING_HOURS, estimateOperationMinutes } from '@/lib/marketing/effort'
import { getMarketingWriteClientFor } from '@/lib/marketing/client'
import { getOutreachClient, isOutreachClientConfigured } from '@/lib/marketing/outreachClient.server'
import { askableTeam, slackIdForOwner, TEAM_AVAILABILITY_PROJECTION, tidyAvailability } from '@/lib/marketing/team.server'
import {
  askMentionsText,
  buildAskBlocks,
  proposeOwnerAsks,
  type AskTask,
  type AskTeamMember,
  type OwnerAsk,
} from '@/lib/marketing/ownerAsk'
import { DIGEST_HEARTBEAT_DOC_ID } from '@/lib/marketing/heartbeat'
import { absencesOn, claimWeek, recordWeekRun, utcIsoWeekKey } from '@/lib/marketing/weeklyCheckIn.server'
import { followUpLine, listFollowUps, type FollowUpContact } from '@/lib/marketing/followUps'
import { checkInTaskBlockId, encodeContactRef, MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { describePulse, summarizeOutreach } from '@/lib/marketing/outreachPulse'
import {
  canTransitionMarketingOperation,
  MARKETING_OPERATION_STATUSES,
  MARKETING_OPERATION_TYPE,
  type MarketingOperationStatus,
} from '@/lib/marketing/operations'
import { isDecisionTask } from '@/lib/marketing/weeklyCheckIn'
import { clipSlackText, escapeSlackText, marquetaHandle, SLACK_LIMITS } from '@/lib/marketing/slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * The weekly-plan record is itself a marketingOperation, so it arrives with the
 * work. Delegating "this week's plan" to a person is nonsense, and it showed up
 * in the digest owned by "someone".
 */
const PLAN_SOURCE_PREFIX = 'weekly-plan/'

/**
 * Post the week's marketing plan to Slack, with the buttons that make it a
 * delegation rather than an announcement.
 *
 * Fail-closed twice over: without Slack credentials nothing is posted, and
 * `?dryRun=1` returns the exact blocks it WOULD send — and writes nothing, not
 * even the record of who it would ask. Getting the preview right before
 * anything reaches a channel of colleagues is the point — a bot that spams a
 * team once is a bot that gets muted forever.
 *
 *   GET|POST /api/marketing/slack/digest?dryRun=1
 *   POST     /api/marketing/slack/digest
 *   POST     /api/marketing/slack/digest?force=1   (post this week's again, on purpose)
 *
 * It posts ONCE a week. A duplicate cron delivery, a re-run of the tick or a
 * manual POST on the same Monday used to post a second digest — and because
 * the second read the first one's asks as history, it asked a DIFFERENT person
 * about the same task, which made the task "nobody has taken this after two
 * asks" the following week after a single real ask. So, like the Thursday
 * check-in, a run claims the week on its own record (`marketingHeartbeat.digest`)
 * with a revision-conditional write before posting, and a week already posted
 * is skipped unless `force`. A forced re-post is harmless too: every ask is
 * stamped with the week it was posted in, and an ask from this week is shown
 * again to the same person and recorded nothing (see `weeklyAsks`).
 *
 * What the message carries, top to bottom, and why each part is where it is:
 *
 *   - How last week went (tasks done, outreach logged) and any post going out
 *     this week with no draft — one line each, before anything asks for work.
 *   - The ASKS: an unclaimed task, a named person, "could you take this one?".
 *     An unowned task listed under "anyone" is asking the whole room, which is
 *     asking no one; but setting an owner on somebody's behalf is how a plan
 *     loses the team's trust. So Marqueta asks, by name, and the person
 *     decides (ownerAsk.ts). Top-level blocks and top-level `text`, because the
 *     task cards are attachments, and Slack builds the notification from `text`
 *     — a mention that only lives in an attachment reaches nobody's phone.
 *   - Tasks two people have already been asked about: offered as "drop it?",
 *     because the honest next question is whether they are worth doing.
 *   - Who to call and why now, each with "Prep this call"; follow-ups owed to
 *     people who already answered, with Prep and Log.
 *   - Money and direction — only when something is due.
 */

/** The assistant's name in the Studio, and now in Slack. */
const MARQUETA_NAME = 'Marqueta'
const MARQUETA_ICON = ':chart_with_upwards_trend:'

/**
 * Her own room, and only her own room.
 *
 * SLACK_CHANNEL_ID is the website-chat channel. This used to fall back to it
 * when no marketing channel was set, which would have dropped a weekly plan —
 * and now named asks of colleagues — into the middle of live visitor
 * conversations. No marketing channel, no post.
 */
const marketingChannelId = () => String(process.env.SLACK_MARKETING_CHANNEL_ID || '').trim()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Task cards the digest renders. Asks are proposed over exactly these, so nobody is asked about a task they cannot see. */
const RENDERED_TASKS = 8
/** Three @-mentions in one message reads as a pile-on (ownerAsk.ts). */
const MAX_ASKS_PER_PERSON = 2
/** Tasks offered as "drop it?" after two asks, and away notices, before the rest are counted instead of shown. */
const MAX_EXHAUSTED_SHOWN = 3
const MAX_AWAY_SHOWN = 3
const MAX_CALL_SHEET = 3
const MAX_UNDRAFTED_NAMED = 3
const DAY_MS = 86_400_000

/**
 * "Jen passed on this — who should pick it up?" — the question "Not me" leaves
 * behind. A FALLBACK only, for tasks passed on before the passer's Slack id was
 * recorded in `askHistory`: the name in it was Slack's display name, which
 * often does not match the roster's (see `weeklyAsks`).
 */
const PASSED_BY = /^(.+?)\s+passed on this\b/i

const DATA_QUERY = `{
  "operations": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && status in ["queued", "working", "needsHuman"]
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]
    | order(coalesce(dueAt, "9999") asc)[0...40]{
      _id, title, ownerName, suggestedOwner, ownerSlackUserId, estimatedMinutes, whyNow, kind, status,
      priority, sourceKey, dueAt, humanQuestion,
      "askHistory": askHistory[]{ slackUserId, at, week, kind }
    },
  "owned": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && !(status in ["done", "dismissed"]) && defined(ownerName) && ownerName != ""
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)
    && (!defined(dueAt) || dateTime(dueAt) < dateTime($weekEnd))]{
      ownerName, estimatedMinutes, kind, priority
    },
  "doneLastWeek": count(*[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && status == "done" && defined(completedAt)
    && dateTime(completedAt) >= dateTime($lastWeekStart) && dateTime(completedAt) < dateTime($weekStart)
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]),
  "availability": *[_type == "marketingTeamAvailability" && !(_id in path("drafts.**"))]${TEAM_AVAILABILITY_PROJECTION},
  "research": *[_type == "marketingOrgResearch" && !(_id in path("drafts.**")) && verification.status == "verified"]{
    organization, recentSignal, reachableAbout, suggestedOfferKey, context,
    verification{ status, evidence[]{ url, quote, textFragmentUrl } }
  },
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**")) && defined(organization)]{
    _id, name, role, organization, email, status
  },
  "followUpContacts": *[_type == "marketingContact" && !(_id in path("drafts.**")) && defined(followUpAt)]{
    _id, name, email, organization, owner, status, warmth, followUpAt,
    "interactions": interactions[]{ at, by, statusAfter }
  },
  "offers": *[_type == "marketingOffer" && !(_id in path("drafts.**")) && status == "active"]{ key, title, oneLiner },
  "weeklyHours": *[_id == "marketingSettings"][0].weeklyMarketingHours
}`

/**
 * Posts going out in the next week that nobody has written. Calendar items are
 * routed by type (they are not pinned to the outreach dataset), so this reads
 * through the router like every other calendar reader. Drafts excluded: the
 * published item is the fact.
 */
const UNDRAFTED_POSTS_QUERY = `*[_type == "marketingCalendarItem" && !(_id in path("drafts.**"))
  && status in ["idea", "drafting"] && defined(publishAt)
  && dateTime(publishAt) >= dateTime($from) && dateTime(publishAt) < dateTime($to)
  && (!defined(contentDraft) || contentDraft == "")]
  | order(publishAt asc){ title, publishAt }`

type StoredOperation = {
  _id: string
  title?: string | null
  ownerName?: string | null
  suggestedOwner?: string | null
  ownerSlackUserId?: string | null
  estimatedMinutes?: number | null
  whyNow?: string | null
  kind?: string | null
  status?: string | null
  priority?: string | null
  sourceKey?: string | null
  dueAt?: string | null
  humanQuestion?: string | null
  askHistory?: AskHistoryEntry[] | null
}

type OwnedOperation = { ownerName?: string | null; estimatedMinutes?: number | null; kind?: string | null; priority?: string | null }

type DigestData = {
  operations?: StoredOperation[] | null
  owned?: OwnedOperation[] | null
  doneLastWeek?: number | null
  availability?: Partial<Record<keyof TeamMemberAvailability, unknown>>[] | null
  research?: never[] | null
  contacts?: never[] | null
  followUpContacts?: FollowUpContact[] | null
  offers?: never[] | null
  weeklyHours?: number | null
}

/** A task as the digest handles it: the card's fields, plus what the ask logic needs. */
type DigestRow = DigestTask & {
  humanQuestion?: string
  askHistory: AskHistoryEntry[]
}

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const lower = (value: unknown) => clean(value).toLowerCase()
const orUndefined = (value: string | null | undefined) => clean(value) || undefined
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
const STATUSES = new Set<string>(MARKETING_OPERATION_STATUSES)

/** Monday 00:00 UTC of the ISO week containing `now` — the same week the check-in and the pulse count. */
function utcWeekStart(now: Date): number {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  return today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Never throws: a side read that fails is a missing line, not a missing digest. */
async function settle<T>(label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work()
  } catch (error) {
    console.error(`[digest] ${label} failed`, error)
    return null
  }
}

/**
 * "2 posts go out this week with no draft yet: A · B" — or nothing.
 *
 * A calendar item left at `idea` the week it is due is the content version of
 * an unclaimed task: everybody assumes someone else is writing it.
 */
function undraftedPostsBlock(posts: { title?: string | null }[] | null): Block | null {
  const list = (posts || []).filter(Boolean)
  if (!list.length) return null
  const titles = list
    .slice(0, MAX_UNDRAFTED_NAMED)
    .map((post) => clipSlackText(escapeSlackText(clean(post.title) || 'Untitled post'), 80))
  const more = list.length - titles.length
  const verb = list.length === 1 ? 'post goes' : 'posts go'
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: clipSlackText(
          `${list.length} ${verb} out this week with no draft yet: ${titles.join(' · ')}${more > 0 ? ` …and ${more} more` : ''}`,
          SLACK_LIMITS.sectionText,
        ),
      },
    ],
  }
}

/**
 * Tasks two different people have been asked to take, still unclaimed.
 *
 * Asking a third person is the wrong answer — the honest question now is
 * whether the task is worth doing at all. Each gets a Drop button, which the
 * board can undo with Reopen, and its section carries the check-in card's
 * block id, so a press redraws exactly this line (as a dropped card with
 * Reopen) and leaves the rest of the digest — and its task cards — alone.
 * A task the board will not let go straight to dismissed (one in progress)
 * is listed without the button rather than with one that fails.
 */
function exhaustedBlocks(tasks: DigestRow[], limit: number): Block[] {
  if (!tasks.length || limit <= 0) return []
  const shown = tasks.slice(0, limit)
  const more = tasks.length - shown.length
  const blocks: Block[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '*Nobody has taken these after two asks.* Still worth doing? Drop what isn’t — Reopen brings it back.' +
          (more > 0 ? ` (+${more} more on the plan)` : ''),
      },
    },
  ]
  for (const task of shown) {
    const status = (STATUSES.has(clean(task.status)) ? clean(task.status) : 'queued') as MarketingOperationStatus
    const canDrop = canTransitionMarketingOperation(status, 'dismissed')
    blocks.push({
      type: 'section',
      block_id: checkInTaskBlockId(task._id),
      text: { type: 'mrkdwn', text: `*${clipSlackText(escapeSlackText(task.title), 300)}*` },
      ...(canDrop
        ? {
            accessory: {
              type: 'button',
              action_id: MARQUETA_ACTION.taskDrop,
              text: { type: 'plain_text', text: 'Drop it', emoji: true },
              value: encodeActionValue({ taskId: task._id.slice(0, 180), ownerName: '', status }),
            },
          }
        : {}),
    })
  }
  return blocks
}

/**
 * This week's asks, decided one task at a time in the order the cards render.
 *
 * Mostly `proposeOwnerAsks`, with the one thing it cannot know: that a task
 * was already asked about THIS week. Its rules assume the history it is given
 * is history, but a second digest in the same week reads the first one's asks
 * — and treating those as a previous person asked had the re-run pick someone
 * else, and count the task as asked twice. So an ask stamped with this week is
 * the same question again: shown to the same person, not recorded, not a
 * second person. Everything else goes to `proposeOwnerAsks`, task by task,
 * with the load and the per-person count carried forward — which is exactly
 * what it does across a list, so the answers are the ones it would give.
 *
 * Whoever passed on a task is in its history by Slack id. The name in "<name>
 * passed on this" is still read, for tasks passed on before the id was
 * recorded, but only as a fallback — it is Slack's display name, and it does
 * not match the roster's name often enough to be the rule.
 */
function weeklyAsks(input: {
  tasks: DigestRow[]
  /** Who may be asked this week: mapped, and not away. */
  team: AskTeamMember[]
  /** Everyone mapped, away or not — for reading a passer's name back to an id. */
  roster: AskTeamMember[]
  availability: TeamMemberAvailability[]
  ownedMinutesByName: Record<string, number>
  dateKey: string
  week: string
}): { asks: OwnerAsk[]; repeated: string[]; exhausted: string[] } {
  const load: Record<string, number> = { ...input.ownedMinutesByName }
  const askCount = new Map<string, number>()
  const askable = new Map(input.team.map((member) => [member.slackUserId, member]))
  const idByName = new Map(input.roster.map((member) => [lower(member.name), member.slackUserId]))
  const asks: OwnerAsk[] = []
  const repeated: string[] = []
  const exhausted: string[] = []

  const give = (ask: OwnerAsk, minutes: number) => {
    asks.push(ask)
    load[ask.name] = (load[ask.name] || 0) + minutes
    askCount.set(ask.slackUserId, (askCount.get(ask.slackUserId) || 0) + 1)
  }

  for (const task of input.tasks) {
    // A decision is a principal's question, not a task to ask the room to take.
    if (task.ownerName || isDecisionTask(task)) continue
    const minutes = task.minutes || 0
    const history = readAskHistory(task.askHistory, input.week)

    const again = history.askedThisWeek ? askable.get(history.askedThisWeek) : undefined
    if (again) {
      repeated.push(task._id)
      give(
        {
          taskId: task._id,
          name: again.name,
          slackUserId: again.slackUserId,
          reason: lower(task.suggestedOwner) && lower(task.suggestedOwner) === lower(again.name) ? 'suggested' : 'open',
        },
        minutes,
      )
      continue
    }

    const passedBy = lower(PASSED_BY.exec(task.humanQuestion || '')?.[1])
    const passedById = passedBy ? idByName.get(passedBy) : undefined
    const askTask: AskTask = {
      _id: task._id,
      title: task.title,
      ownerName: task.ownerName,
      suggestedOwner: task.suggestedOwner,
      minutes,
      kind: task.kind,
      askedSlackUserIds: [...history.answeredIds, ...(passedById ? [passedById] : [])],
    }
    const result = proposeOwnerAsks({
      tasks: [askTask],
      team: input.team.filter((member) => (askCount.get(member.slackUserId) || 0) < MAX_ASKS_PER_PERSON),
      availability: input.availability,
      ownedMinutesByName: load,
      dateKey: input.dateKey,
      // Per person, not the studio's whole weekly budget: that is split between
      // people, and handing each of them all of it would make everybody look free.
      defaultHours: DEFAULT_WEEKLY_MARKETING_HOURS,
      maxAsksPerPerson: MAX_ASKS_PER_PERSON,
    })
    exhausted.push(...result.exhausted)
    for (const ask of result.asks) give(ask, minutes)
  }
  return { asks, repeated, exhausted }
}

async function handle(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const params = new URL(request.url).searchParams
  const dryRun = params.get('dryRun') === '1'

  // The tick tells us whether the week it just planned actually persisted. A
  // digest that announces a week the Studio never recorded creates two sources
  // of truth on the one morning everybody reads it - so when the plan did not
  // land, the message says so instead of quietly presenting the raw board as
  // though it were the plan.
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const planRecorded = (body as { planRecorded?: boolean }).planRecorded !== false
  // Registry warnings, passed in by the tick. Absent in a manual post, and
  // empty whenever every domain has months left - silence is the default.
  const domainNotes = ((body as { domainNotes?: string[] }).domainNotes || []).filter(Boolean)
  // Post this week's digest again, on purpose. Opt-in by an exact value, the
  // way the check-in reads it: `?force=0` must not become a force.
  const force = params.get('force') === '1' || (body as { force?: unknown }).force === true

  if (!isOutreachClientConfigured()) {
    return privateMarketingJson({ error: 'Sanity is not configured.' }, { status: 503 })
  }
  const channel = marketingChannelId()
  if (!dryRun && !(process.env.SLACK_BOT_TOKEN && channel)) {
    return privateMarketingJson(
      {
        error: 'Slack is not configured. Set SLACK_BOT_TOKEN and SLACK_MARKETING_CHANNEL_ID.',
        hint: 'Add ?dryRun=1 to preview the message without posting.',
      },
      { status: 503 },
    )
  }

  // Tasks, contacts and the roster are private: read through the client pinned
  // to the outreach dataset, published perspective, so a task open in the
  // Studio editor is counted once.
  const client = getOutreachClient()
  const now = new Date()
  const today = isoDay(now.getTime())
  // The UTC ISO week — the same key the check-in claims with, so a laptop and
  // Vercel agree about which week an ask belongs to.
  const week = utcIsoWeekKey(now)
  const weekStartMs = utcWeekStart(now)
  const start = isoDay(weekStartMs)
  const end = isoDay(weekStartMs + 6 * DAY_MS)

  const [data, strategy, pendingIdeas, undraftedPosts, botUserId] = await Promise.all([
    client.fetch<DigestData | null>(DATA_QUERY, {
      planPrefix: PLAN_SOURCE_PREFIX,
      weekStart: new Date(weekStartMs).toISOString(),
      weekEnd: new Date(weekStartMs + 7 * DAY_MS).toISOString(),
      lastWeekStart: new Date(weekStartMs - 7 * DAY_MS).toISOString(),
    }),
    // Runway, strategy and the contacts' call log, read once. It also finds
    // the latest win and hands it to the runway check-in, so a deal won since
    // the runway was last confirmed makes the card ask whether it moved the date.
    settle<StrategyLoad>('strategy read', () => loadStrategySnapshot(now)),
    settle('idea review read', () => ideasNeedingReview(5)),
    settle('calendar read', () =>
      getMarketingWriteClientFor('marketingCalendarItem').fetch<{ title?: string | null }[] | null>(UNDRAFTED_POSTS_QUERY, {
        from: now.toISOString(),
        to: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      }),
    ),
    // Her own id turns "ask me for `my calls`" into a working mention.
    settle('bot identity', () => getSlackBotUserId()),
  ])

  const availability = tidyAvailability(data?.availability)
  // Who is away today, by board name OR Slack id: the "I'm away this week"
  // button files the absence under Slack's display name, next to the record
  // the roster knows the person by, and a name-only check asked people on
  // holiday. `absences.entries` carries that absence under every linked name,
  // so hours, asks and the away notices all see it.
  const absences = absencesOn(availability, today)
  const roster = askableTeam(availability)
  const team = roster.filter((member) => !absences.isAway(member.name, member.slackUserId))

  const tasks: DigestRow[] = (data?.operations || [])
    .filter((operation) => operation && operation._id && !clean(operation.sourceKey).startsWith(PLAN_SOURCE_PREFIX))
    .map((operation) => ({
      _id: operation._id,
      title: clean(operation.title) || 'Untitled task',
      ownerName: orUndefined(operation.ownerName),
      // The roster first, the task's stamped id last: that stamp is never
      // cleared on a reassignment in the Studio, so trusting it first had the
      // digest @-mention the previous owner about the new owner's work.
      slackUserId: slackIdForOwner(availability, operation.ownerName, operation.ownerSlackUserId),
      // Most operations carry no explicit estimate, so the shared effort model
      // infers one from kind and priority. Summing the raw field reported "0m
      // planned of 4h", which reads as though there is nothing to do.
      minutes: estimateOperationMinutes({
        kind: orUndefined(operation.kind),
        priority: orUndefined(operation.priority),
        estimatedMinutes: typeof operation.estimatedMinutes === 'number' ? operation.estimatedMinutes : undefined,
      }).minutes,
      whyNow: orUndefined(operation.whyNow),
      kind: orUndefined(operation.kind),
      priority: orUndefined(operation.priority),
      status: orUndefined(operation.status),
      suggestedOwner: orUndefined(operation.suggestedOwner),
      humanQuestion: orUndefined(operation.humanQuestion),
      askHistory: (operation.askHistory || []).filter(Boolean),
    }))

  // Sort by priority first, then by date. Ordering on date alone buried the
  // concrete outreach behind a wall of decisions, because a call scheduled for
  // "this week" has no deadline the way a gate review does — and the work you
  // can actually go and do is the work worth showing.
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
  const KIND_RANK: Record<string, number> = { outreach: 0, content: 1, decision: 2 }
  tasks.sort((a, b) => {
    const byKind = (KIND_RANK[a.kind || ''] ?? 1.5) - (KIND_RANK[b.kind || ''] ?? 1.5)
    if (byKind !== 0) return byKind
    return (PRIORITY_RANK[a.priority || 'normal'] ?? 2) - (PRIORITY_RANK[b.priority || 'normal'] ?? 2)
  })
  const rendered = tasks.slice(0, RENDERED_TASKS)

  // ── Asks ────────────────────────────────────────────────────────────────
  // Load is this week's owned work, not the whole quarter's: comparing a
  // week of capacity against every future-dated task somebody owns would mean
  // anyone holding seeded quarter work is never asked about anything.
  const ownedMinutesByName: Record<string, number> = {}
  for (const operation of data?.owned || []) {
    const name = clean(operation?.ownerName)
    if (!name) continue
    ownedMinutesByName[name] =
      (ownedMinutesByName[name] || 0) +
      estimateOperationMinutes({
        kind: orUndefined(operation.kind),
        priority: orUndefined(operation.priority),
        estimatedMinutes: typeof operation.estimatedMinutes === 'number' ? operation.estimatedMinutes : undefined,
      }).minutes
  }
  const { asks, repeated, exhausted } = weeklyAsks({
    tasks: rendered,
    team,
    roster,
    availability: absences.entries,
    ownedMinutesByName,
    dateKey: today,
    week,
  })
  const askByTask = new Map<string, OwnerAsk>(asks.map((ask) => [ask.taskId, ask]))
  const askBlocks = buildAskBlocks(
    asks.map((ask) => {
      const task = rendered.find((entry) => entry._id === ask.taskId)
      return { ...ask, title: task?.title || 'Untitled task', minutes: task?.minutes || 0 }
    }),
  )
  const exhaustedTasks = exhausted
    .map((id) => rendered.find((task) => task._id === id))
    .filter((task): task is DigestRow => Boolean(task))

  // ── Last week, and posts nobody has written ─────────────────────────────
  const lastWeekPulse = strategy
    ? summarizeOutreach(strategy.contacts, {
        from: new Date(weekStartMs - 7 * DAY_MS).toISOString(),
        to: new Date(weekStartMs).toISOString(),
        now,
      })
    : null
  const doneLastWeek = typeof data?.doneLastWeek === 'number' ? data.doneLastWeek : 0
  const lastWeekLine = [
    `${plural(doneLastWeek, 'task')} done last week`,
    lastWeekPulse ? describePulse(lastWeekPulse, 'Outreach') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const lastWeekBlock: Block = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: clipSlackText(escapeSlackText(lastWeekLine), SLACK_LIMITS.sectionText) }],
  }
  const undraftedBlock = undraftedPostsBlock(undraftedPosts)

  // ── Away, call sheet, follow-ups ────────────────────────────────────────
  // Anyone away this week has their work surfaced for reassignment rather than
  // silently left on their plate.
  const owners = Array.from(
    new Set(tasks.map((task) => task.ownerName).filter((name): name is string => Boolean(name))),
  )
  const awayNotices = findReassignments({
    tasks: tasks.map((task) => ({ _id: task._id, title: task.title, ownerName: task.ownerName })),
    entries: absences.entries,
    team: owners,
    dateKey: today,
  }).map((entry) => ({
    awayOwner: entry.awayOwner,
    taskTitle: entry.task.title,
    candidates: entry.candidates,
  }))

  const callSheet = buildOutreachCallSheet({
    research: data?.research || [],
    contacts: data?.contacts || [],
    offers: data?.offers || [],
    limit: MAX_CALL_SHEET,
  })

  // Follow-ups stay on the contact; owners are mapped onto board names.
  const followUps = listFollowUps(data?.followUpContacts || [], {
    now,
    resolveOwner: (raw) => resolveOwnerName({ displayName: raw, entries: availability }),
  })
  const digestFollowUps: DigestFollowUp[] = followUps.map((entry) => ({
    ...followUpLine(entry, now),
    contactRef: encodeContactRef({ contactId: entry.contactId, organization: entry.organization, name: entry.personLabel }),
  }))
  const handle = marquetaHandle(botUserId || undefined)
  const followUpsMore = (shown: number) => {
    const rest = followUps.length - shown
    return rest > 0 ? `+${plural(rest, 'more follow-up', 'more follow-ups')} due — ask ${handle} \`my calls\`` : ''
  }

  // ── Money and direction ─────────────────────────────────────────────────
  // One card for the runway and the strategy, and only when one of them is
  // due. If the strategy read failed, the runway question still gets asked —
  // it is the input everything else hangs off.
  let moneyBlocks: Block[] = []
  if (strategy) {
    moneyBlocks = buildMoneyAndDirectionBlocks({
      snapshot: strategy.snapshot,
      strategyDue: strategy.due,
      runwayBlocks: buildRunwayBlocks({
        summary: strategy.runway.summary,
        checkIn: strategy.runway.checkIn,
        disagreement: strategy.runway.resolved.disagreement,
      }),
    })
  } else {
    const runway = await settle('runway read', () => readRunway(now))
    if (runway) {
      moneyBlocks = buildRunwayBlocks({
        summary: runway.summary,
        checkIn: runway.checkIn,
        disagreement: runway.resolved.disagreement,
      })
    }
  }

  // Only while somebody is still unmapped: the prompt removes itself once
  // everyone who wants to be linked has been.
  const unmappedOwners = Array.from(
    new Set(tasks.filter((task) => task.ownerName && !task.slackUserId).map((task) => task.ownerName!)),
  )

  const studioUrl = process.env.MARKETING_PUBLIC_BASE_URL
    ? // MUST name the view. Without ?view= the Studio restores whatever the
      // person last had open (localStorage), so "Open the plan" landed on the
      // Shop for anyone who had been there last — a link that goes somewhere
      // plausible but wrong is worse than one that is obviously broken. There
      // is no "ideas" view either (marketingIdea only renders inside SEO).
      `${process.env.MARKETING_PUBLIC_BASE_URL}/studio/marketing?view=thisWeek`
    : undefined

  type Limits = { followUps: number; exhausted: number; away: number; callSheet: number }
  const compose = (limits: Limits): Block[] => {
    const blocks = buildWeeklyDigestBlocks({
      theme: 'This week in marketing',
      weekStart: start,
      weekEnd: end,
      plannedMinutes: tasks.reduce((sum, task) => sum + (task.minutes || 0), 0),
      // Read the real budget rather than assuming 4h: it is 8h now, split between
      // calls and content, and hardcoding it made every week look over-committed.
      budgetMinutes: (data?.weeklyHours || 4) * 60,
      // Tasks render as coloured attachment cards instead of plain blocks.
      tasks: [],
      lead: [
        lastWeekBlock,
        ...(undraftedBlock ? [undraftedBlock] : []),
        ...askBlocks,
        ...exhaustedBlocks(exhaustedTasks, limits.exhausted),
      ],
      callSheet: callSheet.slice(0, limits.callSheet),
      awayNotices: awayNotices.slice(0, limits.away),
      awayNoticesMore: Math.max(0, awayNotices.length - limits.away),
      followUps: digestFollowUps.slice(0, limits.followUps),
      followUpsMore: followUpsMore(Math.min(limits.followUps, digestFollowUps.length)),
      studioUrl,
    })

    // Said out loud rather than hidden: if the scheduled plan did not persist,
    // everything below is the raw board, not the week that was planned.
    if (!planRecorded) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text:
              '_This week’s plan did not save, so this is the open board rather than a planned week. ' +
              'Re-plan on the This week tab.  I would rather say that than pretend._',
          },
        ],
      })
    }

    // Renewals, only when one is close. This is the cheapest item in the whole
    // digest and the only one whose failure takes everything else down with it.
    if (domainNotes.length) {
      blocks.push({ type: 'divider' })
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: clipSlackText('*Renewals*' + '\n' + domainNotes.map((note) => escapeSlackText(note)).join('\n'), SLACK_LIMITS.sectionText),
        },
      })
    }

    blocks.push(...moneyBlocks)
    // Ideas caught in the channel that nobody has judged. The thread reply asks
    // once, and a thread is easy to miss.
    blocks.push(...buildIdeaReviewBlocks(pendingIdeas || [], studioUrl))
    blocks.push(...buildIdentityPromptBlocks(unmappedOwners))
    return blocks
  }

  // Slack refuses a message over fifty blocks outright — the whole digest, not
  // the tail of it. Give things up in a fixed order, cheapest first: follow-up
  // lines (one `my calls` away), then the drop offers, the away notices and
  // the call sheet (each counted, never silently gone). The asks are never
  // trimmed: they are the part addressed to a person.
  const limits: Limits = {
    followUps: MAX_DIGEST_FOLLOW_UPS,
    exhausted: MAX_EXHAUSTED_SHOWN,
    away: MAX_AWAY_SHOWN,
    callSheet: MAX_CALL_SHEET,
  }
  let blocks = compose(limits)
  for (const key of ['followUps', 'exhausted', 'away', 'callSheet'] as const) {
    while (blocks.length > SLACK_LIMITS.blocksPerMessage && limits[key] > 0) {
      limits[key] -= 1
      blocks = compose(limits)
    }
  }
  if (blocks.length > SLACK_LIMITS.blocksPerMessage) blocks = blocks.slice(0, SLACK_LIMITS.blocksPerMessage)

  const attachments = rendered.map((task) =>
    buildTaskAttachment({
      _id: task._id,
      title: task.title,
      kind: task.kind,
      priority: task.priority,
      status: task.status,
      suggestedOwner: task.suggestedOwner,
      ownerName: task.ownerName,
      slackUserId: task.slackUserId,
      minutes: task.minutes,
      whyNow: task.whyNow,
      askedName: askByTask.get(task._id)?.name,
    }),
  )

  // Slack builds the notification from `text`, so the asks' mentions go here
  // as well as in the blocks — otherwise the people named are never told.
  const mentions = askMentionsText(asks)
  const text = clipSlackText(
    `This week in marketing — ${tasks.length} task(s)` + (mentions ? `. ${mentions}` : ''),
    SLACK_LIMITS.fallbackText,
  )

  const askSummary = asks.map((ask) => ({ taskId: ask.taskId, name: ask.name, slackUserId: ask.slackUserId, reason: ask.reason }))

  if (dryRun) {
    return privateMarketingJson({
      dryRun: true,
      wouldPost: true,
      slackConfigured: Boolean(process.env.SLACK_BOT_TOKEN && channel),
      channel,
      week,
      taskCount: tasks.length,
      awayCount: awayNotices.length,
      callSheetCount: callSheet.length,
      followUpCount: followUps.length,
      asks: askSummary,
      // Asks this week's digest already made: shown again, never recorded again.
      repeatedAsks: repeated,
      exhausted,
      unmappedOwners,
      text,
      blocks,
      attachments,
    })
  }

  // Claim the week BEFORE posting, conditional on the record's revision: of two
  // runs racing on one Monday exactly one posts, and a week already posted is
  // skipped unless forced. A stand-down is the lock doing its job — 200, and
  // said so, so the tick does not report it as a failed digest.
  let claim: Awaited<ReturnType<typeof claimWeek>>
  try {
    claim = await claimWeek(client, { docId: DIGEST_HEARTBEAT_DOC_ID, label: 'digest', week, now, force })
  } catch (error) {
    console.error('[digest] could not claim the week', error)
    return privateMarketingJson(
      { posted: false, week, error: `Could not claim the ${week} digest: ${String((error as Error)?.message || error)}` },
      { status: 503 },
    )
  }
  if (claim.kind === 'skip') {
    return privateMarketingJson({
      posted: false,
      skipped: true,
      skipReason: claim.reason,
      detail: claim.detail,
      week,
      channel,
      taskCount: tasks.length,
    })
  }

  let result: { channel: string; ts: string } | null = null
  try {
    result = await postSlackMessage({
      channel,
      attachments,
      // The marketing assistant is Marqueta everywhere else, so she is Marqueta
      // here too. Per-message, because the same Slack app also serves the website
      // chat and must keep its own name there.
      username: MARQUETA_NAME,
      iconEmoji: MARQUETA_ICON,
      // Every opening cites a source, and an unfurled card per link buries the
      // buttons under pages of hero images.
      unfurl: false,
      text,
      blocks,
    })
  } catch (error) {
    console.error('[digest] posting threw', error)
    result = null
  }

  // Only an ask that actually reached the channel is remembered. Recording one
  // from a failed post would count a question nobody saw towards the two asks
  // that turn a task into "drop it?" — and would stop that person ever being
  // asked it for real. An ask repeated from earlier this week is already on
  // record, and is not written twice.
  const repeatedIds = new Set(repeated)
  const asksRecorded = result
    ? await recordAsks(
        asks.filter((ask) => !repeatedIds.has(ask.taskId)),
        now,
        week,
      )
    : 0

  // The week is marked posted only AFTER its asks are recorded, so a forced
  // re-run cannot slip in between and read a posted week with no asks on it —
  // until then the claim is fresh, and a fresh claim is never overridden.
  // A refused post gives the claim back, so a retry can post without force.
  const posted = result
  const summary = `${plural(tasks.length, 'task')}, ${plural(asks.length, 'ask')} (${plural(asksRecorded, 'new one', 'new ones')} recorded)`
  await recordWeekRun(client, {
    docId: DIGEST_HEARTBEAT_DOC_ID,
    week,
    now,
    step: posted
      ? { name: 'digest', ok: true, count: tasks.length, detail: `Digest posted for ${week}: ${summary}.` }
      : { name: 'digest', ok: false, count: 0, detail: `Slack refused the ${week} digest. Check the bot is in the channel.` },
    ...(posted ? { posted: { ts: posted.ts } } : { releaseClaim: true }),
  })

  return privateMarketingJson({
    posted: Boolean(result),
    channel,
    week,
    // postSlackMessage returns null when Slack refuses, most often because the
    // bot has not been invited to the channel. Say so rather than reporting a
    // silent success.
    hint: result ? undefined : 'Slack returned no result — is the bot invited to that channel?',
    taskCount: tasks.length,
    awayCount: awayNotices.length,
    callSheetCount: callSheet.length,
    followUpCount: followUps.length,
    asks: askSummary,
    repeatedAsks: repeated,
    asksRecorded,
  })
}

/**
 * Append each posted ask to its task's `askHistory` — the memory that keeps
 * Marqueta from asking the same person twice, and that turns a task two people
 * were asked about into a "drop it?".
 *
 * Append-only, so two asks landing on one task (or a colleague claiming it at
 * the same moment) cannot overwrite each other. Each entry carries the week it
 * was posted in (`askHistoryEntry`), which is how a second digest the same week
 * recognises it as this week's ask rather than a previous person asked. The
 * `_key` is the task and the person; the week's claim means two runs never
 * both get here, so no key is written twice. Best effort per task: the message
 * is already in the channel, and one failed bookkeeping write must not hide
 * the rest.
 */
async function recordAsks(asks: OwnerAsk[], now: Date, week: string): Promise<number> {
  if (!asks.length) return 0
  const client = getOutreachClient()
  const at = now.toISOString()
  const results = await Promise.allSettled(
    asks.map((ask) =>
      client
        .patch(ask.taskId)
        .setIfMissing({ askHistory: [] })
        .insert('after', 'askHistory[-1]', [
          askHistoryEntry({ taskId: ask.taskId, slackUserId: ask.slackUserId, at, week, kind: ASK_HISTORY_KIND.asked }),
        ])
        .commit(),
    ),
  )
  results.forEach((outcome, index) => {
    if (outcome.status === 'rejected') console.error(`[digest] could not record the ask on ${asks[index].taskId}`, outcome.reason)
  })
  return results.filter((outcome) => outcome.status === 'fulfilled').length
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
