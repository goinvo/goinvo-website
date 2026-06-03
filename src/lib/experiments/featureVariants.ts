import type { Feature } from '@/types'

export type FeatureExperimentVariant = {
  _key?: string
  key?: string
  label?: string
  title?: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  content?: Feature['content']
}

type FeatureWithExperimentVariants = Feature & {
  experimentVariants?: FeatureExperimentVariant[]
}

export function applyFeatureExperimentVariant<T extends FeatureWithExperimentVariants>(
  feature: T,
  variantKey?: string | null,
): T {
  if (!variantKey || variantKey === 'control') return feature

  const variant = feature.experimentVariants?.find((entry) => entry.key === variantKey)
  if (!variant) return feature

  return {
    ...feature,
    title: variant.title?.trim() || feature.title,
    description: variant.description?.trim() || feature.description,
    metaTitle: variant.metaTitle?.trim() || feature.metaTitle,
    metaDescription: variant.metaDescription?.trim() || feature.metaDescription,
    content: variant.content && variant.content.length > 0 ? variant.content : feature.content,
  }
}

