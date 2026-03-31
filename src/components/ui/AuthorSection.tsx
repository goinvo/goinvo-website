import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

/** Author credit — either a plain TeamMember or a wrapper with roleOverride */
interface AuthorCredit {
  roleOverride?: string
  author?: TeamMember
  // Backward compat: plain TeamMember fields
  _id?: string
  name?: string
  role?: string
  bio?: unknown
  image?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface AuthorSectionProps {
  authors: AuthorCredit[]
  /** Section heading — defaults to "Author"/"Authors" based on count */
  heading?: string
}

/** Normalize both old (plain ref) and new (authorCredit object) shapes */
function resolveAuthor(credit: AuthorCredit): { member: TeamMember; displayRole: string } | null {
  if (credit.author) {
    return {
      member: credit.author,
      displayRole: credit.roleOverride || credit.author.role || 'GoInvo',
    }
  }
  if (credit._id && credit.name) {
    return {
      member: credit as unknown as TeamMember,
      displayRole: credit.role || 'GoInvo',
    }
  }
  return null
}

/** Extract plain text from Portable Text blocks or plain string. */
function extractText(blocks: unknown): string {
  if (typeof blocks === 'string') return blocks
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter((b: any) => b._type === 'block') // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
      (b.children || []).map((c: any) => c.text || '').join('') // eslint-disable-line @typescript-eslint/no-explicit-any
    )
    .join(' ')
}

export function AuthorSection({ authors, heading }: AuthorSectionProps) {
  if (!authors || authors.length === 0) return null

  const resolved = authors.map(resolveAuthor).filter(Boolean) as { member: TeamMember; displayRole: string }[]
  if (resolved.length === 0) return null

  // Determine section heading
  const sectionHeading = heading || (resolved.length === 1 ? 'Author' : 'Authors')

  return (
    <section className="my-12">
      <h2 className="font-serif text-2xl mt-8 mb-4 text-center">{sectionHeading}</h2>
      {resolved.map((r) => {
        const imageUrl = r.member.image
          ? urlForImage(r.member.image).width(400).url()
          : null
        const bio = r.member.bio ? extractText(r.member.bio) : ''

        return (
          <div
            key={r.member._id}
            className={`grid grid-cols-1 gap-6 my-8 items-start ${imageUrl ? 'lg:grid-cols-2' : ''}`}
          >
            {imageUrl && (
              <div>
                <Image
                  src={imageUrl}
                  alt={r.member.name}
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div>
              <p>
                <strong>{r.member.name}</strong>
                <span className="text-gray">, {r.displayRole}</span>
              </p>
              {bio && <p className="text-gray mt-1">{bio}</p>}
            </div>
          </div>
        )
      })}
    </section>
  )
}
