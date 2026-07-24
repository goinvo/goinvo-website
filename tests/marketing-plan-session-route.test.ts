import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/marketing/drainSink', () => ({ getKvClient: () => null }))

import { POST } from '@/app/api/marketing/plan-session/route'

function request(key: string, ip = '203.0.113.10', origin = 'https://www.goinvo.com') {
  const form = new FormData()
  form.set('key', key)
  return new Request('https://www.goinvo.com/api/marketing/plan-session', {
    method: 'POST',
    body: form,
    headers: {
      origin,
      'sec-fetch-site': origin === 'https://www.goinvo.com' ? 'same-origin' : 'cross-site',
      'x-real-ip': ip,
    },
  })
}

describe('marketing-plan POST access gate', () => {
  beforeEach(() => vi.stubEnv('MARKETING_PLAN_KEY', 'correct-horse-battery-staple'))
  afterEach(() => vi.unstubAllEnvs())

  it('fails closed when the key is not configured', async () => {
    vi.stubEnv('MARKETING_PLAN_KEY', '')
    const response = await POST(request('anything'))
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects cross-origin submissions', async () => {
    const response = await POST(request('correct-horse-battery-staple', '203.0.113.11', 'https://evil.example'))
    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('sets a bounded HttpOnly cookie without putting the key in the redirect URL', async () => {
    const response = await POST(request('correct-horse-battery-staple', '203.0.113.12'))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://www.goinvo.com/marketing-plan')
    const cookie = response.headers.get('set-cookie') || ''
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).not.toContain('correct-horse-battery-staple')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('throttles repeated failed attempts by IP', async () => {
    const ip = '203.0.113.77'
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await POST(request('wrong-key', ip))
      expect(response.status).toBe(303)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
    const limited = await POST(request('wrong-key', ip))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('600')
    expect(limited.headers.get('cache-control')).toBe('no-store')
  })
})
