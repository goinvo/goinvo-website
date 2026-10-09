/**
 * Reading the Team permissions setting on the server.
 *
 * Cached for a minute: the auth guard consults it only when a person's Sanity
 * role is not already a writer role, but a busy Studio session can make many
 * calls a minute and the setting changes rarely. A failed read returns null —
 * callers treat that as the stricter rule (see `mayUsePrivateMarketing`).
 */

import { getMarketingWriteClientFor } from './client'
import { DEFAULT_TEAM_ACCESS, normalizeTeamAccess, type TeamAccess } from './teamAccess'

const CACHE_MS = 60_000
let cached: { at: number; value: TeamAccess } | null = null

export async function readTeamAccess(now = Date.now()): Promise<TeamAccess | null> {
  if (cached && now - cached.at < CACHE_MS) return cached.value
  try {
    const raw = await getMarketingWriteClientFor('marketingSettings').fetch<unknown>(
      `*[_id == "marketingSettings"][0].teamAccess`,
    )
    const value = raw ? normalizeTeamAccess(raw) : DEFAULT_TEAM_ACCESS
    cached = { at: now, value }
    return value
  } catch {
    return null
  }
}

/** For tests and for the Settings save path, which wants the next read to be fresh. */
export function clearTeamAccessCache() {
  cached = null
}
