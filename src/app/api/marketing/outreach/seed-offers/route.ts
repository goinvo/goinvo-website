import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { DEFAULT_OFFERS, offerDocId } from '@/lib/marketing/outreach'
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
 * POST /api/marketing/outreach/seed-offers — idempotently create the default
 * offer catalog in the private outreach dataset (deterministic _ids; existing
 * docs are left untouched, so CMS edits are never overwritten).
 */
export async function POST(request: NextRequest) {
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

  const results = await Promise.all(
    DEFAULT_OFFERS.map(async (offer) => {
      const _id = offerDocId(offer.key)
      const existing = await client.fetch<string | null>(`*[_id == $id][0]._id`, { id: _id })
      if (existing) return { key: offer.key, created: false }
      await client.createIfNotExists({
        _id,
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
      })
      return { key: offer.key, created: true }
    }),
  )

  return NextResponse.json({
    created: results.filter((r) => r.created).map((r) => r.key),
    existing: results.filter((r) => !r.created).map((r) => r.key),
  })
}
