/**
 * Thursday's check-in, run for real: read the board, ask each person about
 * their list, post it once, and write down that it happened.
 *
 * `weeklyCheckIn.ts` decides what the message says. This file owns the three
 * things that make a scheduled post trustworthy rather than merely scheduled:
 *
 * 1. **It posts once.** Vercel can fire a cron twice, and a person can run the
 *    route by hand on the same morning. Before posting, a run CLAIMS the week on
 *    the check-in's heartbeat document, conditional on the revision it read
 *    (`ifRevisionId`) — so of two runs racing, exactly one wins the claim and
 *    the other stands down. A week already posted is skipped unless `force`.
 *    A claim that never turned into a post (a crash mid-run) goes stale after
 *    fifteen minutes and can then be taken over with `force` — but a FRESH
 *    claim is never overridden, even with force, because that is a run still
 *    in flight and overriding it is exactly the double post this prevents.
 * 2. **It posts only in her own room** — `SLACK_MARKETING_CHANNEL_ID`, never
 *    the website-chat channel as a fallback. No channel, no post: it fails
 *    closed and says so.
 * 3. **It leaves evidence.** Every real run records what it did — how many
 *    tasks and follow-ups it asked about, the message it posted, or the reason
 *    it failed — on its own heartbeat document, apart from the Monday tick's,
 *    so the watchdog can tell "Thursday is broken" from "Monday is broken".
 *
 * `dryRun` builds the exact message and touches nothing: no claim, no post, no
 * record. It is how the route is previewed, and a preview must not be able to
 * consume the week's claim.
 *
 * Tasks, contacts and the roster are read in one query through
 * `getOutreachClient` — the private dataset, published perspective, so a task
 * open in the Studio editor is asked about once.
 */
import 'server-only'
import { postSlackMessage } from '@/lib/chat/slack'
import { isRevisionConflict } from './apiBoundary'
import { isInForceOn, resolveOwnerName, type TeamMemberAvailability } from './availability'
import {
  followUpLine,
  groupFollowUpsByOwner,
  listFollowUps,
  unownedFollowUpsText,
  type FollowUpContact,
} from './followUps'
import { CHECKIN_HEARTBEAT_DOC_ID, HEARTBEAT_DOC_TYPE, type HeartbeatStep } from './heartbeat'
import { encodeContactRef } from './marquetaActions'
import { MARKETING_OPERATION_TYPE } from './operations'
import { getOutreachClient } from './outreachClient.server'
import { summarizeOutreach, type PulseContact } from './outreachPulse'
import { clipSlackText, escapeSlackText, marquetaHandle, SLACK_LIMITS } from './slackText'
import { checkInRoster, TEAM_AVAILABILITY_PROJECTION, tidyAvailability } from './team.server'
import {
  buildWeeklyCheckInBlocks,
  checkInFallbackText,
  groupCheckInTasks,
  MAX_CHECK_IN_BLOCKS,
  type CheckInFollowUp,
  type CheckInGroup,
  type CheckInTask,
} from './weeklyCheckIn'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Her name and icon in Slack — the same the digest uses, set per message. */
const MARQUETA_NAME = 'Marqueta'
const MARQUETA_ICON = ':chart_with_upwards_trend:'

const DAY_MS = 86_400_000
/** After this long, a claim with no post behind it is a crashed run, not one in flight. */
export const CHECK_IN_CLAIM_STALE_MS = 15 * 60 * 1000
const WEEKLY_PLAN_PREFIX = 'weekly-plan/'

export type CheckInSkipReason = 'alreadyPosted' | 'claimed' | 'staleClaim'

export type CheckInRunResult = {
  ok: boolean
  /** True when this run stood down (already posted, or another run holds the claim). */
  skipped?: boolean
  skipReason?: CheckInSkipReason
  posted: boolean
  week: string
  blocks: Block[]
  text: string
  /** Tasks asked about (shown plus "+N more"), across everyone. */
  taskCount: number
  followUpCount: number
  /** One line for a person — the same line the heartbeat records. */
  detail: string
  channel?: string
  ts?: string
}

type StoredTask = {
  _id: string
  _createdAt?: string | null
  _updatedAt?: string | null
  title?: string | null
  ownerName?: string | null
  ownerSlackUserId?: string | null
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

type CheckInContact = FollowUpContact & PulseContact

/**
 * Open work (not weekly-plan records), the roster, and only the contacts that
 * can matter: a follow-up date or at least one logged touch. A contact with
 * neither is not owed a call and adds nothing to the pulse.
 */
export const CHECK_IN_DATA_QUERY = `{
  "tasks": *[_type == "${MARKETING_OPERATION_TYPE}" && !(_id in path("drafts.**"))
    && !(status in ["done", "dismissed"])
    && !string::startsWith(coalesce(sourceKey, ""), $planPrefix)]{
      _id, _createdAt, _updatedAt, title, ownerName, ownerSlackUserId, status, kind, priority,
      dueAt, estimatedMinutes, blocker, humanQuestion, lastOutcome, sourceKey
    },
  "availability": *[_type == "marketingTeamAvailability" && !(_id in path("drafts.**"))]${TEAM_AVAILABILITY_PROJECTION},
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**"))
    && (defined(followUpAt) || defined(interactions[0]))]{
      _id, name, email, organization, owner, status, warmth, followUpAt,
      "interactions": interactions[]{ at, by, channel, statusAfter, value }
    }
}`

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
const orUndefined = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value)

/**
 * ISO week key in UTC ("2026-W39").
 *
 * The planner's `isoWeekKey` reads the machine's local calendar; this job runs
 * on Vercel (UTC) and is tested on laptops in Boston, and the claim must name
 * the same week on both or a dry run on a laptop could disagree with the cron
 * about which week it is.
 */
export function utcIsoWeekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  date.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7))
  const year = date.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7))
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Monday 00:00 UTC of the ISO week containing `now`. */
function weekStart(now: Date): number {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS
  return today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (ms: number) => {
  const date = new Date(ms)
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

function toCheckInTask(task: StoredTask): CheckInTask {
  return {
    _id: task._id,
    title: clean(task.title) || 'Untitled task',
    ownerName: orUndefined(task.ownerName),
    // The task's stamped id is the LAST resort: groupCheckInTasks reads the
    // roster first and only falls back to this for an unmapped name.
    slackUserId: orUndefined(task.ownerSlackUserId),
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

type Client = ReturnType<typeof getOutreachClient>

export type WeekClaim =
  | { kind: 'claimed' }
  | { kind: 'skip'; reason: CheckInSkipReason; detail: string }

/**
 * Take this week's claim on a scheduled post's own record, or say why not.
 *
 * Shared by the Thursday check-in and the Monday digest: each keeps its claim
 * on its own heartbeat document (`docId`), and `label` names the post in the
 * sentences ("The 2026-W39 digest was already posted."). Conditional on the
 * revision read, so two runs cannot both succeed: the loser's write is rejected
 * and it stands down as `claimed`.
 */
export async function claimWeek(
  client: Client,
  input: { docId: string; label: string; week: string; now: Date; force: boolean },
): Promise<WeekClaim> {
  const { docId, label, week, now, force } = input
  await client.createIfNotExists({ _id: docId, _type: HEARTBEAT_DOC_TYPE })
  const record = await client.fetch<{
    _rev?: string
    postedWeek?: string | null
    claimedWeek?: string | null
    claimedAt?: string | null
  } | null>(`*[_id == $id][0]{ _rev, postedWeek, claimedWeek, claimedAt }`, { id: docId })
  if (!record?._rev) throw new Error(`could not read the ${label} record to claim the week`)

  if (record.postedWeek === week && !force) {
    return { kind: 'skip', reason: 'alreadyPosted', detail: `The ${week} ${label} was already posted.` }
  }
  if (record.claimedWeek === week && record.postedWeek !== week) {
    const claimedAt = Date.parse(String(record.claimedAt || ''))
    const age = Number.isFinite(claimedAt) ? now.getTime() - claimedAt : 0
    if (age < CHECK_IN_CLAIM_STALE_MS) {
      return { kind: 'skip', reason: 'claimed', detail: `Another run is posting the ${week} ${label}.` }
    }
    if (!force) {
      return {
        kind: 'skip',
        reason: 'staleClaim',
        detail: `A run claimed ${week} ${Math.round(age / 60000)} minutes ago and never posted. Run again with force=1 to post it.`,
      }
    }
  }

  try {
    await client
      .patch(docId)
      .set({ claimedWeek: week, claimedAt: now.toISOString() })
      .ifRevisionId(record._rev)
      .commit()
  } catch (error) {
    // Only a revision conflict means another run won. Anything else is a
    // failure to claim, and is reported as one rather than as a quiet stand-down.
    if (!isRevisionConflict(error)) throw error
    return { kind: 'skip', reason: 'claimed', detail: `Another run claimed the ${week} ${label} first.` }
  }
  return { kind: 'claimed' }
}

/**
 * Write down what a scheduled post did, on its own record. Best effort: the
 * post is the product, and a bookkeeping failure must not turn a posted
 * message into a reported failure.
 */
export async function recordWeekRun(
  client: Client,
  input: {
    docId: string
    week: string
    now: Date
    step: HeartbeatStep
    posted?: { ts: string }
    releaseClaim?: boolean
  },
) {
  try {
    const ranAt = input.now.toISOString()
    const set: Record<string, unknown> = {
      week: input.week,
      ranAt,
      steps: [{ _key: `${input.step.name}-0`, ...input.step }],
    }
    const unset: string[] = []
    if (input.step.ok) {
      set.lastHealthyAt = ranAt
      unset.push('error')
    } else {
      set.error = input.step.detail
    }
    if (input.posted) {
      set.postedWeek = input.week
      set.postedTs = input.posted.ts
    }
    // A failed run gives its claim back, so a retry can post without force.
    if (input.releaseClaim) unset.push('claimedWeek', 'claimedAt')
    await client.createIfNotExists({ _id: input.docId, _type: HEARTBEAT_DOC_TYPE })
    let patch = client.patch(input.docId).set(set)
    if (unset.length) patch = patch.unset(unset)
    await patch.commit()
  } catch (error) {
    console.error(`[${input.step.name}] could not record the heartbeat`, error)
  }
}

const claimCheckInWeek = (client: Client, week: string, now: Date, force: boolean) =>
  claimWeek(client, { docId: CHECKIN_HEARTBEAT_DOC_ID, label: 'check-in', week, now, force })

const recordHeartbeat = (
  client: Client,
  input: { week: string; now: Date; step: HeartbeatStep; posted?: { ts: string }; releaseClaim?: boolean },
) => recordWeekRun(client, { docId: CHECKIN_HEARTBEAT_DOC_ID, ...input })

// ── Who is away ──────────────────────────────────────────────────────────────

/**
 * Who is away on `dateKey`, matched by board name OR Slack id.
 *
 * By name alone it misses the commonest case. The digest's "I'm away this
 * week" button files the absence under whatever Slack's display name is
 * ("Shirley Wu"), next to the linked record the roster knows her by
 * ("Shirley") — so a name-only check found Shirley available, and the check-in
 * @-mentioned her, on holiday, with Done and Stuck buttons, and put the mention
 * in the notification text her phone reads.
 *
 * `entries` is the roster with each id-linked absence ALSO filed under every
 * other name that shares its Slack id, placed first so the name-keyed helpers
 * (`statusOn`, `hoursForWeek`, `findReassignments`) read the absence before the
 * linked record's "available". Pass it wherever those helpers decide something
 * about a person this week.
 */
export function absencesOn(
  entries: TeamMemberAvailability[],
  dateKey: string,
): { entries: TeamMemberAvailability[]; isAway: (ownerName?: string | null, slackUserId?: string | null) => boolean } {
  const roster = (entries || []).filter((entry) => entry && clean(entry.ownerName))
  const away = roster.filter((entry) => entry.status === 'away' && isInForceOn(entry, dateKey))
  const awayNames = new Set(away.map((entry) => clean(entry.ownerName).toLowerCase()))
  const awayIds = new Set(away.map((entry) => clean(entry.slackUserId)).filter(Boolean))

  const linked: TeamMemberAvailability[] = []
  for (const absence of away) {
    const id = clean(absence.slackUserId)
    if (!id) continue
    for (const other of roster) {
      const name = clean(other.ownerName)
      if (clean(other.slackUserId) !== id || awayNames.has(name.toLowerCase())) continue
      awayNames.add(name.toLowerCase())
      linked.push({
        ownerName: name,
        slackUserId: id,
        status: 'away',
        ...(absence.from ? { from: absence.from } : {}),
        ...(absence.until ? { until: absence.until } : {}),
      })
    }
  }

  return {
    entries: [...linked, ...roster],
    isAway: (ownerName, slackUserId) =>
      awayNames.has(clean(ownerName).toLowerCase()) || (Boolean(clean(slackUserId)) && awayIds.has(clean(slackUserId))),
  }
}

/**
 * "Away, so not asked: Shirley (2 tasks, 1 follow-up)." — names as plain,
 * escaped text, never mentions. Their lists are left for them (or for cover
 * from the plan) rather than put in front of them on holiday.
 */
function awayLine(groups: CheckInGroup[]): string {
  if (!groups.length) return ''
  const people = groups.map((group) => {
    const tasks = group.tasks.length + group.hidden
    const parts = [
      tasks ? plural(tasks, 'task') : '',
      group.followUps.length ? plural(group.followUps.length, 'follow-up') : '',
    ].filter(Boolean)
    return `${escapeSlackText(clean(group.ownerName) || 'Someone')}${parts.length ? ` (${parts.join(', ')})` : ''}`
  })
  return `Away, so not asked this week: ${people.join(', ')}. Their lists are on the plan if anything needs cover.`
}

/** The builder's fixed copy for the ownerless-work line (weeklyCheckIn.ts). */
const NOBODY_HAS_TAKEN = 'Nobody has taken:'

const isContext = (block: Block | undefined) => block?.type === 'context' && Array.isArray(block.elements)
const contextHasRoom = (block: Block) => block.elements.length < SLACK_LIMITS.contextElements
const withElement = (block: Block, element: Block): Block => ({ ...block, elements: [...block.elements, element] })

/**
 * Put the "Follow-ups nobody owns" line somewhere it cannot be trimmed away.
 *
 * It is added AFTER `buildWeeklyCheckInBlocks` has fitted the message to
 * MAX_CHECK_IN_BLOCKS, so on a busy week — five people with full lists — there
 * is no block left for it, and a line that needs its own block is silently
 * dropped. That is exactly the wrong line to lose: these are often the warmest
 * leads on file (someone replied, a date was set, nobody is on the record to
 * chase it), and nothing else in the message names them.
 *
 * So it costs a block only when a block is free. In order:
 *   1. a second element in the "Nobody has taken" context block — where the
 *      team already looks for work without an owner, and free;
 *   2. its own context block just above the "Open the plan" button, when the
 *      message is under the ceiling;
 *   3. a second element in the first context line with room — the week line
 *      under the header, which every check-in has.
 *
 * `placed: false` only when none of those exists, so the caller can say so in
 * the run's record instead of claiming follow-ups it never showed.
 */
export function withUnownedFollowUps(blocks: Block[], line: string): { blocks: Block[]; placed: boolean } {
  if (!line) return { blocks, placed: true }
  const element: Block = { type: 'mrkdwn', text: clipSlackText(line, SLACK_LIMITS.sectionText) }

  const nobody = blocks.findIndex(
    (block) => isContext(block) && String(block.elements[0]?.text || '').startsWith(NOBODY_HAS_TAKEN) && contextHasRoom(block),
  )
  if (nobody >= 0) {
    return { blocks: blocks.map((block, index) => (index === nobody ? withElement(block, element) : block)), placed: true }
  }

  if (blocks.length < MAX_CHECK_IN_BLOCKS) {
    const context: Block = { type: 'context', elements: [element] }
    const last = blocks[blocks.length - 1]
    // The trailing "Open the plan" button has no block id; task cards always do.
    if (last?.type === 'actions' && !last.block_id) return { blocks: [...blocks.slice(0, -1), context, last], placed: true }
    return { blocks: [...blocks, context], placed: true }
  }

  const any = blocks.findIndex((block) => isContext(block) && contextHasRoom(block))
  if (any >= 0) {
    return { blocks: blocks.map((block, index) => (index === any ? withElement(block, element) : block)), placed: true }
  }
  return { blocks, placed: false }
}

/**
 * Build the check-in from the records and, unless it is a dry run, claim the
 * week, post it to #marketing-bot and record the run.
 */
export async function runWeeklyCheckIn(input: {
  now?: Date
  dryRun?: boolean
  force?: boolean
  botUserId?: string
}): Promise<CheckInRunResult> {
  const now = input.now || new Date()
  const dryRun = Boolean(input.dryRun)
  const week = utcIsoWeekKey(now)
  const empty = { week, blocks: [] as Block[], text: '', taskCount: 0, followUpCount: 0 }

  let client: Client
  try {
    client = getOutreachClient()
  } catch (error) {
    return { ok: false, posted: false, ...empty, detail: `Sanity is not configured: ${String((error as Error)?.message || error)}` }
  }

  // Her own room only. Never the website-chat channel as a fallback.
  const channel = clean(process.env.SLACK_MARKETING_CHANNEL_ID)
  if (!dryRun && !(clean(process.env.SLACK_BOT_TOKEN) && channel)) {
    const detail = 'Slack is not configured: set SLACK_BOT_TOKEN and SLACK_MARKETING_CHANNEL_ID. Nothing was posted.'
    await recordHeartbeat(client, { week, now, step: { name: 'checkin', ok: false, count: 0, detail } })
    return { ok: false, posted: false, ...empty, detail }
  }

  if (!dryRun) {
    let claim: WeekClaim
    try {
      claim = await claimCheckInWeek(client, week, now, Boolean(input.force))
    } catch (error) {
      const detail = `Could not claim the week: ${String((error as Error)?.message || error)}`
      await recordHeartbeat(client, { week, now, step: { name: 'checkin', ok: false, count: 0, detail } })
      return { ok: false, posted: false, ...empty, detail }
    }
    if (claim.kind === 'skip') {
      // Standing down is the mechanism working, not a failure — and it must not
      // overwrite the record of the run that did post.
      return { ok: true, skipped: true, skipReason: claim.reason, posted: false, ...empty, detail: claim.detail }
    }
  }

  let built: {
    blocks: Block[]
    text: string
    taskCount: number
    followUpCount: number
    people: number
    /** Ownerless follow-ups that could not be shown (0 unless the message had no room anywhere). */
    unshownUnowned: number
    /** People with work on the list who are away, and so were not asked. */
    away: number
  }
  try {
    const data = await client.fetch<{
      tasks?: StoredTask[] | null
      availability?: Partial<TeamMemberAvailability>[] | null
      contacts?: CheckInContact[] | null
    } | null>(CHECK_IN_DATA_QUERY, { planPrefix: WEEKLY_PLAN_PREFIX })

    const availability = tidyAvailability(data?.availability)
    const contacts = (data?.contacts || []).filter((contact) => contact && contact._id)
    const tasks = (data?.tasks || []).filter((task) => task && task._id).map(toCheckInTask)

    // Follow-ups stay on the contact; owners are mapped onto board names so
    // "juhan" on a contact and "Juhan" on a task are one person's list.
    const followUps = listFollowUps(contacts, {
      now,
      resolveOwner: (raw) => resolveOwnerName({ displayName: raw, entries: availability }),
    })
    const followUpsByOwner: Record<string, CheckInFollowUp[]> = {}
    for (const [owner, entries] of Object.entries(groupFollowUpsByOwner(followUps))) {
      if (!owner) continue // nobody's — rendered as its own line below
      followUpsByOwner[owner] = entries.map((entry) => ({
        ...followUpLine(entry, now),
        contactRef: encodeContactRef({
          contactId: entry.contactId,
          organization: entry.organization,
          name: entry.personLabel,
        }),
      }))
    }

    const grouped = groupCheckInTasks(tasks, {
      now,
      followUpsByOwner,
      // The roster is the authority for who to mention; see weeklyCheckIn.ts.
      team: checkInRoster(availability),
    })
    const unowned = grouped.unowned
    // Nobody on holiday is @-mentioned with a list and a Done button. Their
    // group is left out of the asks (and of the notification text) and named
    // once, without a mention, so the room can see whose work is waiting.
    const absences = absencesOn(availability, now.toISOString().slice(0, 10))
    const groups = grouped.groups.filter((group) => !absences.isAway(group.ownerName, group.slackUserId))
    const awayGroups = grouped.groups.filter((group) => absences.isAway(group.ownerName, group.slackUserId))

    const from = weekStart(now)
    const pulse = summarizeOutreach(contacts, {
      from: new Date(from).toISOString(),
      to: new Date(from + 7 * DAY_MS).toISOString(),
      now,
    })

    const base = clean(process.env.MARKETING_PUBLIC_BASE_URL).replace(/\/+$/, '')
    const unownedLine = unownedFollowUpsText(followUps, now)
    const withUnowned = withUnownedFollowUps(
      buildWeeklyCheckInBlocks({
        weekLabel: `${week} · week of ${shortDate(from)}`,
        groups,
        unowned,
        pulse,
        handle: marquetaHandle(input.botUserId),
        // MUST name the view: without it the Studio reopens whatever view was last used.
        studioUrl: /^https?:\/\//i.test(base) ? `${base}/studio/marketing?view=thisWeek` : undefined,
        now,
      }),
      unownedLine,
    )
    // Placed the same way as the ownerless follow-ups: beside "Nobody has
    // taken" where there is one (it is the same question — whose is this?),
    // otherwise wherever a block or a context slot is free.
    const placed = withUnownedFollowUps(withUnowned.blocks, awayLine(awayGroups))

    built = {
      blocks: placed.blocks,
      text: checkInFallbackText(groups),
      taskCount: groups.reduce((sum, group) => sum + group.tasks.length + group.hidden, 0),
      followUpCount: followUps.length,
      people: groups.length,
      unshownUnowned: withUnowned.placed ? 0 : followUps.filter((entry) => !clean(entry.ownerName)).length,
      away: awayGroups.length,
    }
  } catch (error) {
    const detail = `Could not build the check-in: ${String((error as Error)?.message || error)}`
    if (!dryRun) {
      await recordHeartbeat(client, { week, now, step: { name: 'checkin', ok: false, count: 0, detail }, releaseClaim: true })
    }
    return { ok: false, posted: false, ...empty, detail }
  }

  const summary =
    `${plural(built.taskCount, 'task')} and ${plural(built.followUpCount, 'follow-up')} across ${plural(built.people, 'person', 'people')}` +
    // Say so rather than count follow-ups the message never showed.
    (built.unshownUnowned ? ` (${plural(built.unshownUnowned, 'follow-up')} nobody owns did not fit in the message)` : '') +
    (built.away ? `; ${plural(built.away, 'person', 'people')} away, not asked` : '')
  if (dryRun) {
    return {
      ok: true,
      posted: false,
      week,
      blocks: built.blocks,
      text: built.text,
      taskCount: built.taskCount,
      followUpCount: built.followUpCount,
      detail: `Dry run for ${week}: ${summary}. Nothing claimed, posted or recorded.`,
    }
  }

  let posted: { channel: string; ts: string } | null = null
  try {
    posted = await postSlackMessage({
      channel,
      text: built.text,
      ...(built.blocks.length ? { blocks: built.blocks } : {}),
      username: MARQUETA_NAME,
      iconEmoji: MARQUETA_ICON,
      unfurl: false,
    })
  } catch (error) {
    console.error('[checkin] posting threw', error)
    posted = null
  }

  const count = built.taskCount + built.followUpCount
  if (!posted) {
    const detail = `Slack refused the ${week} check-in (${summary}). Check the bot is in the channel.`
    await recordHeartbeat(client, { week, now, step: { name: 'checkin', ok: false, count: 0, detail }, releaseClaim: true })
    return {
      ok: false,
      posted: false,
      week,
      blocks: built.blocks,
      text: built.text,
      taskCount: built.taskCount,
      followUpCount: built.followUpCount,
      detail,
    }
  }

  const detail = `Check-in posted for ${week}: ${summary}.`
  await recordHeartbeat(client, { week, now, step: { name: 'checkin', ok: true, count, detail }, posted: { ts: posted.ts } })
  return {
    ok: true,
    posted: true,
    week,
    blocks: built.blocks,
    text: built.text,
    taskCount: built.taskCount,
    followUpCount: built.followUpCount,
    detail,
    channel: posted.channel,
    ts: posted.ts,
  }
}
