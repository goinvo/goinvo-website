/**
 * Public API for the portable marketing CMS shared core.
 *
 * Import from `@/lib/marketing` (or the package root once extracted) rather than
 * the individual modules so the surface stays stable. This barrel intentionally
 * re-exports only the marketing-CMS core; the SEO audit / drain utilities that
 * also live in this folder are imported directly where needed.
 */

// Derivation helpers (ported verbatim + small additions).
export {
  slugify,
  optionalSlug,
  stringListFromText,
  randomKey,
  refsFromIds,
  referenceFromId,
  withArrayKeys,
} from './derive'
export type { SanityReference, KeyedItem } from './derive'

// Managed type registry.
export { MANAGED_MARKETING_TYPES, isManagedMarketingType } from './types'
export type { ManagedMarketingType } from './types'

// Per-type schema-derived metadata.
export { DEFAULTS, ARRAY_ITEM_TYPES, SLUG_TYPES, REQUIRED_FIELDS } from './defaults'

// CRUD payload builders + validation + cascade.
export {
  MarketingValidationError,
  buildCreatePayload,
  buildPatchPayload,
  channelDeleteCascade,
} from './crud'
export type {
  MarketingFields,
  MarketingCreatePayload,
  BuildPayloadOptions,
  SanitySlug,
} from './crud'

// Write client.
export { getMarketingWriteClient } from './client'

// API authentication.
export { MarketingAuthError, assertMarketingApiKey } from './auth'
