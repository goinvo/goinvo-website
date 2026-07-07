import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { generateShareToken, hashShareToken } from '@/lib/previewShare.server'
import {
  SHARE_LINK_TYPE,
  bareDocId,
  expiresAtFrom,
  isShareableDocType,
  normalizeExpiryDays,
  shareLinkUrl,
} from '@/lib/previewShare'

// Server client with write access. previewToken alone can read drafts but the
// create/revoke paths mutate, so this route is inert without the write token.
const server = writeToken ? client.withConfig({ token: writeToken, useCdn: false, perspective: 'raw' }) : null

function noToken() {
  return NextResponse.json(
    {
      error: 'Sanity write token is not configured',
      hint: 'Set SANITY_API_WRITE_TOKEN in .env.local and the Vercel project env vars.',
    },
    { status: 503 },
  )
}

async function authorize(req: Request): Promise<Response | null> {
  try {
    await assertStudioOrApiKey(req)
    return null
  } catch (err) {
    if (err instanceof MarketingAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    throw err
  }
}

function requestOrigin(req: Request): string {
  return process.env.MARKETING_PUBLIC_BASE_URL || req.headers.get('origin') || new URL(req.url).origin
}

/** Resolve a document's type + slug, preferring the draft version. */
async function resolveDoc(bare: string): Promise<{ type?: string; slug?: string } | null> {
  if (!server) return null
  const doc = await server.fetch<{ type?: string; slug?: string } | null>(
    `*[_id in [$draftId, $pubId]]{ "type": _type, "slug": slug.current, "isDraft": _id in path("drafts.**") } | order(isDraft desc)[0]`,
    { draftId: `drafts.${bare}`, pubId: bare },
  )
  return doc ?? null
}

// POST — mint a new share link for a document. Body: { docId, expiryDays? }.
export async function POST(req: Request) {
  const denied = await authorize(req)
  if (denied) return denied
  if (!server) return noToken()

  const body = (await req.json().catch(() => ({}))) as { docId?: string; expiryDays?: number }
  const rawId = typeof body.docId === 'string' ? body.docId.trim() : ''
  if (!rawId) return NextResponse.json({ error: 'docId is required' }, { status: 400 })

  const bare = bareDocId(rawId)
  const doc = await resolveDoc(bare)
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (!isShareableDocType(doc.type)) {
    return NextResponse.json({ error: `This document type (${doc.type}) has no shareable public page.` }, { status: 400 })
  }
  if (!doc.slug) {
    return NextResponse.json({ error: 'Add a slug to this document before sharing a preview.' }, { status: 400 })
  }

  // Housekeeping: drop this doc's expired/revoked links so they don't accumulate.
  await server
    .delete({
      query: `*[_type == $t && docId == $d && (defined(revokedAt) || dateTime(expiresAt) < dateTime(now()))]`,
      params: { t: SHARE_LINK_TYPE, d: bare },
    })
    .catch(() => {})

  const token = generateShareToken()
  const expiresAt = expiresAtFrom(Date.now(), normalizeExpiryDays(body.expiryDays))
  const created = await server.create({
    _type: SHARE_LINK_TYPE,
    tokenHash: hashShareToken(token),
    docId: bare,
    createdAt: new Date().toISOString(),
    expiresAt,
    revokedAt: null,
  })

  return NextResponse.json({ url: shareLinkUrl(requestOrigin(req), token), expiresAt, id: created._id })
}

// GET — list a document's currently-active links. Query: ?docId=
export async function GET(req: Request) {
  const denied = await authorize(req)
  if (denied) return denied
  if (!server) return noToken()

  const docId = new URL(req.url).searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 })

  const links = await server.fetch<Array<{ id: string; createdAt?: string; expiresAt?: string }>>(
    `*[_type == $t && docId == $d && !defined(revokedAt) && dateTime(expiresAt) > dateTime(now())]
      | order(createdAt desc){ "id": _id, createdAt, expiresAt }`,
    { t: SHARE_LINK_TYPE, d: bareDocId(docId) },
  )
  return NextResponse.json({ links })
}

// DELETE — revoke a single link (?id=) or all of a document's links (?docId=).
export async function DELETE(req: Request) {
  const denied = await authorize(req)
  if (denied) return denied
  if (!server) return noToken()

  const params = new URL(req.url).searchParams
  const id = params.get('id')
  const docId = params.get('docId')

  if (id) {
    await server.delete(id)
    return NextResponse.json({ revoked: 1 })
  }
  if (docId) {
    await server.delete({
      query: `*[_type == $t && docId == $d]`,
      params: { t: SHARE_LINK_TYPE, d: bareDocId(docId) },
    })
    return NextResponse.json({ revoked: 'all' })
  }
  return NextResponse.json({ error: 'id or docId is required' }, { status: 400 })
}
