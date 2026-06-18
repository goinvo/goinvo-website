import { describe, expect, it, vi } from 'vitest'
import { withRetry, isTransientError } from '@/lib/marketing/publishers/retry'

const noSleep = async () => {}

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn(async () => 'ok')
    const result = await withRetry(fn, { sleep: noSleep })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a transient failure and then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('container status check failed (503)'))
      .mockResolvedValueOnce('finished')
    const result = await withRetry(fn, { sleep: noSleep })
    expect(result).toBe('finished')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('gives up after `attempts` and rethrows the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fetch failed'))
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow('fetch failed')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does NOT retry a non-transient error (e.g. 400 / auth)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid OAuth access token (401)'))
    await expect(withRetry(fn, { sleep: noSleep })).rejects.toThrow('401')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('backs off exponentially between attempts', async () => {
    const delays: number[] = []
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms)
    })
    const fn = vi.fn().mockRejectedValue(new Error('rate limited (429)'))
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 100, sleep })).rejects.toThrow()
    // Two backoffs before the 3rd (final) attempt: 100, 200.
    expect(delays).toEqual([100, 200])
  })
})

describe('isTransientError', () => {
  it.each([
    'container status check failed (503)',
    'Graph request failed (500)',
    'rate limited (429)',
    'fetch failed',
    'getaddrinfo ENOTFOUND graph.facebook.com',
    'socket hang up',
  ])('treats "%s" as transient', (msg) => {
    expect(isTransientError(new Error(msg))).toBe(true)
  })

  it.each([
    'Invalid OAuth access token (401)',
    'Unsupported post request (400)',
    'Reel/video post has no video asset',
  ])('treats "%s" as permanent', (msg) => {
    expect(isTransientError(new Error(msg))).toBe(false)
  })
})
