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
 * Scope: single image + carousel (published synchronously) and Reels/video
 * (asynchronous — a REELS container is created, then a status check publishes it
 * once Instagram finishes processing; the worker drives re-checks via finalize()).
 *
 * Docs (verify before going live):
 *   https://developers.facebook.com/docs/instagram-platform/content-publishing
 */

import type { PublishContent, PublishOutcome, SocialPublisher } from './types'
import { withRetry } from './retry'

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
    // Idempotent GET — retry transient blips before giving up (still best-effort).
    return await withRetry(async () => {
      const url = `${graphUrl(mediaId)}?fields=permalink&access_token=${encodeURIComponent(token())}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`permalink fetch failed (${res.status})`)
      const json = (await res.json()) as { permalink?: string }
      return json.permalink
    })
  } catch {
    return undefined
  }
}

/** Reads a media container's processing status (Reels/video are processed async). */
async function getContainerStatus(containerId: string): Promise<string> {
  // Idempotent GET — safe to retry, so async Reel finalize polling survives a
  // transient network hiccup instead of failing the whole publish.
  return withRetry(async () => {
    const url = `${graphUrl(containerId)}?fields=status_code&access_token=${encodeURIComponent(token())}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = (await res.json().catch(() => ({}))) as { status_code?: string; error?: { message?: string } }
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || `container status check failed (${res.status})`)
    }
    return json.status_code || 'IN_PROGRESS'
  })
}

/**
 * Checks an async (Reels) container and publishes it if ready. One check per
 * call — the caller (worker) schedules re-checks via QStash rather than blocking.
 * Returns ok (FINISHED + published), pending (still IN_PROGRESS), or error
 * (ERROR/EXPIRED).
 */
async function checkAndPublishContainer(user: string, containerId: string): Promise<PublishOutcome> {
  const status = await getContainerStatus(containerId)
  if (status === 'FINISHED') {
    const published = await graphPost(`${user}/media_publish`, { creation_id: containerId })
    if (!published.id) return { ok: false, error: 'Instagram publish returned no media id.' }
    const permalink = await fetchPermalink(published.id)
    return { ok: true, result: { externalId: published.id, ...(permalink ? { permalink } : {}) } }
  }
  if (status === 'ERROR' || status === 'EXPIRED') {
    return { ok: false, error: `Instagram video processing ${status.toLowerCase()} (container ${containerId}).` }
  }
  // IN_PROGRESS or any other non-terminal state — re-check later. Log anything
  // unexpected so silent API drift (a new status_code) is visible.
  if (status !== 'IN_PROGRESS') {
    console.warn(`Instagram container ${containerId} returned unexpected status_code "${status}"; re-checking later.`)
  }
  return { ok: false, pending: true, containerId }
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
    const user = igUserId()

    // Reel / video: create a REELS container, then check (and publish if ready).
    // Video processing is async, so this may return `pending` — the worker then
    // re-checks via finalize() on a QStash schedule.
    if (type === 'reel' || type === 'video') {
      const video = content.media.find((media) => media.type === 'video')
      if (!video) {
        return { ok: false, error: 'Reel/video post has no video asset (set socialVideo on the item).' }
      }
      try {
        const container = await graphPost(`${user}/media`, {
          media_type: 'REELS',
          video_url: video.url,
          caption: content.text,
        })
        if (!container.id) return { ok: false, error: 'Reel container returned no id.' }
        return await checkAndPublishContainer(user, container.id)
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Instagram Reel publish error' }
      }
    }

    if (content.media.length === 0) {
      return { ok: false, error: 'Instagram requires at least one image — text-only posts are not allowed.' }
    }

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

  async finalize(containerId: string): Promise<PublishOutcome> {
    const missing = this.missingConfig()
    if (missing.length > 0) {
      return { ok: false, notConnected: true, error: `Instagram not configured: missing ${missing.join(', ')}` }
    }
    try {
      return await checkAndPublishContainer(igUserId(), containerId)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Instagram finalize error' }
    }
  },
}
