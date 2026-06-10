import { NextResponse } from 'next/server'
import {
  assertStudioOrApiKey,
  createResearchProjectRecords,
  getMarketingWriteClient,
  MarketingAuthError,
  type CascadeResearchProject,
} from '@/lib/marketing'

// POST /api/marketing/cascade/research-records
//
// Body: { projectId }. Fetches the marketingResearchProject by _id together with
// its approved + selected results (the references the Studio cascade reads),
// then runs createResearchProjectRecords — faithfully replicating the Studio
// tool's `createResearchProjectGeneratedRecords`. This creates:
//   - 1 marketingFunnel
//   - 1 marketingCampaign
//   - 1–2 (marketingCalendarItem + marketingLinkItem) pairs
//   - 0–3 marketingChannel (via ensureMarketingChannel, only when missing)
// and finally patches the project to status 'converted' with the generated refs
// appended. Returns { created: { funnelId, campaignId, calendarItemIds,
// linkItemIds, channelKeys, projectId } }.
//
//   - 404 when the project does not exist.
//   - 422 when the project has no approved + selected (trusted) results.
//
// Fails closed: a valid marketing API key OR a logged-in Studio session is
// required (401 otherwise).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Projection that inlines every field the cascade reads off a research result,
 * for both the approved and selected reference arrays, while keeping the
 * generatedXxx arrays as raw references (so the cascade can merge their ids).
 */
const RESULT_PROJECTION = `{
  _id,
  title,
  resultType,
  status,
  selectedForSynthesis,
  keyword,
  searchIntent,
  scoreSource,
  volume,
  difficulty,
  canonicalUrl,
  sourceUrl,
  sourceTitle,
  claim,
  collaboratorName,
  organization,
  topicArea
}`

const PROJECT_QUERY = `*[_type == "marketingResearchProject" && _id == $id][0]{
  _id,
  title,
  status,
  brief,
  audience,
  campaignObjective,
  positioning,
  canonicalUrl,
  selectedResults[]->${RESULT_PROJECTION},
  approvedResults[]->${RESULT_PROJECTION},
  generatedCampaigns[]{_ref},
  generatedFunnels[]{_ref},
  generatedCalendarItems[]{_ref},
  generatedLinkItems[]{_ref}
}`

/** True when a result is approved/selected (the cascade's trust gate). */
function isApproved(status?: string): boolean {
  return status === 'approved' || status === 'selected'
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

  const { projectId } = (body ?? {}) as { projectId?: unknown }
  if (typeof projectId !== 'string' || !projectId.trim()) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `projectId` string.' },
      { status: 400 },
    )
  }

  try {
    const client = getMarketingWriteClient()

    const project = await client.fetch<CascadeResearchProject | null>(PROJECT_QUERY, {
      id: projectId,
    })
    if (!project) {
      return NextResponse.json(
        { error: `No marketingResearchProject found with _id ${projectId}.` },
        { status: 404 },
      )
    }

    // The cascade requires at least one approved/selected (trusted) result; fail
    // with a clear 422 before doing any writes when none are present.
    const trusted = [
      ...(project.selectedResults || []),
      ...(project.approvedResults || []),
    ].filter((result) => result && isApproved(result.status))
    if (trusted.length === 0) {
      return NextResponse.json(
        {
          error:
            'Project has no approved or selected (trusted) results. Approve or select at least one research result with status "approved" or "selected" before creating linked drafts.',
        },
        { status: 422 },
      )
    }

    const created = await createResearchProjectRecords(client, project)
    return NextResponse.json({ created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create research records.'
    console.error('Marketing cascade research-records failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
