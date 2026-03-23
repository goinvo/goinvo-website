import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity'
import { siteConfig } from '@/lib/config'
import { ThrottledSanityLive } from '@/components/sanity/ThrottledSanityLive'
import { PreviewBanner } from '@/components/sanity/PreviewBanner'
import { DraftModeGuard } from '@/components/sanity/DraftModeGuard'
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GoInvo | Healthcare UX Design Studio',
    description: siteConfig.description,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href={`https://use.typekit.net/${siteConfig.typekitId}.css`}
        />
      </head>
      <body className="font-sans text-black antialiased">
        {children}
        <ThrottledSanityLive />
        {isDraftMode && <VisualEditing />}
        {isDraftMode && <PreviewBanner />}
        {isDraftMode && <DraftModeGuard />}
      </body>
    </html>
  )
}
