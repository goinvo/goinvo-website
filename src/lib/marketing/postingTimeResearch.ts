/**
 * Posting-time research — "best time to post" research per marketing content
 * source (channel), powered by LIVE web research.
 *
 * Flow (matches the user's "generate a plan, then consume it"):
 *   1. buildPostingTimePlan(channel)  — derive a structured research plan from
 *      the channel (platform, content types, audience, goal, timezone logic).
 *   2. researchChannelPostingTimes()  — consume the plan via the OpenAI
 *      Responses API with the built-in `web_search` tool: the model searches the
 *      live web (Buffer / Sprout / Hootsuite / platform docs…), then returns a
 *      structured recommendation with cited sources.
 *   3. applyPostingTimeResearch()     — persist the recommendation onto the
 *      channel (`recommendedPostingTimes` + `postingTimesResearch`) so it can
 *      default the calendar's publishAt.
 *
 * Self-contained + fail-closed: with no OPENAI_API_KEY it returns a clear error
 * and writes nothing.
 */

import type { SanityClient } from '@sanity/client'

// ---- Types -------------------------------------------------------------

export interface PostingTimeChannel {
  _id: string
  title?: string
  key?: string
  platform?: string
  description?: string
  contentTypes?: Array<{ label?: string; value?: string }>
}

export interface PostingTimeSlot {
  /** lowercase day, e.g. "wednesday" */
  dayOfWeek: string
  /** 24h "HH:MM" in the slot's timezone */
  time: string
  /** IANA timezone the time is expressed in (default America/New_York) */
  timezone: string
  /** "primary" | "secondary" | content-type label */
  label: string
  /** which channel content type this slot is best for, if specific */
  contentType?: string
  rationale: string
  confidence: 'strong' | 'medium' | 'early'
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
  return Boolean(process.env.OPENAI_API_KEY)
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

// ---- 2. Consume (live web research) ------------------------------------

interface OpenAiResponsesOutputItem {
  type?: string
  content?: Array<{
    type?: string
    text?: string
    annotations?: Array<{ type?: string; url?: string; title?: string }>
  }>
}

export async function researchChannelPostingTimes(
  channel: PostingTimeChannel,
  opts: ResearchOptions = {},
): Promise<PostingTimeRecommendation> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured — posting-time research is disabled.')
  }
  const plan = buildPostingTimePlan(channel, opts)
  const model =
    opts.model || process.env.MARKETING_RESEARCH_AI_MODEL || process.env.MARKETING_AI_MODEL || 'gpt-4o'
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs || Number(process.env.MARKETING_RESEARCH_TIMEOUT_MS || 90000),
  )

  const system = [
    'You are a social-media timing researcher. Use the web_search tool to find CURRENT, cited evidence on best posting times before answering — do not rely on memory alone.',
    'Prefer reputable, recent sources (Buffer, Sprout Social, Hootsuite, Later, platform docs, 2024–2025 studies). Cite every recommendation.',
    'Apply the timezone logic precisely; output absolute ET clock times for a coast-to-coast US audience, not per-follower-local figures.',
    'Return ONLY a JSON object matching the schema in the user message — no prose, no markdown fences.',
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
    },
  })

  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        // OpenAI Responses API built-in live web search.
        tools: [{ type: 'web_search_preview' }],
        temperature: 0.2,
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`OpenAI research call failed (${response.status}): ${detail.slice(0, 300)}`)
  }

  const data = (await response.json()) as {
    output?: OpenAiResponsesOutputItem[]
    output_text?: string
  }

  const { text, sources } = extractTextAndSources(data)
  const parsed = parseRecommendationJson(text)

  return {
    summary: parsed.summary || '',
    timezoneLogic: parsed.timezoneLogic || plan.timezoneLogic,
    avoid: parsed.avoid || [],
    slots: parsed.slots || [],
    // Prefer model-cited sources; fall back to the web_search annotations.
    sources: (parsed.sources && parsed.sources.length ? parsed.sources : sources).slice(0, 12),
    model,
    researchedAt: new Date().toISOString(),
    plan,
  }
}

function extractTextAndSources(data: {
  output?: OpenAiResponsesOutputItem[]
  output_text?: string
}): { text: string; sources: PostingTimeSource[] } {
  const sources: PostingTimeSource[] = []
  let text = data.output_text || ''
  for (const item of data.output || []) {
    if (item.type !== 'message' || !item.content) continue
    for (const part of item.content) {
      if (part.type === 'output_text' && part.text) {
        if (!text) text = part.text
      }
      for (const ann of part.annotations || []) {
        if (ann.url && !sources.some((s) => s.url === ann.url)) {
          sources.push({ title: ann.title || ann.url, url: ann.url })
        }
      }
    }
  }
  return { text, sources }
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

// ---- 4. Schedule: next recommended publishAt ---------------------------

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

// Minutes the IANA `tz` is ahead of UTC at `date` (DST-aware, via Intl).
function tzOffsetMinutes(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUtc - date.getTime()) / 60000
}

/**
 * The next UTC instant matching a recommended slot (day-of-week + wall-clock time
 * in the slot's timezone), at or after `from`. Used to default a calendar item's
 * publishAt from the channel's researched posting times. Optionally filter to the
 * slot(s) best for a given content type. Returns null if no usable slot.
 */
export function nextRecommendedPublishAt(
  slots: PostingTimeSlot[] | undefined,
  from: Date = new Date(),
  contentType?: string,
): Date | null {
  if (!slots || slots.length === 0) return null
  const usable = contentType
    ? slots.filter((s) => !s.contentType || s.contentType === contentType)
    : slots
  let best: Date | null = null

  for (const slot of usable.length ? usable : slots) {
    const targetDay = DAY_INDEX[(slot.dayOfWeek || '').toLowerCase()]
    if (targetDay === undefined) continue
    const [hh, mm] = (slot.time || '12:00').split(':').map((n) => Number(n))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue
    const tz = slot.timezone || 'America/New_York'

    // Scan the next 14 days; build the slot's wall-clock instant in tz and keep
    // the soonest one that is >= from.
    for (let i = 0; i < 14; i += 1) {
      const probe = new Date(from.getTime() + i * 86400000)
      const local = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(probe)
      const parts = Object.fromEntries(local.map((x) => [x.type, x.value]))
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday as string)
      if (weekday !== targetDay) continue
      const guess = Date.UTC(+parts.year, +parts.month - 1, +parts.day, hh, mm)
      const instant = new Date(guess - tzOffsetMinutes(tz, new Date(guess)) * 60000)
      if (instant.getTime() >= from.getTime()) {
        if (!best || instant < best) best = instant
        break
      }
    }
  }
  return best
}

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
