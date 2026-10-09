import { assertStudioWriterOrApiKey, MarketingAuthError, verifiedStudioUserId } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { privateMediaFailureStatus, recordClientSignOff } from '@/lib/marketing/privateMediaActions.server'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

/**
 * POST { itemId, status: 'pending'|'approved'|'changesRequested', by, note? }
 * records the client's answer on an item's private video. `by` is the name
 * shown; from the Studio the verified Sanity user id is stamped beside it, so
 * the record says who really pressed it whatever name was typed.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    const body = await readBoundedJson(request, 4_000)
    if (!isPlainRecord(body) || typeof body.itemId !== 'string') throw new MarketingRequestError('Send `itemId`.', 400)
    const result = await recordClientSignOff({
      itemId: body.itemId,
      status: body.status,
      by: typeof body.by === 'string' ? body.by.slice(0, 120) : '',
      byUserId: await verifiedStudioUserId(request),
      note: typeof body.note === 'string' ? body.note : undefined,
    })
    if (!result.ok) return privateMarketingJson({ error: result.error }, { status: result.status })
    return privateMarketingJson({ clientSignOff: result.clientSignOff })
  } catch (error) {
    if (error instanceof MarketingAuthError) return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
    if (error instanceof MarketingRequestError) return privateMarketingJson({ error: error.message }, { status: error.status })
    console.error('Client sign-off failed.', error instanceof Error ? error.name : 'UnknownError')
    const failure = privateMediaFailureStatus(error)
    return privateMarketingJson({ error: failure.error }, { status: failure.status })
  }
}
