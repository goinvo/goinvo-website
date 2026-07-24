import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks, TestMarketingAuthError, TestMarketingValidationError } = vi.hoisted(() => {
  class HoistedMarketingAuthError extends Error {}
  class HoistedMarketingValidationError extends Error {
    constructor(readonly missing: string[], readonly invalid: unknown[] = []) {
      super(`Missing required fields: ${missing.join(', ')}`)
    }
  }
  return {
    TestMarketingAuthError: HoistedMarketingAuthError,
    TestMarketingValidationError: HoistedMarketingValidationError,
    mocks: {
      assertMarketingApiKey: vi.fn(),
      fetch: vi.fn(),
      patch: vi.fn(),
      remove: vi.fn(),
      create: vi.fn(),
      withConfig: vi.fn(),
    },
  }
})

vi.mock('@/lib/marketing', () => ({
  assertMarketingApiKey: mocks.assertMarketingApiKey,
  buildCreatePayload: (
    type: string,
    fields: Record<string, unknown>,
    options?: { applyDefaults?: boolean },
  ) => {
    if (options?.applyDefaults === false && type === 'marketingCampaign') {
      const missing = ['title', 'slug', 'status'].filter((field) => !fields[field])
      if (missing.length) throw new TestMarketingValidationError(missing)
    }
    return { _type: type, ...fields }
  },
  buildPatchPayload: (_type: string, fields: Record<string, unknown>) => fields,
  channelDeleteCascade: vi.fn(async () => 0),
  getMarketingWriteClient: () => ({
    fetch: mocks.fetch,
    patch: mocks.patch,
    delete: mocks.remove,
    create: mocks.create,
    withConfig: mocks.withConfig,
  }),
  isManagedMarketingType: (type: string) =>
    ['marketingCampaign', 'marketingContact', 'marketingCalendarItem'].includes(type),
  MarketingAuthError: TestMarketingAuthError,
  MarketingValidationError: TestMarketingValidationError,
}))

import { DELETE, GET, PATCH } from '@/app/api/marketing/doc/[type]/[id]/route'
import { POST } from '@/app/api/marketing/doc/[type]/route'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'

const context = (type: string, id: string) => ({ params: Promise.resolve({ type, id }) })

describe('managed marketing document item boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const privateClient = {
      fetch: mocks.fetch,
      patch: mocks.patch,
      delete: mocks.remove,
      create: mocks.create,
      withConfig: mocks.withConfig,
    }
    mocks.withConfig.mockReturnValue(privateClient)
    const patch = {
      ifRevisionId: vi.fn(),
      set: vi.fn(),
      unset: vi.fn(),
      commit: vi.fn(async () => ({ _id: 'doc-1' })),
    }
    patch.ifRevisionId.mockReturnValue(patch)
    patch.set.mockReturnValue(patch)
    patch.unset.mockReturnValue(patch)
    mocks.patch.mockReturnValue(patch)
    mocks.create.mockImplementation(async (doc) => ({ _id: 'created-1', ...doc }))
    mocks.remove.mockResolvedValue([{ _id: 'doc-1' }])
  })

  it('rejects unauthenticated reads before touching Sanity', async () => {
    mocks.assertMarketingApiKey.mockImplementationOnce(() => {
      throw new TestMarketingAuthError('Unauthorized')
    })
    const response = await GET(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1'),
      context('marketingCampaign', 'doc-1'),
    )
    expect(response.status).toBe(401)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('rejects malformed document ids', async () => {
    const response = await GET(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/bad%20id'),
      context('marketingCampaign', 'bad id'),
    )
    expect(response.status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('will not patch an id unless the document has the requested managed type', async () => {
    mocks.fetch.mockResolvedValueOnce(null)
    const response = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/other-type-doc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set: { title: 'Attempted overwrite' }, expectedRevision: 'rev-1' }),
      }),
      context('marketingCampaign', 'other-type-doc'),
    )
    expect(response.status).toBe(404)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('will not delete an id unless the document has the requested managed type', async () => {
    mocks.fetch.mockResolvedValueOnce(null)
    const response = await DELETE(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/other-type-doc', {
        method: 'DELETE',
        headers: { 'If-Match': 'rev-1' },
      }),
      context('marketingCampaign', 'other-type-doc'),
    )
    expect(response.status).toBe(404)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('routes outreach PII reads to the private dataset client', async () => {
    mocks.fetch.mockResolvedValueOnce({ _id: 'contact-1', _type: 'marketingContact' })
    const response = await GET(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingContact/contact-1'),
      context('marketingContact', 'contact-1'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.withConfig).toHaveBeenCalledWith({ dataset: OUTREACH_DATASET })
  })

  it('keeps channel-override patches with contact PII in the private dataset', async () => {
    mocks.fetch.mockResolvedValueOnce({ _id: 'contact-1', _rev: 'rev-1', _type: 'marketingContact', name: 'A', status: 'new' })
    const response = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingContact/contact-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set: {
            channelOverrides: [
              { channel: 'email', state: 'unresponsive', note: 'No reply after two attempts.' },
            ],
          },
          expectedRevision: 'rev-1',
        }),
      }),
      context('marketingContact', 'contact-1'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.withConfig).toHaveBeenCalledWith({ dataset: OUTREACH_DATASET })
  })

  it('rejects declared and chunked bodies at limit+1 before Sanity', async () => {
    const declared = await POST(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': String(512 * 1024 + 1) },
        body: '{}',
      }),
      { params: Promise.resolve({ type: 'marketingCampaign' }) },
    )
    expect(declared.status).toBe(413)

    const chunked = await POST(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { title: 'x'.repeat(512 * 1024) } }),
      }),
      { params: Promise.resolve({ type: 'marketingCampaign' }) },
    )
    expect(chunked.status).toBe(413)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unknown create fields, oversized arrays, and invalid supplied ids', async () => {
    const create = (fields: Record<string, unknown>) => POST(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      }),
      { params: Promise.resolve({ type: 'marketingCampaign' }) },
    )
    expect((await create({ title: 'Safe', injected: true })).status).toBe(400)
    expect((await create({ title: 'Safe', targetQueries: Array.from({ length: 201 }, () => 'x') })).status).toBe(413)
    expect((await create({ _id: 'bad id', title: 'Safe' })).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('requires a revision and rejects arbitrary unset paths', async () => {
    const noRevision = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set: { title: 'New' } }),
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(noRevision.status).toBe(400)

    const pathInjection = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unset: ['channels[_key=="x"]'], expectedRevision: 'rev-1' }),
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(pathInjection.status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('returns 409 on stale PATCH and binds commit to the expected revision', async () => {
    mocks.fetch.mockResolvedValueOnce({
      _id: 'doc-1', _type: 'marketingCampaign', _rev: 'rev-new', title: 'Current', slug: {}, status: 'idea',
    })
    const stale = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set: { title: 'Stale' }, expectedRevision: 'rev-old' }),
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(stale.status).toBe(409)
    expect(mocks.patch).not.toHaveBeenCalled()

    mocks.fetch.mockResolvedValueOnce({
      _id: 'doc-1', _type: 'marketingCampaign', _rev: 'rev-new', title: 'Current', slug: {}, status: 'idea',
    })
    const current = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set: { title: 'Current edit' }, expectedRevision: 'rev-new' }),
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(current.status).toBe(200)
    expect(mocks.patch.mock.results.at(-1)?.value.ifRevisionId).toHaveBeenCalledWith('rev-new')
  })

  it('validates required invariants on the final post-patch document', async () => {
    mocks.fetch.mockResolvedValueOnce({
      _id: 'doc-1', _type: 'marketingCampaign', _rev: 'rev-1', title: 'Campaign', slug: { current: 'campaign' }, status: 'idea',
    })
    const response = await PATCH(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unset: ['title'], expectedRevision: 'rev-1' }),
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ missing: ['title'] })
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('returns 409 on stale DELETE and uses a revision-filtered delete query', async () => {
    mocks.fetch.mockResolvedValueOnce({ _id: 'doc-1', _rev: 'rev-new' })
    const stale = await DELETE(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'DELETE', headers: { 'If-Match': 'rev-old' },
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(stale.status).toBe(409)
    expect(mocks.remove).not.toHaveBeenCalled()

    mocks.fetch
      .mockResolvedValueOnce({ _id: 'doc-1', _rev: 'rev-new' })
      .mockResolvedValueOnce([])
    const deleted = await DELETE(
      new Request('https://www.goinvo.com/api/marketing/doc/marketingCampaign/doc-1', {
        method: 'DELETE', headers: { 'If-Match': '"rev-new"' },
      }),
      context('marketingCampaign', 'doc-1'),
    )
    expect(deleted.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('_rev == $expectedRevision'),
        params: expect.objectContaining({ expectedRevision: 'rev-new' }),
      }),
      { returnFirst: false, returnDocuments: true },
    )
  })
})
