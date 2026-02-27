'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export function WebVitals() {
  useEffect(() => {
    import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      const sendMetric = (metric: { name: string; value: number; id: string }) => {
        trackEvent(metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_category: 'Web Vitals',
          event_label: metric.id,
          non_interaction: true,
        })
      }

      onCLS(sendMetric)
      onFCP(sendMetric)
      onINP(sendMetric)
      onLCP(sendMetric)
      onTTFB(sendMetric)
    })
  }, [])

  return null
}
