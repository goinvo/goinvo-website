import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'

import { isOutreachWriterRole, OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  assertOutreachSessionSigningConfigured,
  issueOutreachSessionToken,
  isSameOriginOutreachRequest,
  OutreachSessionConfigurationError,
} from '@/lib/marketing/outreachSession'
import {
  OUTREACH_SESSION_AUDIENCE,
  OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  OUTREACH_SESSION_COOKIE_NAME,
  OUTREACH_SESSION_PROOF_ID_PREFIX,
  OUTREACH_SESSION_PROOF_TTL_MS,
  OUTREACH_SESSION_PROOF_TYPE,
  OUTREACH_SESSION_TRANSACTION_ID_PREFIX,
} from '@/lib/marketing/outreachSessionContract'
import { apiVersion, projectId, writeToken } from '@/sanity/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type ProofDocument = {
  _id: string
  _rev: string
  _createdAt: string
  _type: string
  audience?: string
  transactionId?: string
  consumedAt?: string
}

type HistoryTransaction = {
  id?: unknown
  timestamp?: unknown
  author?: unknown
  documentIDs?: unknown
  mutations?: unknown
}

type ProjectAcl = {
  role?: unknown
  roles?: unknown
}

let proofClient: SanityClient | null = null

function getProofClient(): SanityClient | null {
  if (!projectId || !writeToken) return null
  if (!proofClient) {
    proofClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return proofClient
}

function isProofId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const suffix = value.slice(OUTREACH_SESSION_PROOF_ID_PREFIX.length)
  return (
    value.startsWith(OUTREACH_SESSION_PROOF_ID_PREFIX) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suffix)
  )
}

function isTransactionId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const suffix = value.slice(OUTREACH_SESSION_TRANSACTION_ID_PREFIX.length)
  return (
    value.startsWith(OUTREACH_SESSION_TRANSACTION_ID_PREFIX) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suffix)
  )
}

function isFreshTimestamp(value: unknown, nowMs: number): boolean {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return false
  return timestamp <= nowMs + 30_000 && nowMs - timestamp <= OUTREACH_SESSION_PROOF_TTL_MS
}

function parseHistoryTransactions(body: string): HistoryTransaction[] {
  const transactions: HistoryTransaction[] = []
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const parsed = JSON.parse(line) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        transactions.push(parsed as HistoryTransaction)
      }
    } catch {
      return []
    }
  }
  return transactions
}

function transactionCreatedOnlyThisProof(transaction: HistoryTransaction, proofId: string): boolean {
  const documentIds = Array.isArray(transaction.documentIDs)
    ? transaction.documentIDs.filter((id): id is string => typeof id === 'string')
    : []
  if (documentIds.length !== 1 || documentIds[0] !== proofId) return false
  if (!Array.isArray(transaction.mutations) || transaction.mutations.length !== 1) return false
  const mutation = transaction.mutations[0]
  if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation) || !('create' in mutation)) return false
  const created = (mutation as { create?: unknown }).create
  return Boolean(
    created &&
      typeof created === 'object' &&
      !Array.isArray(created) &&
      (created as { _id?: unknown })._id === proofId,
  )
}

async function readProofAuthor(
  proofId: string,
  proofRevision: string,
  nowMs: number,
): Promise<string | null> {
  const historyVersion = 'v2025-02-19'
  const url = new URL(
    `https://${projectId}.api.sanity.io/${historyVersion}/data/history/${encodeURIComponent(OUTREACH_DATASET)}/transactions/${encodeURIComponent(proofId)}`,
  )
  // Sanity records the create transaction under the resulting document
  // revision. A caller-supplied mutation transactionId is not the History API
  // row id, even when @sanity/client accepts it as a mutate option.
  url.searchParams.set('fromTransaction', proofRevision)
  url.searchParams.set('toTransaction', proofRevision)
  url.searchParams.set('excludeContent', 'true')
  url.searchParams.set('limit', '2')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${writeToken}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Sanity proof history was unavailable.')

  const transaction = parseHistoryTransactions(await response.text()).find(
    (candidate) => candidate.id === proofRevision,
  )
  if (
    !transaction ||
    !isFreshTimestamp(transaction.timestamp, nowMs) ||
    !transactionCreatedOnlyThisProof(transaction, proofId) ||
    typeof transaction.author !== 'string' ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(transaction.author) ||
    transaction.author === '<anonymous>' ||
    transaction.author === '<system>'
  ) {
    return null
  }
  return transaction.author
}

function roleNames(acl: ProjectAcl): string[] {
  const names: string[] = []
  if (typeof acl.role === 'string') names.push(acl.role)
  if (Array.isArray(acl.roles)) {
    for (const role of acl.roles) {
      if (typeof role === 'string') names.push(role)
      else if (role && typeof role === 'object' && !Array.isArray(role) && 'name' in role) {
        const name = (role as { name?: unknown }).name
        if (typeof name === 'string') names.push(name)
      }
    }
  }
  return names.map((name) => name.trim().toLowerCase()).filter(Boolean)
}

async function readProofAuthorRole(author: string): Promise<string | null> {
  const response = await fetch(
    `https://api.sanity.io/v2021-10-04/projects/${encodeURIComponent(projectId)}/acl/${encodeURIComponent(author)}`,
    {
      headers: { Authorization: `Bearer ${writeToken}` },
      cache: 'no-store',
    },
  )
  if (!response.ok) throw new Error('Sanity project membership was unavailable.')
  const acl = (await response.json().catch(() => null)) as ProjectAcl | null
  return roleNames(acl || {}).find(isOutreachWriterRole) || null
}

function conflictStatus(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      Number((error as { statusCode?: unknown }).statusCode) === 409,
  )
}

/**
 * Exchanges a one-time private-dataset proof for a short-lived HttpOnly cookie.
 * The proof's Content Lake history author is authoritative; client-supplied
 * user ids or roles are never accepted.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginOutreachRequest(request)) {
    return privateMarketingJson({ error: 'A same-origin Studio request is required.' }, { status: 403 })
  }

  try {
    assertOutreachSessionSigningConfigured()
  } catch (error) {
    if (error instanceof OutreachSessionConfigurationError) {
      return privateMarketingJson({ error: 'Outreach cookie sessions are not configured.' }, { status: 503 })
    }
    throw error
  }

  const client = getProofClient()
  if (!client) {
    return privateMarketingJson({ error: 'Outreach session verification is unavailable.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as
    | { proofId?: unknown; transactionId?: unknown }
    | null
  if (!body || !isProofId(body.proofId) || !isTransactionId(body.transactionId)) {
    return privateMarketingJson({ error: 'A valid proofId and transactionId are required.' }, { status: 400 })
  }

  const proofId = body.proofId
  const transactionId = body.transactionId
  const proof = await client.fetch<ProofDocument | null>(
    `*[_id == $proofId && _type == $proofType][0]{
      _id, _rev, _createdAt, _type, audience, transactionId, consumedAt
    }`,
    { proofId, proofType: OUTREACH_SESSION_PROOF_TYPE },
  )
  const nowMs = Date.now()
  if (
    !proof ||
    proof._id !== proofId ||
    proof._type !== OUTREACH_SESSION_PROOF_TYPE ||
    proof.audience !== OUTREACH_SESSION_AUDIENCE ||
    proof.transactionId !== transactionId ||
    proof.consumedAt ||
    !proof._rev ||
    !isFreshTimestamp(proof._createdAt, nowMs)
  ) {
    return privateMarketingJson({ error: 'The Studio proof is missing, expired, or already used.' }, { status: 401 })
  }

  let author: string | null
  let role: string | null
  try {
    author = await readProofAuthor(proofId, proof._rev, nowMs)
    if (!author) {
      return privateMarketingJson({ error: 'The Studio proof transaction could not be verified.' }, { status: 401 })
    }
    role = await readProofAuthorRole(author)
  } catch {
    return privateMarketingJson({ error: 'Outreach session verification is temporarily unavailable.' }, { status: 503 })
  }
  if (!role) {
    return privateMarketingJson({ error: 'Your Studio role cannot use private Outreach operations.' }, { status: 403 })
  }

  // Atomically consume before issuing the credential. Two simultaneous
  // exchanges share the same revision; exactly one can pass this precondition.
  try {
    await client
      .patch(proofId)
      .ifRevisionId(proof._rev)
      .set({ consumedAt: new Date(nowMs).toISOString() })
      .commit({ visibility: 'sync' })
  } catch (error) {
    return privateMarketingJson(
      { error: conflictStatus(error) ? 'The Studio proof was already used.' : 'The Studio proof could not be consumed.' },
      { status: conflictStatus(error) ? 409 : 503 },
    )
  }

  const token = issueOutreachSessionToken({ subject: author, role }, nowMs)

  // The consumed marker is the replay boundary. Deletion is best-effort
  // cleanup; a failed delete leaves an unusable proof, never a reusable one.
  try {
    await client.delete(proofId)
  } catch (error) {
    console.warn('Could not delete consumed Outreach session proof:', error)
  }

  const response = privateMarketingJson({ authenticated: true, expiresIn: OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS })
  response.cookies.set({
    name: OUTREACH_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
