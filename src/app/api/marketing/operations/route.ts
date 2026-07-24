import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'

import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  assertAutomaticMarketingOperationAction,
  canTransitionMarketingOperation,
  MARKETING_OPERATION_TYPE,
  marketingOperationFingerprint,
  normalizeMarketingOperationInput,
  normalizeMarketingOperationPatch,
  type MarketingOperation,
  type MarketingOperationActivity,
  type MarketingOperationEvidence,
} from '@/lib/marketing/operations'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 24_000
const OPERATIONS_QUERY = `*[_type == "marketingOperation"]|order(_updatedAt desc)[0...200]{
  _id, _type, _rev, _createdAt, _updatedAt,
  title, summary, whyNow, nextAction, humanQuestion, humanResponse,
  status, priority, kind, origin, autonomy,
  ownerName, ownerSanityUserId, dueAt, nextCheckAt,
  blocker, lastOutcome, targetView,
  sourceKey, sourceFingerprint, sourceRevision,
  linkedRecords, evidence, activity,
  completedAt, dismissedUntil, lastEvaluatedAt
}`

let privateClient: SanityClient | null = null
let publicClient: SanityClient | null = null

/** Fail closed if an environment override points confidential work at production. */
export function assertPrivateMarketingOperationsDataset(
  operationsDataset = OUTREACH_DATASET,
  publicDataset = dataset,
) {
  const privateName = operationsDataset.trim()
  const publicName = publicDataset.trim()
  if (!privateName || !publicName || privateName === publicName) {
    throw new Error('Private Marketing Operations storage is not safely configured.')
  }
}

function getClients() {
  assertPrivateMarketingOperationsDataset()
  if (!writeToken || !projectId) return null
  if (!privateClient) {
    privateClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  if (!publicClient) {
    publicClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return { privateClient, publicClient }
}

async function authorize(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    return null
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
}

async function readJsonBody(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json.'), { status: 415 })
  }
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Marketing Operations request is too large.'), { status: 413 })
  }
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Marketing Operations request is too large.'), { status: 413 })
  }
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })
  }
}

type CmsCandidate = {
  _id: string
  _type: 'feature' | 'caseStudy'
  title?: string
  slug?: string
  description?: string
  client?: string
}

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'before', 'being', 'from', 'have', 'into',
  'marketing', 'project', 'research', 'that', 'their', 'then', 'this', 'through',
  'using', 'want', 'what', 'when', 'where', 'which', 'with', 'work', 'would',
])

function matchingTerms(value: string) {
  const terms = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term))
  return Array.from(new Set(terms)).slice(0, 32)
}

async function inspectPublicCms(
  client: SanityClient,
  operation: MarketingOperation,
): Promise<MarketingOperationEvidence[]> {
  // Closed allowlist guard. This route never accepts a URL, route, provider,
  // dataset, or action name from the model for autonomous execution.
  assertAutomaticMarketingOperationAction('inspectCms')
  const candidates = await client.fetch<CmsCandidate[]>(`*[
    _type in ["feature", "caseStudy"] && defined(title) && title != "Untitled"
  ][0...240]{_id, _type, title, "slug": slug.current, description, client}`)
  const terms = matchingTerms([
    operation.title,
    operation.summary,
    operation.whyNow,
    operation.nextAction,
  ].filter(Boolean).join(' '))

  return candidates
    .map((candidate) => {
      const haystack = [candidate.title, candidate.description, candidate.client]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchedTerms = terms.filter((term) => haystack.includes(term))
      const titleTerms = matchingTerms(candidate.title || '')
      const titleOverlap = titleTerms.filter((term) => terms.includes(term)).length
      return { candidate, matchedTerms, score: matchedTerms.length + titleOverlap * 2 }
    })
    .filter((match) => match.score >= 2)
    .sort((left, right) => right.score - left.score || (left.candidate.title || '').localeCompare(right.candidate.title || ''))
    .slice(0, 8)
    .map(({ candidate, matchedTerms }, index) => ({
      _key: `cms-${candidate._id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 70)}-${index + 1}`,
      title: candidate.title || 'Untitled GoInvo work',
      recordType: candidate._type,
      recordId: candidate._id,
      url: candidate.slug
        ? `https://www.goinvo.com/${candidate._type === 'caseStudy' ? 'work' : 'vision'}/${candidate.slug}/`
        : undefined,
      matchedTerms: matchedTerms.slice(0, 8),
    }))
}

function activityEntry(action: string, outcome: string, actor: MarketingOperationActivity['actor'] = 'marketing') {
  const at = new Date().toISOString()
  return {
    _key: `activity-${marketingOperationFingerprint(`${at}:${action}:${outcome}`)}`,
    at,
    actor,
    action,
    outcome,
  } satisfies MarketingOperationActivity
}

async function upsertReviewedHandoff(
  operationsClient: SanityClient,
  cmsClient: SanityClient,
  input: unknown,
) {
  const proposed = normalizeMarketingOperationInput(input)
  const sourceKey = proposed.sourceKey.startsWith('work-update:')
    ? proposed.sourceKey
    : `work-update:${marketingOperationFingerprint(proposed.sourceKey)}`
  const prepared = normalizeMarketingOperationInput({
    ...proposed,
    sourceKey,
    origin: 'workUpdate',
    kind: 'update',
    status: 'working',
    autonomy: 'safeInternal',
    priority: proposed.priority,
    nextAction: 'Inspecting existing GoInvo work for evidence and reusable material.',
    lastOutcome: 'The reviewed update was added to the private shared queue.',
    activity: [
      activityEntry(
        'Accepted reviewed coworker handoff',
        'Stored only the normalized brief in the private Marketing Operations dataset; the rough note was not saved.',
        'person',
      ),
    ],
  })
  const document = { ...prepared, _id: prepared._id!, _type: MARKETING_OPERATION_TYPE }
  const existing = await operationsClient.fetch<MarketingOperation | null>(
    `*[_id == $id && _type == "marketingOperation"][0]{${OPERATIONS_QUERY.slice(OPERATIONS_QUERY.indexOf('{') + 1, -1)}}`,
    { id: document._id },
  )

  if (existing?.sourceFingerprint === document.sourceFingerprint) {
    return { item: existing, idempotent: true, checkedCms: false }
  }

  let evidence: MarketingOperationEvidence[] = []
  let scanError = ''
  try {
    evidence = await inspectPublicCms(cmsClient, document)
  } catch {
    // Do not persist provider/raw exception text. The durable blocker is enough
    // for a person to retry, and avoids leaking infrastructure detail.
    scanError = 'The internal CMS check could not complete.'
  }

  const finalStatus = scanError ? 'blocked' : 'needsHuman'
  const lastOutcome = scanError
    ? scanError
    : evidence.length > 0
      ? `Marketing found ${evidence.length} potentially reusable GoInvo item${evidence.length === 1 ? '' : 's'} in the internal CMS.`
      : 'Marketing checked the internal CMS and found no strong match.'
  const finalDocument = normalizeMarketingOperationInput({
    ...document,
    status: finalStatus,
    autonomy: 'humanReview',
    evidence,
    blocker: scanError || (evidence.length === 0 ? 'No strong internal source matched this update.' : ''),
    humanQuestion: evidence.length > 0
      ? 'Which existing work is safe and useful to reuse?'
      : 'Can you add one reliable source, destination, or missing fact so Marketing can continue?',
    nextAction: evidence.length > 0
      ? 'Review the matched GoInvo work and choose what should guide the marketing brief.'
      : 'Add a reliable source or answer the missing context, then ask Marketing to check again.',
    lastOutcome,
    activity: [
      ...(existing?.activity || []),
      ...(document.activity || []),
      activityEntry('Ran safe internal CMS check', lastOutcome),
    ].slice(-20),
    lastEvaluatedAt: new Date().toISOString(),
  })

  if (!existing) {
    const item = await operationsClient.createIfNotExists({
      ...finalDocument,
      _id: finalDocument._id!,
      _type: MARKETING_OPERATION_TYPE,
    }) as MarketingOperation
    return { item, idempotent: false, checkedCms: true }
  }

  const item = await operationsClient
    .patch(existing._id)
    .ifRevisionId(existing._rev || '')
    .set({
      title: finalDocument.title,
      summary: finalDocument.summary,
      whyNow: finalDocument.whyNow,
      nextAction: finalDocument.nextAction,
      humanQuestion: finalDocument.humanQuestion,
      humanResponse: finalDocument.humanResponse,
      status: finalDocument.status,
      kind: finalDocument.kind,
      origin: finalDocument.origin,
      autonomy: finalDocument.autonomy,
      blocker: finalDocument.blocker,
      lastOutcome: finalDocument.lastOutcome,
      targetView: finalDocument.targetView,
      sourceFingerprint: finalDocument.sourceFingerprint,
      sourceRevision: finalDocument.sourceRevision,
      linkedRecords: finalDocument.linkedRecords,
      evidence: finalDocument.evidence,
      activity: finalDocument.activity,
      lastEvaluatedAt: finalDocument.lastEvaluatedAt,
    })
    .commit() as MarketingOperation
  return { item, idempotent: false, checkedCms: true }
}

export async function GET(request: NextRequest) {
  const authError = await authorize(request)
  if (authError) return authError
  try {
    const clients = getClients()
    if (!clients) return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
    const items = await clients.privateClient.fetch<MarketingOperation[]>(OPERATIONS_QUERY)
    return privateMarketingJson({ items, checked: items.length, mode: 'studio-open' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Marketing Operations could not load.'
    return privateMarketingJson({ error: message }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authorize(request)
  if (authError) return authError
  try {
    const clients = getClients()
    if (!clients) return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
    const body = await readJsonBody(request)
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'handoff') {
      const result = await upsertReviewedHandoff(clients.privateClient, clients.publicClient, body.operation)
      return privateMarketingJson(result, { status: result.idempotent ? 200 : 201 })
    }

    if (action === 'create') {
      const normalized = normalizeMarketingOperationInput(body.operation)
      const document = { ...normalized, _id: normalized._id!, _type: MARKETING_OPERATION_TYPE }
      const existing = await clients.privateClient.fetch<MarketingOperation | null>(
        `*[_id == $id && _type == "marketingOperation"][0]{_id, _type, _rev, _createdAt, _updatedAt, title, summary, whyNow, nextAction, humanQuestion, humanResponse, status, priority, kind, origin, autonomy, ownerName, ownerSanityUserId, dueAt, nextCheckAt, blocker, lastOutcome, targetView, sourceKey, sourceFingerprint, sourceRevision, linkedRecords, evidence, activity, completedAt, dismissedUntil, lastEvaluatedAt}`,
        { id: document._id },
      )
      if (existing?.sourceFingerprint === document.sourceFingerprint) {
        return privateMarketingJson({ item: existing, idempotent: true })
      }
      if (existing) {
        const activity = [
          ...(existing.activity || []),
          activityEntry('Reopened changed system condition', 'The source condition changed after this recommendation was completed or dismissed.'),
        ].slice(-20)
        const item = await clients.privateClient
          .patch(existing._id)
          .ifRevisionId(existing._rev || '')
          .set({
            title: document.title,
            summary: document.summary,
            whyNow: document.whyNow,
            nextAction: document.nextAction,
            humanQuestion: document.humanQuestion,
            status: document.status,
            kind: document.kind,
            origin: document.origin,
            autonomy: document.autonomy,
            blocker: document.blocker,
            lastOutcome: document.lastOutcome,
            targetView: document.targetView,
            sourceFingerprint: document.sourceFingerprint,
            sourceRevision: document.sourceRevision,
            linkedRecords: document.linkedRecords,
            evidence: document.evidence,
            activity,
            lastEvaluatedAt: document.lastEvaluatedAt,
          })
          .unset(['completedAt', 'dismissedUntil'])
          .commit() as MarketingOperation
        return privateMarketingJson({ item, idempotent: false, reopened: true })
      }
      const item = await clients.privateClient.createIfNotExists(document) as MarketingOperation
      return privateMarketingJson({ item, idempotent: false }, { status: 201 })
    }

    if (action === 'update') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      const expectedRevision = typeof body.expectedRevision === 'string' ? body.expectedRevision.trim() : ''
      if (!/^marketingOperation\.[a-z0-9]+$/i.test(id) || !expectedRevision) {
        return privateMarketingJson({ error: 'A valid operation id and expectedRevision are required.' }, { status: 400 })
      }
      const current = await clients.privateClient.fetch<MarketingOperation | null>(
        `*[_id == $id && _type == "marketingOperation"][0]{_id, _type, _rev, status, activity}`,
        { id },
      )
      if (!current) return privateMarketingJson({ error: 'Marketing operation not found.' }, { status: 404 })
      if (current._rev !== expectedRevision) {
        return privateMarketingJson({ error: 'This work item changed. Refresh before saving your update.' }, { status: 409 })
      }
      const patch = normalizeMarketingOperationPatch(body.patch)
      if (patch.status && !canTransitionMarketingOperation(current.status, patch.status)) {
        return privateMarketingJson({ error: `Cannot move this work from ${current.status} to ${patch.status}.` }, { status: 409 })
      }
      const nextStatus = patch.status || current.status
      const now = new Date().toISOString()
      const activity = [
        ...(current.activity || []),
        activityEntry('Updated shared work', compactTextForLog(body.note) || `Status is ${nextStatus}.`, 'person'),
      ].slice(-20)
      const set: Record<string, unknown> = { ...patch, activity, lastEvaluatedAt: now }
      const unset: string[] = []
      for (const field of ['ownerName', 'ownerSanityUserId', 'dueAt', 'nextCheckAt', 'blocker', 'humanQuestion', 'humanResponse', 'completedAt', 'dismissedUntil']) {
        if (field in set && !set[field]) {
          delete set[field]
          unset.push(field)
        }
      }
      if (nextStatus === 'done') set.completedAt = patch.completedAt || now
      else if (current.status === 'done') unset.push('completedAt')

      let builder = clients.privateClient.patch(id).ifRevisionId(expectedRevision).set(set)
      if (unset.length > 0) builder = builder.unset(Array.from(new Set(unset)))
      const item = await builder.commit() as MarketingOperation
      return privateMarketingJson({ item })
    }

    // Prompt/model attempts such as {action:'publish', safetyClass:'low'} land
    // here. The handler has no generic route or patch escape hatch.
    return privateMarketingJson({ error: 'Unsupported Marketing Operations action.' }, { status: 400 })
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : /revision|conflict/i.test(error instanceof Error ? error.message : '')
        ? 409
        : 500
    const message = status === 409
      ? 'This work item changed. Refresh before trying again.'
      : error instanceof Error ? error.message : 'Marketing Operations could not save the change.'
    return privateMarketingJson({ error: message }, { status })
  }
}

function compactTextForLog(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 300) : ''
}
