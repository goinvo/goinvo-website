import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Route-level mocks (hoisted). The pure signup core and the type registry are
// exercised UNMOCKED further down — only network/client boundaries are faked.
// ---------------------------------------------------------------------------
const { mocks } = vi.hoisted(() => ({
  mocks: {
    isAllowedChatRequest: vi.fn(() => true),
    isLikelyBot: vi.fn(() => false),
    isEmailOctopusConfigured: vi.fn(() => true),
    emailOctopusMissingConfig: vi.fn(() => [] as string[]),
    upsertEmailOctopusContact: vi.fn(
      async (): Promise<{ ok: boolean; status?: number; error?: string }> => ({ ok: true }),
    ),
    sendGa4MpEvents: vi.fn(async () => true),
    productionFetch: vi.fn(),
    outreachFetch: vi.fn(),
    transactionCreate: vi.fn(),
    transactionCommit: vi.fn(async () => ({})),
  },
}))

vi.mock('@/lib/chat/config', () => ({
  isAllowedChatRequest: mocks.isAllowedChatRequest,
}))

vi.mock('@/lib/marketing/botFilter', () => ({
  isLikelyBot: mocks.isLikelyBot,
}))

vi.mock('@/lib/marketing/drainSink', () => ({
  getKvClient: () => null, // no KV in tests → the limiter fail-opens
}))

vi.mock('@/lib/marketing/emailOctopus', () => ({
  isEmailOctopusConfigured: mocks.isEmailOctopusConfigured,
  emailOctopusMissingConfig: mocks.emailOctopusMissingConfig,
  upsertEmailOctopusContact: mocks.upsertEmailOctopusContact,
  sanitizeEmailOctopusTag: (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : undefined,
}))

vi.mock('@/lib/marketing/ga4MeasurementProtocol', () => ({
  sendGa4MpEvents: mocks.sendGa4MpEvents,
}))

vi.mock('@/sanity/env', () => ({
  apiVersion: '2024-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-write-token',
}))

vi.mock('@sanity/client', () => ({
  createClient: (config: { dataset?: string }) => {
    if (config.dataset === 'outreach') {
      const transaction = {
        create: (doc: unknown) => {
          mocks.transactionCreate(doc)
          return transaction
        },
        commit: mocks.transactionCommit,
      }
      return { fetch: mocks.outreachFetch, transaction: () => transaction }
    }
    return { fetch: mocks.productionFetch }
  },
}))

import { POST } from '@/app/api/newsletter/subscribe/route'
import type { NextRequest } from 'next/server'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'
import { SLUG_TYPES, DEFAULTS, ARRAY_ITEM_TYPES, REQUIRED_FIELDS } from '@/lib/marketing/defaults'
import { MARKETING_FIELDS } from '@/lib/marketing/fieldPolicy'
import { buildCreatePayload, MarketingValidationError } from '@/lib/marketing/crud'
import { LEAD_MAGNET_STATUS_VALUES } from '@/lib/marketing/enums'
import { schemaTypes } from '@/sanity/schemas'
import {
  buildSignupContactRecords,
  sanitizeMagnetSlug,
  sanitizeSignupSourcePath,
  signupAttributionChannel,
  signupContactDocumentId,
} from '@/lib/marketing/leadMagnetSignup'

const subscribeRequest = (body: Record<string, unknown>) =>
  new Request('https://www.goinvo.com/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'https://www.goinvo.com' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest

const liveMagnet = {
  title: 'Clinical AI Pilot Pre-Mortem',
  status: 'live',
  slug: 'clinical-ai-pilot-pre-mortem',
  offerKey: 'ai-pilot-premortem',
  emailOctopusTag: 'premortem-kit',
  createOutreachContacts: true,
  downloadUrl: 'https://cdn.sanity.io/files/test/production/kit.pdf',
}

// Dispatch the production client's two queries by their distinctive type names.
const primeProductionFetch = (magnet: unknown) => {
  mocks.productionFetch.mockImplementation(async (query: string) => {
    if (query.includes('marketingLeadMagnet')) return magnet
    if (query.includes('teamMember')) return []
    throw new Error(`Unexpected production query: ${query}`)
  })
}

describe('marketingLeadMagnet managed type registration', () => {
  it('is registered in every registry the CRUD layer consults', () => {
    expect(MANAGED_MARKETING_TYPES).toContain('marketingLeadMagnet')
    expect(DEFAULTS.marketingLeadMagnet).toEqual({ status: 'draft', createOutreachContacts: true })
    expect(ARRAY_ITEM_TYPES.marketingLeadMagnet).toEqual({})
    expect(REQUIRED_FIELDS.marketingLeadMagnet).toEqual(['title', 'status'])
    expect(SLUG_TYPES.has('marketingLeadMagnet')).toBe(true)
    expect(MARKETING_FIELDS.marketingLeadMagnet).toContain('emailOctopusTag')
    expect(MARKETING_FIELDS.marketingLeadMagnet).toContain('createOutreachContacts')
  })

  it('has a registered Sanity schema', () => {
    const schema = schemaTypes.find(
      (type) => (type as { name?: string }).name === 'marketingLeadMagnet',
    )
    expect(schema).toBeDefined()
  })

  it('creates with defaults + derived slug from a title-only payload', () => {
    const payload = buildCreatePayload('marketingLeadMagnet', { title: 'Pre-Mortem Kit' })
    expect(payload).toMatchObject({
      _type: 'marketingLeadMagnet',
      status: 'draft',
      createOutreachContacts: true,
    })
    expect(payload.slug).toEqual({ _type: 'slug', current: 'pre-mortem-kit' })
  })

  it('server-enforces the status closed set', () => {
    expect(LEAD_MAGNET_STATUS_VALUES).toEqual(['draft', 'live', 'retired'])
    expect(() => buildCreatePayload('marketingLeadMagnet', { title: 'X', status: 'lve' }))
      .toThrow(MarketingValidationError)
  })
})

describe('lead magnet signup core (pure)', () => {
  it('derives a stable, normalized, intake-compatible contact id', async () => {
    const a = await signupContactDocumentId('Person@Example.com')
    const b = await signupContactDocumentId('person@example.com')
    expect(a).toBe(b)
    expect(a).toMatch(/^marketingContact-[0-9a-f]{40}$/)
    expect(await signupContactDocumentId('other@example.com')).not.toBe(a)
  })

  it('builds a cold contact with magnet attribution + identity claims', async () => {
    const { contact, claims } = await buildSignupContactRecords(
      'person@example.com',
      liveMagnet,
      '/vision/clinical-ai-pilot-pre-mortem',
    )
    expect(contact).toMatchObject({
      _type: 'marketingContact',
      name: 'person@example.com',
      email: 'person@example.com',
      status: 'new',
      warmth: 'cold',
      attributionChannel: 'lead-magnet:clinical-ai-pilot-pre-mortem',
      attributedOfferKey: 'ai-pilot-premortem',
      sourceNotes: '/vision/clinical-ai-pilot-pre-mortem',
    })
    expect(contact.howWeKnow).toContain('Clinical AI Pilot Pre-Mortem')
    expect(claims.length).toBeGreaterThan(0)
    for (const claim of claims) {
      expect(claim._type).toBe('marketingContactIdentity')
      expect(claim.contactId).toBe(contact._id)
    }
  })

  it('labels plain newsletter signups without a magnet', async () => {
    const { contact } = await buildSignupContactRecords('person@example.com', null)
    expect(contact.attributionChannel).toBe('newsletter')
    expect(contact.howWeKnow).toBe('Newsletter signup')
    expect(signupAttributionChannel()).toBe('newsletter')
    expect(signupAttributionChannel('x')).toBe('lead-magnet:x')
  })

  it('sanitizes source paths (keeps hyphenated paths, strips query, rejects junk)', () => {
    expect(sanitizeSignupSourcePath('/vision/clinical-ai-pilot-pre-mortem')).toBe('/vision/clinical-ai-pilot-pre-mortem')
    expect(sanitizeSignupSourcePath('/page?token=secret#frag')).toBe('/page')
    expect(sanitizeSignupSourcePath('//evil.example')).toBeUndefined()
    expect(sanitizeSignupSourcePath('https://evil.example/x')).toBeUndefined()
    expect(sanitizeSignupSourcePath('/with space')).toBeUndefined()
    expect(sanitizeSignupSourcePath(42)).toBeUndefined()
  })

  it('restricts magnet slugs to slug-shaped ids', () => {
    expect(sanitizeMagnetSlug('Clinical-AI-1')).toBe('clinical-ai-1')
    expect(sanitizeMagnetSlug('slug" || _type=="x')).toBeUndefined()
    expect(sanitizeMagnetSlug('-leading')).toBeUndefined()
    expect(sanitizeMagnetSlug(null)).toBeUndefined()
  })
})

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAllowedChatRequest.mockReturnValue(true)
    mocks.isLikelyBot.mockReturnValue(false)
    mocks.isEmailOctopusConfigured.mockReturnValue(true)
    mocks.upsertEmailOctopusContact.mockResolvedValue({ ok: true })
    mocks.outreachFetch.mockResolvedValue([])
    primeProductionFetch(liveMagnet)
  })

  it('refuses loudly (503) when EmailOctopus is unconfigured — never swallows a lead', async () => {
    mocks.isEmailOctopusConfigured.mockReturnValue(false)
    mocks.emailOctopusMissingConfig.mockReturnValue(['EMAILOCTOPUS_API_KEY'])
    const response = await POST(subscribeRequest({ email: 'person@example.com' }))
    expect(response.status).toBe(503)
    expect(mocks.upsertEmailOctopusContact).not.toHaveBeenCalled()
    expect(mocks.transactionCommit).not.toHaveBeenCalled()
  })

  it('rejects disallowed origins before any work', async () => {
    mocks.isAllowedChatRequest.mockReturnValue(false)
    const response = await POST(subscribeRequest({ email: 'person@example.com' }))
    expect(response.status).toBe(403)
    expect(mocks.upsertEmailOctopusContact).not.toHaveBeenCalled()
  })

  it('answers the honeypot with success while delivering nothing', async () => {
    const response = await POST(
      subscribeRequest({ email: 'person@example.com', website: 'https://spam.example' }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.upsertEmailOctopusContact).not.toHaveBeenCalled()
    expect(mocks.transactionCommit).not.toHaveBeenCalled()
  })

  it('rejects invalid emails with 422', async () => {
    const response = await POST(subscribeRequest({ email: 'not-an-email' }))
    expect(response.status).toBe(422)
    expect(mocks.upsertEmailOctopusContact).not.toHaveBeenCalled()
  })

  it('404s an unknown magnet and 409s a non-live one', async () => {
    primeProductionFetch(null)
    const unknown = await POST(subscribeRequest({ email: 'person@example.com', magnetSlug: 'nope' }))
    expect(unknown.status).toBe(404)

    primeProductionFetch({ ...liveMagnet, status: 'draft' })
    const draft = await POST(
      subscribeRequest({ email: 'person@example.com', magnetSlug: 'clinical-ai-pilot-pre-mortem' }),
    )
    expect(draft.status).toBe(409)
    expect(mocks.upsertEmailOctopusContact).not.toHaveBeenCalled()
  })

  it('delivers to EmailOctopus, records the outreach contact, forwards GA4, returns the download', async () => {
    const response = await POST(
      subscribeRequest({
        email: 'person@example.com',
        magnetSlug: 'clinical-ai-pilot-pre-mortem',
        sourcePath: '/vision/clinical-ai-pilot-pre-mortem',
        ga_client_id: 'GA1.1.123',
        ga_session_id: '456',
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, downloadUrl: liveMagnet.downloadUrl })

    expect(mocks.upsertEmailOctopusContact).toHaveBeenCalledWith('person@example.com', ['premortem-kit'])

    expect(mocks.transactionCommit).toHaveBeenCalledTimes(1)
    const createdDocs = mocks.transactionCreate.mock.calls.map(([doc]) => doc as Record<string, unknown>)
    expect(createdDocs.some((doc) => doc._type === 'marketingContact'
      && doc.attributionChannel === 'lead-magnet:clinical-ai-pilot-pre-mortem')).toBe(true)
    expect(createdDocs.some((doc) => doc._type === 'marketingContactIdentity')).toBe(true)

    expect(mocks.sendGa4MpEvents).toHaveBeenCalledWith('GA1.1.123', [
      expect.objectContaining({
        name: 'newsletter_signup',
        params: expect.objectContaining({
          magnet: 'clinical-ai-pilot-pre-mortem',
          source_path: '/vision/clinical-ai-pilot-pre-mortem',
          session_id: '456',
        }),
      }),
    ])
  })

  it('honors the per-magnet opt-out of outreach contacts', async () => {
    primeProductionFetch({ ...liveMagnet, createOutreachContacts: false })
    const response = await POST(
      subscribeRequest({ email: 'person@example.com', magnetSlug: 'clinical-ai-pilot-pre-mortem' }),
    )
    expect(response.status).toBe(200)
    expect(mocks.upsertEmailOctopusContact).toHaveBeenCalledTimes(1)
    expect(mocks.transactionCommit).not.toHaveBeenCalled()
  })

  it('keeps team members out of the cold-outreach pool but still subscribes them', async () => {
    mocks.productionFetch.mockImplementation(async (query: string) => {
      if (query.includes('marketingLeadMagnet')) return liveMagnet
      if (query.includes('teamMember')) return ['Person@Example.com']
      throw new Error(`Unexpected production query: ${query}`)
    })
    const response = await POST(
      subscribeRequest({ email: 'person@example.com', magnetSlug: 'clinical-ai-pilot-pre-mortem' }),
    )
    expect(response.status).toBe(200)
    expect(mocks.upsertEmailOctopusContact).toHaveBeenCalledTimes(1)
    expect(mocks.transactionCommit).not.toHaveBeenCalled()
  })

  it('surfaces an EmailOctopus failure as 502 (fail loud, no silent drop)', async () => {
    mocks.upsertEmailOctopusContact.mockResolvedValue({ ok: false, status: 500, error: 'boom' })
    const response = await POST(subscribeRequest({ email: 'person@example.com' }))
    expect(response.status).toBe(502)
  })

  it('still succeeds for the visitor when only the contact write fails (lead already safe)', async () => {
    mocks.transactionCommit.mockRejectedValueOnce(new Error('sanity down'))
    const response = await POST(subscribeRequest({ email: 'person@example.com' }))
    expect(response.status).toBe(200)
    expect(mocks.upsertEmailOctopusContact).toHaveBeenCalledTimes(1)
  })
})
