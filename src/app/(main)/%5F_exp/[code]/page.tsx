import { generatePermutations } from 'flags/next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'
import { getMarketingFlagsSecret, marketingExperimentFlags } from '@/flags'

export const revalidate = 3600
export const dynamicParams = true
// This route renders the real homepage content, served at / via the A/B rewrite,
// so it MUST stay indexable — a `noindex` here silently de-indexed the homepage.
// Canonicalize to / so search engines index the homepage and consolidate the
// internal /__exp variant URLs onto it (Google's recommended A/B-test setup).
export const metadata = {
  alternates: { canonical: '/' },
}

export async function generateStaticParams() {
  const secret = getMarketingFlagsSecret()
  if (!secret) return []

  const codes = await generatePermutations(marketingExperimentFlags, null, secret)
  return codes.map((code) => ({ code }))
}

// Served at / via the A/B rewrite so the shop-section variant cookie is set at
// the edge. The homepage content is the concept homepage for everyone now; the
// section's presence is decided client-side from that cookie (ShopSectionGate).
export default async function ExperimentHomePage() {
  return <HomePageRenderer />
}
