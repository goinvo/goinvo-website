'use client'

import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
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
  const isCard = !!ctx?.cardRect

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

  return (
    <AnimatePresence mode="wait" initial={false} custom={{ isCard }}>
      <motion.div
        key={pathname}
        custom={{ isCard }}
        variants={pageVariants}
        initial="enter"
        animate={animateState}
        exit="exit"
        transition={pageTransition}
        onAnimationComplete={(definition) => {
          // When the NEW page finishes entering ('visible'), hand off from
          // the fixed CardTransitionOverlay to the in-flow PersistentHero
          // so the hero image scrolls with the page content.
          if (definition === 'visible' && ctx?.cardRect) {
            ctx.clearTransition()
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
