import { featureSectionBackgroundFallbacks } from './featureSectionBackgroundFallbacks'

type PortableTextLikeBlock = {
  _type?: string
  markDefs?: Array<{ _type?: string }>
  children?: Array<{ _type?: string; text?: string; marks?: string[] }>
  items?: Array<{ refNumber?: string }>
  refNumber?: string
  content?: PortableTextLikeBlock[]
}

export type FeatureEditorExperience = 'guided' | 'code-assisted' | 'static-override'

export const STATIC_FEATURE_OVERRIDE_SLUGS = new Set([
  'augmented-clinical-decision-support',
  'bathroom-to-healthroom',
  'care-plans',
  'coronavirus',
  'determinants-of-health',
  'digital-healthcare',
  'disrupt',
  'ebola-care-guideline',
  'experiments',
  'healing-us-healthcare',
  'health-visualizations',
  'killer-truths',
  'living-health-lab',
  'oral-history-goinvo',
  'primary-self-care-algorithms',
  'print-big',
  'public-healthroom',
  'redesign-democracy',
  'understanding-ebola',
  'understanding-zika',
  'us-healthcare-problems',
  'visual-storytelling-with-genai',
])

export const LEGACY_TRANSFORM_FEATURE_SLUGS = new Set([
  'fraud-waste-abuse-in-healthcare',
  'healthcare-ai',
  'healthcare-dollars',
  'human-centered-design-for-ai',
  'national-cancer-navigation',
  'open-pro',
  'open-source-healthcare',
  'virtual-care',
])

const CODE_ASSISTED_FEATURE_SLUGS = new Set([
  ...Object.keys(featureSectionBackgroundFallbacks),
  ...LEGACY_TRANSFORM_FEATURE_SLUGS,
])

export function isStaticFeatureOverrideSlug(slug?: string | null): boolean {
  return Boolean(slug && STATIC_FEATURE_OVERRIDE_SLUGS.has(slug))
}

export function usesLegacyFeatureTransforms(slug?: string | null): boolean {
  return Boolean(slug && LEGACY_TRANSFORM_FEATURE_SLUGS.has(slug))
}

export function isCodeAssistedFeatureSlug(slug?: string | null): boolean {
  return Boolean(slug && CODE_ASSISTED_FEATURE_SLUGS.has(slug))
}

export function getFeatureEditorExperience(slug?: string | null): FeatureEditorExperience {
  if (isStaticFeatureOverrideSlug(slug)) return 'static-override'
  if (isCodeAssistedFeatureSlug(slug)) return 'code-assisted'
  return 'guided'
}

export function getFeatureEditorExperienceLabel(slug?: string | null): string {
  const experience = getFeatureEditorExperience(slug)

  if (experience === 'static-override') return 'Static override'
  if (experience === 'code-assisted') return 'Code-assisted CMS'
  return 'Guided CMS'
}

export function getFeatureEditorExperienceDescription(slug?: string | null): string {
  const experience = getFeatureEditorExperience(slug)

  if (experience === 'static-override') {
    return 'This slug is rendered by a dedicated page component. CMS body and layout fields are shown for reference only and do not control the live article.'
  }

  if (experience === 'code-assisted') {
    return 'This article still uses legacy compatibility rules or code-side fallbacks. New articles should use the guided CMS path instead of copying these patterns.'
  }

  return 'This article renders directly from CMS-authored fields and supported block options. Use the Body, People, Page Settings, and SEO tabs to control the page.'
}

export function hasMeaningfulFeatureBody(content: PortableTextLikeBlock[] | undefined): boolean {
  return Boolean(
    content?.some((block) => {
      if (!block?._type) return false
      if (block._type === 'block') {
        const text = (block.children || []).map((child) => child.text || '').join('').trim()
        return text.length > 0
      }
      return block._type !== 'spacer'
    })
  )
}

export function hasFeaturePeople(document: {
  authors?: unknown[]
  contributors?: unknown[]
  specialThanks?: unknown[]
} | undefined): boolean {
  if (!document) return false
  return Boolean(
    (Array.isArray(document.authors) && document.authors.length > 0) ||
    (Array.isArray(document.contributors) && document.contributors.length > 0) ||
    (Array.isArray(document.specialThanks) && document.specialThanks.length > 0)
  )
}

function blockHasCitation(block: PortableTextLikeBlock): boolean {
  if (!block) return false

  if (block._type === 'results') {
    return Boolean(block.items?.some((item) => Boolean(item?.refNumber)))
  }

  if (block._type === 'quote' && block.refNumber) {
    return true
  }

  if (block._type === 'block') {
    if ((block.markDefs || []).some((markDef) => markDef?._type === 'refCitation')) {
      return true
    }

    return (block.children || []).some((child) => Array.isArray(child?.marks) && child.marks.includes('sup'))
  }

  return Array.isArray(block.content) && block.content.some(blockHasCitation)
}

export function hasFeatureCitations(content: PortableTextLikeBlock[] | undefined): boolean {
  return Boolean(content?.some(blockHasCitation))
}

export function hasFeatureReferences(content: PortableTextLikeBlock[] | undefined): boolean {
  return Boolean(
    content?.some(
      (block) =>
        block?._type === 'references' &&
        Array.isArray(block.items) &&
        block.items.length > 0
    )
  )
}
