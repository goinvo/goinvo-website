import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BrandVoiceLearningProposal } from '@/lib/marketing/brandVoiceLearning'
import {
  authorizeBrandVoiceLearningProposal,
  BrandVoiceLearningAuthorizationError,
  verifyBrandVoiceLearningProposalAuthorization,
} from '@/lib/marketing/brandVoiceLearningAuthorization'

const SIGNING_SECRET = 'brand-voice-learning-authorization-test-secret-000000'
const ISSUED_AT_MS = Date.UTC(2026, 6, 14, 12, 0, 0)

const proposal: BrandVoiceLearningProposal = {
  voice: { key: 'principal', name: 'Principal voice' },
  surface: 'contentDraft',
  settingsRevision: 'settings-rev-1',
  summary: 'The edit moves the decision before the setup.',
  confidence: 'medium',
  changedFields: ['headline'],
  doAdditions: ['Put the decision before the background.'],
  avoidAdditions: ['Avoid long setup before the point.'],
  curatedExamples: [
    {
      text: 'Start with the decision.',
      principles: ['Lead with the point.'],
      reason: 'A compact decision-first opening.',
    },
  ],
}

function stubSigningEnvironment(secret = SIGNING_SECRET) {
  vi.stubEnv('MARKETING_BRAND_VOICE_LEARNING_SECRET', secret)
  vi.stubEnv('MARKETING_OUTREACH_SESSION_SECRET', '')
  vi.stubEnv('MARKETING_API_KEY', '')
  vi.stubEnv('SANITY_WRITE_TOKEN', '')
  vi.stubEnv('SANITY_API_WRITE_TOKEN', '')
}

describe('brand voice learning proposal authorization', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('signs the complete normalized proposal and accepts it only inside the 30-minute window', () => {
    stubSigningEnvironment()
    const authorized = authorizeBrandVoiceLearningProposal(proposal, ISSUED_AT_MS)

    expect(authorized.authorization).toMatchObject({
      version: 1,
      issuedAt: ISSUED_AT_MS / 1_000,
      expiresAt: ISSUED_AT_MS / 1_000 + 30 * 60,
      signature: expect.stringMatching(/^[A-Za-z0-9_-]{32,128}$/),
    })
    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        authorized,
        proposal,
        ISSUED_AT_MS + 29 * 60 * 1_000,
      ),
    ).toBe(true)
  })

  it('rejects payload, revision, and signature tampering', () => {
    stubSigningEnvironment()
    const authorized = authorizeBrandVoiceLearningProposal(proposal, ISSUED_AT_MS)
    const modifiedRule: BrandVoiceLearningProposal = {
      ...proposal,
      doAdditions: ['Adopt a rule the server never proposed.'],
    }
    const modifiedRevision: BrandVoiceLearningProposal = {
      ...proposal,
      settingsRevision: 'settings-rev-forged',
    }

    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        { ...authorized, ...modifiedRule },
        modifiedRule,
        ISSUED_AT_MS + 1_000,
      ),
    ).toBe(false)
    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        { ...authorized, ...modifiedRevision },
        modifiedRevision,
        ISSUED_AT_MS + 1_000,
      ),
    ).toBe(false)
    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        {
          ...authorized,
          authorization: { ...authorized.authorization, signature: 'A'.repeat(43) },
        },
        proposal,
        ISSUED_AT_MS + 1_000,
      ),
    ).toBe(false)
  })

  it('rejects expired and implausibly future-issued authorizations', () => {
    stubSigningEnvironment()
    const authorized = authorizeBrandVoiceLearningProposal(proposal, ISSUED_AT_MS)

    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        authorized,
        proposal,
        ISSUED_AT_MS + 30 * 60 * 1_000,
      ),
    ).toBe(false)
    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        authorized,
        proposal,
        ISSUED_AT_MS - 31 * 1_000,
      ),
    ).toBe(false)
  })

  it('refuses to sign and fails verification when every configured secret is weak or missing', () => {
    stubSigningEnvironment('too-short')

    expect(() => authorizeBrandVoiceLearningProposal(proposal, ISSUED_AT_MS)).toThrow(
      BrandVoiceLearningAuthorizationError,
    )
    expect(
      verifyBrandVoiceLearningProposalAuthorization(
        { ...proposal, authorization: {} },
        proposal,
        ISSUED_AT_MS,
      ),
    ).toBe(false)
  })
})
