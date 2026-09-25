'use client'

import { useMemo } from 'react'

import { formatPercent } from '@/lib/marketing/viz/format'
import {
  activityCalendar,
  activityInsight,
  byPersonInsight,
  dedupeDrafts,
  funnelInsight,
  pipelineFunnel,
  touchesByPerson,
  warmthGrid,
  warmthInsight,
  type VizContact,
} from '@/lib/marketing/viz/outreachViz'

import { ActivityCalendar } from './ActivityCalendar'
import { BarList } from './BarList'
import { ChartFrame } from './ChartFrame'
import { FunnelChart } from './FunnelChart'
import { HeatGrid } from './HeatGrid'

/**
 * Three questions about the outreach list, each answered by one chart and one
 * sentence: where people drop out, where the network is actually warm, and
 * whether calling is a habit yet. All three are counted from the contact
 * records and their call logs — nothing extra to keep up to date.
 */
export function OutreachInsights({
  contacts,
  now = new Date(),
  weeks = 12,
}: {
  contacts: VizContact[]
  now?: Date
  weeks?: number
}) {
  const list = useMemo(() => dedupeDrafts(contacts), [contacts])
  const funnel = useMemo(() => pipelineFunnel(list), [list])
  const grid = useMemo(() => warmthGrid(list), [list])
  const activity = useMemo(() => activityCalendar(list, now, weeks), [list, now, weeks])
  const people = useMemo(() => touchesByPerson(list, now, weeks * 7), [list, now, weeks])
  return (
    <section aria-label="Outreach at a glance" style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 22 }}>
        <ChartFrame
          title="Where the pipeline leaks"
          insight={funnelInsight(funnel)}
          table={{
            columns: ['Stage', 'Reached it', 'Of the stage before'],
            numeric: [1, 2],
            rows: funnel.map((stage) => [
              stage.label,
              stage.count,
              stage.fromPrevious === null ? '—' : formatPercent(stage.fromPrevious),
            ]),
          }}
        >
          <FunnelChart rows={funnel} />
        </ChartFrame>
        <ChartFrame
          title="Where the network is warm"
          insight={warmthInsight(grid)}
          table={{
            columns: ['Segment', ...grid.columns.map((column) => column.label), 'Total'],
            numeric: grid.columns.map((_, index) => index + 1).concat(grid.columns.length + 1),
            rows: grid.rows.map((row) => {
              const cells = grid.columns.map((column) => grid.cells[row.key]?.[column.key] ?? 0)
              return [row.label, ...cells, cells.reduce((a, b) => a + b, 0)]
            }),
          }}
        >
          <HeatGrid
            rows={grid.rows}
            columns={grid.columns}
            value={(row, column) => grid.cells[row]?.[column] ?? 0}
            highlightRow={grid.warmest}
            unit="people"
          />
        </ChartFrame>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', minWidth: 0 }}>
          <ChartFrame
            title="The calling habit"
            insight={activityInsight(activity)}
            table={{
              columns: ['Week', 'Touches'],
              numeric: [1],
              rows: activity.weekly.map((week) => [week.label, week.value]),
            }}
          >
            <ActivityCalendar days={activity.days} weeks={activity.weeks} monthLabels={activity.monthLabels} />
          </ChartFrame>
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <ChartFrame
            title="Who is doing the calling"
            insight={byPersonInsight(people)}
            table={{
              columns: ['Who', 'Touches', 'Of which calls', 'Share'],
              numeric: [1, 2, 3],
              rows: people.map((person) => [person.name, person.touches, person.calls, formatPercent(person.share)]),
            }}
          >
            <BarList
              items={people.map((person, index) => ({
                key: person.name,
                label: person.name,
                value: person.touches,
                display: `${person.touches} · ${formatPercent(person.share)}`,
                detail: `${person.calls} of them calls`,
                emphasis: index === 0 && person.share >= 0.5,
              }))}
            />
          </ChartFrame>
        </div>
      </div>
    </section>
  )
}
