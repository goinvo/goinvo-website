import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getSearchIndex, type SearchIndexItem } from '@/lib/search/index'
import { recall } from '@/lib/search/lexical'
import { selectAndDescribe } from '@/lib/search/aiSearch'

export const maxDuration = 30

/**
 * AI project search for the homepage search band.
 *
 * POST { query } →
 *   { results, aiGenerated, insight?, persona?, reason? }
 *
 * Honest fallback contract (fixes the Gatsby prototype's failure modes):
 * - no lexical matches        → results: [],   reason: 'no-matches'
 * - Claude unavailable/error  → keyword top 9, reason: 'ai-unavailable'
 * - Claude says nothing fits  → results: [],   reason: 'no-matches' (aiGenerated)
 * Rate limiting is generous (Haiku calls cost fractions of a cent) and
 * fail-open — a limited visitor gets keyword results, never an error wall.
 */

interface SearchResponseItem {
  slug: string
  href: string
  title: string
  caption: string
  image?: string
  blurb?: string
}

const RATE_PER_MINUTE = 20
const RATE_PER_DAY = 300
const CACHE_TTL_SECONDS = 24 * 60 * 60

// --- Minimal Upstash/Vercel KV REST helper (fail-open on any error) ---------

async function kv(command: (string | number)[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: unknown }
    return data.result ?? null
  } catch {
    return null
  }
}

/** True when the caller is over limit. Fail-open: KV trouble means allowed. */
async function overRateLimit(ip: string): Promise<boolean> {
  const now = new Date()
  const minuteKey = `ais:m:${ip}:${Math.floor(now.getTime() / 60_000)}`
  const dayKey = `ais:d:${ip}:${now.toISOString().slice(0, 10)}`

  const minuteCount = (await kv(['INCR', minuteKey])) as number | null
  if (minuteCount === 1) await kv(['EXPIRE', minuteKey, 90])
  const dayCount = (await kv(['INCR', dayKey])) as number | null
  if (dayCount === 1) await kv(['EXPIRE', dayKey, 60 * 60 * 25])

  return (
    (typeof minuteCount === 'number' && minuteCount > RATE_PER_MINUTE) ||
    (typeof dayCount === 'number' && dayCount > RATE_PER_DAY)
  )
}

// ---------------------------------------------------------------------------

function toResponseItem(item: SearchIndexItem, blurb?: string): SearchResponseItem {
  return {
    slug: item.slug,
    href: item.href,
    title: item.title,
    caption: item.caption,
    image: item.image,
    blurb,
  }
}

export async function POST(request: NextRequest) {
  // Same-origin guard: browser calls from our own pages only.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const raw = await request.text()
  if (raw.length > 2_000) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }
  let query = ''
  try {
    const body = JSON.parse(raw) as { query?: unknown }
    query = typeof body.query === 'string' ? body.query.trim() : ''
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  if (query.length < 2 || query.length > 200) {
    return NextResponse.json({ error: 'query must be 2–200 characters' }, { status: 400 })
  }

  const index = await getSearchIndex()
  const shortlist = recall(query, index, 20)

  if (shortlist.length === 0) {
    return NextResponse.json({ results: [], aiGenerated: false, reason: 'no-matches' })
  }

  // Cached AI responses make repeat + sector-preset queries instant and free.
  const cacheKey = `ais:q:${createHash('sha256').update(query.toLowerCase()).digest('hex').slice(0, 24)}`
  const cached = (await kv(['GET', cacheKey])) as string | null
  if (cached) {
    try {
      return NextResponse.json({ ...(JSON.parse(cached) as object), cached: true })
    } catch {
      /* fall through to fresh compute */
    }
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const limited = await overRateLimit(ip)

  const selection = limited ? null : await selectAndDescribe(query, shortlist.map((s) => s.item))

  if (!selection) {
    return NextResponse.json({
      results: shortlist.slice(0, 9).map((s) => toResponseItem(s.item)),
      aiGenerated: false,
      reason: limited ? 'rate-limited' : 'ai-unavailable',
    })
  }

  const bySlug = new Map(shortlist.map((s) => [s.item.slug, s.item]))
  const results = selection.results
    .map((r) => {
      const item = bySlug.get(r.slug)
      return item ? toResponseItem(item, r.blurb) : null
    })
    .filter((r): r is SearchResponseItem => r !== null)

  const payload =
    results.length === 0
      ? { results: [], aiGenerated: true, reason: 'no-matches', insight: selection.insight }
      : {
          results,
          aiGenerated: true,
          insight: selection.insight,
          persona: selection.persona,
        }

  await kv(['SET', cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS])
  return NextResponse.json(payload)
}
