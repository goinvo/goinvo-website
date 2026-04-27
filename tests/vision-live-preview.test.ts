import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('vision article live preview architecture', () => {
  it('keeps vision draft fetches on the Sanity live loader', () => {
    const pageSource = readFileSync('src/app/(main)/vision/[slug]/page.tsx', 'utf8')

    expect(pageSource).toContain('await sanityFetch({')
    expect(pageSource).toContain("perspective: isDraftMode ? 'drafts' : undefined")
    expect(pageSource).not.toContain(".withConfig({\n        token: readToken")
  })

  it('uses the same mutation refetch path as work articles for guided vision content', () => {
    const guidedContentSource = readFileSync('src/components/vision/GuidedFeatureContent.tsx', 'utf8')

    expect(guidedContentSource).toContain("import { useLiveData } from '@/components/sanity/LiveData'")
    expect(guidedContentSource).toContain('useLiveData(initialData, featureBySlugQuery, { slug })')
  })

  it('maps Presentation routes to the correct article document type', () => {
    const resolveSource = readFileSync('src/sanity/presentation/resolve.ts', 'utf8')
    const configSource = readFileSync('src/sanity/sanity.config.ts', 'utf8')

    expect(resolveSource).toContain("route: '/work/:slug'")
    expect(resolveSource).toContain('_type == "caseStudy" && slug.current == $slug')
    expect(resolveSource).toContain("route: '/vision/:slug'")
    expect(resolveSource).toContain('_type == "feature" && slug.current == $slug')
    expect(configSource).toContain('resolve: {')
    expect(configSource).toContain('mainDocuments,')
    expect(configSource).toContain('locations,')
  })
})
