/**
 * Pure, dependency-free derivation helpers shared between the Sanity Studio
 * marketing tool and the Next.js marketing API routes.
 *
 * The first five functions (slugify, optionalSlug, randomKey, refsFromIds,
 * stringListFromText) are ported VERBATIM from
 * src/sanity/tools/marketingTool.tsx so the Studio and the API stay byte-for-byte
 * consistent. Do not change their behavior — only the surrounding module/export
 * boilerplate is new.
 *
 * No goinvo-specific assumptions live here; this module is portable to any
 * Sanity site that wants the same managed-document conventions.
 */

/** A Sanity reference value produced from a document id. */
export interface SanityReference {
  _key: string
  _type: 'reference'
  _ref: string
}

/**
 * Lowercase, trim, collapse non-alphanumeric runs to '-', strip leading/trailing
 * '-', cap at 96 chars, and fall back to 'untitled' for empty results.
 *
 * Ported verbatim from marketingTool.tsx.
 */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96) || 'untitled'
  )
}

/**
 * Returns an empty string when the input is blank, otherwise the slugified
 * value. Unlike slugify, this never coerces a blank input into 'untitled'.
 *
 * Ported verbatim from marketingTool.tsx.
 */
export function optionalSlug(value: string): string {
  const trimmed = value.trim()
  return trimmed ? slugify(trimmed) : ''
}

/**
 * Splits text on newlines, trims each line, drops blanks, and dedupes while
 * preserving first-seen order.
 *
 * Ported verbatim from marketingTool.tsx.
 */
export function stringListFromText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

/**
 * Generates a Sanity array `_key`: a dashless crypto.randomUUID when available,
 * with a base-36 fallback for environments without the Web Crypto API.
 *
 * Ported verbatim from marketingTool.tsx.
 */
export function randomKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '')
  return Math.random().toString(36).slice(2)
}

/**
 * Maps each document id to a Sanity reference whose `_key` is the id stripped to
 * [a-zA-Z0-9_-].
 *
 * Ported verbatim from marketingTool.tsx.
 */
export function refsFromIds(ids: string[]): SanityReference[] {
  return ids.map((id) => ({
    _key: id.replace(/[^a-zA-Z0-9_-]/g, ''),
    _type: 'reference' as const,
    _ref: id,
  }))
}

/**
 * Builds a single Sanity reference from a document id, using the same `_key`
 * derivation as refsFromIds.
 */
export function referenceFromId(id: string): SanityReference {
  return {
    _key: id.replace(/[^a-zA-Z0-9_-]/g, ''),
    _type: 'reference',
    _ref: id,
  }
}

/** Plain object shape for array items that may carry a Sanity `_key`/`_type`. */
export type KeyedItem = Record<string, unknown>

/**
 * Ensures every array item carries a unique `_key`. Existing non-empty `_key`
 * values are preserved; everything else gets a fresh randomKey(). When `itemType`
 * is provided, a missing `_type` is filled in too (existing `_type` is kept).
 *
 * Non-object items (e.g. plain strings) are returned untouched.
 */
export function withArrayKeys<T>(items: readonly T[], itemType?: string): T[] {
  return items.map((item) => {
    if (item === null || typeof item !== 'object') return item
    const record = item as KeyedItem
    const existingKey = typeof record._key === 'string' && record._key ? record._key : undefined
    const next: KeyedItem = {
      ...record,
      _key: existingKey ?? randomKey(),
    }
    if (itemType && typeof next._type !== 'string') {
      next._type = itemType
    }
    return next as T
  })
}
