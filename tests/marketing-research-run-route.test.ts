import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>()
  let resultSequence = 0
  let projectPatchConflict = false
  let failResultNumber = 0
  const project: Record<string, unknown> = {
    _id: 'research-project-1',
    _rev: 'project-rev-1',
    _type: 'marketingResearchProject',
    title: 'Test research',
    seedKeywords: [],
    seedUrls: [],
    canonicalUrl: '',
    performanceSignals: [],
  }

  const fetch = vi.fn(async (query: string, params?: { id?: string; projectId?: string }) => {
    if (query.includes('_type == "marketingResearchProject"')) return { ...project }
    if (query.includes('_type == "marketingResearchRun"')) {
      const document = params?.id ? documents.get(params.id) : undefined
      return document ? { ...document } : null
    }
    if (query.includes('_type in ["feature", "caseStudy"]')) return []
    return null
  })

  const create = vi.fn(async (document: Record<string, unknown>) => {
    if (document._type === 'marketingResearchRun') {
      const id = typeof document._id === 'string' ? document._id : `run-${documents.size + 1}`
      if (documents.has(id)) throw Object.assign(new Error('document already exists'), { statusCode: 409 })
      const created = { ...document, _id: id, _rev: 'run-rev-1' }
      documents.set(id, created)
      return { ...created }
    }
    if (document._type === 'marketingResearchResult') {
      resultSequence += 1
      if (failResultNumber === resultSequence) throw new Error('simulated result persistence failure')
      const created = { ...document, _id: `result-${resultSequence}`, _rev: `result-rev-${resultSequence}` }
      documents.set(created._id, created)
      return { ...created }
    }
    throw new Error(`Unexpected create type: ${String(document._type)}`)
  })

  const patch = vi.fn((id: string) => {
    let expectedRevision = ''
    let values: Record<string, unknown> = {}
    const chain = {
      ifRevisionId(revision: string) {
        expectedRevision = revision
        return chain
      },
      set(next: Record<string, unknown>) {
        values = next
        return chain
      },
      async commit() {
        if (id === project._id) {
          if (projectPatchConflict) throw Object.assign(new Error('revision conflict'), { statusCode: 409 })
          if (expectedRevision !== project._rev) throw Object.assign(new Error('revision conflict'), { statusCode: 409 })
          Object.assign(project, values, { _rev: 'project-rev-2' })
          return { ...project }
        }
        const current = documents.get(id)
        if (!current || current._rev !== expectedRevision) {
          throw Object.assign(new Error('revision conflict'), { statusCode: 409 })
        }
        const updated = { ...current, ...values, _rev: 'run-rev-2' }
        documents.set(id, updated)
        return { ...updated }
      },
    }
    return chain
  })

  const client = { fetch, create, patch }
  return {
    documents,
    project,
    fetch,
    create,
    patch,
    client,
    createClient: vi.fn(() => client),
    assertStudioOrApiKey: vi.fn(async () => {}),
    setProjectPatchConflict(value: boolean) {
      projectPatchConflict = value
    },
    failResultAt(number: number) {
      failResultNumber = number
    },
    reset() {
      documents.clear()
      resultSequence = 0
      projectPatchConflict = false
      failResultNumber = 0
      Object.assign(project, {
        _rev: 'project-rev-1',
        status: 'planning',
        seedKeywords: [],
        seedUrls: [],
        canonicalUrl: '',
        performanceSignals: [],
      })
    },
  }
})

vi.mock('@sanity/client', () => ({ createClient: mocks.createClient }))
vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-token',
}))
vi.mock('@/lib/marketing/auth', () => {
  class TestMarketingAuthError extends Error {
    status: number
    constructor(message = 'Unauthorized', status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    assertStudioOrApiKey: mocks.assertStudioOrApiKey,
    MarketingAuthError: TestMarketingAuthError,
  }
})

import {
  normalizeResearchUrl,
  POST,
  RESEARCH_RUN_LIMITS,
  researchRunId,
  scanSourceUrl,
} from '@/app/api/marketing/research/run/route'

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://www.goinvo.com/api/marketing/research/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function semrushResponse(url: string | URL | Request) {
  const type = new URL(String(url)).searchParams.get('type')
  return Promise.resolve(new Response(
    type === 'phrase_kdi'
      ? ['Keyword;Keyword Difficulty Index', 'health design;42'].join('\n')
      : ['Keyword;Search Volume;CPC;Competition;Number of Results;Intent', 'health design;100;2;0.2;1000;1'].join('\n'),
    { headers: { 'Content-Type': 'text/plain' } },
  ))
}

describe('marketing research run API reliability boundary', () => {
  const originalSemrushKey = process.env.SEMRUSH_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.reset()
    delete process.env.SEMRUSH_API_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalSemrushKey === undefined) delete process.env.SEMRUSH_API_KEY
    else process.env.SEMRUSH_API_KEY = originalSemrushKey
  })

  it.each([
    ['methods must be an array', { projectId: 'research-project-1', methods: 'seoReview' }, 400],
    ['method count limit + 1', { projectId: 'research-project-1', methods: Array(RESEARCH_RUN_LIMITS.methods + 1).fill('seoReview') }, 413],
    ['keyword count limit + 1', { projectId: 'research-project-1', seedKeywords: Array(RESEARCH_RUN_LIMITS.seedKeywords + 1).fill('x') }, 413],
    ['URL count limit + 1', { projectId: 'research-project-1', seedUrls: Array(RESEARCH_RUN_LIMITS.seedUrls + 1).fill('https://example.com') }, 413],
    ['unsafe URL', { projectId: 'research-project-1', seedUrls: ['http://127.0.0.1/private'] }, 400],
    ['invalid idempotency key', { projectId: 'research-project-1', idempotencyKey: 'short' }, 400],
  ])('rejects %s before any CMS or provider work', async (_label, body, status) => {
    const providerFetch = vi.fn()
    vi.stubGlobal('fetch', providerFetch)
    const response = await POST(request(body))

    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(providerFetch).not.toHaveBeenCalled()
  })

  it('rejects malformed and oversized raw bodies before any CMS work', async () => {
    const malformed = await POST(new NextRequest('https://www.goinvo.com/api/marketing/research/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"projectId":',
    }))
    const oversized = await POST(new NextRequest('https://www.goinvo.com/api/marketing/research/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'research-project-1', padding: 'x'.repeat(RESEARCH_RUN_LIMITS.bodyBytes + 1) }),
    }))

    expect(malformed.status).toBe(400)
    expect(oversized.status).toBe(413)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('claims one deterministic run for concurrent retries and never repeats provider work', async () => {
    process.env.SEMRUSH_API_KEY = 'provider-key'
    const providerFetch = vi.fn(semrushResponse)
    vi.stubGlobal('fetch', providerFetch)
    const body = {
      projectId: 'research-project-1',
      methods: ['seoReview'],
      seedKeywords: ['health design'],
      idempotencyKey: 'research-retry-1',
    }

    const [first, concurrentReplay] = await Promise.all([POST(request(body)), POST(request(body))])
    const completedReplay = await POST(request(body))

    expect([first.status, concurrentReplay.status].sort()).toEqual([200, 202])
    expect(completedReplay.status).toBe(200)
    await expect(completedReplay.json()).resolves.toMatchObject({
      runId: researchRunId(body.projectId, body.idempotencyKey),
      status: 'complete',
      idempotent: true,
      createdResults: 1,
    })
    expect(providerFetch).toHaveBeenCalledTimes(2)
    expect(Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingResearchRun')).toHaveLength(1)
    expect(Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingResearchResult')).toHaveLength(1)
  })

  it('rejects reuse of an idempotency key with changed inputs', async () => {
    const key = 'research-retry-2'
    const first = await POST(request({ projectId: 'research-project-1', methods: ['analyticsReview'], idempotencyKey: key }))
    const changed = await POST(request({ projectId: 'research-project-1', methods: ['cmsScan'], idempotencyKey: key }))

    expect(first.status).toBe(200)
    expect(changed.status).toBe(409)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('preserves a concurrently edited project and records the run as partial', async () => {
    mocks.setProjectPatchConflict(true)
    const response = await POST(request({
      projectId: 'research-project-1',
      methods: ['analyticsReview'],
      idempotencyKey: 'research-retry-3',
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ status: 'partial', idempotent: false })
    expect(payload.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/project changed/i)]))
    expect(mocks.project.status).toBe('planning')
    expect(mocks.documents.get(payload.runId)).toMatchObject({ status: 'partial' })
  })

  it('records partial results when a later result write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.SEMRUSH_API_KEY = 'provider-key'
    const providerFetch = vi.fn((url: string | URL | Request) => {
      const type = new URL(String(url)).searchParams.get('type')
      return Promise.resolve(new Response(
        type === 'phrase_kdi'
          ? ['Keyword;Keyword Difficulty Index', 'first keyword;40', 'second keyword;45'].join('\n')
          : ['Keyword;Search Volume;CPC;Competition;Number of Results;Intent', 'first keyword;100;2;0.2;1000;1', 'second keyword;90;1;0.1;900;1'].join('\n'),
        { headers: { 'Content-Type': 'text/plain' } },
      ))
    })
    vi.stubGlobal('fetch', providerFetch)
    mocks.failResultAt(2)

    const response = await POST(request({
      projectId: 'research-project-1',
      methods: ['seoReview'],
      seedKeywords: ['first keyword', 'second keyword'],
      idempotencyKey: 'research-retry-4',
    }))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ status: 'partial', createdResults: 1 })
    expect(mocks.project.status).toBe('reviewing')
    expect(mocks.documents.get(payload.runId)).toMatchObject({ status: 'partial' })
    consoleError.mockRestore()
  })

  it('accepts public URLs but rejects executable, credentialed, local, and private targets', () => {
    expect(normalizeResearchUrl('https://example.com/path#fragment')).toBe('https://example.com/path')
    expect(normalizeResearchUrl('javascript:alert(1)')).toBeUndefined()
    expect(normalizeResearchUrl('https://user:pass@example.com')).toBeUndefined()
    expect(normalizeResearchUrl('http://localhost/private')).toBeUndefined()
    expect(normalizeResearchUrl('http://10.1.2.3/private')).toBeUndefined()
    expect(normalizeResearchUrl('https://example.com:8443/private')).toBeUndefined()
  })

  it('stops reading a streamed source response once its byte limit is exceeded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      new Uint8Array(RESEARCH_RUN_LIMITS.sourceResponseBytes + 1),
      { headers: { 'Content-Type': 'text/html' } },
    )))

    await expect(scanSourceUrl('https://example.com', { _id: 'research-project-1' }, []))
      .rejects.toThrow(/exceeded/i)
  })
})
