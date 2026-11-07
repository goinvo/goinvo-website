'use client'

import type { ReactNode } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'

/** The line is drawn by the reading gesture, rather than added as decoration:
 * it grows under its text as `progress` runs from `start` to `end`. */
export function DrawnLine({ children, progress, low, start = 0, end = 1 }: { children: ReactNode; progress: MotionValue<number>; low: boolean; start?: number; end?: number }) {
  const scaleX = useTransform(progress, [start, end], [0, 1])
  return <span className="relative inline-block pb-[0.1em]">{children}<motion.span data-drawn-line aria-hidden="true" style={{ scaleX: low ? 1 : scaleX }} className="pointer-events-none absolute bottom-0 left-0 h-[0.055em] min-h-[2px] w-full origin-left bg-current" /></span>
}
