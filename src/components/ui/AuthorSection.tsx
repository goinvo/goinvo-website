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
  /** Section heading — defaults to "Author" for single, layout changes for multi */
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

  const primary = resolved[0]
  const contributors = resolved.slice(1)
  const primaryImage = primary.member.image
    ? urlForImage(primary.member.image).width(720).height(480).url()
    : null
  const primaryBio = primary.member.bio ? extractText(primary.member.bio) : ''

  const sectionHeading = heading || 'Author'

  // Contributors layout: same as authors — photo + name + bio per person
  if (heading === 'Contributors') {
    return (
      <section className="my-12">
        <h2 className="header-lg text-center mt-8 mb-6">Contributors</h2>
        {resolved.map((r) => {
          const img = r.member.image
            ? urlForImage(r.member.image).width(720).height(480).url()
            : null
          const bio = r.member.bio ? extractText(r.member.bio) : ''
          return (
            <div key={r.member._id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8 items-start">
              {img && (
                <div>
                  <Image
                    src={img}
                    alt={r.member.name}
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-gray text-sm mb-0">GoInvo</p>
                <h3 className="font-serif text-2xl mt-1 mb-2">{r.member.name}</h3>
                {bio && <p className="text-gray leading-relaxed">{bio}</p>}
              </div>
            </div>
          )
        })}
      </section>
    )
  }

  // Single author: simple centered layout
  if (resolved.length === 1) {
    return (
      <section className="my-12">
        <h2 className="font-serif text-2xl mt-8 mb-4 text-center">{sectionHeading}</h2>
        <div className={`grid grid-cols-1 gap-6 my-8 items-start ${primaryImage ? 'lg:grid-cols-2' : ''}`}>
          {primaryImage && (
            <div>
              <Image
                src={primaryImage}
                alt={primary.member.name}
                width={600}
                height={400}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          <div>
            <p>
              <strong>{primary.member.name}</strong>
              <span className="text-gray">, {primary.displayRole}</span>
            </p>
            {primaryBio && <p className="text-gray mt-1">{primaryBio}</p>}
          </div>
        </div>
      </section>
    )
  }

  // Multiple authors: primary author (large photo + bio) + contributor sidebar
  // Layout matches Gatsby: centered "Authors" heading, then
  // photo → "Author" label → name → bio on left, bordered box on right
  return (
    <section className="my-12">
      <h2 className="header-lg text-center mt-8 mb-6">Authors</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        {/* Primary author */}
        <div>
          {primaryImage && (
            <Image
              src={primaryImage}
              alt={primary.member.name}
              width={720}
              height={480}
              className="w-full h-auto object-cover mb-6"
            />
          )}
          <h3
            className="font-serif mb-4"
            style={{ fontSize: '36px', fontWeight: 400 }}
          >
            {primary.member.name}
          </h3>
          {primaryBio && <p className="text-gray leading-relaxed">{primaryBio}</p>}
        </div>

        {/* Contributors sidebar — full border box matching Gatsby */}
        {contributors.length > 0 && (
          <div
            className="lg:w-[320px]"
            style={{
              border: '3px solid rgb(81, 105, 123)',
              padding: '32px',
            }}
          >
            {contributors.map((contrib, i) => {
              const contribImage = contrib.member.image
                ? urlForImage(contrib.member.image).width(140).height(140).url()
                : null

              return (
                <div key={contrib.member._id} className={i > 0 ? 'mt-6' : ''}>
                  <div className="flex items-start gap-3">
                    {contribImage && (
                      <Image
                        src={contribImage}
                        alt={contrib.member.name}
                        width={69}
                        height={69}
                        className="rounded-none object-cover shrink-0"
                      />
                    )}
                    <div>
                      <p
                        className="mb-0"
                        style={{ fontSize: '22px', color: 'rgb(136, 136, 136)', fontFamily: 'var(--font-serif)' }}
                      >
                        {contrib.displayRole}
                      </p>
                      <p
                        className="font-sans mb-0"
                        style={{ fontSize: '28px' }}
                      >
                        {contrib.member.name}
                      </p>
                    </div>
                  </div>
                  {i < contributors.length - 1 && (
                    <hr
                      className="mt-6"
                      style={{
                        width: '32px',
                        border: 'none',
                        borderTop: '5px solid rgb(81, 105, 123)',
                        marginLeft: 0,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
