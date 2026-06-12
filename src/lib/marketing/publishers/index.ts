/**
 * Social publishing adapters + scheduling for the portable marketing core.
 *
 * Import from `@/lib/marketing/publishers` (or via the `@/lib/marketing` barrel)
 * rather than the individual modules.
 */

// Registry + connection status.
export { getPublisher, getPublishers, connectionStatus } from './registry'
export type { PlatformConnection } from './registry'

// Adapters.
export { instagramPublisher } from './instagram'
export { linkedInPublisher } from './linkedin'

// Content mapping, queries, and patch builders.
export {
  DUE_ITEMS_QUERY,
  DUE_SINGLE_ITEM_QUERY,
  SINGLE_ITEM_QUERY,
  resolveSocialPlatform,
  buildCaption,
  buildMedia,
  buildPublishContent,
  buildClaimPatch,
  buildPublishedPatch,
  buildFailedPatch,
} from './content'
export type { PublishableItem, ItemPatch } from './content'

// The publish worker (shared by /run and the QStash callback).
export { runPublish } from './worker'
export type { RunPublishOptions, PublishResultEntry, PublishRunSummary } from './worker'

// QStash exact-time scheduling.
export {
  isQStashConfigured,
  notBeforeSeconds,
  buildCallbackUrl,
  schedulePublish,
} from './schedule'
export type { SchedulePublishParams, ScheduleResult } from './schedule'

// Shared types.
export { SOCIAL_PLATFORMS } from './types'
export type {
  SocialPlatform,
  SocialPublisher,
  PublishContent,
  PublishMedia,
  PublishSuccess,
  PublishOutcome,
} from './types'
