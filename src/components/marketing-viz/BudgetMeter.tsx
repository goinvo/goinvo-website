'use client'

import { labelFits, linear, stackSegments } from '@/lib/marketing/viz/scale'

import { ChartTooltip, useChartTooltip } from './Tooltip'
import { Legend, LegendItem } from './ChartFrame'
import { useElementWidth } from './useElementWidth'

export type BudgetPart = { key: string; label: string; value: number; slot: number; detail?: string }

/**
 * A bullet chart for a fixed budget: what is spent, stacked by what it is for,
 * against a target line, with the unspent remainder left as track. Anything
 * past the line is the overrun and is called out in words, not just colour.
 */
export function BudgetMeter({
  budget,
  parts,
  format,
  budgetLabel,
  height = 18,
}: {
  budget: number
  parts: BudgetPart[]
  format: (value: number) => string
  budgetLabel: string
  height?: number
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const { hover, bind, activeId } = useChartTooltip()
  const spent = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0)
  const scaleMax = Math.max(budget, spent) || 1
  const x = linear([0, scaleMax], [0, width])
  const segments = stackSegments(parts, (part) => part.value, { width, total: scaleMax })
  const budgetX = x(budget)
  const over = spent - budget
  const top = 18
  const svgHeight = top + height + (over > 0 ? 22 : 8)
  const lastIndex = segments.length - 1

  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={svgHeight}
        role="img"
        aria-label={`${format(spent)} planned of ${budgetLabel}`}
        style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}
      >
        {/* the unspent budget: a light step of the fill's own hue */}
        <rect x={0} y={top} width={Math.max(0, budgetX)} height={height} rx={4} fill="var(--viz-track)" />
        {segments.map((segment, index) => {
          const part = segment.item
          const id = part.key
          const text = `${part.label} ${format(part.value)}`
          const isLast = index === lastIndex
          return (
            <g
              key={id}
              {...bind(id, {
                title: part.label,
                rows: [
                  { value: format(part.value), label: part.detail ?? '', swatch: `var(--viz-series-${part.slot + 1})` },
                ],
              })}
              style={{ outline: 'none' }}
            >
              <path
                d={roundedRight(segment.x, top, segment.width, height, isLast ? 4 : 0, index === 0 ? 4 : 0)}
                fill={`var(--viz-series-${part.slot + 1})`}
                opacity={activeId && activeId !== id ? 0.55 : 1}
              />
              {labelFits(text, segment.width) ? (
                <text
                  x={segment.x + 8}
                  y={top + height / 2 + 4}
                  fontSize={12}
                  fontWeight={600}
                  fill={`var(--viz-on-series-${part.slot + 1})`}
                  pointerEvents="none"
                >
                  {text}
                </text>
              ) : null}
              <rect x={segment.x - 1} y={top - 4} width={segment.width + 2} height={height + 8} fill="transparent" />
            </g>
          )
        })}
        {/* the budget line */}
        <line x1={budgetX} x2={budgetX} y1={top - 6} y2={top + height + 4} stroke="var(--viz-ink)" strokeWidth={2} />
        <text
          x={Math.min(budgetX, width - 2)}
          y={top - 9}
          fontSize={11}
          textAnchor={budgetX > width - 60 ? 'end' : 'middle'}
          fill="var(--viz-secondary)"
        >
          {budgetLabel}
        </text>
        {over > 0 ? (
          <g>
            <line
              x1={budgetX}
              x2={width}
              y1={top + height + 8}
              y2={top + height + 8}
              stroke="var(--viz-critical)"
              strokeWidth={2}
            />
            <text x={width} y={top + height + 21} fontSize={11} textAnchor="end" fill="var(--viz-ink)">
              {format(over)} over
            </text>
          </g>
        ) : null}
      </svg>
      <Legend>
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <LegendItem
              key={part.key}
              color={`var(--viz-series-${part.slot + 1})`}
              label={part.label}
              value={format(part.value)}
            />
          ))}
        {over <= 0 ? (
          <LegendItem color="var(--viz-track)" shape="track" label="Spare" value={format(budget - spent)} />
        ) : null}
      </Legend>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}

/** A rect with independently rounded left and right ends. */
function roundedRight(x: number, y: number, w: number, h: number, rRight: number, rLeft: number): string {
  const r1 = Math.min(rLeft, w / 2, h / 2)
  const r2 = Math.min(rRight, w / 2, h / 2)
  return [
    `M${x + r1},${y}`,
    `H${x + w - r2}`,
    r2 ? `Q${x + w},${y} ${x + w},${y + r2}` : '',
    `V${y + h - r2}`,
    r2 ? `Q${x + w},${y + h} ${x + w - r2},${y + h}` : '',
    `H${x + r1}`,
    r1 ? `Q${x},${y + h} ${x},${y + h - r1}` : '',
    `V${y + r1}`,
    r1 ? `Q${x},${y} ${x + r1},${y}` : '',
    'Z',
  ].join(' ')
}

export { roundedRight }
