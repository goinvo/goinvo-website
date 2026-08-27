import { describe, expect, it } from 'vitest'

import {
  addMonths,
  applyCommitment,
  describeRunway,
  formatMonths,
  monthsOfRunway,
  postureForRunwayMonths,
  resolveRunwayPosture,
  runwayCheckIn,
  RUNWAY_STALE_DAYS,
} from '@/lib/marketing/runway'

const AUG = new Date('2026-08-27T12:00:00Z')

describe('monthsOfRunway', () => {
  it('measures from today to the last day we can pay for', () => {
    expect(monthsOfRunway('2027-01-11', AUG)).toBeCloseTo(4.5, 1)
  })

  it('returns null when nothing is recorded, rather than guessing zero', () => {
    // Zero would read as "we are out of money", which is a very different claim
    // from "nobody has told us".
    expect(monthsOfRunway(undefined, AUG)).toBeNull()
    expect(monthsOfRunway('not a date', AUG)).toBeNull()
  })

  it('goes negative once the date has passed', () => {
    expect(monthsOfRunway('2026-07-01', AUG)).toBeLessThan(0)
  })
})

describe('postureForRunwayMonths', () => {
  it('maps months onto the bins the strategy is written against', () => {
    expect(postureForRunwayMonths(1)).toBe('survival')
    expect(postureForRunwayMonths(2.9)).toBe('survival')
    expect(postureForRunwayMonths(3)).toBe('rebuild')
    expect(postureForRunwayMonths(4.5)).toBe('rebuild')
    expect(postureForRunwayMonths(6)).toBe('stable')
    expect(postureForRunwayMonths(18)).toBe('growth')
  })

  it('treats a spent runway as survival', () => {
    expect(postureForRunwayMonths(0)).toBe('survival')
    expect(postureForRunwayMonths(-2)).toBe('survival')
  })
})

describe('resolveRunwayPosture', () => {
  it('derives the posture from the date when the date is the newer fact', () => {
    const resolved = resolveRunwayPosture(
      {
        posture: 'survival',
        setAt: '2026-07-11T15:19:37Z',
        runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T09:00:00Z' },
      },
      AUG,
    )
    expect(resolved.id).toBe('rebuild')
    expect(resolved.source).toBe('runway')
  })

  it('lets a human override the arithmetic when they spoke last', () => {
    // Someone deliberately saying "treat us as survival" knows something the
    // date does not — a client wobbling, an invoice that will not be paid.
    const resolved = resolveRunwayPosture(
      {
        posture: 'survival',
        setAt: '2026-08-26T10:00:00Z',
        runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T09:00:00Z' },
      },
      AUG,
    )
    expect(resolved.id).toBe('survival')
    expect(resolved.source).toBe('manual')
  })

  it('never silently resolves a disagreement', () => {
    const resolved = resolveRunwayPosture(
      {
        posture: 'survival',
        setAt: '2026-07-11T15:19:37Z',
        runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T09:00:00Z' },
      },
      AUG,
    )
    expect(resolved.disagreement).toContain('Survival')
    expect(resolved.disagreement).toContain('Rebuild')
  })

  it('says nothing about disagreement when they agree', () => {
    const resolved = resolveRunwayPosture(
      { posture: 'rebuild', setAt: '2026-08-01T00:00:00Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' } },
      AUG,
    )
    expect(resolved.disagreement).toBeNull()
  })

  it('falls back to the default rather than inventing a bin', () => {
    const resolved = resolveRunwayPosture({}, AUG)
    expect(resolved.id).toBe('survival')
    expect(resolved.source).toBe('default')
    expect(resolved.months).toBeNull()
  })

  it('decays on its own as the date approaches', () => {
    // The whole point: the same stored record, read later, recommends a
    // different strategy without anyone remembering to change it.
    const stored = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' } }
    expect(resolveRunwayPosture(stored, AUG).id).toBe('rebuild')
    expect(resolveRunwayPosture(stored, new Date('2026-11-27T00:00:00Z')).id).toBe('survival')
  })
})

describe('runwayCheckIn', () => {
  const fresh = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' } }

  it('stays quiet when the number was just confirmed', () => {
    expect(runwayCheckIn(fresh, AUG).due).toBe(false)
  })

  it('asks when nothing has ever been recorded', () => {
    const check = runwayCheckIn({ posture: 'survival' }, AUG)
    expect(check.due).toBe(true)
    expect(check.reason).toMatch(/no runway/i)
  })

  it('asks once the record has gone stale', () => {
    const later = new Date(AUG.getTime() + (RUNWAY_STALE_DAYS + 1) * 86_400_000)
    expect(runwayCheckIn(fresh, later).due).toBe(true)
  })

  it('gets urgent before the runway ends, not after', () => {
    // Two months out the strategy is about to tighten sharply; asking then is
    // useful, asking in January is an obituary.
    const check = runwayCheckIn(fresh, new Date('2026-11-25T00:00:00Z'))
    expect(check.due).toBe(true)
    expect(check.urgent).toBe(true)
  })

  it('is urgent when the runway has already run out', () => {
    const check = runwayCheckIn({ runway: { certainUntil: '2026-08-01', confirmedAt: '2026-08-20T00:00:00Z' } }, AUG)
    expect(check.urgent).toBe(true)
  })
})

describe('applyCommitment', () => {
  it('extends from the existing date, not from today', () => {
    // Signing three months of work in August when the runway already reaches
    // January means April, not November. Resetting from today would silently
    // throw away the runway that was already there.
    const next = applyCommitment(
      { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' },
      { label: 'SoW — Acme discovery', signedAt: '2026-08-27', monthsAdded: 3 },
      AUG,
    )
    expect(next.certainUntil).toBe(addMonths(3, new Date('2027-01-11T00:00:00Z')))
    expect(next.certainUntil! > '2027-04-01').toBe(true)
  })

  it('extends from today when the runway has already run out', () => {
    // Money signed today cannot buy back months already spent.
    const next = applyCommitment(
      { certainUntil: '2026-06-01' },
      { label: 'SoW — late', signedAt: '2026-08-27', monthsAdded: 2 },
      AUG,
    )
    expect(next.certainUntil).toBe(addMonths(2, AUG))
  })

  it('keeps every commitment as a log', () => {
    const first = applyCommitment({}, { label: 'A', signedAt: '2026-08-01', monthsAdded: 1 }, AUG)
    const second = applyCommitment(first, { label: 'B', signedAt: '2026-08-27', monthsAdded: 1 }, AUG)
    expect(second.commitments?.map((c) => c.label)).toEqual(['A', 'B'])
  })

  it('counts as a confirmation', () => {
    const next = applyCommitment({}, { label: 'A', signedAt: '2026-08-27', monthsAdded: 3 }, AUG)
    expect(runwayCheckIn({ runway: next }, AUG).due).toBe(false)
  })
})

describe('formatMonths', () => {
  it('rounds to the half month, because the number is rough', () => {
    expect(formatMonths(4.47)).toBe('4.5 months')
    expect(formatMonths(1)).toBe('1 month')
  })

  it('drops to weeks when months would be misleading', () => {
    expect(formatMonths(0.5)).toBe('2 weeks')
  })

  it('says none rather than a negative number of months', () => {
    expect(formatMonths(-3)).toBe('none')
  })
})

describe('describeRunway', () => {
  it('states the number and the date, not just the bin', () => {
    const line = describeRunway({ runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' } }, AUG)
    expect(line).toContain('4.5 months')
    expect(line).toContain('Jan 2027')
    expect(line).toContain('Rebuild')
  })

  it('admits when it is assuming', () => {
    expect(describeRunway({ posture: 'survival' }, AUG)).toMatch(/assumption/i)
  })
})
