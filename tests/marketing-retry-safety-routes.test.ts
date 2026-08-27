import { beforeEach, describe, expect, it, vi } from 'vitest'

type Doc = Record<string, unknown> & { _id: string; _type: string; _rev?: string }

const mocks = vi.hoisted(() => ({
  client: null as unknown,
  listCompletedVideos: vi.fn(),
  getRendomatExport: vi.fn(),
  downloadRendomatAsset: vi.fn(),
  schedulePublish: vi.fn(),
}))

vi.mock('@/lib/marketing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing')>()
  return {
    ...actual,
    assertStudioOrApiKey: vi.fn(async () => undefined),
    assertMarketingApiKey: vi.fn(() => undefined),
    getMarketingWriteClient: vi.fn(() => mocks.client),
    getMarketingWriteClientFor: vi.fn(() => mocks.client),
  }
})

vi.mock('@/lib/marketing/publishers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/publishers')>()
  return {
    ...actual,
    schedulePublish: mocks.schedulePublish,
  }
})

vi.mock('@/lib/marketing/rendomat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/rendomat')>()
  return {
    ...actual,
    isRendomatConfigured: vi.fn(() => true),
    listCompletedVideos: mocks.listCompletedVideos,
    getRendomatExport: mocks.getRendomatExport,
    downloadRendomatAsset: mocks.downloadRendomatAsset,
  }
})

import { POST as cascadePost } from '@/app/api/marketing/cascade/research-records/route'
import { POST as linkPost } from '@/app/api/marketing/clone/link-from-post/route'
import { POST as proofPost } from '@/app/api/marketing/clone/proof-from-result/route'
import { POST as rendomatPost } from '@/app/api/marketing/rendomat/ingest/route'
import { marketingCloneDocumentId } from '@/lib/marketing/clone'
import { rendomatCalendarItemId } from '@/lib/marketing/rendomat'

function conflictError() {
  return Object.assign(new Error('revision conflict'), { statusCode: 409 })
}

function memoryClient(initial: Doc[] = []) {
  const documents = new Map<string, Doc>()
  const assets = new Set<string>()
  let revision = 0
  let uploadCount = 0
  let failNextTransaction = false
  let failNextPatch = false

  function stored(document: Doc): Doc {
    return structuredClone(document)
  }
  function save(document: Doc): Doc {
    const next = { ...stored(document), _rev: `rev-${++revision}` }
    documents.set(next._id, next)
    return stored(next)
  }
  for (const document of initial) save(document)

  function itemForFetch(query: string, params: Record<string, unknown> = {}) {
    if (query.includes('math::max')) return 0
    if (query.includes('_type == "marketingChannel"')) {
      return Array.from(documents.values()).filter(
        (document) => document._type === 'marketingChannel' && document.key === params.key,
      )
    }
    if (params.itemId) {
      const direct = documents.get(String(params.itemId))
      const found = direct || Array.from(documents.values()).find(
        (document) => document.rendomatVideoId === params.rid,
      )
      if (!found) return null
      const clone = stored(found)
      const socialVideo = clone.socialVideo as { asset?: { _ref?: string } } | undefined
      return { ...clone, assetId: socialVideo?.asset?._ref }
    }
    if (params.id) return documents.get(String(params.id)) ? stored(documents.get(String(params.id)) as Doc) : null
    return null
  }

  function patchBuilder(id: string) {
    let expectedRevision: string | undefined
    let values: Record<string, unknown> = {}
    const builder = {
      ifRevisionId(value: string) {
        expectedRevision = value
        return builder
      },
      set(value: Record<string, unknown>) {
        values = { ...values, ...value }
        return builder
      },
      async commit() {
        if (failNextPatch) {
          failNextPatch = false
          throw new Error('simulated patch failure')
        }
        const current = documents.get(id)
        if (!current) throw new Error(`missing ${id}`)
        if (expectedRevision && current._rev !== expectedRevision) throw conflictError()
        return save({ ...current, ...values })
      },
      snapshot() {
        return { id, expectedRevision, values }
      },
    }
    return builder
  }

  const client = {
    fetch: vi.fn(async (query: string, params?: Record<string, unknown>) => itemForFetch(query, params)),
    createIfNotExists: vi.fn(async (document: Doc) => {
      const current = documents.get(document._id)
      return current ? stored(current) : save(document)
    }),
    patch: vi.fn((id: string) => patchBuilder(id)),
    transaction: vi.fn(() => {
      const creates: Doc[] = []
      const patches: Array<ReturnType<typeof patchBuilder>['snapshot'] extends () => infer T ? T : never> = []
      const transaction = {
        createIfNotExists(document: Doc) {
          creates.push(document)
          return transaction
        },
        patch(id: string, callback: (builder: ReturnType<typeof patchBuilder>) => unknown) {
          const builder = patchBuilder(id)
          callback(builder)
          patches.push(builder.snapshot())
          return transaction
        },
        async commit() {
          if (failNextTransaction) {
            failNextTransaction = false
            throw new Error('simulated atomic transaction failure')
          }
          for (const patch of patches) {
            const current = documents.get(patch.id)
            if (!current) throw new Error(`missing ${patch.id}`)
            if (patch.expectedRevision && current._rev !== patch.expectedRevision) throw conflictError()
          }
          for (const document of creates) {
            if (!documents.has(document._id)) save(document)
          }
          for (const patch of patches) {
            const current = documents.get(patch.id) as Doc
            save({ ...current, ...patch.values })
          }
          return { transactionId: `tx-${revision}` }
        },
      }
      return transaction
    }),
    assets: {
      upload: vi.fn(async () => {
        uploadCount += 1
        const id = `file-${uploadCount}`
        assets.add(id)
        return { _id: id }
      }),
    },
    delete: vi.fn(async (id: string) => {
      assets.delete(id)
      documents.delete(id)
    }),
  }

  return {
    client,
    documents,
    assets,
    uploadCount: () => uploadCount,
    failTransaction: () => { failNextTransaction = true },
    failPatch: () => { failNextPatch = true },
  }
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
    body: JSON.stringify(body),
  })
}

function researchFixture(): Doc[] {
  return [
    {
      _id: 'project-1',
      _type: 'marketingResearchProject',
      title: 'Safer services',
      status: 'reviewing',
      selectedResults: [{ _id: 'result-1', _type: 'marketingResearchResult', status: 'approved', sourceUrl: 'https://example.org' }],
      approvedResults: [],
      generatedCampaigns: [],
      generatedFunnels: [],
      generatedCalendarItems: [],
      generatedLinkItems: [{ _key: 'manual-link', _type: 'reference', _ref: 'manual-link' }],
    },
  ]
}

describe('stateful Marketing writer retry safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listCompletedVideos.mockResolvedValue([])
    mocks.getRendomatExport.mockResolvedValue({ assets: { video: 'https://rendomat.test/video.mp4' } })
    mocks.downloadRendomatAsset.mockResolvedValue({ buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'video/mp4' })
    mocks.schedulePublish.mockResolvedValue({ ok: true })
  })

  it('converges concurrent research conversions on one atomic document set', async () => {
    const memory = memoryClient(researchFixture())
    mocks.client = memory.client
    const request = () => cascadePost(jsonRequest('https://www.goinvo.com/api/marketing/cascade/research-records', { projectId: 'project-1' }))
    const [first, second] = await Promise.all([request(), request()])

    expect([first.status, second.status]).toEqual([201, 201])
    const conversions = Array.from(memory.documents.values()).filter((document) => document._id.startsWith('research-conversion.'))
    expect(conversions).toHaveLength(4)
    expect(new Set(conversions.map((document) => document._id)).size).toBe(4)
    const project = memory.documents.get('project-1') as Doc
    expect(project.status).toBe('converted')
    expect(project.generatedCampaigns).toHaveLength(1)
    expect(project.generatedCalendarItems).toHaveLength(1)
    expect((project.generatedLinkItems as Array<{ _ref: string }>).map((ref) => ref._ref))
      .toEqual(['manual-link', expect.stringMatching(/^research-conversion\./)])
  })

  it('leaves no generated research orphans after commit failure and succeeds on retry', async () => {
    const memory = memoryClient(researchFixture())
    memory.failTransaction()
    mocks.client = memory.client
    const request = () => cascadePost(jsonRequest('https://www.goinvo.com/api/marketing/cascade/research-records', { projectId: 'project-1' }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect((await request()).status).toBe(500)
    expect(Array.from(memory.documents.keys()).some((id) => id.startsWith('research-conversion.'))).toBe(false)
    expect((await request()).status).toBe(201)
    expect(Array.from(memory.documents.keys()).filter((id) => id.startsWith('research-conversion.'))).toHaveLength(4)
    consoleError.mockRestore()
  })

  it('creates one source-derived link under concurrent replay', async () => {
    const memory = memoryClient([{
      _id: 'calendar-1', _type: 'marketingCalendarItem', title: 'Post', publishedUrl: 'https://example.org/post', status: 'published',
    }])
    mocks.client = memory.client
    const request = () => linkPost(jsonRequest('https://www.goinvo.com/api/marketing/clone/link-from-post', { calendarItemId: 'calendar-1' }))
    const [first, second] = await Promise.all([request(), request()])
    const linkId = marketingCloneDocumentId('link-from-post', 'calendar-1')

    expect([first.status, second.status]).toEqual([201, 201])
    expect(Array.from(memory.documents.values()).filter((document) => document._type === 'marketingLinkItem')).toHaveLength(1)
    expect(memory.documents.get(linkId)?.calendarItem).toMatchObject({ _ref: 'calendar-1' })
  })

  it('atomically preserves proof refs, converges concurrent replay, and recovers after failure', async () => {
    const fixture: Doc = {
      _id: 'result-1', _type: 'marketingResearchResult', title: 'Finding', status: 'approved', claim: 'A supported claim.',
      proofPoints: [{ _key: 'existing', _type: 'reference', _ref: 'proof-existing' }],
    }
    const memory = memoryClient([fixture])
    mocks.client = memory.client
    const request = () => proofPost(jsonRequest('https://www.goinvo.com/api/marketing/clone/proof-from-result', { resultId: 'result-1' }))
    memory.failTransaction()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect((await request()).status).toBe(500)
    expect(Array.from(memory.documents.values()).filter((document) => document._type === 'marketingProofPoint')).toHaveLength(0)
    const [first, second] = await Promise.all([request(), request()])
    expect([first.status, second.status]).toEqual([201, 201])
    const proofId = marketingCloneDocumentId('proof-from-result', 'result-1')
    expect(Array.from(memory.documents.values()).filter((document) => document._type === 'marketingProofPoint')).toHaveLength(1)
    const refs = (memory.documents.get('result-1')?.proofPoints as Array<{ _ref: string }>).map((ref) => ref._ref)
    expect(refs).toEqual(['proof-existing', proofId])
    consoleError.mockRestore()
  })

  it('claims a Rendomat video once under concurrency', async () => {
    const memory = memoryClient()
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([{
      id: 42, title: 'Video', publish_at: '2026-07-21T12:00:00.000Z', status: 'completed',
    }])
    const request = () => rendomatPost(new Request('https://www.goinvo.com/api/marketing/rendomat/ingest', {
      method: 'POST', headers: { authorization: 'Bearer test' },
    }))
    const [first, second] = await Promise.all([request(), request()])
    const bodies = await Promise.all([first.json(), second.json()])

    expect(memory.uploadCount()).toBe(1)
    expect(mocks.downloadRendomatAsset).toHaveBeenCalledTimes(1)
    expect(memory.documents.get(rendomatCalendarItemId(42))?.rendomatIngestState).toBe('scheduled')
    expect(bodies.flatMap((body) => body.results).filter((result) => result.action === 'ingested')).toHaveLength(1)
  })

  it('retries only scheduling for an existing Rendomat asset after enqueue failure', async () => {
    const memory = memoryClient()
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([{
      id: 43, title: 'Video', publish_at: '2026-07-21T12:00:00.000Z', status: 'completed',
    }])
    mocks.schedulePublish
      .mockResolvedValueOnce({ ok: false, error: 'QStash unavailable' })
      .mockResolvedValueOnce({ ok: true })
    const request = () => rendomatPost(new Request('https://www.goinvo.com/api/marketing/rendomat/ingest', {
      method: 'POST', headers: { authorization: 'Bearer test' },
    }))

    const first = await request()
    expect(first.status).toBe(200)
    expect(memory.documents.get(rendomatCalendarItemId(43))?.rendomatIngestState).toBe('scheduleFailed')
    const second = await request()
    expect(second.status).toBe(200)
    expect(memory.documents.get(rendomatCalendarItemId(43))?.rendomatIngestState).toBe('scheduled')
    expect(memory.uploadCount()).toBe(1)
    expect(mocks.getRendomatExport).toHaveBeenCalledTimes(1)
    expect(mocks.downloadRendomatAsset).toHaveBeenCalledTimes(1)
    expect(mocks.schedulePublish).toHaveBeenCalledTimes(2)
  })

  it('releases a failed Rendomat attachment patch and can re-ingest cleanly', async () => {
    const memory = memoryClient()
    memory.failPatch()
    mocks.client = memory.client
    mocks.listCompletedVideos.mockResolvedValue([{
      id: 44, title: 'Video', publish_at: '2026-07-21T12:00:00.000Z', status: 'completed',
    }])
    const request = () => rendomatPost(new Request('https://www.goinvo.com/api/marketing/rendomat/ingest', {
      method: 'POST', headers: { authorization: 'Bearer test' },
    }))

    const firstBody = await (await request()).json()
    expect(firstBody.results[0]).toMatchObject({ action: 'error', itemId: rendomatCalendarItemId(44) })
    expect(memory.documents.get(rendomatCalendarItemId(44))?.rendomatIngestState).toBe('failed')
    expect(memory.assets.size).toBe(0)

    const secondBody = await (await request()).json()
    expect(secondBody.results[0]).toMatchObject({ action: 'ingested', scheduled: true })
    expect(memory.documents.get(rendomatCalendarItemId(44))?.rendomatIngestState).toBe('scheduled')
    expect(memory.assets.size).toBe(1)
    expect(mocks.downloadRendomatAsset).toHaveBeenCalledTimes(2)
  })
})
