import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const client = {
    fetch: vi.fn(),
    create: vi.fn(),
  }
  return {
    client,
    createClient: vi.fn(() => client),
    runAiCitationPanel: vi.fn(),
    resolveMarketingModel: vi.fn(async () => 'claude-test'),
    assertStudioOrApiKey: vi.fn(async () => {}),
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
  }
})

vi.mock('@sanity/client', () => ({ createClient: mocks.createClient }))
vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-02-19',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-write-token',
}))
vi.mock('@/lib/marketing/aiCitation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketing/aiCitation')>(
    '@/lib/marketing/aiCitation',
  )
  return { ...actual, runAiCitationPanel: mocks.runAiCitationPanel }
})
vi.mock('@/lib/marketing/anthropicJson', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketing/anthropicJson')>(
    '@/lib/marketing/anthropicJson',
  )
  return { ...actual, resolveMarketingModel: mocks.resolveMarketingModel }
})
vi.mock('@/lib/marketing/auth', () => {
  class TestMarketingAuthError extends Error {
    constructor(message = 'Unauthorized', readonly status = 401) {
      super(message)
    }
  }
  return {
    assertStudioOrApiKey: mocks.assertStudioOrApiKey,
    assertStudioWriterOrApiKey: mocks.assertStudioWriterOrApiKey,
    MarketingAuthError: TestMarketingAuthError,
  }
})

import { GET as getCitationSnapshots, POST as runCitationPanel } from '@/app/api/marketing/ai-citation/route'
import { GET as getOutreachPlan } from '@/app/api/marketing/outreach/plan/route'
import { POST as seedOffers } from '@/app/api/marketing/outreach/seed-offers/route'
import { DEFAULT_OFFERS } from '@/lib/marketing/outreach'

const panelSnapshot = {
  model: 'claude-test',
  promptCount: 1,
  answeredCount: 1,
  results: [{
    prompt: 'Who designs healthcare software?',
    answerText: 'GoInvo.',
    goinvoMentioned: true,
    goinvoCited: true,
    citedGoinvoUrls: ['https://www.goinvo.com/'],
    allCitedUrls: ['https://www.goinvo.com/'],
    competitorsMentioned: [],
  }],
  aggregate: {
    mentionedCount: 1,
    citedCount: 1,
    mentionRate: 1,
    citationRate: 1,
    topCompetitors: [],
  },
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://www.goinvo.com${path}`, init)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.runAiCitationPanel.mockResolvedValue(panelSnapshot)
  mocks.client.create.mockImplementation(async (doc: { _id?: string }) => ({
    ...doc,
    _id: doc._id || 'citation-snapshot-1',
  }))
  mocks.client.fetch.mockResolvedValue([])
})

describe('AI citation route hardening', () => {
  it('requires writer authority for a paid snapshot run and rejects unused controls', async () => {
    const valid = await runCitationPanel(request('/api/marketing/ai-citation', { method: 'POST' }))
    const query = await runCitationPanel(request('/api/marketing/ai-citation?force=1', { method: 'POST' }))
    const body = await runCitationPanel(request('/api/marketing/ai-citation', { method: 'POST', body: '{}' }))

    expect(valid.status).toBe(200)
    expect(query.status).toBe(400)
    expect(body.status).toBe(400)
    expect(mocks.assertStudioWriterOrApiKey).toHaveBeenCalledTimes(3)
    expect(mocks.assertStudioOrApiKey).not.toHaveBeenCalled()
    expect(mocks.runAiCitationPanel).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent paid runs and snapshot writes', async () => {
    let release!: (value: typeof panelSnapshot) => void
    mocks.runAiCitationPanel.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve
    }))

    const first = runCitationPanel(request('/api/marketing/ai-citation', { method: 'POST' }))
    const second = runCitationPanel(request('/api/marketing/ai-citation', { method: 'POST' }))
    await vi.waitFor(() => expect(mocks.runAiCitationPanel).toHaveBeenCalledTimes(1))
    release(panelSnapshot)
    const responses = await Promise.all([first, second])

    expect(responses.map((response) => response.status)).toEqual([200, 200])
    expect(mocks.runAiCitationPanel).toHaveBeenCalledTimes(1)
    expect(mocks.client.create).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed list controls and bounds corrupt stored snapshot data', async () => {
    for (const path of [
      '/api/marketing/ai-citation?limit=abc',
      '/api/marketing/ai-citation?limit=51',
      '/api/marketing/ai-citation?limit=1&limit=2',
      '/api/marketing/ai-citation?unknown=1',
    ]) {
      expect((await getCitationSnapshots(request(path))).status).toBe(400)
    }
    mocks.client.fetch.mockResolvedValueOnce([{
      _id: 'snapshot-1',
      promptCount: 999,
      mentionRate: 9,
      topCompetitors: Array.from({ length: 30 }, (_, index) => ({ name: `Firm ${index}`, count: 9_999 })),
      results: Array.from({ length: 30 }, (_, index) => ({
        prompt: `Prompt ${index}`,
        citedGoinvoUrls: Array.from({ length: 20 }, () => `https://www.goinvo.com/${'x'.repeat(800)}`),
        competitorsMentioned: Array.from({ length: 20 }, (_, item) => `Firm ${item}`),
      })),
    }])

    const response = await getCitationSnapshots(request('/api/marketing/ai-citation?limit=1'))
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.snapshots[0].promptCount).toBe(50)
    expect(payload.snapshots[0].mentionRate).toBe(1)
    expect(payload.snapshots[0].topCompetitors).toHaveLength(15)
    expect(payload.snapshots[0].results).toHaveLength(12)
    expect(payload.snapshots[0].results[0].citedGoinvoUrls).toHaveLength(8)
    expect(payload.snapshots[0].results[0].citedGoinvoUrls[0].length).toBeLessThanOrEqual(512)
  })

  it('returns private generic errors instead of provider or Sanity details', async () => {
    mocks.runAiCitationPanel.mockRejectedValueOnce(new Error('sk-ant-secret provider payload'))
    const run = await runCitationPanel(request('/api/marketing/ai-citation', { method: 'POST' }))
    expect(run.status).toBe(502)
    expect(JSON.stringify(await run.json())).not.toContain('sk-ant-secret')

    mocks.client.fetch.mockRejectedValueOnce(new Error('Sanity token secret'))
    const list = await getCitationSnapshots(request('/api/marketing/ai-citation'))
    expect(list.status).toBe(502)
    expect(await list.json()).toEqual({
      error: 'AI citation snapshots could not be loaded.',
      snapshots: [],
    })
  })
})

describe('Outreach plan route hardening', () => {
  it('rejects malformed controls before Sanity and returns a generic fetch failure', async () => {
    for (const path of [
      '/api/marketing/outreach/plan?limit=1.5',
      '/api/marketing/outreach/plan?limit=0',
      '/api/marketing/outreach/plan?limit=1&limit=2',
      '/api/marketing/outreach/plan?unknown=1',
    ]) {
      expect((await getOutreachPlan(request(path) as never)).status).toBe(400)
    }
    expect(mocks.client.fetch).not.toHaveBeenCalled()

    mocks.client.fetch.mockRejectedValueOnce(new Error('private query detail'))
    const failed = await getOutreachPlan(request('/api/marketing/outreach/plan') as never)
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({ error: 'Outreach plan could not be loaded.' })
  })

  it('bounds follow-up output and buckets invalid statuses without prototype pollution', async () => {
    const contacts = Array.from({ length: 60 }, (_, index) => ({
      _id: `contact-${index}`,
      name: `Contact ${index}`,
      status: index === 0 ? '__proto__' : 'contacted',
      warmth: 'warm',
      followUpAt: '2020-01-01T00:00:00.000Z',
    }))
    mocks.client.fetch.mockResolvedValueOnce({ contacts, offers: [], evidence: [] })

    const response = await getOutreachPlan(request('/api/marketing/outreach/plan?limit=10') as never)
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.followUpsDueTotal).toBe(59)
    expect(payload.followUpsDue).toHaveLength(50)
    expect(payload.counts.unknown).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(payload.counts, '__proto__')).toBe(false)
  })
})

describe('Offer seeding route hardening', () => {
  it('rejects bodies/query controls and classifies atomic create conflicts as existing', async () => {
    expect((await seedOffers(request('/api/marketing/outreach/seed-offers?force=1', { method: 'POST' }) as never)).status).toBe(400)
    expect((await seedOffers(request('/api/marketing/outreach/seed-offers', { method: 'POST', body: '{}' }) as never)).status).toBe(400)
    mocks.client.create.mockImplementation(async (doc: { _id?: string }) => {
      if (doc._id?.includes(DEFAULT_OFFERS[0].key)) throw { statusCode: 409 }
      return { ...doc, _id: doc._id }
    })

    const response = await seedOffers(request('/api/marketing/outreach/seed-offers', { method: 'POST' }) as never)
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.existing).toEqual([DEFAULT_OFFERS[0].key])
    expect(payload.created).toHaveLength(DEFAULT_OFFERS.length - 1)
    expect(mocks.client.fetch).not.toHaveBeenCalled()
  })

  it('coalesces concurrent seed requests so each deterministic document is created once', async () => {
    const releases: Array<(value: unknown) => void> = []
    mocks.client.create.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))

    const first = seedOffers(request('/api/marketing/outreach/seed-offers', { method: 'POST' }) as never)
    const second = seedOffers(request('/api/marketing/outreach/seed-offers', { method: 'POST' }) as never)
    await vi.waitFor(() => expect(mocks.client.create).toHaveBeenCalledTimes(DEFAULT_OFFERS.length))
    releases.forEach((release, index) => release({ _id: `offer-${index}` }))
    const responses = await Promise.all([first, second])

    expect(responses.map((response) => response.status)).toEqual([200, 200])
    expect(mocks.client.create).toHaveBeenCalledTimes(DEFAULT_OFFERS.length)
  })
})
