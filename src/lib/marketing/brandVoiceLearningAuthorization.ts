import { createHmac, timingSafeEqual } from 'node:crypto'

import type { BrandVoiceLearningProposal } from '@/lib/marketing/brandVoiceLearning'

const AUTHORIZATION_VERSION = 1
const AUTHORIZATION_TTL_SECONDS = 30 * 60
const MAX_CLOCK_SKEW_SECONDS = 30
const MIN_SECRET_BYTES = 32
const SIGNING_AUDIENCE = 'goinvo-brand-voice-learning-v1'

export interface BrandVoiceLearningAuthorization {
  version: typeof AUTHORIZATION_VERSION
  issuedAt: number
  expiresAt: number
  signature: string
}

export type AuthorizedBrandVoiceLearningProposal = BrandVoiceLearningProposal & {
  authorization: BrandVoiceLearningAuthorization
}

export class BrandVoiceLearningAuthorizationError extends Error {
  constructor(message = 'Brand-voice proposal signing is not configured.') {
    super(message)
    this.name = 'BrandVoiceLearningAuthorizationError'
  }
}

function signingSecret(): string | null {
  const secret =
    process.env.MARKETING_BRAND_VOICE_LEARNING_SECRET ||
    process.env.MARKETING_OUTREACH_SESSION_SECRET ||
    process.env.MARKETING_API_KEY ||
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN ||
    ''
  return Buffer.byteLength(secret, 'utf8') >= MIN_SECRET_BYTES ? secret : null
}

function canonicalMessage(
  proposal: BrandVoiceLearningProposal,
  authorization: Pick<BrandVoiceLearningAuthorization, 'version' | 'issuedAt' | 'expiresAt'>,
) {
  // Do not rely on caller object insertion order. Apply reparses and
  // normalizes the proposal before verification, which can move an optional
  // property even when every signed value is unchanged.
  const canonicalProposal = {
    voice: { key: proposal.voice.key, name: proposal.voice.name },
    surface: proposal.surface,
    settingsRevision: proposal.settingsRevision,
    summary: proposal.summary,
    confidence: proposal.confidence,
    changedFields: proposal.changedFields,
    guidanceReplacement: proposal.guidanceReplacement || null,
    doAdditions: proposal.doAdditions,
    avoidAdditions: proposal.avoidAdditions,
    curatedExamples: proposal.curatedExamples.map((example) => ({
      text: example.text,
      principles: example.principles,
      reason: example.reason,
    })),
  }
  return JSON.stringify({
    audience: SIGNING_AUDIENCE,
    version: authorization.version,
    issuedAt: authorization.issuedAt,
    expiresAt: authorization.expiresAt,
    proposal: canonicalProposal,
  })
}

function signatureFor(
  proposal: BrandVoiceLearningProposal,
  authorization: Pick<BrandVoiceLearningAuthorization, 'version' | 'issuedAt' | 'expiresAt'>,
  secret: string,
) {
  return createHmac('sha256', secret)
    .update(canonicalMessage(proposal, authorization))
    .digest('base64url')
}

function signaturesMatch(expected: string, provided: string) {
  try {
    const expectedBytes = Buffer.from(expected, 'base64url')
    const providedBytes = Buffer.from(provided, 'base64url')
    return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
  } catch {
    return false
  }
}

export function authorizeBrandVoiceLearningProposal(
  proposal: BrandVoiceLearningProposal,
  nowMs = Date.now(),
): AuthorizedBrandVoiceLearningProposal {
  const secret = signingSecret()
  if (!secret) throw new BrandVoiceLearningAuthorizationError()
  const issuedAt = Math.floor(nowMs / 1000)
  const unsigned = {
    version: AUTHORIZATION_VERSION,
    issuedAt,
    expiresAt: issuedAt + AUTHORIZATION_TTL_SECONDS,
  } as const
  return {
    ...proposal,
    authorization: {
      ...unsigned,
      signature: signatureFor(proposal, unsigned, secret),
    },
  }
}

function readAuthorization(value: unknown): BrandVoiceLearningAuthorization | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const authorization = (value as { authorization?: unknown }).authorization
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) return null
  const record = authorization as Record<string, unknown>
  if (
    record.version !== AUTHORIZATION_VERSION ||
    typeof record.issuedAt !== 'number' ||
    !Number.isInteger(record.issuedAt) ||
    typeof record.expiresAt !== 'number' ||
    !Number.isInteger(record.expiresAt) ||
    typeof record.signature !== 'string' ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(record.signature)
  ) {
    return null
  }
  return record as unknown as BrandVoiceLearningAuthorization
}

/** Verify the opaque server authorization against the normalized proposal. */
export function verifyBrandVoiceLearningProposalAuthorization(
  rawValue: unknown,
  proposal: BrandVoiceLearningProposal,
  nowMs = Date.now(),
): boolean {
  const secret = signingSecret()
  const authorization = readAuthorization(rawValue)
  if (!secret || !authorization) return false
  const now = Math.floor(nowMs / 1000)
  if (
    authorization.issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
    authorization.expiresAt <= now ||
    authorization.expiresAt - authorization.issuedAt !== AUTHORIZATION_TTL_SECONDS
  ) {
    return false
  }
  return signaturesMatch(
    signatureFor(proposal, authorization, secret),
    authorization.signature,
  )
}
