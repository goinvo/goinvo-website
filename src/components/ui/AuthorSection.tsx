import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import type { TeamMember } from '@/types'

interface AuthorSectionProps {
  authors: TeamMember[]
}

/** Extract plain text from Portable Text blocks. */
function extractText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter((b: any) => b._type === 'block') // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
      (b.children || []).map((c: any) => c.text || '').join('') // eslint-disable-line @typescript-eslint/no-explicit-any
    )
    .join(' ')
}

export function AuthorSection({ authors }: AuthorSectionProps) {
  if (!authors || authors.length === 0) return null

  return (
    <section className="my-12">
      <h2 className="font-serif text-2xl mt-8 mb-4">{authors.length === 1 ? 'Author' : 'Authors'}</h2>
      {authors.map((author) => {
        const imageUrl = author.image
          ? urlForImage(author.image).width(400).url()
          : null
        const bio = author.bio ? extractText(author.bio) : ''

        return (
          <div
            key={author._id}
            className={`grid grid-cols-1 gap-6 my-8 items-start ${imageUrl ? 'lg:grid-cols-2' : ''}`}
          >
            {imageUrl && (
              <div>
                <Image
                  src={imageUrl}
                  alt={author.name}
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div>
              <p>
                <strong>{author.name}</strong>
                <span className="text-gray">, GoInvo</span>
              </p>
              {bio && <p className="text-gray mt-1">{bio}</p>}
            </div>
          </div>
        )
      })}
    </section>
  )
}
