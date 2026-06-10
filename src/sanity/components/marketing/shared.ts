// Shared, pure marketing-CMS helpers extracted from the marketing tool monolith
// (src/sanity/tools/marketingTool.tsx) as workspaces are split into their own
// files. A helper lives here when it is used by MORE THAN ONE workspace (so it
// is not duplicated) and is self-contained enough to move cleanly. Channel-only
// helpers stay inside ChannelWorkspace.tsx.

import { randomKey, slugify } from '@/lib/marketing'
import type { ChannelContentType } from './types'
// Deeply interconnected data-model interfaces stay in the tool; import as TYPES
// only (erased at compile time) so this module has no runtime tool dependency.
import type { MarketingChannel, MarketingData } from '../../tools/marketingTool'

// Normalizes a channel's content-type options: drops blank rows, ensures keys,
// and slugifies values. Used by ChannelWorkspace + AnalyticsWorkspace + AI
// suggestion mapping + channel defaults.
export function normalizeContentTypes(types: ChannelContentType[]): ChannelContentType[] {
  return types
    .filter((type) => type.label || type.value)
    .map((type): ChannelContentType => {
      const label = type.label || type.value || 'Untitled type'
      return {
        _key: type._key || randomKey(),
        _type: 'channelContentType',
        label,
        value: slugify(type.value || label),
        description: type.description || undefined,
      }
    })
}

// Counts how many calendar items and campaigns reference a channel (by ref or
// by saved key). Used by ChannelWorkspace + AnalyticsWorkspace.
export function getChannelUsage(data: MarketingData, channel: MarketingChannel) {
  const channelKey = channel.key || ''
  const calendarCount = data.calendarItems.filter((item) => {
    return item.channelRef?._id === channel._id || (channelKey && item.channel === channelKey)
  }).length
  const campaignCount = data.campaigns.filter((campaign) => {
    return (
      (channelKey && (campaign.channels || []).includes(channelKey)) ||
      (campaign.channelRefs || []).some((ref) => ref._id === channel._id)
    )
  }).length

  return {
    calendarCount,
    campaignCount,
    total: calendarCount + campaignCount,
  }
}
