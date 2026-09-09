import { createFlagsDiscoveryEndpoint } from 'flags/next'
import { getProviderData } from '@flags-sdk/vercel'
import { getMarketingFlagsSecret, home2026Variant, homeShopSectionVariant, homeHeroVariant } from '@/flags'

export const GET = createFlagsDiscoveryEndpoint(
  async () => {
    return getProviderData({ home2026Variant, homeShopSectionVariant, homeHeroVariant })
  },
  { secret: getMarketingFlagsSecret() },
)
