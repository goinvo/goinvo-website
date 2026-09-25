import { makeContacts, makeResearch, NOW, PLAN, RUNWAY } from './fixtures'
import { activityCalendar, followUpEvents, pipelineFunnel, warmthGrid, touchesByPerson } from '@/lib/marketing/viz/outreachViz'
import { researchFunnel } from '@/lib/marketing/viz/briefViz'
import { buildRunwayTimeline } from '@/lib/marketing/viz/runwayTimeline'
import { budgetParts } from '@/lib/marketing/viz/weekGlance'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'

const contacts = makeContacts()
const research = makeResearch(contacts)
const touches = contacts.reduce((n, c) => n + (c.interactions?.length || 0), 0)
const funnel = pipelineFunnel(contacts)
const rf = researchFunnel(new Set(contacts.map((c) => c.organization)).size, research)
const act = activityCalendar(contacts, NOW, 12)
const tl = buildRunwayTimeline(RUNWAY, NOW)
const DAY = 86400000
const ws = Date.parse('2026-09-21T00:00:00Z')
const last = summarizeOutreach(contacts as never, { from: new Date(ws - 7 * DAY).toISOString(), to: new Date(ws).toISOString(), now: NOW })
const before = summarizeOutreach(contacts as never, { from: new Date(ws - 14 * DAY).toISOString(), to: new Date(ws - 7 * DAY).toISOString(), now: NOW })
console.log(JSON.stringify({
  contacts: contacts.length, touches, research: rf.map((s) => s.count), funnel: funnel.map((s) => s.count),
  weekly: act.weekly.map((w) => w.value), followUps: followUpEvents(contacts, NOW).length,
  followUpsOverdue: followUpEvents(contacts, NOW).filter((e) => e.overdue).length,
  runway: { months: tl.months, ends: tl.endsAt, crossing: tl.nextCrossing },
  parts: budgetParts(PLAN as never).map((p) => [p.key, p.value]),
  last: { touches: last.touches, people: last.people, replies: last.replies, meetings: last.meetings, opp: last.opportunities, won: last.won }, before: before.touches,
  people: touchesByPerson(contacts, NOW).map((p) => [p.name, p.touches]),
  warmest: warmthGrid(contacts).warmest,
}, null, 0))
