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

/** What one scheduled run did, in the order it tried to do it. */
export type HeartbeatStep = {
  name: 'plan' | 'digest'
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
export function heartbeatHealth(record: HeartbeatRecord | null | undefined, now: Date = new Date()): HeartbeatHealth {
  const ranAt = parse(record?.ranAt)
  if (!record || ranAt === null) {
    return {
      everRan: false,
      healthy: false,
      stale: true,
      daysSince: null,
      summary: 'The weekly tick has never run. Nothing is scheduled, so nothing is happening on its own.',
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
      summary: `The weekly tick last ran ${describeAge(daysSince)} and failed: ${record.error || firstFailure(record)}`,
    }
  }
  if (stale) {
    return {
      everRan: true,
      healthy: false,
      stale: true,
      daysSince,
      summary: `The weekly tick has not run for ${daysSince} days. It is supposed to run every week.`,
    }
  }
  return {
    everRan: true,
    healthy: true,
    stale: false,
    daysSince,
    summary: `Weekly tick ran ${describeAge(daysSince)} for ${record.week || 'this week'}.`,
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
 * Did the run actually change anything, or did it merely succeed?
 *
 * A tick that reports ok while planning zero items and posting nothing is the
 * exact shape of a mechanism that is inert, so the steps carry their own
 * evidence and this asks the question directly.
 */
export function tickDidSomething(steps: HeartbeatStep[]): boolean {
  return steps.some((step) => step.ok && (step.count || 0) > 0)
}
