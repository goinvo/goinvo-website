import { describe, expect, it } from 'vitest'
import { buildCreatePayload, buildPatchPayload, MarketingValidationError } from '@/lib/marketing'

function captureValidationError(action: () => unknown): MarketingValidationError {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(MarketingValidationError)
    return error as MarketingValidationError
  }
  throw new Error('Expected MarketingValidationError, but the action completed successfully.')
}

describe('marketing calendar enum enforcement (crud)', () => {
  it('accepts an in-set status on create', () => {
    const doc = buildCreatePayload('marketingCalendarItem', {
      title: 'Test',
      status: 'scheduled',
      publishAt: '2026-07-14T16:00:00.000Z',
    })
    expect(doc.status).toBe('scheduled')
  })

  it('rejects an out-of-set status on create with MarketingValidationError', () => {
    captureValidationError(() =>
      buildCreatePayload('marketingCalendarItem', { title: 'Test', status: 'sheduled' }),
    )

    const err = captureValidationError(() => {
      buildCreatePayload('marketingCalendarItem', { title: 'Test', status: 'live' })
    })
    expect(err.invalid).toHaveLength(1)
    expect(err.invalid[0]).toMatchObject({ field: 'status', value: 'live' })
    expect(err.message).toMatch(/Invalid status "live"/)
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
    const err = captureValidationError(() => {
      buildCreatePayload('marketingCalendarItem', { status: 'idea' }) // missing title
    })
    expect(err.missing).toContain('title')
  })
})
