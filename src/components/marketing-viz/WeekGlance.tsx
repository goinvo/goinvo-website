'use client'

import { useMemo } from 'react'

import { getFinancialPosture } from '@/lib/marketing/financialPosture'
import { formatMonths, type StoredPosture } from '@/lib/marketing/runway'
import { formatMinutes, formatRunningDelta } from '@/lib/marketing/viz/format'
import { formatDayKey, formatStudioDate, studioDay } from '@/lib/marketing/viz/outreachViz'
import { buildRunwayTimeline, POSTURE_LEVEL } from '@/lib/marketing/viz/runwayTimeline'
import { budgetInsight, budgetParts, type GlancePlan } from '@/lib/marketing/viz/weekGlance'

import { BudgetMeter } from './BudgetMeter'
import { ChartFrame } from './ChartFrame'
import { DayStrip } from './DayStrip'
import { RunwayChart } from './RunwayChart'
import { StatTile, type StatusLevel } from './StatTile'

type PulseCounts = {
  touches: number
  people: number
  calls: number
  emails: number
  replies: number
  meetings: number
  opportunities: number
  won: number
}

export type WeekGlanceData = GlancePlan & {
  weekStart: string
  followUps: Array<{
    contactId: string
    who: string
    due: string
    overdue: boolean
    dueDay?: string | null
    temperature?: string
  }>
  outreachStats?: {
    thisWeek: PulseCounts
    lastWeek: PulseCounts
    weekly: Array<{ weekStart: string; touches: number }>
  } | null
  runwayStored?: StoredPosture | null
}

/**
 * The top of This week: where the hours go, four figures that say whether
 * outreach is happening, and the two things with a date on them — who is owed
 * a call, and how long the money lasts. Everything below it is the list; this
 * is the reason to read the list.
 */
export function WeekGlance({ data, now = new Date() }: { data: WeekGlanceData; now?: Date }) {
  const parts = useMemo(() => budgetParts(data), [data])
  const planned = parts.reduce((sum, part) => sum + part.value, 0)
  const stats = data.outreachStats ?? null
  const timeline = useMemo(
    () => (data.runwayStored ? buildRunwayTimeline(data.runwayStored, now) : null),
    [data.runwayStored, now],
  )
  const today = studioDay(now) as string
  const formatDay = (iso: string) => formatStudioDate(iso, now)

  const overdue = data.followUps.filter((row) => row.overdue).length
  const followStatus: { level: StatusLevel; label: string } = overdue
    ? {
        level: overdue >= 3 ? 'critical' : 'serious',
        label: `${overdue} overdue`,
      }
    : {
        level: 'good',
        label: data.followUps.length ? 'none late' : 'none owed',
      }

  const posture = timeline ? getFinancialPosture(timeline.current) : null
  const events = data.followUps
    .filter((row) => row.dueDay)
    .map((row) => ({
      id: row.contactId,
      date: row.dueDay as string,
      title: row.who,
      detail: row.due,
      overdue: row.overdue,
    }))

  const moves = stats ? stats.thisWeek.replies + stats.thisWeek.meetings + stats.thisWeek.opportunities : 0
  const lastMoves = stats ? stats.lastWeek.replies + stats.lastWeek.meetings + stats.lastWeek.opportunities : 0

  return (
    <section aria-label="The week at a glance" style={{ display: 'grid', gap: 18 }}>
      <ChartFrame
        title="Where this week’s hours go"
        insight={budgetInsight(data)}
        table={{
          columns: ['For', 'Time', 'What'],
          numeric: [1],
          rows: [
            ...parts
              .filter((part) => part.value > 0)
              .map((part) => [part.label, formatMinutes(part.value), part.detail]),
            ['Spare', formatMinutes(Math.max(0, data.budgetMinutes - planned)), ''],
          ],
        }}
      >
        <BudgetMeter
          budget={data.budgetMinutes}
          parts={parts}
          format={formatMinutes}
          budgetLabel={`${formatMinutes(data.budgetMinutes)} budget`}
        />
      </ChartFrame>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
        }}
      >
        {stats ? (
          <StatTile
            label="Touches this week"
            value={String(stats.thisWeek.touches)}
            delta={formatRunningDelta(stats.thisWeek.touches, stats.lastWeek.touches)}
            deltaTone={stats.thisWeek.touches > stats.lastWeek.touches ? 'good' : 'neutral'}
            trend={stats.weekly.map((week) => ({
              label: `Week of ${formatDayKey(week.weekStart)}`,
              value: week.touches,
            }))}
            trendUnit=" touches"
            detail={`${stats.thisWeek.calls} calls · ${stats.thisWeek.emails} emails · ${stats.thisWeek.people} people`}
          />
        ) : null}
        {stats ? (
          <StatTile
            label="Conversations moved forward"
            value={String(moves)}
            delta={formatRunningDelta(moves, lastMoves)}
            deltaTone={moves > lastMoves ? 'good' : 'neutral'}
            detail={
              moves
                ? [
                    stats.thisWeek.replies && `${stats.thisWeek.replies} replied`,
                    stats.thisWeek.meetings && `${stats.thisWeek.meetings} booked a meeting`,
                    stats.thisWeek.opportunities && `${stats.thisWeek.opportunities} scoped work`,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'A reply, a meeting or scoped work counts; a voicemail does not.'
            }
          />
        ) : null}
        <StatTile
          label="Follow-ups owed"
          value={String(data.followUps.length)}
          status={followStatus.level}
          statusLabel={followStatus.label}
          detail={
            data.followUps.length
              ? `${formatMinutes(data.reserved?.minutes ?? 0)} held back for them`
              : 'Nobody is waiting on us.'
          }
        />
        {timeline && timeline.months !== null ? (
          <StatTile
            label="Certain runway"
            value={timeline.months > 0 ? formatMonths(timeline.months).replace(/ months?| weeks?/, '') : '0'}
            unit={timeline.months > 0 ? formatMonths(timeline.months).replace(/^[\d.]+ /, '') : 'months'}
            status={POSTURE_LEVEL[timeline.current]}
            statusLabel={posture?.title}
            detail={timeline.endsAt ? `to ${formatDay(timeline.endsAt)}` : undefined}
          />
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18,
        }}
      >
        {events.length ? (
          <ChartFrame
            title="Who is owed a call, and when"
            insight={
              overdue
                ? `${overdue} of ${events.length} are late — the dots left of today. Start there.`
                : `${events.length} due in the next week; none late yet.`
            }
            table={{
              columns: ['Who', 'When'],
              rows: events.map((event) => [event.title, event.detail ?? formatDay(event.date)]),
            }}
          >
            <DayStrip events={events} today={today} daysBefore={10} daysAfter={10} formatDay={formatDay} />
          </ChartFrame>
        ) : null}
        {data.runwayStored ? <RunwayChart stored={data.runwayStored} now={now} /> : null}
      </div>
    </section>
  )
}
