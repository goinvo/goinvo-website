/**
 * The week in figures: where the hours go, and what the numbers say to do.
 *
 * The planner has already decided the week (weeklyPlan.ts); this only reads
 * its answer. The hours are split by what they are FOR, with stable colour
 * slots so "outreach" is the same colour every week and in every chart.
 */
import { formatMinutes } from './format'

export type GlanceRow = {
  kind?: string | null
  minutes: number
  status?: string | null
  reason?: string | null
  completedAt?: string | null
}

export type GlancePlan = {
  budgetMinutes: number
  plannedMinutes: number
  overCommitted?: boolean
  reserved?: { minutes: number; label?: string } | null
  items: GlanceRow[]
  decisions: GlanceRow[]
  deferred: GlanceRow[]
}

export type GlancePart = {
  key: 'followUps' | 'outreach' | 'decisions' | 'other'
  label: string
  value: number
  slot: number
  detail: string
}

/** Fixed slots: the entity keeps its colour whether or not the others are present this week. */
export const GLANCE_SLOTS = { followUps: 0, outreach: 1, decisions: 2, other: 3 } as const

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function budgetParts(plan: GlancePlan): GlancePart[] {
  const outreach = plan.items.filter((row) => row.kind === 'outreach')
  const decisionItems = plan.items.filter((row) => row.kind === 'decision')
  const other = plan.items.filter((row) => row.kind !== 'outreach' && row.kind !== 'decision')
  const sum = (rows: GlanceRow[]) => rows.reduce((total, row) => total + Math.max(0, Number(row.minutes) || 0), 0)
  const decisions = [...plan.decisions, ...decisionItems]
  return [
    {
      key: 'followUps' as const,
      label: 'Follow-ups',
      value: Math.max(0, plan.reserved?.minutes ?? 0),
      slot: GLANCE_SLOTS.followUps,
      detail: plan.reserved?.label ?? 'held back for people who are owed a reply',
    },
    {
      key: 'outreach' as const,
      label: 'Outreach',
      value: sum(outreach),
      slot: GLANCE_SLOTS.outreach,
      detail: count(outreach.length, 'task'),
    },
    {
      key: 'decisions' as const,
      label: 'Decisions',
      value: sum(decisions),
      slot: GLANCE_SLOTS.decisions,
      detail: count(decisions.length, 'decision'),
    },
    {
      key: 'other' as const,
      label: 'Other work',
      value: sum(other),
      slot: GLANCE_SLOTS.other,
      detail: count(other.length, 'task'),
    },
  ]
}

/**
 * The sentence under the meter. It says what the spare time is good for, or
 * what did not fit — the reader should know what to do next without doing the
 * subtraction.
 */
export function budgetInsight(plan: GlancePlan): string {
  const parts = budgetParts(plan)
  const planned = parts.reduce((total, part) => total + part.value, 0)
  const spare = plan.budgetMinutes - planned
  const pushed = plan.deferred.filter((row) => row.reason === 'over budget')
  const pushedMinutes = pushed.reduce((total, row) => total + (Number(row.minutes) || 0), 0)
  const outreachShare = planned
    ? (parts.find((p) => p.key === 'outreach')!.value + parts.find((p) => p.key === 'followUps')!.value) / planned
    : 0
  const lead = `${formatMinutes(planned)} planned of ${formatMinutes(plan.budgetMinutes)}`
  const share = planned ? ` — ${Math.round(outreachShare * 100)}% of it talking to people.` : '.'
  if (spare < 0) {
    return `${lead}${share} Over by ${formatMinutes(-spare)}: drop or hand back something before Thursday.`
  }
  if (pushed.length) {
    return `${lead}${share} ${count(pushed.length, 'task')} (${formatMinutes(pushedMinutes)}) did not fit and wait for next week.`
  }
  if (spare >= 60) return `${lead}${share} ${formatMinutes(spare)} spare — room for another outreach call.`
  if (spare > 0) return `${lead}${share} ${formatMinutes(spare)} spare.`
  return `${lead}${share} Exactly full.`
}
