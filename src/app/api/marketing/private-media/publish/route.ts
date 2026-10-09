import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { isPrivateBlobConfigured } from '@/lib/marketing/privateMedia.server'
import { copyToPublicMedia, privateMediaFailureStatus } from '@/lib/marketing/privateMediaActions.server'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

/**
 * POST { itemId, confirmed: true, by } copies an APPROVED private video into
 * the item's public `socialVideo`. Refused without the client's approval or
 * without `confirmed: true`. It schedules nothing and changes no status.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    if (!isPrivateBlobConfigured()) {
      return privateMarketingJson({ error: 'The private video store is not connected.' }, { status: 503 })
    }
    const body = await readBoundedJson(request, 2_000)
    if (!isPlainRecord(body) || typeof body.itemId !== 'string') throw new MarketingRequestError('Send `itemId`.', 400)
    const result = await copyToPublicMedia({
      itemId: body.itemId,
      confirmed: body.confirmed,
      by: typeof body.by === 'string' ? body.by : '',
    })
    if (!result.ok) return privateMarketingJson({ error: result.error }, { status: result.status })
    return privateMarketingJson({ assetId: result.assetId })
  } catch (error) {
    if (error instanceof MarketingAuthError) return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
    if (error instanceof MarketingRequestError) return privateMarketingJson({ error: error.message }, { status: error.status })
    console.error('Public copy failed.', error instanceof Error ? error.name : 'UnknownError')
    const failure = privateMediaFailureStatus(error)
    return privateMarketingJson({ error: failure.error }, { status: failure.status })
  }
}
