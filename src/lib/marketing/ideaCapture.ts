/**
 * Catching what gets floated in the marketing channel before it scrolls away.
 *
 * Projects get proposed in Slack and then lost — "what about custom patches for
 * Arlington Town Day" is a real plan for about forty minutes. Marqueta sits in
 * the channel, so she can put it somewhere before it goes.
 *
 * The rule is the same one the rest of the suite is built on: a detector
 * PROPOSES, a person confirms. Everything this suite has got wrong came from
 * inferring a fact and storing it as though somebody had said it — a warm
 * network that did not exist, twenty-three tasks that looked claimed. So
 * anything caught here is marked as needing review, it says where it came from,
 * and binning it is one press.
 *
 * TWO KINDS, because they belong in different places:
 *
 *   idea   somebody proposing work        → marketingIdea, the board
 *   draft  somebody sharing written work  → marketingCalendarItem, the calendar
 *
 * That distinction was learned the hard way. Juhan posted a finished newsletter
 * draft and the filter looked for proposal phrasing, found none, and dropped
 * it — when the right answer was not "this is an idea" but "this is content,
 * put it on the calendar with the copy attached".
 *
 * Pure and free, deliberately not a model: it runs on every message with no
 * per-message bill and nothing to go wrong at 3am.
 */

/**
 * Someone proposing something.
 *
 * Widened after Marqueta missed a real message on 2026-08-27: "What about:"
 * over a bulleted list of merch ideas is about as clear a proposal as exists,
 * and it matched nothing. The first list was written from imagination rather
 * than from how people actually talk in this channel.
 */
const PROPOSAL_MARKERS = [
  'we should',
  'we could',
  'we can',
  'we ought',
  'we need to',
  'we have to',
  'we might',
  'should we',
  'could we',
  'can we',
  'shall we',
  'what if',
  'what about',
  'how about',
  'thinking about',
  'thinking we',
  "why don't we",
  'why not',
  "let's",
  'lets ',
  'idea:',
  'idea -',
  'ideas or',
  'any other ideas',
  'proposal:',
  'suggestion:',
  'thought:',
  'worth doing',
  'worth trying',
  'worth a try',
  'would be good to',
  'would be nice to',
  'would be a good',
  'might be a good',
  'could be a good',
  "i'd like to",
  'i want to',
  'i think we',
  'someone should',
  // Proposal by assertion: "custom patches and stickers are good, inexpensive
  // experiments!" proposes doing them without ever asking.
  'inexpensive experiment',
  'cheap experiment',
  'good experiment',
  'easy experiment',
  'quick win',
  'low effort',
]

/**
 * Somebody sharing written work, not proposing it.
 *
 * A draft is further along than an idea and belongs on the calendar with the
 * copy attached — filing it as an "idea" loses the actual writing, which is the
 * only part that took any effort.
 */
const DRAFT_MARKERS = [
  "here's a draft",
  'here is a draft',
  "here's the draft",
  'heres a draft',
  'a draft:',
  'draft:',
  'first pass',
  'rough cut',
  'rough draft',
  'next newsletter is',
  'newsletter is for',
  'next post is',
  'copy for',
  'wrote this',
  'wrote up',
]

/**
 * Phrasing that looks like a proposal but is asking about existing work.
 *
 * "Should we still do the reel?" is a question about something already on the
 * board, not a new idea, and capturing it creates a duplicate of the thing
 * being asked about.
 */
const STATUS_QUESTION_MARKERS = [
  'any update',
  "what's the status",
  'whats the status',
  'where is the',
  "where's the",
  'did you',
  'have you',
  'when is',
  'when are',
  'is it done',
  'still doing',
  'still on',
]

/** Availability has its own path, and it is not an idea. */
const AVAILABILITY_MARKERS = ['away', 'out sick', 'on holiday', 'vacation', 'pto', "i'm back", 'im back', 'ooo']

/** Below this, there is not enough to put on a board. */
const MIN_MEANINGFUL_LENGTH = 25

const URL_PATTERN = /https?:\/\/\S+/g
const SLACK_MENTION_PATTERN = /<[@#!][^>]+>/g

/** Slack's link form `<url|label>` — keep the label, drop the plumbing. */
function unwrapSlackLinks(text: string): string {
  return String(text || '').replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
}

/** What is left after Slack's markup and links — the part a human actually typed. */
export function messageProse(text: string): string {
  return unwrapSlackLinks(text)
    .replace(URL_PATTERN, ' ')
    .replace(SLACK_MENTION_PATTERN, ' ')
    .replace(/[*_~`>]/g, ' ')
    .replace(/[•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The bullet lines in a message, if it is a list. */
export function bulletsIn(text: string): string[] {
  return unwrapSlackLinks(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*•·]\s+/.test(line))
    .map((line) => line.replace(/^[-*•·]\s+/, '').trim())
    .filter(Boolean)
}

/** The quoted block in a message — how people paste copy into Slack. */
export function quotedBlockIn(text: string): string {
  const lines = String(text || '').split('\n')
  const quoted = lines.filter((line) => line.trim().startsWith('>'))
  if (quoted.length < 2) return ''
  return quoted
    .map((line) => line.replace(/^\s*>\s?/, ''))
    .join('\n')
    .trim()
}

export type CaptureKind = 'idea' | 'draft' | 'none'

export type CaptureVerdict = {
  kind: CaptureKind
  capture: boolean
  /** Why, in the words a person would use. Logged, and useful when tuning. */
  reason: string
  marker?: string
}

/**
 * What kind of thing is this message?
 *
 * Drafts are checked FIRST. "Next newsletter is for TheBlanding.com, here's a
 * draft" also contains no proposal phrasing at all, but the more important
 * point is that even when a message reads as both, the finished writing is the
 * more valuable thing to keep and the calendar is where it belongs.
 */
export function classifyMessage(text: string): CaptureVerdict {
  const prose = messageProse(text)
  const lower = prose.toLowerCase()

  if (prose.length < MIN_MEANINGFUL_LENGTH) {
    return { kind: 'none', capture: false, reason: 'too short to be a plan' }
  }

  if (AVAILABILITY_MARKERS.some((marker) => lower.includes(marker))) {
    return { kind: 'none', capture: false, reason: 'about availability, which has its own path' }
  }

  const draftMarker = DRAFT_MARKERS.find((candidate) => lower.includes(candidate))
  // A draft marker alone is not enough — "wrote this" in passing is not a
  // draft. There has to be something that looks like the writing itself.
  if (draftMarker && (quotedBlockIn(text) || prose.length > 220)) {
    return { kind: 'draft', capture: true, reason: `looks like written work: "${draftMarker}"`, marker: draftMarker }
  }

  if (STATUS_QUESTION_MARKERS.some((marker) => lower.includes(marker))) {
    return { kind: 'none', capture: false, reason: 'asking about existing work, not proposing new work' }
  }

  // A dropped link with a word or two around it is sharing, not proposing.
  const links = unwrapSlackLinks(text).match(URL_PATTERN) || []
  if (links.length > 0 && prose.length < 60) {
    return { kind: 'none', capture: false, reason: 'a shared link, not a proposal' }
  }

  const marker = PROPOSAL_MARKERS.find((candidate) => lower.includes(candidate))
  if (!marker) {
    return { kind: 'none', capture: false, reason: 'nobody is proposing anything' }
  }

  return { kind: 'idea', capture: true, reason: `proposal phrasing: "${marker.trim()}"`, marker }
}

/** Kept for the existing call sites: "is this an idea" is now one kind of yes. */
export function looksLikeAnIdea(text: string): { capture: boolean; reason: string } {
  const verdict = classifyMessage(text)
  return { capture: verdict.kind === 'idea', reason: verdict.reason }
}

/**
 * A title from the sentence that carried the proposal.
 *
 * A bulleted list gets its lead-in plus what it is about, because the bullets
 * ARE the idea and a title made of the first bullet hides the other two. "What
 * about: custom printed patch of Kindness is Power…" tells a reader nothing;
 * "What about custom merch — 3 ideas" tells them what they are looking at.
 */
export function ideaTitleFrom(text: string, maxLength = 90): string {
  const bullets = bulletsIn(text)
  if (bullets.length > 1) {
    const lead = messageProse(unwrapSlackLinks(text).split('\n')[0] || '').replace(/[:\-–—]\s*$/, '')
    // The trailing "… for Arlington Town Day" line is the context that makes
    // the list mean something, so it goes in the title rather than the body.
    const tail = unwrapSlackLinks(text)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('...') || line.startsWith('…'))
      .map((line) => line.replace(/^[.…]+\s*/, ''))[0]
    // Joined with an ellipsis, because the lead is usually a bare opener:
    // "What about" + "for Arlington Town Day" runs together into nonsense,
    // while "What about … for Arlington Town Day" reads as what was said.
    const parts = tail ? `${lead || 'Ideas'} … ${tail}` : lead || 'Ideas'
    return truncate(`${parts} (${bullets.length} ideas)`, maxLength)
  }

  const prose = messageProse(text)
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(Boolean)
  const lower = prose.toLowerCase()
  const marker = PROPOSAL_MARKERS.find((candidate) => lower.includes(candidate))

  const carrying =
    (marker && sentences.find((sentence) => sentence.toLowerCase().includes(marker))) || sentences[0] || prose

  const trimmed = carrying.trim().replace(/[.!?]+$/, '')
  return truncate(trimmed, maxLength) || 'Idea from Slack'
}

/**
 * A title for a shared draft.
 *
 * The first line almost always names the thing — "Next newsletter is for
 * TheBlanding.com" — so it is used verbatim rather than paraphrased.
 */
export function draftTitleFrom(text: string, maxLength = 90): string {
  const firstLine = messageProse(unwrapSlackLinks(text).split('\n')[0] || '')
  const cleaned = firstLine.replace(/[.!?:]+$/, '').trim()
  if (cleaned.length >= 8) return truncate(cleaned, maxLength)
  return truncate(messageProse(text), maxLength) || 'Draft from Slack'
}

/**
 * The writing itself, separated from the "here's a draft" preamble.
 *
 * The quoted block when there is one, because that is how people paste copy
 * into Slack; otherwise everything after the line that announced it.
 */
export function draftBodyFrom(text: string): string {
  const quoted = quotedBlockIn(text)
  if (quoted) return quoted

  const lines = unwrapSlackLinks(text).split('\n')
  const announceAt = lines.findIndex((line) => DRAFT_MARKERS.some((marker) => line.toLowerCase().includes(marker)))
  const body = lines
    .slice(announceAt + 1)
    .join('\n')
    .trim()
  return body || unwrapSlackLinks(text).trim()
}

/** What kind of calendar entry a draft is, when the message says so. */
export function draftContentTypeFrom(text: string): string {
  const lower = messageProse(text).toLowerCase()
  const table: Array<[string, string[]]> = [
    ['newsletter', ['newsletter']],
    ['email', ['email', 'mailer']],
    ['reel', ['reel']],
    ['socialPost', ['linkedin', 'instagram', 'social post', 'tweet']],
    ['article', ['article', 'blog', 'post about', 'essay']],
    ['caseStudy', ['case study']],
  ]
  for (const [type, needles] of table) {
    if (needles.some((needle) => lower.includes(needle))) return type
  }
  return 'other'
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.45 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

/** Cheap category guess. Undefined when unsure — a wrong label is worse than none. */
export function ideaCategoryFrom(text: string): string | undefined {
  const lower = messageProse(text).toLowerCase()
  const table: Array<[string, string[]]> = [
    ['product', ['patch', 'sticker', 'tattoo', 'decal', 'tshirt', 't-shirt', 'merch', 'shop', 'poster', 'print']],
    ['content', ['reel', 'video', 'article', 'blog', 'newsletter', 'case study', 'writeup', 'write-up']],
    ['seo', ['seo', 'keyword', 'search console', 'ranking', 'backlink']],
    ['measurement', ['analytics', 'ga4', 'measure', 'conversion rate', 'dashboard']],
    ['growth', ['funnel', 'campaign', 'lead', 'outreach', 'pipeline', 'email list', 'subscriber']],
    ['technical', ['refactor', 'migrate', 'api', 'bug', 'performance', 'deploy']],
    ['process', ['process', 'workflow', 'cadence', 'checklist', 'roadmap']],
  ]
  for (const [category, needles] of table) {
    if (needles.some((needle) => lower.includes(needle))) return category
  }
  return undefined
}

/**
 * Deterministic id, so Slack's retries cannot create the same thing twice.
 *
 * Slack redelivers an event it thinks failed, and a channel that fills with
 * duplicates of one message is exactly how a helpful bot becomes a muted one.
 */
export function ideaDocIdForMessage(input: { channel: string; ts: string }): string {
  const key = `${input.channel}-${input.ts}`.replace(/[^a-zA-Z0-9-]/g, '-')
  return `marketingIdea.slack-${key}`
}

export function draftDocIdForMessage(input: { channel: string; ts: string }): string {
  const key = `${input.channel}-${input.ts}`.replace(/[^a-zA-Z0-9-]/g, '-')
  return `marketingCalendarItem.slack-${key}`
}

/** A Slack permalink, so what was caught always points back at the conversation. */
export function slackPermalink(input: { workspace?: string; channel: string; ts: string }): string | undefined {
  const workspace = input.workspace || process.env.SLACK_WORKSPACE_DOMAIN
  if (!workspace || !input.channel || !input.ts) return undefined
  return `https://${workspace}.slack.com/archives/${input.channel}/p${input.ts.replace('.', '')}`
}

/**
 * How long after a message a follow-up counts as the same thought.
 *
 * Juhan's merch post was four messages in one burst: the list, an aside about
 * t-shirts, "any other ideas?", and "patches and stickers are good, inexpensive
 * experiments". That is ONE idea. Four board entries for one thought is exactly
 * the noise that makes a board worth ignoring.
 */
export const BURST_WINDOW_MINUTES = 12

export type CapturedIdea = {
  _id: string
  _type: 'marketingIdea'
  title: string
  summary: string
  status: string
  category?: string
  source: string
  relatedUrl?: string
  needsReview: boolean
}

export type CapturedDraft = {
  _id: string
  _type: 'marketingCalendarItem'
  title: string
  status: string
  contentType: string
  contentDraft: string
  brief: string
  autoPublish: boolean
}

/**
 * The document for a message somebody floated.
 *
 * `needsReview` is what keeps this honest. Without it a guess by a filter looks
 * exactly like an idea a person entered deliberately, and the board stops
 * meaning anything.
 */
export function buildCapturedIdea(input: {
  text: string
  personName: string
  channel: string
  ts: string
  workspace?: string
}): CapturedIdea {
  const permalink = slackPermalink({ workspace: input.workspace, channel: input.channel, ts: input.ts })
  const bullets = bulletsIn(input.text)
  return {
    _id: ideaDocIdForMessage({ channel: input.channel, ts: input.ts }),
    _type: 'marketingIdea',
    title: ideaTitleFrom(input.text),
    // The whole message, because the title is a summary and summaries lose the
    // caveat that made the idea worth having. Bullets keep their shape: three
    // merch ideas run together into a paragraph stop being three ideas.
    summary: bullets.length > 1 ? bullets.map((bullet) => `• ${bullet}`).join('\n') : messageProse(input.text),
    status: 'idea',
    category: ideaCategoryFrom(input.text),
    source: `Slack — ${input.personName || 'someone'}, not yet reviewed`,
    relatedUrl: permalink,
    needsReview: true,
  }
}

/**
 * The calendar entry for a draft somebody shared.
 *
 * `status: 'drafting'` and `autoPublish: false`: this is somebody's writing
 * being filed, not a decision to publish it. Nothing Marqueta catches may ever
 * post itself.
 */
export function buildCapturedDraft(input: {
  text: string
  personName: string
  channel: string
  ts: string
  workspace?: string
}): CapturedDraft {
  const permalink = slackPermalink({ workspace: input.workspace, channel: input.channel, ts: input.ts })
  return {
    _id: draftDocIdForMessage({ channel: input.channel, ts: input.ts }),
    _type: 'marketingCalendarItem',
    title: draftTitleFrom(input.text),
    status: 'drafting',
    contentType: draftContentTypeFrom(input.text),
    contentDraft: draftBodyFrom(input.text),
    brief: [`Drafted by ${input.personName || 'someone'} in Slack.`, permalink].filter(Boolean).join(' '),
    autoPublish: false,
  }
}
