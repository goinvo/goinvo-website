import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { VizScope } from '@/components/marketing-viz'
import type { VizScheme } from '@/lib/marketing/viz/tokens'

/**
 * The chart palette, following whatever the card behind the charts actually
 * is. The scheme is read from the rendered colour (`--card-bg-color`, else the
 * nearest painted background), not from Sanity's theme context: the Outreach
 * page also renders in a test harness with no Studio providers, where a
 * context hook would throw. Charts draw their 2px gaps and rings in the
 * surface colour, so that is also pinned to the card's.
 */
export function StudioVizScope({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [scheme, setScheme] = useState<VizScheme>('light')

  // Every render, on purpose: the Studio re-renders the tree when its scheme
  // changes, and the guard below stops a render from scheduling another.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next = schemeOf(ref.current)
    if (next && next !== scheme) setScheme(next)
  })

  return (
    <div ref={ref}>
      <VizScope scheme={scheme} style={{ ['--viz-surface' as string]: 'var(--card-bg-color, var(--viz-surface-fallback))', ...style }}>
        {children}
      </VizScope>
    </div>
  )
}

/** Light or dark, by the luminance of the colour the charts sit on. */
export function schemeOf(element: Element | null): VizScheme | null {
  if (!element || typeof window === 'undefined') return null
  const declared = getComputedStyle(element).getPropertyValue('--card-bg-color').trim()
  let colour = declared
  for (let node: Element | null = element; !colour && node; node = node.parentElement) {
    const painted = getComputedStyle(node).backgroundColor
    if (painted && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(painted)) colour = painted
  }
  const rgb = parseColour(colour)
  if (!rgb) return 'light'
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.2 ? 'dark' : 'light'
}

function parseColour(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((d) => d + d).join('') : hex[1]
    const n = parseInt(digits, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(value)
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null
}
