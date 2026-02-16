'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { usePageTransition } from '@/context/PageTransitionContext'

const MORPH_DURATION = 0.6
const NAV_DELAY = 650
const CLEAR_DELAY = 1100

export function SectionMorphOverlay() {
  const ctx = usePageTransition()
  const router = useRouter()

  const morph = ctx?.sectionMorph ?? null
  const clearTransition = ctx?.clearTransition

  useEffect(() => {
    if (!morph) return

    const navTimer = setTimeout(() => {
      router.push(morph.href, { scroll: false })
    }, NAV_DELAY)

    const clearTimer = setTimeout(() => {
      clearTransition?.()
    }, CLEAR_DELAY)

    return () => {
      clearTimeout(navTimer)
      clearTimeout(clearTimer)
    }
  }, [morph, router, clearTransition])

  return (
    <AnimatePresence>
      {morph && (
        <>
          {/* Background image: morphs from homepage section to case study hero */}
          <motion.div
            className="fixed z-50 overflow-hidden"
            style={{
              backgroundImage: `url(${morph.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: morph.bgPosition,
            }}
            initial={{
              top: morph.bgRect.top,
              left: morph.bgRect.left,
              width: morph.bgRect.width,
              height: morph.bgRect.height,
            }}
            animate={{
              top: morph.targetBgRect.top,
              left: morph.targetBgRect.left,
              width: morph.targetBgRect.width,
              height: morph.targetBgRect.height,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: MORPH_DURATION,
              ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            }}
          >
            {/* Gradient that fades in to match the case study hero overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            />
          </motion.div>

          {/* White card: morphs from card position to full-width content area */}
          <motion.div
            className="fixed z-50 bg-white"
            initial={{
              top: morph.cardRect.top,
              left: morph.cardRect.left,
              width: morph.cardRect.width,
              height: morph.cardRect.height,
            }}
            animate={{
              top: morph.targetCardRect.top,
              left: morph.targetCardRect.left,
              width: morph.targetCardRect.width,
              height: morph.targetCardRect.height,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: MORPH_DURATION,
              ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}
