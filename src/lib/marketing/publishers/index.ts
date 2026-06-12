/**
 * Social publishing adapters + registry for the portable marketing core.
 *
 * Import from `@/lib/marketing/publishers` (or via the `@/lib/marketing` barrel)
 * rather than the individual adapter modules.
 */

import { instagramPublisher } from './instagram'
import { linkedInPublisher } from './linkedin'
import type { SocialPlatform, SocialPublisher } from './types'

const PUBLISHERS: Record<SocialPlatform, SocialPublisher> = {
  linkedin: linkedInPublisher,
  instagram: instagramPublisher,
}

/** Returns the adapter for a platform. */
export function getPublisher(platform: SocialPlatform): SocialPublisher {
  return PUBLISHERS[platform]
}

/** All registered adapters. */
export function getPublishers(): SocialPublisher[] {
  return Object.values(PUBLISHERS)
}

/** Connection status of one platform (for the status endpoint / Studio indicator). */
export interface PlatformConnection {
  platform: SocialPlatform
  connected: boolean
  missingConfig: string[]
}

/** Connection status of every registered platform. */
export function connectionStatus(): PlatformConnection[] {
  return getPublishers().map((publisher) => ({
    platform: publisher.platform,
    connected: publisher.isConnected(),
    missingConfig: publisher.missingConfig(),
  }))
}

export { instagramPublisher } from './instagram'
export { linkedInPublisher } from './linkedin'
export {
  DUE_ITEMS_QUERY,
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
export {
  SOCIAL_PLATFORMS,
} from './types'
export type {
  SocialPlatform,
  SocialPublisher,
  PublishContent,
  PublishMedia,
  PublishSuccess,
  PublishOutcome,
} from './types'
