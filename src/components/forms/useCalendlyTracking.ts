'use client'

import { useEffect } from 'react'
import { trackDiscoveryFormStart, trackFormSubmit } from '@/lib/analytics'

interface UseCalendlyTrackingParams {
  formName: string
  formLocation: string
}

/**
 * Listens for Calendly's cross-origin postMessages and reports analytics events.
 * Calendly runs in an iframe so field focus is not observable; the earliest
 * honest "form start" is the date/time selection, and event_scheduled is the
 * completed booking. Used by every calendar embed on the site so calendar
 * interaction is captured consistently (each call passes its own form_location).
 *
 * On the homepage experiment page the experiment context is already set, so
 * these events carry variant/page_path; on other pages they are plain
 * site-wide signals (no experiment context), which is correct.
 */
export function useCalendlyTracking({ formName, formLocation }: UseCalendlyTrackingParams) {
  useEffect(() => {
    function handleCalendlyMessage(event: MessageEvent) {
      if (event.origin !== 'https://calendly.com') return
      const payload = event.data
      if (!payload || typeof payload !== 'object') return
      const calendlyEvent = (payload as { event?: unknown }).event
      if (calendlyEvent === 'calendly.date_and_time_selected') {
        trackDiscoveryFormStart({ form_name: formName, form_location: formLocation })
      } else if (calendlyEvent === 'calendly.event_scheduled') {
        trackFormSubmit({ form_name: formName, form_location: formLocation })
      }
    }

    window.addEventListener('message', handleCalendlyMessage)
    return () => window.removeEventListener('message', handleCalendlyMessage)
  }, [formName, formLocation])
}
