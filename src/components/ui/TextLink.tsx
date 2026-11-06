import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Arrow } from './Arrow'

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current'

/** The text-link look, for elements that cannot be a TextLink (a motion.a, say). */
export const textLinkClass = cn('group inline-flex min-h-12 items-center gap-4 text-inherit no-underline hover:text-secondary', focusRing)

/**
 * The site's one link style for a call to action in a layout (not in running
 * text): ink, a 48px touch target, the label underlines and turns teal on hover,
 * and an optional arrow (which nudges, when `nudge`).
 */
export function TextLink({ children, arrow = 'right', nudge = false, className, ...rest }: ComponentProps<'a'> & { children: ReactNode; arrow?: 'right' | 'down' | false; nudge?: boolean }) {
  return (
    <a className={cn(textLinkClass, className)} {...rest}>
      <span className="group-hover:underline group-focus-visible:underline">{children}</span>
      {arrow && (nudge
        ? <span className="transition-transform duration-300 group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none"><Arrow direction={arrow} /></span>
        : <Arrow direction={arrow} />)}
    </a>
  )
}

/** A link inside a sentence: always underlined, inheriting the text around it. */
export function InlineLink({ className, ...rest }: ComponentProps<'a'>) {
  return <a className={cn('inline-flex min-h-12 items-center text-inherit underline underline-offset-4', focusRing, className)} {...rest} />
}
