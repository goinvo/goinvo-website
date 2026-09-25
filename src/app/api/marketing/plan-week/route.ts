import type { NextRequest } from 'next/server'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { getMarketingWriteClientFor } from '@/lib/marketing/client'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { FINANCIAL_POSTURE_DOC_ID, getFinancialPosture } from '@/lib/marketing/financialPosture'
import { formatMonths, formatRunwayDate, resolveRunwayPosture, type StoredPosture } from '@/lib/marketing/runway'
import { resolveOwnerName, TEAM_AVAILABILITY_TYPE } from '@/lib/marketing/availability'
import { describePulse, summarizeOutreach, type OutreachPulse, type PulseContact } from '@/lib/marketing/outreachPulse'
import { studioDay } from '@/lib/marketing/viz/outreachViz'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import { resolveWeeklyMinutes, formatMinutes } from '@/lib/marketing/effort'
import { buildWeeklyPlan, isoWeekKey, type WeeklyPlan } from '@/lib/marketing/weeklyPlan'
import {
  followUpParts,
  followUpReservationLabel,
  followUpReservedMinutes,
  listFollowUps,
  type FollowUpContact,
} from '@/lib/marketing/followUps'
import { getOutreachClient } from '@/lib/marketing/outreachClient.server'
import {
  isWeeklyPlanRecord,
  marketingOperationDocumentId,
  marketingOperationFingerprint,
  normalizeMarketingOperationInput,
  WEEKLY_PLAN_SOURCE_PREFIX,
  type MarketingOperation,
} from '@/lib/marketing/operations'

/**
 * Plan the studio's marketing week.
 *
 * The suite already decides WHAT needs doing. This decides HOW MUCH of it fits
 * in the hours the studio actually has, in what order, and records the week so
 * "what did we plan last week" is answerable rather than recomputed.
 *
 * Division of labour, deliberately: the deterministic planner does all the
 * arithmetic and selection; Claude only writes the week's theme and the reason
 * it hangs together. Budget maths is exactly what a model gets quietly wrong.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const OPERATIONS_QUERY = `*[_type == "marketingOperation" && !(_id in path("drafts.**"))]{
  _id, _rev, _type, title, summary, whyNow, nextAction, humanQuestion, status, priority, kind,
  origin, autonomy, ownerName, dueAt, nextCheckAt, blocker, targetView, sourceKey,
  estimatedMinutes, completedAt
}`

/**
 * The contacts This week needs, and the team roster to name their owners.
 *
 * Contacts with a follow-up date (the reservation, and the "Follow-ups due"
 * rows) or anything logged (the week's outreach pulse). Name, email and
 * organisation are read ONLY so `followUpParts` can say who a follow-up is
 * with — the same scrubbed label Slack shows; an email address is only ever a
 * source for a first name and never leaves this route. No phone field and no
 * call note is read at all: the log is projected down to when, who, how and
 * the status it left, which is all the pulse counts.
 *
 * The roster maps a contact's owner ("juhan") onto the board's name
 * ("Juhan"), the same way the digest and the check-in do, so filtering This
 * week to one person finds their follow-ups as well as their tasks.
 */
const OUTREACH_CONTEXT_QUERY = `{
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**"))
    && (defined(followUpAt) || defined(interactions[0]))]{
      _id, name, email, organization, owner, status, warmth, followUpAt,
      "interactions": interactions[]{ at, by, channel, statusAfter, value }
    },
  "team": *[_type == "${TEAM_AVAILABILITY_TYPE}" && !(_id in path("drafts.**"))]{ ownerName, slackUserId }
}`

type OutreachContext = {
  contacts: Array<FollowUpContact & PulseContact>
  team: Array<{ ownerName: string; slackUserId?: string }>
}

/**
 * Read live from the contacts — the single place follow-ups live (see
 * followUps.ts for why they are never mirrored onto the board).
 *
 * Through `getOutreachClient`, pinned to the private dataset with the published
 * perspective, so a contact open in the Studio editor is counted once. A failed
 * read is null, not empty: "could not read the contacts" must not be reported
 * as "nobody is owed a call", and the caller plans without a reservation either
 * way — the week is the product, the reservation is a refinement of it.
 */
async function loadOutreachContext(): Promise<OutreachContext | null> {
  try {
    const found = await getOutreachClient().fetch<Partial<OutreachContext> | null>(OUTREACH_CONTEXT_QUERY)
    return {
      contacts: (found?.contacts || []).filter((contact) => contact && contact._id),
      team: (found?.team || []).filter((member) => member && String(member.ownerName || '').trim()),
    }
  } catch (error) {
    console.error('[plan-week] could not read follow-ups', error)
    return null
  }
}

const DAY_MS = 86_400_000

/**
 * The week the pulse counts, from Monday 00:00 UTC of the plan's week start —
 * the same window the Thursday check-in counts in, so the two sentences agree.
 */
function weekWindow(weekStart: string, now: Date): { from: string; to: string; now: Date } {
  const parsed = Date.parse(`${weekStart}T00:00:00.000Z`)
  const from = Number.isNaN(parsed) ? Math.floor(now.getTime() / DAY_MS) * DAY_MS : parsed
  return { from: new Date(from).toISOString(), to: new Date(from + 7 * DAY_MS).toISOString(), now }
}

/**
 * The week's outreach sentence, with the follow-up count taken from the rows.
 *
 * `summarizeOutreach` counts follow-ups due before the END OF THE ISO WEEK;
 * the "Follow-ups due" rows and the reservation use `listFollowUps`, which
 * looks a rolling seven days ahead. On a Thursday those disagree by the next
 * Monday and Tuesday, and the header read "1 follow-up waiting" above a
 * section of three rows and a three-follow-up reservation. The rows are what
 * the page lays out and what the time was held back for, so the sentence uses
 * their count.
 */
function weekPulse(contacts: PulseContact[], followUps: Array<{ overdue: boolean }>, weekStart: string, now: Date): string {
  const pulse = summarizeOutreach(contacts, weekWindow(weekStart, now))
  pulse.followUpsDue = followUps.length
  pulse.followUpsOverdue = followUps.filter((entry) => entry.overdue).length
  return describePulse(pulse, 'Outreach this week')
}

/** The counts a chart needs, without the per-person breakdown's raw names beyond the board's own. */
function pulseCounts(pulse: OutreachPulse) {
  return {
    touches: pulse.touches,
    people: pulse.people,
    calls: pulse.calls,
    emails: pulse.emails,
    replies: pulse.replies,
    meetings: pulse.meetings,
    opportunities: pulse.opportunities,
    won: pulse.won,
    byPerson: pulse.byPerson,
  }
}

/**
 * The same pulse as numbers, for the week-at-a-glance charts: this week, last
 * week (the delta's named period), and touches per week for the eight weeks up
 * to this one (the sparkline). Same windows as the sentence, so the figure and
 * the words can never disagree.
 */
function outreachStats(contacts: PulseContact[], weekStart: string, now: Date) {
  const window = weekWindow(weekStart, now)
  const from = Date.parse(window.from)
  const span = (start: number) => ({ from: new Date(start).toISOString(), to: new Date(start + 7 * DAY_MS).toISOString(), now })
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = from - (7 - index) * 7 * DAY_MS
    return { weekStart: new Date(start).toISOString().slice(0, 10), touches: summarizeOutreach(contacts, span(start)).touches }
  })
  return {
    thisWeek: pulseCounts(summarizeOutreach(contacts, window)),
    lastWeek: pulseCounts(summarizeOutreach(contacts, span(from - 7 * DAY_MS))),
    weekly,
  }
}

/**
 * The stored runway, trimmed to what the timeline draws: the date, when it was
 * last confirmed, and the signed work that moved it. Private (this route is
 * Studio-writer or API-key only, and says `private` on the response).
 */
function runwayForChart(stored: StoredPosture) {
  return {
    posture: stored.posture,
    setAt: stored.setAt,
    runway: stored.runway
      ? {
          certainUntil: stored.runway.certainUntil,
          confirmedAt: stored.runway.confirmedAt,
          commitments: (stored.runway.commitments || []).map((commitment) => ({
            label: commitment.label,
            signedAt: commitment.signedAt,
            monthsAdded: commitment.monthsAdded,
          })),
        }
      : undefined,
  }
}

/**
 * "Rebuild — 4.5 months of certain runway (to 11 Jan 2027)": the posture this
 * week was planned against, and the fact it came from.
 *
 * From the same read that chose the posture, so the header can never name a
 * different posture from the one the plan used. When a hand-set posture is
 * overriding the date it says so, or the line would look like arithmetic.
 */
function runwayHeadline(stored: StoredPosture, now: Date): string {
  const resolved = resolveRunwayPosture(stored, now)
  const title = getFinancialPosture(resolved.id)?.title || resolved.id
  const byHand = resolved.source === 'manual' ? ' · posture set by hand' : ''
  if (resolved.months === null) return `${title} — no runway date recorded${byHand}`
  return `${title} — ${formatMonths(resolved.months)} of certain runway (to ${formatRunwayDate(resolved.certainUntil)})${byHand}`
}

let privateClient: SanityClient | null = null
function getClient(): SanityClient | null {
  if (!projectId || !writeToken) return null
  if (!privateClient) {
    privateClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return privateClient
}

async function authorize(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    return null
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
}

type WeekTheme = { theme: string; rationale: string }

/**
 * Ask Claude for the week's headline and why it hangs together.
 *
 * Deliberately narrow: it is handed the plan that has ALREADY been decided and
 * asked only to name it. It cannot add, drop, or reorder work, so a bad
 * generation costs a clumsy sentence rather than a wrong week.
 */
async function describeWeek(
  client: SanityClient,
  plan: WeeklyPlan,
  posture: string,
): Promise<WeekTheme | null> {
  if (!isAnthropicConfigured()) return null
  const lines = [
    ...plan.decisions.map((entry) => `DECISION (${entry.minutes}m): ${entry.operation.title}`),
    ...plan.items.map((entry) => `WORK (${entry.minutes}m): ${entry.operation.title}`),
  ].slice(0, 25)
  if (lines.length === 0) return null

  try {
    const model = await resolveMarketingModel(client)
    const { text } = await generateClaudeText({
      model,
      maxTokens: 600,
      system:
        'You name a small design studio\'s marketing week. You are given work that has ' +
        'already been chosen and budgeted. Do NOT add, remove, reorder, or re-estimate ' +
        'anything. Reply with JSON only: {"theme": string, "rationale": string}. The theme ' +
        'is at most six words and names what this week is actually about. The rationale is ' +
        'one or two plain sentences saying why this is the right use of the hours, written ' +
        'to the person doing it. No marketing jargon, no hype.',
      user: [
        `Financial posture: ${posture}.`,
        `Budget: ${formatMinutes(plan.budgetMinutes)}. Planned: ${formatMinutes(plan.plannedMinutes)}.`,
        ...(plan.reserved ? [`Held back: ${plan.reserved.label}.`] : []),
        `Deferred to a later week: ${plan.deferred.length} items.`,
        '',
        'This week:',
        ...lines,
      ].join('\n'),
    })
    const parsed = parseJsonObject<WeekTheme>(text)
    if (!parsed?.theme) return null
    return { theme: String(parsed.theme).slice(0, 120), rationale: String(parsed.rationale || '').slice(0, 600) }
  } catch {
    // The plan is the product; the sentence is decoration. Never fail the week
    // because the model was slow or the key was missing.
    return null
  }
}

export async function GET(request: NextRequest) {
  return handle(request, true)
}

export async function POST(request: NextRequest) {
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  return handle(request, dryRun)
}

async function handle(request: NextRequest, dryRun: boolean) {
  const denied = await authorize(request)
  if (denied) return denied

  const client = getClient()
  if (!client) {
    return privateMarketingJson(
      { error: 'Sanity is not configured for marketing operations.' },
      { status: 503 },
    )
  }

  // Safe: the 503 guard above already proved the project id and token exist.
  const settingsClient = getMarketingWriteClientFor('marketingSettings')
  const [operations, postureRaw, settings, outreach] = await Promise.all([
    client.fetch<MarketingOperation[]>(OPERATIONS_QUERY).catch(() => [] as MarketingOperation[]),
    // Both the hand-set bin AND the runway date, because the bin alone does not
    // decay: this record said "survival" from July onwards and would have said
    // it in 2027. resolveRunwayPosture picks whichever is the newer fact.
    // undefined when the read FAILED, null when there is no record: the
    // header must not say "no runway date recorded" about a read that broke.
    client
      .fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`, {
        id: FINANCIAL_POSTURE_DOC_ID,
      })
      .catch(() => undefined),
    // marketingSettings is routed, NOT pinned to the private dataset like the
    // operations above. Reading it from the wrong side is silent: the Studio
    // writes the hours where the router says, this read looked somewhere else,
    // and the planner quietly used the default 4h instead of what was set.
    settingsClient
      .fetch<{ weeklyMarketingHours?: number } | null>(
        `*[_id == "marketingSettings"][0]{ weeklyMarketingHours }`,
      )
      .catch(() => null),
    loadOutreachContext(),
  ])

  // The runway date wins when it is the newer fact, so the plan tightens on its
  // own as the money runs down instead of waiting for somebody to remember to
  // change a setting.
  const posture = resolveRunwayPosture(postureRaw || {}).id
  const budgetMinutes = resolveWeeklyMinutes(settings?.weeklyMarketingHours)
  const now = new Date()

  // The plan document itself is an operation; it must never plan itself.
  const planning = operations.filter((item) => !isWeeklyPlanRecord(item))
  // Follow-ups are owed to people who already answered, and they are not on
  // the board — so without this the planner filled every hour with board work
  // and the warmest calls of the week had no time at all. Held back before the
  // fill (15m each, capped at 40% of the week so a backlog cannot swallow it).
  const followUps = outreach
    ? listFollowUps(outreach.contacts, {
        now,
        resolveOwner: (raw) => resolveOwnerName({ displayName: raw, entries: outreach.team }),
      })
    : []
  const followUpsDue = followUps.length
  const reservedMinutes = followUpReservedMinutes(followUpsDue, budgetMinutes)
  const plan = buildWeeklyPlan({
    operations: planning,
    budgetMinutes,
    posture,
    now,
    ...(reservedMinutes > 0
      ? { reservedMinutes, reservedLabel: followUpReservationLabel(followUpsDue, reservedMinutes) }
      : {}),
  })
  const theme = await describeWeek(client, plan, posture)

  const weekKey = isoWeekKey(now)
  const sourceKey = `${WEEKLY_PLAN_SOURCE_PREFIX}${weekKey}`
  const planId = marketingOperationDocumentId(sourceKey)

  const response = {
    week: weekKey,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    posture,
    budgetMinutes,
    plannedMinutes: plan.plannedMinutes,
    overCommitted: plan.overCommitted,
    // Counted IN plannedMinutes (see WeeklyPlan), reported here so a reader can
    // see what the held-back time is for. followUpsDue is null when the
    // contacts could not be read — unknown, not zero.
    reserved: plan.reserved,
    followUpsDue: outreach ? followUpsDue : null,
    // Who each follow-up is with, and when — the rows This week shows above the
    // call sheet, worded exactly as Slack words them. Scrubbed of contact
    // details (followUpParts); empty, not absent, when the contacts could not
    // be read, with `followUpsDue: null` saying which it was.
    followUps: followUps.map((entry) => ({ ...followUpParts(entry, now), dueDay: studioDay(entry.dueAt) })),
    // "Outreach this week: 3 touches (2 people) · …" — the check-in's sentence
    // over the same week. Null when the contacts could not be read: a failed
    // read is not "no outreach logged yet".
    pulse: outreach ? weekPulse(outreach.contacts, followUps, plan.weekStart, now) : null,
    runway: postureRaw === undefined ? null : runwayHeadline(postureRaw || {}, now),
    // The same two facts as numbers, for the week-at-a-glance charts. Null for
    // the same reasons as the sentences above (a failed read is not "none").
    outreachStats: outreach ? outreachStats(outreach.contacts, plan.weekStart, now) : null,
    runwayStored: postureRaw === undefined ? null : runwayForChart(postureRaw || {}),
    theme: theme?.theme || null,
    rationale: theme?.rationale || null,
    // Status, blocker and owner on every row, so This week can use the same
    // status words as the Slack card and the desk, say what is in the way of
    // stuck work, and filter to one person.
    items: plan.items.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      kind: entry.operation.kind,
      owner: entry.operation.ownerName || null,
      status: entry.operation.status,
      blocker: entry.operation.blocker || null,
      minutes: entry.minutes,
      estimateSource: entry.estimateSource,
      overdue: entry.overdue,
    })),
    decisions: plan.decisions.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      kind: entry.operation.kind,
      question: entry.operation.humanQuestion || null,
      owner: entry.operation.ownerName || null,
      status: entry.operation.status,
      blocker: entry.operation.blocker || null,
      minutes: entry.minutes,
      // So an answer given on This week goes through the operations route's
      // revision check: a decision answered in Slack since is refused, not
      // overwritten.
      rev: entry.operation._rev || null,
    })),
    deferred: plan.deferred.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      kind: entry.operation.kind,
      owner: entry.operation.ownerName || null,
      status: entry.operation.status,
      blocker: entry.operation.blocker || null,
      minutes: entry.minutes,
      reason: entry.reason,
      // "3 tasks done this week" counts by this; done work from any other
      // week is history, not this week's news.
      completedAt: entry.operation.completedAt || null,
    })),
    planDocumentId: planId,
    dryRun,
  }

  if (dryRun) return privateMarketingJson(response)

  // Record the week. createIfNotExists then patch, keyed by the ISO week, so
  // re-planning on Thursday updates Monday's plan instead of creating a second
  // one — and so a double-click cannot fork the week.
  const summaryLines = [
    theme?.rationale || 'Planned from the operations board against the studio\'s weekly hours.',
    '',
    `Budget ${formatMinutes(budgetMinutes)} · planned ${formatMinutes(plan.plannedMinutes)} · ` +
      `${plan.items.length} tasks, ${plan.decisions.length} decisions, ${plan.deferred.length} deferred.` +
      (plan.reserved ? ` ${plan.reserved.label}.` : ''),
  ].join('\n')

  const document = normalizeMarketingOperationInput({
    sourceKey,
    sourceFingerprint: marketingOperationFingerprint(
      `${sourceKey}:${plan.items.map((entry) => entry.operation._id).join(',')}`,
    ),
    title: theme?.theme ? `Week of ${plan.weekStart} — ${theme.theme}` : `Week of ${plan.weekStart}`,
    summary: summaryLines,
    whyNow: `The week's plan, fitted to ${formatMinutes(budgetMinutes)} of marketing time.`,
    nextAction: plan.items[0]
      ? `Start with: ${plan.items[0].operation.title}`
      : 'No work fitted this week — check the deferred list for why.',
    status: 'working',
    priority: 'normal',
    kind: 'update',
    origin: 'manual',
    autonomy: 'safeInternal',
    targetView: 'dashboard',
    dueAt: new Date(`${plan.weekEnd}T12:00:00`).toISOString(),
  })

  try {
    await client.createIfNotExists({ _type: 'marketingOperation', ...document, _id: planId })
    await client
      .patch(planId)
      .set({
        title: document.title,
        summary: document.summary,
        nextAction: document.nextAction,
        sourceFingerprint: document.sourceFingerprint,
        lastEvaluatedAt: new Date().toISOString(),
      })
      .commit()
  } catch (error) {
    return privateMarketingJson(
      {
        ...response,
        error: 'The plan was computed but could not be saved.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }

  return privateMarketingJson(response)
}
