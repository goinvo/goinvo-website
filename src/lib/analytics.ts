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
  // Avoid double-counting in GA4: when this event carries experiment context it
  // is forwarded to GA4 server-side via the Measurement Protocol (from /collect,
  // keyed off the beacon's ga_client_id), so the client gtag must NOT also send
  // it — the server MP send is its single path to GA4. NON-experiment events keep
  // using window.gtag (GA's normal, general-analytics role).
  if (window.gtag && !experimentContext) {
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
    const identity = getGaIdentity()
    const body = JSON.stringify({
      eventName: name,
      flag_key: experimentContext.flag_key,
      experiment_id: experimentContext.experiment_id,
      variant: experimentContext.variant,
      page_path: experimentContext.page_path,
      // Campaign attribution (utm_*/gclid from the landing URL) so /collect can
      // attribute this event to the ad/channel that drove the visit (paid).
      ...getAttribution(),
      // The GA client_id (from the visitor's own _ga cookie, or the marketing
      // visitor cookie when _ga is blocked) so /collect can forward this event to
      // GA4 via the Measurement Protocol. No new identifier is minted here.
      ga_client_id: identity.clientId,
      ...(identity.sessionId ? { ga_session_id: identity.sessionId } : {}),
    })
    navigator.sendBeacon('/api/marketing/analytics/collect', new Blob([body], { type: 'application/json' }))
  } catch {
    // Best-effort: collection must never affect the page.
  }
}

// First-party marketing visitor cookie (set by the experiments middleware). Used
// as a stable client_id fallback when the _ga cookie is absent (blocked GA), so a
// blocked visitor still has ONE consistent GA4 client_id across their events.
// Kept as a local literal (the canonical constant lives in a server-only module).
const MARKETING_VISITOR_COOKIE = 'goinvo_marketing_visitor_id'

export interface GaIdentity {
  clientId: string
  sessionId?: string
}

/**
 * Reads a cookie value by name from document.cookie. Returns undefined when the
 * cookie is absent or document is unavailable. Never throws.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return undefined
  const prefix = `${name}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length))
      } catch {
        return part.slice(prefix.length)
      }
    }
  }
  return undefined
}

/* --- Campaign attribution (utm_* + gclid) ---------------------------------- */
// Captured from the landing URL into a first-party cookie so a later conversion
// beacon can be tied back to the ad/channel that drove the visit. Not PII —
// campaign params + the Google click id only.
const ATTRIBUTION_COOKIE = 'goinvo_attribution'
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'] as const

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`
  } catch {
    // Best-effort: attribution capture must never affect the page.
  }
}

/**
 * Capture campaign attribution (utm_* + gclid) from the landing URL into a
 * first-party cookie (LAST-TOUCH, 30 days). Call once on landing. No-op — keeps
 * any prior value — when the URL carries no attribution params (organic visit),
 * so a later same-session navigation doesn't wipe the campaign that drove entry.
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    const captured: Record<string, string> = {}
    for (const key of ATTRIBUTION_KEYS) {
      const value = params.get(key)
      if (value) captured[key] = value.slice(0, 200)
    }
    if (Object.keys(captured).length === 0) return
    writeCookie(ATTRIBUTION_COOKIE, JSON.stringify(captured), 60 * 60 * 24 * 30)
  } catch {
    // Best-effort.
  }
}

/** Reads the captured campaign attribution (utm_* + gclid), or {} if none. */
export function getAttribution(): Record<string, string> {
  const raw = readCookie(ATTRIBUTION_COOKIE)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const key of ATTRIBUTION_KEYS) {
      if (typeof parsed[key] === 'string') out[key] = parsed[key] as string
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Derives the GA4 client_id from the GA `_ga` cookie. The cookie is
 * `GA1.<scope>.<clientId>` where clientId is itself two dot-segments
 * (`<randomNumber>.<firstVisitSeconds>`), e.g. `_ga=GA1.1.1234567890.1681234567`
 * → client_id `1234567890.1681234567` (the last two dot-segments). Returns
 * undefined when `_ga` is absent or malformed. Never throws.
 */
export function parseGaClientId(gaCookieValue: string | undefined): string | undefined {
  if (!gaCookieValue) return undefined
  const segments = gaCookieValue.split('.')
  // GA1.<scope>.<n>.<t> → need the trailing two segments as the client_id.
  if (segments.length < 4) return undefined
  const clientId = segments.slice(-2).join('.')
  return clientId || undefined
}

/**
 * Derives a GA4 session_id from a `_ga_<container>` cookie when readily
 * available. That cookie looks like `GS1.1.<sessionId>.<...>`; the session_id is
 * the 3rd dot-segment. Returns undefined when no such cookie exists or it cannot
 * be parsed — the caller then simply omits ga_session_id.
 */
function readGaSessionId(): string | undefined {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return undefined
  for (const part of document.cookie.split('; ')) {
    if (!part.startsWith('_ga_')) continue
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const value = part.slice(eq + 1)
    // GS1.<scope>.<sessionId>.<...> — the session_id is the 3rd segment.
    const segments = value.split('.')
    if (segments.length >= 3 && segments[2]) return segments[2]
  }
  return undefined
}

/**
 * Resolves the GA identity attached to experiment beacons: the GA4 client_id
 * (from `_ga`, falling back to the marketing visitor cookie so blocked visitors
 * keep a stable id) and, when readily available, the GA4 session_id. Never throws.
 */
export function getGaIdentity(): GaIdentity {
  const clientId =
    parseGaClientId(readCookie('_ga')) || readCookie(MARKETING_VISITOR_COOKIE) || ''
  const sessionId = readGaSessionId()
  return sessionId ? { clientId, sessionId } : { clientId }
}

function ensureClientAnalyticsQueues() {
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    // Canonical gtag stub: queue the live `arguments` object (not a copied array)
    // so GA replays events fired before the lazy-loaded library initializes.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      ;(window.dataLayer = window.dataLayer || []).push(arguments)
    }
  }
  window.va =
    window.va ||
    ((event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => {
      ;(window.vaq = window.vaq || []).push([event, properties])
    })
}

let experimentContext: ExperimentAnalyticsParams | null = null
const trackedExperimentExposures = new Set<string>()

// Set true the first time a tracked experiment conversion fires during this
// page-session. The first-party engagement tracker reads it so a session that
// converted counts as "engaged" even if it spent < 10s visible (GA4-aligned).
// Module-scoped (not per-context) so it survives a brief context reset; the
// engagement tracker only sends one beacon per page-session anyway.
let experimentConversionFired = false

export function setExperimentContext(context: ExperimentAnalyticsParams | null) {
  experimentContext = context
}

/**
 * Whether a tracked experiment conversion has fired during this page-session.
 * The engagement tracker (ExperimentExposure) reads this so an `engaged` beacon
 * reflects a conversion regardless of visible time. Read-only; never throws.
 */
export function hasExperimentConversionFired(): boolean {
  return experimentConversionFired
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
  // Attribute this visitor's GA4 data to their variant cohort (user-scoped) so
  // the experiment can be split with GA4 Comparisons across every report. Set
  // before the exposure event so that event is attributed too.
  setGa4ExperimentUserProperties(params)
  trackEvent('experiment_exposure', params)
}

// Set the assigned variant as GA4 user properties so GA4 can segment all of a
// visitor's events and sessions by their experiment cohort. Register
// `experiment_variant` (and optionally experiment_id / experiment_flag) as
// user-scoped custom dimensions in GA4 to use them in reports and Comparisons.
function setGa4ExperimentUserProperties(params: ExperimentAnalyticsParams) {
  if (typeof window === 'undefined') return
  ensureClientAnalyticsQueues()
  window.gtag?.('set', 'user_properties', {
    experiment_id: params.experiment_id,
    experiment_variant: params.variant,
    experiment_flag: params.flag_key,
  })
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
  // Mark this page-session as converted so first-party engagement counts it as
  // "engaged" regardless of visible time (counts only — no visitor identifiers).
  experimentConversionFired = true
  trackEvent('experiment_conversion', params)
}

export function resetExperimentAnalyticsForTests() {
  experimentContext = null
  trackedExperimentExposures.clear()
  experimentConversionFired = false
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

// Visitor completes a discovery-call booking via Calendly — the real OUTCOME,
// distinct from the CTA click that only opens the scheduler. Its own named event
// so GA4 and the marketing CMS can compare who CLICKED the button
// (qualified_discovery_call_click) vs who actually BOOKED (discovery_call_booked)
// per variant, instead of inferring the booking from the generic form_submit.
export function trackDiscoveryCallBooked(params: {
  form_name: string
  form_location: string
}) {
  trackEvent('discovery_call_booked', params)
}

// Visitor sends their first message via the site chat widget — a low-friction
// qualified-lead action (the conversational alternative to booking a call). Its
// OWN tracked metric; deliberately NOT folded into experiment_conversion so the
// homepage readout can weigh it separately from a booked call (a softer signal).
export function trackChatMessageSent(params?: { source?: string }) {
  trackEvent('chat_message_sent', { source: params?.source ?? 'chat_widget' })
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
