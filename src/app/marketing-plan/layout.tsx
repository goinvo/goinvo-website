import type { Metadata } from 'next'

// Clean, chrome-free layout for the shareable marketing-plan deck.
//
// This route lives OUTSIDE the (main) route group on purpose, so it does NOT
// inherit (main)/layout.tsx — no site Header, Footer, PersistentHero, analytics,
// chat widget, or Sanity Live machinery. It still nests inside the root
// app/layout.tsx, so it keeps <html>/<body>, the global fonts, and globals.css.
//
// The page is unlisted: noindex/nofollow here, and it is intentionally absent
// from sitemap.ts and every nav. The optional MARKETING_PLAN_KEY gate is
// enforced in page.tsx.
export const metadata: Metadata = {
  title: 'GoInvo — Marketing Strategy & Content Plan',
  description:
    'Internal recommendation: GoInvo marketing positioning, messaging, commercial money-terms, AI-citation share-of-voice, the Red Team play, and a prioritized content roadmap.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function MarketingPlanLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
