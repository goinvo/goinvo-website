import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

import { isPublishedDocumentId } from '@/lib/publishRevalidation'

/**
 * Sanity publish webhook → purge the site's cache.
 *
 * Without it, a published change reached goinvo.com only if a visitor happened to have a page open when it was
 * published (<SanityLive> in that tab asks the server to revalidate). This makes every publish refresh the site.
 * The whole site is purged rather than the changed document's pages: queries are tagged by opaque sync tags the
 * webhook cannot know, and pages regenerate lazily on their next visit, so this is cheap.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SANITY_REVALIDATE_SECRET is not set' }, { status: 503 })
  }

  const { isValidSignature, body } = await parseBody<{ _id?: string; _type?: string }>(request, secret, true)
  if (!isValidSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  if (!body?._id || !isPublishedDocumentId(body._id)) {
    return NextResponse.json({ revalidated: false, reason: 'not a published document' })
  }

  revalidatePath('/', 'layout')
  // Route handlers built from the same content sit outside the page layout tree.
  revalidatePath('/sitemap.xml')
  revalidatePath('/llms.txt')
  return NextResponse.json({ revalidated: true, id: body._id, type: body._type ?? null })
}
