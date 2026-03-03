'use client'

import { siteConfig } from '@/lib/config'
import { LoadingIframe } from '@/components/ui/LoadingIframe'

export function ContactFormEmbed({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="bg-white shadow-card overflow-hidden">
      {showHeader && (
        <div className="p-6 pb-0">
          <h2 className="font-serif text-2xl mb-1">Get in touch</h2>
          <p className="text-gray text-md">
            or email us at{' '}
            <a href={`mailto:${siteConfig.email.info}`}>
              {siteConfig.email.info}
            </a>
          </p>
        </div>
      )}
      <div className="p-6 overflow-hidden">
        <LoadingIframe
          id={`JotFormIFrame-${siteConfig.jotformId}`}
          title="Contact"
          allowTransparency
          scrolling="no"
          src={`https://form.jotform.com/${siteConfig.jotformId}`}
          className="w-full border-0"
          style={{ height: '548px' }}
        />
      </div>
    </div>
  )
}
