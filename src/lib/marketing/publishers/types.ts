/**
 * Shared types for the social auto-publishing pipeline.
 *
 * This is part of the portable marketing core: it has no dependency on this
 * site's Sanity schema beyond a normalized, already-resolved "publishable item"
 * shape (image refs expanded to public URLs by the caller's GROQ query). Another
 * site can reuse the adapters verbatim by producing the same PublishableItem.
 */

/** Social platforms with a native publishing adapter. */
export type SocialPlatform = 'linkedin' | 'instagram'

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['linkedin', 'instagram']

/** One media asset attached to a post, already resolved to a public URL. */
export interface PublishMedia {
  /** Publicly fetchable URL (platforms fetch this server-side, e.g. a CDN URL). */
  url: string
  type: 'image' | 'video'
  altText?: string
}

/**
 * Platform-agnostic post payload. Built from a calendar item by buildPublishContent,
 * then handed to a SocialPublisher. Adapters decide how each field maps to their API
 * (e.g. Instagram requires `media`; LinkedIn can post text-only).
 */
export interface PublishContent {
  /** The caption / commentary, with hashtags already appended. */
  text: string
  /** Optional canonical link to include (LinkedIn article share, etc.). */
  link?: string
  /** Optional title for a link share. */
  linkTitle?: string
  /** Ordered media. One item = single post; many = carousel; a video = reel. */
  media: PublishMedia[]
  /** The calendar item's contentType (post / carousel / reel / …), as a hint. */
  contentType?: string
}

/** A successful publish: the platform's post id and (when available) a permalink. */
export interface PublishSuccess {
  externalId: string
  permalink?: string
}

/**
 * Outcome of a publish attempt.
 * - `notConnected` is a distinct, expected outcome (credentials absent) — the
 *   worker treats it as "skip", not "error", so an un-configured platform never
 *   marks items failed.
 * - `pending` means the platform accepted the media but is still processing it
 *   asynchronously (Instagram Reels/video). The worker records the `containerId`
 *   and schedules a `finalize()` re-check rather than blocking the request.
 */
export type PublishOutcome =
  | { ok: true; result: PublishSuccess }
  | { ok: false; pending: true; containerId: string }
  | { ok: false; notConnected?: boolean; error: string }

/** A native publishing adapter for one platform. */
export interface SocialPublisher {
  readonly platform: SocialPlatform
  /** True when all required credentials/config env vars are present. */
  isConnected(): boolean
  /** Names of the env vars that are required but currently unset (for diagnostics). */
  missingConfig(): string[]
  /** Publish a post. Performs network I/O; never throws — returns a PublishOutcome. */
  publish(content: PublishContent): Promise<PublishOutcome>
  /**
   * Finish an async publish: given a container id from a prior `pending` outcome,
   * check whether processing finished and publish it. Only implemented by adapters
   * with async media (Instagram video/Reels). Returns ok / pending / error.
   */
  finalize?(containerId: string): Promise<PublishOutcome>
}
