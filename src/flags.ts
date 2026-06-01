import { flag } from 'flags/next'
import { vercelAdapter } from '@flags-sdk/vercel'
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags'
import { getOrGenerateMarketingVisitorId } from '@/lib/experiments/visitor'

export type Home2026Variant = 'control' | 'concept'

export type MarketingFlagEntities = {
  visitor?: {
    id: string
  }
}

const localPrecomputeSecret = 'lE0UK1s091xzJ6DaZNFL5mMQCPhzyXdlR3PkRTgCJIs'

export function getMarketingFlagsSecret() {
  if (process.env.FLAGS_SECRET) return process.env.FLAGS_SECRET
  return process.env.VERCEL ? undefined : localPrecomputeSecret
}

const identifyMarketingVisitor = async ({
  cookies,
  headers,
}: {
  cookies: ReadonlyRequestCookies
  headers: ReadonlyHeaders
}): Promise<MarketingFlagEntities> => {
  const visitorId = await getOrGenerateMarketingVisitorId(cookies, headers)
  return {
    visitor: {
      id: visitorId,
    },
  }
}

const home2026FlagProvider = process.env.FLAGS
  ? { adapter: vercelAdapter<Home2026Variant, MarketingFlagEntities>() }
  : { decide: () => 'control' as Home2026Variant }

export const home2026Variant = flag<Home2026Variant, MarketingFlagEntities>({
  key: 'home-2026-variant',
  description: 'Homepage A/B test: current homepage versus the 2026 enterprise positioning concept.',
  defaultValue: 'control',
  options: [
    { value: 'control', label: 'Current homepage' },
    { value: 'concept', label: '2026 concept homepage' },
  ],
  identify: identifyMarketingVisitor,
  ...home2026FlagProvider,
})

export const marketingExperimentFlags = [home2026Variant] as const

