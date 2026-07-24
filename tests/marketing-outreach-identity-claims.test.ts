import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  buildMarketingContactIdentityClaims,
  fetchMarketingContactIdentityClaims,
  haveSameContactStrongIdentities,
  MARKETING_CONTACT_IDENTITY_CLAIM_PREFIX,
  MARKETING_CONTACT_IDENTITY_CLAIM_TYPE,
  planMarketingContactIdentityClaimUpdate,
  type MarketingContactIdentityClaim,
} from '@/lib/marketing/outreachIdentityClaims'

function claim(identity: string, contactId = 'contact-1'): MarketingContactIdentityClaim {
  return {
    _id: `${MARKETING_CONTACT_IDENTITY_CLAIM_PREFIX}${createHash('sha256').update(identity).digest('hex').slice(0, 40)}`,
    _type: MARKETING_CONTACT_IDENTITY_CLAIM_TYPE,
    contactId,
  }
}

describe('outreach contact identity claim lifecycle', () => {
  it('builds deterministic opaque claims for every normalized strong identity', async () => {
    const claims = await buildMarketingContactIdentityClaims({
      name: 'Jane Doe',
      organization: 'Acme',
      email: ' JANE@EXAMPLE.COM ',
      phone: '+1 (617) 555-0100',
      linkedinUrl: 'https://www.linkedin.com/in/jane-doe/?trk=profile',
    }, 'contact-1')

    expect(claims).toEqual(expect.arrayContaining([
      claim('email:jane@example.com'),
      claim('phone:16175550100'),
      claim('linkedin:linkedin.com/in/jane-doe'),
    ]))
    expect(claims).toHaveLength(3)
    expect(JSON.stringify(claims)).not.toContain('jane@example.com')
    expect(JSON.stringify(claims)).not.toContain('6175550100')
  })

  it('compares normalized strong identities without treating display-only edits as changes', () => {
    expect(haveSameContactStrongIdentities(
      { email: 'JANE@example.com', phone: '+1 (617) 555-0100' },
      { email: ' jane@example.com ', phone: '1-617-555-0100' },
    )).toBe(true)
    expect(haveSameContactStrongIdentities(
      { email: 'jane@example.com' },
      { email: 'jane.new@example.com' },
    )).toBe(false)
  })

  it('deletes stale claims, preserves unchanged claims, and creates only new claims', () => {
    const email = claim('email:jane@example.com')
    const oldPhone = claim('phone:16175550100')
    const newLinkedIn = claim('linkedin:linkedin.com/in/jane-doe')

    expect(planMarketingContactIdentityClaimUpdate(
      [email, oldPhone],
      [email, newLinkedIn],
    )).toEqual({
      deleteIds: [oldPhone._id],
      createClaims: [newLinkedIn],
    })
  })

  it('fails closed when claim reads fail or return inconsistent deletion targets', async () => {
    const fetchFailure = new Error('network unavailable')
    const failingClient = { fetch: vi.fn().mockRejectedValue(fetchFailure) }
    await expect(fetchMarketingContactIdentityClaims(failingClient, 'contact-1')).rejects.toBe(fetchFailure)

    const malformedClient = {
      fetch: vi.fn().mockResolvedValue([{
        _id: 'marketingContactIdentity-safe-looking',
        _type: MARKETING_CONTACT_IDENTITY_CLAIM_TYPE,
        contactId: 'another-contact',
      }]),
    }
    await expect(fetchMarketingContactIdentityClaims(malformedClient, 'contact-1'))
      .rejects.toThrow(/inconsistent/i)
  })
})
