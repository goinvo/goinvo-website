'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConceptReferenceArrow } from '@/components/home/ConceptReferenceArrow'
import { useCalendlyTracking } from '@/components/forms/useCalendlyTracking'
import { trackCtaClick } from '@/lib/analytics'

const calendlyUrl = 'https://calendly.com/goinvo/open-office-hours?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=d94d2f'
const calendlyScriptUrl = 'https://assets.calendly.com/assets/external/widget.js'
const calendlyStylesheetUrl = 'https://assets.calendly.com/assets/external/widget.css'
const conceptButtonPrimary =
  'group !normal-case !tracking-normal !text-[15px] !px-[22px] !py-[14px] !gap-[10px] !rounded-[2px] !bg-[#d94d2f] !text-white !border-[#d94d2f] hover:!bg-[#c44228] hover:!border-[#c44228] hover:-translate-y-px active:translate-y-0 hover:shadow-[0_10px_28px_-10px_rgba(217,77,47,.55)]'

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget?: (options: { url: string; parentElement: HTMLElement }) => void
      initPopupWidget?: (options: { url: string }) => void
    }
  }
}

let calendlyPromise: Promise<void> | null = null

function ensureCalendlyLoaded() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Calendly) return Promise.resolve()
  if (calendlyPromise) return calendlyPromise

  calendlyPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${calendlyStylesheetUrl}"]`)) {
      const stylesheet = document.createElement('link')
      stylesheet.rel = 'stylesheet'
      stylesheet.href = calendlyStylesheetUrl
      document.head.appendChild(stylesheet)
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${calendlyScriptUrl}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Calendly failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = calendlyScriptUrl
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Calendly failed to load'))
    document.head.appendChild(script)
  })

  return calendlyPromise
}

export function HomeConceptCalendlyCta() {
  const inlineRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)
  const [inlineReady, setInlineReady] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    let cancelled = false
    let observer: MutationObserver | null = null
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) setShowFallback(true)
    }, 6500)

    function markReady() {
      if (cancelled) return
      setInlineReady(true)
      setShowFallback(false)
    }

    function watchForIframe() {
      const parent = inlineRef.current
      if (!parent) return

      const attachLoadListener = () => {
        const iframe = parent.querySelector<HTMLIFrameElement>('iframe')
        if (!iframe) return false
        iframe.addEventListener('load', markReady, { once: true })
        return true
      }

      if (attachLoadListener()) return

      observer = new MutationObserver(() => {
        if (!attachLoadListener()) return
        observer?.disconnect()
        observer = null
      })
      observer.observe(parent, { childList: true, subtree: true })
    }

    ensureCalendlyLoaded()
      .then(() => {
        if (cancelled || !inlineRef.current || !window.Calendly?.initInlineWidget) return
        if (inlineRef.current.dataset.calendlyInitialized === 'true') {
          watchForIframe()
          if (inlineRef.current.querySelector('iframe')) window.setTimeout(markReady, 1200)
          return
        }
        inlineRef.current.dataset.calendlyInitialized = 'true'
        watchForIframe()
        window.Calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: inlineRef.current,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true)
          setShowFallback(true)
        }
      })

    return () => {
      cancelled = true
      window.clearTimeout(fallbackTimer)
      observer?.disconnect()
    }
  }, [])

  // Calendly runs in a cross-origin iframe, so field focus is not observable.
  // The shared hook reports discovery_form_start on date/time selection and a
  // form submit on event_scheduled. On the homepage these carry the experiment
  // variant/page_path because the exposure context is already set.
  useCalendlyTracking({ formName: 'discovery_call', formLocation: 'concept calendly' })

  function openCalendlyPopup() {
    // Generic CTA, not the primary qualified metric: that metric is the hero CTA
    // (symmetric with control). Engaging the scheduler fires discovery_form_start.
    trackCtaClick({
      cta_text: 'Book a discovery call',
      cta_location: 'concept final cta',
      cta_url: calendlyUrl,
    })

    void ensureCalendlyLoaded()
      .then(() => {
        if (window.Calendly?.initPopupWidget) {
          window.Calendly.initPopupWidget({ url: calendlyUrl })
          return
        }

        window.location.href = '/contact'
      })
      .catch(() => {
        window.location.href = '/contact'
      })
  }

  return (
    <section id="book" className="py-16 lg:py-24 bg-[#24434d] text-white">
      <div className="max-w-[960px] mx-auto px-5 sm:px-8 text-center">
        <h2 className="font-serif text-3xl lg:text-5xl leading-tight mb-5 max-w-[20ch] mx-auto">
          Have a product that needs to ship?
        </h2>
        <p className="text-lg leading-8 text-white/85 max-w-[720px] mx-auto">
          Book a 30-minute discovery call. You&apos;ll talk to a principal, not a salesperson, about your problem, what shipping it would take, and whether we&apos;re the right firm. No deck, no obligation.
        </p>

        <div
          className="relative hidden mt-10 max-w-[960px] mx-auto overflow-hidden bg-white shadow-[0_30px_80px_-24px_rgba(0,0,0,.35)] md:block"
          aria-busy={!inlineReady}
        >
          {!inlineReady && (
            <div className="absolute inset-0 z-10 flex min-h-[720px] flex-col items-center justify-center bg-white px-6 text-center text-[#1d1b1a]">
              <div className="mb-5 h-9 w-9 animate-spin rounded-full border-2 border-[#d9d3c6] border-t-primary" aria-hidden />
              <p className="font-serif text-2xl leading-tight">
                {loadError ? 'Scheduler could not load in this browser.' : 'Loading the scheduler.'}
              </p>
              <p className="mt-3 max-w-[34ch] text-sm leading-6 text-[#6a6560]">
                {loadError || showFallback
                  ? 'Calendly sometimes takes a moment or is blocked by browser privacy settings.'
                  : 'The calendar is connecting now.'}
              </p>
              {(loadError || showFallback) && (
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-5 inline-flex items-center gap-2 border-b border-current pb-[3px] text-sm font-semibold text-primary no-underline"
                >
                  Open scheduler
                  <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
                </a>
              )}
            </div>
          )}
          <div
            ref={inlineRef}
            className="calendly-inline-widget w-full min-w-[280px] h-[min(92vh,1040px)] min-h-[720px]"
            data-url={calendlyUrl}
            data-testid="concept-calendly-inline"
          />
        </div>

        <div className="mt-9 md:hidden">
          <Button
            variant="primary"
            className={conceptButtonPrimary}
            onClick={openCalendlyPopup}
          >
            <span>Book a discovery call</span>
            <ConceptReferenceArrow className="shrink-0 group-hover:translate-x-[5px]" />
          </Button>
        </div>

        {loadError && (
          <p className="mt-5 text-sm text-white/75">
            Scheduling is taking a moment. The contact page is always available.
          </p>
        )}

        <p className="mt-7 text-sm text-white/75">
          Not ready? The newsletter sends our latest ideas, visualizations, and studio news twice a month.
          {' '}
          <a href="#concept-newsletter" className="group inline-flex items-baseline gap-1 text-white underline underline-offset-4">
            Subscribe
            <ConceptReferenceArrow className="group-hover:translate-x-[5px]" />
          </a>
        </p>
      </div>
    </section>
  )
}
