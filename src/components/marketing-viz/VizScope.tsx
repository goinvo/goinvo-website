'use client'

import type { CSSProperties, ReactNode } from 'react'

import { vizCssVars, vizTokens, type VizScheme } from '@/lib/marketing/viz/tokens'

/**
 * Sets the data palette as CSS custom properties for everything inside it.
 * Charts are written against roles (`var(--viz-series-1)`), never hex, so one
 * component renders correctly in the Studio's light and dark schemes and on
 * the gated plan pages.
 *
 * `transparent` leaves the background to whatever card the chart sits in; the
 * surface token is still set, because marks draw their 2px gaps and rings in
 * it and those must match what is behind them.
 */
export function VizScope({
  scheme = 'light',
  children,
  style,
  transparent = true,
  className,
}: {
  scheme?: VizScheme
  children: ReactNode
  style?: CSSProperties
  transparent?: boolean
  className?: string
}) {
  const tokens = vizTokens(scheme)
  return (
    <div
      className={className}
      data-viz-scheme={scheme}
      style={{
        ...(vizCssVars(tokens) as CSSProperties),
        ['--viz-surface-fallback' as string]: tokens.surface,
        color: 'var(--viz-ink)',
        background: transparent ? undefined : 'var(--viz-surface)',
        colorScheme: scheme,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
