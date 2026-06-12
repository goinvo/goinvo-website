/**
 * Instagram publishing adapter (Instagram Graph API — Content Publishing).
 *
 * Credentials come from env (fail-closed, site-agnostic):
 *   INSTAGRAM_ACCESS_TOKEN        — long-lived token with instagram_content_publish
 *                                   (and the linked Page's permissions). ~60 days.
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID — the IG Business/Creator account id (ig-user-id).
 *   INSTAGRAM_GRAPH_VERSION       — optional graph version, default below.
 *   INSTAGRAM_GRAPH_HOST          — optional, default https://graph.facebook.com
 *                                   (use https://graph.instagram.com for the
 *                                   Instagram-Login flow).
 *
 * Publishing is a two-step "container then publish" flow. Instagram fetches the
 * media from a PUBLIC url server-side, so images must be on a reachable CDN.
 *
 * v1 scope: single image + carousel. Reels/video need a video asset and async
 * status polling across runs, so they are rejected with a clear message for now.
 *
 * Docs (verify before going live):
 *   https://developers.facebook.com/docs/instagram-platform/content-publishing
 */

import type { PublishContent, PublishOutcome, SocialPublisher } from './types'

const DEFAULT_GRAPH_VERSION = 'v21.0'
const DEFAULT_GRAPH_HOST = 'https://graph.facebook.com'

function token(): string {
  return (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
}
function igUserId(): string {
  return (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '').trim()
}
function graphVersion(): string {
  return (process.env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION).trim()
}
function graphHost(): string {
  return (process.env.INSTAGRAM_GRAPH_HOST || DEFAULT_GRAPH_HOST).trim().replace(/\/$/, '')
}
function graphUrl(path: string): string {
  return `${graphHost()}/${graphVersion()}/${path}`
}

/** POSTs form params to a Graph endpoint and returns the parsed JSON, throwing on a Graph error. */
async function graphPost(path: string, params: Record<string, string>): Promise<{ id?: string }> {
  const body = new URLSearchParams({ ...params, access_token: token() })
  const res = await fetch(graphUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as {
    id?: string
    error?: { message?: string }
  }
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph request to ${path} failed (${res.status})`)
  }
  return json
}

/** Reads a published media's permalink (best-effort; never throws). */
async function fetchPermalink(mediaId: string): Promise<string | undefined> {
  try {
    const url = `${graphUrl(mediaId)}?fields=permalink&access_token=${encodeURIComponent(token())}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return undefined
    const json = (await res.json()) as { permalink?: string }
    return json.permalink
  } catch {
    return undefined
  }
}

export const instagramPublisher: SocialPublisher = {
  platform: 'instagram',

  isConnected() {
    return Boolean(token() && igUserId())
  },

  missingConfig() {
    const missing: string[] = []
    if (!token()) missing.push('INSTAGRAM_ACCESS_TOKEN')
    if (!igUserId()) missing.push('INSTAGRAM_BUSINESS_ACCOUNT_ID')
    return missing
  },

  async publish(content: PublishContent): Promise<PublishOutcome> {
    const missing = this.missingConfig()
    if (missing.length > 0) {
      return { ok: false, notConnected: true, error: `Instagram not configured: missing ${missing.join(', ')}` }
    }

    const type = (content.contentType || '').toLowerCase()
    if (type === 'reel' || type === 'video') {
      return {
        ok: false,
        error: 'Instagram Reels/video auto-publishing is not supported yet (needs a video asset and async status polling).',
      }
    }
    if (content.media.length === 0) {
      return { ok: false, error: 'Instagram requires at least one image — text-only posts are not allowed.' }
    }

    const user = igUserId()
    try {
      let creationId: string

      if (content.media.length === 1) {
        // Single image container.
        const container = await graphPost(`${user}/media`, {
          image_url: content.media[0].url,
          caption: content.text,
        })
        if (!container.id) throw new Error('image container returned no id')
        creationId = container.id
      } else {
        // Carousel: one child container per image, then a parent carousel container.
        const childIds: string[] = []
        for (const media of content.media.slice(0, 10)) {
          const child = await graphPost(`${user}/media`, {
            image_url: media.url,
            is_carousel_item: 'true',
          })
          if (!child.id) throw new Error('carousel child container returned no id')
          childIds.push(child.id)
        }
        const parent = await graphPost(`${user}/media`, {
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption: content.text,
        })
        if (!parent.id) throw new Error('carousel container returned no id')
        creationId = parent.id
      }

      const published = await graphPost(`${user}/media_publish`, { creation_id: creationId })
      if (!published.id) {
        return { ok: false, error: 'Instagram publish returned no media id.' }
      }

      const permalink = await fetchPermalink(published.id)
      return { ok: true, result: { externalId: published.id, ...(permalink ? { permalink } : {}) } }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Instagram publish error' }
    }
  },
}
