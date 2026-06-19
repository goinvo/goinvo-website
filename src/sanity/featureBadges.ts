import type { DocumentBadgeComponent, DocumentBadgeProps } from 'sanity'
import { useDocumentPairPermissions } from 'sanity'
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

// Editorial document types that publish to a public page, where the
// draft-vs-live distinction matters to a content editor. Deliberately excludes
// the marketing* types (edited through the Marketing tool, which manages its own
// state) so the badge never adds noise there.
const PUBLISHABLE_CONTENT_TYPES = new Set([
  'caseStudy',
  'feature',
  'healthVisualization',
  'job',
  'teamMember',
  'category',
])

// Makes the "your edits are not live yet" state impossible to miss. A draft
// document exists ONLY while there are edits that have not been published, so
// its mere presence is the signal — no diffing required. The amber badge sits at
// the top of the editor form (and the Presentation side panel, where the preview
// shows the draft and can look deceptively live), pointing the editor at Publish.
export const publishStatusBadge: DocumentBadgeComponent = (
  props: DocumentBadgeProps
) => {
  // Hooks must run unconditionally, before any early return. Resolve whether the
  // current account is actually allowed to publish THIS document — grant-aware,
  // so it respects real Sanity roles rather than guessing from a role name.
  const [publishPermission, isPermissionLoading] = useDocumentPairPermissions({
    id: props.id,
    type: props.type,
    permission: 'publish',
  })

  const type = (props.draft || props.published)?._type
  if (!type || !PUBLISHABLE_CONTENT_TYPES.has(type)) {
    return null
  }

  // The account can edit but cannot PUBLISH this document (its role lacks the
  // publish grant — e.g. Viewer, or not a project member). Surface it plainly so
  // a disabled/gray Publish button is never a mystery — the most common cause of
  // "I edited it but it won't go live". Checked before the draft state because it
  // explains the dead button even when there are unpublished edits.
  if (!isPermissionLoading && publishPermission && !publishPermission.granted) {
    return {
      label: 'No publish access — ask an admin',
      color: 'danger',
      title:
        'Your account can edit and save drafts, but it does not have permission to publish, so the Publish button stays disabled. Ask a site admin to publish this page (or to grant your account publish access in Sanity).',
    }
  }

  // No draft → everything is published → nothing to flag.
  if (!props.draft) {
    return null
  }

  return props.published
    ? {
        label: 'Unpublished edits — not live yet',
        color: 'warning',
        title:
          'You have changes that are NOT on the live website yet. Click the green Publish button (bottom of the editor) to push them live.',
      }
    : {
        label: 'Draft — never published',
        color: 'warning',
        title:
          'This page has never been published, so it is not on the live website. Click the green Publish button to make it public.',
      }
}
