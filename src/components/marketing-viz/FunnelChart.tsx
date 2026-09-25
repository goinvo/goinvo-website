'use client'

import { formatPercent } from '@/lib/marketing/viz/format'
import { estimateTextWidth, linear } from '@/lib/marketing/viz/scale'

import { roundedRight } from './BudgetMeter'
import { ChartTooltip, useChartTooltip } from './Tooltip'
import { useElementWidth } from './useElementWidth'

export type FunnelRow = {
  key: string
  label: string
  count: number
  /** Share of the stage before, null for the first stage. */
  fromPrevious: number | null
  /** The weakest step in the funnel — gets called out. */
  isLeak?: boolean
  detail?: string
}

/**
 * Stages as ordered bars on one baseline. The stages are ORDINAL, so they wear
 * one hue stepping darker as they go (the reader sees the order in the
 * colour); the step-to-step rate sits beside each bar, and the weakest step is
 * named rather than left for the reader to find.
 */
export function FunnelChart({ rows, barHeight = 20 }: { rows: FunnelRow[]; barHeight?: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const { hover, bind, activeId } = useChartTooltip()
  const labelWidth = Math.min(132, Math.max(80, ...rows.map((row) => estimateTextWidth(row.label, 12) + 12)))
  const narrow = width < 520
  const rateWidth = narrow ? 104 : 150
  const plotWidth = Math.max(60, width - labelWidth - rateWidth)
  const max = Math.max(1, ...rows.map((row) => row.count))
  const x = linear([0, max], [0, plotWidth])
  const rowGap = 10
  const height = rows.length * (barHeight + rowGap)
  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={rows.map((row) => `${row.label} ${row.count}`).join(', ')}
        style={{ display: 'block' }}
      >
        <line
          x1={labelWidth}
          x2={labelWidth}
          y1={0}
          y2={height - rowGap}
          stroke="var(--viz-baseline)"
          strokeWidth={1}
        />
        {rows.map((row, index) => {
          const y = index * (barHeight + rowGap)
          const w = row.count > 0 ? Math.max(3, x(row.count)) : 0
          const id = row.key
          const countText = row.count.toLocaleString('en-US')
          const inside = estimateTextWidth(countText, 12) + 12 <= w
          const rate =
            row.fromPrevious === null
              ? ''
              : narrow
                ? `${formatPercent(row.fromPrevious)} of prev.`
                : `${formatPercent(row.fromPrevious)} of previous`
          return (
            <g
              key={id}
              {...bind(id, {
                title: row.label,
                rows: [
                  { value: countText, label: row.count === 1 ? 'contact' : 'contacts' },
                  ...(row.fromPrevious === null
                    ? []
                    : [{ value: formatPercent(row.fromPrevious), label: 'made it from the stage before' }]),
                  ...(row.detail ? [{ value: '', label: row.detail }] : []),
                ],
              })}
              style={{ outline: 'none' }}
            >
              <rect
                x={0}
                y={y - rowGap / 2}
                width={width}
                height={barHeight + rowGap}
                fill={activeId === id ? 'var(--viz-grid)' : 'transparent'}
                opacity={0.6}
              />
              <text
                x={labelWidth - 10}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                textAnchor="end"
                fill="var(--viz-secondary)"
              >
                {row.label}
              </text>
              {w > 0 ? (
                <path
                  d={roundedRight(labelWidth, y, w, barHeight, 4, 0)}
                  fill={`var(--viz-ordinal-${ordinalSlot(index, rows.length)})`}
                />
              ) : null}
              <text
                x={inside ? labelWidth + w - 8 : labelWidth + w + 6}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                fontWeight={650}
                textAnchor={inside ? 'end' : 'start'}
                fill={inside ? `var(--viz-on-ordinal-${ordinalSlot(index, rows.length)})` : 'var(--viz-ink)'}
              >
                {countText}
              </text>
              {rate ? (
                <text
                  x={width - rateWidth + 8}
                  y={y + barHeight / 2 + 4}
                  fontSize={12}
                  fill={row.isLeak ? 'var(--viz-ink)' : 'var(--viz-muted)'}
                  fontWeight={row.isLeak ? 650 : 400}
                >
                  {row.isLeak
                    ? `↓ ${formatPercent(row.fromPrevious ?? 0)} · ${narrow ? 'worst' : 'biggest drop'}`
                    : rate}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}

/** 1-based ordinal step for stage `index` of `count`, spread across the six steps. */
export function ordinalSlot(index: number, count: number): number {
  if (count <= 1) return 6
  return 1 + Math.round((Math.max(0, Math.min(count - 1, index)) / (count - 1)) * 5)
}
