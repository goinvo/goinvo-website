import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { featureAuthoringBadge } from '../src/sanity/featureBadges'
import { ContentWidthInput } from '../src/sanity/components/FeatureAuthoringInputs'
import featureSchema from '../src/sanity/schemas/feature'

function getField(name: string) {
  const field = (featureSchema.fields as Array<{
    name?: string
    initialValue?: unknown
    components?: { input?: unknown }
  }>).find((candidate) => candidate.name === name)

  expect(field).toBeDefined()
  return field
}

describe('current feature authoring behavior', () => {
  it('only shows the document badge for static overrides', () => {
    expect(
      featureAuthoringBadge({
        draft: { _type: 'feature', slug: { current: 'brand-new-feature' } },
      } as never),
    ).toBeNull()

    expect(
      featureAuthoringBadge({
        draft: { _type: 'feature', slug: { current: 'coronavirus' } },
      } as never),
    ).toMatchObject({
      label: 'Static override',
      color: 'warning',
    })
  })

  it('defaults feature content width to Medium in schema and API-created drafts', () => {
    const contentWidthField = getField('contentWidth')
    const createDraftRoute = readFileSync('src/app/api/create-draft/route.ts', 'utf8')

    expect(contentWidthField?.initialValue).toBe('medium')
    expect(contentWidthField?.components?.input).toBe(ContentWidthInput)
    expect(createDraftRoute).toContain("contentWidth: 'medium'")
  })

  it('does not expose guided CMS status as a document field', () => {
    const fieldNames = (featureSchema.fields as Array<{ name?: string }>).map((field) => field.name)
    const authoringInputs = readFileSync('src/sanity/components/FeatureAuthoringInputs.tsx', 'utf8')

    expect(fieldNames).not.toContain('authoringStatus')
    expect(authoringInputs).not.toContain("background: '#fff'")
  })

  it('keeps the publishing checklist automated with optional guidance', () => {
    const fieldNames = (featureSchema.fields as Array<{ name?: string }>).map((field) => field.name)
    const authoringInputs = readFileSync('src/sanity/components/FeatureAuthoringInputs.tsx', 'utf8')
    const featureTemplates = readFileSync('src/sanity/featureTemplates.ts', 'utf8')

    expect(fieldNames).not.toContain('previewReviewed')
    expect(authoringInputs).not.toContain('Draft preview has been reviewed')
    expect(authoringInputs).toContain('SEO meta description is added')
    expect(authoringInputs).toContain('rank(left) - rank(right)')
    expect(featureTemplates).not.toContain('previewReviewed')
  })
})
