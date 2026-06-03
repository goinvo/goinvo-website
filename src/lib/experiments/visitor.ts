import { dedupe } from 'flags/next'
import type { ReadonlyHeaders, ReadonlyRequestCookies } from 'flags'
import type { NextRequest } from 'next/server'

export const MARKETING_VISITOR_COOKIE = 'goinvo_marketing_visitor_id'
export const MARKETING_VISITOR_HEADER = 'x-goinvo-marketing-visitor-id'

const generateMarketingVisitorId = dedupe(async () => {
  return crypto.randomUUID()
})

export async function getOrGenerateMarketingVisitorId(
  cookies: ReadonlyRequestCookies | NextRequest['cookies'],
  headers: ReadonlyHeaders | NextRequest['headers'],
) {
  const cookieVisitorId = cookies.get(MARKETING_VISITOR_COOKIE)?.value
  if (cookieVisitorId) return cookieVisitorId

  const headerVisitorId = headers.get(MARKETING_VISITOR_HEADER)
  if (headerVisitorId) return headerVisitorId

  return generateMarketingVisitorId()
}

