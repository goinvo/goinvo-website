/**
 * Rendomat (vsl-generator) ingest client.
 *
 * Rendomat is export-only by design: it renders the content; our calendar owns
 * scheduling + platform tokens. We poll its external API for completed renders
 * that carry an advisory `publish_at`, then create scheduled
 * marketingCalendarItems that auto-publish as Instagram Reels.
 *
 * Env (fail-closed — nothing is ingested unless both are set):
 *   RENDOMAT_API_BASE  — the Rendomat app's URL (never hard-coded here)
 *   RENDOMAT_API_KEY   — an `rmk_…` key: `read` to ingest, `read,write` to make
 *                        videos from Marqueta's scripts.
 *   RENDOMAT_CLIENT_ID — the GoInvo organization new videos are made in
 *                        (making only; ingest does not need it).
 *
 * API reference: vsl-generator/docs/api-integration.md.
 */

/** True when Rendomat ingest can run (base URL + key present). */
export function isRendomatConfigured(): boolean {
  return Boolean((process.env.RENDOMAT_API_BASE || '').trim() && (process.env.RENDOMAT_API_KEY || '').trim())
}

/**
 * The GoInvo organization in Rendomat that new videos are made in, or null.
 * A positive whole number only: anything else is a typo, and a typo must not
 * become a request that makes a video somewhere unexpected.
 */
export function rendomatClientId(): number | null {
  const raw = (process.env.RENDOMAT_CLIENT_ID || '').trim()
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * True when Marqueta may ask Rendomat to MAKE a video: the ingest settings
 * plus the organization to make it in. Without all three the button is not
 * drawn and a press of an older button is refused.
 */
export function isRendomatCreateConfigured(): boolean {
  return isRendomatConfigured() && rendomatClientId() !== null
}

function apiBase(): string {
  return (process.env.RENDOMAT_API_BASE || '').trim().replace(/\/$/, '')
}
function apiKey(): string {
  return (process.env.RENDOMAT_API_KEY || '').trim()
}

/** A Rendomat video (snake_case, as returned by GET /api/v1/videos). */
export interface RendomatVideo {
  id: number
  title: string
  status: string
  aspect_ratio: string | null
  duration_seconds: number | null
  download_url: string | null
  caption: string | null
  alt_text: string | null
  publish_at: string | null
  created_at: string
  updated_at: string
  /** The calendar item this video was made for, when Marqueta made it. */
  external_ref?: string | null
  /** The Rendomat editor page for this video. */
  editor_url?: string | null
}

/** The export manifest (GET /api/v1/videos/:id/export). */
export interface RendomatExport {
  id: number
  title: string
  status: string
  publish_at: string | null
  caption: string | null
  alt_text: string | null
  platform_hints: { aspect_ratio: string | null; duration_seconds: number | null }
  assets: { video: string | null }
  structure: Array<{ scene_number: number; name: string; scene_type: string }>
  exported_at: string
}

/** Stable calendar-item id shared by every ingest attempt for one video. */
export function rendomatCalendarItemId(videoId: number | string): string {
  const safeId = String(videoId).replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80) || 'video'
  return `rendomat.calendar.${safeId}`.slice(0, 128)
}

export const DEFAULT_RENDOMAT_ASSET_LIMIT_BYTES = 250 * 1024 * 1024

function configuredAssetLimitBytes(): number {
  const configured = Number.parseInt(process.env.RENDOMAT_MAX_ASSET_BYTES || '', 10)
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 1024 * 1024 * 1024)
    : DEFAULT_RENDOMAT_ASSET_LIMIT_BYTES
}

/** Read a response stream without ever buffering more than the configured cap. */
export async function readBoundedRendomatBody(
  response: Response,
  maxBytes = configuredAssetLimitBytes(),
): Promise<ArrayBuffer> {
  const declaredLength = Number.parseInt(response.headers.get('content-length') || '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Rendomat asset is ${declaredLength} bytes; limit is ${maxBytes} bytes.`)
  }
  if (!response.body) throw new Error('Rendomat asset response had no body.')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value?.byteLength) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel(`Rendomat asset exceeded ${maxBytes} bytes.`)
      } catch (cause) {
        throw new Error(`Rendomat asset exceeded ${maxBytes} bytes and stream cancellation failed.`, { cause })
      }
      throw new Error(`Rendomat asset exceeded the ${maxBytes} byte limit while streaming.`)
    }
    chunks.push(value)
  }

  const combined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return combined.buffer
}

/**
 * Resolves a possibly-relative Rendomat asset URL (e.g. `/api/files/renders/…`)
 * to an absolute URL against RENDOMAT_API_BASE. Absolute http(s) URLs (e.g. an R2
 * public CDN URL) pass through unchanged.
 */
export function resolveRendomatUrl(url: string): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${apiBase()}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

async function rendomatFetch(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  return fetch(`${apiBase()}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
}

/**
 * Does this URL live on the Rendomat deployment itself? Only then does it get
 * the API key: an absolute download URL can point at a storage CDN, and the
 * key must never travel to a host that is not Rendomat.
 */
export function isRendomatOrigin(url: string): boolean {
  try {
    return new URL(url).origin === new URL(apiBase()).origin
  } catch {
    return false
  }
}

/** One slide of a video made from a script (Rendomat `mode: "script"`). */
export type RendomatSlide = {
  role: 'cover' | 'point' | 'cta'
  title: string
  kicker?: string
  narration?: string
}

/** The body of POST /api/v1/videos in script mode. */
export type RendomatCreateBody = {
  mode: 'script'
  client_id: number
  title: string
  aspect_ratio: '9:16'
  brand_kit_id: string
  external_ref: string
  slides: RendomatSlide[]
}

/** Why Rendomat refused a slide: `slide` is the 0-based index into `slides`, null for the request itself. */
export type RendomatProblem = { slide: number | null; field?: string; reason: string }

export type RendomatCreateResult =
  | { ok: true; video: RendomatVideo; existing: boolean }
  | { ok: false; status: number; problems: RendomatProblem[]; error: string }

function readProblems(value: unknown): RendomatProblem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const problem = (entry || {}) as Record<string, unknown>
    const reason = typeof problem.reason === 'string' ? problem.reason.trim() : ''
    if (!reason) return []
    const slide = typeof problem.slide === 'number' && Number.isInteger(problem.slide) ? problem.slide : null
    return [{ slide, reason, ...(typeof problem.field === 'string' ? { field: problem.field } : {}) }]
  })
}

/**
 * Ask Rendomat to make a video from a script. Never throws: a refusal, a
 * timeout and an unreachable host all come back as `ok: false`, so the caller
 * can say the draft is still on the Calendar rather than crash a Slack press.
 *
 * Idempotent on `external_ref` on Rendomat's side: a second press for the same
 * calendar item answers 200 with the video already made (`existing: true`).
 */
export async function createRendomatVideo(body: RendomatCreateBody): Promise<RendomatCreateResult> {
  let res: Response
  try {
    res = await rendomatFetch('/api/v1/videos', { method: 'POST', body })
  } catch (error) {
    return { ok: false, status: 0, problems: [], error: error instanceof Error ? error.name : 'NetworkError' }
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (res.ok && json && typeof json.id === 'number') {
    return { ok: true, video: json as unknown as RendomatVideo, existing: json.existing === true }
  }
  return {
    ok: false,
    status: res.status,
    problems: readProblems(json?.problems),
    error: typeof json?.error === 'string' ? json.error : `Rendomat answered ${res.status}.`,
  }
}

/** One video (GET /api/v1/videos/:id). */
export async function getRendomatVideo(id: number | string): Promise<RendomatVideo> {
  const res = await rendomatFetch(`/api/v1/videos/${encodeURIComponent(String(id))}`)
  if (!res.ok) throw new Error(`Rendomat video lookup failed (${res.status}).`)
  return (await res.json()) as RendomatVideo
}

export interface ListVideosParams {
  publishAfter?: string
  publishBefore?: string
  limit?: number
}

/** Lists completed Rendomat videos in a publish-date window. */
export async function listCompletedVideos(params: ListVideosParams = {}): Promise<RendomatVideo[]> {
  const query = new URLSearchParams({ status: 'completed' })
  if (params.publishAfter) query.set('publish_after', params.publishAfter)
  if (params.publishBefore) query.set('publish_before', params.publishBefore)
  if (params.limit) query.set('limit', String(params.limit))

  const res = await rendomatFetch(`/api/v1/videos?${query.toString()}`)
  if (!res.ok) throw new Error(`Rendomat list failed (${res.status}): ${await res.text()}`)
  const json = (await res.json()) as unknown
  // The API returns a bare array; tolerate a {videos|data} envelope too.
  if (Array.isArray(json)) return json as RendomatVideo[]
  const envelope = json as { videos?: RendomatVideo[]; data?: RendomatVideo[] }
  return envelope.videos || envelope.data || []
}

/** Fetches one video's export manifest. */
export async function getRendomatExport(id: number): Promise<RendomatExport> {
  const res = await rendomatFetch(`/api/v1/videos/${id}/export`)
  if (!res.ok) throw new Error(`Rendomat export failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as RendomatExport
}

/** Downloads a render asset (with the API key) as bytes. */
export async function downloadRendomatAsset(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const absolute = resolveRendomatUrl(url)
  if (!absolute) throw new Error('Rendomat asset URL is empty.')
  const res = await fetch(absolute, {
    // The key goes only to Rendomat itself, never to a storage host it links to.
    headers: isRendomatOrigin(absolute) ? { Authorization: `Bearer ${apiKey()}` } : {},
    cache: 'no-store',
    // Bound the download so a large/slow render can't exhaust the function.
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`Rendomat asset download failed (${res.status}) for ${absolute}`)
  return {
    buffer: await readBoundedRendomatBody(res),
    contentType: res.headers.get('content-type') || 'video/mp4',
  }
}

/**
 * Pure mapping: a Rendomat video → the scheduled, auto-publishing Instagram Reel
 * calendar-item fields. The socialVideo asset reference is attached by the
 * ingest route after the file is uploaded to Sanity.
 */
export function buildCalendarItemFields(video: RendomatVideo): Record<string, unknown> {
  return {
    title: video.title || `Rendomat render ${video.id}`,
    status: 'scheduled',
    autoPublish: true,
    channel: 'instagram',
    contentType: 'reel',
    contentDraft: video.caption || '',
    draftAltText: video.alt_text || '',
    publishAt: video.publish_at,
    rendomatVideoId: String(video.id),
  }
}
