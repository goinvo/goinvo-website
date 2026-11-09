'use client'

import { useEffect, useState } from 'react'
import { siteConfig } from '@/lib/config'
import { contactFormUrl } from '@/lib/contactPrefill'
import { cn } from '@/lib/utils'
import { getSectionBandClassName, type SectionBackground } from '@/lib/sectionBackgrounds'
import { LoadingIframe } from '@/components/ui/LoadingIframe'

export function ContactFormEmbed({
  showHeader = true,
  background = 'white',
  variant = 'default',
  message,
}: {
  showHeader?: boolean
  background?: SectionBackground
  variant?: 'default' | 'inline'
  /** Words the visitor already gave us (the homepage search), put in "How can we help?". */
  message?: string
}) {
  const frameId = `JotFormIFrame-${siteConfig.jotformId}`
  const wanted = contactFormUrl(siteConfig.jotformId, message)
  // A new message reloads the form, so it stops following once someone has clicked
  // into it: a later search must never wipe what they are typing.
  const [touched, setTouched] = useState(false)
  const [src, setSrc] = useState(wanted)
  if (src !== wanted && !touched) setSrc(wanted)
  useEffect(() => {
    const onBlur = () => { if (document.activeElement?.id === frameId) setTouched(true) }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [frameId])

  const card = (
    <div className={cn('bg-white overflow-hidden', variant === 'default' && 'shadow-card')}>
      {showHeader && (
        <div className="p-6 pb-0">
          <h2 className="font-serif text-2xl font-light mb-1">Get in touch</h2>
          <p className="text-gray text-md">
            or email us at{' '}
            <a href={`mailto:${siteConfig.email.info}`}>
              {siteConfig.email.info}
            </a>
          </p>
        </div>
      )}
      <div className={cn('overflow-hidden', variant === 'default' && 'p-6')}>
        <LoadingIframe
          key={src}
          id={frameId}
          title="Contact"
          scrolling="no"
          // Below the fold on most pages; the browser fetches it as it nears the
          // viewport instead of alongside the page's hero image.
          loading="lazy"
          src={src}
          data-contact-form
          className="w-full border-0"
          style={{ height: '548px' }}
        />
      </div>
    </div>
  )

  const backgroundClassName = getSectionBandClassName(background)

  if (backgroundClassName) {
    return <div className={cn(backgroundClassName, 'p-6 md:p-8')}>{card}</div>
  }

  return (
    card
  )
}
