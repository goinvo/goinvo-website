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
  STALE_PROCESSING_QUERY,
  resolveSocialPlatform,
  buildCaption,
  buildMedia,
  buildPublishContent,
  buildClaimPatch,
  buildProcessingPatch,
  buildPublishedPatch,
  buildFailedPatch,
} from './content'
export type { PublishableItem, ItemPatch } from './content'

// The publish worker (shared by /run, the QStash publish callback, and finalize).
export { runPublish } from './worker'
export type { RunPublishOptions, PublishResultEntry, PublishRunSummary, FinalizeSignal } from './worker'

// QStash exact-time scheduling + async finalize re-checks.
export {
  isQStashConfigured,
  notBeforeSeconds,
  buildCallbackUrl,
  buildFinalizeCallbackUrl,
  schedulePublish,
  scheduleFinalize,
} from './schedule'
export type { SchedulePublishParams, ScheduleFinalizeParams, ScheduleResult } from './schedule'

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
