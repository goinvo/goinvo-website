import type { Metadata } from 'next'

// Clean, chrome-free layout for the shareable marketing-plan deck.
//
// This route lives OUTSIDE the (main) route group on purpose, so it does NOT
// inherit (main)/layout.tsx — no site Header, Footer, PersistentHero, analytics,
// chat widget, or Sanity Live machinery. It still nests inside the root
// app/layout.tsx, so it keeps <html>/<body>, the global fonts, and globals.css.
//
// The page is unlisted: noindex/nofollow here, and it is intentionally absent
// from sitemap.ts and every nav. MARKETING_PLAN_KEY is required; page.tsx
// accepts only the HttpOnly session established by the POST access form.
export const metadata: Metadata = {
  title: 'GoInvo — Marketing Strategy & Content Plan',
  description:
    'Restricted GoInvo internal document.',
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
