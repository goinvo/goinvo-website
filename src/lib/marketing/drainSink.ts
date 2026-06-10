/**
 * Shared "sink" for A/B drain readouts: turns per-flag aggregate counts into a
 * Sanity marketingPerformanceSignal upsert, and provides the Vercel KV plumbing
 * used by the first-party collector + rollup cron.
 *
 * Both ingestion paths funnel through `upsertDrainSignalForFlag` so there is one
 * source of truth for how a signal is built and linked:
 *   - POST /api/marketing/analytics/vercel-drain  (batch replay / external drain)
 *   - GET  /api/marketing/analytics/drain-cron     (rolls up KV counters)
 *
 * Privacy: only experiment dimensions and counts are ever read or stored — never
 * raw visitor identifiers.
 */
import type { SanityClient } from '@sanity/client'
import { createClient as createKvClient, type VercelKV } from '@vercel/kv'
import {
  buildDrainPerformanceSignalDoc,
  buildSignalMetricsFromAggregates,
  buildVariantEngagementEntries,
  drainSignalId,
  summarizeDrainSignal,
  DEFAULT_EXPOSURE_EVENT,
  type DrainAggregate,
  type DrainConversionEvent,
  type DrainSignalVariant,
  type VariantEngagementInput,
} from '@/lib/marketing/vercelDrain'

export type ExperimentForDrain = {
  _id: string
  title?: string
  flagKey?: string
  targetPath?: string
  variants?: Array<{ key?: string; label?: string }>
  trackedMetrics?: Array<{ key?: string; label?: string; comparison?: string; source?: string; eventName?: string; unit?: string }>
  performanceSignals?: Array<{ _ref?: string }>
}

const EXPERIMENT_FOR_DRAIN_PROJECTION = `{
  _id, title, flagKey, targetPath, variants[]{key, label},
  trackedMetrics[]{key, label, comparison, source, eventName, unit},
  performanceSignals
}`

export function getDrainSiteOrigin(): string {
  return (process.env.MARKETING_SITE_ORIGIN || 'https://www.goinvo.com').replace(/\/+$/, '')
}

export function conversionEventsFromExperiment(experiment: ExperimentForDrain): DrainConversionEvent[] {
  const seen = new Set<string>()
  const events: DrainConversionEvent[] = []
  for (const metric of experiment.trackedMetrics || []) {
    const eventName = metric.eventName?.trim()
    if (!eventName || eventName === DEFAULT_EXPOSURE_EVENT) continue
    if (metric.source && metric.source !== 'vercelEvent') continue
    if (seen.has(eventName)) continue
    seen.add(eventName)
    // Conceptual metrics are still captured per variant; they just skip the lift.
    events.push({
      eventName,
      label: metric.label?.trim() || eventName,
      unit: metric.unit?.trim() || 'events',
      comparison: metric.comparison === 'conceptual' ? 'conceptual' : 'comparative',
    })
  }
  return events
}

export function variantsFromExperiment(experiment: ExperimentForDrain): DrainSignalVariant[] {
  return (experiment.variants || [])
    .map((variant) => ({ key: variant.key?.trim() || '', label: variant.label?.trim() || variant.key?.trim() || '' }))
    .filter((variant) => variant.key)
}

export interface UpsertDrainResult {
  updated: boolean
  warnings: string[]
}

/**
 * Builds and upserts the deterministic readout signal for one flag from its
 * aggregated per-variant counts, then links it to the experiment. Returns
 * whether a signal was written plus any warnings (missing experiment, too few
 * variants). `status` is set only on creation so a designer can re-triage.
 */
export async function upsertDrainSignalForFlag(
  client: SanityClient,
  flagKey: string,
  flagAggregates: DrainAggregate[],
  options: { metricDate?: string; variantEngagement?: VariantEngagementInput[] } = {},
): Promise<UpsertDrainResult> {
  const experiment = await client.fetch<ExperimentForDrain | null>(
    `*[_type == "marketingExperiment" && flagKey == $flagKey][0]${EXPERIMENT_FOR_DRAIN_PROJECTION}`,
    { flagKey },
  )

  if (!experiment) {
    return { updated: false, warnings: [`No marketingExperiment found for flag key "${flagKey}".`] }
  }

  const variants = variantsFromExperiment(experiment)
  if (variants.length < 2) {
    return {
      updated: false,
      warnings: [`Experiment "${experiment.title || experiment._id}" needs at least two variants before a readout can be built.`],
    }
  }

  const conversionEvents = conversionEventsFromExperiment(experiment)
  const metrics = buildSignalMetricsFromAggregates(flagAggregates, {
    variants,
    conversionEvents,
    exposureEventName: DEFAULT_EXPOSURE_EVENT,
  })
  const interpretation = summarizeDrainSignal({ metrics, variants, conversionEvents, exposureEventName: DEFAULT_EXPOSURE_EVENT })

  // Per-variant session engagement is optional and backward-compatible: the
  // first-party drain-cron rollup supplies it, and it is kept only for known
  // variant keys.
  const variantEngagement = buildVariantEngagementEntries(
    options.variantEngagement,
    variants.map((variant) => variant.key),
  )

  const metricDate = options.metricDate || new Date().toISOString().slice(0, 10)
  const signalId = drainSignalId(flagKey)
  const pageUrl = experiment.targetPath
    ? `${getDrainSiteOrigin()}${experiment.targetPath.startsWith('/') ? '' : '/'}${experiment.targetPath}`
    : undefined
  const doc = buildDrainPerformanceSignalDoc({
    signalId,
    experimentTitle: experiment.title,
    flagKey,
    pageUrl,
    metrics,
    variantEngagement,
    interpretation,
    metricDate,
    periodEnd: metricDate,
  })

  const { _id, _type, status, ...computedFields } = doc
  await client.createIfNotExists({ _id, _type, title: doc.title, provider: doc.provider, status })
  await client.patch(_id).set(computedFields).commit()

  const alreadyLinked = (experiment.performanceSignals || []).some((ref) => ref?._ref === signalId)
  if (!alreadyLinked) {
    await client
      .patch(experiment._id)
      .setIfMissing({ performanceSignals: [] })
      .append('performanceSignals', [{ _type: 'reference', _ref: signalId, _key: `drain-${signalId}` }])
      .commit()
  }

  return { updated: true, warnings: [] }
}

/* ------------------------------------------------------------------ */
/*  Vercel KV plumbing for the first-party collector + rollup cron     */
/* ------------------------------------------------------------------ */

const KV_PREFIX = 'marketing:abdrain:'
/** Set of flag keys that have collected at least one event. */
export const KV_FLAGS_KEY = `${KV_PREFIX}flags`
/** Field delimiter for the per-flag counter hash. None of variant key, page
 *  path, or event name contain a pipe, so it round-trips safely. */
const FIELD_DELIM = '|'

export function kvCounterKey(flagKey: string): string {
  return `${KV_PREFIX}counter:${flagKey}`
}

export function kvCounterField(variant: string, pagePath: string, eventName: string): string {
  return [variant, pagePath, eventName].join(FIELD_DELIM)
}

export function parseKvCounterField(field: string): { variant: string; pagePath: string; eventName: string } | null {
  const parts = field.split(FIELD_DELIM)
  if (parts.length < 3) return null
  const variant = parts[0]
  const eventName = parts[parts.length - 1]
  const pagePath = parts.slice(1, -1).join(FIELD_DELIM)
  if (!variant || !pagePath || !eventName) return null
  return { variant, pagePath, eventName }
}

/* ------------------------------------------------------------------ */
/*  First-party ENGAGEMENT fields (time-on-page + bounce)              */
/* ------------------------------------------------------------------ */
//
// Engagement is stored on the SAME per-flag counter hash as the event counts,
// but under RESERVED field "event names" that begin with `__eng_` so they can
// never collide with a real tracked event. The field still encodes
// variant | pagePath | <reserved> so it round-trips through kvCounterField /
// parseKvCounterField, but the rollup treats `__eng_*` as engagement, NOT events.
export const ENG_FIELD_PREFIX = '__eng_'
/** Reserved engagement "event name" suffixes (the 3rd field segment). */
export const ENG_SESSIONS_FIELD = '__eng_sessions'
export const ENG_VISIBLE_MS_FIELD = '__eng_visible_ms'
export const ENG_BOUNCES_FIELD = '__eng_bounces'

/** True when a parsed counter field's event name is a reserved engagement field. */
export function isEngagementField(eventName: string): boolean {
  return eventName.startsWith(ENG_FIELD_PREFIX)
}

export interface EngagementCounters {
  variant: string
  pagePath: string
  sessions: number
  visibleMs: number
  bounces: number
}

/**
 * Reads the reserved `__eng_*` fields out of a KV counter hash and groups them
 * per (variant, pagePath). Counts/durations only — no visitor identifiers exist
 * in the hash. Non-finite / negative values are ignored. Rows without sessions
 * are dropped (no denominator).
 */
export function engagementCountersFromKvHash(
  hash: Record<string, unknown> | null | undefined,
): EngagementCounters[] {
  if (!hash) return []
  const grouped = new Map<string, EngagementCounters>()
  for (const [field, raw] of Object.entries(hash)) {
    const parsed = parseKvCounterField(field)
    if (!parsed || !isEngagementField(parsed.eventName)) continue
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value)) continue
    const key = `${parsed.variant}${FIELD_DELIM}${parsed.pagePath}`
    let counters = grouped.get(key)
    if (!counters) {
      counters = { variant: parsed.variant, pagePath: parsed.pagePath, sessions: 0, visibleMs: 0, bounces: 0 }
      grouped.set(key, counters)
    }
    if (parsed.eventName === ENG_SESSIONS_FIELD) counters.sessions += value
    else if (parsed.eventName === ENG_VISIBLE_MS_FIELD) counters.visibleMs += value
    else if (parsed.eventName === ENG_BOUNCES_FIELD) counters.bounces += value
  }
  return Array.from(grouped.values()).filter((counters) => counters.sessions > 0)
}

/**
 * Turns the per-(variant, pagePath) engagement counters into the per-variant
 * VariantEngagementInput[] the readout signal expects:
 *   sessions               = __eng_sessions (summed across that variant's pages)
 *   averageSessionDuration = (__eng_visible_ms / __eng_sessions) / 1000  seconds
 *   bounceRate             = __eng_bounces / __eng_sessions               (0..1)
 * Counters for the same variant across multiple page paths are summed before the
 * ratios are computed, so the averages stay weighted by session volume.
 */
export function variantEngagementFromKvHash(
  hash: Record<string, unknown> | null | undefined,
): VariantEngagementInput[] {
  const byVariant = new Map<string, { sessions: number; visibleMs: number; bounces: number }>()
  for (const counters of engagementCountersFromKvHash(hash)) {
    let totals = byVariant.get(counters.variant)
    if (!totals) {
      totals = { sessions: 0, visibleMs: 0, bounces: 0 }
      byVariant.set(counters.variant, totals)
    }
    totals.sessions += counters.sessions
    totals.visibleMs += counters.visibleMs
    totals.bounces += counters.bounces
  }
  const inputs: VariantEngagementInput[] = []
  for (const [variant, totals] of byVariant) {
    if (totals.sessions <= 0) continue
    inputs.push({
      variantKey: variant,
      sessions: totals.sessions,
      averageSessionDuration: totals.visibleMs / totals.sessions / 1000,
      bounceRate: Math.min(1, Math.max(0, totals.bounces / totals.sessions)),
    })
  }
  return inputs
}

/**
 * Returns a Vercel KV client when configured, else null so collection is a
 * graceful no-op in local/dev environments without KV. Accepts the standard
 * Vercel KV env names as well as the Upstash Redis equivalents.
 */
export function getKvClient(): VercelKV | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return createKvClient({ url, token })
}

/** Turns a KV counter hash (field -> count) into drain aggregates for one flag. */
export function aggregatesFromKvHash(flagKey: string, hash: Record<string, unknown> | null | undefined): DrainAggregate[] {
  if (!hash) return []
  const aggregates: DrainAggregate[] = []
  for (const [field, raw] of Object.entries(hash)) {
    const parsed = parseKvCounterField(field)
    if (!parsed) continue
    // Reserved `__eng_*` engagement fields live on the same hash but are NOT
    // events — exclude them so they never appear as fake event counts.
    if (isEngagementField(parsed.eventName)) continue
    const count = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(count) || count <= 0) continue
    aggregates.push({
      experimentId: '',
      flagKey,
      variant: parsed.variant,
      pagePath: parsed.pagePath,
      eventName: parsed.eventName,
      count: Math.round(count),
    })
  }
  return aggregates
}
