import { client } from '@/sanity/lib/client'
import { teamMembersQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

/** The same published roster used by the current homepage, with no draft reads. */
export async function getHumanReviewTeam() {
  const members = await client.fetch<TeamMember[]>(teamMembersQuery, {}, { perspective: 'published', stega: false })
  const alexandra = await client.fetch<Pick<TeamMember, 'name' | 'image'> | null>(
    '*[_id == "team-alexandra" && defined(image)][0]{name,image}', {}, { perspective: 'published', stega: false },
  )
  const unique = new Map<string, Pick<TeamMember, 'name' | 'image'>>()
  for (const member of [...members, ...(alexandra ? [alexandra] : [])]) {
    if (member.image) unique.set(member.name.trim().toLowerCase(), member)
  }
  const portraits = [...unique.values()].slice(0, 9).map(member => ({
    name: member.name,
    image: urlForImage(member.image!).width(600).height(600).fit('crop').url(),
  }))
  if (portraits.length !== 9) throw new Error(`Expected nine published studio portraits; found ${portraits.length}`)
  return portraits
}
