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
 * So there are three ways in, and all of them are EXPLICIT — no guessing
 * involved:
 *
 *   @-mention             in any channel she is in (her real bot mention)
 *   "Marqueta, …"         her name as the first word, followed by a comma or colon
 *   a direct message      to her
 *
 * The name form exists because the mention is not something people can type:
 * she posts as the website-chat app under a per-message name, so "@Marqueta"
 * typed by hand is plain text that never reaches her as a mention. Without it,
 * the only way to talk to her in a channel is to know an app name nobody has
 * heard of.
 *
 * When she is addressed she answers, including in a channel where she is
 * otherwise silent. Being asked a question is not noise.
 *
 * Deliberately deterministic — no model call. Every answer here is a lookup or
 * a write she already knows how to do, so it costs nothing per message and
 * cannot invent a runway figure or a task that does not exist.
 *
 * Callers hand this module text Slack has ALREADY decoded (`decodeSlackText`):
 * "AT&amp;T" must arrive here as "AT&T" or it matches nothing. Nothing in here
 * decodes a second time, because decoding twice is not harmless — a quote
 * saying "<5% … >3%" would be read as a Slack link and eaten.
 */

import { classifyMessage } from './ideaCapture'
import { clipSlackText, escapeSlackText } from './slackText'

export type MarquetaIntent =
  | { kind: 'week' }
  | { kind: 'runway' }
  | { kind: 'ideas' }
  | { kind: 'heartbeat' }
  | { kind: 'capture'; text: string; explicit: boolean }
  | { kind: 'availability'; text: string }
  | { kind: 'help' }
  /**
   * "Prep Jane Doe at Acme". `target` is who it is for, with the command words
   * already taken off ("Jane Doe at Acme") — it is what goes to
   * `parsePrepRequest`. `text` is the whole request as typed (her name
   * stripped), for the record.
   *
   * Why not hand the parser `text` and let it strip the command words itself:
   * it did, and the two lists of command words drifted. This module learned
   * "prepping for", "write a call script for", "help us prepare for" and
   * "draft a quick message to"; the parser did not, so "prepping for Priya
   * Patel" reached the resolver as a person called "prepping for Priya Patel",
   * matched nobody on file, and the reply offered to add THAT person to
   * outreach. Now the words this module recognised are exactly the words it
   * takes off, and the parser only ever sees the "who".
   */
  | { kind: 'prep'; text: string; target: string; format: 'call' | 'email' }
  | { kind: 'prepList' }
  /**
   * "Called Jane at Acme, left a voicemail". `text` is the whole message — it
   * is what happened, so it is the note and what the outcome is guessed from
   * (up to 2,000 characters, which is all the log form holds).
   * `target` is only the part naming WHO, with the verb, the time and the
   * outcome clause removed, ready for `parsePrepRequest`: that parser knows
   * "prep" and "brief me on" but not "called" or "left … a voicemail", and fed
   * the whole message it reads "called Jane" as somebody's name. `target` is ''
   * when the message names nobody ("left a voicemail") — ask who, never guess.
   */
  | { kind: 'logCall'; text: string; target: string }
  | { kind: 'strategy' }
  | { kind: 'pipeline' }
  | { kind: 'mine' }

/**
 * Slack wraps a mention as <@U…>; strip it so the rest parses as plain text.
 *
 * Kept exactly as it was for the existing call site. New code wants
 * `stripAddress`, which also removes "Marqueta," and keeps line breaks.
 */
export function stripMention(text: string, botUserId?: string): string {
  const pattern = botUserId ? new RegExp(`<@${botUserId}>`, 'g') : /<@[A-Z0-9]+>/g
  return String(text || '')
    .replace(pattern, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Her mention in either form Slack sends: `<@U123>`, or the older `<@U123|name>`. */
const mentionOf = (botUserId: string, flags = '') =>
  new RegExp(`<@${escapeRegExp(botUserId)}(?:\\|[^>]*)?>`, flags)

/**
 * Her name at the very start, as a way of speaking to her.
 *
 * "Marqueta, prep Jane" and "Marqueta: what's on?" are addressed to her;
 * "Marqueta caught two ideas" is somebody talking ABOUT her, and answering it
 * would be the fastest way to get muted in a channel people work in. So the
 * bare name needs the comma or colon (or to be the whole message), while a
 * typed "@Marqueta" is deliberate enough on its own. A greeting in front
 * ("hey Marqueta,") does not change which of those it is.
 *
 * Start only. A name mid-sentence is almost always a mention in passing.
 */
const NAME_ADDRESS = /^\s*(?:(?:hey|hi|hello|hiya|ok|okay|yo)[\s,!]+)?(?:@marqueta\b(?![’'])|marqueta\s*(?:[,:!?]|$))/i

/**
 * Was she actually addressed, rather than merely present?
 *
 * Works on the RAW event text or on decoded text. The mention rule needs the
 * raw form (or text decoded with her name supplied): `decodeSlackText` without
 * names drops an unnamed mention, and with it the only evidence she was spoken
 * to. The name rule works on either, and without knowing her bot id.
 */
export function addressesMarqueta(text: string, botUserId: string | undefined): boolean {
  const value = String(text || '')
  if (botUserId && mentionOf(botUserId).test(value)) return true
  return NAME_ADDRESS.test(value)
}

const LEADING_EMOJI = /^(?::[a-z0-9_+'-]+:\s*)+/i
const LEADING_PUNCTUATION = /^(?:[\s,;.!?—–-]+|:(?=\s|$)\s*)+/
const LEADING_GREETING = /^(?:hey|hi|hello|hiya|ok|okay|yo)(?=[\s,!:.]|$)[\s,!:.]*/i
const LEADING_NAME = /^@?marqueta\b(?![’'])[\s,:;.!?—–-]*/i

/**
 * The address people put in front of a request: her name, a greeting, and the
 * punctuation a stripped mention leaves behind ("hey <@U…>, prep Jane" →
 * "hey , prep Jane"). Nothing after the first real word is touched.
 *
 * The bare name is stripped even without a comma. In a DM "Marqueta prep Jane"
 * is plainly addressed to her, and whether she answers at all was decided by
 * `addressesMarqueta` before this ran.
 */
function stripLeadingAddress(text: string): string {
  let current = String(text || '').trim()
  for (let guard = 0; guard < 6; guard += 1) {
    const next = current
      .replace(LEADING_PUNCTUATION, '')
      .replace(LEADING_EMOJI, '')
      .replace(LEADING_GREETING, '')
      .replace(LEADING_NAME, '')
      .trim()
    if (next === current) break
    current = next
  }
  return current
}

/**
 * The request with the way she was addressed taken off: her mention wherever
 * it is, and a leading "Marqueta," / "@Marqueta" / "hey Marqueta:".
 *
 * Line breaks survive, unlike `stripMention`: a bulleted list sent to her with
 * "capture" in front IS the idea, and flattening it into one line turns three
 * merch ideas into a paragraph.
 *
 * Without a bot id every user mention is removed, matching `stripMention` —
 * better to lose a colleague's mention than to parse her own as a word.
 */
export function stripAddress(text: string, botUserId?: string): string {
  const mentions = botUserId ? mentionOf(botUserId, 'g') : /<@[A-Z0-9]+(?:\|[^>]*)?>/g
  const withoutMention = String(text || '')
    .replace(mentions, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
  return stripLeadingAddress(withoutMention)
}

/**
 * The prefix as a whole word or phrase. Punctuation may follow it — people end
 * "what's on?" with a question mark — but a hyphen or a letter may not, so
 * "note-taking" is not the "note" command and "what's one thing" is not
 * "what's on".
 */
const startsWithAny = (value: string, prefixes: string[]) =>
  prefixes.find((prefix) => value.startsWith(prefix) && /^(?:$|[\s:?!.,])/.test(value.slice(prefix.length)))

const mentionsAny = (value: string, words: string[]) =>
  words.some((word) => new RegExp(`\\b${word}\\b`).test(value))

const matchesAny = (value: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(value))

// ── How much of a message the patterns read ──────────────────────────────────

/**
 * Slack allows 40,000 characters in a message, and anybody in the workspace
 * can DM her. Several patterns below have to look past a run of whitespace to
 * see what follows it ("left … a voicemail", "Jane — no answer", "great
 * … thanks"), and over a long enough run that look is quadratic: "left"
 * followed by 39,000 line breaks took 43 seconds to read. Slack retries an
 * event it has not had a 200 for, up to three times, so one message could
 * hold the function for minutes.
 *
 * So the patterns read a FLATTENED copy: every run of whitespace becomes one
 * character, and only the first 2,000 characters are read. No command she
 * knows is longer than a line, and the log form holds 2,000 characters of
 * notes, so nothing she could act on is lost. A run that held a line break
 * becomes a line break rather than a space, because a new line still ends a
 * thought: "called Jane at Acme" on one line and "no answer" on the next is a
 * person and then what happened, not somebody at "Acme no answer".
 *
 * What she RETURNS is still what was typed. A captured idea keeps its bullets
 * and its full length — a newsletter draft sent to her IS the copy.
 */
const MATCH_LIMIT = 2000

/** Shorten typed text without leaving half an emoji at the end. */
function clipTyped(value: string, max: number): string {
  if (value.length <= max) return value
  const cut = /[\uD800-\uDBFF]/.test(value.charAt(max - 1)) ? max - 1 : max
  return value.slice(0, cut).trimEnd()
}

function flattenForMatching(text: string): string {
  return clipTyped(
    text.replace(/\s+/g, (run) => (run.includes('\n') ? '\n' : ' ')),
    MATCH_LIMIT,
  ).trim()
}

/** Slack on a phone sends "what’s on" with a curly apostrophe; every phrase here is written with a straight one. */
const straighten = (value: string) => value.replace(/[‘’]/g, "'")

/**
 * The same tail of `flat` as `piece` is of `plain` — i.e. the words as typed,
 * curly apostrophes and all. `plain` is `flat` straightened, so the two are
 * the same length and a tail of one is a tail of the other.
 */
const asTyped = (piece: string, plain: string, flat: string) =>
  piece && plain.endsWith(piece) ? flat.slice(flat.length - piece.length) : piece

// ── Prep: "get me ready to call somebody" ────────────────────────────────────

/**
 * Softeners in front of an instruction. "Can you prep Jane" is the same request
 * as "prep Jane"; so is "I need you to prep Jane" and "help me prep Jane".
 * Stripped one at a time, so "could you please" works as well as either alone.
 */
const POLITE_PREFIXES: RegExp[] = [
  /^(?:can|could|would|will) you\s+/i,
  /^(?:please|pls|plz|kindly)\b[\s,]*/i,
  /^i(?:'d|’d| would)? (?:need|want|like)(?: you)? to\s+/i,
  /^help (?:me|us)(?: to)?\s+/i,
]

/**
 * The verbs that make a message a request for call prep.
 *
 * ONLY at the start (after a softener), because the same words appear inside
 * proposals: "we should prep a script for payers" is an idea for the board, not
 * a request to prepare a call with somebody called "a script for payers".
 * Checked before the softeners are stripped, so "help me call Jane" is found
 * as itself rather than reduced to "call Jane", which is not a prep verb.
 */
const PREP_VERBS: { pattern: RegExp; format: 'call' | 'email' }[] = [
  {
    pattern:
      /^(?:draft|write)(?:\s+(?:me|us))?\s+(?:an?\s+)?(?:(?:first|intro|cold|follow[- ]up|quick|short)\s+)?(?:email|e-mail|note|message)\b/i,
    format: 'email',
  },
  { pattern: /^(?:an?\s+)?(?:email|e-mail)\s+draft\b/i, format: 'email' },
  { pattern: /^(?:call|phone|meeting)\s+prep(?:aration)?\b/i, format: 'call' },
  { pattern: /^help\s+(?:me|us)\s+(?:call|ring|phone|reach|get\s+ready|prepare|prep)\b/i, format: 'call' },
  { pattern: /^get\s+(?:me|us)\s+ready\b/i, format: 'call' },
  { pattern: /^prep(?:are|ping)?\b/i, format: 'call' },
  { pattern: /^outline\b/i, format: 'call' },
  { pattern: /^brief\s+(?:me|us)\b/i, format: 'call' },
  { pattern: /^(?:(?:write|draft)(?:\s+(?:me|us))?\s+(?:an?\s+)?(?:call\s+)?|call\s+)?script\b/i, format: 'call' },
]

/** "prep an email to Jane" asks for the email, even though the verb was "prep". */
const EMAIL_OBJECT = /^(?:(?:me|us)\s+)?(?:an?\s+)?(?:(?:first|intro|cold|follow[- ]up|quick|short)\s+)?(?:email|e-mail)\b/i

/**
 * Asking for the list rather than for one person. Anywhere in the message,
 * because these are questions and a question can be phrased around them —
 * "so who should I call today?".
 */
const PREP_LIST_QUESTIONS: RegExp[] = [
  /\bwho\s+(?:should|do|can|could|shall|must|will)\s+(?:i|we)\s+(?:call|ring|phone|contact|reach\s+out\s+to|be\s+calling)\b/i,
  /\bwho(?:'s|’s|s|\s+is)\s+(?:on\s+)?(?:my|our|the)\s+call(?:ing)?\s+list\b/i,
  /\b(?:my|our)\s+call(?:ing)?\s+list\b/i,
  /\bwho(?:'s|’s|s|\s+is)\s+next\s+to\s+call\b/i,
]

/**
 * The same, as an opener. Start only: "my calls went fine" in the middle of a
 * message is somebody reporting, not asking.
 */
const PREP_LIST_OPENERS: RegExp[] = [
  /^(?:(?:show|list|give)\s+(?:me\s+)?|what\s+are\s+|which\s+are\s+)?(?:all\s+)?(?:my|our)\s+(?:[\w-]+\s+)?calls\b/i,
  /^(?:what|which)\s+calls\b/i,
  /^calls\s+(?:for\s+)?(?:this\s+week|today|tomorrow|next\s+week)\b/i,
]

/** After a prep verb: "prep my calls", "get me ready for this week's calls", "prep my list". */
const PREP_LIST_OBJECT =
  /^(?:(?:me|us)\s+)?(?:for\s+)?(?:(?:all\s+)?(?:my|our|this\s+week['’]?s|today['’]?s|tomorrow['’]?s|next\s+week['’]?s|the\s+week['’]?s)\s+(?:[\w-]+\s+)?)?(?:calls\b|(?:call(?:ing)?\s+)?list\b)/i

/**
 * The prep verb was a noun: "prep was great", "outline looks good, thanks".
 * Answering with a call outline for somebody named "was great" is the kind of
 * reply that makes people stop talking to a bot.
 */
const VERB_WAS_A_NOUN: RegExp[] = [
  /^(?:is|was|were|looks?|looked|seems?|seemed|sounds?|sounded|worked|helped|went)\b/i,
  // A compliment is only a compliment when it is ALL that follows —
  // "prep Great Plains Health" names an organisation.
  /^(?:great|good|perfect|thanks|thank\s+you|ty)\s*[!.,]*(?:\s*(?:thanks|thank\s+you|ty)\s*[!.]*)?$/i,
]

/** Only a time, which says WHEN the calls are, not who: "prep me for tomorrow". */
const ONLY_A_TIME =
  /^(?:(?:for|on)\s+)?(?:today|tomorrow|tonight|this\s+(?:week|morning|afternoon)|next\s+week|(?:mon|tues|wednes|thurs|fri)day)\s*[?.!]*$/i

/**
 * One of her own topics: "brief me on the runway" wants the runway, "brief me
 * on my tasks" wants the tasks. Only when the topic IS the object — "prep
 * outreach to Jane" still names somebody.
 */
const OWN_TOPIC =
  /^(?:(?:the|our|my|this|this\s+week['’]?s|this\s+month['’]?s|the\s+week['’]?s)\s+)?(?:week|plan|runway|money|finances|budget|strategy|pipeline|outreach|board|ideas|tasks|todos?|list|priorities|scoreboard|numbers|posture|direction|heartbeat|tick)\b(?:\s+(?:for\s+)?(?:this|next|last)\s+(?:week|month)|\s+today|\s+so\s+far)?\s*[?.!]*$/i

/**
 * A thing to prepare, not a person to call: "prepare the newsletter",
 * "prep the booth for Town Day". Filing either as a call outline would be
 * confidently wrong, and a wrong answer delivered confidently is worse than
 * the help text. The determiner is required: without it "prep Emily Post"
 * would lose a person to the word "post".
 */
const A_THING_NOT_A_PERSON =
  /^(?:the|a|an|our|my|this|next|that)\s+(?:[a-z]+\s+)?(?:newsletter|post|posts|reel|reels|article|blog|deck|slides|report|agenda|campaign|content|copy|video|poster|posters|sticker|stickers|merch|booth|event|website|page|site|launch|workshop|webinar|talk|presentation|pitch|pitches)\b/i

/** Take "me for", "a call with", "an email to" off the front of what follows a prep verb. */
function prepObjectOf(rest: string): string {
  return rest
    .replace(/^[\s:,;—–-]+/, '')
    .replace(/^(?:(?:me|us)\s+)?(?:(?:for|on|about|to|with|re)\b\s*)?/i, '')
    .replace(
      /^(?:(?:a|an|the|my|our)\s+)?(?:(?:cold|first|intro|quick|follow[- ]up|phone|discovery|sales)\s+)?(?:call|chat|meeting|conversation)\b(?:\s+(?:with|to|for|at)\b)?\s*/i,
      '',
    )
    // Only with the preposition, so "prep Pitch Health" keeps the company.
    .replace(/^(?:(?:a|an|the|my|our)\s+)?(?:pitch|intro|introduction|follow[- ]?up)\s+(?:with|to|for|at)\b\s*/i, '')
    .replace(/^(?:an?\s+)?(?:(?:first|intro|cold|follow[- ]up|quick|short)\s+)?(?:email|e-mail|note|message)\b(?:\s+(?:to|for)\b)?\s*/i, '')
    .replace(/^(?:for|on|about|to|with|re)\b\s*/i, '')
    .trim()
}

/**
 * The person inside an object that names the KIND of contact first: "outreach
 * to Jane", "calling Jane at MGB".
 *
 * A separate step from `prepObjectOf` because "outreach" is also one of her
 * topics. "Brief me on outreach for this week" is a question about the
 * numbers, and it has to be recognised as one while the object still reads
 * "outreach for this week" — take "outreach for" off first and all that is
 * left is "this week", which looks like somebody asking for the call list.
 *
 * "calling" is lowercase only, like the parser's own rule, so a company that
 * starts with the word keeps it.
 */
function prepTargetOf(object: string): string {
  return object
    .replace(/^(?:(?:my|our|the|some|an?)\s+)?(?:outreach|reach[- ]?out)\s+(?:to|with|for)\b\s*/i, '')
    .replace(/^(?:calling|ringing|phoning|e-?mailing|reaching\s+out\s+to)\s+/, '')
    .trim()
}

type PrepVerdict = MarquetaIntent | 'notPrep'

/**
 * Is this a request to get ready for a call — and if so, for one person or the
 * whole list? `'notPrep'` sends the message on down the ladder unchanged.
 *
 * `plain` is what is matched (flattened and straightened), `flat` the same
 * text as typed, and `typed` what is returned as `text`.
 */
function detectPrep(plain: string, flat: string, typed: string): PrepVerdict {
  if (matchesAny(plain, PREP_LIST_QUESTIONS)) return { kind: 'prepList' }

  let current = plain
  for (let guard = 0; guard < 6; guard += 1) {
    if (matchesAny(current, PREP_LIST_OPENERS)) return { kind: 'prepList' }

    const verb = PREP_VERBS.map((candidate) => ({ ...candidate, match: candidate.pattern.exec(current) })).find(
      (candidate) => candidate.match,
    )
    if (verb?.match) {
      const rest = current.slice(verb.match[0].length).replace(/^[\s,:;—–-]+/, '').trim()
      if (matchesAny(rest, VERB_WAS_A_NOUN)) return 'notPrep'
      if (PREP_LIST_OBJECT.test(rest)) return { kind: 'prepList' }

      const object = prepObjectOf(rest)
      // "prep" on its own, or "get me ready for tomorrow": somebody about to
      // make calls who has not said to whom. The list is the useful answer,
      // and it ends by showing how to ask for one person.
      if (!object || ONLY_A_TIME.test(object)) return { kind: 'prepList' }
      if (OWN_TOPIC.test(object) || A_THING_NOT_A_PERSON.test(object)) return 'notPrep'

      const target = prepTargetOf(object)
      if (!target || ONLY_A_TIME.test(target)) return { kind: 'prepList' }
      if (A_THING_NOT_A_PERSON.test(target)) return 'notPrep'

      const format = verb.format === 'email' || EMAIL_OBJECT.test(rest) ? 'email' : 'call'
      return {
        kind: 'prep',
        text: typed,
        // A line break after the name starts the requester's note ("Jane at
        // Acme" / "met her at HIMSS"); the dash is how the parser knows.
        target: asTyped(target, plain, flat).replace(/\n/g, ' — '),
        format,
      }
    }

    const softener = POLITE_PREFIXES.find((pattern) => pattern.test(current))
    if (!softener) break
    current = current.replace(softener, '').trim()
  }
  return 'notPrep'
}

// ── Logging a call: "I called Jane, no answer" ───────────────────────────────

/**
 * First-person past tense at the start: somebody reporting a touch they made.
 * Start only, for the same reason as prep — "what if we emailed everyone who
 * downloaded the kit" is a proposal that happens to contain "emailed".
 *
 * Two forms carry the person INSIDE the phrase ("left Jane a voicemail",
 * "sent Jane an email"); those are captured by name and tried first. The
 * captured name stops at punctuation and at a line break, so "left the office,
 * called Jane, left her a message" cannot swallow half a sentence as
 * somebody's name.
 */
const LOG_SUBJECT = String.raw`(?:(?:i|we)(?:['’]ve|\s+have)?\s+)?(?:(?:just|also|finally|already|then)\s+)?`
const LOG_OPENER = new RegExp(
  '^' +
    LOG_SUBJECT +
    '(?:' +
    [
      String.raw`left\s+(?<leftFor>[^,;.!?—–\n]{1,60}?)\s+an?\s+(?:voicemail|voice\s+mail|vm|message)\b`,
      String.raw`sent\s+(?<sentTo>[^,;.!?—–\n]{1,60}?)\s+an?\s+(?:email|e-mail|note)\b`,
      String.raw`left\s+(?:an?\s+)?(?:voicemail|voice\s+mail|vm|message)(?:\s+(?:for|with|to)\b)?`,
      String.raw`sent\s+(?:an?\s+)?(?:email|e-mail|note)\s+to\b`,
      String.raw`(?:called|phoned|rang|e-?mailed)\b`,
      String.raw`(?:spoke|talked|chatted)\s+(?:to|with)\b`,
      String.raw`(?:met|caught\s+up)\s+with\b`,
      String.raw`reached\s+out\s+to\b`,
      String.raw`heard\s+back\s+from\b`,
      String.raw`got\s+(?:through\s+to|hold\s+of|an?\s+(?:reply|response)\s+from)\b`,
      String.raw`had\s+(?:a|an|my|our|the)\s+(?:[\w-]+\s+)?(?:call|chat|meeting|conversation)\s+with\b`,
      String.raw`no\s+(?:answer|reply|response)\s+from\b`,
      String.raw`tried\s+(?:calling|to\s+call|to\s+reach|reaching|emailing|to\s+email)\b`,
    ].join('|') +
    ')',
  'i',
)

/** "Called in sick" is availability, not a call. "Called it" and "called off" are neither. */
const CALLED_IN_SICK = new RegExp('^' + LOG_SUBJECT + String.raw`called\s+(?:in|out)\s+sick\b`, 'i')
const CALLED_NOT_A_CALL = new RegExp('^' + LOG_SUBJECT + String.raw`called\s+(?:it|off|in)\b`, 'i')

/**
 * Where the "who" ends and "what happened" begins. The outcome clause is the
 * note — it stays in `text` — but left in the target it pollutes the name:
 * "Jane Doe at Acme, no answer" would look for an organisation called
 * "Acme, no answer". Only clause starters people actually use, so a comma
 * inside "Jane Doe, CMIO at Acme" is left alone. A line break always ends it.
 *
 * Unanchored, so it is only ever run over flattened text (one character per
 * whitespace run): over a raw run of line breaks each `\s*` would rescan the
 * run from every position in it.
 */
const LOG_CLAUSE_BREAK = new RegExp(
  [
    String.raw`\n`,
    String.raw`\s*[—–]`,
    String.raw`\s+-{1,2}\s`,
    String.raw`\s*[;!?]`,
    String.raw`\s*:\s`,
    String.raw`,\s*(?=(?:no|not|nobody|left|she|he|they|we|i|it|went|got|was|were|is|are|said|says|wants|want|asked|will|would|booked|interested|keen|busy|voicemail|vm|follow|following|call|calling|send|sent|and|but|so|then|re|about|regarding|seems|sounds|great|good|meeting|out|back|maybe|might|looks)\b)`,
    String.raw`\s+(?:about|re|regarding)\s`,
    String.raw`\s+(?:and|but|so|then)\s+(?=(?:left|she|he|they|it|we|i|got|went|no|nobody|booked|set|sent|emailed|will)\b)`,
  ].join('|'),
  'i',
)

/** When it happened is not who it was with. */
const PAST_TIME =
  /\b(?:yesterday(?:\s+(?:morning|afternoon|evening))?|earlier(?:\s+today)?|just\s+now|today|this\s+(?:morning|afternoon|evening)|last\s+(?:week|night|(?:mon|tues|wednes|thurs|fri|satur|sun)day)|on\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/gi

/** A pronoun names nobody she can look up. */
const ONLY_A_PRONOUN = /^(?:her|him|them|they|she|he|back)$/i

function logTargetOf(value: string): string {
  let target = String(value || '')
  const cut = LOG_CLAUSE_BREAK.exec(target)
  if (cut) target = target.slice(0, cut.index)
  target = target
    .replace(PAST_TIME, ' ')
    .replace(/\s+back\s*$/i, '')
    .replace(/^[\s,.;:!?—–-]+|[\s,.;:!?—–-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return ONLY_A_PRONOUN.test(target) ? '' : target
}

/**
 * "log a call with Jane", "log: called Jane, no answer", "log that I emailed
 * Sam". Every button she posts says "Log how it went", so people will type it.
 * "log" followed by anything else is not a call and falls through.
 */
const LOG_COMMAND = /^log\b(?:\s+(?:it|this|that)\b)?\s*[:,-]?\s*/i
const LOG_OBJECT = /^(?:(?:a|an|my|the)\s+)?(?:call|touch|voicemail|vm|chat|meeting|email)\b(?:\s+(?:with|to|for)\b)?/i

/**
 * `plain` is what is matched (flattened, curly apostrophes straightened);
 * `flat` is the same text as typed, and where the target is cut from. The two
 * are the same length, so an index into one is an index into the other.
 * `typed` is what is returned as `text`.
 */
function detectLogCall(plain: string, flat: string, typed: string): MarquetaIntent | null {
  const command = LOG_COMMAND.exec(plain)
  const offset = command ? command[0].length : 0
  if (command) {
    const object = LOG_OBJECT.exec(plain.slice(offset))
    if (object) {
      return { kind: 'logCall', text: typed, target: logTargetOf(flat.slice(offset + object[0].length)) }
    }
  }

  const rest = plain.slice(offset)
  if (CALLED_NOT_A_CALL.test(rest)) return null
  const match = LOG_OPENER.exec(rest)
  if (!match) return null
  const named = match.groups?.leftFor || match.groups?.sentTo
  const target = logTargetOf(named ?? flat.slice(offset + match[0].length))
  return { kind: 'logCall', text: typed, target }
}

// ── Availability ─────────────────────────────────────────────────────────────

const TIME_OFF = /\b(away|out sick|holiday|vacation|pto|ooo|i['’]?m back|back on)\b/i

/**
 * Phrases that contain an availability word without being about anybody's time
 * off. This matters more than any other misreading, because availability is
 * the one path that WRITES on the strength of a keyword: "what's our holiday
 * campaign strategy?" used to mark the person asking as away from today, and
 * "are we back on track?" as back.
 */
const NOT_ABOUT_TIME_OFF: RegExp[] = [
  /\bback on track\b/gi,
  /\b(?:give|gives|giving|gave|throw|throws|throwing|threw|put|putting|right|far|take|taking|took|stay|staying|straight|fade|fading|faded)\s+away\b/gi,
  /\b(?:holiday|vacation)s?\s+(?:campaign|post|posts|newsletter|card|cards|sale|sales|season|party|content|email|emails|merch|special|theme|strategy|plan|promo|promotion|gift|gifts|mailer|video|reel)\b/gi,
]

function mentionsTimeOff(text: string): boolean {
  const scrubbed = NOT_ABOUT_TIME_OFF.reduce((value, pattern) => value.replace(pattern, ' '), text)
  return TIME_OFF.test(scrubbed)
}

// ── Questions ────────────────────────────────────────────────────────────────

const MINE: RegExp[] = [
  /\bmy\s+(?:tasks?|list|plate|jobs?|to-?dos?)\b/i,
  /\bwhat(?:'s|’s|s|\s+is)\s+mine\b/i,
  /^mine\b/i,
  /\bwhat\s+am\s+i\s+(?:on|doing|working\s+on)\b/i,
  /\bon\s+my\s+plate\b/i,
  /\bassigned\s+to\s+me\b/i,
]

const HOW_ARE_WE_DOING = /\bhow(?:['’]re|\s+are)?\s+we\s+(?:doing|going|tracking)\b/i

/**
 * What is being asked of her.
 *
 * Order matters, and each step earns its place:
 *
 * 1. An explicit "capture this" beats everything. When somebody tells her to
 *    put something on the board, her opinion about whether it sounds like a
 *    proposal is not wanted.
 * 2. Call prep, and the call list — but only as an instruction at the start
 *    ("prep Jane", "can you prep Jane"). The same verbs sit inside proposals
 *    ("we should prep a script for payers") and those belong on the board.
 * 3. A logged call — first-person past tense at the start. Before availability,
 *    because a report of a call routinely mentions somebody else's time off
 *    ("called Jane, she's away until October") and that must not mark the
 *    person reporting it as away.
 * 4. Availability, which has a parser of its own that only claims text it is
 *    sure of.
 * 5. A proposal, through the shared classifier, so there is one definition of
 *    "this is an idea" rather than a second subtly different one for messages
 *    sent directly to her. Before the questions, so "we should review the
 *    board every week" is filed as the idea it is instead of answered as a
 *    question about the board.
 * 6. A question, recognised by its keywords ANYWHERE rather than only at the
 *    start — people write "how is the runway looking?", not "runway":
 *    mine → week → runway → strategy → pipeline → ideas → heartbeat → help.
 *    "Mine" first, because "what's on my plate" opens like "what's on" (the
 *    week) but asks about one person. The bare word "week" is weaker than a
 *    named topic, so "how's outreach this week?" gets the outreach numbers
 *    rather than the task list; "plan" and "what's on" still mean the week.
 */
export function parseMarquetaIntent(rawText: string): MarquetaIntent {
  const text = stripLeadingAddress(String(rawText || ''))
  // Matching happens on a flattened, clipped, straightened copy (see
  // MATCH_LIMIT); what is returned is what the person typed.
  const flat = flattenForMatching(text)
  const plain = straighten(flat)
  const lower = plain.toLowerCase()
  const typed = clipTyped(text, MATCH_LIMIT)

  const capturePrefix = startsWithAny(lower, ['capture', 'note', 'idea', 'remember', 'add'])
  if (capturePrefix) {
    const body = text
      .slice(capturePrefix.length)
      .replace(/^[\s:,-]+/, '')
      // "capture this: do a reel" files the reel, not "this: do a reel".
      .replace(/^(?:this|that)\s*[:—–-]\s*/i, '')
      .trim()
    // "capture" on its own is somebody starting a sentence they have not
    // finished; answering with help beats filing an empty idea.
    if (body.length >= 8) return { kind: 'capture', text: body, explicit: true }
    return { kind: 'help' }
  }

  const prep = detectPrep(plain, flat, typed)
  if (prep !== 'notPrep') return prep

  if (CALLED_IN_SICK.test(plain)) return { kind: 'availability', text }
  const logCall = detectLogCall(plain, flat, typed)
  if (logCall) return logCall

  if (mentionsTimeOff(plain)) return { kind: 'availability', text }

  // Anything substantial said directly to her is meant for her. The shared
  // classifier reads the text with its line breaks, because a quoted block is
  // how it tells a draft from a remark.
  if (classifyMessage(straighten(text)).capture) return { kind: 'capture', text, explicit: false }

  if (matchesAny(lower, MINE)) return { kind: 'mine' }

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
  if (asksWhatToDo || mentionsAny(lower, ['plan', 'todo', 'workload'])) return { kind: 'week' }
  if (mentionsAny(lower, ['runway', 'money', 'finances', 'finance', 'financial', 'posture', 'budget', 'cash'])) {
    return { kind: 'runway' }
  }
  if (mentionsAny(lower, ['strategy', 'strategic', 'on track', 'direction', 'priorities'])) return { kind: 'strategy' }
  if (mentionsAny(lower, ['pipeline', 'outreach', 'scoreboard', 'leads'])) return { kind: 'pipeline' }
  if (HOW_ARE_WE_DOING.test(lower)) return { kind: 'strategy' }
  if (mentionsAny(lower, ['week'])) return { kind: 'week' }
  if (mentionsAny(lower, ['ideas', 'board', 'review'])) return { kind: 'ideas' }
  // Asking whether she is still running at all. Worth its own answer:
  // the whole suite spent months built-but-never-fired, and the only
  // way that becomes visible is if somebody can ask.
  if (mentionsAny(lower, ['heartbeat', 'tick', 'schedule', 'cron', 'running', 'alive'])) {
    return { kind: 'heartbeat' }
  }

  return { kind: 'help' }
}

/** A real mention, as `marquetaHandle(botUserId)` returns when it knows her id. */
const WORKING_MENTION = /^<@[UW][A-Z0-9]+>$/

/**
 * What she can actually do, in the words somebody would use to ask.
 *
 * `handle` is `marquetaHandle(botUserId)`. When it is a real mention the help
 * shows it, because that is the one thing people cannot work out for
 * themselves — typing "@Marqueta" produces plain text that never reaches her.
 * Anything else (no id, or the handle's own fallback) gets the two ways in
 * that always work. The examples are fixed copy with no angle brackets:
 * Slack reads `<thing>` as a control sequence and renders it as nothing.
 */
export function marquetaHelpText(handle?: string): string {
  const mention = typeof handle === 'string' && WORKING_MENTION.test(handle.trim()) ? handle.trim() : ''
  const howToAsk = mention
    ? `Mention me (${mention}) in a channel I am in, or DM me, and ask:`
    : 'DM me, or start a message with "Marqueta," in a channel I am in, and ask:'
  return [
    `I keep the marketing board, the week, the runway and the outreach list. ${howToAsk}`,
    '• *prep Sam Rivera at Acme* — a call outline: what to say first, what to ask, what to say if they say no, and an email draft',
    '• *my calls* — who to call or follow up with next, people who replied first',
    '• *called Sam at Acme, left a voicemail* — I log it on their record, or give you a button to',
    '• *my tasks* — what is on your list, with buttons to mark it done',
    '• *week* — what is on this week and what nobody has taken',
    '• *runway* — how long the studio can pay for, the pipeline, and whether it needs re-confirming',
    '• *strategy* — whether the plan still fits the runway and how outreach is going',
    '• *pipeline* — touches logged, meetings and opportunities',
    '• *ideas* — what I have caught that still needs a yes or no',
    '• *tick* — whether my weekly schedule actually ran, and what it did',
    '• *capture …* — put something on the board, whatever it sounds like',
    '• *away next week* — I will note it and stop planning work for you',
    '',
    'I also listen in the channels I am in and quietly catch anything that sounds like a',
    'proposal or a draft, so nothing has to be said twice. I never post there uninvited —',
    'you review what I caught on the This week tab in the Studio.',
  ].join('\n')
}

/**
 * Confirmation for a capture, saying plainly whose judgement it was.
 *
 * The title is escaped: it comes from what somebody typed, which now reaches
 * here decoded, so "AT&T" or "<5% of pilots" would otherwise be read by Slack
 * as markup.
 */
export function captureConfirmation(input: {
  kind: 'idea' | 'draft'
  title: string
  explicit: boolean
}): string {
  const where = input.kind === 'draft' ? 'on the calendar, with the copy attached' : 'on the board'
  const whose = input.explicit
    ? 'Filed because you asked.'
    : 'That is my guess that it was worth keeping — bin it on the This week tab if I read it wrong.'
  const title = clipSlackText(escapeSlackText(input.title), 300) || 'Untitled'
  return `Noted ${where}: *${title}*\n_${whose}_`
}
