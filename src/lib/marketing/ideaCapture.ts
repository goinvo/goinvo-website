/**
 * Catching ideas before they scroll away.
 *
 * Projects get floated in Slack and then lost — "we should do a reel about the
 * intern work" is a real plan for about forty minutes. Marqueta already sits in
 * the marketing channel, so she can notice one and put it on the board.
 *
 * The rule is the same one the rest of the suite is built on: a detector
 * PROPOSES, a person confirms. Everything this suite has got wrong came from
 * inferring a fact and storing it as though somebody had said it — a warm
 * network that did not exist, twenty-three tasks that looked claimed. So a
 * captured idea is marked as needing review, it says where it came from, and
 * binning it is one press.
 *
 * The filter is deliberately CONSERVATIVE and deliberately not a model. Missing
 * an idea costs nothing — it is still in the channel, and somebody can say it
 * again. Capturing chatter costs the board's credibility, and a board people
 * stop trusting is worse than no board. It is also pure and free, which means
 * it runs on every message without a per-message API bill.
 */

/** Someone proposing something. The whole filter turns on these. */
const PROPOSAL_MARKERS = [
  'we should',
  'we could',
  'we ought',
  'we need to',
  'we have to',
  'should we',
  'could we',
  'can we',
  'shall we',
  'what if',
  'how about',
  "why don't we",
  'why not',
  "let's",
  'lets ',
  'idea:',
  'idea -',
  'proposal:',
  'suggestion:',
  'thought:',
  'worth doing',
  'worth trying',
  'would be good to',
  'would be nice to',
  "i'd like to",
  'i want to',
  'i think we',
  'someone should',
  'we might',
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

/** What is left after Slack's markup and links — the part a human actually typed. */
export function messageProse(text: string): string {
  return String(text || '')
    .replace(URL_PATTERN, ' ')
    .replace(SLACK_MENTION_PATTERN, ' ')
    .replace(/[*_~`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type CaptureVerdict = {
  capture: boolean
  /** Why, in the words a person would use. Logged, and useful when tuning. */
  reason: string
}

/**
 * Is this message somebody proposing work?
 *
 * Every rejection is a deliberate one: the cost of a false positive (a board
 * full of chatter) is much higher than a false negative (a message that is
 * still sitting in the channel).
 */
export function looksLikeAnIdea(text: string): CaptureVerdict {
  const prose = messageProse(text)
  const lower = prose.toLowerCase()

  if (prose.length < MIN_MEANINGFUL_LENGTH) {
    return { capture: false, reason: 'too short to be a plan' }
  }

  // A dropped link with a word or two around it is sharing, not proposing.
  const links = String(text || '').match(URL_PATTERN) || []
  if (links.length > 0 && prose.length < 60) {
    return { capture: false, reason: 'a shared link, not a proposal' }
  }

  if (AVAILABILITY_MARKERS.some((marker) => lower.includes(marker))) {
    return { capture: false, reason: 'about availability, which has its own path' }
  }

  if (STATUS_QUESTION_MARKERS.some((marker) => lower.includes(marker))) {
    return { capture: false, reason: 'asking about existing work, not proposing new work' }
  }

  const marker = PROPOSAL_MARKERS.find((candidate) => lower.includes(candidate))
  if (!marker) {
    return { capture: false, reason: 'nobody is proposing anything' }
  }

  return { capture: true, reason: `proposal phrasing: "${marker.trim()}"` }
}

/**
 * A title from the sentence that carried the proposal.
 *
 * Not the first sentence — the first sentence is often throat-clearing ("hey
 * all, quick one"). The sentence with the marker in it is the idea.
 */
export function ideaTitleFrom(text: string, maxLength = 90): string {
  const prose = messageProse(text)
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(Boolean)
  const lower = prose.toLowerCase()
  const marker = PROPOSAL_MARKERS.find((candidate) => lower.includes(candidate))

  const carrying =
    (marker && sentences.find((sentence) => sentence.toLowerCase().includes(marker))) || sentences[0] || prose

  const trimmed = carrying.trim().replace(/[.!?]+$/, '')
  if (trimmed.length <= maxLength) return trimmed || 'Idea from Slack'

  // Cut on a word boundary; a title ending mid-word reads as a bug.
  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

/** Cheap category guess. Undefined when unsure — a wrong label is worse than none. */
export function ideaCategoryFrom(text: string): string | undefined {
  const lower = messageProse(text).toLowerCase()
  const table: Array<[string, string[]]> = [
    ['content', ['reel', 'video', 'post', 'article', 'blog', 'newsletter', 'case study', 'writeup', 'write-up']],
    ['seo', ['seo', 'keyword', 'search console', 'ranking', 'backlink']],
    ['measurement', ['analytics', 'ga4', 'measure', 'track', 'conversion rate', 'dashboard']],
    ['growth', ['funnel', 'campaign', 'lead', 'outreach', 'pipeline', 'email list', 'subscriber']],
    ['product', ['feature', 'product', 'shop', 'poster', 'print']],
    ['technical', ['refactor', 'migrate', 'api', 'bug', 'performance', 'deploy']],
    ['process', ['process', 'workflow', 'cadence', 'weekly', 'checklist', 'roadmap']],
  ]
  for (const [category, needles] of table) {
    if (needles.some((needle) => lower.includes(needle))) return category
  }
  return undefined
}

/**
 * Deterministic id, so Slack's retries cannot create the same idea twice.
 *
 * Slack redelivers an event it thinks failed, and a channel that fills with
 * duplicates of one message is exactly how a helpful bot becomes a muted one.
 */
export function ideaDocIdForMessage(input: { channel: string; ts: string }): string {
  const key = `${input.channel}-${input.ts}`.replace(/[^a-zA-Z0-9-]/g, '-')
  return `marketingIdea.slack-${key}`
}

/** A Slack permalink, so the idea always points back at the conversation. */
export function slackPermalink(input: { workspace?: string; channel: string; ts: string }): string | undefined {
  const workspace = input.workspace || process.env.SLACK_WORKSPACE_DOMAIN
  if (!workspace || !input.channel || !input.ts) return undefined
  return `https://${workspace}.slack.com/archives/${input.channel}/p${input.ts.replace('.', '')}`
}

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
  return {
    _id: ideaDocIdForMessage({ channel: input.channel, ts: input.ts }),
    _type: 'marketingIdea',
    title: ideaTitleFrom(input.text),
    // The whole message, because the title is a summary and summaries lose the
    // caveat that made the idea worth having.
    summary: messageProse(input.text),
    status: 'idea',
    category: ideaCategoryFrom(input.text),
    source: `Slack — ${input.personName || 'someone'}, not yet reviewed`,
    relatedUrl: permalink,
    needsReview: true,
  }
}
