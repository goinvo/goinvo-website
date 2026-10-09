/**
 * A calendar item and the Rendomat video made from it: the rules, as data.
 *
 * Marqueta drafts a video script; a person presses *Export to Rendomat*; the
 * project is created in the GoInvo organization, and when it has been
 * rendered the file comes back onto the SAME calendar item — privately,
 * because a client may have to sign off on it before anyone outside the
 * studio sees it.
 *
 * Three promises hold that together, and each is a function here with a test
 * (tests/rendomat-link.test.ts):
 *
 *   1. The slides are built from the RECORD at press time, so edits made on
 *      the Calendar count — never from the Slack card, which is a snapshot.
 *   2. A linked item is attach-only: the private copy writes `privateVideo`
 *      and `clientSignOff` and nothing else. Never status, autoPublish,
 *      publishAt, title, contentDraft or socialVideo, and nothing is ever
 *      scheduled. Nothing Marqueta drafts posts itself.
 *   3. A copy reaches Sanity's public CDN only after a person has recorded the
 *      client's sign-off AND confirmed the copy.
 *
 * Pure: no fetch, no environment.
 */

import type { RendomatCreateBody, RendomatProblem, RendomatSlide, RendomatVideo } from './rendomat'
import { escapeSlackText, slackLink } from './slackText'
import { VIEW_TITLE } from './marquetaStyle'

/** The brand kit Rendomat lays GoInvo's slides out with. A Rendomat built-in, not a secret. */
export const RENDOMAT_BRAND_KIT_ID = 'goinvo-health'

/** Calendar content types that are a video, and so can be made in Rendomat. */
export const MAKEABLE_CONTENT_TYPES = ['video', 'reel'] as const

/** A draft frame as the calendar stores it. */
export type StoredFrame = { title?: string | null; body?: string | null; visualDirection?: string | null }

/** What the press and the private copy read from a calendar item. */
export type LinkableItem = {
  _id: string
  _rev?: string
  title?: string
  status?: string
  contentType?: string
  contentDraft?: string
  draftFrames?: StoredFrame[] | null
  rendomatVideoId?: string
  rendomatProjectUrl?: string
  privateVideo?: PrivateVideo | null
  clientSignOff?: ClientSignOff | null
  slackChannel?: string
  slackThreadTs?: string
  hasSocialVideo?: boolean
}

// ── Making the video ────────────────────────────────────────────────────────

/**
 * Why this item cannot be made in Rendomat, in words for the person who
 * pressed; null when it can. A missing item, a binned one, and anything that
 * is not a video are refused before anything is sent.
 */
export function makeInRendomatRefusal(item: LinkableItem | null | undefined): string | null {
  if (!item) return 'That draft isn’t on the Calendar any more — someone may have deleted it.'
  if (item.status === 'canceled') return 'That draft was binned. Bring it back on the Calendar first.'
  if (!(MAKEABLE_CONTENT_TYPES as readonly string[]).includes(String(item.contentType || ''))) {
    return 'Only a video script can be made in Rendomat.'
  }
  return null
}

const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

/**
 * A script that was only ever stored as flattened text — the shape Slack
 * shows (`*Hook:* …`, `*Beat name*` then its lines, `*Close:* …`) — read back
 * into frames. Used only when the item has no draft frames: a draft filed
 * before frames were kept, or one somebody wrote by hand.
 */
export function framesFromFlattenedScript(flattened: string): StoredFrame[] {
  const frames: StoredFrame[] = []
  for (const paragraph of String(flattened || '').split(/\n\s*\n/)) {
    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!lines.length) continue
    const hook = /^\*Hook:\*\s*(.*)$/i.exec(lines[0])
    const close = /^\*Close:\*\s*(.*)$/i.exec(lines[0])
    const named = /^\*([^*]+)\*$/.exec(lines[0])
    if (hook) frames.push({ title: 'Hook', body: [hook[1], ...lines.slice(1)].join(' ') })
    else if (close) frames.push({ title: 'Close', body: [close[1], ...lines.slice(1)].join(' ') })
    else if (named && lines.length > 1) frames.push({ title: named[1], body: lines.slice(1).join(' ') })
    else frames.push({ title: '', body: lines.join(' ') })
  }
  return frames
}

/**
 * The slides for Rendomat, from the record as it is now.
 *
 * Position decides the role: the first frame is the cover (the hook), the
 * last is the call to action (the close), everything between is a point. A
 * slide shows the frame's on-screen line (its visual direction); where there
 * is none it falls back to what is said, and Rendomat — the only judge of what
 * fits — refuses it by name if it is too long, rather than this side
 * guessing at a budget that could drift from Rendomat's layout.
 */
export function slidesFromItem(item: Pick<LinkableItem, 'draftFrames' | 'contentDraft'>): RendomatSlide[] {
  const stored = (item.draftFrames || []).filter((frame) => text(frame?.body) || text(frame?.visualDirection))
  const frames = stored.length ? stored : framesFromFlattenedScript(item.contentDraft || '')
  return frames.map((frame, index): RendomatSlide => {
    const spoken = text(frame.body)
    const onScreen = text(frame.visualDirection)
    const label = text(frame.title)
    const role: RendomatSlide['role'] = index === 0 ? 'cover' : index === frames.length - 1 ? 'cta' : 'point'
    if (role === 'point') {
      return {
        role,
        title: onScreen || label || spoken,
        // The label is the kicker only when it is not already the title (no on-screen line).
        ...(label && onScreen ? { kicker: label } : {}),
        ...(spoken ? { narration: spoken } : {}),
      }
    }
    // "Hook" and "Close" name the frame, not its content, so they never become the slide's words.
    return { role, title: onScreen || spoken, ...(spoken ? { narration: spoken } : {}) }
  })
}

/** The request body for POST /api/v1/videos, script mode. */
export function buildCreateVideoBody(item: LinkableItem, clientId: number): RendomatCreateBody {
  return {
    mode: 'script',
    client_id: clientId,
    title: text(item.title) || 'Video from Marqueta',
    aspect_ratio: '9:16',
    brand_kit_id: RENDOMAT_BRAND_KIT_ID,
    external_ref: item._id,
    slides: slidesFromItem(item),
  }
}

/** "the hook", "the close", "the “Why pilots stall” beat", "beat 3". */
export function slideName(slides: RendomatSlide[], index: number): string {
  const slide = slides[index]
  if (!slide) return `slide ${index + 1}`
  if (slide.role === 'cover') return 'the hook'
  if (slide.role === 'cta') return 'the close'
  return slide.kicker ? `the “${escapeSlackText(slide.kicker)}” beat` : `beat ${index}`
}

/**
 * Rendomat's refusal, said plainly to the person who pressed: which part of
 * the script, Rendomat's own reason (a whole sentence, written to be shown),
 * and what to do. The draft is untouched, so it says so.
 */
export function rendomatRefusalLine(problems: RendomatProblem[], slides: RendomatSlide[]): string {
  const onSlide = problems.find((problem) => problem.slide !== null)
  const calendar = VIEW_TITLE.calendar
  if (onSlide && onSlide.slide !== null) {
    const name = slideName(slides, onSlide.slide)
    const capitalised = name.charAt(0).toUpperCase() + name.slice(1)
    const reason = escapeSlackText(onSlide.reason)
    const sentence = reason.charAt(0).toUpperCase() + reason.slice(1)
    return `${capitalised} is too long for a slide. ${sentence} Shorten it on the ${calendar} and press again — nothing was made.`
  }
  const reason = problems[0]?.reason ? ` ${escapeSlackText(problems[0].reason)}` : ''
  return `Rendomat didn’t make that video.${reason} The draft is still on the ${calendar} — nothing was made.`
}

/** Where a person opens the project: Rendomat's own link, else its editor route. '' without a usable URL. */
export function rendomatProjectUrlFor(video: Pick<RendomatVideo, 'id' | 'editor_url'>, apiBase: string): string {
  const editor = text(video.editor_url)
  if (/^https?:\/\//i.test(editor)) return editor
  const base = text(apiBase).replace(/\/$/, '')
  return /^https?:\/\//i.test(base) ? `${base}/videos/${encodeURIComponent(String(video.id))}` : ''
}

/** The three fields a successful press records on the item, and only those. */
export function linkFieldsFor(video: Pick<RendomatVideo, 'id'>, projectUrl: string, now: Date) {
  return {
    rendomatVideoId: String(video.id),
    rendomatProjectUrl: projectUrl,
    rendomatLinkedAt: now.toISOString(),
  }
}

// ── The private copy of a finished render ───────────────────────────────────

/** The private file attached to a calendar item. `pathname` is a key in the private Blob store, never a URL. */
export type PrivateVideo = {
  pathname: string
  contentType: string
  size: number
  uploadedAt: string
  rendomatVideoId: string
  /** Set once a person copied it to public media for posting. */
  publicCopyAt?: string
  publicCopyBy?: string
}

export const SIGN_OFF_STATUSES = ['pending', 'approved', 'changesRequested'] as const
export type SignOffStatus = (typeof SIGN_OFF_STATUSES)[number]

export type ClientSignOff = {
  status: SignOffStatus
  by?: string
  byUserId?: string
  at?: string
  note?: string
}

/**
 * The ONLY fields the private copy writes. Pinned by a test: adding status,
 * autoPublish, publishAt, title, contentDraft or socialVideo here would let a
 * finished render schedule or publish itself.
 */
export const PRIVATE_COPY_FIELDS = ['privateVideo', 'clientSignOff'] as const

/** Fields a linked render must never touch. */
export const NEVER_WRITTEN_BY_A_RENDER = ['status', 'autoPublish', 'publishAt', 'title', 'contentDraft', 'socialVideo'] as const

/** Where the private file lives in the Blob store: one folder per calendar item. */
export function privateVideoPathname(itemId: string, videoId: number | string): string {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 120) || 'item'
  return `marketing/rendomat/${safe(itemId)}/${safe(String(videoId))}.mp4`
}

export type PrivateCopyDecision = { attach: true } | { attach: false; reason: string }

/**
 * Should this render be copied onto this item? Every check names the reason
 * it said no, so a run that attached nothing explains itself. The external
 * ref is the binding check: a video made for another item is never attached
 * here, whatever ids say.
 */
export function privateCopyDecision(item: LinkableItem, video: Pick<RendomatVideo, 'id' | 'status' | 'download_url' | 'external_ref'>): PrivateCopyDecision {
  if (item.status === 'canceled') return { attach: false, reason: 'The draft was binned.' }
  if (item.privateVideo?.pathname) return { attach: false, reason: 'Already attached.' }
  if (String(video.id) !== String(item.rendomatVideoId || '')) {
    return { attach: false, reason: 'The Rendomat video is not the one this item links to.' }
  }
  if ((video.external_ref || '') !== item._id) {
    return { attach: false, reason: 'The Rendomat video was made for a different calendar item.' }
  }
  if (video.status !== 'completed') return { attach: false, reason: `Not rendered yet (Rendomat says “${text(video.status) || 'unknown'}”).` }
  if (!text(video.download_url)) return { attach: false, reason: 'Rendered, but Rendomat has no file for it yet.' }
  return { attach: true }
}

/** The patch for a private copy: exactly `PRIVATE_COPY_FIELDS`, and sign-off starts over. */
export function privateCopyPatch(input: Omit<PrivateVideo, 'publicCopyAt' | 'publicCopyBy'>): {
  privateVideo: PrivateVideo
  clientSignOff: ClientSignOff
} {
  return {
    privateVideo: {
      pathname: input.pathname,
      contentType: input.contentType || 'video/mp4',
      size: input.size,
      uploadedAt: input.uploadedAt,
      rendomatVideoId: input.rendomatVideoId,
    },
    clientSignOff: { status: 'pending' },
  }
}

/**
 * The older publish_at ingest, for one video: may it proceed? A video Marqueta
 * linked to an item (its external ref, or an item found that carries a
 * Rendomat project link) is the linked pass's to attach — privately — and the
 * publish_at pass must never turn it into a public, auto-posting Reel.
 */
export function publishAtPassDecision(
  video: Pick<RendomatVideo, 'external_ref'>,
  existingItem: Pick<LinkableItem, 'rendomatProjectUrl'> | null,
  // Off unless switched on (owner, 2026-10-06: "Turn the old path off"): with
  // it off, no Rendomat video is copied to the public CDN or scheduled to post.
  opts: { autopost: boolean } = { autopost: process.env.RENDOMAT_AUTOPOST_INGEST === 'on' },
): { proceed: true } | { proceed: false; reason: string } {
  if (text(video.external_ref)) return { proceed: false, reason: 'Made for a calendar item; attached privately by the linked pass.' }
  if (text(existingItem?.rendomatProjectUrl)) return { proceed: false, reason: 'Linked to a Marqueta draft; attached privately by the linked pass.' }
  if (!opts.autopost) return { proceed: false, reason: 'Auto-posting Rendomat videos is off (RENDOMAT_AUTOPOST_INGEST is not "on").' }
  return { proceed: true }
}

/** What Marqueta says in the draft's thread once the render is attached. */
export function renderReadyLine(input: { title?: string; studioUrl?: string }): string {
  const calendar = input.studioUrl ? slackLink(input.studioUrl, VIEW_TITLE.calendar) : VIEW_TITLE.calendar
  const title = input.title ? `*${escapeSlackText(text(input.title))}*` : 'The video'
  return `${title} is rendered and attached to its item on the ${calendar}. It’s private until someone records the client’s sign-off — watch it in the Studio.`
}

// ── Sign-off, and the copy to public media ──────────────────────────────────

export function isSignOffStatus(value: unknown): value is SignOffStatus {
  return (SIGN_OFF_STATUSES as readonly unknown[]).includes(value)
}

/**
 * Record the client's answer. Who recorded it is required: a sign-off nobody
 * can be asked about is worth nothing when a client later says they never
 * agreed. Moving back to pending clears who and when (it is a reset, not an
 * answer).
 */
export function signOffPatch(input: {
  item: Pick<LinkableItem, 'privateVideo'>
  status: unknown
  by: string
  byUserId?: string
  note?: string
  now: Date
}): { ok: true; clientSignOff: ClientSignOff } | { ok: false; error: string } {
  if (!input.item.privateVideo?.pathname) return { ok: false, error: 'There is no private video on this item to sign off.' }
  if (!isSignOffStatus(input.status)) return { ok: false, error: 'Sign-off must be pending, approved or changesRequested.' }
  if (input.status === 'pending') return { ok: true, clientSignOff: { status: 'pending' } }
  const by = text(input.by)
  if (!by) return { ok: false, error: 'Say who is recording the client’s answer.' }
  const note = text(input.note).slice(0, 1000)
  return {
    ok: true,
    clientSignOff: {
      status: input.status,
      by,
      ...(input.byUserId ? { byUserId: input.byUserId } : {}),
      at: input.now.toISOString(),
      ...(note ? { note } : {}),
    },
  }
}

/**
 * May this item's private video be copied to public media? Only after the
 * client approved it, and only once. Returns the reason it may not, or null.
 * The copy schedules nothing: posting stays a separate decision on the item.
 */
export function publicCopyRefusal(item: LinkableItem | null | undefined): string | null {
  if (!item) return 'That calendar item is gone.'
  if (!item.privateVideo?.pathname) return 'There is no private video on this item.'
  if (item.clientSignOff?.status !== 'approved') return 'The client has not signed off on this video.'
  // Only the sign-off route records who approved; an approval without a name was not made there.
  if (!item.clientSignOff.by) return 'The sign-off does not say who approved it. Record it again in the Studio.'
  if (item.privateVideo.publicCopyAt || item.hasSocialVideo) return 'This item already has a public video.'
  return null
}

/** The confirmation a person must give before the copy, word for word in the Studio. */
export const PUBLIC_COPY_CONFIRMATION =
  'Copy this video to public media? Anyone with the link will be able to watch it. Nothing is scheduled or posted.'
