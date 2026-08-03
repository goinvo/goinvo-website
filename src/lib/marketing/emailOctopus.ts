/**
 * EmailOctopus (server-side) — first-party newsletter / lead-magnet capture.
 *
 * Env:
 *   EMAILOCTOPUS_API_KEY  — API key (Bearer), from EmailOctopus → Settings → API.
 *   EMAILOCTOPUS_LIST_ID  — id of the list signups are written to.
 *
 * Fail-closed: when unconfigured, `isEmailOctopusConfigured()` is false and the
 * subscribe endpoint must refuse loudly (503) — a silently dropped signup is the
 * worst failure mode for lead capture, so nothing here pretends to succeed.
 *
 * Uses the EmailOctopus API v2 contact upsert (PUT /lists/{id}/contacts), which
 * updates an existing subscriber instead of erroring — so retries and repeat
 * signups are idempotent and never surface "already subscribed" to a visitor.
 *
 * Server-only (never import from Studio/client code).
 */

const EMAILOCTOPUS_HOST = 'https://api.emailoctopus.com'

/** Bounded so a slow EmailOctopus response can't hold the signup request long. */
const EMAILOCTOPUS_TIMEOUT_MS = 8000

const MAX_ERROR_BODY_CHARS = 300

function emailOctopusApiKey(): string {
  return process.env.EMAILOCTOPUS_API_KEY?.trim() || ''
}

function emailOctopusListId(): string {
  return process.env.EMAILOCTOPUS_LIST_ID?.trim() || ''
}

export function isEmailOctopusConfigured(): boolean {
  return Boolean(emailOctopusApiKey() && emailOctopusListId())
}

/** Names of the missing env vars (never values) — safe to show in the Studio. */
export function emailOctopusMissingConfig(): string[] {
  const missing: string[] = []
  if (!emailOctopusApiKey()) missing.push('EMAILOCTOPUS_API_KEY')
  if (!emailOctopusListId()) missing.push('EMAILOCTOPUS_LIST_ID')
  return missing
}

/** Trim + bound a tag; returns undefined when there is nothing usable. */
export function sanitizeEmailOctopusTag(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const tag = value.trim().slice(0, 100)
  return tag || undefined
}

export type EmailOctopusResult =
  | { ok: true }
  | { ok: false; status?: number; error: string }

/**
 * Upsert one contact (status `subscribed`) with the given tags. Returns a
 * result object instead of throwing so the route decides how failures surface
 * (double opt-in, if wanted, is an EmailOctopus list setting — not set here).
 */
export async function upsertEmailOctopusContact(
  email: string,
  tags: readonly string[],
): Promise<EmailOctopusResult> {
  if (!isEmailOctopusConfigured()) {
    return { ok: false, error: `EmailOctopus is not configured (missing ${emailOctopusMissingConfig().join(', ')}).` }
  }

  const tagMap: Record<string, boolean> = {}
  for (const tag of tags) {
    const clean = sanitizeEmailOctopusTag(tag)
    if (clean) tagMap[clean] = true
  }

  try {
    const res = await fetch(
      `${EMAILOCTOPUS_HOST}/lists/${encodeURIComponent(emailOctopusListId())}/contacts`,
      {
        method: 'PUT',
        cache: 'no-store',
        signal: AbortSignal.timeout(EMAILOCTOPUS_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${emailOctopusApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
          ...(Object.keys(tagMap).length ? { tags: tagMap } : {}),
        }),
      },
    )
    if (res.ok) return { ok: true }
    let detail = ''
    try {
      detail = (await res.text()).slice(0, MAX_ERROR_BODY_CHARS)
    } catch {
      // The status alone is still actionable.
    }
    return { ok: false, status: res.status, error: `EmailOctopus responded ${res.status}${detail ? `: ${detail}` : ''}` }
  } catch (error) {
    return { ok: false, error: `EmailOctopus request failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}
