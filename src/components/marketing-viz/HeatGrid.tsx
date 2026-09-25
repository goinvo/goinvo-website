'use client'

import { sequentialStep } from '@/lib/marketing/viz/tokens'
import { estimateTextWidth } from '@/lib/marketing/viz/scale'

import { ChartTooltip, useChartTooltip } from './Tooltip'
import { useElementWidth } from './useElementWidth'

export type HeatAxis = { key: string; label: string; note?: string; short?: string }

/**
 * A grid of counts on one sequential hue: darker is more. Zero keeps the
 * near-surface step and prints nothing, so an empty row reads as a gap at a
 * glance — which, for "where is our network warm", is the finding.
 */
export function HeatGrid({
  rows,
  columns,
  value,
  unit = 'contacts',
  highlightRow,
}: {
  rows: HeatAxis[]
  columns: HeatAxis[]
  value: (row: string, column: string) => number
  unit?: string
  highlightRow?: string | null
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const { hover, bind, activeId } = useChartTooltip()
  const labelWidth = Math.min(Math.max(120, width * 0.35), Math.max(96, ...rows.map((row) => estimateTextWidth(row.label, 12, highlightRow === row.key ? 650 : 400) + 14)))
  const totalWidth = 52
  const gap = 2
  const cellWidth = Math.max(28, (width - labelWidth - totalWidth - gap * (columns.length - 1)) / columns.length)
  const cellHeight = 26
  const header = 22
  const max = Math.max(1, ...rows.flatMap((row) => columns.map((column) => value(row.key, column.key))))
  const height = header + rows.length * (cellHeight + gap)
  const totals = rows.map((row) => columns.reduce((sum, column) => sum + value(row.key, column.key), 0))
  const plotRight = labelWidth + columns.length * (cellWidth + gap) - gap

  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${rows.length} by ${columns.length} grid of ${unit}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {columns.map((column, c) => (
          <text
            key={column.key}
            x={labelWidth + c * (cellWidth + gap) + cellWidth / 2}
            y={14}
            fontSize={11}
            textAnchor="middle"
            fill="var(--viz-secondary)"
          >
            {estimateTextWidth(column.label, 11) + 6 <= cellWidth
              ? column.label
              : (column.short ?? column.label.slice(0, 4))}
          </text>
        ))}
        <text x={width} y={14} fontSize={11} textAnchor="end" fill="var(--viz-muted)">
          Total
        </text>
        {rows.map((row, r) => {
          const y = header + r * (cellHeight + gap)
          const emphasised = highlightRow === row.key
          return (
            <g key={row.key}>
              <text
                x={labelWidth - 10}
                y={y + cellHeight / 2 + 4}
                fontSize={12}
                textAnchor="end"
                fill={emphasised ? 'var(--viz-ink)' : 'var(--viz-secondary)'}
                fontWeight={emphasised ? 650 : 400}
              >
                {row.label}
              </text>
              {columns.map((column, c) => {
                const count = value(row.key, column.key)
                const step = sequentialStep(count / max) + 1
                const id = `${row.key}:${column.key}`
                const x = labelWidth + c * (cellWidth + gap)
                const text = count ? String(count) : ''
                return (
                  <g
                    key={column.key}
                    {...bind(id, {
                      title: `${row.label} · ${column.label}`,
                      rows: [{ value: String(count), label: count === 1 ? unit.replace(/s$/, '') : unit }],
                    })}
                    style={{ outline: 'none' }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={cellWidth}
                      height={cellHeight}
                      rx={3}
                      fill={`var(--viz-seq-${step})`}
                      stroke={activeId === id ? 'var(--viz-ink)' : 'none'}
                      strokeWidth={activeId === id ? 1.5 : 0}
                    />
                    {text ? (
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 + 4}
                        fontSize={12}
                        fontWeight={600}
                        textAnchor="middle"
                        fill={`var(--viz-on-seq-${step})`}
                        pointerEvents="none"
                      >
                        {text}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              <text
                x={width}
                y={y + cellHeight / 2 + 4}
                fontSize={12}
                textAnchor="end"
                fill="var(--viz-ink)"
                fontWeight={emphasised ? 650 : 400}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {totals[r]}
              </text>
            </g>
          )
        })}
        {highlightRow
          ? (() => {
              const r = rows.findIndex((row) => row.key === highlightRow)
              if (r < 0) return null
              const y = header + r * (cellHeight + gap) - 1
              return (
                <rect
                  x={labelWidth - 1}
                  y={y}
                  width={plotRight - labelWidth + 2}
                  height={cellHeight + 2}
                  rx={4}
                  fill="none"
                  stroke="var(--viz-ink)"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )
            })()
          : null}
      </svg>
      <ScaleLegend max={max} unit={unit} />
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}

/** The key for a sequential scale: the ramp itself, labelled at its ends. */
export function ScaleLegend({ max, unit }: { max: number; unit: string }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--viz-muted)' }}
    >
      <span>0</span>
      <span aria-hidden style={{ display: 'inline-flex', gap: 2 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
          <span
            key={step}
            style={{
              width: 14,
              height: 10,
              borderRadius: 2,
              background: `var(--viz-seq-${step})`,
              boxShadow: step === 1 ? 'inset 0 0 0 1px var(--viz-grid)' : undefined,
            }}
          />
        ))}
      </span>
      <span>
        {max} {unit}
      </span>
    </div>
  )
}
