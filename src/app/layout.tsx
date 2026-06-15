import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config'
import { JsonLd } from '@/components/seo/JsonLd'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'GoInvo | Healthcare UX Design Studio',
    template: '%s | GoInvo',
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  // Google Search Console verification. Set GOOGLE_SITE_VERIFICATION to the
  // HTML-tag token from the GSC property; the <meta google-site-verification>
  // tag is emitted only when it's set, so this is a no-op until configured.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
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
        {/* Preconnect to the font + image origins on the critical render path so
            the browser opens those TLS connections during HTML parse instead of
            discovering them late — recovers ~300ms of FCP/LCP. */}
        <link rel="preconnect" href="https://use.typekit.net" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href={siteConfig.cloudfrontUrl} />
        <link
          rel="stylesheet"
          href={`https://use.typekit.net/${siteConfig.typekitId}.css`}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${siteConfig.url}/#organization`,
            name: 'GoInvo',
            alternateName: 'Involution Studios',
            url: siteConfig.url,
            logo: {
              '@type': 'ImageObject',
              url: `${siteConfig.cloudfrontUrl}/images/goinvo-logo.png`,
            },
            description: siteConfig.description,
            slogan: 'Designing the future of healthcare.',
            foundingDate: '2004',
            // Expertise/topic entities — gives AI answer engines an explicit,
            // machine-readable picture of what GoInvo is authoritative about.
            knowsAbout: [
              'Healthcare user experience design',
              'Electronic health records',
              'Open source health design',
              'Social determinants of health',
              'Health data visualization',
              'Patient engagement',
              'Clinical decision support',
              'Genomics design',
              'Public health design',
              'Medical software design',
              'Artificial intelligence in healthcare',
            ],
            areaServed: 'Worldwide',
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
              siteConfig.social.flickr,
              siteConfig.social.soundcloud,
              'https://github.com/goinvo',
            ],
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${siteConfig.url}/#website`,
            name: 'GoInvo',
            url: siteConfig.url,
            description: siteConfig.description,
            inLanguage: 'en-US',
            publisher: { '@id': `${siteConfig.url}/#organization` },
          }}
        />
      </head>
      {/* Sanity live-data hooks and Visual Editing are intentionally NOT
          mounted here — they live in the (main) route group. Mounting
          them globally would include the /studio route, where every
          user-typed character would fire a mutation → revalidate →
          re-render loop that either hangs the editor (Vercel) or
          triggers an HMR-style reload (dev). */}
      {/* suppressHydrationWarning silences mismatches caused by browser
          extensions that inject attributes onto <body> before React loads
          (e.g. ColorZilla's cz-shortcut-listen). */}
      <body className="font-sans text-black antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
