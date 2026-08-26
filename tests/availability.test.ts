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

  it('understands being away from today with no end', () => {
    expect(parseAvailabilityCommand('I am out sick', today)).toEqual({
      status: 'away',
      from: today,
      until: undefined,
    })
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

describe('availabilityDocId', () => {
  it('is deterministic and safe as an id', () => {
    expect(availabilityDocId('Juhan')).toBe('marketingTeamAvailability.juhan')
    expect(availabilityDocId('Mary-Ann O’Brien')).toBe('marketingTeamAvailability.mary-ann-o-brien')
    expect(availabilityDocId('')).toBe('marketingTeamAvailability.unknown')
  })
})
