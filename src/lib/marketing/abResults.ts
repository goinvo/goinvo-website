/**
 * The A/B test verdicts, shared by the Studio's A/B tab and Marqueta's weekly report so
 * the two can never disagree. Moved verbatim out of src/sanity/components/marketing/domain.ts
 * (which imports it back); pure: data in, verdicts out.
 */
import type { AbTestingComparisonResult, AbTestingComparisonStatus, AbTestingComparisonSummary, AbTestingSignalMetricRecord, AbTestingVariantEventRow, AbTestingVariantOption, ExperimentSuccessTracker, ExperimentTrackedMetric, MarketingExperiment, MarketingPerformanceSignal, PerformanceSignalMetric, SelectOption } from '@/sanity/tools/marketingTool'
import { slugify, uniqueById } from '@/lib/marketing'


export function findAbTestingSignalMetric(trackedMetric: ExperimentTrackedMetric, signals: MarketingPerformanceSignal[]) {
  const trackedKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  const matches: Array<{ signal: MarketingPerformanceSignal; metric: PerformanceSignalMetric }> = []

  for (const signal of signals) {
    for (const metric of signal.metrics || []) {
      const signalKeys = [metric.label, metric.eventName].map(normalizeAbTestingMetricKey).filter(Boolean)
      if (signalKeys.length === 0) continue
      const exactMatch = signalKeys.some((signalKey) => trackedKeys.has(signalKey))
      const fuzzyMatch = signalKeys.some((signalKey) => Array.from(trackedKeys).some((trackedKey) =>
        trackedKey.length > 5 && (signalKey.includes(trackedKey) || trackedKey.includes(signalKey)),
      ))
      if (exactMatch || fuzzyMatch) matches.push({ signal, metric })
    }
  }

  if (matches.length === 0) return null

  // When several signals match (e.g. a stale QA placeholder linked alongside the
  // real Vercel drain readout), prefer the metric that carries a usable
  // comparison value, then one with an explicit variant key, over a metric that
  // matched only by label. This keeps the winner readout on the real data.
  return (
    matches.find((match) => parseAbTestingMetricChange(match.metric.change) !== null) ||
    matches.find((match) => normalizeAbTestingMetricKey(match.metric.variantKey)) ||
    matches[0]
  )
}

export function getAbTestingMetricCandidateKeys(metric: ExperimentTrackedMetric) {
  return new Set([metric.key, metric.label, metric.eventName].map(normalizeAbTestingMetricKey).filter(Boolean))
}

// Minimum per-variant EVENT count before a directional winner / guardrail call is
// trusted. Distinct from AB_MIN_EXPOSURES_PER_VARIANT (which gates visits): a test
// can have plenty of visits but only a handful of conversions, where a rate delta
// (e.g. 3 vs 3 events reading as "-14%") is just denominator variance, not signal.
// A low bar that kills single-digit noise without changing the call once a metric
// has a real number of events.
export const AB_MIN_EVENTS_PER_VARIANT = 10

export interface AbTestingMetricCounts {
  control: number | null
  variant: number | null
}

/** Per-variant event counts for one tracked metric (null when unresolved). */
export function getAbTestingMetricVariantCounts(
  experiment: MarketingExperiment,
  trackedMetric: ExperimentTrackedMetric,
): AbTestingMetricCounts {
  const variants = getAbTestingVariantOptions(experiment)
  if (variants.length < 2) return { control: null, variant: null }
  const controlVariant = variants.find((v) => normalizeAbTestingMetricKey(v.key) === 'control') || variants[0]
  const treatmentVariant = variants.find((v) => v.key !== controlVariant.key) || variants[1]
  const records = getAbTestingSignalMetricRecords(experiment)
  const valueFor = (variant: AbTestingVariantOption) =>
    numericPerformanceMetricValue(findAbTestingMetricForVariant(records, variant, trackedMetric, false)?.metric)
  return { control: valueFor(controlVariant), variant: valueFor(treatmentVariant) }
}

/**
 * True when either variant has too few events to trust a directional call. Only
 * applies when both counts are resolvable (a change-only signal with no per-variant
 * counts keeps its existing behavior).
 */
export function abTestingMetricIsUnderpowered(counts: AbTestingMetricCounts): boolean {
  return (
    counts.control !== null &&
    counts.variant !== null &&
    Math.min(counts.control, counts.variant) < AB_MIN_EVENTS_PER_VARIANT
  )
}

export function getAbTestingComparativeResults(experiment: MarketingExperiment, limit = 4): AbTestingComparisonResult[] {
  const signals = getExperimentScopedSignals(experiment)
  const trackedMetrics = getAbTestingComparableMetrics(experiment)
  const controlLabel = getAbTestingControlVariantLabel(experiment)
  const variantLabel = getAbTestingTreatmentVariantLabel(experiment)

  return trackedMetrics.slice(0, limit).map((trackedMetric, index) => {
    const match = findAbTestingSignalMetric(trackedMetric, signals)
    const tracker = findAbTestingTrackerForMetric(experiment, trackedMetric)
    const condition = getAbTestingMetricComparisonCondition(trackedMetric, tracker)
    const metricLabel = trackedMetric.label || trackedMetric.key || trackedMetric.eventName || experiment.primaryMetric || 'Success metric'
    const metricRole = getAbTestingMetricRoleLabel(trackedMetric, tracker)
    const key = trackedMetric._key || trackedMetric.key || trackedMetric.label || `${metricLabel}-${index}`

    if (!match) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Needs comparison',
        detail: `Link ${controlLabel} vs ${variantLabel} data for this metric.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    const counts = getAbTestingMetricVariantCounts(experiment, trackedMetric)
    // Control has no events for this metric → no baseline to compare against, so
    // there is no winner to call (a "+∞%" lift off a zero baseline is not meaningful).
    if (counts.control === 0 && counts.variant === 0) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'No events yet',
        detail: `${controlLabel} and ${variantLabel} both have zero events in this measurement window.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    if (counts.control === 0) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'No winner yet',
        detail: `${controlLabel} has no events for this metric yet, so there is no baseline to compare ${variantLabel} against.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    const changeValue = parseAbTestingMetricChange(match.metric.change)
    if (changeValue === null) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'No winner yet',
        detail: `The linked signal exists, but it does not say how ${variantLabel} compares with ${controlLabel}.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    // Too few events on either side to trust a directional call — a rate delta on a
    // handful of events (e.g. 3 vs 3) is denominator noise, not a real winner.
    if (abTestingMetricIsUnderpowered(counts)) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Too few events',
        detail: `Only ${counts.control} vs ${counts.variant} events so far — too few to call a winner on this metric.`,
        status: 'even',
        changeValue,
        score: 10,
      }
    }

    if (Math.abs(changeValue) < 0.01) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Even',
        detail: `${controlLabel} and ${variantLabel} are even on this metric.`,
        status: 'even',
        changeValue,
        score: 12,
      }
    }

    const lowerIsBetter = isAbTestingDecreaseCondition(condition) || isAbTestingNotIncreaseCondition(condition)
    const variantWins = lowerIsBetter ? changeValue < 0 : changeValue > 0
    const status: AbTestingComparisonStatus = variantWins ? 'variant' : 'control'
    const winnerLabel = variantWins ? `Early direction: ${variantLabel}` : `Early direction: ${controlLabel}`
    const movement = formatAbTestingComparisonChange(match.metric.change, changeValue)
    const position = changeValue > 0 ? 'above' : 'below'

    return {
      key,
      metricLabel,
      metricRole,
      winnerLabel,
      detail: `${variantWins
        ? `${variantLabel} is ${movement} ${position} ${controlLabel}.`
        : `${variantLabel} is ${movement} ${position} ${controlLabel}, which favors ${controlLabel} for this rule.`} Directional only; this is not a statistical-significance calculation.`,
      status,
      changeValue,
      score: Math.min(100, Math.max(14, Math.abs(changeValue))),
    }
  })
}

export function getAbTestingVariantEventRows(experiment: MarketingExperiment): AbTestingVariantEventRow[] {
  const variants = getAbTestingVariantOptions(experiment)
  const metricRecords = getAbTestingSignalMetricRecords(experiment)
  const exposureMetric: ExperimentTrackedMetric = {
    _key: 'experiment-exposure',
    key: 'experiment-exposure',
    label: 'Visits / exposures',
    eventName: 'experiment_exposure',
    unit: 'visits',
  }

  const exposureCells = variants.map((variant) => {
    const metric = findAbTestingMetricForVariant(metricRecords, variant, exposureMetric, true)
    const value = numericPerformanceMetricValue(metric?.metric)
    return {
      variant,
      value,
      denominator: null,
      rate: null,
      unit: metric?.metric.unit || 'visits',
    }
  })
  const exposureByVariant = new Map(exposureCells.map((cell) => [cell.variant.key, cell.value]))

  // Show every tracked metric in the table — including conceptual (single-variant)
  // ones — so the readout captures them. Conceptual rows are tagged so the
  // measurement-gap check below can exclude them from "blocked" status.
  const explicitMetrics = (experiment.trackedMetrics || []).filter(
    (metric) => metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim(),
  )
  const rowMetrics = explicitMetrics.length > 0 ? explicitMetrics : getAbTestingComparableMetrics(experiment)
  const trackedRows = rowMetrics
    .filter((metric) => !isAbTestingExposureMetric(metric))
    .map((trackedMetric, index) => {
      const role = getAbTestingMetricRoleLabel(trackedMetric, findAbTestingTrackerForMetric(experiment, trackedMetric))
      const cells = variants.map((variant) => {
        const metric = findAbTestingMetricForVariant(metricRecords, variant, trackedMetric, false)
        const value = numericPerformanceMetricValue(metric?.metric)
        const denominator = exposureByVariant.get(variant.key) ?? null
        const rate = value !== null && denominator !== null && denominator > 0 ? (value / denominator) * 100 : null
        return {
          variant,
          value,
          denominator,
          rate,
          unit: metric?.metric.unit || trackedMetric.unit || 'events',
        }
      })

      return {
        key: trackedMetric._key || trackedMetric.key || trackedMetric.eventName || trackedMetric.label || `metric-${index}`,
        label: trackedMetric.label || trackedMetric.eventName || trackedMetric.key || 'Tracked event',
        role,
        comparison: trackedMetric.comparison === 'conceptual' ? 'conceptual' : 'comparative',
        cells,
      }
    })

  return [
    {
      key: 'visits-exposures',
      label: 'Visits / exposures',
      isExposure: true,
      comparison: 'comparative',
      cells: exposureCells,
    },
    ...trackedRows,
  ]
}

// Minimum per-variant exposures before a readout is trusted to show a rate or
// declare a winner. A low bar to prevent "winner on 1 visit" / >100% rates from
// tiny samples — not a statistical-significance test.
export const AB_MIN_EXPOSURES_PER_VARIANT = 30

export function getAbTestingMeasurementGaps(experiment: MarketingExperiment) {
  const variants = getAbTestingVariantOptions(experiment)
  const rows = getAbTestingVariantEventRows(experiment)
  const exposureRow = rows.find((row) => row.isExposure)
  // Only comparative metrics gate measurement readiness. Conceptual metrics are
  // single-variant captures (e.g. concept-only discovery form starts) and must
  // never block the test from being called measurable.
  const metricRows = rows.filter((row) => !row.isExposure && row.comparison !== 'conceptual')
  const missingVariantBreakout = variants.length < 2
  const missingExposure = !exposureRow || exposureRow.cells.some((cell) => cell.value === null)
  const missingEvents = metricRows.length === 0 || metricRows.some((row) => row.cells.some((cell) => cell.value === null))
  const missingRates = metricRows.some((row) => row.cells.some((cell) => cell.value !== null && cell.denominator === null))
  // Too few exposures per variant to trust any rate or winner.
  const lowSample =
    !exposureRow ||
    exposureRow.cells.length === 0 ||
    exposureRow.cells.some((cell) => (cell.value ?? 0) < AB_MIN_EXPOSURES_PER_VARIANT)

  return {
    missingVariantBreakout,
    missingExposure,
    missingEvents,
    missingRates,
    lowSample,
    ready: !missingVariantBreakout && !missingExposure && !missingEvents && !missingRates && !lowSample,
  }
}

export function isAbTestingMeasurementReady(experiment: MarketingExperiment) {
  return getAbTestingMeasurementGaps(experiment).ready
}

export function isAbTestingMeasurementBlocked(experiment: MarketingExperiment) {
  if (experiment.decision || experiment.status === 'archived') return false
  if (experiment.status !== 'running' && experiment.status !== 'reviewing') return false
  return !isAbTestingMeasurementReady(experiment)
}

export function getAbTestingComparisonSummary(experiment: MarketingExperiment, results = getAbTestingComparativeResults(experiment)): AbTestingComparisonSummary {
  if (results.length === 0) {
    return {
      label: 'No metrics yet',
      detail: 'Add the metrics this test should compare.',
      status: 'needsComparison',
    }
  }

  const pendingCount = results.filter((result) => result.status === 'needsComparison').length
  const variantCount = results.filter((result) => result.status === 'variant').length
  const controlCount = results.filter((result) => result.status === 'control').length
  const evenCount = results.filter((result) => result.status === 'even').length
  const controlLabel = getAbTestingControlVariantLabel(experiment)
  const variantLabel = getAbTestingTreatmentVariantLabel(experiment)

  if (pendingCount === results.length) {
    return {
      label: 'No winner yet',
      detail: 'No comparison values are ready yet.',
      status: 'needsComparison',
    }
  }

  if (variantCount > controlCount && variantCount >= evenCount) {
    return {
      label: `${variantLabel} leading`,
      detail: `${variantCount} of ${results.length} metric${results.length === 1 ? '' : 's'} favor the test version.`,
      status: 'variant',
    }
  }

  if (controlCount > variantCount && controlCount >= evenCount) {
    return {
      label: `${controlLabel} leading`,
      detail: `${controlCount} of ${results.length} metric${results.length === 1 ? '' : 's'} favor the current version.`,
      status: 'control',
    }
  }

  if (pendingCount > 0) {
    return {
      label: 'No winner yet',
      detail: `${results.length - pendingCount} compared, ${pendingCount} still need control-vs-variant data.`,
      status: 'needsComparison',
    }
  }

  return {
    label: 'Mixed result',
    detail: evenCount === results.length ? 'The compared metrics are even.' : 'No version has a clear lead across the tracked metrics.',
    status: 'even',
  }
}

export function getAbTestingComparableMetrics(experiment: MarketingExperiment): ExperimentTrackedMetric[] {
  // Only comparative metrics decide the winner. Conceptual (single-variant)
  // metrics are captured in the readout but excluded here.
  const trackedMetrics = (experiment.trackedMetrics || []).filter(
    (metric) => (metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim()) && metric.comparison !== 'conceptual',
  )
  if (trackedMetrics.length > 0) return trackedMetrics
  // Only synthesize a primary metric from the name when there are NO explicit
  // tracked metrics at all. If the test has only conceptual metrics, return none
  // so a phantom "needs comparison" row never inflates the winner scoreboard.
  const hasAnyExplicitMetric = (experiment.trackedMetrics || []).some(
    (metric) => metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim(),
  )
  if (!hasAnyExplicitMetric && experiment.primaryMetric?.trim()) {
    return [{
      _key: 'primary',
      key: slugify(experiment.primaryMetric),
      label: experiment.primaryMetric,
      role: 'primary',
    }]
  }
  return []
}

export function findAbTestingTrackerForMetric(experiment: MarketingExperiment, trackedMetric: ExperimentTrackedMetric) {
  const metricKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  return (experiment.successTrackers || []).find((tracker) => {
    const trackerKeys = (tracker.metricKeys || []).map(normalizeAbTestingMetricKey).filter(Boolean)
    if (trackerKeys.length === 0) return false
    return trackerKeys.some((trackerKey) => metricKeys.has(trackerKey))
  }) || null
}

export function getAbTestingMetricComparisonCondition(trackedMetric: ExperimentTrackedMetric, tracker: ExperimentSuccessTracker | null) {
  const trackerCondition = normalizeAbTestingCondition(tracker?.condition)
  if (trackerCondition) return trackerCondition
  const role = normalizeAbTestingCondition(trackedMetric.role)
  if (role.includes('guardrail')) return 'not-decrease'
  return 'increase'
}

export function getAbTestingMetricRoleLabel(trackedMetric: ExperimentTrackedMetric, tracker: ExperimentSuccessTracker | null) {
  const role = trackedMetric.role?.trim()
  if (role) return labelFor([
    { title: 'Primary', value: 'primary' },
    { title: 'Guardrail', value: 'guardrail' },
    { title: 'Diagnostic', value: 'diagnostic' },
  ], role) || role
  return tracker?.title || undefined
}

export function getAbTestingControlVariantLabel(experiment: MarketingExperiment) {
  const control = (experiment.variants || []).find((variant) => variant.key === 'control')
  return control?.label?.trim() || 'Control'
}

export function getAbTestingTreatmentVariantLabel(experiment: MarketingExperiment) {
  const treatment = (experiment.variants || []).find((variant) => variant.key && variant.key !== 'control')
  return treatment?.label?.trim() || 'Variant'
}

export function getAbTestingVariantOptions(experiment: MarketingExperiment): AbTestingVariantOption[] {
  const variants = (experiment.variants || [])
    .map((variant, index) => {
      const label = variant.label?.trim() || variant.key?.trim() || `Variant ${index + 1}`
      const key = variant.key?.trim() || normalizeAbTestingMetricKey(label) || `variant-${index + 1}`
      return { key, label }
    })
    .filter((variant) => variant.key || variant.label)

  if (variants.length > 0) return variants
  return [
    { key: 'control', label: 'Control' },
    { key: 'variant', label: 'Variant' },
  ]
}

export function getAbTestingSignalMetricRecords(experiment: MarketingExperiment): AbTestingSignalMetricRecord[] {
  return getExperimentScopedSignals(experiment).flatMap((signal) =>
    (signal.metrics || []).map((metric) => ({ signal, metric })),
  )
}

export function findAbTestingMetricForVariant(
  records: AbTestingSignalMetricRecord[],
  variant: AbTestingVariantOption,
  trackedMetric: ExperimentTrackedMetric,
  exposureMetric: boolean,
) {
  let best: { score: number; record: AbTestingSignalMetricRecord } | null = null
  for (const record of records) {
    const variantScore = getAbTestingMetricVariantScore(record.metric, variant)
    if (variantScore <= 0) continue
    const metricScore = getAbTestingMetricMatchScore(record.metric, trackedMetric, exposureMetric)
    if (metricScore <= 0) continue
    const score = variantScore + metricScore
    if (!best || score > best.score) best = { score, record }
  }
  return best?.record || null
}

export function getAbTestingMetricVariantScore(metric: PerformanceSignalMetric, variant: AbTestingVariantOption) {
  const variantKey = normalizeAbTestingMetricKey(variant.key)
  const variantLabel = normalizeAbTestingMetricKey(variant.label)
  const explicitVariant = normalizeAbTestingMetricKey(metric.variantKey)

  if (explicitVariant) {
    return explicitVariant === variantKey || explicitVariant === variantLabel ? 100 : 0
  }

  const metricText = normalizeAbTestingMetricKey([metric.label, metric.eventName, metric.unit].filter(Boolean).join(' '))
  if (!metricText) return 0
  if (variantKey && metricText.includes(variantKey)) return 35
  if (variantLabel && metricText.includes(variantLabel)) return 30
  if (variantKey === 'control' && (metricText.includes('current') || metricText.includes('baseline'))) return 25
  return 0
}

export function getAbTestingMetricMatchScore(metric: PerformanceSignalMetric, trackedMetric: ExperimentTrackedMetric, exposureMetric: boolean) {
  const labelKey = normalizeAbTestingMetricKey(metric.label)
  const eventKey = normalizeAbTestingMetricKey(metric.eventName)

  if (exposureMetric) {
    const exposureKeys = ['experiment-exposure', 'page-view', 'page-views', 'visit', 'visits', 'visitor', 'visitors', 'session', 'sessions']
    if (exposureKeys.includes(eventKey) || exposureKeys.includes(labelKey)) return 90
    if (exposureKeys.some((key) => labelKey.includes(key) || eventKey.includes(key))) return 45
    return 0
  }

  const trackedKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  const metricKeys = [labelKey, eventKey].filter(Boolean)
  if (metricKeys.some((metricKey) => trackedKeys.has(metricKey))) return 90
  if (metricKeys.some((metricKey) => Array.from(trackedKeys).some((trackedKey) =>
    trackedKey.length > 5 && (metricKey.includes(trackedKey) || trackedKey.includes(metricKey)),
  ))) return 45
  return 0
}

export function numericPerformanceMetricValue(metric?: PerformanceSignalMetric) {
  if (!metric || typeof metric.value !== 'number' || !Number.isFinite(metric.value)) return null
  return metric.value
}

export type AbTestingVariantEngagement = {
  sessions: number | null
  bounceRate: number | null
  averageSessionDuration: number | null
}

/**
 * Reads per-variant session engagement (visits, bounce rate, avg time on page)
 * off the experiment's linked signals. Optional + backward-compatible: signals
 * without a variantEngagement field simply yield empty cells (rendered as '—').
 * Matches a variant by its key (case-insensitive) so it lines up with the same
 * variant columns the event table renders.
 */
export function getAbTestingVariantEngagement(
  experiment: MarketingExperiment,
  variant: AbTestingVariantOption,
): AbTestingVariantEngagement {
  const target = normalizeAbTestingMetricKey(variant.key)
  const targetLabel = normalizeAbTestingMetricKey(variant.label)
  for (const signal of uniqueById((experiment.performanceSignals || []).filter(Boolean))) {
    for (const entry of signal.variantEngagement || []) {
      const entryKey = normalizeAbTestingMetricKey(entry.variantKey)
      if (!entryKey || (entryKey !== target && entryKey !== targetLabel)) continue
      return {
        sessions: typeof entry.sessions === 'number' && Number.isFinite(entry.sessions) ? entry.sessions : null,
        bounceRate: typeof entry.bounceRate === 'number' && Number.isFinite(entry.bounceRate) ? entry.bounceRate : null,
        averageSessionDuration:
          typeof entry.averageSessionDuration === 'number' && Number.isFinite(entry.averageSessionDuration)
            ? entry.averageSessionDuration
            : null,
      }
    }
  }
  return { sessions: null, bounceRate: null, averageSessionDuration: null }
}

export function isAbTestingExposureMetric(metric: ExperimentTrackedMetric) {
  const keys = getAbTestingMetricCandidateKeys(metric)
  return Array.from(keys).some((key) => ['experiment-exposure', 'page-view', 'page-views', 'visit', 'visits', 'visitor', 'visitors', 'session', 'sessions'].includes(key))
}

export function formatAbTestingComparisonChange(rawChange: string | undefined, changeValue: number) {
  const trimmed = rawChange?.trim()
  if (trimmed && /%/.test(trimmed)) return trimmed
  const sign = changeValue > 0 ? '+' : ''
  return `${sign}${changeValue}%`
}

export function normalizeAbTestingMetricKey(value?: string) {
  if (!value?.trim() || !/[a-z0-9]/i.test(value)) return ''
  return slugify(value)
}

export function normalizeAbTestingCondition(value?: string) {
  return (value || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseAbTestingMetricChange(value?: string) {
  const match = value?.match(/[-+]?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function isAbTestingDecreaseCondition(condition: string) {
  return ['decrease', 'lower', 'less-than', 'below'].some((token) => condition.includes(token)) && !isAbTestingNotDecreaseCondition(condition)
}

export function isAbTestingNotDecreaseCondition(condition: string) {
  return condition.includes('not-decrease') || condition.includes('no-drop') || condition.includes('hold-steady')
}

export function isAbTestingNotIncreaseCondition(condition: string) {
  return condition.includes('not-increase')
}

export function signalMeasurementTimestamp(signal: MarketingPerformanceSignal) {
  const value = signal.periodEnd || signal.metricDate || signal._updatedAt || signal.periodStart
  if (!value) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isAbTestingSignalInMeasurementWindow(
  experiment: MarketingExperiment,
  signal: MarketingPerformanceSignal,
) {
  if (signal.experiment?._id !== experiment._id) return false
  if (!experiment.measurementStart) return true
  const windowStart = new Date(experiment.measurementStart).getTime()
  const signalTimestamp = signalMeasurementTimestamp(signal)
  return Number.isFinite(windowStart) && signalTimestamp !== null && signalTimestamp >= windowStart
}

export function getExperimentScopedSignals(experiment: MarketingExperiment) {
  return uniqueById((experiment.performanceSignals || []).filter(Boolean)).filter((signal) =>
    isAbTestingSignalInMeasurementWindow(experiment, signal),
  )
}

export function labelFor(options: SelectOption[], value?: string) {
  return options.find((option) => option.value === value)?.title || value || ''
}
