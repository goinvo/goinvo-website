import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  ;(await draftMode()).disable()

  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirect') || '/'

  // Only allow relative redirects (prevent open redirect)
  const safePath = redirectTo.startsWith('/') ? redirectTo : '/'
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000'

  return NextResponse.redirect(new URL(safePath, baseUrl))
}
