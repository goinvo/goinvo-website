/**
 * How long marketing work takes, and how much of it fits in a week.
 *
 * The suite has always been able to decide WHAT to do; it had no way to reason
 * about HOW MUCH, so it produced an unbounded queue. A list that ignores
 * capacity is a list nobody works. These are the two numbers that fix that: an
 * estimate per task, and a budget per week.
 *
 * Pure and dependency-free so the planner can be unit-tested without Sanity.
 */

import type { MarketingOperationKind, MarketingOperationPriority } from './operations'

/** Fallback when the setting is blank, absurd, or missing entirely. */
export const DEFAULT_WEEKLY_MARKETING_HOURS = 4
const MAX_WEEKLY_MARKETING_HOURS = 40
const MIN_WEEKLY_MARKETING_HOURS = 0.5

/**
 * Typical minutes for one task of each kind, for a small studio doing its own
 * marketing.
 *
 * Decisions are deliberately the smallest entry. They cost judgement rather
 * than labour, and if they were priced like execution a single week could fill
 * with nothing but questions — which is the opposite of what the board is for,
 * since a decision is usually what unblocks somebody else's hour.
 */
export const DEFAULT_MINUTES_BY_KIND: Record<MarketingOperationKind, number> = {
  decision: 15,
  update: 20,
  blocker: 30,
  maintenance: 30,
  measurement: 45,
  outreach: 60,
  research: 90,
  content: 120,
}

/** Priority nudges the estimate: urgent work is usually scoped tighter. */
const PRIORITY_MULTIPLIER: Record<MarketingOperationPriority, number> = {
  urgent: 0.75,
  high: 0.9,
  normal: 1,
  low: 1.1,
}

const FALLBACK_MINUTES = 45

export type EffortEstimate = {
  minutes: number
  /** 'explicit' when a person set it — their number always wins. */
  source: 'explicit' | 'estimated'
}

export type EffortInput = {
  kind?: string
  priority?: string
  estimatedMinutes?: number
}

function isUsableMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Minutes for one operation.
 *
 * An explicit `estimatedMinutes` always wins and is reported as such, so the UI
 * can distinguish "we guessed" from "you told us" — and so correcting a bad
 * guess is a durable fix rather than something the next re-plan overwrites.
 */
export function estimateOperationMinutes(operation: EffortInput): EffortEstimate {
  if (isUsableMinutes(operation.estimatedMinutes)) {
    return { minutes: Math.round(operation.estimatedMinutes), source: 'explicit' }
  }

  const base =
    (operation.kind && DEFAULT_MINUTES_BY_KIND[operation.kind as MarketingOperationKind]) ||
    FALLBACK_MINUTES
  const multiplier =
    (operation.priority && PRIORITY_MULTIPLIER[operation.priority as MarketingOperationPriority]) || 1

  // Round to 5 minutes: an estimate precise to the minute claims a precision that
  // does not exist, and reads as false confidence next to a number a person set.
  const minutes = Math.max(5, Math.round((base * multiplier) / 5) * 5)
  return { minutes, source: 'estimated' }
}

/**
 * The week's budget in minutes, bounded.
 *
 * A blank field, a negative one, or someone typing 400 must not silently become
 * the plan — an unbounded budget defeats the entire point of the feature.
 */
export function resolveWeeklyMinutes(hours?: number | null): number {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_WEEKLY_MARKETING_HOURS * 60
  }
  const bounded = Math.min(Math.max(hours, MIN_WEEKLY_MARKETING_HOURS), MAX_WEEKLY_MARKETING_HOURS)
  return Math.round(bounded * 60)
}

/** "3h 20m" / "45m" — for a plan a person reads, not a machine. */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}
