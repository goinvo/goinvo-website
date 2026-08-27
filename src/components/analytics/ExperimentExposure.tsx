'use client'

import { useEffect } from 'react'
import {
  captureAttribution,
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
    const searchParams = new URLSearchParams(window.location.search)
    if (
      searchParams.has('goinvo_ab_variant') ||
      searchParams.has('goinvo_ab') ||
      searchParams.has(experiment.flag_key)
    ) return
    // Capture utm_*/gclid from the landing URL FIRST, so the exposure beacon (and
    // every later conversion beacon this session) carries the ad attribution.
    captureAttribution()
    setExperimentContext(experiment)
    trackExperimentExposure(experiment)

    // Accumulate VISIBLE time: count ms only while the document is visible.
    let visibleMs = 0
    let visibleSince =
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null
    const sectionTimings = new Map<HTMLElement, {
      key: string
      intersecting: boolean
      visibleSince: number | null
      visibleMs: number
      reached: boolean
    }>()

    document.querySelectorAll<HTMLElement>('[data-experiment-section]').forEach((element) => {
      const key = element.dataset.experimentSection?.trim()
      if (!key || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(key)) return
      sectionTimings.set(element, {
        key,
        intersecting: false,
        visibleSince: null,
        visibleMs: 0,
        reached: false,
      })
    })

    const accumulateSection = (timing: { visibleSince: number | null; visibleMs: number }) => {
      if (timing.visibleSince === null) return
      const elapsed = Date.now() - timing.visibleSince
      if (Number.isFinite(elapsed) && elapsed > 0) timing.visibleMs += elapsed
      timing.visibleSince = null
    }

    const syncSection = (timing: {
      intersecting: boolean
      visibleSince: number | null
      visibleMs: number
      reached: boolean
    }) => {
      const shouldMeasure = !beaconSent && timing.intersecting && document.visibilityState === 'visible'
      if (shouldMeasure) {
        timing.reached = true
        if (timing.visibleSince === null) timing.visibleSince = Date.now()
      } else {
        accumulateSection(timing)
      }
    }

    const sectionObserver = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const timing = sectionTimings.get(entry.target as HTMLElement)
              if (!timing) continue
              timing.intersecting = entry.isIntersecting && entry.intersectionRatio >= 0.15
              syncSection(timing)
            }
          },
          { threshold: [0, 0.15] },
        )
      : null
    sectionTimings.forEach((_timing, element) => sectionObserver?.observe(element))

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
      sectionTimings.forEach(accumulateSection)
      beaconSent = true
      try {
        if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
        const engaged = visibleMs >= ENGAGED_VISIBLE_MS || hasExperimentConversionFired()
        const identity = getGaIdentity()
        const sections = Array.from(sectionTimings.values())
          .filter((timing) => timing.reached)
          .map((timing) => ({
            key: timing.key,
            visibleMs: Math.max(0, Math.round(timing.visibleMs)),
          }))
        const body = JSON.stringify({
          type: 'engagement',
          flag_key: experiment.flag_key,
          experiment_id: experiment.experiment_id,
          measurement_key: experiment.measurement_key,
          variant: experiment.variant,
          page_path: experiment.page_path,
          visibleMs,
          engaged,
          sections,
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
      sectionTimings.forEach(syncSection)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', sendEngagementBeacon)

    return () => {
      // Component unmount (SPA navigation away): bank visible time and flush the
      // engagement beacon for this page-session before tearing down listeners.
      sendEngagementBeacon()
      sectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', sendEngagementBeacon)
      setExperimentContext(null)
    }
  }, [experiment])

  return null
}
