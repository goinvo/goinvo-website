'use client'

/**
 * Words that brighten as you read: ScrubWords follows a progress value you pass
 * in (inside a sticky stage); ReadAlong follows the element's own scroll. The
 * `sweep` variant fills each word with teal from the left. Ported from FELINES
 * with the homepage story; shared by every page through SectionHeading.
 */

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'

// Reduced motion changes the VALUES, never the markup: the server cannot know the
// preference, so rendering plain text for it made the client tree differ and
// React threw away the server HTML.
function ScrubWord({ word, progress, range, variant = 'opacity', reduced = false }: { word: string; progress: MotionValue<number>; range: [number, number]; variant?: 'opacity' | 'ink' | 'sweep'; reduced?: boolean }) {
  const reduce = useReducedMotion()
  const opacity = useTransform(progress, range, reduce || reduced || variant === 'ink' ? [1, 1] : [0.18, 1])
  const color = useTransform(progress, range, reduce || reduced ? ['#153d3b', '#153d3b'] : ['#596c66', '#153d3b'])
  const clipPath = useTransform(progress, range, ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  if (variant === 'sweep') return <span className="inline-block whitespace-pre"><span className="relative inline-block">{word}<motion.span data-word-fill aria-hidden="true" className="pointer-events-none absolute inset-0 text-secondary" style={{ clipPath: reduced || reduce ? 'inset(0)' : clipPath }}>{word}</motion.span></span>{' '}</span>
  return <motion.span style={variant === 'ink' ? { color } : { opacity }}>{word} </motion.span>
}

/** Words that brighten in reading order as `progress` crosses [start, end]. */
export function ScrubWords({
  text,
  progress,
  start,
  end,
  className,
}: {
  text: string
  progress: MotionValue<number>
  start: number
  end: number
  className?: string
}) {
  const words = text.split(' ')
  const span = (end - start) / words.length
  return (
    <p className={className}>
      {words.map((word, i) => (
        <ScrubWord key={`${i}-${word}`} word={word} progress={progress} range={[start + i * span, start + (i + 1) * span]} />
      ))}
    </p>
  )
}

/**
 * Words that brighten as the paragraph itself scrolls up the screen. Outside a
 * stage, this is the "read along" highlight.
 */
export function ReadAlong({ text, className, as: Tag = 'p', variant = 'opacity', reduced = false, id }: { text: string; className?: string; as?: 'p' | 'blockquote' | 'h2' | 'h3'; variant?: 'opacity' | 'ink' | 'sweep'; reduced?: boolean; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: raw } = useScroll({ target: ref, offset: ['start 0.85', 'start 0.35'] })
  const scrollYProgress = useTransform(raw, (v) => v) // see StickyStage
  const words = text.split(' ')
  const MotionTag = Tag === 'h2' ? motion.h2 : Tag === 'h3' ? motion.h3 : Tag === 'p' ? motion.p : motion.blockquote

  return (
    <MotionTag ref={ref as never} id={id} className={className}>
      {words.map((word, i) => (
        <ScrubWord
          key={`${i}-${word}`}
          word={word}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
          variant={variant}
          reduced={reduced}
        />
      ))}
    </MotionTag>
  )
}
