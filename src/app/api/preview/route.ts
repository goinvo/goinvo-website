import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Enable draft/preview mode by visiting:
 *   /api/preview?secret=<SANITY_PREVIEW_SECRET>&redirect=/work
 *
 * This lets authenticated users browse the site with draft content
 * visible, outside of the Sanity Presentation tab.
 *
 * The secret is set via the SANITY_PREVIEW_SECRET env variable.
 * If not set, this endpoint is disabled for safety.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const redirectTo = searchParams.get('redirect') || '/'

  const previewSecret = process.env.SANITY_PREVIEW_SECRET
  if (!previewSecret) {
    return NextResponse.json(
      { message: 'Preview secret not configured. Set SANITY_PREVIEW_SECRET in your environment.' },
      { status: 500 }
    )
  }

  if (secret !== previewSecret) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  ;(await draftMode()).enable()

  // Only allow relative redirects (prevent open redirect)
  const safePath = redirectTo.startsWith('/') ? redirectTo : '/'
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000'

  return NextResponse.redirect(new URL(safePath, baseUrl))
}
