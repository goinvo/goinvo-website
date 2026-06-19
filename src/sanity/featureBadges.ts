import type { DocumentBadgeComponent, DocumentBadgeProps } from 'sanity'
import { useCurrentUser, useValidationStatus } from 'sanity'
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

// Sanity roles that can edit but NOT publish. Anyone with none of the project's
// roles (e.g. not a member) can't publish either. We only flag these clear cases
// so an editor/admin/developer (or any other role) never gets a false warning.
const NON_PUBLISHER_ROLES = new Set(['viewer', 'contributor'])

// Makes the "your edits are not live yet" state impossible to miss. A draft
// document exists ONLY while there are edits that have not been published, so
// its mere presence is the signal — no diffing required. The amber badge sits at
// the top of the editor form (and the Presentation side panel, where the preview
// shows the draft and can look deceptively live), pointing the editor at Publish.
export const publishStatusBadge: DocumentBadgeComponent = (
  props: DocumentBadgeProps
) => {
  // Hooks must run unconditionally, before any early return. (The grant-aware
  // useDocumentPairPermissions hook does not resolve inside a document badge, so
  // read the current user's project roles instead — reliably available here.)
  const user = useCurrentUser()
  // The other invisible reason Publish stays gray: validation errors. One bad
  // field (an unknown custom component, a missing required value, a malformed
  // URL) disables Publish with no obvious signal beyond a small red dot. Read the
  // live validation status so we can name the cause. props.id is the published id.
  const { validation, isValidating } = useValidationStatus(props.id, props.type)

  const type = (props.draft || props.published)?._type
  if (!type || !PUBLISHABLE_CONTENT_TYPES.has(type)) {
    return null
  }

  // The account can edit but cannot PUBLISH (Viewer / Contributor, or not a
  // project member → no roles). Surface it so a disabled/gray Publish button is
  // never a mystery — the most common cause of "I edited it but it won't go live".
  // Checked before the draft state so it explains the dead button even when there
  // are unpublished edits. Conservative: only the clearly-non-publishing cases.
  const roleNames = user?.roles?.map((role) => role.name) ?? []
  const cannotPublish = roleNames.length === 0 || roleNames.every((name) => NON_PUBLISHER_ROLES.has(name))
  if (user && cannotPublish) {
    return {
      label: 'No publish access — ask an admin',
      color: 'danger',
      title:
        'Your account can edit and save drafts, but it does not have permission to publish, so the Publish button stays disabled. Ask a site admin to publish this page (or to grant your account publish access in Sanity).',
    }
  }

  // Validation errors disable Publish. Flag it only once validation has settled
  // (avoid a transient mid-validation flash) and only when there is something to
  // publish (a draft exists), so a clean live page is never flagged. Takes
  // precedence over the plain "unpublished edits" badge — it is the actionable
  // reason the green button won't respond.
  //
  // Count DISTINCT top-level fields with errors, not raw markers: Sanity emits a
  // marker on both an array field and its offending nested field for a single bad
  // value (one invalid custom component yields 2 markers under `content`), so a
  // raw marker count overstates how many fields the editor actually has to fix.
  const errorFields = isValidating
    ? new Set<string>()
    : new Set(
        validation
          .filter((marker) => marker.level === 'error')
          .map((marker) =>
            Array.isArray(marker.path) && marker.path.length > 0 ? String(marker.path[0]) : '(document)',
          ),
      )
  if (props.draft && errorFields.size > 0) {
    return {
      label:
        errorFields.size === 1
          ? 'Publish blocked — 1 field to fix'
          : `Publish blocked — ${errorFields.size} fields to fix`,
      color: 'danger',
      title:
        'This page has validation errors, so the Publish button is disabled. Open the error list (the red warning indicator next to Publish), fix the highlighted field(s), then click Publish.',
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
