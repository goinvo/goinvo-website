import { describe, expect, it } from 'vitest'

import {
  availabilityDocId,
  findReassignments,
  hoursForWeek,
  isInForceOn,
  parseAvailabilityCommand,
  statusOn,
  whoIsAwayOn,
  type TeamMemberAvailability,
} from '@/lib/marketing/availability'

const entries: TeamMemberAvailability[] = [
  { ownerName: 'Juhan', status: 'away', from: '2026-09-01', until: '2026-09-05' },
  { ownerName: 'Shirley', status: 'reduced', from: '2026-09-01', weeklyHours: 1 },
  { ownerName: 'Jon', status: 'available' },
]

describe('isInForceOn', () => {
  it('treats both bounds as inclusive', () => {
    // "Away 1st to 5th" must mean away ON the 5th. An exclusive end date is the
    // off-by-one that puts work on somebody's last day away.
    const away = entries[0]
    expect(isInForceOn(away, '2026-09-01')).toBe(true)
    expect(isInForceOn(away, '2026-09-05')).toBe(true)
    expect(isInForceOn(away, '2026-08-31')).toBe(false)
    expect(isInForceOn(away, '2026-09-06')).toBe(false)
  })

  it('treats a missing bound as open-ended', () => {
    expect(isInForceOn({ ownerName: 'X', status: 'away' }, '2030-01-01')).toBe(true)
    expect(isInForceOn({ ownerName: 'X', status: 'away', from: '2026-01-01' }, '2030-01-01')).toBe(true)
  })

  it('tolerates a full timestamp where a date is expected', () => {
    expect(isInForceOn({ ownerName: 'X', status: 'away', from: '2026-09-01T12:00:00Z' }, '2026-09-02')).toBe(true)
  })
})

describe('statusOn', () => {
  it('reports the status in force on the day', () => {
    expect(statusOn(entries, 'Juhan', '2026-09-03')).toBe('away')
    expect(statusOn(entries, 'Juhan', '2026-09-30')).toBe('available')
    expect(statusOn(entries, 'Shirley', '2026-09-03')).toBe('reduced')
  })

  it('defaults to available for anyone with no record', () => {
    expect(statusOn(entries, 'Eric', '2026-09-03')).toBe('available')
    expect(statusOn([], '', '2026-09-03')).toBe('available')
  })

  it('matches the owner name case-insensitively', () => {
    expect(statusOn(entries, 'juhan', '2026-09-03')).toBe('away')
  })
})

describe('whoIsAwayOn', () => {
  it('lists only people actually away that day', () => {
    expect(whoIsAwayOn(entries, '2026-09-03')).toEqual(['Juhan'])
    expect(whoIsAwayOn(entries, '2026-09-30')).toEqual([])
  })
})

describe('findReassignments', () => {
  const tasks = [
    { _id: 'a', title: 'Call the top ten', ownerName: 'Juhan' },
    { _id: 'b', title: 'Publish the article', ownerName: 'Shirley' },
    { _id: 'c', title: 'Unowned chore' },
  ]
  const team = ['Juhan', 'Shirley', 'Jon']

  it('finds work owned by someone who is away', () => {
    const found = findReassignments({ tasks, entries, team, dateKey: '2026-09-03' })
    expect(found).toHaveLength(1)
    expect(found[0].task._id).toBe('a')
    expect(found[0].awayOwner).toBe('Juhan')
  })

  it('offers only people who are fully available, never the away owner', () => {
    const found = findReassignments({ tasks, entries, team, dateKey: '2026-09-03' })
    // Shirley is reduced that week, so she is not offered more work.
    expect(found[0].candidates).toEqual(['Jon'])
  })

  it('returns an empty candidate list rather than inventing one', () => {
    const found = findReassignments({
      tasks,
      entries: [{ ownerName: 'Juhan', status: 'away' }, { ownerName: 'Jon', status: 'away' }],
      team: ['Juhan', 'Jon'],
      dateKey: '2026-09-03',
    })
    expect(found[0].candidates).toEqual([])
  })

  it('does nothing when everyone is around', () => {
    expect(findReassignments({ tasks, entries, team, dateKey: '2026-09-30' })).toEqual([])
  })
})

describe('hoursForWeek', () => {
  it('gives an away person zero hours', () => {
    expect(hoursForWeek({ entries, ownerName: 'Juhan', dateKey: '2026-09-03', defaultHours: 4 })).toBe(0)
  })

  it('uses the stated hours for a reduced week', () => {
    expect(hoursForWeek({ entries, ownerName: 'Shirley', dateKey: '2026-09-03', defaultHours: 4 })).toBe(1)
  })

  it('uses a stated allocation even when the person is fully available', () => {
    // "Juhan does 4h of calls, Shirley does 4h of content" is two AVAILABLE
    // people with different budgets, not two reduced ones.
    const allocations = [
      { ownerName: 'Juhan', status: 'available' as const, weeklyHours: 4 },
      { ownerName: 'Shirley', status: 'available' as const, weeklyHours: 4 },
    ]
    expect(hoursForWeek({ entries: allocations, ownerName: 'Juhan', dateKey: '2026-09-03', defaultHours: 8 })).toBe(4)
    expect(hoursForWeek({ entries: allocations, ownerName: 'Shirley', dateKey: '2026-09-03', defaultHours: 8 })).toBe(4)
  })

  it('falls back to the studio default', () => {
    expect(hoursForWeek({ entries, ownerName: 'Jon', dateKey: '2026-09-03', defaultHours: 4 })).toBe(4)
    // Reduced but with no number given: better the default than a guess of zero.
    expect(
      hoursForWeek({
        entries: [{ ownerName: 'X', status: 'reduced' }],
        ownerName: 'X',
        dateKey: '2026-09-03',
        defaultHours: 4,
      }),
    ).toBe(4)
  })
})

describe('parseAvailabilityCommand', () => {
  const today = '2026-08-26'

  it('understands being away with a range', () => {
    expect(parseAvailabilityCommand('away 2026-09-01 2026-09-05', today)).toEqual({
      status: 'away',
      from: '2026-09-01',
      until: '2026-09-05',
    })
  })

  it('reads out sick as today — never "from today with no end"', () => {
    // An open-ended record kept somebody off every plan until they noticed.
    expect(parseAvailabilityCommand('I am out sick', today)).toEqual({ status: 'away', from: today, until: today })
  })

  it('understands coming back', () => {
    expect(parseAvailabilityCommand("i'm back", today)).toEqual({ status: 'available', from: today })
  })

  it('understands reduced hours', () => {
    expect(parseAvailabilityCommand('only 2 hours this week', today)).toMatchObject({
      status: 'reduced',
      weeklyHours: 2,
    })
  })

  it('returns null rather than guessing', () => {
    // A parser that guesses is worse than one that asks — booking the wrong
    // fortnight off is far more expensive than one clarifying reply.
    expect(parseAvailabilityCommand('hello there', today)).toBeNull()
    expect(parseAvailabilityCommand('', today)).toBeNull()
    expect(parseAvailabilityCommand('what is my status?', today)).toBeNull()
  })
})

describe('parseAvailabilityCommand — the days people actually say', () => {
  /** Thursday 24 Sep 2026, the fixture day. */
  const THURSDAY = '2026-09-24'
  const read = (text: string) => parseAvailabilityCommand(text, THURSDAY)
  const days = (text: string) => {
    const parsed = read(text)
    return parsed ? `${parsed.status} ${parsed.from}..${parsed.until ?? ''}` : null
  }

  it('reads "next week" as next Monday to Sunday, not the rest of this one', () => {
    expect(read('away next week')).toEqual({ status: 'away', from: '2026-09-28', until: '2026-10-04' })
    expect(days('I’m on holiday next week')).toBe('away 2026-09-28..2026-10-04')
  })

  it('reads this week, today, tomorrow and a weekday', () => {
    expect(days('ooo this week')).toBe('away 2026-09-24..2026-09-27')
    expect(days('away the rest of the week')).toBe('away 2026-09-24..2026-09-27')
    expect(days('out today')).toBe('away 2026-09-24..2026-09-24')
    expect(days('off tomorrow')).toBe('away 2026-09-25..2026-09-25')
    expect(days('away Fri')).toBe('away 2026-09-25..2026-09-25')
    expect(days('I’m on holiday friday')).toBe('away 2026-09-25..2026-09-25')
    // The same weekday is today, not a week from now.
    expect(days('away Thursday')).toBe('away 2026-09-24..2026-09-24')
    expect(days('out this afternoon')).toBe('away 2026-09-24..2026-09-24')
  })

  it('reads "until X" as today to X, and a single date as that day', () => {
    expect(days('away until Fri')).toBe('away 2026-09-24..2026-09-25')
    expect(days('I’m out until 2026-10-02')).toBe('away 2026-09-24..2026-10-02')
    expect(days('away 2026-10-05')).toBe('away 2026-10-05..2026-10-05')
    expect(days('away 5 Oct')).toBe('away 2026-10-05..2026-10-05')
  })

  it('reads a range however it is written', () => {
    for (const text of ['away 1–5 Oct', 'away 1-5 Oct', 'away Oct 1-5', 'away 1 Oct - 5 Oct', 'away 1st to 5th Oct', 'away 2026-10-01 2026-10-05']) {
      expect(days(text), text).toBe('away 2026-10-01..2026-10-05')
    }
    expect(days('away 28 Sep – 2 Oct')).toBe('away 2026-09-28..2026-10-02')
    expect(days('away mon-fri')).toBe('away 2026-09-28..2026-10-02')
    expect(days('away today and tomorrow')).toBe('away 2026-09-24..2026-09-25')
    // December into January rolls the year.
    expect(parseAvailabilityCommand('away 28 Dec - 3 Jan', '2026-12-10')).toEqual({ status: 'away', from: '2026-12-28', until: '2027-01-03' })
  })

  it('reads a weekday written beside a date as ONE day — the way Marqueta prints dates', () => {
    // "Fri 2 Oct" used to be a range: the weekday became this Friday and the
    // date the end, so it booked eight days off instead of one.
    expect(days('away Fri 2 Oct')).toBe('away 2026-10-02..2026-10-02')
    expect(days('away friday 2 october')).toBe('away 2026-10-02..2026-10-02')
    expect(days('away Thu 1 Oct')).toBe('away 2026-10-01..2026-10-01')
    expect(days('away Fri, 2 Oct')).toBe('away 2026-10-02..2026-10-02')
    expect(days('away Oct 2 Fri')).toBe('away 2026-10-02..2026-10-02')
    // "until" still means today to that day.
    expect(days('away until Fri 2 Oct')).toBe('away 2026-09-24..2026-10-02')
    expect(days('back Mon 28 Sep')).toBe('away 2026-09-24..2026-09-27')
    // The range she prints herself (formatSlackRange) reads back as itself.
    expect(days('away Mon 28 Sep – Sun 4 Oct')).toBe('away 2026-09-28..2026-10-04')
    expect(days('away Mon 28 Sep to Fri 2 Oct')).toBe('away 2026-09-28..2026-10-02')
  })

  it('asks when the weekday and the date disagree — there is no Friday 3 October', () => {
    expect(read('away Fri 3 Oct')).toBeNull()
    expect(read('away 2 Oct Thu')).toBeNull()
    // Nor two days after "until": which one is the last?
    expect(read('away until 1 Oct - 5 Oct')).toBeNull()
  })

  it('reads "back Mon" as away until the day before', () => {
    expect(days('back Mon')).toBe('away 2026-09-24..2026-09-27')
    expect(days('I’m back on Monday')).toBe('away 2026-09-24..2026-09-27')
    expect(read('I’m back today')).toEqual({ status: 'available', from: THURSDAY })
  })

  it('bare "away" is the rest of this week, as the Monday plan’s button books it; bare "out" or "off" is not enough', () => {
    expect(days('away')).toBe('away 2026-09-24..2026-09-27')
    expect(read('I’m out')).toBeNull()
    expect(read('I’m off')).toBeNull()
  })

  it('returns null whenever it is unsure — never today with no end', () => {
    for (const text of [
      'away for 2 weeks',
      'away in October',
      'away next Friday', // this one, or the one after?
      'away Mon and Wed', // two days, not one stretch
      'away from Monday', // no end
      'away 2026-09-01 2026-09-05', // already over
      'away 1-5 Sep', // passed this year; eleven months out is more likely a slip
      'away until the 5th',
      'I may be away tomorrow',
      'away 2026-09-28, back 2026-10-05', // two statements
      'available from Monday',
      'away 2026-02-31',
    ]) {
      expect(read(text), text).toBeNull()
    }
    for (const text of ['away', 'away next week', 'out sick', 'away Fri', 'back Mon']) {
      expect(read(text)?.until, text).toBeTruthy()
    }
  })
})

describe('availabilityDocId', () => {
  it('is deterministic and safe as an id', () => {
    expect(availabilityDocId('Juhan')).toBe('marketingTeamAvailability.juhan')
    expect(availabilityDocId('Mary-Ann O’Brien')).toBe('marketingTeamAvailability.mary-ann-o-brien')
    expect(availabilityDocId('')).toBe('marketingTeamAvailability.unknown')
  })
})
