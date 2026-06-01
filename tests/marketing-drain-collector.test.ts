import { describe, expect, it } from 'vitest'
import {
  kvCounterField,
  parseKvCounterField,
  aggregatesFromKvHash,
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
