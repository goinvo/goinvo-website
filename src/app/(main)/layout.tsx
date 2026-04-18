import { draftMode } from 'next/headers'
import { Header } from '@/components/layout/Header'
import { TransitionLayout } from '@/components/layout/TransitionLayout'
import { HeroProvider } from '@/context/HeroContext'
import { PersistentHero } from '@/components/layout/PersistentHero'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { HubSpotTracking } from '@/components/analytics/HubSpotTracking'
import { ChatlioWidget } from '@/components/analytics/ChatlioWidget'
import { WebVitals } from '@/components/analytics/WebVitals'
import { ScrollDepthTracker } from '@/components/analytics/ScrollDepthTracker'
import { ExternalLinkTracker } from '@/components/analytics/ExternalLinkTracker'
import { ThrottledSanityLive } from '@/components/sanity/ThrottledSanityLive'
import { PreviewBanner } from '@/components/sanity/PreviewBanner'
import { DraftModeGuard } from '@/components/sanity/DraftModeGuard'
import { SafeVisualEditing } from '@/components/sanity/SafeVisualEditing'
import './vision/determinants-of-health/determinants.css'

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <HeroProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:no-underline"
      >
        Skip to content
      </a>
      <Header />
      <PersistentHero />
      <TransitionLayout>
        <main id="main-content">{children}</main>
      </TransitionLayout>
      <GoogleAnalytics />
      <HubSpotTracking />
      <ChatlioWidget />
      <Analytics />
      <SpeedInsights />
      <WebVitals />
      <ScrollDepthTracker />
      <ExternalLinkTracker />
      {/* Sanity live-data — mounted only inside the (main) group so the
          /studio route (which lives outside this group) doesn't receive
          its own mutation events and trigger a revalidate/re-render
          loop under the editor. */}
      <ThrottledSanityLive />
      {isDraftMode && <SafeVisualEditing />}
      {isDraftMode && <PreviewBanner />}
      {isDraftMode && <DraftModeGuard />}
    </HeroProvider>
  )
}
