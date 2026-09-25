'use client'

import { useMemo } from 'react'

import { channelWeekGrid, coverageGridInsight, type CoverageChannel, type CoverageItem } from '@/lib/marketing/viz/contentViz'
import { formatDayKey } from '@/lib/marketing/viz/outreachViz'

import { ChartFrame } from './ChartFrame'
import { HeatGrid } from './HeatGrid'

/** Channel × week of ready posts — the Overview's content coverage, as one grid. */
export function ContentCoverage({ items, channels, now = new Date(), weeks = 5 }: { items: CoverageItem[]; channels: CoverageChannel[]; now?: Date; weeks?: number }) {
  const grid = useMemo(() => channelWeekGrid(items, channels, now, weeks), [items, channels, now, weeks])
  return (
    <ChartFrame
      title="Ready to publish, by channel and week"
      insight={coverageGridInsight(grid, formatDayKey)}
      table={{
        columns: ['Channel', ...grid.columns.map((column) => column.label)],
        numeric: grid.columns.map((_, index) => index + 1),
        rows: grid.rows.map((row) => [row.label, ...grid.columns.map((column) => grid.cells[row.key]?.[column.key] ?? 0)]),
      }}
    >
      <HeatGrid rows={grid.rows} columns={grid.columns} value={(row, column) => grid.cells[row]?.[column] ?? 0} unit="posts" />
    </ChartFrame>
  )
}
