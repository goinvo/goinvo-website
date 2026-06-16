import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import {
  applyPostingTimeResearch,
  buildPostingTimePlan,
  isPostingTimeResearchConfigured,
  researchChannelPostingTimes,
  type PostingTimeChannel,
} from '@/lib/marketing/postingTimeResearch'

export const dynamic = 'force-dynamic'
// Live web research per channel can take ~60–90s; allow headroom for a batch.
export const maxDuration = 300

let sanityClient: SanityClient | null = null
function getSanityClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

const CHANNEL_PROJECTION = `{
  _id, title, key, platform, contentTypes[]{ label, value }
}`

type RequestBody = {
  channelId?: string
  all?: boolean
  dryRun?: boolean
  audience?: string
  goal?: string
  model?: string
}

export async function POST(request: NextRequest) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  if (!isPostingTimeResearchConfigured()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured — posting-time research is disabled.' },
      { status: 503 },
    )
  }

  const client = getSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as RequestBody
  const channelId = body.channelId || url.searchParams.get('id') || undefined
  const all = body.all || url.searchParams.get('all') === '1'
  const dryRun = body.dryRun || url.searchParams.get('dryRun') === '1'

  if (!channelId && !all) {
    return NextResponse.json(
      { error: 'Provide a channelId, or all=true to research every channel.' },
      { status: 400 },
    )
  }

  const channels = await client.fetch<PostingTimeChannel[]>(
    channelId
      ? `*[_type == "marketingChannel" && _id == $channelId]${CHANNEL_PROJECTION}`
      : `*[_type == "marketingChannel" && status != "archived"]|order(title asc)${CHANNEL_PROJECTION}`,
    { channelId: channelId || '' },
  )

  if (channels.length === 0) {
    return NextResponse.json({ error: 'No matching channel(s) found.' }, { status: 404 })
  }

  const opts = { audience: body.audience, goal: body.goal, model: body.model }

  // Research channels concurrently — each call is independent and bounded by its
  // own timeout; the batch is bounded by maxDuration.
  const results = await Promise.all(
    channels.map(async (channel) => {
      try {
        if (dryRun) {
          return { channelId: channel._id, title: channel.title, plan: buildPostingTimePlan(channel, opts) }
        }
        const rec = await researchChannelPostingTimes(channel, opts)
        await applyPostingTimeResearch(client, channel._id, rec)
        return {
          channelId: channel._id,
          title: channel.title,
          summary: rec.summary,
          slots: rec.slots,
          sourceCount: rec.sources.length,
          model: rec.model,
        }
      } catch (err) {
        return {
          channelId: channel._id,
          title: channel.title,
          error: err instanceof Error ? err.message : 'Research failed.',
        }
      }
    }),
  )

  const failures = results.filter((r) => 'error' in r && r.error)
  return NextResponse.json({
    dryRun,
    researched: results.length - failures.length,
    failed: failures.length,
    results,
  })
}
