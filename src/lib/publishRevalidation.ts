/** Drafts (`drafts.x`) and release versions (`versions.<release>.x`) are not on the public site. */
export function isPublishedDocumentId(id: string): boolean {
  return !id.startsWith('drafts.') && !id.startsWith('versions.')
}

/** The GROQ filter the Sanity webhook is registered with: published documents only. */
export const PUBLISH_WEBHOOK_FILTER = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`
