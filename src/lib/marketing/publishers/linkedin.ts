/**
 * LinkedIn publishing adapter (Posts API + Images API).
 *
 * Credentials come from env so the core stays site-agnostic and fail-closed:
 *   LINKEDIN_ACCESS_TOKEN  — OAuth token with w_organization_social (or
 *                            w_member_social). Long-lived (~60 days); refresh
 *                            out of band.
 *   LINKEDIN_AUTHOR_URN    — the posting entity, e.g.
 *                            "urn:li:organization:1234567" (a Company Page) or
 *                            "urn:li:person:abcdef".
 *   LINKEDIN_API_VERSION   — optional; the versioned API month (YYYYMM). Defaults
 *                            below, override to whatever LinkedIn currently
 *                            supports.
 *
 * v1 scope: text posts, single-image posts, and article/link shares. Multi-image
 * and document carousels are a follow-up (see note in publish()).
 *
 * Docs (verify against current versions before going live):
 *   https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
 *   https://learn.microsoft.com/linkedin/marketing/community-management/shares/images-api
 */

import type { PublishContent, PublishOutcome, SocialPublisher } from './types'

const DEFAULT_API_VERSION = '202401'
const API_BASE = 'https://api.linkedin.com/rest'

function token(): string {
  return (process.env.LINKEDIN_ACCESS_TOKEN || '').trim()
}
function authorUrn(): string {
  return (process.env.LINKEDIN_AUTHOR_URN || '').trim()
}
function apiVersion(): string {
  return (process.env.LINKEDIN_API_VERSION || DEFAULT_API_VERSION).trim()
}

function baseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    'LinkedIn-Version': apiVersion(),
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

/** Fetches an image from a public URL and returns its bytes + content type. */
async function fetchImageBytes(url: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`could not fetch image (${res.status}) from ${url}`)
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { bytes: await res.arrayBuffer(), contentType }
}

/**
 * Registers + uploads one image and returns its image URN, ready to attach to a
 * post. Two steps: initializeUpload (get a one-time uploadUrl + urn), then PUT
 * the bytes to that URL.
 */
async function uploadImage(publicUrl: string): Promise<string> {
  const initRes = await fetch(`${API_BASE}/images?action=initializeUpload`, {
    method: 'POST',
    headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn() } }),
  })
  if (!initRes.ok) {
    throw new Error(`image initializeUpload failed (${initRes.status}): ${await initRes.text()}`)
  }
  const init = (await initRes.json()) as { value?: { uploadUrl?: string; image?: string } }
  const uploadUrl = init.value?.uploadUrl
  const imageUrn = init.value?.image
  if (!uploadUrl || !imageUrn) {
    throw new Error('image initializeUpload response missing uploadUrl/image')
  }

  const { bytes, contentType } = await fetchImageBytes(publicUrl)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': contentType },
    body: bytes,
  })
  if (!putRes.ok) {
    throw new Error(`image upload PUT failed (${putRes.status}): ${await putRes.text()}`)
  }
  return imageUrn
}

export const linkedInPublisher: SocialPublisher = {
  platform: 'linkedin',

  isConnected() {
    return Boolean(token() && authorUrn())
  },

  missingConfig() {
    const missing: string[] = []
    if (!token()) missing.push('LINKEDIN_ACCESS_TOKEN')
    if (!authorUrn()) missing.push('LINKEDIN_AUTHOR_URN')
    return missing
  },

  async publish(content: PublishContent): Promise<PublishOutcome> {
    const missing = this.missingConfig()
    if (missing.length > 0) {
      return { ok: false, notConnected: true, error: `LinkedIn not configured: missing ${missing.join(', ')}` }
    }
    if (!content.text.trim() && content.media.length === 0 && !content.link) {
      return { ok: false, error: 'Nothing to post: empty caption, no media, no link.' }
    }

    try {
      const body: Record<string, unknown> = {
        author: authorUrn(),
        commentary: content.text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }

      if (content.media.length > 0) {
        // v1: attach the first image. Multi-image / document carousels use a
        // different `content.multiImage` / document flow — a follow-up.
        const first = content.media[0]
        const imageUrn = await uploadImage(first.url)
        body.content = {
          media: { id: imageUrn, ...(first.altText ? { altText: first.altText } : {}) },
        }
      } else if (content.link) {
        body.content = {
          article: {
            source: content.link,
            ...(content.linkTitle ? { title: content.linkTitle } : {}),
          },
        }
      }

      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        return { ok: false, error: `LinkedIn post failed (${res.status}): ${await res.text()}` }
      }

      // The created post URN is returned in a response header, not the body.
      const postUrn = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || ''
      if (!postUrn) {
        return { ok: false, error: 'LinkedIn post accepted but no post id was returned.' }
      }
      return {
        ok: true,
        result: {
          externalId: postUrn,
          permalink: `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`,
        },
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'LinkedIn publish error' }
    }
  },
}
