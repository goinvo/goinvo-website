import type { DocumentBadgeComponent, DocumentBadgeProps } from 'sanity'
import { getFeatureEditorExperience } from '@/lib/featureAuthoring'

export const featureAuthoringBadge: DocumentBadgeComponent = (
  props: DocumentBadgeProps
) => {
  const document = props.draft || props.published

  if (!document || document._type !== 'feature') {
    return null
  }

  const slug = (document.slug as { current?: string } | undefined)?.current
  const experience = getFeatureEditorExperience(slug)

  if (experience !== 'static-override') {
    return null
  }

  return {
    label: 'Static override',
    color: 'warning',
    title: 'This article is rendered by code, so CMS body and layout edits do not control the live page.',
  }
}
