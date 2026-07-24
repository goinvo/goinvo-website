import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>()
  const fetch = vi.fn(async (query: string, params?: { ids?: string[] }) => {
    if (query.includes('_id in $ids')) {
      return (params?.ids || []).filter((id) => documents.has(id))
    }
    if (query.includes('count(*[_type == "marketingOffer"])')) {
      return Array.from(documents.values()).filter((document) => document._type === 'marketingOffer').length
    }
    if (query.includes('_type == "marketingContact"')) {
      return Array.from(documents.values()).filter((document) => document._type === 'marketingContact')
    }
    if (query.includes('_type == "teamMember"')) {
      return [
        { name: 'Jen Patel', email: 'jen@goinvo.com', linkedinUrl: 'https://www.linkedin.com/in/jen-patel' },
        { name: 'Eric Benoit' },
      ]
    }
    return null
  })
  let failNextCommit = false
  const transaction = vi.fn(() => {
    const pending: Array<{
      document: Record<string, unknown> & { _id: string }
      mode: 'create' | 'createIfNotExists'
    }> = []
    const chain = {
      create(document: Record<string, unknown> & { _id: string }) {
        pending.push({ document, mode: 'create' })
        return chain
      },
      createIfNotExists(document: Record<string, unknown> & { _id: string }) {
        pending.push({ document, mode: 'createIfNotExists' })
        return chain
      },
      async commit() {
        if (failNextCommit) {
          failNextCommit = false
          throw new Error('simulated atomic commit failure')
        }
        const conflicting = pending.find(({ document, mode }) => mode === 'create' && documents.has(document._id))
        if (conflicting) {
          const error = new Error('simulated create conflict') as Error & { statusCode: number }
          error.statusCode = 409
          throw error
        }
        for (const { document } of pending) {
          if (!documents.has(document._id)) documents.set(document._id, { ...document })
        }
        return { documentIds: pending.map(({ document }) => document._id) }
      },
    }
    return chain
  })
  const client = { fetch, transaction }
  return {
    documents,
    fetch,
    transaction,
    client,
    createClient: vi.fn(() => client),
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
    isAnthropicConfigured: vi.fn(() => true),
    resolveMarketingModel: vi.fn(async () => 'test-model'),
    generateClaudeText: vi.fn(async () => ({
      model: 'test-model',
      text: JSON.stringify({ contacts: [{ name: 'Parsed Person', organization: 'Parsed Org' }] }),
    })),
    parseJsonObject: vi.fn((text: string) => JSON.parse(text)),
    failCommit() {
      failNextCommit = true
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
    assertStudioWriterOrApiKey: mocks.assertStudioWriterOrApiKey,
    MarketingAuthError: TestMarketingAuthError,
  }
})
vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: mocks.isAnthropicConfigured,
  resolveMarketingModel: mocks.resolveMarketingModel,
  generateClaudeText: mocks.generateClaudeText,
  parseJsonObject: mocks.parseJsonObject,
}))

import { contactDocumentId, POST } from '@/app/api/marketing/outreach/intake/route'
import {
  OUTREACH_INTAKE_FIELD_LIMITS,
  OUTREACH_INTAKE_LIMITS,
} from '@/lib/marketing/outreachIntake'

function jsonRequest(body: unknown) {
  return new NextRequest('https://www.goinvo.com/api/marketing/outreach/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('outreach intake API reliability boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.documents.clear()
  })

  it.each([
    ['non-string text', { text: 42 }, 400],
    ['non-array contacts', { contacts: {} }, 400],
    ['non-boolean dryRun', { text: 'A', dryRun: 'yes' }, 400],
    ['text character limit + 1', { text: 'x'.repeat(OUTREACH_INTAKE_LIMITS.textCharacters + 1) }, 413],
    ['line character limit + 1', { text: 'x'.repeat(OUTREACH_INTAKE_LIMITS.lineCharacters + 1) }, 413],
    ['text line limit + 1', { text: Array.from({ length: OUTREACH_INTAKE_LIMITS.textLines + 1 }, () => 'A').join('\n') }, 413],
    [
      'contact count limit + 1',
      { contacts: Array.from({ length: OUTREACH_INTAKE_LIMITS.contacts + 1 }, (_, index) => ({ name: `Person ${index}` })) },
      413,
    ],
    [
      'field limit + 1',
      { contacts: [{ name: 'x'.repeat(OUTREACH_INTAKE_FIELD_LIMITS.name + 1) }] },
      413,
    ],
  ])('rejects %s before model or Sanity work', async (_label, body, expectedStatus) => {
    const response = await POST(jsonRequest(body))

    expect(response.status).toBe(expectedStatus)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.resolveMarketingModel).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON before model or Sanity work', async () => {
    const response = await POST(new NextRequest('https://www.goinvo.com/api/marketing/outreach/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"contacts":',
    }))

    expect(response.status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('enforces the raw body byte limit even when oversized data is in an unknown field', async () => {
    const response = await POST(new NextRequest('https://www.goinvo.com/api/marketing/outreach/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(OUTREACH_INTAKE_LIMITS.bodyBytes + 1) }),
    }))

    expect(response.status).toBe(413)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('uses the same opaque document id for normalized versions of an identity', () => {
    expect(contactDocumentId({ name: 'Jane Doe', organization: 'Acme', email: 'JANE@EXAMPLE.COM' }))
      .toBe(contactDocumentId({ name: 'Changed Name', organization: 'Other', email: ' jane@example.com ' }))
  })

  it('keeps structured spreadsheet fields while parsing only the typed rows in a mixed preview', async () => {
    mocks.generateClaudeText.mockResolvedValueOnce({
      model: 'test-model',
      text: JSON.stringify({
        contacts: [{
          name: 'Typed Person',
          organization: 'Typed Org',
          sourceLine: 'Typed Person — Typed Org',
        }],
      }),
    })
    const response = await POST(jsonRequest({
      contacts: [{
        name: 'Spreadsheet Person',
        organization: 'Sheet Org',
        howWeKnow: 'A long relationship field that must remain structured',
        sourceLine: 'Spreadsheet Person — source: spreadsheet',
      }],
      text: 'Typed Person — Typed Org',
      dryRun: true,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.generateClaudeText).toHaveBeenCalledTimes(1)
    expect(body.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Spreadsheet Person',
        howWeKnow: 'A long relationship field that must remain structured',
      }),
      expect.objectContaining({ name: 'Typed Person', organization: 'Typed Org' }),
    ]))
  })

  it.each([
    ['typed-only', { text: 'Typed Person' }],
    ['mixed', { contacts: [{ name: 'Spreadsheet Person' }], text: 'Typed Person' }],
  ])('requires an explicit preview before a %s prose-derived batch can save', async (_label, payload) => {
    const response = await POST(jsonRequest(payload))

    expect(response.status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('converges concurrent retries on one contact document', async () => {
    const body = {
      contacts: [{ name: 'Jane Doe', organization: 'Acme', email: 'jane@example.com' }],
    }
    const [first, second] = await Promise.all([POST(jsonRequest(body)), POST(jsonRequest(body))])

    expect([first.status, second.status]).toEqual([201, 201])
    const [firstBody, secondBody] = await Promise.all([first.json(), second.json()])
    expect(firstBody.created.length + secondBody.created.length).toBe(1)
    expect(firstBody.skipped.length + secondBody.skipped.length).toBe(1)
    expect([firstBody, secondBody]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        skipped: [{ name: 'Jane Doe', reason: 'already saved by a concurrent or retried submission' }],
      }),
    ]))
    const contacts = Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingContact')
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({
      _id: contactDocumentId(body.contacts[0]),
      name: 'Jane Doe',
      organization: 'Acme',
    })
    expect(mocks.generateClaudeText).not.toHaveBeenCalled()
  })

  it('converges concurrent imports that prefer different ids but share a secondary strong identity', async () => {
    const firstContact = {
      name: 'Jane First',
      organization: 'Acme',
      email: 'jane.first@example.com',
      phone: '+1 (617) 555-0100',
    }
    const secondContact = {
      name: 'Jane Second',
      organization: 'Other Acme',
      email: 'jane.second@example.com',
      phone: '1-617-555-0100',
    }
    expect(contactDocumentId(firstContact)).not.toBe(contactDocumentId(secondContact))

    const [first, second] = await Promise.all([
      POST(jsonRequest({ contacts: [firstContact] })),
      POST(jsonRequest({ contacts: [secondContact] })),
    ])
    const [firstBody, secondBody] = await Promise.all([first.json(), second.json()])

    expect([first.status, second.status]).toEqual([201, 201])
    expect(firstBody.created.length + secondBody.created.length).toBe(1)
    expect(firstBody.skipped.length + secondBody.skipped.length).toBe(1)
    expect([firstBody, secondBody]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        skipped: [expect.objectContaining({
          reason: 'already saved by a concurrent or retried submission',
        })],
      }),
    ]))
    expect(Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingContact'))
      .toHaveLength(1)
    expect(Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingContactIdentity'))
      .toHaveLength(2)
  })

  it('excludes exact team-directory people during preview and re-checks them during commit', async () => {
    const preview = await POST(jsonRequest({
      contacts: [
        { name: '  JEN   PATEL ', organization: 'GoInvo', duplicate: false },
        { name: 'Jane Prospect', organization: 'Acme' },
      ],
      dryRun: true,
    }))
    const previewBody = await preview.json()

    expect(preview.status).toBe(200)
    expect(previewBody.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'JEN   PATEL',
        duplicate: true,
        duplicateReason: 'GoInvo team member — excluded from outreach',
      }),
      expect.objectContaining({ name: 'Jane Prospect' }),
    ]))
    expect(previewBody.contacts.find((contact: { name?: string }) => contact.name === 'Jane Prospect'))
      .not.toHaveProperty('duplicate')

    const commit = await POST(jsonRequest({
      contacts: [
        { name: 'Jen Patel', organization: 'GoInvo', duplicate: false },
        { name: 'Jane Prospect', organization: 'Acme' },
      ],
    }))
    const commitBody = await commit.json()

    expect(commit.status).toBe(201)
    expect(commitBody.created).toHaveLength(1)
    expect(commitBody.created[0].name).toBe('Jane Prospect')
    expect(commitBody.skipped).toEqual([
      { name: 'Jen Patel', reason: 'GoInvo team member — excluded from outreach' },
    ])
    expect(Array.from(mocks.documents.values()).filter((document) => document._type === 'marketingContact'))
      .toHaveLength(1)
  })

  it('allows a clearly external homonym but still excludes a known team identity', async () => {
    const response = await POST(jsonRequest({
      contacts: [
        { name: 'Jen Patel', organization: 'Outside Health', email: 'outside@example.com' },
        { name: 'Different Display Name', organization: 'Outside Health', email: 'jen@goinvo.com' },
      ],
      dryRun: true,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.contacts[0]).toEqual(expect.objectContaining({
      name: 'Jen Patel',
      organization: 'Outside Health',
    }))
    expect(body.contacts[0]).not.toHaveProperty('duplicate')
    expect(body.contacts[1]).toEqual(expect.objectContaining({
      duplicate: true,
      duplicateReason: 'GoInvo team member — excluded from outreach',
    }))
  })

  it('never lets external details bypass a name-only team record', async () => {
    const response = await POST(jsonRequest({
      contacts: [
        { name: 'Eric Benoit', organization: 'Outside Health' },
        {
          name: 'Eric Benoit',
          organization: 'Independent Research Group',
          linkedinUrl: 'https://www.linkedin.com/in/a-different-eric-benoit',
        },
      ],
      dryRun: true,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.contacts[0]).toEqual(expect.objectContaining({
      duplicate: true,
      duplicateReason: 'GoInvo team member — excluded from outreach',
    }))
    expect(body.contacts[1]).toEqual(expect.objectContaining({
      duplicate: true,
      duplicateReason: 'GoInvo team member — excluded from outreach',
    }))
  })

  it('does not partially save contacts or default offers when the atomic transaction fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.failCommit()
    const response = await POST(jsonRequest({
      contacts: [
        { name: 'Jane Doe', organization: 'Acme' },
        { name: 'John Doe', organization: 'Acme' },
      ],
    }))

    expect(response.status).toBe(503)
    expect(mocks.documents.size).toBe(0)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })
})
