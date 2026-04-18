import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'GoInvo | Healthcare UX Design Studio',
    template: '%s | GoInvo',
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.title,
    title: 'GoInvo | Healthcare UX Design Studio',
    description: siteConfig.description,
    images: [
      {
        url: `${siteConfig.cloudfrontUrl}/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'GoInvo — Healthcare UX Design Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GoInvo | Healthcare UX Design Studio',
    description: siteConfig.description,
    images: [`${siteConfig.cloudfrontUrl}/images/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href={`https://use.typekit.net/${siteConfig.typekitId}.css`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'GoInvo',
              url: siteConfig.url,
              logo: `${siteConfig.cloudfrontUrl}/images/goinvo-logo.png`,
              description: siteConfig.description,
              address: {
                '@type': 'PostalAddress',
                streetAddress: '661 Massachusetts Ave, 3rd Floor',
                addressLocality: 'Arlington',
                addressRegion: 'MA',
                postalCode: '02476',
                addressCountry: 'US',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                email: siteConfig.email.info,
                contactType: 'customer service',
              },
              sameAs: [
                siteConfig.social.linkedin,
                siteConfig.social.twitter,
                siteConfig.social.medium,
              ],
            }),
          }}
        />
      </head>
      {/* Sanity live-data hooks and Visual Editing are intentionally NOT
          mounted here — they live in the (main) route group. Mounting
          them globally would include the /studio route, where every
          user-typed character would fire a mutation → revalidate →
          re-render loop that either hangs the editor (Vercel) or
          triggers an HMR-style reload (dev). */}
      <body className="font-sans text-black antialiased">{children}</body>
    </html>
  )
}
