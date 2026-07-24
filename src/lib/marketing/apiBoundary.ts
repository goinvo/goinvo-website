/** Shared, dependency-free request guards for Marketing API routes. */

export const MARKETING_JSON_BODY_LIMIT = 512 * 1024
export const MARKETING_JSON_MAX_ARRAY_ITEMS = 200
export const MARKETING_JSON_MAX_OBJECT_KEYS = 128
export const MARKETING_JSON_MAX_DEPTH = 10
export const MARKETING_JSON_MAX_STRING_LENGTH = 100_000
export const MARKETING_JSON_MAX_NODES = 5_000

export class MarketingRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'MarketingRequestError'
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Read JSON without trusting Content-Length (chunked bodies are capped too). */
export async function readBoundedJson(
  request: Request,
  maxBytes = MARKETING_JSON_BODY_LIMIT,
): Promise<unknown> {
  const declared = request.headers.get('content-length')
  if (declared !== null) {
    const bytes = Number(declared)
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new MarketingRequestError('Invalid Content-Length header.', 400)
    }
    if (bytes > maxBytes) {
      throw new MarketingRequestError(`Request body exceeds the ${maxBytes}-byte limit.`, 413)
    }
  }

  if (!request.body) throw new MarketingRequestError('Request body must be valid JSON.', 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel('body too large')
        throw new MarketingRequestError(`Request body exceeds the ${maxBytes}-byte limit.`, 413)
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

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new MarketingRequestError('Request body must be valid UTF-8 JSON.', 400)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new MarketingRequestError('Request body must be valid JSON.', 400)
  }
}

export interface BoundedJsonOptions {
  maxArrayItems?: number
  maxObjectKeys?: number
  maxDepth?: number
  maxStringLength?: number
  maxNodes?: number
}

/**
 * Bound recursive JSON work before a route derives keys, builds prompts, or
 * hands values to Sanity. Throws a client-safe 413 with the offending path.
 */
export function assertBoundedJson(value: unknown, options: BoundedJsonOptions = {}): void {
  const maxArrayItems = options.maxArrayItems ?? MARKETING_JSON_MAX_ARRAY_ITEMS
  const maxObjectKeys = options.maxObjectKeys ?? MARKETING_JSON_MAX_OBJECT_KEYS
  const maxDepth = options.maxDepth ?? MARKETING_JSON_MAX_DEPTH
  const maxStringLength = options.maxStringLength ?? MARKETING_JSON_MAX_STRING_LENGTH
  const maxNodes = options.maxNodes ?? MARKETING_JSON_MAX_NODES
  let nodes = 0

  const visit = (current: unknown, path: string, depth: number): void => {
    nodes += 1
    if (nodes > maxNodes) {
      throw new MarketingRequestError(`JSON value exceeds the ${maxNodes}-node limit.`, 413)
    }
    if (depth > maxDepth) {
      throw new MarketingRequestError(`${path} exceeds the maximum nesting depth of ${maxDepth}.`, 413)
    }
    if (typeof current === 'string') {
      if (current.length > maxStringLength) {
        throw new MarketingRequestError(
          `${path} exceeds the ${maxStringLength}-character string limit.`,
          413,
        )
      }
      return
    }
    if (current === null || typeof current === 'boolean' || typeof current === 'number') return
    if (Array.isArray(current)) {
      if (current.length > maxArrayItems) {
        throw new MarketingRequestError(
          `${path} exceeds the ${maxArrayItems}-item array limit.`,
          413,
        )
      }
      current.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1))
      return
    }
    if (!isPlainRecord(current)) {
      throw new MarketingRequestError(`${path} must contain JSON values only.`, 400)
    }
    const entries = Object.entries(current)
    if (entries.length > maxObjectKeys) {
      throw new MarketingRequestError(
        `${path} exceeds the ${maxObjectKeys}-field object limit.`,
        413,
      )
    }
    for (const [key, child] of entries) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new MarketingRequestError(`${path}.${key} is not an allowed JSON key.`, 400)
      }
      visit(child, `${path}.${key}`, depth + 1)
    }
  }

  visit(value, '$', 0)
}

export function isValidMarketingDocumentId(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)
}

export function isValidSanityRevision(revision: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(revision)
}

export function isRevisionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { statusCode?: unknown; status?: unknown; message?: unknown }
  return (
    record.statusCode === 409 ||
    record.status === 409 ||
    (typeof record.message === 'string' && /revision|conflict|precondition/i.test(record.message))
  )
}
