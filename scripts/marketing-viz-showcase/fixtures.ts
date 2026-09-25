/**
 * Invented data for the data-design case study. Every name and organisation
 * here is fictional (none is a real contact, client or teammate) and the
 * numbers are shaped like a small studio's outreach list, not taken from one.
 * Deterministic: a seeded generator, so the page is the same on every build.
 */
import type { VizContact } from '@/lib/marketing/viz/outreachViz'

let seed = 20260925
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]
const weighted = <T,>(pairs: [T, number][]) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}

export const NOW = new Date('2026-09-24T15:00:00Z') // Thu 24 Sep

const FIRST = ['Avery', 'Jordan', 'Riley', 'Morgan', 'Casey', 'Quinn', 'Harper', 'Rowan', 'Sage', 'Emerson', 'Dana', 'Blake', 'Reese', 'Parker', 'Skyler', 'Hayden', 'Kai', 'Noa', 'Tatum', 'Ellis']
const LAST = ['Ortiz', 'Nakamura', 'Okafor', 'Lindqvist', 'Brennan', 'Patel', 'Moreau', 'Haddad', 'Novak', 'Castillo', 'Mbeki', 'Sato', 'Keller', 'Dubois', 'Varga', 'Iyer']
const ORGS: Record<string, string[]> = {
  provider: ['Riverbend Health', 'Northgate Medical Center', 'Lakeshore Clinics', 'Harbor Valley Hospital'],
  healthtech: ['Pulsefield', 'Carewire Labs', 'Tidewell', 'Meridian Health AI'],
  pharma: ['Halcyon Therapeutics', 'Orrin Biosciences', 'Veridian Pharma'],
  payer: ['Keystone Health Plan', 'Summit Mutual'],
  medDevice: ['Arclight Devices', 'Beaconpoint Diagnostics'],
  government: ['State Office of Health Data', 'County Public Health'],
  research: ['Eastfield University', 'Institute for Care Design'],
  other: ['Foundry Collective', 'Northstar Foundation'],
}

const SEGMENT_MIX: [string, number][] = [
  ['provider', 30], ['healthtech', 24], ['research', 14], ['pharma', 10], ['government', 8], ['payer', 6], ['medDevice', 3], ['other', 5],
]
const WARMTH_BY_SEGMENT: Record<string, [string, number][]> = {
  provider: [['hot', 3], ['warm', 9], ['cool', 8], ['cold', 4], ['unknown', 6]],
  healthtech: [['hot', 2], ['warm', 6], ['cool', 6], ['cold', 5], ['unknown', 5]],
  research: [['hot', 1], ['warm', 5], ['cool', 4], ['cold', 2], ['unknown', 2]],
  pharma: [['hot', 0], ['warm', 1], ['cool', 2], ['cold', 5], ['unknown', 2]],
  government: [['hot', 0], ['warm', 2], ['cool', 3], ['cold', 1], ['unknown', 2]],
  payer: [['hot', 0], ['warm', 0], ['cool', 2], ['cold', 2], ['unknown', 2]],
  medDevice: [['hot', 0], ['warm', 0], ['cool', 1], ['cold', 1], ['unknown', 1]],
  other: [['hot', 0], ['warm', 2], ['cool', 1], ['cold', 1], ['unknown', 1]],
}
const PEOPLE = ['Ada', 'Ben', 'Cleo', 'Dev']
const DAY = 86_400_000

/** Status reached, and the call log that got it there. */
function history(warmth: string): { status: string; interactions: VizContact['interactions'] } {
  const reach = { hot: 0.95, warm: 0.8, cool: 0.45, cold: 0.2, unknown: 0.1 }[warmth] ?? 0.2
  if (rand() > reach) return { status: weighted([['researched', 5], ['briefed', 3], ['new', 2], ['needsReview', 1]]), interactions: [] }
  const ladder = ['contacted', 'responded', 'meeting', 'opportunity', 'won']
  const advance = { hot: 0.7, warm: 0.55, cool: 0.35, cold: 0.2, unknown: 0.2 }[warmth] ?? 0.3
  let stage = 0
  while (stage < ladder.length - 1 && rand() < advance * (stage === 0 ? 0.9 : stage === 1 ? 0.75 : stage === 2 ? 0.5 : 0.45)) stage += 1
  const interactions: NonNullable<VizContact['interactions']> = []
  let at = NOW.getTime() - (4 + rand() * 78) * DAY
  for (let i = 0; i <= stage; i += 1) {
    const touches = i === 0 ? 1 + Math.floor(rand() * 2) : 1
    for (let t = 0; t < touches; t += 1) {
      // Weekdays, office hours, mostly Tue–Thu.
      // Snap to a weekday, weighted towards Tue–Thu (when people pick up).
      let d = new Date(at)
      const target = weighted([[1, 2], [2, 4], [3, 4], [4, 3], [5, 1]])
      d = new Date(at + (target - d.getUTCDay()) * DAY)
      if (d.getTime() > NOW.getTime()) break
      interactions.push({
        at: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 13 + Math.floor(rand() * 7), 0)).toISOString(),
        by: pick(PEOPLE),
        channel: weighted([['phone', 5], ['email', 4], ['video', i >= 2 ? 3 : 0], ['linkedin', 1]]),
        statusAfter: i === 0 ? 'contacted' : ladder[i],
      })
      at += (2 + rand() * 9) * DAY
    }
  }
  let status = ladder[stage]
  if (stage === 3 && rand() < 0.3) status = 'lost'
  if (stage <= 1 && rand() < 0.15) status = 'dormant'
  return { status, interactions }
}

export function makeContacts(n = 142): VizContact[] {
  const contacts: VizContact[] = []
  for (let i = 0; i < n; i += 1) {
    const segment = weighted(SEGMENT_MIX)
    const warmth = weighted(WARMTH_BY_SEGMENT[segment])
    const { status, interactions } = history(warmth)
    const live = ['contacted', 'responded', 'meeting', 'opportunity'].includes(status)
    const followUpAt = live && rand() < 0.35 ? new Date(NOW.getTime() + (-9 + rand() * 17) * DAY).toISOString() : null
    contacts.push({
      _id: `c-${i}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      organization: pick(ORGS[segment]),
      segment: rand() < 0.8 ? segment : null,
      researchSuggestedSegment: segment,
      warmth,
      status,
      followUpAt,
      interactions,
    })
  }
  return contacts
}

export const RUNWAY = {
  posture: 'rebuild',
  setAt: '2026-07-11T00:00:00Z',
  runway: {
    certainUntil: '2027-02-08',
    confirmedAt: '2026-09-14T15:00:00Z',
    commitments: [
      { label: 'Discovery sprint — Riverbend Health', signedAt: '2026-08-12', monthsAdded: 1.5 },
      { label: 'Research synthesis — Eastfield University', signedAt: '2026-09-03', monthsAdded: 1 },
    ],
  },
}

export const PLAN = {
  weekStart: '2026-09-21',
  budgetMinutes: 240,
  plannedMinutes: 225,
  overCommitted: false,
  reserved: { minutes: 60, label: 'Follow-ups: 4 (~60m reserved)' },
  items: [
    { kind: 'outreach', minutes: 60, title: 'Warm-network call wave 2' },
    { kind: 'outreach', minutes: 30, title: 'Email the three Tidewell leads' },
    { kind: 'content', minutes: 45, title: 'Tighten the pre-mortem scorecard' },
  ],
  decisions: [
    { kind: 'decision', minutes: 15, title: 'Publish the failure taxonomy?' },
    { kind: 'decision', minutes: 15, title: 'Price band for the facilitator kit' },
  ],
  deferred: [
    { kind: 'content', minutes: 120, reason: 'over budget', status: 'queued' },
    { kind: 'research', minutes: 90, reason: 'not due yet', status: 'queued' },
  ],
}

/** Invented research records: every organisation on the list was researched; fewer survive each check. */
export function makeResearch(contacts: VizContact[]) {
  const orgs = Array.from(new Set(contacts.map((c) => c.organization).filter(Boolean))) as string[]
  return orgs.map((organization, i) => {
    const r = ((i * 7919) % 97) / 97
    if (r < 0.3) return { organization, quoteCheck: { status: 'quote-absent' } }
    if (r < 0.42) return { organization, quoteCheck: { status: 'unreachable' } }
    if (r < 0.6) return { organization, verification: { status: 'overreach' } }
    return { organization, verification: { status: 'verified' } }
  })
}
