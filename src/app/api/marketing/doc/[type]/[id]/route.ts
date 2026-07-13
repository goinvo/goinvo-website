import { NextResponse } from 'next/server'
import {
  assertMarketingApiKey,
  buildPatchPayload,
  channelDeleteCascade,
  getMarketingWriteClient,
  isManagedMarketingType,
  MarketingAuthError,
  MarketingValidationError,
  type ManagedMarketingType,
  type MarketingFields,
} from '@/lib/marketing'
import { OUTREACH_DATASET, OUTREACH_DATASET_TYPES } from '@/lib/marketing/outreachEnums'

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

function clientForType(type: ManagedMarketingType) {
  const base = getMarketingWriteClient()
  return OUTREACH_DATASET_TYPES.includes(type) ? base.withConfig({ dataset: OUTREACH_DATASET }) : base
}

function isValidDocumentId(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)
}

// Authenticate + resolve the awaited params, returning either the managed type
// and document id, or a ready-to-return error response (401 bad key, 400
// unmanaged type). Shared by all three handlers below.
async function guard(
  req: Request,
  context: RouteContext,
): Promise<{ type: ManagedMarketingType; id: string } | { response: NextResponse }> {
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

  if (!isValidDocumentId(id)) {
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
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { set, unset, deriveSlug } = (body ?? {}) as {
    set?: unknown
    unset?: unknown
    deriveSlug?: unknown
  }

  const hasSet = typeof set === 'object' && set !== null && !Array.isArray(set)
  const unsetFields =
    Array.isArray(unset) && unset.every((field) => typeof field === 'string')
      ? (unset as string[])
      : []

  if (!hasSet && unsetFields.length === 0) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `set` object and/or an `unset` string array.' },
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
    const exists = await client.fetch<{ _id: string } | null>(
      '*[_type == $type && _id == $id][0]{_id}',
      { type, id },
    )
    if (!exists) {
      return NextResponse.json({ error: `No ${type} found with _id ${id}.` }, { status: 404 })
    }
    let patch = client.patch(id)
    if (Object.keys(payload).length > 0) patch = patch.set(payload)
    if (unsetFields.length > 0) patch = patch.unset(unsetFields)
    const document = await patch.commit()
    return NextResponse.json({ id, document })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to patch document.'
    console.error(`Marketing patch (${type}/${id}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/marketing/doc/:type/:id — delete one managed marketing document.
 *
 * For marketingChannel, references from calendar items are unset first (cascade)
 * unless ?cascade=false. Returns { id, deleted: true, cascadedUnset } where
 * cascadedUnset is the number of calendar items detached.
 */
export async function DELETE(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type, id } = guarded

  const url = new URL(req.url)
  const cascade = url.searchParams.get('cascade') !== 'false'

  try {
    const client = clientForType(type)
    const exists = await client.fetch<{ _id: string } | null>(
      '*[_type == $type && _id == $id][0]{_id}',
      { type, id },
    )
    if (!exists) {
      return NextResponse.json({ error: `No ${type} found with _id ${id}.` }, { status: 404 })
    }

    let cascadedUnset = 0
    if (type === 'marketingChannel' && cascade) {
      cascadedUnset = await channelDeleteCascade(client, id)
    }

    await client.delete(id)
    return NextResponse.json({ id, deleted: true, cascadedUnset })
  } catch (error) {
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
