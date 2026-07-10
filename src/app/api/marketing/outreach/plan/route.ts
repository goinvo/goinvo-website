import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { dueFollowUps, rankCallPlan, type OutreachContact } from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'

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
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  const client = getOutreachClient()
  if (!client) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 10))

  const contacts = await client.fetch<OutreachContact[]>(
    `*[_type == "marketingContact"]{
      _id, name, organization, role, segment, owner, warmth, status,
      feasibilityScore, suggestedOfferKey, callBrief, suggestedOpener,
      researchSummary, researchedAt, lastContactedAt, followUpAt
    }`,
  )

  const plan = rankCallPlan(contacts, { limit })
  const followUps = dueFollowUps(contacts, { now: new Date().toISOString() })
  const counts = contacts.reduce<Record<string, number>>((acc, c) => {
    const status = c.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({ total: contacts.length, counts, followUpsDue: followUps, plan })
}
