import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  schedule: vi.fn(),
  run: vi.fn(),
}))

vi.mock('@/lib/marketing', () => ({
  assertMarketingApiKey: vi.fn(),
  getMarketingWriteClient: () => ({ fetch: mocks.fetch }),
  MarketingAuthError: class extends Error {},
}))

vi.mock('@/lib/marketing/publishers', () => ({
  isQStashConfigured: () => true,
  resolveSocialPlatform: () => 'linkedin',
  runPublish: mocks.run,
  schedulePublish: mocks.schedule,
}))

import { POST } from '@/app/api/marketing/publish/schedule/route'

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://www.goinvo.com/api/marketing/publish/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function item(publishAt: string) {
  return {
    _id: 'calendar-1',
    status: 'scheduled',
    autoPublish: true,
    publishAt,
    channelKey: 'linkedin',
  }
}

describe('publish schedule route boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MARKETING_API_KEY', 'key')
    mocks.run.mockResolvedValue({ considered: 1 })
    mocks.schedule.mockResolvedValue({
      ok: true,
      messageId: 'message-1',
      callbackUrl: 'https://www.goinvo.com/api/marketing/publish/run?id=calendar-1',
      notBefore: 2_000_000_000,
    })
  })

  it('rejects malformed IDs and declared bodies at limit+1 before Sanity', async () => {
    const badId = await POST(request({ id: 'bad id' }))
    expect(badId.status).toBe(400)

    const tooLarge = await POST(request({ id: 'calendar-1' }, { 'Content-Length': String(32 * 1024 + 1) }))
    expect(tooLarge.status).toBe(413)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it.each([
    'not-a-date',
    '2030-01-01',
    '+100000-01-01T00:00:00.000Z',
    '9999-12-31T23:59:59.9999Z',
  ])('rejects invalid or overflow publishAt %s before QStash', async (publishAt) => {
    mocks.fetch.mockResolvedValueOnce(item(publishAt))
    const response = await POST(request({ id: 'calendar-1' }))
    expect(response.status).toBe(422)
    expect(mocks.schedule).not.toHaveBeenCalled()
  })

  it('coalesces concurrent duplicate scheduling calls', async () => {
    const future = '2030-01-01T00:00:00.000Z'
    mocks.fetch.mockResolvedValue(item(future))
    let release!: () => void
    mocks.schedule.mockImplementation(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return {
        ok: true,
        messageId: 'message-1',
        callbackUrl: 'https://www.goinvo.com/callback',
        notBefore: 1_893_456_000,
      }
    })

    const first = POST(request({ id: 'calendar-1' }))
    await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalledTimes(1))
    const second = POST(request({ id: 'calendar-1' }))
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2))
    release()
    const [a, b] = await Promise.all([first, second])

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(mocks.schedule).toHaveBeenCalledTimes(1)
  })

  it('publishes a valid due item immediately instead of enqueueing', async () => {
    mocks.fetch.mockResolvedValueOnce(item('2020-01-01T00:00:00.000Z'))
    const response = await POST(request({ id: 'calendar-1' }))
    const json = await response.json() as { action: string }
    expect(response.status).toBe(200)
    expect(json.action).toBe('publish-now')
    expect(mocks.run).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'calendar-1', onlyIfDue: true }))
    expect(mocks.schedule).not.toHaveBeenCalled()
  })
})
