'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useHero, heroConfigs, type HeroConfig, type HeroEditTarget } from '@/context/HeroContext'
import { EditInStudioLink } from '@/components/sanity/EditInStudioLink'
import { cloudfrontImage } from '@/lib/utils'
import { cn } from '@/lib/utils'

/**
 * Returns true if the given pathname is a route where PersistentHero
 * will reliably render a hero (case-study /work/[slug] routes use
 * SetCaseStudyHero on mount). NOT including /vision/[slug] because
 * some vision pieces (e.g. coronavirus, care-plans) ship their own
 * inline hero rather than using PersistentHero — reserving space for
 * those would double-stack the hero.
 *
 * Used to reserve hero space at SSR so the layout doesn't shift when
 * the actual hero config arrives via client effects.
 */
function pathHasHero(pathname: string): boolean {
  if (heroConfigs[pathname]) return true
  // /work/[slug] case studies always use PersistentHero
  return pathname.startsWith('/work/') && pathname.length > 6
}

/**
 * Pre-rendered hero space reserved at SSR for routes that will have a
 * hero. Matches the eventual rendered hero's height so the layout
 * doesn't shift when the real hero arrives. /work/[slug] case studies
 * get the expanded 400/600px reservation; static-hero routes (e.g.
 * /work, /services) get the legacy compact 220/450px size.
 */
function HeroSpacer({ pathname }: { pathname: string }) {
  const isCaseStudy =
    pathname.startsWith('/work/') && pathname.length > 6
  return (
    <div aria-hidden className="pt-[var(--spacing-header-height)]">
      <div
        className={cn(
          'overflow-hidden relative',
          isCaseStudy
            ? 'h-[400px] lg:h-[600px]'
            : 'h-[220px] lg:h-[450px]',
        )}
      />
    </div>
  )
}

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
              quality={95}
              sizes={`${Math.ceil(100 / desktop.length)}vw`}
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
          quality={95}
          sizes="100vw"
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
  const { config, displayImage, bgPosition, direction, imageKey, pathname } = state
  // Read the live pathname directly so we can decide whether to reserve
  // hero space on initial paint, BEFORE useHero state has caught up.
  const livePathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)

  const isMultiImage = !!(config?.desktopImages && config.desktopImages.length > 0)
  // Container is rendered at the FINAL expanded size from first paint, so
  // layout never shifts. The visible "compact -> full image" reveal is
  // achieved via a clip-path animation on the inner image element.
  const useClipReveal = !!config?.expandAfterSlide && !isMultiImage
  const [revealed, setRevealed] = useState(!useClipReveal)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const heroOuterRef = useRef<HTMLDivElement>(null)

  // Re-arm the reveal animation on each navigation. If reveal is not
  // applicable, leave it permanently revealed.
  useEffect(() => {
    clearTimeout(revealTimerRef.current)
    revealTimerRef.current = undefined
    setRevealed(!useClipReveal)
    return () => {
      clearTimeout(revealTimerRef.current)
    }
  }, [pathname, useClipReveal])

  function handleSlideComplete() {
    slideDone()
    if (useClipReveal && !revealed) {
      // Brief beat after the slide settles, then reveal the full image.
      revealTimerRef.current = setTimeout(() => setRevealed(true), 80)
    }
  }

  // No-op: legacy expand-after-slide height animation removed to prevent CLS.
  function handleImageLoad(_e: React.SyntheticEvent<HTMLImageElement>) {
    // intentionally empty
  }

  // Reserve hero space on initial paint for routes that will have a hero,
  // even before the hero config arrives via client effects. Without this,
  // the late-arriving hero pushes all content below it down (~600px on
  // desktop case studies) and Lighthouse measures it as a 0.3+ CLS shift.
  if (!config || !displayImage) {
    if (livePathname && pathHasHero(livePathname)) {
      return <HeroSpacer pathname={livePathname} />
    }
    return null
  }

  return (
    <AnimatePresence mode="wait">
      {config && displayImage ? (
        <motion.section
          ref={heroOuterRef}
          aria-label="Page hero"
          key="persistent-hero"
          variants={containerVariants}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative pt-[var(--spacing-header-height)]"
        >
          {/* Mobile stacked images — rendered outside animation container */}
          {config?.mobileImages && config.mobileImages.length > 0 && (
            <div className="sm:hidden">
              {config.mobileImages.map((src, i) => (
                <img
                  key={src}
                  src={cloudfrontImage(src)}
                  alt=""
                  className="w-full h-auto block"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          )}

          {/* Image container — directional slide. Fixed height to prevent CLS.
              When useClipReveal is true the container is rendered at its FULL
              expanded size from first paint; the image inside starts clipped
              to a centered band and animates to fully visible. Otherwise the
              container stays at the legacy compact size. */}
          <div
            ref={containerRef}
            className={cn(
              'overflow-hidden relative',
              useClipReveal
                ? 'h-[400px] lg:h-[600px]'
                : (config?.mobileImages ? 'hidden sm:block sm:h-[220px] lg:h-[450px]' : 'h-[220px] lg:h-[450px]'),
            )}
            style={{
              viewTransitionName: 'hero-image',
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
                className={cn(
                  'absolute inset-0',
                  useClipReveal && 'hero-clip-transition',
                  useClipReveal && (revealed ? 'hero-clip-revealed' : 'hero-clip-band'),
                )}
              >
                {config.editTarget ? (
                  <HeroEditPlaceholder editTarget={config.editTarget} />
                ) : isMultiImage ? (
                  <MultiImageContent
                    config={config}
                    onImageLoad={handleImageLoad}
                  />
                ) : (
                  <Image
                    src={cloudfrontImage(displayImage)}
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: bgPosition }}
                    onLoad={handleImageLoad}
                    quality={95}
                    sizes="100vw"
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
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Fills the hero slot with a gray dashed placeholder and a "Click to
 * replace hero image…" call-to-action. Rendered in draft mode only,
 * when the underlying document hasn't had a hero image uploaded yet.
 * Matches the visual language of EmptyContentPlaceholder so the
 * whole page reads as "two editable slots" for new drafts.
 */
function HeroEditPlaceholder({ editTarget }: { editTarget: HeroEditTarget }) {
  return (
    <EditInStudioLink
      documentType={editTarget.documentType}
      documentId={editTarget.documentId}
      fieldPath={editTarget.fieldPath}
      ariaLabel="Click to replace hero image in Sanity Studio"
      className="group h-full w-full bg-gray-light transition-colors hover:bg-primary-lightest"
    >
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-medium group-hover:border-primary bg-white/40 group-hover:bg-white/70 transition-colors px-8 py-6 text-center">
          <HeroPlusBadge />
          <span className="font-serif text-xl font-light text-black">
            Click to replace hero image…
          </span>
          <span className="text-gray text-md">
            Opens the Image field in Sanity Studio
          </span>
        </div>
      </div>
    </EditInStudioLink>
  )
}

function HeroPlusBadge() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
      className="text-gray group-hover:text-primary transition-colors"
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <path
        d="M22 14V30M14 22H30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
