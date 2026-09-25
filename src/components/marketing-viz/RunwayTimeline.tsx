'use client'

import type { RunwayTimeline as Timeline } from '@/lib/marketing/viz/runwayTimeline'
import { linear } from '@/lib/marketing/viz/scale'

import { roundedRight } from './BudgetMeter'
import { Legend, LegendItem } from './ChartFrame'
import { ChartTooltip, useChartTooltip } from './Tooltip'
import { useElementWidth } from './useElementWidth'

const ICON: Record<string, string> = { good: '✓', warning: '!', serious: '!', critical: '×' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Today on a calendar axis, the runway ahead of it split into the postures it
 * will pass through, and the day it ends. Each span wears the status colour of
 * the money state it represents — with the posture's name, since a status
 * colour never carries meaning alone. Signed work that bought time is marked
 * on the left, where it happened.
 */
export function RunwayTimeline({ timeline, formatDay }: { timeline: Timeline; formatDay: (iso: string) => string }) {
  const { ref, width } = useElementWidth<HTMLDivElement>(620)
  const { hover, bind, activeId } = useChartTooltip()
  const t0 = Date.parse(timeline.start)
  const t1 = Date.parse(timeline.end)
  const x = linear([t0, t1], [0, width])
  const todayX = x(Date.parse(timeline.today))
  const labelRow = 14
  const barY = 24
  const barH = 16
  const axisY = barY + barH + 18
  const height = axisY + 22

  // Month ticks along the axis.
  const ticks: { x: number; label: string }[] = []
  const first = new Date(t0)
  for (
    let d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
    d.getTime() <= t1;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  ) {
    const month = d.getUTCMonth()
    ticks.push({ x: x(d.getTime()), label: month === 0 ? `${MONTHS[month]} ${d.getUTCFullYear()}` : MONTHS[month] })
  }
  const minTickGap = 34
  const shownTicks = ticks.filter(
    (tick, index) => index === 0 || tick.x - ticks[index - 1].x >= minTickGap || index % 2 === 0,
  )

  const endX = timeline.endsAt ? x(Date.parse(timeline.endsAt)) : null

  return (
    <div ref={ref} data-viz-frame style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Runway from today to ${timeline.endsAt ?? 'unknown'}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* the timeline itself */}
        <line x1={0} x2={width} y1={barY + barH / 2} y2={barY + barH / 2} stroke="var(--viz-grid)" strokeWidth={2} />
        {timeline.segments.map((segment, index) => {
          const sx = x(Date.parse(segment.from))
          const ex = x(Date.parse(segment.to))
          const w = Math.max(2, ex - sx - (index < timeline.segments.length - 1 ? 2 : 0))
          const id = `seg-${segment.posture}`
          const fits = w > segment.title.length * 7 + 22
          return (
            <g
              key={id}
              {...bind(id, {
                title: segment.title,
                rows: [
                  {
                    value: `${formatDay(segment.from)} → ${formatDay(segment.to)}`,
                    label: '',
                    swatch: `var(--viz-${segment.level})`,
                  },
                ],
              })}
              style={{ outline: 'none' }}
            >
              <path
                d={roundedRight(sx, barY, w, barH, index === timeline.segments.length - 1 ? 4 : 0, 0)}
                fill={`var(--viz-${segment.level})`}
                opacity={activeId && activeId !== id ? 0.6 : 1}
              />
              {fits ? (
                <g pointerEvents="none">
                  <circle cx={sx + 6} cy={labelRow - 4} r={6} fill={`var(--viz-${segment.level})`} />
                  <text
                    x={sx + 6}
                    y={labelRow - 0.5}
                    fontSize={9}
                    fontWeight={800}
                    textAnchor="middle"
                    fill={segment.level === 'warning' ? '#1d1b1a' : '#ffffff'}
                  >
                    {ICON[segment.level]}
                  </text>
                  <text
                    x={sx + 16}
                    y={labelRow}
                    fontSize={11}
                    fill="var(--viz-ink)"
                    fontWeight={index === 0 ? 650 : 400}
                  >
                    {segment.title}
                  </text>
                </g>
              ) : null}
              <rect x={sx} y={0} width={w} height={barY + barH + 4} fill="transparent" />
            </g>
          )
        })}
        {/* signed work, where it happened */}
        {timeline.commitments.map((commitment, index) => {
          const cx = x(Date.parse(commitment.at))
          if (cx < 0 || cx > width) return null
          const id = `c${index}`
          return (
            <g
              key={id}
              {...bind(id, {
                title: `Signed ${formatDay(commitment.at)}`,
                rows: [
                  {
                    value: commitment.monthsAdded ? `+${commitment.monthsAdded} mo` : 'signed',
                    label: commitment.label,
                  },
                ],
              })}
              style={{ outline: 'none' }}
            >
              <rect
                x={cx - 5}
                y={barY + barH / 2 - 5}
                width={10}
                height={10}
                transform={`rotate(45 ${cx} ${barY + barH / 2})`}
                fill="var(--viz-series-1)"
                stroke="var(--viz-surface)"
                strokeWidth={2}
              />
              <rect x={cx - 12} y={barY - 6} width={24} height={barH + 12} fill="transparent" />
            </g>
          )
        })}
        {/* the end of the runway */}
        {endX !== null && endX > todayX ? (
          <g>
            <line x1={endX} x2={endX} y1={barY - 8} y2={axisY - 4} stroke="var(--viz-critical)" strokeWidth={2} />
            <text
              x={endX > width - 150 ? endX - 6 : endX + 6}
              y={axisY - 5}
              fontSize={11}
              textAnchor={endX > width - 150 ? 'end' : 'start'}
              fill="var(--viz-ink)"
            >
              Runway ends {formatDay(timeline.endsAt as string)}
            </text>
          </g>
        ) : null}
        {/* today */}
        <line x1={todayX} x2={todayX} y1={barY - 6} y2={axisY} stroke="var(--viz-ink)" strokeWidth={2} />
        <text x={todayX} y={axisY + 14} fontSize={11} fontWeight={650} textAnchor="middle" fill="var(--viz-ink)">
          Today
        </text>
        {/* month axis */}
        <line x1={0} x2={width} y1={axisY} y2={axisY} stroke="var(--viz-baseline)" strokeWidth={1} />
        {shownTicks.map((tick) =>
          Math.abs(tick.x - todayX) < 26 ? null : (
            <g key={tick.label + tick.x}>
              <line x1={tick.x} x2={tick.x} y1={axisY} y2={axisY + 4} stroke="var(--viz-baseline)" />
              <text x={tick.x} y={axisY + 14} fontSize={11} textAnchor="middle" fill="var(--viz-muted)">
                {tick.label}
              </text>
            </g>
          ),
        )}
      </svg>
      <Legend>
        {timeline.commitments.length ? (
          <LegendItem shape="diamond" color="var(--viz-series-1)" label="Signed work that bought time" />
        ) : null}
        <LegendItem shape="line" color="var(--viz-critical)" label="Last day we can pay for" />
      </Legend>
      <ChartTooltip hover={hover} frameWidth={width} />
    </div>
  )
}
