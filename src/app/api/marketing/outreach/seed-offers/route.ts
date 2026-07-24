import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest } from 'next/server'
import { apiVersion, projectId, writeToken } from '@/sanity/env'
import { isRevisionConflict, MarketingRequestError } from '@/lib/marketing/apiBoundary'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { DEFAULT_OFFERS, offerDocId } from '@/lib/marketing/outreach'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  createMarketingRequestDeduper,
  marketingRequestFingerprint,
  readMarketingIdempotencyKey,
} from '@/lib/marketing/requestDedupe'

export const dynamic = 'force-dynamic'

const runDedupedOfferSeed = createMarketingRequestDeduper<Record<string, unknown>>()

function assertSeedControls(request: Request) {
  const url = new URL(request.url)
  if ([...url.searchParams.keys()].length > 0) {
    throw new MarketingRequestError('Offer seeding does not accept query parameters.', 400)
  }
  if (request.body !== null) {
    throw new MarketingRequestError('Offer seeding does not accept a request body.', 400)
  }
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
 * POST /api/marketing/outreach/seed-offers — idempotently create the default
 * offer catalog in the private outreach dataset (deterministic _ids; existing
 * docs are left untouched, so CMS edits are never overwritten).
 */
export async function POST(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
    assertSeedControls(request)
    const payload = await runDedupedOfferSeed(
      marketingRequestFingerprint({ operation: 'seed-default-outreach-offers' }),
      readMarketingIdempotencyKey(request),
      async () => {
        const client = getOutreachClient()
        if (!client) throw new MarketingRequestError('Outreach offer storage is unavailable.', 503)

        const results = await Promise.all(
          DEFAULT_OFFERS.map(async (offer) => {
            const _id = offerDocId(offer.key)
            try {
              await client.create({
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
              return { key: offer.key, state: 'created' as const }
            } catch (error) {
              if (isRevisionConflict(error)) return { key: offer.key, state: 'existing' as const }
              return { key: offer.key, state: 'failed' as const }
            }
          }),
        )
        const failed = results.filter((result) => result.state === 'failed').map((result) => result.key)
        if (failed.length > 0) {
          throw new MarketingRequestError('The offer catalog could not be fully initialized. Retry safely.', 502)
        }
        return {
          created: results.filter((result) => result.state === 'created').map((result) => result.key),
          existing: results.filter((result) => result.state === 'existing').map((result) => result.key),
        }
      },
    )

    return privateMarketingJson(payload)
  } catch (error) {
    if (error instanceof MarketingAuthError || error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    console.error('Offer seeding failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'The offer catalog could not be initialized.' }, { status: 500 })
  }
}
