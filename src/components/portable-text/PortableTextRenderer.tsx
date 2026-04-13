'use client'

import { useRef, Fragment } from 'react'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'
import { cn } from '@/lib/utils'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { ImageCarousel } from '@/components/ui/ImageCarousel'
import { VirtualCareTop15Table, VirtualCareTimeToDiagnosis } from '@/components/portable-text/VirtualCareTop15Table'

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
  bleed: 'w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] max-w-none',
}

const imageAlignClasses: Record<string, string> = {
  left: '',
  center: 'mx-auto',
  right: 'ml-auto',
}

const bgSectionColors: Record<string, string> = {
  gray: 'bg-gray-lightest',
  teal: 'bg-[#e5f5f5]',
  blue: 'bg-[#f8fafe]',
  warm: 'bg-[#faf6f4]',
  orange: 'bg-primary/5',
  dark: 'bg-[#2e2e2e] text-white',
  red: 'bg-[#6b2337] text-white',
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
      const border = value.border || 'none'
      const borderClasses: Record<string, string> = {
        none: '',
        peach: 'border-[15px] border-[#FFEEE4]',
        gray: 'border-[15px] border-[#e0e0e0]',
        teal: 'border-[15px] border-secondary',
      }
      const width = size === 'small' ? 400 : size === 'medium' ? 600 : size === 'bleed' ? 1600 : 1200
      const imageUrl = urlForImage(value).width(width).url()
      return (
        <ArticleReveal intensity="visual">
          <figure className={cn('my-8', imageSizeClasses[size], size !== 'bleed' && imageAlignClasses[align])}>
            <img
              src={imageUrl}
              alt={value.alt || ''}
              loading="lazy"
              className={cn('h-auto', size === 'bleed' ? 'w-full' : 'max-w-full', borderClasses[border])}
            />
            {value.caption && (
              <figcaption className="mt-2 text-base text-gray">
                {value.caption}
              </figcaption>
            )}
          </figure>
        </ArticleReveal>
      )
    },
    quote: ({ value }) => (
      <ArticleReveal intensity="visual">
        <Quote text={value.text} author={value.author} role={value.role} refNumber={value.refNumber} refTarget={value.refTarget} />
      </ArticleReveal>
    ),
    results: ({ value }) => {
      const items: { stat: string; description: string; refNumber?: string; refTarget?: string }[] = value.items || []
      const count = items.length
      const bg = value.background || 'none'
      const variant = value.variant || 'row'
      const perItemBg = bg === 'gray' ? 'bg-gray-lightest' : bg === 'teal' ? 'bg-secondary/10' : ''

      // Determine grid classes based on variant
      let gridClasses: string
      if (variant === 'stacked') {
        gridClasses = 'grid-cols-1 max-w-md mx-auto'
      } else if (variant === 'grid') {
        gridClasses = 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
      } else {
        // "row" (default) — auto-detect columns from item count
        gridClasses = count === 1
          ? 'grid-cols-1 max-w-md mx-auto'
          : count === 2
            ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
            : count === 4
              ? 'grid-cols-2 lg:grid-cols-4'
              : count % 3 === 0
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }

      return (
        <ArticleReveal intensity="visual">
          <div
            className={cn(
              'grid gap-4 my-12',
              gridClasses,
            )}
          >
            {items.map((item, i) => (
              <div key={i} className="text-center">
                <div className={cn(
                  'p-4 mb-2',
                  perItemBg || '',
                )}>
                  <span className={cn(
                    'block font-serif text-[2.25rem]',
                    perItemBg ? '' : 'text-primary',
                  )}>
                    {item.stat}
                  </span>
                </div>
                <p className="text-sm text-gray px-1">
                  {item.description}
                  {item.refNumber && (
                    <>
                      <sup>
                        <a
                          href={`#${item.refTarget || 'references'}`}
                          className="!text-primary !no-underline hover:!underline text-xs"
                        >
                          {' '}{item.refNumber}
                        </a>
                      </sup>{' '}
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </ArticleReveal>
      )
    },
    reviewCard: ({ value }) => {
      const isRejected = value.status === 'rejected'
      const badgeColor = isRejected ? 'text-[#d62e17] bg-[#fdeaea]' : 'text-[#00a000] bg-[#e0ffef]'
      return (
        <ArticleReveal intensity="visual">
          <div className="rounded-lg overflow-hidden shadow-card my-8">
            <div className="bg-[#2e2e2e] text-white px-5 py-3 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRejected ? 'bg-[#d62e17]' : 'bg-[#00a000]'}`} />
              <span className="text-sm font-medium">{value.title}</span>
            </div>
            <div className="bg-white px-5 py-5">
              <span className={`inline-block text-sm font-semibold uppercase rounded-full px-3 py-1 mb-4 ${badgeColor}`}>
                {value.status === 'rejected' ? 'Rejected' : 'Certified'}
              </span>
              {value.quote && (
                <p className="font-serif italic text-[1.5rem] leading-[1.35] text-black mb-3">
                  &quot;{value.quote}&quot;
                </p>
              )}
              {value.reason && (
                <p className="text-gray text-sm font-semibold mb-1">{value.reason}</p>
              )}
              {value.description && (
                <p className="text-[#8c8887] text-sm m-0">{value.description}</p>
              )}
            </div>
          </div>
        </ArticleReveal>
      )
    },
    cardGrid: ({ value }) => {
      const items: { label: string; description: string }[] = value.items || []
      const cols = value.columns || '4'
      const gridCols = cols === '2' ? 'sm:grid-cols-2' : cols === '3' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'

      return (
        <ArticleReveal intensity="visual">
          <div className={cn('grid grid-cols-1 gap-4 my-8', gridCols)}>
            {items.map((item, i) => (
              <div key={i} className="border border-gray-medium rounded-md bg-white p-4">
                <strong className="block text-xs uppercase tracking-[2px] text-black mb-2">{item.label}</strong>
                <p className="text-sm text-gray leading-relaxed m-0">{item.description}</p>
              </div>
            ))}
          </div>
        </ArticleReveal>
      )
    },
    references: ({ value }) => (
      <ArticleReveal intensity="text">
        <section id="references" className="w-screen relative left-1/2 -ml-[50vw] py-12 my-8 bg-gray-lightest">
          <div className="max-width max-width-md content-padding mx-auto">
            <h2 className="header-lg text-center mt-8 mb-4">References</h2>
            <ol className="pl-0 ml-0 list-decimal" style={{ listStylePosition: 'inside' }}>
              {value.items?.map(
                (item: { title: string; link?: string }, i: number) => (
                  <li key={i} className="text-gray mb-4 break-words" id={`ref-${i + 1}`}>
                    <span id={`fn-${i + 1}`}>{item.title || ''}</span>
                    {item.link && (
                      <span>
                        :{' '}
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary hover:text-primary break-all"
                        >
                          {item.link}
                        </a>
                      </span>
                    )}
                  </li>
                )
              )}
            </ol>
          </div>
        </section>
      </ArticleReveal>
    ),
    columns: ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = value.content || []
      const colCount = value.layout === '4' ? 4 : value.layout === '3' ? 3 : 2 // 2:1 and 1:2 also count as 2
      const isStoryboard = value.layout === 'storyboard'
      const bg = value.background || 'none'
      const sizeClass = value.size === 'wide' ? 'columns-wide' : value.size === 'bleed' ? 'w-screen relative left-1/2 -ml-[50vw]' : ''
      // Wrapper function to apply size override
      const Wrap = ({ children }: { children: React.ReactNode }) => sizeClass ? <div className={sizeClass}>{children}</div> : <>{children}</>
      const bgClasses: Record<string, string> = {
        none: '',
        gray: 'bg-[#f1f6f6] rounded-sm',
        teal: 'bg-[#cbe1df] rounded-sm',
        warm: 'bg-[#faf6f3] rounded-sm',
      }

      const images = items.filter(i => i._type === 'image' && i.asset?._ref)
      const textBlocks = items.filter(i => i._type === 'block')
      const hasText = textBlocks.length > 0
      const hasImages = images.length > 0

      // Storyboard layout: image-on-top text-below cells in a 2-column grid
      // Items should alternate: image, text, image, text, ...
      // Each [image, text] pair becomes one cell in the 2-col grid
      if (isStoryboard && hasText && hasImages) {
        // Group items into [image, text] cells
        const cells: { image: any; text: any[] }[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
        let currentCell: { image: any; text: any[] } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any
        for (const item of items) {
          if (item._type === 'image' && item.asset?._ref) {
            if (currentCell) cells.push(currentCell)
            currentCell = { image: item, text: [] }
          } else if (currentCell) {
            currentCell.text.push(item)
          }
        }
        if (currentCell) cells.push(currentCell)

        // Single cell: render image full-width with text below (single-image storyboard)
        // Multiple cells: render as 2-col grid
        const isMulti = cells.length >= 2
        return (
          <ArticleReveal intensity="visual">
            <figure className={cn('my-8', bgClasses[bg])}>
              <div className={cn('grid gap-6', isMulti ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
                {cells.map((cell) => {
                  const imgUrl = urlForImage(cell.image).width(800).url()
                  return (
                    <div key={cell.image._key} className="m-0">
                      <img
                        src={imgUrl}
                        alt={cell.image.alt || ''}
                        loading="lazy"
                        className="w-full h-auto"
                      />
                      {cell.text.length > 0 && (
                        <div className="mt-2 [&_p]:my-2 [&_p]:text-base [&_p]:text-gray">
                          <PortableText value={cell.text} components={components} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </figure>
          </ArticleReveal>
        )
      }

      // Detect alternating image-text pairs (gallery with captions below each image)
      // Pattern: [image, text, image, text, ...] → render as image grid with captions
      const isGalleryPattern = hasText && hasImages && items.length >= 2 && (() => {
        // Check if items alternate: image, text, image, text...
        // or start with text (title), then image, text pairs
        let pairStart = 0
        if (items[0]._type === 'block') pairStart = 1 // Skip leading title block
        for (let j = pairStart; j < items.length - 1; j += 2) {
          if (items[j]._type !== 'image') return false
          if (j + 1 < items.length && items[j + 1]._type !== 'block') return false
        }
        return items.filter(i => i._type === 'image').length >= 2
      })()

      // Mixed content: text + image side by side
      // For 2-column layout with exactly [image, text] or [text, image], always use side-by-side
      if (hasText && hasImages && colCount === 2 && (items.length === 2 || !isGalleryPattern)) {
        const firstImageIdx = items.findIndex(i => i._type === 'image' && i.asset?._ref)
        const firstTextIdx = items.findIndex(i => i._type === 'block')
        const imageFirst = firstImageIdx < firstTextIdx

        const imageItems = items.filter(i => i._type === 'image' && i.asset?._ref)
        const textItems = items.filter(i => i._type !== 'image' || !i.asset?._ref)

        // Card layout: image in narrow tinted column, text in wider column
        // Matches Gatsby's research-chunk pattern (260px image area + text)
        if (bg !== 'none') {
          const imgUrl = imageItems[0] ? urlForImage(imageItems[0]).width(400).url() : ''
          return (
            <ArticleReveal intensity="visual">
              <div className={cn('my-5 flex flex-col md:flex-row', bgClasses[bg])}>
                {imageFirst && imgUrl && (
                  <div className="bg-[#cbe1df] p-3 md:w-[260px] shrink-0 flex items-center justify-center">
                    <img src={imgUrl} alt={imageItems[0]?.alt || ''} loading="lazy" className="max-w-full h-auto max-h-[195px] object-contain" />
                  </div>
                )}
                <div className="p-5 pb-2 flex-1 [&_h4:first-of-type]:mt-0 [&_h3:first-of-type]:mt-0 [&_p]:mt-0">
                  <PortableText value={textItems} components={components} />
                </div>
                {!imageFirst && imgUrl && (
                  <div className="bg-[#cbe1df] p-3 md:w-[260px] shrink-0 flex items-center justify-center">
                    <img src={imgUrl} alt={imageItems[0]?.alt || ''} loading="lazy" className="max-w-full h-auto max-h-[195px] object-contain" />
                  </div>
                )}
              </div>
            </ArticleReveal>
          )
        }

        // Asymmetric layout: 2:1 or 1:2 ratio
        const isAsymmetric = value.layout === '2:1' || value.layout === '1:2'
        const gridClass = isAsymmetric
          ? (value.layout === '2:1' ? 'grid-cols-1 md:grid-cols-[2fr_1fr]' : 'grid-cols-1 md:grid-cols-[1fr_2fr]')
          : 'grid-cols-1 md:grid-cols-2'

        // Side-by-side grid (50/50 or asymmetric)
        const renderImages = () => (
          <div className="flex flex-col items-center justify-center">
            {imageItems.map((item) => {
              const imgSize = item.size || 'full'
              const imgWidth = imgSize === 'small' ? 400 : imgSize === 'medium' ? 600 : 800
              const colImageSizeClasses: Record<string, string> = {
                small: 'max-w-[250px]',
                medium: 'max-w-[400px]',
                large: 'max-w-[600px]',
                full: 'max-w-full',
              }
              const imgUrl = urlForImage(item).width(imgWidth).url()
              return (
                <figure key={item._key} className={cn('m-0 mx-auto', colImageSizeClasses[imgSize])}>
                  <img src={imgUrl} alt={item.alt || ''} loading="lazy" className="max-w-full h-auto" />
                  {item.caption && (
                    <figcaption className="mt-2 text-base text-gray text-center">{item.caption}</figcaption>
                  )}
                </figure>
              )
            })}
          </div>
        )

        const renderText = () => (
          <div>
            <PortableText value={textItems} components={components} />
          </div>
        )

        return (
          <ArticleReveal intensity="visual">
            <div className={cn('my-8 grid gap-8 items-start', gridClass)}>
              {imageFirst ? renderImages() : renderText()}
              {imageFirst ? renderText() : renderImages()}
            </div>
          </ArticleReveal>
        )
      }

      // Image-only: grid of images (original behavior)
      if (hasImages) {
        // Group items into image + following content blocks
        // Each group: one image followed by zero or more text/list blocks until the next image
        const groups: { image: any; content: any[] }[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
        let currentGroup: { image: any; content: any[] } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any
        for (const item of items) {
          if (item._type === 'image' && item.asset?._ref) {
            if (currentGroup) groups.push(currentGroup)
            currentGroup = { image: item, content: [] }
          } else if (currentGroup) {
            currentGroup.content.push(item)
          }
        }
        if (currentGroup) groups.push(currentGroup)

        return (
          <Wrap>
          <ArticleReveal intensity="visual">
            <figure className={cn("my-8", bg !== 'none' && 'p-5', bgClasses[bg])}>
              <div
                className={cn(
                  'grid gap-4',
                  colCount === 4
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : colCount === 3
                      ? 'grid-cols-1 md:grid-cols-3'
                      : groups.length >= 2
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1'
                )}
              >
                {groups.map((group) => {
                  const imgUrl = urlForImage(group.image).width(800).url()
                  const caption = group.image.caption || ''
                  const hasRichContent = group.content.length > 0
                  // Check if content is just a short caption (bold text < 60 chars)
                  const isShortCaption = group.content.length === 1 && group.content[0]._type === 'block' &&
                    (group.content[0].children || []).map((c: {text: string}) => c.text).join('').length < 60
                  const isBoldCaption = isShortCaption && (group.content[0].children || []).some((c: {marks?: string[]}) => c.marks?.includes('strong'))
                  return (
                    <div key={group.image._key} className="m-0">
                      <Image
                        src={imgUrl}
                        alt={group.image.alt || ''}
                        width={800}
                        height={600}
                        className="w-full h-auto"
                      />
                      {caption && !hasRichContent && (
                        <p className="mt-2 text-base text-gray text-center">{caption}</p>
                      )}
                      {isShortCaption && (
                        <div className={cn('mt-2 text-base text-center', isBoldCaption ? '' : 'text-gray')}>
                          <PortableText value={group.content} components={components} />
                        </div>
                      )}
                      {hasRichContent && !isShortCaption && (
                        <div className="mt-2">
                          <PortableText value={group.content} components={components} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {value.caption && (
                <figcaption className="mt-2 text-base text-gray text-center">
                  {value.caption}
                </figcaption>
              )}
            </figure>
          </ArticleReveal>
          </Wrap>
        )
      }

      // Text-only: render in grid columns
      return (
        <ArticleReveal intensity="visual">
          <div className={cn('my-8 grid gap-4', colCount === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3')}>
            <PortableText value={items} components={components} />
          </div>
        </ArticleReveal>
      )
    },
    backgroundSection: ({ value }) => {
      const bgClass = bgSectionColors[value.color] || bgSectionColors.gray
      return (
        <ArticleReveal intensity="visual">
          <div className={cn('w-screen relative left-1/2 -ml-[50vw] py-12 my-8', bgClass)}>
            <div className="max-width max-width-md content-padding mx-auto">
              {value.content && (
                <PortableText value={value.content} components={components} />
              )}
            </div>
          </div>
        </ArticleReveal>
      )
    },
    videoEmbed: ({ value }) => {
      const videoSize = value.size || 'default'
      // wide = 75% of viewport (breaks out of article container), full = 100% viewport
      const sizeClass = videoSize === 'wide'
        ? 'w-[75vw] relative left-1/2 -translate-x-1/2'
        : videoSize === 'full'
          ? 'w-screen relative left-1/2 -ml-[50vw]'
          : ''
      if (isDirectVideoUrl(value.url)) {
        // Auto-derive poster from video URL by swapping the extension
        // (matches Gatsby pattern: video.mp4 → video.jpg next to it on CDN)
        const derivedPoster = value.poster || value.url.replace(/\.(mp4|webm|mov|ogv)(\?|$)/i, '.jpg$2')
        return (
          <ArticleReveal intensity="visual">
            <figure className={cn('my-8', sizeClass)}>
              <video
                src={value.url}
                poster={derivedPoster}
                controls={!value.autoPlay}
                autoPlay={value.autoPlay || undefined}
                loop
                muted
                playsInline
                className={cn('w-full', videoSize === 'default' && 'max-h-[480px] object-contain')}
              />
              {value.caption && (
                <figcaption className="mt-2 text-base text-gray text-center">
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
              <figcaption className="mt-2 text-base text-gray text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        </ArticleReveal>
      )
    },
    iframeEmbed: ({ value }) => (
      <ArticleReveal intensity="visual">
        <figure className={cn('my-8', value.fullWidth && 'w-screen relative left-1/2 -ml-[50vw]')}>
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
            <figcaption className="mt-2 text-base text-gray text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      </ArticleReveal>
    ),
    buttonGroup: ({ value }) => {
      const buttons = value.buttons || []
      const layout = value.layout || 'inline'
      const isSingleCenteredButton = layout === 'centered' && buttons.length === 1
      const containerClass = layout === 'fullWidth' ? 'flex gap-4'
        : layout === 'centered' ? 'flex flex-wrap gap-4 justify-center'
        : 'flex flex-wrap gap-4'
      const btnClass = layout === 'fullWidth'
        ? 'flex-1 block py-3'
        : isSingleCenteredButton
          ? 'inline-flex w-full sm:w-auto sm:min-w-[330px]'
          : 'inline-flex'
      return (
        <ArticleReveal intensity="visual">
          <div className={cn('my-6', containerClass)}>
            {buttons.map((btn: { label: string; url: string; variant?: string; external?: boolean }, i: number) => (
              <a
                key={i}
                href={btn.url}
                target={btn.external ? '_blank' : undefined}
                rel={btn.external ? 'noopener noreferrer' : undefined}
                className={cn(
                  'items-center justify-center font-semibold uppercase tracking-[2px] no-underline transition-all border text-center',
                  'text-[15px] leading-[1.625rem]',
                  'py-[0.375rem] px-4',
                  btnClass,
                  btn.variant === 'primary'
                    ? 'bg-primary text-white border-primary hover:bg-primary-dark hover:border-primary-dark'
                    : 'bg-transparent text-primary border-primary-light hover:bg-primary-lightest'
                )}
              >
                {btn.label}
              </a>
            ))}
          </div>
        </ArticleReveal>
      )
    },
    imageEquationList: ({ value }) => {
      const headings: string[] = value.headings || []
      const rows: { inputImage?: any; prompt?: string; outputImage?: any }[] = value.rows || [] // eslint-disable-line @typescript-eslint/no-explicit-any
      return (
        <ArticleReveal intensity="visual">
          <div className="my-8 bg-[#f6f6f6] py-5">
            {headings.length > 0 && (
              <div className="hidden md:grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 mb-4 items-end max-width content-padding mx-auto">
                {headings.map((h, i) => (
                  <Fragment key={i}>
                    <div className="font-serif text-[1.2rem] font-normal m-0">{h}</div>
                    {i < headings.length - 1 && <span />}
                  </Fragment>
                ))}
              </div>
            )}
            {rows.map((row, i) => {
              const inputUrl = row.inputImage?.asset ? urlForImage(row.inputImage).width(400).url() : ''
              const outputUrl = row.outputImage?.asset ? urlForImage(row.outputImage).width(400).url() : ''
              return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-center mb-8 md:mb-4 max-width content-padding mx-auto">
                  {inputUrl && <img src={inputUrl} alt="" loading="lazy" className="w-full h-auto" />}
                  <span className="text-2xl font-normal">+</span>
                  <p className="font-serif text-base leading-relaxed m-0">
                    &ldquo;{row.prompt}&rdquo;
                  </p>
                  <span className="text-2xl font-normal">=</span>
                  {outputUrl && <img src={outputUrl} alt="" loading="lazy" className="w-full h-auto" />}
                </div>
              )
            })}
          </div>
        </ArticleReveal>
      )
    },
    imageCarousel: ({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const images = (value.images || []).map((img: any) => ({
        url: img?.asset ? urlForImage(img).width(1200).url() : '',
        alt: img?.alt || '',
      })).filter((img: { url: string }) => img.url)

      return (
        <ArticleReveal intensity="visual">
          <ImageCarousel images={images} caption={value.caption} thumbnailSize={value.thumbnailSize || 'sm'} />
        </ArticleReveal>
      )
    },
    spacer: ({ value }) => {
      const sizes: Record<string, string> = { sm: 'h-4', md: 'h-8', lg: 'h-12', xl: 'h-16' }
      return <div className={sizes[value?.size || 'md']} aria-hidden="true" />
    },
    divider: ({ value }) => {
      if (value?.style === 'arrow') {
        return (
          <div className="flex justify-center my-4">
            <svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.4999 3C16.4999 1.61929 17.6192 0.5 18.9999 0.5C20.3806 0.5 21.4999 1.61929 21.4999 3L21.4999 46.9648L33.1425 35.3223C34.1188 34.3462 35.7014 34.346 36.6777 35.3223C37.6539 36.2985 37.6537 37.8811 36.6777 38.8574L20.7675 54.7676C19.7912 55.7439 18.2087 55.7439 17.2323 54.7676L1.32219 38.8574C0.346137 37.8811 0.345968 36.2985 1.32219 35.3223C2.29842 34.346 3.88102 34.3462 4.85735 35.3223L16.4999 46.9648L16.4999 3Z" fill="#D27A64"/>
            </svg>
          </div>
        )
      }
      return <Divider variant={value?.style === 'thick' ? 'thick' : 'default'} />
    },
    contactForm: ({ value }) => (
      <ArticleReveal intensity="visual">
        <div className="my-12">
          <ContactFormEmbed showHeader={value?.showHeader !== false} />
        </div>
      </ArticleReveal>
    ),
    customComponent: ({ value }) => {
      // Dispatch by name to a hard-coded React component. Used for
      // page-specific tables and visualizations that don't fit the
      // generic block types.
      switch (value?.name) {
        case 'virtualCareTop15Table':
          return (
            <ArticleReveal intensity="visual">
              <VirtualCareTop15Table />
            </ArticleReveal>
          )
        case 'virtualCareTimeToDiagnosis':
          return (
            <ArticleReveal intensity="visual">
              <VirtualCareTimeToDiagnosis />
            </ArticleReveal>
          )
        default:
          return (
            <div className="my-4 p-3 bg-yellow-50 border border-yellow-300 text-sm text-gray-700">
              Unknown custom component: <code>{value?.name || '(no name)'}</code>
            </div>
          )
      }
    },
  },
  list: {
    bullet: ({ children }) => (
      <ArticleReveal intensity="text">
        <ul className="ul mb-8">{children}</ul>
      </ArticleReveal>
    ),
    number: ({ children }) => (
      <ArticleReveal intensity="text">
        <ol className="list-decimal pl-6 mb-8 space-y-2">{children}</ol>
      </ArticleReveal>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || ''
      const isRefLink = href === '#references' || href === '#methodology'
      const isExternal = value?.blank || href.startsWith('http')
      const rel = isExternal ? 'noopener noreferrer' : undefined
      const target = isExternal ? '_blank' : undefined
      return (
        <a
          href={href}
          rel={rel}
          target={target}
          className={isRefLink ? '!text-primary !no-underline hover:!underline hover:!text-black' : 'hover:text-primary'}
        >
          {children}
        </a>
      )
    },
    sup: ({ children }) => <><sup>{children}</sup>{' '}</>,
    // Legacy decorators (backward compat)
    teal: ({ children }) => <span className="text-secondary">{children}</span>,
    orange: ({ children }) => <span className="text-primary">{children}</span>,
    // New unified text color annotation
    textColor: ({ children, value }) => {
      const colorMap: Record<string, string> = {
        teal: 'text-secondary',
        orange: 'text-primary',
        charcoal: 'text-tertiary',
        gray: 'text-gray',
        blue: 'text-blue',
      }
      return <span className={colorMap[value?.color] || 'text-secondary'}>{children}</span>
    },
    refCitation: ({ children, value }) => (
      <><sup>
        <a
          href="#references"
          className="!text-primary !no-underline hover:!underline hover:!text-black text-xs"
        >
          {value?.refNumber || children}
        </a>
      </sup>{' '}</>
    ),
  },
  block: {
    h2: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="header-lg mt-5 mb-4">{children}</h2>
      </ArticleReveal>
    ),
    h2Large: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="header-xl font-light mt-8 mb-4">{children}</h2>
      </ArticleReveal>
    ),
    h2LargeCentered: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h2 className="header-xl font-light mt-8 mb-4 text-center">{children}</h2>
      </ArticleReveal>
    ),
    // h2Center is deprecated — use sectionTitle instead. Kept as alias for backwards compat.
    h2Center: ({ children, value }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (value?.children as any[])?.map(c => c.text || '').join('') || ''
      const anchorId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return (
        <ArticleReveal intensity="heading">
          <h2 id={anchorId} className="header-lg mt-5 mb-4 text-center">{children}</h2>
        </ArticleReveal>
      )
    },
    sectionTitle: ({ children, value }) => {
      // Centered h2 heading with auto-generated anchor ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (value?.children as any[])?.map(c => c.text || '').join('') || ''
      const anchorId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return (
        <ArticleReveal intensity="heading">
          <h2 id={anchorId} className="header-lg mt-5 mb-4 text-center">{children}</h2>
        </ArticleReveal>
      )
    },
    h3Orange: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h3 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-primary leading-[1.1875rem] mt-8 mb-3 numeral-gutter">{children}</h3>
      </ArticleReveal>
    ),
    h3Centered: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h3 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mt-8 mb-3 text-center">{children}</h3>
      </ArticleReveal>
    ),
    h3: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h3 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mt-8 mb-3">{children}</h3>
      </ArticleReveal>
    ),
    h4Bullet: ({ children }) => (
      <ArticleReveal intensity="heading">
        <h4 className="font-sans text-base font-semibold mt-6 mb-2 -ml-5 before:content-['◆'] before:text-primary before:text-xs before:mr-2">{children}</h4>
      </ArticleReveal>
    ),
    h4: ({ children, value }) => {
      // Detect numbered headings (e.g. "1. Explain just enough...")
      // and apply gray color + hanging indent for the numeral gutter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (value?.children as any[])?.map(c => c.text || '').join('') || ''
      const isNumbered = /^\d+\.\s/.test(text)
      return (
        <ArticleReveal intensity="heading">
          <h4 className={cn(
            'font-sans text-base font-semibold mt-6 mb-2',
            isNumbered && 'text-gray numeral-gutter'
          )}>{children}</h4>
        </ArticleReveal>
      )
    },
    blockquote: ({ children }) => (
      <ArticleReveal intensity="text">
        <blockquote className="border-l-4 border-primary pl-6 my-6 italic text-gray">
          {children}
        </blockquote>
      </ArticleReveal>
    ),
    textCenter: ({ children }) => (
      <ArticleReveal intensity="text">
        <p className="font-serif text-[1.5rem] leading-[2.125rem] text-center mb-4 text-black">{children}</p>
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
        <p className="my-4 leading-relaxed">{children}</p>
      </ArticleReveal>
    ),
  },
}

/**
 * Pre-process content to group consecutive standalone images into
 * 2-column grids. The migration script extracted images flat, losing
 * the original Gatsby `pure-g` grid wrappers. This restores the
 * side-by-side layout for pairs of consecutive images.
 */
function isGroupableImage(block: any): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
  return block?._type === 'image' && block?.asset && block?.size !== 'bleed'
}

function isShortTextBlock(block: any): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (block?._type !== 'block') return false
  // Headings are NOT captions — don't group them with images
  if (block.style && block.style !== 'normal') return false
  const text = (block.children || []).map((c: any) => c.text || '').join('') // eslint-disable-line @typescript-eslint/no-explicit-any
  return text.length > 0 && text.length < 200
}

function groupConsecutiveImages(blocks: PortableTextBlock[]): PortableTextBlock[] {
  const result: PortableTextBlock[] = []
  let i = 0

  while (i < blocks.length) {
    const current = blocks[i] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const next = blocks[i + 1] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const afterNext = blocks[i + 2] as any // eslint-disable-line @typescript-eslint/no-explicit-any

    // Skip bleed images — they should always render standalone at full viewport width
    if (current?._type === 'image' && current?.size === 'bleed') {
      result.push(current)
      i++
      continue
    }

    // Pattern: image, caption, image, caption, image, caption → 3-column grid with captions
    if (
      isGroupableImage(current) && isShortTextBlock(next) &&
      isGroupableImage(afterNext) && isShortTextBlock(blocks[i + 3] as any) &&
      isGroupableImage(blocks[i + 4] as any) && isShortTextBlock(blocks[i + 5] as any)
    ) {
      result.push({
        _type: 'columns',
        _key: `autogrid-${current._key || i}`,
        layout: '3',
        content: [current, next, afterNext, blocks[i + 3], blocks[i + 4], blocks[i + 5]],
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      i += 6
    // Pattern: image, caption, image, caption → 2-column grid with captions
    } else if (
      isGroupableImage(current) && isShortTextBlock(next) &&
      isGroupableImage(afterNext) && isShortTextBlock(blocks[i + 3] as any) &&
      !isGroupableImage(blocks[i + 4] as any)
    ) {
      result.push({
        _type: 'columns',
        _key: `autogrid-${current._key || i}`,
        layout: '2',
        content: [current, next, afterNext, blocks[i + 3]],
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      i += 4
    // Three consecutive bare images → 3-column grid
    } else if (isGroupableImage(current) && isGroupableImage(next) && isGroupableImage(afterNext)) {
      result.push({
        _type: 'columns',
        _key: `autogrid-${current._key || i}`,
        layout: '3',
        content: [current, next, afterNext],
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      i += 3
    // Two consecutive bare images → 2-column grid
    } else if (isGroupableImage(current) && isGroupableImage(next)) {
      result.push({
        _type: 'columns',
        _key: `autogrid-${current._key || i}`,
        layout: '2',
        content: [current, next],
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      i += 2
    } else {
      result.push(current)
      i++
    }
  }

  return result
}

interface PortableTextRendererProps {
  content: PortableTextBlock[]
  /** Content variant: 'case-study' applies gray text + double paragraph spacing to match Gatsby */
  variant?: 'default' | 'case-study'
  /** Disable automatic grouping of consecutive images into columns */
  noGrouping?: boolean
  /** Bullet style: 'star' (default custom image) or 'disc' (standard round bullets) */
  bulletStyle?: 'star' | 'disc'
}

export function PortableTextRenderer({ content, variant = 'default', noGrouping = false, bulletStyle = 'star' }: PortableTextRendererProps) {
  // Disable auto-grouping — images render full-width stacked by default.
  // Use explicit 'columns' blocks in Sanity for side-by-side layouts.
  const processed = content
  const blockComponents = components.block as Record<string, unknown>
  const rendererComponents: PortableTextComponents = variant === 'case-study'
    ? ({
        ...components,
        block: {
          ...blockComponents,
          h4: ({ children }) => (
            <ArticleReveal intensity="heading">
              <h4 className="font-sans text-base font-semibold mt-6 mb-2">{children}</h4>
            </ArticleReveal>
          ),
        },
      } as PortableTextComponents)
    : components

  if (variant === 'case-study') {
    // Case studies use custom star bullets (matching Gatsby)
    return (
      <div className="case-study-content">
        <PortableText value={processed} components={rendererComponents} />
      </div>
    )
  }

  // Disc bullet style: override .ul star bullets with standard disc
  if (bulletStyle === 'disc') {
    return (
      <div className="disc-bullets">
        <PortableText value={processed} components={rendererComponents} />
      </div>
    )
  }

  return <PortableText value={processed} components={rendererComponents} />
}
