import { NextResponse } from 'next/server'

/** JSON for authenticated marketing data that must never enter a shared cache. */
export function privateMarketingJson(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
