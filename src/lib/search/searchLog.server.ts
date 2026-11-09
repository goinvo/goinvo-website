/**
 * Writing homepage searches to the private dataset (searchLog.ts says what is kept).
 *
 * Best-effort and never throws, like the model-call ledger: the search has already
 * answered by the time this runs (the route calls it behind after()), and a failed
 * write must never turn into a failed search. Failures are logged.
 */
import { randomUUID } from 'node:crypto'

import { getMarketingWriteClientFor } from '@/lib/marketing/client'
import type { SearchLogEntry } from './searchLog'

/** Registered in INTERNAL_MARKETING_TYPES: visitors' own words are not public. */
export const SITE_SEARCH_TYPE = 'marketingSiteSearch'

/** Which deployment answered: searches from a preview or a laptop are reviewers, not visitors. */
export function deploymentEnv(): string {
  return process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development')
}

export async function recordSearch(entry: SearchLogEntry): Promise<boolean> {
  try {
    await getMarketingWriteClientFor(SITE_SEARCH_TYPE).create({
      _type: SITE_SEARCH_TYPE,
      _id: `${SITE_SEARCH_TYPE}.${entry.at.slice(0, 10)}.${randomUUID()}`,
      ...entry,
    })
    return true
  } catch (error) {
    console.error('[searchLog] could not record a search', error)
    return false
  }
}
