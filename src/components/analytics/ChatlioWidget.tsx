'use client'

import { useEffect, useRef } from 'react'
import { siteConfig } from '@/lib/config'

export function ChatlioWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = window.location.hostname
    if (!(siteConfig.chatlio.allowedHosts as readonly string[]).includes(host)) return

    // Create the chatlio-widget custom element
    if (containerRef.current) {
      const widget = document.createElement('chatlio-widget')
      widget.setAttribute('data-widget-id', siteConfig.chatlio.widgetId)
      widget.setAttribute('data-embed-version', '2.3')
      containerRef.current.appendChild(widget)
    }

    const script = document.createElement('script')
    script.src = 'https://w.chatlio.com/w.chatlio-widget.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return <div ref={containerRef} />
}
