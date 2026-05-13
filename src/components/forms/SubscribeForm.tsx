'use client'

import { useEffect, useRef } from 'react'

const EMAILOCTOPUS_FORM_ID = 'e260d99a-9007-11f0-9271-35d5d1204339'

export function SubscribeForm() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // Avoid double-loading if already present
    if (containerRef.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = `https://eocampaign1.com/form/${EMAILOCTOPUS_FORM_ID}.js`
    script.async = true
    script.dataset.form = EMAILOCTOPUS_FORM_ID
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div className="bg-white shadow-card newsletter-form-host">
      <div className="mx-[42px] pt-[10px]">
        <h2 className="header-lg mt-5 mb-5">Subscribe to our newsletter</h2>
        <p className="mt-4 mb-4 text-black">
          You&apos;ll receive our latest ideas, visualizations, and studio news delivered to your
          inbox twice a month.
        </p>
        <div ref={containerRef} />
      </div>
    </div>
  )
}
