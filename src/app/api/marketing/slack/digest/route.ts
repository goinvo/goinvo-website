import type { NextRequest } from 'next/server'
import { createClient } from '@sanity/client'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { postSlackMessage } from '@/lib/chat/slack'
import { buildOutreachCallSheet } from '@/lib/marketing/callSheet'
import {
  buildIdeaReviewBlocks,
  buildIdentityPromptBlocks,
  buildRunwayBlocks,
  buildTaskAttachment,
  buildWeeklyDigestBlocks,
  type DigestTask,
} from '@/lib/marketing/slackDelegation'
import { readRunway } from '@/lib/marketing/runway.server'
import { ideasNeedingReview } from '@/lib/marketing/ideaCapture.server'
import { findReassignments, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { estimateOperationMinutes } from '@/lib/marketing/effort'

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
 * `?dryRun=1` returns the exact blocks it WOULD send. Getting the preview right
 * before anything reaches a channel of colleagues is the point — a bot that
 * spams a team once is a bot that gets muted forever.
 *
 *   GET|POST /api/marketing/slack/digest?dryRun=1
 *   POST     /api/marketing/slack/digest
 */

/**
 * The marketing digest gets its own channel.
 *
 * SLACK_CHANNEL_ID is the website-chat channel: a weekly plan landing in the
 * middle of live visitor conversations would bury both. Falls back to the
 * default only if no marketing channel is configured.
 */
/** The assistant's name in the Studio, and now in Slack. */
const MARQUETA_NAME = 'Marqueta'
const MARQUETA_ICON = ':chart_with_upwards_trend:'

const marketingChannelId = () =>
  process.env.SLACK_MARKETING_CHANNEL_ID || process.env.SLACK_CHANNEL_ID || ''

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_QUERY = `{
  "operations": *[_type == "marketingOperation" && status in ["queued", "working", "needsHuman"]]
    | order(coalesce(dueAt, "9999") asc)[0...40]{
      _id, title, ownerName, suggestedOwner, ownerSlackUserId, estimatedMinutes, whyNow, kind, status,
      priority, sourceKey
    },
  "availability": *[_type == "marketingTeamAvailability"]{
    ownerName, slackUserId, status, from, until, weeklyHours, note
  },
  "research": *[_type == "marketingOrgResearch" && verification.status == "verified"]{
    organization, recentSignal, reachableAbout, suggestedOfferKey, context,
    verification{ status, evidence[]{ url, quote, textFragmentUrl } }
  },
  "contacts": *[_type == "marketingContact" && defined(organization)]{
    _id, name, role, organization, email, status
  },
  "offers": *[_type == "marketingOffer" && status == "active"]{ key, title, oneLiner },
  "weeklyHours": *[_id == "marketingSettings"][0].weeklyMarketingHours
}`

function isoWeekBounds(now: Date): { start: string; end: string } {
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
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

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

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

  if (!projectId || !writeToken) {
    return privateMarketingJson({ error: 'Sanity is not configured.' }, { status: 503 })
  }
  if (!dryRun && !(process.env.SLACK_BOT_TOKEN && marketingChannelId())) {
    return privateMarketingJson(
      {
        error: 'Slack is not configured. Set SLACK_BOT_TOKEN and SLACK_MARKETING_CHANNEL_ID.',
        hint: 'Add ?dryRun=1 to preview the message without posting.',
      },
      { status: 503 },
    )
  }

  const client = createClient({
    projectId,
    dataset: OUTREACH_DATASET,
    apiVersion,
    token: writeToken,
    useCdn: false,
    perspective: 'published',
  })

  const data = await client.fetch<{
    operations: (DigestTask & {
      estimatedMinutes?: number
      ownerSlackUserId?: string
      sourceKey?: string
      suggestedOwner?: string
      kind?: string
      priority?: string
      status?: string
    })[]
    availability: TeamMemberAvailability[]
    research: never[]
    contacts: never[]
    offers: never[]
    weeklyHours: number | null
  }>(DATA_QUERY)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const { start, end } = isoWeekBounds(now)

  const tasks: DigestTask[] = (data.operations || [])
    .filter((operation) => !String(operation.sourceKey || '').startsWith(PLAN_SOURCE_PREFIX))
    .map((operation) => ({
    _id: operation._id,
    title: operation.title,
    ownerName: operation.ownerName,
    slackUserId:
      operation.ownerSlackUserId ||
      (data.availability || []).find(
        (entry) =>
          String(entry.ownerName || '').toLowerCase() === String(operation.ownerName || '').toLowerCase(),
      )?.slackUserId,
    // Most operations carry no explicit estimate, so the shared effort model
    // infers one from kind and priority. Summing the raw field reported "0m
    // planned of 4h", which reads as though there is nothing to do.
    minutes: estimateOperationMinutes(operation).minutes,
    whyNow: operation.whyNow,
    kind: operation.kind,
    priority: operation.priority,
    status: operation.status,
    suggestedOwner: operation.suggestedOwner,
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

  // Anyone away this week has their work surfaced for reassignment rather than
  // silently left on their plate.
  const team = Array.from(
    new Set(tasks.map((task) => task.ownerName).filter((name): name is string => Boolean(name))),
  )
  const awayNotices = findReassignments({
    tasks: tasks.map((task) => ({ _id: task._id, title: task.title, ownerName: task.ownerName })),
    entries: data.availability || [],
    team,
    dateKey: today,
  }).map((entry) => ({
    awayOwner: entry.awayOwner,
    taskTitle: entry.task.title,
    candidates: entry.candidates,
  }))

  const callSheet = buildOutreachCallSheet({
    research: data.research || [],
    contacts: data.contacts || [],
    offers: data.offers || [],
    limit: 3,
  })

  const blocks = buildWeeklyDigestBlocks({
    theme: 'This week in marketing',
    weekStart: start,
    weekEnd: end,
    plannedMinutes: tasks.reduce((sum, task) => sum + (task.minutes || 0), 0),
    // Read the real budget rather than assuming 4h: it is 8h now, split between
    // calls and content, and hardcoding it made every week look over-committed.
    budgetMinutes: (data.weeklyHours || 4) * 60,
    // Tasks render as coloured attachment cards instead of plain blocks.
    tasks: [],
    callSheet,
    awayNotices,
    // MUST name the view. Without ?view= the Studio restores whatever the
    // person last had open (localStorage), so "Open the plan" landed on the
    // Shop for anyone who had been there last — a link that goes somewhere
    // plausible but wrong is worse than one that is obviously broken.
    studioUrl: process.env.MARKETING_PUBLIC_BASE_URL
      ? `${process.env.MARKETING_PUBLIC_BASE_URL}/studio/marketing?view=thisWeek`
      : undefined,
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
      text: { type: 'mrkdwn', text: '*Renewals*' + '\n' + domainNotes.join('\n') },
    })
  }

  // Money, but only when it needs asking about. The runway is the input the
  // whole strategy hangs off and the one thing the suite never checked - it
  // held a bin picked in July. This asks before the number stops being true,
  // and stays silent otherwise.
  try {
    const runway = await readRunway(now)
    blocks.push(
      ...buildRunwayBlocks({
        summary: runway.summary,
        checkIn: runway.checkIn,
        disagreement: runway.resolved.disagreement,
      }),
    )
  } catch (error) {
    // A digest without the runway line is still a useful digest. Failing the
    // whole post because one private read failed would be the worse trade.
    console.error('[digest] runway read failed', error)
  }

  // Ideas caught in the channel that nobody has judged. The thread reply asks
  // once, and a thread is easy to miss.
  try {
    const pending = await ideasNeedingReview(5)
    blocks.push(
      ...buildIdeaReviewBlocks(
        pending,
        process.env.MARKETING_PUBLIC_BASE_URL
          ? // MUST be a real view id. There is no "ideas" view - marketingIdea
            // only renders inside SEO - and an unknown ?view= makes the Studio
            // fall back to whatever the person last had open, which is how
            // "open the plan" once landed on the Shop.
            `${process.env.MARKETING_PUBLIC_BASE_URL}/studio/marketing?view=thisWeek`
          : undefined,
      ),
    )
  } catch (error) {
    console.error('[digest] idea review read failed', error)
  }

  // Only while somebody is still unmapped: the prompt removes itself once
  // everyone who wants to be linked has been.
  const unmappedOwners = Array.from(
    new Set(tasks.filter((task) => task.ownerName && !task.slackUserId).map((task) => task.ownerName!)),
  )
  blocks.push(...buildIdentityPromptBlocks(unmappedOwners))

  if (dryRun) {
    return privateMarketingJson({
      dryRun: true,
      wouldPost: true,
      slackConfigured: Boolean(process.env.SLACK_BOT_TOKEN && marketingChannelId()),
      channel: marketingChannelId(),
      taskCount: tasks.length,
      awayCount: awayNotices.length,
      callSheetCount: callSheet.length,
      unmappedOwners,
      blocks,
      attachments: tasks.slice(0, 8).map((task) => buildTaskAttachment(task)),
    })
  }

  const channel = marketingChannelId()
  const attachments = tasks.slice(0, 8).map((task) => buildTaskAttachment(task))

  const result = await postSlackMessage({
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
    text: `This week in marketing — ${tasks.length} task(s)`,
    blocks,
  })

  return privateMarketingJson({
    posted: Boolean(result),
    channel,
    // postSlackMessage returns null when Slack refuses, most often because the
    // bot has not been invited to the channel. Say so rather than reporting a
    // silent success.
    hint: result ? undefined : 'Slack returned no result — is the bot invited to that channel?',
    taskCount: tasks.length,
    awayCount: awayNotices.length,
    callSheetCount: callSheet.length,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
