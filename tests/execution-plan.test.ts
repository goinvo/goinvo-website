import { describe, expect, it } from 'vitest'

import {
  buildPlanCalendarCells,
  composeCallScript,
  composeEmailTemplates,
  EXEC_PLAN_CALENDAR_PREFIX,
  EXEC_PLAN_OP_PREFIX,
  groupNextTwoWeeks,
  mergePlanEntries,
  parsePlanMonth,
  phaseProgress,
  PLAN_END,
  PLAN_START,
  planMonthNav,
  planPhaseForSourceKey,
  type PlanCalendarEntry,
  type PlanContentItem,
  type PlanEvidence,
  type PlanFollowUp,
  type PlanOffer,
  type PlanOperation,
  type ScriptContact,
} from '@/lib/marketing/executionPlan'
import {
  buildSeedCalendarDocs,
  buildSeedOperationDocs,
  EXEC_PLAN_SEED_CALENDAR,
  EXEC_PLAN_SEED_OPERATIONS,
} from '@/lib/marketing/executionPlanSeed'
import { CALENDAR_STATUS_VALUES, CHANNEL_VALUES, CONTENT_TYPE_VALUES } from '@/lib/marketing/enums'

const SEP = new Date(2026, 8, 1)
const NOW = new Date(2026, 8, 20, 9, 0) // Sun Sep 20 2026

function op(overrides: Partial<PlanOperation>): PlanOperation {
  return {
    _id: overrides._id || 'op-1',
    title: overrides.title || 'An operation',
    status: overrides.status || 'queued',
    sourceKey: overrides.sourceKey || `${EXEC_PLAN_OP_PREFIX}phase1/example`,
    ...overrides,
  }
}

describe('plan calendar grid', () => {
  it('always returns 42 cells starting the Sunday on or before the 1st', () => {
    const cells = buildPlanCalendarCells(SEP, NOW)
    expect(cells).toHaveLength(42)
    // Sep 1 2026 is a Tuesday; the grid opens on Sunday Aug 30.
    expect(cells[0].dateKey).toBe('2026-08-30')
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30)
    expect(cells.find((cell) => cell.isToday)?.dateKey).toBe('2026-09-20')
  })
})

describe('plan month navigation', () => {
  it('accepts a month inside the window', () => {
    expect(parsePlanMonth('2026-10', NOW).getMonth()).toBe(9)
  })

  it('clamps months outside the window to the nearest edge', () => {
    expect(parsePlanMonth('2026-08', NOW).getMonth()).toBe(8)
    expect(parsePlanMonth('2025-12', NOW).getMonth()).toBe(8)
    expect(parsePlanMonth('2026-12', NOW).getMonth()).toBe(10)
  })

  it('falls back to the clamped current month for garbage or absence', () => {
    expect(parsePlanMonth(undefined, new Date(2026, 9, 5)).getMonth()).toBe(9)
    expect(parsePlanMonth('not-a-month', new Date(2026, 9, 5)).getMonth()).toBe(9)
    expect(parsePlanMonth(undefined, new Date(2026, 0, 5)).getMonth()).toBe(8)
    expect(parsePlanMonth(undefined, new Date(2027, 3, 5)).getMonth()).toBe(10)
  })

  it('nav is null at the window edges', () => {
    expect(planMonthNav(new Date(2026, 8, 1)).prev).toBeNull()
    expect(planMonthNav(new Date(2026, 8, 1)).next).toBe('2026-10')
    expect(planMonthNav(new Date(2026, 10, 1)).next).toBeNull()
  })
})

describe('mergePlanEntries', () => {
  const operations: PlanOperation[] = [
    op({ _id: 'op-due', dueAt: '2026-09-18T12:00:00Z', ownerName: 'Juhan' }),
    op({ _id: 'op-overdue', dueAt: '2026-09-04T12:00:00Z', status: 'needsHuman' }),
    op({ _id: 'op-done', dueAt: '2026-09-02T12:00:00Z', status: 'done' }),
    op({ _id: 'op-undated', dueAt: undefined }),
  ]
  const contentItems: PlanContentItem[] = [
    { _id: 'mcal-1', title: 'A post', status: 'idea', publishAt: '2026-09-18T16:00:00Z', contentType: 'socialPost', channel: 'linkedin' },
    { _id: 'mcal-undated', title: 'No date', status: 'idea' },
  ]
  const followUps: PlanFollowUp[] = [
    { _id: 'contact-1', name: 'Alex Rivera', followUpAt: '2026-09-18T09:00:00Z', nextStep: 'Send the deck', status: 'contacted' },
  ]

  it('merges three streams onto shared day keys, skipping undated rows', () => {
    const merged = mergePlanEntries({ operations, contentItems, followUps, now: NOW })
    const day = merged.get('2026-09-18') || []
    expect(day.map((entry) => entry.kind)).toEqual(['operation', 'content', 'followUp'])
    expect([...merged.values()].flat().map((entry) => entry.id)).not.toContain('op-undated')
    expect([...merged.values()].flat().map((entry) => entry.id)).not.toContain('mcal-undated')
  })

  it('marks done and overdue correctly', () => {
    const merged = mergePlanEntries({ operations, contentItems, followUps, now: NOW })
    const flat = [...merged.values()].flat()
    const overdue = flat.find((entry) => entry.id === 'op-overdue')
    const done = flat.find((entry) => entry.id === 'op-done')
    expect(overdue?.overdue).toBe(true)
    expect(done?.done).toBe(true)
    expect(done?.overdue).toBe(false)
  })
})

describe('phaseProgress', () => {
  const operations: PlanOperation[] = [
    op({ _id: 'a', sourceKey: `${EXEC_PLAN_OP_PREFIX}phase1/one`, status: 'done', dueAt: '2026-09-02T12:00:00Z' }),
    op({ _id: 'b', sourceKey: `${EXEC_PLAN_OP_PREFIX}phase1/two`, status: 'queued', dueAt: '2026-09-04T12:00:00Z' }),
    op({ _id: 'c', sourceKey: `${EXEC_PLAN_OP_PREFIX}phase1/three`, status: 'dismissed', dueAt: '2026-09-05T12:00:00Z' }),
    op({ _id: 'd', sourceKey: `${EXEC_PLAN_OP_PREFIX}phase2/other`, status: 'queued' }),
    op({ _id: 'e', sourceKey: 'unrelated:key', status: 'queued' }),
  ]

  it('counts only the phase, excludes dismissed, and flags overdue', () => {
    const progress = phaseProgress('phase1', operations, NOW)
    expect(progress.total).toBe(2)
    expect(progress.done).toBe(1)
    expect(progress.percent).toBe(50)
    expect(progress.overdue).toBe(1) // 'b' was due Sep 4, still queued on Sep 20
  })

  it('maps sourceKeys to phases and rejects foreign keys', () => {
    expect(planPhaseForSourceKey(`${EXEC_PLAN_OP_PREFIX}gate/x`)).toBe('gate')
    expect(planPhaseForSourceKey('unrelated:key')).toBeNull()
    expect(planPhaseForSourceKey(`${EXEC_PLAN_OP_PREFIX}phase9/x`)).toBeNull()
  })
})

describe('groupNextTwoWeeks', () => {
  function entry(overrides: Partial<PlanCalendarEntry>): PlanCalendarEntry {
    return {
      kind: 'operation',
      id: overrides.id || 'x',
      title: overrides.title || 'Entry',
      dateKey: overrides.dateKey || '2026-09-21',
      status: 'queued',
      done: false,
      overdue: false,
      ...overrides,
    }
  }

  function asMap(entries: PlanCalendarEntry[]): Map<string, PlanCalendarEntry[]> {
    const map = new Map<string, PlanCalendarEntry[]>()
    for (const item of entries) {
      map.set(item.dateKey, [...(map.get(item.dateKey) || []), item])
    }
    return map
  }

  it('groups the next 14 days by Monday-anchored week and floats overdue items first', () => {
    const groups = groupNextTwoWeeks(
      asMap([
        entry({ id: 'overdue', dateKey: '2026-09-04', overdue: true }),
        entry({ id: 'this-week', dateKey: '2026-09-22' }),
        entry({ id: 'next-week', dateKey: '2026-09-29' }),
        entry({ id: 'too-far', dateKey: '2026-10-15' }),
      ]),
      NOW,
    )
    expect(groups).toHaveLength(2)
    // The overdue item joins the first upcoming week group, not a phantom past week.
    expect(groups[0].weekStartKey).toBe('2026-09-21')
    expect(groups[0].entries.map((item) => item.id)).toEqual(['overdue', 'this-week'])
    expect(groups[1].entries.map((item) => item.id)).toEqual(['next-week'])
    expect(groups.flatMap((group) => group.entries.map((item) => item.id))).not.toContain('too-far')
  })

  it('clamps the window start to the plan start before the plan begins', () => {
    const groups = groupNextTwoWeeks(
      asMap([entry({ id: 'first', dateKey: '2026-09-02' })]),
      new Date(2026, 7, 17),
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].entries[0].id).toBe('first')
  })
})

describe('supporting documents', () => {
  const offers: PlanOffer[] = [
    { key: 'ai-pilot-premortem', title: 'AI Pilot Pre-Mortem', oneLiner: 'De-risk the pilot before it dies.', priceBand: '$25k–$45k' },
    { key: 'design-eng-capacity', title: 'Design-Eng Capacity', oneLiner: 'Senior product capacity.', priceBand: '' },
  ]
  const evidence: PlanEvidence[] = [
    { _id: 'ev-1', title: 'Flux Notes', client: 'MITRE', segments: ['research'], businessOutcomes: ['Shipped to clinicians'] },
    { _id: 'ev-2', title: 'Ipsos Facto', client: 'Ipsos', segments: ['healthtech'], highlights: [{ metric: 'Adoption doubled' }] },
    { _id: 'ev-3', title: 'Unrelated', segments: ['payer'] },
  ]
  const contacts: ScriptContact[] = [
    { researchSuggestedSegment: 'healthtech', suggestedOpener: 'Saw your launch note.', suggestedOfferKey: 'ai-pilot-premortem', evidenceIds: ['ev-2'] },
    { researchSuggestedSegment: 'healthtech', suggestedOpener: 'Congrats on the raise.', suggestedOfferKey: 'ai-pilot-premortem', evidenceIds: ['ev-2', 'ev-1'] },
    { researchSuggestedSegment: 'healthtech', suggestedOpener: 'Saw your launch note.', suggestedOfferKey: 'design-eng-capacity' },
    { researchSuggestedSegment: 'pharma', suggestedOpener: 'Different segment.' },
  ]

  it('composes a segment call script from live rows', () => {
    const script = composeCallScript('healthtech', contacts, offers, evidence)
    expect(script).not.toBeNull()
    expect(script?.contactCount).toBe(3)
    expect(script?.offer?.key).toBe('ai-pilot-premortem') // modal key wins
    expect(script?.openerExamples).toEqual(['Saw your launch note.', 'Congrats on the raise.'])
    // ev-2 has two references and the segment match; it must rank first.
    expect(script?.evidenceBullets[0]).toContain('Ipsos Facto')
    expect(script?.evidenceBullets[0]).toContain('Adoption doubled')
    expect(script?.evidenceBullets).toHaveLength(2)
  })

  it('returns null for a segment with no researched contacts', () => {
    expect(composeCallScript('government', contacts, offers, evidence)).toBeNull()
  })

  it('email templates merge offers and placeholders but never contact data', () => {
    const templates = composeEmailTemplates(offers)
    expect(templates.map((template) => template.key)).toEqual(['firstTouch', 'followUp'])
    const firstTouch = templates[0]
    expect(firstTouch.body).toContain('AI Pilot Pre-Mortem')
    expect(firstTouch.body).toContain('$25k–$45k')
    expect(firstTouch.body).toContain('{{firstName}}')
    expect(firstTouch.body).toContain('{{personalOpener}}')
    // The composer's signature admits only offers, so contact data cannot leak;
    // spot-check no fixture contact strings appear anyway.
    expect(firstTouch.body).not.toContain('Saw your launch note.')
  })
})

describe('seed catalog invariants', () => {
  it('operation builders are deterministic and unique', () => {
    const first = buildSeedOperationDocs()
    const second = buildSeedOperationDocs()
    expect(first.map((doc) => doc._id)).toEqual(second.map((doc) => doc._id))
    expect(new Set(first.map((doc) => doc._id)).size).toBe(first.length)
    expect(first).toHaveLength(EXEC_PLAN_SEED_OPERATIONS.length)
  })

  it('every operation maps to a phase, stays in-window, and keeps its content', () => {
    for (const def of EXEC_PLAN_SEED_OPERATIONS) {
      expect(planPhaseForSourceKey(EXEC_PLAN_OP_PREFIX + def.slug)).not.toBeNull()
      expect(def.dueOn >= PLAN_START && def.dueOn <= PLAN_END).toBe(true)
      if (def.status === 'needsHuman') expect(def.humanQuestion).toBeTruthy()
    }
    for (const doc of buildSeedOperationDocs()) {
      expect(doc.sourceKey.startsWith(EXEC_PLAN_OP_PREFIX)).toBe(true)
      expect(doc.targetView).toBe('outreach')
      expect(doc.origin).toBe('manual')
      expect(doc.dueAt).toBeTruthy()
      // The normalizer must not have truncated the candid content away.
      expect(doc.title.length).toBeGreaterThan(10)
      expect(doc.nextAction.length).toBeGreaterThan(10)
    }
  })

  it('calendar docs are valid, inert, and deterministic', () => {
    const docs = buildSeedCalendarDocs()
    expect(docs).toHaveLength(EXEC_PLAN_SEED_CALENDAR.length)
    expect(new Set(docs.map((doc) => doc._id)).size).toBe(docs.length)
    for (const doc of docs) {
      expect(doc._id.startsWith(EXEC_PLAN_CALENDAR_PREFIX)).toBe(true)
      expect(doc._type).toBe('marketingCalendarItem')
      expect(doc.autoPublish).toBe(false)
      expect(['idea', 'drafting']).toContain(doc.status as string)
      expect(CALENDAR_STATUS_VALUES).toContain(doc.status as string)
      expect(CONTENT_TYPE_VALUES).toContain(doc.contentType as string)
      expect(CHANNEL_VALUES).toContain(doc.channel as string)
      expect(String(doc.publishAt).slice(0, 10) >= PLAN_START).toBe(true)
      expect(String(doc.publishAt).slice(0, 10) <= PLAN_END).toBe(true)
    }
  })

  it('production-bound content is neutral: no crisis framing, names, or emails', () => {
    // The production dataset is world-readable; these strings become public the
    // moment the seed runs. Candid framing belongs in the outreach operations.
    const forbidden = /stay afloat|demand shock|survival|runway|pivot|crisis|struggling|Juhan|Shirley/i
    const email = /[\w.+-]+@[\w-]+\.[\w.]+/
    for (const def of EXEC_PLAN_SEED_CALENDAR) {
      const text = `${def.title}\n${def.brief}`
      expect(text).not.toMatch(forbidden)
      expect(text).not.toMatch(email)
    }
  })
})
