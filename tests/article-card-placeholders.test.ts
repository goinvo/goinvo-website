import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('article card empty image states', () => {
  it('uses the same neutral empty state for work and vision cards', () => {
    const caseStudyCard = readFileSync('src/components/work/CaseStudyCard.tsx', 'utf8')
    const draftFeatureCards = readFileSync('src/components/vision/DraftFeaturesSection.tsx', 'utf8')

    expect(caseStudyCard).not.toContain('PLACEHOLDER_IMAGE_URL')
    expect(caseStudyCard).toContain('No image')
    expect(draftFeatureCards).toContain('No image')
  })
})
