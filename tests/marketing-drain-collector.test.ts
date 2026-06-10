import { describe, expect, it } from 'vitest'
import {
  kvCounterField,
  parseKvCounterField,
  aggregatesFromKvHash,
  engagementCountersFromKvHash,
  variantEngagementFromKvHash,
  isEngagementField,
  ENG_SESSIONS_FIELD,
  ENG_VISIBLE_MS_FIELD,
  ENG_BOUNCES_FIELD,
} from '@/lib/marketing/drainSink'
import { buildSignalMetricsFromAggregates } from '@/lib/marketing/vercelDrain'

const HOME_VARIANTS = [
  { key: 'control', label: 'Control' },
  { key: 'concept', label: 'Concept' },
]

describe('KV counter field encoding', () => {
  it('round-trips variant / page path / event name', () => {
    const field = kvCounterField('concept', '/work', 'qualified_discovery_call_click')
    expect(field).toBe('concept|/work|qualified_discovery_call_click')
    expect(parseKvCounterField(field)).toEqual({
      variant: 'concept',
      pagePath: '/work',
      eventName: 'qualified_discovery_call_click',
    })
  })

  it('preserves multi-segment page paths', () => {
    const field = kvCounterField('control', '/vision/visual-government', 'experiment_exposure')
    expect(parseKvCounterField(field)).toEqual({
      variant: 'control',
      pagePath: '/vision/visual-government',
      eventName: 'experiment_exposure',
    })
  })

  it('returns null for malformed fields', () => {
    expect(parseKvCounterField('concept')).toBeNull()
    expect(parseKvCounterField('concept|/work')).toBeNull()
  })
})

describe('aggregatesFromKvHash', () => {
  it('turns a KV counter hash into drain aggregates, dropping bad/zero rows', () => {
    const hash = {
      [kvCounterField('control', '/', 'experiment_exposure')]: 120,
      [kvCounterField('concept', '/', 'experiment_exposure')]: '118',
      [kvCounterField('concept', '/', 'qualified_discovery_call_click')]: 9,
      'garbage-field': 5,
      [kvCounterField('control', '/', 'noop')]: 0,
    }
    const aggregates = aggregatesFromKvHash('home-2026-variant', hash)
    expect(aggregates).toHaveLength(3)
    expect(aggregates).toContainEqual({
      experimentId: '',
      flagKey: 'home-2026-variant',
      variant: 'control',
      pagePath: '/',
      eventName: 'experiment_exposure',
      count: 120,
    })
    // string counts are coerced
    expect(aggregates.find((a) => a.variant === 'concept' && a.eventName === 'experiment_exposure')?.count).toBe(118)
    expect(aggregates.find((a) => a.eventName === 'qualified_discovery_call_click')?.count).toBe(9)
  })

  it('feeds the existing signal builder to produce a control-vs-variant lift', () => {
    const hash = {
      [kvCounterField('control', '/', 'experiment_exposure')]: 100,
      [kvCounterField('concept', '/', 'experiment_exposure')]: 100,
      [kvCounterField('control', '/', 'qualified_discovery_call_click')]: 5,
      [kvCounterField('concept', '/', 'qualified_discovery_call_click')]: 10,
    }
    const aggregates = aggregatesFromKvHash('home-2026-variant', hash)
    const metrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [{ eventName: 'qualified_discovery_call_click', label: 'Qualified discovery click' }],
    })
    const conceptMetric = metrics.find(
      (m) => m.variantKey === 'concept' && m.eventName === 'qualified_discovery_call_click',
    )
    // concept rate 10/100 vs control 5/100 = +100%
    expect(conceptMetric?.change).toBe('+100% vs control')
  })
})

describe('first-party engagement fields', () => {
  it('uses the exact reserved field names and recognizes them as engagement', () => {
    expect(ENG_SESSIONS_FIELD).toBe('__eng_sessions')
    expect(ENG_VISIBLE_MS_FIELD).toBe('__eng_visible_ms')
    expect(ENG_BOUNCES_FIELD).toBe('__eng_bounces')
    expect(isEngagementField(ENG_SESSIONS_FIELD)).toBe(true)
    expect(isEngagementField('qualified_discovery_call_click')).toBe(false)
    // The reserved fields round-trip through the shared field codec.
    expect(parseKvCounterField(kvCounterField('control', '/', ENG_SESSIONS_FIELD))).toEqual({
      variant: 'control',
      pagePath: '/',
      eventName: '__eng_sessions',
    })
  })

  it('excludes __eng_* fields from event aggregates so they never become fake events', () => {
    const hash = {
      [kvCounterField('control', '/', 'experiment_exposure')]: 100,
      [kvCounterField('control', '/', ENG_SESSIONS_FIELD)]: 100,
      [kvCounterField('control', '/', ENG_VISIBLE_MS_FIELD)]: 1_200_000,
      [kvCounterField('control', '/', ENG_BOUNCES_FIELD)]: 40,
    }
    const aggregates = aggregatesFromKvHash('home-2026-variant', hash)
    expect(aggregates).toHaveLength(1)
    expect(aggregates[0].eventName).toBe('experiment_exposure')
    expect(aggregates.some((a) => a.eventName.startsWith('__eng_'))).toBe(false)
  })

  it('computes sessions, averageSessionDuration (s), and bounceRate (0..1) from __eng_* fields', () => {
    const hash = {
      [kvCounterField('control', '/', ENG_SESSIONS_FIELD)]: 100,
      [kvCounterField('control', '/', ENG_VISIBLE_MS_FIELD)]: 1_200_000, // 12s avg
      [kvCounterField('control', '/', ENG_BOUNCES_FIELD)]: 40,
      [kvCounterField('concept', '/', ENG_SESSIONS_FIELD)]: 50,
      [kvCounterField('concept', '/', ENG_VISIBLE_MS_FIELD)]: 750_000, // 15s avg
      [kvCounterField('concept', '/', ENG_BOUNCES_FIELD)]: 10,
    }
    const inputs = variantEngagementFromKvHash(hash)
    const control = inputs.find((i) => i.variantKey === 'control')
    const concept = inputs.find((i) => i.variantKey === 'concept')

    expect(control).toMatchObject({ variantKey: 'control', sessions: 100 })
    expect(control?.averageSessionDuration).toBeCloseTo(12, 5) // 1,200,000ms / 100 / 1000
    expect(control?.bounceRate).toBeCloseTo(0.4, 5) // 40 / 100

    expect(concept).toMatchObject({ variantKey: 'concept', sessions: 50 })
    expect(concept?.averageSessionDuration).toBeCloseTo(15, 5)
    expect(concept?.bounceRate).toBeCloseTo(0.2, 5)
  })

  it('sums a variant across page paths and drops rows without sessions', () => {
    const hash = {
      [kvCounterField('control', '/', ENG_SESSIONS_FIELD)]: 60,
      [kvCounterField('control', '/', ENG_VISIBLE_MS_FIELD)]: 600_000,
      [kvCounterField('control', '/', ENG_BOUNCES_FIELD)]: 30,
      [kvCounterField('control', '/work', ENG_SESSIONS_FIELD)]: 40,
      [kvCounterField('control', '/work', ENG_VISIBLE_MS_FIELD)]: 600_000,
      [kvCounterField('control', '/work', ENG_BOUNCES_FIELD)]: 10,
      // No sessions -> dropped (no denominator).
      [kvCounterField('concept', '/', ENG_VISIBLE_MS_FIELD)]: 5_000,
    }
    expect(engagementCountersFromKvHash(hash).every((c) => c.sessions > 0)).toBe(true)
    const inputs = variantEngagementFromKvHash(hash)
    expect(inputs.map((i) => i.variantKey)).toEqual(['control'])
    const control = inputs[0]
    expect(control.sessions).toBe(100) // 60 + 40
    expect(control.averageSessionDuration).toBeCloseTo(12, 5) // 1,200,000 / 100 / 1000
    expect(control.bounceRate).toBeCloseTo(0.4, 5) // 40 / 100
  })

  it('clamps bounceRate to 0..1 and ignores non-finite values', () => {
    const hash = {
      [kvCounterField('control', '/', ENG_SESSIONS_FIELD)]: 10,
      [kvCounterField('control', '/', ENG_BOUNCES_FIELD)]: 25, // > sessions
      [kvCounterField('control', '/', ENG_VISIBLE_MS_FIELD)]: 'not-a-number',
    }
    const control = variantEngagementFromKvHash(hash)[0]
    expect(control.bounceRate).toBe(1)
    expect(control.averageSessionDuration).toBe(0) // bad visible_ms ignored -> 0/10
  })
})
