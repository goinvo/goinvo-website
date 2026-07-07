/**
 * Reads the logged-in Studio user's auth token from localStorage so client-side
 * Studio code (document actions, tool workspaces) can authenticate a request to
 * our own WRITE routes as a real Studio session (the `x-sanity-session` header
 * that `assertStudioOrApiKey` validates against Sanity's /users/me).
 *
 * Studio stores the token under `__studio_auth_token_<projectId>` as either a
 * raw string or a {"token":"..."} JSON envelope. Returns null when absent so
 * callers omit the header (and the route falls back to API-key auth / 401).
 */
export function studioSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  if (!projectId) return null
  try {
    const raw = window.localStorage.getItem(`__studio_auth_token_${projectId}`)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { token?: unknown } | string
      if (typeof parsed === 'string') return parsed.trim() || null
      if (parsed && typeof parsed.token === 'string') return parsed.token.trim() || null
    } catch {
      // Not JSON — treat the stored value as the raw token.
    }
    return raw.trim() || null
  } catch {
    return null
  }
}

/** Header map that authenticates a Studio→API request as the logged-in user. Empty when no token. */
export function studioSessionHeader(): Record<string, string> {
  const token = studioSessionToken()
  return token ? { 'x-sanity-session': token } : {}
}
