import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { isoWeekKey } from '@/lib/marketing/weeklyPlan'
import {
  HEARTBEAT_DOC_ID,
  HEARTBEAT_DOC_TYPE,
  tickDidSomething,
  type HeartbeatStep,
} from '@/lib/marketing/heartbeat'

/**
 * The weekly tick: plan the week, then tell the team about it.
 *
 * This exists because nothing was scheduled. The planner, the digest, the
 * runway check-in and the unjudged-idea nudge were all built and none of them
 * had ever fired on their own — the whole suite was a thing you had to remember
 * to use, during exactly the weeks nobody has time to remember.
 *
 * Two deliberate design choices, both of them about not lying:
 *
 * 1. ORDER WITH A GATE. Plan first, then check the plan was really recorded,
 *    and only then post. Firing the digest regardless would let Slack announce
 *    a week the Studio never stored — two sources of truth, on the one morning
 *    everybody reads it. If the plan did not persist, the digest still goes out
 *    but says so plainly rather than pretending.
 *
 * 2. EVIDENCE, NOT STATUS. Every step records what it actually did, and the
 *    heartbeat notes whether the run changed anything at all. A cron that 200s
 *    while doing nothing is indistinguishable from a working one, which is the
 *    failure mode this repo keeps meeting.
 *
 *   GET  /api/marketing/tick        (Vercel cron sends Authorization: Bearer CRON_SECRET)
 *   POST /api/marketing/tick?dryRun=1
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron-only, and deliberately NOT the Studio session auth the rest of the
 * marketing API uses: this writes the week and posts to a channel of
 * colleagues, so it must not be reachable by anything that merely has a browser
 * session open.
 */
function authorizeCron(request: NextRequest): string | null {
  const secret = process.env.CRON_SECRET || process.env.MARKETING_API_KEY || ''
  if (!secret) return 'CRON_SECRET is not configured, so the tick cannot authenticate.'
  const header = request.headers.get('authorization') || ''
  if (header !== `Bearer ${secret}`) return 'Unauthorized.'
  return null
}

/**
 * Where to call the routes this orchestrates: ALWAYS this deployment.
 *
 * Deliberately not MARKETING_PUBLIC_BASE_URL. That variable is the studio's
 * public address, used to build links people click, and it is set to
 * https://www.goinvo.com in every environment including a laptop - so reading
 * it here made a local dry run reach out and drive PRODUCTION. It only showed
 * up as a 401 because the local key does not match the deployed one; with
 * matching keys a test run would have planned the real week and posted to the
 * team's Slack. An orchestrator must talk to its own deployment.
 */
function baseUrl(request: NextRequest): string {
  return new URL(request.url).origin
}

async function callRoute(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, init)
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: response.ok, status: response.status, body }
}

export async function GET(request: NextRequest) {
  return run(request, new URL(request.url).searchParams.get('dryRun') === '1')
}

export async function POST(request: NextRequest) {
  return run(request, new URL(request.url).searchParams.get('dryRun') === '1')
}

async function run(request: NextRequest, dryRun: boolean) {
  const denied = authorizeCron(request)
  if (denied) {
    return NextResponse.json({ error: denied }, { status: denied === 'Unauthorized.' ? 401 : 503 })
  }
  if (!projectId || !writeToken) {
    return privateMarketingJson({ error: 'Sanity is not configured.' }, { status: 503 })
  }

  const key = process.env.MARKETING_API_KEY || ''
  if (!key) {
    return privateMarketingJson(
      { error: 'MARKETING_API_KEY is not set, so the tick cannot call the routes it orchestrates.' },
      { status: 503 },
    )
  }

  const origin = baseUrl(request)
  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const week = isoWeekKey(new Date())
  const steps: HeartbeatStep[] = []

  // 1. Plan the week. POST, because GET on plan-week is hardcoded read-only for
  //    the Studio's benefit — a cron pointed straight at it would compute the
  //    week, return 200, and persist nothing.
  let planned = false
  try {
    const planUrl = `${origin}/api/marketing/plan-week${dryRun ? '?dryRun=1' : ''}`
    const result = await callRoute(planUrl, { method: 'POST', headers: auth })
    const plan = (result.body.plan || result.body) as Record<string, unknown>
    const items = Array.isArray(plan.items) ? plan.items.length : 0
    planned = result.ok
    steps.push({
      name: 'plan',
      ok: result.ok,
      count: items,
      detail: result.ok
        ? `${items} item(s) planned for ${week}.`
        : `plan-week returned ${result.status}: ${String(result.body.error || 'no detail')}`,
    })
  } catch (error) {
    steps.push({ name: 'plan', ok: false, detail: `plan-week threw: ${String(error)}` })
  }

  // 2. The gate: was the week actually recorded? Asked of the dataset rather
  //    than inferred from a 200, because "the call succeeded" and "the week
  //    exists" are different claims and only the second one matters.
  let planRecorded = false
  if (!dryRun) {
    try {
      const client = createClient({
        projectId,
        dataset: OUTREACH_DATASET,
        apiVersion,
        token: writeToken,
        useCdn: false,
      })
      planRecorded = Boolean(
        await client.fetch<string | null>(`*[_type == "marketingOperation" && sourceKey == $key][0]._id`, {
          key: `weekly-plan/${week}`,
        }),
      )
    } catch {
      planRecorded = false
    }
  }

  // 3. Tell the team. Posted even when the plan did not persist — silence would
  //    hide the breakage — but the digest is told to say so.
  try {
    const digestUrl = `${origin}/api/marketing/slack/digest${dryRun ? '?dryRun=1' : ''}`
    const result = await callRoute(digestUrl, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ planRecorded: dryRun ? true : planRecorded, week }),
    })
    const posted = Boolean(result.body.posted) || Boolean(result.body.dryRun)
    steps.push({
      name: 'digest',
      ok: result.ok && posted,
      count: Number(result.body.taskCount || 0),
      detail:
        result.ok && posted
          ? `digest ${dryRun ? 'previewed' : 'posted'} with ${Number(result.body.taskCount || 0)} task(s).`
          : `digest returned ${result.status}: ${String(result.body.error || 'not posted')}`,
    })
  } catch (error) {
    steps.push({ name: 'digest', ok: false, detail: `digest threw: ${String(error)}` })
  }

  const ok = steps.every((step) => step.ok) && (dryRun || planRecorded)
  const changedSomething = tickDidSomething(steps)

  if (!dryRun) {
    await recordHeartbeat({
      week,
      steps,
      ok,
      planRecorded,
      error: ok ? undefined : steps.find((step) => !step.ok)?.detail || 'the week was not recorded',
    })
  }

  return privateMarketingJson({
    ok,
    dryRun,
    week,
    planned,
    planRecorded,
    changedSomething,
    steps,
  })
}

/**
 * Write down what happened, whatever happened.
 *
 * Recorded even on failure — especially on failure. The record is the only
 * thing that can tell the difference between "the schedule is fine" and
 * "nobody has looked in a month".
 */
async function recordHeartbeat(input: {
  week: string
  steps: HeartbeatStep[]
  ok: boolean
  planRecorded: boolean
  error?: string
}) {
  try {
    const client = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      apiVersion,
      token: writeToken,
      useCdn: false,
    })
    const now = new Date().toISOString()
    await client.createIfNotExists({ _id: HEARTBEAT_DOC_ID, _type: HEARTBEAT_DOC_TYPE })
    await client
      .patch(HEARTBEAT_DOC_ID)
      .set({
        week: input.week,
        ranAt: now,
        steps: input.steps.map((step, index) => ({ _key: `${step.name}-${index}`, ...step })),
        ...(input.ok ? { lastHealthyAt: now, error: null } : { error: input.error }),
      })
      .commit()
  } catch (error) {
    // Never fail the tick because the bookkeeping failed — the plan and the
    // digest are the product.
    console.error('[tick] could not record heartbeat', error)
  }
}
