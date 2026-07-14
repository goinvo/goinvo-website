import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'

const mocks = vi.hoisted(() => ({
  readFetch: vi.fn(),
  outreachFetch: vi.fn(),
  create: vi.fn(),
  patch: vi.fn(),
  patchIfRevisionId: vi.fn(),
  patchSet: vi.fn(),
  patchCommit: vi.fn(),
  existingDocs: [] as Array<Record<string, unknown>>,
  generateClaudeText: vi.fn(),
  resolveMarketingModel: vi.fn(),
}))

vi.mock('@sanity/client', () => ({
  createClient: ({ dataset }: { dataset: string }) => {
    if (dataset !== 'outreach') return { fetch: mocks.readFetch }
    const patchChain: Record<string, unknown> = {}
    patchChain.ifRevisionId = mocks.patchIfRevisionId.mockImplementation(() => patchChain)
    patchChain.set = mocks.patchSet.mockImplementation(() => patchChain)
    patchChain.commit = mocks.patchCommit
    mocks.patch.mockImplementation(() => patchChain)
    return { fetch: mocks.outreachFetch, create: mocks.create, patch: mocks.patch }
  },
}))

vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-token',
}))

vi.mock('@/lib/marketing/auth', () => ({
  assertStudioWriterOrApiKey: vi.fn(async () => {}),
  MarketingAuthError: class MarketingAuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: () => true,
  resolveMarketingModel: mocks.resolveMarketingModel,
  generateClaudeText: mocks.generateClaudeText,
  parseJsonObject: (value: string) => JSON.parse(value),
}))

import { POST } from '@/app/api/marketing/outreach/extract-evidence/route'

type Source = {
  _id: string
  title: string
  slug: string
  client: string
  text: string
}

const LONG_TEXT = 'Documented client project work and outcomes. '.repeat(12)

function source(id: string, slug = id): Source {
  return {
    _id: id,
    title: `Case study ${id}`,
    slug,
    client: 'Client',
    text: LONG_TEXT,
  }
}

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.goinvo.com/api/marketing/outreach/extract-evidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function responseJson(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

describe('marketing evidence extraction batches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveMarketingModel.mockResolvedValue('claude-test')
    mocks.generateClaudeText.mockResolvedValue({
      text: JSON.stringify({
        summary: 'A concrete buyer-facing project summary.',
        techniques: ['Workflow mapping'],
        highlights: [],
      }),
      model: 'claude-test',
    })
    mocks.create.mockImplementation(async (doc) => doc)
    mocks.patchCommit.mockResolvedValue({})
    mocks.existingDocs.length = 0
    mocks.outreachFetch.mockImplementation((query: string, params?: { id?: string }) =>
      query.includes('[0]')
        ? mocks.existingDocs.find((doc) => doc._id === params?.id) || null
        : mocks.existingDocs,
    )
  })

  it('uses the continuation cursor to make progress through a forced sweep larger than the limit', async () => {
    const sources = Array.from({ length: 5 }, (_, index) => source(`case-${index + 1}`))
    mocks.readFetch.mockResolvedValue(sources)
    mocks.existingDocs.push(
      ...sources.map((item) => ({
        _id: `workEvidence-${item._id}`,
        _rev: `rev-${item._id}`,
        sourceId: item._id,
        slug: item.slug,
        manuallyEdited: false,
      })),
    )

    const first = await responseJson(await POST(request({ force: true, limit: 2 })))
    expect(first).toMatchObject({ extracted: 2, failed: 0, remaining: 3, complete: false })
    expect(first.nextCursor).toEqual(expect.any(String))

    const second = await responseJson(
      await POST(request({ force: true, limit: 2, cursor: first.nextCursor })),
    )
    expect(second).toMatchObject({ extracted: 2, failed: 0, remaining: 1, complete: false })
    expect(second.nextCursor).toEqual(expect.any(String))

    const third = await responseJson(
      await POST(request({ force: true, limit: 2, cursor: second.nextCursor })),
    )
    expect(third).toMatchObject({
      extracted: 1,
      failed: 0,
      failedTotal: 0,
      remaining: 0,
      complete: true,
      nextCursor: null,
    })

    const writtenSourceIds = mocks.patchSet.mock.calls.map(([fields]) => fields.sourceId)
    expect(writtenSourceIds).toEqual(sources.map((item) => item._id))
    expect(new Set(writtenSourceIds).size).toBe(5)
  })

  it('queries published documents and defensively collapses draft and duplicate canonical slugs', async () => {
    mocks.readFetch.mockResolvedValue([
      source('drafts.case-1', 'shared-case'),
      source('case-1', 'shared-case'),
      source('legacy-case-1', 'shared-case'),
      source('case-2', 'second-case'),
    ])

    const response = await POST(request({ limit: 10 }))
    const body = await responseJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      extracted: 2,
      totalCaseStudies: 2,
      rawCaseStudies: 4,
      duplicateSourcesSkipped: 2,
      complete: true,
    })
    expect(mocks.readFetch.mock.calls[0][0]).toContain('!(_id in path("drafts.**"))')
    expect(mocks.create.mock.calls.map(([doc]) => doc.sourceId)).toEqual([
      'case-1',
      'case-2',
    ])
  })

  it('protects manual evidence until the destructive replacement is explicitly confirmed', async () => {
    mocks.readFetch.mockResolvedValue([source('case-1')])
    mocks.existingDocs.push(
      {
        _id: 'workEvidence-drafts-case-1',
        _rev: 'rev-case-1',
        sourceId: 'drafts.case-1',
        slug: 'case-1',
        manuallyEdited: true,
      },
    )

    const protectedResponse = await POST(request({ force: true, limit: 1 }))
    const protectedBody = await responseJson(protectedResponse)
    expect(protectedBody).toMatchObject({
      extracted: 0,
      remaining: 0,
      complete: false,
      protectedManual: 1,
      protectedSourceIds: ['case-1'],
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()

    const legacyResponse = await POST(
      request({ force: true, forceEdited: true, limit: 1 }),
    )
    expect(legacyResponse.status).toBe(400)
    expect(await responseJson(legacyResponse)).toMatchObject({
      code: 'MANUAL_OVERWRITE_CONFIRMATION_REQUIRED',
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()

    const confirmedResponse = await POST(
      request({
        id: 'drafts.case-1',
        force: true,
        overwriteManual: true,
        confirmOverwriteManual: 'OVERWRITE_MANUAL_EVIDENCE',
        limit: 1,
      }),
    )
    expect(confirmedResponse.status).toBe(200)
    expect(await responseJson(confirmedResponse)).toMatchObject({
      extracted: 1,
      complete: true,
      protectedManual: 0,
    })
    expect(mocks.patch).toHaveBeenCalledWith('workEvidence-drafts-case-1')
    expect(mocks.patchIfRevisionId).toHaveBeenCalledWith('rev-case-1')
    expect(mocks.patchSet.mock.calls[0][0]).toMatchObject({
      sourceId: 'case-1',
      manuallyEdited: false,
    })
    expect(mocks.readFetch.mock.calls.at(-1)?.[1]).toEqual({ id: 'case-1' })
  })

  it('does not overwrite evidence that changed while AI extraction was running', async () => {
    mocks.readFetch.mockResolvedValue([source('case-1')])
    mocks.existingDocs.push({
      _id: 'workEvidence-case-1',
      _rev: 'revision-before',
      sourceId: 'case-1',
      slug: 'case-1',
      manuallyEdited: false,
    })
    mocks.outreachFetch.mockImplementation((query: string, params?: { id?: string }) =>
      query.includes('[0]')
        ? { ...mocks.existingDocs.find((doc) => doc._id === params?.id), _rev: 'revision-after' }
        : mocks.existingDocs,
    )

    const response = await POST(request({ force: true, limit: 1 }))
    const body = await responseJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ extracted: 0, failed: 1, complete: false })
    expect(JSON.stringify(body.results)).toContain('changed while extraction was running')
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('retries only failed source IDs before reporting an incomplete sweep', async () => {
    mocks.readFetch.mockResolvedValue([source('case-1'), source('case-2'), source('case-3')])
    mocks.generateClaudeText
      .mockRejectedValueOnce(new Error('Model timeout'))
      .mockResolvedValue({
        text: JSON.stringify({ summary: 'A supported summary.', highlights: [] }),
        model: 'claude-test',
      })

    const first = await responseJson(await POST(request({ force: true, limit: 2 })))
    expect(first).toMatchObject({ failed: 1, failedTotal: 1, remaining: 1, complete: false })

    const last = await responseJson(
      await POST(request({ force: true, limit: 2, cursor: first.nextCursor })),
    )
    expect(last).toMatchObject({
      extracted: 1,
      failed: 0,
      failedTotal: 1,
      remaining: 1,
      complete: false,
      retryingFailures: true,
    })
    expect(last.nextCursor).toEqual(expect.any(String))

    const retry = await responseJson(
      await POST(request({ force: true, limit: 2, cursor: last.nextCursor })),
    )
    expect(retry).toMatchObject({
      extracted: 1,
      failed: 0,
      failedTotal: 0,
      remaining: 0,
      complete: true,
      nextCursor: null,
    })
    expect(mocks.generateClaudeText).toHaveBeenCalledTimes(4)
  })

  it('wires the Evidence workspace to carry cursors and require explicit manual-overwrite confirmation', () => {
    const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain('{ limit: 3, force, cursor }')
    expect(source).toContain('cursor = result.nextCursor')
    expect(source).toContain("confirmOverwriteManual: 'OVERWRITE_MANUAL_EVIDENCE'")
    expect(source).not.toContain('forceEdited: true')
    expect(source).toContain("if (!finalResult.complete && finalResult.protectedManual > 0)")
  })
})
