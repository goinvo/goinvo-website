import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const chain: Record<string, unknown> = {}
  const fetch = vi.fn()
  const ifRevisionId = vi.fn(() => chain)
  const set = vi.fn(() => chain)
  const commit = vi.fn(async () => ({}))
  const patch = vi.fn(() => chain)
  const createClient = vi.fn(() => ({ fetch, patch }))
  chain.ifRevisionId = ifRevisionId
  chain.set = set
  chain.commit = commit
  return {
    fetch,
    patch,
    createClient,
    ifRevisionId,
    set,
    commit,
    generateClaudeText: vi.fn(),
  }
})

vi.mock('@sanity/client', () => ({
  createClient: mocks.createClient,
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
  resolveMarketingModel: vi.fn(async () => 'claude-test'),
  generateClaudeText: mocks.generateClaudeText,
  parseJsonObject: (value: string) => JSON.parse(value),
}))

import { POST } from '@/app/api/marketing/outreach/research/route'

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.goinvo.com/api/marketing/outreach/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const contact = {
  _id: 'contact-1',
  _rev: 'revision-before',
  name: 'Alex Kim',
  organization: 'Acme Health',
  role: 'VP Product',
  segment: 'provider',
  status: 'new',
}

describe('outreach research write safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateClaudeText.mockResolvedValue({
      text: JSON.stringify({
        researchSummary: 'A source-backed organization summary.',
        personVerified: true,
        identityConfidence: 'high',
        opportunities: [{ headline: 'A relevant opportunity' }],
        callBrief: 'A complete call brief with enough detail for a responsible human review.',
      }),
      model: 'claude-test',
      sources: [{ title: 'Company site', url: 'https://example.com/company' }],
    })
  })

  it('returns 409 and writes nothing when the contact changes during research', async () => {
    mocks.fetch.mockImplementation(async (query: string) => {
      if (query.includes('marketingContact') && query.includes('_rev}') && query.includes('[0]')) {
        return { _rev: 'revision-after' }
      }
      if (query.includes('marketingContact')) return contact
      if (query.includes('marketingOffer')) return []
      if (query.includes('marketingWorkEvidence')) return []
      return null
    })

    const response = await POST(request({ id: contact._id }))

    expect(response.status).toBe(409)
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({ dataset: 'outreach' }))
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({ dataset: 'production' }))
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('changed while research') })
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('deduplicates/ranks the enriched evidence projection and revision-checks a successful write', async () => {
    mocks.fetch.mockImplementation(async (query: string) => {
      if (query.includes('marketingContact') && query.includes('_rev}') && query.includes('[0]')) {
        return { _rev: contact._rev }
      }
      if (query.includes('marketingContact')) return contact
      if (query.includes('marketingOffer')) return []
      if (query.includes('marketingWorkEvidence')) {
        return [
          {
            _id: 'evidence-draft',
            sourceId: 'drafts.case-1',
            slug: 'case-1',
            title: 'Draft duplicate',
            status: 'active',
          },
          {
            _id: 'evidence-published',
            sourceId: 'case-1',
            slug: 'case-1',
            title: 'Acme provider workflow',
            segments: ['provider'],
            status: 'active',
          },
        ]
      }
      return null
    })

    const response = await POST(request({ id: contact._id }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ evidenceCandidates: 2, evidenceIndexSize: 1 })
    expect(mocks.patch).toHaveBeenCalledWith(contact._id)
    expect(mocks.ifRevisionId).toHaveBeenCalledWith(contact._rev)
    expect(mocks.set).toHaveBeenCalledTimes(1)
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ researchBrandVoiceKey: null, researchBrandVoiceName: null }),
    )
    const evidenceQuery = mocks.fetch.mock.calls.find(([query]) => String(query).includes('marketingWorkEvidence'))?.[0]
    expect(evidenceQuery).toContain('sourceId, slug, url, manuallyEdited, extractedAt')
    expect(mocks.generateClaudeText.mock.calls[0][0].user).toContain('Acme provider workflow')
    expect(mocks.generateClaudeText.mock.calls[0][0].user).not.toContain('Draft duplicate')
  })

  it('resolves the contact voice from production settings and stores only its provenance', async () => {
    mocks.fetch.mockImplementation(async (query: string) => {
      if (query.includes('.brandVoices[]')) {
        return [
          {
            _key: 'principal',
            name: 'Principal voice',
            purpose: 'Warm outreach',
            guidance: 'Compact, candid, and specific.',
            do: ['Lead with the useful point.'],
            avoid: ['Hype.'],
            examples: ['Here is what I think is worth discussing.'],
            status: 'active',
            isDefault: false,
          },
          {
            _key: 'studio',
            name: 'Studio voice',
            guidance: 'Clear and useful.',
            status: 'active',
            isDefault: true,
          },
        ]
      }
      if (query.includes('marketingContact') && query.includes('_rev}') && query.includes('[0]')) {
        return { _rev: contact._rev }
      }
      if (query.includes('marketingContact')) return { ...contact, brandVoiceKey: 'principal' }
      if (query.includes('marketingOffer')) return []
      if (query.includes('marketingWorkEvidence')) return []
      return null
    })

    const response = await POST(request({ id: contact._id }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.brandVoice).toEqual({ key: 'principal', name: 'Principal voice', selection: 'requested' })
    expect(body).not.toHaveProperty('approvedBrandVoice')
    expect(JSON.stringify(body)).not.toContain('Compact, candid, and specific.')

    const claudeRequest = mocks.generateClaudeText.mock.calls[0][0]
    const promptPayload = JSON.parse(claudeRequest.user)
    expect(claudeRequest.system).toContain('OUTREACH VOICE SCOPE')
    expect(promptPayload.approvedBrandVoice).toMatchObject({
      key: 'principal',
      name: 'Principal voice',
      guidance: 'Compact, candid, and specific.',
    })
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        researchBrandVoiceKey: 'principal',
        researchBrandVoiceName: 'Principal voice',
      }),
    )
  })
})
