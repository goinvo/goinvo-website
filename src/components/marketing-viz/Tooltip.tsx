'use client'

import { useCallback, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'

export type TooltipRow = { value: string; label: string; key?: string; swatch?: string }
export type TooltipContent = { title?: string; rows: TooltipRow[] }

type HoverState = { x: number; y: number; content: TooltipContent; id: string } | null

/**
 * One hover/focus layer per chart. Marks call `bind(id, content)` and spread
 * the result: pointer and keyboard focus show the same readout, and the
 * hovered mark can lift (`activeId`). The tooltip never gates a value — every
 * chart also has direct labels or its table view.
 */
export function useChartTooltip() {
  const [hover, setHover] = useState<HoverState>(null)

  const bind = useCallback(
    (id: string, content: TooltipContent) => ({
      tabIndex: 0,
      'aria-label': [content.title, ...content.rows.map((row) => `${row.label}: ${row.value}`)]
        .filter(Boolean)
        .join('. '),
      onPointerEnter: (event: PointerEvent<Element>) => setHover(positionFromPointer(event, content, id)),
      onPointerMove: (event: PointerEvent<Element>) => setHover(positionFromPointer(event, content, id)),
      onPointerLeave: () => setHover((current) => (current?.id === id ? null : current)),
      onFocus: (event: FocusEvent<Element>) => setHover(positionFromElement(event.currentTarget, content, id)),
      onBlur: () => setHover((current) => (current?.id === id ? null : current)),
    }),
    [],
  )

  return { hover, bind, activeId: hover?.id ?? null, clear: () => setHover(null) }
}

function frameOf(element: Element): HTMLElement | null {
  return element.closest('[data-viz-frame]')
}

function positionFromPointer(event: PointerEvent<Element>, content: TooltipContent, id: string): HoverState {
  const frame = frameOf(event.currentTarget)
  if (!frame) return null
  const box = frame.getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top, content, id }
}

function positionFromElement(element: Element, content: TooltipContent, id: string): HoverState {
  const frame = frameOf(element)
  if (!frame) return null
  const box = frame.getBoundingClientRect()
  const mark = element.getBoundingClientRect()
  return { x: mark.left + mark.width / 2 - box.left, y: mark.top - box.top, content, id }
}

/** Values lead, labels follow; series keyed by a short stroke, not a box. */
export function ChartTooltip({ hover, frameWidth }: { hover: HoverState; frameWidth: number }) {
  if (!hover) return null
  const width = 220
  const left = Math.max(4, Math.min(frameWidth - width - 4, hover.x + 12))
  const top = Math.max(4, hover.y - 12)
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left,
        top,
        transform: 'translateY(-100%)',
        width,
        pointerEvents: 'none',
        zIndex: 5,
        padding: '8px 10px',
        borderRadius: 6,
        background: 'var(--viz-surface)',
        border: '1px solid var(--viz-border)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {hover.content.title ? (
        <div style={{ color: 'var(--viz-secondary)', marginBottom: 4 }}>{hover.content.title}</div>
      ) : null}
      {hover.content.rows.map((row, index) => (
        <div key={row.key ?? index} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {row.swatch ? (
            <span
              aria-hidden
              style={{
                width: 10,
                height: 2,
                borderRadius: 1,
                background: row.swatch,
                flex: '0 0 auto',
                transform: 'translateY(-3px)',
              }}
            />
          ) : null}
          <strong style={{ color: 'var(--viz-ink)', fontWeight: 650 }}>{row.value}</strong>
          <span style={{ color: 'var(--viz-secondary)' }}>{row.label}</span>
        </div>
      ))}
    </div>
  )
}

export function TooltipLayer({ children }: { children: ReactNode }) {
  return <>{children}</>
}
