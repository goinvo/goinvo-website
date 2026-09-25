import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const privateFetch = vi.fn()
  const publicFetch = vi.fn()
  const createIfNotExists = vi.fn()
  const chain: Record<string, unknown> = {}
  const patch = vi.fn(() => chain)
  const ifRevisionId = vi.fn(() => chain)
  const set = vi.fn(() => chain)
  const unset = vi.fn(() => chain)
  const commit = vi.fn()
  chain.ifRevisionId = ifRevisionId
  chain.set = set
  chain.unset = unset
  chain.commit = commit
  const privateClient = { fetch: privateFetch, createIfNotExists, patch }
  const publicClient = { fetch: publicFetch }
  const createClient = vi.fn(({ dataset }: { dataset: string }) => dataset === 'outreach' ? privateClient : publicClient)
  return {
    privateFetch,
    publicFetch,
    createIfNotExists,
    patch,
    ifRevisionId,
    set,
    unset,
    commit,
    privateClient,
    publicClient,
    createClient,
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
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
    assertStudioWriterOrApiKey: mocks.assertStudioWriterOrApiKey,
    MarketingAuthError: TestMarketingAuthError,
  }
})

import { GET, POST, assertPrivateMarketingOperationsDataset } from '@/app/api/marketing/operations/route'
import { MarketingAuthError } from '@/lib/marketing/auth'

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.goinvo.com/api/marketing/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const reviewedOperation = {
  title: 'Care navigation launch',
  summary: 'Review reusable evidence for the launch.',
  whyNow: 'The launch date is approaching.',
  nextAction: 'Check the internal CMS.',
  status: 'queued',
  priority: 'high',
  kind: 'update',
  origin: 'workUpdate',
  autonomy: 'safeInternal',
  targetView: 'research',
  sourceKey: 'work-update:care-navigation',
  sourceFingerprint: 'reviewed-condition-v1',
}

describe('Marketing Operations private API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.privateFetch.mockResolvedValue(null)
    mocks.publicFetch.mockResolvedValue([])
    mocks.createIfNotExists.mockImplementation(async (document) => ({ ...document, _rev: 'ops-rev-1' }))
    mocks.commit.mockResolvedValue({ _id: 'marketingOperation.updated', _type: 'marketingOperation', _rev: 'ops-rev-2' })
  })

  it('fails closed when private storage is blank or aliases the public dataset', () => {
    expect(() => assertPrivateMarketingOperationsDataset('', 'production')).toThrow(/not safely configured/i)
    expect(() => assertPrivateMarketingOperationsDataset('production', 'production')).toThrow(/not safely configured/i)
    expect(() => assertPrivateMarketingOperationsDataset('outreach', 'production')).not.toThrow()
  })

  it('routes reads to the private dataset and marks every response private/no-store', async () => {
    mocks.privateFetch.mockResolvedValueOnce([])
    const response = await GET(new NextRequest('https://www.goinvo.com/api/marketing/operations'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    await expect(response.json()).resolves.toEqual({ items: [], checked: 0, mode: 'studio-open', team: [] })
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({ dataset: 'outreach' }))
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({ dataset: 'production' }))
  })

  it('gives the desk the roster’s names — who Slack knows — from the private dataset, and survives a failed read', async () => {
    mocks.privateFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['Juhan', ' Eric ', 'Juhan', null, ''])
    const response = await GET(new NextRequest('https://www.goinvo.com/api/marketing/operations'))
    const body = await response.json()
    expect(body.team).toEqual(['Juhan', 'Eric'])
    const [rosterQuery] = mocks.privateFetch.mock.calls[1] as [string]
    expect(rosterQuery).toContain('_type == "marketingTeamAvailability"')
    expect(rosterQuery).toContain('!(_id in path("drafts.**"))')
    // Names only: the desk has no use for a Slack id.
    expect(rosterQuery).toMatch(/\]\.ownerName$/)
    expect(mocks.publicFetch).not.toHaveBeenCalled()

    mocks.privateFetch.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('roster unavailable'))
    const degraded = await GET(new NextRequest('https://www.goinvo.com/api/marketing/operations'))
    expect(degraded.status).toBe(200)
    await expect(degraded.json()).resolves.toMatchObject({ items: [], team: [] })
  })

  it('stores only the reviewed normalized item privately and runs a CMS-only read', async () => {
    mocks.publicFetch.mockResolvedValueOnce([
      {
        _id: 'case-care-navigation',
        _type: 'caseStudy',
        title: 'Care navigation for health systems',
        slug: 'care-navigation',
        description: 'Navigation launch evidence and patient access design.',
      },
    ])
    const response = await POST(request({
      action: 'handoff',
      operation: {
        ...reviewedOperation,
        rawNote: 'RAW-PRIVATE-COWORKER-NOTE-991',
        action: 'publish',
        safetyClass: 'low',
        dataset: 'production',
        patch: { autoPublish: true, publishState: 'published' },
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.publicFetch).toHaveBeenCalledTimes(1)
    expect(mocks.createIfNotExists).toHaveBeenCalledTimes(1)
    const saved = mocks.createIfNotExists.mock.calls[0][0]
    expect(saved).toMatchObject({
      _type: 'marketingOperation',
      status: 'needsHuman',
      autonomy: 'humanReview',
      sourceKey: 'work-update:care-navigation',
    })
    expect(saved.evidence).toHaveLength(1)
    expect(JSON.stringify(saved)).not.toContain('RAW-PRIVATE-COWORKER-NOTE-991')
    expect(saved).not.toHaveProperty('action')
    expect(saved).not.toHaveProperty('dataset')
    expect(saved).not.toHaveProperty('patch')
    expect(payload.item.evidence).toHaveLength(1)
  })

  it('is idempotent for the same reviewed fingerprint and does not repeat the CMS check', async () => {
    mocks.privateFetch.mockResolvedValueOnce({
      _id: 'marketingOperation.existing',
      _type: 'marketingOperation',
      _rev: 'ops-rev-1',
      ...reviewedOperation,
    })
    const response = await POST(request({ action: 'handoff', operation: reviewedOperation }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ idempotent: true, checkedCms: false })
    expect(mocks.publicFetch).not.toHaveBeenCalled()
    expect(mocks.createIfNotExists).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects prompt-injected external actions without any mutation or network read', async () => {
    const response = await POST(request({
      action: 'publish',
      safetyClass: 'low',
      dataset: 'production',
      patch: { autoPublish: true },
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('Unsupported') })
    expect(mocks.privateFetch).not.toHaveBeenCalled()
    expect(mocks.publicFetch).not.toHaveBeenCalled()
    expect(mocks.createIfNotExists).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('reopens a completed system condition only when its source fingerprint changes', async () => {
    mocks.privateFetch.mockResolvedValueOnce({
      _id: 'marketingOperation.changed1',
      _type: 'marketingOperation',
      _rev: 'ops-rev-1',
      title: 'Old condition',
      status: 'done',
      priority: 'normal',
      sourceFingerprint: 'old-condition',
      activity: [],
    })
    mocks.commit.mockResolvedValueOnce({
      _id: 'marketingOperation.changed1',
      _type: 'marketingOperation',
      _rev: 'ops-rev-2',
      status: 'queued',
      sourceFingerprint: 'new-condition',
    })
    const response = await POST(request({
      action: 'create',
      operation: { ...reviewedOperation, origin: 'dashboardGap', sourceFingerprint: 'new-condition' },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ reopened: true, idempotent: false })
    expect(mocks.ifRevisionId).toHaveBeenCalledWith('ops-rev-1')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued', sourceFingerprint: 'new-condition' }))
    expect(mocks.unset).toHaveBeenCalledWith(['completedAt', 'dismissedUntil'])
    expect(mocks.createIfNotExists).not.toHaveBeenCalled()
  })

  it('requires exact revisions and makes no stale patch', async () => {
    mocks.privateFetch.mockResolvedValueOnce({
      _id: 'marketingOperation.abc1234',
      _type: 'marketingOperation',
      _rev: 'newer-revision',
      status: 'needsHuman',
      activity: [],
    })
    const response = await POST(request({
      action: 'update',
      id: 'marketingOperation.abc1234',
      expectedRevision: 'stale-revision',
      patch: { status: 'done' },
    }))

    expect(response.status).toBe(409)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('clears the stale Slack id whenever the Studio names a new owner', async () => {
    // Claimed in Slack by Eric (his id stamped), then reassigned to Juhan here.
    // Left in place, that id would have Slack @-mention Eric about Juhan's work.
    mocks.privateFetch.mockResolvedValueOnce({
      _id: 'marketingOperation.abc1234',
      _type: 'marketingOperation',
      _rev: 'rev-1',
      status: 'queued',
      activity: [],
    })
    const response = await POST(request({
      action: 'update',
      id: 'marketingOperation.abc1234',
      expectedRevision: 'rev-1',
      patch: { ownerName: 'Juhan', ownerSanityUserId: 'user-juhan' },
      note: 'Assigned to Juhan.',
    }))

    expect(response.status).toBe(200)
    expect(mocks.ifRevisionId).toHaveBeenCalledWith('rev-1')
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ ownerName: 'Juhan', ownerSanityUserId: 'user-juhan' }))
    expect(mocks.unset).toHaveBeenCalledWith(['ownerSlackUserId'])
  })

  it('finishes an owner search from the desk with the same write Slack’s take makes', async () => {
    // Passed on in Slack ("Not me"), then assigned on the desk.
    mocks.privateFetch.mockResolvedValueOnce({
      _id: 'marketingOperation.abc1234',
      _type: 'marketingOperation',
      _rev: 'rev-1',
      status: 'needsHuman',
      activity: [],
    })
    const response = await POST(request({
      action: 'update',
      id: 'marketingOperation.abc1234',
      expectedRevision: 'rev-1',
      patch: { ownerName: 'Juhan', ownerSanityUserId: 'tm-juhan', status: 'queued', humanQuestion: '' },
      note: 'Assigned to Juhan.',
    }))
    expect(response.status).toBe(200)
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ ownerName: 'Juhan', status: 'queued' }))
    // The "who should pick it up?" question goes, and so does the old Slack id.
    expect(mocks.unset).toHaveBeenCalledWith(expect.arrayContaining(['humanQuestion', 'ownerSlackUserId']))
  })

  it('clears the Slack id with the name when the owner is cleared, and leaves it alone otherwise', async () => {
    const current = { _id: 'marketingOperation.abc1234', _type: 'marketingOperation', _rev: 'rev-1', status: 'queued', activity: [] }

    mocks.privateFetch.mockResolvedValueOnce(current)
    await POST(request({ action: 'update', id: current._id, expectedRevision: 'rev-1', patch: { ownerName: '', ownerSanityUserId: '' } }))
    expect(mocks.unset).toHaveBeenLastCalledWith(expect.arrayContaining(['ownerName', 'ownerSanityUserId', 'ownerSlackUserId']))

    mocks.unset.mockClear()
    mocks.privateFetch.mockResolvedValueOnce(current)
    await POST(request({ action: 'update', id: current._id, expectedRevision: 'rev-1', patch: { status: 'working' } }))
    // A status change says nothing about who the owner is in Slack.
    for (const call of mocks.unset.mock.calls as unknown[][]) expect(call[0]).not.toContain('ownerSlackUserId')
  })

  it('rejects unauthenticated and read-only Studio members before touching Sanity', async () => {
    mocks.assertStudioWriterOrApiKey.mockRejectedValueOnce(new MarketingAuthError('Unauthorized', 401))
    const unauthorized = await GET(new NextRequest('https://www.goinvo.com/api/marketing/operations'))
    expect(unauthorized.status).toBe(401)

    mocks.assertStudioWriterOrApiKey.mockRejectedValueOnce(new MarketingAuthError('Forbidden', 403))
    const forbidden = await POST(request({ action: 'create', operation: reviewedOperation }))
    expect(forbidden.status).toBe(403)
    expect(mocks.privateFetch).not.toHaveBeenCalled()
    expect(mocks.createIfNotExists).not.toHaveBeenCalled()
  })
})
