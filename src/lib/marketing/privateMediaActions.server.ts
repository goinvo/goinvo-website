/**
 * What the Studio can do with a calendar item's private video: watch it,
 * record the client's answer, and — only after an approval, and only on a
 * person's explicit confirmation — copy it to public media for posting.
 *
 * The copy schedules nothing and changes no status: posting stays a separate
 * decision somebody makes on the item. Reads and writes are pinned to the
 * private outreach dataset (`getOutreachClient`), where calendar items live.
 *
 * Injectable deps keep the rules testable without a network
 * (tests/rendomat-private-copy.test.ts).
 */
import 'server-only'
import type { SanityClient } from '@sanity/client'
import { LINKABLE_ITEM_PROJECTION } from './makeInRendomat.server'
import { getOutreachClient } from './outreachClient.server'
import { readPrivateVideo, signPrivateVideoUrl } from './privateMedia.server'
import { publicCopyRefusal, signOffPatch, type LinkableItem } from './rendomatLink'

type Client = Pick<SanityClient, 'fetch' | 'patch'> & { assets: Pick<SanityClient['assets'], 'upload'>; delete: SanityClient['delete'] }

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string }

const ITEM_QUERY = `*[_type == "marketingCalendarItem" && _id == $id][0]${LINKABLE_ITEM_PROJECTION}`

/** Same ceiling as the Rendomat download the file arrived through. */
function maxCopyBytes(): number {
  const raw = Number.parseInt(process.env.RENDOMAT_MAX_ASSET_BYTES || '', 10)
  const fallback = 250 * 1024 * 1024
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 1024 * 1024 * 1024) : fallback
}

async function readItem(client: Pick<SanityClient, 'fetch'>, itemId: string): Promise<LinkableItem | null> {
  const id = String(itemId || '').trim()
  if (!id || id.startsWith('drafts.')) return null
  return client.fetch<LinkableItem | null>(ITEM_QUERY, { id })
}

/** A short-lived URL to watch the item's private video. */
export async function signItemVideo(
  itemId: string,
  deps: { client?: Pick<SanityClient, 'fetch'>; sign?: typeof signPrivateVideoUrl } = {},
): Promise<Result<{ url: string; expiresAt: string }>> {
  const item = await readItem(deps.client || getOutreachClient(), itemId)
  if (!item) return { ok: false, status: 404, error: 'That calendar item is gone.' }
  const pathname = item.privateVideo?.pathname
  if (!pathname) return { ok: false, status: 404, error: 'There is no private video on this item yet.' }
  const signed = await (deps.sign || signPrivateVideoUrl)(pathname)
  return { ok: true, ...signed }
}

/** Record the client's answer on the item's private video. */
export async function recordClientSignOff(
  input: { itemId: string; status: unknown; by: string; byUserId?: string | null; note?: string },
  deps: { client?: Pick<SanityClient, 'fetch' | 'patch'>; now?: () => Date } = {},
): Promise<Result<{ clientSignOff: NonNullable<LinkableItem['clientSignOff']> }>> {
  const client = deps.client || getOutreachClient()
  const item = await readItem(client, input.itemId)
  if (!item) return { ok: false, status: 404, error: 'That calendar item is gone.' }
  const patch = signOffPatch({
    item,
    status: input.status,
    by: input.by,
    byUserId: input.byUserId || undefined,
    note: input.note,
    now: (deps.now || (() => new Date()))(),
  })
  if (!patch.ok) return { ok: false, status: 400, error: patch.error }
  let builder = client.patch(item._id)
  if (item._rev) builder = builder.ifRevisionId(item._rev)
  await builder.set({ clientSignOff: patch.clientSignOff }).commit()
  return { ok: true, clientSignOff: patch.clientSignOff }
}

/**
 * Copy an APPROVED private video into the item's `socialVideo` (a Sanity
 * file asset, reachable by anyone with its link). Requires `confirmed: true`:
 * the Studio asks in words first. Writes `socialVideo` and the copy stamp on
 * `privateVideo` — never status, autoPublish or publishAt.
 */
export async function copyToPublicMedia(
  input: { itemId: string; confirmed: unknown; by: string },
  deps: { client?: Client; read?: typeof readPrivateVideo; now?: () => Date } = {},
): Promise<Result<{ assetId: string }>> {
  if (input.confirmed !== true) {
    return { ok: false, status: 400, error: 'Confirm the copy first: the file becomes reachable by link.' }
  }
  const by = String(input.by || '').replace(/\s+/g, ' ').trim()
  if (!by) return { ok: false, status: 400, error: 'Say who is copying it.' }
  const client = deps.client || (getOutreachClient() as unknown as Client)
  const item = await readItem(client, input.itemId)
  const refusal = publicCopyRefusal(item)
  if (refusal || !item?.privateVideo) return { ok: false, status: item ? 409 : 404, error: refusal || 'That calendar item is gone.' }

  const file = await (deps.read || readPrivateVideo)(item.privateVideo.pathname, maxCopyBytes())
  const asset = await client.assets.upload('file', Buffer.from(new Uint8Array(file.buffer)), {
    filename: `${item._id.replace(/[^A-Za-z0-9_.-]/g, '-')}.mp4`,
    contentType: file.contentType || 'video/mp4',
  })
  try {
    let builder = client.patch(item._id)
    if (item._rev) builder = builder.ifRevisionId(item._rev)
    await builder
      .set({
        socialVideo: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
        'privateVideo.publicCopyAt': (deps.now || (() => new Date()))().toISOString(),
        'privateVideo.publicCopyBy': by.slice(0, 120),
      })
      .commit()
  } catch (error) {
    // Nothing points at the upload: remove it rather than leave a public orphan.
    await client.delete(asset._id).catch(() => undefined)
    throw error
  }
  return { ok: true, assetId: asset._id }
}

/** One error shape for the private-media routes; never a stack or a store detail. */
export function privateMediaFailureStatus(error: unknown): { status: number; error: string } {
  const candidate = (error || {}) as { status?: unknown; statusCode?: unknown; message?: unknown; name?: unknown }
  if (candidate.statusCode === 409 || candidate.status === 409) {
    return { status: 409, error: 'The item changed while you were looking at it. Reload and try again.' }
  }
  return { status: 500, error: 'That did not work. Nothing changed.' }
}
