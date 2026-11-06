'use client'

/**
 * Scroll-storytelling primitives, ported from FELINES (plig-framework
 * src/components/ui: sticky-scroll-stage, scroll-beat, count-up,
 * scroll-highlight-text). Every transform is a MotionValue, so scrolling never
 * re-renders React.
 *
 * Two rules carried over from this site, not from FELINES:
 * - First-screen content is visible in the server HTML. Nothing here starts a
 *   first-screen element at opacity 0 (see scripts/check-hidden-until-hydration.mjs).
 * - The sticky stage pins BELOW the fixed site header, not at top 0.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  animate,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { ease } from '@/lib/motion'

export const EASE = ease.outExpo

/** A tall container whose inner stage stays pinned while `progress` runs 0 → 1. */
export function StickyStage({
  height,
  label,
  className,
  children,
}: {
  /** Total scroll height, in viewport heights. */
  height: number
  label: string
  className?: string
  children: (progress: MotionValue<number>) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const skipId = useId()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // Hand children a DERIVED value. Fed scrollYProgress directly, framer offloads
  // opacity transforms to native scroll timelines, and those got this stage's range
  // wrong: at 83% through, faded layers still computed opacity 1 while JS-driven
  // clip-paths moved correctly. A function transform keeps every beat on one clock.
  const progress = useTransform(scrollYProgress, (v) => v)

  return (
    <div ref={ref} className={className} style={{ height: `${height}svh` }} role="region" aria-label={label}>
      <a href={`#${skipId}`} className="hs-skip">
        Skip the animation
      </a>
      <div className="hs-stage">{children(progress)}</div>
      <div id={skipId} />
    </div>
  )
}

type EnterFrom = 'bottom' | 'left' | 'right' | 'scale' | 'fade'

/**
 * A piece of a stage that enters between `enter` and `hold`, and leaves between
 * `exit` and `gone` (omit both to stay). Outside its range it is
 * visibility:hidden, so screen readers and Tab skip what cannot be seen.
 */
export function Beat({
  progress,
  enter,
  hold,
  exit,
  gone,
  from = 'bottom',
  className,
  children,
}: {
  progress: MotionValue<number>
  enter: number
  hold: number
  exit?: number
  gone?: number
  from?: EnterFrom
  className?: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const leaves = exit !== undefined && gone !== undefined
  // enter <= 0 means "already in when the stage starts". Keyframe offsets must
  // stay inside 0..1 (framer hands these to the Web Animations API, which throws
  // on a negative offset and takes the whole page down with it).
  const startsIn = enter <= 0

  const kf = useMemo(() => {
    const input = startsIn
      ? leaves ? [exit!, gone!] : [0, 1]
      : leaves ? [enter, hold, exit!, gone!] : [enter, hold]
    const opacity = startsIn ? (leaves ? [1, 0] : [1, 1]) : leaves ? [0, 1, 1, 0] : [0, 1]
    const still = { input: [0, 1], output: [0, 0] }
    if (reduce) return { input, opacity, x: still, y: still, scale: { input: [0, 1], output: [1, 1] } }
    const move = (a: number, b: number) => ({
      input,
      output: startsIn ? (leaves ? [0, b] : [0, 0]) : leaves ? [a, 0, 0, b] : [a, 0],
    })
    return {
      input,
      opacity,
      x: from === 'left' ? move(-48, 48) : from === 'right' ? move(48, -48) : still,
      y: from === 'bottom' ? move(28, -20) : still,
      scale: from === 'scale' ? move(0.94, 0.97) : { input: [0, 1], output: [1, 1] },
    }
  }, [enter, hold, exit, gone, leaves, startsIn, from, reduce])

  const opacity = useTransform(progress, kf.input, kf.opacity)
  const x = useTransform(progress, kf.x.input, kf.x.output)
  const y = useTransform(progress, kf.y.input, kf.y.output)
  const scale = useTransform(progress, kf.scale.input, kf.scale.output)
  const visibility = useTransform(progress, (p) =>
    (!startsIn && p < enter) || (leaves && p > gone!) ? 'hidden' : 'visible',
  )

  return (
    <motion.div style={{ opacity, x, y, scale, visibility }} className={className}>
      {children}
    </motion.div>
  )
}

/** A number scrubbed by scroll from `from` to `to` between `enter` and `hold`. */
export function ScrubNumber({
  progress,
  enter,
  hold,
  from,
  to,
  className,
}: {
  progress: MotionValue<number>
  enter: number
  hold: number
  from: number
  to: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const value = useTransform(progress, [enter, hold], [from, to])

  useEffect(() => {
    const paint = (v: number) => {
      if (ref.current) ref.current.textContent = String(Math.round(v))
    }
    paint(value.get())
    return value.on('change', paint)
  }, [value])

  // Server HTML carries the final value: a reader without JavaScript sees the result.
  return (
    <span ref={ref} className={className}>
      {to}
    </span>
  )
}

export { ScrubWords, ReadAlong } from '@/components/ui/ReadAlong'

/** A number that counts up once, the first time it scrolls into view. */
export function CountOnView({ to, className }: { to: number; className?: string }) {
  // Vertical-only margin: a bare '-80px' also shrinks the observer 80px from each
  // SIDE, and on a 390px phone this number sits at x=20–45, wholly inside that
  // band, so it never counted.
  const { ref, shown } = useScrollReveal<HTMLSpanElement>({ margin: '-80px 0px' })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(to)

  // No "already started" ref: under Strict Mode the effect runs, is cleaned up
  // (stopping the count), and runs again, and a ref would refuse the second run,
  // leaving the number frozen at 0. `shown` only ever goes false → true, so the
  // effect re-running is the guard.
  useEffect(() => {
    if (reduce) return
    if (!shown) {
      setValue(0)
      return
    }
    const controls = animate(0, to, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [shown, reduce, to])

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  )
}

/**
 * Marks its child `data-shown` once it has been on screen. CSS does the motion
 * (`.hs-wipe`, `.hs-rise`, `.hs-draw`), so the server HTML is already visible and
 * only content that starts below the fold is held back.
 */
export function Reveal({
  as: Tag = 'div',
  className,
  style,
  children,
}: {
  as?: 'div' | 'p' | 'h2' | 'h3' | 'blockquote' | 'li' | 'span'
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}) {
  const { ref, shown } = useScrollReveal<HTMLElement>({ margin: '-60px 0px' }) // vertical only; see CountOnView
  const Component = Tag as 'div'
  // A wipe clips an inner span, so the observed element always has area (see .hs-wipe).
  const wipe = className?.split(' ').includes('hs-wipe')
  return (
    <Component ref={ref as never} className={className} style={style} data-shown={shown ? '' : undefined}>
      {wipe ? <span className="hs-wipe-inner">{children}</span> : children}
    </Component>
  )
}
