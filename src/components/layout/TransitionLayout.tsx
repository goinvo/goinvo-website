'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { PageTransitionProvider } from '@/context/PageTransitionContext'
import { CardTransitionOverlay } from './CardTransitionOverlay'
import { SectionMorphOverlay } from './SectionMorphOverlay'
import { FrozenRouter } from './FrozenRouter'

const pageVariants = {
  enter: {
    opacity: 0,
    scale: 1.015,
    y: 16,
    filter: 'blur(3px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    y: -12,
    filter: 'blur(3px)',
  },
}

const pageTransition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
}

export function TransitionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <PageTransitionProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={pageTransition}
        >
          <FrozenRouter>{children}</FrozenRouter>
        </motion.div>
      </AnimatePresence>
      <CardTransitionOverlay />
      <SectionMorphOverlay />
    </PageTransitionProvider>
  )
}
