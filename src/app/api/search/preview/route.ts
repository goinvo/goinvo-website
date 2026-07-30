import { NextRequest, NextResponse } from 'next/server'
import { HOME_AI_SEARCH_COOKIE } from '@/lib/search/gate'

/**
 * Reviewer toggle for the homepage AI search band while it ships dark.
 *
 *   /api/search/preview?on=1  → sets the preview cookie, redirects to /
 *   /api/search/preview?on=0  → clears it, redirects to /
 *
 * The band goes live for everyone via the HOME_AI_SEARCH env var, and later
 * via the A/B experiment wiring (see CLAUDE.md).
 */
export async function GET(request: NextRequest) {
  const on = request.nextUrl.searchParams.get('on') !== '0'
  const response = NextResponse.redirect(new URL('/', request.url))
  if (on) {
    response.cookies.set(HOME_AI_SEARCH_COOKIE, '1', {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })
  } else {
    response.cookies.delete(HOME_AI_SEARCH_COOKIE)
  }
  return response
}
