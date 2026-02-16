'use client'

import { useEffect, useRef } from 'react'
import { siteConfig } from '@/lib/config'

interface HubSpotFormProps {
  formId: string
  className?: string
}

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (opts: {
          portalId: string
          formId: string
          target: string
        }) => void
      }
    }
  }
}

export function HubSpotForm({ formId, className }: HubSpotFormProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const formCreated = useRef(false)

  useEffect(() => {
    if (formCreated.current) return

    const createForm = () => {
      if (window.hbspt && containerRef.current) {
        formCreated.current = true
        window.hbspt.forms.create({
          portalId: siteConfig.hubspot.portalId,
          formId,
          target: `#hubspot-form-${formId}`,
        })
      }
    }

    if (window.hbspt) {
      createForm()
    } else {
      const script = document.createElement('script')
      script.src = 'https://js.hsforms.net/forms/embed/v2.js'
      script.async = true
      script.onload = createForm
      document.head.appendChild(script)
    }
  }, [formId])

  return (
    <div
      ref={containerRef}
      id={`hubspot-form-${formId}`}
      className={className}
    />
  )
}
