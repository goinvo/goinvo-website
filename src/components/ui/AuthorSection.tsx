import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

interface AuthorCredit {
  roleOverride?: string
  link?: string
  author?: TeamMember & { social?: { linkedin?: string; twitter?: string; website?: string } }
  _id?: string
  name?: string
  role?: string
  bio?: unknown
  image?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface AuthorSectionProps {
  authors: AuthorCredit[]
  heading?: string
  variant?: 'equal' | 'stacked' | 'primary-sidebar' | 'plain-list'
}

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

function extractText(blocks: unknown): string {
  if (typeof blocks === 'string') return blocks
  if (!Array.isArray(blocks)) return ''

  return blocks
    .filter((block: any) => block._type === 'block') // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((block: any) => (block.children || []).map((child: any) => child.text || '').join('')) // eslint-disable-line @typescript-eslint/no-explicit-any
    .join(' ')
}

export function AuthorSection({ authors, heading, variant = 'equal' }: AuthorSectionProps) {
  if (!authors || authors.length === 0) return null

  const resolved = authors
    .map(resolveAuthor)
    .filter(Boolean) as { member: TeamMember; displayRole: string; link?: string }[]

  if (resolved.length === 0) return null

  const sectionHeading = heading || (resolved.length === 1 ? 'Author' : 'Authors')
  const isContributors = sectionHeading === 'Contributors'
  const headingEl = variant === 'stacked'
    ? (
        isContributors
          ? <h2 className="header-lg mt-5 mb-5 text-center">{sectionHeading}</h2>
          : <h2 className="header-xl font-light mt-8 mb-8 text-center">{sectionHeading}</h2>
      )
    : (
        isContributors
          ? <h3 className="header-md mt-8 mb-4">{sectionHeading}</h3>
          : <h2 className="header-xl font-light mt-8 mb-4 text-center">{sectionHeading}</h2>
      )

  if (variant === 'plain-list') {
    return (
      <section className="mt-12">
        {headingEl}
        {resolved.map((author) => (
          <p key={author.member._id} className="mt-4">
            {author.member.name}
            {author.displayRole && !(sectionHeading === 'Contributors' && author.displayRole === 'GoInvo') && (
              <span className="text-gray">, {author.displayRole}</span>
            )}
          </p>
        ))}
      </section>
    )
  }

  if (variant === 'stacked') {
    return (
      <section className="mt-12">
        {headingEl}
        {resolved.map((author) => {
          const imageUrl = author.member.image
            ? urlForImage(author.member.image).width(400).url()
            : null
          const bio = author.member.bio ? extractText(author.member.bio) : ''

          return (
            <div
              key={author.member._id}
              className={`grid grid-cols-1 gap-6 my-8 items-start ${imageUrl ? 'lg:grid-cols-2' : ''}`}
            >
              {imageUrl && (
                <div>
                  <Image
                    src={imageUrl}
                    alt={author.member.name}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              <div>
                <p className="mt-4">
                  {author.link ? (
                    <a href={author.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      <strong>{author.member.name}</strong>
                    </a>
                  ) : (
                    <strong>{author.member.name}</strong>
                  )}
                  <span className="text-gray">, {author.displayRole}</span>
                </p>
                {bio && <p className="text-gray mt-4">{bio}</p>}
              </div>
            </div>
          )
        })}
      </section>
    )
  }

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
            <p className="mt-4">
              <strong>{primary.member.name}</strong>
              <span className="text-gray">, {primary.displayRole}</span>
            </p>
            {primaryBio && <p className="text-gray mt-4">{primaryBio}</p>}
          </div>

          <div
            className="lg:w-[320px]"
            style={{ border: '3px solid rgb(81, 105, 123)', padding: '32px' }}
          >
            {sidebar.map((author, index) => {
              const authorImage = author.member.image
                ? urlForImage(author.member.image).width(140).height(140).url()
                : null

              return (
                <div key={author.member._id} className={index > 0 ? 'mt-6' : ''}>
                  <div className="flex items-start gap-3">
                    {authorImage && (
                      <Image
                        src={authorImage}
                        alt={author.member.name}
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
                        {author.displayRole}
                      </p>
                      <p className="font-sans mb-0" style={{ fontSize: '28px' }}>
                        {author.member.name}
                      </p>
                    </div>
                  </div>
                  {index < sidebar.length - 1 && (
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

  return (
    <section className="mt-12 w-screen relative left-1/2 -ml-[50vw] py-12 bg-gray-lightest">
      <div className="max-width max-width-md content-padding mx-auto">
        {headingEl}
        {resolved.map((author) => {
          const imageUrl = author.member.image
            ? urlForImage(author.member.image).width(400).url()
            : null
          const bio = author.member.bio ? extractText(author.member.bio) : ''

          return (
            <div
              key={author.member._id}
              className={`grid grid-cols-1 gap-6 my-8 items-start ${imageUrl ? 'lg:grid-cols-2' : ''}`}
            >
              {imageUrl && (
                <div>
                  <Image
                    src={imageUrl}
                    alt={author.member.name}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              <div>
                <p className="mt-4">
                  {author.link ? (
                    <a href={author.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      <strong>{author.member.name}</strong>
                    </a>
                  ) : (
                    <strong>{author.member.name}</strong>
                  )}
                  <span className="text-gray">, {author.displayRole}</span>
                </p>
                {bio && <p className="text-gray mt-4">{bio}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
