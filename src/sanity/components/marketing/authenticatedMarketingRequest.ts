import type { SanityClient } from '@sanity/client'

import {
  createOutreachSessionProof,
  OUTREACH_SESSION_ENDPOINT,
} from '@/lib/marketing/outreachSessionContract'
import { studioSessionToken } from '@/sanity/lib/studioSession'

/**
 * Call a writer-only Marketing API from either token-mode or cookie-mode
 * Studio. Cookie mode exchanges a one-time, private-dataset mutation proof for
 * the same short-lived HttpOnly writer session used by Outreach.
 *
 * `proofClient` must be scoped to the private Outreach dataset; the server
 * verifies the mutation author there before issuing the cookie.
 */
export async function authenticatedMarketingRequest<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method: 'POST' | 'GET' = 'POST',
  proofClient?: Pick<SanityClient, 'create' | 'delete'>,
): Promise<T> {
  const request = () => {
    const token = studioSessionToken()
    return fetch(path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'x-sanity-session': token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: 'same-origin',
      cache: 'no-store',
    })
  }

  let response = await request()
  if (response.status === 401 && proofClient) {
    const proof = createOutreachSessionProof()
    let exchanged = false
    try {
      await proofClient.create(proof.document, {
        transactionId: proof.transactionId,
        visibility: 'sync',
      })
      const sessionResponse = await fetch(OUTREACH_SESSION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: proof.proofId, transactionId: proof.transactionId }),
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as { error?: string }
      if (!sessionResponse.ok) {
        throw new Error(
          sessionPayload.error || `Studio session exchange failed (${sessionResponse.status}).`,
        )
      }
      exchanged = true
      response = await request()
    } finally {
      if (!exchanged) {
        try {
          await proofClient.delete(proof.proofId)
        } catch {
          // The server may already have consumed the proof. It expires quickly
          // and contains only random identifiers, never marketing/contact data.
        }
      }
    }
  }

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`)
  return payload
}
