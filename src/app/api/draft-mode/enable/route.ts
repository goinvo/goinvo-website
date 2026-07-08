import { validatePreviewUrl } from '@sanity/preview-url-secret'
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants'
import { draftMode, cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { previewToken } from '@/sanity/env'
import { PREVIEW_SESSION_HASH } from '@/lib/draftPreview'

// Hand-rolled version of next-sanity's defineEnableDraftMode: identical
// validation + cookie behavior, but we control the redirect so we can tag
// top-level preview tabs with PREVIEW_SESSION_HASH. Without the tag,
// DraftModeGuard treats the tab as a stale-cookie leak and exits draft mode —
// which is exactly what killed shared preview links before.
export async function GET(request: Request) {
  if (!previewToken) {
    return NextResponse.json(
      {
        error: 'No Sanity token configured',
        hint: 'Set SANITY_API_READ_TOKEN (Viewer scope) in .env.local and the Vercel project env vars. SANITY_WRITE_TOKEN is only needed for creating/deleting drafts.',
      },
      { status: 503 },
    )
  }

  const { isValid, redirectTo = '/', studioPreviewPerspective } = await validatePreviewUrl(
    client.withConfig({ token: previewToken }),
    request.url,
  )
  if (!isValid) {
    return new Response('Invalid secret', { status: 401 })
  }

  const draftModeStore = await draftMode()
  if (!draftModeStore.isEnabled) draftModeStore.enable()

  // Re-set the bypass cookie SameSite=None in production so it works inside
  // the Presentation iframe (mirrors next-sanity's defineEnableDraftMode).
  const dev = process.env.NODE_ENV !== 'production'
  const cookieStore = await cookies()
  const bypassCookie = cookieStore.get('__prerender_bypass')
  if (bypassCookie?.value) {
    cookieStore.set({
      name: '__prerender_bypass',
      value: bypassCookie.value,
      httpOnly: true,
      path: '/',
      secure: !dev,
      sameSite: dev ? 'lax' : 'none',
    })
  }
  if (studioPreviewPerspective) {
    cookieStore.set({
      name: perspectiveCookieName,
      value: studioPreviewPerspective,
      httpOnly: true,
      path: '/',
      secure: !dev,
      sameSite: dev ? 'lax' : 'none',
    })
  }

  const destination = new URL(redirectTo, request.url)
  // The Presentation iframe manages its own draft-mode lifecycle and its URL
  // is mirrored in the Studio URL bar, so only tag top-level navigations.
  // (Overrides any fragment in redirectTo — preview links don't carry anchors.)
  if (request.headers.get('sec-fetch-dest') !== 'iframe') {
    destination.hash = PREVIEW_SESSION_HASH
  }
  return NextResponse.redirect(destination)
}
