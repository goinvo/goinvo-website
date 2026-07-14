import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const chain: Record<string, unknown> = {}
  const fetch = vi.fn()
  const patch = vi.fn((id: string) => {
    void id
    return chain
  })
  const ifRevisionId = vi.fn((revision: string) => {
    void revision
    return chain
  })
  const set = vi.fn((fields: Record<string, unknown>) => {
    void fields
    return chain
  })
  const commit = vi.fn(async () => ({ _rev: 'settings-rev-2' }))
  const client = { fetch, patch }
  chain.ifRevisionId = ifRevisionId
  chain.set = set
  chain.commit = commit
  return {
    client,
    fetch,
    patch,
    ifRevisionId,
    set,
    commit,
    getMarketingWriteClient: vi.fn(() => client),
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
    generateClaudeText: vi.fn(),
    resolveMarketingModel: vi.fn(async () => 'claude-test'),
  }
})

vi.mock('@/lib/marketing/client', () => ({
  getMarketingWriteClient: mocks.getMarketingWriteClient,
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

vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: () => true,
  resolveMarketingModel: mocks.resolveMarketingModel,
  generateClaudeText: mocks.generateClaudeText,
  parseJsonObject: (text: string) => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  },
}))

import { POST, BRAND_VOICE_LEARNING_SYSTEM_POLICY } from '@/app/api/marketing/brand-voice/learn/route'
import { MarketingAuthError } from '@/lib/marketing/auth'
import type { BrandVoiceLearningProposal } from '@/lib/marketing/brandVoiceLearning'
import { authorizeBrandVoiceLearningProposal } from '@/lib/marketing/brandVoiceLearningAuthorization'

const SIGNING_SECRET = 'brand-voice-learning-route-test-secret-000000000000'

function stubSigningEnvironment(secret = SIGNING_SECRET) {
  vi.stubEnv('MARKETING_BRAND_VOICE_LEARNING_SECRET', secret)
  vi.stubEnv('MARKETING_OUTREACH_SESSION_SECRET', '')
  vi.stubEnv('MARKETING_API_KEY', '')
  vi.stubEnv('SANITY_WRITE_TOKEN', '')
  vi.stubEnv('SANITY_API_WRITE_TOKEN', '')
}

const settings = {
  _rev: 'settings-rev-1',
  brandVoices: [
    {
      _key: 'principal',
      name: 'Principal voice',
      purpose: 'Public marketing copy',
      guidance: 'Be direct, useful, and calm.',
      do: ['Lead with the useful point.'],
      avoid: ['Avoid promotional hype.'],
      examples: ['Make the decision visible.'],
      status: 'active',
      isDefault: true,
    },
  ],
}

function request(body: unknown) {
  return new Request('https://www.goinvo.com/api/marketing/brand-voice/learn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function proposal(overrides: Partial<BrandVoiceLearningProposal> = {}): BrandVoiceLearningProposal {
  return {
    voice: { key: 'principal', name: 'Principal voice' },
    surface: 'contentDraft',
    settingsRevision: 'settings-rev-1',
    summary: 'The edit moves the decision ahead of the setup.',
    confidence: 'medium',
    changedFields: ['headline', 'caption'],
    doAdditions: ['Put the decision before the background.'],
    avoidAdditions: ['Avoid long setup before the point.'],
    curatedExamples: [
      {
        text: 'Make the decision visible.',
        principles: ['Use concrete phrasing.'],
        reason: 'Retains a distinct approved example from the existing set.',
      },
      {
        text: 'Start with the decision.',
        principles: ['Lead with the point.'],
        reason: 'A compact decision-first opening.',
      },
    ],
    ...overrides,
  }
}

function authorizedProposal(overrides: Partial<BrandVoiceLearningProposal> = {}) {
  return authorizeBrandVoiceLearningProposal(proposal(overrides))
}

describe('brand voice learning route', () => {
  beforeEach(() => {
    stubSigningEnvironment()
    vi.clearAllMocks()
    mocks.fetch.mockResolvedValue(settings)
    mocks.commit.mockResolvedValue({ _rev: 'settings-rev-2' })
    mocks.generateClaudeText.mockResolvedValue({
      text: JSON.stringify({
        summary: 'The edit moves the decision ahead of the setup.',
        confidence: 'medium',
        guidanceReplacement: 'Lead with the decision and use compact, useful language.',
        doAdditions: ['Put the decision before the background.'],
        avoidAdditions: ['Avoid long setup before the point.'],
        curatedExamples: [
          {
            text: 'Start with the decision.',
            principles: ['Lead with the point.'],
            reason: 'A compact decision-first opening.',
          },
        ],
      }),
      model: 'claude-test',
      citedUrls: [],
      sources: [],
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a bounded proposal without mutating settings or exposing ignored fields to the model', async () => {
    const response = await POST(
      request({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'contentDraft',
        before: {
          headline: 'Generated opening',
          caption: 'Background before the decision.',
          callToAction: 'Learn more',
          price: '$10,000',
          canonicalUrl: 'https://old.example',
          frames: [{ title: 'Background', body: 'Long setup', altText: 'Factual image' }],
        },
        after: {
          headline: 'Start with the decision.',
          caption: 'Name the tradeoff, then the next move.',
          callToAction: 'Learn more',
          price: '$20,000',
          canonicalUrl: 'https://new.example',
          evidence: 'Private claim',
          frames: [
            { title: 'Background', body: 'Long setup', altText: 'Changed factual image' },
            { title: 'New frame', body: 'Not in generated shape' },
          ],
        },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(body.proposal).toMatchObject({
      voice: { key: 'principal', name: 'Principal voice' },
      settingsRevision: 'settings-rev-1',
      surface: 'contentDraft',
      changedFields: ['headline', 'caption'],
      confidence: 'medium',
      doAdditions: ['Put the decision before the background.'],
    })
    expect(body.proposal).not.toHaveProperty('guidanceReplacement')
    expect(body.proposal.authorization).toMatchObject({
      version: 1,
      issuedAt: expect.any(Number),
      expiresAt: expect.any(Number),
      signature: expect.stringMatching(/^[A-Za-z0-9_-]{32,128}$/),
    })
    expect(mocks.assertStudioWriterOrApiKey).toHaveBeenCalledTimes(1)
    expect(mocks.patch).not.toHaveBeenCalled()

    const claudeRequest = mocks.generateClaudeText.mock.calls[0][0]
    expect(claudeRequest.system).toBe(BRAND_VOICE_LEARNING_SYSTEM_POLICY)
    expect(claudeRequest.system).toMatch(/One edit is weak evidence/i)
    expect(claudeRequest.system).toMatch(/proper nouns.*prices.*URLs.*citations.*evidence.*scores/i)
    const userData = JSON.parse(claudeRequest.user)
    expect(userData).toMatchObject({
      surface: 'contentDraft',
      changedFields: ['headline', 'caption'],
      generatedCopy: {
        headline: 'Generated opening',
        caption: 'Background before the decision.',
      },
      finalCopy: {
        headline: 'Start with the decision.',
        caption: 'Name the tradeoff, then the next move.',
      },
    })
    expect(JSON.stringify(userData)).not.toMatch(/\$20,000|new\.example|Private claim|altText|New frame/)
  })

  it('returns a safe low-confidence proposal without spending model credits when allowed copy did not change', async () => {
    const response = await POST(
      request({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'contentDraft',
        before: { headline: 'Same headline', price: '$10' },
        after: { headline: 'Same headline', price: '$20', evidence: 'Changed fact' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.proposal).toMatchObject({
      confidence: 'low',
      changedFields: [],
      doAdditions: [],
      avoidAdditions: [],
      curatedExamples: [],
    })
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects an oversized edit body even when no content-length header is available', async () => {
    const oversized = new Request('https://www.goinvo.com/api/marketing/brand-voice/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'contentDraft',
        before: { caption: 'before' },
        after: { caption: 'x'.repeat(210_000) },
      }),
    })

    const response = await POST(oversized)
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'Learning request is too large.' })
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('requires writer auth and applies only explicitly selected fields with an exact revision guard', async () => {
    const response = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal(),
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: true,
        },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      applied: true,
      voice: { key: 'principal', name: 'Principal voice' },
      settingsRevision: 'settings-rev-2',
      changes: {
        guidance: false,
        do: ['Put the decision before the background.'],
        avoid: [],
        examples: ['Make the decision visible.', 'Start with the decision.'],
      },
    })
    expect(mocks.assertStudioWriterOrApiKey).toHaveBeenCalledTimes(1)
    expect(mocks.patch).toHaveBeenCalledWith('marketingSettings')
    expect(mocks.ifRevisionId).toHaveBeenCalledWith('settings-rev-1')
    expect(mocks.set).toHaveBeenCalledWith({
      'brandVoices[_key=="principal"].do': [
        'Lead with the useful point.',
        'Put the decision before the background.',
      ],
      'brandVoices[_key=="principal"].examples': [
        'Make the decision visible.',
        'Start with the decision.',
      ],
    })
    expect(JSON.stringify(mocks.set.mock.calls[0][0])).not.toMatch(
      /summary|principles|reason|generated|final|changedFields/,
    )
  })

  it('rejects an unsigned or modified proposal before reading or patching shared settings', async () => {
    const unsigned = await POST(
      request({
        action: 'apply',
        proposal: proposal(),
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: false,
        },
      }),
    )
    expect(unsigned.status).toBe(409)
    await expect(unsigned.json()).resolves.toEqual({
      error: 'The learning proposal is expired or was modified. Compare the edit again.',
    })

    const signed = authorizedProposal()
    const modified = await POST(
      request({
        action: 'apply',
        proposal: {
          ...signed,
          doAdditions: ['Adopt a rule the server never proposed.'],
        },
        selection: {
          guidance: false,
          do: ['Adopt a rule the server never proposed.'],
          avoid: [],
          examples: false,
        },
      }),
    )
    expect(modified.status).toBe(409)
    await expect(modified.json()).resolves.toEqual({
      error: 'The learning proposal is expired or was modified. Compare the edit again.',
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects an expired signed proposal before reading or patching shared settings', async () => {
    const expired = authorizeBrandVoiceLearningProposal(proposal(), 0)
    const response = await POST(
      request({
        action: 'apply',
        proposal: expired,
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: false,
        },
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'The learning proposal is expired or was modified. Compare the edit again.',
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('refuses a signed full-guidance replacement even if a client selects it', async () => {
    const response = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal({
          guidanceReplacement: 'Replace the established voice from this one edit.',
        }),
        selection: { guidance: true, do: [], avoid: [], examples: false },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'One edit cannot replace the voice guidance. Apply a proposed Do or Avoid principle instead.',
    })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('fails closed when the server has no strong proposal-signing secret', async () => {
    stubSigningEnvironment('too-short')
    const response = await POST(
      request({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'contentDraft',
        before: { headline: 'Generated opening' },
        after: { headline: 'Start with the decision.' },
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Brand-voice proposal signing is not configured.',
    })
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects stale proposals before creating a patch', async () => {
    mocks.fetch.mockResolvedValue({ ...settings, _rev: 'settings-rev-new' })
    const response = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal(),
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: false,
        },
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Brand Voice settings changed after this proposal. Review the current voice and compare again.',
    })
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('rejects arbitrary selections and archived voices without a write', async () => {
    const arbitrary = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal(),
        selection: { guidance: false, do: ['Arbitrary new rule.'], avoid: [], examples: false },
      }),
    )
    expect(arbitrary.status).toBe(400)
    expect(mocks.patch).not.toHaveBeenCalled()

    mocks.fetch.mockResolvedValue({
      ...settings,
      brandVoices: [{ ...settings.brandVoices[0], status: 'archived' }],
    })
    const archived = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal(),
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: false,
        },
      }),
    )
    expect(archived.status).toBe(409)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('fails closed on auth errors before acquiring the production write client', async () => {
    mocks.assertStudioWriterOrApiKey.mockRejectedValueOnce(
      new MarketingAuthError('Unauthorized', 401),
    )
    const response = await POST(
      request({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'outreach',
        before: { suggestedOpener: 'Old' },
        after: { suggestedOpener: 'New' },
      }),
    )
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.getMarketingWriteClient).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('uses the same writer guard for a proposal in cookie-mode Studio', async () => {
    const response = await POST(
      request({
        action: 'propose',
        voiceKey: 'principal',
        surface: 'outreach',
        before: { suggestedOpener: 'Old opener' },
        after: { suggestedOpener: 'New opener' },
      }),
    )
    expect(response.status).toBe(200)
    expect(mocks.assertStudioWriterOrApiKey).toHaveBeenCalledTimes(1)
  })

  it('maps a guarded Sanity commit race to a recoverable conflict', async () => {
    mocks.commit.mockRejectedValueOnce({ statusCode: 409 })
    const response = await POST(
      request({
        action: 'apply',
        proposal: authorizedProposal(),
        selection: {
          guidance: false,
          do: ['Put the decision before the background.'],
          avoid: [],
          examples: false,
        },
      }),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Brand Voice settings changed while applying. Compare the edit again.',
    })
  })
})
