'use client'

import { useMemo } from 'react'

import type { StoredPosture } from '@/lib/marketing/runway'
import { formatStudioDate } from '@/lib/marketing/viz/outreachViz'
import { buildRunwayTimeline, describeRunwayTimeline } from '@/lib/marketing/viz/runwayTimeline'

import { ChartFrame } from './ChartFrame'
import { RunwayTimeline } from './RunwayTimeline'

/**
 * "How long the money lasts", the same chart wherever the runway is asked
 * about — This week, the Dashboard nudge and Settings — so the date reads the
 * same way in all three. Nothing is drawn without a recorded date: an assumed
 * posture has no timeline, only the question.
 */
export function RunwayChart({ stored, now = new Date(), title = 'How long the money lasts' }: { stored: StoredPosture; now?: Date; title?: string }) {
  const timeline = useMemo(() => buildRunwayTimeline(stored, now), [stored, now])
  if (!timeline.endsAt || timeline.months === null || timeline.months <= 0) return null
  const formatDay = (iso: string) => formatStudioDate(iso, now)
  return (
    <ChartFrame
      title={title}
      insight={describeRunwayTimeline(timeline, formatDay)}
      table={{
        columns: ['What', 'From', 'To'],
        rows: [
          ...timeline.segments.map((segment) => [segment.title, formatDay(segment.from), formatDay(segment.to)]),
          ...timeline.commitments.map((commitment) => [
            `Signed: ${commitment.label}${commitment.monthsAdded ? ` (+${commitment.monthsAdded} mo)` : ''}`,
            formatDay(commitment.at),
            '',
          ]),
        ],
      }}
    >
      <RunwayTimeline timeline={timeline} formatDay={formatDay} />
    </ChartFrame>
  )
}
