'use client'

import { useEffect, useRef } from 'react'

const EMAILOCTOPUS_FORM_ID = 'e260d99a-9007-11f0-9271-35d5d1204339'

export function NewsletterForm() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (containerRef.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = `https://eocampaign1.com/form/${EMAILOCTOPUS_FORM_ID}.js`
    script.async = true
    script.dataset.form = EMAILOCTOPUS_FORM_ID
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div>
      <h2 className="header-lg mb-2">Subscribe to our newsletter</h2>
      <p className="text-gray mb-6">
        You&apos;ll receive our latest ideas, visualizations, and studio news
        delivered to your inbox twice a month.
      </p>
      <div ref={containerRef} />
    </div>
  )
}
