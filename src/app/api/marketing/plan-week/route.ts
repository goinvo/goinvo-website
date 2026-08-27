import type { NextRequest } from 'next/server'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { getMarketingWriteClientFor } from '@/lib/marketing/client'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { FINANCIAL_POSTURE_DOC_ID } from '@/lib/marketing/financialPosture'
import { resolveRunwayPosture, type StoredPosture } from '@/lib/marketing/runway'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import { resolveWeeklyMinutes, formatMinutes } from '@/lib/marketing/effort'
import { buildWeeklyPlan, isoWeekKey, type WeeklyPlan } from '@/lib/marketing/weeklyPlan'
import {
  marketingOperationDocumentId,
  marketingOperationFingerprint,
  normalizeMarketingOperationInput,
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

const PLAN_SOURCE_PREFIX = 'weekly-plan/'

const OPERATIONS_QUERY = `*[_type == "marketingOperation" && !(_id in path("drafts.**"))]{
  _id, _type, title, summary, whyNow, nextAction, humanQuestion, status, priority, kind,
  origin, autonomy, ownerName, dueAt, nextCheckAt, blocker, targetView, sourceKey,
  estimatedMinutes
}`

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
  const [operations, postureRaw, settings] = await Promise.all([
    client.fetch<MarketingOperation[]>(OPERATIONS_QUERY).catch(() => [] as MarketingOperation[]),
    // Both the hand-set bin AND the runway date, because the bin alone does not
    // decay: this record said "survival" from July onwards and would have said
    // it in 2027. resolveRunwayPosture picks whichever is the newer fact.
    client
      .fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`, {
        id: FINANCIAL_POSTURE_DOC_ID,
      })
      .catch(() => null),
    // marketingSettings is routed, NOT pinned to the private dataset like the
    // operations above. Reading it from the wrong side is silent: the Studio
    // writes the hours where the router says, this read looked somewhere else,
    // and the planner quietly used the default 4h instead of what was set.
    settingsClient
      .fetch<{ weeklyMarketingHours?: number } | null>(
        `*[_id == "marketingSettings"][0]{ weeklyMarketingHours }`,
      )
      .catch(() => null),
  ])

  // The runway date wins when it is the newer fact, so the plan tightens on its
  // own as the money runs down instead of waiting for somebody to remember to
  // change a setting.
  const posture = resolveRunwayPosture(postureRaw || {}).id
  const budgetMinutes = resolveWeeklyMinutes(settings?.weeklyMarketingHours)
  const now = new Date()

  // The plan document itself is an operation; it must never plan itself.
  const planning = operations.filter((item) => !item.sourceKey?.startsWith(PLAN_SOURCE_PREFIX))
  const plan = buildWeeklyPlan({ operations: planning, budgetMinutes, posture, now })
  const theme = await describeWeek(client, plan, posture)

  const weekKey = isoWeekKey(now)
  const sourceKey = `${PLAN_SOURCE_PREFIX}${weekKey}`
  const planId = marketingOperationDocumentId(sourceKey)

  const response = {
    week: weekKey,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    posture,
    budgetMinutes,
    plannedMinutes: plan.plannedMinutes,
    overCommitted: plan.overCommitted,
    theme: theme?.theme || null,
    rationale: theme?.rationale || null,
    items: plan.items.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      kind: entry.operation.kind,
      owner: entry.operation.ownerName || null,
      minutes: entry.minutes,
      estimateSource: entry.estimateSource,
      overdue: entry.overdue,
    })),
    decisions: plan.decisions.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      question: entry.operation.humanQuestion || null,
      owner: entry.operation.ownerName || null,
      minutes: entry.minutes,
    })),
    deferred: plan.deferred.map((entry) => ({
      id: entry.operation._id,
      title: entry.operation.title,
      minutes: entry.minutes,
      reason: entry.reason,
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
      `${plan.items.length} tasks, ${plan.decisions.length} decisions, ${plan.deferred.length} deferred.`,
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
