/**
 * Proof that the weekly tick actually fired.
 *
 * The suite had a planner, a digest, a runway check-in, an identity prompt and
 * an unjudged-idea nudge — and none of it had ever run on its own, because
 * nothing was scheduled. Two `marketingOperation` records with a
 * `weekly-plan/` sourceKey exist in the whole dataset, and both came from a
 * human calling the route by hand. A plan that is "weekly" only when somebody
 * remembers to open the Studio during a fully-booked delivery week is not
 * weekly.
 *
 * Scheduling it is the easy half. The hard half is knowing it is still
 * happening: a cron that 200s while doing nothing is indistinguishable from a
 * cron that works, and that is exactly the failure this codebase has been bitten
 * by before — a regularizer pinned at zero, a rebalance that softmax made a
 * no-op. So every tick records what it DID, and the absence of a recent record
 * is itself reportable.
 *
 * Pure and dependency-free: the staleness rules are arithmetic and testable
 * without Sanity or Slack.
 */

export const HEARTBEAT_DOC_ID = 'marketingHeartbeat'
export const HEARTBEAT_DOC_TYPE = 'marketingHeartbeat'

/**
 * The Thursday check-in keeps its own record, beside the tick's rather than
 * inside it.
 *
 * Two schedules, two failure modes: a Monday tick that ran fine says nothing
 * about whether Thursday's check-in did, and one shared document would let the
 * second job's success overwrite the first job's failure. Same type, same
 * shape, a different id — so `heartbeatHealth` reads either one.
 */
export const CHECKIN_HEARTBEAT_DOC_ID = 'marketingHeartbeat.checkin'

/**
 * The Monday digest's own record: the week it claimed and the week it POSTED.
 *
 * The tick's record says whether Monday's run worked; this one is the lock
 * that makes the digest post once a week however many times the tick (or a
 * person) calls it — the same claim-before-post the check-in takes on its
 * record. Kept apart from the tick's document so the two never write over
 * each other's fields.
 */
export const DIGEST_HEARTBEAT_DOC_ID = 'marketingHeartbeat.digest'

/** What one scheduled run did, in the order it tried to do it. */
export type HeartbeatStep = {
  name: 'plan' | 'digest' | 'domains' | 'checkin'
  ok: boolean
  /** One line a person can read. "Planned 8h across 11 items." */
  detail: string
  /**
   * How many things this step actually touched.
   *
   * Carried as a number rather than read back out of `detail`: the first
   * version regex-matched the prose for a non-zero digit and cheerfully found
   * the YEAR in "0 item(s) planned for 2026-W36", reporting an inert run as
   * productive. Evidence has to be data, not prose to be re-parsed.
   */
  count?: number
}

export type HeartbeatRecord = {
  /** ISO week the last run was for, e.g. "2026-W36". */
  week?: string
  /** When the last run finished, whatever the outcome. */
  ranAt?: string
  /** When a run last completed with every step ok. */
  lastHealthyAt?: string
  steps?: HeartbeatStep[]
  /** Set when the last run failed, so the next digest can say so out loud. */
  error?: string
  /**
   * Check-in and digest records only: the week that was actually POSTED, and
   * the message. Kept apart from `week` (the week last attempted) because
   * "tried" and "posted" are different claims, and only "posted" may stop a
   * second post.
   */
  postedWeek?: string
  postedTs?: string
  /** Check-in and digest records only: the claim a run takes BEFORE posting, so a double cron fire posts once. */
  claimedWeek?: string
  claimedAt?: string
}

const MS_PER_DAY = 86_400_000

const parse = (value?: string | null): number | null => {
  if (!value) return null
  const at = Date.parse(value)
  return Number.isNaN(at) ? null : at
}

/**
 * How long after a missed tick the silence itself becomes the news.
 *
 * A weekly job gets a generous grace period — a cron can slip, a deploy can
 * land mid-run — but two missed weeks means it is broken and nobody noticed.
 */
export const HEARTBEAT_STALE_DAYS = 10

export type HeartbeatHealth = {
  everRan: boolean
  healthy: boolean
  stale: boolean
  daysSince: number | null
  /** One line for a person, always safe to show. */
  summary: string
}

/**
 * Is the schedule still alive?
 *
 * Deliberately reports three distinct states rather than a boolean, because
 * "never ran" and "ran and failed" and "ran fine three weeks ago" need
 * completely different responses, and collapsing them is how a dead job looks
 * healthy.
 */
export function heartbeatHealth(
  record: HeartbeatRecord | null | undefined,
  now: Date = new Date(),
  label = 'weekly tick',
): HeartbeatHealth {
  // The label names the job in every sentence below. Defaulted, so the tick's
  // wording (and everything that already matches on it) is unchanged; the
  // check-in passes its own name so "has never run" is about the right job.
  const job = String(label || 'weekly tick').trim() || 'weekly tick'
  const Job = job.charAt(0).toUpperCase() + job.slice(1)
  const ranAt = parse(record?.ranAt)
  if (!record || ranAt === null) {
    return {
      everRan: false,
      healthy: false,
      stale: true,
      daysSince: null,
      summary: `The ${job} has never run. Nothing is scheduled, so nothing is happening on its own.`,
    }
  }

  const daysSince = Math.floor((now.getTime() - ranAt) / MS_PER_DAY)
  const failed = Boolean(record.error) || (record.steps || []).some((step) => !step.ok)
  const stale = daysSince >= HEARTBEAT_STALE_DAYS

  if (failed) {
    return {
      everRan: true,
      healthy: false,
      stale,
      daysSince,
      summary: `The ${job} last ran ${describeAge(daysSince)} and failed: ${record.error || firstFailure(record)}`,
    }
  }
  if (stale) {
    return {
      everRan: true,
      healthy: false,
      stale: true,
      daysSince,
      summary: `The ${job} has not run for ${daysSince} days. It is supposed to run every week.`,
    }
  }
  return {
    everRan: true,
    healthy: true,
    stale: false,
    daysSince,
    summary: `${Job} ran ${describeAge(daysSince)} for ${record.week || 'this week'}.`,
  }
}

function firstFailure(record: HeartbeatRecord): string {
  const step = (record.steps || []).find((entry) => !entry.ok)
  return step ? `${step.name} — ${step.detail}` : 'no detail recorded'
}

function describeAge(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/**
 * The tick's record of its digest step, from the digest route's answer.
 *
 * A digest that stood down because this week's was already posted (a
 * duplicate cron delivery, a second tick the same Monday) is the week's lock
 * doing its job, not a failed post — and recording it as a failure would
 * overwrite the healthy record of the run that DID post, and have the watchdog
 * email about a digest that is sitting in the channel. It is ok, and it counts
 * nothing, because this run touched nothing.
 */
export function digestHeartbeatStep(
  result: { ok: boolean; status: number; body: Record<string, unknown> },
  opts: { dryRun: boolean; week: string },
): HeartbeatStep {
  const body = result.body || {}
  const taskCount = Number(body.taskCount || 0)
  if (result.ok && body.skipped === true) {
    const reason = String(body.detail || body.skipReason || 'already posted')
    return { name: 'digest', ok: true, count: 0, detail: `digest stood down for ${opts.week}: ${reason}` }
  }
  const posted = Boolean(body.posted) || Boolean(body.dryRun)
  if (result.ok && posted) {
    return {
      name: 'digest',
      ok: true,
      count: taskCount,
      detail: `digest ${opts.dryRun ? 'previewed' : 'posted'} with ${taskCount} task(s).`,
    }
  }
  return {
    name: 'digest',
    ok: false,
    count: taskCount,
    detail: `digest returned ${result.status}: ${String(body.error || 'not posted')}`,
  }
}

/**
 * Did the run actually change anything, or did it merely succeed?
 *
 * A tick that reports ok while planning zero items and posting nothing is the
 * exact shape of a mechanism that is inert, so the steps carry their own
 * evidence and this asks the question directly.
 */
export function tickDidSomething(steps: HeartbeatStep[]): boolean {
  return steps.some((step) => step.ok && (step.count || 0) > 0)
}
