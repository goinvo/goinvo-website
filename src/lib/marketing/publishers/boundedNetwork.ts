const configuredTimeout = Number(process.env.MARKETING_PUBLISH_FETCH_TIMEOUT_MS || 15_000)
export const PUBLISH_FETCH_TIMEOUT_MS = Math.min(
  30_000,
  Math.max(1_000, Number.isFinite(configuredTimeout) ? configuredTimeout : 15_000),
)

export const PUBLISH_API_RESPONSE_MAX_BYTES = 512 * 1024
export const PUBLISH_MEDIA_MAX_BYTES = 25 * 1024 * 1024

export type BoundedFetchResult = { response: Response; bytes: Uint8Array }

async function responseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Remote response exceeds the ${maxBytes}-byte limit.`)
  }

  if (!response.body) {
    if (typeof response.arrayBuffer === 'function') {
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength > maxBytes) throw new Error(`Remote response exceeds the ${maxBytes}-byte limit.`)
      return bytes
    }
    if (typeof response.text === 'function') {
      const bytes = new TextEncoder().encode(await response.text())
      if (bytes.byteLength > maxBytes) throw new Error(`Remote response exceeds the ${maxBytes}-byte limit.`)
      return bytes
    }
    return new Uint8Array()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new Error(`Remote response exceeds the ${maxBytes}-byte limit.`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function boundedFetch(
  input: string,
  init: RequestInit,
  maxBytes = PUBLISH_API_RESPONSE_MAX_BYTES,
): Promise<BoundedFetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PUBLISH_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(input, { ...init, signal: controller.signal })
    const bytes = await responseBytes(response, maxBytes)
    return { response, bytes }
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || /abort/i.test(error.message))) {
      throw new Error(`Remote request timed out after ${PUBLISH_FETCH_TIMEOUT_MS}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function boundedText(result: BoundedFetchResult): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(result.bytes)
}

export function boundedJson<T>(result: BoundedFetchResult, label: string): T {
  try {
    return JSON.parse(boundedText(result)) as T
  } catch {
    throw new Error(`${label} returned invalid JSON.`)
  }
}
