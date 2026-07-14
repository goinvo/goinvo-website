import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import {
  brandVoicePromptContext,
  brandVoiceResponseContext,
  resolveMarketingBrandVoice,
} from '@/lib/marketing/brandVoice'
import {
  buildResearchPatch,
  buildResearchPrompts,
  compactEvidenceIndex,
  DEFAULT_OFFERS,
  normalizeResearch,
  type OutreachContact,
  type OutreachOfferDef,
  type WorkEvidence,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'

export const dynamic = 'force-dynamic'
// One contact per call: live web research takes ~60–120s. The Studio loops over
// contacts client-side, so a batch never has to fit inside one invocation.
export const maxDuration = 300

let sanityClient: SanityClient | null = null
let marketingSettingsClient: SanityClient | null = null
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

function getMarketingSettingsClient() {
  if (!projectId) return null
  if (!marketingSettingsClient) {
    marketingSettingsClient = createClient({
      projectId,
      dataset,
      token: writeToken || undefined,
      apiVersion,
      useCdn: false,
    })
  }
  return marketingSettingsClient
}

const CONTACT_PROJECTION = `{
  _id, _rev, name, organization, role, segment, owner, warmth, status, howWeKnow,
  sourceNotes, linkedinUrl, brandVoiceKey
}`

type RequestBody = {
  id?: string
  dryRun?: boolean
  model?: string
}

/**
 * POST /api/marketing/outreach/research — research ONE contact (live web
 * search): org intel, offer match, RELEVANT WORK EVIDENCE (the "show them"
 * list from extracted case studies), 2–3 tailored offer drafts, feasibility
 * score, call brief; persists onto the contact. `dryRun` returns without writing.
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

  if (!isAnthropicConfigured()) {
    return privateMarketingJson(
      { error: 'ANTHROPIC_API_KEY is not configured — outreach research is disabled.' },
      { status: 503 },
    )
  }

  const client = getOutreachClient()
  const settingsClient = getMarketingSettingsClient()
  if (!client || !settingsClient) {
    return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as RequestBody
  const id = body.id || url.searchParams.get('id') || ''
  const dryRun = body.dryRun || url.searchParams.get('dryRun') === '1'

  if (!id) {
    return privateMarketingJson({ error: 'Provide `id` — the marketingContact _id.' }, { status: 400 })
  }

  const contact = await client.fetch<OutreachContact | null>(
    `*[_type == "marketingContact" && _id == $id][0]${CONTACT_PROJECTION}`,
    { id },
  )
  if (!contact) {
    return privateMarketingJson({ error: 'Contact not found.' }, { status: 404 })
  }

  // ACTIVE CMS offers drive the match; fall back to the built-in catalog so
  // research still works before the offers have been seeded.
  const cmsOffers = await client.fetch<OutreachOfferDef[]>(
    `*[_type == "marketingOffer" && status == "active"]|order(coalesce(order, 100) asc){
      key, title, oneLiner, description, priceBand, idealBuyer, proofPoints, order
    }`,
  )
  const offers = cmsOffers.length > 0 ? cmsOffers : DEFAULT_OFFERS

  // Extracted work evidence (real shipped projects) — the matching corpus for
  // "show them THIS work" + on-the-fly offer drafts. Empty until the Evidence
  // tab's extraction sweep has run; research degrades gracefully without it.
  const evidence = await client.fetch<WorkEvidence[]>(
    `*[_type == "marketingWorkEvidence" && status == "active"]|order(title asc){
      _id, sourceId, slug, url, manuallyEdited, extractedAt,
      title, client, summary, segments, techniques, domainExpertise,
      businessOutcomes, highlights[]{metric, detail}, status
    }`,
  )
  const evidenceIndex = compactEvidenceIndex(evidence, {
    max: 60,
    terms: [contact.segment, contact.organization, contact.role].filter(
      (value): value is string => Boolean(value),
    ),
  })

  // Contact PII stays in the private outreach dataset; suite configuration
  // (model + publish-safe brand voices) is resolved from production settings.
  const [model, brandVoice] = await Promise.all([
    resolveMarketingModel(settingsClient, body.model),
    resolveMarketingBrandVoice(settingsClient, contact.brandVoiceKey),
  ])
  const prompts = buildResearchPrompts(contact, offers, evidenceIndex, brandVoicePromptContext(brandVoice))
  const result = await generateClaudeText({
    system: prompts.system,
    user: prompts.user,
    model,
    maxTokens: 8192,
    webSearch: true,
    timeoutMs: Number(process.env.MARKETING_RESEARCH_TIMEOUT_MS || 240000),
  })
  const research = normalizeResearch(parseJsonObject(result.text), offers, evidenceIndex)

  if (!research.researchSummary && research.opportunities.length === 0) {
    return privateMarketingJson(
      { error: 'Research returned no usable result — try again.', model: result.model },
      { status: 502 },
    )
  }

  const patch = buildResearchPatch(research, {
    model: result.model,
    researchedAt: new Date().toISOString(),
    currentStatus: contact.status,
    fallbackSources: result.sources,
    brandVoice: brandVoice ? { key: brandVoice._key, name: brandVoice.name } : null,
  })

  if (!dryRun) {
    const latest = await client.fetch<{ _rev?: string } | null>(
      `*[_type == "marketingContact" && _id == $id][0]{_rev}`,
      { id: contact._id },
    )
    if (!latest) {
      return privateMarketingJson({ error: 'Contact was deleted while research was running.' }, { status: 409 })
    }
    if (!contact._rev || latest._rev !== contact._rev) {
      return privateMarketingJson(
        {
          error:
            'This contact changed while research was running. No AI fields were saved; review the latest contact and run research again.',
        },
        { status: 409 },
      )
    }
    try {
      await client.patch(contact._id).ifRevisionId(contact._rev).set(patch).commit()
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 0
      if (statusCode === 409) {
        return privateMarketingJson(
          { error: 'This contact changed just before research saved. No stale AI fields were written; run it again.' },
          { status: 409 },
        )
      }
      throw error
    }
  }

  return privateMarketingJson({
    dryRun,
    contactId: contact._id,
    name: contact.name,
    personVerified: research.personVerified,
    identityConfidence: research.identityConfidence,
    feasibilityScore: research.feasibilityScore,
    suggestedOfferKey: research.suggestedOfferKey,
    relevantEvidence: research.relevantEvidence,
    proposedOffers: research.proposedOffers,
    researchSummary: research.researchSummary,
    callBrief: research.callBrief,
    opportunities: research.opportunities,
    evidenceCandidates: evidence.length,
    evidenceIndexSize: evidenceIndex.length,
    sourceCount: (research.sources.length ? research.sources : result.sources).length,
    model: result.model,
    brandVoice: brandVoiceResponseContext(brandVoice),
  })
}
