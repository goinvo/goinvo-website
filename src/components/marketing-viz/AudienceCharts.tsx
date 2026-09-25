'use client'

import { formatPercent } from '@/lib/marketing/viz/format'
import type { CoverageBar, ResearchStage, ShareSlice } from '@/lib/marketing/viz/briefViz'

import { BarList } from './BarList'
import { ChartFrame } from './ChartFrame'
import { FunnelChart } from './FunnelChart'
import { ShareBar } from './ShareBar'
import { VizScope } from './VizScope'

/**
 * The audience brief's charts. The page is a light, printed-feeling document,
 * so these render in the light scheme with the page's own paper colour behind
 * the 2px gaps.
 */
export function AudienceSegmentCharts({
  share,
  shareInsight,
  coverage,
  coverageNote,
  threshold,
  paper,
}: {
  share: ShareSlice[]
  shareInsight: string
  coverage: CoverageBar[]
  coverageNote: string
  threshold: number
  paper: string
}) {
  return (
    <VizScope scheme="light" style={{ ['--viz-surface' as string]: paper, display: 'grid', gap: 28, margin: '8px 0 24px' }}>
      <ChartFrame
        title="Who on the list could buy"
        insight={shareInsight}
        table={{ columns: ['Group', 'People', 'Share'], numeric: [1, 2], rows: share.map((slice) => [slice.label, slice.value, formatPercent(slice.value / Math.max(1, share.reduce((s, x) => s + x.value, 0)))]) }}
      >
        <ShareBar slices={share} />
      </ChartFrame>
      <ChartFrame
        title="Can the list support each target segment?"
        insight={coverageNote}
        table={{ columns: ['Segment', 'People', `At least ${threshold}?`], numeric: [1], rows: coverage.map((bar) => [bar.label, bar.value, bar.short ? 'No' : 'Yes']) }}
      >
        <BarList
          items={coverage.map((bar) => ({ key: bar.key, label: bar.label, value: bar.value, emphasis: bar.short, detail: bar.short ? 'below what a campaign needs' : 'enough to start' }))}
          target={{ value: threshold, label: `${threshold} needed` }}
        />
      </ChartFrame>
    </VizScope>
  )
}

export function ResearchFunnelChart({ stages, insight, paper }: { stages: ResearchStage[]; insight: string; paper: string }) {
  return (
    <VizScope scheme="light" style={{ ['--viz-surface' as string]: paper, margin: '8px 0 24px' }}>
      <ChartFrame
        title="How much of the research survives checking"
        insight={insight}
        table={{
          columns: ['Stage', 'Organisations', 'Of the stage before'],
          numeric: [1, 2],
          rows: stages.map((stage) => [stage.label, stage.count, stage.fromPrevious === null ? '—' : formatPercent(stage.fromPrevious)]),
        }}
      >
        <FunnelChart rows={stages} />
      </ChartFrame>
    </VizScope>
  )
}
