import { describe, expect, it } from 'vitest'

import { buildQuickCallLog, type ContactLogContact } from '@/lib/marketing/callLog'
import { decodeStrategyValue, MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { LABEL, replaceBlocksByPrefix } from '@/lib/marketing/marquetaStyle'
import {
  marketingOperationDocumentId,
  normalizeMarketingOperationInput,
} from '@/lib/marketing/operations'
import {
  PULSE_CONTACT_PROJECTION,
  summarizeOutreach,
  type OutreachPulse,
  type PulseContact,
} from '@/lib/marketing/outreachPulse'
import {
  describeRunway,
  monthsOfRunway,
  postureForRunwayMonths,
  resolveRunwayPosture,
  RUNWAY_STALE_DAYS,
  runwayCheckIn,
  type StoredPosture,
} from '@/lib/marketing/runway'
import { MARKETING_ACTION } from '@/lib/marketing/slackDelegation'
import {
  answerMrkdwn,
  buildMoneyAndDirectionBlocks,
  buildStrategyDecisionOperation,
  buildStrategySnapshot,
  latestWin,
  moneyAnswer,
  moneyAnswerText,
  monthKey,
  monthLabel,
  monthWindow,
  PIPELINE_CONTACT_PROJECTION,
  pipelineAnswer,
  pipelineAnswerText,
  STRATEGY_REVIEW_INTERVAL_DAYS,
  strategyAnswer,
  strategyAnswerText,
  strategyReviewDue,
  strategyReviewSourceKey,
  summarizePipeline,
  winsInWindow,
  type MoneyRunway,
  type PipelineContact,
  type StrategyReviewRecord,
  type StrategySnapshot,
} from '@/lib/marketing/strategyCheck'

import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

const SEPT = new Date('2026-09-24T15:00:00Z')
const DAY = 86_400_000
const HUGE = 'x'.repeat(5000)
const HOSTILE = '<!here> & <5% of pilots <@U123> <https://evil.example|click>'

function touches(n: number, opts: { at?: string; statusAfter?: string; by?: string; value?: number } = {}): PulseContact[] {
  return Array.from({ length: n }, (_, index) => ({
    _id: `c${index}`,
    status: opts.statusAfter || 'contacted',
    interactions: [
      {
        at: opts.at || '2026-09-10T15:00:00Z',
        by: opts.by || 'Juhan',
        channel: 'phone',
        statusAfter: opts.statusAfter || 'contacted',
        ...(opts.value !== undefined ? { value: opts.value } : {}),
      },
    ],
  }))
}

function pulse(contacts: PulseContact[], now = SEPT, offset = 0): OutreachPulse {
  return summarizeOutreach(contacts, { ...monthWindow(now, offset), now })
}

function snapshot(overrides: Partial<Parameters<typeof buildStrategySnapshot>[0]> = {}): StrategySnapshot {
  return buildStrategySnapshot({
    now: SEPT,
    runwaySummary: '3.5 months of certain runway (to 11 Jan 2027) — Rebuild.',
    postureId: 'rebuild',
    thisMonth: pulse(touches(2)),
    lastMonth: pulse(touches(6, { at: '2026-08-12T15:00:00Z' }), SEPT, -1),
    pipelineContacts: [
      { status: 'meeting', estimatedValue: 40000, interactions: null },
      { status: 'opportunity', estimatedValue: 80000, interactions: [] },
      { status: 'contacted', estimatedValue: 999999, interactions: undefined },
    ],
    gates: [{ title: 'Gate: keep the pre-mortem offer?', dueAt: '2026-09-20T00:00:00Z', status: 'needsHuman' }],
    ...overrides,
  })
}

const allText = (blocks: Block[]) => JSON.stringify(blocks)

/** The runway as `readRunway` returns it, from a stored record. Confirmed 1 Aug by default: stale on 24 Sep. */
function runwayState(stored: StoredPosture = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T00:00:00Z' } }, now = SEPT): MoneyRunway {
  return { summary: describeRunway(stored, now), checkIn: runwayCheckIn(stored, now), resolved: resolveRunwayPosture(stored, now) }
}
const freshRunway = () => runwayState({ runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-20T00:00:00Z' } })
const buttons = (blocks: Block[]) =>
  blocks.flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])]).filter((element) => element.type === 'button')
const labels = (blocks: Block[]) => buttons(blocks).map((button) => button.text.text)
/** Lines on a 40-character phone screen: a rough render, enough to hold "one screen" to account. */
function phoneLines(blocks: Block[]): number {
  const wrap = (text: string) =>
    text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.replace(/<[^|>]*\|([^>]*)>/g, '$1').length / 40)), 0)
  return blocks.reduce((total, block) => {
    if (block.type === 'section') return total + wrap(String(block.text?.text || '')) + (block.accessory ? 1 : 0)
    if (block.type === 'context') return total + wrap(block.elements.map((element: Block) => element.text).join(' '))
    if (block.type === 'actions') return total + Math.ceil(block.elements.length / 2)
    return total + 1
  }, 0)
}
/** Answer anatomy: no header, no divider, and exactly one next action at the end — buttons, or one hint. */
function expectAnswerAnatomy(answer: { text: string; blocks: Block[] }) {
  expectValidSlackBlocks(answer.blocks)
  expect(answer.blocks.some((block) => block.type === 'header' || block.type === 'divider')).toBe(false)
  expect(String(answer.blocks[0].text.text).split('\n')[0]).toBe(answer.text)
  const last = answer.blocks.at(-1)!
  if (last.type === 'actions') {
    expect(last.elements.length).toBeGreaterThan(0)
    expect(answer.blocks.filter((block) => block.type === 'actions')).toHaveLength(1)
  } else {
    expect(last.type).toBe('context')
    expect(last.elements[0].text.match(/`Marqueta, [^`]+`/g)).toHaveLength(1)
  }
  expect(phoneLines(answer.blocks)).toBeLessThanOrEqual(22)
  expect(buttons(answer.blocks).some((button) => button.style === 'primary')).toBe(false)
}

describe('monthKey / monthLabel / monthWindow', () => {
  it('keys a month in UTC, so the last evening of September is September everywhere', () => {
    expect(monthKey(SEPT)).toBe('2026-09')
    // 23:30 in Boston on 30 Sep is already October in UTC — the check runs on
    // Vercel, which is UTC, and the key must agree with it.
    expect(monthKey(new Date('2026-10-01T03:30:00Z'))).toBe('2026-10')
  })

  it('names a month the way a person says it', () => {
    expect(monthLabel('2026-09')).toBe('September 2026')
    expect(monthLabel('2027-01')).toBe('January 2027')
  })

  it('hands back anything that is not a month rather than inventing one', () => {
    expect(monthLabel('garbage')).toBe('garbage')
    expect(monthLabel('2026-13')).toBe('2026-13')
    expect(monthLabel('')).toBe('')
  })

  it('bounds this month and last month in UTC, inclusive start and exclusive end', () => {
    expect(monthWindow(SEPT, 0)).toEqual({ from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' })
    expect(monthWindow(SEPT, -1)).toEqual({ from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' })
  })

  it('crosses the year boundary', () => {
    expect(monthWindow(new Date('2027-01-15T00:00:00Z'), -1)).toEqual({
      from: '2026-12-01T00:00:00.000Z',
      to: '2027-01-01T00:00:00.000Z',
    })
  })

  it('counts a touch on the last second of a month once, in that month', () => {
    const edge = touches(1, { at: '2026-08-31T23:59:59Z' })
    expect(pulse(edge, SEPT, -1).touches).toBe(1)
    expect(pulse(edge, SEPT, 0).touches).toBe(0)
  })
})

describe('strategyReviewDue', () => {
  it('rides the runway clock, so the two money questions arrive together', () => {
    expect(STRATEGY_REVIEW_INTERVAL_DAYS).toBe(RUNWAY_STALE_DAYS)
  })

  it('asks when nobody has ever checked the plan against the money', () => {
    expect(strategyReviewDue(null, SEPT, 'rebuild').due).toBe(true)
    expect(strategyReviewDue(undefined, SEPT, 'rebuild').reason).toMatch(/nobody has checked/i)
    expect(strategyReviewDue({ confirmedAt: 'not a date' }, SEPT, 'rebuild').due).toBe(true)
  })

  it('stays quiet after a recent answer, and says when it will ask again', () => {
    const check = strategyReviewDue(
      { confirmedAt: '2026-09-10T12:00:00Z', confirmedBy: 'Juhan', verdict: 'stillRight', postureAtReview: 'rebuild' },
      SEPT,
      'rebuild',
    )
    expect(check.due).toBe(false)
    expect(check.reason).toBe('Checked on Thu 10 Sep by Juhan; the next check is due Sat 10 Oct, sooner if the runway crosses a line.')
  })

  it('asks again once the answer is as old as the runway stale line', () => {
    const record = { confirmedAt: '2026-08-20T12:00:00Z', postureAtReview: 'rebuild' }
    const justBefore = new Date(Date.parse(record.confirmedAt) + (STRATEGY_REVIEW_INTERVAL_DAYS - 1) * DAY)
    const onTheDay = new Date(Date.parse(record.confirmedAt) + STRATEGY_REVIEW_INTERVAL_DAYS * DAY)
    expect(strategyReviewDue(record, justBefore, 'rebuild').due).toBe(false)
    const due = strategyReviewDue(record, onTheDay, 'rebuild')
    expect(due.due).toBe(true)
    expect(due.reason).toContain('30 days ago')
  })

  it('re-asks the moment the posture changes, however recent the answer', () => {
    // A confirmation holds only for the reality it was given in.
    const check = strategyReviewDue(
      { confirmedAt: '2026-09-23T12:00:00Z', postureAtReview: 'rebuild' },
      SEPT,
      'survival',
    )
    expect(check.due).toBe(true)
    expect(check.reason).toBe(
      'The runway moved us from Rebuild to Survival — the plan you confirmed was set for Rebuild.',
    )
  })

  it('treats a move up as a change too', () => {
    const check = strategyReviewDue({ confirmedAt: '2026-09-23T12:00:00Z', postureAtReview: 'survival' }, SEPT, 'rebuild')
    expect(check.due).toBe(true)
    expect(check.reason).toContain('from Survival to Rebuild')
  })

  it('does not ask while a rethink is already on the board, but does not hide a move either', () => {
    const quiet = strategyReviewDue(null, SEPT, 'rebuild', { openRethink: true })
    expect(quiet.due).toBe(false)
    expect(quiet.reason).toBe('A rethink of the plan is already waiting on This week.')

    const moved = strategyReviewDue(
      { confirmedAt: '2026-09-01T00:00:00Z', postureAtReview: 'stable' },
      SEPT,
      'survival',
      { openRethink: true },
    )
    expect(moved.due).toBe(false)
    expect(moved.reason).toContain('from Stable to Survival')
  })

  it('comes due on the day the runway crosses a line, not a month later', () => {
    // Confirmed on 5 Oct against Rebuild, runway to 11 Jan 2027. The runway
    // itself is fresh and not urgent all week — only the posture moves.
    //
    // The flip is computed, not assumed: 3 months (the Survival line) before
    // 11 Jan 2027 at 30.44 days a month lands at 2026-10-11T16:19:12Z. The
    // spec's dates (not due on the 10th, due on the 13th) straddle it as
    // written, so no adjustment was needed.
    const stored: StoredPosture = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-10-05T12:00:00Z' } }
    const review = { confirmedAt: '2026-10-05T12:00:00Z', verdict: 'stillRight' as const, postureAtReview: 'rebuild' }
    const postureOn = (at: Date) => postureForRunwayMonths(monthsOfRunway(stored.runway!.certainUntil, at)!)

    const tenth = new Date('2026-10-10T12:00:00Z')
    const thirteenth = new Date('2026-10-13T12:00:00Z')
    expect(postureOn(tenth)).toBe('rebuild')
    expect(postureOn(thirteenth)).toBe('survival')
    expect(postureOn(new Date('2026-10-11T16:19:00Z'))).toBe('rebuild')
    expect(postureOn(new Date('2026-10-11T16:20:00Z'))).toBe('survival')

    expect(strategyReviewDue(review, tenth, postureOn(tenth)).due).toBe(false)
    const due = strategyReviewDue(review, thirteenth, postureOn(thirteenth))
    expect(due.due).toBe(true)
    expect(due.reason).toContain('from Rebuild to Survival')

    // And it is the strategy asking, not the runway: that record is still fresh.
    expect(runwayCheckIn(stored, thirteenth).due).toBe(false)
  })
})

describe('summarizePipeline', () => {
  it('counts live conversations and sums only the estimates typed on them', () => {
    const month = pulse([])
    const pipeline = summarizePipeline(
      [
        { status: 'meeting', estimatedValue: 40000, interactions: null },
        { status: 'meeting', interactions: null },
        { status: 'opportunity', estimatedValue: 80000, interactions: null },
        { status: 'contacted', estimatedValue: 500000, interactions: null },
        {
          status: 'won',
          estimatedValue: 120000,
          interactions: [
            { at: '2026-08-02T15:00:00Z', statusAfter: 'opportunity' },
            { at: '2026-09-10T15:00:00Z', statusAfter: 'won', value: 25000 },
          ],
        },
        { status: 'opportunity', estimatedValue: Number.NaN, interactions: null },
        { status: 'opportunity', estimatedValue: -10, interactions: null },
        { status: null, estimatedValue: null, interactions: null },
      ],
      month,
    )
    expect(pipeline).toEqual({
      inMeeting: 2,
      inOpportunity: 3,
      estimatedValue: 120000,
      wonThisMonth: 1,
      wonValueThisMonth: 25000,
    })
  })

  it('takes wins from this month, not from contacts that were won long ago', () => {
    const pipeline = summarizePipeline(
      [{ status: 'won', estimatedValue: 50000, interactions: [{ at: '2026-03-10T15:00:00Z', statusAfter: 'won', value: 50000 }] }],
      pulse([]),
    )
    expect(pipeline.wonThisMonth).toBe(0)
    expect(pipeline.wonValueThisMonth).toBe(0)
  })

  it('survives nothing at all', () => {
    expect(summarizePipeline([], pulse([]))).toEqual({
      inMeeting: 0,
      inOpportunity: 0,
      estimatedValue: 0,
      wonThisMonth: 0,
      wonValueThisMonth: 0,
    })
  })
})

describe('wins are moments a contact BECAME won, not touches with a client already won', () => {
  // Won is absorbing (callLog.ts): every quick log against a won client is
  // written with statusAfter 'won'. The reviewer's scenario, built with the real
  // quick-log builder so the two modules cannot drift apart.
  const wonInAugust: ContactLogContact & { interactions: Record<string, unknown>[] } = {
    _id: 'contact.acme',
    status: 'won',
    closedAt: '2026-08-20T15:00:00Z',
    closedValue: 40000,
    interactions: [
      { _key: 'opp', at: '2026-08-02T15:00:00Z', statusAfter: 'opportunity' },
      { _key: 'win', at: '2026-08-20T15:00:00Z', statusAfter: 'won', value: 40000 },
    ],
  }

  function afterTwoRoutineCalls(): PipelineContact & PulseContact {
    const interested = buildQuickCallLog({
      contact: wonInAugust,
      outcomeKey: 'interested',
      by: 'Juhan',
      now: new Date('2026-09-05T15:00:00Z'),
      key: 'sep-5',
    })
    const meeting = buildQuickCallLog({
      contact: wonInAugust,
      outcomeKey: 'meeting',
      by: 'Juhan',
      now: new Date('2026-09-15T15:00:00Z'),
      key: 'sep-15',
    })
    // The premise: both routine touches really are written as won.
    expect([interested.statusAfter, meeting.statusAfter]).toEqual(['won', 'won'])
    return {
      _id: wonInAugust._id,
      name: 'Jane Doe',
      organization: 'Acme Health',
      status: 'won',
      interactions: [...wonInAugust.interactions, interested.entry, meeting.entry] as PipelineContact['interactions'],
    }
  }

  it('does not count routine calls with an existing client as wins this month', () => {
    const contact = afterTwoRoutineCalls()
    const september = pulse([contact])
    // The pulse agrees: a touch that found the client already won is not a win.
    expect(september.won).toBe(0)
    expect(september.touches).toBe(2)
    const pipeline = summarizePipeline([contact], september)
    expect(pipeline.wonThisMonth).toBe(0)
    expect(pipeline.wonValueThisMonth).toBe(0)
    // And the August win is still counted in August, once.
    expect(summarizePipeline([contact], pulse([contact], SEPT, -1))).toMatchObject({
      wonThisMonth: 1,
      wonValueThisMonth: 40000,
    })
  })

  it('keeps the false win out of every place it used to reach: the card, "runway" and "pipeline"', () => {
    const contact = afterTwoRoutineCalls()
    const snap = snapshot({ thisMonth: pulse([contact]), pipelineContacts: [contact] })
    const card = allText(
      buildMoneyAndDirectionBlocks({ now: SEPT, runway: null, snapshot: snap, strategyDue: { due: true, reason: 'due' } }),
    )
    expect(card).toContain('2 touches this month')
    expect(card).not.toMatch(/\bwins?\b/)
    expect(allText(moneyAnswer({ now: SEPT, runway: runwayState(), snapshot: snap }).blocks)).toContain('Won this month: none')
    expect(moneyAnswerText({ runwaySummary: 'x', pipeline: snap.pipeline })).toContain('Won this month: none')

    for (const answer of [
      answerMrkdwn(pipelineAnswer({ week: snap.thisMonth, snapshot: snap })),
      pipelineAnswerText(snap.thisMonth, snap.thisMonth, snap.pipeline),
    ]) {
      expect(answer).toContain('Won this month: none')
      // The pulse line must not contradict it with its own won-state count.
      expect(answer).not.toMatch(/\d+ won/)
    }
  })

  it('does not bring the runway question back after a routine call', () => {
    const contact = afterTwoRoutineCalls()
    const win = latestWin([contact], SEPT)
    expect(win).toEqual({ at: '2026-08-20T15:00:00Z', label: 'Jane Doe (Acme Health)' })

    // Runway confirmed 1 Sep, after the August win: the two September calls
    // must not reopen the question.
    const stored: StoredPosture = { runway: { certainUntil: '2027-06-01', confirmedAt: '2026-09-01T12:00:00Z' } }
    expect(runwayCheckIn(stored, SEPT, { latestWin: win }).due).toBe(false)
    // Whereas a confirmation from before the win is rightly asked about.
    const older: StoredPosture = { runway: { certainUntil: '2027-06-01', confirmedAt: '2026-08-10T12:00:00Z' } }
    expect(runwayCheckIn(older, new Date('2026-08-25T12:00:00Z'), { latestWin: win }).reason).toMatch(
      /^Jane Doe \(Acme Health\) was marked won on 20 Aug 2026/,
    )
  })

  it('counts a client who was lost and came back as a second win', () => {
    const contact: PipelineContact = {
      status: 'won',
      interactions: [
        { at: '2026-03-01T00:00:00Z', statusAfter: 'won', value: 10000 },
        { at: '2026-06-01T00:00:00Z', statusAfter: 'lost' },
        { at: '2026-09-12T00:00:00Z', statusAfter: 'responded' },
        { at: '2026-09-18T00:00:00Z', statusAfter: 'won', value: 30000 },
        { at: '2026-09-20T00:00:00Z', statusAfter: 'won', value: 30000 },
      ],
    }
    expect(winsInWindow([contact], monthWindow(SEPT, 0))).toEqual({ count: 1, value: 30000 })
    expect(winsInWindow([contact], { from: '2026-01-01', to: '2027-01-01' })).toEqual({ count: 2, value: 40000 })
    expect(latestWin([contact], SEPT)?.at).toBe('2026-09-18T00:00:00Z')
  })

  it('reads the log in date order, and lets an entry with no status neither start nor break a run', () => {
    const contact: PipelineContact = {
      status: 'won',
      interactions: [
        // Appended last, happened first: a backdated log of the original win.
        { at: '2026-09-15T00:00:00Z', statusAfter: 'won' },
        { at: '2026-09-20T00:00:00Z' },
        { at: '2026-09-22T00:00:00Z', statusAfter: '' },
        { at: '2026-09-23T00:00:00Z', statusAfter: 'won' },
        { at: '2026-09-03T00:00:00Z', statusAfter: 'won', value: 15000 },
        { at: 'not a date', statusAfter: 'won', value: 999 },
      ],
    }
    expect(winsInWindow([contact], monthWindow(SEPT, 0))).toEqual({ count: 1, value: 15000 })
    expect(latestWin([contact], SEPT)?.at).toBe('2026-09-03T00:00:00Z')
  })

  it('counts the first logged won entry once when the log starts at won', () => {
    // A status edited to Won with nothing logged has no moment of winning to
    // find; its first won entry stands in for it — once, not per touch.
    const contact: PipelineContact = {
      status: 'won',
      interactions: [
        { at: '2026-09-05T00:00:00Z', statusAfter: 'won' },
        { at: '2026-09-15T00:00:00Z', statusAfter: 'won' },
      ],
    }
    expect(winsInWindow([contact], monthWindow(SEPT, 0)).count).toBe(1)
  })

  it('names a win without ever putting an email address or phone number in the channel', () => {
    const at = '2026-09-10T00:00:00Z'
    const won = (name: string | null, organization: string | null): PipelineContact => ({
      name,
      organization,
      interactions: [{ at, statusAfter: 'won' }],
    })
    expect(latestWin([won('jane.doe@acme.org', 'Acme')], SEPT)?.label).toBe('Acme')
    expect(latestWin([won('Jane Doe', 'call 617-555-0123')], SEPT)?.label).toBe('Jane Doe')
    expect(latestWin([won('jane@acme.org', null)], SEPT)?.label).toBe('')
    expect(latestWin([won('Acme', 'acme')], SEPT)?.label).toBe('Acme')
    // An empty label becomes "A deal" in the runway line, never an address.
    const check = runwayCheckIn(
      { runway: { certainUntil: '2027-06-01', confirmedAt: '2026-09-01T00:00:00Z' } },
      SEPT,
      { latestWin: latestWin([won('jane@acme.org', '')], SEPT) },
    )
    expect(check.reason).toMatch(/^A deal was marked won/)
    expect(check.reason).not.toContain('@')
  })

  it('ignores a win dated in the future, which would otherwise outlast every confirmation', () => {
    const contact: PipelineContact = {
      name: 'Acme',
      interactions: [
        { at: '2026-09-01T00:00:00Z', statusAfter: 'won' },
        { at: '2026-09-02T00:00:00Z', statusAfter: 'lost' },
        { at: '2027-09-01T00:00:00Z', statusAfter: 'won' },
      ],
    }
    expect(latestWin([contact], SEPT)?.at).toBe('2026-09-01T00:00:00Z')
    expect(latestWin([], SEPT)).toBeNull()
    expect(latestWin([{ interactions: null }, { interactions: undefined }], SEPT)).toBeNull()
  })

  it('projects everything the pulse reads, plus what the pipeline and the win label need', () => {
    const fields = (projection: string) =>
      new Set(projection.replace(/"interactions": interactions\[\]/, '').match(/[A-Za-z_]+/g) || [])
    for (const field of fields(PULSE_CONTACT_PROJECTION)) {
      expect(fields(PIPELINE_CONTACT_PROJECTION).has(field)).toBe(true)
    }
    for (const field of ['estimatedValue', 'name', 'organization', 'statusAfter', 'value']) {
      expect(fields(PIPELINE_CONTACT_PROJECTION).has(field)).toBe(true)
    }
  })
})

describe('buildStrategySnapshot', () => {
  it('names the posture and carries the money line as given', () => {
    const snap = snapshot()
    expect(snap.monthKey).toBe('2026-09')
    expect(snap.postureTitle).toBe('Rebuild')
    expect(snap.postureStrategy).toMatch(/outreach still leads/i)
    expect(snap.money).toContain('11 Jan 2027')
    expect(snap.pipeline.inMeeting).toBe(1)
    expect(snap.pipeline.estimatedValue).toBe(120000)
  })

  it('asks about hours when outreach is supposed to lead and barely happened', () => {
    const snap = snapshot({ postureId: 'survival', thisMonth: pulse(touches(2)) })
    expect(snap.question).toBe(
      'Runway says Survival: outreach leads. 2 touches logged this month — is outreach getting the hours it needs?',
    )
    expect(snapshot({ thisMonth: pulse(touches(1)) }).question).toContain('1 touch logged this month')
  })

  it('asks about the mix once outreach is actually happening', () => {
    const busy = snapshot({ thisMonth: pulse([...touches(5), ...touches(1, { statusAfter: 'meeting' })]) })
    expect(busy.question).toContain('Runway says Rebuild')
    expect(busy.question).toContain('6 touches logged this month and 1 meeting booked')
    expect(busy.question).not.toContain('hours it needs')
  })

  it('asks whether the hours matched the posture when outreach is one lever among several', () => {
    const stable = snapshot({ postureId: 'stable', thisMonth: pulse([]) })
    expect(stable.question).toMatch(/^Runway says Stable: a balance/)
    expect(stable.question).toContain('Is that where the hours went this month?')
    expect(snapshot({ postureId: 'growth' }).question).toContain('Runway says Growth')
  })

  it('never calls a month in progress "down"', () => {
    // Only last month's full total exists; on the 24th a lower number is not a
    // trend, it is a month that has six days left.
    const trend = snapshot().trend
    expect(trend).toBe('2 touches logged so far this month (day 24 of 30), against 6 in all of last month.')
    expect(trend).not.toMatch(/down|fell|dropped/i)
  })

  it('calls a direction only when it is already settled', () => {
    expect(snapshot({ thisMonth: pulse(touches(7)) }).trend).toBe(
      '7 touches logged this month — already past last month’s 6.',
    )
    expect(snapshot({ thisMonth: pulse([]), lastMonth: pulse([], SEPT, -1) }).trend).toBe(
      'No outreach logged this month or last.',
    )
    expect(snapshot({ lastMonth: pulse([], SEPT, -1) }).trend).toBe('2 touches logged this month; none last month.')
    expect(snapshot({ lastMonth: null }).trend).toMatch(/nothing to compare against/)
  })

  it('marks open gates past their date as overdue, and closed ones never', () => {
    const snap = snapshot({
      gates: [
        { title: 'Past', dueAt: '2026-09-20T00:00:00Z', status: 'needsHuman' },
        { title: 'Future', dueAt: '2026-10-20T00:00:00Z', status: 'queued' },
        { title: 'Done', dueAt: '2026-09-01T00:00:00Z', status: 'done' },
        { title: 'Undated' },
      ],
    })
    expect(snap.gates.map((gate) => [gate.title, gate.overdue])).toEqual([
      ['Past', true],
      ['Future', false],
      ['Done', false],
      ['Undated', false],
    ])
  })

  it('does not throw on a posture it does not know', () => {
    const snap = snapshot({ postureId: 'mystery' })
    expect(snap.postureTitle).toBe('mystery')
    expect(snap.postureStrategy).toBe('')
    expect(snap.question.length).toBeGreaterThan(0)
  })
})

describe('buildMoneyAndDirectionBlocks', () => {
  const notDue = { due: false, reason: 'Checked on Thu 10 Sep.' }
  const due = { due: true, reason: 'The runway moved us from Rebuild to Survival — the plan you confirmed was set for Rebuild.' }
  const RUNWAY_IDS: string[] = [MARKETING_ACTION.runwayConfirm, MARKETING_ACTION.runwaySigned, MARKETING_ACTION.runwayUpdate]
  const STRATEGY_IDS: string[] = [MARQUETA_ACTION.strategyConfirm, MARQUETA_ACTION.strategyRethink]
  const actionIds = (blocks: Block[]) => buttons(blocks).map((button) => button.action_id)
  /** How many questions the group puts: one per set of answer buttons. */
  const questions = (blocks: Block[]) =>
    [RUNWAY_IDS, STRATEGY_IDS].filter((ids) => actionIds(blocks).some((id) => ids.includes(id))).length

  it('says nothing when neither question is due', () => {
    expect(buildMoneyAndDirectionBlocks({ now: SEPT, runway: freshRunway(), snapshot: snapshot(), strategyDue: notDue })).toEqual([])
  })

  it('asks the runway alone, with the number and its date, and no green button', () => {
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: runwayState(), snapshot: snapshot(), strategyDue: notDue })
    expectValidSlackBlocks(blocks)
    expect(blocks.every((block) => String(block.block_id).startsWith('mq_money'))).toBe(true)
    expect(blocks[0].text.text).toBe(
      '*Money and direction*\nStill 3.5 months of certain runway (to 11 Jan 2027), or has that moved?\n_Last confirmed 54 days ago._',
    )
    expect(labels(blocks)).toEqual([LABEL.RUNWAY_OK, LABEL.RUNWAY_SIGNED, LABEL.RUNWAY_CHANGED])
    expect(buttons(blocks).some((button) => button.style)).toBe(false)
  })

  it('asks ONE question when both are due — the runway — and says the strategy is next', () => {
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: runwayState(), snapshot: snapshot(), strategyDue: due })
    expectValidSlackBlocks(blocks)
    expect(questions(blocks)).toBe(1)
    // "Plan still fits" never sits next to the runway's buttons.
    expect(labels(blocks)).not.toContain(LABEL.PLAN_FITS)
    expect(blocks.at(-1)).toMatchObject({
      type: 'context',
      block_id: 'mq_money_next',
      elements: [{ text: 'Next: whether the plan still fits — I’ll ask once the runway’s confirmed.' }],
    })
  })

  it('asks the strategy question when only it is due: the question, why, the two facts, two answers — none green', () => {
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: freshRunway(), snapshot: snapshot(), strategyDue: due })
    expectValidSlackBlocks(blocks)
    expect(blocks.map((block) => block.block_id)).toEqual(['mq_money_strategy', 'mq_money_strategy_actions'])
    expect(blocks[0].text.text).toBe(
      '*Money and direction*\n' +
        '*Runway says Rebuild: outreach leads. 2 touches logged this month — is outreach getting the hours it needs?*\n' +
        '_The runway moved us from Rebuild to Survival — the plan you confirmed was set for Rebuild._\n' +
        '2 touches this month (6 last month) · 1 in meeting and 1 in opportunity, ~$120,000 estimated',
    )
    const [fits, rethink] = blocks[1].elements
    expect([fits.text.text, fits.action_id]).toEqual([LABEL.PLAN_FITS, MARQUETA_ACTION.strategyConfirm])
    expect([rethink.text.text, rethink.action_id]).toEqual([LABEL.PLAN_RETHINK, MARQUETA_ACTION.strategyRethink])
    expect(buttons(blocks).some((button) => button.style)).toBe(false)
    expect(decodeStrategyValue(fits.value)).toEqual({ monthKey: '2026-09' })
    expect(decodeStrategyValue(rethink.value)).toEqual({ monthKey: '2026-09' })
  })

  it('asks about a disagreement only while the hand-set posture is winning', () => {
    // Set by hand after the runway was confirmed: the plan is following the setting, not the date.
    const manual = runwayState({ posture: 'survival', setAt: '2026-09-22T00:00:00Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-20T00:00:00Z' } })
    expect(manual.resolved.source).toBe('manual')
    const asked = buildMoneyAndDirectionBlocks({ now: SEPT, runway: manual, snapshot: snapshot(), strategyDue: notDue })
    expect(allText(asked)).toContain('but the posture is set to Survival')
    expect(questions(asked)).toBe(1)
    // Confirmed after the setting: the date already wins, so nothing to ask on Monday.
    const settled = runwayState({ posture: 'survival', setAt: '2026-09-18T00:00:00Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-20T00:00:00Z' } })
    expect(settled.resolved.source).toBe('runway')
    expect(buildMoneyAndDirectionBlocks({ now: SEPT, runway: settled, snapshot: snapshot(), strategyDue: notDue })).toEqual([])
  })

  it('asks no question it cannot read the number for, and the strategy alone without a runway', () => {
    expect(buildMoneyAndDirectionBlocks({ now: SEPT, runway: null, snapshot: null, strategyDue: due })).toEqual([])
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: null, snapshot: snapshot(), strategyDue: due })
    expect(questions(blocks)).toBe(1)
    expect(actionIds(blocks)).toEqual(STRATEGY_IDS)
  })

  it('stays valid, and inert, with hostile and enormous record text', () => {
    const hostile = snapshot({
      runwaySummary: `${HOSTILE} ${HUGE}`,
      gates: [{ title: `${HOSTILE}${HUGE}`, dueAt: '2026-09-01T00:00:00Z' }, { title: HOSTILE }, { title: HUGE }, { title: 'fourth' }],
    })
    const winRunway: MoneyRunway = {
      ...freshRunway(),
      checkIn: runwayCheckIn(
        { runway: { certainUntil: '2027-06-01', confirmedAt: '2026-09-01T00:00:00Z' } },
        SEPT,
        { latestWin: { at: '2026-09-20T00:00:00Z', label: `${HOSTILE} ${HUGE}` } },
      ),
    }
    for (const runway of [freshRunway(), runwayState(), winRunway, null]) {
      for (const receipt of [undefined, { kind: 'runwaySigned' as const, who: HOSTILE, label: `${HOSTILE}${HUGE}` }]) {
        const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway, snapshot: hostile, strategyDue: { due: true, reason: `${HOSTILE} ${HUGE}` }, receipt })
        expectValidSlackBlocks(blocks)
        const text = allText(blocks)
        expect(text).not.toContain('<!here>')
        expect(text).not.toContain('<@U123>')
        expect(text).not.toContain('<https://evil')
      }
    }
  })
})

describe('money receipts — what a press leaves where its question was', () => {
  const RUNWAY_DUE = runwayState()
  const due = { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }

  it('a confirmed runway: who, when, the number now — with It changed… — and the strategy question next', () => {
    // After the press the record reads fresh, so the check-in is no longer due.
    const blocks = buildMoneyAndDirectionBlocks({
      now: SEPT,
      runway: freshRunway(),
      snapshot: snapshot(),
      strategyDue: due,
      receipt: { kind: 'runwayConfirmed', who: '<@U1>' },
    })
    expectValidSlackBlocks(blocks)
    expect(blocks[0]).toMatchObject({ block_id: 'mq_money_receipt' })
    expect(blocks[0].text.text).toBe(':white_check_mark: Runway confirmed by <@U1> · Thu 24 Sep — 3.5 months (to 11 Jan 2027).')
    expect(blocks[1].elements.map((element: Block) => [element.text.text, element.action_id])).toEqual([
      [LABEL.RUNWAY_CHANGED, MARKETING_ACTION.runwayUpdate],
    ])
    // The strategy question follows in the same redraw, without the group heading.
    expect(blocks[2].block_id).toBe('mq_money_strategy')
    expect(blocks[2].text.text).not.toContain('Money and direction')
    expect(labels(blocks)).toEqual([LABEL.RUNWAY_CHANGED, LABEL.PLAN_FITS, LABEL.PLAN_RETHINK])
    expect(blocks.every((block) => String(block.block_id).startsWith('mq_money'))).toBe(true)
  })

  it('never asks the runway again straight after it was answered', () => {
    // Even if the re-read still says due (a stale read, a disagreement), the answer just given stands.
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: RUNWAY_DUE, receipt: { kind: 'runwayUpdated', who: 'Juhan & *co*' } })
    // A name that is not a mention is escaped and kept out of the formatting around it.
    expect(blocks[0].text.text).toBe(':white_check_mark: Runway updated by Juhan &amp; co · Thu 24 Sep — now 3.5 months (to 11 Jan 2027).')
    expect(labels(blocks)).toEqual([LABEL.RUNWAY_CHANGED])
  })

  it('signed work says what was signed and where the runway now reaches', () => {
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: freshRunway(), receipt: { kind: 'runwaySigned', who: '<@U2>', label: 'SoW — Acme' } })
    expect(blocks[0].text.text).toBe(
      ':white_check_mark: Signed work recorded by <@U2> · Thu 24 Sep (SoW — Acme) — runway now 3.5 months (to 11 Jan 2027).',
    )
  })

  it('a confirmed plan says when it will ask again, with nothing to press', () => {
    const blocks = buildMoneyAndDirectionBlocks({
      now: SEPT,
      runway: freshRunway(),
      snapshot: snapshot(),
      strategyDue: due,
      receipt: { kind: 'planConfirmed', who: '<@U1>', monthKey: '2026-09' },
    })
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text.text).toBe(':white_check_mark: Plan confirmed for September by <@U1> — I’ll ask again in October.')
  })

  it('a rethink says it is a decision on This week, suggested to the person who asked, and links to it', () => {
    const blocks = buildMoneyAndDirectionBlocks({
      now: SEPT,
      runway: freshRunway(),
      receipt: { kind: 'rethink', who: '<@U1>', suggestedTo: 'Juhan', decisionTaskId: 'marketingOperation.rethink' },
      studioBaseUrl: 'https://www.goinvo.com',
    })
    expectValidSlackBlocks(blocks)
    expect(blocks[0].text.text).toBe('<@U1> asked for a rethink — it’s a decision on This week, suggested to Juhan.')
    expect(blocks[1].elements[0]).toMatchObject({
      text: { text: 'Open This week' },
      url: 'https://www.goinvo.com/studio/marketing?view=thisWeek&task=marketingOperation.rethink',
    })
    const joined = buildMoneyAndDirectionBlocks({ now: SEPT, runway: null, receipt: { kind: 'rethink', who: '<@U2>', joined: true } })
    expect(joined[0].text.text).toBe('<@U2> asked for a rethink too — it’s already a decision on This week.')
    // No Studio, no link — never a button Slack would refuse.
    expect(joined).toHaveLength(1)
  })

  it('still says what happened when the numbers could not be read back', () => {
    const blocks = buildMoneyAndDirectionBlocks({ now: SEPT, runway: null, receipt: { kind: 'runwayConfirmed', who: '<@U1>' } })
    expect(blocks[0].text.text).toBe(':white_check_mark: Runway confirmed by <@U1> · Thu 24 Sep.')
  })

  it('redraws in place: only the money group changes, everything else is the very same block', () => {
    const header = { type: 'header', text: { type: 'plain_text', text: 'Monday plan' } }
    const footer = { type: 'actions', block_id: 'mq_footer', elements: [{ type: 'button', action_id: 'x', text: { type: 'plain_text', text: 'x' } }] }
    const before = [header, { type: 'divider' }, ...buildMoneyAndDirectionBlocks({ now: SEPT, runway: RUNWAY_DUE, snapshot: snapshot(), strategyDue: due }), footer]
    const after = replaceBlocksByPrefix(
      before,
      'mq_money',
      buildMoneyAndDirectionBlocks({ now: SEPT, runway: freshRunway(), snapshot: snapshot(), strategyDue: due, receipt: { kind: 'runwayConfirmed', who: '<@U1>' } }),
    )
    expectValidSlackBlocks(after)
    expect(after[0]).toBe(header)
    expect(after.at(-1)).toBe(footer)
    expect(allText(after)).toContain('Runway confirmed by <@U1>')
    expect(allText(after)).not.toContain(MARKETING_ACTION.runwayConfirm)
  })
})

describe('answers — moneyAnswer, strategyAnswer, pipelineAnswer', () => {
  const week = summarizeOutreach(touches(3, { by: 'Eric Benoit', at: '2026-09-22T12:00:00Z' }), {
    from: '2026-09-21T00:00:00Z',
    to: '2026-09-28T00:00:00Z',
    now: SEPT,
  })

  it('"runway": the number first, the pipeline, and the check-in’s own buttons when one is due', () => {
    const answer = moneyAnswer({ now: SEPT, runway: runwayState(), snapshot: snapshot() })
    expectAnswerAnatomy(answer)
    expect(answer.text).toBe('*Runway* — 3.5 months of certain runway, to 11 Jan 2027 (Rebuild)')
    expect(answer.blocks[0].text.text).toContain('Pipeline: 2 in meeting/opportunity, ~$120,000 estimated · Won this month: none')
    expect(labels(answer.blocks)).toEqual([LABEL.RUNWAY_OK, LABEL.RUNWAY_SIGNED, LABEL.RUNWAY_CHANGED])
    // The question carries the group's id, so a press redraws it in place.
    expect(answer.blocks.map((block) => block.block_id)).toEqual([undefined, 'mq_money_runway', 'mq_money_runway_actions'])
    expect(allText(answer.blocks)).not.toContain('next digest')
  })

  it('"runway" with nothing due ends on the next question worth asking', () => {
    const answer = moneyAnswer({ now: SEPT, runway: freshRunway(), snapshot: snapshot() })
    expectAnswerAnatomy(answer)
    expect(answer.blocks.at(-1)!.elements[0].text).toBe('`Marqueta, pipeline` for who’s in play')
    expect(buttons(answer.blocks)).toHaveLength(0)
  })

  it('"runway" with none recorded says so rather than inventing a number', () => {
    const answer = moneyAnswer({ now: SEPT, runway: runwayState({}), snapshot: snapshot() })
    expectAnswerAnatomy(answer)
    expect(answer.text).toBe('*Runway* — none recorded, so the plan assumes Survival')
  })

  it('"strategy": the question first, then the facts, then the two answers when the check is due', () => {
    const answer = strategyAnswer({ now: SEPT, snapshot: snapshot(), due: { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }, runway: runwayState() })
    expectAnswerAnatomy(answer)
    expect(answer.text).toBe(
      '*Runway says Rebuild: outreach leads. 2 touches logged this month — is outreach getting the hours it needs?*',
    )
    const text = answer.blocks[0].text.text
    expect(text).toContain('Runway: 3.5 months of certain runway, to 11 Jan 2027 (Rebuild)')
    expect(text).toContain('Pipeline: 2 in meeting/opportunity')
    // Midnight UTC on the 20th is the evening of the 19th in Boston, where the studio reads it.
    expect(text).toContain('Decision gates: Gate: keep the pre-mortem offer? — overdue since Sat 19 Sep')
    expect(labels(answer.blocks)).toEqual([LABEL.PLAN_FITS, LABEL.PLAN_RETHINK])
    expect(answer.blocks.map((block) => block.block_id)).toEqual(['mq_money_strategy', 'mq_money_strategy_actions'])
    expect(allText(answer.blocks)).not.toContain('next digest')
  })

  it('"strategy" when it is not due says when it will be, and ends on a hint', () => {
    const answer = strategyAnswer({ now: SEPT, snapshot: snapshot(), due: { due: false, reason: 'Checked on Thu 10 Sep by Juhan.' } })
    expectAnswerAnatomy(answer)
    expect(buttons(answer.blocks)).toHaveLength(0)
    expect(answer.blocks[0].text.text).toContain('_Checked on Thu 10 Sep by Juhan._')
  })

  it('"pipeline": what is live first, counts only — never who logged what — and where to go next', () => {
    const month = pulse(touches(4, { by: 'Eric Benoit', at: '2026-09-22T12:00:00Z' }))
    const answer = pipelineAnswer({
      week,
      snapshot: { thisMonth: month, pipeline: summarizePipeline([{ status: 'opportunity', estimatedValue: 5000, interactions: null }], month) },
    })
    expectAnswerAnatomy(answer)
    expect(answer.text).toBe('*Pipeline* — 1 in meeting/opportunity, ~$5,000 estimated')
    const text = answer.blocks[0].text.text
    expect(text).toContain('Outreach this week: 3 touches')
    expect(text).toContain('This month: 4 touches')
    expect(text).toContain('Won this month: none')
    expect(text).not.toContain('Eric')
    expect(answer.blocks.at(-1)!.elements[0].text).toBe('`Marqueta, my calls` shows who to ring')
  })

  it('keeps every answer inside one screen and escapes everything it is handed', () => {
    const hostile = snapshot({ runwaySummary: `${HOSTILE}${HUGE}`, gates: [{ title: `${HOSTILE}${HUGE}` }] })
    const answers = [
      strategyAnswer({ now: SEPT, snapshot: hostile, due: { due: true, reason: `${HOSTILE}` } }),
      moneyAnswer({ now: SEPT, runway: { ...runwayState(), resolved: { ...runwayState().resolved, disagreement: HOSTILE } }, snapshot: hostile }),
      pipelineAnswer({ week, snapshot: hostile }),
    ]
    for (const answer of answers) {
      expectValidSlackBlocks(answer.blocks)
      const text = allText(answer.blocks)
      expect(text).not.toContain('<!here>')
      expect(text).not.toContain('<@U123>')
      expect(text).not.toContain('<https://evil')
    }
  })

  it('answerMrkdwn joins an answer’s sections, for a caller that can only post text', () => {
    const answer = strategyAnswer({ now: SEPT, snapshot: snapshot(), due: { due: true, reason: 'r' } })
    expect(answerMrkdwn(answer)).toBe(answer.blocks[0].text.text)
  })
})

describe('legacy answer texts (kept until the conversation code moves to the answers above)', () => {
  it('answers "strategy" with the facts and the question, and says when it will ask', () => {
    const due = { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }
    const text = strategyAnswerText(snapshot(), due)
    expect(text).toContain('*Strategy — September 2026*')
    expect(text).toContain('Money: 3.5 months')
    expect(text).toContain('Plan for *Rebuild*')
    expect(text).toContain('Pipeline: 2 in meeting/opportunity')
    expect(text).toContain('is outreach getting the hours it needs?')
    expect(text).toContain('I will ask on the next digest.')
    expect(strategyAnswerText(snapshot(), { due: false, reason: 'Checked on 10 Sep 2026.' })).not.toContain('next digest')
  })

  it('answers "runway" with the runway, any disagreement, the check-in and the pipeline', () => {
    const text = moneyAnswerText({
      runwaySummary: '3.5 months of certain runway (to 11 Jan 2027) — Rebuild.',
      disagreement: 'The runway date works out to 3.5 months (Rebuild), but the posture is set to Survival.',
      checkInLine: 'AT&T was marked won on 20 Sep 2026 — did it extend the runway?',
      pipeline: { inMeeting: 1, inOpportunity: 2, estimatedValue: 1234567.4, wonThisMonth: 1, wonValueThisMonth: 40000 },
    })
    expect(text).toContain('*Runway* 3.5 months')
    expect(text).toContain('_The runway date works out')
    expect(text).toContain('AT&amp;T was marked won')
    expect(text).toContain('Pipeline: 3 in meeting/opportunity, ~$1,234,567 estimated · Won this month: 1 ($40,000)')
  })

  it('says zeros plainly instead of pretending to a value', () => {
    const empty = { inMeeting: 0, inOpportunity: 0, estimatedValue: 0, wonThisMonth: 0, wonValueThisMonth: 0 }
    const text = moneyAnswerText({ runwaySummary: '', pipeline: empty })
    expect(text).toContain('No runway recorded.')
    expect(text).toContain('Pipeline: nothing in meeting or opportunity yet · Won this month: none')
    expect(text).not.toContain('$0')

    const unestimated = moneyAnswerText({
      runwaySummary: 'x',
      pipeline: { ...empty, inMeeting: 2, wonThisMonth: 1 },
    })
    expect(unestimated).toContain('2 in meeting/opportunity, no value estimated yet · Won this month: 1')
    expect(unestimated).not.toContain('$')
  })

  it('answers "pipeline" with counts and never a leaderboard', () => {
    const week = summarizeOutreach(touches(3, { by: 'Eric Benoit', at: '2026-09-22T12:00:00Z' }), {
      from: '2026-09-21T00:00:00Z',
      to: '2026-09-28T00:00:00Z',
      now: SEPT,
    })
    const month = pulse(touches(4, { by: 'Eric Benoit', at: '2026-09-22T12:00:00Z' }))
    const text = pipelineAnswerText(
      week,
      month,
      summarizePipeline([{ status: 'opportunity', estimatedValue: 5000, interactions: null }], month),
    )
    expect(text).toContain('*Pipeline*')
    expect(text).toContain('Outreach this week: 3 touches')
    expect(text).toContain('This month: 4 touches')
    expect(text).toContain('~$5,000 estimated')
    expect(text).not.toContain('Eric')
  })

  it('keeps every answer inside one Slack section and escapes everything it is handed', () => {
    const hostile = snapshot({ runwaySummary: `${HOSTILE}${HUGE}`, gates: [{ title: `${HOSTILE}${HUGE}` }] })
    const answers = [
      strategyAnswerText(hostile, { due: true, reason: `${HOSTILE}${HUGE}` }),
      moneyAnswerText({
        runwaySummary: `${HOSTILE}${HUGE}`,
        disagreement: `${HOSTILE}${HUGE}`,
        checkInLine: `${HOSTILE}${HUGE}`,
        pipeline: hostile.pipeline,
      }),
      pipelineAnswerText(hostile.thisMonth, hostile.thisMonth, hostile.pipeline),
    ]
    for (const text of answers) {
      expect(text.length).toBeLessThanOrEqual(3000)
      expect(text).not.toContain('<!here>')
      expect(text).not.toContain('<@U123>')
      expectValidSlackBlocks([{ type: 'section', text: { type: 'mrkdwn', text } }])
    }
  })
})

describe('buildStrategyDecisionOperation', () => {
  const now = new Date('2026-10-05T14:00:00Z')

  it('files one board decision per month, suggested to the person who asked', () => {
    const raw = buildStrategyDecisionOperation({
      monthKey: '2026-10',
      personName: 'Juhan',
      now,
      priorReview: null,
      question: 'Runway says Survival: outreach leads. 2 touches logged this month — is outreach getting the hours it needs?',
    })
    const op = normalizeMarketingOperationInput(raw)
    expect(op._id).toBe(marketingOperationDocumentId('strategy-review/2026-10'))
    expect(op.sourceKey).toBe('strategy-review/2026-10')
    expect(op.title).toBe('Rethink the marketing plan (October 2026)')
    expect(op.kind).toBe('decision')
    expect(op.status).toBe('needsHuman')
    expect(op.priority).toBe('urgent')
    expect(op.origin).toBe('manual')
    expect(op.autonomy).toBe('humanReview')
    // This week, where a decision can be answered — never the Strategy tab's Q&A.
    expect(op.targetView).toBe('thisWeek')
    expect(op.humanQuestion).toBe(
      'What should change about the plan, given the runway and how outreach is going?',
    )
    expect(op.whyNow).toContain('is outreach getting the hours it needs?')
    expect(op.dueAt).toBe('2026-10-12T14:00:00.000Z')
    expect(op.lastEvaluatedAt).toBe('2026-10-05T14:00:00.000Z')
    expect(op.activity).toHaveLength(1)
    expect(op.activity?.[0].actor).toBe('person')
  })

  it('suggests, never assigns — pressing "rethink" is not volunteering to rewrite the plan', () => {
    const raw = buildStrategyDecisionOperation({ monthKey: '2026-10', personName: 'Juhan', now, priorReview: null })
    expect(raw.suggestedOwner).toBe('Juhan')
    expect(raw).not.toHaveProperty('ownerName')
    const op = normalizeMarketingOperationInput(raw)
    expect(op.suggestedOwner).toBe('Juhan')
    expect(op.ownerName).toBe('')
  })

  it('is the same document however many times the button is pressed', () => {
    const first = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({ monthKey: '2026-10', personName: 'Juhan', now, priorReview: null }),
    )
    const retry = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({
        monthKey: '2026-10',
        personName: 'Eric',
        now: new Date(now.getTime() + 60_000),
        priorReview: null,
      }),
    )
    expect(retry._id).toBe(first._id)
    const nextMonth = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({ monthKey: '2026-11', personName: 'Juhan', now, priorReview: null }),
    )
    expect(nextMonth._id).not.toBe(first._id)
  })

  it('files a NEW decision when the check comes due again in the same month after the first was settled', () => {
    // 5 Oct: rethink filed (last answer was September's). 8 Oct: decided and
    // closed. 13 Oct: the runway crosses into Survival, the check is due again,
    // and somebody presses "Needs a rethink". Keyed by month alone, that press
    // named the closed decision, createIfNotExists did nothing, and the board
    // showed no rethink at all.
    const september: StrategyReviewRecord = {
      confirmedAt: '2026-09-07T13:00:00Z',
      confirmedBy: 'Eric',
      verdict: 'stillRight',
      monthKey: '2026-09',
      postureAtReview: 'rebuild',
    }
    const first = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({ monthKey: '2026-10', personName: 'Juhan', now, priorReview: september }),
    )
    // What the 5 Oct press recorded, and what the 13 Oct press reads first.
    const fifth: StrategyReviewRecord = {
      confirmedAt: now.toISOString(),
      confirmedBy: 'Juhan',
      verdict: 'rethink',
      monthKey: '2026-10',
      postureAtReview: 'rebuild',
    }
    // It really is due again on the 13th — this is not a contrived press.
    const thirteenth = new Date('2026-10-13T12:00:00Z')
    expect(strategyReviewDue(fifth, thirteenth, 'survival')).toMatchObject({ due: true })

    const second = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({ monthKey: '2026-10', personName: 'Eric', now: thirteenth, priorReview: fifth }),
    )
    expect(second._id).not.toBe(first._id)
    expect(second.sourceKey).toMatch(/^strategy-review\/2026-10\//)
    // B2 finds open rethinks by prefix; every key must still match it.
    for (const op of [first, second]) expect(op.sourceKey.startsWith('strategy-review/')).toBe(true)
    // And it says why it is not a duplicate of the one that was settled.
    // In the day Slack prints everywhere else — never an always-on year.
    expect(second.summary).toContain('The last answer was “needs a rethink”, on Mon 5 Oct by Juhan.')
    expect(second.summary).not.toMatch(/on \w+ \d+ \w+ 2026/)
  })

  it('keeps a double press on the same card to one decision', () => {
    // Both presses read the review record before either writes, so both name
    // the same check — and the same _id.
    const prior: StrategyReviewRecord = { confirmedAt: '2026-09-07T13:00:00Z', verdict: 'stillRight' }
    const a = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({ monthKey: '2026-10', personName: 'Juhan', now, priorReview: prior }),
    )
    const b = normalizeMarketingOperationInput(
      buildStrategyDecisionOperation({
        monthKey: '2026-10',
        personName: 'Eric',
        now: new Date(now.getTime() + 5_000),
        // The same instant, written differently, is the same answer.
        priorReview: { confirmedAt: '2026-09-07T13:00:00.000Z', verdict: 'stillRight' },
      }),
    )
    expect(b._id).toBe(a._id)
  })

  it('keys the first ever rethink by month, and never by an answer it cannot read', () => {
    expect(strategyReviewSourceKey('2026-10', null)).toBe('strategy-review/2026-10')
    expect(strategyReviewSourceKey('2026-10', undefined)).toBe('strategy-review/2026-10')
    expect(strategyReviewSourceKey('2026-10', { confirmedAt: 'garbage' })).toBe('strategy-review/2026-10')
    expect(strategyReviewSourceKey('2026-10', { confirmedAt: '2026-10-05T14:00:00Z' })).toBe(
      'strategy-review/2026-10/after-20261005T140000000Z',
    )
    // A verdict the record should not hold is left unsaid.
    const odd = buildStrategyDecisionOperation({
      monthKey: '2026-10',
      personName: 'Juhan',
      now,
      priorReview: { confirmedAt: '2026-10-01T00:00:00Z', verdict: 'maybe' as never },
    })
    expect(odd.summary).not.toContain('last answer')
  })

  it('still reads sensibly without a question or a name', () => {
    const op = normalizeMarketingOperationInput(buildStrategyDecisionOperation({ monthKey: '2026-10', personName: '', now, priorReview: null }))
    expect(op.whyNow?.length).toBeGreaterThan(0)
    expect(op.suggestedOwner).toBe('')
    expect(op.summary).toMatch(/^Someone said/)
  })
})
