import { NextResponse } from 'next/server'
import {
  assertMarketingApiKey,
  connectionStatus,
  getMarketingWriteClient,
  MarketingAuthError,
} from '@/lib/marketing'

// GET /api/marketing/publish/status — connection + queue visibility for the
// social auto-publishing pipeline. Key-gated (it reveals which platforms are
// configured). Powers a Studio "connected / N due" indicator.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Filter-only mirror of DUE_ITEMS_QUERY (no projection) for a cheap count.
const DUE_COUNT_QUERY = `count(*[
  _type == "marketingCalendarItem"
  && autoPublish == true
  && status == "scheduled"
  && defined(publishAt)
  && publishAt <= $now
  && (!defined(publishState) || publishState == "queued")
])`

export async function GET(req: Request) {
  try {
    assertMarketingApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  const platforms = connectionStatus()

  let dueCount: number | null = null
  try {
    const client = getMarketingWriteClient()
    dueCount = await client.fetch<number>(DUE_COUNT_QUERY, { now: new Date().toISOString() })
  } catch {
    // Sanity not configured / unreachable — report connection status anyway.
    dueCount = null
  }

  return NextResponse.json({ platforms, dueCount })
}
