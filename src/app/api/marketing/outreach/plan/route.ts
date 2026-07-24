import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { MarketingRequestError } from '@/lib/marketing/apiBoundary'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  dueFollowUps,
  compactEvidenceIndex,
  hasPricedOffer,
  rankCallPlan,
  type OutreachContact,
  type WorkEvidence,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET, OUTREACH_STATUS_OPTIONS } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

export const dynamic = 'force-dynamic'

const FOLLOW_UP_RESPONSE_LIMIT = 50

function planLimit(request: Request): number {
  const url = new URL(request.url)
  const keys = [...url.searchParams.keys()]
  if (keys.some((key) => key !== 'limit') || url.searchParams.getAll('limit').length > 1) {
    throw new MarketingRequestError('Unknown or repeated outreach plan query parameter.', 400)
  }
  const raw = url.searchParams.get('limit')
  if (raw === null) return 10
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new MarketingRequestError('Outreach plan limit must be an integer from 1 to 50.', 400)
  }
  const limit = Number(raw)
  if (!Number.isSafeInteger(limit) || limit > 50) {
    throw new MarketingRequestError('Outreach plan limit must be an integer from 1 to 50.', 400)
  }
  return limit
}

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

/**
 * GET /api/marketing/outreach/plan — the ranked call plan (warmth-first, score
 * tiebreak) PLUS the follow-ups due strip, mirroring the Outreach tab for
 * headless/testable use.
 */
export async function GET(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
    const limit = planLimit(request)
    const client = getOutreachClient()
    if (!client) {
      return privateMarketingJson({ error: 'Outreach data is unavailable.' }, { status: 503 })
    }

    const data = await client.fetch<{
      contacts?: OutreachContact[]
      offers?: Array<{ key?: string; status?: string; priceBand?: string }>
      evidence?: WorkEvidence[]
    }>(
    `{
      "contacts": *[_type == "marketingContact"]{
        _id, name, organization, role, segment, owner, warmth, status, howWeKnow,
        feasibilityScore, suggestedOfferKey, callBrief, suggestedOpener,
        researchSummary, researchedAt, researchReviewedAt, personVerified,
        identityConfidence, relevantEvidence[]{evidenceId},
        proposedOffers[]{_key, chosen, priceBand},
        lastContactedAt, followUpAt
      },
      "offers": *[_type == "marketingOffer" && status == "active"]{key, status, priceBand},
      "evidence": *[_type == "marketingWorkEvidence" && status == "active"]{
        _id, sourceId, slug, url, manuallyEdited, extractedAt, title, status
      }
    }`,
    )
    const contacts = Array.isArray(data?.contacts) ? data.contacts : []
    const offers = Array.isArray(data?.offers) ? data.offers : []
    const evidence: WorkEvidence[] = Array.isArray(data?.evidence) ? data.evidence : []
    const offerByKey = new Map(offers.filter((offer) => offer?.key).map((offer) => [offer.key as string, offer]))
    const activeEvidenceIds = new Set(
      compactEvidenceIndex(evidence, { max: Math.max(evidence.length, 1) }).map((item) => item.id),
    )

    const plan = rankCallPlan(contacts, {
      limit,
      isReady: (contact) => {
        const hasActiveEvidence = (contact.relevantEvidence || []).some((item) =>
          activeEvidenceIds.has(item.evidenceId),
        )
        const chosen = (contact.proposedOffers || []).find((offer) => offer.chosen)
        if (chosen) return hasActiveEvidence && hasPricedOffer(chosen.priceBand)
        const catalog = contact.suggestedOfferKey ? offerByKey.get(contact.suggestedOfferKey) : undefined
        return Boolean(
          hasActiveEvidence &&
            catalog &&
            catalog.status === 'active' &&
            hasPricedOffer(catalog.priceBand),
        )
      },
    })
    const allFollowUps = dueFollowUps(contacts, { now: new Date().toISOString() })
    const knownStatuses = new Set(OUTREACH_STATUS_OPTIONS.map((option) => option.value))
    const counts = contacts.reduce<Record<string, number>>((acc, contact) => {
      const status = typeof contact.status === 'string' && knownStatuses.has(contact.status)
        ? contact.status
        : 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, Object.create(null) as Record<string, number>)

    return privateMarketingJson({
      total: contacts.length,
      counts,
      followUpsDueTotal: allFollowUps.length,
      followUpsDue: allFollowUps.slice(0, FOLLOW_UP_RESPONSE_LIMIT),
      plan,
    })
  } catch (error) {
    if (error instanceof MarketingAuthError || error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    console.error('Outreach plan failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'Outreach plan could not be loaded.' }, { status: 502 })
  }
}
