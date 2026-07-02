import { describe, expect, it } from 'vitest'
import {
  buildAbTestingInsights,
  getAbTestingComparisonSummary,
  getAbTestingComparativeResults,
  getAbTestingDisplayStatus,
  getAbTestingStats,
  getAbTestingVariantEventRows,
  isAbTestingMeasurementBlocked,
} from '@/sanity/tools/marketingTool'
import {
  aggregateDrainEvents,
  buildSignalMetricsFromAggregates,
  parseVercelDrainPayload,
  type DrainConversionEvent,
  type DrainSignalVariant,
} from '@/lib/marketing/vercelDrain'

const VARIANTS: DrainSignalVariant[] = [
  { key: 'control', label: 'Current homepage' },
  { key: 'concept', label: '2026 concept homepage' },
]

const CONVERSIONS: DrainConversionEvent[] = [
  { eventName: 'qualified_discovery_call_click', label: 'Qualified discovery-call clicks', unit: 'events' },
  { eventName: 'view_work_click', label: 'Work exploration clicks', unit: 'events' },
  { eventName: 'discovery_form_start', label: 'Discovery form starts', unit: 'events' },
]

// Mirrors the homepage test record the "Create homepage test" flow seeds.
function baseExperiment() {
  return {
    _id: 'experiment-home-2026',
    title: 'Homepage 2026 concept test',
    status: 'running',
    targetType: 'homepage',
    targetPath: '/',
    flagKey: 'home-2026-variant',
    variants: [
      { _key: 'v-control', key: 'control', label: 'Current homepage' },
      { _key: 'v-concept', key: 'concept', label: '2026 concept homepage' },
    ],
    primaryMetric: 'Qualified discovery-call clicks',
    trackedMetrics: [
      { _key: 'm-1', key: 'qualified-discovery-call-clicks', label: 'Qualified discovery-call clicks', role: 'primary', source: 'vercelEvent', eventName: 'qualified_discovery_call_click', unit: 'events' },
      { _key: 'm-2', key: 'work-exploration-clicks', label: 'Work exploration clicks', role: 'guardrail', source: 'vercelEvent', eventName: 'view_work_click', unit: 'events' },
      { _key: 'm-3', key: 'discovery-form-starts', label: 'Discovery form starts', role: 'diagnostic', source: 'vercelEvent', eventName: 'discovery_form_start', unit: 'events' },
    ],
    successTrackers: [
      { _key: 't-1', title: 'Primary CTA lift', trackerType: 'metricRule', metricKeys: ['qualified-discovery-call-clicks'], condition: 'increase' },
      { _key: 't-2', title: 'Work exploration guardrail', trackerType: 'metricRule', metricKeys: ['work-exploration-clicks'], condition: 'notDecrease' },
    ],
    analyticsSource: { _id: 'source-vercel', title: 'Vercel Web Analytics', provider: 'vercel', status: 'connected' },
  }
}

function repeat<T>(value: T, times: number): T[] {
  return Array.from({ length: times }, () => value)
}

function drainSignalMetrics(counts: {
  control: Record<string, number>
  concept: Record<string, number>
}) {
  const exposure = (variant: string, count: number) => ({
    type: 'event',
    eventName: 'experiment_exposure',
    eventData: JSON.stringify({ experiment_id: 'home-2026', flag_key: 'home-2026-variant', variant, page_path: '/' }),
    count,
  })
  const conversion = (variant: string, eventName: string, count: number) => ({
    name: eventName,
    experiment_id: 'home-2026',
    flag_key: 'home-2026-variant',
    variant,
    page_path: '/',
    count,
  })

  const rawEvents: unknown[] = [
    exposure('control', counts.control.exposure),
    exposure('concept', counts.concept.exposure),
  ]
  for (const conversionEvent of CONVERSIONS) {
    rawEvents.push(conversion('control', conversionEvent.eventName, counts.control[conversionEvent.eventName] || 0))
    rawEvents.push(conversion('concept', conversionEvent.eventName, counts.concept[conversionEvent.eventName] || 0))
  }

  const aggregates = aggregateDrainEvents(parseVercelDrainPayload(rawEvents))
  return buildSignalMetricsFromAggregates(aggregates, { variants: VARIANTS, conversionEvents: CONVERSIONS })
}

describe('A/B measurement gating', () => {
  it('blocks a running test that has no variant-keyed visits or event counts', () => {
    const experiment = { ...baseExperiment(), performanceSignals: [] }

    expect(isAbTestingMeasurementBlocked(experiment)).toBe(true)
    expect(getAbTestingDisplayStatus(experiment)).toBe('blocked')
    expect(getAbTestingStats({
      ...emptyData(),
      experiments: [experiment],
    })).toMatchObject({ running: 0, blocked: 1 })
  })

  it('blocks when a linked signal has metrics without variantKey or eventName', () => {
    const experiment = {
      ...baseExperiment(),
      performanceSignals: [
        {
          _id: 'signal-bad',
          title: 'Homepage placeholder',
          provider: 'vercel',
          status: 'new',
          metrics: [
            { _key: 'p-1', label: 'Conversions', value: 0, unit: 'events' },
          ],
        },
      ],
    }

    expect(isAbTestingMeasurementBlocked(experiment)).toBe(true)
    expect(getAbTestingDisplayStatus(experiment)).toBe('blocked')
  })

  it('unblocks and runs once per-variant exposures and event counts exist', () => {
    const metrics = drainSignalMetrics({
      control: { exposure: 300, qualified_discovery_call_click: 20, view_work_click: 90, discovery_form_start: 10 },
      concept: { exposure: 300, qualified_discovery_call_click: 30, view_work_click: 92, discovery_form_start: 14 },
    })
    const experiment = {
      ...baseExperiment(),
      performanceSignals: [
        { _id: 'signal-drain', title: 'Homepage 2026 concept test – Vercel variant readout', provider: 'vercel', status: 'reviewed', signalType: 'abTestVariantReadout', metrics },
      ],
    }

    expect(isAbTestingMeasurementBlocked(experiment)).toBe(false)
    expect(getAbTestingDisplayStatus(experiment)).toBe('running')
    expect(getAbTestingStats({ ...emptyData(), experiments: [experiment] })).toMatchObject({ running: 1, blocked: 0 })

    const rows = getAbTestingVariantEventRows(experiment)
    const exposureRow = rows.find((row) => row.isExposure)
    expect(exposureRow?.cells.map((cell) => cell.value)).toEqual([300, 300])

    const qualifiedRow = rows.find((row) => row.label.includes('Qualified'))
    const controlCell = qualifiedRow?.cells.find((cell) => cell.variant.key === 'control')
    const conceptCell = qualifiedRow?.cells.find((cell) => cell.variant.key === 'concept')
    expect(controlCell?.value).toBe(20)
    expect(conceptCell?.value).toBe(30)
    expect(conceptCell?.rate ?? 0).toBeCloseTo(10, 5)
    expect(controlCell?.rate ?? 0).toBeCloseTo(6.67, 1)
  })

  it('reports the concept as the leading page when every metric favors it', () => {
    const metrics = drainSignalMetrics({
      control: { exposure: 300, qualified_discovery_call_click: 20, view_work_click: 90, discovery_form_start: 10 },
      concept: { exposure: 300, qualified_discovery_call_click: 30, view_work_click: 92, discovery_form_start: 14 },
    })
    const experiment = {
      ...baseExperiment(),
      performanceSignals: [{ _id: 'signal-drain', title: 'readout', provider: 'vercel', status: 'reviewed', metrics }],
    }

    const results = getAbTestingComparativeResults(experiment)
    expect(results.every((result) => result.status !== 'needsComparison')).toBe(true)
    const summary = getAbTestingComparisonSummary(experiment, results)
    expect(summary.status).toBe('variant')
    expect(summary.label).toContain('2026 concept homepage')
  })
})

describe('Conceptual vs comparative metrics', () => {
  // A concept-only metric (discovery_form_start) with NO control data, plus a
  // comparative primary metric that has both variants.
  function experimentWith(discoveryComparison: 'comparative' | 'conceptual') {
    return {
      ...baseExperiment(),
      trackedMetrics: [
        { _key: 'm-1', key: 'qualified-discovery-call-clicks', label: 'Qualified discovery-call clicks', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'qualified_discovery_call_click', unit: 'events' },
        { _key: 'm-3', key: 'discovery-form-starts', label: 'Discovery form starts', role: 'diagnostic', comparison: discoveryComparison, source: 'vercelEvent', eventName: 'discovery_form_start', unit: 'events' },
      ],
      successTrackers: [
        { _key: 't-1', title: 'Primary lift', trackerType: 'metricRule', metricKeys: ['qualified-discovery-call-clicks'], condition: 'increase' },
      ],
      performanceSignals: [
        {
          _id: 'signal-mixed',
          title: 'readout',
          provider: 'vercel',
          status: 'reviewed',
          metrics: [
            { _key: 'e-c', label: 'Control visits', value: 300, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
            { _key: 'e-v', label: 'Concept visits', value: 300, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
            // Treatment-first ordering, matching how the drain emits metrics.
            { _key: 'q-v', label: 'concept qualified', value: 30, unit: 'events', variantKey: 'concept', eventName: 'qualified_discovery_call_click', change: '+50% vs control' },
            { _key: 'q-c', label: 'control qualified', value: 20, unit: 'events', variantKey: 'control', eventName: 'qualified_discovery_call_click' },
            // Concept-only: no control discovery_form_start metric exists.
            { _key: 'd-v', label: 'concept discovery', value: 14, unit: 'events', variantKey: 'concept', eventName: 'discovery_form_start' },
          ],
        },
      ],
    }
  }

  it('does not let a concept-only conceptual metric block measurement', () => {
    const experiment = experimentWith('conceptual')
    expect(isAbTestingMeasurementBlocked(experiment)).toBe(false)
    expect(getAbTestingDisplayStatus(experiment)).toBe('running')
  })

  it('still captures the conceptual metric in the variant table, tagged conceptual', () => {
    const experiment = experimentWith('conceptual')
    const rows = getAbTestingVariantEventRows(experiment)
    const discoveryRow = rows.find((row) => row.label.includes('Discovery form'))
    expect(discoveryRow).toBeDefined()
    expect(discoveryRow?.comparison).toBe('conceptual')
    expect(discoveryRow?.cells.find((c) => c.variant.key === 'concept')?.value).toBe(14)
    expect(discoveryRow?.cells.find((c) => c.variant.key === 'control')?.value).toBeNull()
  })

  it('excludes the conceptual metric from the winner comparison', () => {
    const experiment = experimentWith('conceptual')
    const results = getAbTestingComparativeResults(experiment)
    expect(results).toHaveLength(1)
    expect(results[0].metricLabel).toContain('Qualified')
    const summary = getAbTestingComparisonSummary(experiment, results)
    expect(summary.status).toBe('variant')
  })

  it('does not synthesize a phantom primary metric for a conceptual-only test', () => {
    const experiment = {
      ...baseExperiment(),
      primaryMetric: 'Discovery form starts',
      trackedMetrics: [
        { _key: 'm-1', key: 'discovery-form-starts', label: 'Discovery form starts', role: 'diagnostic', comparison: 'conceptual', source: 'vercelEvent', eventName: 'discovery_form_start', unit: 'events' },
      ],
      successTrackers: [],
      performanceSignals: [],
    }
    // No comparative metric exists, so there is nothing to compare — and the
    // primaryMetric name must NOT be synthesized into a phantom "needs comparison" row.
    expect(getAbTestingComparativeResults(experiment)).toEqual([])
  })

  it('blocks when the SAME concept-only metric is marked comparative (control data missing)', () => {
    const experiment = experimentWith('comparative')
    expect(isAbTestingMeasurementBlocked(experiment)).toBe(true)
    expect(getAbTestingDisplayStatus(experiment)).toBe('blocked')
    // And now it does participate in the comparison set.
    expect(getAbTestingComparativeResults(experiment).length).toBe(2)
  })
})

describe('Multiple linked signals', () => {
  it('prefers the real drain readout over a stale placeholder signal in the comparison', () => {
    const experiment = {
      ...baseExperiment(),
      trackedMetrics: [
        { _key: 'm-1', key: 'qualified-discovery-call-clicks', label: 'Qualified discovery-call clicks', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'qualified_discovery_call_click', unit: 'events' },
      ],
      successTrackers: [
        { _key: 't-1', title: 'Primary lift', trackerType: 'metricRule', metricKeys: ['qualified-discovery-call-clicks'], condition: 'increase' },
      ],
      performanceSignals: [
        // Stale placeholder linked FIRST: matches by label, no variantKey, non-numeric change.
        {
          _id: 'signal-placeholder',
          title: 'QA baseline',
          provider: 'vercel',
          status: 'new',
          metrics: [{ _key: 'p1', label: 'Qualified discovery-call clicks', value: 0, unit: 'events', change: 'QA baseline before rollout' }],
        },
        // Real drain readout SECOND.
        {
          _id: 'signal-drain',
          title: 'readout',
          provider: 'vercel',
          status: 'reviewed',
          metrics: [
            { _key: 'e-c', label: 'Control visits', value: 300, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
            { _key: 'e-v', label: 'Concept visits', value: 300, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
            { _key: 'q-v', label: 'concept qualified', value: 30, unit: 'events', variantKey: 'concept', eventName: 'qualified_discovery_call_click', change: '+50% vs control' },
            { _key: 'q-c', label: 'control qualified', value: 20, unit: 'events', variantKey: 'control', eventName: 'qualified_discovery_call_click' },
          ],
        },
      ],
    }

    const results = getAbTestingComparativeResults(experiment)
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('variant')
    expect(getAbTestingComparisonSummary(experiment, results).status).toBe('variant')
  })
})

describe('sample-size gating (the dashboard scenario)', () => {
  // Mirrors the live readout: control 0 / concept 5 on the primary, and a 3-vs-3
  // guardrail whose rate delta reads as "-14%" purely from the visit denominators.
  function scenarioExperiment() {
    return {
      ...baseExperiment(),
      performanceSignals: [
        {
          _id: 'signal-drain',
          title: 'readout',
          provider: 'vercel',
          status: 'reviewed',
          metrics: [
            { _key: 'e-c', label: 'Control visits', value: 256, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
            { _key: 'e-v', label: 'Concept visits', value: 299, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
            { _key: 'q-v', label: 'concept qualified', value: 5, unit: 'events', variantKey: 'concept', eventName: 'qualified_discovery_call_click', change: '+500% vs control' },
            { _key: 'q-c', label: 'control qualified', value: 0, unit: 'events', variantKey: 'control', eventName: 'qualified_discovery_call_click' },
            { _key: 'w-v', label: 'concept work', value: 3, unit: 'events', variantKey: 'concept', eventName: 'view_work_click', change: '-14% vs control' },
            { _key: 'w-c', label: 'control work', value: 3, unit: 'events', variantKey: 'control', eventName: 'view_work_click' },
          ],
        },
      ],
    }
  }

  it('says "No winner" on the primary when control has no events', () => {
    const results = getAbTestingComparativeResults(scenarioExperiment())
    const qualified = results.find((r) => r.metricLabel.includes('Qualified'))
    expect(qualified?.winnerLabel).toBe('No winner yet')
    expect(qualified?.status).toBe('needsComparison')
  })

  it('does not declare a winner on a 3-vs-3 guardrail (too few events)', () => {
    const results = getAbTestingComparativeResults(scenarioExperiment())
    const work = results.find((r) => r.metricLabel.includes('Work exploration'))
    expect(work?.status).toBe('even')
    expect(work?.winnerLabel).toBe('Too few events')
  })

  it('does NOT raise a guardrail-failing insight on the noisy 3-vs-3 guardrail', () => {
    const insights = buildAbTestingInsights({ ...emptyData(), experiments: [scenarioExperiment()] })
    expect(insights.some((i) => /guardrail failing/i.test(i.title))).toBe(false)
    expect(insights.some((i) => /enough events/i.test(i.title))).toBe(true)
  })

  it('STILL raises a guardrail-failing insight on a real drop with enough events', () => {
    const experiment = {
      ...baseExperiment(),
      performanceSignals: [
        {
          _id: 'signal-drain',
          title: 'readout',
          provider: 'vercel',
          status: 'reviewed',
          metrics: [
            { _key: 'e-c', label: 'Control visits', value: 1000, unit: 'visits', variantKey: 'control', eventName: 'experiment_exposure' },
            { _key: 'e-v', label: 'Concept visits', value: 1000, unit: 'visits', variantKey: 'concept', eventName: 'experiment_exposure' },
            { _key: 'q-v', label: 'concept qualified', value: 45, unit: 'events', variantKey: 'concept', eventName: 'qualified_discovery_call_click', change: '+12% vs control' },
            { _key: 'q-c', label: 'control qualified', value: 40, unit: 'events', variantKey: 'control', eventName: 'qualified_discovery_call_click' },
            { _key: 'w-v', label: 'concept work', value: 50, unit: 'events', variantKey: 'concept', eventName: 'view_work_click', change: '-50% vs control' },
            { _key: 'w-c', label: 'control work', value: 100, unit: 'events', variantKey: 'control', eventName: 'view_work_click' },
          ],
        },
      ],
    }
    const insights = buildAbTestingInsights({ ...emptyData(), experiments: [experiment] })
    expect(insights.some((i) => /guardrail failing/i.test(i.title))).toBe(true)
  })
})

function emptyData() {
  return {
    calendarItems: [],
    campaigns: [],
    funnels: [],
    analyticsSources: [],
    audienceProfiles: [],
    messagePillars: [],
    proofPoints: [],
    ctas: [],
    trackingRules: [],
    qualityGates: [],
    experiments: [],
    performanceSignals: [],
    channels: [],
    linkItems: [],
    researchProjects: [],
    researchResults: [],
    researchRuns: [],
    researchPlans: [],
    templates: [],
  }
}

/* ------------------------------------------------------------------ */
/*  Measurement wiring: template <-> drain <-> events stay in sync     */
/* ------------------------------------------------------------------ */

import { conversionEventsFromExperiment } from '@/lib/marketing/drainSink'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const AB_WORKSPACE_SOURCE = readFileSync(
  new URL('../src/sanity/components/marketing/AbTestingWorkspace.tsx', import.meta.url),
  'utf8',
)

// Everything that can fire a client analytics event: the analytics lib plus the
// components that call trackEvent(...) inline (home CTAs, chat widget, forms).
function readTreeSource(relDir: string): string {
  const dir = fileURLToPath(new URL(relDir, import.meta.url))
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'))
    .join('\n')
}

const EVENT_FIRING_SOURCE = [
  readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'),
  readTreeSource('../src/components'),
].join('\n')

describe('experiment measurement wiring', () => {
  // Metric rows shaped exactly like the "Create homepage test" template seeds.
  const templateShapedMetrics = [
    { key: 'qualified-discovery-call-clicks', label: 'Qualified discovery-call clicks', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'qualified_discovery_call_click', unit: 'events' },
    { key: 'discovery-calls-booked', label: 'Discovery calls booked', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'discovery_call_booked', unit: 'events' },
    { key: 'work-exploration-clicks', label: 'Work exploration clicks', role: 'guardrail', comparison: 'comparative', source: 'vercelEvent', eventName: 'view_work_click', unit: 'events' },
    { key: 'top-navbar-clicks', label: 'Top navbar clicks', role: 'diagnostic', comparison: 'comparative', source: 'vercelEvent', eventName: 'nav_click', unit: 'events' },
    { key: 'discovery-form-starts', label: 'Discovery form starts', role: 'diagnostic', comparison: 'conceptual', source: 'vercelEvent', eventName: 'discovery_form_start', unit: 'events' },
    { key: 'chat-messages-sent', label: 'Chat messages sent', role: 'diagnostic', comparison: 'conceptual', source: 'vercelEvent', eventName: 'chat_message_sent', unit: 'events' },
  ]

  it('the drain derives every template metric as a conversion event (incl. bookings + chat)', () => {
    const events = conversionEventsFromExperiment({ _id: 'x', trackedMetrics: templateShapedMetrics })
    const byName = Object.fromEntries(events.map((event) => [event.eventName, event]))

    expect(byName['discovery_call_booked']).toMatchObject({ comparison: 'comparative' })
    expect(byName['qualified_discovery_call_click']).toMatchObject({ comparison: 'comparative' })
    // Conceptual metrics are still captured per variant but never block or pick winners.
    expect(byName['chat_message_sent']).toMatchObject({ comparison: 'conceptual' })
    expect(byName['discovery_form_start']).toMatchObject({ comparison: 'conceptual' })
    // Deduped, and the exposure event is never a conversion.
    expect(events.map((event) => event.eventName)).not.toContain('experiment_exposure')
    expect(new Set(events.map((event) => event.eventName)).size).toBe(events.length)
  })

  it('every event the homepage template tracks is actually fired somewhere on the client', () => {
    for (const metric of templateShapedMetrics) {
      expect(
        EVENT_FIRING_SOURCE.includes(`'${metric.eventName}'`),
        `Template tracks "${metric.eventName}" but nothing in analytics.ts or src/components fires it`,
      ).toBe(true)
    }
  })

  it('the blanket button_click event is never registered as an experiment metric', () => {
    // button_click is deliberately general-analytics-only: registering it as an A/B
    // metric would pollute conversion comparisons with every incidental click.
    expect(AB_WORKSPACE_SOURCE.includes("eventName: 'button_click'")).toBe(false)
  })

  it('new homepage tests start their measurement window at creation', () => {
    expect(
      AB_WORKSPACE_SOURCE.includes('measurementStart: new Date().toISOString()'),
      'The create-test template must stamp measurementStart so all metrics share one window',
    ).toBe(true)
  })
})
