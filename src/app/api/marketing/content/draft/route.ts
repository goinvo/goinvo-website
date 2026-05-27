import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

type DraftContentRequest = {
  calendarItemId?: string
  prompt?: string
  save?: boolean
}

type CalendarItemForDraft = {
  _id: string
  title?: string
  status?: string
  publishAt?: string
  contentType?: string
  channel?: string
  brief?: string
  callToAction?: string
  workingUrl?: string
  topicCluster?: string
  searchIntent?: string
  targetQueries?: string[]
  campaign?: {
    title?: string
    primaryGoal?: string
    audience?: string
    positioning?: string
    canonicalUrl?: string
  }
  funnel?: {
    title?: string
    conversionGoal?: string
    stages?: Array<{
      stage?: string
      goal?: string
      offer?: string
      callToAction?: string
      destinationUrl?: string
    }>
  }
  researchProject?: {
    title?: string
    brief?: string
    audience?: string
    canonicalUrl?: string
  }
  researchResults?: Array<{
    title?: string
    resultType?: string
    keyword?: string
    volume?: number
    difficulty?: number
    sourceUrl?: string
    claim?: string
    contentGap?: string
    implication?: string
    provider?: string
  }>
  audienceProfiles?: Array<{ title?: string; audience?: string; needs?: string[]; desiredActions?: string[] }>
  messagePillars?: Array<{ title?: string; coreClaim?: string; approvedPhrases?: string[]; phrasesToAvoid?: string[] }>
  proofPoints?: Array<{ title?: string; claim?: string; sourceTitle?: string; sourceUrl?: string; confidence?: string; usageNotes?: string }>
  ctas?: Array<{ title?: string; label?: string; funnelStage?: string; destination?: string; successSignal?: string }>
  trackingRule?: { title?: string; utmSourceRule?: string; utmMediumRule?: string; utmCampaignPattern?: string; utmContentPattern?: string }
  qualityGates?: Array<{ title?: string; checks?: Array<{ label?: string; category?: string; guidance?: string }> }>
  linkItems?: Array<{
    title?: string
    url?: string
    description?: string
  }>
}

type ContentDraftSuggestion = {
  format?: string
  channel?: string
  headline?: string
  caption?: string
  frames?: Array<{
    title?: string
    body?: string
    visualDirection?: string
    altText?: string
  }>
  altText?: string
  hashtags?: string[]
  productionNotes?: string
  callToAction?: string
}

let sanityClient: SanityClient | null = null

function getSanityClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return sanityClient
}

export async function POST(request: NextRequest) {
  const sanityClient = getSanityClient()
  if (!sanityClient) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const input = (await request.json()) as DraftContentRequest
  const calendarItemId = sanitizeId(input.calendarItemId)
  if (!calendarItemId) {
    return NextResponse.json({ error: 'calendarItemId is required.' }, { status: 400 })
  }

  const calendarItem = await sanityClient.fetch<CalendarItemForDraft | null>(
    `*[_id == $calendarItemId && _type == "marketingCalendarItem"][0]{
      _id,
      title,
      status,
      publishAt,
      contentType,
      channel,
      brief,
      callToAction,
      workingUrl,
      topicCluster,
      searchIntent,
      targetQueries,
      "campaign": campaign->{title, primaryGoal, audience, positioning, canonicalUrl},
      "funnel": funnel->{title, conversionGoal, stages[]{stage, goal, offer, callToAction, destinationUrl}},
      "researchProject": researchProject->{title, brief, audience, canonicalUrl},
      "researchResults": researchResults[]->{title, resultType, keyword, volume, difficulty, sourceUrl, claim, contentGap, implication, provider},
      "audienceProfiles": audienceProfiles[]->{title, audience, needs, desiredActions},
      "messagePillars": messagePillars[]->{title, coreClaim, approvedPhrases, phrasesToAvoid},
      "proofPoints": proofPoints[]->{title, claim, sourceTitle, sourceUrl, confidence, usageNotes},
      "ctas": ctas[]->{title, label, funnelStage, destination, successSignal},
      "trackingRule": trackingRule->{title, utmSourceRule, utmMediumRule, utmCampaignPattern, utmContentPattern},
      "qualityGates": qualityGates[]->{title, checks[]{label, category, guidance}},
      "linkItems": linkItems[]->{title, url, description}
    }`,
    { calendarItemId },
  )

  if (!calendarItem) {
    return NextResponse.json({ error: 'Calendar item not found.' }, { status: 404 })
  }

  const assistResponse = await fetch(new URL('/api/marketing/assist', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'contentDraft',
      prompt: buildContentDraftPrompt(calendarItem, input.prompt),
      draft: buildContentDraftInput(calendarItem),
    }),
  })

  const assistPayload = await assistResponse.json().catch(() => null)
  if (!assistResponse.ok || !assistPayload?.suggestion?.contentDraft) {
    return NextResponse.json(
      {
        error: 'Content draft assistant failed.',
        status: assistResponse.status,
      },
      { status: 502 },
    )
  }

  const contentDraft = normalizeContentDraft(assistPayload.suggestion.contentDraft)
  if (input.save !== false) {
    await sanityClient
      .patch(calendarItem._id)
      .set({
        contentDraft: contentDraft.caption,
        draftFrames: contentDraft.frames,
        draftAltText: contentDraft.altText,
        draftHashtags: contentDraft.hashtags,
        contentProductionNotes: contentDraft.productionNotes,
        callToAction: contentDraft.callToAction || calendarItem.callToAction || '',
        status: calendarItem.status === 'idea' ? 'drafting' : calendarItem.status || 'drafting',
      })
      .commit()
  }

  return NextResponse.json({
    calendarItemId: calendarItem._id,
    saved: input.save !== false,
    usedAi: Boolean(assistPayload.usedAi),
    contentDraft,
  })
}

function buildContentDraftPrompt(calendarItem: CalendarItemForDraft, prompt?: string) {
  return [
    'Write the planned content itself for this marketing calendar item.',
    'Use the brief, approved research findings, campaign/funnel context, and destination links below.',
    'Use linked strategy audience, message, proof, CTA, tracking, and quality gate records when present.',
    'Do not invent provider scores, unsupported statistics, or fake source details.',
    calendarItem.contentType === 'carousel'
      ? 'For a carousel, write frame-by-frame copy with visual direction and accessible alt text.'
      : 'Write ready-to-edit production copy for the selected format.',
    prompt ? `Additional direction from the designer: ${sanitizeMultilineText(prompt, 600)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildContentDraftInput(calendarItem: CalendarItemForDraft) {
  const destinationUrl = calendarItem.linkItems?.[0]?.url || calendarItem.workingUrl || calendarItem.campaign?.canonicalUrl || calendarItem.researchProject?.canonicalUrl || ''
  return {
    title: calendarItem.title,
    format: calendarItem.contentType,
    contentType: calendarItem.contentType,
    channel: calendarItem.channel,
    brief: calendarItem.brief,
    callToAction: calendarItem.callToAction || (destinationUrl ? 'See link in bio' : ''),
    destinationUrl,
    topicCluster: calendarItem.topicCluster,
    searchIntent: calendarItem.searchIntent,
    targetQueries: calendarItem.targetQueries,
    campaign: calendarItem.campaign,
    funnel: calendarItem.funnel,
    researchProject: calendarItem.researchProject,
    researchResults: calendarItem.researchResults,
    audienceProfiles: calendarItem.audienceProfiles,
    messagePillars: calendarItem.messagePillars,
    proofPoints: calendarItem.proofPoints,
    ctas: calendarItem.ctas,
    trackingRule: calendarItem.trackingRule,
    qualityGates: calendarItem.qualityGates,
    linkItems: calendarItem.linkItems,
  }
}

function normalizeContentDraft(value: ContentDraftSuggestion) {
  return {
    format: sanitizeText(value.format, 60) || 'socialPost',
    channel: sanitizeText(value.channel, 60) || 'instagram',
    headline: sanitizeText(value.headline, 160),
    caption: sanitizeMultilineText(value.caption, 2800),
    frames: normalizeDraftFrames(value.frames),
    altText: sanitizeMultilineText(value.altText, 1200),
    hashtags: normalizeStringArray(value.hashtags).slice(0, 12),
    productionNotes: sanitizeMultilineText(value.productionNotes, 1200),
    callToAction: sanitizeText(value.callToAction, 140),
  }
}

function normalizeDraftFrames(value: ContentDraftSuggestion['frames']) {
  return (Array.isArray(value) ? value : [])
    .map((frame) => ({
      _key: randomKey(),
      _type: 'draftFrame',
      title: sanitizeText(frame.title, 140),
      body: sanitizeMultilineText(frame.body, 900),
      visualDirection: sanitizeMultilineText(frame.visualDirection, 500),
      altText: sanitizeMultilineText(frame.altText, 500),
    }))
    .filter((frame) => frame.title || frame.body || frame.visualDirection || frame.altText)
    .slice(0, 12)
}

function sanitizeId(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : ''
}

function sanitizeText(value: unknown, limit: number) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function sanitizeMultilineText(value: unknown, limit: number) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, limit)
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)))
    : []
}

function randomKey() {
  return Math.random().toString(36).slice(2, 12)
}
