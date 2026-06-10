import { NextResponse } from 'next/server'
import {
  assertStudioOrApiKey,
  buildCreatePayload,
  buildProofPointFromResult,
  getMarketingWriteClient,
  MarketingAuthError,
  MarketingValidationError,
  refsFromIds,
  type ResearchProjectForProof,
  type ResearchResultForProof,
} from '@/lib/marketing'

// POST /api/marketing/clone/proof-from-result
//
// Body: { resultId, draft? }. Fetches the marketingResearchResult (404 if
// missing), derives the marketingProofPoint fields via buildProofPointFromResult,
// and creates the proof point with buildCreatePayload so defaults and array keys
// are applied. The source result is then patched so its `proofPoints` array
// includes the new proof-point reference (rebuilt from existing + new ids, each
// keyed by refsFromIds), matching the Studio tool's createProofPointFromResult.
// Returns { id, document }.
//
// `draft` is an optional originating research project ({ _id, title }) used for
// provenance notes / topic cluster; it does not need to be the result's project.
//
// Fails closed: a valid marketing API key OR a logged-in Studio session is
// required (401 otherwise).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Existing proofPoints refs on the source result, used to merge the new id. */
type ResultWithProofRefs = ResearchResultForProof & {
  proofPoints?: Array<{ _ref?: string }>
}

export async function POST(req: Request) {
  try {
    await assertStudioOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { resultId, draft } = (body ?? {}) as { resultId?: unknown; draft?: unknown }
  if (typeof resultId !== 'string' || !resultId.trim()) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `resultId` string.' },
      { status: 400 },
    )
  }

  // `draft` is optional; only pass it through when it carries an _id.
  const project =
    draft && typeof draft === 'object' && typeof (draft as { _id?: unknown })._id === 'string'
      ? (draft as ResearchProjectForProof)
      : undefined

  try {
    const client = getMarketingWriteClient()

    const result = await client.fetch<ResultWithProofRefs | null>(
      '*[_type == "marketingResearchResult" && _id == $id][0]{..., proofPoints[]{_ref}}',
      { id: resultId },
    )
    if (!result) {
      return NextResponse.json(
        { error: `No marketingResearchResult found with _id ${resultId}.` },
        { status: 404 },
      )
    }

    let doc
    try {
      doc = buildCreatePayload('marketingProofPoint', buildProofPointFromResult(result, project))
    } catch (error) {
      if (error instanceof MarketingValidationError) {
        return NextResponse.json({ error: error.message, missing: error.missing }, { status: 422 })
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to build proof point.' },
        { status: 400 },
      )
    }

    const document = await client.create(doc)

    // Append the new proof point to the source result's proofPoints array,
    // rebuilding the full keyed ref list from existing + new ids (deduped),
    // matching the Studio tool's createProofPointFromResult.
    const existingIds = (result.proofPoints || [])
      .map((ref) => ref?._ref)
      .filter((ref): ref is string => Boolean(ref))
    const nextIds = Array.from(new Set([...existingIds, document._id]))
    await client.patch(resultId).set({ proofPoints: refsFromIds(nextIds) }).commit()

    return NextResponse.json({ id: document._id, document }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create proof from result.'
    console.error('Marketing clone proof-from-result failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
