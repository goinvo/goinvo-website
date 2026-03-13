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
    .filter((b: any) => b._type === 'block')
    .map((b: any) =>
      (b.children || []).map((c: any) => c.text || '').join('')
    )
    .join(' ')
}

export function AuthorSection({ authors }: AuthorSectionProps) {
  if (!authors || authors.length === 0) return null

  return (
    <section className="my-12">
      <h2 className="font-serif text-2xl mb-8">Authors</h2>
      {authors.map((author) => {
        const imageUrl = author.image
          ? urlForImage(author.image).width(200).height(200).url()
          : null
        const bio = author.bio ? extractText(author.bio) : ''

        return (
          <div
            key={author._id}
            className={`grid grid-cols-1 gap-6 my-8 ${imageUrl ? 'lg:grid-cols-[200px_1fr]' : ''}`}
          >
            {imageUrl && (
              <div>
                <Image
                  src={imageUrl}
                  alt={author.name}
                  width={200}
                  height={200}
                  className="w-[200px] h-[200px] object-cover rounded"
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
