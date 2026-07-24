import { createHash } from 'node:crypto'
import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { isRevisionConflict } from '@/lib/marketing/apiBoundary'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import {
  buildContactCreateDoc,
  buildIntakePrompts,
  contactIdentityKeys,
  DEFAULT_OFFERS,
  excludeTeamMembersFromIntake,
  normalizeParsedContacts,
  offerDocId,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import {
  buildMarketingContactIdentityClaims,
  type MarketingContactIdentityClaim,
} from '@/lib/marketing/outreachIdentityClaims'
import {
  OUTREACH_INTAKE_FIELD_LIMITS,
  OUTREACH_INTAKE_LIMITS,
  type OutreachIntakeStringField,
} from '@/lib/marketing/outreachIntake'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// One bounded Claude structuring call over a validated paste.
export const maxDuration = 120

// Contacts hold PII + candid notes — they live ONLY in the private outreach
// dataset, never the world-readable production dataset.
let sanityClient: SanityClient | null = null
let teamDirectoryClient: SanityClient | null = null
function getOutreachClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return sanityClient
}

function getTeamDirectoryClient() {
  if (!writeToken) return null
  if (!teamDirectoryClient) {
    teamDirectoryClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return teamDirectoryClient
}

type RequestBody = {
  text?: string
  /**
   * Locally structured contacts (for example, spreadsheet rows) or contacts
   * from a prior dryRun preview. A mixed dryRun may also include `text`; only
   * that text is model-parsed. A contacts-only commit invokes no model.
   */
  contacts?: unknown
  dryRun?: boolean
  model?: string
}

class IntakeRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function requestError(message: string, status = 400): never {
  throw new IntakeRequestError(message, status)
}

async function readIntakeBody(request: Request): Promise<RequestBody> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    requestError('Content-Type must be application/json.', 415)
  }
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > OUTREACH_INTAKE_LIMITS.bodyBytes) {
    requestError('Outreach intake request is too large.', 413)
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > OUTREACH_INTAKE_LIMITS.bodyBytes) {
    requestError('Outreach intake request is too large.', 413)
  }

  let value: unknown
  try {
    value = JSON.parse(rawBody || '{}')
  } catch {
    requestError('Request body must be valid JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    requestError('Request body must be a JSON object.')
  }
  const body = value as Record<string, unknown>
  if (body.text !== undefined && typeof body.text !== 'string') {
    requestError('`text` must be a string.')
  }
  if (body.contacts !== undefined && !Array.isArray(body.contacts)) {
    requestError('`contacts` must be an array.')
  }
  if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
    requestError('`dryRun` must be a boolean.')
  }
  if (body.model !== undefined && typeof body.model !== 'string') {
    requestError('`model` must be a string.')
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (text.length > OUTREACH_INTAKE_LIMITS.textCharacters) {
    requestError(`Contact text cannot exceed ${OUTREACH_INTAKE_LIMITS.textCharacters} characters.`, 413)
  }
  const textRows = text ? text.split(/\r\n?|\n/) : []
  if (textRows.length > OUTREACH_INTAKE_LIMITS.textLines) {
    requestError(`Contact text cannot exceed ${OUTREACH_INTAKE_LIMITS.textLines} lines.`, 413)
  }
  const oversizedLine = textRows.findIndex((line) => line.length > OUTREACH_INTAKE_LIMITS.lineCharacters)
  if (oversizedLine >= 0) {
    requestError(
      `Contact text line ${oversizedLine + 1} cannot exceed ${OUTREACH_INTAKE_LIMITS.lineCharacters} characters.`,
      413,
    )
  }
  if (typeof body.model === 'string' && body.model.length > OUTREACH_INTAKE_LIMITS.modelCharacters) {
    requestError('`model` is too long.', 413)
  }

  const contacts = Array.isArray(body.contacts) ? body.contacts : undefined
  if (contacts && contacts.length > OUTREACH_INTAKE_LIMITS.contacts) {
    requestError(`No more than ${OUTREACH_INTAKE_LIMITS.contacts} contacts can be submitted at once.`, 413)
  }
  contacts?.forEach((contact, index) => validateSubmittedContact(contact, index))

  return {
    text: typeof body.text === 'string' ? body.text : undefined,
    contacts,
    dryRun: typeof body.dryRun === 'boolean' ? body.dryRun : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
  }
}

function validateSubmittedContact(value: unknown, index: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    requestError(`Contact ${index + 1} must be an object.`)
  }
  const contact = value as Record<string, unknown>
  for (const [field, limit] of Object.entries(OUTREACH_INTAKE_FIELD_LIMITS) as Array<[
    OutreachIntakeStringField,
    number,
  ]>) {
    const fieldValue = contact[field]
    if (fieldValue === undefined) continue
    if (typeof fieldValue !== 'string') {
      requestError(`Contact ${index + 1} field \`${field}\` must be a string.`)
    }
    if (fieldValue.length > limit) {
      requestError(`Contact ${index + 1} field \`${field}\` cannot exceed ${limit} characters.`, 413)
    }
  }
  if (contact.duplicate !== undefined && typeof contact.duplicate !== 'boolean') {
    requestError(`Contact ${index + 1} field \`duplicate\` must be a boolean.`)
  }
  const name = contact.name
  if (typeof name !== 'string' || !name.trim()) {
    requestError(`Contact ${index + 1} requires a non-empty \`name\`.`)
  }
}

/** Stable, opaque Sanity id: retries of the same identity converge on one row. */
export function contactDocumentId(contact: Parameters<typeof contactIdentityKeys>[0]) {
  const keys = contactIdentityKeys(contact)
  const identity = keys.find((key) => key.startsWith('email:'))
    || keys.find((key) => key.startsWith('linkedin:'))
    || keys.find((key) => key.startsWith('phone:'))
    || keys[0]
  const digest = createHash('sha256').update(identity).digest('hex').slice(0, 40)
  return `marketingContact-${digest}`
}

/**
 * POST /api/marketing/outreach/intake — parse a pasted contact dump into
 * marketingContact documents (private dataset). `dryRun` returns the parsed
 * contacts (with duplicate flags) without creating. Text must always use a
 * dry run; passing the reviewed `contacts` array back commits it without a
 * second model call.
 */
export async function POST(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const url = new URL(request.url)
  let body: RequestBody
  try {
    body = await readIntakeBody(request)
  } catch (error) {
    if (error instanceof IntakeRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const text = (body.text || '').trim()
  const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1'
  const hasText = Boolean(text)
  const hasPreParsed = Array.isArray(body.contacts) && body.contacts.length > 0

  if (hasText && !dryRun) {
    return privateMarketingJson(
      { error: 'Typed contacts must be previewed with `dryRun` before they can be saved.' },
      { status: 400 },
    )
  }

  if (!hasText && !hasPreParsed) {
    return privateMarketingJson(
      { error: 'Provide `text` (the pasted contact list) or `contacts` (a previewed parse).' },
      { status: 400 },
    )
  }

  // The parse path needs Claude; fail closed BEFORE touching Sanity so the
  // guard is cheap and deterministic. (The commit path re-validates a preview
  // and needs no model.)
  if (hasText && !isAnthropicConfigured()) {
    return privateMarketingJson(
      { error: 'ANTHROPIC_API_KEY is not configured — outreach intake is disabled.' },
      { status: 503 },
    )
  }

  const client = getOutreachClient()
  const directoryClient = getTeamDirectoryClient()
  if (!client || !directoryClient) {
    return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  let existing: Array<{
    name?: string
    organization?: string
    email?: string
    phone?: string
    linkedinUrl?: string
  }>
  let teamMembers: Array<{
    name?: string | null
    email?: string | null
    linkedinUrl?: string | null
  }>
  try {
    const [fetchedExisting, fetchedTeamMembers] = await Promise.all([
      client.fetch<
        Array<{
          name?: string
          organization?: string
          email?: string
          phone?: string
          linkedinUrl?: string
        }>
      >(`*[_type == "marketingContact"]{ name, organization, email, phone, linkedinUrl }`),
      directoryClient.fetch<Array<{
        name?: string | null
        email?: string | null
        linkedinUrl?: string | null
      }>>(
        `*[_type == "teamMember" && defined(name)]{name, "email": social.email, "linkedinUrl": social.linkedin}`,
      ),
    ])
    existing = fetchedExisting
    teamMembers = fetchedTeamMembers
    if (!Array.isArray(teamMembers) || !teamMembers.some((member) => member.name?.trim())) {
      throw new Error('The team directory returned no usable names.')
    }
  } catch (error) {
    console.error('Outreach intake could not verify contact and team identities:', error)
    return privateMarketingJson(
      { error: 'Outreach contacts could not be checked against saved contacts and the team directory.' },
      { status: 503 },
    )
  }
  const existingKeys = new Set(existing.flatMap((contact) => contactIdentityKeys(contact)))

  let submittedContacts: unknown[] = Array.isArray(body.contacts) ? [...body.contacts] : []
  let modelUsed: string | undefined
  if (hasText) {
    const prompts = buildIntakePrompts(text)
    try {
      const model = await resolveMarketingModel(client, body.model)
      const result = await generateClaudeText({
        system: prompts.system,
        user: prompts.user,
        model,
        maxTokens: 8192,
      })
      modelUsed = result.model
      const parsed = parseJsonObject(result.text)
      const parsedList = (parsed as { contacts?: unknown })?.contacts
      if (!Array.isArray(parsedList)) {
        return privateMarketingJson({ error: 'The contact parser returned no contact list.' }, { status: 422 })
      }
      if (submittedContacts.length + parsedList.length > OUTREACH_INTAKE_LIMITS.contacts) {
        return privateMarketingJson(
          { error: `The combined contact preview contains more than ${OUTREACH_INTAKE_LIMITS.contacts} contacts.` },
          { status: 422 },
        )
      }
      submittedContacts = [...submittedContacts, ...parsedList]
    } catch (error) {
      console.error('Outreach intake parsing failed:', error)
      return privateMarketingJson({ error: 'The contact list could not be parsed.' }, { status: 502 })
    }
  }

  // Re-validate every structured contact together with any newly parsed text.
  // This preserves spreadsheet fields while duplicate and team checks still
  // run across the entire batch. A contacts-only commit never invokes a model.
  let contacts = normalizeParsedContacts({ contacts: submittedContacts }, existingKeys)

  contacts = excludeTeamMembersFromIntake(contacts, teamMembers)

  if (contacts.length === 0) {
    return privateMarketingJson(
      { error: 'No contacts could be parsed from the text.', parsed: 0 },
      { status: 422 },
    )
  }

  if (dryRun) {
    return privateMarketingJson({
      dryRun: true,
      parsed: contacts.length,
      duplicates: contacts.filter((c) => c.duplicate).length,
      contacts,
      model: modelUsed,
    })
  }

  const created: Array<{ id: string; name: string }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  const documents: Array<Record<string, unknown> & { _id: string; _type: string }> = []
  const identityClaimsByContactId = new Map<
    string,
    MarketingContactIdentityClaim[]
  >()
  for (const contact of contacts) {
    if (contact.duplicate) {
      skipped.push({
        name: contact.name,
        reason: contact.duplicateReason || 'duplicate (matching identity already exists)',
      })
      continue
    }
    const id = contactDocumentId(contact)
    documents.push({
      ...(buildContactCreateDoc(contact) as { _type: string }),
      _id: id,
    })
    identityClaimsByContactId.set(id, await buildMarketingContactIdentityClaims(contact, id))
  }

  // First-use convenience: if the offer catalog is empty, seed the defaults so
  // the very first research run has offers to match against (idempotent ids;
  // never overwrites CMS edits).
  let seededOffers = 0
  try {
    const offerCount = await client.fetch<number>(`count(*[_type == "marketingOffer"])`)
    const offerDocuments = offerCount === 0
      ? DEFAULT_OFFERS.map((offer) => ({
          _id: offerDocId(offer.key),
          _type: 'marketingOffer',
          title: offer.title,
          key: offer.key,
          status: 'active',
          oneLiner: offer.oneLiner,
          description: offer.description,
          priceBand: offer.priceBand,
          idealBuyer: offer.idealBuyer,
          proofPoints: offer.proofPoints,
          order: offer.order ?? 100,
        }))
      : []
    let pendingDocuments = [...documents]
    const contactNameById = new Map(
      contacts.filter((contact) => !contact.duplicate).map((contact) => [contactDocumentId(contact), contact.name]),
    )
    let committed = false
    for (let attempt = 0; attempt < 3 && !committed; attempt += 1) {
      let transaction = client.transaction()
      for (const document of pendingDocuments) {
        transaction = transaction.create(document)
        for (const identityClaim of identityClaimsByContactId.get(document._id) || []) {
          transaction = transaction.create(identityClaim)
        }
      }
      for (const offerDocument of offerDocuments) transaction = transaction.createIfNotExists(offerDocument)
      if (pendingDocuments.length === 0 && offerDocuments.length === 0) {
        committed = true
        break
      }
      try {
        await transaction.commit()
        created.push(...pendingDocuments.map((document) => ({
          id: document._id,
          name: contactNameById.get(document._id) || String(document.name || 'Contact'),
        })))
        seededOffers = offerDocuments.length
        pendingDocuments = []
        committed = true
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        const ids = pendingDocuments.flatMap((document) => [
          document._id,
          ...(identityClaimsByContactId.get(document._id) || []).map((claim) => claim._id),
        ])
        const nowExistingIds = ids.length
          ? await client.fetch<string[]>(`*[_id in $ids]._id`, { ids })
          : []
        const existingIds = new Set(nowExistingIds)
        if (existingIds.size === 0) throw error
        const conflictedContactIds = new Set(
          pendingDocuments
            .filter((document) => (
              existingIds.has(document._id)
              || (identityClaimsByContactId.get(document._id) || [])
                .some((claim) => existingIds.has(claim._id))
            ))
            .map((document) => document._id),
        )
        if (conflictedContactIds.size === 0) throw error
        for (const document of pendingDocuments) {
          if (!conflictedContactIds.has(document._id)) continue
          skipped.push({
            name: contactNameById.get(document._id) || String(document.name || 'Contact'),
            reason: 'already saved by a concurrent or retried submission',
          })
        }
        pendingDocuments = pendingDocuments.filter((document) => !conflictedContactIds.has(document._id))
      }
    }
    if (!committed) throw new Error('Contact intake could not converge after concurrent writes.')
  } catch (error) {
    console.error('Outreach intake transaction failed:', error)
    return privateMarketingJson(
      { error: 'No contacts were saved because the contact batch could not be committed.' },
      { status: 503 },
    )
  }

  return privateMarketingJson(
    { parsed: contacts.length, created, skipped, seededOffers, model: modelUsed },
    { status: 201 },
  )
}
