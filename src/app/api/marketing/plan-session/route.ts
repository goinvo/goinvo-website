import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getKvClient } from '@/lib/marketing/drainSink'
import {
  isMarketingPlanConfigured,
  MARKETING_PLAN_SESSION_COOKIE,
  MARKETING_PLAN_SESSION_MAX_AGE,
  marketingPlanSessionValue,
  verifyMarketingPlanKey,
} from '@/lib/marketing/marketingPlanAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FAILURE_LIMIT = 10
const FAILURE_WINDOW_SECONDS = 10 * 60
const memoryFailures = new Map<string, { count: number; expiresAt: number }>()

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const raw = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(raw).digest('hex').slice(0, 24)
}

async function recordFailedAttempt(request: Request): Promise<boolean> {
  const key = clientKey(request)
  const kv = getKvClient()
  if (kv) {
    try {
      const count = await kv.incr(`marketing:plan-login:${key}`)
      if (count === 1) await kv.expire(`marketing:plan-login:${key}`, FAILURE_WINDOW_SECONDS)
      return count > FAILURE_LIMIT
    } catch {
      // Fall through to the bounded process-local limiter when KV is unavailable.
    }
  }

  const now = Date.now()
  if (memoryFailures.size > 1000) {
    for (const [entryKey, entry] of memoryFailures) {
      if (entry.expiresAt <= now) memoryFailures.delete(entryKey)
    }
    if (memoryFailures.size > 1000) memoryFailures.clear()
  }
  const current = memoryFailures.get(key)
  const next = current && current.expiresAt > now
    ? { count: current.count + 1, expiresAt: current.expiresAt }
    : { count: 1, expiresAt: now + FAILURE_WINDOW_SECONDS * 1000 }
  memoryFailures.set(key, next)
  return next.count > FAILURE_LIMIT
}

function isSameOriginSubmission(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  if (origin && origin !== requestOrigin) return false
  const fetchSite = request.headers.get('sec-fetch-site')
  return !fetchSite || fetchSite === 'same-origin'
}

export async function POST(request: Request) {
  if (!isMarketingPlanConfigured()) {
    return noStore(NextResponse.json({ error: 'Not found.' }, { status: 404 }))
  }
  if (!isSameOriginSubmission(request)) {
    return noStore(NextResponse.json({ error: 'Cross-origin form submissions are not allowed.' }, { status: 403 }))
  }

  let candidate = ''
  try {
    const form = await request.formData()
    candidate = String(form.get('key') || '')
  } catch {
    return noStore(NextResponse.json({ error: 'Expected a form submission.' }, { status: 400 }))
  }

  if (!verifyMarketingPlanKey(candidate)) {
    if (await recordFailedAttempt(request)) {
      const response = NextResponse.json(
        { error: 'Too many failed access attempts. Try again later.' },
        { status: 429 },
      )
      response.headers.set('Retry-After', String(FAILURE_WINDOW_SECONDS))
      return noStore(response)
    }
    return noStore(NextResponse.redirect(new URL('/marketing-plan?denied=1', request.url), 303))
  }

  const session = marketingPlanSessionValue()
  if (!session) return noStore(NextResponse.json({ error: 'Not found.' }, { status: 404 }))

  const response = NextResponse.redirect(new URL('/marketing-plan', request.url), 303)
  response.cookies.set(MARKETING_PLAN_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/marketing-plan',
    maxAge: MARKETING_PLAN_SESSION_MAX_AGE,
  })
  return noStore(response)
}
