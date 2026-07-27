'use client'

import { useEffect, useRef } from 'react'
import { useCalendlyTracking } from '@/components/forms/useCalendlyTracking'

const CALENDLY_BASE_URL = 'https://calendly.com/goinvo/open-office-hours'

interface CalendlyEmbedProps {
  // Distinguishes which page's calendar an interaction came from in analytics.
  formLocation?: string
  formName?: string
  /**
   * Hex accent for the Calendly widget (buttons, selected date), WITHOUT the
   * leading '#', e.g. 'd94d2f'. Omit to keep Calendly's default blue. Borrowed
   * from the 2026 homepage concept CTA so the embed matches the page's accent.
   */
  primaryColor?: string
  /** Hide the left-hand event-type details panel (?hide_event_type_details=1). */
  hideEventTypeDetails?: boolean
  /** Hide Calendly's GDPR cookie banner (?hide_gdpr_banner=1). */
  hideGdprBanner?: boolean
}

export function CalendlyEmbed({
  formLocation = 'open-office-hours',
  formName = 'office_hours',
  primaryColor,
  hideEventTypeDetails = false,
  hideGdprBanner = false,
}: CalendlyEmbedProps = {}) {
  useCalendlyTracking({ formName, formLocation })

  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy-load Calendly's widget.js only when the embed nears the viewport, so the
  // ~heavy script + iframe don't compete with the initial page render (the widget
  // is typically well below the fold). widget.js auto-initializes any
  // .calendly-inline-widget with a data-url once it loads. Falls back to loading
  // immediately where IntersectionObserver is unavailable.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const load = () => {
      if (document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) return
      const script = document.createElement('script')
      script.src = 'https://assets.calendly.com/assets/external/widget.js'
      script.async = true
      document.head.appendChild(script)
    }

    if (!('IntersectionObserver' in window)) {
      load()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load()
          observer.disconnect()
        }
      },
      // Start loading a bit before it scrolls into view so it's ready in time.
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const params = new URLSearchParams()
  if (hideEventTypeDetails) params.set('hide_event_type_details', '1')
  if (hideGdprBanner) params.set('hide_gdpr_banner', '1')
  // Calendly wants the bare hex (no '#'); strip one if a caller includes it.
  if (primaryColor) params.set('primary_color', primaryColor.replace(/^#/, ''))
  const query = params.toString()
  const url = query ? `${CALENDLY_BASE_URL}?${query}` : CALENDLY_BASE_URL

  return (
    <div
      ref={containerRef}
      className="calendly-inline-widget"
      data-url={url}
      style={{ minWidth: '320px', height: '950px' }}
    />
  )
}
