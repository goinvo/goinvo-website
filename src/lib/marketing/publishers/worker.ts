/**
 * The publish worker: loads due calendar items (or one item by id), claims each
 * with an optimistic revision lock so overlapping runs can't double-post or
 * double-finalize, publishes via the platform adapter, and writes the result
 * back.
 *
 * Async video (Instagram Reels): a publish can return `pending` (the platform is
 * still processing the upload). The worker records the container id + an attempt
 * count and emits a `finalize` signal so the route can schedule a QStash
 * re-check; the re-check comes back through `finalizeOnly`. Re-checks are bounded
 * (MAX_FINALIZE_ATTEMPTS). A batch run ALSO sweeps stale `processing` items
 * (whose QStash re-check was lost) as a backstop.
 *
 * Takes the SanityClient as a parameter (no singleton import) so it stays
 * testable with a mock client, and is shared by the batch `/run` route, the
 * per-item QStash publish callback, and the finalize callback.
 */

import type { SanityClient } from '@sanity/client'
import {
  buildClaimPatch,
  buildFailedPatch,
  buildProcessingPatch,
  buildPublishContent,
  buildPublishedPatch,
  DUE_ITEMS_QUERY,
  DUE_SINGLE_ITEM_QUERY,
  type ItemPatch,
  type PublishableItem,
  resolveSocialPlatform,
  SINGLE_ITEM_QUERY,
  STALE_PROCESSING_QUERY,
} from './content'
import { getPublisher } from './registry'
import type { PublishOutcome, SocialPlatform } from './types'

const MAX_ITEMS_PER_RUN = 25

/** Max async (video) re-checks before giving up. Override per deployment. */
function maxFinalizeAttempts(): number {
  const parsed = Number.parseInt(process.env.INSTAGRAM_REEL_MAX_CHECKS || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15
}
/** Delay between async re-checks, in seconds. Override per deployment. */
function finalizeDelaySec(): number {
  const parsed = Number.parseInt(process.env.INSTAGRAM_REEL_CHECK_DELAY_SEC || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90
}
/** A `processing` item not re-checked within this many ms is treated as orphaned. */
function staleProcessingMs(): number {
  return finalizeDelaySec() * 3 * 1000
}

export interface RunPublishOptions {
  now: string
  id?: string
  dryRun?: boolean
  onlyIfDue?: boolean
  finalizeOnly?: boolean
  maxItems?: number
}

export interface FinalizeSignal {
  containerId: string
  attempt: number
  delaySec: number
}

export interface PublishResultEntry {
  id: string
  title?: string | null
  platform?: string
  outcome: 'published' | 'processing' | 'skipped' | 'failed' | 'would-publish'
  reason?: string
  externalId?: string
  permalink?: string
  /** Present when the route should schedule a QStash finalize re-check. */
  finalize?: FinalizeSignal
}

export interface PublishRunSummary {
  ranAt: string
  dryRun: boolean
  considered: number
  processed: number
  published: number
  processing: number
  failed: number
  skipped: number
  results: PublishResultEntry[]
}

function skip(item: PublishableItem, platform: SocialPlatform | undefined, reason: string): PublishResultEntry {
  return { id: item._id, title: item.title, ...(platform ? { platform } : {}), outcome: 'skipped', reason }
}

/**
 * Maps a publish/finalize outcome to the Sanity patch to apply and the result
 * entry to report. Encapsulates the pending → processing/failed bounding so the
 * publish and finalize paths behave identically.
 */
function resolveOutcome(
  item: PublishableItem,
  platform: SocialPlatform,
  outcome: PublishOutcome,
  now: string,
): { patch: ItemPatch; entry: PublishResultEntry } {
  if (outcome.ok) {
    return {
      patch: buildPublishedPatch(outcome.result, now),
      entry: {
        id: item._id,
        title: item.title,
        platform,
        outcome: 'published',
        externalId: outcome.result.externalId,
        permalink: outcome.result.permalink,
      },
    }
  }

  if ('pending' in outcome) {
    const attempt = (item.publishAttempts || 0) + 1
    if (attempt > maxFinalizeAttempts()) {
      const error = `Video processing did not finish after ${maxFinalizeAttempts()} checks.`
      return {
        patch: buildFailedPatch(error, now),
        entry: { id: item._id, title: item.title, platform, outcome: 'failed', reason: error },
      }
    }
    return {
      patch: buildProcessingPatch(outcome.containerId, attempt, now),
      entry: {
        id: item._id,
        title: item.title,
        platform,
        outcome: 'processing',
        reason: `Still processing (check ${attempt}/${maxFinalizeAttempts()}).`,
        finalize: { containerId: outcome.containerId, attempt, delaySec: finalizeDelaySec() },
      },
    }
  }

  return {
    patch: buildFailedPatch(outcome.error, now),
    entry: { id: item._id, title: item.title, platform, outcome: 'failed', reason: outcome.error },
  }
}

async function applyPatch(client: SanityClient, id: string, patch: ItemPatch): Promise<void> {
  try {
    const tx = client.patch(id)
    if (patch.set) tx.set(patch.set)
    if (patch.unset) tx.unset(patch.unset)
    await tx.commit()
  } catch (error) {
    console.error(`Publish write-back failed for ${id}:`, error)
  }
}

/** Optimistic claim: returns false if another run already holds the item (revision mismatch). */
async function claim(client: SanityClient, item: PublishableItem, now: string): Promise<boolean> {
  try {
    await client.patch(item._id).ifRevisionId(item._rev).set(buildClaimPatch(now).set!).commit({
      autoGenerateArrayKeys: false,
    })
    return true
  } catch {
    return false
  }
}

/** Handles one item in either 'publish' or 'finalize' mode. Applies patches + returns the entry. */
async function processOne(
  client: SanityClient,
  item: PublishableItem,
  mode: 'publish' | 'finalize',
  now: string,
  dryRun: boolean,
): Promise<PublishResultEntry> {
  const platform = resolveSocialPlatform(item)
  if (!platform) {
    return skip(item, undefined, `No social adapter for channel "${item.channelKey ?? 'unknown'}".`)
  }

  const publisher = getPublisher(platform)
  if (!publisher.isConnected()) {
    return skip(item, platform, `${platform} not connected (missing ${publisher.missingConfig().join(', ')}).`)
  }

  if (mode === 'finalize') {
    if (item.publishState === 'published') return skip(item, platform, 'Already published.')
    if (!item.externalContainerId || !publisher.finalize) {
      return skip(item, platform, 'Nothing to finalize (no container).')
    }
    if (dryRun) {
      return { id: item._id, title: item.title, platform, outcome: 'would-publish', reason: 'would re-check video processing' }
    }
    // Claim so an at-least-once duplicate delivery can't double-finalize.
    if (!(await claim(client, item, now))) {
      return skip(item, platform, 'Already claimed by a concurrent run.')
    }
    const outcome = await publisher.finalize(item.externalContainerId)
    const { patch, entry } = resolveOutcome(item, platform, outcome, now)
    await applyPatch(client, item._id, patch)
    return entry
  }

  // publish
  const content = buildPublishContent(item)
  if (dryRun) {
    return {
      id: item._id,
      title: item.title,
      platform,
      outcome: 'would-publish',
      reason: `caption ${content.text.length} chars, ${content.media.length} media${content.link ? ', link' : ''}`,
    }
  }
  if (!(await claim(client, item, now))) {
    return skip(item, platform, 'Already claimed by a concurrent run.')
  }
  const outcome = await publisher.publish(content)
  const { patch, entry } = resolveOutcome(item, platform, outcome, now)
  await applyPatch(client, item._id, patch)
  return entry
}

function summarize(now: string, dryRun: boolean, considered: number, results: PublishResultEntry[]): PublishRunSummary {
  return {
    ranAt: now,
    dryRun,
    considered,
    processed: results.length,
    published: results.filter((r) => r.outcome === 'published').length,
    processing: results.filter((r) => r.outcome === 'processing').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    results,
  }
}

export async function runPublish(
  client: SanityClient,
  opts: RunPublishOptions,
): Promise<PublishRunSummary> {
  const { now, id, dryRun = false, onlyIfDue = false, finalizeOnly = false, maxItems = MAX_ITEMS_PER_RUN } = opts
  const results: PublishResultEntry[] = []

  // ── Single item by id (manual or a QStash publish/finalize callback) ────────
  if (id) {
    const query = onlyIfDue && !finalizeOnly ? DUE_SINGLE_ITEM_QUERY : SINGLE_ITEM_QUERY
    const params = onlyIfDue && !finalizeOnly ? { id, now } : { id }
    const one = await client.fetch<PublishableItem | null>(query, params)
    const items = one ? [one] : []
    for (const item of items) {
      results.push(await processOne(client, item, finalizeOnly ? 'finalize' : 'publish', now, dryRun))
    }
    return summarize(now, dryRun, items.length, results)
  }

  // ── Batch sweep: due items (publish) + stale processing items (finalize) ────
  const due = await client.fetch<PublishableItem[]>(DUE_ITEMS_QUERY, { now })
  for (const item of due.slice(0, maxItems)) {
    results.push(await processOne(client, item, 'publish', now, dryRun))
  }

  // Backstop: re-check `processing` items whose QStash finalize was lost. Skipped
  // in dryRun (finalize writes). A healthy item updates publishAttemptedAt every
  // cycle, so only orphans go stale.
  let consideredStale = 0
  if (!dryRun) {
    const staleBefore = new Date(new Date(now).getTime() - staleProcessingMs()).toISOString()
    const stale = await client.fetch<PublishableItem[]>(STALE_PROCESSING_QUERY, { staleBefore })
    consideredStale = stale.length
    for (const item of stale.slice(0, maxItems)) {
      results.push(await processOne(client, item, 'finalize', now, dryRun))
    }
  }

  return summarize(now, dryRun, due.length + consideredStale, results)
}
