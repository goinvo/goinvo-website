/**
 * Marqueta drafts a thing — an outline, a script, a post, an outreach email.
 *
 * She already keeps the board, the week and the runway; this lets her produce a
 * first draft when somebody asks for one, instead of pointing them at a Studio
 * tab. The draft is a STARTING POINT, never something to ship unread, and it is
 * filed on the calendar as `drafting` with no date — nothing she writes can
 * post itself.
 *
 * The whole point is grounding. A generic "write me a LinkedIn post" is what
 * every bot does and what nobody trusts. This one is handed the studio's
 * VERIFIED research — the passages whose quotes were confirmed to appear in the
 * page they cite — plus the real case studies on the site, and it is told to
 * cite only those, copying each URL exactly. The citations are then rendered
 * from our own verified set rather than trusted from the model, so a drafted
 * post cannot invent a source or a statistic.
 *
 * Pure and SDK-free: the format detection, the prompt shape, the parsing and the
 * calendar mapping are all testable without calling anything. The `.server`
 * companion does the fetch + the model call.
 */

import { BRAND_VOICE_SYSTEM_POLICY } from './brandVoice'
import { CapturedDraft, draftDocIdForMessage } from './ideaCapture'
import type { ResearchCitation } from './marquetaCitations'
import { citationsForPrompt } from './marquetaCitations'

export type GenerationFormat = 'outline' | 'script' | 'post' | 'email'

export const GENERATION_FORMATS: GenerationFormat[] = ['outline', 'script', 'post', 'email']

/** What a person calls each one, for confirmations and headers. */
export const FORMAT_LABEL: Record<GenerationFormat, string> = {
  outline: 'outline',
  script: 'script',
  post: 'social post',
  email: 'outreach email',
}

/** Which calendar content type a drafted format lands as. */
export function contentTypeForFormat(format: GenerationFormat): string {
  switch (format) {
    case 'outline':
      return 'article'
    case 'script':
      return 'video'
    case 'post':
      return 'socialPost'
    case 'email':
      return 'email'
  }
}

/**
 * The format phrases she recognises, longest first.
 *
 * Longest-first matters: "social post" and "video script" must win over the bare
 * "post"/"script" they contain, or "social post about X" would be read as a post
 * about "social post about X".
 */
const FORMAT_PHRASES: { phrase: string; format: GenerationFormat }[] = [
  { phrase: 'outreach email', format: 'email' },
  { phrase: 'cold email', format: 'email' },
  { phrase: 'social post', format: 'post' },
  { phrase: 'linkedin post', format: 'post' },
  { phrase: 'instagram post', format: 'post' },
  { phrase: 'video script', format: 'script' },
  { phrase: 'blog outline', format: 'outline' },
  { phrase: 'article outline', format: 'outline' },
  { phrase: 'outline', format: 'outline' },
  { phrase: 'script', format: 'script' },
  { phrase: 'carousel', format: 'post' },
  { phrase: 'caption', format: 'post' },
  { phrase: 'post', format: 'post' },
  { phrase: 'email', format: 'email' },
  { phrase: 'vsl', format: 'script' },
]

const isWordChar = (character: string) => /[a-z0-9]/.test(character || '')

/** Does the text begin with this phrase as a whole word (not a prefix of one)? */
function startsWithPhrase(lower: string, phrase: string): boolean {
  if (!lower.startsWith(phrase)) return false
  const after = lower[phrase.length] || ''
  return !isWordChar(after)
}

/**
 * Is this message asking Marqueta to DRAFT something, and if so, what and about?
 *
 * The grammar is `draft <format>: <topic>`, and the colon is required.
 *
 *     draft outline: remote cardiac trials   -> generation
 *     draft email: why sponsors stall        -> generation
 *     outline the Q4 story                   -> NOT generation, this is call prep
 *     draft an email to Jane at MGB          -> NOT generation, this is call prep
 *
 * The colon is not decoration. Call prep already owns the bare verbs — `outline
 * …`, `script …`, `draft an email to <person>` — and a message can only mean one
 * of the two. Prep never requires a colon, so requiring one here makes the split
 * total: every trigger phrase reaches exactly one handler, and nothing either
 * feature answers is silently swallowed by the other.
 *
 * This runs BEFORE prep, because several of prep's own patterns would otherwise
 * match the colon forms first (`^draft\s+email\b`, `^…script\b`). Generation is
 * the narrower rule, so it gets the first look and yields everything else.
 * `tests/marqueta-trigger-collision.test.ts` pins both directions.
 *
 * Anchored at the start, so "I'll write a post later" mid-sentence is not an
 * instruction. Returns an empty topic when the format is clear but the subject
 * is not ("draft outline:"), so the caller can ask what it should be about
 * rather than draft something about nothing.
 */
export function detectGenerationRequest(
  rawText: string,
): { format: GenerationFormat; topic: string } | null {
  const text = String(rawText || '').trim()
  if (!text) return null

  const working = text
    // Politeness openers, then "can you" — either may precede the verb.
    .replace(/^(please|hey|hi|ok|okay)\b[\s,]*/i, '')
    .replace(/^(can|could|would|will)\s+you\s+/i, '')
    .trim()

  // The verb is required, and it is only "draft". "write me a post: x" is not
  // generation — "write" is prep's, and one verb is easier to remember than five.
  const verb = /^draft\s+(?:me\s+|us\s+)?(?:a\s+|an\s+|the\s+)?/i.exec(working)
  if (!verb) return null

  const after = working.slice(verb[0].length)
  const lower = after.toLowerCase()
  const match = FORMAT_PHRASES.find((candidate) => startsWithPhrase(lower, candidate.phrase))
  if (!match) return null

  // The discriminator. Without the colon this is prep's message, not hers.
  const rest = after.slice(match.phrase.length)
  const colon = /^\s*:/.exec(rest)
  if (!colon) return null

  return { format: match.format, topic: rest.slice(colon[0].length).trim() }
}

/**
 * Every phrase that reaches generation, for the collision test and the help text.
 * Kept beside the detector so a new format cannot be added without appearing here.
 */
export const GENERATION_TRIGGER_EXAMPLES: string[] = GENERATION_FORMATS.map(
  (format) => `draft ${format}: <topic>`,
)

/** A topic longer than this is a paste, not a subject. */
export const MAX_TOPIC_LENGTH = 400

/**
 * A topic as typed, reduced to something safe to put in a prompt.
 *
 * Control characters go first: they carry no meaning a person intended, and a
 * raw one reaching a file makes git treat the whole thing as binary — which is
 * how the escape sequences in this very expression once ended up stored as the
 * literal bytes they describe, leaving the route undiffable. The character
 * class is written with escapes deliberately; `tests/no-control-bytes.test.ts`
 * fails if a literal ever creeps back into the tree.
 *
 * Lives here rather than in the route so it can be tested at all: a Next route
 * module may only export its handlers and config.
 */
export function sanitizeTopic(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TOPIC_LENGTH)
}

/* ---------------------------------------------------------------------------
 * The model's output: one shape per format, parsed into a common draft.
 * ------------------------------------------------------------------------- */

export type GeneratedContent = {
  format: GenerationFormat
  title: string
  /** The whole draft as copy-ready text — shown in Slack and stored as the draft. */
  body: string
  /** Email only: the subject line, surfaced separately. */
  subject?: string
}

/** The JSON shape the model is asked to return, per format. Prompt-facing. */
export function outputContractForFormat(format: GenerationFormat): Record<string, unknown> {
  if (format === 'outline') {
    return {
      title: 'Working title',
      angle: 'One sentence on the argument or hook',
      sections: [{ heading: 'Section heading', points: ['A line on what this section covers'] }],
      callToAction: 'The single next step for the reader',
    }
  }
  if (format === 'script') {
    return {
      title: 'Working title',
      hook: 'The first 1-2 spoken lines that earn attention',
      beats: [{ label: 'Beat name', body: 'What is said in this beat, spoken not written' }],
      close: 'The spoken close and call to action',
    }
  }
  if (format === 'post') {
    return {
      title: 'Internal label for this post',
      caption: 'The post caption, ready to publish',
      frames: [{ title: 'Optional frame/slide title', body: 'Frame text' }],
      hashtags: ['relevantHashtag'],
      callToAction: 'The action the post asks for',
    }
  }
  return {
    subject: 'Email subject line',
    greeting: 'Hi <first name>,',
    body: ['One paragraph per array item — lead with their news, then a small concrete offer'],
    signoff: '— Juhan, GoInvo',
  }
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString).filter(Boolean) : []

/** A tiny, SDK-free JSON extractor, so this module never pulls the Anthropic SDK. */
export function extractJsonObject<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null
  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

/**
 * Turn the model's JSON into one readable draft.
 *
 * Assembled here rather than by the model so the SAME text is what a person
 * reads in Slack and what gets stored on the calendar — no second rendering to
 * drift from the first. Returns null when there is nothing usable, so a garbled
 * response becomes an honest "I could not draft that" rather than an empty card.
 */
export function parseGeneration(format: GenerationFormat, text: string): GeneratedContent | null {
  const parsed = extractJsonObject(text)
  if (!parsed) return null

  if (format === 'outline') {
    const title = asString(parsed.title)
    const angle = asString(parsed.angle)
    const sections = Array.isArray(parsed.sections) ? parsed.sections : []
    const lines: string[] = []
    if (angle) lines.push(`*Angle:* ${angle}`, '')
    for (const raw of sections) {
      const section = (raw || {}) as Record<string, unknown>
      const heading = asString(section.heading)
      if (!heading) continue
      lines.push(`*${heading}*`)
      for (const point of asStringArray(section.points)) lines.push(`• ${point}`)
      lines.push('')
    }
    const cta = asString(parsed.callToAction)
    if (cta) lines.push(`*Call to action:* ${cta}`)
    const body = lines.join('\n').trim()
    if (!title && !body) return null
    return { format, title: title || 'Outline', body }
  }

  if (format === 'script') {
    const title = asString(parsed.title)
    const hook = asString(parsed.hook)
    const beats = Array.isArray(parsed.beats) ? parsed.beats : []
    const lines: string[] = []
    if (hook) lines.push(`*Hook:* ${hook}`, '')
    for (const raw of beats) {
      const beat = (raw || {}) as Record<string, unknown>
      const label = asString(beat.label)
      const bodyText = asString(beat.body)
      if (!bodyText) continue
      lines.push(label ? `*${label}*` : '', bodyText, '')
    }
    const close = asString(parsed.close)
    if (close) lines.push(`*Close:* ${close}`)
    const body = lines.filter((line, index) => !(line === '' && lines[index - 1] === '')).join('\n').trim()
    if (!title && !body) return null
    return { format, title: title || 'Script', body }
  }

  if (format === 'post') {
    const title = asString(parsed.title)
    const caption = asString(parsed.caption)
    const frames = Array.isArray(parsed.frames) ? parsed.frames : []
    const lines: string[] = []
    if (caption) lines.push(caption, '')
    frames.forEach((raw, index) => {
      const frame = (raw || {}) as Record<string, unknown>
      const frameTitle = asString(frame.title)
      const frameBody = asString(frame.body)
      if (!frameBody && !frameTitle) return
      lines.push(`*Frame ${index + 1}${frameTitle ? `: ${frameTitle}` : ''}*`)
      if (frameBody) lines.push(frameBody)
      lines.push('')
    })
    const hashtags = asStringArray(parsed.hashtags).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    if (hashtags.length) lines.push(hashtags.join(' '))
    const cta = asString(parsed.callToAction)
    if (cta) lines.push('', cta)
    const body = lines.join('\n').trim()
    if (!title && !body) return null
    return { format, title: title || caption.slice(0, 60) || 'Social post', body }
  }

  // email
  const subject = asString(parsed.subject)
  const greeting = asString(parsed.greeting)
  const paragraphs = asStringArray(parsed.body)
  const signoff = asString(parsed.signoff)
  const lines: string[] = []
  if (greeting) lines.push(greeting, '')
  lines.push(...paragraphs.flatMap((p) => [p, '']))
  if (signoff) lines.push(signoff)
  const body = lines.join('\n').trim()
  if (!subject && !body) return null
  return { format, title: subject || 'Outreach email', body, subject }
}

/* ---------------------------------------------------------------------------
 * The prompt.
 * ------------------------------------------------------------------------- */

export const GENERATION_SYSTEM = [
  'You draft first-pass marketing content for GoInvo, a Boston healthcare design studio:',
  'clinical software, human factors for regulated products, data visualisation, and open-source',
  'health work. GoInvo ships things — the voice is "we made this and here is what we learned",',
  'not "we offer capabilities".',
  '',
  'GROUNDING IS THE WHOLE POINT. You are given verifiedResearch (passages already confirmed to',
  'appear in the page they cite) and siteReferences (real GoInvo case studies and essays). Build',
  'the draft on those.',
  '- Do not invent a statistic, date, client name, or outcome that is not in verifiedResearch.',
  '- When you lean on a research signal, refer to the organisation by name so a reader can tie it',
  '  to the source shown beneath your draft. Do not paste URLs into the copy — the sources are',
  '  rendered separately from the verified set.',
  '- If the grounding does not support a claim, do not make it. A smaller true draft beats a',
  '  bigger one that cites nothing.',
  '',
  'This is a STARTING POINT a designer will edit, never something to send unread. Keep it tight.',
  'Reply with ONLY a JSON object in the shape of outputContract.',
].join('\n')

export function buildGenerationUserMessage(input: {
  format: GenerationFormat
  topic: string
  citations: ResearchCitation[]
  siteReferences: { title: string; url?: string; summary?: string }[]
  brandVoice?: {
    name?: string
    guidance?: string | null
    do?: string[]
    avoid?: string[]
    examples?: string[]
  } | null
}): string {
  return JSON.stringify({
    task: `Draft a ${FORMAT_LABEL[input.format]} about the topic below, grounded in the supplied research and site references.`,
    format: input.format,
    topic: input.topic,
    verifiedResearch: citationsForPrompt(input.citations),
    siteReferences: input.siteReferences.slice(0, 12),
    ...(input.brandVoice
      ? { approvedBrandVoice: input.brandVoice, brandVoicePolicy: BRAND_VOICE_SYSTEM_POLICY }
      : {}),
    outputContract: outputContractForFormat(input.format),
    policy: {
      onlyCiteVerifiedResearch: true,
      copyNoUrlsIntoTheCopy: true,
      doNotInventFactsOutsideVerifiedResearch: true,
      draftIsAStartingPointNotFinal: true,
    },
  })
}

/* ---------------------------------------------------------------------------
 * Storing what she drafted.
 * ------------------------------------------------------------------------- */

/**
 * The calendar entry for a generated draft.
 *
 * Deliberately the SAME shape and the SAME deterministic id as a draft Marqueta
 * catches in the channel (`draftDocIdForMessage`), so the existing "Not for the
 * calendar" button and its discard handler work on it unchanged — one message,
 * one calendar item, one way to bin it. `status: 'drafting'`, `autoPublish:
 * false`: a first draft being filed, never a decision to publish it.
 *
 * The verified sources are appended to the brief, not dropped, so whoever opens
 * it in the Studio can still see what it was grounded in.
 */
export function generatedToCalendarDraft(input: {
  generated: GeneratedContent
  channel: string
  ts: string
  personName: string
  topic: string
  permalink?: string
  sources?: ResearchCitation[]
}): CapturedDraft {
  const briefParts = [
    `Drafted by Marqueta for ${input.personName || 'someone'} in Slack, on request.`,
    input.topic ? `Topic: ${input.topic}.` : '',
    input.permalink || '',
  ].filter(Boolean)

  const verified = (input.sources || []).filter((source) => source.verified)
  if (verified.length) {
    briefParts.push(
      `Grounded in: ${verified.map((source) => `${source.organization} (${source.sourceUrl})`).join('; ')}.`,
    )
  }

  return {
    _id: draftDocIdForMessage({ channel: input.channel, ts: input.ts }),
    _type: 'marketingCalendarItem',
    title: input.generated.title.slice(0, 120) || `${FORMAT_LABEL[input.generated.format]} from Slack`,
    status: 'drafting',
    contentType: contentTypeForFormat(input.generated.format),
    contentDraft: input.generated.body,
    brief: briefParts.join(' '),
    autoPublish: false,
  }
}

/**
 * Split a long draft into Slack-section-sized chunks.
 *
 * A Slack section's text tops out at 3000 characters and a longer one is
 * rejected, so a full script has to be broken up. Split on blank lines so a
 * chunk never lands mid-sentence, and only hard-cut a single oversized
 * paragraph as a last resort.
 */
export function chunkForSlack(text: string, max = 2900): string[] {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  if (trimmed.length <= max) return [trimmed]

  const chunks: string[] = []
  let current = ''
  for (const paragraph of trimmed.split(/\n{2,}/)) {
    const block = paragraph.trim()
    if (!block) continue
    if (block.length > max) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      for (let at = 0; at < block.length; at += max) chunks.push(block.slice(at, at + max))
      continue
    }
    if ((current ? current.length + 2 : 0) + block.length > max) {
      if (current) chunks.push(current)
      current = block
    } else {
      current = current ? `${current}\n\n${block}` : block
    }
  }
  if (current) chunks.push(current)
  return chunks
}
