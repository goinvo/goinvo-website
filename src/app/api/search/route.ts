import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getSearchIndex, resolveAnchor, type SearchIndexItem } from '@/lib/search/index'
import { recall } from '@/lib/search/lexical'
import { selectAndDescribe } from '@/lib/search/aiSearch'
import { groundedBlurb, searchCacheKey, type BlurbSource } from '@/lib/search/grounding'

export const maxDuration = 30

/**
 * AI project search for the homepage search band.
 *
 * POST { query, instant? } →
 *   { results, aiGenerated, insight?, persona?, gapNote?, alsoRelated?, reason? }
 *
 * instant: true skips the AI stage entirely (fast lexical-only pass the client
 * renders while the AI answer is in flight — two-phase render).
 *
 * Honest fallback contract (from the persona study):
 * - no lexical matches        → results: [],   reason: 'no-matches'
 * - Claude unavailable/error  → keyword top 9, reason: 'ai-unavailable'
 * - Claude says nothing fits  → results: [],   reason: 'no-matches' (aiGenerated, persona still included)
 * Every AI blurb passes the grounding guard (checkBlurbGrounding); a blurb
 * that asserts unsourced claims is replaced by the project's own caption and
 * marked blurbSource: 'caption'. Sparse AI selections are backfilled with
 * caption-only lexical neighbors under alsoRelated. Rate limiting is generous
 * and fail-open — a limited visitor gets keyword results, never an error wall.
 */

interface SearchResponseItem {
  slug: string
  href: string
  title: string
  caption: string
  image?: string
  kind: 'work' | 'vision'
  blurb?: string
  blurbSource?: BlurbSource
  fit?: 'direct' | 'adjacent'
  /** When set, href carries a #fragment that auto-scrolls to this section. */
  anchorTitle?: string
}

const RATE_PER_MINUTE = 20
const RATE_PER_DAY = 300
const CACHE_TTL_SECONDS = 24 * 60 * 60
const MIN_RESULTS_BEFORE_BACKFILL = 3

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

function toResponseItem(item: SearchIndexItem): SearchResponseItem {
  return {
    slug: item.slug,
    href: item.href,
    title: item.title,
    caption: item.caption,
    image: item.image,
    kind: item.kind,
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
  let instant = false
  try {
    const body = JSON.parse(raw) as { query?: unknown; instant?: unknown }
    query = typeof body.query === 'string' ? body.query.trim() : ''
    instant = body.instant === true
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

  // Instant pass: lexical-only, no AI, no KV — the client's first paint while
  // the full AI request runs.
  if (instant) {
    return NextResponse.json({
      results: shortlist.slice(0, 9).map((s) => toResponseItem(s.item)),
      aiGenerated: false,
      reason: 'instant',
    })
  }

  // Cached AI responses make repeat + sector-preset queries instant and free.
  // Keys are environment-scoped so preview/dev entries never serve production.
  const cacheKey = searchCacheKey(createHash('sha256').update(query.toLowerCase()).digest('hex').slice(0, 24))
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
    .map((r): SearchResponseItem | null => {
      const item = bySlug.get(r.slug)
      if (!item) return null
      // Grounding guard: unsourced claims fall back to the caption.
      const blurb = groundedBlurb(r.blurb, item, query)
      // Deep link: only anchors that verifiably exist on the page survive.
      const section = item.href.startsWith('/') ? resolveAnchor(item, r.anchor) : null
      return {
        ...toResponseItem(item),
        ...(section ? { href: `${item.href}#${section.id}`, anchorTitle: section.title } : {}),
        blurb: blurb.text,
        blurbSource: blurb.source,
        fit: r.fit,
      }
    })
    .filter((r): r is SearchResponseItem => r !== null)

  if (results.length === 0) {
    // Persona still included — specialist buyers must stay measurable even
    // when the answer is "nothing fits" (a round-2 finding).
    const payload = {
      results: [] as SearchResponseItem[],
      aiGenerated: true,
      reason: 'no-matches',
      insight: selection.insight,
      persona: selection.persona,
      gapNote: selection.gapNote,
    }
    await kv(['SET', cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS])
    return NextResponse.json(payload)
  }

  // Sparse selections read as thin inventory: backfill with the next lexical
  // neighbors, caption-only, honestly separated under alsoRelated.
  const selected = new Set(results.map((r) => r.slug))
  const alsoRelated =
    results.length < MIN_RESULTS_BEFORE_BACKFILL
      ? shortlist
          .filter((s) => !selected.has(s.item.slug))
          .slice(0, MIN_RESULTS_BEFORE_BACKFILL - results.length)
          .map((s) => toResponseItem(s.item))
      : []

  const payload = {
    results,
    aiGenerated: true,
    insight: selection.insight,
    persona: selection.persona,
    gapNote: selection.gapNote,
    ...(alsoRelated.length > 0 ? { alsoRelated } : {}),
  }

  await kv(['SET', cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS])
  return NextResponse.json(payload)
}
