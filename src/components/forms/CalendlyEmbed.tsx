'use client'

import { useEffect, useRef } from 'react'
import { useCalendlyTracking } from '@/components/forms/useCalendlyTracking'

const CALENDLY_BASE_URL = 'https://calendly.com/goinvo/open-office-hours'
const CALENDLY_SCRIPT_URL = 'https://assets.calendly.com/assets/external/widget.js'

let calendlyScriptPromise: Promise<void> | null = null

function ensureCalendlyScript() {
  if (window.Calendly?.initInlineWidget) return Promise.resolve()
  if (calendlyScriptPromise) return calendlyScriptPromise

  calendlyScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_URL}"]`,
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Calendly failed to load')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = CALENDLY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Calendly failed to load'))
    document.head.appendChild(script)
  })

  return calendlyScriptPromise
}

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
  const params = new URLSearchParams()
  if (hideEventTypeDetails) params.set('hide_event_type_details', '1')
  if (hideGdprBanner) params.set('hide_gdpr_banner', '1')
  // Calendly wants the bare hex (no '#'); strip one if a caller includes it.
  if (primaryColor) params.set('primary_color', primaryColor.replace(/^#/, ''))
  const query = params.toString()
  const url = query ? `${CALENDLY_BASE_URL}?${query}` : CALENDLY_BASE_URL

  // Lazy-load Calendly's widget.js only when the embed nears the viewport, so the
  // ~heavy script + iframe don't compete with the initial page render (the widget
  // is typically well below the fold). Once the script is available, initialize
  // this specific mount so client-side navigation works after widget.js has
  // already loaded on a previous route.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false

    const load = () => {
      void ensureCalendlyScript()
        .then(() => {
          // widget.js may auto-initialize the first matching element when it
          // initially loads. Wait one task before checking to avoid a duplicate.
          window.setTimeout(() => {
            if (
              cancelled ||
              el.querySelector('iframe') ||
              !window.Calendly?.initInlineWidget
            ) {
              return
            }
            window.Calendly.initInlineWidget({ url, parentElement: el })
          }, 0)
        })
        .catch(() => {
          // Allow a later mount or intersection event to retry a failed request.
          calendlyScriptPromise = null
        })
    }

    if (!('IntersectionObserver' in window)) {
      load()
      return () => {
        cancelled = true
      }
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
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [url])

  return (
    <div
      ref={containerRef}
      className="calendly-inline-widget"
      data-url={url}
      style={{ minWidth: '320px', height: '950px' }}
    />
  )
}
