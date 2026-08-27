import type { Metadata } from 'next'

// Clean, chrome-free layout for the gated execution plan.
//
// Outside the (main) route group on purpose so it does NOT inherit the site
// Header/Footer/analytics/chat. Unlisted: noindex here, and absent from
// sitemap.ts and every nav. Access requires MARKETING_PLAN_KEY — the same key
// as /marketing-plan and /outreach-plan, so there is one password to share.
export const metadata: Metadata = {
  title: 'GoInvo — Execution Plan',
  description: 'Restricted GoInvo internal document.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function ActionPlanLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
