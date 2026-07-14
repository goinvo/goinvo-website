import { NextResponse } from 'next/server'
import {
  assertStudioWriterOrApiKey,
  connectionStatus,
  getMarketingWriteClient,
  isQStashConfigured,
  MarketingAuthError,
} from '@/lib/marketing'

// GET /api/marketing/publish/status — connection + queue visibility for the
// social auto-publishing pipeline. Readable by a server caller with
// MARKETING_API_KEY OR a write-capable Studio session (token or the short-lived
// cookie fallback), so the connection indicator works in either Studio mode.

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
    await assertStudioWriterOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const platforms = connectionStatus()

  let dueCount: number | null = null
  try {
    const client = getMarketingWriteClient()
    dueCount = await client.fetch<number>(DUE_COUNT_QUERY, { now: new Date().toISOString() })
  } catch (error) {
    // Sanity not configured / unreachable — report connection status anyway,
    // but log so a real outage is visible in server logs.
    console.warn('Publish status: dueCount lookup failed:', error)
    dueCount = null
  }

  return NextResponse.json({
    platforms,
    dueCount,
    queueConfigured: isQStashConfigured(),
    callbackAuthConfigured: Boolean((process.env.MARKETING_API_KEY || '').trim()),
    // A Sanity webhook is configured outside this application, so this endpoint
    // deliberately does not claim the save-to-schedule trigger is operational.
    triggerVerificationRequired: true,
  })
}
