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
  socialImageAlt?: string | null
  frames?: Array<{
    title?: string | null
    body?: string | null
    altText?: string | null
    imageUrl?: string | null
  }> | null
}

/**
 * GROQ for items the worker should attempt. An item is due when it has opted in
 * (autoPublish), an editor has marked it Scheduled, its publish time has passed,
 * and the worker has not already claimed/finished it (publishState is unset or a
 * prior queued state — `failed`/`published`/`publishing` are excluded so the cron
 * never retries a failure on its own or races a concurrent run).
 */
export const DUE_ITEMS_QUERY = `*[
  _type == "marketingCalendarItem"
  && autoPublish == true
  && status == "scheduled"
  && defined(publishAt)
  && publishAt <= $now
  && (!defined(publishState) || publishState == "queued")
]{
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
  "socialImageAlt": draftAltText,
  "frames": draftFrames[]{
    title,
    body,
    altText,
    "imageUrl": image.asset->url
  }
}`

/** GROQ to load a single item by id with the same projection (manual / retry path). */
export const SINGLE_ITEM_QUERY = `*[_type == "marketingCalendarItem" && _id == $id][0]{
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
  "socialImageAlt": draftAltText,
  "frames": draftFrames[]{
    title,
    body,
    altText,
    "imageUrl": image.asset->url
  }
}`

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
  return {
    text: buildCaption(item),
    media: buildMedia(item),
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
    unset: ['publishError', 'publishLockAt'],
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
    unset: ['publishLockAt'],
  }
}
