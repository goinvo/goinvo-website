import { flag } from 'flags/next'
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

// Deterministic in-code 50/50 assignment from the visitor id (FNV-1a hash →
// bucket 0-99), so the experiment needs no external flag service. The same
// visitor always resolves to the same variant, and it runs at the edge.
// To shift the ratio later, change the `< 50` threshold.
export function assignHome2026Variant(visitorId?: string): Home2026Variant {
  if (!visitorId) return 'control'
  const input = `home-2026-variant:${visitorId}`
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100 < 50 ? 'control' : 'concept'
}

// FLAGS acts as a simple on/off gate (set to any value to make the split live
// on an environment). Dormant by default, so merging the code never auto-starts
// the experiment on production until FLAGS is explicitly set there.
const home2026FlagProvider = process.env.FLAGS
  ? {
      decide: ({ entities }: { entities?: MarketingFlagEntities }) =>
        assignHome2026Variant(entities?.visitor?.id),
    }
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

