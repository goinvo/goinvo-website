'use client'

import { formatPercent } from '@/lib/marketing/viz/format'
import { labelFits, stackSegments } from '@/lib/marketing/viz/scale'

import { roundedRight } from './BudgetMeter'
import { Legend, LegendItem } from './ChartFrame'
import { ChartTooltip, useChartTooltip } from './Tooltip'
import { useElementWidth } from './useElementWidth'

import type { ShareSlice } from '@/lib/marketing/viz/briefViz'

export type { ShareSlice }

const FILL: Record<ShareSlice['tone'], string> = {
  accent: 'var(--viz-series-1)',
  context: 'var(--viz-deemphasis)',
  unknown: 'var(--viz-track)',
}
/** Text set inside each fill; only the accent is dark enough to need white. */
const ON_FILL: Record<ShareSlice['tone'], string> = {
  accent: 'var(--viz-on-series-1)',
  context: 'var(--viz-ink)',
  unknown: 'var(--viz-ink)',
}
const LEGEND_SHAPE: Record<ShareSlice['tone'], 'rect' | 'track'> = { accent: 'rect', context: 'rect', unknown: 'track' }

/**
 * Part-to-whole in one bar, as EMPHASIS: the slice the story is about wears
 * the accent, the rest recede to grey, and what nobody could classify is the
 * lightest of all. Shares are printed; the legend names every slice.
 */
export function ShareBar({ slices, height = 22 }: { slices: ShareSlice[]; height?: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const { hover, bind, activeId } = useChartTooltip()
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0) || 1
  const segments = stackSegments(slices, (slice) => slice.value, { width })
  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label={slices.map((slice) => `${slice.label} ${slice.value}`).join(', ')} style={{ display: 'block', maxWidth: '100%' }}>
        {segments.map((segment, index) => {
          const slice = segment.item
          const share = formatPercent(slice.value / total)
          const text = `${share} ${slice.label.toLowerCase()}`
          const id = slice.key
          return (
            <g key={id} {...bind(id, { title: slice.label, rows: [{ value: slice.value.toLocaleString('en-US'), label: `people · ${share}` }] })} style={{ outline: 'none' }}>
              <path
                d={roundedRight(segment.x, 0, segment.width, height, index === segments.length - 1 ? 4 : 0, index === 0 ? 4 : 0)}
                fill={FILL[slice.tone]}
                opacity={activeId && activeId !== id ? 0.6 : 1}
              />
              {labelFits(text, segment.width) ? (
                <text
                  x={segment.x + 8}
                  y={height / 2 + 4}
                  fontSize={12}
                  fontWeight={600}
                  fill={ON_FILL[slice.tone]}
                  pointerEvents="none"
                >
                  {text}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <Legend>
        {slices.map((slice) => (
          <LegendItem
            key={slice.key}
            color={FILL[slice.tone]}
            shape={LEGEND_SHAPE[slice.tone]}
            label={slice.label}
            value={`${slice.value.toLocaleString('en-US')} · ${formatPercent(slice.value / total)}`}
          />
        ))}
      </Legend>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}
