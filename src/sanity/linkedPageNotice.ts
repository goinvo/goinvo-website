/**
 * A vision piece with "Also show on /work" on is ONE document shown on two pages, so an edit changes both.
 * The Studio says so once, on the first edit, and each person can turn that off per piece.
 */

/** Per person and per piece: "don't show again" is remembered in this browser. */
export function linkedNoticeStorageKey(userId: string, documentId: string): string {
  return `goinvo:linked-page-notice:${userId}:${documentId.replace(/^drafts\./, '')}`
}

export interface LinkedNoticeState {
  /** The piece is on /vision and /work. */
  onBothPages: boolean
  /** Field names the edit touched (first segment of each patch path). */
  editedFields: string[]
  /** The person chose "Don't show again" for this piece. */
  dismissedForever: boolean
  /** Already shown for this piece since the Studio was opened. */
  shownThisSession: boolean
}

export function shouldShowLinkedNotice(state: LinkedNoticeState): boolean {
  if (!state.onBothPages || state.dismissedForever || state.shownThisSession) return false
  // Turning "Also show on /work" on or off is the point of the edit, not a surprise side effect.
  return state.editedFields.some((field) => field !== 'featured')
}

const SYSTEM_FIELDS = new Set(['_id', '_type', '_rev', '_createdAt', '_updatedAt'])

/** Top-level fields whose value changed. Form values are immutable, so an untouched field keeps its reference. */
export function changedFields(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  return [...keys].filter((key) => !SYSTEM_FIELDS.has(key) && before?.[key] !== after?.[key])
}
