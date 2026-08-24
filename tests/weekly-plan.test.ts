import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MINUTES_BY_KIND,
  DEFAULT_WEEKLY_MARKETING_HOURS,
  estimateOperationMinutes,
  formatMinutes,
  resolveWeeklyMinutes,
} from '@/lib/marketing/effort'
import { buildWeeklyPlan, isoWeekKey, startOfWeek } from '@/lib/marketing/weeklyPlan'
import { normalizeMarketingOperationInput, type MarketingOperation } from '@/lib/marketing/operations'

// Wednesday 26 August 2026, mid-morning.
const NOW = new Date(2026, 7, 26, 10, 0)

function op(overrides: Partial<MarketingOperation> & { sourceKey: string }): MarketingOperation {
  const normalized = normalizeMarketingOperationInput({
    title: overrides.title || 'A task',
    nextAction: overrides.nextAction || 'Do the thing.',
    kind: overrides.kind || 'content',
    priority: overrides.priority || 'normal',
    status: overrides.status || 'queued',
    ...overrides,
  })
  return { ...normalized, _type: 'marketingOperation' } as MarketingOperation
}

describe('effort estimates', () => {
  it('prefers a number a person set and says so', () => {
    const explicit = estimateOperationMinutes({ kind: 'content', estimatedMinutes: 25 })
    expect(explicit).toEqual({ minutes: 25, source: 'explicit' })
  })

  it('falls back to the kind, nudged by priority', () => {
    const normal = estimateOperationMinutes({ kind: 'outreach', priority: 'normal' })
    expect(normal.source).toBe('estimated')
    expect(normal.minutes).toBe(DEFAULT_MINUTES_BY_KIND.outreach)
    // Urgent work is usually scoped tighter, so it should not cost more.
    expect(estimateOperationMinutes({ kind: 'outreach', priority: 'urgent' }).minutes)
      .toBeLessThan(normal.minutes)
  })

  it('prices a decision as judgement, not labour', () => {
    expect(DEFAULT_MINUTES_BY_KIND.decision).toBeLessThan(DEFAULT_MINUTES_BY_KIND.content)
  })

  it('never returns a nonsense estimate for an unknown kind', () => {
    const unknown = estimateOperationMinutes({ kind: 'not-a-kind' })
    expect(unknown.minutes).toBeGreaterThan(0)
  })
})

describe('weekly budget', () => {
  it('converts hours to minutes', () => {
    expect(resolveWeeklyMinutes(4)).toBe(240)
    expect(resolveWeeklyMinutes(1.5)).toBe(90)
  })

  it('refuses blank, negative and absurd values', () => {
    const fallback = DEFAULT_WEEKLY_MARKETING_HOURS * 60
    for (const bad of [undefined, null, NaN, 0, -3]) {
      expect(resolveWeeklyMinutes(bad as number)).toBe(fallback)
    }
    // An unbounded budget would defeat the entire feature.
    expect(resolveWeeklyMinutes(400)).toBe(40 * 60)
  })

  it('formats for a person, not a machine', () => {
    expect(formatMinutes(200)).toBe('3h 20m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
  })
})

describe('buildWeeklyPlan', () => {
  it('keeps the plan inside the budget', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'a', kind: 'content' }), // 120
        op({ sourceKey: 'b', kind: 'content' }), // 120
        op({ sourceKey: 'c', kind: 'content' }), // 120
      ],
      budgetMinutes: 240,
      now: NOW,
    })
    expect(plan.plannedMinutes).toBeLessThanOrEqual(240)
    expect(plan.items).toHaveLength(2)
    expect(plan.deferred.map((entry) => entry.reason)).toContain('over budget')
  })

  it('backfills smaller work instead of stopping at the first thing that will not fit', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'big', kind: 'content', estimatedMinutes: 200 }),
        op({ sourceKey: 'small', kind: 'update', estimatedMinutes: 20 }),
      ],
      budgetMinutes: 100,
      now: NOW,
    })
    // The 200-minute task cannot fit, but that must not starve the week.
    const planned = plan.items.map((entry) => entry.operation.sourceKey)
    expect(planned).toContain('small')
    expect(plan.deferred.map((entry) => entry.operation.sourceKey)).toContain('big')
  })

  it('always surfaces decisions, even with no budget left', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'decide', kind: 'decision', status: 'needsHuman', humanQuestion: 'Which price?' }),
        op({ sourceKey: 'work', kind: 'content' }),
      ],
      budgetMinutes: 5,
      now: NOW,
    })
    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0].operation.sourceKey).toBe('decide')
    // Their minutes still count, so the week stays honest about being full.
    expect(plan.plannedMinutes).toBeGreaterThan(0)
    expect(plan.overCommitted).toBe(true)
  })

  it('puts overdue work first', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'fresh', kind: 'update' }),
        op({ sourceKey: 'late', kind: 'update', dueAt: new Date(2026, 7, 10).toISOString() }),
      ],
      budgetMinutes: 600,
      now: NOW,
    })
    expect(plan.items[0].operation.sourceKey).toBe('late')
    expect(plan.items[0].overdue).toBe(true)
  })

  it('promotes revenue work when the studio is in survival', () => {
    const operations = [
      op({ sourceKey: 'content', kind: 'content', estimatedMinutes: 30 }),
      op({ sourceKey: 'calls', kind: 'outreach', estimatedMinutes: 30 }),
    ]
    const survival = buildWeeklyPlan({ operations, budgetMinutes: 600, posture: 'survival', now: NOW })
    expect(survival.items[0].operation.sourceKey).toBe('calls')

    const stable = buildWeeklyPlan({ operations, budgetMinutes: 600, posture: 'stable', now: NOW })
    // Without the survival bias the board's own ranking decides, so the
    // revenue-first reordering must not be applied.
    expect(stable.items.map((entry) => entry.operation.sourceKey)).toHaveLength(2)
  })

  it('defers blocked and finished work with a reason', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'blocked', kind: 'content', status: 'blocked', blocker: 'Waiting on legal' }),
        op({ sourceKey: 'finished', kind: 'content', status: 'done' }),
      ],
      budgetMinutes: 600,
      now: NOW,
    })
    const reasons = Object.fromEntries(
      plan.deferred.map((entry) => [entry.operation.sourceKey, entry.reason]),
    )
    expect(reasons.blocked).toBe('blocked')
    expect(reasons.finished).toBe('already done')
    expect(plan.items).toHaveLength(0)
  })

  it('pulls future work forward when there are hours going spare', () => {
    // Found against real data: the seeded quarter is dated Sep-Nov, so a strict
    // due-date rule produced an EMPTY week while 22 tasks sat queued. A week
    // with free hours should get ahead, not report nothing to do.
    const plan = buildWeeklyPlan({
      operations: [op({ sourceKey: 'next-month', kind: 'outreach', dueAt: new Date(2026, 10, 1).toISOString() })],
      budgetMinutes: 600,
      now: NOW,
    })
    expect(plan.items.map((entry) => entry.operation.sourceKey)).toEqual(['next-month'])
  })

  it('puts work that is due now ahead of work pulled forward', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'future', kind: 'outreach', dueAt: new Date(2026, 10, 1).toISOString(), estimatedMinutes: 30 }),
        op({ sourceKey: 'thisweek', kind: 'outreach', dueAt: new Date(2026, 7, 28).toISOString(), estimatedMinutes: 30 }),
      ],
      budgetMinutes: 600,
      now: NOW,
    })
    expect(plan.items[0].operation.sourceKey).toBe('thisweek')
  })

  it('says "not due yet" rather than "over budget" when future work is what did not fit', () => {
    const plan = buildWeeklyPlan({
      operations: [
        op({ sourceKey: 'now', kind: 'outreach', dueAt: new Date(2026, 7, 27).toISOString(), estimatedMinutes: 50 }),
        op({ sourceKey: 'later', kind: 'outreach', dueAt: new Date(2026, 10, 1).toISOString(), estimatedMinutes: 50 }),
      ],
      budgetMinutes: 60,
      now: NOW,
    })
    expect(plan.items.map((entry) => entry.operation.sourceKey)).toEqual(['now'])
    expect(plan.deferred.find((entry) => entry.operation.sourceKey === 'later')?.reason).toBe('not due yet')
  })

  it('never loses an operation', () => {
    // The invariant that matters most: a planner that silently drops work is
    // worse than no planner, because the board stops being trustworthy.
    const operations = [
      op({ sourceKey: 'a', kind: 'content' }),
      op({ sourceKey: 'b', kind: 'outreach' }),
      op({ sourceKey: 'c', kind: 'decision', status: 'needsHuman' }),
      op({ sourceKey: 'd', kind: 'content', status: 'blocked' }),
      op({ sourceKey: 'e', kind: 'research', dueAt: new Date(2026, 11, 1).toISOString() }),
      op({ sourceKey: 'f', kind: 'update', status: 'done' }),
    ]
    const plan = buildWeeklyPlan({ operations, budgetMinutes: 60, now: NOW })
    const seen = [
      ...plan.items.map((entry) => entry.operation.sourceKey),
      ...plan.decisions.map((entry) => entry.operation.sourceKey),
      ...plan.deferred.map((entry) => entry.operation.sourceKey),
    ]
    expect(seen.sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('caps how many questions land on a person in one week', () => {
    // Found against real data: 13 open decisions consumed 205 of a 240-minute
    // budget and crowded out every task. A week of nothing but questions is a
    // dump, and a dump gets ignored.
    const operations = Array.from({ length: 9 }, (_, index) =>
      op({
        sourceKey: `decide-${index}`,
        kind: 'decision',
        status: 'needsHuman',
        humanQuestion: 'Which way?',
        dueAt: new Date(2026, 8, 1 + index).toISOString(),
      }),
    )
    const plan = buildWeeklyPlan({ operations, budgetMinutes: 240, now: NOW })
    expect(plan.decisions.length).toBeLessThanOrEqual(4)
    // The soonest-due question is the one that surfaces.
    expect(plan.decisions[0].operation.sourceKey).toBe('decide-0')
    // The rest are deferred, not hidden — the open-question count stays visible.
    const seen = [
      ...plan.decisions.map((entry) => entry.operation.sourceKey),
      ...plan.deferred.map((entry) => entry.operation.sourceKey),
    ]
    expect(new Set(seen).size).toBe(9)
  })

  it('leaves room for real work once decisions are capped', () => {
    const operations = [
      ...Array.from({ length: 8 }, (_, index) =>
        op({ sourceKey: `d${index}`, kind: 'decision', status: 'needsHuman', dueAt: new Date(2026, 8, 1 + index).toISOString() }),
      ),
      op({ sourceKey: 'calls', kind: 'outreach', estimatedMinutes: 60 }),
    ]
    const plan = buildWeeklyPlan({ operations, budgetMinutes: 240, posture: 'survival', now: NOW })
    expect(plan.items.map((entry) => entry.operation.sourceKey)).toContain('calls')
  })

  it('reports the week it planned', () => {
    const plan = buildWeeklyPlan({ operations: [], budgetMinutes: 240, now: NOW })
    // Wednesday 26 Aug 2026 sits in the week beginning Monday 24 Aug.
    expect(plan.weekStart).toBe('2026-08-24')
    expect(plan.weekEnd).toBe('2026-08-30')
    expect(startOfWeek(NOW).getDay()).toBe(1)
  })

  it('keys a week for idempotent re-planning', () => {
    expect(isoWeekKey(NOW)).toMatch(/^2026-W\d{2}$/)
    // Every day of the same week must produce the same key, or a re-plan on
    // Thursday would create a second plan document for the same week.
    expect(isoWeekKey(new Date(2026, 7, 24))).toBe(isoWeekKey(new Date(2026, 7, 30)))
  })
})
