import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  research: vi.fn(),
  apply: vi.fn(),
  resolveModel: vi.fn(async () => 'claude-test'),
}))

vi.mock('@sanity/client', () => ({
  createClient: () => ({ fetch: mocks.fetch }),
}))

vi.mock('@/sanity/env', () => ({
  apiVersion: 'v1',
  dataset: 'production',
  projectId: 'project',
  writeToken: 'write-token',
}))

vi.mock('@/lib/marketing/auth', () => ({
  assertStudioOrApiKey: vi.fn(async () => undefined),
  MarketingAuthError: class extends Error {},
}))

vi.mock('@/lib/marketing/anthropicJson', () => ({
  resolveMarketingModel: mocks.resolveModel,
}))

vi.mock('@/lib/marketing/postingTimeResearch', () => ({
  isPostingTimeResearchConfigured: () => true,
  buildPostingTimePlan: (channel: { _id: string }) => ({ channelId: channel._id }),
  researchChannelPostingTimes: mocks.research,
  applyPostingTimeResearch: mocks.apply,
}))

import { POST } from '@/app/api/marketing/research/posting-times/route'

const channel = (id: string, rev = `rev-${id}`) => ({
  _id: id,
  _rev: rev,
  title: `Channel ${id}`,
  platform: 'social',
  contentTypes: [],
})

const recommendation = (id: string) => ({
  summary: `Summary ${id}`,
  slots: [],
  sources: [],
  model: 'claude-test',
  researchedAt: '2026-07-20T00:00:00.000Z',
  timezoneLogic: 'ET',
  avoid: [],
  plan: { channelId: id },
})

function request(body: unknown) {
  return new NextRequest('https://www.goinvo.com/api/marketing/research/posting-times', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('posting-time research route boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.research.mockImplementation(async (entry: { _id: string }) => recommendation(entry._id))
    mocks.apply.mockResolvedValue(undefined)
  })

  it('rejects malformed field types and oversized context before querying Sanity', async () => {
    expect((await POST(request({ channelId: 42 }))).status).toBe(400)
    expect((await POST(request({ channelId: 'channel-1', all: 'yes' }))).status).toBe(400)
    expect((await POST(request({ channelId: 'channel-1', audience: 'x'.repeat(2_001) }))).status).toBe(413)
    expect((await POST(request({ channelId: 'channel-1', surprise: true }))).status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('rejects batch limit+1 before resolving a model or starting research', async () => {
    mocks.fetch.mockResolvedValueOnce(Array.from({ length: 13 }, (_, index) => channel(`channel-${index}`)))
    const response = await POST(request({ all: true }))
    expect(response.status).toBe(413)
    expect(mocks.resolveModel).not.toHaveBeenCalled()
    expect(mocks.research).not.toHaveBeenCalled()
  })

  it('caps research fan-out at three and returns an outcome for every item', async () => {
    const channels = Array.from({ length: 8 }, (_, index) => channel(`channel-${index}`))
    mocks.fetch.mockResolvedValueOnce(channels)
    let running = 0
    let peak = 0
    const releases: Array<() => void> = []
    mocks.research.mockImplementation(async (entry: { _id: string }) => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise<void>((resolve) => releases.push(resolve))
      running -= 1
      return recommendation(entry._id)
    })

    const pending = POST(request({ all: true }))
    await vi.waitFor(() => expect(mocks.research).toHaveBeenCalledTimes(3))
    while (releases.length) releases.shift()?.()
    await vi.waitFor(() => expect(mocks.research.mock.calls.length).toBeGreaterThan(3))
    while (mocks.research.mock.calls.length < channels.length) {
      while (releases.length) releases.shift()?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    while (releases.length) releases.shift()?.()

    const response = await pending
    const json = await response.json() as { researched: number; failed: number; results: Array<{ outcome: string }> }
    expect(peak).toBe(3)
    expect(json).toMatchObject({ researched: 8, failed: 0 })
    expect(json.results).toHaveLength(8)
    expect(json.results.every((result) => result.outcome === 'researched')).toBe(true)
  })

  it('coalesces concurrent same-revision model work and persistence', async () => {
    const source = channel('channel-1', 'rev-shared')
    mocks.fetch.mockResolvedValue(source ? [source] : [])
    let release!: () => void
    mocks.research.mockImplementation(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return recommendation('channel-1')
    })

    const first = POST(request({ channelId: 'channel-1' }))
    await vi.waitFor(() => expect(mocks.research).toHaveBeenCalledTimes(1))
    const second = POST(request({ channelId: 'channel-1' }))
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2))
    release()
    const [firstResponse, secondResponse] = await Promise.all([first, second])

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(mocks.research).toHaveBeenCalledTimes(1)
    expect(mocks.apply).toHaveBeenCalledTimes(1)
    expect(mocks.apply).toHaveBeenCalledWith(expect.anything(), 'channel-1', expect.anything(), 'rev-shared')
  })

  it('reports revision conflicts per item without hiding successful siblings', async () => {
    mocks.fetch.mockResolvedValueOnce([channel('ok'), channel('stale')])
    mocks.apply.mockImplementation(async (_client, id: string) => {
      if (id === 'stale') throw Object.assign(new Error('revision conflict'), { statusCode: 409 })
    })

    const response = await POST(request({ all: true }))
    const json = await response.json() as {
      researched: number
      failed: number
      results: Array<{ channelId: string; outcome: string }>
    }
    expect(response.status).toBe(200)
    expect(json).toMatchObject({ researched: 1, failed: 1 })
    expect(json.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ channelId: 'ok', outcome: 'researched' }),
      expect.objectContaining({ channelId: 'stale', outcome: 'conflict' }),
    ]))
  })
})
