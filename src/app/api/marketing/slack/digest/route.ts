import type { NextRequest } from 'next/server'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { postSlackMessage } from '@/lib/chat/slack'
import { buildOutreachCallSheet } from '@/lib/marketing/callSheet'
import {
  ASK_HISTORY_KIND,
  askHistoryEntry,
  buildWeeklyDigestBlocks,
  digestNotificationText,
  MAX_OWNER_CARDS,
  readAskHistory,
  type AskHistoryEntry,
  type DigestCard,
  type DigestFollowUp,
  type LastWeekNumbers,
} from '@/lib/marketing/slackDelegation'
import { readRunway } from '@/lib/marketing/runway.server'
import { buildMoneyAndDirectionBlocks } from '@/lib/marketing/strategyCheck'
import { loadStrategySnapshot, type StrategyLoad } from '@/lib/marketing/strategyCheck.server'
import { ideasNeedingReview } from '@/lib/marketing/ideaCapture.server'
import { findReassignments, resolveOwnerName, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { DEFAULT_WEEKLY_MARKETING_HOURS, estimateOperationMinutes, resolveWeeklyMinutes } from '@/lib/marketing/effort'
import { getMarketingWriteClientFor } from '@/lib/marketing/client'
import { getOutreachClient, isOutreachClientConfigured } from '@/lib/marketing/outreachClient.server'
import { askableTeam, marketingTeamNames, slackIdForOwner, TEAM_AVAILABILITY_PROJECTION, tidyAvailability } from '@/lib/marketing/team.server'
import { proposeOwnerAsks, type AskTask, type AskTeamMember, type OwnerAsk } from '@/lib/marketing/ownerAsk'
import { DIGEST_HEARTBEAT_DOC_ID } from '@/lib/marketing/heartbeat'
import { absencesOn, claimWeek, recordWeekRun, utcIsoWeekKey } from '@/lib/marketing/weeklyCheckIn.server'
import { followUpLine, listFollowUps, type FollowUpContact } from '@/lib/marketing/followUps'
import { encodeContactRef } from '@/lib/marketing/marquetaActions'
import { countLabel, MARQUETA_IDENTITY, weekOfLabel } from '@/lib/marketing/marquetaStyle'
import { describePulse, summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { MARKETING_OPERATION_TYPE, WEEKLY_PLAN_SOURCE_PREFIX } from '@/lib/marketing/operations'
import { escapeSlackText } from '@/lib/marketing/slackText'
import { studioTaskUrl } from '@/lib/marketing/taskLinks'
import { buildTaskCard, isDecisionTask, type CheckInTask, type TaskCardOptions } from '@/lib/marketing/weeklyCheckIn'

/**
 * Post the Monday plan to Slack, with the buttons that make it a delegation
 * rather than an announcement.
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
 * WHICH work it shows is the planned week, when there is one. The tick passes
 * what plan-week just recorded (`plan: { itemIds, decisionIds, … }`), and
 * "Needs an owner" and "Decisions waiting" are drawn from exactly those ids —
 * so the Monday plan and This week list the same work. Recomputing the plan
 * here would need every input plan-week reads (posture, availability,
 * settings), which is how two copies of one plan drift. Without a plan (a
 * manual post, or a week whose plan did not save) it shows the open board,
 * and says so.
 *
 * The ORDER of what it says is `buildWeeklyDigestBlocks`'s; this route only
 * reads the records, decides who to ask, and draws each task's card.
 */

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

/** Three @-mentions in one message reads as a pile-on (ownerAsk.ts). */
const MAX_ASKS_PER_PERSON = 2
const MAX_CALL_SHEET = 3
/** The planned week names at most this many tasks; anything past it is not a plan anyone reads. */
const MAX_PLANNED_IDS = 60
const DAY_MS = 86_400_000

/**
 * "Jen passed on this — who should pick it up?" — the question "Not me" leaves
 * behind. A FALLBACK only, for tasks passed on before the passer's Slack id was
 * recorded in `askHistory`: the name in it was Slack's display name, which
 * often does not match the roster's (see `weeklyAsks`).
 */
const PASSED_BY = /^(.+?)\s+passed on this\b/i

/** Every field a task card, an ask and a stuck line read — one projection for both task lists. */
const OPERATION_PROJECTION = `{
      _id, title, ownerName, suggestedOwner, ownerSlackUserId, estimatedMinutes, whyNow, kind, status,
      priority, sourceKey, dueAt, humanQuestion, blocker, targetView,
      "askHistory": askHistory[]{ slackUserId, at, week, kind }
    }`

/**
 * Undated work sorts last. An operation created without a date stores `dueAt:
 * ""` (older records; `normalizeMarketingOperationInput` now leaves it out),
 * and `coalesce` keeps "" — which sorts ahead of every real date, so undated
 * desk tasks pushed overdue work out of a capped read.
 */
const DUE_AT_ORDER = `select(defined(dueAt) && dueAt != "" => dueAt, "9999")`

/**
 * `operations` is the open board (stuck work included — it used to vanish from
 * the Monday plan, the one week somebody most needed to see it). `planned` is
 * the planned week by id, read on its own so a planned task can never fall off
 * the end of the board's first forty.
 */
const DATA_QUERY = `{
  "operations": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && status in ["queued", "working", "needsHuman", "blocked"]
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]
    | order(${DUE_AT_ORDER} asc)[0...40]${OPERATION_PROJECTION},
  "planned": *[_type == "${MARKETING_OPERATION_TYPE}" && _id in $plannedIds && !(_id in path("drafts.**"))
    && !(status in ["done", "dismissed"])]${OPERATION_PROJECTION},
  "owned": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && !(status in ["done", "dismissed"]) && defined(ownerName) && ownerName != ""
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)
    && (!defined(dueAt) || dueAt == "" || dateTime(dueAt) < dateTime($weekEnd))]{
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

/** How many unjudged ideas to read: enough to count them honestly, few enough to stay cheap. */
const IDEAS_READ = 50

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
  blocker?: string | null
  targetView?: string | null
  askHistory?: AskHistoryEntry[] | null
}

type OwnedOperation = { ownerName?: string | null; estimatedMinutes?: number | null; kind?: string | null; priority?: string | null }

type DigestData = {
  operations?: StoredOperation[] | null
  planned?: StoredOperation[] | null
  owned?: OwnedOperation[] | null
  doneLastWeek?: number | null
  availability?: Partial<Record<keyof TeamMemberAvailability, unknown>>[] | null
  research?: never[] | null
  contacts?: never[] | null
  followUpContacts?: FollowUpContact[] | null
  offers?: never[] | null
  weeklyHours?: number | null
}

/** A task as the digest handles it: what its card shows, plus what the ask logic needs. */
type DigestRow = CheckInTask & {
  suggestedOwner?: string
  askHistory: AskHistoryEntry[]
}

/** The week plan-week just recorded, as the tick hands it over. */
type DigestPlan = {
  itemIds: string[]
  decisionIds: string[]
  theme: string
  plannedMinutes: number | null
  budgetMinutes: number | null
}

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const lower = (value: unknown) => clean(value).toLowerCase()
const orUndefined = (value: string | null | undefined) => clean(value) || undefined
const finiteMinutes = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)

/**
 * The planned week from the request body, or null. Nothing in it is trusted
 * beyond its shape: ids are clipped strings (they are only ever looked up),
 * the theme is plain text the builder escapes, the numbers must be numbers.
 */
function readPlan(value: unknown): DigestPlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const plan = value as Record<string, unknown>
  if (!Array.isArray(plan.itemIds) && !Array.isArray(plan.decisionIds)) return null
  const ids = (list: unknown) =>
    Array.from(new Set((Array.isArray(list) ? list : []).map((id) => clean(id).slice(0, 180)).filter(Boolean))).slice(0, MAX_PLANNED_IDS)
  return {
    itemIds: ids(plan.itemIds),
    decisionIds: ids(plan.decisionIds),
    theme: typeof plan.theme === 'string' ? clean(plan.theme).slice(0, 120) : '',
    plannedMinutes: finiteMinutes(plan.plannedMinutes),
    budgetMinutes: finiteMinutes(plan.budgetMinutes),
  }
}

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

function toRow(operation: StoredOperation, availability: TeamMemberAvailability[]): DigestRow {
  return {
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
    kind: orUndefined(operation.kind),
    priority: orUndefined(operation.priority),
    status: orUndefined(operation.status),
    suggestedOwner: orUndefined(operation.suggestedOwner),
    humanQuestion: orUndefined(operation.humanQuestion),
    dueAt: orUndefined(operation.dueAt),
    blocker: orUndefined(operation.blocker),
    targetView: orUndefined(operation.targetView),
    sourceKey: orUndefined(operation.sourceKey),
    askHistory: (operation.askHistory || []).filter(Boolean),
  }
}

/** A decision still waiting for its answer — the card's rule, and the planner's (needsHuman). */
const waitingDecision = (row: DigestRow) => row.status === 'needsHuman' && isDecisionTask(row)
const isStuck = (row: DigestRow) => row.status === 'blocked'
const isOwned = (row: DigestRow) => Boolean(clean(row.ownerName))
/** Waiting on a person, but for an OWNER, not an answer — what "Not me" leaves behind. */
const lookingForOwner = (row: DigestRow) => row.status === 'needsHuman' && !waitingDecision(row) && !isOwned(row)

/**
 * Without a plan: priority first, then date. Ordering on date alone buried the
 * concrete outreach behind a wall of decisions, because a call scheduled for
 * "this week" has no deadline the way a gate review does — and the work you
 * can actually go and do is the work worth showing.
 */
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
const KIND_RANK: Record<string, number> = { outreach: 0, content: 1, decision: 2 }
function boardOrder(a: DigestRow, b: DigestRow): number {
  const byKind = (KIND_RANK[a.kind || ''] ?? 1.5) - (KIND_RANK[b.kind || ''] ?? 1.5)
  if (byKind !== 0) return byKind
  return (PRIORITY_RANK[a.priority || 'normal'] ?? 2) - (PRIORITY_RANK[b.priority || 'normal'] ?? 2)
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
 * At most `maxAsks` in all, because every ask is drawn as a card and the
 * Monday plan shows five: nobody is asked about a task they cannot see.
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
  maxAsks: number
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
    if (task.ownerName || waitingDecision(task)) continue
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
    const answered = new Set([...history.answeredIds, ...(passedById ? [passedById] : [])])
    // Two people have answered: the honest question now is whether it is worth
    // doing, not who a third person could be. Decided before the cap, so a task
    // past the fifth card is still counted as what it is.
    if (answered.size >= 2) {
      exhausted.push(task._id)
      continue
    }
    if (asks.length >= input.maxAsks) continue

    const askTask: AskTask = {
      _id: task._id,
      title: task.title,
      ownerName: task.ownerName,
      suggestedOwner: task.suggestedOwner,
      minutes,
      kind: task.kind,
      askedSlackUserIds: [...answered],
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
  // though it were the plan, and the planned ids are not used.
  const body = (request.method === 'POST' ? await request.json().catch(() => ({})) : {}) as Record<string, unknown>
  const planRecorded = body.planRecorded !== false
  const plan = planRecorded ? readPlan(body.plan) : null
  // Registry warnings, passed in by the tick. Absent in a manual post, and
  // empty whenever every domain has months left - silence is the default.
  const domainNotes = (Array.isArray(body.domainNotes) ? body.domainNotes : []).map((note) => clean(note)).filter(Boolean)
  // Post this week's digest again, on purpose. Opt-in by an exact value, the
  // way the check-in reads it: `?force=0` must not become a force.
  const force = params.get('force') === '1' || body.force === true

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
  const weekStart = isoDay(weekStartMs)
  // Links people click. Never where this route calls anything (see the tick).
  const studioBaseUrl = String(process.env.MARKETING_PUBLIC_BASE_URL || '').trim() || undefined

  const [data, strategy, pendingIdeas, undraftedPosts] = await Promise.all([
    client.fetch<DigestData | null>(DATA_QUERY, {
      planPrefix: WEEKLY_PLAN_SOURCE_PREFIX,
      plannedIds: plan ? [...plan.itemIds, ...plan.decisionIds] : [],
      weekStart: new Date(weekStartMs).toISOString(),
      weekEnd: new Date(weekStartMs + 7 * DAY_MS).toISOString(),
      lastWeekStart: new Date(weekStartMs - 7 * DAY_MS).toISOString(),
    }),
    // Runway, strategy and the contacts' call log, read once. It also finds
    // the latest win and hands it to the runway check-in, so a deal won since
    // the runway was last confirmed makes the card ask whether it moved the date.
    settle<StrategyLoad>('strategy read', () => loadStrategySnapshot(now)),
    settle('idea review read', () => ideasNeedingReview(IDEAS_READ)),
    settle('calendar read', () =>
      getMarketingWriteClientFor('marketingCalendarItem').fetch<{ title?: string | null }[] | null>(UNDRAFTED_POSTS_QUERY, {
        from: now.toISOString(),
        to: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      }),
    ),
  ])

  const availability = tidyAvailability(data?.availability)
  // Who is away today, by board name OR Slack id: the "I'm away this week"
  // button files the absence under Slack's display name, next to the record
  // the roster knows the person by, and a name-only check asked people on
  // holiday. `absences.entries` carries that absence under every linked name,
  // so hours, asks and the away cover all see it.
  const absences = absencesOn(availability, today)
  const roster = askableTeam(availability)
  const team = roster.filter((member) => !absences.isAway(member.name, member.slackUserId))

  // ── The rows ────────────────────────────────────────────────────────────
  const rows = new Map<string, DigestRow>()
  for (const operation of [...(data?.planned || []), ...(data?.operations || [])]) {
    // The plan's own record is a note about the work, not work (WEEKLY_PLAN_SOURCE_PREFIX).
    if (!operation?._id || rows.has(operation._id) || clean(operation.sourceKey).startsWith(WEEKLY_PLAN_SOURCE_PREFIX)) continue
    rows.set(operation._id, toRow(operation, availability))
  }
  const openRows = [...rows.values()]
  const pick = (ids: string[]) => ids.map((id) => rows.get(id)).filter((row): row is DigestRow => Boolean(row))

  let work: DigestRow[]
  let decisions: DigestRow[]
  if (plan) {
    const plannedDecisions = pick(plan.decisionIds)
    decisions = plannedDecisions.filter(waitingDecision)
    // A plan recorded before the planner stopped filing "Not me" tasks as
    // decisions may still hold one here: it is looking for an owner, not an answer.
    work = [...pick(plan.itemIds), ...plannedDecisions.filter((row) => !waitingDecision(row))]
    // A task somebody passed on is shown whether or not the plan fitted it.
    // Only the planned ids reach this message, so one the planner deferred
    // "over budget" was never asked about again — and the "asked twice → drop
    // it?" that ends an owner search could never come up.
    const planned = new Set([...plan.itemIds, ...plan.decisionIds])
    work.push(...openRows.filter((row) => !planned.has(row._id) && lookingForOwner(row)))
  } else {
    const board = [...openRows].sort(boardOrder)
    decisions = board.filter(waitingDecision)
    work = board.filter((row) => !waitingDecision(row))
  }
  // Stuck work has its own line: it cannot take this week's hours, and it is
  // on the board whether or not the planner fitted it.
  work = work.filter((row) => !isStuck(row))
  const stuckRows = openRows.filter(isStuck)

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
  const unowned = work.filter((row) => !isOwned(row))
  const { asks, repeated, exhausted } = weeklyAsks({
    tasks: unowned,
    team,
    roster,
    availability: absences.entries,
    ownedMinutesByName,
    dateKey: today,
    week,
    maxAsks: MAX_OWNER_CARDS,
  })

  // ── Away cover ──────────────────────────────────────────────────────────
  // Work on the plan that belongs to someone away is surfaced for cover rather
  // than silently left on their plate — with who is actually free: people on
  // the team list, never a name that is away itself, and never somebody who
  // merely has a task (an owner with no team record may not be on the team).
  const coverNames = Array.from(
    new Map(availability.map((entry) => clean(entry.ownerName)).filter(Boolean).map((name) => [lower(name), name])).values(),
  )
  const covers = findReassignments({
    tasks: work.filter(isOwned).map((row) => ({ _id: row._id, title: row.title, ownerName: row.ownerName })),
    entries: absences.entries,
    team: coverNames,
    dateKey: today,
  })
  const coverIds = new Set(covers.map((cover) => cover.task._id))

  // ── Cards ───────────────────────────────────────────────────────────────
  const card = (row: DigestRow, options: Partial<TaskCardOptions> = {}): DigestCard => ({
    taskId: row._id,
    blocks: buildTaskCard(row, { now, mode: 'plan', studioBaseUrl, ...options }),
  })
  const askByTask = new Map(asks.map((ask) => [ask.taskId, ask]))
  const exhaustedIds = new Set(exhausted)
  const askedCards = unowned
    .filter((row) => askByTask.has(row._id))
    .map((row) => {
      const ask = askByTask.get(row._id)!
      return card(row, { ask: { slackUserId: ask.slackUserId, name: ask.name, reason: ask.reason } })
    })
  const awayCards = covers
    .map((cover) => {
      const row = rows.get(cover.task._id)
      if (!row) return null
      // Names, not mentions: the people named are being suggested, not asked.
      const free = cover.candidates.length ? `free this week: ${cover.candidates.join(', ')}` : 'nobody is free this week'
      return card(row, { context: 'away', awayNote: escapeSlackText(`${clean(cover.awayOwner)} is away · ${free}`) })
    })
    .filter((entry): entry is DigestCard => Boolean(entry))
  const exhaustedCards = unowned.filter((row) => exhaustedIds.has(row._id)).map((row) => card(row, { context: 'exhausted' }))
  const openCards = unowned.filter((row) => !askByTask.has(row._id) && !exhaustedIds.has(row._id)).map((row) => card(row))
  const needsOwnerCount = askedCards.length + awayCards.length + exhaustedCards.length + openCards.length

  // Owned work is a roll call. Owners get their own cards on Thursday.
  const taken = new Map<string, { name: string; slackUserId?: string; count: number }>()
  for (const row of work) {
    if (!isOwned(row) || coverIds.has(row._id)) continue
    const key = row.slackUserId || `name:${lower(row.ownerName)}`
    const entry = taken.get(key) || { name: clean(row.ownerName), ...(row.slackUserId ? { slackUserId: row.slackUserId } : {}), count: 0 }
    entry.count += 1
    taken.set(key, entry)
  }

  // ── Last week ───────────────────────────────────────────────────────────
  // Follow-ups are left out of this sentence: "Outreach this week" owns them,
  // counted from now. Counted here too they were a second, different number a
  // few lines above it — due to last Monday but overdue to 9am today, so any
  // follow-up set for this Monday read "1 follow-up due (3 overdue)".
  const lastWeekPulse = strategy
    ? {
        ...summarizeOutreach(strategy.contacts, {
          from: new Date(weekStartMs - 7 * DAY_MS).toISOString(),
          to: new Date(weekStartMs).toISOString(),
          now,
        }),
        followUpsDue: 0,
        followUpsOverdue: 0,
      }
    : null
  const doneLastWeek = typeof data?.doneLastWeek === 'number' ? data.doneLastWeek : 0
  // The same week as figures, set against the week before it — the grid the
  // message opens with. Without the call log only the tasks are known.
  const lastWeekNumbers: LastWeekNumbers = {
    tasksDone: doneLastWeek,
    outreach:
      strategy && lastWeekPulse
        ? {
            touches: lastWeekPulse.touches,
            people: lastWeekPulse.people,
            replies: lastWeekPulse.replies,
            meetings: lastWeekPulse.meetings,
            opportunities: lastWeekPulse.opportunities,
            won: lastWeekPulse.won,
            previousTouches: summarizeOutreach(strategy.contacts, {
              from: new Date(weekStartMs - 14 * DAY_MS).toISOString(),
              to: new Date(weekStartMs - 7 * DAY_MS).toISOString(),
              now,
            }).touches,
          }
        : null,
  }
  const lastWeek = [
    `Last week: ${countLabel(doneLastWeek, 'task')} done`,
    lastWeekPulse ? describePulse(lastWeekPulse, 'Outreach') : '',
  ]
    .filter(Boolean)
    .join(' · ')

  // ── Outreach ────────────────────────────────────────────────────────────
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

  // ── Money and direction ─────────────────────────────────────────────────
  // Asked only when something is due, one question at a time. If the strategy
  // read failed, the runway question is still asked — it is the input
  // everything else hangs off.
  let money: ReturnType<typeof buildMoneyAndDirectionBlocks> = []
  if (strategy) {
    money = buildMoneyAndDirectionBlocks({
      now,
      runway: strategy.runway,
      snapshot: strategy.snapshot,
      strategyDue: strategy.due,
      studioBaseUrl,
    })
  } else {
    const runway = await settle('runway read', () => readRunway(now))
    if (runway) money = buildMoneyAndDirectionBlocks({ now, runway })
  }

  // Only while somebody is still unmapped: the prompt removes itself once
  // everyone who wants to be linked has been. The whole team is offered, not
  // just names that already own work — linking is the only way onto the list
  // of people who can be asked, and somebody with no work yet had no way in.
  const linkedNames = new Set(availability.filter((entry) => entry.slackUserId).map((entry) => lower(entry.ownerName)))
  const unmappedOwners = Array.from(
    new Map(
      [
        ...openRows.filter((row) => row.ownerName && !row.slackUserId).map((row) => clean(row.ownerName)),
        ...marketingTeamNames().filter((name) => !linkedNames.has(lower(name))),
      ].map((name) => [lower(name), name]),
    ).values(),
  )

  const budgetMinutes = plan?.budgetMinutes || resolveWeeklyMinutes(data?.weeklyHours)
  const blocks = buildWeeklyDigestBlocks({
    now,
    weekStart,
    budgetMinutes,
    plan: plan ? { plannedMinutes: plan.plannedMinutes ?? 0, theme: plan.theme } : null,
    openMinutes: openRows.reduce((sum, row) => sum + (row.minutes || 0), 0),
    planRecorded,
    renewals: domainNotes,
    lastWeek,
    lastWeekNumbers,
    needsOwner: { asked: askedCards, away: awayCards, exhausted: exhaustedCards, open: openCards },
    decisions: decisions.map((row) => card(row)),
    // The plan puts four questions in front of people; the rest are still
    // waiting, and "+N more" should say so rather than read as none.
    decisionsTotal: Math.max(decisions.length, openRows.filter(waitingDecision).length),
    taken: [...taken.values()],
    stuck: stuckRows.map((row) => ({
      title: row.title,
      ownerName: row.ownerName,
      slackUserId: row.slackUserId,
      blocker: row.blocker,
      url: studioTaskUrl({
        baseUrl: studioBaseUrl,
        taskId: row._id,
        targetView: row.targetView,
        kind: row.kind,
        status: row.status,
        humanQuestion: row.humanQuestion,
      }),
    })),
    followUps: digestFollowUps,
    followUpsTotal: followUps.length,
    callSheet,
    undraftedPosts: undraftedPosts || [],
    money,
    ideas: pendingIdeas || [],
    ideasTotal: (pendingIdeas || []).length,
    unmappedOwners,
    studioBaseUrl,
  })

  // Slack builds the notification from `text`, so the asks' mentions lead it —
  // otherwise the people named are never told.
  const text = digestNotificationText({
    asks,
    needsOwner: needsOwnerCount,
    followUps: followUps.length,
    weekStart,
    now,
  })

  const askSummary = asks.map((ask) => ({ taskId: ask.taskId, name: ask.name, slackUserId: ask.slackUserId, reason: ask.reason }))

  if (dryRun) {
    return privateMarketingJson({
      dryRun: true,
      wouldPost: true,
      slackConfigured: Boolean(process.env.SLACK_BOT_TOKEN && channel),
      channel,
      week,
      planned: Boolean(plan),
      taskCount: openRows.length,
      needsOwnerCount,
      awayCount: covers.length,
      callSheetCount: callSheet.length,
      followUpCount: followUps.length,
      asks: askSummary,
      // Asks this week's digest already made: shown again, never recorded again.
      repeatedAsks: repeated,
      exhausted,
      unmappedOwners,
      text,
      blocks,
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
      taskCount: openRows.length,
    })
  }

  let result: { channel: string; ts: string } | null = null
  try {
    result = await postSlackMessage({
      channel,
      // Per message, because the same Slack app also serves the website chat
      // and must keep its own name there.
      username: MARQUETA_IDENTITY.username,
      iconEmoji: MARQUETA_IDENTITY.iconEmoji,
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
  // that turn a task into "still worth doing?" — and would stop that person
  // ever being asked it for real. An ask repeated from earlier this week is
  // already on record, and is not written twice.
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
  const weekOf = weekOfLabel(weekStart, now).replace(/^Week of/, 'the week of')
  const summary = `${countLabel(openRows.length, 'task')}, ${countLabel(asks.length, 'ask')} (${countLabel(asksRecorded, 'new one', 'new ones')} recorded)`
  await recordWeekRun(client, {
    docId: DIGEST_HEARTBEAT_DOC_ID,
    week,
    now,
    step: posted
      ? { name: 'digest', ok: true, count: openRows.length, detail: `Digest posted for ${weekOf}: ${summary}.` }
      : { name: 'digest', ok: false, count: 0, detail: `Slack refused the digest for ${weekOf}. Check the bot is in the channel.` },
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
    taskCount: openRows.length,
    needsOwnerCount,
    awayCount: covers.length,
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
 * were asked about into "still worth doing?".
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
