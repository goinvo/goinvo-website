import Script from 'next/script'
import { siteConfig } from '@/lib/config'

const { ga4Id, googleAdsId } = siteConfig.analytics

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ga4Id}');
          gtag('config', '${googleAdsId}');
        `}
      </Script>
    </>
  )
}
