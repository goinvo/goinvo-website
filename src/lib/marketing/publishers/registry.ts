/**
 * Adapter registry + connection status. Kept separate from index.ts so the
 * worker can depend on it without a barrel import cycle.
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
