import { isUsableOutreachEmail, isUsableOutreachPhone } from './outreachProgress'

export const OUTREACH_CONTACT_EDIT_FIELDS = [
  'name',
  'organization',
  'role',
  'segment',
  'warmth',
  'owner',
  'brandVoiceKey',
  'email',
  'phone',
  'linkedinUrl',
  'howWeKnow',
  'followUpAt',
  'nextStep',
] as const

export type OutreachContactEditField = (typeof OUTREACH_CONTACT_EDIT_FIELDS)[number]
export type OutreachContactEditDraft = Record<OutreachContactEditField, string>

export interface OutreachContactEditSource {
  name?: string
  organization?: string
  role?: string
  segment?: string
  warmth?: string
  owner?: string
  brandVoiceKey?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  howWeKnow?: string
  followUpAt?: string
  nextStep?: string
}

export interface OutreachContactEditPatch {
  set: Record<string, string>
  unset: string[]
  dirtyFields: OutreachContactEditField[]
  identityChanged: boolean
  brandVoiceChanged: boolean
}

function dateInputValue(value?: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

export function createOutreachContactEditDraft(
  contact: OutreachContactEditSource,
): OutreachContactEditDraft {
  return {
    name: contact.name || '',
    organization: contact.organization || '',
    role: contact.role || '',
    segment: contact.segment || '',
    warmth: contact.warmth || '',
    owner: contact.owner || '',
    brandVoiceKey: contact.brandVoiceKey || '',
    email: contact.email || '',
    phone: contact.phone || '',
    linkedinUrl: contact.linkedinUrl || '',
    howWeKnow: contact.howWeKnow || '',
    followUpAt: dateInputValue(contact.followUpAt),
    nextStep: contact.nextStep || '',
  }
}

/**
 * Builds a minimal contact-data patch from the snapshot captured when the
 * editor opened. Pipeline status and interaction history are intentionally not
 * editable here and cannot leak into the mutation even if a caller adds them
 * to the draft object at runtime.
 */
export function buildOutreachContactEditPatch(
  base: OutreachContactEditSource,
  draft: OutreachContactEditDraft,
  normalized: { linkedinUrl: string | null; followUpAt: string | null },
): OutreachContactEditPatch {
  const baseDraft = createOutreachContactEditDraft(base)
  const set: Record<string, string> = {}
  const unset: string[] = []
  const dirtyFields: OutreachContactEditField[] = []

  for (const field of OUTREACH_CONTACT_EDIT_FIELDS) {
    const requestedInput = (draft[field] || '').trim()
    if (requestedInput === baseDraft[field].trim()) continue

    dirtyFields.push(field)
    let value = requestedInput
    if (field === 'name') value = value || 'Unnamed'
    if (field === 'linkedinUrl') value = normalized.linkedinUrl || ''
    if (field === 'followUpAt') value = normalized.followUpAt || ''

    if (value) set[field] = value
    else unset.push(field)
  }

  return {
    set,
    unset,
    dirtyFields,
    identityChanged: dirtyFields.some((field) =>
      field === 'name' || field === 'organization' || field === 'role'),
    brandVoiceChanged: dirtyFields.includes('brandVoiceKey'),
  }
}

export function validateOutreachContactMethods(
  base: OutreachContactEditSource,
  draft: OutreachContactEditDraft,
): string | null {
  const email = draft.email.trim()
  const emailChanged = email !== (base.email || '').trim()
  if (emailChanged && email && !isUsableOutreachEmail(email)) {
    return 'Email must be a complete address such as name@example.com.'
  }

  const phone = draft.phone.trim()
  const phoneChanged = phone !== (base.phone || '').trim()
  if (phoneChanged && phone && !isUsableOutreachPhone(phone)) {
    return 'Phone must contain a dialable 7–15 digit number, with an optional extension.'
  }

  return null
}

export function haveSameTrimmedFields<T extends string>(
  saved: Partial<Record<T, string | undefined>>,
  draft: Record<T, string>,
  fields: readonly T[],
): boolean {
  return fields.every((field) => (saved[field] || '').trim() === (draft[field] || '').trim())
}

export interface PendingKeyRegistry {
  begin(key: string): boolean
  finish(key: string): void
  has(key: string): boolean
  values(): ReadonlySet<string>
}

/** Immediate (non-React-state) guard for double-clicks and overlapping work. */
export function createPendingKeyRegistry(): PendingKeyRegistry {
  const pending = new Set<string>()
  return {
    begin(key) {
      if (pending.has(key)) return false
      pending.add(key)
      return true
    },
    finish(key) {
      pending.delete(key)
    },
    has(key) {
      return pending.has(key)
    },
    values() {
      return new Set(pending)
    },
  }
}

export function beginRequestGeneration(counter: { current: number }): number {
  counter.current += 1
  return counter.current
}

export function isCurrentRequestGeneration(
  counter: { current: number },
  generation: number,
): boolean {
  return counter.current === generation
}

export function isOutreachRevisionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { statusCode?: unknown; status?: unknown; message?: unknown }
  if (candidate.statusCode === 409 || candidate.status === 409) return true
  return typeof candidate.message === 'string' && /revision|conflict|modified|changed since/i.test(candidate.message)
}

function normalizedCatalogTitle(title?: string): string {
  return (title || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function stableHash(value: string): string {
  let first = 0xdeadbeef ^ value.length
  let second = 0x41c6ce57 ^ value.length
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 2654435761)
    second = Math.imul(second ^ code, 1597334677)
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909)
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909)
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`
}

/** A title identifies one catalog offer; content edits belong on that entry. */
export function catalogPromotionIdentity(title?: string): string | null {
  const normalized = normalizedCatalogTitle(title)
  return normalized ? stableHash(normalized) : null
}

export function catalogContainsOfferTitle(
  offers: ReadonlyArray<{ title?: string }>,
  title?: string,
): boolean {
  const normalized = normalizedCatalogTitle(title)
  return Boolean(normalized && offers.some((offer) => normalizedCatalogTitle(offer.title) === normalized))
}
