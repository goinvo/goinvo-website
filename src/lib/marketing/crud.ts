/**
 * Build and validate the document payloads the marketing CMS writes to Sanity.
 *
 * These functions are pure (no network) except `channelDeleteCascade`, which
 * takes a client so the caller controls authentication. Everything is keyed on
 * ManagedMarketingType and refuses unmanaged types, mirroring the Studio tool's
 * create/patch behavior so both surfaces produce identical documents.
 */
import type { SanityClient } from '@sanity/client'
import { randomKey, slugify } from './derive'
import { ARRAY_ITEM_TYPES, DEFAULTS, REQUIRED_FIELDS, SLUG_TYPES } from './defaults'
import { isManagedMarketingType, type ManagedMarketingType } from './types'
import { CALENDAR_STATUS_VALUES } from './enums'

/** A loose field bag for a marketing document being created or patched. */
export type MarketingFields = Record<string, unknown>

/** A Sanity slug value. */
export interface SanitySlug {
  _type: 'slug'
  current: string
}

/** A document payload ready to hand to client.create (no `_id` unless supplied). */
export interface MarketingCreatePayload extends MarketingFields {
  _type: ManagedMarketingType
  _id?: string
}

/** Options for building create/patch payloads. */
export interface BuildPayloadOptions {
  /** Spread schema defaults under the caller's fields. Default true. */
  applyDefaults?: boolean
  /** Derive slug (and UTM) from title for slug types. Default true. */
  deriveSlug?: boolean
}

const DEFAULT_BUILD_OPTIONS: Required<BuildPayloadOptions> = {
  applyDefaults: true,
  deriveSlug: true,
}

/** Types whose `utmCampaign` should be derived from slug/title when absent. */
const UTM_DERIVED_TYPES: ReadonlySet<ManagedMarketingType> = new Set<ManagedMarketingType>([
  'marketingCampaign',
  'marketingCalendarItem',
])

/** An out-of-set value supplied for a closed-set (enum) field. */
export interface InvalidFieldValue {
  field: string
  value: unknown
  allowed: readonly string[]
}

/** Thrown when required fields are missing OR an enum field has an out-of-set value. */
export class MarketingValidationError extends Error {
  readonly missing: string[]
  readonly invalid: InvalidFieldValue[]

  constructor(missing: string[], invalid: InvalidFieldValue[] = []) {
    const parts: string[] = []
    if (missing.length > 0) {
      parts.push(`Missing required field${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`)
    }
    for (const inv of invalid) {
      parts.push(`Invalid ${inv.field} "${String(inv.value)}" (allowed: ${inv.allowed.join(', ')})`)
    }
    super(parts.join('; ') || 'Validation failed')
    this.name = 'MarketingValidationError'
    this.missing = missing
    this.invalid = invalid
  }
}

// Closed-set fields enforced server-side, per managed type. Currently only the
// calendar item's `status`: an out-of-set status persists silently via the API and
// then never matches the publish worker's `status == "scheduled"` filter, so the
// item never auto-publishes — with no error anywhere. (channel/contentType are set
// from AI/opportunity variables that legitimately vary, so they stay schema-warning
// only; the worker also reports a non-social channel as skipped in its run summary.)
const ENUM_FIELDS: Partial<Record<ManagedMarketingType, Record<string, readonly string[]>>> = {
  marketingCalendarItem: { status: CALENDAR_STATUS_VALUES },
}

function collectInvalidEnums(type: ManagedMarketingType, fields: MarketingFields): InvalidFieldValue[] {
  const spec = ENUM_FIELDS[type]
  if (!spec) return []
  const invalid: InvalidFieldValue[] = []
  for (const [field, allowed] of Object.entries(spec)) {
    const value = fields[field]
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string' || !allowed.includes(value)) {
      invalid.push({ field, value, allowed })
    }
  }
  return invalid
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A field is "present" for required-validation when it is not null/undefined/''. */
function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function collectConditionalMissing(type: ManagedMarketingType, fields: MarketingFields): string[] {
  if (type === 'marketingCalendarItem' && fields.status === 'scheduled' && !isPresent(fields.publishAt)) {
    return ['publishAt']
  }
  return []
}

/**
 * Stamps a unique `_key` (and `_type` for arrays of objects / references) onto
 * every item of a single array field. Existing `_key`/`_type` values are kept.
 *
 *  - Object items in a mapped field get the configured object `_type`.
 *  - Object items that already carry a `_ref` are treated as references.
 *  - Plain (non-object) items are returned untouched.
 */
function keyArrayItems(items: unknown[], objectType: string | undefined): unknown[] {
  return items.map((item) => {
    if (!isPlainObject(item)) return item
    const existingKey = asString(item._key)
    const next: Record<string, unknown> = {
      ...item,
      _key: existingKey && existingKey.length > 0 ? existingKey : randomKey(),
    }
    if (typeof next._type !== 'string') {
      if (objectType) {
        next._type = objectType
      } else if (typeof next._ref === 'string') {
        next._type = 'reference'
      }
    }
    return next
  })
}

/**
 * Walks every array-valued field on `fields` and keys its items, using the
 * configured object `_type` per field when one exists, otherwise falling back to
 * 'reference' for items that look like references. Returns a new object; never
 * mutates the input.
 */
function injectArrayKeys(type: ManagedMarketingType, fields: MarketingFields): MarketingFields {
  const arrayItemTypes = ARRAY_ITEM_TYPES[type]
  const result: MarketingFields = { ...fields }
  for (const [field, value] of Object.entries(result)) {
    if (!Array.isArray(value)) continue
    result[field] = keyArrayItems(value, arrayItemTypes[field])
  }
  return result
}

/**
 * Builds a create payload for a managed marketing document.
 *
 *  - Rejects non-managed types.
 *  - Spreads DEFAULTS UNDER the caller's fields (caller wins).
 *  - Derives slug from title for slug types when slug is absent.
 *  - Derives utmCampaign from slug/title for campaign + calendar item.
 *  - Keys every array-of-object item and reference item.
 *  - Validates REQUIRED_FIELDS, throwing MarketingValidationError when any miss.
 *
 * Returns the document without an `_id` unless the caller supplied one in
 * `fields._id`.
 */
export function buildCreatePayload(
  type: string,
  fields: MarketingFields,
  opts: BuildPayloadOptions = DEFAULT_BUILD_OPTIONS,
): MarketingCreatePayload {
  if (!isManagedMarketingType(type)) {
    throw new Error(`Refusing to create unmanaged document type: ${type}`)
  }

  const applyDefaults = opts.applyDefaults ?? DEFAULT_BUILD_OPTIONS.applyDefaults
  const deriveSlug = opts.deriveSlug ?? DEFAULT_BUILD_OPTIONS.deriveSlug

  // Separate any caller-supplied _id so it does not get treated as a content field.
  const sourceFields = fields as MarketingFields & {
    _id?: unknown
    _type?: unknown
  }
  const suppliedId = sourceFields._id
  const rest: MarketingFields = { ...sourceFields }
  delete rest._id
  delete rest._type

  // Defaults go UNDER the caller's fields.
  let merged: MarketingFields = applyDefaults ? { ...DEFAULTS[type], ...rest } : { ...rest }

  // Derive slug from title for slug types when slug is missing.
  const title = asString(merged.title)
  if (deriveSlug && SLUG_TYPES.has(type) && title && !merged.slug) {
    const slug: SanitySlug = { _type: 'slug', current: slugify(title) }
    merged.slug = slug
  }

  // Derive utmCampaign from slug (preferred) or title when absent.
  if (deriveSlug && UTM_DERIVED_TYPES.has(type) && !isPresent(merged.utmCampaign)) {
    const slugCurrent = isPlainObject(merged.slug) ? asString(merged.slug.current) : undefined
    const source = slugCurrent ?? title
    if (source) {
      merged.utmCampaign = slugify(source)
    }
  }

  // Key array items (objects get their _type, refs get 'reference').
  merged = injectArrayKeys(type, merged)

  // Validate required fields + closed-set (enum) field membership.
  const missing = Array.from(new Set([
    ...REQUIRED_FIELDS[type].filter((field) => !isPresent(merged[field])),
    ...collectConditionalMissing(type, merged),
  ]))
  const invalid = collectInvalidEnums(type, merged)
  if (missing.length > 0 || invalid.length > 0) {
    throw new MarketingValidationError(missing, invalid)
  }

  const payload: MarketingCreatePayload = { _type: type, ...merged }
  const id = asString(suppliedId)
  if (id) payload._id = id
  return payload
}

/**
 * Builds the `set` portion of a patch for a managed marketing document.
 *
 *  - Rejects non-managed types.
 *  - Keys every array-of-object item and reference item in `set`.
 *  - When `set.title` is present for a slug type, also derives slug + utmCampaign
 *    (unless the caller already provided them in `set`).
 *
 * Does NOT apply DEFAULTS — patches only touch fields the caller supplied.
 */
export function buildPatchPayload(
  type: string,
  set: MarketingFields,
  opts: BuildPayloadOptions = DEFAULT_BUILD_OPTIONS,
): MarketingFields {
  if (!isManagedMarketingType(type)) {
    throw new Error(`Refusing to patch unmanaged document type: ${type}`)
  }

  const deriveSlug = opts.deriveSlug ?? DEFAULT_BUILD_OPTIONS.deriveSlug

  // Never let _id / _type leak into the set.
  const rest: MarketingFields = { ...set }
  delete rest._id
  delete rest._type
  let next: MarketingFields = { ...rest }

  const title = asString(next.title)
  if (deriveSlug && title) {
    if (SLUG_TYPES.has(type) && !next.slug) {
      const slug: SanitySlug = { _type: 'slug', current: slugify(title) }
      next.slug = slug
    }
    if (UTM_DERIVED_TYPES.has(type) && !isPresent(next.utmCampaign)) {
      const slugCurrent = isPlainObject(next.slug) ? asString(next.slug.current) : undefined
      next.utmCampaign = slugify(slugCurrent ?? title)
    }
  }

  next = injectArrayKeys(type, next)

  // A patch only carries the fields the caller is changing, so validate enum
  // membership on just those (an out-of-set status here is the same silent failure).
  const invalid = collectInvalidEnums(type, next)
  if (invalid.length > 0) {
    throw new MarketingValidationError([], invalid)
  }
  return next
}

/**
 * Detaches a managed channel from every calendar item that references it, so the
 * channel can be safely deleted without leaving dangling references.
 *
 * Fetches the ids of every marketingCalendarItem whose `channelRef._ref` equals
 * `channelId`, unsets `channelRef` on each in a single transaction, and returns
 * the number of calendar items updated.
 */
export async function channelDeleteCascade(client: SanityClient, channelId: string): Promise<number> {
  const ids = await client.fetch<string[]>(
    '*[_type == "marketingCalendarItem" && channelRef._ref == $channelId]._id',
    { channelId },
  )

  if (!ids || ids.length === 0) return 0

  let transaction = client.transaction()
  for (const id of ids) {
    transaction = transaction.patch(id, (patch) => patch.unset(['channelRef']))
  }
  await transaction.commit()

  return ids.length
}
