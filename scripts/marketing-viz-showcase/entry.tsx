import { useEffect, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

import { VizScope } from '@/components/marketing-viz/VizScope'
import { WeekGlance } from '@/components/marketing-viz/WeekGlance'
import { OutreachInsights } from '@/components/marketing-viz/OutreachInsights'
import { RunwayChart } from '@/components/marketing-viz/RunwayChart'
import { ContentCoverage } from '@/components/marketing-viz/ContentCoverage'
import { ChartFrame } from '@/components/marketing-viz/ChartFrame'
import { FunnelChart } from '@/components/marketing-viz/FunnelChart'
import { WeekWorkTable } from '@/sanity/components/marketing/WeekWorkTable'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { researchFunnel, researchInsight } from '@/lib/marketing/viz/briefViz'
import { formatPercent } from '@/lib/marketing/viz/format'
import { studioDay } from '@/lib/marketing/viz/outreachViz'
import type { VizScheme } from '@/lib/marketing/viz/tokens'

import { makeContacts, makeResearch, NOW, PLAN, RUNWAY } from './fixtures'

const DAY = 86_400_000
const contacts = makeContacts()
const research = makeResearch(contacts)
const weekStart = Date.parse('2026-09-21T00:00:00Z')
const counts = (from: number) =>
  summarizeOutreach(contacts as never, { from: new Date(from).toISOString(), to: new Date(from + 7 * DAY).toISOString(), now: NOW })
const followUps = contacts
  .filter((c) => c.followUpAt && ['contacted', 'responded', 'meeting', 'opportunity'].includes(String(c.status)))
  .filter((c) => Date.parse(c.followUpAt!) < NOW.getTime() + 8 * DAY)
  .map((c) => {
    const overdue = Date.parse(c.followUpAt!) < NOW.getTime()
    return { contactId: c._id, who: `${c.name} (${c.organization})`, due: overdue ? 'overdue' : 'due this week', overdue, dueDay: studioDay(c.followUpAt!) }
  })
const week = {
  ...PLAN,
  followUps,
  outreachStats: {
    thisWeek: counts(weekStart),
    lastWeek: counts(weekStart - 7 * DAY),
    weekly: Array.from({ length: 8 }, (_, i) => ({
      weekStart: new Date(weekStart - (7 - i) * 7 * DAY).toISOString().slice(0, 10),
      touches: counts(weekStart - (7 - i) * 7 * DAY).touches,
    })),
  },
  runwayStored: RUNWAY,
}
const WORK = [
  { id: 'w1', title: 'Warm-network call wave 2', kind: 'outreach', minutes: 60, owner: 'Ada', status: 'working', overdue: true, estimateSource: 'explicit' },
  { id: 'w2', title: 'Email the three Tidewell leads', kind: 'outreach', minutes: 30, owner: 'Cleo', status: 'queued', estimateSource: 'estimated' },
  { id: 'w3', title: 'Tighten the pre-mortem scorecard', kind: 'content', minutes: 45, owner: null, status: 'queued', estimateSource: 'estimated' },
  { id: 'w4', title: 'Publish the failure taxonomy?', kind: 'decision', minutes: 15, owner: 'Ben', status: 'needsHuman', estimateSource: 'explicit' },
  { id: 'w5', title: 'Price band for the facilitator kit', kind: 'decision', minutes: 15, owner: 'Dev', status: 'needsHuman', estimateSource: 'explicit' },
]
const CHANNELS = [
  { _id: 'li', key: 'linkedin', title: 'LinkedIn' },
  { _id: 'ig', key: 'instagram', title: 'Instagram' },
  { _id: 'nl', key: 'newsletter', title: 'Newsletter' },
  { _id: 'bl', key: 'blog', title: 'Blog' },
  { _id: 'bs', key: 'bluesky', title: 'Bluesky' },
]
const CALENDAR = [
  ['linkedin', '2026-09-25'], ['linkedin', '2026-09-29'], ['linkedin', '2026-10-01'], ['linkedin', '2026-10-06'], ['linkedin', '2026-10-13'],
  ['instagram', '2026-09-30'], ['instagram', '2026-10-07'], ['newsletter', '2026-10-02'], ['blog', '2026-09-28'], ['blog', '2026-10-09'],
].map(([channel, day], i) => ({ publishAt: `${day}T15:00:00Z`, status: i % 3 ? 'scheduled' : 'review', channel }))
const orgCount = new Set(contacts.map((c) => c.organization).filter(Boolean)).size
const researchStages = researchFunnel(orgCount, research)

function pageScheme(): VizScheme {
  const stamped = document.documentElement.getAttribute('data-theme')
  if (stamped === 'dark' || stamped === 'light') return stamped
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function useScheme(): VizScheme {
  const [scheme, setScheme] = useState<VizScheme>(pageScheme)
  useEffect(() => {
    const update = () => setScheme(pageScheme())
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener?.('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      media?.removeEventListener?.('change', update)
      observer.disconnect()
    }
  }, [])
  return scheme
}

function Scope({ children }: { children: ReactNode }) {
  const scheme = useScheme()
  return (
    <VizScope scheme={scheme} style={{ ['--viz-surface' as string]: 'var(--surface)', fontFamily: 'inherit' }}>
      {children}
    </VizScope>
  )
}

const mounts: Record<string, ReactNode> = {
  'chart-week': <WeekGlance data={week as never} now={NOW} />,
  'chart-work': <WeekWorkTable rows={WORK as never} />,
  'chart-outreach': <OutreachInsights contacts={contacts} now={NOW} />,
  'chart-research': (
    <ChartFrame
      title="How much of the research survives checking"
      insight={researchInsight(researchStages)}
      table={{
        columns: ['Stage', 'Organisations', 'Of the stage before'],
        numeric: [1, 2],
        rows: researchStages.map((s) => [s.label, s.count, s.fromPrevious === null ? '—' : formatPercent(s.fromPrevious)]),
      }}
    >
      <FunnelChart rows={researchStages} />
    </ChartFrame>
  ),
  'chart-runway': <RunwayChart stored={RUNWAY} now={NOW} />,
  'chart-coverage': <ContentCoverage items={CALENDAR} channels={CHANNELS} now={NOW} />,
}

for (const [id, node] of Object.entries(mounts)) {
  const element = document.getElementById(id)
  if (element) createRoot(element).render(<Scope>{node}</Scope>)
}
