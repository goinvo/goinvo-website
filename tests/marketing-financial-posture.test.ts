import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FINANCIAL_POSTURE_ID,
  FINANCIAL_POSTURES,
  FINANCIAL_POSTURE_STALE_DAYS,
  financialPostureAgeDays,
  financialPostureAiContext,
  getFinancialPosture,
  isFinancialPostureId,
  isFinancialPostureStale,
} from '@/lib/marketing/financialPosture'

describe('financial posture bins', () => {
  it('defines the four bins in runway order', () => {
    expect(FINANCIAL_POSTURES.map((p) => p.id)).toEqual(['survival', 'rebuild', 'stable', 'growth'])
  })

  it('every bin carries the copy the suite renders', () => {
    for (const posture of FINANCIAL_POSTURES) {
      expect(posture.title.length).toBeGreaterThan(0)
      expect(posture.runwayLabel).toMatch(/runway/)
      expect(posture.strategy.length).toBeGreaterThan(40)
      expect(posture.outreachWhy.length).toBeGreaterThan(40)
    }
  })

  it('guards ids correctly', () => {
    expect(isFinancialPostureId('survival')).toBe(true)
    expect(isFinancialPostureId('growth')).toBe(true)
    expect(isFinancialPostureId('flush')).toBe(false)
    expect(isFinancialPostureId(null)).toBe(false)
    expect(isFinancialPostureId(42)).toBe(false)
    expect(getFinancialPosture('stable')?.title).toBe('Stable')
    expect(getFinancialPosture('nope')).toBeNull()
    expect(getFinancialPosture(undefined)).toBeNull()
  })

  it('defaults to survival (the confirmed 2026-07 reality)', () => {
    expect(DEFAULT_FINANCIAL_POSTURE_ID).toBe('survival')
  })
})

describe('financial posture staleness', () => {
  const now = new Date('2026-07-11T12:00:00Z')

  it('computes whole-day ages and treats bad input as unknown', () => {
    expect(financialPostureAgeDays('2026-07-11T09:00:00Z', now)).toBe(0)
    expect(financialPostureAgeDays('2026-07-01T12:00:00Z', now)).toBe(10)
    expect(financialPostureAgeDays(null, now)).toBeNull()
    expect(financialPostureAgeDays('not a date', now)).toBeNull()
  })

  it('goes stale at the boundary, and unset counts as stale', () => {
    const fresh = new Date(now.getTime() - (FINANCIAL_POSTURE_STALE_DAYS - 1) * 86_400_000).toISOString()
    const atBoundary = new Date(now.getTime() - FINANCIAL_POSTURE_STALE_DAYS * 86_400_000).toISOString()
    expect(isFinancialPostureStale(fresh, now)).toBe(false)
    expect(isFinancialPostureStale(atBoundary, now)).toBe(true)
    expect(isFinancialPostureStale(null, now)).toBe(true)
    expect(isFinancialPostureStale('garbage', now)).toBe(true)
  })
})

describe('financialPostureAiContext', () => {
  const now = new Date('2026-07-11T12:00:00Z')

  it('is confirmed only when set AND fresh', () => {
    const fresh = new Date(now.getTime() - 2 * 86_400_000).toISOString()
    const confirmed = financialPostureAiContext('survival', fresh, now)
    expect(confirmed).toMatchObject({ posture: 'survival', confirmed: true, setDaysAgo: 2 })
    expect(confirmed.marketingStrategy).toContain('cash inside the runway')

    const stale = new Date(now.getTime() - 90 * 86_400_000).toISOString()
    expect(financialPostureAiContext('stable', stale, now)).toMatchObject({ posture: 'stable', confirmed: false })
  })

  it('falls back to the survival default when unset — but flags it unconfirmed', () => {
    const unset = financialPostureAiContext(null, null, now)
    expect(unset).toMatchObject({ posture: DEFAULT_FINANCIAL_POSTURE_ID, confirmed: false, setDaysAgo: null })
  })

  it('never treats an unknown id as a posture', () => {
    const bogus = financialPostureAiContext('yolo', new Date(now).toISOString(), now)
    expect(bogus.posture).toBe(DEFAULT_FINANCIAL_POSTURE_ID)
    expect(bogus.confirmed).toBe(false)
  })
})
