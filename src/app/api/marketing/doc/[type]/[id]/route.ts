import type { NextResponse as NextResponseType } from 'next/server'
import {
  assertMarketingApiKey,
  buildCreatePayload,
  buildPatchPayload,
  getMarketingWriteClient,
  isManagedMarketingType,
  MarketingAuthError,
  MarketingValidationError,
  type ManagedMarketingType,
  type MarketingFields,
} from '@/lib/marketing'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  assertBoundedJson,
  isPlainRecord,
  isRevisionConflict,
  isValidMarketingDocumentId,
  isValidSanityRevision,
  MarketingRequestError,
  readBoundedJson,
} from '@/lib/marketing/apiBoundary'
import { clientForType as routeClientForType } from '@/lib/marketing/datasetRouting'
import {
  assertAllowedMarketingFields,
  assertAllowedMarketingUnsetPaths,
} from '@/lib/marketing/fieldPolicy'

// Marketing documents can contain internal planning material, and Outreach
// types contain PII. Keep every result explicitly private and non-cacheable.
const NextResponse = { json: privateMarketingJson }

// REST surface for one specific managed marketing document, addressed by type +
// _id:
//
//   GET    /api/marketing/doc/:type/:id   → read one document
//   PATCH  /api/marketing/doc/:type/:id   → set/unset fields on a document
//   DELETE /api/marketing/doc/:type/:id   → delete (channels cascade by default)
//
// Like the collection route, every handler fails closed: a valid marketing API
// key is required (401 otherwise) and the type must be a managed marketing type
// (400 otherwise).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ type: string; id: string }>
}

// Dataset routing lives in one place now (src/lib/marketing/datasetRouting.ts)
// so a type cannot be internal in one route and public in another.
function clientForType(type: ManagedMarketingType) {
  return routeClientForType(getMarketingWriteClient(), type)
}

// Authenticate + resolve the awaited params, returning either the managed type
// and document id, or a ready-to-return error response (401 bad key, 400
// unmanaged type). Shared by all three handlers below.
async function guard(
  req: Request,
  context: RouteContext,
): Promise<{ type: ManagedMarketingType; id: string } | { response: NextResponseType }> {
  try {
    assertMarketingApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
    }
    throw error
  }

  const { type, id } = await context.params
  if (!isManagedMarketingType(type)) {
    return {
      response: NextResponse.json(
        { error: `Unmanaged marketing document type: ${type}` },
        { status: 400 },
      ),
    }
  }

  if (!isValidMarketingDocumentId(id)) {
    return {
      response: NextResponse.json({ error: 'Invalid marketing document id.' }, { status: 400 }),
    }
  }

  return { type, id }
}

/**
 * GET /api/marketing/doc/:type/:id — read one managed marketing document by _id.
 *
 * Returns { document } or 404 when no document of that type has the given _id.
 */
export async function GET(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type, id } = guarded

  try {
    const document = await clientForType(type).fetch<unknown | null>(
      '*[_type == $type && _id == $id][0]',
      { type, id },
    )
    if (!document) {
      return NextResponse.json({ error: `No ${type} found with _id ${id}.` }, { status: 404 })
    }
    return NextResponse.json({ document })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read document.'
    console.error(`Marketing read (${type}/${id}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/marketing/doc/:type/:id — set/unset fields on a document.
 *
 * Body: { set?: object, unset?: string[], deriveSlug?: boolean }. The core's
 * buildPatchPayload keys array items and derives slug/UTM from title when
 * appropriate (no defaults applied). Returns { id, document }.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type, id } = guarded

  let body: unknown
  try {
    body = await readBoundedJson(req)
    assertBoundedJson(body)
  } catch (error) {
    if (error instanceof MarketingRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (!isPlainRecord(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 })
  }
  const unknownBodyKeys = Object.keys(body).filter(
    (key) => !['set', 'unset', 'deriveSlug', 'expectedRevision'].includes(key),
  )
  if (unknownBodyKeys.length) {
    return NextResponse.json(
      { error: `Unknown request field${unknownBodyKeys.length === 1 ? '' : 's'}: ${unknownBodyKeys.join(', ')}` },
      { status: 400 },
    )
  }

  const { set, unset, deriveSlug, expectedRevision } = body as {
    set?: unknown
    unset?: unknown
    deriveSlug?: unknown
    expectedRevision?: unknown
  }

  if (typeof expectedRevision !== 'string' || !isValidSanityRevision(expectedRevision)) {
    return NextResponse.json(
      { error: 'A valid expectedRevision is required for PATCH.' },
      { status: 400 },
    )
  }
  const hasSet = isPlainRecord(set)
  if (set !== undefined && !hasSet) {
    return NextResponse.json({ error: '`set` must be an object.' }, { status: 400 })
  }
  if (unset !== undefined && (!Array.isArray(unset) || !unset.every((field) => typeof field === 'string'))) {
    return NextResponse.json({ error: '`unset` must be a string array.' }, { status: 400 })
  }
  const unsetFields = Array.isArray(unset) ? Array.from(new Set(unset as string[])) : []

  if (!hasSet && unsetFields.length === 0) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `set` object and/or an `unset` string array.' },
      { status: 400 },
    )
  }

  try {
    if (hasSet) assertAllowedMarketingFields(type, set)
    assertAllowedMarketingUnsetPaths(type, unsetFields)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request contains unsupported fields.' },
      { status: 400 },
    )
  }

  let payload: MarketingFields = {}
  if (hasSet) {
    try {
      payload = buildPatchPayload(type, set as MarketingFields, {
        ...(typeof deriveSlug === 'boolean' ? { deriveSlug } : {}),
      })
    } catch (error) {
      if (error instanceof MarketingValidationError) {
        return NextResponse.json(
          { error: error.message, missing: error.missing, invalid: error.invalid },
          { status: 422 },
        )
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to build patch.' },
        { status: 400 },
      )
    }
  }

  try {
    const client = clientForType(type)
    const exists = await client.fetch<Record<string, unknown> | null>(
      '*[_type == $type && _id == $id][0]',
      { type, id },
    )
    if (!exists) {
      return NextResponse.json({ error: `No ${type} found with _id ${id}.` }, { status: 404 })
    }
    if (exists._rev !== expectedRevision) {
      return NextResponse.json(
        { error: 'Document changed since it was loaded. Refresh and review before saving.', expectedRevision, currentRevision: exists._rev },
        { status: 409 },
      )
    }

    const finalFields: MarketingFields = { ...exists, ...payload }
    for (const field of unsetFields) delete finalFields[field]
    for (const field of ['_id', '_type', '_rev', '_createdAt', '_updatedAt']) delete finalFields[field]
    try {
      buildCreatePayload(type, finalFields, { applyDefaults: false, deriveSlug: false })
    } catch (error) {
      if (error instanceof MarketingValidationError) {
        return NextResponse.json(
          { error: error.message, missing: error.missing, invalid: error.invalid },
          { status: 422 },
        )
      }
      throw error
    }
    let patch = client.patch(id).ifRevisionId(expectedRevision)
    if (Object.keys(payload).length > 0) patch = patch.set(payload)
    if (unsetFields.length > 0) patch = patch.unset(unsetFields)
    const document = await patch.commit()
    return NextResponse.json({ id, document })
  } catch (error) {
    if (isRevisionConflict(error)) {
      return NextResponse.json(
        { error: 'Document changed while it was being saved. Refresh and review before retrying.' },
        { status: 409 },
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to patch document.'
    console.error(`Marketing patch (${type}/${id}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/marketing/doc/:type/:id — delete one managed marketing document.
 *
 * Refuses to delete any record that still has direct references. Channels also
 * check legacy key-based usage. Related records are never mutated as a hidden
 * side effect of deletion.
 */
export async function DELETE(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type, id } = guarded

  const url = new URL(req.url)
  const headerRevision = (req.headers.get('if-match') || '').replace(/^W\//, '').replace(/^"|"$/g, '')
  const expectedRevision = (headerRevision || url.searchParams.get('expectedRevision') || '').trim()
  if (!isValidSanityRevision(expectedRevision)) {
    return NextResponse.json(
      { error: 'A valid If-Match header or expectedRevision query parameter is required for DELETE.' },
      { status: 400 },
    )
  }

  try {
    const client = clientForType(type)
    const exists = await client.fetch<{ _id: string; _rev: string; key?: string } | null>(
      '*[_type == $type && _id == $id][0]{_id, _rev, key}',
      { type, id },
    )
    if (!exists) {
      return NextResponse.json({ error: `No ${type} found with _id ${id}.` }, { status: 404 })
    }
    if (exists._rev !== expectedRevision) {
      return NextResponse.json(
        { error: 'Document changed since it was loaded. Refresh and review before deleting.', expectedRevision, currentRevision: exists._rev },
        { status: 409 },
      )
    }

    const directReferences = await client.fetch<Array<{ _id: string; _type: string; title?: string }>>(
      '*[references($id)]{_id, _type, title}',
      { id },
    )
    const legacyChannelUsage = type === 'marketingChannel' && exists.key
      ? await client.fetch<Array<{ _id: string; _type: string; title?: string }>>(
          '*[((_type == "marketingCalendarItem" && channel == $key) || (_type == "marketingCampaign" && $key in channels))]{_id, _type, title}',
          { key: exists.key },
        )
      : []
    const referencedBy = Array.from(
      new Map([...directReferences, ...legacyChannelUsage].map((record) => [record._id, record])).values(),
    )
    if (referencedBy.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete ${type}/${id}: still used by ${referencedBy.length} document(s). Disconnect or archive it first. No related records were changed.`,
          referencedBy,
        },
        { status: 409 },
      )
    }

    const deleted = await client.delete(
      {
        query: '*[_type == $type && _id == $id && _rev == $expectedRevision]',
        params: { type, id, expectedRevision },
      },
      { returnFirst: false, returnDocuments: true },
    )
    if (!Array.isArray(deleted) || deleted.length !== 1) {
      return NextResponse.json(
        { error: 'Document changed while it was being deleted. Refresh and review before retrying.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ id, deleted: true, cascadedUnset: 0 })
  } catch (error) {
    if (isRevisionConflict(error)) {
      return NextResponse.json(
        { error: 'Document changed while it was being deleted. Refresh and review before retrying.' },
        { status: 409 },
      )
    }
    // Reference integrity is the common cause: Sanity refuses to delete a
    // document that is still referenced by others. Surface that as a clean 409
    // listing the referencing docs, instead of an opaque 500. (Delete them
    // together in one transaction, or unset the references first.)
    try {
      const referencedBy = await clientForType(type).fetch<Array<{ _id: string; _type: string }>>(
        '*[references($id)]{_id, _type}[0...50]',
        { id },
      )
      if (referencedBy.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete ${type}/${id}: still referenced by ${referencedBy.length} document(s). Unset or delete those references first, or delete them together in one transaction.`,
            referencedBy,
          },
          { status: 409 },
        )
      }
    } catch {
      // fall through to the generic 500 below
    }
    const message = error instanceof Error ? error.message : 'Failed to delete document.'
    console.error(`Marketing delete (${type}/${id}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
