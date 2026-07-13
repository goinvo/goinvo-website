import {
  isAllowedExperimentVariant,
  normalizeExperimentPath,
  pageExperiments,
} from '@/lib/experiments/registry'

// Only events emitted by src/lib/analytics.ts (plus Web Vitals) may enter the
// experiment counters. New tracked events must be added intentionally.
const ALLOWED_EXPERIMENT_EVENTS = new Set([
  'experiment_exposure',
  'experiment_conversion',
  'cta_click',
  'button_click',
  'qualified_discovery_call_click',
  'discovery_form_start',
  'discovery_call_booked',
  'chat_message_sent',
  'case_study_click',
  'form_submit',
  'nav_click',
  'scroll_depth',
  'external_link_click',
  'view_work_click',
  'CLS',
  'FCP',
  'INP',
  'LCP',
  'TTFB',
])

export type ValidatedExperimentBeacon = {
  kind: 'engagement' | 'event'
  experimentId: string
  flagKey: string
  variant: string
  pagePath: string
  eventName?: string
}

export function validateExperimentBeacon(
  body: Record<string, unknown>,
): ValidatedExperimentBeacon | null {
  const flagKey = String(body.flag_key ?? body.flagKey ?? '').trim()
  const experimentId = String(body.experiment_id ?? body.experimentId ?? '').trim()
  const variant = String(body.variant ?? '').trim()
  const rawPagePath = String(body.page_path ?? body.pagePath ?? '').trim()
  if (!rawPagePath.startsWith('/')) return null
  const pagePath = normalizeExperimentPath(rawPagePath)

  const experiment = pageExperiments.find(
    (candidate) =>
      candidate.status === 'running' &&
      candidate.id === experimentId &&
      candidate.flagKey === flagKey,
  )
  if (!experiment) return null
  if (!isAllowedExperimentVariant(experiment, variant)) return null
  if (normalizeExperimentPath(experiment.targetPath) !== pagePath) return null

  if (String(body.type ?? '').trim() === 'engagement') {
    return { kind: 'engagement', experimentId, flagKey, variant, pagePath }
  }

  const eventName = String(body.eventName ?? body.event ?? body.name ?? '').trim()
  if (!ALLOWED_EXPERIMENT_EVENTS.has(eventName)) return null
  return { kind: 'event', experimentId, flagKey, variant, pagePath, eventName }
}
