/**
 * Talking TO Marqueta, rather than her talking at everyone.
 *
 * She listens silently in the channels where the team works — replaying the
 * filter over 189 real messages showed that a bot replying under its own
 * two-thirds-wrong guesses gets muted within a week. But being unable to answer
 * when somebody addresses her directly is the opposite failure: she holds the
 * plan, the runway and the board, and the person asking has to go and find a
 * Studio tab instead.
 *
 * So there are two ways in, and both are EXPLICIT — no guessing involved:
 *
 *   @Marqueta <something>   in any channel she is in
 *   a direct message        to her
 *
 * When she is addressed she answers, including in a channel where she is
 * otherwise silent. Being asked a question is not noise.
 *
 * Deliberately deterministic — no model call. Every answer here is a lookup or
 * a write she already knows how to do, so it costs nothing per message and
 * cannot invent a runway figure or a task that does not exist.
 */

import { classifyMessage } from './ideaCapture'

export type MarquetaIntent =
  | { kind: 'week' }
  | { kind: 'runway' }
  | { kind: 'ideas' }
  | { kind: 'capture'; text: string; explicit: boolean }
  | { kind: 'availability'; text: string }
  | { kind: 'help' }

/** Slack wraps a mention as <@U…>; strip it so the rest parses as plain text. */
export function stripMention(text: string, botUserId?: string): string {
  const pattern = botUserId ? new RegExp(`<@${botUserId}>`, 'g') : /<@[A-Z0-9]+>/g
  return String(text || '')
    .replace(pattern, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Was she actually addressed, rather than merely present? */
export function addressesMarqueta(text: string, botUserId: string | undefined): boolean {
  if (!botUserId) return false
  return String(text || '').includes(`<@${botUserId}>`)
}

const startsWithAny = (value: string, prefixes: string[]) =>
  prefixes.find((prefix) => value === prefix || value.startsWith(`${prefix} `) || value.startsWith(`${prefix}:`))

const mentionsAny = (value: string, words: string[]) =>
  words.some((word) => new RegExp(`\\b${word}\\b`).test(value))

/**
 * What is being asked of her.
 *
 * Order matters, and each step earns its place:
 *
 * 1. An explicit "capture this" beats everything. When somebody tells her to
 *    put something on the board, her opinion about whether it sounds like a
 *    proposal is not wanted.
 * 2. Availability, which has a parser of its own that only claims text it is
 *    sure of.
 * 3. A question, recognised by its keywords ANYWHERE rather than only at the
 *    start — people write "how is the runway looking?", not "runway". But only
 *    when the message is not itself a proposal, so "we should review the board
 *    every week" is filed as the idea it is instead of answered as a question
 *    about the board.
 * 4. Anything else substantial, through the shared classifier, so there is one
 *    definition of "this is an idea" rather than a second subtly different one
 *    for messages sent directly to her.
 */
export function parseMarquetaIntent(rawText: string): MarquetaIntent {
  const text = String(rawText || '').trim()
  const lower = text.toLowerCase()

  const capturePrefix = startsWithAny(lower, ['capture', 'note', 'idea', 'remember', 'add'])
  if (capturePrefix) {
    const body = text.slice(capturePrefix.length).replace(/^[\s:,-]+/, '').trim()
    // "capture" on its own is somebody starting a sentence they have not
    // finished; answering with help beats filing an empty idea.
    if (body.length >= 8) return { kind: 'capture', text: body, explicit: true }
    return { kind: 'help' }
  }

  if (/\b(away|out sick|holiday|vacation|pto|ooo|i'?m back|back on)\b/i.test(text)) {
    return { kind: 'availability', text }
  }

  const proposes = classifyMessage(text).capture

  if (!proposes) {
    // Keywords, plus the openers people actually type that name nothing at
    // all: "what's on?" is a question about the week even though the word
    // "week" never appears in it.
    const asksWhatToDo = startsWithAny(lower, [
      "what's on",
      'whats on',
      'what should i do',
      "what's next",
      'whats next',
      'what do i do',
    ])
    if (asksWhatToDo || mentionsAny(lower, ['week', 'plan', 'todo', 'workload'])) return { kind: 'week' }
    if (mentionsAny(lower, ['runway', 'money', 'finances', 'posture', 'budget'])) return { kind: 'runway' }
    if (mentionsAny(lower, ['ideas', 'board', 'review'])) return { kind: 'ideas' }
    if (startsWithAny(lower, ['help', 'hi', 'hello', 'hey', 'what can you do'])) return { kind: 'help' }
  }

  // Anything substantial said directly to her is meant for her.
  if (proposes) return { kind: 'capture', text, explicit: false }

  return { kind: 'help' }
}

/** What she can actually do, in the words somebody would use to ask. */
export function marquetaHelpText(): string {
  return [
    'I keep the marketing board, the week, and the runway. Ask me:',
    '• *week* — what is on this week and what nobody has taken',
    '• *runway* — how long the studio can pay for, and whether it needs re-confirming',
    '• *ideas* — what I have caught that still needs a yes or no',
    '• *capture <thing>* — put something on the board, whatever it sounds like',
    '• *away next week* — I will note it and stop planning work for you',
    '',
    'I also listen in the channels I am in and quietly catch anything that sounds like a',
    'proposal or a draft, so nothing has to be said twice. I never post there uninvited —',
    'you review what I caught on the This week tab in the Studio.',
  ].join('\n')
}

/** Confirmation for a capture, saying plainly whose judgement it was. */
export function captureConfirmation(input: {
  kind: 'idea' | 'draft'
  title: string
  explicit: boolean
}): string {
  const where = input.kind === 'draft' ? 'on the calendar, with the copy attached' : 'on the board'
  const whose = input.explicit
    ? 'Filed because you asked.'
    : 'That is my guess that it was worth keeping — bin it on the This week tab if I read it wrong.'
  return `Noted ${where}: *${input.title}*\n_${whose}_`
}
