/**
 * The linked pass: a finished Rendomat render comes back, PRIVATELY, onto the
 * calendar item it was made for.
 *
 * For every item that carries a Rendomat project link and no private copy yet,
 * ask Rendomat for the video; attach it only when it is rendered, has a file,
 * and was made for THIS item (`external_ref`). The file goes to the private
 * Blob store, and the item gains `privateVideo` + `clientSignOff: pending` —
 * nothing else (`PRIVATE_COPY_FIELDS`). Nothing is scheduled, nothing is made
 * public: that waits for a person to record the client's sign-off.
 *
 * Every item that is not attached says why, so a run that attached nothing
 * explains itself. The patch is guarded by the revision read at the start, so
 * two overlapping runs cannot both attach (the loser's upload landed on the
 * same deterministic pathname and is simply the same file).
 *
 * The client, Rendomat, the store and Slack are injectable so the rules are
 * tested without a network (tests/rendomat-private-copy.test.ts).
 */
import 'server-only'
import type { SanityClient } from '@sanity/client'
import { postSlackMessage } from '@/lib/chat/slack'
import { LINKABLE_ITEM_PROJECTION } from './makeInRendomat.server'
import { MARQUETA_IDENTITY } from './marquetaStyle'
import { getOutreachClient } from './outreachClient.server'
import { isPrivateBlobConfigured, putPrivateVideo } from './privateMedia.server'
import { downloadRendomatAsset, getRendomatVideo, isRendomatConfigured, type RendomatVideo } from './rendomat'
import {
  privateCopyDecision,
  privateCopyPatch,
  privateVideoPathname,
  renderReadyLine,
  type LinkableItem,
} from './rendomatLink'
import { studioViewUrl } from './taskLinks'

export const LINKED_ITEMS_QUERY = `*[
  _type == "marketingCalendarItem" &&
  defined(rendomatProjectUrl) && defined(rendomatVideoId) &&
  !defined(privateVideo.pathname) &&
  status != "canceled"
] | order(rendomatLinkedAt asc) [0...$limit] ${LINKABLE_ITEM_PROJECTION}`

export type LinkedResult = {
  itemId: string
  rendomatVideoId?: string
  action: 'attached' | 'would-attach' | 'skipped' | 'error'
  reason?: string
  announced?: boolean
}

export type LinkedPassReport =
  | { skipped: true; reason: string }
  | { skipped: false; considered: number; attached: number; results: LinkedResult[] }

type Deps = {
  client?: Pick<SanityClient, 'fetch' | 'patch'>
  getVideo?: (id: string) => Promise<RendomatVideo>
  download?: (url: string) => Promise<{ buffer: ArrayBuffer; contentType: string }>
  put?: typeof putPrivateVideo
  announce?: (input: { channel: string; threadTs?: string; text: string }) => Promise<boolean>
  rendomatConfigured?: () => boolean
  blobConfigured?: () => boolean
  now?: () => Date
}

/** Why the linked pass cannot run here, or null when it can. */
export function linkedPassUnavailable(deps: Pick<Deps, 'rendomatConfigured' | 'blobConfigured'> = {}): string | null {
  if (!(deps.rendomatConfigured || isRendomatConfigured)()) return 'Rendomat is not connected (RENDOMAT_API_BASE + RENDOMAT_API_KEY).'
  if (!(deps.blobConfigured || isPrivateBlobConfigured)()) return 'The private video store is not connected (a private Vercel Blob store).'
  return null
}

async function announceInThread(input: { channel: string; threadTs?: string; text: string }): Promise<boolean> {
  // Never without a channel: postSlackMessage would fall back to the website
  // chat's channel, and a client's video must not be announced to visitors.
  if (!input.channel) return false
  const posted = await postSlackMessage({
    channel: input.channel,
    ...(input.threadTs ? { threadTs: input.threadTs } : {}),
    ...MARQUETA_IDENTITY,
    unfurl: false,
    text: input.text,
  })
  return Boolean(posted)
}

function isRevisionConflict(error: unknown): boolean {
  const candidate = (error || {}) as { statusCode?: unknown; status?: unknown; response?: { statusCode?: unknown } }
  return candidate.statusCode === 409 || candidate.status === 409 || candidate.response?.statusCode === 409
}

export async function attachLinkedRenders(
  options: { dryRun?: boolean; limit?: number } = {},
  deps: Deps = {},
): Promise<LinkedPassReport> {
  const unavailable = linkedPassUnavailable(deps)
  if (unavailable) return { skipped: true, reason: unavailable }

  const client = deps.client || getOutreachClient()
  const getVideo = deps.getVideo || getRendomatVideo
  const download = deps.download || downloadRendomatAsset
  const put = deps.put || putPrivateVideo
  const announce = deps.announce || announceInThread
  const now = deps.now || (() => new Date())
  const limit = Math.min(Math.max(1, Math.floor(options.limit || 20)), 100)

  const items = await client.fetch<LinkableItem[]>(LINKED_ITEMS_QUERY, { limit })
  const results: LinkedResult[] = []

  for (const item of items || []) {
    const base = { itemId: item._id, rendomatVideoId: item.rendomatVideoId }
    let video: RendomatVideo
    try {
      video = await getVideo(String(item.rendomatVideoId))
    } catch (error) {
      results.push({ ...base, action: 'error', reason: error instanceof Error ? error.message : 'Rendomat lookup failed.' })
      continue
    }

    const decision = privateCopyDecision(item, video)
    if (!decision.attach) {
      results.push({ ...base, action: 'skipped', reason: decision.reason })
      continue
    }
    if (options.dryRun) {
      results.push({ ...base, action: 'would-attach' })
      continue
    }

    try {
      const file = await download(String(video.download_url))
      const stored = await put({
        pathname: privateVideoPathname(item._id, video.id),
        body: file.buffer,
        contentType: file.contentType || 'video/mp4',
      })
      const patch = privateCopyPatch({
        pathname: stored.pathname,
        contentType: stored.contentType,
        size: stored.size,
        uploadedAt: now().toISOString(),
        rendomatVideoId: String(video.id),
      })
      let builder = client.patch(item._id)
      if (item._rev) builder = builder.ifRevisionId(item._rev)
      await builder.set(patch).commit()

      let announced = false
      if (item.slackChannel) {
        const siteBase = process.env.MARKETING_PUBLIC_BASE_URL
        try {
          announced = await announce({
            channel: item.slackChannel,
            threadTs: item.slackThreadTs,
            text: renderReadyLine({ title: item.title, studioUrl: siteBase ? studioViewUrl(siteBase, 'calendar') : undefined }),
          })
        } catch {
          announced = false
        }
      }
      results.push({ ...base, action: 'attached', announced })
    } catch (error) {
      results.push({
        ...base,
        action: isRevisionConflict(error) ? 'skipped' : 'error',
        reason: isRevisionConflict(error)
          ? 'The item changed while the file was copied; the next run tries again.'
          : error instanceof Error
            ? error.message
            : 'Private copy failed.',
      })
    }
  }

  return {
    skipped: false,
    considered: (items || []).length,
    attached: results.filter((result) => result.action === 'attached').length,
    results,
  }
}
