import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { isPrivateBlobConfigured } from '@/lib/marketing/privateMedia.server'
import { privateMediaFailureStatus, signItemVideo } from '@/lib/marketing/privateMediaActions.server'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

/**
 * POST { itemId } → { url, expiresAt }: a 15-minute, read-only URL for ONE
 * calendar item's private video, scoped to that file's pathname. The item
 * stores only the pathname; this is the one way to watch it. Writers only,
 * since the video may still be waiting on a client's sign-off.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    if (!isPrivateBlobConfigured()) {
      return privateMarketingJson({ error: 'The private video store is not connected.' }, { status: 503 })
    }
    const body = await readBoundedJson(request, 2_000)
    if (!isPlainRecord(body) || typeof body.itemId !== 'string') throw new MarketingRequestError('Send `itemId`.', 400)
    const result = await signItemVideo(body.itemId)
    if (!result.ok) return privateMarketingJson({ error: result.error }, { status: result.status })
    return privateMarketingJson({ url: result.url, expiresAt: result.expiresAt })
  } catch (error) {
    if (error instanceof MarketingAuthError) return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
    if (error instanceof MarketingRequestError) return privateMarketingJson({ error: error.message }, { status: error.status })
    console.error('Private video sign failed.', error instanceof Error ? error.name : 'UnknownError')
    const failure = privateMediaFailureStatus(error)
    return privateMarketingJson({ error: failure.error }, { status: failure.status })
  }
}
