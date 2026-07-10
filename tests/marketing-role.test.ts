import { describe, expect, it } from 'vitest'
import { MARKETING_ROLES, isMarketingRole, resolveMarketingRoleParam } from '@/sanity/tools/marketingTool'

describe('marketing role param', () => {
  it('exposes exactly the two roles (coworker default first)', () => {
    expect([...MARKETING_ROLES]).toEqual(['coworker', 'principal'])
  })

  it('resolves valid ?role= params', () => {
    expect(resolveMarketingRoleParam('principal')).toBe('principal')
    expect(resolveMarketingRoleParam('coworker')).toBe('coworker')
  })

  it('returns null for unknown / empty / nullish params', () => {
    expect(resolveMarketingRoleParam('boss')).toBeNull()
    expect(resolveMarketingRoleParam('admin')).toBeNull()
    expect(resolveMarketingRoleParam('')).toBeNull()
    expect(resolveMarketingRoleParam(null)).toBeNull()
    expect(resolveMarketingRoleParam(undefined)).toBeNull()
  })

  it('isMarketingRole is a correct type guard', () => {
    expect(isMarketingRole('principal')).toBe(true)
    expect(isMarketingRole('coworker')).toBe(true)
    expect(isMarketingRole('nope')).toBe(false)
    expect(isMarketingRole(null)).toBe(false)
    expect(isMarketingRole(42)).toBe(false)
  })
})
