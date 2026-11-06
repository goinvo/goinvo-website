import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomeStory } from '@/components/home-story/HomeStory'
import { getHumanReviewTeam } from '@/lib/humanReview.server'

export const metadata: Metadata = {
  title: 'Complexity, made human — homepage study',
  description: 'A review-only GoInvo homepage direction: human-centered design in the AI age.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: '/design-lab/human' },
}

// A review surface inside the site layout, so its prototypes can open the real
// case studies through the site's card transition. Unlisted and noindexed; it
// does not enter the live homepage experiment or read unpublished stories.
export default async function HumanHomeReview({ searchParams }: { searchParams: Promise<{ work?: string }> }) {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const portraits = await getHumanReviewTeam()

  // The chosen prototype lives in the address, so Back from its case study
  // returns to it (and the reverse morph lands on the right preview).
  const { work } = await searchParams
  return <HomeStory variant="human" teamMembers={portraits} work={work} />
}
