/** Client-safe constants for the one-time Studio -> Outreach session bridge. */
export const OUTREACH_SESSION_ENDPOINT = '/api/marketing/outreach/session'
export const OUTREACH_SESSION_PROOF_TYPE = 'marketingOutreachSessionProof'
export const OUTREACH_SESSION_PROOF_ID_PREFIX = 'marketingOutreachSessionProof-'
export const OUTREACH_SESSION_TRANSACTION_ID_PREFIX = 'marketingOutreachSession-'
export const OUTREACH_SESSION_AUDIENCE = 'goinvo-marketing-outreach-api'
export const OUTREACH_SESSION_PROOF_TTL_MS = 2 * 60 * 1000
export const OUTREACH_SESSION_COOKIE_NAME = 'goinvo_outreach_session'
export const OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS = 15 * 60
export const OUTREACH_SESSION_SECRET_ENV = 'MARKETING_OUTREACH_SESSION_SECRET'

export type OutreachSessionProofDocument = {
  _id: string
  _type: typeof OUTREACH_SESSION_PROOF_TYPE
  audience: typeof OUTREACH_SESSION_AUDIENCE
  transactionId: string
}

/**
 * Produces only public, random identifiers. The returned document must be
 * created through the cookie-authenticated private-dataset Studio client with
 * `transactionId` also passed as the Sanity mutation option.
 */
export function createOutreachSessionProof(): {
  proofId: string
  transactionId: string
  document: OutreachSessionProofDocument
} {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure random UUID generation is unavailable in this browser.')
  }
  const proofId = `${OUTREACH_SESSION_PROOF_ID_PREFIX}${globalThis.crypto.randomUUID()}`
  const transactionId = `${OUTREACH_SESSION_TRANSACTION_ID_PREFIX}${globalThis.crypto.randomUUID()}`
  return {
    proofId,
    transactionId,
    document: {
      _id: proofId,
      _type: OUTREACH_SESSION_PROOF_TYPE,
      audience: OUTREACH_SESSION_AUDIENCE,
      transactionId,
    },
  }
}
