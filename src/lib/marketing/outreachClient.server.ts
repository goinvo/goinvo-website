/**
 * The one Sanity client Marqueta's Slack paths read and write through.
 *
 * PINNED to the private outreach dataset, deliberately NOT routed through
 * `getMarketingWriteClientFor`. The router's escape hatch
 * (NEXT_PUBLIC_MARKETING_INTERNAL_DATASET) can point internal types back at the
 * world-readable production dataset, and these paths write contact names, call
 * notes and who-is-doing-what. The Studio's outreach workspace, the tick, the
 * digest and plan-week already pin the same dataset; this keeps every writer
 * and reader of those records on one side of the line.
 *
 * `perspective: 'published'` so a contact or task somebody has open in the
 * Studio editor is read once, not twice (drafts.* would otherwise come back
 * alongside it and double every count).
 */
import 'server-only'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { OUTREACH_DATASET } from './outreachEnums'

let cached: SanityClient | null = null

export function isOutreachClientConfigured(): boolean {
  return Boolean(projectId && writeToken)
}

export function getOutreachClient(): SanityClient {
  if (!projectId || !writeToken) {
    throw new Error('Outreach client is not configured: set NEXT_PUBLIC_SANITY_PROJECT_ID and a Sanity write token.')
  }
  if (!cached) {
    cached = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      apiVersion,
      token: writeToken,
      useCdn: false,
      perspective: 'published',
    })
  }
  return cached
}
