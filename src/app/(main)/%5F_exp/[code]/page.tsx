import { generatePermutations } from 'flags/next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'
import {
  getExperimentExposure,
  getPrecomputedExperimentVariant,
} from '@/lib/experiments/registry'
import { getMarketingFlagsSecret, marketingExperimentFlags, type Home2026Variant } from '@/flags'

interface Props {
  params: Promise<{ code: string }>
}

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

export default async function ExperimentHomePage({ params }: Props) {
  const { code } = await params
  const resolved = await getPrecomputedExperimentVariant('/', code)
  const variant = (resolved?.variant || 'control') as Home2026Variant
  const experiment = resolved
    ? getExperimentExposure(resolved.experiment, variant, '/')
    : undefined

  return <HomePageRenderer variant={variant} experiment={experiment} />
}
