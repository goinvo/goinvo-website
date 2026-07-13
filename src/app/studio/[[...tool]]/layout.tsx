import type { Metadata } from 'next'

const studioDescription = 'Internal GoInvo content, publishing, and marketing workspace.'

export const metadata: Metadata = {
  title: 'GoInvo Studio',
  description: studioDescription,
  applicationName: 'GoInvo Studio',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  openGraph: {
    type: 'website',
    title: 'GoInvo Studio',
    description: studioDescription,
    siteName: 'GoInvo Studio',
  },
  twitter: {
    card: 'summary',
    title: 'GoInvo Studio',
    description: studioDescription,
  },
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div style={{ margin: 0 }}>{children}</div>
}
