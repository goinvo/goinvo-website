import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  tf,
  textfocusHealthCheck,
  tfSeo,
  withTextFocus,
} from '@/lib/marketing/textfocus'

// ---------------------------------------------------------------------------
// These tests stub the global `fetch` so the TextFocus client in
// src/lib/marketing/textfocus.ts can be exercised against the verified wire
// contract without ever touching the network:
//   - auth is a FORM FIELD `key`, not a header
//   - a browser User-Agent header is sent (the WAF 403s the default UA)
//   - the body is urlencoded with force_refetch as the STRING "1" (never bool)
//   - the response envelope's `message` must be "ok"
//   - the health-check reads result.credits.remaining and NEVER throws
//   - the typed wrappers swallow failures and return null
// ---------------------------------------------------------------------------

// A successful tf_account envelope (the free health-check op).
function accountEnvelope(remaining = 4242) {
  return {
    version: '1.0',
    params: {},
    result: { credits: { remaining } },
    response: 200,
    message: 'ok',
    timing: 12,
    creditUsed: 0,
    method: 'tf_account',
  }
}

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Capture the single fetch call's URL + RequestInit so we can assert on the
// exact wire shape (form fields, headers, body).
type Captured = { url: string; init: RequestInit }

function stubFetch(
  handler: (captured: Captured) => Response | Promise<Response>,
) {
  const calls: Captured[] = []
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String((input as { url?: string })?.url)
    const captured = { url, init: init ?? {} }
    calls.push(captured)
    return handler(captured)
  })
  vi.stubGlobal('fetch', fn)
  return { fn, calls }
}

// Parse the urlencoded body of a captured request into a flat record.
function bodyParams(captured: Captured): URLSearchParams {
  const body = captured.init.body
  if (body instanceof URLSearchParams) return body
  return new URLSearchParams(String(body ?? ''))
}

function headerValue(captured: Captured, name: string): string | undefined {
  const headers = captured.init.headers as Record<string, string> | undefined
  if (!headers) return undefined
  // Headers passed as a plain object in our client; match case-insensitively.
  const found = Object.entries(headers).find(
    ([k]) => k.toLowerCase() === name.toLowerCase(),
  )
  return found?.[1]
}

const ORIGINAL_KEY = process.env.TEXTFOCUS_API_KEY

beforeEach(() => {
  process.env.TEXTFOCUS_API_KEY = 'test-key-123'
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (ORIGINAL_KEY === undefined) delete process.env.TEXTFOCUS_API_KEY
  else process.env.TEXTFOCUS_API_KEY = ORIGINAL_KEY
})

describe('tf — low-level request helper', () => {
  it('sends the key as a form field, a browser User-Agent, and a urlencoded body', async () => {
    const { calls } = stubFetch(() => jsonResponse(accountEnvelope()))

    await tf('tf_account')

    expect(calls).toHaveLength(1)
    const call = calls[0]

    // Base URL: textfocus.NET, /apis/<op>/ with the required trailing slash.
    expect(call.url).toBe('https://www.textfocus.net/apis/tf_account/')
    expect(call.init.method).toBe('POST')

    // A real browser User-Agent is REQUIRED (default fetch UA → 403).
    const ua = headerValue(call, 'User-Agent')
    expect(ua).toBeTruthy()
    expect(ua).toMatch(/Chrome/)

    // Content-Type must be urlencoded.
    expect(headerValue(call, 'Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    )

    // Auth is a FORM FIELD `key`, NOT an Authorization header.
    const params = bodyParams(call)
    expect(params.get('key')).toBe('test-key-123')
    expect(headerValue(call, 'Authorization')).toBeUndefined()
  })

  it('sends force_refetch as the STRING "1" (never boolean true) for URL ops', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({ ...accountEnvelope(), result: { scoreSeo: 81 } }),
    )

    await tfSeo('https://www.goinvo.com/')

    const params = bodyParams(calls[0])
    // The exact bug that broke the old MCP: force_refetch must be "1", not "true".
    expect(params.get('force_refetch')).toBe('1')
    expect(params.get('force_refetch')).not.toBe('true')
    expect(params.get('lang')).toBe('en-US')
    expect(params.get('url')).toBe('https://www.goinvo.com/')
  })

  it('throws a clear, WAF/UA-aware error on a 403', async () => {
    stubFetch(() => jsonResponse({ message: 'forbidden' }, 403, 'Forbidden'))
    await expect(tf('tf_seo', { url: 'https://x.test/' })).rejects.toThrow(
      /403/,
    )
    await expect(tf('tf_seo', { url: 'https://x.test/' })).rejects.toThrow(
      /WAF|User-Agent|key/i,
    )
  })

  it('throws when the envelope message is not "ok"', async () => {
    stubFetch(() => jsonResponse({ message: 'invalid key', result: null }))
    await expect(tf('tf_account')).rejects.toThrow(/invalid key/)
  })

  it('throws when TEXTFOCUS_API_KEY is missing', async () => {
    delete process.env.TEXTFOCUS_API_KEY
    stubFetch(() => jsonResponse(accountEnvelope()))
    await expect(tf('tf_account')).rejects.toThrow(/TEXTFOCUS_API_KEY/)
  })
})

describe('textfocusHealthCheck — free liveness probe (never throws)', () => {
  it('returns ok + creditsRemaining on a good tf_account payload', async () => {
    stubFetch(() => jsonResponse(accountEnvelope(987)))
    const health = await textfocusHealthCheck()
    expect(health.ok).toBe(true)
    expect(health.creditsRemaining).toBe(987)
    expect(health.error).toBeUndefined()
  })

  it('calls the FREE tf_account op', async () => {
    const { calls } = stubFetch(() => jsonResponse(accountEnvelope()))
    await textfocusHealthCheck()
    expect(calls[0].url).toBe('https://www.textfocus.net/apis/tf_account/')
  })

  it('returns { ok:false } (no throw) on a 403', async () => {
    stubFetch(() => jsonResponse({ message: 'forbidden' }, 403, 'Forbidden'))
    const health = await textfocusHealthCheck()
    expect(health.ok).toBe(false)
    expect(health.error).toBeTruthy()
    expect(health.creditsRemaining).toBeUndefined()
  })

  it('returns { ok:false } (no throw) when the key is missing', async () => {
    delete process.env.TEXTFOCUS_API_KEY
    stubFetch(() => jsonResponse(accountEnvelope()))
    const health = await textfocusHealthCheck()
    expect(health.ok).toBe(false)
    expect(health.error).toMatch(/TEXTFOCUS_API_KEY/)
  })

  it('returns { ok:false } (no throw) when fetch itself rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const health = await textfocusHealthCheck()
    expect(health.ok).toBe(false)
    expect(health.error).toBeTruthy()
  })
})

describe('typed wrappers — return result, never throw', () => {
  it('tfSeo returns result.scoreSeo on success', async () => {
    stubFetch(() =>
      jsonResponse({ message: 'ok', result: { scoreSeo: 73 } }),
    )
    const result = await tfSeo('https://www.goinvo.com/')
    expect(result?.scoreSeo).toBe(73)
  })

  it('tfSeo returns null on failure instead of throwing', async () => {
    stubFetch(() => jsonResponse({ message: 'forbidden' }, 403, 'Forbidden'))
    const result = await tfSeo('https://www.goinvo.com/')
    expect(result).toBeNull()
  })

  it('tfSeo returns null when the key is missing (no throw)', async () => {
    delete process.env.TEXTFOCUS_API_KEY
    stubFetch(() => jsonResponse({ message: 'ok', result: { scoreSeo: 1 } }))
    const result = await tfSeo('https://www.goinvo.com/')
    expect(result).toBeNull()
  })
})

describe('withTextFocus — reliability guardrail', () => {
  it('runs fn when the health-check passes', async () => {
    stubFetch(() => jsonResponse(accountEnvelope(50)))
    const fallback = { scores: [] as number[] }
    const out = await withTextFocus(async () => ({ scores: [1, 2, 3] }), fallback)
    expect(out).toEqual({ scores: [1, 2, 3] })
  })

  it('returns the fallback (and does NOT run fn) when the health-check fails', async () => {
    stubFetch(() => jsonResponse({ message: 'forbidden' }, 403, 'Forbidden'))
    const fallback = { scores: [] as number[] }
    const fn = vi.fn(async () => ({ scores: [9] }))
    const out = await withTextFocus(fn, fallback)
    expect(out).toBe(fallback)
    expect(fn).not.toHaveBeenCalled()
  })

  it('returns the fallback when fn itself throws (after a healthy check)', async () => {
    stubFetch(() => jsonResponse(accountEnvelope(50)))
    const fallback = 'fallback-value'
    const out = await withTextFocus<string>(async () => {
      throw new Error('boom')
    }, fallback)
    expect(out).toBe(fallback)
  })
})
