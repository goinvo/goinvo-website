import { describe, expect, it } from 'vitest'
import { buildCreatePayload, buildPatchPayload, MarketingValidationError } from '@/lib/marketing'

describe('marketing calendar enum enforcement (crud)', () => {
  it('accepts an in-set status on create', () => {
    const doc = buildCreatePayload('marketingCalendarItem', { title: 'Test', status: 'scheduled' })
    expect(doc.status).toBe('scheduled')
  })

  it('rejects an out-of-set status on create with MarketingValidationError', () => {
    expect(() =>
      buildCreatePayload('marketingCalendarItem', { title: 'Test', status: 'sheduled' }),
    ).toThrow(MarketingValidationError)

    try {
      buildCreatePayload('marketingCalendarItem', { title: 'Test', status: 'live' })
      throw new Error('expected throw')
    } catch (error) {
      const err = error as MarketingValidationError
      expect(err).toBeInstanceOf(MarketingValidationError)
      expect(err.invalid).toHaveLength(1)
      expect(err.invalid[0]).toMatchObject({ field: 'status', value: 'live' })
      expect(err.message).toMatch(/Invalid status "live"/)
    }
  })

  it('rejects an out-of-set status on patch', () => {
    expect(() => buildPatchPayload('marketingCalendarItem', { status: 'bogus' })).toThrow(
      MarketingValidationError,
    )
  })

  it('accepts an in-set status on patch', () => {
    const patch = buildPatchPayload('marketingCalendarItem', { status: 'published' })
    expect(patch.status).toBe('published')
  })

  it('scopes the calendar status set to calendar items only', () => {
    // marketingChannel legitimately uses status "active" (not a calendar status) —
    // the calendar enum check must not reject it.
    const patch = buildPatchPayload('marketingChannel', { status: 'active' })
    expect(patch.status).toBe('active')
  })

  it('still reports missing required fields (back-compat)', () => {
    try {
      buildCreatePayload('marketingCalendarItem', { status: 'idea' }) // missing title
      throw new Error('expected throw')
    } catch (error) {
      const err = error as MarketingValidationError
      expect(err.missing).toContain('title')
    }
  })
})
