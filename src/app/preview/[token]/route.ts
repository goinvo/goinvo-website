import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { previewToken } from '@/sanity/env'
import { hashShareToken } from '@/lib/previewShare.server'
import { PREVIEW_SESSION_HASH } from '@/lib/draftPreview'
import {
  SHARE_LINK_TYPE,
  isShareLinkActive,
  resolvePreviewPathForType,
  type ShareLinkRecord,
} from '@/lib/previewShare'

// Reads only (record lookup + slug resolve); previewToken is sufficient.
const reader = previewToken ? client.withConfig({ token: previewToken, useCdn: false, perspective: 'raw' }) : null

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const invalid = () => NextResponse.redirect(new URL('/preview/invalid', req.url))
  if (!reader) return invalid()

  const { token } = await params
  if (!token) return invalid()

  const record = await reader
    .fetch<(ShareLinkRecord & { docId?: string }) | null>(
      `*[_type == $t && tokenHash == $h][0]{ _id, docId, expiresAt, revokedAt }`,
      { t: SHARE_LINK_TYPE, h: hashShareToken(token) },
    )
    .catch(() => null)

  if (!isShareLinkActive(record, Date.now()) || !record?.docId) return invalid()

  const doc = await reader
    .fetch<{ type?: string; slug?: string } | null>(
      `*[_id in [$draftId, $pubId]]{ "type": _type, "slug": slug.current, "isDraft": _id in path("drafts.**") } | order(isDraft desc)[0]`,
      { draftId: `drafts.${record.docId}`, pubId: record.docId },
    )
    .catch(() => null)

  const path = resolvePreviewPathForType(doc?.type, doc?.slug)
  if (!path) return invalid()

  const dm = await draftMode()
  if (!dm.isEnabled) dm.enable()

  // Tag the top-level navigation so DraftModeGuard keeps draft mode in this tab
  // (rather than treating the cookie as a stale leak and disabling it).
  const dest = new URL(path, req.url)
  dest.hash = PREVIEW_SESSION_HASH
  return NextResponse.redirect(dest)
}
