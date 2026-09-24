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

describe('runwayCheckIn — a win since the last confirmation', () => {
  // Confirmed 27 Aug; on 12 Sep the record is 16 days old and ~4 months out,
  // so none of the original three triggers fire. Only the win can.
  const fresh = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T00:00:00Z' } }
  const SEP_12 = new Date('2026-09-12T12:00:00Z')

  it('asks whether a win logged after the confirmation moved the date', () => {
    const check = runwayCheckIn(fresh, SEP_12, { latestWin: { at: '2026-09-10T15:00:00Z', label: 'Jane Doe (Acme)' } })
    expect(check.due).toBe(true)
    // Good news is not urgent — it just should not go unrecorded.
    expect(check.urgent).toBe(false)
    // formatRunwayDate is en-GB, and newer ICU spells September "Sept".
    expect(check.reason).toMatch(/^Jane Doe \(Acme\) was marked won on 10 Sept? 2026 — did it extend the runway\?$/)
    expect(check.question).toBe('The date still says 4 months (to 11 Jan 2027).')
  })

  it('accepts a bare date as well as a datetime', () => {
    const check = runwayCheckIn(fresh, SEP_12, { latestWin: { at: '2026-09-10', label: 'Acme' } })
    expect(check.due).toBe(true)
    expect(check.reason).toMatch(/10 Sept? 2026/)
  })

  it('stays quiet about a win the person confirming already knew about', () => {
    expect(runwayCheckIn(fresh, SEP_12, { latestWin: { at: '2026-08-20T00:00:00Z', label: 'Acme' } }).due).toBe(false)
    // Strictly newer: a win logged the same instant as the confirmation was in hand.
    expect(runwayCheckIn(fresh, SEP_12, { latestWin: { at: '2026-08-27T00:00:00Z', label: 'Acme' } }).due).toBe(false)
  })

  it('ignores a win with no usable date rather than asking on a guess', () => {
    expect(runwayCheckIn(fresh, SEP_12, { latestWin: { at: 'yesterday', label: 'Acme' } }).due).toBe(false)
    expect(runwayCheckIn(fresh, SEP_12, { latestWin: { at: '', label: 'Acme' } }).due).toBe(false)
  })

  it('behaves exactly as before when no win is passed', () => {
    for (const now of [AUG, SEP_12, new Date('2026-11-25T00:00:00Z'), new Date('2026-10-01T00:00:00Z')]) {
      const baseline = runwayCheckIn(fresh, now)
      expect(runwayCheckIn(fresh, now, {})).toEqual(baseline)
      expect(runwayCheckIn(fresh, now, { latestWin: null })).toEqual(baseline)
    }
    expect(runwayCheckIn({ posture: 'survival' }, AUG, {})).toEqual(runwayCheckIn({ posture: 'survival' }, AUG))
  })

  it('never outranks a runway that is running out, stale, or missing', () => {
    const win = { latestWin: { at: '2026-11-20T00:00:00Z', label: 'Acme' } }

    const urgent = runwayCheckIn(fresh, new Date('2026-11-25T00:00:00Z'), win)
    expect(urgent.urgent).toBe(true)
    expect(urgent.reason).not.toContain('Acme')

    const stale = runwayCheckIn(fresh, new Date(AUG.getTime() + (RUNWAY_STALE_DAYS + 1) * 86_400_000), {
      latestWin: { at: '2026-09-15T00:00:00Z', label: 'Acme' },
    })
    expect(stale.due).toBe(true)
    expect(stale.reason).toMatch(/last confirmed/)

    const never = runwayCheckIn({ runway: { certainUntil: '2027-01-11' } }, SEP_12, win)
    expect(never.reason).toMatch(/never been confirmed/)

    const missing = runwayCheckIn({}, SEP_12, win)
    expect(missing.reason).toMatch(/no runway/i)
  })

  it('cannot be turned into a channel ping by a contact name, and stays one line', () => {
    const check = runwayCheckIn(fresh, SEP_12, {
      latestWin: { at: '2026-09-10T15:00:00Z', label: `<!here> AT&T <@U123>\n${'x'.repeat(5000)}` },
    })
    expect(check.reason).not.toMatch(/[<>]/)
    expect(check.reason).toContain('!here AT&T @U123')
    expect(check.reason).not.toContain('\n')
    expect(check.reason.length).toBeLessThan(200)
    expect(runwayCheckIn(fresh, SEP_12, { latestWin: { at: '2026-09-10', label: '  ' } }).reason).toMatch(/^A deal was/)
  })

  it('leaves the resolved posture alone — a pending question is not a new number', () => {
    expect(resolveRunwayPosture(fresh, SEP_12).id).toBe('rebuild')
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
