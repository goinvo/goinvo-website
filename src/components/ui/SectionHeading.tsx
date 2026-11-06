'use client'

import { cn } from '@/lib/utils'
import { ReadAlong } from './ReadAlong'
import { type } from './type'

/**
 * A section's heading at the site's heading size. `sweep` fills the words with
 * teal as they scroll into reading position (`reduced` shows them filled).
 */
export function SectionHeading({ id, text, sweep = false, reduced = false, className }: { id?: string; text: string; sweep?: boolean; reduced?: boolean; className?: string }) {
  const classes = cn('m-0', type.heading, className)
  return sweep
    ? <ReadAlong as="h2" id={id} variant="sweep" reduced={reduced} text={text} className={classes} />
    : <h2 id={id} className={classes}>{text}</h2>
}
