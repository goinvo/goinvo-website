import {
  assertStudioOrApiKey,
  getMarketingWriteClient,
  MarketingAuthError,
} from '@/lib/marketing'
import {
  buildPublishContent,
  resolveSocialPlatform,
  SINGLE_ITEM_QUERY,
  validatePublishContent,
  validatePublishableItem,
} from '@/lib/marketing/publishers'
import { isValidMarketingDocumentId } from '@/lib/marketing/apiBoundary'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

// GET /api/marketing/publish/preview?id=<calendarItemId>
//
// Resolves EXACTLY what a calendar item would publish (caption, media, link,
// platform) so the Studio can preview a social post before it goes live — using
// the same buildPublishContent the worker uses, so the preview can't drift from
// the real post. Read-only (no writes, no scheduling). Auth: Studio session or
// MARKETING_API_KEY.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await assertStudioOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: 401 })
    }
    throw error
  }

  const searchParams = new URL(req.url).searchParams
  if ([...searchParams.keys()].some((key) => key !== 'id') || searchParams.getAll('id').length > 1) {
    return privateMarketingJson({ error: 'Only one `id` query parameter is allowed.' }, { status: 400 })
  }
  const id = searchParams.get('id')?.trim()
  if (!id) return privateMarketingJson({ error: 'Missing ?id=' }, { status: 400 })
  if (!isValidMarketingDocumentId(id)) {
    return privateMarketingJson({ error: 'Invalid calendar item ID.' }, { status: 400 })
  }

  let client: ReturnType<typeof getMarketingWriteClient>
  try {
    client = getMarketingWriteClient()
  } catch {
    return privateMarketingJson({ error: 'Sanity is not configured.' }, { status: 503 })
  }

  let item: Parameters<typeof buildPublishContent>[0] | null
  try {
    item = await client.fetch<Parameters<typeof buildPublishContent>[0] | null>(SINGLE_ITEM_QUERY, { id })
  } catch (error) {
    console.error('Publish preview lookup failed:', error)
    return privateMarketingJson({ error: 'Calendar item lookup failed.' }, { status: 503 })
  }
  if (!item) return privateMarketingJson({ error: 'Calendar item not found.' }, { status: 404 })

  let platform: ReturnType<typeof resolveSocialPlatform>
  try {
    platform = resolveSocialPlatform(item)
  } catch {
    return privateMarketingJson({ error: 'Calendar item publishing fields are malformed.' }, { status: 422 })
  }
  const validationPlatform = platform || 'linkedin'
  const itemValidation = validatePublishableItem(validationPlatform, item)
  let content: ReturnType<typeof buildPublishContent>
  try {
    content = itemValidation ? { text: '', media: [] } : buildPublishContent(item)
  } catch {
    return privateMarketingJson({ error: 'Calendar item publishing content is malformed.' }, { status: 422 })
  }
  const validationError = itemValidation || validatePublishContent(validationPlatform, content)
  const hasVideo = content.media.some((media) => media.type === 'video')
  const isReelType = item.contentType === 'reel' || item.contentType === 'video'

  // Surface the same things the publish worker / platform adapters would reject
  // or that hurt the post, so the editor sees them BEFORE it publishes.
  const warnings: string[] = []
  if (validationError) warnings.push(validationError)
  if (!platform) {
    warnings.push(
      'This item’s channel is not a social publishing channel (LinkedIn or Instagram), so it will not auto-publish.',
    )
  }
  if (platform === 'instagram' && content.media.length === 0) {
    warnings.push('Instagram requires at least one image or video — this post would be rejected.')
  }
  if (platform === 'instagram' && isReelType && !hasVideo) {
    warnings.push('This is a Reel/video item but has no video asset (set socialVideo) — it can’t publish as a Reel.')
  }
  if (!content.text.trim() && content.media.length === 0) {
    warnings.push('No caption and no media — there is nothing to post.')
  }
  if (!item.publishedUrl && item.workingUrl) {
    warnings.push('This saved post will use its Working URL because no Published URL is set. Confirm that the destination is public before publishing.')
  }
  content.media.forEach((media, index) => {
    if (media.type === 'image' && !media.altText) {
      warnings.push(`Image ${index + 1} has no alt text (add draftAltText / per-frame alt for accessibility).`)
    }
  })

  return privateMarketingJson({
    id,
    title: item.title ?? null,
    status: item.status ?? null,
    contentType: item.contentType ?? null,
    platform,
    content,
    contentSuppressed: Boolean(itemValidation),
    warnings,
  })
}
