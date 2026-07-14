import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks, TestMarketingAuthError } = vi.hoisted(() => {
  class HoistedMarketingAuthError extends Error {}
  return {
    TestMarketingAuthError: HoistedMarketingAuthError,
    mocks: {
      assertMarketingApiKey: vi.fn(),
      fetch: vi.fn(),
      patch: vi.fn(),
      remove: vi.fn(),
      withConfig: vi.fn(),
    },
  }
})

vi.mock('@/lib/marketing', () => ({
  assertMarketingApiKey: mocks.assertMarketingApiKey,
  buildPatchPayload: (_type: string, fields: Record<string, unknown>) => fields,
  channelDeleteCascade: vi.fn(async () => 0),
  getMarketingWriteClient: () => ({
    fetch: mocks.fetch,
    patch: mocks.patch,
    delete: mocks.remove,
    withConfig: mocks.withConfig,
  }),
  isManagedMarketingType: (type: string) =>
    ['marketingCampaign', 'marketingContact'].includes(type),
  MarketingAuthError: TestMarketingAuthError,
  MarketingValidationError: class extends Error {},
}))

import { DELETE, GET, PATCH } from '@/app/api/marketing/doc/[type]/[id]/route'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'

const context = (type: string, id: string) => ({ params: Promise.resolve({ type, id }) })

describe('managed marketing document item boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const privateClient = {
      fetch: mocks.fetch,
      patch: mocks.patch,
      delete: mocks.remove,
      withConfig: mocks.withConfig,
    }
    mocks.withConfig.mockReturnValue(privateClient)
    mocks.patch.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      unset: vi.fn().mockReturnThis(),
      commit: vi.fn(async () => ({ _id: 'doc-1' })),
    })
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
        body: JSON.stringify({ set: { title: 'Attempted overwrite' } }),
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
    mocks.fetch.mockResolvedValueOnce({ _id: 'contact-1' })
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
        }),
      }),
      context('marketingContact', 'contact-1'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.withConfig).toHaveBeenCalledWith({ dataset: OUTREACH_DATASET })
  })
})
