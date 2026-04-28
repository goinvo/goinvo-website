import { describe, expect, it } from 'vitest'
import { featureToDisplay } from '@/lib/featureDisplay'
import type { Feature } from '@/types'

function feature(slug: string, overrides: Partial<Feature> = {}): Feature {
  return {
    _id: slug,
    title: slug,
    slug: { current: slug },
    ...overrides,
  } as Feature
}

describe('featureToDisplay', () => {
  it('routes the Studio Timeline feature to the About page', () => {
    expect(featureToDisplay(feature('studio-timeline')).link).toBe(
      '/about/studio-timeline'
    )
  })

  it('keeps external feature links authoritative', () => {
    expect(
      featureToDisplay(
        feature('studio-timeline', {
          externalLink: 'https://example.com/studio-timeline',
        })
      ).link
    ).toBe('https://example.com/studio-timeline')
  })
})
