import { contactIdentityKeys } from './outreach'

export const MARKETING_CONTACT_IDENTITY_CLAIM_TYPE = 'marketingContactIdentity' as const
export const MARKETING_CONTACT_IDENTITY_CLAIM_PREFIX = 'marketingContactIdentity-'

export interface MarketingContactIdentityClaim {
  _id: string
  _type: typeof MARKETING_CONTACT_IDENTITY_CLAIM_TYPE
  contactId: string
}

type ContactIdentity = Parameters<typeof contactIdentityKeys>[0]

export function contactStrongIdentityKeys(contact: ContactIdentity): string[] {
  return [...new Set(contactIdentityKeys(contact).slice(1))]
}

export function haveSameContactStrongIdentities(
  left: ContactIdentity,
  right: ContactIdentity,
): boolean {
  const leftKeys = contactStrongIdentityKeys(left).sort()
  const rightKeys = contactStrongIdentityKeys(right).sort()
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index])
}

async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Secure contact identity hashing is unavailable; no contact changes were saved.')
  }
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Build opaque reservation documents without storing the email, phone, or URL itself. */
export async function buildMarketingContactIdentityClaims(
  contact: ContactIdentity,
  contactId: string,
): Promise<MarketingContactIdentityClaim[]> {
  if (!contactId.trim()) throw new Error('A contact id is required to reserve its identities.')
  return Promise.all(contactStrongIdentityKeys(contact).map(async (identity) => ({
    _id: `${MARKETING_CONTACT_IDENTITY_CLAIM_PREFIX}${(await sha256Hex(identity)).slice(0, 40)}`,
    _type: MARKETING_CONTACT_IDENTITY_CLAIM_TYPE,
    contactId,
  })))
}

type IdentityClaimReader = {
  fetch<T>(query: string, params: Record<string, unknown>): Promise<T>
}

function assertContactIdentityClaims(
  value: unknown,
  contactId: string,
): MarketingContactIdentityClaim[] {
  if (!Array.isArray(value)) {
    throw new Error('Contact identity reservations could not be verified; no contact changes were saved.')
  }
  const claims: MarketingContactIdentityClaim[] = []
  const seen = new Set<string>()
  for (const candidate of value) {
    if (
      !candidate
      || typeof candidate !== 'object'
      || typeof (candidate as { _id?: unknown })._id !== 'string'
      || !(candidate as { _id: string })._id.startsWith(MARKETING_CONTACT_IDENTITY_CLAIM_PREFIX)
      || (candidate as { _type?: unknown })._type !== MARKETING_CONTACT_IDENTITY_CLAIM_TYPE
      || (candidate as { contactId?: unknown }).contactId !== contactId
      || seen.has((candidate as { _id: string })._id)
    ) {
      throw new Error('Contact identity reservations were inconsistent; no contact changes were saved.')
    }
    const claim = candidate as MarketingContactIdentityClaim
    seen.add(claim._id)
    claims.push(claim)
  }
  return claims
}

/** Read and validate every reservation before an edit/delete mutation is constructed. */
export async function fetchMarketingContactIdentityClaims(
  client: IdentityClaimReader,
  contactId: string,
): Promise<MarketingContactIdentityClaim[]> {
  const value = await client.fetch<unknown>(
    `*[_type == $claimType && contactId == $contactId]{_id, _type, contactId}`,
    { claimType: MARKETING_CONTACT_IDENTITY_CLAIM_TYPE, contactId },
  )
  return assertContactIdentityClaims(value, contactId)
}

export function planMarketingContactIdentityClaimUpdate(
  existingClaims: readonly MarketingContactIdentityClaim[],
  nextClaims: readonly MarketingContactIdentityClaim[],
): { deleteIds: string[]; createClaims: MarketingContactIdentityClaim[] } {
  const existingIds = new Set(existingClaims.map((claim) => claim._id))
  const nextIds = new Set(nextClaims.map((claim) => claim._id))
  return {
    deleteIds: existingClaims.filter((claim) => !nextIds.has(claim._id)).map((claim) => claim._id),
    createClaims: nextClaims.filter((claim) => !existingIds.has(claim._id)),
  }
}
