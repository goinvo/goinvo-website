import { describe, expect, it } from 'vitest'

import { buyerShare, coverageInsight, researchFunnel, segmentCoverage } from '@/lib/marketing/viz/briefViz'
import { channelWeekGrid, coverageGridInsight } from '@/lib/marketing/viz/contentViz'
import {
  activityCalendar,
  activityInsight,
  dedupeDrafts,
  followUpEvents,
  formatStudioDate,
  funnelInsight,
  furthestStage,
  pipelineFunnel,
  studioDay,
  touchesByPerson,
  warmthGrid,
  warmthInsight,
  type VizContact,
} from '@/lib/marketing/viz/outreachViz'
import { buildRunwayTimeline, describeRunwayTimeline } from '@/lib/marketing/viz/runwayTimeline'
import { budgetInsight, budgetParts } from '@/lib/marketing/viz/weekGlance'
import { formatRunningDelta } from '@/lib/marketing/viz/format'

const NOW = new Date('2026-09-24T15:00:00Z') // Thu 24 Sep, 11am in New York

const contact = (id: string, extra: Partial<VizContact> = {}): VizContact => ({ _id: id, status: 'researched', warmth: 'unknown', ...extra })
const touch = (at: string, statusAfter = 'contacted', by = 'Juhan', channel = 'phone') => ({ at, statusAfter, by, channel })

describe('the pipeline funnel', () => {
  it('counts the furthest stage ever reached, from the status and the whole call log', () => {
    // Dormant now, but the log says a meeting happened.
    expect(furthestStage(contact('a', { status: 'dormant', interactions: [touch('2026-09-01T14:00:00Z', 'meeting')] }))).toBe(3)
    // A logged touch proves contact even when the status was never moved.
    expect(furthestStage(contact('b', { status: 'researched', interactions: [touch('2026-09-01T14:00:00Z', '')] }))).toBe(1)
    // "Lost — opportunity did not close": it got to an opportunity.
    expect(furthestStage(contact('c', { status: 'lost' }))).toBe(4)
    expect(furthestStage(contact('d'))).toBe(0)
  })

  it('reports each stage as a share of the one before, names the weakest real step, and leaves out legacy no-fits', () => {
    const contacts = [
      ...Array.from({ length: 10 }, (_, i) => contact(`list-${i}`)),
      ...Array.from({ length: 6 }, (_, i) => contact(`contacted-${i}`, { status: 'contacted' })),
      ...Array.from({ length: 3 }, (_, i) => contact(`replied-${i}`, { status: 'responded' })),
      contact('met', { status: 'meeting' }),
      contact('legacy', { status: 'closed', interactions: [touch('2026-09-01T14:00:00Z', 'won')] }),
    ]
    const stages = pipelineFunnel(contacts)
    expect(stages.map((stage) => stage.count)).toEqual([20, 10, 4, 1, 0, 0])
    expect(stages[1].fromPrevious).toBeCloseTo(0.5)
    // 1 of 4 met is the weakest step with at least three people behind it; 0 of 1 is noise.
    expect(stages.filter((stage) => stage.isLeak).map((stage) => stage.key)).toEqual(['meeting'])
    expect(funnelInsight(stages)).toBe('10 of 20 contacted. The biggest drop is replied → met: 3 of 4 stop there.')
  })

  it('says the uncomfortable thing when nobody has been called', () => {
    expect(funnelInsight(pipelineFunnel([contact('a'), contact('b')]))).toBe('2 people on the list and nobody contacted yet — the first call is the whole funnel right now.')
    expect(funnelInsight(pipelineFunnel([]))).toBe('Nobody is on the list yet.')
  })
})

describe('the warmth grid', () => {
  it('keeps every segment as a row, even at zero, and uses the research suggestion when nobody confirmed one', () => {
    const grid = warmthGrid([
      contact('a', { segment: 'provider', warmth: 'warm' }),
      contact('b', { researchSuggestedSegment: 'provider', warmth: 'hot' }),
      contact('c', { warmth: 'cold' }),
      contact('d', { segment: 'pharma', warmth: 'nonsense' }),
    ])
    expect(grid.rows.map((row) => row.key)).toContain('medDevice')
    expect(grid.rows.at(-1)).toEqual({ key: 'unsorted', label: 'Unsorted' })
    expect(grid.cells.provider).toEqual({ warm: 1, hot: 1 })
    expect(grid.cells.pharma).toEqual({ unknown: 1 })
    expect(grid.warmest).toBe('provider')
  })

  it('names the segments with plenty of names and nobody warm', () => {
    const grid = warmthGrid([
      contact('w', { segment: 'provider', warmth: 'warm' }),
      ...Array.from({ length: 6 }, (_, i) => contact(`p-${i}`, { segment: 'pharma', warmth: 'cold' })),
    ])
    expect(warmthInsight(grid)).toBe('1 of 7 people know us well enough to take a call, most of them in Provider. Pharma: plenty of names, nobody warm.')
  })
})

describe('the calling habit', () => {
  const contacts = [
    contact('a', {
      interactions: [
        touch('2026-09-22T14:00:00Z'), // Tue this week
        touch('2026-09-22T23:30:00Z'), // still Tue in New York (7:30pm)
        touch('2026-09-15T14:00:00Z'), // Tue last week
        touch('2026-06-01T14:00:00Z'), // outside twelve weeks
      ],
    }),
  ]

  it('buckets touches by the studio’s day, a week per column ending this week, future days marked', () => {
    const data = activityCalendar(contacts, NOW, 12)
    expect(data.days).toHaveLength(84)
    expect(data.days.find((day) => day.date === '2026-09-22')).toMatchObject({ count: 2, weekday: 1, week: 11 })
    expect(data.days.find((day) => day.date === '2026-09-26')?.future).toBe(true)
    expect(data.weekly.at(-1)).toMatchObject({ weekStart: '2026-09-21', value: 2 })
    expect(data.total).toBe(3)
    expect(activityInsight(data)).toMatch(/^3 touches in 12 weeks — about 0\.3 a week, most on Tuesdays\. 10 of the last 11 full weeks had none\.$/)
  })

  it('counts touches per person over the window, busiest first', () => {
    const people = touchesByPerson(
      [contact('a', { interactions: [touch('2026-09-22T14:00:00Z', 'contacted', 'Eric'), touch('2026-09-21T14:00:00Z', 'contacted', 'Eric', 'email'), touch('2026-09-20T14:00:00Z', 'contacted', 'Jon')] })],
      NOW,
    )
    expect(people).toEqual([
      { name: 'Eric', touches: 2, calls: 1, share: 2 / 3 },
      { name: 'Jon', touches: 1, calls: 1, share: 1 / 3 },
    ])
  })

  it('reads a New York evening as that day, not the next UTC one', () => {
    expect(studioDay('2026-09-23T02:00:00Z')).toBe('2026-09-22')
    expect(formatStudioDate('2026-09-22', NOW)).toBe('Tue 22 Sep')
    expect(formatStudioDate('2027-01-11', NOW)).toBe('Mon 11 Jan 2027')
  })

  it('lists follow-ups owed with overdue marked, and ignores closed contacts', () => {
    const events = followUpEvents(
      [
        contact('late', { name: 'Ada', organization: 'Acme', status: 'contacted', followUpAt: '2026-09-20T14:00:00Z' }),
        contact('soon', { status: 'responded', followUpAt: '2026-09-28T14:00:00Z' }),
        contact('won', { status: 'won', followUpAt: '2026-09-20T14:00:00Z' }),
      ],
      NOW,
    )
    expect(events.map((event) => [event.id, event.overdue])).toEqual([
      ['late', true],
      ['soon', false],
    ])
    expect(events[0].title).toBe('Ada · Acme')
  })

  it('counts a contact once when a draft sits beside it, and keeps a draft-only contact', () => {
    const kept = dedupeDrafts([contact('x'), contact('drafts.x'), contact('drafts.y')])
    expect(kept.map((c) => c._id)).toEqual(['x', 'drafts.y'])
  })
})

describe('the runway as a calendar', () => {
  const stored = {
    posture: 'survival',
    setAt: '2026-07-11T00:00:00Z',
    runway: {
      certainUntil: '2027-02-08',
      confirmedAt: '2026-09-14T15:00:00Z',
      commitments: [{ label: 'Discovery sprint', signedAt: '2026-08-12', monthsAdded: 1.5 }],
    },
  }

  it('lays out the postures the runway will pass through, measured back from its end', () => {
    const timeline = buildRunwayTimeline(stored, NOW)
    expect(timeline.segments.map((segment) => segment.posture)).toEqual(['rebuild', 'survival'])
    expect(timeline.segments[0].from).toBe('2026-09-24')
    // Survival begins three months (of 30.44 days) before 8 Feb.
    expect(timeline.nextCrossing).toEqual({ posture: 'survival', title: 'Survival', at: timeline.segments[1].from })
    expect(timeline.segments[1].to).toBe('2027-02-08')
    expect(timeline.current).toBe('rebuild')
    expect(timeline.commitments).toEqual([{ at: '2026-08-12', label: 'Discovery sprint', monthsAdded: 1.5 }])
    expect(timeline.start <= '2026-08-12').toBe(true)
  })

  it('says where we are, what happens next, and how fresh the number is', () => {
    const say = (s: StoredPostureLike, now = NOW) => describeRunwayTimeline(buildRunwayTimeline(s, now), (iso) => iso)
    expect(say(stored)).toMatch(/^4\.5 months of certain runway\. Rebuild until 2026-11-0\d, then Survival unless work is signed\.$/)
    expect(say(stored, new Date('2026-11-20T15:00:00Z'))).toMatch(/Last confirmed 67 days ago — worth re-checking\.$/)
    expect(say({})).toBe('No runway date recorded — the plan is running on an assumed posture.')
  })

  it('has nothing to draw once the runway has run out, and says so', () => {
    const past = buildRunwayTimeline({ runway: { certainUntil: '2026-09-01' } }, NOW)
    expect(past.segments).toEqual([])
    expect(describeRunwayTimeline(past, (iso) => iso)).toBe('The recorded runway ended 2026-09-01. Record signed work or a new date.')
  })

  it('says when a hand-set posture is overriding the date', () => {
    const manual = buildRunwayTimeline({ ...stored, posture: 'survival', setAt: '2026-09-20T00:00:00Z' }, NOW)
    expect(describeRunwayTimeline(manual, (iso) => iso)).toContain('The plan is using Survival, set by hand more recently than the date.')
  })
})

type StoredPostureLike = Parameters<typeof buildRunwayTimeline>[0]

describe('where the week’s hours go', () => {
  const plan = {
    budgetMinutes: 240,
    plannedMinutes: 225,
    reserved: { minutes: 60, label: 'Follow-ups: 4 (~60m reserved)' },
    items: [
      { kind: 'outreach', minutes: 60 },
      { kind: 'content', minutes: 45 },
      { kind: 'decision', minutes: 10 },
    ],
    decisions: [{ minutes: 15 }],
    deferred: [{ minutes: 120, reason: 'over budget' }, { minutes: 90, reason: 'not due yet' }],
  }

  it('splits the hours by what they are for, in fixed colour slots', () => {
    expect(budgetParts(plan).map((part) => [part.key, part.value, part.slot])).toEqual([
      ['followUps', 60, 0],
      ['outreach', 60, 1],
      ['decisions', 25, 2],
      ['other', 45, 3],
    ])
  })

  it('says what did not fit, or what the spare time is good for, or that it is over', () => {
    expect(budgetInsight(plan)).toBe('3h 10m planned of 4h — 63% of it talking to people. 1 task (2h) did not fit and wait for next week.')
    expect(budgetInsight({ ...plan, deferred: [] })).toBe('3h 10m planned of 4h — 63% of it talking to people. 50m spare.')
    expect(budgetInsight({ ...plan, deferred: [], items: [] })).toBe('1h 15m planned of 4h — 80% of it talking to people. 2h 45m spare — room for another outreach call.')
    expect(budgetInsight({ ...plan, budgetMinutes: 120 })).toMatch(/Over by 1h 10m: drop or hand back something before Thursday\.$/)
  })

  it('never calls an unfinished week down on a finished one', () => {
    expect(formatRunningDelta(3, 7)).toBe('7 last week — the week is not over')
    expect(formatRunningDelta(9, 7)).toBe('+2 vs last week')
  })
})

describe('the audience brief charts', () => {
  const rows = [
    { segment: 'provider', label: 'Provider', count: 40, share: 0.4, isBuyer: true },
    { segment: 'pharma', label: 'Pharma', count: 6, share: 0.06, isBuyer: true },
    { segment: 'research', label: 'Research', count: 30, share: 0.3, isBuyer: false },
  ]

  it('splits the list into who could buy and who cannot', () => {
    expect(buyerShare({ rows, unclassified: 24 }).map((slice) => [slice.key, slice.value])).toEqual([
      ['buyer', 46],
      ['other', 30],
      ['unclassified', 24],
    ])
  })

  it('sets each target segment against what a campaign needs, and names the short ones', () => {
    const bars = segmentCoverage(rows, ['medDevice', 'pharma', 'provider'], 10, (s) => s)
    expect(bars.map((bar) => [bar.key, bar.value, bar.short])).toEqual([
      ['provider', 40, false],
      ['pharma', 6, true],
      ['medDevice', 0, true],
    ])
    expect(coverageInsight(bars, 10)).toBe('pharma (6), medDevice (0) are below the 10 people a campaign needs — choosing them means cold outreach from scratch.')
  })

  it('walks research through its checks and names the weakest', () => {
    const stages = researchFunnel(50, [
      { verification: { status: 'verified' } },
      { verification: { status: 'overreach' } },
      { quoteCheck: { status: 'quote-present' } },
      { quoteCheck: { status: 'quote-absent' } },
      { quoteCheck: { status: 'unreachable' } },
      {},
    ])
    expect(stages.map((stage) => stage.count)).toEqual([50, 6, 3, 1])
    expect(stages.find((stage) => stage.isLeak)?.key).toBe('verified')
  })
})

describe('content coverage by channel and week', () => {
  const channels = [
    { _id: 'ch-ig', key: 'instagram', title: 'Instagram' },
    { _id: 'ch-li', key: 'linkedin', title: 'LinkedIn' },
    { _id: 'ch-old', key: 'myspace', title: 'Old', status: 'archived' },
  ]

  it('counts only ready posts, by the week they publish, and says when the calendar runs dry', () => {
    const grid = channelWeekGrid(
      [
        { publishAt: '2026-09-25T16:00:00Z', status: 'scheduled', channel: 'linkedin' },
        { publishAt: '2026-10-01T16:00:00Z', status: 'review', channelRef: { _id: 'ch-li' } },
        { publishAt: '2026-10-01T16:00:00Z', status: 'idea', channel: 'linkedin' },
        { publishAt: '2026-09-20T16:00:00Z', status: 'scheduled', channel: 'linkedin' },
      ],
      channels,
      NOW,
      5,
    )
    expect(grid.rows.map((row) => row.label)).toEqual(['Instagram', 'LinkedIn'])
    expect(grid.columns[0]).toMatchObject({ key: '2026-09-21', label: 'This week' })
    expect(grid.cells['ch-li']).toEqual({ '2026-09-21': 1, '2026-09-28': 1 })
    expect(grid.empty).toEqual(['Instagram'])
    expect(grid.firstDryWeek).toBe('2026-10-05')
    expect(coverageGridInsight(grid, (d) => d)).toBe('Instagram: nothing ready in the next 5 weeks. From the week of 2026-10-05, nothing is ready anywhere.')
  })
})
