import { describe, expect, it } from 'vitest'

import { featureSectionBackgroundFallbacks } from '../src/lib/featureSectionBackgroundFallbacks'
import feature from '../src/sanity/schemas/feature'

// The page reads these Studio fields first and only falls back to code when the Studio is empty.
const STUDIO_WINS = new Set([
  'authorBackground',
  'contributorsBackground',
  'newsletterBackground',
  'referencesBackground',
  'peopleSectionPosition',
])

describe('code fallbacks for vision pieces', () => {
  it('never override a field editors can set in the Studio', () => {
    const studioFields = new Set((feature.fields ?? []).map((field) => field.name))
    const overriding = Object.entries(featureSectionBackgroundFallbacks).flatMap(([slug, fallback]) =>
      Object.keys(fallback)
        .filter((key) => studioFields.has(key) && !STUDIO_WINS.has(key))
        .map((key) => `${slug}.${key}`),
    )
    expect(overriding).toEqual([])
  })
})
