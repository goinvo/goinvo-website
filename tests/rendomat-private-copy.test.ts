/**
 * A linked item never auto-posts and never goes public.
 *
 * A video Marqueta asked Rendomat to make comes back onto its calendar item
 * PRIVATELY: the file goes to the private store, the item gains privateVideo
 * and a pending sign-off, and nothing else moves. Pinned end to end through
 * the real ingest route (its publish_at pass and its linked pass), with only
 * the network edges faked:
 *   - the publish_at pass never claims, uploads or schedules a linked video,
 *     whether it is linked by external_ref or by the item's project link;
 *   - the linked pass writes privateVideo + clientSignOff only, uploads to
 *     the private store, uploads nothing to Sanity, schedules nothing;
 *   - a render made for another item is never attached;
 *   - the daily cron is GET, CRON_SECRET only, and skips (200) unconnected;
 *   - the copy to public media needs the client's approval AND a confirmation,
 *     and still schedules nothing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- fake clients and Block Kit fixtures are loosely shaped on purpose */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Doc = Record<string, any> & { _id: string; _type: string; _rev?: string }

const mocks = vi.hoisted(() => ({
  client: null as any,
  listCompletedVideos: vi.fn(),
  getRendomatExport: vi.fn(),
  getRendomatVideo: vi.fn(),
  downloadRendomatAsset: vi.fn(),
  schedulePublish: vi.fn(),
  putPrivateVideo: vi.fn(),
  postSlackMessage: vi.fn(),
  blobConfigured: true,
}))

vi.mock('@/lib/marketing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing')>()
  return { ...actual,  getMarketingWriteClientFor: vi.fn(() => mocks.client) }
})
vi.mock('@/lib/marketing/publishers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/publishers')>()
  return { ...actual, schedulePublish: mocks.schedulePublish }
})
vi.mock('@/lib/marketing/rendomat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/rendomat')>()
  return {
    ...actual,
    isRendomatConfigured: vi.fn(() => true),
    listCompletedVideos: mocks.listCompletedVideos,
    getRendomatExport: mocks.getRendomatExport,
    getRendomatVideo: mocks.getRendomatVideo,
    downloadRendomatAsset: mocks.downloadRendomatAsset,
  }
})
vi.mock('@/lib/marketing/privateMedia.server', () => ({
  isPrivateBlobConfigured: () => mocks.blobConfigured,
  putPrivateVideo: mocks.putPrivateVideo,
  signPrivateVideoUrl: vi.fn(),
  readPrivateVideo: vi.fn(),
  PRIVATE_VIDEO_URL_TTL_MS: 900000,
}))
vi.mock('@/lib/marketing/outreachClient.server', () => ({ getOutreachClient: () => mocks.client, isOutreachClientConfigured: () => true }))
vi.mock('@/lib/chat/slack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chat/slack')>()
  return { ...actual, postSlackMessage: mocks.postSlackMessage }
})

import { GET as ingestGet, POST as ingestPost } from '@/app/api/marketing/rendomat/ingest/route'
import { copyToPublicMedia, recordClientSignOff } from '@/lib/marketing/privateMediaActions.server'
import { NEVER_WRITTEN_BY_A_RENDER } from '@/lib/marketing/rendomatLink'

const ITEM_ID = 'marketingCalendarItem.slack-C0MKT-1726000000-000400'
const PROJECT = 'https://rendomat.example.org/videos/77'

function memoryClient(initial: Doc[]) {
  const documents = new Map<string, Doc>()
  let revision = 0
  const uploads: string[] = []
  const save = (document: Doc) => {
    const next = { ...structuredClone(document), _rev: `rev-${++revision}` }
    documents.set(next._id, next)
    return structuredClone(next)
  }
  for (const document of initial) save(document)
  const project = (document: Doc) => ({ ...structuredClone(document), hasSocialVideo: Boolean(document.socialVideo?.asset), assetId: document.socialVideo?.asset?._ref })

  const client = {
    fetch: vi.fn(async (query: string, params: Record<string, any> = {}) => {
      if (params.itemId) {
        const found = documents.get(params.itemId) || [...documents.values()].find((doc) => doc.rendomatVideoId === params.rid)
        return found ? project(found) : null
      }
      if (query.includes('defined(rendomatProjectUrl)')) {
        return [...documents.values()]
          .filter((doc) => doc._type === 'marketingCalendarItem' && doc.rendomatProjectUrl && doc.rendomatVideoId && !doc.privateVideo?.pathname && doc.status !== 'canceled')
          .map(project)
      }
      if (params.id) return documents.get(params.id) ? project(documents.get(params.id)!) : null
      return null
    }),
    createIfNotExists: vi.fn(async (document: Doc) => documents.get(document._id) ? structuredClone(documents.get(document._id)) : save(document)),
    patch: vi.fn((id: string) => {
      let expected: string | undefined
      const values: Record<string, any> = {}
      const builder = {
        ifRevisionId(rev: string) { expected = rev; return builder },
        set(next: Record<string, any>) { Object.assign(values, next); return builder },
        async commit() {
          const current = documents.get(id)
          if (!current) throw new Error(`missing ${id}`)
          if (expected && current._rev !== expected) throw Object.assign(new Error('conflict'), { statusCode: 409 })
          const merged: Doc = { ...current }
          for (const [key, value] of Object.entries(values)) {
            if (key.includes('.')) {
              const [head, tail] = key.split('.')
              merged[head] = { ...(merged[head] || {}), [tail]: value }
            } else merged[key] = value
          }
          return save(merged)
        },
      }
      return builder
    }),
    assets: { upload: vi.fn(async () => { const id = `file-${uploads.length + 1}`; uploads.push(id); return { _id: id } }) },
    delete: vi.fn(async () => undefined),
  }
  return { client, documents, uploads }
}

const LINKED_ITEM: Doc = {
  _id: ITEM_ID,
  _type: 'marketingCalendarItem',
  title: 'The five minutes that lose a patient',
  status: 'drafting',
  contentType: 'video',
  contentDraft: 'the script',
  autoPublish: false,
  rendomatVideoId: '77',
  rendomatProjectUrl: PROJECT,
  slackChannel: 'C0MKT',
  slackThreadTs: '1726000000.000100',
}

const soon = () => new Date(Date.now() + 2 * 86_400_000).toISOString()
const cronRequest = (method = 'POST') =>
  new Request('https://www.example.org/api/marketing/rendomat/ingest', { method, headers: { authorization: 'Bearer cron-test' } })

const UNTOUCHED = (doc: Doc) => Object.fromEntries(NEVER_WRITTEN_BY_A_RENDER.map((field) => [field, doc[field]]))

describe('a linked item never auto-posts and never goes public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'cron-test'
    mocks.blobConfigured = true
    mocks.getRendomatExport.mockResolvedValue({ assets: { video: 'https://rendomat.example.org/api/files/77.mp4' } })
    mocks.downloadRendomatAsset.mockResolvedValue({ buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'video/mp4' })
    mocks.schedulePublish.mockResolvedValue({ ok: true })
    mocks.putPrivateVideo.mockImplementation(async (input: { pathname: string; body: ArrayBuffer }) => ({ pathname: input.pathname, contentType: 'video/mp4', size: input.body.byteLength }))
    mocks.postSlackMessage.mockResolvedValue({ channel: 'C0MKT', ts: '1' })
  })

  for (const [how, video] of [
    ['by external_ref', { id: 77, title: 'From Rendomat', status: 'completed', publish_at: soon(), external_ref: ITEM_ID, download_url: 'https://rendomat.example.org/api/files/77.mp4' }],
    ['by the item’s project link', { id: 77, title: 'From Rendomat', status: 'completed', publish_at: soon(), external_ref: null, download_url: 'https://rendomat.example.org/api/files/77.mp4' }],
  ] as const) {
    it(`keeps a video linked ${how} out of the publish_at pass`, async () => {
      const memory = memoryClient([LINKED_ITEM])
      mocks.client = memory.client
      mocks.listCompletedVideos.mockResolvedValue([video])
      mocks.getRendomatVideo.mockResolvedValue({ ...video, external_ref: ITEM_ID })
      const before = UNTOUCHED(memory.documents.get(ITEM_ID)!)

      const response = await ingestPost(cronRequest())
      const body = await response.json()
      expect(response.status).toBe(200)

      expect(body.results[0]).toMatchObject({ action: 'skipped', reason: expect.stringMatching(/linked pass/) })
      expect(mocks.schedulePublish).not.toHaveBeenCalled()
      expect(mocks.getRendomatExport).not.toHaveBeenCalled()
      expect(memory.client.assets.upload).not.toHaveBeenCalled()
      expect(memory.documents.has('rendomat.calendar.77')).toBe(false)

      const after = memory.documents.get(ITEM_ID)!
      expect(UNTOUCHED(after)).toEqual(before)
      expect(after.privateVideo).toMatchObject({ pathname: `marketing/rendomat/${ITEM_ID}/77.mp4`, rendomatVideoId: '77', size: 3 })
      expect(after.clientSignOff).toEqual({ status: 'pending' })
      expect(body.linked).toMatchObject({ skipped: false, attached: 1 })
      expect(mocks.putPrivateVideo).toHaveBeenCalledTimes(1)
      // She says so in the draft's own thread, and calls it private.
      expect(mocks.postSlackMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C0MKT', threadTs: '1726000000.000100', text: expect.stringMatching(/private until/) }))
    })
  }

  it('never attaches a render made for a different item', async () => {
    const memory = memoryClient([LINKED_ITEM])
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([])
    mocks.getRendomatVideo.mockResolvedValue({ id: 77, status: 'completed', download_url: 'https://rendomat.example.org/x.mp4', external_ref: 'marketingCalendarItem.other' })
    const body = await (await ingestPost(cronRequest())).json()
    expect(body.linked.results[0]).toMatchObject({ action: 'skipped', reason: expect.stringMatching(/different calendar item/) })
    expect(mocks.putPrivateVideo).not.toHaveBeenCalled()
    expect(memory.documents.get(ITEM_ID)!.privateVideo).toBeUndefined()
  })

  it('by default never ingests an unlinked publish_at render (the old auto-posting path is off)', async () => {
    const memory = memoryClient([])
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([{ id: 88, title: 'Scheduled reel', status: 'completed', publish_at: soon(), external_ref: null }])
    const body = await (await ingestPost(cronRequest())).json()
    expect(body.results[0]).toMatchObject({ action: 'skipped', reason: expect.stringMatching(/RENDOMAT_AUTOPOST_INGEST/) })
    expect(mocks.schedulePublish).not.toHaveBeenCalled()
  })

  it('ingests an unlinked publish_at render the old way only when RENDOMAT_AUTOPOST_INGEST is "on"', async () => {
    vi.stubEnv('RENDOMAT_AUTOPOST_INGEST', 'on')
    try {
      const memory = memoryClient([])
      mocks.client = memory.client
      mocks.listCompletedVideos.mockResolvedValue([{ id: 88, title: 'Scheduled reel', status: 'completed', publish_at: soon(), external_ref: null }])
      const body = await (await ingestPost(cronRequest())).json()
      expect(body.results[0]).toMatchObject({ action: 'ingested' })
      expect(mocks.schedulePublish).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('runs the daily cron as GET with CRON_SECRET only, and skips (200) when the private store is not connected', async () => {
    const memory = memoryClient([LINKED_ITEM])
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([])
    expect((await ingestGet(new Request('https://www.example.org/api/marketing/rendomat/ingest'))).status).toBe(401)
    mocks.blobConfigured = false
    const skipped = await ingestGet(cronRequest('GET'))
    expect(skipped.status).toBe(200)
    expect(await skipped.json()).toMatchObject({ skipped: true, reason: expect.stringMatching(/private video store/) })
    expect(mocks.listCompletedVideos).not.toHaveBeenCalled()
    mocks.blobConfigured = true
    mocks.getRendomatVideo.mockResolvedValue({ id: 77, status: 'rendering', download_url: null, external_ref: ITEM_ID })
    const ran = await ingestGet(cronRequest('GET'))
    expect(ran.status).toBe(200)
    expect((await ran.json()).linked.results[0]).toMatchObject({ action: 'skipped', reason: expect.stringMatching(/Not rendered/) })
  })
})

describe('the copy to public media', () => {
  const withVideo: Doc = {
    ...LINKED_ITEM,
    privateVideo: { pathname: `marketing/rendomat/${ITEM_ID}/77.mp4`, contentType: 'video/mp4', size: 3, uploadedAt: '2026-10-06T00:00:00Z', rendomatVideoId: '77' },
    clientSignOff: { status: 'pending' },
  }
  const read = vi.fn(async () => ({ buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'video/mp4' }))

  it('is refused before the client approves, and without the confirmation', async () => {
    const memory = memoryClient([withVideo])
    expect(await copyToPublicMedia({ itemId: ITEM_ID, confirmed: true, by: 'Jules' }, { client: memory.client as never, read })).toMatchObject({ ok: false, status: 409 })
    await recordClientSignOff({ itemId: ITEM_ID, status: 'approved', by: 'Jules', byUserId: 'p1' }, { client: memory.client as never })
    expect(await copyToPublicMedia({ itemId: ITEM_ID, confirmed: 'yes', by: 'Jules' }, { client: memory.client as never, read })).toMatchObject({ ok: false, status: 400 })
    expect(memory.client.assets.upload).not.toHaveBeenCalled()
  })

  it('after approval and confirmation fills socialVideo and stamps the copy — and schedules nothing', async () => {
    const memory = memoryClient([{ ...withVideo, clientSignOff: { status: 'approved', by: 'Jules', at: '2026-10-06T00:00:00Z' } }])
    const before = memory.documents.get(ITEM_ID)!
    const result = await copyToPublicMedia({ itemId: ITEM_ID, confirmed: true, by: 'Jules' }, { client: memory.client as never, read, now: () => new Date('2026-10-07T00:00:00Z') })
    expect(result).toEqual({ ok: true, assetId: 'file-1' })
    const after = memory.documents.get(ITEM_ID)!
    expect(after.socialVideo).toEqual({ _type: 'file', asset: { _type: 'reference', _ref: 'file-1' } })
    expect(after.privateVideo).toMatchObject({ publicCopyAt: '2026-10-07T00:00:00.000Z', publicCopyBy: 'Jules', pathname: before.privateVideo.pathname })
    for (const field of ['status', 'autoPublish', 'publishAt', 'title', 'contentDraft']) expect(after[field], field).toEqual(before[field])
    expect(mocks.schedulePublish).not.toHaveBeenCalled()
    // Only once.
    expect(await copyToPublicMedia({ itemId: ITEM_ID, confirmed: true, by: 'Jules' }, { client: memory.client as never, read })).toMatchObject({ ok: false })
  })
})

// Authentication is server-only; keep the existing route-test boundary mocks.
vi.mock('@/lib/marketing/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/auth')>()
  return { ...actual, assertMarketingApiKey: vi.fn(() => undefined) }
})
