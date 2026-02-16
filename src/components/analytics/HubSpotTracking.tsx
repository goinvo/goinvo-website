import Script from 'next/script'
import { siteConfig } from '@/lib/config'

export function HubSpotTracking() {
  return (
    <Script
      id="hs-script-loader"
      src={`https://js.hs-scripts.com/${siteConfig.hubspot.portalId}.js`}
      strategy="afterInteractive"
    />
  )
}
