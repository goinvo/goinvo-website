import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FOLLOW_UP_WINDOW_DAYS,
  FOLLOW_UP_BUDGET_SHARE,
  FOLLOW_UP_MINUTES_EACH,
  followUpLine,
  followUpParts,
  followUpPersonLabel,
  followUpReservationLabel,
  followUpReservedMinutes,
  followUpStatusLabel,
  followUpOrganization,
  groupFollowUpsByOwner,
  listFollowUps,
  unownedFollowUpsText,
  type FollowUpContact,
  type FollowUpEntry,
} from '@/lib/marketing/followUps'
import { encodeContactRef } from '@/lib/marketing/marquetaActions'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { buildWeeklyCheckInBlocks, groupCheckInTasks, type CheckInFollowUp } from '@/lib/marketing/weeklyCheckIn'
import { expectValidSlackBlocks } from './support/slackBlocks'

// Thursday 24 September 2026, 10am in Arlington (14:00 UTC, EDT).
const NOW = new Date('2026-09-24T14:00:00Z')
const DAY = 86_400_000
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString()

function contact(overrides: Partial<FollowUpContact> & { _id: string }): FollowUpContact {
  return {
    name: 'Jane Doe',
    organization: 'MGB',
    status: 'contacted',
    warmth: 'unknown',
    followUpAt: at(1),
    interactions: [],
    ...overrides,
  }
}

const ids = (entries: FollowUpEntry[]) => entries.map((entry) => entry.contactId)

describe('listFollowUps — what is due', () => {
  it('lists contacts in a follow-up status whose date falls inside the window, overdue included', () => {
    const entries = listFollowUps(
      [
        contact({ _id: 'overdue', followUpAt: at(-3) }),
        contact({ _id: 'soon', followUpAt: at(2) }),
        contact({ _id: 'edge', followUpAt: at(DEFAULT_FOLLOW_UP_WINDOW_DAYS) }),
        contact({ _id: 'too-far', followUpAt: at(DEFAULT_FOLLOW_UP_WINDOW_DAYS + 1) }),
        contact({ _id: 'no-date', followUpAt: null }),
        contact({ _id: 'bad-date', followUpAt: 'next tuesday' }),
        // Terminal and not-yet-contacted statuses never resurface as follow-ups.
        contact({ _id: 'won', status: 'won', followUpAt: at(-1) }),
        contact({ _id: 'lost', status: 'lost', followUpAt: at(-1) }),
        contact({ _id: 'closed', status: 'closed', followUpAt: at(-1) }),
        contact({ _id: 'new', status: 'new', followUpAt: at(-1) }),
        contact({ _id: 'dormant', status: 'dormant', followUpAt: at(-10) }),
      ],
      { now: NOW },
    )
    expect(ids(entries).sort()).toEqual(['dormant', 'edge', 'overdue', 'soon'])
    expect(entries.find((entry) => entry.contactId === 'overdue')?.overdue).toBe(true)
    expect(entries.find((entry) => entry.contactId === 'soon')?.overdue).toBe(false)
  })

  it('honours withinDays, and falls back to a week for nonsense', () => {
    const contacts = [
      contact({ _id: 'past', followUpAt: at(-1) }),
      contact({ _id: 'tomorrow', followUpAt: at(1) }),
      contact({ _id: 'in-20', followUpAt: at(20) }),
    ]
    expect(ids(listFollowUps(contacts, { now: NOW, withinDays: 0 }))).toEqual(['past'])
    expect(ids(listFollowUps(contacts, { now: NOW, withinDays: 30 })).sort()).toEqual(['in-20', 'past', 'tomorrow'])
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(ids(listFollowUps(contacts, { now: NOW, withinDays: bad })).sort()).toEqual(['past', 'tomorrow'])
    }
  })

  it('never lists a person twice, and ignores drafts', () => {
    const entries = listFollowUps(
      [contact({ _id: 'a' }), contact({ _id: 'a' }), contact({ _id: 'drafts.a' }), contact({ _id: '' })],
      { now: NOW },
    )
    expect(ids(entries)).toEqual(['a'])
  })

  it('agrees with the outreach pulse about what is overdue', () => {
    // The digest prints the pulse ("3 overdue") above these lines; the two
    // counts must come from the same rule or the message contradicts itself.
    const contacts = [
      contact({ _id: 'a', followUpAt: at(-2) }),
      contact({ _id: 'b', followUpAt: at(-0.01) }),
      contact({ _id: 'c', followUpAt: at(0.01) }),
      contact({ _id: 'd', status: 'meeting', followUpAt: at(-9) }),
      contact({ _id: 'e', status: 'won', followUpAt: at(-9) }),
    ]
    const overdue = listFollowUps(contacts, { now: NOW }).filter((entry) => entry.overdue).length
    const pulse = summarizeOutreach(contacts, { from: at(-7), to: at(7), now: NOW })
    expect(overdue).toBe(pulse.followUpsOverdue)
    expect(overdue).toBe(3)
  })
})

describe('listFollowUps — order', () => {
  it('puts overdue first, then people who replied, then people who know us, then cold, then by date', () => {
    const entries = listFollowUps(
      [
        contact({ _id: 'cold-soon', followUpAt: at(1) }),
        contact({ _id: 'warm-later', warmth: 'warm', followUpAt: at(3) }),
        contact({ _id: 'warm-sooner', warmth: 'cool', followUpAt: at(2) }),
        contact({ _id: 'replied', status: 'responded', followUpAt: at(5) }),
        contact({ _id: 'overdue-cold', followUpAt: at(-1) }),
        contact({ _id: 'overdue-meeting', status: 'meeting', followUpAt: at(-0.5) }),
      ],
      { now: NOW },
    )
    expect(ids(entries)).toEqual([
      'overdue-meeting',
      'overdue-cold',
      'replied',
      'warm-sooner',
      'warm-later',
      'cold-soon',
    ])
  })

  it('is deterministic when everything else ties', () => {
    const a = contact({ _id: 'z', name: 'Bea' })
    const b = contact({ _id: 'y', name: 'Abe' })
    expect(ids(listFollowUps([a, b], { now: NOW }))).toEqual(['y', 'z'])
    expect(ids(listFollowUps([b, a], { now: NOW }))).toEqual(['y', 'z'])
  })
})

describe('listFollowUps — temperature', () => {
  it('reads replied from the status and knows-us from the warmth', () => {
    const temperature = (overrides: Partial<FollowUpContact>) =>
      listFollowUps([contact({ _id: 'x', ...overrides })], { now: NOW })[0].temperature
    expect(temperature({ status: 'responded' })).toBe('replied')
    expect(temperature({ status: 'meeting', warmth: 'cold' })).toBe('replied')
    expect(temperature({ status: 'opportunity' })).toBe('replied')
    expect(temperature({ warmth: 'hot' })).toBe('knowsUs')
    expect(temperature({ warmth: 'warm' })).toBe('knowsUs')
    expect(temperature({ warmth: 'cool' })).toBe('knowsUs')
    expect(temperature({ warmth: 'cold' })).toBe('cold')
    expect(temperature({ warmth: 'unknown' })).toBe('cold')
    expect(temperature({ warmth: null })).toBe('cold')
  })
})

describe('listFollowUps — owner', () => {
  it('uses the contact owner, resolved to the board name', () => {
    const [entry] = listFollowUps([contact({ _id: 'a', owner: 'Juhan Sonin' })], {
      now: NOW,
      resolveOwner: (raw) => (raw === 'Juhan Sonin' ? 'Juhan' : raw),
    })
    expect(entry.ownerName).toBe('Juhan')
  })

  it('falls back to whoever logged the most recent touch, by date rather than array order', () => {
    const [entry] = listFollowUps(
      [
        contact({
          _id: 'a',
          owner: '',
          interactions: [
            { at: '2026-09-20T15:00:00Z', by: 'Eric', statusAfter: 'contacted' },
            // Logged later but dated earlier: not the most recent touch.
            { at: '2026-09-10T15:00:00Z', by: 'Shirley', statusAfter: 'contacted' },
          ],
        }),
      ],
      { now: NOW },
    )
    expect(entry.ownerName).toBe('Eric')
  })

  it('leaves the owner empty when nobody is on record, without asking the resolver about nobody', () => {
    // resolveOwnerName answers "Someone" for an empty name; a follow-up owned by
    // "Someone" would be grouped under a person who does not exist.
    const asked: string[] = []
    const [entry] = listFollowUps([contact({ _id: 'a', owner: null, interactions: [{ at: at(-3) }] })], {
      now: NOW,
      resolveOwner: (raw) => {
        asked.push(raw)
        return 'Someone'
      },
    })
    expect(entry.ownerName).toBe('')
    expect(asked).toEqual([])
  })
})

describe('followUpPersonLabel', () => {
  it('uses a real name whole', () => {
    expect(followUpPersonLabel({ name: '  Jane   Doe ', organization: 'MGB' })).toBe('Jane Doe')
  })

  it('never shows an email address as a name', () => {
    expect(followUpPersonLabel({ name: 'scott.shreeve@crossoverhealth.com', organization: 'Crossover Health' })).toBe('Scott')
    expect(followUpPersonLabel({ name: 'lgartley@example.org', organization: 'Example' })).toBe('someone at Example')
    expect(followUpPersonLabel({ name: '', email: 'nate.murray@x.org', organization: 'X' })).toBe('Nate')
    expect(followUpPersonLabel({ name: 'j@x.org', organization: '' })).toBe('someone with no name on file')
    for (const label of [
      followUpPersonLabel({ name: 'jd@acme.com', organization: 'Acme' }),
      followUpPersonLabel({ name: 'jd@acme.com', organization: null }),
    ]) {
      expect(label).not.toContain('@')
    }
  })
})

describe('contact details never reach a line', () => {
  // Regression: only an "@" in `name` was caught. A phone number typed after a
  // name, or an address sitting in `organization`, went straight into the
  // channel: "*Follow up with Jane Doe 617-555-0123 (MGB)*".
  const PHONE_DIGITS = /\d{3}\D?\d{3}\D?\d{4}/

  const rendered = (overrides: Partial<FollowUpContact>) => {
    const [entry] = listFollowUps([contact({ _id: 'x', ...overrides })], { now: NOW })
    const line = followUpLine(entry, NOW)
    return { entry, line, all: `${JSON.stringify(entry)}\n${line.label}\n${line.detail}` }
  }

  it('drops a phone number typed after a name, and keeps the name', () => {
    for (const name of ['Jane Doe 617-555-0123', 'Jane Doe (617) 555-0123', 'Jane Doe, tel: +1 617 555 0123', 'Jane Doe · 617.555.0123']) {
      const { entry, line, all } = rendered({ name, organization: 'MGB' })
      expect(entry.personLabel).toBe('Jane Doe')
      expect(line.label).toBe('*Follow up with Jane Doe (MGB)*')
      expect(all).not.toMatch(PHONE_DIGITS)
    }
  })

  it('drops an address written beside a name', () => {
    const { line, all } = rendered({ name: 'Jane Doe <jane.doe@mgb.org>', organization: 'MGB' })
    expect(line.label).toBe('*Follow up with Jane Doe (MGB)*')
    expect(all).not.toContain('@')
  })

  it('never shows an organisation that is really an address or a number', () => {
    // The reviewer's case: both fields hold the same address.
    const both = rendered({ name: 'jd@x.org', organization: 'jd@x.org' })
    expect(both.entry.organization).toBe('')
    expect(both.line.label).toBe('*Follow up with someone with no name on file*')
    expect(both.all).not.toContain('@')

    const named = rendered({ name: 'Jane Doe', organization: 'jane@mgb.org' })
    expect(named.line.label).toBe('*Follow up with Jane Doe*')
    expect(named.all).not.toContain('@')

    const phoneOrg = rendered({ name: 'lgartley@example.org', organization: '617-555-0123' })
    expect(phoneOrg.line.label).toBe('*Follow up with someone with no name on file*')
    expect(phoneOrg.all).not.toMatch(PHONE_DIGITS)

    const mixed = rendered({ name: 'jd@acme.com', organization: 'Acme Health (info@acme.com)' })
    expect(mixed.entry.organization).toBe('Acme Health')
    expect(mixed.line.label).toBe('*Follow up with someone at Acme Health*')
  })

  it('never hands a phone number to the first-name guess', () => {
    // firstNameFor returns the first token of anything without an "@", so a
    // bare number in `name` would have come back as the "first name".
    expect(followUpPersonLabel({ name: '617-555-0123', organization: 'MGB' })).toBe('someone at MGB')
    expect(followUpPersonLabel({ name: '+44 20 7946 0958', email: 'nate.murray@x.org', organization: 'X' })).toBe('Nate')
    expect(followUpPersonLabel({ name: 'scott.shreeve@crossoverhealth.com 617-555-0123', organization: 'Crossover' })).toBe('Scott')
  })

  it('leaves ordinary names and organisations exactly as they were', () => {
    expect(followUpPersonLabel({ name: 'Pat O’Neil-Smith', organization: 'X' })).toBe('Pat O’Neil-Smith')
    expect(followUpOrganization('Smith & Co. —')).toBe('Smith & Co. —')
    expect(followUpOrganization('Class of 2019 Alumni (555-0123)')).toBe('Class of 2019 Alumni (555-0123)')
    expect(followUpOrganization('3M')).toBe('3M')
    expect(followUpOrganization(null)).toBe('')
  })

  it('scrubs an entry it did not build, too', () => {
    const forged: FollowUpEntry = {
      contactId: 'a',
      personLabel: 'Jane 617-555-0123',
      organization: 'jd@x.org',
      ownerName: '',
      dueAt: at(1),
      overdue: false,
      lastTouch: null,
      temperature: 'cold',
    }
    expect(followUpLine(forged, NOW).label).toBe('*Follow up with Jane*')
    // A label that was only "someone at <address>" is rebuilt, not half-shown.
    const someone = followUpLine({ ...forged, personLabel: 'someone at jd@x.org' }, NOW)
    expect(someone.label).toBe('*Follow up with someone with no name on file*')
    const withOrg = followUpLine({ ...forged, personLabel: 'someone at jd@x.org', organization: 'MGB 617-555-0123' }, NOW)
    expect(withOrg.label).toBe('*Follow up with someone at MGB*')
    for (const line of [someone, withOrg]) {
      expect(line.label).not.toContain('@')
      expect(line.label).not.toMatch(PHONE_DIGITS)
    }
  })
})

describe('listFollowUps — last touch is a status, never a note', () => {
  it('names the most recent dated touch by its status label', () => {
    const [entry] = listFollowUps(
      [
        contact({
          _id: 'a',
          interactions: [
            { at: '2026-09-14T15:00:00Z', statusAfter: 'contacted' },
            { at: null, statusAfter: 'meeting' },
            { at: '2026-09-02T15:00:00Z', statusAfter: 'responded' },
          ],
        }),
      ],
      { now: NOW },
    )
    expect(entry.lastTouch).toEqual({ at: '2026-09-14T15:00:00.000Z', statusLabel: 'Contacted' })
  })

  it('is null when nothing dated was logged', () => {
    expect(listFollowUps([contact({ _id: 'a', interactions: null })], { now: NOW })[0].lastTouch).toBeNull()
    expect(listFollowUps([contact({ _id: 'b', interactions: [{ at: null }] })], { now: NOW })[0].lastTouch).toBeNull()
  })

  it('uses the short enum label, and a neutral word for anything outside the enum', () => {
    expect(followUpStatusLabel('contacted')).toBe('Contacted')
    expect(followUpStatusLabel('meeting')).toBe('Meeting booked')
    expect(followUpStatusLabel('opportunity')).toBe('Opportunity')
    expect(followUpStatusLabel('Said the CMIO is on the way out')).toBe('Logged')
    expect(followUpStatusLabel(undefined)).toBe('Logged')
  })

  it('carries no call note, outcome or next step anywhere in the entry or the line', () => {
    const secret = 'CMIO is on the way out, do not mention the merger'
    const noisy = {
      ...contact({ _id: 'a', warmth: 'warm' }),
      nextStep: secret,
      outcomeNotes: secret,
      interactions: [
        { at: '2026-09-14T15:00:00Z', statusAfter: secret, outcome: secret, intel: secret, nextStep: secret, by: 'Eric' },
      ],
    } as unknown as FollowUpContact
    const [entry] = listFollowUps([noisy], { now: NOW })
    const line = followUpLine(entry, NOW)
    expect(JSON.stringify(entry)).not.toContain('CMIO')
    expect(`${line.label} ${line.detail}`).not.toContain('CMIO')
    expect(line.detail).toContain('last: Logged on 14 Sep')
  })

  it('re-checks a label on an entry it did not build', () => {
    const forged: FollowUpEntry = {
      contactId: 'a',
      personLabel: 'Jane',
      organization: 'MGB',
      ownerName: '',
      dueAt: at(1),
      overdue: false,
      lastTouch: { at: '2026-09-14T15:00:00Z', statusLabel: 'she said the budget is gone' },
      temperature: 'cold',
    }
    expect(followUpLine(forged, NOW).detail).not.toContain('budget')
    // Nor is an address shown as a name, whoever built the entry.
    const leaky = followUpLine({ ...forged, personLabel: 'jane.doe@mgb.org' }, NOW)
    expect(leaky.label).toBe('*Follow up with someone at MGB*')
  })
})

describe('groupFollowUpsByOwner', () => {
  it('groups case-insensitively, keeps the order, and files nobody under ""', () => {
    const entries = listFollowUps(
      [
        contact({ _id: 'a', owner: 'Juhan', followUpAt: at(-1) }),
        contact({ _id: 'b', owner: 'juhan', followUpAt: at(2) }),
        contact({ _id: 'c', owner: 'Eric', followUpAt: at(1) }),
        contact({ _id: 'd', owner: null, followUpAt: at(3) }),
      ],
      { now: NOW },
    )
    const groups = groupFollowUpsByOwner(entries)
    expect(Object.keys(groups).sort()).toEqual(['', 'eric', 'juhan'])
    expect(ids(groups.juhan)).toEqual(['a', 'b'])
    expect(ids(groups[''])).toEqual(['d'])
    expect(groupFollowUpsByOwner([])).toEqual({})
  })
})

describe('followUpLine', () => {
  const jane = contact({
    _id: 'jane',
    warmth: 'warm',
    // 9am Monday in Arlington.
    followUpAt: '2026-09-21T13:00:00Z',
    interactions: [{ at: '2026-09-14T15:00:00Z', by: 'Eric', statusAfter: 'contacted' }],
  })

  it('reads the way the spec shows it', () => {
    const [entry] = listFollowUps([jane], { now: NOW })
    expect(followUpLine(entry, NOW)).toEqual({
      label: '*Follow up with Jane Doe (MGB)*',
      detail: 'overdue since Mon 21 Sep · last: Contacted on 14 Sep · they know us',
    })
  })

  it('says today, earlier today, or the day it is due', () => {
    const line = (followUpAt: string) => followUpLine(listFollowUps([contact({ _id: 'x', followUpAt })], { now: NOW })[0], NOW).detail
    expect(line('2026-09-24T20:00:00Z')).toMatch(/^due today/)
    expect(line('2026-09-24T12:00:00Z')).toMatch(/^due earlier today/)
    expect(line('2026-09-28T13:00:00Z')).toMatch(/^due Mon 28 Sep/)
  })

  it('dates things as the studio lived them, not as UTC did', () => {
    // 02:00 UTC on the 22nd is still Monday evening in Arlington.
    const [entry] = listFollowUps([contact({ _id: 'x', followUpAt: '2026-09-22T02:00:00Z' })], { now: NOW })
    expect(followUpLine(entry, NOW).detail).toMatch(/^overdue since Mon 21 Sep/)
  })

  it('shows the year when the last touch was not this year', () => {
    const [entry] = listFollowUps(
      [contact({ _id: 'x', status: 'dormant', interactions: [{ at: '2025-09-14T15:00:00Z', statusAfter: 'dormant' }] })],
      { now: NOW },
    )
    expect(followUpLine(entry, NOW).detail).toContain('last: Dormant on 14 Sep 2025')
  })

  it('does not name the organisation twice for someone with no name', () => {
    const [entry] = listFollowUps([contact({ _id: 'x', name: 'jd@mgb.org', organization: 'MGB' })], { now: NOW })
    expect(followUpLine(entry, NOW).label).toBe('*Follow up with someone at MGB*')
  })

  it('escapes and clips hostile records so the section stays valid', () => {
    const huge = 'x'.repeat(5000)
    const hostile = [
      contact({ _id: 'here', name: '<!here> & friends', organization: 'AT&T <5%>', warmth: 'hot' }),
      contact({ _id: 'huge', name: huge, organization: huge, status: 'meeting' }),
      contact({ _id: 'link', name: '<https://evil.example|click me>', organization: '<@U123>' }),
    ]
    const entries = listFollowUps(hostile, { now: NOW })
    expect(entries).toHaveLength(3)
    const lines = entries.map((entry) => followUpLine(entry, NOW))
    const all = lines.map((line) => `${line.label}\n${line.detail}`).join('\n')
    expect(all).not.toContain('<!here>')
    expect(all).not.toContain('<@U123>')
    expect(all).not.toContain('<https://')
    expect(all).toContain('&lt;!here&gt; &amp; friends (AT&amp;T &lt;5%&gt;)')
    for (const line of lines) expect(line.label.length).toBeLessThan(260)

    expectValidSlackBlocks(
      lines.map((line) => ({ type: 'section', text: { type: 'mrkdwn', text: `${line.label}\n${line.detail}` } })),
    )
  })
})

describe('followUpParts — the same facts, laid out by the caller', () => {
  const mixed = [
    contact({
      _id: 'jane',
      warmth: 'warm',
      owner: 'juhan',
      followUpAt: '2026-09-21T13:00:00Z',
      interactions: [{ at: '2026-09-14T15:00:00Z', by: 'Eric', statusAfter: 'contacted' }],
    }),
    contact({ _id: 'today', followUpAt: '2026-09-24T20:00:00Z', status: 'responded' }),
    contact({ _id: 'no-name', name: 'jd@mgb.org', organization: 'MGB', warmth: 'cold' }),
    contact({ _id: 'phone', name: 'Bo Chen 617-555-0123', organization: 'Y Clinic · West', status: 'meeting' }),
    contact({ _id: 'old', status: 'dormant', interactions: [{ at: '2025-09-14T15:00:00Z', statusAfter: 'dormant' }] }),
    contact({ _id: 'amp', name: 'Smith & Co.', organization: 'AT&T <5%>' }),
  ]

  it('reads the way the Studio row shows it', () => {
    const [entry] = listFollowUps([mixed[0]], { now: NOW, resolveOwner: (raw) => (raw === 'juhan' ? 'Juhan' : raw) })
    expect(followUpParts(entry, NOW)).toEqual({
      contactId: 'jane',
      who: 'Jane Doe (MGB)',
      due: 'overdue since Mon 21 Sep',
      last: 'last: Contacted on 14 Sep',
      temperature: 'they know us',
      overdue: true,
      ownerName: 'Juhan',
    })
  })

  it('is followUpLine, piece for piece — the line is byte-identical to its parts, escaped', () => {
    for (const entry of listFollowUps(mixed, { now: NOW })) {
      const parts = followUpParts(entry, NOW)
      const line = followUpLine(entry, NOW)
      const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      expect(line.detail).toBe([parts.due, parts.last, parts.temperature].filter(Boolean).map(escape).join(' · '))
      expect(line.label).toBe(`*Follow up with ${escape(parts.who)}*`)
    }
  })

  it('keeps the plain text plain, with the contact details still removed', () => {
    const byId = Object.fromEntries(listFollowUps(mixed, { now: NOW }).map((entry) => [entry.contactId, followUpParts(entry, NOW)]))
    // React escapes for itself; an &amp; here would show up on the page as one.
    expect(byId.amp.who).toBe('Smith & Co. (AT&T <5%>)')
    expect(byId.phone.who).toBe('Bo Chen (Y Clinic · West)')
    expect(byId['no-name'].who).toBe('someone at MGB')
    expect(byId.today.due).toBe('due today')
    expect(byId.old.last).toBe('last: Dormant on 14 Sep 2025')
    expect(JSON.stringify(byId)).not.toMatch(/617|@mgb\.org/)
  })
})

describe('unownedFollowUpsText — follow-ups nobody owns', () => {
  const ownerless = (overrides: Partial<FollowUpContact> & { _id: string }) =>
    contact({ owner: null, interactions: [], ...overrides })

  it('is empty when every follow-up has an owner, so no empty block is posted', () => {
    const entries = listFollowUps([contact({ _id: 'a', owner: 'Juhan' })], { now: NOW })
    expect(unownedFollowUpsText(entries, NOW)).toBe('')
    expect(unownedFollowUpsText([], NOW)).toBe('')
  })

  it('names only the ones with nobody on record, with when they are due', () => {
    const entries = listFollowUps(
      [
        contact({ _id: 'owned', name: 'Ann Lee', owner: 'Juhan' }),
        ownerless({ _id: 'jane', name: 'Jane Doe', followUpAt: '2026-09-21T13:00:00Z' }),
        ownerless({ _id: 'acme', name: 'jd@acme.com', organization: 'Acme', followUpAt: '2026-09-25T13:00:00Z' }),
      ],
      { now: NOW },
    )
    const text = unownedFollowUpsText(entries, NOW)
    expect(text).toBe('Follow-ups nobody owns: Jane Doe (MGB), overdue since Mon 21 Sep · someone at Acme, due Fri 25 Sep')
    expect(text).not.toContain('Ann Lee')
    // The '' group on its own gives the same line.
    expect(unownedFollowUpsText(groupFollowUpsByOwner(entries)[''], NOW)).toBe(text)
  })

  it('names a few and counts the rest', () => {
    const entries = listFollowUps(
      Array.from({ length: 5 }, (_, index) => ownerless({ _id: `p${index}`, name: `Person ${index}`, followUpAt: at(index + 1) })),
      { now: NOW },
    )
    const text = unownedFollowUpsText(entries, NOW)
    expect(text).toMatch(/…and 2 more$/)
    expect(text.match(/Person \d/g)).toHaveLength(3)
    expect(unownedFollowUpsText(entries, NOW, 1)).toMatch(/…and 4 more$/)
    expect(unownedFollowUpsText(entries, NOW, Number.NaN)).toMatch(/…and 2 more$/)
  })

  it('escapes and clips hostile records, and stays a valid context block', () => {
    const huge = 'y'.repeat(5000)
    const entries = listFollowUps(
      [
        ownerless({ _id: 'h', name: '<!here> & co', organization: 'AT&T <5%>' }),
        ownerless({ _id: 'u', name: huge, organization: huge }),
        ownerless({ _id: 'p', name: 'Jane 617-555-0123', organization: '<@U999> jd@x.org' }),
      ],
      { now: NOW },
    )
    const text = unownedFollowUpsText(entries, NOW)
    expect(text).not.toContain('<!here>')
    expect(text).not.toContain('<@U999>')
    expect(text).not.toContain('@x.org')
    expect(text).not.toMatch(/617/)
    expect(text).toContain('&lt;!here&gt; &amp; co (AT&amp;T &lt;5%&gt;)')
    expectValidSlackBlocks([{ type: 'context', elements: [{ type: 'mrkdwn', text }] }])

    // Many long names cannot push the line past Slack's limit.
    const many = Array.from({ length: 40 }, (_, index) => ({ ...entries[1], contactId: `u${index}` }))
    const long = unownedFollowUpsText(many, NOW, 40)
    expect(long.length).toBeLessThanOrEqual(3000)
    expectValidSlackBlocks([{ type: 'context', elements: [{ type: 'mrkdwn', text: long }] }])
  })
})

describe('every due follow-up reaches the check-in', () => {
  // Regression: an ownerless follow-up is filed under '' and the check-in
  // renders one list per NAMED person, so it fell out of the message with no
  // count and no trace — often the warmest lead on file, with nobody chasing
  // it. This drives the real pipeline (list → group → check-in) and requires
  // every follow-up, owned or not, to appear in what gets posted.
  it('shows owned follow-ups in their owner\'s list and ownerless ones on their own line', () => {
    const entries = listFollowUps(
      [
        contact({ _id: 'owned', name: 'Ann Lee', owner: 'Juhan', followUpAt: at(1) }),
        contact({ _id: 'nobody', name: 'Jane Doe', owner: null, interactions: [], status: 'responded', followUpAt: at(-2) }),
      ],
      { now: NOW },
    )
    const toCheckIn = (entry: FollowUpEntry): CheckInFollowUp => ({
      ...followUpLine(entry, NOW),
      contactRef: encodeContactRef({ contactId: entry.contactId, organization: entry.organization }),
    })
    const followUpsByOwner = Object.fromEntries(
      Object.entries(groupFollowUpsByOwner(entries)).map(([owner, list]) => [owner, list.map(toCheckIn)]),
    )
    const { groups, unowned } = groupCheckInTasks([], { now: NOW, followUpsByOwner })
    const blocks = buildWeeklyCheckInBlocks({ weekLabel: 'Week of 21 Sep', groups, unowned, pulse: null, handle: '<@UBOT>', now: NOW })

    // What the check-in poster adds beside "Nobody has taken".
    const nobody = unownedFollowUpsText(entries, NOW)
    expect(nobody).not.toBe('')
    const message = [...blocks, { type: 'context', elements: [{ type: 'mrkdwn', text: nobody }] }]
    expectValidSlackBlocks(message)

    const posted = JSON.stringify(message)
    for (const entry of entries) expect(posted).toContain(entry.personLabel)
    expect(nobody).toContain('Jane Doe')
    expect(nobody).not.toContain('Ann Lee')
  })
})

describe('followUpReservedMinutes', () => {
  it('holds back fifteen minutes per follow-up', () => {
    expect(FOLLOW_UP_MINUTES_EACH).toBe(15)
    expect(followUpReservedMinutes(3, 240)).toBe(45)
    expect(followUpReservedMinutes(1, 240)).toBe(15)
  })

  it('never takes more than 40% of the week, so a backlog cannot erase the plan', () => {
    expect(FOLLOW_UP_BUDGET_SHARE).toBe(0.4)
    expect(followUpReservedMinutes(30, 240)).toBe(96)
    expect(followUpReservedMinutes(30, 100)).toBe(40)
  })

  it('is zero for nothing, and never negative for nonsense', () => {
    expect(followUpReservedMinutes(0, 240)).toBe(0)
    expect(followUpReservedMinutes(-4, 240)).toBe(0)
    expect(followUpReservedMinutes(Number.NaN, 240)).toBe(0)
    expect(followUpReservedMinutes(3, 0)).toBe(0)
    expect(followUpReservedMinutes(3, -60)).toBe(0)
    expect(followUpReservedMinutes(3, Number.NaN)).toBe(0)
    expect(followUpReservedMinutes(2.9, 240)).toBe(30)
  })
})

describe('followUpReservationLabel', () => {
  it('says how many and how long', () => {
    expect(followUpReservationLabel(3, followUpReservedMinutes(3, 240))).toBe('Follow-ups: 3 (~45m reserved)')
  })

  it('says when the cap bit rather than implying eight minutes each is enough', () => {
    expect(followUpReservationLabel(12, followUpReservedMinutes(12, 240))).toBe(
      'Follow-ups: 12 (~1h 36m reserved, capped at 40% of the week)',
    )
  })
})
