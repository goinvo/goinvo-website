import type { NextRequest } from 'next/server'
import { authorizeCron, cronDeniedStatus } from '@/lib/marketing/cronAuth'
import { isOutreachClientConfigured } from '@/lib/marketing/outreachClient.server'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { runWeeklyCheckIn } from '@/lib/marketing/weeklyCheckIn.server'

/**
 * The Thursday check-in: ask each person how their week's marketing is going.
 *
 * The Monday tick says what the week is; nothing ever asked, later in the week,
 * whether any of it happened. This is the scheduled half of that question. The
 * route is deliberately thin — claiming the week, posting once, and recording
 * the run all live in `weeklyCheckIn.server.ts`, where they are tested — so the
 * only decisions made here are who may run it and how the answer is reported.
 *
 *   GET  /api/marketing/checkin          (Vercel cron, Thursdays 14:00 UTC ≈ 10am in Boston)
 *   POST /api/marketing/checkin?dryRun=1 (the exact message, touching nothing)
 *   POST /api/marketing/checkin?force=1  (post again, or take over a crashed run's stale claim)
 *
 * Cron auth ONLY (`CRON_SECRET`, or `MARKETING_API_KEY` for a person running it
 * by hand) — the same gate as the tick, from the same function, because this
 * posts to a channel of colleagues and must not be reachable by anything that
 * merely has a Studio session open.
 *
 * GET runs for real, unlike plan-week's GET. Vercel crons issue GET, and a cron
 * pointed at a read-only GET is exactly how the tick once "ran" every week and
 * persisted nothing. A dry run has to be asked for by name.
 *
 * `force` is honoured on either method. It cannot cause a double post of a week
 * that is being posted right now: a fresh claim is never overridden, even with
 * force (see `claimWeek`). What it does allow is posting a week a second time
 * on purpose, which is what someone typing `force=1` is asking for.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}

/** Flags are opt-in by an exact `1`: `?dryRun=false` must not become a dry run, nor `?force=0` a force. */
const flag = (params: URLSearchParams, name: string) => params.get(name) === '1'

async function run(request: NextRequest) {
  const denied = authorizeCron(request, 'the check-in')
  if (denied) return privateMarketingJson({ error: denied }, { status: cronDeniedStatus(denied) })

  // Checked here as well as inside the run, because without Sanity there is
  // nowhere to record the failure — the run could only report it, and a cron's
  // response body is read by nobody. A 503 at least shows in the deploy's logs.
  if (!isOutreachClientConfigured()) {
    return privateMarketingJson({ error: 'Sanity is not configured, so the check-in cannot run.' }, { status: 503 })
  }

  const params = new URL(request.url).searchParams
  const dryRun = flag(params, 'dryRun')
  const force = flag(params, 'force')

  // No Slack lookup of her own id: the check-in's hints are phrases people
  // type ("Marqueta, my calls"), which reach her in any room she is in — a
  // mention of her would only add a round trip that can fail.
  const result = await runWeeklyCheckIn({ now: new Date(), dryRun, force })

  // A stand-down (already posted, another run holds the claim) is the claim
  // doing its job: ok, 200. Anything that should have posted and did not is a
  // failure the cron's logs should show — and the run has already written it
  // on the check-in's heartbeat, which is what the watchdog reads.
  return privateMarketingJson({ ...result, dryRun, force }, { status: result.ok ? 200 : 502 })
}
