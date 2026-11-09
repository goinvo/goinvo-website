import type { CSSProperties, ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Inside a dark section the colour tokens themselves change, so everything that draws
 * with them (text, grey notes, links and their hover, a heading's teal sweep) turns light
 * without any per-element overrides. Contrast on the slate (#24434d): white 10.4:1,
 * the grey 7:1, the light teal 6:1. */
const DARK_TOKENS = {
  '--color-black': '#ffffff',
  '--color-gray': 'rgb(255 255 255 / 0.74)',
  '--color-secondary': '#8fd0d8',
} as CSSProperties

/**
 * A page section: the page's side margins, the vertical rhythm between sections,
 * and one of the site's tones. `spacing="none"` keeps the margins but lets the
 * section set its own top and bottom. A `dark` section is a slate band; the page's side
 * rail reads `data-tone="dark"` and turns light where the band passes behind it.
 */
export function Section({ tone = 'white', spacing = 'default', className, style, ...rest }: ComponentProps<'section'> & { tone?: 'white' | 'grey' | 'dark'; spacing?: 'default' | 'none' }) {
  return (
    <section
      data-tone={tone === 'dark' ? 'dark' : undefined}
      style={tone === 'dark' ? { ...DARK_TOKENS, ...style } : style}
      className={cn('px-5 md:px-[6vw]', spacing === 'default' && 'py-24 md:py-32', tone === 'grey' && 'bg-tertiary-lightest', tone === 'dark' && 'bg-tertiary text-white', className)}
      {...rest}
    />
  )
}
