import { describe, expect, it } from 'vitest'

import {
  OUTREACH_PROGRESS_CHANNELS,
  buildOutreachProgress,
  isUsableOutreachEmail,
  isUsableOutreachPhone,
  type OutreachProgressContact,
} from '@/lib/marketing/outreachProgress'
import { OUTREACH_CHANNELS } from '@/lib/marketing/outreachEnums'

const NOW = '2026-07-14T16:00:00.000Z'

function readyContact(
  id: string,
  overrides: Partial<OutreachProgressContact> = {},
): OutreachProgressContact {
  return {
    _id: id,
    name: id,
    status: 'researched',
    warmth: 'warm',
    email: `${id}@example.com`,
    phone: '+1 617 555 0100',
    owner: 'Juhan',
    researchReviewedAt: '2026-07-12T12:00:00.000Z',
    personVerified: true,
    identityConfidence: 'high',
    callBrief: 'A complete, human-reviewed call brief with context, evidence, and a responsible ask.',
    relevantEvidence: [{ evidenceId: `workEvidence-${id}` }],
    feasibilityScore: 70,
    ...overrides,
  }
}

describe('outreach progress tracker', () => {
  it('covers every interaction channel in the shared outreach vocabulary', () => {
    expect([...OUTREACH_PROGRESS_CHANNELS]).toEqual(OUTREACH_CHANNELS)
  })

  it('ranks due follow-ups before approved first touches and never selects blocked or terminal rows', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('ready-warm'),
        readyContact('blocked', { email: undefined, phone: undefined }),
        readyContact('won', { status: 'won' }),
        readyContact('due', {
          status: 'contacted',
          followUpAt: '2026-07-12T12:00:00.000Z',
          nextStep: 'Send the pilot outline.',
        }),
      ],
      { now: NOW },
    )

    expect(progress.rows.map((row) => row.contactId)).toEqual([
      'due',
      'ready-warm',
      'blocked',
      'won',
    ])
    expect(progress.nextContact?.contactId).toBe('due')
    expect(progress.nextContact?.rank).toBe(1)
    expect(progress.rows.find((row) => row.contactId === 'ready-warm')?.rank).toBe(2)
    expect(progress.rows.find((row) => row.contactId === 'blocked')?.rank).toBeNull()
    expect(progress.rows.find((row) => row.contactId === 'won')?.rank).toBeNull()
    expect(progress.counts).toEqual({ total: 4, contactNow: 2, due: 1, blocked: 1, complete: 1 })
  })

  it('sorts due follow-ups by date, then first touches by warmth and feasibility', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('warm-high', { warmth: 'warm', feasibilityScore: 95 }),
        readyContact('hot-low', { warmth: 'hot', feasibilityScore: 30 }),
        readyContact('warm-low', { warmth: 'warm', feasibilityScore: 20 }),
        readyContact('due-later', { status: 'responded', followUpAt: '2026-07-16T12:00:00.000Z' }),
        readyContact('due-earlier', { status: 'contacted', followUpAt: '2026-07-13T12:00:00.000Z' }),
      ],
      { now: NOW, withinDays: 7 },
    )

    expect(progress.rows.map((row) => row.contactId)).toEqual([
      'due-earlier',
      'due-later',
      'hot-low',
      'warm-high',
      'warm-low',
    ])
  })

  it('classifies a timed follow-up later on the same UTC day as due today', () => {
    const row = buildOutreachProgress(
      [
        readyContact('later-today', {
          status: 'contacted',
          followUpAt: '2026-07-14T18:00:00.000Z',
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row).toMatchObject({
      dueState: 'today',
      urgency: 'dueToday',
      whyNext: 'Follow-up is due today.',
      actionReason: 'Follow-up is due today.',
    })
  })

  it('lets an available preferred channel win and explains the choice', () => {
    const row = buildOutreachProgress(
      [
        readyContact('preferred', {
          linkedinUrl: 'https://www.linkedin.com/in/preferred',
          channelOverrides: [{ channel: 'linkedin', state: 'preferred' }],
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.recommendation.channel).toBe('linkedin')
    expect(row.recommendation.label).toBe('LinkedIn')
    expect(row.whyChannel).toBe('LinkedIn is explicitly preferred and available.')
    expect(row.recommendation.alternatives.map((item) => item.channel)).toEqual(['email', 'phone'])
  })

  it.each(['unavailable', 'unresponsive', 'doNotUse'] as const)(
    'excludes an email marked %s and recommends another usable modality',
    (state) => {
      const row = buildOutreachProgress(
        [
          readyContact('override', {
            status: 'contacted',
            followUpAt: '2026-07-13T12:00:00.000Z',
            interactions: [
              {
                at: '2026-07-10T12:00:00.000Z',
                channel: 'email',
                statusAfter: 'contacted',
              },
            ],
            channelOverrides: [{ channel: 'email', state, note: 'Principal confirmed.' }],
          }),
        ],
        { now: NOW },
      ).rows[0]

      expect(row.recommendation.channel).toBe('phone')
      expect(row.recommendation.availability.find((item) => item.channel === 'email')).toMatchObject({
        available: false,
        overrideState: state,
      })
      if (state === 'unresponsive') {
        expect(row.whyChannel).toBe('Email is marked unresponsive, so switch to Phone call.')
      }
    },
  )

  it('treats a missing direct coordinate as a computed gap even when that channel is preferred', () => {
    const row = buildOutreachProgress(
      [
        readyContact('missing-phone', {
          phone: undefined,
          email: 'person@example.com',
          channelOverrides: [{ channel: 'phone', state: 'preferred' }],
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.recommendation.channel).toBe('email')
    expect(row.recommendation.availability.find((item) => item.channel === 'phone')).toMatchObject({
      available: false,
      preferred: false,
      overrideState: 'preferred',
    })
  })

  it.each([
    'https://example.com/not-linkedin',
    'javascript:alert(1)',
    'not a URL',
  ])('never recommends an invalid or non-LinkedIn profile URL: %s', (linkedinUrl) => {
    const row = buildOutreachProgress(
      [
        readyContact('bad-linkedin', {
          email: undefined,
          phone: undefined,
          linkedinUrl,
          channelOverrides: [{ channel: 'linkedin', state: 'preferred' }],
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.recommendation.channel).toBeNull()
    expect(row.action).toBe('editContact')
    expect(row.editFields).toContain('linkedinUrl')
  })

  it('allows a manually coordinated channel only when preferred or previously used', () => {
    const preferred = buildOutreachProgress(
      [
        readyContact('referral', {
          email: undefined,
          phone: undefined,
          channelOverrides: [{ channel: 'referral', state: 'preferred' }],
        }),
      ],
      { now: NOW },
    ).rows[0]
    const previous = buildOutreachProgress(
      [
        readyContact('video', {
          status: 'meeting',
          email: undefined,
          phone: undefined,
          followUpAt: '2026-07-14T18:00:00.000Z',
          interactions: [{ at: '2026-07-10T12:00:00.000Z', channel: 'video', statusAfter: 'meeting' }],
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(preferred.recommendation.channel).toBe('referral')
    expect(previous.recommendation.channel).toBe('video')
  })

  it('does not infer an unresponsive override from free-text interaction notes', () => {
    const row = buildOutreachProgress(
      [
        readyContact('free-text', {
          status: 'contacted',
          phone: undefined,
          followUpAt: '2026-07-12T12:00:00.000Z',
          interactions: [
            {
              at: '2026-07-11T12:00:00.000Z',
              channel: 'email',
              outcome: 'No response to the last email.',
              statusAfter: 'contacted',
            },
          ],
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.recommendation.channel).toBe('email')
    expect(row.recommendation.availability.find((item) => item.channel === 'email')?.available).toBe(true)
  })

  it('blocks outreach when no modality is usable and routes back to editable data', () => {
    const row = buildOutreachProgress(
      [
        readyContact('no-channel', {
          email: undefined,
          phone: undefined,
          linkedinUrl: undefined,
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.action).toBe('editContact')
    expect(row.urgency).toBe('blocked')
    expect(row.recommendation).toMatchObject({ channel: null, label: 'No usable channel' })
    expect(row.editFields).toEqual(expect.arrayContaining(['phone', 'email', 'linkedinUrl', 'channelOverrides']))
    expect(row.rank).toBeNull()
  })

  it('treats malformed or placeholder direct coordinates as unusable', () => {
    const row = buildOutreachProgress(
      [
        readyContact('invalid-coordinates', {
          email: 'not-an-email',
          phone: 'unknown',
        }),
      ],
      { now: NOW },
    ).rows[0]

    expect(row.recommendation.channel).toBeNull()
    expect(row.action).toBe('editContact')
    expect(row.recommendation.availability.find((item) => item.channel === 'email')).toMatchObject({
      available: false,
      coordinateMissing: true,
    })
    expect(row.recommendation.availability.find((item) => item.channel === 'phone')).toMatchObject({
      available: false,
      coordinateMissing: true,
    })
  })

  it.each([
    ['boss+studio@example.co.uk', true],
    ['not-an-email', false],
    ['boss@example', false],
    ['.boss@example.com', false],
    ['boss..name@example.com', false],
    ['boss@example..com', false],
  ])('validates outreach email %s conservatively', (value, expected) => {
    expect(isUsableOutreachEmail(value)).toBe(expected)
  })

  it.each([
    ['+1 (617) 555-0100', true],
    ['020 7946 0958 ext. 42', true],
    ['unknown', false],
    ['n/a', false],
    ['123', false],
    ['+0000000', false],
    ['617-CALL-NOW', false],
  ])('validates outreach phone %s conservatively', (value, expected) => {
    expect(isUsableOutreachPhone(value)).toBe(expected)
  })

  it('still counts a due follow-up when missing contact data blocks the touch', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('blocked-due', {
          status: 'contacted',
          email: undefined,
          phone: undefined,
          linkedinUrl: undefined,
          followUpAt: '2026-07-13T12:00:00.000Z',
        }),
      ],
      { now: NOW },
    )

    expect(progress.rows[0]).toMatchObject({ urgency: 'blocked', dueState: 'overdue' })
    expect(progress.counts.due).toBe(1)
  })

  it('orders an overdue blocked repair above future scheduled rows without recommending it', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('future-scheduled', {
          status: 'meeting',
          followUpAt: '2026-09-01T12:00:00.000Z',
        }),
        readyContact('blocked-overdue', {
          status: 'contacted',
          email: undefined,
          phone: undefined,
          followUpAt: '2026-07-12T12:00:00.000Z',
        }),
      ],
      { now: NOW },
    )

    expect(progress.rows.map((row) => row.contactId)).toEqual([
      'blocked-overdue',
      'future-scheduled',
    ])
    expect(progress.rows[0]).toMatchObject({
      urgency: 'blocked',
      rank: null,
      isNext: false,
    })
    expect(progress.nextContact).toBeNull()
  })

  it('never recommends a modality for a terminal contact', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('won', {
          status: 'won',
          followUpAt: '2026-07-13T12:00:00.000Z',
          nextStep: 'Send another follow-up.',
        }),
      ],
      { now: NOW },
    )
    const row = progress.rows[0]

    expect(row.action).toBe('complete')
    expect(row.recommendation).toMatchObject({ channel: null, label: 'No outreach' })
    expect(row.whyChannel).toContain('No channel is recommended')
    expect(row.dueAt).toBeUndefined()
    expect(row.dueState).toBe('none')
    expect(row.nextStep).toBeUndefined()
    expect(progress.counts.due).toBe(0)
  })

  it('exposes core and injected readiness issues without allowing a blocked contact into the queue', () => {
    const row = buildOutreachProgress(
      [
        readyContact('not-ready', {
          researchReviewedAt: undefined,
          personVerified: false,
          relevantEvidence: [],
        }),
      ],
      {
        now: NOW,
        readinessIssues: () => ['Choose a real priced offer.', 'Work evidence needs a live URL.'],
      },
    ).rows[0]

    expect(row.workflowReady).toBe(false)
    expect(row.blockers).toEqual(
      expect.arrayContaining([
        'Research has not been reviewed by a person.',
        'The person or identity confidence is not verified enough for outreach.',
        'No relevant work evidence is attached.',
        'Choose a real priced offer.',
        'Work evidence needs a live URL.',
      ]),
    )
    expect(row.editFields).toContain('workflowReadiness')
    expect(row.rank).toBeNull()
  })

  it('shows scheduled, missing-follow-up, and preparation work as table-ready rows', () => {
    const progress = buildOutreachProgress(
      [
        readyContact('active-no-date', { status: 'responded' }),
        readyContact('scheduled', { status: 'meeting', followUpAt: '2026-09-01T12:00:00.000Z' }),
        readyContact('review', { status: 'needsReview' }),
        readyContact('new', { status: 'new' }),
        readyContact('dormant', { status: 'dormant' }),
      ],
      { now: NOW },
    )

    expect(progress.rows.find((row) => row.contactId === 'active-no-date')).toMatchObject({
      action: 'scheduleFollowUp',
      urgency: 'needsAttention',
      progressPercent: 70,
    })
    expect(progress.rows.find((row) => row.contactId === 'scheduled')).toMatchObject({
      action: 'wait',
      urgency: 'scheduled',
      dueAt: '2026-09-01T12:00:00.000Z',
    })
    expect(progress.rows.find((row) => row.contactId === 'review')?.action).toBe('reviewResearch')
    expect(progress.rows.find((row) => row.contactId === 'new')?.action).toBe('research')
    expect(progress.rows.find((row) => row.contactId === 'dormant')).toMatchObject({
      action: 'wait',
      urgency: 'waiting',
      repairTarget: 'followUpSchedule',
      editFields: ['followUpAt', 'nextStep'],
    })
  })

  it('is deterministic, does not mutate contacts, and rejects an invalid injected clock', () => {
    const contacts = [
      readyContact('b', { feasibilityScore: 50 }),
      readyContact('a', { feasibilityScore: 50 }),
    ]
    const snapshot = structuredClone(contacts)
    const first = buildOutreachProgress(contacts, { now: NOW })
    const second = buildOutreachProgress(contacts, { now: NOW })

    expect(first).toEqual(second)
    expect(contacts).toEqual(snapshot)
    expect(first.rows.map((row) => row.contactId)).toEqual(['a', 'b'])
    expect(() => buildOutreachProgress(contacts, { now: 'not-a-date' })).toThrow(
      'requires a valid `now` date',
    )
  })
})
