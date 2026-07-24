import { describe, expect, it } from 'vitest'
import { MARKETING_FIELDS } from '@/lib/marketing/fieldPolicy'
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
      expect([...MARKETING_FIELDS[type]].sort(), `${type} field policy drifted`).toEqual(schemaFields)
    }
  })
})
