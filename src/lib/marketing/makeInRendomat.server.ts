/**
 * *Export to Rendomat*, the write behind the button.
 *
 * Reads the calendar item as it is NOW (so edits made on the Calendar since
 * the card was posted are what get made), refuses anything that is missing,
 * binned or not a video, asks Rendomat for a project in the GoInvo
 * organization, and records the link on the item.
 *
 * Idempotent twice over: an item that already carries a Rendomat project is
 * answered from the record without calling Rendomat, and Rendomat itself
 * answers a repeated `external_ref` with the project it already made. The
 * link is written with `setIfMissing`, so two presses racing each other can
 * never leave the item pointing at two projects.
 *
 * Pinned to the private outreach dataset (`getOutreachClient`), like every
 * other Marqueta press: if the router's escape hatch ever pointed internal
 * types back at the public dataset, this reads nothing and refuses — it never
 * writes a project link into a world-readable record.
 *
 * The client and Rendomat calls are injectable so the rules are tested
 * without a network (tests/make-in-rendomat.test.ts).
 */
import 'server-only'
import type { SanityClient } from '@sanity/client'
import { draftDocIdForMessage } from './ideaCapture'
import { getOutreachClient } from './outreachClient.server'
import {
  createRendomatVideo,
  isRendomatCreateConfigured,
  rendomatClientId,
  type RendomatCreateBody,
  type RendomatCreateResult,
} from './rendomat'
import {
  buildCreateVideoBody,
  linkFieldsFor,
  makeInRendomatRefusal,
  rendomatProjectUrlFor,
  rendomatRefusalLine,
  type LinkableItem,
} from './rendomatLink'

export const LINKABLE_ITEM_PROJECTION = `{
  _id, _rev, title, status, contentType, contentDraft,
  draftFrames[]{ title, body, visualDirection },
  rendomatVideoId, rendomatProjectUrl,
  privateVideo, clientSignOff, slackChannel, slackThreadTs,
  "hasSocialVideo": defined(socialVideo.asset)
}`

export type MakeInRendomatResult =
  | { ok: true; projectUrl: string; existing: boolean; title: string }
  /** `kind` decides how the presser is told: a refusal or a fit problem is theirs to fix; a failure is ours. */
  | { ok: false; kind: 'refused' | 'tooLong' | 'failed'; message: string }

type Deps = {
  client?: Pick<SanityClient, 'fetch' | 'patch'>
  create?: (body: RendomatCreateBody) => Promise<RendomatCreateResult>
  configured?: () => boolean
  clientId?: () => number | null
  apiBase?: string
  now?: () => Date
}

export async function makeInRendomat(
  input: { channel: string; ts: string },
  deps: Deps = {},
): Promise<MakeInRendomatResult> {
  const configured = deps.configured || isRendomatCreateConfigured
  const clientId = (deps.clientId || rendomatClientId)()
  if (!configured() || clientId === null) {
    return { ok: false, kind: 'failed', message: 'Rendomat isn’t connected here yet.' }
  }
  const client = deps.client || getOutreachClient()
  const create = deps.create || createRendomatVideo
  const now = (deps.now || (() => new Date()))()
  const apiBase = deps.apiBase ?? (process.env.RENDOMAT_API_BASE || '')

  const id = draftDocIdForMessage(input)
  const item = await client.fetch<LinkableItem | null>(`*[_id == $id][0]${LINKABLE_ITEM_PROJECTION}`, { id })

  const refusal = makeInRendomatRefusal(item)
  if (refusal || !item) return { ok: false, kind: 'refused', message: refusal || 'That draft is gone.' }

  if (item.rendomatVideoId && item.rendomatProjectUrl) {
    return { ok: true, projectUrl: item.rendomatProjectUrl, existing: true, title: item.title || '' }
  }

  const body = buildCreateVideoBody(item, clientId)
  if (!body.slides.length) {
    return { ok: false, kind: 'refused', message: 'There’s no script on that item to make. Add its frames on the Calendar first.' }
  }

  const created = await create(body)
  if (!created.ok) {
    if (created.status === 400 && created.problems.length) {
      return { ok: false, kind: 'tooLong', message: rendomatRefusalLine(created.problems, body.slides) }
    }
    return { ok: false, kind: 'failed', message: `Rendomat answered ${created.status || 'nothing'}.` }
  }

  const projectUrl = rendomatProjectUrlFor(created.video, apiBase)
  await client.patch(item._id).setIfMissing(linkFieldsFor(created.video, projectUrl, now)).commit()
  // Read back what is stored: if a racing press linked first, its link is the one to show.
  const stored = await client.fetch<{ rendomatProjectUrl?: string } | null>(`*[_id == $id][0]{ rendomatProjectUrl }`, { id })
  return {
    ok: true,
    projectUrl: stored?.rendomatProjectUrl || projectUrl,
    existing: created.existing,
    title: item.title || '',
  }
}
