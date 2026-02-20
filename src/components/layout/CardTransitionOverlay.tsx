'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { usePageTransition } from '@/context/PageTransitionContext'

/** Hero image height to match PersistentHero's image container. */
function getHeroHeight() {
  if (typeof window === 'undefined') return 450
  return window.innerWidth >= 864 ? 450 : 220
}

/** Read the header height from the CSS custom property. */
function getHeaderHeight() {
  if (typeof window === 'undefined') return 50
  return (
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--spacing-header-height',
      ),
    ) || 50
  )
}

export function CardTransitionOverlay() {
  const ctx = usePageTransition()
  const router = useRouter()
  const pathname = usePathname()
  const [heroH, setHeroH] = useState(450)
  const [headerH, setHeaderH] = useState(50)
  const [contentW, setContentW] = useState<number | null>(null)

  const cardRect = ctx?.cardRect ?? null
  const clearTransition = ctx?.clearTransition

  // Track whether we've arrived at the target route
  const arrivedRef = useRef(false)

  // Compute target dimensions when overlay activates
  useEffect(() => {
    if (cardRect) {
      setHeroH(getHeroHeight())
      setHeaderH(getHeaderHeight())
      // Use clientWidth (excludes scrollbar) to match PersistentHero's in-flow width
      setContentW(document.documentElement.clientWidth)
    }
  }, [cardRect])

  // Navigate after morph animation completes
  useEffect(() => {
    if (!cardRect) return

    const navTimer = setTimeout(() => {
      router.push(cardRect.href, { scroll: false })
    }, 550)

    return () => clearTimeout(navTimer)
  }, [cardRect, router])

  // Clear overlay when navigating AWAY from the target case study
  useEffect(() => {
    if (!cardRect) {
      arrivedRef.current = false
      return
    }

    const target = cardRect.href.split('?')[0].split('#')[0]

    if (pathname === target) {
      arrivedRef.current = true
    } else if (arrivedRef.current) {
      // We arrived at the case study and now navigated away — clear overlay
      clearTransition?.()
      arrivedRef.current = false
    }
  }, [pathname, cardRect, clearTransition])

  return (
    <AnimatePresence>
      {cardRect && (
        <motion.div
          className="fixed z-[1050] overflow-hidden"
          initial={{
            top: cardRect.top,
            left: cardRect.left,
            width: cardRect.width,
            height: cardRect.height,
            borderRadius: '4px',
          }}
          animate={{
            top: headerH,
            left: 0,
            width: contentW ?? '100vw',
            height: heroH,
            borderRadius: '0px',
          }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={{
            duration: 0.55,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          <Image
            src={cardRect.image}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: 'center top' }}
            sizes="100vw"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
