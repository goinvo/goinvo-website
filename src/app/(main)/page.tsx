import type { Metadata } from 'next'
import { HomePageRenderer } from '@/components/home/HomePageRenderer'
import { getForcedExperimentVariant } from '@/lib/experiments/registry'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  title: {
    absolute: 'Boston UX Design Agency | GoInvo Boston',
  },
  description:
    'Better business by Design. GoInvo is a business and systems reinvention studio. We design businesses, systems, products, and software.',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
} = {}) {
  // Vercel previews may not have the signing secret used by the experiment
  // proxy. Honor validated review links here so both designs remain shareable.
  // Production still uses the proxy and keeps its static control fallback.
  let heroVariant: 'control' | 'runway' = 'control'
  if (process.env.VERCEL_ENV === 'preview' && searchParams) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') query.set(key, value)
    }
    const forced = getForcedExperimentVariant('/', query)
    // eslint-disable-next-line no-restricted-syntax -- Validated URL query values are not Sanity stega-encoded fields.
    if (forced?.variant === 'runway') heroVariant = 'runway'
  }

  return (
    <HomePageRenderer heroVariant={heroVariant} />
  )
}
