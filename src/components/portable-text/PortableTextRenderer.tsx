'use client'

import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'

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
            <figcaption className="mt-2 text-sm text-gray italic">
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
                    className="text-primary hover:text-primary-dark"
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
    columns: ({ value }) => (
      <div
        className={`grid gap-8 my-8 ${
          value.layout === '3' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {/* Column content rendered via nested portable text */}
      </div>
    ),
    videoEmbed: ({ value }) => (
      <div className="my-8 aspect-video">
        <iframe
          src={value.url}
          className="w-full h-full"
          allowFullScreen
          title={value.caption || 'Video'}
        />
        {value.caption && (
          <p className="mt-2 text-sm text-gray italic">{value.caption}</p>
        )}
      </div>
    ),
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
          className="text-primary hover:text-primary-dark underline"
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
