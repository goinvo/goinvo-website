/**
 * Pure mapping between a marketing calendar item and a platform-agnostic
 * PublishContent, plus the GROQ query for due items and the Sanity patch
 * builders the worker applies. Everything here is side-effect free and unit
 * tested; the network I/O lives in the adapters, the Sanity I/O in the route.
 */

import type { PublishContent, PublishMedia, PublishSuccess, SocialPlatform } from './types'

/**
 * Normalized calendar item as returned by DUE_ITEMS_QUERY — image references are
 * already expanded to public asset URLs, and the channel is flattened to a key +
 * platform. Adapters never see the raw Sanity document.
 */
export interface PublishableItem {
  _id: string
  _rev: string
  title?: string | null
  status?: string | null
  publishState?: string | null
  contentType?: string | null
  /** coalesce(channelRef->key, channel) */
  channelKey?: string | null
  /** channelRef->platform */
  channelPlatform?: string | null
  contentDraft?: string | null
  draftHashtags?: string[] | null
  publishedUrl?: string | null
  workingUrl?: string | null
  socialImageUrl?: string | null
  socialVideoUrl?: string | null
  socialImageAlt?: string | null
  /** Set while an async (Reel/video) publish is processing (from a prior pending outcome). */
  externalContainerId?: string | null
  /** How many times the worker has re-checked an async publish (bounds re-checks). */
  publishAttempts?: number | null
  frames?: Array<{
    title?: string | null
    body?: string | null
    altText?: string | null
    imageUrl?: string | null
  }> | null
}

// Shared projection so the three queries below can't drift apart.
const ITEM_PROJECTION = `{
  _id,
  _rev,
  title,
  status,
  publishState,
  contentType,
  contentDraft,
  draftHashtags,
  publishedUrl,
  workingUrl,
  "channelKey": coalesce(channelRef->key, channel),
  "channelPlatform": channelRef->platform,
  "socialImageUrl": socialImage.asset->url,
  "socialVideoUrl": socialVideo.asset->url,
  "socialImageAlt": draftAltText,
  externalContainerId,
  publishAttempts,
  "frames": draftFrames[]{
    title,
    body,
    altText,
    "imageUrl": image.asset->url
  }
}`

// The "due" predicate, shared between the batch sweep and the per-id callback.
// An item is due when it has opted in (autoPublish), an editor has marked it
// Scheduled, its publish time has passed, and the worker has not already
// claimed/finished it (publishState unset or a prior `queued` — `failed` /
// `published` / `publishing` are excluded so we never auto-retry a failure or
// race a concurrent run).
const DUE_PREDICATE = `autoPublish == true
  && status == "scheduled"
  && defined(publishAt)
  && publishAt <= $now
  && (!defined(publishState) || publishState == "queued")`

/** Batch: every due item (capped by the caller). */
export const DUE_ITEMS_QUERY = `*[
  _type == "marketingCalendarItem" && ${DUE_PREDICATE}
]${ITEM_PROJECTION}`

/**
 * One item by id, ignoring the due predicate — the manual "publish now" path
 * (?id=). Loads regardless of schedule/state.
 */
export const SINGLE_ITEM_QUERY = `*[_type == "marketingCalendarItem" && _id == $id][0]${ITEM_PROJECTION}`

/**
 * One item by id, but ONLY if it is still due. This is what the QStash callback
 * uses: if an editor rescheduled the item to the future, changed its status, or
 * it already published, this returns null and the stale callback is a safe no-op.
 */
export const DUE_SINGLE_ITEM_QUERY = `*[
  _type == "marketingCalendarItem" && _id == $id && ${DUE_PREDICATE}
][0]${ITEM_PROJECTION}`

/**
 * Backstop: `processing` (async video) items whose finalize re-check appears to
 * have been lost — not re-checked since `$staleBefore`. A healthy item advances
 * publishAttemptedAt every cycle, so only orphans match.
 */
export const STALE_PROCESSING_QUERY = `*[
  _type == "marketingCalendarItem"
  && publishState == "processing"
  && defined(externalContainerId)
  && (!defined(publishAttemptedAt) || publishAttemptedAt < $staleBefore)
]${ITEM_PROJECTION}`

/**
 * Maps a channel to its publishing adapter. Only the specific network is
 * actionable — `platform: "social"` alone is ambiguous, so we key off the stable
 * channel key. Returns null for channels with no native adapter.
 */
export function resolveSocialPlatform(item: {
  channelKey?: string | null
  channelPlatform?: string | null
}): SocialPlatform | null {
  const key = (item.channelKey || '').trim().toLowerCase()
  if (key === 'linkedin') return 'linkedin'
  if (key === 'instagram') return 'instagram'
  return null
}

/** Normalizes a hashtag token to `#tag` form, or null if it is empty/invalid. */
function normalizeHashtag(raw: string): string | null {
  const stripped = raw.trim().replace(/^#+/, '').trim()
  if (!stripped) return null
  // Collapse internal whitespace (hashtags can't contain spaces).
  const compact = stripped.replace(/\s+/g, '')
  return compact ? `#${compact}` : null
}

/**
 * Builds the caption: the draft body with any hashtags not already present
 * appended on their own line. Hashtags already written into the body are not
 * duplicated.
 */
export function buildCaption(item: PublishableItem): string {
  const body = (item.contentDraft || '').trim()
  const tags = (item.draftHashtags || [])
    .map(normalizeHashtag)
    .filter((t): t is string => Boolean(t))

  const lowerBody = body.toLowerCase()
  const missing = tags.filter((t) => !lowerBody.includes(t.toLowerCase()))
  // De-dup within the tag list itself while preserving order.
  const seen = new Set<string>()
  const uniqueMissing = missing.filter((t) => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  if (uniqueMissing.length === 0) return body
  const tagLine = uniqueMissing.join(' ')
  return body ? `${body}\n\n${tagLine}` : tagLine
}

/** Collects ordered, de-duplicated media (cover image first, then carousel slides). */
export function buildMedia(item: PublishableItem): PublishMedia[] {
  const media: PublishMedia[] = []
  const seen = new Set<string>()

  const push = (url?: string | null, altText?: string | null) => {
    const trimmed = (url || '').trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    media.push({ url: trimmed, type: 'image', ...(altText ? { altText } : {}) })
  }

  push(item.socialImageUrl, item.socialImageAlt)
  for (const frame of item.frames || []) {
    push(frame?.imageUrl, frame?.altText)
  }
  return media
}

/** Builds the platform-agnostic post payload from a calendar item. */
export function buildPublishContent(item: PublishableItem): PublishContent {
  const link = (item.publishedUrl || item.workingUrl || '').trim() || undefined
  const type = (item.contentType || '').toLowerCase()
  const videoUrl = (item.socialVideoUrl || '').trim()
  const isVideo = (type === 'reel' || type === 'video') && Boolean(videoUrl)

  // A Reel/video post carries a single video; everything else carries images.
  const media: PublishMedia[] = isVideo
    ? [{ url: videoUrl, type: 'video', ...(item.socialImageAlt ? { altText: item.socialImageAlt } : {}) }]
    : buildMedia(item)

  return {
    text: buildCaption(item),
    media,
    ...(link ? { link, linkTitle: (item.title || '').trim() || undefined } : {}),
    ...(item.contentType ? { contentType: item.contentType } : {}),
  }
}

/** Shape of a Sanity patch (set + unset) the worker applies to an item. */
export interface ItemPatch {
  set?: Record<string, unknown>
  unset?: string[]
}

/** Patch that claims an item: marks it publishing and stamps the lock time. */
export function buildClaimPatch(nowIso: string): ItemPatch {
  return { set: { publishState: 'publishing', publishLockAt: nowIso } }
}

/**
 * Patch applied when an async (Reel/video) publish is accepted but still
 * processing: records the container id + the attempt count so a later finalize
 * re-check can publish it. Releases the lock (the finalize is id-targeted, and
 * the due sweep skips non-queued states).
 */
export function buildProcessingPatch(containerId: string, attempts: number, nowIso: string): ItemPatch {
  return {
    set: {
      publishState: 'processing',
      externalContainerId: containerId,
      publishAttempts: attempts,
      publishAttemptedAt: nowIso,
    },
    unset: ['publishLockAt'],
  }
}

/** Patch applied after a successful publish. */
export function buildPublishedPatch(result: PublishSuccess, nowIso: string): ItemPatch {
  return {
    set: {
      publishState: 'published',
      status: 'published',
      externalPostId: result.externalId,
      publishAttemptedAt: nowIso,
      ...(result.permalink ? { publishedUrl: result.permalink } : {}),
    },
    unset: ['publishError', 'publishLockAt', 'externalContainerId'],
  }
}

/** Patch applied after a failed publish (keeps status so an editor can re-schedule). */
export function buildFailedPatch(error: string, nowIso: string): ItemPatch {
  return {
    set: {
      publishState: 'failed',
      publishError: error.slice(0, 2000),
      publishAttemptedAt: nowIso,
    },
    unset: ['publishLockAt', 'externalContainerId'],
  }
}
