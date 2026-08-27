import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  getClient: vi.fn(),
  run: vi.fn(),
  scheduleFinalize: vi.fn(),
}))

vi.mock('@/lib/marketing', () => ({
  assertMarketingApiKey: mocks.authorize,
  getMarketingWriteClient: mocks.getClient,
  getMarketingWriteClientFor: mocks.getClient,
}))

vi.mock('@/lib/marketing/publishers', () => ({
  runPublish: mocks.run,
  scheduleFinalize: mocks.scheduleFinalize,
}))

import { GET, POST } from '@/app/api/marketing/publish/run/route'

const summary = {
  ranAt: '2026-07-20T12:00:00.000Z',
  dryRun: false,
  considered: 0,
  processed: 0,
  published: 0,
  processing: 0,
  failed: 0,
  skipped: 0,
  results: [],
}

function post(body: string, query = ''): Request {
  return new Request(`https://www.goinvo.com/api/marketing/publish/run${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('publish run request boundary', () => {
  beforeEach(() => {
    mocks.authorize.mockReset()
    mocks.getClient.mockReset().mockReturnValue({})
    mocks.run.mockReset().mockResolvedValue(summary)
    mocks.scheduleFinalize.mockReset()
  })

  it('rejects a chunked limit-plus-one body before Sanity or publishing', async () => {
    const response = await POST(post(`"${'x'.repeat(16 * 1024)}"`))
    expect(response.status).toBe(413)
    expect(mocks.getClient).not.toHaveBeenCalled()
    expect(mocks.run).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid JSON', '{'],
    ['a non-object body', '[]'],
    ['unknown fields', JSON.stringify({ surprise: true })],
    ['wrong boolean types', JSON.stringify({ dryRun: 'true' })],
    ['an invalid ID', JSON.stringify({ id: '../calendar' })],
  ])('rejects %s without touching the publish worker', async (_label, body) => {
    const response = await POST(post(body))
    expect(response.status).toBe(400)
    expect(mocks.getClient).not.toHaveBeenCalled()
    expect(mocks.run).not.toHaveBeenCalled()
  })

  it.each([
    '?dryRun=yes',
    '?id=one&id=two',
    '?finalize=1',
    '?onlyIfDue=1',
    '?id=calendar-1&finalize=1&onlyIfDue=1',
    '?unexpected=1',
  ])('rejects ambiguous or unsafe query state: %s', async (query) => {
    const response = await GET(new Request(`https://www.goinvo.com/api/marketing/publish/run${query}`))
    expect(response.status).toBe(400)
    expect(mocks.run).not.toHaveBeenCalled()
  })

  it('rejects conflicting query/body values rather than guessing precedence', async () => {
    const response = await POST(post(JSON.stringify({ id: 'calendar-2' }), '?id=calendar-1'))
    expect(response.status).toBe(400)
    expect(mocks.run).not.toHaveBeenCalled()
  })

  it('accepts a bounded typed body and emits a private response', async () => {
    const response = await POST(post(JSON.stringify({ id: 'calendar-1', dryRun: true })))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.run).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'calendar-1', dryRun: true, onlyIfDue: false, finalizeOnly: false }),
    )
  })

  it('reports a finalize enqueue partial failure in the response', async () => {
    mocks.run.mockResolvedValue({
      ...summary,
      considered: 1,
      processed: 1,
      processing: 1,
      results: [{
        id: 'calendar-1',
        outcome: 'processing',
        finalize: { containerId: 'container-1', attempt: 1, delaySec: 90 },
      }],
    })
    mocks.scheduleFinalize.mockResolvedValue({ ok: false, error: 'queue unavailable' })
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await POST(post(JSON.stringify({ id: 'calendar-1' })))
    const body = await response.json()
    expect(body.results[0]).toMatchObject({
      outcome: 'processing',
      finalizeScheduled: false,
      finalizeScheduleError: 'queue unavailable',
    })
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
