import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  dueFollowUps,
  compactEvidenceIndex,
  hasPricedOffer,
  rankCallPlan,
  type OutreachContact,
  type WorkEvidence,
} from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

export const dynamic = 'force-dynamic'

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
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const client = getOutreachClient()
  if (!client) {
    return privateMarketingJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 10))

  const data = await client.fetch<{
    contacts: OutreachContact[]
    offers: Array<{ key?: string; status?: string; priceBand?: string }>
    evidence: WorkEvidence[]
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
  const contacts = data.contacts || []
  const offerByKey = new Map((data.offers || []).filter((offer) => offer.key).map((offer) => [offer.key as string, offer]))
  const evidence = data.evidence || []
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
  const followUps = dueFollowUps(contacts, { now: new Date().toISOString() })
  const counts = contacts.reduce<Record<string, number>>((acc, c) => {
    const status = c.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return privateMarketingJson({ total: contacts.length, counts, followUpsDue: followUps, plan })
}
