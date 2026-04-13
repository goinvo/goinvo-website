import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

/** Author credit — either a plain TeamMember or a wrapper with roleOverride */
interface AuthorCredit {
  roleOverride?: string
  link?: string
  author?: TeamMember & { social?: { linkedin?: string; twitter?: string; website?: string } }
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
  /** Layout variant — "equal" renders all authors the same, "primary-sidebar" highlights the first author with a large photo and shows others in a bordered sidebar */
  variant?: 'equal' | 'primary-sidebar'
}

/** Normalize both old (plain ref) and new (authorCredit object) shapes.
 *
 * Display label (the comma-separated bit after the name) follows Gatsby's
 * convention: it's the AFFILIATION — "GoInvo" for in-house authors —
 * NOT the personal role. We distinguish in-house vs external team members
 * by document _id prefix: team-* are GoInvo, external-* use their stored
 * role (which holds the affiliation like "Yale University"). roleOverride
 * (per-credit) always wins for article-specific labels like "GoInvo, MIT". */
function resolveAuthor(credit: AuthorCredit): { member: TeamMember; displayRole: string; link?: string } | null {
  if (credit.author) {
    const link = credit.link || credit.author.social?.linkedin || undefined
    const isExternal = credit.author._id?.startsWith('external-')
    const fallback = isExternal ? (credit.author.role || 'GoInvo') : 'GoInvo'
    return {
      member: credit.author,
      displayRole: credit.roleOverride || fallback,
      link,
    }
  }
  if (credit._id && credit.name) {
    const isExternal = credit._id.startsWith('external-')
    return {
      member: credit as unknown as TeamMember,
      displayRole: isExternal ? (credit.role || 'GoInvo') : 'GoInvo',
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

export function AuthorSection({ authors, heading, variant = 'equal' }: AuthorSectionProps) {
  if (!authors || authors.length === 0) return null

  const resolved = authors.map(resolveAuthor).filter(Boolean) as { member: TeamMember; displayRole: string; link?: string }[]
  if (resolved.length === 0) return null

  // Determine section heading
  const sectionHeading = heading || (resolved.length === 1 ? 'Author' : 'Authors')
  // Contributors use smaller header-md style (matching Gatsby h3.header--md)
  const isContributors = sectionHeading === 'Contributors'
  const headingEl = isContributors
    ? <h3 className="header-md mt-8 mb-4">{sectionHeading}</h3>
    : <h2 className="header-xl font-light mt-8 mb-4 text-center">{sectionHeading}</h2>

  // ── Variant: primary-sidebar ──────────────────────────────────────────
  // First author gets a large photo + bio, remaining authors show in a
  // bordered sidebar with small thumbnails and role labels (matches Gatsby
  // pages like understanding-ebola)
  if (variant === 'primary-sidebar' && resolved.length > 1) {
    const primary = resolved[0]
    const sidebar = resolved.slice(1)
    const primaryImage = primary.member.image
      ? urlForImage(primary.member.image).width(720).height(480).url()
      : null
    const primaryBio = primary.member.bio ? extractText(primary.member.bio) : ''

    return (
      <section className="mt-12">
        {headingEl}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          {/* Primary author */}
          <div>
            {primaryImage && (
              <Image
                src={primaryImage}
                alt={primary.member.name}
                width={720}
                height={480}
                className="w-full h-auto object-cover mb-4"
              />
            )}
            <p>
              <strong>{primary.member.name}</strong>
              <span className="text-gray">, {primary.displayRole}</span>
            </p>
            {primaryBio && <p className="text-gray mt-1">{primaryBio}</p>}
          </div>

          {/* Sidebar with remaining authors */}
          <div
            className="lg:w-[320px]"
            style={{ border: '3px solid rgb(81, 105, 123)', padding: '32px' }}
          >
            {sidebar.map((contrib, i) => {
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
                      <p className="font-sans mb-0" style={{ fontSize: '28px' }}>
                        {contrib.member.name}
                      </p>
                    </div>
                  </div>
                  {i < sidebar.length - 1 && (
                    <hr
                      className="mt-6"
                      style={{ width: '32px', border: 'none', borderTop: '5px solid rgb(81, 105, 123)', marginLeft: 0 }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // ── Variant: equal (default) ──────────────────────────────────────────
  // Every author rendered with the same image + name + bio layout
  // Gray background matches Gatsby's .background--gray wrapper around
  // the authors section
  return (
    <section className="mt-12 w-screen relative left-1/2 -ml-[50vw] py-12 bg-gray-lightest">
      <div className="max-width max-width-md content-padding mx-auto">
      {headingEl}
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
                {r.link ? (
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    <strong>{r.member.name}</strong>
                  </a>
                ) : (
                  <strong>{r.member.name}</strong>
                )}
                <span className="text-gray">, {r.displayRole}</span>
              </p>
              {bio && <p className="text-gray mt-1">{bio}</p>}
            </div>
          </div>
        )
      })}
      </div>
    </section>
  )
}
