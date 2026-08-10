/**
 * Pure builders for turning a newsletter / lead-magnet signup into outreach
 * records. No network or Sanity client here — the subscribe route composes
 * these with the private-dataset write client, and tests exercise them directly.
 *
 * A signup carries only an email, so the contact record uses the email as its
 * `name` until a human (or research) fills in who the person is. Identity
 * hashing matches the outreach intake route byte-for-byte, so the same email
 * arriving from any source (signup, spreadsheet intake, shop) converges on one
 * contact row and one set of identity claims.
 */

import {
  buildContactCreateDoc,
  contactIdentityKeys,
  normalizeOutreachEmail,
} from './outreach'
import {
  buildMarketingContactIdentityClaims,
  type MarketingContactIdentityClaim,
} from './outreachIdentityClaims'

/** attributionChannel written on contacts created from a magnet signup. */
export const LEAD_MAGNET_ATTRIBUTION_PREFIX = 'lead-magnet:'
/** attributionChannel for plain newsletter signups (no magnet involved). */
export const NEWSLETTER_ATTRIBUTION_CHANNEL = 'newsletter'

export function signupAttributionChannel(magnetSlug?: string): string {
  return magnetSlug ? `${LEAD_MAGNET_ATTRIBUTION_PREFIX}${magnetSlug}` : NEWSLETTER_ATTRIBUTION_CHANNEL
}

/** The magnet fields the signup flow needs (fetched by the route via GROQ). */
export interface LeadMagnetForSignup {
  slug?: string
  title?: string
  offerKey?: string
  emailOctopusTag?: string
  createOutreachContacts?: boolean
}

/**
 * Keep only a safe site-relative path (no query/fragment, no whitespace or
 * control chars) so the stored source can never carry tokens or beacon junk
 * into the CMS.
 */
export function sanitizeSignupSourcePath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return undefined
  const pathOnly = trimmed.split(/[?#]/)[0].slice(0, 300)
  if (!pathOnly) return undefined
  for (let i = 0; i < pathOnly.length; i += 1) {
    const code = pathOnly.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return undefined
  }
  return pathOnly
}

/** Restrict to slug-shaped ids so the lookup param can't smuggle GROQ syntax. */
export function sanitizeMagnetSlug(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const slug = value.trim().toLowerCase().slice(0, 96)
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : undefined
}

async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Secure identity hashing is unavailable; the signup was not recorded.')
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Stable contact id for a signup email. Byte-identical to the intake route's
 * `contactDocumentId` for an email-only contact (`marketingContact-<sha256 of
 * the email identity, 40 hex chars>`), so signups and imports of the same
 * person converge on the same row.
 */
export async function signupContactDocumentId(email: string): Promise<string> {
  const normalized = normalizeOutreachEmail(email)
  if (!normalized) throw new Error('A valid email is required to build a contact id.')
  const identity = contactIdentityKeys({ name: normalized, email: normalized })
    .find((key) => key.startsWith('email:'))
  if (!identity) throw new Error('The email produced no usable identity key.')
  return `marketingContact-${(await sha256Hex(identity)).slice(0, 40)}`
}

export interface SignupContactRecords {
  contact: Record<string, unknown> & { _id: string; _type: string }
  claims: MarketingContactIdentityClaim[]
}

/**
 * Build the contact document + identity-claim reservations for one signup.
 * Cold by definition: the visitor gave an email for a resource, nothing more.
 */
export async function buildSignupContactRecords(
  email: string,
  magnet: LeadMagnetForSignup | null,
  sourcePath?: string,
): Promise<SignupContactRecords> {
  const normalized = normalizeOutreachEmail(email)
  if (!normalized) throw new Error('A valid email is required to build a signup contact.')

  const identity = { name: normalized, email: normalized }
  const id = await signupContactDocumentId(normalized)

  const contact: Record<string, unknown> = {
    ...buildContactCreateDoc({
      ...identity,
      warmth: 'cold',
      howWeKnow: magnet?.title
        ? `Signed up for the "${magnet.title}" lead magnet`
        : 'Newsletter signup',
      sourceLine: sourcePath,
    }),
    _id: id,
    attributionChannel: signupAttributionChannel(magnet?.slug),
  }
  if (magnet?.offerKey?.trim()) contact.attributedOfferKey = magnet.offerKey.trim()
  if (magnet?.title?.trim()) contact.attributedOfferTitle = magnet.title.trim()

  return {
    contact: contact as SignupContactRecords['contact'],
    claims: await buildMarketingContactIdentityClaims(identity, id),
  }
}
