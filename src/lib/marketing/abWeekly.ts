/**
 * Marqueta's weekly A/B report: every running test, its Studio verdict, the counts
 * behind it, what changed this week, and how far each comparison is from a real answer.
 *
 * The verdicts are the Studio's own (abResults.ts), so Slack and the A/B tab never
 * disagree. On top of them, a two-proportion z-test on visitors who did the thing:
 * the Studio's calls are directional by design, and a weekly report read by the team
 * needs to say when a gap is still noise. Pure: experiments in, report out.
 */
import { getAbTestingComparisonSummary, getAbTestingComparativeResults, getAbTestingVariantEventRows } from '@/lib/marketing/abResults'
import { escapeSlackText } from '@/lib/marketing/slackText'
import { actionsRow, openViewButton } from '@/lib/marketing/marquetaStyle'
import { studioViewUrl } from '@/lib/marketing/taskLinks'
import type { MarketingExperiment } from '@/sanity/tools/marketingTool'

/** What the Studio loads for an experiment, minus what the report does not need. */
export const AB_EXPERIMENT_PROJECTION = `{
  _id, title, status, targetPath, flagKey, measurementStart,
  variants[]{_key, key, label},
  primaryMetric,
  trackedMetrics[]{_key, key, label, role, comparison, source, eventName, unit},
  successTrackers[]{_key, title, trackerType, metricKeys, condition, threshold, successWhen},
  "performanceSignals": performanceSignals[]->{_id, title, provider, status, signalType, "experiment": experiment->{_id, title, status}, metricDate, periodStart, periodEnd, metrics[]{_key, label, value, unit, change, variantKey, eventName}}
}`

// ── statistics ───────────────────────────────────────────────────────────────

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z: number) {
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

/** ln(n!) through ln Γ(n+1) (Lanczos, g=7): exact enough for hypergeometric tails. */
function logFactorial(n: number) {
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  const x = n + 1 - 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/**
 * Fisher's exact test, two-sided: the probability of a split of the events at least as
 * unlikely as this one, given the totals. Used when an expected count is under 5, where
 * the z-test's normal approximation is not valid (0 vs 6 read as p = 0.03 under z).
 */
export function fisherExact(control: Arm, variant: Arm) {
  const n1 = control.visitors, n2 = variant.visitors, k = control.events + variant.events, n = n1 + n2
  const logP = (x: number) =>
    logFactorial(n1) - logFactorial(x) - logFactorial(n1 - x) +
    logFactorial(n2) - logFactorial(k - x) - logFactorial(n2 - k + x) -
    (logFactorial(n) - logFactorial(k) - logFactorial(n - k))
  const observed = logP(control.events)
  let p = 0
  for (let x = Math.max(0, k - n2); x <= Math.min(k, n1); x++) {
    const lp = logP(x)
    if (lp <= observed + 1e-7) p += Math.exp(lp)
  }
  return Math.min(1, p)
}

const Z_ALPHA = 1.959964 // two-sided 95%
const Z_POWER = 0.841621 // 80% power

export interface Arm {
  visitors: number
  events: number
}

export type Significance =
  | { kind: 'noData'; reason: string }
  | { kind: 'significant'; pValue: number; higher: 'control' | 'variant'; test: 'z' | 'fisher'; events: number }
  | { kind: 'notYet'; pValue: number; moreVisitorsPerVersion: number | null; test: 'z' | 'fisher'; events: number }

/** Fewer visitors than this per version and the test is not run: the normal approximation lies. */
export const MIN_VISITORS_FOR_STATS = 100

/**
 * Two-proportion z-test (pooled) on the share of visitors who did the thing. When the
 * gap is not significant, how many MORE visitors each version needs for 80% power at
 * the gap seen so far (null when there is no gap at all).
 */
export function compareArms(control: Arm, variant: Arm): Significance {
  if (control.visitors < MIN_VISITORS_FOR_STATS || variant.visitors < MIN_VISITORS_FOR_STATS) {
    return { kind: 'noData', reason: `fewer than ${MIN_VISITORS_FOR_STATS} visitors on a version` }
  }
  if (control.events > control.visitors || variant.events > variant.visitors) {
    return { kind: 'noData', reason: 'more events than visitors, so not a share of visitors' }
  }
  if (control.events + variant.events === 0) return { kind: 'noData', reason: 'no events on either version' }
  const pc = control.events / control.visitors
  const pv = variant.events / variant.visitors
  const pooled = (control.events + variant.events) / (control.visitors + variant.visitors)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.visitors + 1 / variant.visitors))
  const z = se === 0 ? 0 : (pv - pc) / se
  // Expected events per version under "no difference"; under 5 anywhere, use the exact test.
  const events = control.events + variant.events
  const small = Math.min(pooled * control.visitors, pooled * variant.visitors) < 5
  const test = small ? 'fisher' : 'z'
  const pValue = small ? fisherExact(control, variant) : Math.min(1, 2 * (1 - normalCdf(Math.abs(z))))
  if (pValue < 0.05) return { kind: 'significant', pValue, higher: pv > pc ? 'variant' : 'control', test, events }
  if (pc === pv) return { kind: 'notYet', pValue, moreVisitorsPerVersion: null, test, events }
  const mean = (pc + pv) / 2
  const needed = (Z_ALPHA * Math.sqrt(2 * mean * (1 - mean)) + Z_POWER * Math.sqrt(pc * (1 - pc) + pv * (1 - pv))) ** 2 / (pv - pc) ** 2
  return { kind: 'notYet', pValue, moreVisitorsPerVersion: Math.max(0, Math.ceil(needed - Math.min(control.visitors, variant.visitors))), test, events }
}

// ── the report ───────────────────────────────────────────────────────────────

export interface AbSnapshot {
  /** ISO week the snapshot was taken in, e.g. 2026-W47. */
  week: string
  takenAt: string
  /** experiment id -> metric key ('visitors' for exposures) -> version key -> count */
  counts: Record<string, Record<string, Record<string, number>>>
}

export interface AbMetricLine {
  key: string
  label: string
  role: string
  control: Arm
  variant: Arm
  /** The Studio's own call for this metric ("Too few events", "Early direction: …"). */
  studio: string | null
  stats: Significance
  /** Events this week per version, when last week's snapshot has this metric. */
  thisWeek: { control: number; variant: number } | null
}

export interface AbTestReport {
  id: string
  title: string
  path?: string
  since?: string
  verdict: { label: string; detail: string; status: string }
  control: { key: string; label: string; visitors: number; thisWeek: number | null }
  variant: { key: string; label: string; visitors: number; thisWeek: number | null }
  metrics: AbMetricLine[]
}

const ROLE_ORDER: Record<string, number> = { primary: 0, secondary: 1, guardrail: 2, diagnostic: 3 }
const count = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/** One running test, read the way the Studio reads it. Null when it has no two versions to compare. */
export function reportExperiment(experiment: MarketingExperiment, previous?: AbSnapshot): AbTestReport | null {
  const rows = getAbTestingVariantEventRows(experiment)
  const exposure = rows.find((row) => row.isExposure)
  if (!exposure || exposure.cells.length < 2) return null
  const [controlCell, variantCell] = exposure.cells
  const before = previous?.counts[experiment._id]
  const weekDelta = (metric: string, versionKey: string, now: number) => {
    const then = before?.[metric]?.[versionKey]
    return typeof then === 'number' && now >= then ? now - then : null
  }
  const studioResults = getAbTestingComparativeResults(experiment, 20)
  const studioFor = (label: string, key: string) =>
    studioResults.find((result) => result.key === key || result.metricLabel === label)?.winnerLabel ?? null

  const metrics = rows
    .filter((row) => !row.isExposure && row.cells.length >= 2)
    .map((row): AbMetricLine => {
      const control = { visitors: count(controlCell.value), events: count(row.cells[0].value) }
      const variant = { visitors: count(variantCell.value), events: count(row.cells[1].value) }
      const c = weekDelta(row.key, controlCell.variant.key, control.events)
      const v = weekDelta(row.key, variantCell.variant.key, variant.events)
      return {
        key: row.key,
        label: row.label,
        role: (row.role || 'diagnostic').toLowerCase(),
        control,
        variant,
        studio: studioFor(row.label, row.key),
        stats: compareArms(control, variant),
        thisWeek: c !== null && v !== null ? { control: c, variant: v } : null,
      }
    })
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))

  const summary = getAbTestingComparisonSummary(experiment)
  return {
    id: experiment._id,
    title: experiment.title || 'Untitled test',
    path: experiment.targetPath || undefined,
    since: experiment.measurementStart || undefined,
    verdict: { label: summary.label, detail: summary.detail, status: summary.status },
    control: { key: controlCell.variant.key, label: controlCell.variant.label, visitors: count(controlCell.value), thisWeek: weekDelta('visitors', controlCell.variant.key, count(controlCell.value)) },
    variant: { key: variantCell.variant.key, label: variantCell.variant.label, visitors: count(variantCell.value), thisWeek: weekDelta('visitors', variantCell.variant.key, count(variantCell.value)) },
    metrics,
  }
}

/** What to keep so next week can say what changed. */
export function snapshotOf(reports: AbTestReport[], week: string, takenAt: string): AbSnapshot {
  const counts: AbSnapshot['counts'] = {}
  for (const report of reports) {
    const byMetric: Record<string, Record<string, number>> = {
      visitors: { [report.control.key]: report.control.visitors, [report.variant.key]: report.variant.visitors },
    }
    for (const metric of report.metrics) byMetric[metric.key] = { [report.control.key]: metric.control.events, [report.variant.key]: metric.variant.events }
    counts[report.id] = byMetric
  }
  return { week, takenAt, counts }
}

// ── words ────────────────────────────────────────────────────────────────────

const number = (value: number) => value.toLocaleString('en-US')
const rate = (arm: Arm) => (arm.visitors > 0 ? `${((arm.events / arm.visitors) * 100).toFixed(arm.events / arm.visitors < 0.01 ? 2 : 1)}%` : '—')
const pText = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(p < 0.01 ? 3 : 2)}`)

/** "not significant yet (p = 0.71); at this gap, about 25,000 more visitors per version to tell" */
export function significanceWords(stats: Significance, labels: { control: string; variant: string }) {
  switch (stats.kind) {
    case 'noData':
      return `no significance test: ${stats.reason}`
    case 'significant': {
      // Several metrics across several tests are checked each week, so one p < 0.05 on a
      // handful of events is a lead to confirm, not a result to ship on.
      const few = stats.events < 20 ? `, but on only ${stats.events} events: a lead to confirm` : ''
      return `significant at 95% (${pText(stats.pValue)}${stats.test === 'fisher' ? ', exact test' : ''}): ${stats.higher === 'variant' ? labels.variant : labels.control} is higher${few}`
    }
    case 'notYet': {
      const more = stats.moreVisitorsPerVersion
      const need = more === null
        ? 'no gap between the versions so far'
        : more > 200_000
          ? 'at this gap, it would take more than 200,000 more visitors per version to tell'
          : `at this gap, about ${number(Math.max(100, Math.round(more / 100) * 100))} more visitors per version to tell`
      return `not significant yet (${pText(stats.pValue)}); ${need}`
    }
  }
}

function withWeek(total: number, week: number | null) {
  return week === null ? number(total) : `${number(total)} (+${number(week)} this week)`
}

/** The thread reply under Monday's plan: one section per test, metrics in role order. */
export function abReportText(report: AbTestReport): string {
  // Titles and labels are record text: escaped before they become mrkdwn.
  const e = escapeSlackText
  const labels = { control: e(report.control.label), variant: e(report.variant.label) }
  const lines = [
    `*${e(report.title)}* · ${e(report.verdict.label)}`,
    `Visitors: ${labels.control} ${withWeek(report.control.visitors, report.control.thisWeek)} · ${labels.variant} ${withWeek(report.variant.visitors, report.variant.thisWeek)}`,
    ...report.metrics.map((metric) => {
      const week = metric.thisWeek ? ` (this week ${number(metric.thisWeek.control)} vs ${number(metric.thisWeek.variant)})` : ''
      const studio = metric.studio ? `${e(metric.studio)}; ` : ''
      return `• ${e(metric.label)} _(${e(metric.role)})_: ${number(metric.control.events)} (${rate(metric.control)}) vs ${number(metric.variant.events)} (${rate(metric.variant)})${week} — ${studio}${significanceWords(metric.stats, labels)}`
    }),
  ]
  // A section's text is capped at 3000 characters; one past it and Slack refuses the whole reply.
  return lines.join('\n').slice(0, 2900)
}

type Block = Record<string, unknown>

/** The thread reply: a section per test, how to read it, and the Studio's Measure tab. */
export function abThreadBlocks(reports: AbTestReport[], studioBaseUrl?: string, firstWeek = false): Block[] {
  if (reports.length === 0) return []
  const blocks: Block[] = []
  reports.forEach((report, index) => {
    if (index > 0) blocks.push({ type: 'divider' })
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: abReportText(report) } })
  })
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: [
        'Verdicts are the Studio’s. Significance: a two-proportion test on visitors who did each thing (the exact test when counts are small). Several metrics are checked at once, so treat a lone p < 0.05 on few events as a lead.',
        firstWeek ? 'Totals are since each test began; from next week this also says what changed in the week.' : '',
      ].filter(Boolean).join(' '),
    }],
  })
  blocks.push(...actionsRow([openViewButton('abTesting', studioViewUrl(studioBaseUrl, 'abTesting'))], 'mq_ab_footer'))
  return blocks
}

/** Plain text for the notification and for anywhere blocks do not render. */
export function abThreadText(reports: AbTestReport[]) {
  return reports.length ? `A/B results: ${reports.map((report) => `${report.title} (${report.verdict.label})`).join('; ')}` : 'No A/B tests are running.'
}

/** The one line in Monday's plan that points at the thread. */
export function abDigestLine(reports: AbTestReport[]) {
  if (reports.length === 0) return null
  const decided = reports.filter((report) => report.metrics.some((metric) => metric.stats.kind === 'significant' && (metric.role === 'primary' || metric.role === 'guardrail'))).length
  const tests = `${reports.length} A/B test${reports.length === 1 ? '' : 's'} running`
  return `:test_tube: ${tests}${decided ? ` · ${decided} with a significant primary or guardrail result` : ''} · results in the thread`
}
