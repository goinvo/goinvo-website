import { HomeContent } from '@/components/home/HomeContent'
import { HomeConceptContent } from '@/components/home/HomeConceptContent'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'
import { sanityFetch } from '@/sanity/lib/live'
import { teamMembersQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import type { ExperimentExposure as ExperimentExposureData } from '@/lib/experiments/registry'
import type { Home2026Variant } from '@/flags'
import type { TeamMember } from '@/types'

interface HomePageRendererProps {
  variant?: Home2026Variant
  experiment?: ExperimentExposureData
}

async function getHomeTeamMembers() {
  const { data: members } = (await sanityFetch({ query: teamMembersQuery })) as { data: TeamMember[] }

  // Skip members without a photo so the scrolling portraits never render a
  // blank/broken box (e.g. Alexandra, whose photo is coming soon). autoFill on
  // the marquees keeps the rows full even with fewer portraits.
  return members
    .filter((member) => member.image)
    .map((member) => ({
      name: member.name,
      image: urlForImage(member.image!).width(300).height(300).url(),
    }))
}

// The concept studio grid also shows Alexandra Coston, who is hidden from the
// team query (showOnAboutPage: false). Fetch her by id and append her for the
// concept variant only, so the A/B control marquee stays unchanged.
async function withConceptGridMembers(base: { name: string; image: string }[]) {
  if (base.some((member) => member.name === 'Alexandra Coston')) return base
  const { data } = (await sanityFetch({
    query: '*[_id == "team-alexandra" && defined(image)][0]{ name, image }',
  })) as { data: Pick<TeamMember, 'name' | 'image'> | null }
  if (!data?.image) return base
  return [...base, { name: data.name, image: urlForImage(data.image).width(300).height(300).url() }]
}

export async function HomePageRenderer({
  variant = 'control',
  experiment,
}: HomePageRendererProps = {}) {
  const teamMembers = await getHomeTeamMembers()

  if (variant === 'concept') {
    const conceptMembers = await withConceptGridMembers(teamMembers)
    return (
      <>
        {experiment && <ExperimentExposure experiment={experiment} />}
        <HomeConceptContent teamMembers={conceptMembers} />
      </>
    )
  }

  return (
    <>
      {experiment && <ExperimentExposure experiment={experiment} />}
      <HomeContent teamMembers={teamMembers} />
    </>
  )
}

