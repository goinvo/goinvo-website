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
 *   "Marqueta, …"         her name as the first word, followed by a comma or
 *                         colon — or by one of her own commands ("Marqueta prep
 *                         Jane"), because people drop the comma on a phone
 *   a direct message      to her
 *
 * The name form exists because the mention is not something people can type:
 * she posts as the website-chat app under a per-message name, so "@Marqueta"
 * typed by hand is plain text that never reaches her as a mention. Without it,
 * the only way to talk to her in a channel is to know an app name nobody has
 * heard of.
 *
 * When she is addressed she answers, including in a channel where she is
 * otherwise silent. Being asked a question is not noise — but being thanked
 * is not a question, and "thanks!" gets nothing back.
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
import { askMarqueta } from './marquetaStyle'
import { clipSlackText, escapeSlackText } from './slackText'

export type MarquetaIntent =
  /** "thanks!", "ok", "👍": said to her, but nothing to answer. Silence. */
  | { kind: 'ack' }
  /** "hi", "Marqueta?", "are you there": a short hello that ends on their most useful thing. */
  | { kind: 'greeting' }
  | { kind: 'week' }
  | { kind: 'runway' }
  | { kind: 'ideas' }
  | { kind: 'heartbeat' }
  | { kind: 'capture'; text: string; explicit: boolean }
  | { kind: 'availability'; text: string }
  /** `more`: the second page — ideas, capture, and what she listens for. */
  | { kind: 'help'; more?: boolean }
  /**
   * "who's Jane Doe", "status of Jane", "when did we last talk to Jane": one
   * contact, looked up. `otherwise` is set when the name was not typed like a
   * name ("who's got the newsletter", "status of town day merch"): it is what
   * the message would have been without the lookup, and it is answered
   * instead when nobody on file matches — a confident "nobody by that name"
   * to a question about a task is the wrong answer in front of the room.
   */
  | { kind: 'contact'; target: string; otherwise?: TopicIntent | Extract<MarquetaIntent, { kind: 'unknown' }> }
  /**
   * "We signed Acme for 3 months." Money is never written from a sentence —
   * the answer is the runway's own "We signed something…" form. `label` and
   * `months` are what she heard, repeated back so the form is easy to fill.
   */
  | { kind: 'signed'; text: string; label: string; months?: number }
  /**
   * Nothing she knows how to do. `suggestion` is a command the first word
   * looks like a typo of ("runwya" → "runway") — offered, NEVER run: a wrong
   * guess answers a different question in a shared channel. `closest` is a
   * command about the same thing ("revenue" → "pipeline").
   */
  | { kind: 'unknown'; question: boolean; suggestion?: string; closest?: string }
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

/** A question about one of her topics, answered from the records. */
export type TopicIntent = Extract<MarquetaIntent, { kind: 'mine' | 'week' | 'runway' | 'strategy' | 'pipeline' | 'ideas' | 'heartbeat' }>

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
 * The bare name followed by one of HER commands is addressed too — "Marqueta
 * prep Jane", "Marqueta my calls" — because people drop the comma on a phone.
 * The list is closed on purpose: every word on it is something she does, and
 * none is a verb somebody would use to say what she did ("caught", "posted",
 * "said"). "Marqueta caught two ideas" stays unaddressed.
 *
 * Start only. A name mid-sentence is almost always a mention in passing.
 */
const HER_COMMANDS =
  "prep|prepare|brief|outline|script|draft|my|what['’]s|whats|runway|strategy|pipeline|week|ideas|help|capture|called|emailed|away"
const NAME_ADDRESS = new RegExp(
  String.raw`^\s*(?:(?:hey|hi|hello|hiya|ok|okay|yo)[\s,!]+)?(?:@marqueta\b(?![’'])|marqueta\s*(?:[,:!?]|$)|marqueta\s+(?:${HER_COMMANDS})(?![\w’'-]))`,
  'i',
)

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

/** Slack's `:shortcode:` and a phone's pictographs ("hi 👋" is a hello, not a request for "👋"). */
const LEADING_EMOJI = /^(?:(?::[a-z0-9_+'-]+:|\p{Extended_Pictographic}|\uFE0F|\u200D|\p{Emoji_Modifier})\s*)+/iu
const LEADING_PUNCTUATION = /^(?:[\s,;.!?—–-]+|:(?=\s|$)\s*)+/
/**
 * A colon after a greeting is punctuation ("hey: prep Jane"), unless it opens
 * an emoji — "hi :wave:" lost its colon here and left "wave:" to be read as a
 * request.
 */
const LEADING_GREETING = /^(?:hey|hi|hello|hiya|ok|okay|yo)(?=[\s,!:.]|$)(?:[\s,!.]|:(?![a-z0-9_+'-]+:))*/i
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
  return stripLeadingAddress(removeMention(text, botUserId))
}

/**
 * Her mention taken out, and nothing else: a greeting and her name stay, so
 * `parseMarquetaIntent` can still tell "ok" (an acknowledgement — silence)
 * from "ok, prep Jane" (a request). Line breaks survive, as in `stripAddress`.
 * Without a bot id every user mention is removed.
 */
export function removeMention(text: string, botUserId?: string): string {
  const mentions = botUserId ? mentionOf(botUserId, 'g') : /<@[A-Z0-9]+(?:\|[^>]*)?>/g
  return String(text || '')
    .replace(mentions, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
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
  /\bwho\s+do\s+(?:i|we)\s+owe\s+(?:a\s+|an\s+)?(?:call|reply|email|follow[- ]?up)\b/i,
  /\bwhat\s+are\s+(?:my|our)\s+follow[- ]?ups\b/i,
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
  // "follow ups", "my follow-ups" — the list, not "follow up with Jane".
  /^(?:(?:show|list|give)\s+(?:me\s+)?)?(?:all\s+)?(?:my\s+|our\s+|the\s+)?follow[- ]?ups\b/i,
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
 * Sam". The buttons she posts say "Log it…", so people will type it.
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

/**
 * "I'm off Friday", "I'm sick today", "I'll be out until Mon": time off said
 * with the plain words. "Out", "off" and "sick" are too ordinary to route on
 * alone — "I'm out of ideas", "I'm off to call Jane tomorrow" — so they count
 * only as the sender's OWN sentence, at the start, with a day straight after
 * (an "on", "all", "until" or "from" between them at most). Anything looser
 * would reach the one path that writes on the strength of a keyword.
 */
const MONTH_WORD = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*`
const DAY_WORD = String.raw`(?:today|tomorrow|tonight|this\s+(?:week|morning|afternoon|evening)|next\s+week|(?:the\s+)?rest\s+of\s+(?:the|this)\s+week|(?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday|rsday)?|\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?)?\s+${MONTH_WORD}|${MONTH_WORD}\s+\d{1,2}|\d{4}-\d{2}-\d{2})`
const FIRST_PERSON_OFF = new RegExp(
  String.raw`^(?:(?:fyi|btw|heads[- ]up|just so you know|jsyk)[\s,:;.!—–-]+)?(?:i['’]?m|im|i am|i['’]?ll be|ill be|i will be)\s+(?:off|out|sick)\s+(?:(?:on|all|until|till|til|through|from)\s+)?${DAY_WORD}\b`,
  'i',
)

function mentionsTimeOff(text: string): boolean {
  const scrubbed = NOT_ABOUT_TIME_OFF.reduce((value, pattern) => value.replace(pattern, ' '), text)
  return TIME_OFF.test(scrubbed) || FIRST_PERSON_OFF.test(text)
}

// ── Said to her, but nothing to answer ───────────────────────────────────────

/**
 * Words that make up a thank-you, an "ok", or a "nice one". A message made of
 * nothing else — at most five of them — gets silence.
 *
 * Every "thanks!" used to get 1,285 characters of help text back. In a
 * channel people work in, that is exactly the noise a bot gets muted for; in a
 * thread it buries the answer the thanks was for.
 */
const ACK_CORE = new Set([
  'thanks', 'thank', 'thx', 'ty', 'tysm', 'cheers', 'ok', 'okay', 'k', 'kk', 'cool', 'great', 'perfect', 'nice',
  'got', 'noted', 'awesome', 'lovely', 'brilliant', 'sweet', 'good', 'sure', 'yep', 'yup', 'np', 'lol', 'haha', 'ta',
  'excellent', 'amazing', 'wonderful', 'fab', 'fantastic', 'gotcha', 'roger', 'will', 'sounds',
])
/**
 * Words that ride along with a thank-you without changing it. The greetings
 * are here because people say hello to her name before thanking her — "hey
 * Marqueta, thanks!" — and without them that thank-you fell through to the
 * typo check, which read "thanks" as a slip of "tasks" and asked "Did you
 * mean `Marqueta, my tasks`?" in front of the room. A greeting ALONE is still
 * a greeting: a message is an acknowledgement only when one of the core words
 * (or an emoji) is in it.
 */
const ACK_FILLER = new Set([
  'you', 'u', 'so', 'much', 'a', 'lot', 'ton', 'tons', 'bunch', 'heaps', 'very', 'really', 'super', 'it', 'one', 'job',
  'work', 'done', 'again', 'all', 'do', 'that', 'this', 'for', 'the', 'marqueta', 'thats', "that's", 'is', 'too',
  'helps', 'helped', 'helpful',
  'hey', 'hi', 'hello', 'hiya', 'yo',
])
/** A GREETING with an emoji on it is still a greeting — "hi 👋" wants hello back, not silence. */
const ACK_GREETING_WORDS = new Set(['hey', 'hi', 'hello', 'hiya', 'yo'])
const WAVE = /:wave(?::|::skin-tone-\d:)|👋/u
/** "thanks for the help": the phrase, not the command. "ok help" still asks for help. */
const FOR_THE_HELP = /\bfor (?:(?:all )?(?:the|your) )?help\b/g

/** Slack's `:shortcode:` emoji and the pictographs a phone sends. */
const EMOJI = /:[a-z0-9_+'-]+:|\p{Extended_Pictographic}|️|‍|\p{Emoji_Modifier}/gu

/**
 * "thanks!", "ok", "great, thank you", "👍", "Marqueta, cheers", "hey
 * Marqueta, thanks!", "hey 👍": nothing to answer. Works on the text with or
 * without her address on it.
 */
export function isAcknowledgement(text: string): boolean {
  const value = straighten(String(text || ''))
    .replace(/<@[A-Z0-9]+(?:\|[^>]*)?>/gi, ' ')
    .toLowerCase()
  const hadEmoji = new RegExp(EMOJI.source, 'u').test(value)
  const words = value
    .replace(EMOJI, ' ')
    .replace(/@?marqueta\b/g, ' ')
    .replace(FOR_THE_HELP, ' ')
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
  if (!words.length) return hadEmoji
  if (words.length > 5) return false
  if (!words.every((word) => ACK_CORE.has(word) || ACK_FILLER.has(word))) return false
  if (words.some((word) => ACK_CORE.has(word))) return true
  // Only filler left: "hey 👍" is a thumbs-up, "hi 👋" is a hello.
  return hadEmoji && !WAVE.test(value) && words.every((word) => ACK_GREETING_WORDS.has(word))
}

/** A hello with nothing asked: "hi", "morning", "are you there?". Checked after her address is taken off. */
const GREETING =
  /^(?:(?:hi|hello|hey|hiya|howdy|yo|morning|good\s+(?:morning|afternoon|evening)|afternoon|evening|are\s+you\s+(?:there|around|awake|alive)|you\s+there|anyone\s+(?:there|home))(?:\s+(?:there|all|team|everyone|folks))?|there|all|team|everyone|folks)[\s!?.,]*$/i

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

/** Reads like a question: a question mark anywhere, or a question word first. */
const QUESTION_OPENER =
  /^(?:who|who's|whos|whom|whose|is|isn't|are|aren't|was|were|when|does|do|did|what|what's|whats|which|how|how's|hows|where|will|would|can|could|should|has|have|anyone|anybody|any)\b/i
const looksLikeAQuestion = (plain: string) => plain.includes('?') || QUESTION_OPENER.test(plain)

/**
 * The topic a question names, if any: mine → week → runway → strategy →
 * pipeline → the weak words for the week → ideas → heartbeat. "Mine" first,
 * because "what's on my plate" opens like "what's on" (the week) but asks
 * about one person. The bare word "week" is weaker than a named topic, so
 * "how's outreach this week?" gets the outreach numbers rather than the task
 * list; "plan" and "what's on" still mean the week. "The board", "status",
 * "agenda", "digest" and "check-in" are what people call the week too.
 */
function topicOf(lower: string): TopicIntent | null {
  if (matchesAny(lower, MINE)) return { kind: 'mine' }
  // Keywords, plus the openers people actually type that name nothing at
  // all: "what's on?" is a question about the week even though the word
  // "week" never appears in it.
  const asksWhatToDo = startsWithAny(lower, ["what's on", 'whats on', 'what should i do', "what's next", 'whats next', 'what do i do'])
  if (asksWhatToDo || mentionsAny(lower, ['plan', 'todo', 'workload'])) return { kind: 'week' }
  if (mentionsAny(lower, ['runway', 'money', 'finances', 'finance', 'financial', 'posture', 'budget', 'cash'])) return { kind: 'runway' }
  if (mentionsAny(lower, ['strategy', 'strategic', 'on track', 'direction', 'priorities'])) return { kind: 'strategy' }
  if (mentionsAny(lower, ['pipeline', 'outreach', 'scoreboard', 'leads'])) return { kind: 'pipeline' }
  if (HOW_ARE_WE_DOING.test(lower)) return { kind: 'strategy' }
  if (mentionsAny(lower, ['week', 'board', 'status', 'agenda', 'digest', 'check-in', 'checkin'])) return { kind: 'week' }
  if (mentionsAny(lower, ['ideas', 'review', 'caught'])) return { kind: 'ideas' }
  // Asking whether she is still running at all. Worth its own answer: the
  // whole suite spent months built-but-never-fired, and the only way that
  // becomes visible is if somebody can ask.
  if (mentionsAny(lower, ['heartbeat', 'tick', 'schedule', 'cron', 'running', 'alive'])) return { kind: 'heartbeat' }
  return null
}

/**
 * Asking for help, in so many words — the whole message, so "help me call
 * Jane" is still call prep.
 */
const HELP =
  /^(?:help(?:\s+me)?|halp|\?+|commands|what\s+(?:else\s+)?can\s+you\s+do|what\s+do\s+you\s+do|how\s+do\s+i\s+use\s+you|how\s+does\s+this\s+work)(?:\s+(?:please|pls))?[\s!?.]*$/i
const HELP_MORE = /^(?:help\s+(?:more|ideas|capture)|more\s+help)[\s!?.]*$/i

// ── "Who's Jane Doe" ─────────────────────────────────────────────────────────

/**
 * Asking about one person on file. The name has to look like a name or a
 * place: "who's free this week", "who is doing the newsletter" and "status of
 * the pipeline" start with a word no name starts with, and go on down the
 * ladder to the questions they are.
 */
const CONTACT_QUESTIONS: RegExp[] = [
  /^who(?:'s|s|\s+is)\s+(.+)$/i,
  /^(?:what(?:'s|s|\s+is)\s+)?(?:the\s+)?status\s+(?:of|on|with)\s+(.+)$/i,
  /^(?:when\s+did\s+(?:we|i)\s+)?last\s+(?:talk(?:ed)?|spoke|speak|spoken|call(?:ed)?|email(?:ed)?)\s+(?:to\s+|with\s+)?(.+)$/i,
  /^when\s+did\s+(?:we|i)\s+(?:last\s+)?(?:talk|speak|call|email|hear\s+from)\s+(?:to\s+|with\s+)?(.+?)(?:\s+last)?$/i,
  /^(?:tell\s+me\s+about|what\s+do\s+(?:we|i)\s+know\s+about|look\s*up|find)\s+(.+)$/i,
]

const NOT_A_NAME =
  /^(?:the|a|an|my|our|your|this|that|these|those|next|free|around|available|away|out|off|on|in|at|up|here|there|it|he|she|they|we|i|you|me|us|them|who|what|going|supposed|responsible|left|back|anyone|anybody|everyone|someone|somebody|nobody|todays?|tomorrows?|got|gotten|has|had|have|behind|ahead|late|done|finished|ready|meant|gonna|coming|in\s+charge|best|worst|first|last|most|least|still|already|also|really|actually)\b/i

/**
 * The person asked about, or null when the question is not about one.
 *
 * `named` says whether it was typed like a name — a capital letter, as people
 * write names even on a phone, where only the first word of a message is
 * capitalised for them. A lower-case target is still looked up ("who's jane
 * doe"), but only answered as a contact if somebody on file matches; see
 * `otherwise` on the intent.
 */
function contactTarget(plain: string, flat: string): { target: string; named: boolean } | null {
  const question = plain.replace(/[?.!\s]+$/, '')
  for (const pattern of CONTACT_QUESTIONS) {
    const match = pattern.exec(question)
    const who = match?.[1]?.trim()
    if (!who) continue
    const first = who.split(/\s+/)[0]
    const named = /^\p{Lu}/u.test(first)
    // "doing", "running", "handling": a verb, not a name — unless it is
    // capitalised, because Sterling and Channing are people.
    if (NOT_A_NAME.test(who) || (!named && /ing$/i.test(first)) || OWN_TOPIC.test(who) || A_THING_NOT_A_PERSON.test(who)) return null
    // As typed — curly apostrophes and all — from the same position.
    const at = question.lastIndexOf(who)
    return { target: at >= 0 ? flat.slice(at, at + who.length) : who, named }
  }
  return null
}

// ── "We signed Acme for 3 months" ────────────────────────────────────────────

const SIGNED = /^(?:(?:tell\s+(?:you|me)\s+)?(?:that\s+)?(?:i|we)(?:'ve|\s+have)?\s+(?:just\s+|finally\s+)?|just\s+|finally\s+)?signed\b\s*(.*)$/i
const SIGNED_MONTHS = /\bfor\s+(\d+(?:\.\d+)?)\s*(?:months?|mos?)\b/i

/**
 * "Signed" that is not a deal. This path runs before the proposal check, so
 * whatever it claims is never filed: "we signed up for a table at Arlington
 * Town Day, we should do stickers" was a proposal, and came back as "Signed
 * work — record it and the runway moves". A phrasal verb (up, off, in, out…)
 * or a signature on paperwork is never work signed.
 */
const SIGNED_SOMETHING_ELSE: RegExp[] = [
  /^(?:up|off|on|in|out|onto|into|over|away|back|for\s+(?:a|an|the)\b)/i,
  /^(?:(?:the|an?|our|my|that|this|their|its)\s+)?(?:m?ndas?|non[- ]disclosure|forms?|petitions?|cards?|paperwork|lease|waivers?|releases?|timesheets?|guest\s*book|books?|letters?|papers|documents?|docs?|consent|permission|birthday|register|check|cheque)\b/i,
]

/**
 * What makes "we signed …" about work: how long it runs ("for 3 months"), a
 * word for a deal, "with" somebody, or a name — the help teaches "we signed
 * Acme for 3 months". "Something" is here because it is the runway button's
 * own word ("tell me we signed something").
 */
const SIGNED_DEAL = /\b(?:contract|contracts|deal|deals|sow|statement\s+of\s+work|engagement|retainer|project|pilot|renewal|extension|client|customer|msa|agreement|phase|something|work|with)\b/i

function detectSigned(plain: string, typed: string): MarquetaIntent | null {
  if (looksLikeAQuestion(plain)) return null
  const match = SIGNED.exec(plain)
  if (!match) return null
  const rest = match[1] || ''
  if (matchesAny(rest, SIGNED_SOMETHING_ELSE)) return null
  const months = SIGNED_MONTHS.exec(rest)
  const named = /^(?:(?:the|a|an)\s+)?[A-Z]/.test(rest)
  if (!months && !named && !SIGNED_DEAL.test(rest)) return null
  const label = rest
    .replace(SIGNED_MONTHS, ' ')
    .replace(/^(?:something|a\s+deal|the\s+deal|a\s+contract|the\s+contract)\b\s*/i, '')
    .replace(/^with\s+/i, '')
    .replace(/[\s,.;:!—–-]+$/, '')
    .trim()
  const value = months ? Number(months[1]) : undefined
  return {
    kind: 'signed',
    text: typed,
    label: label.slice(0, 120),
    ...(value && Number.isFinite(value) && value > 0 ? { months: value } : {}),
  }
}

// ── Nothing she knows ────────────────────────────────────────────────────────

/** Edit distance with transpositions: "runwya" is one slip from "runway". */
export function damerauLevenshtein(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** The one-word commands a typo can be a slip of, and the command to suggest for each. */
const SUGGESTABLE: Record<string, string> = {
  runway: 'runway',
  money: 'runway',
  strategy: 'strategy',
  pipeline: 'pipeline',
  week: 'week',
  ideas: 'ideas',
  help: 'help',
  tasks: 'my tasks',
  calls: 'my calls',
  tick: 'tick',
}

/**
 * "Did you mean `Marqueta, runway`?" — for a short message whose first word is
 * one or two slips from one of her commands. Suggest only, never run: a wrong
 * guess answers a different question in a shared channel, and one more
 * message is cheaper than a confident wrong answer.
 *
 * Only short messages (three words at most) and words of four letters or more
 * — "we" is two slips from "week" and is not a typo of it — and a word of five
 * letters or fewer may be only one slip away. Two slips also need the first
 * letter right, which is where people almost never slip.
 *
 * A word she already knows the meaning of is never a typo, however close it
 * sits to a command: "thanks" is two slips from "tasks", and "hey Marqueta,
 * thanks!" once came back as "Did you mean `Marqueta, my tasks`?".
 */
const NEVER_A_TYPO = new Set([...ACK_CORE, ...ACK_FILLER, 'hello', 'morning', 'afternoon', 'evening', 'there'])

export function suggestCommand(text: string): string | undefined {
  const words = straighten(String(text || ''))
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length || words.length > 3) return undefined
  const first = words[0].replace(/'/g, '')
  if (first.length < 4 || NEVER_A_TYPO.has(first)) return undefined
  let best: { command: string; distance: number } | undefined
  for (const [word, command] of Object.entries(SUGGESTABLE)) {
    const distance = damerauLevenshtein(first, word)
    if (distance === 0) return undefined
    if (distance > (first.length <= 5 ? 1 : 2)) continue
    if (distance === 2 && first[0] !== word[0]) continue
    if (!best || distance < best.distance) best = { command, distance }
  }
  return best?.command
}

/** What she keeps that is nearest to a question she cannot answer. */
const CLOSEST: Array<[RegExp, string]> = [
  [/\b(?:revenue|sales|deals?|targets?|forecasts?|clients?|customers?|opportunit(?:y|ies)|wins?|won|signed|quotes?|proposals?)\b/, 'pipeline'],
  [/\b(?:cash|burn|payroll|invoices?|bank|months?)\b/, 'runway'],
  [/\b(?:calls?|contacts?|prospects?|ring|phone|emails?|people)\b/, 'my calls'],
  [/\b(?:tasks?|work|deadlines?|due|overdue|assigned|doing)\b/, 'my tasks'],
  [/\b(?:posts?|newsletters?|calendar|content|reels?|linkedin|instagram|publish)\b/, 'week'],
  [/\b(?:suggestions?|proposals?)\b/, 'ideas'],
]

// ── The ladder ───────────────────────────────────────────────────────────────

/**
 * What is being asked of her.
 *
 * `rawText` is decoded Slack text with her mention removed (`removeMention`)
 * — her name and a greeting may still be on the front; they are taken off
 * here, AFTER the acknowledgement check, so "ok" stays "ok" and is not
 * mistaken for a hello with nothing after it.
 *
 * Order matters, and each step earns its place:
 *
 *  0. An acknowledgement ("thanks!", "ok", "👍") is silence. A hello with
 *     nothing asked is a short greeting, not the help page.
 *  1. An explicit "capture this" beats everything. When somebody tells her to
 *     put something on the list, her opinion about whether it sounds like a
 *     proposal is not wanted. "help" and "help more" come next.
 *  2. Call prep, and the call list — but only as an instruction at the start
 *     ("prep Jane", "can you prep Jane"). The same verbs sit inside proposals
 *     ("we should prep a script for payers") and those belong on the list.
 *  3. A logged call — first-person past tense at the start. Before availability,
 *     because a report of a call routinely mentions somebody else's time off
 *     ("called Jane, she's away until October") and that must not mark the
 *     person reporting it as away. Signed work ("we signed Acme") likewise.
 *  4. A QUESTION about one of her topics, when it also mentions time off: "what
 *     does the pipeline look like with Eric away?" is about the pipeline, and
 *     "who's away this week?" is about the week. Before availability, which
 *     would otherwise read the word "away" and answer about the asker's own
 *     time off.
 *  5. Availability, which has a parser of its own that only claims text it is
 *     sure of.
 *  6. A proposal, through the shared classifier, so there is one definition of
 *     "this is an idea" rather than a second subtly different one for messages
 *     sent directly to her. Before the questions, so "we should review the
 *     board every week" is filed as the idea it is instead of answered.
 *  7. One contact ("who's Jane Doe"), then a question by its keywords ANYWHERE
 *     rather than only at the start — people write "how is the runway
 *     looking?", not "runway" (`topicOf`). A contact typed in lower case
 *     carries what the message would otherwise have been, for when nobody on
 *     file matches it.
 *  8. Anything else is `unknown`: a typo offered back as a suggestion, or the
 *     nearest thing she does. Never the help page — that is five lines of
 *     noise in answer to a sentence she did not understand.
 */
export function parseMarquetaIntent(rawText: string): MarquetaIntent {
  if (isAcknowledgement(rawText)) return { kind: 'ack' }
  const text = stripLeadingAddress(String(rawText || ''))
  // Matching happens on a flattened, clipped, straightened copy (see
  // MATCH_LIMIT); what is returned is what the person typed.
  const flat = flattenForMatching(text)
  const plain = straighten(flat)
  const lower = plain.toLowerCase()
  const typed = clipTyped(text, MATCH_LIMIT)

  // Her name, or a greeting, with nothing after it: hello.
  if (!plain || GREETING.test(plain)) return { kind: 'greeting' }

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
  if (HELP_MORE.test(lower)) return { kind: 'help', more: true }
  if (HELP.test(lower)) return { kind: 'help' }

  const prep = detectPrep(plain, flat, typed)
  if (prep !== 'notPrep') return prep

  if (CALLED_IN_SICK.test(plain)) return { kind: 'availability', text }
  const logCall = detectLogCall(plain, flat, typed)
  if (logCall) return logCall
  const signed = detectSigned(plain, typed)
  if (signed) return signed

  if (mentionsTimeOff(plain)) {
    // A question mark, or a question WORD — not "is"/"are" alone: a colleague's
    // mention is dropped by decoding, and "<@U…> is away next week" arrives
    // as "is away next week", which is a statement about them, not a question.
    const asking = plain.includes('?') || /^(?:who|who's|whos|whose|what|what's|whats|which|when|where|how|how's|hows)\b/i.test(plain)
    const topic = asking ? topicOf(lower) : null
    return topic || { kind: 'availability', text }
  }

  // Anything substantial said directly to her is meant for her. The shared
  // classifier reads the text with its line breaks, because a quoted block is
  // how it tells a draft from a remark.
  if (classifyMessage(straighten(text)).capture) return { kind: 'capture', text, explicit: false }

  const rest = topicOf(lower) || unknownIntent(plain, lower)
  const who = contactTarget(plain, flat)
  if (who) return who.named ? { kind: 'contact', target: who.target } : { kind: 'contact', target: who.target, otherwise: rest }
  return rest
}

function unknownIntent(plain: string, lower: string): Extract<MarquetaIntent, { kind: 'unknown' }> {
  const suggestion = suggestCommand(plain)
  const closest = CLOSEST.find(([pattern]) => pattern.test(lower))?.[1]
  return {
    kind: 'unknown',
    question: looksLikeAQuestion(plain),
    ...(suggestion ? { suggestion } : {}),
    ...(closest && !suggestion ? { closest } : {}),
  }
}

// ── What she says back that is not a lookup ──────────────────────────────────

/**
 * What she can do, in five lines, as phrases people can copy. The examples are
 * fixed copy with no angle brackets: Slack reads `<thing>` as a control
 * sequence and renders it as nothing.
 *
 *   - `more`: the second page — ideas, capture, and the one thing people have
 *     a right to know without asking: that she listens in the channels she is
 *     in, and never posts there uninvited.
 *   - `guest`: somebody outside the studio. What the list and the numbers are
 *     is not theirs to know; capture still works for them.
 *   - `dms`: "you can also DM me", only when DMs are actually wired up
 *     (`SLACK_MARQUETA_DMS=1`) — the old line pointed people at a door that
 *     did not open.
 *
 * `tick` still works and is not listed: it is for whoever set up the crons.
 */
export function marquetaHelpText(opts: { more?: boolean; guest?: boolean; dms?: boolean } = {}): string {
  if (opts.guest) {
    return (
      'I’m GoInvo’s marketing assistant. The outreach list and the numbers are for the GoInvo team — ' +
      `${askMarqueta('capture a booth at Town Day')} still works if you want something on our list.`
    )
  }
  if (opts.more) {
    return [
      'I also listen quietly in the channels I’m in and catch anything that sounds like a proposal or a draft. I never post there uninvited — what I caught waits on This week for a yes or no.',
      `*Who* ${askMarqueta('who’s Jane Doe')} — where things stand with someone on file.`,
      `*Signed work* ${askMarqueta('we signed Acme for 3 months')} — moves the runway.`,
      `*Capture* ${askMarqueta('capture a booth at Town Day')} — puts anything on the list, whatever it sounds like.`,
      `*Ideas* ${askMarqueta('ideas')} — what I’ve caught that still needs a yes or no.`,
    ].join('\n')
  }
  return [
    `I keep GoInvo’s outreach list, the week’s marketing tasks and the runway.${opts.dms ? ' You can also DM me.' : ''}`,
    `*Calls* ${askMarqueta('prep Jane Doe at MGB')} · ${askMarqueta('my calls')} · ${askMarqueta('called Jane, left a voicemail')}`,
    `*Tasks* ${askMarqueta('my tasks')} · ${askMarqueta('week')} · ${askMarqueta('away next week')}`,
    `*Money* ${askMarqueta('runway')} · ${askMarqueta('strategy')} · ${askMarqueta('pipeline')}`,
    `${askMarqueta('help more')} for ideas, capture and what I listen for.`,
  ].join('\n')
}

/**
 * The reply to a message she could not place — one line, ending on the one
 * thing most likely to help: the command it looks like a typo of, or the
 * nearest thing she does, or the help.
 */
export function unknownReplyText(intent: Extract<MarquetaIntent, { kind: 'unknown' }>): string {
  if (intent.suggestion) return `Did you mean ${askMarqueta(intent.suggestion)}?`
  const lead = intent.question ? 'I don’t have that' : 'I’m not sure what to do with that'
  return intent.closest
    ? `${lead} — I keep calls, tasks and the runway. Closest: ${askMarqueta(intent.closest)}.`
    : `${lead} — I keep calls, tasks and the runway. ${askMarqueta('help')} for what I can do.`
}

/**
 * Confirmation for a capture, saying plainly whose judgement it was. The
 * buttons that act on it (Keep it · Not an idea, or Not for the calendar) are
 * the caller's.
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
  const title = clipSlackText(escapeSlackText(input.title), 300).replace(/[*]/g, '') || 'Untitled'
  if (input.kind === 'draft') {
    return (
      'That’s on the calendar as a draft, with the copy attached:\n' +
      `*${title}* · drafting, no date\n` +
      '_It won’t post itself — it’s under *Unscheduled*, below the month grid._'
    )
  }
  return input.explicit
    ? `Filed as an idea, as you asked:\n*${title}*`
    : `Filed as an idea so it doesn’t scroll away:\n*${title}*\n_My guess — nothing happens until someone keeps it._`
}
