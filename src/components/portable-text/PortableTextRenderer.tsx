'use client'

import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'

/** Check if a URL points to a direct video file (not an embed like YouTube). */
function isDirectVideoUrl(url: string) {
  if (!url) return false
  return /\.(webm|mp4|mov|ogv)(\?|$)/i.test(url)
}

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const imageUrl = urlForImage(value).width(1200).url()
      return (
        <figure className="my-8">
          <Image
            src={imageUrl}
            alt={value.alt || ''}
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          {value.caption && (
            <figcaption className="mt-2 text-sm text-gray italic text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
    quote: ({ value }) => (
      <Quote text={value.text} author={value.author} role={value.role} />
    ),
    results: ({ value }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 my-12">
        {value.items?.map(
          (item: { stat: string; description: string }, i: number) => (
            <div key={i} className="text-center">
              <div className="font-serif text-3xl text-primary mb-2">
                {item.stat}
              </div>
              <p className="text-gray text-md">{item.description}</p>
            </div>
          )
        )}
      </div>
    ),
    references: ({ value }) => (
      <section className="my-12">
        <h3 className="font-serif text-xl mb-4">References</h3>
        <ol className="list-decimal list-inside space-y-2">
          {value.items?.map(
            (item: { title: string; link?: string }, i: number) => (
              <li key={i} className="text-md text-gray">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </li>
            )
          )}
        </ol>
      </section>
    ),
    columns: ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = value.content || []
      return (
        <figure className="my-8">
          <div
            className={`grid gap-4 ${
              value.layout === '3'
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {items.map((item: { _key?: string; _type: string; alt?: string; asset?: { _ref: string } }) => {
              if (item._type === 'image' && item.asset) {
                const imgUrl = urlForImage(item).width(800).url()
                return (
                  <div key={item._key} className="relative">
                    <Image
                      src={imgUrl}
                      alt={item.alt || ''}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                    />
                  </div>
                )
              }
              return null
            })}
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-sm text-gray italic text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
    videoEmbed: ({ value }) => {
      if (isDirectVideoUrl(value.url)) {
        return (
          <figure className="my-8">
            <video
              src={value.url}
              poster={value.poster || undefined}
              controls
              loop
              muted
              playsInline
              className="w-full"
            />
            {value.caption && (
              <figcaption className="mt-2 text-sm text-gray italic text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        )
      }
      return (
        <figure className="my-8">
          <div className="aspect-video">
            <iframe
              src={value.url}
              className="w-full h-full"
              allowFullScreen
              title={value.caption || 'Video'}
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-sm text-gray italic text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
    divider: ({ value }) => (
      <Divider variant={value?.style === 'thick' ? 'thick' : 'default'} />
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const rel = value?.blank ? 'noopener noreferrer' : undefined
      const target = value?.blank ? '_blank' : undefined
      return (
        <a
          href={value?.href}
          rel={rel}
          target={target}
          className="hover:text-primary"
        >
          {children}
        </a>
      )
    },
  },
  block: {
    h2: ({ children }) => (
      <h2 className="font-serif text-2xl mt-12 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-serif text-xl mt-8 mb-3">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-serif text-lg mt-6 mb-2">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-6 my-6 italic text-gray">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  },
}

interface PortableTextRendererProps {
  content: PortableTextBlock[]
}

export function PortableTextRenderer({ content }: PortableTextRendererProps) {
  return <PortableText value={content} components={components} />
}
