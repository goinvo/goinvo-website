'use client'

import { useRef } from 'react'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'

/* ------------------------------------------------------------------ */
/*  Scroll-triggered animation wrapper                                 */
/* ------------------------------------------------------------------ */

const EASE = [0.25, 0.1, 0.25, 1] as const

/**
 * Lightweight scroll-reveal for article blocks.
 * - "visual" (images, columns, videos, quotes): pronounced slide-up
 * - "heading": moderate slide-up
 * - "text": gentle fade + slight lift
 */
function ArticleReveal({
  children,
  intensity = 'text',
}: {
  children: React.ReactNode
  intensity?: 'visual' | 'heading' | 'text'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const config = {
    visual: { y: 30, duration: 0.6 },
    heading: { y: 20, duration: 0.5 },
    text: { y: 12, duration: 0.4 },
  }[intensity]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: config.y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: config.y }}
      transition={{ duration: config.duration, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Check if a URL points to a direct video file (not an embed like YouTube). */
function isDirectVideoUrl(url: string) {
  if (!url) return false
  return /\.(webm|mp4|mov|ogv)(\?|$)/i.test(url)
}

/* ------------------------------------------------------------------ */
/*  PortableText component map                                         */
/* ------------------------------------------------------------------ */

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const imageUrl = urlForImage(value).width(800).url()
      return (
        <ArticleReveal intensity="visual">
          <figure className="my-8">
            <img
              src={imageUrl}
              alt={value.alt || ''}
              loading="lazy"
              className="max-w-full h-auto"
            />
            {value.caption && (
              <figcaption className="mt-2 text-sm text-gray italic">
                {value.caption}
              </figcaption>
            )}
          </figure>
        </ArticleReveal>
      )
    },
    quote: ({ value }) => (
      <ArticleReveal intensity="visual">
        <Quote text={value.text} author={value.author} role={value.role} />
      </ArticleReveal>
    ),
    results: ({ value }) => (
      <ArticleReveal intensity="visual">
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
      </ArticleReveal>
    ),
    references: ({ value }) => (
      <ArticleReveal intensity="text">
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
      </ArticleReveal>
    ),
    columns: ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = value.content || []

      // Group items: pair each image with any immediately following text block (caption)
      const groups: { image: any; caption?: string }[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item._type === 'image' && item.asset) {
          // Check for caption: image's own caption field, or a text block immediately after
          let caption = item.caption || ''
          const next = items[i + 1]
          if (next && next._type === 'block' && next.children) {
            const text = next.children.map((c: { text: string }) => c.text).join('')
            if (text.trim()) {
              caption = caption || text.trim()
              i++ // skip the text block since we consumed it as a caption
            }
          }
          groups.push({ image: item, caption })
        }
      }

      return (
        <ArticleReveal intensity="visual">
          <figure className="my-8">
            <div
              className={`grid gap-4 ${
                groups.length >= 3 || value.layout === '3'
                  ? 'grid-cols-1 md:grid-cols-3'
                  : groups.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1'
              }`}
            >
              {groups.map((group) => {
                const imgUrl = urlForImage(group.image).width(800).url()
                return (
                  <figure key={group.image._key} className="m-0">
                    <Image
                      src={imgUrl}
                      alt={group.image.alt || ''}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                    />
                    {group.caption && (
                      <figcaption className="mt-2 text-sm text-gray italic text-center">
                        {group.caption}
                      </figcaption>
                    )}
                  </figure>
                )
              })}
            </div>
            {value.caption && (
              <figcaption className="mt-2 text-sm text-gray italic text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        </ArticleReveal>
      )
    },
    videoEmbed: ({ value }) => {
      if (isDirectVideoUrl(value.url)) {
        return (
          <ArticleReveal intensity="visual">
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
          </ArticleReveal>
        )
      }
      return (
        <ArticleReveal intensity="visual">
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
        </ArticleReveal>
      )
    },
    iframeEmbed: ({ value }) => (
      <ArticleReveal intensity="visual">
        <figure className="my-8">
          <div
            className="relative w-full overflow-hidden"
            style={
              value.height
                ? { height: `${value.height}px` }
                : { aspectRatio: value.aspectRatio || '16/9' }
            }
          >
            <iframe
              src={value.url}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              title={value.caption || 'Embedded content'}
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-sm text-gray italic text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      </ArticleReveal>
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
          className="hover:text-primary"
        >
          {children}
        </a>
      )
    },
  },
  block: {
    h2: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="font-serif text-2xl mt-12 mb-4">{children}</h2>
      </ArticleReveal>
    ),
    h3: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h3 className="font-serif text-xl mt-8 mb-3">{children}</h3>
      </ArticleReveal>
    ),
    h4: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h4 className="font-serif text-lg mt-6 mb-2">{children}</h4>
      </ArticleReveal>
    ),
    blockquote: ({ children }) => (
      <ArticleReveal intensity="text">
        <blockquote className="border-l-4 border-primary pl-6 my-6 italic text-gray">
          {children}
        </blockquote>
      </ArticleReveal>
    ),
    normal: ({ children }) => (
      <ArticleReveal intensity="text">
        <p className="mb-4 leading-relaxed">{children}</p>
      </ArticleReveal>
    ),
  },
}

interface PortableTextRendererProps {
  content: PortableTextBlock[]
}

export function PortableTextRenderer({ content }: PortableTextRendererProps) {
  return <PortableText value={content} components={components} />
}
