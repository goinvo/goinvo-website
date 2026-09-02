import { describe, expect, it } from 'vitest'

import {
  assessDomain,
  daysUntil,
  domainsWorthMentioning,
  expiryFromRdap,
  hasUrgentDomain,
  rdapUrlFor,
  watchedDomains,
} from '@/lib/marketing/domainWatch'

const NOW = new Date('2026-09-02T15:00:00Z')
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

describe('rdapUrlFor', () => {
  it('goes straight to the registry for the TLDs the studio holds', () => {
    expect(rdapUrlFor('goinvo.com')).toBe('https://rdap.verisign.com/com/v1/domain/goinvo.com')
    expect(rdapUrlFor('determinantsofhealth.org')).toBe(
      'https://rdap.publicinterestregistry.org/rdap/domain/determinantsofhealth.org',
    )
  })

  it('normalises what a person would paste', () => {
    expect(rdapUrlFor('  WWW.GoInvo.com ')).toBe('https://rdap.verisign.com/com/v1/domain/goinvo.com')
  })

  it('falls back to the redirector for an unfamiliar TLD', () => {
    expect(rdapUrlFor('example.health')).toBe('https://rdap.org/domain/example.health')
  })
})

describe('expiryFromRdap', () => {
  it('reads the expiration event, not the other five', () => {
    // A real payload carries registration, expiration, last changed, and the
    // database's own update time - picking the wrong one silently watches the
    // wrong date forever.
    const payload = {
      events: [
        { eventAction: 'registration', eventDate: '2008-09-03T01:37:46Z' },
        { eventAction: 'expiration', eventDate: '2027-09-03T01:37:46Z' },
        { eventAction: 'last changed', eventDate: '2026-09-02T19:03:41Z' },
        { eventAction: 'last update of RDAP database', eventDate: '2026-09-02T19:04:08Z' },
      ],
    }
    expect(expiryFromRdap(payload)).toBe('2027-09-03T01:37:46Z')
  })

  it('returns null rather than guessing when there is no expiry', () => {
    expect(expiryFromRdap({ events: [] })).toBeNull()
    expect(expiryFromRdap(null)).toBeNull()
    expect(expiryFromRdap({ events: [{ eventAction: 'expiration', eventDate: 'not a date' }] })).toBeNull()
  })
})

describe('assessDomain', () => {
  it('says nothing at all when there is nothing to say', () => {
    // goinvo.com after the 2026-09-02 renewal: a year out. A watch that speaks
    // every week is one people learn to scroll past.
    const status = assessDomain({ domain: 'goinvo.com', expiresAt: '2027-09-03T01:37:46Z' }, NOW)
    expect(status.level).toBe('ok')
    expect(status.message).toBe('')
  })

  it('escalates as the date approaches', () => {
    expect(assessDomain({ domain: 'x.com', expiresAt: inDays(59) }, NOW).level).toBe('notice')
    expect(assessDomain({ domain: 'x.com', expiresAt: inDays(21) }, NOW).level).toBe('warning')
    expect(assessDomain({ domain: 'x.com', expiresAt: inDays(3) }, NOW).level).toBe('urgent')
    expect(assessDomain({ domain: 'x.com', expiresAt: inDays(-2) }, NOW).level).toBe('expired')
  })

  it('names the actual failure mode when it is urgent', () => {
    // The way a long-held domain dies is not forgetfulness — it is auto-renew
    // succeeding against a card that expired a year ago.
    const status = assessDomain({ domain: 'goinvo.com', expiresAt: inDays(1) }, NOW)
    expect(status.message).toMatch(/card on file/i)
    expect(status.message).toMatch(/silently/i)
  })

  it('reports a failed lookup instead of treating it as healthy', () => {
    // A lookup that quietly fails every week is indistinguishable from a domain
    // that is fine, which is exactly the failure this watch exists to prevent.
    const status = assessDomain({ domain: 'goinvo.com', expiresAt: null, error: 'timed out' }, NOW)
    expect(status.level).toBe('unknown')
    expect(status.message).toContain('timed out')
    expect(domainsWorthMentioning([status])).toHaveLength(1)
  })

  it('would have caught the real 2026-09-02 near-miss', () => {
    // The actual record: expiry 2026-09-03T01:37:46Z, checked that morning.
    const morning = new Date('2026-09-02T13:00:00Z')
    const status = assessDomain({ domain: 'goinvo.com', expiresAt: '2026-09-03T01:37:46Z' }, morning)
    expect(status.level).toBe('urgent')
    expect(status.daysLeft).toBe(0)
  })
})

describe('domainsWorthMentioning', () => {
  it('drops the healthy ones so the digest stays quiet', () => {
    const statuses = [
      assessDomain({ domain: 'goinvo.com', expiresAt: '2027-09-03T01:37:46Z' }, NOW),
      assessDomain({ domain: 'determinantsofhealth.org', expiresAt: '2031-04-03T00:00:00Z' }, NOW),
    ]
    expect(domainsWorthMentioning(statuses)).toEqual([])
    expect(hasUrgentDomain(statuses)).toBe(false)
  })

  it('flags urgency separately from mere mention', () => {
    const statuses = [assessDomain({ domain: 'x.com', expiresAt: inDays(45) }, NOW)]
    expect(domainsWorthMentioning(statuses)).toHaveLength(1)
    expect(hasUrgentDomain(statuses)).toBe(false)
  })
})

describe('watchedDomains', () => {
  it('defaults to the two the studio actually owns', () => {
    expect(watchedDomains()).toContain('goinvo.com')
    expect(watchedDomains()).toContain('determinantsofhealth.org')
  })
})

describe('daysUntil', () => {
  it('counts whole days remaining', () => {
    expect(daysUntil(inDays(10), NOW)).toBe(10)
    expect(daysUntil(inDays(-1), NOW)).toBe(-1)
  })
})
