/**
 * Content coverage as a grid: each active channel against the next few weeks,
 * counting posts that are ready (in review or scheduled). "Covered / gap" per
 * channel said whether there was anything at all in thirty days; the grid
 * says WHEN it runs out, which is the thing to act on.
 *
 * Pure: `now` is passed in; weeks start on Monday in the studio's time zone.
 */
import { addDays, studioDay, weekdayOf } from './outreachViz'

export type CoverageItem = {
  publishAt?: string | null
  status?: string | null
  channel?: string | null
  channelRef?: { _id?: string | null } | null
}

export type CoverageChannel = { _id: string; key?: string | null; title?: string | null; status?: string | null }

export type ChannelWeekGrid = {
  rows: { key: string; label: string }[]
  columns: { key: string; label: string; short: string }[]
  cells: Record<string, Record<string, number>>
  /** Channels with nothing ready in the whole window. */
  empty: string[]
  /** The first week with nothing ready on ANY channel, if one falls in the window. */
  firstDryWeek: string | null
}

const READY = new Set(['review', 'scheduled'])
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function channelWeekGrid(items: CoverageItem[], channels: CoverageChannel[], now: Date, weeks = 5): ChannelWeekGrid {
  const today = studioDay(now) as string
  const firstMonday = addDays(today, -weekdayOf(today))
  const columns = Array.from({ length: weeks }, (_, index) => {
    const monday = addDays(firstMonday, index * 7)
    const d = new Date(`${monday}T12:00:00Z`)
    const label = index === 0 ? 'This week' : `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`
    return { key: monday, label, short: index === 0 ? 'Now' : `${d.getUTCDate()}/${d.getUTCMonth() + 1}` }
  })
  const end = addDays(firstMonday, weeks * 7)
  const live = (channels || []).filter((channel) => channel && channel.status !== 'archived')
  const cells: Record<string, Record<string, number>> = {}
  for (const channel of live) cells[channel._id] = {}
  for (const item of items || []) {
    if (!item?.publishAt || !READY.has(String(item.status || ''))) continue
    const day = studioDay(item.publishAt)
    if (!day || day < today || day >= end) continue
    const channel = live.find((c) => (item.channelRef?._id && c._id === item.channelRef._id) || (c.key && item.channel === c.key))
    if (!channel) continue
    const week = addDays(day, -weekdayOf(day))
    cells[channel._id][week] = (cells[channel._id][week] || 0) + 1
  }
  const rows = live
    .map((channel) => ({ key: channel._id, label: channel.title || channel.key || 'Untitled channel' }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const total = (id: string) => Object.values(cells[id] || {}).reduce((sum, n) => sum + n, 0)
  const empty = rows.filter((row) => total(row.key) === 0).map((row) => row.label)
  const firstDryWeek = columns.find((column) => rows.every((row) => !(cells[row.key] || {})[column.key]))?.key ?? null
  return { rows, columns, cells, empty, firstDryWeek }
}

export function coverageGridInsight(grid: ChannelWeekGrid, formatDay: (dayKey: string) => string): string {
  if (!grid.rows.length) return 'Add channels to see coverage.'
  const parts: string[] = []
  if (grid.empty.length === grid.rows.length) return `Nothing is ready to publish on any channel in the next ${grid.columns.length} weeks.`
  if (grid.empty.length) parts.push(`${grid.empty.join(', ')}: nothing ready in the next ${grid.columns.length} weeks.`)
  if (grid.firstDryWeek) parts.push(`From the week of ${formatDay(grid.firstDryWeek)}, nothing is ready anywhere.`)
  if (!parts.length) parts.push(`Every channel has something ready in the next ${grid.columns.length} weeks.`)
  return parts.join(' ')
}
