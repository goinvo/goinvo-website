import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseGaClientId } from '@/lib/analytics'
import { sendGa4MpEvents } from '@/lib/marketing/ga4MeasurementProtocol'

describe('parseGaClientId (GA _ga cookie → GA4 client_id)', () => {
  it('extracts the last two dot-segments from a GA1 cookie value', () => {
    // _ga=GA1.1.1234567890.1681234567  →  client_id 1234567890.1681234567
    expect(parseGaClientId('GA1.1.1234567890.1681234567')).toBe('1234567890.1681234567')
  })

  it('handles a two-part scope (GA1.2.<n>.<t>) the same way', () => {
    expect(parseGaClientId('GA1.2.987654321.1700000000')).toBe('987654321.1700000000')
  })

  it('returns undefined for absent or malformed cookie values', () => {
    expect(parseGaClientId(undefined)).toBeUndefined()
    expect(parseGaClientId('')).toBeUndefined()
    // Fewer than four dot-segments is not a usable GA1 client id.
    expect(parseGaClientId('GA1.1.1234567890')).toBeUndefined()
    expect(parseGaClientId('not-a-ga-cookie')).toBeUndefined()
  })
})

describe('sendGa4MpEvents', () => {
  const fetchMock = vi.fn()
  const originalFetch = globalThis.fetch
  const originalSecret = process.env.GA4_MP_API_SECRET
  const originalMeasurementId = process.env.GA4_MEASUREMENT_ID

  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    delete process.env.GA4_MP_API_SECRET
    delete process.env.GA4_MEASUREMENT_ID
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.GA4_MP_API_SECRET
    else process.env.GA4_MP_API_SECRET = originalSecret
    if (originalMeasurementId === undefined) delete process.env.GA4_MEASUREMENT_ID
    else process.env.GA4_MEASUREMENT_ID = originalMeasurementId
  })

  it('is a no-op (returns false, never fetches) when GA4_MP_API_SECRET is unset', async () => {
    const result = await sendGa4MpEvents('1234567890.1681234567', [
      { name: 'experiment_exposure', params: { variant: 'concept' } },
    ])
    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false without fetching when client_id or events are empty', async () => {
    process.env.GA4_MP_API_SECRET = 'secret123'
    expect(await sendGa4MpEvents('', [{ name: 'e', params: {} }])).toBe(false)
    expect(await sendGa4MpEvents('cid', [])).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs { client_id, events } to the MP endpoint and injects engagement_time_msec', async () => {
    process.env.GA4_MP_API_SECRET = 'secret123'
    process.env.GA4_MEASUREMENT_ID = 'G-TEST123'
    fetchMock.mockResolvedValue({ ok: true } as Response)

    const result = await sendGa4MpEvents('1234567890.1681234567', [
      {
        name: 'qualified_discovery_call_click',
        params: { variant: 'concept', flag_key: 'home-2026-variant', session_id: 'sess-1' },
      },
    ])

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://www.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=secret123',
    )
    expect(init.method).toBe('POST')
    const payload = JSON.parse(String(init.body))
    expect(payload.client_id).toBe('1234567890.1681234567')
    expect(payload.events).toHaveLength(1)
    expect(payload.events[0].name).toBe('qualified_discovery_call_click')
    // Caller params pass through; engagement_time_msec is always injected.
    expect(payload.events[0].params).toMatchObject({
      variant: 'concept',
      flag_key: 'home-2026-variant',
      session_id: 'sess-1',
      engagement_time_msec: 1,
    })
  })

  it('defaults the measurement id to G-P00K4KL2Y9 when GA4_MEASUREMENT_ID is unset', async () => {
    process.env.GA4_MP_API_SECRET = 'secret123'
    fetchMock.mockResolvedValue({ ok: true } as Response)
    await sendGa4MpEvents('cid', [{ name: 'e', params: {} }])
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('measurement_id=G-P00K4KL2Y9')
  })

  it('resolves false (never throws) when fetch rejects', async () => {
    process.env.GA4_MP_API_SECRET = 'secret123'
    fetchMock.mockRejectedValue(new Error('network down'))
    await expect(sendGa4MpEvents('cid', [{ name: 'e', params: {} }])).resolves.toBe(false)
  })

  it('resolves false on a non-2xx response', async () => {
    process.env.GA4_MP_API_SECRET = 'secret123'
    fetchMock.mockResolvedValue({ ok: false, status: 400 } as Response)
    await expect(sendGa4MpEvents('cid', [{ name: 'e', params: {} }])).resolves.toBe(false)
  })
})
