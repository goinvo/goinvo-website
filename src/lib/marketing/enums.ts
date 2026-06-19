/**
 * Single source of truth for the marketing calendar item's closed-set string
 * fields. Imported by the Sanity schema (options.list + validation) AND the
 * server-side crud layer, so a value can't drift between "what an editor can
 * pick", "what the API accepts", and "what a GROQ filter / adapter matches".
 *
 * Plain data only — NO Sanity or React imports — so the server crud layer and
 * API routes can import it without pulling in the Studio bundle.
 */

export interface MarketingOption {
  title: string
  value: string
}

export const CALENDAR_STATUS_OPTIONS: MarketingOption[] = [
  { title: 'Idea', value: 'idea' },
  { title: 'Draft', value: 'drafting' },
  { title: 'Review', value: 'review' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Published', value: 'published' },
  { title: 'Canceled', value: 'canceled' },
]

export const CONTENT_TYPE_OPTIONS: MarketingOption[] = [
  { title: 'Article', value: 'article' },
  { title: 'Case Study', value: 'caseStudy' },
  { title: 'Email', value: 'email' },
  { title: 'Newsletter', value: 'newsletter' },
  { title: 'Social Post', value: 'socialPost' },
  { title: 'Carousel', value: 'carousel' },
  { title: 'Reel', value: 'reel' },
  { title: 'Story', value: 'story' },
  { title: 'Static Post', value: 'post' },
  { title: 'Video', value: 'video' },
  { title: 'Landing Page', value: 'landingPage' },
  { title: 'Event', value: 'event' },
  { title: 'Ad', value: 'ad' },
  { title: 'Other', value: 'other' },
]

export const CHANNEL_OPTIONS: MarketingOption[] = [
  { title: 'Website', value: 'website' },
  { title: 'Email', value: 'email' },
  { title: 'LinkedIn', value: 'linkedin' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Newsletter', value: 'newsletter' },
  { title: 'Search', value: 'search' },
  { title: 'Events', value: 'events' },
  { title: 'Partner / Referral', value: 'partner' },
  { title: 'Other', value: 'other' },
]

// Worker-managed lifecycle for the auto-publishing pipeline (distinct from the
// human-facing `status`): what the publish worker writes as it claims, posts,
// and confirms an item on a social channel.
export const PUBLISH_STATE_OPTIONS: MarketingOption[] = [
  { title: 'Queued', value: 'queued' },
  { title: 'Publishing', value: 'publishing' },
  { title: 'Processing', value: 'processing' },
  { title: 'Published', value: 'published' },
  { title: 'Failed', value: 'failed' },
  { title: 'Skipped', value: 'skipped' },
]

const values = (options: MarketingOption[]): string[] => options.map((o) => o.value)

export const CALENDAR_STATUS_VALUES = values(CALENDAR_STATUS_OPTIONS)
export const CONTENT_TYPE_VALUES = values(CONTENT_TYPE_OPTIONS)
export const CHANNEL_VALUES = values(CHANNEL_OPTIONS)
export const PUBLISH_STATE_VALUES = values(PUBLISH_STATE_OPTIONS)

/** Channel keys with a native social-publishing adapter (the only auto-publish targets). */
export const SOCIAL_CHANNEL_KEYS = ['linkedin', 'instagram'] as const

export function isSocialChannelKey(key: string | undefined | null): boolean {
  if (!key) return false
  return (SOCIAL_CHANNEL_KEYS as readonly string[]).includes(key.trim().toLowerCase())
}
