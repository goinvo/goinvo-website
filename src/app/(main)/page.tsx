import type { Metadata } from 'next'
import { HomeContent } from '@/components/home/HomeContent'
import { sanityFetch } from '@/sanity/lib/live'
import { teamMembersQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

export const metadata: Metadata = {
  title: {
    absolute: 'Boston UX Design Agency | GoInvo Boston',
  },
  description:
    'GoInvo is a Boston-based UX design agency specializing in healthcare software design. We deliver beautiful, useful experiences for patients, clinicians, and organizations.',
}

export default async function HomePage() {
  const { data: members } = await sanityFetch({ query: teamMembersQuery }) as { data: TeamMember[] }

  const teamMembers = members.map((m) => ({
    name: m.name,
    image: m.image ? urlForImage(m.image).width(300).height(300).url() : '',
  }))

  return <HomeContent teamMembers={teamMembers} />
}
