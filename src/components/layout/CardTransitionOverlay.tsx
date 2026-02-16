'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { usePageTransition } from '@/context/PageTransitionContext'

export function CardTransitionOverlay() {
  const ctx = usePageTransition()
  const router = useRouter()

  const cardRect = ctx?.cardRect ?? null
  const clearTransition = ctx?.clearTransition

  useEffect(() => {
    if (!cardRect) return

    // After the morph animation completes, navigate then dissolve overlay
    const navTimer = setTimeout(() => {
      router.push(cardRect.href, { scroll: false })
    }, 550)

    const clearTimer = setTimeout(() => {
      clearTransition?.()
    }, 950)

    return () => {
      clearTimeout(navTimer)
      clearTimeout(clearTimer)
    }
  }, [cardRect, router, clearTransition])

  return (
    <AnimatePresence>
      {cardRect && (
        <>
          {/* Background scrim: blurs the page behind */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Morphing image: expands from card position to hero position */}
          <motion.div
            className="fixed z-50 overflow-hidden shadow-2xl"
            initial={{
              top: cardRect.top,
              left: cardRect.left,
              width: cardRect.width,
              height: cardRect.height,
              borderRadius: '4px',
            }}
            animate={{
              top: 0,
              left: 0,
              width: '100vw',
              height: '60vh',
              borderRadius: '0px',
            }}
            exit={{
              opacity: 0,
              scale: 1.02,
              filter: 'blur(4px)',
            }}
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
              sizes="100vw"
            />
            {/* Gradient overlay that fades in as image expands */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
