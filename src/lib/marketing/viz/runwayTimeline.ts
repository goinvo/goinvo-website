/**
 * The runway as a calendar, not a number.
 *
 * "4.5 months" is a fact; "Rebuild until Mon 12 Oct, then Survival" is a plan.
 * The stored date (`certainUntil`) already implies the day each posture begins
 * — the bins are measured back from it (`maxMonths`) — so this lays those days
 * out on a time axis, puts today on it, and states the next crossing in words.
 * Signed work that extended the runway sits to the left of today, where it
 * happened.
 *
 * Pure: `now` is passed in, dates are ISO strings.
 */
import { FINANCIAL_POSTURES, type FinancialPostureId } from '../financialPosture'
import { addMonths, formatMonths, monthsOfRunway, resolveRunwayPosture, type StoredPosture } from '../runway'

const DAY = 86_400_000

export type RunwayLevel = 'good' | 'warning' | 'serious' | 'critical'

/** Money state IS a status, so postures wear status colours — always with their name. */
export const POSTURE_LEVEL: Record<FinancialPostureId, RunwayLevel> = {
  growth: 'good',
  stable: 'good',
  rebuild: 'warning',
  survival: 'serious',
}

export type RunwaySegment = { posture: FinancialPostureId; title: string; level: RunwayLevel; from: string; to: string }

export type RunwayTimeline = {
  /** Left edge of the axis (a little history, for signed work). */
  start: string
  /** Right edge: a month past the end of the runway, or the horizon. */
  end: string
  today: string
  /** Null when no date is recorded — nothing to draw but the question. */
  endsAt: string | null
  months: number | null
  current: FinancialPostureId
  source: 'runway' | 'manual' | 'default'
  /** From today forward, in order; each carries the posture it IS during that span. */
  segments: RunwaySegment[]
  /** The next day the posture changes, if the runway is not extended before then. */
  nextCrossing: { posture: FinancialPostureId; title: string; at: string } | null
  commitments: { at: string; label: string; monthsAdded: number | null }[]
  confirmedDaysAgo: number | null
  stale: boolean
}

const dateKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const parse = (value: string | null | undefined): number | null => {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function buildRunwayTimeline(
  stored: StoredPosture,
  now: Date,
  options: { historyDays?: number; horizonMonths?: number; staleDays?: number } = {},
): RunwayTimeline {
  const historyDays = options.historyDays ?? 60
  const horizonMonths = options.horizonMonths ?? 14
  const today = now.getTime()
  const resolved = resolveRunwayPosture(stored, now)
  const certainUntil = stored.runway?.certainUntil ?? null
  const endMs = parse(certainUntil)
  const months = monthsOfRunway(certainUntil, now)

  // Posture boundaries, measured back from the end of the runway.
  const bins = FINANCIAL_POSTURES.map((posture, index) => ({
    posture,
    lower: index === 0 ? 0 : (FINANCIAL_POSTURES[index - 1].maxMonths ?? 0),
    upper: posture.maxMonths,
  }))

  const segments: RunwaySegment[] = []
  let nextCrossing: RunwayTimeline['nextCrossing'] = null
  if (endMs !== null && endMs > today) {
    // Walk from the most comfortable bin down to survival; each bin covers the
    // days on which the remaining runway falls inside its [lower, upper) months.
    for (const bin of [...bins].reverse()) {
      const fromMs = bin.upper === null ? today : Date.parse(addMonths(-bin.upper, new Date(endMs)))
      const toMs = Date.parse(addMonths(-bin.lower, new Date(endMs)))
      const from = Math.max(today, fromMs)
      if (toMs <= today || from >= toMs) continue
      segments.push({
        posture: bin.posture.id,
        title: bin.posture.title,
        level: POSTURE_LEVEL[bin.posture.id],
        from: dateKey(from),
        to: dateKey(toMs),
      })
    }
    if (segments.length > 1) {
      nextCrossing = { posture: segments[1].posture, title: segments[1].title, at: segments[1].from }
    }
  }

  const commitments = (stored.runway?.commitments ?? [])
    .map((c) => ({
      at: c.signedAt,
      label: c.label,
      monthsAdded: typeof c.monthsAdded === 'number' ? c.monthsAdded : null,
    }))
    .filter((c) => parse(c.at) !== null)
    .sort((a, b) => (parse(a.at) ?? 0) - (parse(b.at) ?? 0))

  const earliestCommitment = commitments.length ? parse(commitments[0].at) : null
  const start = Math.min(today - historyDays * DAY, earliestCommitment ?? Infinity)
  const horizon = Date.parse(addMonths(horizonMonths, now))
  const end =
    endMs !== null && endMs > today ? Math.max(Date.parse(addMonths(1, new Date(endMs))), today + 120 * DAY) : horizon
  const confirmed = parse(stored.runway?.confirmedAt)
  const confirmedDaysAgo = confirmed === null ? null : Math.max(0, Math.floor((today - confirmed) / DAY))

  return {
    start: dateKey(start),
    end: dateKey(Math.min(end, horizon + 180 * DAY)),
    today: dateKey(today),
    endsAt: certainUntil && endMs !== null ? dateKey(endMs) : null,
    months,
    current: resolved.id,
    source: resolved.source,
    segments,
    nextCrossing,
    commitments,
    confirmedDaysAgo,
    stale: confirmedDaysAgo !== null && confirmedDaysAgo > (options.staleDays ?? 30),
  }
}

/** The one sentence under the chart: where we are, what happens next, and how fresh the number is. */
export function describeRunwayTimeline(timeline: RunwayTimeline, formatDay: (iso: string) => string): string {
  if (timeline.months === null || timeline.endsAt === null) {
    return 'No runway date recorded — the plan is running on an assumed posture.'
  }
  if (timeline.months <= 0)
    return `The recorded runway ended ${formatDay(timeline.endsAt)}. Record signed work or a new date.`
  const current = timeline.segments[0]?.title ?? ''
  const next = timeline.nextCrossing
    ? `${current} until ${formatDay(timeline.nextCrossing.at)}, then ${timeline.nextCrossing.title} unless work is signed.`
    : `${current} to the end of the runway on ${formatDay(timeline.endsAt)}.`
  const freshness =
    timeline.confirmedDaysAgo === null
      ? ' Never confirmed.'
      : timeline.stale
        ? ` Last confirmed ${timeline.confirmedDaysAgo} days ago — worth re-checking.`
        : ''
  const override =
    timeline.source === 'manual' && timeline.segments[0] && timeline.segments[0].posture !== timeline.current
      ? ` The plan is using ${FINANCIAL_POSTURES.find((p) => p.id === timeline.current)?.title ?? timeline.current}, set by hand more recently than the date.`
      : ''
  return `${formatMonths(timeline.months)} of certain runway. ${next}${override}${freshness}`
}
