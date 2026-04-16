import type { DocumentBadgeComponent, DocumentBadgeProps } from 'sanity'
import { getFeatureEditorExperience, getFeatureEditorExperienceLabel } from '@/lib/featureAuthoring'

export const featureAuthoringBadge: DocumentBadgeComponent = (
  props: DocumentBadgeProps
) => {
  const document = props.draft || props.published

  if (!document || document._type !== 'feature') {
    return null
  }

  const slug = (document.slug as { current?: string } | undefined)?.current
  const experience = getFeatureEditorExperience(slug)

  if (experience === 'guided') {
    return {
      label: getFeatureEditorExperienceLabel(slug),
      color: 'success',
      title: 'This article renders directly from supported CMS fields and blocks.',
    }
  }

  return {
    label: getFeatureEditorExperienceLabel(slug),
    color: experience === 'static-override' ? 'warning' : 'primary',
    title:
      experience === 'static-override'
        ? 'This slug is rendered by a dedicated page component, not by the normal CMS article renderer.'
        : 'This article still uses code-side fallback rules or legacy compatibility transforms.',
  }
}
