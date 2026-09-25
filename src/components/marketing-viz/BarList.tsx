'use client'

import { estimateTextWidth, linear } from '@/lib/marketing/viz/scale'

import { roundedRight } from './BudgetMeter'
import { ChartTooltip, useChartTooltip } from './Tooltip'
import { useElementWidth } from './useElementWidth'

export type BarListItem = {
  key: string
  label: string
  value: number
  display?: string
  detail?: string
  emphasis?: boolean
}

/**
 * Nominal categories compared by length: one series, so every bar wears the
 * same colour — unless one bar IS the point, in which case it takes the accent
 * and the rest recede to grey (emphasis).
 */
export function BarList({
  items,
  format = (value: number) => value.toLocaleString('en-US'),
  unit = '',
  barHeight = 14,
  target,
}: {
  items: BarListItem[]
  format?: (value: number) => string
  unit?: string
  barHeight?: number
  /** Optional reference value drawn as a hairline on every row ("enough to support a campaign"). */
  target?: { value: number; label: string }
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(480)
  const { hover, bind, activeId } = useChartTooltip()
  const anyEmphasis = items.some((item) => item.emphasis)
  const labelWidth = Math.min(200, Math.max(70, ...items.map((item) => estimateTextWidth(item.label, 12) + 12)))
  const valueWidth = 64
  const plot = Math.max(40, width - labelWidth - valueWidth)
  const max = Math.max(1, target?.value ?? 0, ...items.map((item) => item.value))
  const x = linear([0, max], [0, plot])
  const rowHeight = barHeight + 12
  const top = target ? 16 : 0
  const height = top + items.length * rowHeight
  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={items.map((item) => `${item.label} ${item.display ?? format(item.value)}`).join(', ')}
        style={{ display: 'block' }}
      >
        {items.map((item, index) => {
          const y = top + index * rowHeight + 6
          const w = item.value > 0 ? Math.max(3, x(item.value)) : 0
          const fill = anyEmphasis && !item.emphasis ? 'var(--viz-deemphasis)' : 'var(--viz-series-1)'
          const id = item.key
          return (
            <g
              key={id}
              {...bind(id, {
                title: item.label,
                rows: [{ value: item.display ?? `${format(item.value)}${unit}`, label: item.detail ?? '' }],
              })}
              style={{ outline: 'none' }}
            >
              <rect
                x={0}
                y={y - 6}
                width={width}
                height={rowHeight}
                fill={activeId === id ? 'var(--viz-grid)' : 'transparent'}
                opacity={0.6}
              />
              <text
                x={labelWidth - 10}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                textAnchor="end"
                fill={item.emphasis ? 'var(--viz-ink)' : 'var(--viz-secondary)'}
                fontWeight={item.emphasis ? 650 : 400}
              >
                {item.label}
              </text>
              {w ? <path d={roundedRight(labelWidth, y, w, barHeight, 4, 0)} fill={fill} /> : null}
              <text
                x={labelWidth + w + 6}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                fill="var(--viz-ink)"
                fontWeight={item.emphasis ? 650 : 400}
              >
                {item.display ?? `${format(item.value)}${unit}`}
              </text>
            </g>
          )
        })}
        <line x1={labelWidth} x2={labelWidth} y1={top} y2={height} stroke="var(--viz-baseline)" strokeWidth={1} />
        {target ? (
          <g pointerEvents="none">
            <line
              x1={labelWidth + x(target.value)}
              x2={labelWidth + x(target.value)}
              y1={top - 4}
              y2={height}
              stroke="var(--viz-secondary)"
              strokeWidth={1}
            />
            <text x={labelWidth + x(target.value)} y={10} fontSize={11} textAnchor="middle" fill="var(--viz-secondary)">
              {target.label}
            </text>
          </g>
        ) : null}
      </svg>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}
