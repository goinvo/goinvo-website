/**
 * The sitrep: what Marqueta sees, recommends and would watch — and the blind
 * spots she points out.
 *
 * Rules pinned here:
 *   - blind spots are computed from the records, so they never depend on a
 *     model noticing them (a draft intent, an unmeasured goal, a lapsed
 *     assumption, a failed source, a rising pain on our flank);
 *   - every recommendation says what it serves (an objective, the flank or the
 *     reserve), and an unknown target is not passed off as an objective;
 *   - no URLs in the model's lines (links come from records, never prose);
 *   - Monday shows three lines and stays silent when there is nothing;
 *   - the terrain shows a quote only once it was found in its page.
 */
import { describe, expect, it } from 'vitest'

import { buildWeeklyDigestBlocks } from '@/lib/marketing/slackDelegation'
import {
  blindSpots,
  buildSitrepBlocks,
  buildTerrainBlocks,
  digestSitrepBlocks,
  parseSitrep,
  rulesSitrep,
} from '@/lib/marketing/sitrep'
import { normalizeIntent, type StrategyIntent } from '@/lib/marketing/strategyIntent'
import type { TerrainPain, TerrainScan, TerrainSignal } from '@/lib/marketing/terrainRecon'
import { expectValidSlackBlocks } from './support/slackBlocks'

const NOW = new Date('2026-10-05T15:00:00Z')

const intent = (overrides: Record<string, unknown> = {}): StrategyIntent =>
  normalizeIntent({
    status: 'approved',
    version: 3,
    endState: 'A studio known for shipping regulated health software.',
    horizon: '2027-06-30',
    objectives: [{ key: 'regulated', statement: 'Win regulated work', measure: 'signed engagements', target: 3, by: '2027-03-31', current: 1, currentAsOf: '2026-10-01' }],
    assumptions: [{ statement: 'AI budgets hold', checkBy: '2027-01-01' }],
    ...overrides,
  })!

const signal = (key: string, verified: boolean): TerrainSignal => ({
  key,
  source: verified ? 'fda' : 'web',
  url: `https://example.org/${key}`,
  title: key,
  quote: 'The alarm silenced itself and nobody on the floor knew why it had stopped.',
  publishedAt: '2026-10-01',
  verified,
})

const pain = (overrides: Partial<TerrainPain> = {}): TerrainPain => ({
  key: 'alarm-fatigue',
  label: 'Alarms nobody trusts',
  summary: 'Device alarms are silenced or ignored.',
  signalKeys: ['s1'],
  count: 6,
  trend: 'rising',
  history: [1, 2, 2],
  segments: ['clinicians'],
  stance: 'opening',
  whyItMatters: 'Human factors is our med-device door.',
  ourWork: [{ title: 'Mobile cardiac monitoring', url: 'https://www.goinvo.com/work/x' }],
  objectiveKeys: ['regulated'],
  ...overrides,
})

const scan = (overrides: Partial<TerrainScan> = {}): TerrainScan => ({
  week: '2026-W41',
  ranAt: '2026-10-04T22:00:00Z',
  sources: [
    { source: 'fda', ok: true, count: 12 },
    { source: 'hn', ok: true, count: 4 },
  ],
  signals: [signal('s1', true), signal('s2', false)],
  pains: [pain()],
  droppedWeb: 0,
  model: 'claude-opus-4-8',
  ...overrides,
})

describe('blindSpots: facts about the records, not a model’s notice', () => {
  it('flags a draft intent, an unmeasured goal and a lapsed assumption', () => {
    const spots = blindSpots({
      intent: intent({
        status: 'draft',
        objectives: [{ key: 'k', statement: 'Win regulated work', measure: 'signed engagements', target: 3, by: '2027-03-31', current: null }],
        assumptions: [{ statement: 'AI budgets hold', checkBy: '2026-09-01' }],
      }),
      scan: scan(),
      now: NOW,
    }).join(' | ')
    expect(spots).toMatch(/still a draft/)
    expect(spots).toMatch(/Nobody is measuring “signed engagements”/)
    expect(spots).toMatch(/re-check “AI budgets hold” by 2026-09-01/)
  })

  it('flags a measurement over a month old and a goal past its date', () => {
    const spots = blindSpots({
      intent: intent({ objectives: [{ key: 'k', statement: 'Old goal', measure: 'calls', target: 3, by: '2026-09-30', current: 1, currentAsOf: '2026-08-01' }] }),
      scan: scan(),
      now: NOW,
    }).join(' | ')
    expect(spots).toMatch(/last read 2026-08-01/)
    expect(spots).toMatch(/was due 2026-09-30/)
  })

  it('flags a failed source, a rising pain on our flank, and a rising goal-pain we have nothing for', () => {
    const spots = blindSpots({
      intent: intent(),
      scan: scan({
        sources: [{ source: 'fda', ok: false, count: 0, error: 'HTTP 500' }],
        pains: [pain({ key: 'f', label: 'Security reviews stall pilots', stance: 'flank' }), pain({ key: 'g', label: 'Interop never works', stance: 'watch', ourWork: [] })],
      }),
      now: NOW,
    }).join(' | ')
    expect(spots).toMatch(/couldn’t read FDA device reports/)
    expect(spots).toMatch(/“Security reviews stall pilots” is rising and it lands on a weakness/)
    expect(spots).toMatch(/“Interop never works” bears on our goals and is rising, but nothing we’ve made speaks to it/)
  })

  it('says when there is no intent and no scan at all', () => {
    const spots = blindSpots({ intent: null, scan: null, now: NOW }).join(' | ')
    expect(spots).toMatch(/no stated intent/)
    expect(spots).toMatch(/no terrain scan/)
  })
})

describe('the model’s sitrep, cleaned', () => {
  it('keeps three per list, strips URLs, and refuses to invent an objective', () => {
    const parsed = parseSitrep(
      JSON.stringify({
        see: ['Alarm complaints tripled https://example.org/x', 'two', 'three', 'four'],
        recommend: [
          { text: 'Publish the alarm teardown', serves: 'regulated' },
          { text: 'Fix the security page', serves: 'flank' },
          { text: 'Something else', serves: 'an-objective-nobody-set' },
        ],
        watch: ['Runway'],
      }),
      { objectiveKeys: ['regulated'], spots: ['a spot'], now: NOW },
    )!
    expect(parsed.see).toHaveLength(3)
    expect(parsed.see[0]).toBe('Alarm complaints tripled')
    expect(parsed.recommend.map((entry) => entry.serves)).toEqual(['regulated', 'flank', 'reserve'])
    expect(parsed).toMatchObject({ by: 'model', blindSpots: ['a spot'] })
    expect(parseSitrep('nothing', { objectiveKeys: [], spots: [], now: NOW })).toBeNull()
  })

  it('falls back to a plain rules version that still recommends from openings', () => {
    const plain = rulesSitrep({ intent: intent(), scan: scan(), own: { runwayLine: 'Runway line.', postureId: 'rebuild', weeklyHours: 4 }, now: NOW })
    expect(plain.by).toBe('rules')
    expect(plain.see[0]).toMatch(/^Rising: Alarms nobody trusts/)
    expect(plain.recommend[0]).toMatchObject({ serves: 'regulated' })
    expect(plain.watch[0]).toBe('Runway line.')
  })
})

describe('Slack', () => {
  const sitrep = rulesSitrep({ intent: intent(), scan: scan(), own: { runwayLine: 'Runway line.', postureId: null, weeklyHours: 4 }, now: NOW })

  it('puts three lines under Monday’s week line, and nothing when there is no sitrep', () => {
    const lines = digestSitrepBlocks(sitrep, intent())
    expectValidSlackBlocks(lines as never)
    const textValue = JSON.stringify(lines)
    expect(textValue).toContain('*I see:*')
    expect(textValue).toContain('objective 1')
    expect(digestSitrepBlocks(null, null)).toEqual([])

    const digest = buildWeeklyDigestBlocks({ now: NOW, weekStart: '2026-10-05', budgetMinutes: 240, sitrep: lines } as never)
    expect(digest[0].type).toBe('header')
    expect(digest[2]).toEqual(lines[0])
  })

  it('draws the full sitrep and says when it is the rules-only version', () => {
    const blocks = buildSitrepBlocks({ sitrep, intent: intent(), week: '2026-W41', now: NOW })
    expectValidSlackBlocks(blocks as never)
    expect(JSON.stringify(blocks)).toContain('rules only')
  })

  it('quotes a pain only from a signal confirmed in its page', () => {
    const verifiedFirst = buildTerrainBlocks({ scan: scan(), now: NOW })
    expectValidSlackBlocks(verifiedFirst as never)
    expect(JSON.stringify(verifiedFirst)).toContain('https://example.org/s1')

    const onlyUnverified = buildTerrainBlocks({ scan: scan({ pains: [pain({ signalKeys: ['s2'] })] }), now: NOW })
    expect(JSON.stringify(onlyUnverified)).not.toContain('https://example.org/s2')
  })
})
