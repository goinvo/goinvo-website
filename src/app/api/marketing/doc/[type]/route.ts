import type { NextResponse as NextResponseType } from 'next/server'
import {
  assertMarketingApiKey,
  buildCreatePayload,
  getMarketingWriteClient,
  isManagedMarketingType,
  MarketingAuthError,
  MarketingValidationError,
  type ManagedMarketingType,
  type MarketingCreatePayload,
  type MarketingFields,
} from '@/lib/marketing'
import { OUTREACH_DATASET, OUTREACH_DATASET_TYPES } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

// Marketing documents can contain internal planning material, and Outreach
// types contain PII. Preserve the familiar response call sites while making
// every result explicitly private and non-cacheable.
const NextResponse = { json: privateMarketingJson }

// Outreach types (contacts, offers, work evidence) live in the PRIVATE
// outreach dataset — contact PII must never land in the world-readable
// production dataset. Everything else stays on the default dataset.
function clientForType(type: ManagedMarketingType) {
  const base = getMarketingWriteClient()
  return OUTREACH_DATASET_TYPES.includes(type) ? base.withConfig({ dataset: OUTREACH_DATASET }) : base
}

// REST surface for the portable marketing CMS. This file handles the
// collection-level routes for one managed document type:
//
//   POST /api/marketing/doc/:type   → create a document
//   GET  /api/marketing/doc/:type   → list documents of that type
//
// Both fail closed: every request must carry a valid marketing API key (bearer
// or x-marketing-api-key header) and target a managed marketing type, mirroring
// the Studio tool's allowlist so the API can never write arbitrary documents.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ type: string }>
}

// Pull the managed type out of the awaited params and authenticate the request.
// Returns either { type } on success or a ready-to-return NextResponse error
// (401 for a bad key, 400 for an unmanaged type) the caller should short-circuit
// on. Keeps the auth + allowlist guard identical across every handler.
async function guard(
  req: Request,
  context: RouteContext,
): Promise<{ type: ManagedMarketingType } | { response: NextResponseType }> {
  try {
    assertMarketingApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
    }
    throw error
  }

  const { type } = await context.params
  if (!isManagedMarketingType(type)) {
    return {
      response: NextResponse.json(
        { error: `Unmanaged marketing document type: ${type}` },
        { status: 400 },
      ),
    }
  }

  return { type }
}

const LIST_DEFAULT_LIMIT = 50
const LIST_MAX_LIMIT = 200
const LIST_DEFAULT_ORDER = '_updatedAt desc'

// Whitelist of GROQ order clauses, so the ?order param can't inject arbitrary
// GROQ. The format is "<field> asc|desc"; we accept a small set of safe fields.
const ALLOWED_ORDER_FIELDS = new Set(['_updatedAt', '_createdAt', 'title', 'order'])

function sanitizeOrder(raw: string | null): string {
  if (!raw) return LIST_DEFAULT_ORDER
  const trimmed = raw.trim()
  const match = /^(\w+)\s+(asc|desc)$/i.exec(trimmed)
  if (!match) return LIST_DEFAULT_ORDER
  const [, field, direction] = match
  if (!ALLOWED_ORDER_FIELDS.has(field)) return LIST_DEFAULT_ORDER
  return `${field} ${direction.toLowerCase()}`
}

function parseLimit(raw: string | null): number {
  if (!raw) return LIST_DEFAULT_LIMIT
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return LIST_DEFAULT_LIMIT
  return Math.min(parsed, LIST_MAX_LIMIT)
}

/**
 * POST /api/marketing/doc/:type — create one managed marketing document.
 *
 * Body: { fields: object, applyDefaults?: boolean, deriveSlug?: boolean }.
 * The core's buildCreatePayload applies defaults, derives slug/UTM, keys array
 * items, and validates required fields (throwing MarketingValidationError →
 * 422). On success returns 201 with the created document.
 */
export async function POST(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type } = guarded

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const {
    fields,
    applyDefaults,
    deriveSlug,
  } = (body ?? {}) as {
    fields?: unknown
    applyDefaults?: unknown
    deriveSlug?: unknown
  }

  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    return NextResponse.json(
      { error: 'Body must include a `fields` object.' },
      { status: 400 },
    )
  }

  let doc: MarketingCreatePayload
  try {
    doc = buildCreatePayload(type, fields as MarketingFields, {
      ...(typeof applyDefaults === 'boolean' ? { applyDefaults } : {}),
      ...(typeof deriveSlug === 'boolean' ? { deriveSlug } : {}),
    })
  } catch (error) {
    if (error instanceof MarketingValidationError) {
      return NextResponse.json(
        { error: error.message, missing: error.missing, invalid: error.invalid },
        { status: 422 },
      )
    }
    // Unmanaged type (already guarded) or other build error.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build document.' },
      { status: 400 },
    )
  }

  try {
    const created = await clientForType(type).create(doc)
    return NextResponse.json({ id: created._id, type, document: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document.'
    console.error(`Marketing create (${type}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/marketing/doc/:type — list documents of one managed marketing type.
 *
 * Query params: ?limit (default 50, capped 200), ?order (default
 * "_updatedAt desc", restricted to a safe field allowlist). Returns
 * { type, count, items }.
 */
export async function GET(req: Request, context: RouteContext) {
  const guarded = await guard(req, context)
  if ('response' in guarded) return guarded.response
  const { type } = guarded

  const url = new URL(req.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const order = sanitizeOrder(url.searchParams.get('order'))

  try {
    const items = await clientForType(type).fetch<unknown[]>(
      `*[_type == $type] | order(${order}) [0...$limit]`,
      { type, limit },
    )
    return NextResponse.json({ type, count: items.length, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list documents.'
    console.error(`Marketing list (${type}) failed:`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
