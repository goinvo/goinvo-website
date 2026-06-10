'use client'

import { useEffect } from 'react'
import {
  getGaIdentity,
  hasExperimentConversionFired,
  setExperimentContext,
  trackExperimentExposure,
  type ExperimentAnalyticsParams,
} from '@/lib/analytics'

interface ExperimentExposureProps {
  experiment: ExperimentAnalyticsParams
}

// 'Engaged' threshold: a session is engaged once it accumulates >= 10s of
// VISIBLE time on the experiment page (GA4-aligned 10s engaged-session rule), or
// if it fired a tracked experiment conversion. Below the threshold (and no
// conversion) is a bounce.
const ENGAGED_VISIBLE_MS = 10000

/**
 * Fires the experiment exposure AND captures first-party per-variant ENGAGEMENT
 * (visible time on page + bounce) for the experiment. Engagement flows through
 * the same first-party pipeline as the exposure/conversion counts: one beacon
 * per page-session -> /api/marketing/analytics/collect -> Vercel KV -> drain-cron.
 *
 * Privacy: counts/durations only — never any visitor identifier. Best-effort and
 * isolated in try/catch so engagement capture can never throw or affect the page.
 */
export function ExperimentExposure({ experiment }: ExperimentExposureProps) {
  useEffect(() => {
    setExperimentContext(experiment)
    trackExperimentExposure(experiment)

    // Accumulate VISIBLE time: count ms only while the document is visible.
    let visibleMs = 0
    let visibleSince =
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null
    // Guard so exactly one engagement beacon is sent per page-session, even
    // though both visibilitychange->hidden and pagehide may fire.
    let beaconSent = false

    const accumulateVisible = () => {
      if (visibleSince !== null) {
        const elapsed = Date.now() - visibleSince
        if (Number.isFinite(elapsed) && elapsed > 0) visibleMs += elapsed
        visibleSince = null
      }
    }

    const sendEngagementBeacon = () => {
      if (beaconSent) return
      accumulateVisible()
      beaconSent = true
      try {
        if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
        const engaged = visibleMs >= ENGAGED_VISIBLE_MS || hasExperimentConversionFired()
        const identity = getGaIdentity()
        const body = JSON.stringify({
          type: 'engagement',
          flag_key: experiment.flag_key,
          experiment_id: experiment.experiment_id,
          variant: experiment.variant,
          page_path: experiment.page_path,
          visibleMs,
          engaged,
          // GA identity carried for parity with the event beacon (counts only,
          // from the visitor's own GA cookie). The engagement beacon stays
          // first-party — /collect does NOT forward it to GA4.
          ga_client_id: identity.clientId,
          ...(identity.sessionId ? { ga_session_id: identity.sessionId } : {}),
        })
        navigator.sendBeacon(
          '/api/marketing/analytics/collect',
          new Blob([body], { type: 'application/json' }),
        )
      } catch {
        // Best-effort: engagement capture must never affect the page.
      }
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'visible') {
        if (visibleSince === null) visibleSince = Date.now()
      } else {
        // Tab hidden / page being backgrounded: bank the visible time and send
        // the one engagement beacon (the guard prevents a later pagehide double).
        sendEngagementBeacon()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', sendEngagementBeacon)

    return () => {
      // Component unmount (SPA navigation away): bank visible time and flush the
      // engagement beacon for this page-session before tearing down listeners.
      sendEngagementBeacon()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', sendEngagementBeacon)
      setExperimentContext(null)
    }
  }, [experiment.experiment_id, experiment.flag_key, experiment.variant, experiment.page_path])

  return null
}
