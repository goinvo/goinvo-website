/**
 * Shareable draft-preview links: pure, isomorphic helpers.
 *
 * A share link lets someone WITHOUT a Sanity login open an unpublished draft as
 * the real site page (not the Studio shell). The link carries a high-entropy
 * token; only its SHA-256 hash is persisted (in a `previewShareLink` document),
 * so the world-readable production dataset never exposes anything usable — the
 * raw token exists only in the URL (copy-once). The consume route validates the
 * token, enables draft mode, and redirects to the resolved page, tagging it with
 * the DraftModeGuard marker (see src/lib/draftPreview.ts) so no login is needed.
 *
 * This module holds only the parts safe to bundle in the Studio (no node:crypto);
 * token generation + hashing live in previewShare.server.ts.
 */

/** _type of the persisted share-link record (managed via the data API, not a Studio schema). */
export const SHARE_LINK_TYPE = 'previewShareLink'

/** Document types that have a resolvable public page and can be shared. */
export const SHAREABLE_DOC_TYPES = ['feature', 'caseStudy'] as const
export type ShareableDocType = (typeof SHAREABLE_DOC_TYPES)[number]

/** Public path prefix per shareable type. */
const TYPE_PATH_PREFIX: Record<ShareableDocType, string> = {
  feature: '/vision',
  caseStudy: '/work',
}

/** Selectable link lifetimes offered in the Share dialog. */
export const EXPIRY_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
] as const

export const DEFAULT_EXPIRY_DAYS = 14
const ALLOWED_EXPIRY_DAYS = new Set<number>(EXPIRY_OPTIONS.map((o) => o.days))
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function isShareableDocType(type: string | undefined | null): type is ShareableDocType {
  return !!type && (SHAREABLE_DOC_TYPES as readonly string[]).includes(type)
}

/** Clamp an arbitrary requested lifetime to one of the offered options. */
export function normalizeExpiryDays(days: unknown): number {
  const n = typeof days === 'number' ? days : Number(days)
  return Number.isFinite(n) && ALLOWED_EXPIRY_DAYS.has(n) ? n : DEFAULT_EXPIRY_DAYS
}

/** Strip a leading `drafts.` so a draft id and its published id share one key. */
export function bareDocId(id: string): string {
  return id.startsWith('drafts.') ? id.slice('drafts.'.length) : id
}

/** Resolve the public page path for a shareable document, or null when unshareable / slugless. */
export function resolvePreviewPathForType(
  type: string | undefined | null,
  slug: string | undefined | null,
): string | null {
  if (!isShareableDocType(type) || !slug) return null
  return `${TYPE_PATH_PREFIX[type]}/${slug}`
}

export interface ShareLinkRecord {
  _id?: string
  expiresAt?: string | null
  revokedAt?: string | null
}

/** A link is usable only while it is neither revoked nor past its expiry. */
export function isShareLinkActive(record: ShareLinkRecord | null | undefined, nowMs: number): boolean {
  if (!record || record.revokedAt) return false
  if (!record.expiresAt) return false
  const expiresMs = Date.parse(record.expiresAt)
  return Number.isFinite(expiresMs) && expiresMs > nowMs
}

/** ISO expiry timestamp `days` in the future from `nowMs` (pure — caller supplies now). */
export function expiresAtFrom(nowMs: number, days: number): string {
  return new Date(nowMs + normalizeExpiryDays(days) * MS_PER_DAY).toISOString()
}

/** Build the shareable URL a reviewer opens. */
export function shareLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/preview/${token}`
}
