'use client'

import { useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/motion'
import {
  PageTransitionProvider,
  usePageTransition,
} from '@/context/PageTransitionContext'
import { CardTransitionOverlay } from './CardTransitionOverlay'
import { SectionMorphOverlay } from './SectionMorphOverlay'
import { FrozenRouter } from './FrozenRouter'
import { Footer } from './Footer'

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */

const pageVariants = {
  enter: (custom: { isCard?: boolean } | undefined) =>
    custom?.isCard
      ? {
          // Card transition: content fully hidden via clip, then revealed top→bottom
          clipPath: 'inset(0 0 100% 0)',
          opacity: 1,
          scale: 1,
          y: 0,
          filter: 'blur(0px)',
        }
      : {
          // Standard: fade + scale + blur
          clipPath: 'inset(0 0 0% 0)',
          opacity: 0,
          scale: 1.015,
          y: 16,
          filter: 'blur(3px)',
        },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  // Old page collapses vertically while card image morphs to hero
  collapse: {
    clipPath: 'inset(0 0 100% 0)',
    opacity: 0,
    y: -20,
    scale: 0.98,
    filter: 'blur(2px)',
  },
  exit: (custom: { isCard?: boolean } | undefined) =>
    custom?.isCard
      ? {
          // Card: already collapsed — match collapse values for seamless exit
          clipPath: 'inset(0 0 100% 0)',
          opacity: 0,
          y: -20,
          scale: 0.98,
          filter: 'blur(2px)',
        }
      : {
          // Standard exit
          opacity: 0,
          scale: 0.985,
          y: -12,
          filter: 'blur(3px)',
        },
}

const pageTransition = {
  clipPath: {
    duration: 0.5,
    ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  },
  default: {
    duration: 0.35,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
}

const instantTransition = {
  clipPath: { duration: 0 },
  default: { duration: 0 },
}

/* ------------------------------------------------------------------ */
/*  Inner component (has access to PageTransitionContext)               */
/* ------------------------------------------------------------------ */

function TransitionContent({
  children,
  pathname,
}: {
  children: React.ReactNode
  pathname: string
}) {
  const ctx = usePageTransition()
  const prefersReducedMotion = useReducedMotion()
  const isCard = !!ctx?.cardRect
  const pageRef = useRef<HTMLDivElement>(null)

  // Scroll to top on navigation (unless card/morph transitions handle it)
  const prevPathRef = useRef(pathname)
  useEffect(() => {
    if (prevPathRef.current !== pathname && !ctx?.cardRect) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    prevPathRef.current = pathname
  }, [pathname, ctx?.cardRect])

  // Track the page that was visible when the card transition started.
  // Only THAT page should collapse — not the target page, not pages
  // visited after the target.
  const sourceRef = useRef<string | null>(null)
  if (isCard && sourceRef.current === null) {
    sourceRef.current = pathname
  }
  if (!isCard) {
    sourceRef.current = null
  }

  const shouldCollapse = isCard && pathname === sourceRef.current
  const animateState = shouldCollapse ? 'collapse' : 'visible'

  // Framer Motion leaves `filter: blur(0px)` as an inline style in the
  // 'visible' state. Even a 0px blur creates a new containing block, which
  // breaks `position: fixed` for descendants (e.g. the digital-healthcare
  // sticky nav). Clear it once the page is at rest. Runs on initial mount
  // and again whenever the pathname changes.
  useEffect(() => {
    if (animateState !== 'visible') return
    const handle = requestAnimationFrame(() => {
      if (pageRef.current) pageRef.current.style.filter = 'none'
    })
    return () => cancelAnimationFrame(handle)
  }, [pathname, animateState])

  return (
    <AnimatePresence mode="wait" initial={false} custom={{ isCard }}>
      <motion.div
        ref={pageRef}
        key={pathname}
        custom={{ isCard }}
        variants={pageVariants}
        initial="enter"
        animate={animateState}
        exit="exit"
        transition={prefersReducedMotion ? instantTransition : pageTransition}
        onAnimationComplete={(definition) => {
          if (definition === 'visible') {
            // Framer Motion leaves `filter: blur(0px)` inline after the enter
            // animation settles. Even a 0px blur creates a new containing
            // block, which breaks `position: fixed` for descendants (see
            // digital-healthcare sticky nav). Clear it once the page is at
            // rest so fixed elements anchor to the viewport again.
            if (pageRef.current) {
              pageRef.current.style.filter = 'none'
            }
            if (ctx?.cardRect) {
              ctx.clearTransition()
            }
          }
        }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  TransitionLayout                                                   */
/* ------------------------------------------------------------------ */

export function TransitionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <PageTransitionProvider>
      <TransitionContent pathname={pathname}>{children}</TransitionContent>
      <motion.div
        layout="position"
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <Footer />
      </motion.div>
      <CardTransitionOverlay />
      <SectionMorphOverlay />
    </PageTransitionProvider>
  )
}
