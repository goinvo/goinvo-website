import { describe, expect, it } from 'vitest'

import { describePulse, summarizeOutreach, type PulseContact } from '@/lib/marketing/outreachPulse'
import {
  decodeCallLogMetadata,
  decodeCallLogUndo,
  decodeContactRef,
  decodeStrategyValue,
  decodeTaskStuckMetadata,
  encodeCallLogMetadata,
  encodeCallLogUndo,
  encodeContactRef,
  encodeStrategyValue,
  encodeTaskStuckMetadata,
  isMarquetaAction,
  MARQUETA_ACTION,
} from '@/lib/marketing/marquetaActions'
import { isMarketingAction, MARKETING_ACTION } from '@/lib/marketing/slackDelegation'

const NOW = new Date('2026-09-24T15:00:00Z')
const WEEK = { from: '2026-09-21T00:00:00Z', to: '2026-09-28T00:00:00Z', now: NOW }

const contact = (overrides: Partial<PulseContact> = {}): PulseContact => ({
  _id: 'c1',
  status: 'contacted',
  interactions: [],
  ...overrides,
})

describe('summarizeOutreach', () => {
  it('counts only touches inside the window', () => {
    const pulse = summarizeOutreach(
      [
        contact({
          interactions: [
            { at: '2026-09-20T23:59:59Z', by: 'Juhan', channel: 'phone' }, // the Sunday before
            { at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' },
            { at: '2026-09-28T00:00:00Z', by: 'Juhan', channel: 'phone' }, // end is exclusive
          ],
        }),
      ],
      WEEK,
    )
    expect(pulse.touches).toBe(1)
    expect(pulse.calls).toBe(1)
    expect(pulse.people).toBe(1)
  })

  it('reads progress from where the contact stood after the touch', () => {
    const pulse = summarizeOutreach(
      [
        contact({
          _id: 'a',
          interactions: [
            { at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'email', statusAfter: 'responded' },
            { at: '2026-09-23T10:00:00Z', by: 'Juhan', channel: 'video', statusAfter: 'meeting' },
          ],
        }),
        contact({
          _id: 'b',
          interactions: [{ at: '2026-09-23T12:00:00Z', by: 'Eric', channel: 'phone', statusAfter: 'won', value: 40000 }],
        }),
      ],
      WEEK,
    )
    expect(pulse).toMatchObject({ touches: 3, people: 2, emails: 1, calls: 1, replies: 1, meetings: 1, won: 1, wonValue: 40000 })
    expect(pulse.byPerson).toEqual([
      { name: 'Juhan', touches: 2 },
      { name: 'Eric', touches: 1 },
    ])
  })

  it('counts progress as a move into a state, not a touch that found them there', () => {
    const pulse = summarizeOutreach(
      [
        contact({
          interactions: [
            // Booked last week, so this week's voicemail is not a new meeting.
            { at: '2026-09-15T10:00:00Z', by: 'Juhan', channel: 'video', statusAfter: 'meeting' },
            { at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'meeting' },
          ],
        }),
        contact({
          _id: 'client',
          interactions: [
            { at: '2026-09-23T10:00:00Z', by: 'Eric', channel: 'phone', statusAfter: 'won', value: 1 },
            { at: '2026-09-24T10:00:00Z', by: 'Eric', channel: 'phone', statusAfter: 'won', value: 1 },
          ],
        }),
      ],
      WEEK,
    )
    expect(pulse).toMatchObject({ touches: 3, meetings: 0, won: 1, wonValue: 1 })
  })

  it('reads the order from the timestamps, not the array', () => {
    const pulse = summarizeOutreach(
      [
        contact({
          interactions: [
            { at: '2026-09-23T10:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'responded' },
            { at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' },
          ],
        }),
      ],
      WEEK,
    )
    expect(pulse.replies).toBe(1)
  })

  it('treats follow-ups as a state as of now, not an event in the window', () => {
    const pulse = summarizeOutreach(
      [
        contact({ _id: 'overdue', status: 'contacted', followUpAt: '2026-08-01T00:00:00Z' }),
        contact({ _id: 'later-this-week', status: 'responded', followUpAt: '2026-09-26T00:00:00Z' }),
        contact({ _id: 'next-month', status: 'meeting', followUpAt: '2026-10-20T00:00:00Z' }),
        // A closed contact with a stale date is not a follow-up anybody owes.
        contact({ _id: 'closed', status: 'won', followUpAt: '2026-08-01T00:00:00Z' }),
      ],
      WEEK,
    )
    expect(pulse.followUpsDue).toBe(2)
    expect(pulse.followUpsOverdue).toBe(1)
  })

  it('survives junk rather than throwing', () => {
    const pulse = summarizeOutreach(
      [
        { _id: 'x', interactions: null },
        { _id: 'y', interactions: [{ at: 'not a date' }, { at: null }] },
      ],
      WEEK,
    )
    expect(pulse.touches).toBe(0)
  })
})

describe('describePulse', () => {
  it('says plainly when nothing was logged', () => {
    const pulse = summarizeOutreach([], WEEK)
    expect(describePulse(pulse)).toBe('This week: no outreach logged yet.')
  })

  it('mentions waiting follow-ups even in an empty week', () => {
    const pulse = summarizeOutreach([contact({ followUpAt: '2026-09-01T00:00:00Z' })], WEEK)
    expect(describePulse(pulse)).toContain('1 follow-up waiting, 1 overdue')
  })

  // Due is counted to the window's end, overdue to now. Last week's window,
  // read at 9am on Monday, ends before now — and a follow-up set for that
  // Monday is overdue without being due, which printed "1 due (3 overdue)".
  it('never says more follow-ups are overdue than are due', () => {
    const lastWeek = { from: '2026-09-21T00:00:00Z', to: '2026-09-28T00:00:00Z', now: new Date('2026-09-28T13:00:00Z') }
    const pulse = summarizeOutreach(
      [
        contact({ _id: 'fri', followUpAt: '2026-09-25T12:00:00Z', interactions: [{ at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'phone' }] }),
        contact({ _id: 'mon1', followUpAt: '2026-09-28T12:00:00Z' }),
        contact({ _id: 'mon2', followUpAt: '2026-09-28T12:00:00Z' }),
      ],
      lastWeek,
    )
    expect(pulse.followUpsOverdue).toBeGreaterThan(pulse.followUpsDue)
    expect(describePulse(pulse, 'Outreach')).toBe('Outreach: 1 touch (1 person) · 1 follow-up due (1 overdue).')
    expect(describePulse({ ...pulse, touches: 0 }, 'Outreach')).toBe('Outreach: no outreach logged yet. 1 follow-up waiting, 1 overdue.')
  })

  it('names the numbers that matter', () => {
    const pulse = summarizeOutreach(
      [
        contact({
          interactions: [
            { at: '2026-09-22T10:00:00Z', by: 'Juhan', channel: 'phone' },
            { at: '2026-09-23T10:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'meeting' },
          ],
        }),
      ],
      WEEK,
    )
    expect(describePulse(pulse, 'So far')).toBe('So far: 2 touches (1 person) · 1 meeting booked.')
  })
})

describe('marquetaActions', () => {
  it('never collides with the digest actions the catch-all handles', () => {
    // The interactions route treats any unrecognised MARKETING_ACTION as
    // "hand this task back". An overlap would decline somebody's task.
    for (const id of Object.values(MARQUETA_ACTION)) {
      expect(isMarketingAction(id), id).toBe(false)
      expect(isMarquetaAction(id), id).toBe(true)
    }
    for (const id of Object.values(MARKETING_ACTION)) expect(isMarquetaAction(id), id).toBe(false)
  })

  it('round-trips what the buttons and modals carry', () => {
    expect(decodeContactRef(encodeContactRef({ contactId: 'contact-1', organization: 'MGB' }))).toEqual({
      contactId: 'contact-1',
      organization: 'MGB',
      name: '',
      role: '',
      note: '',
      outcome: '',
    })
    // Somebody not on file yet: the name alone is enough to add them.
    expect(
      decodeContactRef(encodeContactRef({ name: 'Sam Rivera', role: 'CMIO', note: 'left a voicemail', outcome: 'voicemail' })),
    ).toMatchObject({ contactId: '', name: 'Sam Rivera', role: 'CMIO', note: 'left a voicemail', outcome: 'voicemail' })
    expect(
      decodeCallLogUndo(
        encodeCallLogUndo({
          contactId: 'contact-1',
          interactionKey: 'slack-abc',
          prior: { status: 'researched', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
        }),
      ),
    ).toEqual({
      contactId: 'contact-1',
      interactionKey: 'slack-abc',
      prior: { status: 'researched', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
    })
    expect(
      decodeCallLogMetadata(encodeCallLogMetadata({ contactId: 'contact-1', channel: 'C1', threadTs: '1.2' })),
    ).toEqual({ contactId: 'contact-1', channel: 'C1', threadTs: '1.2' })
    expect(
      decodeTaskStuckMetadata(
        encodeTaskStuckMetadata({ taskId: 'marketingOperation.x', channel: 'C1', threadTs: '1.0', messageTs: '3.4' }),
      ),
    ).toEqual({ taskId: 'marketingOperation.x', channel: 'C1', threadTs: '1.0', messageTs: '3.4' })
    expect(decodeStrategyValue(encodeStrategyValue('2026-09'))).toEqual({ monthKey: '2026-09' })
  })

  it('returns null for junk, and for a reference that names nobody', () => {
    expect(decodeContactRef('not json')).toBeNull()
    expect(decodeContactRef(encodeContactRef({}))).toBeNull()
    expect(decodeCallLogMetadata('[]')).toBeNull()
    expect(decodeTaskStuckMetadata(undefined)).toBeNull()
    expect(decodeStrategyValue(JSON.stringify({ m: 'soon' }))).toBeNull()
  })

  it('stays inside Slack’s value cap even when JSON escaping inflates the text', () => {
    // Newlines double and control characters grow sixfold once encoded.
    const inflated = encodeContactRef({ contactId: 'c1', organization: 'MGB', note: '\n'.repeat(1200) + '\u0001'.repeat(1200) })
    expect(inflated.length).toBeLessThanOrEqual(1900)
    expect(decodeContactRef(inflated)?.contactId).toBe('c1')
  })

  it('stays inside Slack’s value cap however long the input', () => {
    const huge = 'x'.repeat(5000)
    expect(
      encodeContactRef({ contactId: huge, organization: huge, name: huge, role: huge, note: huge, outcome: huge }).length,
    ).toBeLessThan(2000)
    expect(
      encodeCallLogUndo({
        contactId: huge,
        interactionKey: huge,
        prior: { status: huge, followUpAt: huge, lastContactedAt: huge, attributionChannel: huge, nextStep: huge },
      }).length,
    ).toBeLessThan(2000)
    expect(encodeCallLogMetadata({ contactId: huge, channel: huge, threadTs: huge }).length).toBeLessThan(3000)
  })
})
