import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  aggregateDrainEvents,
  buildDrainPerformanceSignalDoc,
  buildSignalMetricsFromAggregates,
  drainSignalId,
  extractExperimentDimensions,
  normalizeDrainPagePath,
  parseVercelDrainPayload,
  summarizeDrainSignal,
  type DrainConversionEvent,
  type DrainSignalVariant,
} from '@/lib/marketing/vercelDrain'
import { verifyDrainAuthorization } from '@/lib/marketing/drainAuth'

const HOME_VARIANTS: DrainSignalVariant[] = [
  { key: 'control', label: 'Current homepage' },
  { key: 'concept', label: '2026 concept homepage' },
]

const HOME_CONVERSIONS: DrainConversionEvent[] = [
  { eventName: 'qualified_discovery_call_click', label: 'Qualified discovery-call clicks', unit: 'events' },
  { eventName: 'view_work_click', label: 'Work exploration clicks', unit: 'events' },
  { eventName: 'discovery_form_start', label: 'Discovery form starts', unit: 'events' },
]

function exposureEvent(variant: string) {
  return {
    type: 'event',
    eventName: 'experiment_exposure',
    eventData: JSON.stringify({
      experiment_id: 'home-2026',
      flag_key: 'home-2026-variant',
      variant,
      page_path: '/',
    }),
  }
}

function conversionEvent(eventName: string, variant: string) {
  return {
    name: eventName,
    experiment_id: 'home-2026',
    flag_key: 'home-2026-variant',
    variant,
    page_path: '/?utm_source=newsletter',
  }
}

describe('Vercel drain payload parsing', () => {
  it('normalizes page paths by dropping host, query, hash, and trailing slash', () => {
    expect(normalizeDrainPagePath('/')).toBe('/')
    expect(normalizeDrainPagePath('/vision/demo/')).toBe('/vision/demo')
    expect(normalizeDrainPagePath('/?utm=1#frag')).toBe('/')
    expect(normalizeDrainPagePath('https://www.goinvo.com/vision/demo/?x=1')).toBe('/vision/demo')
    expect(normalizeDrainPagePath(undefined)).toBe('/')
  })

  it('parses an array, an events wrapper, a single object, and NDJSON', () => {
    const arrayEvents = parseVercelDrainPayload([exposureEvent('concept')])
    expect(arrayEvents).toHaveLength(1)
    expect(arrayEvents[0]).toMatchObject({ type: 'event', eventName: 'experiment_exposure', count: 1 })

    const wrapped = parseVercelDrainPayload({ events: [conversionEvent('view_work_click', 'control')] })
    expect(wrapped).toHaveLength(1)
    expect(wrapped[0].eventName).toBe('view_work_click')

    const single = parseVercelDrainPayload(conversionEvent('qualified_discovery_call_click', 'concept'))
    expect(single).toHaveLength(1)
    expect(single[0].data.variant).toBe('concept')

    const ndjson = parseVercelDrainPayload(
      `${JSON.stringify(exposureEvent('control'))}\n${JSON.stringify(exposureEvent('concept'))}`,
    )
    expect(ndjson).toHaveLength(2)
  })

  it('reads experiment dimensions from eventData JSON and from top-level fields', () => {
    const fromEventData = parseVercelDrainPayload([exposureEvent('concept')])[0]
    expect(extractExperimentDimensions(fromEventData)).toEqual({
      experimentId: 'home-2026',
      flagKey: 'home-2026-variant',
      variant: 'concept',
      pagePath: '/',
    })

    const fromTopLevel = parseVercelDrainPayload([conversionEvent('view_work_click', 'control')])[0]
    expect(extractExperimentDimensions(fromTopLevel)).toEqual({
      experimentId: 'home-2026',
      flagKey: 'home-2026-variant',
      variant: 'control',
      pagePath: '/',
    })
  })

  it('drops events without an experiment id or variant rather than throwing', () => {
    const events = parseVercelDrainPayload([
      { type: 'pageview', url: '/' },
      { eventName: 'experiment_exposure', eventData: '{"flag_key":"home-2026-variant"}' },
      { eventName: 'broken', eventData: '{not json' },
    ])
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => extractExperimentDimensions(event) === null)).toBe(true)
  })
})

describe('Vercel drain aggregation', () => {
  it('counts events by experiment, flag, variant, page path, and event name', () => {
    const events = parseVercelDrainPayload([
      exposureEvent('control'),
      exposureEvent('control'),
      exposureEvent('concept'),
      conversionEvent('qualified_discovery_call_click', 'concept'),
      conversionEvent('qualified_discovery_call_click', 'control'),
      conversionEvent('view_work_click', 'concept'),
    ])

    const aggregates = aggregateDrainEvents(events)

    expect(aggregates).toContainEqual({
      experimentId: 'home-2026',
      flagKey: 'home-2026-variant',
      variant: 'control',
      pagePath: '/',
      eventName: 'experiment_exposure',
      count: 2,
    })
    expect(aggregates).toContainEqual({
      experimentId: 'home-2026',
      flagKey: 'home-2026-variant',
      variant: 'concept',
      pagePath: '/',
      eventName: 'qualified_discovery_call_click',
      count: 1,
    })
    // page_path query string was normalized away so both conversions share a path.
    expect(aggregates.find((a) => a.variant === 'concept' && a.eventName === 'view_work_click')?.pagePath).toBe('/')
  })

  it('respects a flag-key filter', () => {
    const events = parseVercelDrainPayload([
      exposureEvent('concept'),
      {
        eventName: 'experiment_exposure',
        eventData: JSON.stringify({ experiment_id: 'other', flag_key: 'other-flag', variant: 'b', page_path: '/x' }),
      },
    ])
    const aggregates = aggregateDrainEvents(events, { flagKey: 'home-2026-variant' })
    expect(aggregates).toHaveLength(1)
    expect(aggregates[0].flagKey).toBe('home-2026-variant')
  })
})

describe('Vercel drain signal metrics', () => {
  it('builds per-variant exposure and event metrics with a treatment-vs-control change', () => {
    const events = parseVercelDrainPayload([
      ...Array.from({ length: 300 }, () => exposureEvent('control')),
      ...Array.from({ length: 300 }, () => exposureEvent('concept')),
      ...Array.from({ length: 20 }, () => conversionEvent('qualified_discovery_call_click', 'control')),
      ...Array.from({ length: 26 }, () => conversionEvent('qualified_discovery_call_click', 'concept')),
    ])
    const aggregates = aggregateDrainEvents(events)
    const metrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [HOME_CONVERSIONS[0]],
    })

    expect(metrics).toContainEqual(
      expect.objectContaining({
        _type: 'performanceMetric',
        label: 'Current homepage visits / exposures',
        value: 300,
        unit: 'visits',
        variantKey: 'control',
        eventName: 'experiment_exposure',
      }),
    )
    expect(metrics).toContainEqual(
      expect.objectContaining({
        label: '2026 concept homepage visits / exposures',
        value: 300,
        variantKey: 'concept',
        eventName: 'experiment_exposure',
      }),
    )

    const conceptConversion = metrics.find(
      (metric) => metric.variantKey === 'concept' && metric.eventName === 'qualified_discovery_call_click',
    )
    const controlConversion = metrics.find(
      (metric) => metric.variantKey === 'control' && metric.eventName === 'qualified_discovery_call_click',
    )
    expect(conceptConversion).toMatchObject({ value: 26, unit: 'events' })
    expect(conceptConversion?.change).toBe('+30% vs control')
    expect(controlConversion).toMatchObject({ value: 20 })
    expect(controlConversion?.change).toBeUndefined()

    // Treatment metric is emitted before control so the comparison reads its change.
    const conceptIndex = metrics.findIndex((m) => m === conceptConversion)
    const controlIndex = metrics.findIndex((m) => m === controlConversion)
    expect(conceptIndex).toBeLessThan(controlIndex)
  })

  it('summarizes the readout without leaking visitor data', () => {
    const events = parseVercelDrainPayload([
      ...Array.from({ length: 100 }, () => exposureEvent('control')),
      ...Array.from({ length: 120 }, () => exposureEvent('concept')),
      ...Array.from({ length: 8 }, () => conversionEvent('qualified_discovery_call_click', 'control')),
      ...Array.from({ length: 18 }, () => conversionEvent('qualified_discovery_call_click', 'concept')),
    ])
    const aggregates = aggregateDrainEvents(events)
    const conversionEvents = [HOME_CONVERSIONS[0]]
    const metrics = buildSignalMetricsFromAggregates(aggregates, { variants: HOME_VARIANTS, conversionEvents })
    const summary = summarizeDrainSignal({ metrics, variants: HOME_VARIANTS, conversionEvents })

    expect(summary).toContain('2026 concept homepage 120 visits')
    expect(summary).toContain('Current homepage 100 visits')
    expect(summary).toContain('leads on 1 of 1 tracked event')
    expect(summary).not.toMatch(/visitor/i)
  })
})

describe('Vercel drain Sanity upsert shape', () => {
  it('builds a deterministic performance signal document', () => {
    const aggregates = aggregateDrainEvents(
      parseVercelDrainPayload([
        ...Array.from({ length: 200 }, () => exposureEvent('control')),
        ...Array.from({ length: 200 }, () => exposureEvent('concept')),
        ...Array.from({ length: 12 }, () => conversionEvent('qualified_discovery_call_click', 'concept')),
      ]),
    )
    const metrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [HOME_CONVERSIONS[0]],
    })
    const signalId = drainSignalId('home-2026-variant')
    expect(signalId).toBe('marketing-vercel-drain-home-2026-variant')

    const doc = buildDrainPerformanceSignalDoc({
      signalId,
      experimentTitle: 'Homepage 2026 concept test',
      flagKey: 'home-2026-variant',
      pageUrl: 'https://www.goinvo.com/',
      metrics,
      interpretation: 'Auto-updated readout.',
      metricDate: '2026-06-01',
      periodEnd: '2026-06-01',
    })

    expect(doc).toMatchObject({
      _id: signalId,
      _type: 'marketingPerformanceSignal',
      provider: 'vercel',
      status: 'reviewed',
      signalType: 'abTestVariantReadout',
      sourceLabel: 'Vercel Web Analytics drain',
      pageUrl: 'https://www.goinvo.com/',
      metricDate: '2026-06-01',
    })
    expect(doc.title).toContain('Homepage 2026 concept test')
    expect(doc.metrics).toBe(metrics)
    expect(doc.metrics.every((metric) => metric.variantKey && metric.eventName)).toBe(true)

    const raw = JSON.parse(doc.rawImport)
    expect(raw.flagKey).toBe('home-2026-variant')
    expect(JSON.stringify(raw)).not.toMatch(/visitor/i)
  })

  it('omits a non-absolute page url', () => {
    const doc = buildDrainPerformanceSignalDoc({
      signalId: drainSignalId('home-2026-variant'),
      flagKey: 'home-2026-variant',
      pageUrl: '/',
      metrics: [],
      interpretation: '',
    })
    expect(doc.pageUrl).toBeUndefined()
  })
})

describe('Vercel drain conceptual metrics and new events', () => {
  const dims = (variant: string) => ({ experiment_id: 'home-2026', flag_key: 'home-2026-variant', variant, page_path: '/' })
  const row = (eventName: string, variant: string, count: number) => ({ type: 'event', eventName, eventData: JSON.stringify(dims(variant)), count })

  function aggregatesFor() {
    return aggregateDrainEvents(
      parseVercelDrainPayload([
        row('experiment_exposure', 'control', 300),
        row('experiment_exposure', 'concept', 300),
        row('discovery_form_start', 'control', 10),
        row('discovery_form_start', 'concept', 14),
        row('nav_click', 'control', 40),
        row('nav_click', 'concept', 52),
      ]),
    )
  }

  it('captures conceptual metrics per variant but omits the control-vs-variant change', () => {
    const aggregates = aggregatesFor()
    const conceptualMetrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [{ eventName: 'discovery_form_start', label: 'Discovery form starts', unit: 'events', comparison: 'conceptual' }],
    })
    const conceptCell = conceptualMetrics.find((m) => m.variantKey === 'concept' && m.eventName === 'discovery_form_start')
    const controlCell = conceptualMetrics.find((m) => m.variantKey === 'control' && m.eventName === 'discovery_form_start')
    expect(conceptCell).toMatchObject({ value: 14 })
    expect(controlCell).toMatchObject({ value: 10 })
    // Even though control has a non-zero rate, conceptual metrics never get a lift.
    expect(conceptCell?.change).toBeUndefined()

    // The same data treated as comparative WOULD produce a change — proving the
    // omission is due to the conceptual kind, not a zero denominator.
    const comparativeMetrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [{ eventName: 'discovery_form_start', label: 'Discovery form starts', unit: 'events', comparison: 'comparative' }],
    })
    expect(comparativeMetrics.find((m) => m.variantKey === 'concept' && m.eventName === 'discovery_form_start')?.change).toBe('+40% vs control')
  })

  it('aggregates and builds per-variant metrics for new event names like nav_click', () => {
    const aggregates = aggregatesFor()
    expect(aggregates.find((a) => a.variant === 'concept' && a.eventName === 'nav_click')?.count).toBe(52)

    const metrics = buildSignalMetricsFromAggregates(aggregates, {
      variants: HOME_VARIANTS,
      conversionEvents: [{ eventName: 'nav_click', label: 'Top navbar clicks', unit: 'events', comparison: 'comparative' }],
    })
    expect(metrics.find((m) => m.variantKey === 'control' && m.eventName === 'nav_click')).toMatchObject({ value: 40 })
    expect(metrics.find((m) => m.variantKey === 'concept' && m.eventName === 'nav_click')).toMatchObject({ value: 52, change: '+30% vs control' })
  })
})

describe('Vercel drain authorization', () => {
  const secret = 'drain-secret-value'

  it('accepts a matching bearer token and rejects a wrong one', () => {
    expect(verifyDrainAuthorization({ secret, authorizationHeader: `Bearer ${secret}` })).toBe(true)
    expect(verifyDrainAuthorization({ secret, authorizationHeader: 'Bearer nope' })).toBe(false)
  })

  it('requires a header or body signature instead of a URL query secret', () => {
    expect(verifyDrainAuthorization({ secret })).toBe(false)
  })

  it('verifies an HMAC signature of the raw body', () => {
    const rawBody = JSON.stringify({ events: [] })
    const sha256 = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
    const sha1 = createHmac('sha1', secret).update(rawBody, 'utf8').digest('hex')

    expect(verifyDrainAuthorization({ secret, signatureHeader: `sha256=${sha256}`, rawBody })).toBe(true)
    expect(verifyDrainAuthorization({ secret, signatureHeader: sha1, rawBody })).toBe(true)
    expect(verifyDrainAuthorization({ secret, signatureHeader: 'sha256=deadbeef', rawBody })).toBe(false)
  })

  it('rejects everything when the secret is missing', () => {
    expect(verifyDrainAuthorization({ secret: '', authorizationHeader: 'Bearer x' })).toBe(false)
  })
})
