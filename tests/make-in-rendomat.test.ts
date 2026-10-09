/**
 * The write behind *Export to Rendomat*, and the Rendomat client it uses.
 *
 * Rules pinned here:
 *   - fail-closed: without base URL, key AND organization nothing is read or sent;
 *   - the slides are read from the record at press time;
 *   - an item already linked is answered from the record, never sent twice;
 *   - only the three link fields are written, with setIfMissing;
 *   - a Rendomat 400 with problems is the presser's to fix, named by beat;
 *     anything else is a failure that leaves the draft alone;
 *   - the API key travels only to Rendomat's own origin.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- fake clients and Block Kit fixtures are loosely shaped on purpose */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeInRendomat } from '@/lib/marketing/makeInRendomat.server'
import {
  createRendomatVideo,
  downloadRendomatAsset,
  isRendomatCreateConfigured,
  isRendomatOrigin,
  rendomatClientId,
  type RendomatCreateBody,
} from '@/lib/marketing/rendomat'

const CHANNEL = 'C0MKT'
const TS = '1726000000.000400'
const ITEM_ID = 'marketingCalendarItem.slack-C0MKT-1726000000-000400'

function fakeClient(record: Record<string, unknown> | null) {
  const writes: Array<{ id: string; op: string; values: Record<string, unknown> }> = []
  const stored = record ? { ...record } : null
  const client = {
    fetch: vi.fn(async (query: string, params: { id: string }) => {
      expect(params.id).toBe(ITEM_ID)
      if (query.includes('{ rendomatProjectUrl }')) return stored ? { rendomatProjectUrl: stored.rendomatProjectUrl } : null
      return stored ? { ...stored } : null
    }),
    patch: vi.fn((id: string) => {
      const builder = {
        setIfMissing(values: Record<string, unknown>) {
          writes.push({ id, op: 'setIfMissing', values })
          if (stored) for (const [key, value] of Object.entries(values)) if (stored[key] === undefined) stored[key] = value
          return builder
        },
        set(values: Record<string, unknown>) {
          writes.push({ id, op: 'set', values })
          return builder
        },
        commit: vi.fn(async () => stored),
      }
      return builder
    }),
  }
  return { client, writes }
}

const RECORD = {
  _id: ITEM_ID,
  _rev: 'r1',
  title: 'The five minutes that lose a patient',
  status: 'drafting',
  contentType: 'video',
  contentDraft: 'stale flattened copy',
  draftFrames: [
    { title: 'Hook', body: 'Spoken hook.', visualDirection: 'Edited on the Calendar' },
    { title: 'Where they stop', body: 'Spoken beat.', visualDirection: 'Old phone' },
    { title: 'Close', body: 'Spoken close.', visualDirection: 'Test it' },
  ],
}

const deps = (client: unknown, create: (body: RendomatCreateBody) => Promise<any>) => ({
  client: client as never,
  create,
  configured: () => true,
  clientId: () => 12,
  apiBase: 'https://rendomat.example.org',
  now: () => new Date('2026-10-06T15:00:00Z'),
})

describe('makeInRendomat', () => {
  it('reads nothing and sends nothing when Rendomat is not connected', async () => {
    const { client } = fakeClient(RECORD)
    const create = vi.fn()
    const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, { ...deps(client, create), configured: () => false })
    expect(result).toMatchObject({ ok: false, kind: 'failed' })
    expect(client.fetch).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('makes the video from the record as it is now, and records only the link', async () => {
    const { client, writes } = fakeClient(RECORD)
    const create = vi.fn(async (body: RendomatCreateBody) => ({
      ok: true,
      existing: false,
      video: { id: 7, title: body.title, status: 'draft', editor_url: 'https://rendomat.example.org/videos/7', external_ref: body.external_ref },
    }))
    const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, deps(client, create))
    expect(result).toEqual({ ok: true, projectUrl: 'https://rendomat.example.org/videos/7', existing: false, title: RECORD.title })
    const body = create.mock.calls[0][0]
    expect(body).toMatchObject({ mode: 'script', client_id: 12, external_ref: ITEM_ID, brand_kit_id: 'goinvo-health', aspect_ratio: '9:16' })
    expect(body.slides[0]).toEqual({ role: 'cover', title: 'Edited on the Calendar', narration: 'Spoken hook.' })
    expect(writes).toEqual([
      {
        id: ITEM_ID,
        op: 'setIfMissing',
        values: { rendomatVideoId: '7', rendomatProjectUrl: 'https://rendomat.example.org/videos/7', rendomatLinkedAt: '2026-10-06T15:00:00.000Z' },
      },
    ])
  })

  it('answers an item already made from the record, without calling Rendomat', async () => {
    const { client, writes } = fakeClient({ ...RECORD, rendomatVideoId: '7', rendomatProjectUrl: 'https://rendomat.example.org/videos/7' })
    const create = vi.fn()
    const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, deps(client, create))
    expect(result).toMatchObject({ ok: true, existing: true, projectUrl: 'https://rendomat.example.org/videos/7' })
    expect(create).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })

  it('refuses a binned draft or one that is not a video, before sending anything', async () => {
    for (const record of [{ ...RECORD, status: 'canceled' }, { ...RECORD, contentType: 'article' }, null]) {
      const { client } = fakeClient(record)
      const create = vi.fn()
      const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, deps(client, create))
      expect(result).toMatchObject({ ok: false, kind: 'refused' })
      expect(create).not.toHaveBeenCalled()
    }
  })

  it('turns a slide that does not fit into a plain line naming the beat, and writes nothing', async () => {
    const { client, writes } = fakeClient(RECORD)
    const create = vi.fn(async () => ({
      ok: false,
      status: 400,
      error: 'A slide does not fit.',
      problems: [{ slide: 1, field: 'title', reason: 'The on-screen line is 96 characters; this slide fits 60.' }],
    }))
    const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, deps(client, create))
    expect(result).toMatchObject({ ok: false, kind: 'tooLong' })
    expect(result.ok === false && result.message).toMatch(/^The “Where they stop” beat is too long for a slide\. .*Shorten it on the Calendar/)
    expect(writes).toEqual([])
  })

  it('reports any other refusal as a failure, and writes nothing', async () => {
    const { client, writes } = fakeClient(RECORD)
    const create = vi.fn(async () => ({ ok: false, status: 403, error: 'Forbidden', problems: [] }))
    const result = await makeInRendomat({ channel: CHANNEL, ts: TS }, deps(client, create))
    expect(result).toMatchObject({ ok: false, kind: 'failed' })
    expect(writes).toEqual([])
  })
})

describe('the Rendomat client', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
    vi.unstubAllGlobals()
  })

  it('needs base URL, key and a whole-number organization id to make videos', () => {
    process.env.RENDOMAT_API_BASE = 'https://rendomat.example.org'
    process.env.RENDOMAT_API_KEY = 'rmk_test'
    for (const bad of ['', 'abc', '0', '-3', '1.5', '12abc']) {
      process.env.RENDOMAT_CLIENT_ID = bad
      expect(rendomatClientId(), bad).toBeNull()
      expect(isRendomatCreateConfigured(), bad).toBe(false)
    }
    process.env.RENDOMAT_CLIENT_ID = ' 12 '
    expect(rendomatClientId()).toBe(12)
    expect(isRendomatCreateConfigured()).toBe(true)
    delete process.env.RENDOMAT_API_KEY
    expect(isRendomatCreateConfigured()).toBe(false)
  })

  it('posts script mode with the key, and reads a 400 into problems', async () => {
    process.env.RENDOMAT_API_BASE = 'https://rendomat.example.org/'
    process.env.RENDOMAT_API_KEY = 'rmk_test'
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'A slide does not fit.', problems: [{ slide: 2, field: 'title', reason: 'Too long.' }, { reason: '' }] }), { status: 400 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await createRendomatVideo({ mode: 'script', client_id: 12, title: 't', aspect_ratio: '9:16', brand_kit_id: 'goinvo-health', external_ref: ITEM_ID, slides: [] })
    expect(result).toEqual({ ok: false, status: 400, error: 'A slide does not fit.', problems: [{ slide: 2, field: 'title', reason: 'Too long.' }] })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://rendomat.example.org/api/v1/videos')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer rmk_test')
  })

  it('reads a repeated external_ref as the existing video, and never throws on a network failure', async () => {
    process.env.RENDOMAT_API_BASE = 'https://rendomat.example.org'
    process.env.RENDOMAT_API_KEY = 'rmk_test'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 7, existing: true, external_ref: ITEM_ID }), { status: 200 })))
    expect(await createRendomatVideo({} as RendomatCreateBody)).toMatchObject({ ok: true, existing: true, video: { id: 7 } })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await createRendomatVideo({} as RendomatCreateBody)).toMatchObject({ ok: false, status: 0 })
  })

  it('sends the API key only to Rendomat’s own origin', async () => {
    process.env.RENDOMAT_API_BASE = 'https://rendomat.example.org'
    process.env.RENDOMAT_API_KEY = 'rmk_test'
    expect(isRendomatOrigin('https://rendomat.example.org/api/files/a.mp4')).toBe(true)
    expect(isRendomatOrigin('https://storage.example.com/a.mp4')).toBe(false)
    expect(isRendomatOrigin('https://rendomat.example.org.evil.example.com/a.mp4')).toBe(false)
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'video/mp4' } }))
    vi.stubGlobal('fetch', fetchMock)
    await downloadRendomatAsset('https://storage.example.com/a.mp4')
    await downloadRendomatAsset('/api/files/a.mp4')
    const headers = fetchMock.mock.calls.map((call) => ((call as unknown as [string, RequestInit])[1].headers || {}) as Record<string, string>)
    expect(headers[0].Authorization).toBeUndefined()
    expect(headers[1].Authorization).toBe('Bearer rmk_test')
  })
})
