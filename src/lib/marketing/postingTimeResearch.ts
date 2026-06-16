/**
 * Posting-time research — "best time to post" research per marketing content
 * source (channel), powered by LIVE web research.
 *
 * Flow (matches the user's "generate a plan, then consume it"):
 *   1. buildPostingTimePlan(channel)  — derive a structured research plan from
 *      the channel (platform, content types, audience, goal, timezone logic).
 *   2. researchChannelPostingTimes()  — consume the plan via Claude
 *      (`claude-opus-4-8`) with the built-in `web_search` server tool: Claude
 *      searches the live web (Buffer / Sprout / Hootsuite / platform docs…),
 *      then returns a structured recommendation with cited sources.
 *   3. applyPostingTimeResearch()     — persist the recommendation onto the
 *      channel (`recommendedPostingTimes` + `postingTimesResearch`) so it can
 *      default the calendar's publishAt.
 *
 * Self-contained + fail-closed: with no ANTHROPIC_API_KEY it returns a clear
 * error and writes nothing.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SanityClient } from '@sanity/client'
import { nextRecommendedPublishAt, type PostingTimeSlot } from './postingTimeSchedule'

// Re-export the SDK-free scheduling helper + slot type so existing server callers
// keep importing them from here; the calendar UI imports them straight from
// ./postingTimeSchedule (which keeps the Anthropic SDK out of the client bundle).
export { nextRecommendedPublishAt, type PostingTimeSlot }

// ---- Types -------------------------------------------------------------

export interface PostingTimeChannel {
  _id: string
  title?: string
  key?: string
  platform?: string
  description?: string
  contentTypes?: Array<{ label?: string; value?: string }>
}

export interface PostingTimeSource {
  title: string
  url: string
}

export interface PostingTimePlan {
  channelId: string
  channelTitle: string
  platform: string
  audience: string
  goal: string
  contentTypes: string[]
  questions: string[]
  timezoneLogic: string
}

export interface PostingTimeRecommendation {
  summary: string
  timezoneLogic: string
  avoid: string[]
  slots: PostingTimeSlot[]
  sources: PostingTimeSource[]
  model: string
  researchedAt: string
  plan: PostingTimePlan
}

export interface ResearchOptions {
  /** Override the audience description (defaults to GoInvo's). */
  audience?: string
  /** Override the optimization goal (defaults to saves & shares). */
  goal?: string
  model?: string
  timeoutMs?: number
}

// GoInvo's audience + goal default — derived from the posting-time research note.
const DEFAULT_AUDIENCE =
  'US healthcare, design, and health-tech professionals (Boston-based studio; audience skews East Coast but spread nationally, ET→PT)'
const DEFAULT_GOAL =
  'maximize saves & shares on educational/infographic content by hitting the audience-active window so the algorithm widens distribution'

const TIMEZONE_LOGIC_GUIDANCE =
  'Vendor "best time" figures (Buffer, Sprout, Hootsuite) are reported in each follower\'s LOCAL time, so they do NOT give a single clock time for a coast-to-coast audience. Pick an ET clock time whose local-time window overlaps the productive workday from ET to PT. If the audience skews ET, bias earlier toward the ET majority.'

export function isPostingTimeResearchConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// ---- 1. Plan -----------------------------------------------------------

export function buildPostingTimePlan(
  channel: PostingTimeChannel,
  opts: ResearchOptions = {},
): PostingTimePlan {
  const platform = channel.platform || 'social'
  const contentTypes = (channel.contentTypes || [])
    .map((c) => c.label || c.value || '')
    .filter(Boolean)
  const audience = opts.audience || DEFAULT_AUDIENCE
  const goal = opts.goal || DEFAULT_GOAL

  return {
    channelId: channel._id,
    channelTitle: channel.title || channel.key || platform,
    platform,
    audience,
    goal,
    contentTypes,
    questions: [
      `What are the current best days and times to post on ${platform} for ${audience}?`,
      contentTypes.length
        ? `Do recommendations differ for these content types: ${contentTypes.join(', ')}?`
        : `Do recommendations differ by content format (e.g. carousels, video, link posts)?`,
      `Which single ET clock time best overlaps the active window across ET→PT for this audience?`,
      `What days/times should be AVOIDED on ${platform}?`,
    ],
    timezoneLogic: TIMEZONE_LOGIC_GUIDANCE,
  }
}

// ---- 2. Consume (live web research via Claude + the web_search server tool) ----

export async function researchChannelPostingTimes(
  channel: PostingTimeChannel,
  opts: ResearchOptions = {},
): Promise<PostingTimeRecommendation> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured — posting-time research is disabled.')
  }
  const plan = buildPostingTimePlan(channel, opts)
  const model = opts.model || process.env.MARKETING_RESEARCH_AI_MODEL || 'claude-opus-4-8'
  const client = new Anthropic({ apiKey, maxRetries: 1 })

  const system = [
    'You are a social-media timing researcher. Use the web_search tool to find CURRENT, cited evidence on best posting times before answering — do not rely on memory alone.',
    'Prefer reputable, recent sources (Buffer, Sprout Social, Hootsuite, Later, platform docs, 2024–2025 studies). Cite every recommendation.',
    'Apply the timezone logic precisely; output absolute ET clock times for a coast-to-coast US audience, not per-follower-local figures.',
    'Your FINAL message must be ONLY a JSON object matching the schema in the user message — no prose, no markdown fences, no commentary.',
  ].join('\n')

  const user = JSON.stringify({
    task: 'Research the best times to post for this content source and return a structured recommendation.',
    plan,
    timezoneLogic: plan.timezoneLogic,
    outputSchema: {
      summary: 'one-sentence bottom line (e.g. "post midweek midday ET")',
      timezoneLogic: 'one sentence on the ET-clock-time reasoning you applied',
      avoid: ['array of days/times to avoid'],
      slots: [
        {
          dayOfWeek: 'lowercase day',
          time: 'HH:MM 24h',
          timezone: 'IANA tz, default America/New_York',
          label: 'primary | secondary | <content-type>',
          contentType: 'optional: which content type this slot is best for',
          rationale: 'why, citing the evidence',
          confidence: 'strong | medium | early',
        },
      ],
      sources: [{ title: 'source title', url: 'https://…' }],
    },
  })

  // Claude runs the web_search server tool internally (it may search several
  // times before answering). Stream so the search+synthesis loop can't trip an
  // HTTP timeout, then read the final message. NO `thinking`: adaptive thinking
  // combined with the web_search server tool currently returns a server-side 500
  // from the API, while web_search alone is reliable. (No temperature/top_p
  // either — Opus 4.8 rejects them.)
  const stream = client.messages.stream(
    {
      model,
      max_tokens: 8192,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      system,
      messages: [{ role: 'user', content: user }],
    },
    { timeout: opts.timeoutMs || Number(process.env.MARKETING_RESEARCH_TIMEOUT_MS || 180000) },
  )
  const message = await stream.finalMessage()
  const { text, sources } = extractTextAndSources(message)
  const parsed = parseRecommendationJson(text)

  return {
    summary: parsed.summary || '',
    timezoneLogic: parsed.timezoneLogic || plan.timezoneLogic,
    avoid: parsed.avoid || [],
    slots: parsed.slots || [],
    // Prefer the model's own cited sources; fall back to the web_search citations.
    sources: (parsed.sources && parsed.sources.length ? parsed.sources : sources).slice(0, 12),
    model,
    researchedAt: new Date().toISOString(),
    plan,
  }
}

// Concatenate the assistant's text (the JSON), and collect sources — preferring
// the URLs Claude actually CITED over the full raw web_search result set.
function extractTextAndSources(message: Anthropic.Message): {
  text: string
  sources: PostingTimeSource[]
} {
  const cited: PostingTimeSource[] = []
  const allResults: PostingTimeSource[] = []
  const push = (into: PostingTimeSource[], url?: string, title?: string) => {
    if (url && !into.some((s) => s.url === url)) into.push({ title: title || url, url })
  }
  let text = ''
  for (const block of message.content as unknown as Array<Record<string, unknown>>) {
    if (block.type === 'text') {
      text += (text ? '\n' : '') + ((block.text as string) || '')
      for (const c of (block.citations as Array<Record<string, unknown>>) || []) {
        push(cited, c.url as string, c.title as string)
      }
    } else if (block.type === 'web_search_tool_result') {
      const inner = Array.isArray(block.content) ? (block.content as Array<Record<string, unknown>>) : []
      for (const r of inner) {
        if (r?.type === 'web_search_result') push(allResults, r.url as string, r.title as string)
      }
    }
  }
  return { text, sources: cited.length ? cited : allResults }
}

function parseRecommendationJson(text: string): Partial<PostingTimeRecommendation> {
  if (!text) return {}
  // Strip markdown fences and grab the outermost JSON object.
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return {}
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Partial<PostingTimeRecommendation>
  } catch {
    return {}
  }
}

// ---- 3. Persist --------------------------------------------------------

export async function applyPostingTimeResearch(
  client: SanityClient,
  channelId: string,
  rec: PostingTimeRecommendation,
): Promise<void> {
  await client
    .patch(channelId)
    .set({
      recommendedPostingTimes: rec.slots.map((slot, i) => ({
        _key: `pts-${i}-${slot.dayOfWeek}-${slot.time.replace(':', '')}`,
        dayOfWeek: slot.dayOfWeek,
        time: slot.time,
        timezone: slot.timezone || 'America/New_York',
        label: slot.label,
        contentType: slot.contentType,
        rationale: slot.rationale,
        confidence: slot.confidence,
      })),
      postingTimesResearch: {
        researchedAt: rec.researchedAt,
        summary: rec.summary,
        timezoneLogic: rec.timezoneLogic,
        avoid: rec.avoid,
        model: rec.model,
        sources: rec.sources.map((s, i) => ({ _key: `src-${i}`, title: s.title, url: s.url })),
      },
    })
    .commit()
}
