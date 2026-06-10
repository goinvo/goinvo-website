import { NextResponse } from 'next/server'
import {
  assertStudioOrApiKey,
  buildCreatePayload,
  buildLinkFromPost,
  getMarketingWriteClient,
  MarketingAuthError,
  MarketingValidationError,
  type CalendarItemForLink,
} from '@/lib/marketing'

// POST /api/marketing/clone/link-from-post
//
// Body: { calendarItemId }. Fetches the calendar item (404 if missing), derives
// the marketingLinkItem fields via buildLinkFromPost, and creates the link with
// buildCreatePayload so defaults (order/type) and array keys are applied. The
// new link is linked back to the originating calendar item. Returns
// { id, document }.
//
// Fails closed: a valid marketing API key OR a logged-in Studio session is
// required (401 otherwise).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    await assertStudioOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { calendarItemId } = (body ?? {}) as { calendarItemId?: unknown }
  if (typeof calendarItemId !== 'string' || !calendarItemId.trim()) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `calendarItemId` string.' },
      { status: 400 },
    )
  }

  try {
    const client = getMarketingWriteClient()

    const item = await client.fetch<CalendarItemForLink | null>(
      '*[_type == "marketingCalendarItem" && _id == $id][0]',
      { id: calendarItemId },
    )
    if (!item) {
      return NextResponse.json(
        { error: `No marketingCalendarItem found with _id ${calendarItemId}.` },
        { status: 404 },
      )
    }

    let doc
    try {
      doc = buildCreatePayload('marketingLinkItem', buildLinkFromPost(item))
    } catch (error) {
      if (error instanceof MarketingValidationError) {
        return NextResponse.json({ error: error.message, missing: error.missing }, { status: 422 })
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to build link.' },
        { status: 400 },
      )
    }

    const document = await client.create(doc)
    return NextResponse.json({ id: document._id, document }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create link from post.'
    console.error('Marketing clone link-from-post failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
