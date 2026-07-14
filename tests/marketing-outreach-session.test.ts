import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const chain: Record<string, unknown> = {}
  const ifRevisionId = vi.fn(() => chain)
  const set = vi.fn(() => chain)
  const commit = vi.fn(async () => ({}))
  chain.ifRevisionId = ifRevisionId
  chain.set = set
  chain.commit = commit
  return {
    fetch: vi.fn(),
    patch: vi.fn(() => chain),
    remove: vi.fn(async () => ({})),
    ifRevisionId,
    set,
    commit,
  }
})

vi.mock('@sanity/client', () => ({
  createClient: () => ({
    fetch: mocks.fetch,
    patch: mocks.patch,
    delete: mocks.remove,
  }),
}))

vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-02-19',
  projectId: 'session-test-project',
  writeToken: 'server-only-sanity-write-token',
}))

import { POST } from '@/app/api/marketing/outreach/session/route'
import { assertStudioWriterOrApiKey } from '@/lib/marketing/auth'
import {
  issueOutreachSessionToken,
  readValidOutreachSessionCookie,
  verifyOutreachSessionToken,
} from '@/lib/marketing/outreachSession'
import {
  createOutreachSessionProof,
  OUTREACH_SESSION_AUDIENCE,
  OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  OUTREACH_SESSION_COOKIE_NAME,
  OUTREACH_SESSION_ENDPOINT,
  OUTREACH_SESSION_PROOF_ID_PREFIX,
  OUTREACH_SESSION_PROOF_TYPE,
  OUTREACH_SESSION_TRANSACTION_ID_PREFIX,
} from '@/lib/marketing/outreachSessionContract'

const SECRET = 'cookie-session-test-secret-with-more-than-32-bytes'
const NOW = Date.parse('2026-07-14T16:00:00.000Z')
const PROOF_UUID = '123e4567-e89b-42d3-a456-426614174000'
const TRANSACTION_UUID = '123e4567-e89b-42d3-b456-426614174001'
const proofId = `${OUTREACH_SESSION_PROOF_ID_PREFIX}${PROOF_UUID}`
const transactionId = `${OUTREACH_SESSION_TRANSACTION_ID_PREFIX}${TRANSACTION_UUID}`
const proofRevision = 'proof-revision-1'

function proof(overrides: Record<string, unknown> = {}) {
  return {
    _id: proofId,
    _rev: proofRevision,
    _createdAt: new Date(NOW).toISOString(),
    _type: OUTREACH_SESSION_PROOF_TYPE,
    audience: OUTREACH_SESSION_AUDIENCE,
    transactionId,
    ...overrides,
  }
}

function history(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: proofRevision,
    timestamp: new Date(NOW).toISOString(),
    author: 'project-user-editor',
    documentIDs: [proofId],
    mutations: [{ create: { _id: proofId } }],
    ...overrides,
  })
}

function exchangeRequest(
  body: Record<string, unknown> = { proofId, transactionId },
  origin = 'https://www.goinvo.com',
) {
  return new NextRequest(`https://www.goinvo.com${OUTREACH_SESSION_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  })
}

function network(options: { history?: string; role?: string; historyStatus?: number; aclStatus?: number } = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('/data/history/')) {
      return new Response(options.history ?? history(), { status: options.historyStatus ?? 200 })
    }
    if (url.includes('/projects/session-test-project/acl/')) {
      return new Response(JSON.stringify({ role: options.role ?? 'editor' }), {
        status: options.aclStatus ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error(`Unexpected network request: ${url}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('MARKETING_OUTREACH_SESSION_SECRET', SECRET)
  vi.stubEnv('MARKETING_API_KEY', '')
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  mocks.fetch.mockResolvedValue(proof())
  mocks.commit.mockResolvedValue({})
  mocks.remove.mockResolvedValue({})
  vi.stubGlobal('fetch', network())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Outreach cookie-mode session contract', () => {
  it('wires the proof exchange and authenticated retry into every private Outreach action', () => {
    const source = readFileSync(
      'src/sanity/components/marketing/OutreachWorkspace.tsx',
      'utf8',
    ).replace(/\r\n/g, '\n')
    const requestHelper = readFileSync(
      'src/sanity/components/marketing/authenticatedMarketingRequest.ts',
      'utf8',
    ).replace(/\r\n/g, '\n')

    expect(requestHelper).toContain('const proof = createOutreachSessionProof()')
    expect(requestHelper).toContain('await proofClient.create(proof.document')
    expect(requestHelper).toContain('transactionId: proof.transactionId')
    expect(requestHelper).toContain("credentials: 'same-origin'")
    expect(requestHelper).toContain('fetch(OUTREACH_SESSION_ENDPOINT')
    expect(requestHelper).toContain('response = await request()')
    expect(source).toContain('authenticatedMarketingRequest as outreachApi')

    const authenticatedCalls = source.match(/\n\s+outreachClient,\n\s+\)/g) || []
    expect(authenticatedCalls).toHaveLength(10)
  })

  it('creates only random public proof identifiers for the browser handoff', () => {
    const randomUUID = vi.fn()
      .mockReturnValueOnce(PROOF_UUID)
      .mockReturnValueOnce(TRANSACTION_UUID)
    vi.stubGlobal('crypto', { randomUUID })

    expect(createOutreachSessionProof()).toEqual({
      proofId,
      transactionId,
      document: {
        _id: proofId,
        _type: OUTREACH_SESSION_PROOF_TYPE,
        audience: OUTREACH_SESSION_AUDIENCE,
        transactionId,
      },
    })
  })

  it('signs, verifies, expires, and rejects tampering on the short-lived cookie token', () => {
    const token = issueOutreachSessionToken({ subject: 'project-user-editor', role: 'editor' }, NOW)
    expect(verifyOutreachSessionToken(token, NOW)).toMatchObject({
      sub: 'project-user-editor',
      role: 'editor',
      aud: OUTREACH_SESSION_AUDIENCE,
    })

    const parts = token.split('.')
    const tamperedPayload = `${parts[1].slice(0, -1)}${parts[1].endsWith('A') ? 'B' : 'A'}`
    expect(verifyOutreachSessionToken(`${parts[0]}.${tamperedPayload}.${parts[2]}`, NOW)).toBeNull()
    expect(
      verifyOutreachSessionToken(
        token,
        NOW + OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS * 1000 + 1,
      ),
    ).toBeNull()
  })

  it('accepts the cookie only on a same-origin request', () => {
    const token = issueOutreachSessionToken({ subject: 'project-user-editor', role: 'editor' }, NOW)
    const cookie = `${OUTREACH_SESSION_COOKIE_NAME}=${token}`
    expect(
      readValidOutreachSessionCookie(
        new Request('https://www.goinvo.com/api/marketing/outreach/plan', {
          headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-origin' },
        }),
        NOW,
      ),
    ).toMatchObject({ sub: 'project-user-editor' })
    expect(
      readValidOutreachSessionCookie(
        new Request('https://www.goinvo.com/api/marketing/outreach/plan', {
          headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-site' },
        }),
        NOW,
      ),
    ).toBeNull()
  })

  it('does not let a correctly signed non-writer role through the private API guard', async () => {
    const token = issueOutreachSessionToken({ subject: 'project-user-viewer', role: 'viewer' }, NOW)
    await expect(
      assertStudioWriterOrApiKey(
        new Request('https://www.goinvo.com/api/marketing/outreach/plan', {
          headers: {
            Cookie: `${OUTREACH_SESSION_COOKIE_NAME}=${token}`,
            'Sec-Fetch-Site': 'same-origin',
          },
        }),
      ),
    ).rejects.toMatchObject({ name: 'MarketingAuthError', status: 401 })
  })
})

describe('Outreach one-time proof exchange', () => {
  it('verifies the transaction author and role, consumes the proof, and issues an HttpOnly cookie', async () => {
    const networkFetch = network()
    vi.stubGlobal('fetch', networkFetch)

    const response = await POST(exchangeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ authenticated: true, expiresIn: OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(`${OUTREACH_SESSION_COOKIE_NAME}=`)
    expect(setCookie.toLowerCase()).toContain('httponly')
    expect(setCookie.toLowerCase()).toContain('samesite=strict')
    expect(mocks.patch).toHaveBeenCalledWith(proofId)
    expect(mocks.ifRevisionId).toHaveBeenCalledWith('proof-revision-1')
    expect(mocks.set).toHaveBeenCalledWith({ consumedAt: new Date(NOW).toISOString() })
    expect(mocks.commit).toHaveBeenCalledWith({ visibility: 'sync' })
    expect(mocks.remove).toHaveBeenCalledWith(proofId)
    expect(networkFetch).toHaveBeenCalledTimes(2)
    const historyUrl = String(networkFetch.mock.calls[0]?.[0])
    expect(historyUrl).toContain(`fromTransaction=${proofRevision}`)
    expect(historyUrl).toContain(`toTransaction=${proofRevision}`)
    expect(historyUrl).not.toContain(`fromTransaction=${transactionId}`)

    const cookiePair = setCookie.split(';')[0]
    await expect(
      assertStudioWriterOrApiKey(
        new Request('https://www.goinvo.com/api/marketing/outreach/plan', {
          headers: { Cookie: cookiePair, 'Sec-Fetch-Site': 'same-origin' },
        }),
      ),
    ).resolves.toBeUndefined()
    // Cookie verification is local; it never sends the signed credential to Sanity.
    expect(networkFetch).toHaveBeenCalledTimes(2)
  })

  it('fails before touching Sanity for cross-origin or malformed requests', async () => {
    const crossOrigin = await POST(exchangeRequest({ proofId, transactionId }, 'https://attacker.example'))
    expect(crossOrigin.status).toBe(403)

    const malformed = await POST(exchangeRequest({ proofId: 'bad', transactionId: 'also-bad' }))
    expect(malformed.status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects expired and replayed proofs before history or mutation work', async () => {
    mocks.fetch.mockResolvedValueOnce(proof({ _createdAt: new Date(NOW - 121_000).toISOString() }))
    const expired = await POST(exchangeRequest())
    expect(expired.status).toBe(401)
    expect(mocks.patch).not.toHaveBeenCalled()

    vi.clearAllMocks()
    mocks.fetch.mockResolvedValueOnce(proof({ consumedAt: new Date(NOW - 1000).toISOString() }))
    const replayed = await POST(exchangeRequest())
    expect(replayed.status).toBe(401)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects a mismatched history revision and a non-writer author without consuming', async () => {
    vi.stubGlobal('fetch', network({ history: history({ id: 'different-revision' }) }))
    const invalidHistory = await POST(exchangeRequest())
    expect(invalidHistory.status).toBe(401)
    expect(mocks.patch).not.toHaveBeenCalled()

    vi.clearAllMocks()
    mocks.fetch.mockResolvedValueOnce(proof())
    vi.stubGlobal('fetch', network({ role: 'viewer' }))
    const viewer = await POST(exchangeRequest())
    expect(viewer.status).toBe(403)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('loses a consume race without issuing a cookie', async () => {
    mocks.commit.mockRejectedValueOnce({ statusCode: 409 })
    const response = await POST(exchangeRequest())
    expect(response.status).toBe(409)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('fails closed when no server-side signing secret is configured', async () => {
    vi.stubEnv('MARKETING_OUTREACH_SESSION_SECRET', '')
    vi.stubEnv('MARKETING_API_KEY', '')
    const response = await POST(exchangeRequest())
    expect(response.status).toBe(503)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
