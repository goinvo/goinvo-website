'use client'

import { linear } from '@/lib/marketing/viz/scale'

import { ChartTooltip, useChartTooltip } from './Tooltip'
import { Legend, LegendItem } from './ChartFrame'
import { useElementWidth } from './useElementWidth'

export type DayStripEvent = {
  id: string
  /** YYYY-MM-DD. */
  date: string
  title: string
  detail?: string
  /** Past due: drawn in the status colour for it, and named in the legend. */
  overdue?: boolean
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Dated things on a day axis around today: what is late sits left of the line,
 * what is coming sits right. Several on one day stack upward, so a pile-up on
 * Monday is visible as a pile-up. Anything older than the window is gathered
 * at the left edge with a count, rather than dropped.
 */
export function DayStrip({
  events,
  today,
  daysBefore = 14,
  daysAfter = 14,
  formatDay,
}: {
  events: DayStripEvent[]
  today: string
  daysBefore?: number
  daysAfter?: number
  formatDay: (iso: string) => string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const { hover, bind, activeId } = useChartTooltip()
  const dayMs = 86_400_000
  const t = Date.parse(`${today}T12:00:00Z`)
  const start = t - daysBefore * dayMs
  const end = t + daysAfter * dayMs
  const pad = 22
  const x = linear([start, end], [pad, width - 8])
  const dot = 10
  const byDay = new Map<string, DayStripEvent[]>()
  let olderCount = 0
  for (const event of events) {
    const at = Date.parse(`${event.date}T12:00:00Z`)
    if (Number.isNaN(at)) continue
    const key = at < start ? '__older' : at > end ? '__later' : event.date
    if (key === '__older') olderCount += 1
    const list = byDay.get(key) ?? []
    list.push(event)
    byDay.set(key, list)
  }
  const tallest = Math.max(1, ...[...byDay.values()].map((list) => list.length))
  const stackHeight = Math.min(tallest, 6) * (dot + 3)
  const baseY = 10 + stackHeight
  const axisY = baseY + 8
  const height = axisY + 30

  const ticks: { x: number; label: string; sub: string }[] = []
  for (let d = start; d <= end; d += dayMs) {
    const date = new Date(d)
    if (date.getUTCDay() !== 1) continue
    ticks.push({
      x: x(d),
      label: WEEKDAY[1],
      sub: `${date.getUTCDate()} ${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}`,
    })
  }

  const todayX = x(t)
  const anyOverdue = events.some((event) => event.overdue)

  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${events.length} dated follow-ups around today`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <rect
          x={pad}
          y={4}
          width={Math.max(0, todayX - pad)}
          height={axisY - 4}
          fill="var(--viz-grid)"
          opacity={0.35}
        />
        {[...byDay.entries()].map(([key, list]) => {
          const cx = key === '__older' ? pad - 12 : key === '__later' ? width - 4 : x(Date.parse(`${key}T12:00:00Z`))
          return list.slice(0, 6).map((event, index) => {
            const cy = baseY - index * (dot + 3) - dot / 2
            const id = event.id
            const extra = index === 5 && list.length > 6 ? ` (+${list.length - 6} more that day)` : ''
            return (
              <g
                key={id}
                {...bind(id, {
                  title: event.title,
                  rows: [{ value: formatDay(event.date), label: `${event.detail ?? ''}${extra}` }],
                })}
                style={{ outline: 'none' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={dot / 2}
                  fill={event.overdue ? 'var(--viz-serious)' : 'var(--viz-series-1)'}
                  stroke={activeId === id ? 'var(--viz-ink)' : 'var(--viz-surface)'}
                  strokeWidth={2}
                />
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
              </g>
            )
          })
        })}
        {olderCount ? (
          <text x={pad - 12} y={axisY + 26} fontSize={10} textAnchor="middle" fill="var(--viz-muted)">
            older
          </text>
        ) : null}
        <line x1={pad} x2={width - 8} y1={axisY} y2={axisY} stroke="var(--viz-baseline)" strokeWidth={1} />
        {ticks.map((tick) => (
          <g key={tick.sub}>
            <line x1={tick.x} x2={tick.x} y1={axisY} y2={axisY + 4} stroke="var(--viz-baseline)" />
            {Math.abs(tick.x - todayX) > 24 ? (
              <text x={tick.x} y={axisY + 16} fontSize={11} textAnchor="middle" fill="var(--viz-muted)">
                {tick.sub}
              </text>
            ) : null}
          </g>
        ))}
        <line x1={todayX} x2={todayX} y1={2} y2={axisY + 4} stroke="var(--viz-ink)" strokeWidth={2} />
        <text x={todayX} y={axisY + 16} fontSize={11} fontWeight={650} textAnchor="middle" fill="var(--viz-ink)">
          Today
        </text>
      </svg>
      <Legend>
        {anyOverdue ? <LegendItem shape="dot" color="var(--viz-serious)" label="Overdue" /> : null}
        <LegendItem shape="dot" color="var(--viz-series-1)" label="Due" />
      </Legend>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}
