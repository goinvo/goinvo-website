import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
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
  client,
  "categories": categories[]->title,
  metaDescription,
  "text": pt::text(content)
}`

type RequestBody = {
  /** Extract one specific case study by _id. */
  id?: string
  /** Sweep: process up to `limit` case studies that have no evidence yet. */
  limit?: number
  /** Re-extract even if an evidence doc already exists (skips manuallyEdited unless forceEdited). */
  force?: boolean
  forceEdited?: boolean
  dryRun?: boolean
  model?: string
}

/**
 * POST /api/marketing/outreach/extract-evidence — extract structured capability
 * evidence (techniques / skills / frameworks / tech / domain / outcomes /
 * quantified highlights) from case studies into marketingWorkEvidence docs.
 * Processes up to `limit` (default 5) per call and reports how many remain, so
 * the Studio loops until done. Idempotent: existing evidence is skipped unless
 * `force`; hand-edited records are protected unless `forceEdited`.
 */
export async function POST(request: NextRequest) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured — evidence extraction is disabled.' },
      { status: 503 },
    )
  }

  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as RequestBody
  const id = body.id || url.searchParams.get('id') || undefined
  const limit = Math.max(1, Math.min(10, Number(body.limit ?? url.searchParams.get('limit')) || 5))
  const force = body.force || url.searchParams.get('force') === '1'
  const forceEdited = body.forceEdited || url.searchParams.get('forceEdited') === '1'
  const dryRun = body.dryRun || url.searchParams.get('dryRun') === '1'

  const sources = await clients.readClient.fetch<EvidenceSource[]>(
    id
      ? `*[_type == "caseStudy" && _id == $id]${SOURCE_PROJECTION}`
      : `*[_type == "caseStudy"]|order(title asc)${SOURCE_PROJECTION}`,
    { id: id || '' },
  )
  if (sources.length === 0) {
    return NextResponse.json({ error: 'No matching case studies found.' }, { status: 404 })
  }

  const existing = await clients.outreachClient.fetch<
    Array<{ _id: string; manuallyEdited?: boolean }>
  >(`*[_type == "marketingWorkEvidence"]{ _id, manuallyEdited }`)
  const existingById = new Map(existing.map((e) => [e._id, e]))

  const pending = sources.filter((source) => {
    const doc = existingById.get(evidenceDocId(source._id))
    if (!doc) return true
    if (doc.manuallyEdited) return forceEdited
    return force
  })

  const batch = pending.slice(0, limit)
  if (batch.length === 0) {
    return NextResponse.json({
      extracted: 0,
      remaining: 0,
      skipped: sources.length,
      message: 'All case studies already have evidence (use force=1 to re-extract).',
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
        const doc = buildEvidenceDoc(source, evidence, { model: result.model, extractedAt })
        if (!dryRun) {
          await clients.outreachClient.createOrReplace(doc as { _id: string; _type: string })
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
  return NextResponse.json({
    dryRun,
    extracted: results.length - failures.length,
    failed: failures.length,
    remaining: Math.max(0, pending.length - batch.length),
    totalCaseStudies: sources.length,
    results,
    model,
  })
}
