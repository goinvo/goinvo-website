/**
 * GA4 Measurement Protocol (server-side) forwarder.
 *
 * The first-party A/B collector (/api/marketing/analytics/collect) already
 * receives ~100% of experiment events server-side, because the page beacons them
 * with navigator.sendBeacon. GA4's client gtag only delivers ~5% of those same
 * events (ad/tracking blockers). This module re-sends the experiment events to
 * GA4 via the Measurement Protocol so GA4 reports recover the missing ~95% —
 * WITHOUT double-counting (the client gtag path is skipped for experiment events).
 *
 * It is INERT until GA4_MP_API_SECRET is set: an unconfigured deploy forwards
 * nothing and never errors. Everything here is best-effort — short timeout,
 * swallowed errors, never throws — so a GA4 hiccup can never affect /collect's
 * 204 response or the page.
 *
 * Privacy: only experiment dimensions + the GA client_id the visitor's own GA
 * cookie already holds are sent. No new identifiers are minted here.
 */

export interface Ga4MpEvent {
  name: string
  params: Record<string, unknown>
}

/** Hard cap so a forward can never block the 204 response for long. */
const MP_TIMEOUT_MS = 1500

const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

/** Default GA4 measurement id (matches siteConfig.analytics.ga4Id). */
const DEFAULT_MEASUREMENT_ID = 'G-P00K4KL2Y9'

/**
 * Forwards events to GA4 via the Measurement Protocol for one client_id.
 *
 * Returns false (a graceful no-op) when GA4_MP_API_SECRET is unset, when there
 * is no client_id, or when there are no events — so an unconfigured deploy does
 * nothing and never errors. Otherwise POSTs `{ client_id, events }` and returns
 * whether the request was dispatched OK (best-effort; non-2xx and network errors
 * resolve false rather than throw).
 *
 * Each event gets `session_id` (passed through by the caller) and
 * `engagement_time_msec: 1` injected so the synthetic hit lands as an engaged
 * session in GA4 reports.
 */
export async function sendGa4MpEvents(
  clientId: string,
  events: Ga4MpEvent[],
): Promise<boolean> {
  const apiSecret = process.env.GA4_MP_API_SECRET
  // Feature is inert until the secret is configured — no secret, no forward.
  if (!apiSecret) return false
  if (!clientId || !Array.isArray(events) || events.length === 0) return false

  const measurementId = process.env.GA4_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID

  // Ensure every event reports an engaged session: GA4 needs engagement_time_msec
  // (and a session_id) on each event for the synthetic hit to count toward
  // engaged sessions in reports.
  const mpEvents = events.map((event) => ({
    name: event.name,
    params: {
      ...event.params,
      engagement_time_msec: 1,
    },
  }))

  const url = `${GA4_MP_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MP_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, events: mpEvents }),
    })
    // GA4 MP returns 2xx (usually 204) on accept. Treat anything else as a soft
    // failure rather than throwing — the caller must never be affected.
    return res.ok
  } catch {
    // Best-effort: swallow timeouts / network errors. Never throws.
    return false
  } finally {
    clearTimeout(timeout)
  }
}
