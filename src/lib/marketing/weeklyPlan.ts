/**
 * Fit a week of marketing into the hours the studio actually has.
 *
 * The suite already decides what needs doing and already bends that judgement
 * to the studio's financial posture. This adds the missing dimension: how much.
 * Given a budget, it picks what fits, in what order, and — importantly — says
 * what it dropped and why, so the plan is legible rather than lossy.
 *
 * Deterministic and pure on purpose. The AI supplies the week's theme and the
 * rationale; the arithmetic lives here, because budget arithmetic is exactly
 * the sort of thing a model gets quietly wrong and nobody notices.
 */

import { estimateOperationMinutes, type EffortEstimate } from './effort'
import type { FinancialPostureId } from './financialPosture'
import {
  marketingOperationIsOverdue,
  rankMarketingOperations,
  type MarketingOperation,
} from './operations'

export type DeferralReason = 'over budget' | 'blocked' | 'not due yet' | 'already done'

export type WeeklyPlanItem = {
  operation: MarketingOperation
  minutes: number
  estimateSource: EffortEstimate['source']
  /** True when this is past its due date — the reason it sorted to the top. */
  overdue: boolean
  /** True when it is a question for a person rather than work to do. */
  decision: boolean
}

export type WeeklyPlanDeferral = {
  operation: MarketingOperation
  minutes: number
  reason: DeferralReason
}

export type WeeklyPlan = {
  weekStart: string
  weekEnd: string
  budgetMinutes: number
  plannedMinutes: number
  /** Work chosen for this week, in the order it should be done. */
  items: WeeklyPlanItem[]
  /** Questions waiting on a person. Always surfaced, budget or not. */
  decisions: WeeklyPlanItem[]
  deferred: WeeklyPlanDeferral[]
  /** True when the decisions alone already exceed the budget. */
  overCommitted: boolean
}

const DONE_STATUSES = new Set(['done', 'dismissed'])

/**
 * Kinds that earn priority when the studio needs revenue rather than reach.
 *
 * This mirrors the bias the gap detector already applies in survival/rebuild
 * postures, so the plan cannot contradict the dashboard that produced it.
 */
const REVENUE_KINDS = new Set(['outreach', 'decision'])

/**
 * How many questions to put in front of a person in one week.
 *
 * Found against real data: thirteen open decisions consumed 205 of a 240-minute
 * budget and left room for a single task. Thirteen questions is not a plan, it
 * is a dump — and a dump gets ignored, which is how decisions stay open. Surface
 * the ones that matter soonest and let the rest wait their turn.
 */
const MAX_DECISIONS_PER_WEEK = 4
const REVENUE_POSTURES = new Set<FinancialPostureId>(['survival', 'rebuild'])

/** Monday 00:00 of the week containing `now`, in local time. */
export function startOfWeek(now: Date): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - weekday)
  return date
}

function endOfWeek(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return end
}

function isoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** ISO week key, e.g. 2026-W35 — the idempotency key for a planned week. */
export function isoWeekKey(now: Date): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Thursday of this week decides the year, per ISO 8601.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const firstThursday = new Date(date.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${date.getFullYear()}-W${`${week}`.padStart(2, '0')}`
}

function isDecision(operation: MarketingOperation): boolean {
  return operation.status === 'needsHuman'
}

/**
 * Work that cannot start yet.
 *
 * `blocked` is self-explanatory; `waiting` means we are waiting on someone else.
 * Neither should consume this week's hours, but both stay visible as deferrals
 * so the reason a thing is not happening is on the page.
 */
function isBlocked(operation: MarketingOperation): boolean {
  return operation.status === 'blocked' || operation.status === 'waiting' || Boolean(operation.blocker)
}

/**
 * Work scheduled for a later week.
 *
 * This is a SORT KEY, not an exclusion. Excluding future work outright empties
 * the week whenever the queue happens to be front-loaded with later dates —
 * which is exactly what a seeded quarter looks like, and "nothing to do this
 * week" while twenty tasks sit queued is the planner failing at its job. A
 * marketer with hours left pulls the next thing forward instead.
 */
function isFutureWork(operation: MarketingOperation, weekEnd: Date): boolean {
  if (!operation.dueAt) return false
  const due = new Date(operation.dueAt)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() > weekEnd.getTime() + 24 * 3600 * 1000 - 1
}

/** Milliseconds until due; undated work sorts between due and future work. */
function dueRank(operation: MarketingOperation): number {
  if (!operation.dueAt) return Number.MAX_SAFE_INTEGER / 2
  const due = new Date(operation.dueAt)
  return Number.isNaN(due.getTime()) ? Number.MAX_SAFE_INTEGER / 2 : due.getTime()
}

export type BuildWeeklyPlanInput = {
  operations: MarketingOperation[]
  budgetMinutes: number
  posture?: FinancialPostureId
  now?: Date
}

/**
 * Choose this week's marketing.
 *
 * Invariant worth stating because the tests pin it: every operation handed in
 * comes back out exactly once, as an item, a decision, or a deferral with a
 * reason. Nothing is silently dropped — a planner that loses work quietly is
 * worse than no planner, because you stop being able to trust the board.
 */
export function buildWeeklyPlan({
  operations,
  budgetMinutes,
  posture = 'stable',
  now = new Date(),
}: BuildWeeklyPlanInput): WeeklyPlan {
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(weekStart)
  const revenueFirst = REVENUE_POSTURES.has(posture)

  const items: WeeklyPlanItem[] = []
  const decisions: WeeklyPlanItem[] = []
  const deferred: WeeklyPlanDeferral[] = []

  const candidates: MarketingOperation[] = []
  for (const operation of operations) {
    const { minutes } = estimateOperationMinutes(operation)
    if (DONE_STATUSES.has(operation.status)) {
      deferred.push({ operation, minutes, reason: 'already done' })
      continue
    }
    if (isBlocked(operation)) {
      deferred.push({ operation, minutes, reason: 'blocked' })
      continue
    }
    candidates.push(operation)
  }

  // Decisions come out first and are never budget-gated: they are a person's
  // ten minutes, and they are usually what unblocks the rest of the queue.
  const work: MarketingOperation[] = []
  const pendingDecisions: MarketingOperation[] = []
  for (const operation of candidates) {
    if (isDecision(operation)) pendingDecisions.push(operation)
    else work.push(operation)
  }

  // Soonest and latest first, then cap. Everything past the cap is deferred with
  // a reason rather than hidden, so the count of open questions stays visible.
  const orderedDecisions = [...pendingDecisions].sort((a, b) => {
    const overdueDelta =
      Number(marketingOperationIsOverdue(b, now)) - Number(marketingOperationIsOverdue(a, now))
    if (overdueDelta !== 0) return overdueDelta
    return dueRank(a) - dueRank(b)
  })

  orderedDecisions.forEach((operation, index) => {
    const estimate = estimateOperationMinutes(operation)
    if (index >= MAX_DECISIONS_PER_WEEK) {
      deferred.push({
        operation,
        minutes: estimate.minutes,
        reason: isFutureWork(operation, weekEnd) ? 'not due yet' : 'over budget',
      })
      return
    }
    decisions.push({
      operation,
      minutes: estimate.minutes,
      estimateSource: estimate.source,
      overdue: marketingOperationIsOverdue(operation, now),
      decision: true,
    })
  })

  // Reuse the board's own ranking so the plan cannot disagree with the queue the
  // studio already reads, then layer the two orderings this feature adds:
  // overdue first, and revenue-shaped work first when money is tight.
  const ranked = rankMarketingOperations(work, now)
  const ordered = [...ranked].sort((a, b) => {
    const overdueDelta =
      Number(marketingOperationIsOverdue(b, now)) - Number(marketingOperationIsOverdue(a, now))
    if (overdueDelta !== 0) return overdueDelta
    // This week's work before next month's, so pulling ahead never displaces
    // something that is actually due now.
    const futureDelta = Number(isFutureWork(a, weekEnd)) - Number(isFutureWork(b, weekEnd))
    if (futureDelta !== 0) return futureDelta
    if (revenueFirst) {
      const revenueDelta = Number(REVENUE_KINDS.has(b.kind)) - Number(REVENUE_KINDS.has(a.kind))
      if (revenueDelta !== 0) return revenueDelta
    }
    return dueRank(a) - dueRank(b)
  })

  const decisionMinutes = decisions.reduce((total, entry) => total + entry.minutes, 0)
  let remaining = budgetMinutes - decisionMinutes

  for (const operation of ordered) {
    const estimate = estimateOperationMinutes(operation)
    // Greedy with backfill: a task that does not fit is deferred and the loop
    // keeps going, so one three-hour job cannot starve a whole week of the
    // short tasks that would otherwise have fitted around it.
    if (estimate.minutes > remaining) {
      // Future work that did not fit is simply not this week's problem; work
      // that IS due and did not fit is a budget problem, and the difference
      // matters to whoever reads the deferred list.
      deferred.push({
        operation,
        minutes: estimate.minutes,
        reason: isFutureWork(operation, weekEnd) ? 'not due yet' : 'over budget',
      })
      continue
    }
    remaining -= estimate.minutes
    items.push({
      operation,
      minutes: estimate.minutes,
      estimateSource: estimate.source,
      overdue: marketingOperationIsOverdue(operation, now),
      decision: false,
    })
  }

  const plannedMinutes =
    decisionMinutes + items.reduce((total, entry) => total + entry.minutes, 0)

  return {
    weekStart: isoDate(weekStart),
    weekEnd: isoDate(weekEnd),
    budgetMinutes,
    plannedMinutes,
    items,
    decisions,
    deferred,
    overCommitted: plannedMinutes > budgetMinutes,
  }
}
