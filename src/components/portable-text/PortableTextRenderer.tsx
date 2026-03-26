'use client'

import { useRef } from 'react'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import { cn } from '@/lib/utils'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'

/* ------------------------------------------------------------------ */
/*  Scroll-triggered animation wrapper                                 */
/* ------------------------------------------------------------------ */

const EASE = [0.25, 0.1, 0.25, 1] as const

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

function isDirectVideoUrl(url: string) {
  if (!url) return false
  return /\.(webm|mp4|mov|ogv)(\?|$)/i.test(url)
}

const imageSizeClasses: Record<string, string> = {
  small: 'max-w-[25%]',
  medium: 'max-w-[50%]',
  large: 'max-w-[75%]',
  full: 'max-w-full',
}

const imageAlignClasses: Record<string, string> = {
  left: '',
  center: 'mx-auto',
  right: 'ml-auto',
}

const bgSectionColors: Record<string, string> = {
  gray: 'bg-gray-lightest',
  teal: 'bg-secondary text-white',
  warm: 'bg-[#faf6f4]',
  orange: 'bg-primary/5',
}

/* ------------------------------------------------------------------ */
/*  PortableText component map                                         */
/* ------------------------------------------------------------------ */

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null
      const size = value.size || 'full'
      const align = value.align || 'center'
      const width = size === 'small' ? 400 : size === 'medium' ? 600 : 800
      const imageUrl = urlForImage(value).width(width).url()
      return (
        <ArticleReveal intensity="visual">
          <figure className={cn('my-8', imageSizeClasses[size], imageAlignClasses[align])}>
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
    results: ({ value }) => {
      const items: { stat: string; description: string }[] = value.items || []
      const count = items.length
      const bg = value.background || 'none'
      const bgClass = bg !== 'none' ? (bg === 'gray' ? 'bg-gray-lightest' : 'bg-secondary/10') : ''
      return (
        <ArticleReveal intensity="visual">
          <div
            className={cn(
              'grid gap-8 my-12',
              bgClass && `${bgClass} p-8 rounded`,
              count === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : count === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                  : count === 4
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                    : count % 3 === 0
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {items.map((item, i) => (
              <div key={i} className={count === 1 ? 'text-left' : 'text-center'}>
                <div className="font-serif text-3xl text-primary mb-2">
                  {item.stat}
                </div>
                <p className="text-gray text-md">{item.description}</p>
              </div>
            ))}
          </div>
        </ArticleReveal>
      )
    },
    references: ({ value }) => (
      <ArticleReveal intensity="text">
        <section id="references" className="my-12 border-t border-gray-medium pt-8">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-[2px] text-gray mb-4">References</h3>
          <ol className="list-none pl-0 space-y-3 text-sm">
            {value.items?.map(
              (item: { title: string; link?: string }, i: number) => {
                let displayTitle = item.title || ''
                if (item.link && displayTitle.includes(item.link)) {
                  displayTitle = displayTitle.replace(item.link, '').replace(/:\s*$/, '').trim()
                }
                return (
                  <li key={i} className="text-gray flex gap-2">
                    <span className="text-gray/50 font-semibold shrink-0">{i + 1}.</span>
                    <span>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary hover:text-primary underline underline-offset-2"
                        >
                          {displayTitle || item.link}
                        </a>
                      ) : (
                        displayTitle
                      )}
                    </span>
                  </li>
                )
              }
            )}
          </ol>
        </section>
      </ArticleReveal>
    ),
    columns: ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = value.content || []

      const groups: { image: any; caption?: string }[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item._type === 'image' && item.asset?._ref) {
          let caption = item.caption || ''
          const next = items[i + 1]
          if (next && next._type === 'block' && next.children) {
            const text = next.children.map((c: { text: string }) => c.text).join('')
            if (text.trim()) {
              caption = caption || text.trim()
              i++
            }
          }
          groups.push({ image: item, caption })
        }
      }

      const colCount = value.layout === '4' ? 4 : value.layout === '3' ? 3 : 2

      return (
        <ArticleReveal intensity="visual">
          <figure className="my-8">
            <div
              className={cn(
                'grid gap-4',
                colCount === 4
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : colCount === 3
                    ? 'grid-cols-1 md:grid-cols-3'
                    : groups.length === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1'
              )}
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
    backgroundSection: ({ value }) => {
      const bgClass = bgSectionColors[value.color] || bgSectionColors.gray
      return (
        <ArticleReveal intensity="visual">
          <div className={cn('-mx-4 md:-mx-8 px-4 md:px-8 py-8 my-8', bgClass)}>
            {value.content && (
              <PortableText value={value.content} components={components} />
            )}
          </div>
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
  list: {
    bullet: ({ children }) => (
      <ArticleReveal intensity="text">
        <ul className="ul text-gray mb-8">{children}</ul>
      </ArticleReveal>
    ),
    number: ({ children }) => (
      <ArticleReveal intensity="text">
        <ol className="list-decimal pl-6 text-gray mb-8 space-y-2">{children}</ol>
      </ArticleReveal>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
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
    sup: ({ children }) => <sup>{children}</sup>,
    teal: ({ children }) => <span className="text-secondary">{children}</span>,
    orange: ({ children }) => <span className="text-primary">{children}</span>,
    refCitation: ({ children, value }) => (
      <sup>
        <a
          href="#references"
          className="text-secondary hover:text-primary text-xs no-underline"
        >
          {value?.refNumber || children}
        </a>
      </sup>
    ),
  },
  block: {
    h2: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="font-serif text-2xl mt-12 mb-4">{children}</h2>
      </ArticleReveal>
    ),
    h2Center: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="font-serif text-2xl mt-12 mb-4 text-center">{children}</h2>
      </ArticleReveal>
    ),
    sectionTitle: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light mt-16 mb-6 text-center">{children}</h2>
      </ArticleReveal>
    ),
    h3: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h3 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mt-8 mb-3">{children}</h3>
      </ArticleReveal>
    ),
    h4: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h4 className="font-sans text-base font-bold mt-6 mb-2">{children}</h4>
      </ArticleReveal>
    ),
    blockquote: ({ children }) => (
      <ArticleReveal intensity="text">
        <blockquote className="border-l-4 border-primary pl-6 my-6 italic text-gray">
          {children}
        </blockquote>
      </ArticleReveal>
    ),
    callout: ({ children }) => (
      <ArticleReveal intensity="text">
        <div className="bg-[#faf6f4] border-l-4 border-primary my-6 py-4 pr-4 pl-5 leading-[1.625rem]">
          {children}
        </div>
      </ArticleReveal>
    ),
    normal: ({ children }) => (
      <ArticleReveal intensity="text">
        <p className="text-gray mb-4 leading-relaxed">{children}</p>
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
