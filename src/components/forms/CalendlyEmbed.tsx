'use client'

import { useEffect } from 'react'
import { useCalendlyTracking } from '@/components/forms/useCalendlyTracking'

interface CalendlyEmbedProps {
  // Distinguishes which page's calendar an interaction came from in analytics.
  formLocation?: string
  formName?: string
}

export function CalendlyEmbed({ formLocation = 'open-office-hours', formName = 'office_hours' }: CalendlyEmbedProps = {}) {
  useCalendlyTracking({ formName, formLocation })

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div
      className="calendly-inline-widget"
      data-url="https://calendly.com/goinvo/open-office-hours"
      style={{ minWidth: '320px', height: '950px' }}
    />
  )
}
