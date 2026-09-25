'use client'

import { sequentialStep } from '@/lib/marketing/viz/tokens'
import { linear } from '@/lib/marketing/viz/scale'

import { roundedRight } from './BudgetMeter'
import { ChartTooltip, useChartTooltip } from './Tooltip'
import { ScaleLegend } from './HeatGrid'
import { useElementWidth } from './useElementWidth'

export type CalendarDay = {
  /** YYYY-MM-DD in the studio's time zone. */
  date: string
  /** Column: 0 = oldest week shown. */
  week: number
  /** Row: 0 = Monday. */
  weekday: number
  count: number
  /** Days after today are drawn as empty outlines, never as zero. */
  future?: boolean
  label: string
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Logged touches per day, a week per column, Monday on top — with the two
 * marginal totals that answer the questions the grid raises: how each WEEK
 * went (columns along the top; the current week in the accent) and which
 * WEEKDAYS the habit lives on (bars down the right).
 */
export function ActivityCalendar({
  days,
  weeks,
  monthLabels,
  unit = 'touches',
}: {
  days: CalendarDay[]
  weeks: number
  /** Column index where a month starts, with its short name. */
  monthLabels: { week: number; label: string }[]
  unit?: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(620)
  const { hover, bind, activeId } = useChartTooltip()
  const singular = unit.replace(/es$|s$/, '')
  const labelWidth = 32
  const gap = 3
  const marginRight = Math.min(150, Math.max(96, width * 0.2))
  const cell = Math.max(
    10,
    Math.min(26, Math.floor((width - labelWidth - marginRight - 12 - gap * (weeks - 1)) / Math.max(1, weeks))),
  )
  const gridWidth = weeks * cell + (weeks - 1) * gap
  const histHeight = 40
  const monthRow = 14
  const top = monthRow + histHeight + 8
  const gridHeight = 7 * cell + 6 * gap
  const height = top + gridHeight
  const max = Math.max(1, ...days.map((day) => day.count))

  const weekTotals = Array.from({ length: weeks }, (_, week) =>
    days.filter((day) => day.week === week && !day.future).reduce((sum, day) => sum + day.count, 0),
  )
  const weekdayTotals = Array.from({ length: 7 }, (_, weekday) =>
    days.filter((day) => day.weekday === weekday).reduce((sum, day) => sum + day.count, 0),
  )
  const hist = linear([0, Math.max(1, ...weekTotals)], [0, histHeight])
  const rightX = labelWidth + gridWidth + 12
  const barMax = marginRight - 34
  const side = linear([0, Math.max(1, ...weekdayTotals)], [0, barMax])
  const colX = (week: number) => labelWidth + week * (cell + gap)
  const rowY = (weekday: number) => top + weekday * (cell + gap)

  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={Math.min(width, rightX + marginRight)}
        height={height}
        role="img"
        aria-label={`${unit} per day over ${weeks} weeks`}
        style={{ display: 'block' }}
      >
        {monthLabels.map((month) => (
          <text
            key={`${month.week}-${month.label}`}
            x={colX(month.week)}
            y={11}
            fontSize={11}
            fill="var(--viz-secondary)"
          >
            {month.label}
          </text>
        ))}
        {/* weekly totals: history recedes, this week wears the accent */}
        <line
          x1={labelWidth}
          x2={labelWidth + gridWidth}
          y1={monthRow + histHeight + 2}
          y2={monthRow + histHeight + 2}
          stroke="var(--viz-baseline)"
        />
        {weekTotals.map((total, week) => {
          const h = total ? Math.max(2, hist(total)) : 0
          const id = `w${week}`
          const current = week === weeks - 1
          const firstDay = days.find((day) => day.week === week)
          return (
            <g
              key={id}
              {...bind(id, {
                title: `Week of ${firstDay?.label ?? ''}`,
                rows: [{ value: String(total), label: `${total === 1 ? singular : unit}${current ? ' so far' : ''}` }],
              })}
              style={{ outline: 'none' }}
            >
              <rect x={colX(week)} y={monthRow} width={cell} height={histHeight + 2} fill="transparent" />
              {h ? (
                <path
                  d={roundedTop(colX(week), monthRow + histHeight + 2 - h, cell, h, 3)}
                  fill={current ? 'var(--viz-series-1)' : 'var(--viz-deemphasis)'}
                  opacity={activeId === id ? 0.75 : 1}
                />
              ) : null}
            </g>
          )
        })}
        {WEEKDAY_SHORT.map((label, row) =>
          row % 2 === 0 ? (
            <text key={label} x={0} y={rowY(row) + cell / 2 + 4} fontSize={10} fill="var(--viz-muted)">
              {label}
            </text>
          ) : null,
        )}
        {days.map((day) => {
          const x = colX(day.week)
          const y = rowY(day.weekday)
          if (day.future) {
            return (
              <rect
                key={day.date}
                x={x + 0.5}
                y={y + 0.5}
                width={cell - 1}
                height={cell - 1}
                rx={2}
                fill="none"
                stroke="var(--viz-grid)"
              />
            )
          }
          const step = sequentialStep(day.count / max) + 1
          const id = day.date
          return (
            <rect
              key={day.date}
              x={x}
              y={y}
              width={cell}
              height={cell}
              rx={2}
              fill={`var(--viz-seq-${step})`}
              stroke={activeId === id ? 'var(--viz-ink)' : step === 1 ? 'var(--viz-grid)' : 'none'}
              strokeWidth={activeId === id ? 1.5 : 1}
              style={{ outline: 'none' }}
              {...bind(id, {
                title: day.label,
                rows: [{ value: String(day.count), label: day.count === 1 ? singular : unit }],
              })}
            />
          )
        })}
        {/* weekday totals: where the habit lives */}
        <line x1={rightX} x2={rightX} y1={top} y2={top + gridHeight} stroke="var(--viz-baseline)" />
        {weekdayTotals.map((total, weekday) => {
          const w = total ? Math.max(2, side(total)) : 0
          const id = `d${weekday}`
          const barH = Math.max(6, Math.min(12, cell - 4))
          const y = rowY(weekday) + (cell - barH) / 2
          return (
            <g
              key={id}
              {...bind(id, {
                title: `${WEEKDAY_SHORT[weekday]}s`,
                rows: [{ value: String(total), label: `${unit} over ${weeks} weeks` }],
              })}
              style={{ outline: 'none' }}
            >
              <rect x={rightX} y={rowY(weekday)} width={marginRight} height={cell} fill="transparent" />
              {w ? (
                <path
                  d={roundedRight(rightX, y, w, barH, 3, 0)}
                  fill="var(--viz-series-1)"
                  opacity={activeId === id ? 0.75 : 1}
                />
              ) : null}
              <text x={rightX + w + 5} y={y + barH / 2 + 4} fontSize={11} fill="var(--viz-secondary)">
                {total}
              </text>
            </g>
          )
        })}
      </svg>
      <ScaleLegend max={max} unit={`${unit} a day`} />
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}
