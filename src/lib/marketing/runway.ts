/**
 * Runway — the dated fact the marketing posture is derived from.
 *
 * Until now the studio's financial position was a hand-picked bin ("survival")
 * with a timestamp. That has a quiet failure mode: a bin does not decay. It was
 * set on 2026-07-11 and would still have read "survival" in 2027, long after the
 * number behind it had changed in either direction. The suite would keep
 * recommending a strategy chosen for a reality nobody had re-checked.
 *
 * So the stored fact is a DATE — the last day the studio is confident it can
 * pay for — and the bin is computed from it. "4.5 months, certain" becomes
 * `certainUntil: 2027-01-11`, which is 4.5 months today, 2.5 months in
 * November, and 0 in January whether or not anyone remembers to update it. The
 * strategy follows the number down on its own, and the check-in fires before it
 * crosses a line rather than after.
 *
 * A hand-set bin still wins if it is NEWER than the runway record: someone who
 * deliberately says "treat us as survival" knows something the date does not
 * (a client wobbling, an invoice that will not be paid). Recency decides, and
 * the two never silently disagree — `resolveRunwayPosture` reports which one it
 * used and why.
 *
 * PRIVATE, for the same reason as the posture itself: this says in plain
 * numbers how close the studio is to running out of money, so it lives on the
 * posture document in the private `outreach` dataset and never in production.
 *
 * Pure and dependency-free. Every rule here is date arithmetic and can be
 * tested without Sanity or Slack.
 */

import {
  DEFAULT_FINANCIAL_POSTURE_ID,
  FINANCIAL_POSTURES,
  getFinancialPosture,
  isFinancialPostureId,
  type FinancialPostureId,
} from './financialPosture'

/** Average month. Runway is a rough number; false precision would be a lie. */
const DAYS_PER_MONTH = 30.44
const MS_PER_DAY = 86_400_000

/** A piece of signed work that moved the runway, kept as a log. */
export type RunwayCommitment = {
  /** What was signed, in the studio's own words. "SoW — Acme, discovery." */
  label: string
  /** ISO date it was signed. */
  signedAt: string
  /** How much runway it bought, if that was how it was recorded. */
  monthsAdded?: number
  /** Who told us. A name, not an id — this is a note to the team. */
  recordedBy?: string
  note?: string
}

export type RunwayRecord = {
  /** ISO date: the last day the studio is confident it can pay for. */
  certainUntil?: string
  /** When a human last confirmed the date. */
  confirmedAt?: string
  /** What the number assumes, so a later reader can judge it. */
  basis?: string
  /** Signed work that extended it, oldest first. */
  commitments?: RunwayCommitment[]
}

/** Posture as stored today: a hand-picked bin plus when it was picked. */
export type StoredPosture = {
  posture?: string
  setAt?: string
  runway?: RunwayRecord
}

const parse = (value: string | null | undefined): number | null => {
  if (!value) return null
  const at = Date.parse(String(value).length <= 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(at) ? null : at
}

/** ISO date (YYYY-MM-DD), the form every stored runway date takes. */
export function toDateKey(at: Date | number): string {
  return new Date(at).toISOString().slice(0, 10)
}

/**
 * Months of runway left on a given day, or null if no date is recorded.
 *
 * Can go negative, deliberately: a date in the past means the runway ran out,
 * and rounding that up to zero would hide it.
 */
export function monthsOfRunway(certainUntil: string | null | undefined, now: Date = new Date()): number | null {
  const until = parse(certainUntil)
  if (until === null) return null
  return (until - now.getTime()) / (DAYS_PER_MONTH * MS_PER_DAY)
}

/** The date that is `months` from `from` — how "we signed 3 more months" is stored. */
export function addMonths(months: number, from: Date = new Date()): string {
  return toDateKey(from.getTime() + months * DAYS_PER_MONTH * MS_PER_DAY)
}

/**
 * Which bin a number of months falls in.
 *
 * Bounds come from the bins themselves (`maxMonths`), so there is exactly one
 * place where "under 3 months is survival" is written down.
 */
export function postureForRunwayMonths(months: number): FinancialPostureId {
  for (const posture of FINANCIAL_POSTURES) {
    if (posture.maxMonths === null || months < posture.maxMonths) return posture.id
  }
  return FINANCIAL_POSTURES[FINANCIAL_POSTURES.length - 1].id
}

/** How long a runway date stands before the suite asks whether it is still true. */
export const RUNWAY_STALE_DAYS = 30

/** Inside this many months of the end, the check-in becomes urgent. */
export const RUNWAY_URGENT_MONTHS = 2

export type ResolvedRunway = {
  id: FinancialPostureId
  /** Where the bin came from, so the UI never implies more certainty than it has. */
  source: 'runway' | 'manual' | 'default'
  /** Months left, when a date is recorded. */
  months: number | null
  certainUntil: string | null
  /** True when a human has confirmed the underlying fact recently enough. */
  confirmed: boolean
  /** Set when the stored bin and the dated one disagree — never silently resolved. */
  disagreement: string | null
}

/**
 * The posture to actually plan against.
 *
 * Recency decides between the two inputs. A bin set after the runway was last
 * confirmed is a human overriding the arithmetic with something they know; a
 * runway confirmed after the bin was set is the arithmetic catching up. Either
 * way the loser is reported rather than dropped, because "the date says rebuild
 * and the setting says survival" is exactly the thing worth a conversation.
 */
export function resolveRunwayPosture(stored: StoredPosture, now: Date = new Date()): ResolvedRunway {
  const runway = stored.runway || {}
  const months = monthsOfRunway(runway.certainUntil, now)
  const derived = months === null ? null : postureForRunwayMonths(months)
  const manual = isFinancialPostureId(stored.posture) ? stored.posture : null

  const runwayAt = parse(runway.confirmedAt) ?? parse(runway.certainUntil)
  const manualAt = parse(stored.setAt)

  // A runway date with nothing to weigh it against, or one confirmed more
  // recently than the bin was picked.
  const runwayWins =
    derived !== null && (manual === null || manualAt === null || (runwayAt !== null && runwayAt >= manualAt))

  const id = runwayWins ? derived! : manual ?? DEFAULT_FINANCIAL_POSTURE_ID
  const source: ResolvedRunway['source'] = runwayWins ? 'runway' : manual ? 'manual' : 'default'

  const disagreement =
    derived !== null && manual !== null && derived !== manual
      ? `The runway date works out to ${formatMonths(months!)} (${getFinancialPosture(derived)?.title}), ` +
        `but the posture is set to ${getFinancialPosture(manual)?.title}. ` +
        (runwayWins ? 'Planning against the date, which was confirmed later.' : 'Planning against the setting, which was set later.')
      : null

  return {
    id,
    source,
    months,
    certainUntil: runway.certainUntil || null,
    confirmed: !runwayCheckIn(stored, now).due,
    disagreement,
  }
}

export type RunwayCheckIn = {
  due: boolean
  urgent: boolean
  /** Why it is being asked, in one line, for the person being asked. */
  reason: string
  question: string
}

/**
 * Should the suite ask about the runway?
 *
 * The point is to ask BEFORE the number stops being true, not to nag. Three
 * triggers, in order of how much they matter: nothing recorded at all; the end
 * is close enough that the strategy is about to change; the record has simply
 * gone stale.
 */
export function runwayCheckIn(stored: StoredPosture, now: Date = new Date()): RunwayCheckIn {
  const runway = stored.runway || {}
  const months = monthsOfRunway(runway.certainUntil, now)

  if (months === null) {
    return {
      due: true,
      urgent: false,
      reason: 'No runway is recorded, so the strategy is running on a guess.',
      question: 'How many months can the studio pay for, assuming nothing new closes?',
    }
  }

  if (months <= 0) {
    return {
      due: true,
      urgent: true,
      reason: 'The recorded runway has run out.',
      question: 'What is the runway now? Nothing below this date is being planned for.',
    }
  }

  const confirmedAt = parse(runway.confirmedAt)
  const ageDays = confirmedAt === null ? null : Math.floor((now.getTime() - confirmedAt) / MS_PER_DAY)

  if (months <= RUNWAY_URGENT_MONTHS) {
    return {
      due: true,
      urgent: true,
      reason: `Only ${formatMonths(months)} left on the recorded runway.`,
      question: 'Has anything closed since? The strategy tightens sharply below this line.',
    }
  }

  if (ageDays === null || ageDays >= RUNWAY_STALE_DAYS) {
    return {
      due: true,
      urgent: false,
      reason:
        ageDays === null
          ? 'The runway date has never been confirmed by a person.'
          : `The runway was last confirmed ${ageDays} days ago.`,
      question: `Still ${formatMonths(months)} of certain runway, or has that moved?`,
    }
  }

  return { due: false, urgent: false, reason: '', question: '' }
}

/** "4.5 months", "3 weeks", "1 month" — rough on purpose. */
export function formatMonths(months: number): string {
  if (!Number.isFinite(months)) return 'unknown'
  if (months <= 0) return 'none'
  if (months < 1) {
    const weeks = Math.max(1, Math.round((months * DAYS_PER_MONTH) / 7))
    return `${weeks} week${weeks === 1 ? '' : 's'}`
  }
  const rounded = Math.round(months * 2) / 2
  return `${rounded} month${rounded === 1 ? '' : 's'}`
}

/** "11 Jan 2027" — for a line a person reads, not a machine. */
export function formatRunwayDate(dateKey: string | null | undefined): string {
  const at = parse(dateKey)
  if (at === null) return 'not recorded'
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/**
 * One line stating the position, for the digest and the AI context.
 *
 * Always names the source. "Rebuild" on its own invites the reader to assume
 * somebody decided it; "certain to 11 Jan 2027 (4.5 months)" can be argued with.
 */
export function describeRunway(stored: StoredPosture, now: Date = new Date()): string {
  const resolved = resolveRunwayPosture(stored, now)
  const posture = getFinancialPosture(resolved.id)
  if (resolved.months === null) {
    return `${posture?.title || resolved.id} — no runway date recorded, so this is an assumption.`
  }
  return `${formatMonths(resolved.months)} of certain runway (to ${formatRunwayDate(resolved.certainUntil)}) — ${posture?.title || resolved.id}.`
}

/**
 * Apply a newly signed piece of work.
 *
 * Returns the patch to store rather than writing it, so the rule ("signing
 * three months moves the date three months from where it already was, not from
 * today") is testable on its own. Extending from the existing date is the whole
 * point: work signed today does not replace the runway, it adds to it.
 */
export function applyCommitment(
  record: RunwayRecord,
  commitment: RunwayCommitment & { monthsAdded: number },
  now: Date = new Date(),
): RunwayRecord {
  const existing = parse(record.certainUntil)
  // If the runway already ran out, extend from today - a signed SoW cannot buy
  // back months that have already been spent.
  const base = existing !== null && existing > now.getTime() ? new Date(existing) : now
  return {
    ...record,
    certainUntil: addMonths(commitment.monthsAdded, base),
    confirmedAt: new Date(now.getTime()).toISOString(),
    commitments: [...(record.commitments || []), commitment],
  }
}
