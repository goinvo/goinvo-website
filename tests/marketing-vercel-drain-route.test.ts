import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const client = {}
  return {
    client,
    createClient: vi.fn(() => client),
    upsertDrainSignalForFlag: vi.fn(async () => ({ updated: true, warnings: [] })),
  }
})

vi.mock('@sanity/client', () => ({ createClient: mocks.createClient }))
vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-token',
}))
vi.mock('@/lib/marketing/drainSink', () => ({
  upsertDrainSignalForFlag: mocks.upsertDrainSignalForFlag,
}))

import {
  POST,
  VERCEL_DRAIN_LIMITS,
} from '@/app/api/marketing/analytics/vercel-drain/route'

const SECRET = 'test-drain-secret'

function event(overrides: Record<string, unknown> = {}) {
  return {
    eventName: 'experiment_exposure',
    experiment_id: 'experiment-1',
    flag_key: 'homepage-test',
    variant: 'control',
    page_path: '/',
    ...overrides,
  }
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://www.goinvo.com/api/marketing/analytics/vercel-drain', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('Vercel analytics drain route reliability boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MARKETING_VERCEL_DRAIN_SECRET', SECRET)
  })

  afterEach(() => vi.unstubAllEnvs())

  it('rejects a declared oversized body before acquiring Sanity', async () => {
    const response = await POST(request({ events: [] }, {
      'Content-Length': String(VERCEL_DRAIN_LIMITS.bodyBytes + 1),
    }))

    expect(response.status).toBe(413)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.upsertDrainSignalForFlag).not.toHaveBeenCalled()
  })

  it('enforces the byte cap when no Content-Length header is supplied', async () => {
    const oversized = JSON.stringify({ padding: 'x'.repeat(VERCEL_DRAIN_LIMITS.bodyBytes + 1) })
    const drainRequest = request(oversized)
    expect(drainRequest.headers.get('content-length')).toBeNull()

    const response = await POST(drainRequest)

    expect(response.status).toBe(413)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.upsertDrainSignalForFlag).not.toHaveBeenCalled()
  })

  it.each([
    [
      'event count',
      { events: Array.from({ length: VERCEL_DRAIN_LIMITS.events + 1 }, () => event()) },
    ],
    [
      'flag-key count',
      { events: Array.from({ length: VERCEL_DRAIN_LIMITS.flagKeys + 1 }, (_, index) => event({ flag_key: `flag-${index}` })) },
    ],
    [
      'event-name length',
      { events: [event({ eventName: 'e'.repeat(VERCEL_DRAIN_LIMITS.eventNameCharacters + 1) })] },
    ],
    [
      'experiment-id length',
      { events: [event({ experiment_id: 'e'.repeat(VERCEL_DRAIN_LIMITS.experimentIdCharacters + 1) })] },
    ],
    [
      'flag-key length',
      { events: [event({ flag_key: 'f'.repeat(VERCEL_DRAIN_LIMITS.flagKeyCharacters + 1) })] },
    ],
    [
      'variant length',
      { events: [event({ variant: 'v'.repeat(VERCEL_DRAIN_LIMITS.variantCharacters + 1) })] },
    ],
    [
      'page-path length',
      { events: [event({ page_path: `/${'p'.repeat(VERCEL_DRAIN_LIMITS.pagePathCharacters)}` })] },
    ],
    [
      'per-event count',
      { events: [event({ count: VERCEL_DRAIN_LIMITS.countPerEvent + 1 })] },
    ],
  ])('rejects an excessive %s before any write', async (_label, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(413)
    expect(mocks.upsertDrainSignalForFlag).not.toHaveBeenCalled()
  })

  it('coalesces exact concurrent deliveries so the signal is linked once', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    mocks.upsertDrainSignalForFlag.mockImplementationOnce(async () => {
      await gate
      return { updated: true, warnings: [] }
    })
    const body = { events: [event()] }

    const first = POST(request(body))
    const second = POST(request(body))
    await vi.waitFor(() => expect(mocks.upsertDrainSignalForFlag).toHaveBeenCalledTimes(1))
    release?.()
    const [firstResponse, secondResponse] = await Promise.all([first, second])

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(mocks.upsertDrainSignalForFlag).toHaveBeenCalledTimes(1)
    expect(await firstResponse.json()).toMatchObject({ received: 1, updatedSignals: 1 })
    expect(await secondResponse.json()).toMatchObject({ received: 1, updatedSignals: 1 })
  })
})
