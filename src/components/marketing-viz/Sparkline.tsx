'use client'

import { linear } from '@/lib/marketing/viz/scale'

import { useChartTooltip, ChartTooltip } from './Tooltip'

export type SparkPoint = { label: string; value: number }

/**
 * A 12-point trend under a figure. The history is the de-emphasis hue; only
 * the current period wears the accent, as an end dot with a surface ring — the
 * number above says the value, the line says whether it is unusual.
 */
export function Sparkline({
  points,
  width = 132,
  height = 32,
  unit = '',
  accent = 'var(--viz-series-1)',
}: {
  points: SparkPoint[]
  width?: number
  height?: number
  unit?: string
  accent?: string
}) {
  const { hover, bind, activeId } = useChartTooltip()
  if (points.length < 2) return null
  const pad = 5
  const max = Math.max(1, ...points.map((p) => p.value))
  const x = linear([0, points.length - 1], [pad, width - pad])
  const y = linear([0, max], [height - pad, pad])
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`
  const last = points[points.length - 1]
  const band = (width - pad * 2) / (points.length - 1)
  return (
    <span data-viz-frame style={{ position: 'relative', display: 'inline-block', width, height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${points.map((p) => `${p.label} ${p.value}${unit}`).join(', ')}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--viz-grid)" strokeWidth={1} />
        <path d={area} fill={accent} opacity={0.1} />
        <path
          d={path}
          fill="none"
          stroke="var(--viz-deemphasis)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          const id = `p${i}`
          const active = activeId === id
          return (
            <g key={id}>
              {active ? (
                <circle
                  cx={x(i)}
                  cy={y(p.value)}
                  r={4}
                  fill="var(--viz-secondary)"
                  stroke="var(--viz-surface)"
                  strokeWidth={2}
                />
              ) : null}
              <rect
                x={x(i) - band / 2}
                y={0}
                width={band}
                height={height}
                fill="transparent"
                style={{ outline: 'none', cursor: 'default' }}
                {...bind(id, { title: p.label, rows: [{ value: `${p.value}${unit}`, label: '' }] })}
              />
            </g>
          )
        })}
        <circle
          cx={x(points.length - 1)}
          cy={y(last.value)}
          r={4}
          fill={accent}
          stroke="var(--viz-surface)"
          strokeWidth={2}
          pointerEvents="none"
        />
      </svg>
      <ChartTooltip hover={hover} frameWidth={Math.max(width, 220)} />
    </span>
  )
}
