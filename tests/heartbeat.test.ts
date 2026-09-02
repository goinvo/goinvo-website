import { describe, expect, it } from 'vitest'

import {
  heartbeatHealth,
  tickDidSomething,
  HEARTBEAT_STALE_DAYS,
  type HeartbeatRecord,
} from '@/lib/marketing/heartbeat'

const NOW = new Date('2026-09-02T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString()

const healthy: HeartbeatRecord = {
  week: '2026-W36',
  ranAt: daysAgo(1),
  lastHealthyAt: daysAgo(1),
  steps: [
    { name: 'plan', ok: true, count: 11, detail: '11 item(s) planned for 2026-W36.' },
    { name: 'digest', ok: true, count: 11, detail: 'digest posted with 11 task(s).' },
  ],
}

describe('heartbeatHealth', () => {
  it('distinguishes never-ran from ran-and-failed from ran-a-while-ago', () => {
    // Collapsing these to a boolean is how a dead job looks healthy: "never
    // ran" needs a deploy, "failed" needs a fix, "stale" needs a look.
    expect(heartbeatHealth(null, NOW).everRan).toBe(false)
    expect(heartbeatHealth({ ...healthy, error: 'digest returned 503' }, NOW).healthy).toBe(false)
    expect(heartbeatHealth({ ...healthy, ranAt: daysAgo(HEARTBEAT_STALE_DAYS + 1) }, NOW).stale).toBe(true)
    expect(heartbeatHealth(healthy, NOW).healthy).toBe(true)
  })

  it('says plainly that nothing is scheduled when it has never run', () => {
    // This was literally true of the whole suite for months, and nothing
    // anywhere said so.
    const health = heartbeatHealth(undefined, NOW)
    expect(health.summary).toMatch(/never run/i)
    expect(health.summary).toMatch(/nothing is scheduled/i)
  })

  it('treats a failed step as unhealthy even with no top-level error', () => {
    const partly: HeartbeatRecord = {
      ...healthy,
      steps: [
        { name: 'plan', ok: true, count: 11, detail: '11 item(s) planned.' },
        { name: 'digest', ok: false, count: 0, detail: 'digest returned 503: not_in_channel' },
      ],
    }
    const health = heartbeatHealth(partly, NOW)
    expect(health.healthy).toBe(false)
    expect(health.summary).toContain('not_in_channel')
  })

  it('gives a week of grace before calling a weekly job stale', () => {
    // A cron can slip and a deploy can land mid-run; two missed weeks is
    // broken, one late day is not.
    expect(heartbeatHealth({ ...healthy, ranAt: daysAgo(8) }, NOW).stale).toBe(false)
    expect(heartbeatHealth({ ...healthy, ranAt: daysAgo(21) }, NOW).stale).toBe(true)
  })
})

describe('tickDidSomething', () => {
  it('is false when every step succeeded but nothing happened', () => {
    // The first version parsed the prose for a digit and found the YEAR in
    // "2026-W36", so an inert run reported itself as productive.
    // The failure mode this whole record exists to catch: a cron that returns
    // 200 while doing nothing is indistinguishable from one that works.
    expect(
      tickDidSomething([
        { name: 'plan', ok: true, count: 0, detail: '0 item(s) planned for 2026-W36.' },
        { name: 'digest', ok: true, count: 0, detail: 'digest posted with 0 task(s).' },
      ]),
    ).toBe(false)
  })

  it('is true when a step reports real work', () => {
    expect(tickDidSomething(healthy.steps!)).toBe(true)
  })

  it('does not count work claimed by a failed step', () => {
    expect(
      tickDidSomething([{ name: 'plan', ok: false, count: 11, detail: 'plan-week returned 500 after 11 items' }]),
    ).toBe(false)
  })
})
