import { generatePermutations } from 'flags/next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'
import { getMarketingFlagsSecret, marketingExperimentFlags } from '@/flags'
import { getExperimentExposure, getPrecomputedExperimentVariant } from '@/lib/experiments/registry'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'
import { metadata as homeMetadata } from '@/app/(main)/page'

export const revalidate = 3600
export const dynamicParams = true
// This route renders the real homepage content, served at / via the A/B rewrite,
// so it MUST stay indexable — a `noindex` here silently de-indexed the homepage.
// Canonicalize to / so search engines index the homepage and consolidate the
// internal /__exp variant URLs onto it (Google's recommended A/B-test setup).
export const metadata = {
  ...homeMetadata,
  alternates: { canonical: '/' },
}

export async function generateStaticParams() {
  const secret = getMarketingFlagsSecret()
  if (!secret) return []

  const codes = await generatePermutations(marketingExperimentFlags, null, secret)
  return codes.map((code) => ({ code }))
}

// Resolve before rendering so the assigned hero is in the first HTML response.
export default async function ExperimentHomePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const assignment = await getPrecomputedExperimentVariant('/', code)
  // eslint-disable-next-line no-restricted-syntax -- Flags SDK values are not Sanity stega-encoded fields.
  const heroVariant = assignment?.variant === 'runway' ? 'runway' : 'control'
  return (
    <>
      {assignment && <ExperimentExposure experiment={getExperimentExposure(assignment.experiment, heroVariant, '/')} />}
      <HomePageRenderer heroVariant={heroVariant} />
    </>
  )
}
