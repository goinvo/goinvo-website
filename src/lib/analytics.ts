import { track as trackVercelEvent } from '@vercel/analytics'

type EventParamValue = string | number | boolean | null | undefined
type EventParams = Record<string, EventParamValue>

export interface ExperimentAnalyticsParams extends Record<string, string> {
  experiment_id: string
  flag_key: string
  variant: string
  page_path: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    va?: (event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => void
    vaq?: [string, unknown?][]
  }
}

export function trackEvent(name: string, params?: EventParams) {
  if (typeof window === 'undefined') return

  ensureClientAnalyticsQueues()
  const enrichedParams = withExperimentContext(params)
  if (window.gtag) {
    window.gtag('event', name, enrichedParams)
  }
  trackVercelEvent(name, enrichedParams)
  beaconExperimentEvent(name)
}

// Mirror experiment-tagged events to our first-party collector so the A/B
// measurement suite gets real per-variant counts. Vercel Web Analytics does not
// forward custom events to our endpoint, so we also beacon them here (counts
// only, never visitor identifiers). No-ops outside an experiment or where
// sendBeacon is unavailable, and never throws.
function beaconExperimentEvent(name: string) {
  if (!experimentContext) return
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  try {
    const body = JSON.stringify({
      eventName: name,
      flag_key: experimentContext.flag_key,
      experiment_id: experimentContext.experiment_id,
      variant: experimentContext.variant,
      page_path: experimentContext.page_path,
    })
    navigator.sendBeacon('/api/marketing/analytics/collect', new Blob([body], { type: 'application/json' }))
  } catch {
    // Best-effort: collection must never affect the page.
  }
}

function ensureClientAnalyticsQueues() {
  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args)
    })
  window.va =
    window.va ||
    ((event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => {
      ;(window.vaq = window.vaq || []).push([event, properties])
    })
}

let experimentContext: ExperimentAnalyticsParams | null = null
const trackedExperimentExposures = new Set<string>()

export function setExperimentContext(context: ExperimentAnalyticsParams | null) {
  experimentContext = context
}

export function withExperimentContext(params?: EventParams): EventParams | undefined {
  if (!experimentContext) return params
  return {
    ...experimentContext,
    ...(params || {}),
  }
}

export function trackExperimentExposure(params: ExperimentAnalyticsParams) {
  const exposureKey = `${params.experiment_id}:${params.variant}:${params.page_path}`
  if (trackedExperimentExposures.has(exposureKey)) return

  trackedExperimentExposures.add(exposureKey)
  trackEvent('experiment_exposure', params)
}

export function getExperimentContextForAnalytics() {
  return experimentContext
}

export function trackExperimentConversion(params: {
  conversion_type: string
  conversion_name?: string
  conversion_location?: string
  conversion_url?: string
}) {
  if (!experimentContext) return
  trackEvent('experiment_conversion', params)
}

export function resetExperimentAnalyticsForTests() {
  experimentContext = null
  trackedExperimentExposures.clear()
}

// CTA button interactions
export function trackCtaClick(params: {
  cta_text: string
  cta_location: string
  cta_url?: string
}) {
  trackEvent('cta_click', params)
  trackExperimentConversion({
    conversion_type: 'cta_click',
    conversion_name: params.cta_text,
    conversion_location: params.cta_location,
    conversion_url: params.cta_url,
  })
}

// Qualified discovery-call CTA clicks (homepage A/B primary metric).
// Emits a specific event name so experiment readouts compare control vs concept
// without depending on the broad experiment_conversion event.
export function trackQualifiedDiscoveryCallClick(params: {
  cta_text: string
  cta_location: string
  cta_url?: string
}) {
  trackEvent('qualified_discovery_call_click', params)
  // Keep the generic cta_click for existing dashboards, but do NOT fire the broad
  // experiment_conversion event here: the homepage readout compares the specific
  // qualified_discovery_call_click event, and experiment_conversion is emitted by
  // many other conversions (form submits, other CTAs), which would muddy it.
  trackEvent('cta_click', params)
}

// Visitor begins the discovery-call booking flow (e.g. picks a Calendly time).
// Distinct from the click that opens the scheduler so the homepage test can read
// a real form-start signal instead of an unfired placeholder metric.
export function trackDiscoveryFormStart(params: {
  form_name: string
  form_location: string
}) {
  trackEvent('discovery_form_start', params)
}

// Case study card clicks on /work
export function trackCaseStudyClick(params: {
  case_study_title: string
  case_study_slug: string
  click_location: string
}) {
  trackEvent('case_study_click', params)
}

// Form completions
export function trackFormSubmit(params: {
  form_name: string
  form_location: string
}) {
  trackEvent('form_submit', params)
  trackExperimentConversion({
    conversion_type: 'form_submit',
    conversion_name: params.form_name,
    conversion_location: params.form_location,
  })
}

// Header nav interactions
export function trackNavClick(params: {
  nav_item: string
  nav_type: 'desktop' | 'mobile'
  nav_location: string
}) {
  trackEvent('nav_click', params)
}

// Scroll depth milestones
export function trackScrollDepth(params: {
  percent: number
  page_path: string
}) {
  trackEvent('scroll_depth', params)
}

// Outbound link clicks
export function trackExternalLink(params: {
  url: string
  text: string
  location: string
}) {
  trackEvent('external_link_click', params)
}
