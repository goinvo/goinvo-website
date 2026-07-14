/**
 * Pure helpers for turning Vercel Web Analytics drain payloads into per-variant
 * A/B test readouts. No Next.js or Sanity imports so the parsing/aggregation
 * logic can be unit-tested in isolation and reused by the drain route.
 *
 * Privacy: these helpers only ever read experiment dimensions
 * (experiment_id, flag_key, variant, page_path, event name) and aggregate
 * counts. They never read, copy, or return raw visitor identifiers.
 */

export interface DrainEvent {
  type: 'pageview' | 'event'
  eventName: string | null
  data: Record<string, unknown>
  url?: string
  count: number
}

export interface ExperimentDimensions {
  experimentId: string
  flagKey: string
  variant: string
  pagePath: string
}

export interface DrainAggregate extends ExperimentDimensions {
  eventName: string
  count: number
}

export interface DrainSignalVariant {
  key: string
  label: string
}

export interface DrainConversionEvent {
  eventName: string
  label: string
  unit?: string
  // 'conceptual' metrics are captured per variant but never get a control-vs-variant
  // lift (they may only fire on one variant). Defaults to comparative.
  comparison?: 'comparative' | 'conceptual'
}

export interface DrainSignalConfig {
  variants: DrainSignalVariant[]
  conversionEvents: DrainConversionEvent[]
  exposureEventName?: string
}

export interface DrainSignalMetric {
  _key: string
  _type: 'performanceMetric'
  label: string
  value: number
  unit: string
  variantKey: string
  eventName: string
  change?: string
}

/**
 * Per-variant SESSION engagement: sessions / bounceRate / averageSessionDuration.
 * Now sourced FIRST-PARTY from the on-page engagement beacon (visible time +
 * bounce), rolled up by drain-cron from the reserved `__eng_*` KV fields — the
 * same reliable pipeline as the exposure/conversion counts. Stored alongside
 * (not inside) the per-event count metrics so older signals without this field
 * still load and render.
 */
export interface DrainSignalVariantEngagement {
  _key: string
  _type: 'performanceVariantEngagement'
  variantKey: string
  sessions?: number
  bounceRate?: number
  averageSessionDuration?: number
}

/** Raw per-variant engagement input (from the first-party engagement rollup). */
export interface VariantEngagementInput {
  variantKey: string
  sessions?: number
  bounceRate?: number
  averageSessionDuration?: number
}

export const DEFAULT_EXPOSURE_EVENT = 'experiment_exposure'

const DIMENSION_KEYS = ['experiment_id', 'flag_key', 'variant', 'page_path'] as const

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function asCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value))
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed))
  }
  return 1
}

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'metric'
}

export function normalizeDrainPagePath(value: string | undefined): string {
  if (!value) return '/'
  let path = value.trim()
  if (!path) return '/'
  // Drop protocol/host if an absolute URL was supplied.
  const protocolMatch = path.match(/^https?:\/\/[^/]+(\/.*)?$/i)
  if (protocolMatch) path = protocolMatch[1] || '/'
  path = path.split('#')[0] || '/'
  path = path.split('?')[0] || '/'
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/+$/, '') || '/'
}

function coerceEventData(raw: Record<string, unknown>): Record<string, unknown> {
  const candidate = raw.eventData ?? raw.data ?? raw.payload ?? raw.properties ?? raw.props
  let data: Record<string, unknown> = {}
  if (typeof candidate === 'string' && candidate.trim()) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>
      }
    } catch {
      data = {}
    }
  } else if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    data = { ...(candidate as Record<string, unknown>) }
  }

  // Some drain formats place the experiment dimensions at the top level rather
  // than inside eventData. Backfill any missing dimension keys.
  for (const key of DIMENSION_KEYS) {
    if (data[key] === undefined && raw[key] !== undefined) data[key] = raw[key]
  }
  return data
}

function normalizeRawEvent(raw: unknown): DrainEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>

  const eventName =
    asString(record.eventName) ||
    asString(record.name) ||
    asString(record.event_name) ||
    asString(record.event) ||
    ''
  const typeHint = (
    asString(record.type) ||
    asString(record.eventType) ||
    asString(record.event_type)
  ).toLowerCase()
  const data = coerceEventData(record)
  const url =
    asString(record.url) ||
    asString(record.href) ||
    asString(record.path) ||
    asString(record.page) ||
    asString(data.page_path) ||
    undefined

  let type: DrainEvent['type']
  if (typeHint.includes('pageview') || typeHint.includes('page_view')) {
    type = 'pageview'
  } else if (eventName) {
    type = 'event'
  } else if (url) {
    type = 'pageview'
  } else {
    return null
  }

  return {
    type,
    eventName: eventName || null,
    data,
    url,
    count: asCount(record.count ?? record.quantity),
  }
}

/**
 * Accepts the range of shapes a Vercel Web Analytics drain can deliver:
 * a JSON array, `{ events: [...] }`, `{ data: [...] }`, a single event object,
 * or newline-delimited JSON. Unparseable entries are dropped rather than thrown.
 */
export function parseVercelDrainPayload(body: unknown): DrainEvent[] {
  let rawEvents: unknown[] = []

  if (typeof body === 'string') {
    const trimmed = body.trim()
    if (!trimmed) return []
    try {
      rawEvents = collectRawEvents(JSON.parse(trimmed))
    } catch {
      // Fall back to newline-delimited JSON.
      rawEvents = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    }
  } else {
    rawEvents = collectRawEvents(body)
  }

  return rawEvents
    .map(normalizeRawEvent)
    .filter((event): event is DrainEvent => Boolean(event))
}

function collectRawEvents(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (Array.isArray(record.events)) return record.events
    if (Array.isArray(record.data)) return record.data
    if (Array.isArray(record.batch)) return record.batch
    if (Array.isArray(record.rows)) return record.rows
    // Looks like a single event.
    if (record.eventName || record.name || record.event || record.type || record.url) {
      return [record]
    }
  }
  return []
}

export function extractExperimentDimensions(event: DrainEvent): ExperimentDimensions | null {
  const data = event.data
  const experimentId = asString(data.experiment_id) || asString(data.experimentId)
  const variant = asString(data.variant)
  if (!experimentId || !variant) return null

  const flagKey = asString(data.flag_key) || asString(data.flagKey)
  const pagePath = normalizeDrainPagePath(asString(data.page_path) || asString(data.pagePath) || event.url)

  return { experimentId, flagKey, variant, pagePath }
}

export interface AggregateOptions {
  flagKey?: string
  experimentId?: string
}

/**
 * Counts events grouped by experiment_id, flag_key, variant, page_path, and
 * event name. Pageviews are recorded under the `page_view` name; custom events
 * keep their emitted name (e.g. experiment_exposure, qualified_discovery_call_click).
 */
export function aggregateDrainEvents(events: DrainEvent[], options: AggregateOptions = {}): DrainAggregate[] {
  const grouped = new Map<string, DrainAggregate>()

  for (const event of events) {
    const dimensions = extractExperimentDimensions(event)
    if (!dimensions) continue
    if (options.flagKey && dimensions.flagKey !== options.flagKey) continue
    if (options.experimentId && dimensions.experimentId !== options.experimentId) continue

    const eventName = event.type === 'pageview' ? 'page_view' : event.eventName
    if (!eventName) continue

    const key = [dimensions.experimentId, dimensions.flagKey, dimensions.variant, dimensions.pagePath, eventName].join(' ')
    const existing = grouped.get(key)
    if (existing) {
      existing.count += event.count
    } else {
      grouped.set(key, { ...dimensions, eventName, count: event.count })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.experimentId !== b.experimentId) return a.experimentId.localeCompare(b.experimentId)
    if (a.variant !== b.variant) return a.variant.localeCompare(b.variant)
    return a.eventName.localeCompare(b.eventName)
  })
}

export function sumAggregateCount(aggregates: DrainAggregate[], variantKey: string, eventName: string): number {
  return aggregates
    .filter((aggregate) => aggregate.variant === variantKey && aggregate.eventName === eventName)
    .reduce((total, aggregate) => total + aggregate.count, 0)
}

function formatLift(lift: number): string {
  const sign = lift > 0 ? '+' : ''
  const rounded = Math.abs(lift) >= 10 ? Math.round(lift) : Math.round(lift * 10) / 10
  return `${sign}${rounded}% vs control`
}

function getControlVariant(variants: DrainSignalVariant[]): DrainSignalVariant | undefined {
  return variants.find((variant) => variant.key === 'control') || variants[0]
}

/**
 * Builds the per-variant performance metrics a marketingPerformanceSignal needs
 * so the marketing suite can compute visits, event counts, event rates, and a
 * control-vs-variant comparison. Treatment metrics are emitted before control so
 * the comparison reads the treatment's `change` (lift vs control).
 */
export function buildSignalMetricsFromAggregates(
  aggregates: DrainAggregate[],
  config: DrainSignalConfig,
): DrainSignalMetric[] {
  const exposureEvent = config.exposureEventName || DEFAULT_EXPOSURE_EVENT
  const variants = config.variants.filter((variant) => variant.key)
  const control = getControlVariant(variants)
  const metrics: DrainSignalMetric[] = []

  const exposureByVariant = new Map<string, number>()
  for (const variant of variants) {
    const value = sumAggregateCount(aggregates, variant.key, exposureEvent)
    exposureByVariant.set(variant.key, value)
    metrics.push({
      _key: `${slugifyKey(variant.key)}-${slugifyKey(exposureEvent)}`,
      _type: 'performanceMetric',
      label: `${variant.label} visits / exposures`,
      value,
      unit: 'visits',
      variantKey: variant.key,
      eventName: exposureEvent,
    })
  }

  const controlExposure = control ? exposureByVariant.get(control.key) ?? 0 : 0

  for (const conversion of config.conversionEvents) {
    if (!conversion.eventName) continue
    const unit = conversion.unit || 'events'
    const controlValue = control ? sumAggregateCount(aggregates, control.key, conversion.eventName) : 0
    const controlRate = controlExposure > 0 ? controlValue / controlExposure : null

    const treatments = variants.filter((variant) => !control || variant.key !== control.key)
    const ordered = [...treatments, ...(control ? [control] : [])]

    for (const variant of ordered) {
      const value = sumAggregateCount(aggregates, variant.key, conversion.eventName)
      const metric: DrainSignalMetric = {
        _key: `${slugifyKey(variant.key)}-${slugifyKey(conversion.eventName)}`,
        _type: 'performanceMetric',
        label: `${variant.label} ${conversion.label}`,
        value,
        unit,
        variantKey: variant.key,
        eventName: conversion.eventName,
      }

      const isTreatment = !control || variant.key !== control.key
      const isComparative = conversion.comparison !== 'conceptual'
      const variantExposure = exposureByVariant.get(variant.key) ?? 0
      if (isComparative && isTreatment && controlRate !== null && controlRate > 0 && variantExposure > 0) {
        const treatmentRate = value / variantExposure
        const lift = ((treatmentRate - controlRate) / controlRate) * 100
        if (Number.isFinite(lift)) metric.change = formatLift(lift)
      }

      metrics.push(metric)
    }
  }

  return metrics
}

export interface DrainSignalSummaryInput {
  metrics: DrainSignalMetric[]
  variants: DrainSignalVariant[]
  conversionEvents: DrainConversionEvent[]
  exposureEventName?: string
}

/**
 * Produces a short, factual interpretation line for the signal. No visitor data,
 * only counts and which variant leads per tracked event.
 */
export function summarizeDrainSignal(input: DrainSignalSummaryInput): string {
  const exposureEvent = input.exposureEventName || DEFAULT_EXPOSURE_EVENT
  const control = getControlVariant(input.variants)
  const treatment = input.variants.find((variant) => !control || variant.key !== control.key)

  const exposureFor = (variantKey?: string) =>
    input.metrics.find((metric) => metric.variantKey === variantKey && metric.eventName === exposureEvent)?.value ?? 0

  const controlExposure = exposureFor(control?.key)
  const treatmentExposure = exposureFor(treatment?.key)

  let treatmentLeads = 0
  let controlLeads = 0
  for (const conversion of input.conversionEvents) {
    const treatmentMetric = input.metrics.find(
      (metric) => metric.variantKey === treatment?.key && metric.eventName === conversion.eventName,
    )
    if (!treatmentMetric?.change) continue
    const lift = Number(treatmentMetric.change.match(/-?\d+(?:\.\d+)?/)?.[0] || '0')
    if (lift > 0) treatmentLeads += 1
    else if (lift < 0) controlLeads += 1
  }

  const exposureLine = `${treatment?.label || 'Variant'} ${treatmentExposure} visits, ${control?.label || 'Control'} ${controlExposure} visits.`
  const total = input.conversionEvents.length
  const leaderLine = total > 0
    ? ` ${treatment?.label || 'Variant'} leads on ${treatmentLeads} of ${total} tracked event${total === 1 ? '' : 's'} by rate; ${control?.label || 'control'} leads on ${controlLeads}.`
    : ''
  return `Auto-updated from the Vercel Web Analytics drain. ${exposureLine}${leaderLine}`.trim()
}

export function drainSignalId(flagKey: string): string {
  return `marketing-vercel-drain-${slugifyKey(flagKey)}`
}

/**
 * Builds the backward-compatible per-variant engagement entries persisted on the
 * signal. Only variants in `variantKeys` are kept (drops "(not set)" rows), and
 * each numeric field is included only when finite. Returns [] when nothing is
 * supplied so the field is simply omitted on older/empty signals.
 */
export function buildVariantEngagementEntries(
  inputs: VariantEngagementInput[] | undefined,
  variantKeys: Iterable<string>,
): DrainSignalVariantEngagement[] {
  if (!inputs || inputs.length === 0) return []
  const allowed = new Set<string>()
  for (const key of variantKeys) {
    const trimmed = key?.trim()
    if (trimmed) allowed.add(trimmed)
  }
  const entries: DrainSignalVariantEngagement[] = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const variantKey = input.variantKey?.trim()
    if (!variantKey || (allowed.size > 0 && !allowed.has(variantKey)) || seen.has(variantKey)) continue
    seen.add(variantKey)
    const entry: DrainSignalVariantEngagement = {
      _key: `engagement-${slugifyKey(variantKey)}`,
      _type: 'performanceVariantEngagement',
      variantKey,
    }
    if (typeof input.sessions === 'number' && Number.isFinite(input.sessions)) entry.sessions = Math.max(0, Math.round(input.sessions))
    if (typeof input.bounceRate === 'number' && Number.isFinite(input.bounceRate)) entry.bounceRate = input.bounceRate
    if (typeof input.averageSessionDuration === 'number' && Number.isFinite(input.averageSessionDuration)) entry.averageSessionDuration = input.averageSessionDuration
    entries.push(entry)
  }
  return entries
}

export interface DrainSignalDocInput {
  signalId: string
  experimentId: string
  experimentTitle?: string
  flagKey: string
  pageUrl?: string
  metrics: DrainSignalMetric[]
  variantEngagement?: DrainSignalVariantEngagement[]
  interpretation: string
  metricDate?: string
  periodStart?: string
  periodEnd?: string
}

export interface DrainSignalDoc {
  _id: string
  _type: 'marketingPerformanceSignal'
  title: string
  provider: 'vercel'
  status: string
  signalType: string
  sourceLabel: string
  experiment: { _type: 'reference'; _ref: string }
  pageUrl?: string
  metricDate?: string
  periodStart?: string
  periodEnd?: string
  metrics: DrainSignalMetric[]
  variantEngagement?: DrainSignalVariantEngagement[]
  interpretation: string
  recommendation: string
  rawImport: string
}

function isAbsoluteUrl(value: string | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value))
}

/**
 * Builds the Sanity marketingPerformanceSignal document fields the drain route
 * sets on each upsert. The _id is deterministic per flag so repeated drains
 * update one signal instead of creating duplicates.
 */
export function buildDrainPerformanceSignalDoc(input: DrainSignalDocInput): DrainSignalDoc {
  const doc: DrainSignalDoc = {
    _id: input.signalId,
    _type: 'marketingPerformanceSignal',
    title: `${input.experimentTitle || input.flagKey} – Vercel variant readout`,
    provider: 'vercel',
    status: 'reviewed',
    signalType: 'abTestVariantReadout',
    sourceLabel: 'Vercel Web Analytics drain',
    experiment: { _type: 'reference', _ref: input.experimentId },
    metrics: input.metrics,
    interpretation: input.interpretation,
    recommendation: 'Review the leading variant before changing rollout percentages, then record the decision on the experiment.',
    rawImport: JSON.stringify(
      {
        generatedFrom: 'vercel-web-analytics-drain',
        flagKey: input.flagKey,
        // Counts only — no visitor identifiers are stored.
        metrics: input.metrics.map((metric) => ({
          label: metric.label,
          value: metric.value,
          unit: metric.unit,
          variantKey: metric.variantKey,
          eventName: metric.eventName,
          change: metric.change,
        })),
      },
      null,
      2,
    ),
  }

  if (isAbsoluteUrl(input.pageUrl)) doc.pageUrl = input.pageUrl
  if (input.metricDate) doc.metricDate = input.metricDate
  if (input.periodStart) doc.periodStart = input.periodStart
  if (input.periodEnd) doc.periodEnd = input.periodEnd
  // Optional, backward-compatible: only set when present so older signals and
  // count-only drain paths keep their existing shape.
  if (input.variantEngagement && input.variantEngagement.length > 0) doc.variantEngagement = input.variantEngagement

  return doc
}
