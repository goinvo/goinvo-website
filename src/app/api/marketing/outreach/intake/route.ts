import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
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
  normalizeParsedContacts,
  offerDocId,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'

export const dynamic = 'force-dynamic'
// One Claude structuring call over an arbitrarily long paste.
export const maxDuration = 120

// Contacts hold PII + candid notes — they live ONLY in the private outreach
// dataset, never the world-readable production dataset.
let sanityClient: SanityClient | null = null
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

type RequestBody = {
  text?: string
  /**
   * Pre-parsed contacts from a prior dryRun preview. When present, the route
   * commits EXACTLY these (re-validated) without re-running the model — what
   * the user approved is what gets saved.
   */
  contacts?: unknown
  dryRun?: boolean
  model?: string
}

/**
 * POST /api/marketing/outreach/intake — parse a pasted contact dump into
 * marketingContact documents (private dataset). `dryRun` returns the parsed
 * contacts (with duplicate flags) without creating; passing that `contacts`
 * array back commits the previewed parse verbatim.
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
  const body = (await request.json().catch(() => ({}))) as RequestBody
  const text = (body.text || '').trim()
  const dryRun = body.dryRun || url.searchParams.get('dryRun') === '1'
  const hasPreParsed = Array.isArray(body.contacts) && body.contacts.length > 0

  if (!text && !hasPreParsed) {
    return privateMarketingJson(
      { error: 'Provide `text` (the pasted contact list) or `contacts` (a previewed parse).' },
      { status: 400 },
    )
  }

  // The parse path needs Claude; fail closed BEFORE touching Sanity so the
  // guard is cheap and deterministic. (The commit path re-validates a preview
  // and needs no model.)
  if (!hasPreParsed && !isAnthropicConfigured()) {
    return privateMarketingJson(
      { error: 'ANTHROPIC_API_KEY is not configured — outreach intake is disabled.' },
      { status: 503 },
    )
  }

  const client = getOutreachClient()
  if (!client) {
    return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const existing = await client.fetch<
    Array<{
      name?: string
      organization?: string
      email?: string
      phone?: string
      linkedinUrl?: string
    }>
  >(
    `*[_type == "marketingContact"]{ name, organization, email, phone, linkedinUrl }`,
  )
  const existingKeys = new Set(existing.flatMap((contact) => contactIdentityKeys(contact)))

  let contacts
  let modelUsed: string | undefined
  if (hasPreParsed) {
    // Commit path: re-validate the previewed contacts (defense in depth), but
    // do NOT re-run the model — the approved parse is the committed parse.
    contacts = normalizeParsedContacts({ contacts: body.contacts }, existingKeys)
  } else {
    const model = await resolveMarketingModel(client, body.model)
    const prompts = buildIntakePrompts(text)
    const result = await generateClaudeText({
      system: prompts.system,
      user: prompts.user,
      model,
      maxTokens: 8192,
    })
    modelUsed = result.model
    contacts = normalizeParsedContacts(parseJsonObject(result.text), existingKeys)
  }

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
  for (const contact of contacts) {
    if (contact.duplicate) {
      skipped.push({ name: contact.name, reason: 'duplicate (matching identity already exists)' })
      continue
    }
    const doc = await client.create(buildContactCreateDoc(contact) as { _type: string })
    created.push({ id: doc._id, name: contact.name })
  }

  // First-use convenience: if the offer catalog is empty, seed the defaults so
  // the very first research run has offers to match against (idempotent ids;
  // never overwrites CMS edits).
  let seededOffers = 0
  const offerCount = await client.fetch<number>(`count(*[_type == "marketingOffer"])`)
  if (offerCount === 0) {
    await Promise.all(
      DEFAULT_OFFERS.map((offer) =>
        client.createIfNotExists({
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
        }),
      ),
    )
    seededOffers = DEFAULT_OFFERS.length
  }

  return privateMarketingJson(
    { parsed: contacts.length, created, skipped, seededOffers, model: modelUsed },
    { status: 201 },
  )
}
