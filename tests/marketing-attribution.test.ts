import { describe, expect, it } from 'vitest'
import { kvSourceField, parseKvSourceField, sanitizeAttributionSource } from '@/lib/marketing/drainSink'
import { isLikelyBot } from '@/lib/marketing/botFilter'

describe('attribution source KV field', () => {
  it('round-trips source / variant / event', () => {
    const field = kvSourceField('google.spring2026.cfo-outcomes', 'concept', 'qualified_discovery_call_click')
    expect(parseKvSourceField(field)).toEqual({
      source: 'google.spring2026.cfo-outcomes',
      variant: 'concept',
      eventName: 'qualified_discovery_call_click',
    })
  })

  it('returns null for malformed fields', () => {
    expect(parseKvSourceField('google')).toBeNull()
    expect(parseKvSourceField('google|concept')).toBeNull()
  })
})

describe('sanitizeAttributionSource', () => {
  it('lowercases, strips unsafe chars (incl the pipe delimiter), trims, and caps length', () => {
    expect(sanitizeAttributionSource('Google Ads')).toBe('google-ads')
    expect(sanitizeAttributionSource('a|b|c')).toBe('a-b-c') // a pipe can never break the field delimiter
    expect(sanitizeAttributionSource('  spring/2026  ')).toBe('spring-2026')
    expect(sanitizeAttributionSource('keep.dots_and-dashes')).toBe('keep.dots_and-dashes')
    expect(sanitizeAttributionSource('x'.repeat(200))).toHaveLength(64)
    expect(sanitizeAttributionSource('')).toBe('')
    expect(sanitizeAttributionSource(null)).toBe('')
  })
})

describe('isLikelyBot', () => {
  it('flags common crawlers + automation', () => {
    for (const ua of ['Googlebot/2.1', 'AhrefsBot', 'HeadlessChrome/124', 'python-requests/2.31', 'curl/8.0', 'node-fetch', 'Playwright', 'SemrushBot']) {
      expect(isLikelyBot(ua)).toBe(true)
    }
  })

  it('does NOT flag real browsers, and does NOT treat a missing UA as a bot (that would bias the experiment)', () => {
    expect(
      isLikelyBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'),
    ).toBe(false)
    expect(
      isLikelyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'),
    ).toBe(false)
    expect(isLikelyBot('')).toBe(false)
    expect(isLikelyBot(null)).toBe(false)
  })
})
