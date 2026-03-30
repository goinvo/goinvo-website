'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useHero, type HeroConfig } from '@/context/HeroContext'
import { cloudfrontImage } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Slide variants — matching the work-page category switching         */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const textVariants = {
  enter: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const containerVariants = {
  enter: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

/* ------------------------------------------------------------------ */
/*  Multi-image hero content (e.g. vision page panorama)               */
/* ------------------------------------------------------------------ */

function MultiImageContent({
  config,
  onImageLoad,
}: {
  config: HeroConfig
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
}) {
  const desktop = config.desktopImages!
  const mobile = config.mobileImages ?? desktop

  return (
    <>
      {/* Desktop: side-by-side */}
      <div
        className={cn(
          'hidden sm:grid w-full h-full',
          `grid-cols-${desktop.length}`,
        )}
        style={{ gridTemplateColumns: `repeat(${desktop.length}, 1fr)` }}
      >
        {desktop.map((src, i) => (
          <div key={src} className="relative h-full">
            <Image
              src={cloudfrontImage(src)}
              alt=""
              fill
              className="object-cover"
              style={{ objectPosition: 'center' }}
              onLoad={i === 0 ? onImageLoad : undefined}
              priority
            />
          </div>
        ))}
      </div>
      {/* Mobile: stacked (first image fills, rest hidden in collapsed) */}
      <div className="sm:hidden w-full h-full relative">
        <Image
          src={cloudfrontImage(mobile[0])}
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition: 'center' }}
          priority
        />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PersistentHero() {
  const { state, slideDone } = useHero()
  const { config, displayImage, bgPosition, direction, imageKey, pathname, phase } = state
  const [expanded, setExpanded] = useState(false)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  // Height (in px) that shows the full image at the container's current width
  const [fullImageHeight, setFullImageHeight] = useState<number | null>(null)
  // Ref to the loaded image element for re-measuring after config arrives
  const loadedImgRef = useRef<HTMLImageElement | null>(null)

  const isMultiImage = !!(config?.desktopImages && config.desktopImages.length > 0)

  // Ref tracks the current route's expandAfterSlide — survives stale closures
  // from exiting AnimatePresence children whose onAnimationComplete still fires
  const shouldExpandRef = useRef(false)
  shouldExpandRef.current = config?.expandAfterSlide ?? false

  const heroOuterRef = useRef<HTMLDivElement>(null)

  // Reset expanded state and cancel any pending expand when navigating
  useEffect(() => {
    setExpanded(false)
    setFullImageHeight(null)
    loadedImgRef.current = null
    clearTimeout(expandTimerRef.current)
    expandTimerRef.current = undefined
  }, [pathname])

  // Compute full image height from a loaded image element
  function computeFullHeight(img: HTMLImageElement) {
    if (!containerRef.current || !img.naturalWidth) return
    const containerWidth = containerRef.current.clientWidth
    const imageCount = config?.desktopImages?.length ?? 1
    const effectiveWidth = containerWidth / imageCount
    const aspect = img.naturalWidth / img.naturalHeight
    setFullImageHeight(Math.round(effectiveWidth / aspect))
  }

  // When expandAfterSlide becomes true and we already have a loaded image,
  // re-measure (handles race condition where image loads before config arrives)
  useEffect(() => {
    if (config?.expandAfterSlide && loadedImgRef.current && !fullImageHeight) {
      computeFullHeight(loadedImgRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.expandAfterSlide])

  // Expand when conditions are met: idle phase, expandAfterSlide, and height computed
  useEffect(() => {
    if (phase === 'idle' && config?.expandAfterSlide && fullImageHeight && !expanded) {
      expandTimerRef.current = setTimeout(() => {
        setExpanded(true)
      }, 300)
    }
  }, [phase, config?.expandAfterSlide, fullImageHeight, expanded])

  function handleSlideComplete() {
    slideDone()
    if (shouldExpandRef.current) {
      expandTimerRef.current = setTimeout(() => {
        if (shouldExpandRef.current) {
          setExpanded(true)
        }
      }, 120)
    }
  }

  // Measure natural image dimensions on load. Always stores the ref so we
  // can re-measure later if expandAfterSlide arrives after the image loads.
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    loadedImgRef.current = img
    if (containerRef.current && shouldExpandRef.current) {
      computeFullHeight(img)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {config && displayImage ? (
        <motion.div
          ref={heroOuterRef}
          key="persistent-hero"
          variants={containerVariants}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative pt-[var(--spacing-header-height)]"
        >
          {/* Image container — directional slide, optionally expands */}
          <div
            ref={containerRef}
            className={cn(
              'overflow-hidden relative',
              config.expandAfterSlide
                ? '' // Full-height: no fixed height, sized by content/aspect-ratio
                : 'h-[220px] lg:h-[450px]', // Standard: fixed crop heights
              !config.expandAfterSlide && 'transition-[height] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]',
            )}
            style={{
              viewTransitionName: 'hero-image',
              ...(expanded ? { height: fullImageHeight ?? '70vh' } : {}),
            }}
          >
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.div
                key={imageKey}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                onAnimationComplete={handleSlideComplete}
                className={config.expandAfterSlide && !isMultiImage ? 'relative' : 'absolute inset-0'}
              >
                {isMultiImage ? (
                  <MultiImageContent
                    config={config}
                    onImageLoad={handleImageLoad}
                  />
                ) : config.expandAfterSlide ? (
                  /* Full image cover: render as block image, not fill, so container sizes naturally */
                  <Image
                    src={cloudfrontImage(displayImage)}
                    alt=""
                    width={1920}
                    height={0}
                    className="w-full h-auto"
                    onLoad={handleImageLoad}
                    priority
                    unoptimized
                  />
                ) : (
                  <Image
                    src={cloudfrontImage(displayImage)}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: bgPosition }}
                    onLoad={handleImageLoad}
                    priority
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Text box — hidden for image-only heroes */}
          {!config.hideTextBox && (
            <div className="max-width relative">
              <div
                className="content-padding py-8 bg-white/80 lg:absolute lg:bottom-0 lg:left-0 lg:w-[385px]"
                style={{ viewTransitionName: 'page-title' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={pathname}
                    variants={textVariants}
                    initial="enter"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light m-0">
                      {config.title}
                    </h1>
                    {config.subtitle && (
                      <p className="font-serif text-[1.5rem] leading-[2.125rem] text-black mt-3 mb-0">
                        {config.subtitle}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
