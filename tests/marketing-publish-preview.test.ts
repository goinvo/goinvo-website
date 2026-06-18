import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())

// Mock only the auth boundary + the Sanity client; keep buildPublishContent and
// resolveSocialPlatform REAL so the preview is tested exactly as the worker builds it.
vi.mock('@/lib/marketing', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketing')>('@/lib/marketing')
  return {
    ...actual,
    assertStudioOrApiKey: vi.fn(async () => {}),
    getMarketingWriteClient: () => ({ fetch: fetchMock }),
  }
})

import { GET } from '@/app/api/marketing/publish/preview/route'

function req(id?: string) {
  return new Request(`http://localhost/api/marketing/publish/preview${id != null ? `?id=${id}` : ''}`)
}
const warns = (json: { warnings: string[] }, re: RegExp) => json.warnings.some((w) => re.test(w))

describe('publish preview endpoint', () => {
  beforeEach(() => fetchMock.mockReset())

  it('400 when id is missing', async () => {
    expect((await GET(req())).status).toBe(400)
  })

  it('404 when the item is not found', async () => {
    fetchMock.mockResolvedValue(null)
    expect((await GET(req('missing'))).status).toBe(404)
  })

  it('resolves caption (with hashtags) + media + platform for an Instagram carousel', async () => {
    fetchMock.mockResolvedValue({
      _id: 'cal1', title: 'Post', status: 'scheduled', contentType: 'carousel',
      channelKey: 'instagram', channelPlatform: 'social',
      contentDraft: 'Hello world', draftHashtags: ['design'],
      socialImageUrl: 'https://cdn/1.jpg', socialImageAlt: 'cover',
      frames: [{ imageUrl: 'https://cdn/2.jpg', altText: 'slide 2' }],
    })
    const res = await GET(req('cal1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.platform).toBe('instagram')
    expect(json.content.text).toContain('Hello world')
    expect(json.content.text).toContain('#design')
    expect(json.content.media).toHaveLength(2)
    expect(warns(json, /requires at least one image/i)).toBe(false)
  })

  it('warns when an Instagram post has no media (would be rejected)', async () => {
    fetchMock.mockResolvedValue({ _id: 'c', contentType: 'post', channelKey: 'instagram', contentDraft: 'text only' })
    expect(warns(await (await GET(req('c'))).json(), /requires at least one image/i)).toBe(true)
  })

  it('warns when an Instagram Reel item has no video asset', async () => {
    fetchMock.mockResolvedValue({ _id: 'c', contentType: 'reel', channelKey: 'instagram', contentDraft: 'reel', socialImageUrl: 'https://cdn/x.jpg' })
    expect(warns(await (await GET(req('c'))).json(), /no video asset/i)).toBe(true)
  })

  it('flags a non-social channel and resolves platform=null', async () => {
    fetchMock.mockResolvedValue({ _id: 'c', channelKey: 'email', contentDraft: 'hi' })
    const json = await (await GET(req('c'))).json()
    expect(json.platform).toBeNull()
    expect(warns(json, /not a social publishing channel/i)).toBe(true)
  })

  it('resolves a LinkedIn text post with no media-required warning', async () => {
    fetchMock.mockResolvedValue({ _id: 'c', channelKey: 'linkedin', contentType: 'textPost', contentDraft: 'A thought.' })
    const json = await (await GET(req('c'))).json()
    expect(json.platform).toBe('linkedin')
    expect(warns(json, /requires at least one image/i)).toBe(false)
  })

  it('flags missing image alt text', async () => {
    fetchMock.mockResolvedValue({ _id: 'c', channelKey: 'instagram', contentType: 'post', contentDraft: 'hi', socialImageUrl: 'https://cdn/x.jpg' })
    expect(warns(await (await GET(req('c'))).json(), /no alt text/i)).toBe(true)
  })
})
