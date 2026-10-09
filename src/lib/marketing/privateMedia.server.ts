/**
 * The private video store: a PRIVATE Vercel Blob store connected to this
 * project, for finished renders that a client may still have to sign off.
 *
 * Why not Sanity: on this plan every Sanity asset is served from a public CDN
 * URL (private assets are an Enterprise Media Library add-on and do not cover
 * video yet), and these files must not be reachable by link before sign-off.
 * The calendar item keeps only the blob's PATHNAME — never a URL — and a
 * teammate watches it through a short-lived signed URL minted per request.
 *
 * Fail-closed: without the store's credentials nothing is uploaded or signed.
 * Every write uses `access: 'private'`; a store that is not private refuses
 * it rather than quietly making the file public.
 */
import 'server-only'
import { get, issueSignedToken, presignUrl, put } from '@vercel/blob'

/** How long a signed URL to watch a private video lives. One viewing session, not a link to share. */
export const PRIVATE_VIDEO_URL_TTL_MS = 15 * 60 * 1000

/** Above this size the upload is sent in parts (Vercel recommends multipart for large files). */
const MULTIPART_ABOVE_BYTES = 50 * 1024 * 1024

/** True when the private store can be reached: a read-write token, or OIDC plus the store id. */
export function isPrivateBlobConfigured(): boolean {
  const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim()
  const oidc = (process.env.VERCEL_OIDC_TOKEN || '').trim() && (process.env.BLOB_STORE_ID || '').trim()
  return Boolean(token || oidc)
}

export async function putPrivateVideo(input: {
  pathname: string
  body: ArrayBuffer
  contentType?: string
}): Promise<{ pathname: string; contentType: string; size: number }> {
  if (!isPrivateBlobConfigured()) throw new Error('The private video store is not connected.')
  const size = input.body.byteLength
  const result = await put(input.pathname, Buffer.from(new Uint8Array(input.body)), {
    access: 'private',
    contentType: input.contentType || 'video/mp4',
    addRandomSuffix: false,
    // The pathname is deterministic per item and video, so a retried run
    // replaces its own earlier upload instead of failing or forking a copy.
    allowOverwrite: true,
    multipart: size > MULTIPART_ABOVE_BYTES,
  })
  return { pathname: result.pathname, contentType: result.contentType || input.contentType || 'video/mp4', size }
}

/** A GET URL for one private blob, valid for `ttlMs`, scoped to that pathname and to reading only. */
export async function signPrivateVideoUrl(
  pathname: string,
  ttlMs = PRIVATE_VIDEO_URL_TTL_MS,
  now = Date.now(),
): Promise<{ url: string; expiresAt: string }> {
  if (!isPrivateBlobConfigured()) throw new Error('The private video store is not connected.')
  const validUntil = now + ttlMs
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil })
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, validUntil, access: 'private' })
  return { url: presignedUrl, expiresAt: new Date(validUntil).toISOString() }
}

/** The private file's bytes, for the one place they leave the store: a confirmed copy to public media. */
export async function readPrivateVideo(pathname: string, maxBytes: number): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  if (!isPrivateBlobConfigured()) throw new Error('The private video store is not connected.')
  const result = await get(pathname, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) throw new Error('The private video is missing from the store.')
  if (result.blob.size > maxBytes) throw new Error(`The private video is ${result.blob.size} bytes; the limit is ${maxBytes}.`)
  const buffer = await new Response(result.stream).arrayBuffer()
  return { buffer, contentType: result.blob.contentType || 'video/mp4' }
}
