/**
 * Channel seeding for the portable marketing CMS.
 *
 * `DEFAULT_CHANNELS` is copied from the canonical channel definitions in
 * src/sanity/schemas/marketingChannel.ts (`defaultMarketingChannels`) so a fresh
 * site can bootstrap the same set of channels the Studio expects.
 *
 * `ensureMarketingChannel` mirrors the Studio tool's helper of the same name
 * (src/sanity/tools/marketingTool.tsx, ~line 24350): it looks up an existing
 * channel by `key`, returning it untouched when found, and otherwise creates a
 * new `marketingChannel` document with normalized content types. The Studio
 * helper does NOT pin a stable `_id`, so neither does this — Sanity assigns one.
 */
import type { SanityClient } from '@sanity/client'
import { slugify, withArrayKeys } from './derive'

/** A content-type option shown when a channel is selected in the calendar. */
export interface ChannelContentTypeDef {
  label: string
  value: string
  description?: string
}

/** A default channel definition (title/key/platform/contentTypes). */
export interface MarketingChannelDef {
  title: string
  key: string
  platform: string
  contentTypes: ChannelContentTypeDef[]
}

/**
 * The default marketing channels, copied verbatim from
 * `defaultMarketingChannels` in src/sanity/schemas/marketingChannel.ts:
 * website / email / linkedin / instagram / newsletter / search / events.
 */
export const DEFAULT_CHANNELS: readonly MarketingChannelDef[] = [
  {
    title: 'Website',
    key: 'website',
    platform: 'website',
    contentTypes: [
      { label: 'Article', value: 'article' },
      { label: 'Case Study', value: 'caseStudy' },
      { label: 'Landing Page', value: 'landingPage' },
    ],
  },
  {
    title: 'Email',
    key: 'email',
    platform: 'email',
    contentTypes: [
      { label: 'Email', value: 'email' },
      { label: 'Newsletter', value: 'newsletter' },
      { label: 'Drip Email', value: 'dripEmail' },
    ],
  },
  {
    title: 'LinkedIn',
    key: 'linkedin',
    platform: 'social',
    contentTypes: [
      { label: 'Text Post', value: 'textPost' },
      { label: 'Link Post', value: 'linkPost' },
      { label: 'Carousel', value: 'carousel' },
      { label: 'Video', value: 'video' },
    ],
  },
  {
    title: 'Instagram',
    key: 'instagram',
    platform: 'social',
    contentTypes: [
      { label: 'Post', value: 'post' },
      { label: 'Carousel', value: 'carousel' },
      { label: 'Reel', value: 'reel' },
      { label: 'Story', value: 'story' },
    ],
  },
  {
    title: 'Newsletter',
    key: 'newsletter',
    platform: 'email',
    contentTypes: [
      { label: 'Newsletter', value: 'newsletter' },
      { label: 'Feature', value: 'feature' },
      { label: 'Announcement', value: 'announcement' },
    ],
  },
  {
    title: 'Search',
    key: 'search',
    platform: 'search',
    contentTypes: [
      { label: 'Ad', value: 'ad' },
      { label: 'Landing Page', value: 'landingPage' },
    ],
  },
  {
    title: 'Events',
    key: 'events',
    platform: 'event',
    contentTypes: [
      { label: 'Event', value: 'event' },
      { label: 'Talk', value: 'talk' },
      { label: 'Webinar', value: 'webinar' },
    ],
  },
]

/** A marketing channel document, as returned by Sanity. */
export interface MarketingChannelDocument {
  _id: string
  _type: 'marketingChannel'
  title?: string
  key?: string
  status?: string
  platform?: string
  contentTypes?: Array<ChannelContentTypeDef & { _key?: string; _type?: string }>
  [field: string]: unknown
}

/**
 * Normalizes a channel's content-type definitions into Sanity array items with a
 * stable `_type` (`channelContentType`), a generated `_key`, and a slugified
 * `value`. Matches `normalizeContentTypes` in the Studio tool.
 */
function normalizeContentTypes(
  types: ChannelContentTypeDef[],
): Array<ChannelContentTypeDef & { _key: string; _type: 'channelContentType' }> {
  const normalized = types
    .filter((type) => type.label || type.value)
    .map((type) => {
      const label = type.label || type.value || 'Untitled type'
      return {
        _type: 'channelContentType' as const,
        label,
        value: slugify(type.value || label),
        ...(type.description ? { description: type.description } : {}),
      }
    })
  // Give each item a unique _key (preserving any existing) via the shared core.
  return withArrayKeys(normalized, 'channelContentType') as Array<
    ChannelContentTypeDef & { _key: string; _type: 'channelContentType' }
  >
}

/**
 * Ensures a `marketingChannel` exists for the given definition.
 *
 * Looks up an existing, non-archived channel by `key`. When one is found it is
 * returned as-is with `created: false`. Otherwise a new channel is created
 * (status 'active', the definition's platform, and normalized content types) and
 * returned with `created: true`.
 *
 * Mirrors `ensureMarketingChannel` in src/sanity/tools/marketingTool.tsx: the
 * Studio helper does not assign a stable `_id`, so neither does this.
 */
export async function ensureMarketingChannel(
  client: SanityClient,
  channelDef: MarketingChannelDef,
): Promise<{ channel: MarketingChannelDocument; created: boolean }> {
  const existing = await client.fetch<MarketingChannelDocument | null>(
    '*[_type == "marketingChannel" && key == $key && status != "archived"][0]',
    { key: channelDef.key },
  )
  if (existing) {
    return { channel: existing, created: false }
  }

  const created = (await client.create({
    _type: 'marketingChannel',
    title: channelDef.title,
    key: channelDef.key,
    status: 'active',
    platform: channelDef.platform,
    contentTypes: normalizeContentTypes(channelDef.contentTypes || []),
  })) as MarketingChannelDocument

  return { channel: created, created: true }
}
