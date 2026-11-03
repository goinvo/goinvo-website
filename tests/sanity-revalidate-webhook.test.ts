import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Rule: every publish refreshes the public site. Before this route, a publish reached goinvo.com only when a
// visitor had a page open at that moment, so a published change could stay invisible indefinitely.

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath }))

const { POST } = await import('../src/app/api/sanity/revalidate/route')
const { isPublishedDocumentId } = await import('../src/lib/publishRevalidation')

const SECRET = 'test-webhook-secret'

function signed(body: object, secret = SECRET) {
  const payload = JSON.stringify(body)
  const timestamp = Date.now()
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('base64url')
  return new NextRequest('https://www.goinvo.com/api/sanity/revalidate', {
    method: 'POST',
    body: payload,
    headers: { 'content-type': 'application/json', 'sanity-webhook-signature': `t=${timestamp},v1=${signature}` },
  })
}

beforeEach(() => {
  revalidatePath.mockClear()
  process.env.SANITY_REVALIDATE_SECRET = SECRET
})

describe('Sanity publish webhook', () => {
  it('purges the whole site when a published document changes', async () => {
    const response = await POST(signed({ _id: 'visionSpotlight', _type: 'visionSpotlight' }))
    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
    expect(revalidatePath).toHaveBeenCalledWith('/llms.txt')
  }, 10_000)

  it('refuses a request signed with the wrong secret', async () => {
    const response = await POST(signed({ _id: 'visionSpotlight' }, 'not-the-secret'))
    expect(response.status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('fails closed, and says why, when the secret is not configured', async () => {
    delete process.env.SANITY_REVALIDATE_SECRET
    const response = await POST(signed({ _id: 'visionSpotlight' }))
    expect(response.status).toBe(503)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('ignores drafts and release versions', async () => {
    const response = await POST(signed({ _id: 'drafts.visionSpotlight' }))
    expect(await response.json()).toMatchObject({ revalidated: false })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(isPublishedDocumentId('versions.rABC.visionSpotlight')).toBe(false)
    expect(isPublishedDocumentId('8ae6dc67-f50f-46e4-8736-782891d8ebd7')).toBe(true)
  }, 10_000)
})
