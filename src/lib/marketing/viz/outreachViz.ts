/**
 * Outreach, read as shapes: where the pipeline leaks, where the network is
 * warm, and what the calling habit actually looks like.
 *
 * Every number here is counted from records people already keep — contact
 * status, warmth, segment, and the append-only call log — so none of it needs
 * anybody to update a dashboard. Pure: `now` is passed in, the studio's day is
 * New York's.
 */
import { OUTREACH_SEGMENT_OPTIONS, OUTREACH_WARMTH_OPTIONS } from '../outreachEnums'

export type VizInteraction = {
  at?: string | null
  by?: string | null
  channel?: string | null
  statusAfter?: string | null
}

export type VizContact = {
  _id: string
  name?: string | null
  organization?: string | null
  status?: string | null
  warmth?: string | null
  segment?: string | null
  researchSuggestedSegment?: string | null
  followUpAt?: string | null
  interactions?: VizInteraction[] | null
}

const STUDIO_TIME_ZONE = 'America/New_York'
const DAY = 86_400_000

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The studio's calendar day (YYYY-MM-DD) for an instant. */
export function studioDay(at: Date | number | string): string | null {
  const ms = typeof at === 'string' ? Date.parse(at) : typeof at === 'number' ? at : at.getTime()
  if (!Number.isFinite(ms)) return null
  return dayFormatter.format(new Date(ms))
}

/** Monday (0) … Sunday (6) for a YYYY-MM-DD key. */
export function weekdayOf(dayKey: string): number {
  return (new Date(`${dayKey}T12:00:00Z`).getUTCDay() + 6) % 7
}

export function addDays(dayKey: string, days: number): string {
  return new Date(Date.parse(`${dayKey}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10)
}

/**
 * One record per contact. The Studio can hold a draft beside the published
 * contact; the published one is what every other surface (This week, Slack)
 * counts, so it wins, and a contact that only exists as a draft still counts.
 */
export function dedupeDrafts<T extends { _id: string }>(contacts: T[]): T[] {
  const published = new Set((contacts || []).filter((c) => c && !c._id.startsWith('drafts.')).map((c) => c._id))
  return (contacts || []).filter(
    (c) => c && c._id && (!c._id.startsWith('drafts.') || !published.has(c._id.slice('drafts.'.length))),
  )
}

// ---- The funnel ------------------------------------------------------------

/** How far along a status is. Researching someone is not progress with them. */
const REACHED_RANK: Record<string, number> = {
  contacted: 1,
  responded: 2,
  meeting: 3,
  opportunity: 4,
  // "Lost — opportunity did not close": it got as far as an opportunity.
  lost: 4,
  won: 5,
}

export const FUNNEL_STAGES = [
  { key: 'list', label: 'On the list', rank: 0 },
  { key: 'contacted', label: 'Contacted', rank: 1 },
  { key: 'responded', label: 'Replied', rank: 2 },
  { key: 'meeting', label: 'Met', rank: 3 },
  { key: 'opportunity', label: 'Scoped work', rank: 4 },
  { key: 'won', label: 'Won', rank: 5 },
] as const

/**
 * The furthest stage a contact has EVER reached, from its status and its whole
 * call log. A contact now `dormant` who once booked a meeting still counts as
 * met; a logged touch proves they were contacted even if the status was never
 * moved. Legacy `closed` (no-fit) contacts are not part of the pipeline.
 */
export function furthestStage(contact: VizContact): number {
  let rank = REACHED_RANK[String(contact.status || '')] ?? 0
  for (const interaction of contact.interactions || []) {
    if (!interaction) continue
    rank = Math.max(rank, 1, REACHED_RANK[String(interaction.statusAfter || '')] ?? 0)
  }
  return rank
}

export type FunnelStage = {
  key: string
  label: string
  count: number
  fromPrevious: number | null
  isLeak: boolean
}

/**
 * Contacts that reached AT LEAST each stage. The leak is the weakest
 * stage-to-stage rate among steps with enough people behind them to mean
 * something (a 0-of-1 step is noise, not a finding).
 */
export function pipelineFunnel(contacts: VizContact[], minBase = 3): FunnelStage[] {
  const live = (contacts || []).filter((contact) => contact && contact.status !== 'closed')
  const ranks = live.map(furthestStage)
  const stages = FUNNEL_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: ranks.filter((rank) => rank >= stage.rank).length,
  }))
  const withRates = stages.map((stage, index) => ({
    ...stage,
    fromPrevious: index === 0 ? null : stages[index - 1].count ? stage.count / stages[index - 1].count : 0,
    isLeak: false,
  }))
  let leak = -1
  let worst = Infinity
  withRates.forEach((stage, index) => {
    if (index === 0 || stages[index - 1].count < minBase || stage.fromPrevious === null) return
    if (stage.fromPrevious < worst) {
      worst = stage.fromPrevious
      leak = index
    }
  })
  if (leak > 0) withRates[leak].isLeak = true
  return withRates
}

export function funnelInsight(stages: FunnelStage[]): string {
  const list = stages[0]?.count ?? 0
  if (!list) return 'Nobody is on the list yet.'
  const contacted = stages[1]?.count ?? 0
  if (!contacted)
    return `${list} people on the list and nobody contacted yet — the first call is the whole funnel right now.`
  const leak = stages.find((stage) => stage.isLeak)
  const before = leak ? stages[stages.indexOf(leak) - 1] : null
  const won = stages[stages.length - 1]?.count ?? 0
  const lead = `${contacted} of ${list} contacted${won ? `, ${won} won` : ''}.`
  if (!leak || !before) return lead
  const lost = before.count - leak.count
  return `${lead} The biggest drop is ${before.label.toLowerCase()} → ${leak.label.toLowerCase()}: ${lost} of ${before.count} stop there.`
}

// ---- Where the network is warm ----------------------------------------------

export const WARMTH_COLUMNS = ['hot', 'warm', 'cool', 'cold', 'unknown'].map((value) => ({
  key: value,
  label: value === 'unknown' ? 'Unconfirmed' : value[0].toUpperCase() + value.slice(1),
  short: value === 'unknown' ? 'Unsure' : value[0].toUpperCase() + value.slice(1),
}))

const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(
  OUTREACH_SEGMENT_OPTIONS.map((option) => [option.value, option.title.split(' / ')[0]]),
)

export type WarmthGrid = {
  rows: { key: string; label: string }[]
  columns: { key: string; label: string; short?: string }[]
  cells: Record<string, Record<string, number>>
  /** The segment with the most hot + warm contacts, if any. */
  warmest: string | null
}

/**
 * Segment × warmth. A contact with no confirmed segment uses the research
 * suggestion; with neither it is "Unsorted" — kept as its own row, because a
 * large unsorted row is itself a finding. Every segment stays in the grid even
 * at zero, so a gap shows as a gap.
 */
export function warmthGrid(contacts: VizContact[]): WarmthGrid {
  const live = (contacts || []).filter((contact) => contact && contact.status !== 'closed')
  const known = new Set(OUTREACH_WARMTH_OPTIONS.map((option) => option.value))
  const cells: Record<string, Record<string, number>> = {}
  const bump = (row: string, column: string) => {
    cells[row] = cells[row] || {}
    cells[row][column] = (cells[row][column] || 0) + 1
  }
  for (const contact of live) {
    const segment = contact.segment || contact.researchSuggestedSegment || 'unsorted'
    const warmth = known.has(String(contact.warmth || '')) ? String(contact.warmth) : 'unknown'
    bump(segment, warmth)
  }
  const rows = [
    ...OUTREACH_SEGMENT_OPTIONS.map((option) => ({ key: option.value, label: SEGMENT_LABEL[option.value] })),
    ...(cells.unsorted ? [{ key: 'unsorted', label: 'Unsorted' }] : []),
  ]
  let warmest: string | null = null
  let best = 0
  for (const row of rows) {
    const score = (cells[row.key]?.hot || 0) + (cells[row.key]?.warm || 0)
    if (score > best) {
      best = score
      warmest = row.key
    }
  }
  return { rows, columns: WARMTH_COLUMNS, cells, warmest }
}

export function warmthInsight(grid: WarmthGrid): string {
  const total = Object.values(grid.cells).reduce((sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0), 0)
  if (!total) return 'No contacts yet.'
  const warm = Object.values(grid.cells).reduce((sum, row) => sum + (row.hot || 0) + (row.warm || 0), 0)
  const unconfirmed = Object.values(grid.cells).reduce((sum, row) => sum + (row.unknown || 0), 0)
  const warmestLabel = grid.rows.find((row) => row.key === grid.warmest)?.label
  const coldRows = grid.rows.filter((row) => {
    const cells = grid.cells[row.key]
    if (!cells) return false
    const count = Object.values(cells).reduce((a, b) => a + b, 0)
    return count >= 5 && !(cells.hot || cells.warm)
  })
  const parts = [
    warm
      ? `${warm} of ${total} people know us well enough to take a call${warmestLabel ? `, most of them in ${warmestLabel}` : ''}.`
      : `None of the ${total} people on the list is confirmed warm.`,
  ]
  if (coldRows.length) parts.push(`${coldRows.map((row) => row.label).join(', ')}: plenty of names, nobody warm.`)
  if (unconfirmed / total >= 0.5)
    parts.push(`${Math.round((unconfirmed / total) * 100)}% have never had their warmth confirmed.`)
  return parts.join(' ')
}

// ---- The calling habit -------------------------------------------------------

export type ActivityDay = { date: string; week: number; weekday: number; count: number; future: boolean; label: string }

export type ActivityCalendarData = {
  days: ActivityDay[]
  weeks: number
  monthLabels: { week: number; label: string }[]
  /** Touches per week, oldest first — the sparkline under a figure. */
  weekly: { label: string; value: number; weekStart: string }[]
  total: number
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_NAME = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function formatDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`)
  return `${WEEKDAY_NAME[weekdayOf(dayKey)]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`
}

/** "Mon 12 Oct" this year, "Mon 11 Jan 2027" otherwise — for dates a person reads. */
export function formatStudioDate(dayKey: string, now: Date): string {
  const base = formatDayKey(dayKey)
  const year = dayKey.slice(0, 4)
  return year === (studioDay(now) || '').slice(0, 4) ? base : `${base} ${year}`
}

/** Every logged touch, bucketed by the studio's day, for the last `weeks` weeks ending this week. */
export function activityCalendar(contacts: VizContact[], now: Date, weeks = 12): ActivityCalendarData {
  const today = studioDay(now) as string
  const thisMonday = addDays(today, -weekdayOf(today))
  const firstMonday = addDays(thisMonday, -7 * (weeks - 1))
  const counts = new Map<string, number>()
  for (const contact of contacts || []) {
    for (const interaction of contact?.interactions || []) {
      const day = interaction?.at ? studioDay(interaction.at) : null
      if (!day || day < firstMonday || day > today) continue
      counts.set(day, (counts.get(day) || 0) + 1)
    }
  }
  const days: ActivityDay[] = []
  const monthLabels: { week: number; label: string }[] = []
  const weekly: ActivityCalendarData['weekly'] = []
  let lastMonth = -1
  for (let week = 0; week < weeks; week += 1) {
    const monday = addDays(firstMonday, week * 7)
    let weekTotal = 0
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = addDays(monday, weekday)
      const count = counts.get(date) || 0
      weekTotal += date <= today ? count : 0
      days.push({ date, week, weekday, count, future: date > today, label: formatDayKey(date) })
    }
    const month = new Date(`${monday}T12:00:00Z`).getUTCMonth()
    if (month !== lastMonth) {
      // Only label a month where it has room (not in the last column).
      if (week < weeks - 1) monthLabels.push({ week, label: MONTH[month] })
      lastMonth = month
    }
    weekly.push({ label: `Week of ${formatDayKey(monday)}`, value: weekTotal, weekStart: monday })
  }
  return { days, weeks, monthLabels, weekly, total: weekly.reduce((sum, w) => sum + w.value, 0) }
}

export function activityInsight(data: ActivityCalendarData): string {
  if (!data.total) return `No calls or emails logged in the last ${data.weeks} weeks.`
  const quiet = data.weekly.filter((week, index) => index < data.weekly.length - 1 && week.value === 0).length
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const day of data.days) byWeekday[day.weekday] += day.count
  const busiest = byWeekday.indexOf(Math.max(...byWeekday))
  const perWeek = data.total / data.weeks
  const parts = [
    `${data.total} touches in ${data.weeks} weeks — about ${perWeek < 1 ? perWeek.toFixed(1) : Math.round(perWeek)} a week, most on ${WEEKDAY_LONG[busiest]}s.`,
  ]
  if (quiet) parts.push(`${quiet} of the last ${data.weeks - 1} full weeks had none.`)
  return parts.join(' ')
}

// ---- Follow-ups on a day axis ------------------------------------------------

const FOLLOW_UP_STATUSES = new Set(['contacted', 'responded', 'meeting', 'opportunity', 'dormant'])

export function followUpEvents(contacts: VizContact[], now: Date) {
  const today = studioDay(now) as string
  return (contacts || [])
    .filter((contact) => contact?.followUpAt && FOLLOW_UP_STATUSES.has(String(contact.status || '')))
    .map((contact) => {
      const date = studioDay(contact.followUpAt as string)
      if (!date) return null
      const who = [contact.name, contact.organization].filter(Boolean).join(' · ') || 'Someone'
      return { id: contact._id, date, title: who, detail: date < today ? 'overdue' : 'due', overdue: date < today }
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ---- Who is doing the calling ------------------------------------------------

export type PersonTouches = { name: string; touches: number; calls: number; share: number }

/** Touches per person over a window of days ending today — the team's share of the habit. */
export function touchesByPerson(contacts: VizContact[], now: Date, days = 84): PersonTouches[] {
  const today = studioDay(now) as string
  const from = addDays(today, -(days - 1))
  const counts = new Map<string, { touches: number; calls: number }>()
  for (const contact of contacts || []) {
    for (const interaction of contact?.interactions || []) {
      const day = interaction?.at ? studioDay(interaction.at) : null
      if (!day || day < from || day > today) continue
      const who = String(interaction.by || '').trim() || 'Someone'
      const entry = counts.get(who) || { touches: 0, calls: 0 }
      entry.touches += 1
      if (interaction.channel === 'phone') entry.calls += 1
      counts.set(who, entry)
    }
  }
  const total = [...counts.values()].reduce((sum, entry) => sum + entry.touches, 0)
  return [...counts.entries()]
    .map(([name, entry]) => ({ name, ...entry, share: total ? entry.touches / total : 0 }))
    .sort((a, b) => b.touches - a.touches || a.name.localeCompare(b.name))
}

export function byPersonInsight(people: PersonTouches[]): string {
  if (!people.length) return 'Nobody has logged a call or an email yet.'
  const [top] = people
  if (people.length === 1) return `Only ${top.name} is logging outreach — one person is the whole pipeline.`
  if (top.share >= 0.5)
    return `${top.name} made ${Math.round(top.share * 100)}% of the touches. Spreading the calls spreads the risk.`
  return `Shared fairly evenly — ${top.name} leads with ${Math.round(top.share * 100)}%.`
}
