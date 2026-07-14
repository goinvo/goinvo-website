import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import {
  buildEvidenceDoc,
  buildEvidenceExtractionPrompts,
  evidenceDocId,
  normalizeEvidence,
  type EvidenceSource,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

export const dynamic = 'force-dynamic'
// Several extraction calls per invocation (no web search — local content only).
export const maxDuration = 300

// Two clients: case studies are READ from the public production dataset;
// extracted evidence is WRITTEN to the private outreach dataset.
let readClient: SanityClient | null = null
let outreachClient: SanityClient | null = null
function getClients() {
  if (!writeToken) return null
  if (!readClient) {
    readClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  if (!outreachClient) {
    outreachClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return { readClient, outreachClient }
}

const SOURCE_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "url": select(defined(slug.current) => "https://www.goinvo.com/work/" + slug.current),
  client,
  "categories": categories[]->title,
  metaDescription,
  "text": pt::text(content)
}`

type SourceRecord = EvidenceSource & { url?: string }

type ExistingEvidence = {
  _id: string
  _rev?: string
  sourceId?: string
  slug?: string
  url?: string
  status?: string
  manuallyEdited?: boolean
}

type SweepCursor = {
  version: 1
  force: boolean
  overwriteManual: boolean
  dryRun: boolean
  processedSourceIds: string[]
  failedSourceIds: string[]
  retryAttempt: number
}

type RequestBody = {
  /** Extract one specific case study by _id. */
  id?: string
  /** Sweep: process up to `limit` case studies that have no evidence yet. */
  limit?: number
  /** Re-extract even if an evidence doc already exists. */
  force?: boolean
  /** @deprecated Use overwriteManual plus confirmOverwriteManual. */
  forceEdited?: boolean
  /** Request destructive replacement of hand-edited evidence. */
  overwriteManual?: boolean
  /** Must equal OVERWRITE_MANUAL_EVIDENCE when overwriteManual is true. */
  confirmOverwriteManual?: string
  /** Opaque continuation returned as nextCursor by the preceding batch. */
  cursor?: string
  dryRun?: boolean
  model?: string
}

const MANUAL_OVERWRITE_CONFIRMATION = 'OVERWRITE_MANUAL_EVIDENCE'
const MAX_CURSOR_IDS = 1_000
const MAX_FAILURE_RETRIES = 2

function normalizedSourceId(sourceId?: string): string | null {
  const normalized = sourceId?.trim().replace(/^drafts\./, '').toLowerCase()
  return normalized ? `id:${normalized}` : null
}

function normalizedWorkUrl(url?: string): string | null {
  if (!url?.trim()) return null
  try {
    const parsed = new URL(url, 'https://www.goinvo.com')
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase()
    return pathname ? `url:${pathname}` : null
  } catch {
    return null
  }
}

function canonicalKeys(record: { sourceId?: string; _id?: string; slug?: string; url?: string }): string[] {
  const keys = [
    record.slug ? normalizedWorkUrl(`/work/${record.slug.trim()}`) : null,
    normalizedWorkUrl(record.url),
    normalizedSourceId(record.sourceId || record._id),
  ].filter((key): key is string => Boolean(key))
  return [...new Set(keys)]
}

function isDraftSource(source: SourceRecord): boolean {
  return source._id.startsWith('drafts.')
}

/**
 * Sanity's preview perspective can still return both sides of a draft/published
 * pair. Query published-only and also collapse by canonical work URL (falling
 * back to the draft-stripped source ID) so one project is extracted once.
 */
function dedupeSources(rawSources: SourceRecord[]): SourceRecord[] {
  const byCanonicalKey = new Map<string, SourceRecord>()
  for (const source of rawSources) {
    const key = canonicalKeys(source)[0]
    if (!key) continue
    const previous = byCanonicalKey.get(key)
    if (!previous || (isDraftSource(previous) && !isDraftSource(source))) {
      byCanonicalKey.set(key, source)
    }
  }
  return [...byCanonicalKey.values()]
}

function encodeCursor(cursor: SweepCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(value: string): SweepCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<SweepCursor>
    const processedSourceIds = Array.isArray(parsed.processedSourceIds)
      ? parsed.processedSourceIds.filter((id): id is string => typeof id === 'string' && id.length <= 200)
      : []
    const failedSourceIds = Array.isArray(parsed.failedSourceIds)
      ? parsed.failedSourceIds.filter((id): id is string => typeof id === 'string' && id.length <= 200)
      : []
    if (
      parsed.version !== 1 ||
      typeof parsed.force !== 'boolean' ||
      typeof parsed.overwriteManual !== 'boolean' ||
      typeof parsed.dryRun !== 'boolean' ||
      processedSourceIds.length > MAX_CURSOR_IDS ||
      failedSourceIds.length > MAX_CURSOR_IDS ||
      processedSourceIds.length !== parsed.processedSourceIds?.length ||
      failedSourceIds.length !== parsed.failedSourceIds?.length
    ) {
      return null
    }
    const retryAttempt = Number(parsed.retryAttempt || 0)
    if (!Number.isInteger(retryAttempt) || retryAttempt < 0 || retryAttempt > MAX_FAILURE_RETRIES) {
      return null
    }
    return {
      version: 1,
      force: parsed.force,
      overwriteManual: parsed.overwriteManual,
      dryRun: parsed.dryRun,
      processedSourceIds,
      failedSourceIds,
      retryAttempt,
    }
  } catch {
    return null
  }
}

/**
 * POST /api/marketing/outreach/extract-evidence — extract structured capability
 * evidence (techniques / skills / frameworks / tech / domain / outcomes /
 * quantified highlights) from case studies into marketingWorkEvidence docs.
 * Processes up to `limit` (default 5) per call. When `nextCursor` is present,
 * the caller passes it back as `cursor` on the next request; this is required
 * for a forced sweep because existing records remain eligible. `complete` is
 * true only when the whole sweep was attempted without failures or protected
 * manual records. Hand-edited records can only be replaced when the request
 * supplies both `overwriteManual: true` and the explicit confirmation token.
 */
export async function POST(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (!isAnthropicConfigured()) {
    return privateMarketingJson(
      { error: 'ANTHROPIC_API_KEY is not configured — evidence extraction is disabled.' },
      { status: 503 },
    )
  }

  const clients = getClients()
  if (!clients) {
    return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as RequestBody
  const requestedId = body.id || url.searchParams.get('id') || undefined
  // Historical evidence may point at a draft ID. Always resolve that request
  // to the published document; drafts are never extraction sources.
  const id = requestedId?.trim().replace(/^drafts\./, '') || undefined
  const limit = Math.max(1, Math.min(10, Number(body.limit ?? url.searchParams.get('limit')) || 5))
  const force = body.force === true || url.searchParams.get('force') === '1'
  const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1'
  const overwriteManualRequested = body.overwriteManual === true || body.forceEdited === true
  const overwriteManual =
    overwriteManualRequested && body.confirmOverwriteManual === MANUAL_OVERWRITE_CONFIRMATION
  const cursorValue = body.cursor || url.searchParams.get('cursor') || undefined

  if (overwriteManualRequested && !overwriteManual) {
    return privateMarketingJson(
      {
        error: 'Replacing manually edited evidence requires explicit confirmation.',
        code: 'MANUAL_OVERWRITE_CONFIRMATION_REQUIRED',
        confirmation: MANUAL_OVERWRITE_CONFIRMATION,
      },
      { status: 400 },
    )
  }
  if (overwriteManual && !force) {
    return privateMarketingJson(
      { error: 'overwriteManual requires force=true.', code: 'MANUAL_OVERWRITE_REQUIRES_FORCE' },
      { status: 400 },
    )
  }
  if (id && cursorValue) {
    return privateMarketingJson(
      { error: 'cursor cannot be combined with a single-source id.', code: 'INVALID_SWEEP_CURSOR' },
      { status: 400 },
    )
  }

  const cursor = cursorValue ? decodeCursor(cursorValue) : null
  if (
    cursorValue &&
    (!cursor ||
      cursor.force !== force ||
      cursor.overwriteManual !== overwriteManual ||
      cursor.dryRun !== dryRun)
  ) {
    return privateMarketingJson(
      {
        error: 'The sweep cursor is invalid or does not match this request.',
        code: 'INVALID_SWEEP_CURSOR',
      },
      { status: 400 },
    )
  }

  const rawSources = await clients.readClient.fetch<SourceRecord[]>(
    id
      ? `*[_type == "caseStudy" && !(_id in path("drafts.**")) && _id == $id]${SOURCE_PROJECTION}`
      : `*[_type == "caseStudy" && !(_id in path("drafts.**"))]|order(title asc, _id asc)${SOURCE_PROJECTION}`,
    { id: id || '' },
  )
  const sources = dedupeSources(rawSources)
  if (sources.length === 0) {
    return privateMarketingJson({ error: 'No matching case studies found.' }, { status: 404 })
  }

  const existing = await clients.outreachClient.fetch<ExistingEvidence[]>(
    `*[_type == "marketingWorkEvidence"]{ _id, _rev, sourceId, slug, url, status, manuallyEdited }`,
  )
  const existingByCanonicalKey = new Map<string, ExistingEvidence[]>()
  for (const doc of existing) {
    for (const key of canonicalKeys(doc)) {
      const matches = existingByCanonicalKey.get(key) || []
      matches.push(doc)
      existingByCanonicalKey.set(key, matches)
    }
  }

  const existingForSource = new Map<string, ExistingEvidence | undefined>()
  for (const source of sources) {
    const matches = canonicalKeys(source)
      .flatMap((key) => existingByCanonicalKey.get(key) || [])
      .filter((doc, index, docs) => docs.findIndex((candidate) => candidate._id === doc._id) === index)
    const exactId = evidenceDocId(source._id)
    const selected =
      matches.find((doc) => doc.manuallyEdited) ||
      matches.find((doc) => doc._id === exactId) ||
      matches[0]
    existingForSource.set(source._id, selected)
  }

  const processedSourceIds = new Set(cursor?.processedSourceIds || [])
  const protectedSources = sources.filter((source) => {
    const doc = existingForSource.get(source._id)
    return force && Boolean(doc?.manuallyEdited) && !overwriteManual
  })
  const pending = sources.filter((source) => {
    if (processedSourceIds.has(source._id)) return false
    const doc = existingForSource.get(source._id)
    if (!doc) return true
    if (!force) return false
    if (doc.manuallyEdited && !overwriteManual) return false
    return true
  })

  const batch = pending.slice(0, limit)
  if (batch.length === 0) {
    const failedSourceIds = cursor?.failedSourceIds || []
    const complete = failedSourceIds.length === 0 && protectedSources.length === 0
    return privateMarketingJson({
      dryRun,
      extracted: 0,
      attempted: 0,
      failed: 0,
      failedTotal: failedSourceIds.length,
      failedSourceIds,
      remaining: 0,
      complete,
      nextCursor: null,
      retryAttempt: cursor?.retryAttempt || 0,
      retryingFailures: false,
      protectedManual: protectedSources.length,
      protectedSourceIds: protectedSources.map((source) => source._id),
      skipped: sources.length - protectedSources.length,
      totalCaseStudies: sources.length,
      rawCaseStudies: rawSources.length,
      duplicateSourcesSkipped: rawSources.length - sources.length,
      message: complete
        ? 'All eligible case studies already have evidence.'
        : 'The sweep stopped with failed or manually protected records.',
    })
  }

  const model = await resolveMarketingModel(clients.readClient, body.model)
  const extractedAt = new Date().toISOString()

  const results = await Promise.all(
    batch.map(async (source) => {
      try {
        if (!source.text || source.text.trim().length < 200) {
          return { sourceId: source._id, title: source.title, error: 'Not enough text content to extract from.' }
        }
        const prompts = buildEvidenceExtractionPrompts(source)
        const result = await generateClaudeText({
          system: prompts.system,
          user: prompts.user,
          model,
          maxTokens: 4000,
        })
        const evidence = normalizeEvidence(parseJsonObject(result.text))
        if (!evidence.summary) {
          return { sourceId: source._id, title: source.title, error: 'Extraction returned no usable summary.' }
        }
        const generatedDoc = buildEvidenceDoc(source, evidence, { model: result.model, extractedAt })
        const canonicalExisting = existingForSource.get(source._id)
        // Reuse an older canonical record's ID rather than creating another
        // record when a prior draft/published extraction used a different ID.
        const doc = canonicalExisting
          ? {
              ...generatedDoc,
              _id: canonicalExisting._id,
              status: canonicalExisting.status || 'active',
            }
          : generatedDoc
        if (!dryRun) {
          if (canonicalExisting) {
            const latest = await clients.outreachClient.fetch<ExistingEvidence | null>(
              `*[_type == "marketingWorkEvidence" && _id == $id][0]{
                _id, _rev, sourceId, slug, url, status, manuallyEdited
              }`,
              { id: canonicalExisting._id },
            )
            if (!latest || !latest._rev || latest._rev !== canonicalExisting._rev) {
              throw new Error(
                'Evidence changed while extraction was running. No generated fields were saved; review it and retry.',
              )
            }
            if (latest.manuallyEdited && !overwriteManual) {
              throw new Error(
                'Evidence became manually edited while extraction was running. It was preserved.',
              )
            }
            const fields = {
              ...doc,
              status: latest.status || 'active',
            } as Record<string, unknown>
            delete fields._id
            delete fields._type
            await clients.outreachClient
              .patch(latest._id)
              .ifRevisionId(latest._rev)
              .set(fields)
              .commit()
          } else {
            await clients.outreachClient.create(doc as { _id: string; _type: string })
          }
        }
        return {
          sourceId: source._id,
          title: source.title,
          evidenceId: doc._id,
          highlights: (evidence.highlights || []).length,
          techniques: (evidence.techniques || []).length,
        }
      } catch (err) {
        return {
          sourceId: source._id,
          title: source.title,
          error: err instanceof Error ? err.message : 'Extraction failed.',
        }
      }
    }),
  )

  const failures = results.filter((r) => 'error' in r && r.error)
  const nextProcessedSourceIds = [
    ...new Set([...(cursor?.processedSourceIds || []), ...batch.map((source) => source._id)]),
  ]
  const nextFailedSourceIds = [
    ...new Set([
      ...(cursor?.failedSourceIds || []),
      ...failures.map((failure) => failure.sourceId),
    ]),
  ]
  const remaining = Math.max(0, pending.length - batch.length)
  const complete =
    remaining === 0 && nextFailedSourceIds.length === 0 && protectedSources.length === 0
  const retryAttempt = cursor?.retryAttempt || 0
  const canRetryFailures = !id && remaining === 0 && nextFailedSourceIds.length > 0 && retryAttempt < MAX_FAILURE_RETRIES
  const retryingFailures = canRetryFailures
  const nextCursor = remaining > 0
    ? encodeCursor({
        version: 1,
        force,
        overwriteManual,
        dryRun,
        processedSourceIds: nextProcessedSourceIds,
        failedSourceIds: nextFailedSourceIds,
        retryAttempt,
      })
    : canRetryFailures
      ? encodeCursor({
          version: 1,
          force,
          overwriteManual,
          dryRun,
          // Successful sources stay processed. Failed sources become the only
          // pending work in the continuation, so a transient final-batch
          // failure is retried without paying to repeat the full sweep.
          processedSourceIds: nextProcessedSourceIds.filter(
            (sourceId) => !nextFailedSourceIds.includes(sourceId),
          ),
          failedSourceIds: [],
          retryAttempt: retryAttempt + 1,
        })
      : null
  return privateMarketingJson({
    dryRun,
    extracted: results.length - failures.length,
    failed: failures.length,
    failedTotal: nextFailedSourceIds.length,
    failedSourceIds: nextFailedSourceIds,
    remaining: remaining + (retryingFailures ? nextFailedSourceIds.length : 0),
    complete,
    nextCursor,
    retryAttempt,
    retryingFailures,
    protectedManual: protectedSources.length,
    protectedSourceIds: protectedSources.map((source) => source._id),
    attempted: batch.length,
    totalCaseStudies: sources.length,
    rawCaseStudies: rawSources.length,
    duplicateSourcesSkipped: rawSources.length - sources.length,
    results,
    model,
  })
}
