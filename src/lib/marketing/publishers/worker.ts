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
import { isRevisionConflict } from '../apiBoundary'
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
const MAX_PUBLISH_URL_CHARS = 2_048
const MAX_PUBLISH_MEDIA = 10
const MAX_CAPTION_CHARS: Record<SocialPlatform, number> = {
  instagram: 2_200,
  linkedin: 3_000,
}

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
  /** Route-level enqueue result for the finalize re-check, when one was required. */
  finalizeScheduled?: boolean
  finalizeScheduleError?: string
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
    if (!/^[A-Za-z0-9._-]{1,512}$/.test(outcome.containerId)) {
      const error = 'Platform returned an invalid media-container ID; reconcile the platform before retrying.'
      return {
        patch: buildFailedPatch(error, now),
        entry: { id: item._id, title: item.title, platform, outcome: 'failed', reason: error },
      }
    }
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

  const error = outcome.error.slice(0, 2_000)
  return {
    patch: buildFailedPatch(error, now),
    entry: { id: item._id, title: item.title, platform, outcome: 'failed', reason: error },
  }
}

/**
 * Commits a write-back only against the revision created by our claim. An
 * editor changing the item while the network publish is in flight must never
 * have their newer status/schedule overwritten by the late platform result.
 */
async function applyPatch(
  client: SanityClient,
  id: string,
  expectedRevision: string,
  patch: ItemPatch,
): Promise<boolean> {
  const commit = async () => {
    const tx = client.patch(id).ifRevisionId(expectedRevision)
    if (patch.set) tx.set(patch.set)
    if (patch.unset) tx.unset(patch.unset)
    await tx.commit()
  }
  try {
    await commit()
    return true
  } catch (firstError) {
    if (isRevisionConflict(firstError)) {
      console.warn(`Publish write-back skipped for ${id}: the calendar item changed after it was claimed.`)
      return false
    }
    // The external post (if any) already happened and the write-back is
    // idempotent and revision-conditional, so one retry cannot overwrite a
    // newer edit or trigger another external publish.
    try {
      await commit()
      return true
    } catch (error) {
      console.error(`Publish write-back failed for ${id} (after retry):`, error)
      return false
    }
  }
}

/**
 * Applies the outcome's patch and returns the result entry. Critically: if the
 * platform action SUCCEEDED (published / async-processing) but the Sanity
 * write-back failed, the record is now out of sync with the live platform — so we
 * report `failed` with the ids needed to reconcile, instead of falsely reporting
 * success while the item is orphaned (stuck in `publishing`, permalink lost). A
 * `failed`/`skipped`-type outcome means no external state changed, so its entry is
 * returned as-is even if the write-back failed.
 */
async function applyAndReport(
  client: SanityClient,
  item: PublishableItem,
  platform: SocialPlatform,
  outcome: PublishOutcome,
  now: string,
  claimedRevision: string,
): Promise<PublishResultEntry> {
  const { patch, entry } = resolveOutcome(item, platform, outcome, now)
  const written = await applyPatch(client, item._id, claimedRevision, patch)
  if (written) return entry
  if (entry.outcome !== 'published' && entry.outcome !== 'processing') {
    return {
      ...entry,
      reason: `${entry.reason || 'The publish attempt failed.'} The calendar item changed while publishing, so this result was not written back.`,
    }
  }

  const externalRef =
    entry.outcome === 'published'
      ? `externalId ${entry.externalId ?? 'unknown'}${entry.permalink ? `, ${entry.permalink}` : ''}`
      : `container ${entry.finalize?.containerId ?? 'unknown'}`
  const action = entry.outcome === 'published' ? `Posted to ${platform}` : `Created a ${platform} media container`
  // Drop any finalize signal: the container id was never persisted, so a QStash
  // re-check could not find it anyway.
  return {
    id: entry.id,
    title: entry.title,
    platform,
    outcome: 'failed',
    reason: `${action} but the Sanity write-back failed — reconcile manually (${externalRef}).`,
    ...(entry.externalId ? { externalId: entry.externalId } : {}),
    ...(entry.permalink ? { permalink: entry.permalink } : {}),
  }
}

/** Optimistic claim: returns its new revision, or null when another run won. */
async function claim(client: SanityClient, item: PublishableItem, now: string): Promise<string | null> {
  try {
    const claimed = await client.patch(item._id).ifRevisionId(item._rev).set(buildClaimPatch(now).set!).commit({
      autoGenerateArrayKeys: false,
      returnDocuments: true,
    })
    // Sanity returns the updated document by default. Keeping the old revision
    // as a fail-closed fallback makes non-Sanity test doubles conflict rather
    // than allowing an unguarded write.
    return typeof claimed?._rev === 'string' && claimed._rev ? claimed._rev : item._rev
  } catch {
    return null
  }
}

function validatePublicHttpsUrl(raw: string, label: string): string | null {
  if (raw.length > MAX_PUBLISH_URL_CHARS) return `${label} exceeds ${MAX_PUBLISH_URL_CHARS} characters.`
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) {
      return `${label} must be a public HTTPS URL without credentials.`
    }
  } catch {
    return `${label} is not a valid absolute URL.`
  }
  return null
}

export function validatePublishContent(platform: SocialPlatform, content: ReturnType<typeof buildPublishContent>): string | null {
  const captionLimit = MAX_CAPTION_CHARS[platform]
  if (content.text.length > captionLimit) {
    return `${platform} caption exceeds the ${captionLimit}-character limit.`
  }
  if (content.media.length > MAX_PUBLISH_MEDIA) {
    return `Post has ${content.media.length} media items; the supported maximum is ${MAX_PUBLISH_MEDIA}.`
  }
  if (content.link) {
    const error = validatePublicHttpsUrl(content.link, 'Post link')
    if (error) return error
  }
  for (const [index, media] of content.media.entries()) {
    const error = validatePublicHttpsUrl(media.url, `Media ${index + 1} URL`)
    if (error) return error
  }
  return null
}

export function validatePublishableItem(platform: SocialPlatform, item: PublishableItem): string | null {
  if (item.contentDraft !== undefined && item.contentDraft !== null && typeof item.contentDraft !== 'string') {
    return 'Post caption must be text.'
  }
  if (item.draftHashtags !== undefined && item.draftHashtags !== null && !Array.isArray(item.draftHashtags)) {
    return 'Post hashtags must be an array.'
  }
  if (item.frames !== undefined && item.frames !== null && !Array.isArray(item.frames)) {
    return 'Carousel frames must be an array.'
  }
  if ((item.contentDraft || '').length > MAX_CAPTION_CHARS[platform]) {
    return `${platform} caption exceeds the ${MAX_CAPTION_CHARS[platform]}-character limit.`
  }
  if ((item.draftHashtags || []).length > 50) return 'Post has more than 50 hashtags.'
  if ((item.draftHashtags || []).some((tag) => typeof tag !== 'string' || tag.length > 100)) {
    return 'Every hashtag must be a string of 100 characters or fewer.'
  }
  if ((item.frames || []).length > MAX_PUBLISH_MEDIA) {
    return `Post has more than ${MAX_PUBLISH_MEDIA} carousel frames.`
  }
  return null
}

async function safelyPublish(
  action: () => Promise<PublishOutcome>,
  platform: SocialPlatform,
): Promise<PublishOutcome> {
  try {
    return await action()
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `${platform} publisher threw an unknown error.`,
    }
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
    const claimedRevision = await claim(client, item, now)
    if (!claimedRevision) {
      return skip(item, platform, 'Already claimed by a concurrent run.')
    }
    const outcome = await safelyPublish(() => publisher.finalize!(item.externalContainerId!), platform)
    return applyAndReport(client, item, platform, outcome, now, claimedRevision)
  }

  // publish
  if (item.publishState === 'published' || item.status === 'published') {
    return skip(item, platform, 'Already published.')
  }
  if (item.publishState === 'publishing') {
    return skip(item, platform, 'Already claimed by another publish run.')
  }
  if (item.publishState === 'processing') {
    return skip(item, platform, 'Video is already processing; finalize it instead of publishing again.')
  }
  const invalidItem = validatePublishableItem(platform, item)
  const content: ReturnType<typeof buildPublishContent> = invalidItem
    ? { text: '', media: [] }
    : buildPublishContent(item)
  const invalidContent = invalidItem || validatePublishContent(platform, content)
  if (dryRun) {
    if (invalidContent) return skip(item, platform, invalidContent)
    return {
      id: item._id,
      title: item.title,
      platform,
      outcome: 'would-publish',
      reason: `caption ${content.text.length} chars, ${content.media.length} media${content.link ? ', link' : ''}`,
    }
  }
  const claimedRevision = await claim(client, item, now)
  if (!claimedRevision) {
    return skip(item, platform, 'Already claimed by a concurrent run.')
  }
  if (invalidContent) {
    return applyAndReport(
      client,
      item,
      platform,
      { ok: false, error: invalidContent },
      now,
      claimedRevision,
    )
  }
  const outcome = await safelyPublish(() => publisher.publish(content), platform)
  return applyAndReport(client, item, platform, outcome, now, claimedRevision)
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
  const { now, id, dryRun = false, onlyIfDue = false, finalizeOnly = false } = opts
  const requestedMaxItems = opts.maxItems ?? MAX_ITEMS_PER_RUN
  const maxItems = Math.min(
    MAX_ITEMS_PER_RUN,
    Math.max(1, Number.isFinite(requestedMaxItems) ? Math.floor(requestedMaxItems) : MAX_ITEMS_PER_RUN),
  )
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
