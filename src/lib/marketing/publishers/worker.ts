/**
 * The publish worker: loads due calendar items (or one item by id), claims each
 * with an optimistic revision lock so overlapping runs can't double-post,
 * publishes via the platform adapter, and writes the result back.
 *
 * Takes the SanityClient as a parameter (no singleton import) so it stays
 * testable with a mock client, and is shared by both the batch `/run` route and
 * the per-item QStash callback.
 */

import type { SanityClient } from '@sanity/client'
import {
  buildClaimPatch,
  buildFailedPatch,
  buildPublishContent,
  buildPublishedPatch,
  DUE_ITEMS_QUERY,
  DUE_SINGLE_ITEM_QUERY,
  resolveSocialPlatform,
  SINGLE_ITEM_QUERY,
  type PublishableItem,
} from './content'
import { getPublisher } from './registry'

const MAX_ITEMS_PER_RUN = 25

export interface RunPublishOptions {
  /** ISO timestamp treated as "now" for due checks + stamps. */
  now: string
  /** Publish a single item by id instead of the due sweep. */
  id?: string
  /** Preview only — resolve + report, but never claim, post, or write. */
  dryRun?: boolean
  /**
   * When publishing by id, still require the item to be due (autoPublish +
   * scheduled + past publishAt + not already handled). Used by the QStash
   * callback so a stale/rescheduled message is a safe no-op. Ignored for the
   * batch sweep (always due-filtered).
   */
  onlyIfDue?: boolean
  /** Cap items processed in one run (batch path). */
  maxItems?: number
}

export interface PublishResultEntry {
  id: string
  title?: string | null
  platform?: string
  outcome: 'published' | 'skipped' | 'failed' | 'would-publish'
  reason?: string
  externalId?: string
  permalink?: string
}

export interface PublishRunSummary {
  ranAt: string
  dryRun: boolean
  considered: number
  processed: number
  published: number
  failed: number
  skipped: number
  results: PublishResultEntry[]
}

/** Loads the items this run should consider. */
async function loadItems(client: SanityClient, opts: RunPublishOptions): Promise<PublishableItem[]> {
  const { now, id, onlyIfDue } = opts
  if (id) {
    const query = onlyIfDue ? DUE_SINGLE_ITEM_QUERY : SINGLE_ITEM_QUERY
    const params = onlyIfDue ? { id, now } : { id }
    const one = await client.fetch<PublishableItem | null>(query, params)
    return one ? [one] : []
  }
  return client.fetch<PublishableItem[]>(DUE_ITEMS_QUERY, { now })
}

export async function runPublish(
  client: SanityClient,
  opts: RunPublishOptions,
): Promise<PublishRunSummary> {
  const { now, dryRun = false, maxItems = MAX_ITEMS_PER_RUN } = opts
  const items = await loadItems(client, opts)
  const batch = items.slice(0, maxItems)
  const results: PublishResultEntry[] = []

  for (const item of batch) {
    const platform = resolveSocialPlatform(item)
    if (!platform) {
      results.push({
        id: item._id,
        title: item.title,
        outcome: 'skipped',
        reason: `No social adapter for channel "${item.channelKey ?? 'unknown'}".`,
      })
      continue
    }

    const publisher = getPublisher(platform)
    if (!publisher.isConnected()) {
      // Not an error — leave the item untouched so a later run picks it up once
      // credentials are set.
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'skipped',
        reason: `${platform} not connected (missing ${publisher.missingConfig().join(', ')}).`,
      })
      continue
    }

    const content = buildPublishContent(item)

    if (dryRun) {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'would-publish',
        reason: `caption ${content.text.length} chars, ${content.media.length} image(s)${
          content.link ? ', link' : ''
        }`,
      })
      continue
    }

    // Claim with an optimistic revision lock. A revision mismatch means another
    // run already claimed it — skip.
    try {
      const claim = buildClaimPatch(now)
      await client.patch(item._id).ifRevisionId(item._rev).set(claim.set!).commit({
        autoGenerateArrayKeys: false,
      })
    } catch {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'skipped',
        reason: 'Already claimed by a concurrent run.',
      })
      continue
    }

    const outcome = await publisher.publish(content)
    const patch = outcome.ok
      ? buildPublishedPatch(outcome.result, now)
      : buildFailedPatch(outcome.error, now)

    try {
      const tx = client.patch(item._id)
      if (patch.set) tx.set(patch.set)
      if (patch.unset) tx.unset(patch.unset)
      await tx.commit()
    } catch (error) {
      console.error(`Publish write-back failed for ${item._id}:`, error)
    }

    if (outcome.ok) {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'published',
        externalId: outcome.result.externalId,
        permalink: outcome.result.permalink,
      })
    } else {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'failed',
        reason: outcome.error,
      })
    }
  }

  return {
    ranAt: now,
    dryRun,
    considered: items.length,
    processed: results.length,
    published: results.filter((r) => r.outcome === 'published').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    results,
  }
}
