'use client'

import { motion, type TargetAndTransition } from 'framer-motion'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { useReducedMotion } from '@/lib/motion'

type RevealStyle = 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'clip-up' | 'clip-left'

interface RevealProps {
  children: React.ReactNode
  className?: string
  style?: RevealStyle
  delay?: number
  duration?: number
  once?: boolean
}

const variants: Record<RevealStyle, { hidden: TargetAndTransition; visible: TargetAndTransition }> = {
  'slide-up': {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: 60, scale: 0.98 },
    visible: { opacity: 1, x: 0, scale: 1 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: -60, scale: 0.98 },
    visible: { opacity: 1, x: 0, scale: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
  'clip-up': {
    hidden: { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
    visible: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' },
  },
  'clip-left': {
    hidden: { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' },
    visible: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' },
  },
}

export function Reveal({
  children,
  className,
  style = 'slide-up',
  delay = 0,
  duration = 0.6,
  once = true,
}: RevealProps) {
  const { ref, shown, instant } = useScrollReveal<HTMLDivElement>({ once })
  const prefersReducedMotion = useReducedMotion()

  const v = variants[style]

  if (prefersReducedMotion) {
    return <div ref={ref} className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={shown ? v.visible : v.hidden}
      transition={instant ? { duration: 0 } : { duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
