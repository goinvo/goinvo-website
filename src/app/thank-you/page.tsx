import type { Metadata } from 'next'
import Script from 'next/script'
import { siteConfig } from '@/lib/config'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Thank You',
  description: 'Thank you for contacting us! We will get back to you within 2 business hours.',
}

const { googleAdsId, googleAdsConversionLabel } = siteConfig.analytics

export default function ThankYouPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Google Ads Conversion Tracking */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`gtag('event', 'conversion', { 'send_to': '${googleAdsId}/${googleAdsConversionLabel}' });`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.googleadservices.com/pagead/conversion/${googleAdsId.replace('AW-', '')}/?label=${googleAdsConversionLabel}&guid=ON&script=0`}
        />
      </noscript>

      <section
        className="relative min-h-[40vh] flex items-end bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/contact/studio.jpg')})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-blue-light/90 to-transparent" />
      </section>

      <section className="bg-blue-light py-16 -mt-8">
        <div className="max-width-sm content-padding mx-auto">
          <h1 className="font-serif text-3xl mb-4">
            Thank you for contacting us.
          </h1>
          <p className="text-lg">
            We will get back to you within 2 business hours.
          </p>
        </div>
      </section>
    </div>
  )
}
