import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A page section: the page's side margins, the vertical rhythm between sections,
 * and one of the site's tones. `spacing="none"` keeps the margins but lets the
 * section set its own top and bottom.
 */
export function Section({ tone = 'white', spacing = 'default', className, ...rest }: ComponentProps<'section'> & { tone?: 'white' | 'grey'; spacing?: 'default' | 'none' }) {
  return (
    <section
      className={cn('px-5 md:px-[6vw]', spacing === 'default' && 'py-24 md:py-32', tone === 'grey' && 'bg-tertiary-lightest', className)}
      {...rest}
    />
  )
}
