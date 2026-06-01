import { evaluate, serialize } from 'flags/next'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getMarketingFlagsSecret, marketingExperimentFlags } from '@/flags'
import {
  MARKETING_VISITOR_COOKIE,
  MARKETING_VISITOR_HEADER,
  getOrGenerateMarketingVisitorId,
} from '@/lib/experiments/visitor'
import {
  getExperimentRewritePath,
  shouldProxyMarketingExperiment,
} from '@/lib/experiments/proxy'
import { getForcedExperimentVariant } from '@/lib/experiments/registry'

const visitorCookieMaxAge = 60 * 60 * 24 * 365

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!shouldProxyMarketingExperiment(pathname, request.method)) {
    return NextResponse.next()
  }

  const secret = getMarketingFlagsSecret()
  if (!secret) {
    return NextResponse.next()
  }

  const visitorId = await getOrGenerateMarketingVisitorId(request.cookies, request.headers)
  const values = [...(await evaluate(marketingExperimentFlags))]
  const forcedVariant = getForcedExperimentVariant(pathname, request.nextUrl.searchParams)
  if (forcedVariant) {
    const flagIndex = marketingExperimentFlags.findIndex((flag) => flag.key === forcedVariant.experiment.flagKey)
    if (flagIndex >= 0) values[flagIndex] = forcedVariant.variant as (typeof values)[number]
  }
  const code = await serialize(marketingExperimentFlags, values, secret)
  const url = request.nextUrl.clone()
  url.pathname = getExperimentRewritePath(pathname, code)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(MARKETING_VISITOR_HEADER, visitorId)

  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  })

  response.cookies.set(MARKETING_VISITOR_COOKIE, visitorId, {
    path: '/',
    maxAge: visitorCookieMaxAge,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  if (forcedVariant) {
    response.headers.set('x-goinvo-experiment-forced-variant', forcedVariant.variant)
    response.headers.set('x-robots-tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: ['/', '/vision/:path*'],
}
