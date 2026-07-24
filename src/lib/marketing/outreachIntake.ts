/**
 * Shared limits for the outreach intake UI and its authoritative API boundary.
 * The route still validates every value; clients may use these to give earlier
 * feedback without creating a second, conflicting set of limits.
 */
export const OUTREACH_INTAKE_LIMITS = Object.freeze({
  bodyBytes: 256 * 1024,
  textCharacters: 50_000,
  textLines: 200,
  lineCharacters: 2_000,
  contacts: 200,
  modelCharacters: 100,
})

export const OUTREACH_INTAKE_FIELD_LIMITS = Object.freeze({
  name: 160,
  organization: 200,
  role: 200,
  segment: 40,
  owner: 100,
  warmth: 20,
  email: 200,
  phone: 80,
  linkedinUrl: 300,
  howWeKnow: 500,
  sourceLine: OUTREACH_INTAKE_LIMITS.lineCharacters,
  duplicateReason: 200,
})

export type OutreachIntakeStringField = keyof typeof OUTREACH_INTAKE_FIELD_LIMITS
