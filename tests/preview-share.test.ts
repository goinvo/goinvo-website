import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXPIRY_DAYS,
  bareDocId,
  expiresAtFrom,
  isShareLinkActive,
  isShareableDocType,
  normalizeExpiryDays,
  resolvePreviewPathForType,
  shareLinkUrl,
} from '@/lib/previewShare'
import { generateShareToken, hashShareToken } from '@/lib/previewShare.server'

describe('previewShare pure helpers', () => {
  it('resolves public paths only for shareable types with a slug', () => {
    expect(resolvePreviewPathForType('feature', 'my-article')).toBe('/vision/my-article')
    expect(resolvePreviewPathForType('caseStudy', 'my-case')).toBe('/work/my-case')
    expect(resolvePreviewPathForType('feature', undefined)).toBeNull()
    expect(resolvePreviewPathForType('teamMember', 'someone')).toBeNull()
    expect(resolvePreviewPathForType(undefined, 'x')).toBeNull()
  })

  it('identifies shareable types', () => {
    expect(isShareableDocType('feature')).toBe(true)
    expect(isShareableDocType('caseStudy')).toBe(true)
    expect(isShareableDocType('marketingCalendarItem')).toBe(false)
    expect(isShareableDocType(undefined)).toBe(false)
  })

  it('strips the drafts. prefix to a shared key', () => {
    expect(bareDocId('drafts.abc-123')).toBe('abc-123')
    expect(bareDocId('abc-123')).toBe('abc-123')
  })

  it('clamps expiry to an offered option, defaulting otherwise', () => {
    expect(normalizeExpiryDays(7)).toBe(7)
    expect(normalizeExpiryDays(30)).toBe(30)
    expect(normalizeExpiryDays(99)).toBe(DEFAULT_EXPIRY_DAYS)
    expect(normalizeExpiryDays('14')).toBe(14)
    expect(normalizeExpiryDays(undefined)).toBe(DEFAULT_EXPIRY_DAYS)
    expect(normalizeExpiryDays(-1)).toBe(DEFAULT_EXPIRY_DAYS)
  })

  it('computes a future ISO expiry from a supplied now', () => {
    const now = Date.parse('2026-07-07T00:00:00.000Z')
    expect(expiresAtFrom(now, 7)).toBe('2026-07-14T00:00:00.000Z')
    // out-of-range days fall back to the default
    expect(expiresAtFrom(now, 999)).toBe(
      new Date(now + DEFAULT_EXPIRY_DAYS * 86400000).toISOString(),
    )
  })

  it('treats a link as active only when unrevoked and unexpired', () => {
    const now = Date.parse('2026-07-07T12:00:00.000Z')
    const future = '2026-07-20T00:00:00.000Z'
    const past = '2026-07-01T00:00:00.000Z'
    expect(isShareLinkActive({ expiresAt: future, revokedAt: null }, now)).toBe(true)
    expect(isShareLinkActive({ expiresAt: past, revokedAt: null }, now)).toBe(false)
    expect(isShareLinkActive({ expiresAt: future, revokedAt: '2026-07-06T00:00:00Z' }, now)).toBe(false)
    expect(isShareLinkActive({ expiresAt: undefined, revokedAt: null }, now)).toBe(false)
    expect(isShareLinkActive(null, now)).toBe(false)
  })

  it('builds a clean /preview/<token> URL, trimming trailing slashes', () => {
    expect(shareLinkUrl('https://www.goinvo.com', 'tok')).toBe('https://www.goinvo.com/preview/tok')
    expect(shareLinkUrl('https://www.goinvo.com/', 'tok')).toBe('https://www.goinvo.com/preview/tok')
  })
})

describe('previewShare token crypto', () => {
  it('generates high-entropy URL-safe tokens', () => {
    const a = generateShareToken()
    const b = generateShareToken()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a.length).toBeGreaterThanOrEqual(42)
  })

  it('hashes deterministically and irreversibly (sha-256 hex)', () => {
    const token = generateShareToken()
    expect(hashShareToken(token)).toBe(hashShareToken(token))
    expect(hashShareToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashShareToken(token)).not.toContain(token)
  })
})
