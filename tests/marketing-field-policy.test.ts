import { describe, expect, it } from 'vitest'
import { assertAllowedMarketingFields, MARKETING_FIELDS, ROUTE_OWNED_FIELDS } from '@/lib/marketing/fieldPolicy'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'
import { schemaTypes } from '@/sanity/schemas'

describe('managed Marketing API field policy', () => {
  it('exactly mirrors every managed document schema top-level field', () => {
    expect(MANAGED_MARKETING_TYPES.length).toBeGreaterThan(0)
    for (const type of MANAGED_MARKETING_TYPES) {
      const schema = schemaTypes.find((candidate) => candidate.name === type)
      expect(schema, `${type} must be registered`).toBeDefined()
      const schemaFields = ((schema as { fields?: Array<{ name: string }> } | undefined)?.fields || [])
        .map((field) => field.name)
        .sort()
      const routeOwned = ROUTE_OWNED_FIELDS[type] || []
      expect([...MARKETING_FIELDS[type], ...routeOwned].sort(), `${type} field policy drifted`).toEqual(schemaFields)
      for (const field of routeOwned) expect(MARKETING_FIELDS[type], `${type}.${field} is route-owned`).not.toContain(field)
    }
  })

  it('refuses the private copy, the client sign-off and the Rendomat link through the generic document API', () => {
    for (const field of ['clientSignOff', 'privateVideo', 'rendomatProjectUrl', 'rendomatLinkedAt']) {
      expect(() => assertAllowedMarketingFields('marketingCalendarItem', { [field]: { status: 'approved' } }), field).toThrow(/Unknown field/)
    }
  })
})
