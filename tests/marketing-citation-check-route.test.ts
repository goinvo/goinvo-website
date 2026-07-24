import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const client = {
    fetch: vi.fn(async () => null),
    createOrReplace: vi.fn(async () => ({})),
  }
  return {
    client,
    createClient: vi.fn(() => client),
    assertStudioOrApiKey: vi.fn(async () => {}),
    isAnthropicConfigured: vi.fn(() => true),
    resolveMarketingModel: vi.fn(async () => 'test-model'),
    marketingClaudeModel: vi.fn(() => 'test-model'),
    generateClaudeText: vi.fn(async () => ({
      text: JSON.stringify({
        summary: 'One claim needs review.',
        claims: [{
          claim: 'The program improved outcomes by 25%.',
          verdict: 'needsCitation',
          confidence: 0.8,
          note: 'Add the underlying study.',
          hasOnPageCitation: false,
        }],
      }),
    })),
    parseJsonObject: vi.fn((text: string) => JSON.parse(text)),
  }
})

vi.mock('@sanity/client', () => ({ createClient: mocks.createClient }))
vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-token',
}))
vi.mock('@/lib/marketing/auth', () => {
  class TestMarketingAuthError extends Error {
    status = 401
  }
  return {
    assertStudioOrApiKey: mocks.assertStudioOrApiKey,
    MarketingAuthError: TestMarketingAuthError,
  }
})
vi.mock('@/lib/marketing/anthropicJson', () => ({
  generateClaudeText: mocks.generateClaudeText,
  isAnthropicConfigured: mocks.isAnthropicConfigured,
  marketingClaudeModel: mocks.marketingClaudeModel,
  parseJsonObject: mocks.parseJsonObject,
  resolveMarketingModel: mocks.resolveMarketingModel,
}))

import {
  CITATION_CHECK_LIMITS,
  POST,
} from '@/app/api/marketing/citation-check/route'

function request(body: unknown) {
  return new Request('https://www.goinvo.com/api/marketing/citation-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('citation-check API reliability boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.client.fetch.mockResolvedValue(null)
    mocks.isAnthropicConfigured.mockReturnValue(true)
    mocks.resolveMarketingModel.mockResolvedValue('test-model')
    mocks.generateClaudeText.mockResolvedValue({
      text: JSON.stringify({
        summary: 'One claim needs review.',
        claims: [{
          claim: 'The program improved outcomes by 25%.',
          verdict: 'needsCitation',
          confidence: 0.8,
          note: 'Add the underlying study.',
          hasOnPageCitation: false,
        }],
      }),
    })
    mocks.parseJsonObject.mockImplementation((text: string) => JSON.parse(text))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each([
    ['an array root', [], 400],
    ['a non-string pageUrl', { pageUrl: 42 }, 400],
    ['a non-string text', { text: ['claim'] }, 400],
    ['a non-boolean refresh', { text: 'claim', refresh: 'yes' }, 400],
    ['a non-HTTP URL', { pageUrl: 'file:///etc/passwd' }, 400],
    ['a URL with credentials', { pageUrl: 'https://user:pass@example.com/page' }, 400],
    ['an overlong pageUrl', { pageUrl: `https://example.com/${'x'.repeat(CITATION_CHECK_LIMITS.pageUrlCharacters)}` }, 413],
    ['overlong text', { text: 'x'.repeat(CITATION_CHECK_LIMITS.textCharacters + 1) }, 413],
  ])('rejects %s before fetching, model work, or writes', async (_label, body, status) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request(body))

    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.client.createOrReplace).not.toHaveBeenCalled()
  })

  it('rejects a chunked oversized JSON body even when the large field is unknown', async () => {
    const rawBody = JSON.stringify({ padding: 'x'.repeat(CITATION_CHECK_LIMITS.bodyBytes + 1) })
    const oversizedRequest = request(rawBody)
    expect(oversizedRequest.headers.get('content-length')).toBeNull()

    const response = await POST(oversizedRequest)

    expect(response.status).toBe(413)
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.client.createOrReplace).not.toHaveBeenCalled()
  })

  it('caps a fetched page stream without buffering the rest', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(CITATION_CHECK_LIMITS.fetchedPageBytes + 1))
      },
      cancel,
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })))

    const response = await POST(request({ pageUrl: 'https://example.com/article' }))

    expect(response.status).toBe(502)
    expect(cancel).toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('times out a stalled page fetch', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const pending = POST(request({ pageUrl: 'https://example.com/slow' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(CITATION_CHECK_LIMITS.fetchTimeoutMs)
    const response = await pending

    expect(response.status).toBe(504)
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('coalesces concurrent checks for the same content into one model call and cache write', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    mocks.generateClaudeText.mockImplementationOnce(async () => {
      await gate
      return {
        text: JSON.stringify({ summary: 'Checked.', claims: [] }),
      }
    })
    const body = { text: 'In 2025, the program served 5,000 people.' }

    const first = POST(request(body))
    const second = POST(request(body))
    await vi.waitFor(() => expect(mocks.generateClaudeText).toHaveBeenCalledTimes(1))
    release?.()
    const [firstResponse, secondResponse] = await Promise.all([first, second])
    const payloads = await Promise.all([firstResponse.json(), secondResponse.json()])

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(mocks.generateClaudeText).toHaveBeenCalledTimes(1)
    expect(mocks.client.createOrReplace).toHaveBeenCalledTimes(1)
    expect(payloads.map((payload) => payload.coalesced).sort()).toEqual([false, true])
    expect(mocks.generateClaudeText).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: CITATION_CHECK_LIMITS.modelTimeoutMs,
    }))
  })

  it('normalizes and bounds untrusted model fields before caching them', async () => {
    const claims = Array.from({ length: CITATION_CHECK_LIMITS.claims + 5 }, (_, index) => ({
      claim: index === 0 ? 'x'.repeat(CITATION_CHECK_LIMITS.claimCharacters + 20) : `Claim ${index}`,
      verdict: index === 0 ? 'inventedVerdict' : 'supported',
      confidence: index === 0 ? 9 : 0.5,
      note: 'n'.repeat(CITATION_CHECK_LIMITS.noteCharacters + 20),
      hasOnPageCitation: index === 0 ? 'yes' : true,
    }))
    mocks.generateClaudeText.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: 's'.repeat(CITATION_CHECK_LIMITS.summaryCharacters + 20),
        claims,
      }),
    })

    const response = await POST(request({ text: 'A factual statement.' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.summary).toHaveLength(CITATION_CHECK_LIMITS.summaryCharacters)
    expect(payload.claims).toHaveLength(CITATION_CHECK_LIMITS.claims)
    expect(payload.claims[0]).toMatchObject({
      verdict: 'unverifiable',
      confidence: 1,
      hasOnPageCitation: false,
    })
    expect(payload.claims[0].claim).toHaveLength(CITATION_CHECK_LIMITS.claimCharacters)
    expect(payload.claims[0].note).toHaveLength(CITATION_CHECK_LIMITS.noteCharacters)
    expect(mocks.client.createOrReplace).toHaveBeenCalledWith(expect.objectContaining({
      claims: payload.claims,
    }))
  })
})
