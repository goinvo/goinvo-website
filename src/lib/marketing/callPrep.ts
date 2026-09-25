/**
 * Call prep: the outline somebody reads in the minute before they dial.
 *
 * Cold calling is stressful, and the stress is mostly not knowing what to say
 * when the other person picks up. The records to answer that already exist —
 * who the person is, how we know them, when we last spoke, what our verified
 * research found, which offer fits — but they are spread across a contact, an
 * organisation's research record and the offer catalogue, and nobody joins them
 * up with a phone in their hand. This does, and it puts the four lines that
 * matter (what to say, what to ask for, what to say if they say no, how to get
 * off the phone kindly) at the top, where they can be read in ten seconds.
 *
 * What it will NOT do is make anything up. There is no model call here. Every
 * specific in an outline comes from a field somebody reviewed or from fixed
 * copy written once by a person, and the line between the two kinds of record
 * is drawn hard:
 *
 * - "Say this" material — the cheat sheet, the answers to pushback, the
 *   voicemail, the email draft, the brief — only ever uses research a human
 *   reviewed (`researchReviewedAt`) and organisation research whose quote was
 *   found in the page it cites (`verification.status === 'verified'`).
 * - Everything else is still shown, because it is useful to the caller, but it
 *   goes under Background with a label that says it must not be repeated as
 *   fact. An AI brief read out to a prospect as though it were known is the
 *   failure the whole research pipeline exists to prevent.
 *
 * Contact details (email, phone) never enter the blocks: an outline is posted
 * in a channel, and the caller decides separately whether to hand them over in
 * a DM or an ephemeral message.
 *
 * Pure: no client, no fetch, no clock (`now` is passed in), no process.env.
 */

import { draftOutreachNote, firstNameFor, type CallSheetEntry, type CallSheetResearchInput } from './callSheet'
import { CALL_ASK, PREMORTEM_QUESTION } from './executionPlan'
import { MARQUETA_ACTION, encodeContactRef } from './marquetaActions'
import { LABEL, addContactLabel, askMarqueta, openViewButton } from './marquetaStyle'
import { marketingOperationHash } from './operations'
import { OUTREACH_STATUS_OPTIONS, WARMTH_RANK } from './outreachEnums'
import { SLACK_LIMITS, clipSlackText, escapeSlackText, slackLink } from './slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

// ── Inputs ───────────────────────────────────────────────────────────────────

export type PrepContact = {
  _id: string
  name?: string | null
  organization?: string | null
  role?: string | null
  segment?: string | null
  researchSuggestedSegment?: string | null
  warmth?: string | null
  status?: string | null
  owner?: string | null
  howWeKnow?: string | null
  email?: string | null
  phone?: string | null
  suggestedOpener?: string | null
  callBrief?: string | null
  researchReviewedAt?: string | null
  suggestedOfferKey?: string | null
  relevantEvidence?: { evidenceId?: string; title?: string; why?: string }[] | null
  personVerified?: boolean | null
  identityConfidence?: string | null
  feasibilityScore?: number | null
  channelOverrides?: { channel?: string; state?: string }[] | null
  lastContactedAt?: string | null
  followUpAt?: string | null
  nextStep?: string | null
  interactions?:
    | {
        _key?: string
        at?: string
        by?: string
        outcome?: string
        nextStep?: string
        statusAfter?: string
        channel?: string
      }[]
    | null
}

export type PrepResearch = CallSheetResearchInput

export type PrepOffer = { key?: string; title?: string; oneLiner?: string; proofPoints?: string; priceBand?: string }

export type PrepEvidence = {
  _id: string
  title?: string
  client?: string
  businessOutcomes?: string[]
  highlights?: { metric?: string; detail?: string }[]
}

// ── Small text helpers ───────────────────────────────────────────────────────

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** Clip plain text at a word boundary, for copy that is spoken or used as a label. */
function clipWords(value: string, max: number): string {
  const text = clean(value)
  if (text.length <= max) return text
  const cut = text.slice(0, Math.max(0, max - 1))
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
const PHONE_PATTERN = /\+?\d[\d\s().-]{8,}\d/g

const looksLikeEmail = (value: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value))
const looksLikeDomain = (value: unknown) => /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(clean(value))

/**
 * Free text from a record, minus anything that is a contact detail.
 *
 * A "how we know them" note or a brief can carry an email address or a phone
 * number ("call her on 617…"), and those lines are rendered in a channel. The
 * contact's details reach the caller through their own, private route; they do
 * not ride along inside a sentence.
 */
function withoutContactDetails(value: unknown): string {
  return clean(value)
    .replace(EMAIL_PATTERN, '[email]')
    .replace(PHONE_PATTERN, (match) => (match.replace(/\D/g, '').length >= 10 ? '[phone]' : match))
}

/** Lowercase, no accents, words separated by single spaces. The one normaliser for matching and ids. */
function norm(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const compact = (value: unknown) => norm(value).replace(/ /g, '')
const tokens = (value: unknown) => norm(value).split(' ').filter(Boolean)

const time = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

// ── Dates, in the studio's own time zone ─────────────────────────────────────

/**
 * Interactions are stored as UTC instants, but a call logged at 9pm in
 * Arlington is a call on that day, not the next one. Everything shown to the
 * team is formatted in the studio's zone so "when we spoke on 12 Sep" is the
 * day they remember.
 */
const STUDIO_TIME_ZONE = 'America/New_York'

function dateParts(value: string | Date): { weekdayShort: string; weekdayLong: string; day: string; month: string } | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pick = (options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes) =>
    new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TIME_ZONE, ...options })
      .formatToParts(date)
      .find((part) => part.type === type)?.value || ''
  return {
    weekdayShort: pick({ weekday: 'short' }, 'weekday'),
    weekdayLong: pick({ weekday: 'long' }, 'weekday'),
    day: pick({ day: 'numeric' }, 'day'),
    month: pick({ month: 'short' }, 'month'),
  }
}

/** "12 Sep" */
function formatDay(value: string | Date): string {
  const parts = dateParts(value)
  return parts ? `${parts.day} ${parts.month}` : ''
}

/** "Mon 28 Sep" */
function formatWeekdayDate(value: string | Date): string {
  const parts = dateParts(value)
  return parts ? `${parts.weekdayShort} ${parts.day} ${parts.month}` : ''
}

/** "Thursday" */
function formatWeekday(value: string | Date): string {
  return dateParts(value)?.weekdayLong || ''
}

/** Three days out, moved off a weekend — nobody should be told to call on a Sunday. */
function replyDeadline(now: Date): Date {
  const due = new Date(now.getTime() + 3 * 86_400_000)
  const weekday = dateParts(due)?.weekdayShort
  if (weekday === 'Sat') return new Date(due.getTime() + 2 * 86_400_000)
  if (weekday === 'Sun') return new Date(due.getTime() + 86_400_000)
  return due
}

// ── Parsing what somebody asked for ──────────────────────────────────────────

export type PrepRequest = { name: string; organization: string; role: string; note: string; raw: string }

/**
 * The command words people actually type in front of a name, stripped in any
 * order until none are left. Specific before general: "call prep" must go
 * before "call", or "call prep for Jane" loses the wrong word.
 *
 * The lowercase-only rules are deliberate: "prep me for Jane" drops the "me"
 * while "prep US Foods" keeps the company, and "help me reach Jane" drops the
 * verb while "prep Reach Health" does not.
 */
const LEADING: RegExp[] = [
  /^[\s,:;.!?—–-]+/,
  /^(?:hey|hi|hello|ok|okay|so|um|right)\b[\s,!:—–-]*/i,
  /^@?marqueta\b[\s,:]*/i,
  /^(?:can|could|would|will) you\b\s*/i,
  /^(?:please|pls|plz|kindly)\b\s*/i,
  /^i(?:'d|’d| would)? (?:need|want|like)(?: you)? to\b\s*/i,
  /^i need\b\s*/i,
  /^help me(?: with)?\b\s*/i,
  /^get (?:me|us) ready(?: for| to call)?\b\s*/i,
  /^(?:call|meeting|phone) prep(?:aration)?\b\s*/i,
  /^(?:prep|prepare)\b\s*/i,
  /^(?:me|us)\s+(?=(?:for|on|about|to|with)\b)/,
  /^outline(?:\s+for\s+(?:calling|a call(?:\s+with)?|the call(?:\s+with)?))?\b\s*/i,
  /^brief\s+(?:me|us)\b\s*/i,
  /^brief\b\s*/,
  /^(?:a\s+|an\s+)?script\b\s*/i,
  /^(?:draft|write)(?:\s+(?:me|us))?\s+(?:an?\s+)?(?:(?:first|intro|cold|follow[- ]up)\s+)?(?:email|e-mail|note|message)\b\s*/i,
  /^(?:an?\s+)?(?:email|e-mail)\s+draft\b\s*/i,
  /^(?:my|our|a|an|the)\s+(?:(?:cold|first|intro|quick|follow[- ]up|phone|sales|discovery)\s+)?(?:call|chat|meeting|conversation|intro)(?:\s+(?:with|to|for|at))?\b\s*/i,
  // Lowercase only, so "prep Reach Health" keeps the company.
  /^(?:call|calling|ring|phone|reach|email|e-mail)(?:\s+(?:with|to))?\b\s*/,
  /^(?:for|to|with|on|about|re|regarding)\b[:\s]*/i,
  /^(?:the|a|an)\s+/i,
]

const WEEKDAY = '(?:mon|tues|wednes|thurs|fri|satur|sun)day'

/** "Friday afternoon", "tomorrow morning": the part of the day belongs to the time, not to the organisation. */
const PART_OF_DAY = '(?:\\s+(?:morning|afternoon|evening|night|am|pm))?'

/**
 * A time zone after a time ("at 10am ET"). Bare "MT" is left out on purpose:
 * it is also "Mt", as in "Mt Sinai".
 */
const TIME_ZONE = '(?:\\s*(?:e[sd]?t|p[sd]?t|c[sd]?t|m[sd]t|utc|gmt|bst|cet|eastern|pacific|central|mountain)\\b(?:\\s+time\\b)?)?'

/**
 * A preposition left at the end of a phrase once the time it governed has gone:
 * "at Acme for tomorrow" is "at Acme for" after the time is removed, and "Acme
 * for" is not an organisation anybody has heard of. Only stripped when a time
 * WAS removed, so an organisation that really ends in one ("Hands On") keeps it.
 */
const ORPHAN_PREPOSITION = /\s+(?:for|by|at|on|before|after|until|till|around)$/i

const MENTIONS_A_WEEKDAY = new RegExp(`\\b${WEEKDAY}\\b`, 'i')

function stripOrphanPrepositions(value: string): string {
  let current = value
  for (let guard = 0; guard < 5 && ORPHAN_PREPOSITION.test(current); guard += 1) current = current.replace(ORPHAN_PREPOSITION, '')
  return current
}

const TRAILING: RegExp[] = [
  /[\s,.!?;:—–-]+$/,
  /\s+(?:please|pls|thanks|thank you|thx|ty|asap|now|soon|later(?:\s+today)?|again)$/i,
  /\s+(?:before|after)\s+(?:lunch|noon|the call|the meeting)$/i,
  /\s+in\s+(?:an?\s+hour|\d+\s*(?:min|mins|minutes|hours?|hrs?))$/i,
  new RegExp(`\\s+(?:(?:on|this|next|by|before|until|till)\\s+)?${WEEKDAY}${PART_OF_DAY}$`, 'i'),
]

/**
 * When a call is, wherever it appears. "at 3pm" needs am/pm or a colon so that
 * "someone at 3M" keeps its company. Each pattern takes the words that belong
 * to the time with it — "this Friday afternoon", "by Friday", "at 10am ET" —
 * because whatever a pattern leaves behind ends up glued to the organisation
 * ("Acme afternoon"), and then matches nobody on file.
 */
const TIME_PHRASES: RegExp[] = [
  new RegExp(`\\b(?:tomorrow|tomorow|tmrw|tmr|today|tonight)(?:['’]s)?${PART_OF_DAY}\\b`, 'gi'),
  /\b(?:this|next)\s+(?:week|month|morning|afternoon|evening)\b/gi,
  /\bin\s+the\s+(?:morning|afternoon|evening)\b/gi,
  new RegExp(`\\b(?:on|this|next|by|before|until|till)\\s+${WEEKDAY}(?:['’]s)?${PART_OF_DAY}\\b`, 'gi'),
  new RegExp(
    `\\b(?:at|@|around|by|before)\\s+(?:\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)|\\d{1,2}:\\d{2}|noon|midday)${TIME_ZONE}(?=[\\s,.;!?]|$)`,
    'gi',
  ),
  new RegExp(`\\b\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)\\b${TIME_ZONE}`, 'gi'),
  /\b(?:by\s+)?(?:eod|end of (?:the )?(?:day|week))\b/gi,
]

/** Words that end the "who" and start a note, matched lowercase only ("WHO" is an organisation). */
const NOTE_WORDS = /\s+(?:who|whom|whose|because|since|re:|regarding|about)\s+|,\s*(?=(?:met|we|she|he|they|i|introduced|intro|referred|via|knows|worked)\b)/

const ABBREVIATIONS = new Set(['st', 'mt', 'ft', 'inc', 'co', 'corp', 'ltd', 'jr', 'sr', 'dr', 'mr', 'mrs', 'ms', 'prof', 'vs', 'no', 'dept', 'univ'])

const PLACEHOLDER_PEOPLE = new Set([
  'someone', 'somebody', 'anyone', 'anybody', 'whoever', 'person', 'the person', 'a person', 'a contact', 'contact',
  'someone new', 'the right person', 'buyer', 'the buyer', 'people', 'folks', 'team', 'the team', 'them', 'somebody new',
])

const ROLE_WORDS =
  /\b(?:cmio|cio|cto|ceo|cmo|coo|cfo|cno|cso|cpo|cdo|cxo|chief|vp|svp|evp|avp|vice president|president|director|head|lead|manager|officer|founder|co-?founder|partner|principal|owner|engineer|designer|researcher|scientist|physician|doctor|nurse|product|professor|dean|chair|analyst|consultant|architect|strategist|informaticist|informatics|advisor|adviser|editor|investor|administrator|coordinator|specialist)\b/gi

/** Role words that are also ordinary names: "Dean Smith" and "Jane Head" are people. */
const NAME_LIKE_ROLE_WORDS = new Set(['head', 'lead', 'dean', 'chair', 'partner', 'owner', 'principal', 'doctor', 'nurse', 'president', 'director'])

const ORG_WORDS = new Set([
  'health', 'healthcare', 'hospital', 'hospitals', 'medical', 'medicine', 'clinic', 'clinics', 'care', 'pharma',
  'pharmaceutical', 'pharmaceuticals', 'therapeutics', 'bio', 'biotech', 'biosciences', 'labs', 'lab', 'systems',
  'system', 'group', 'university', 'college', 'institute', 'center', 'centre', 'foundation', 'network', 'partners',
  'inc', 'llc', 'ltd', 'corp', 'corporation', 'co', 'company', 'technologies', 'tech', 'solutions', 'services',
  'sciences', 'ai', 'digital', 'general', 'national', 'federal', 'department', 'agency', 'insurance', 'plan', 'plans',
  'mutual', 'blue', 'cross', 'shield', 'devices', 'diagnostics', 'robotics', 'software', 'analytics', 'data',
  'capital', 'ventures', 'consulting', 'associates', 'alliance', 'association', 'society', 'trust', 'memorial',
  'children', 'childrens', 'nhs', 'va', 'cdc', 'fda', 'nih', 'hhs', 'cms', 'medtech', 'genomics', 'oncology',
])

const isPlaceholderPerson = (value: string) => PLACEHOLDER_PEOPLE.has(norm(value))

/** Strip a leading "their" / "the" from a role: "their CMIO" is a CMIO. */
const bareRole = (value: string) => clean(value).replace(/^(?:their|the|a|an|our|your)\s+/i, '')

const NAME_WORD = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.-]*$/

/**
 * Is a bare phrase ("prep Jane Doe" / "prep Mass General Brigham") a person?
 *
 * Two to four plain words with nothing organisation-shaped in them. A single
 * word is NOT treated as a person — "prep Acme" is far more common than "prep
 * Jane" — and the resolver tries a misfiled word the other way round anyway.
 */
function looksLikePersonName(value: string): boolean {
  const words = clean(value).split(' ').filter(Boolean)
  if (words.length < 2 || words.length > 4) return false
  // "director of nursing" is a title: nobody's name has "of" or "and" in it.
  if (words.some((word) => ['of', 'and', '&'].includes(word.toLowerCase()))) return false
  return words.every(
    (word) => NAME_WORD.test(word) && !ORG_WORDS.has(norm(word)) && !(word.length >= 2 && word === word.toUpperCase() && /[A-Z]{2}/.test(word)),
  )
}

/**
 * Is a phrase a job title? "Product Lead" is; "Jane Head" is a person whose
 * surname happens to be a role word. A phrase that reads as a name counts as a
 * role only when it carries a role word that is not also a common name.
 */
function isRolePhrase(value: string): boolean {
  const found = clean(value).match(ROLE_WORDS) || []
  if (!found.length) return false
  if (!looksLikePersonName(value)) return true
  return found.some((word) => !NAME_LIKE_ROLE_WORDS.has(word.toLowerCase()))
}

const isRoleWord = (word: string) => (clean(word).match(ROLE_WORDS) || []).join(' ').toLowerCase() === clean(word).toLowerCase()

/** Words that can open a job title without being one: the "Chief" in "Chief Medical Officer". */
const RANK_WORDS = new Set(['chief', 'vice', 'senior', 'sr', 'associate', 'assistant', 'deputy', 'executive', 'global', 'regional', 'interim', 'acting'])

/**
 * Words that sit INSIDE a job title — "Chief Medical Officer", "VP of Clinical
 * Informatics" — but never start one on their own, so "Boston Medical CIO"
 * stays Boston Medical's CIO rather than becoming a "Medical CIO" at Boston.
 */
const TITLE_MODIFIERS = new Set([
  'medical', 'information', 'technology', 'nursing', 'operating', 'financial', 'digital', 'clinical', 'innovation',
  'marketing', 'data', 'science', 'health', 'experience', 'transformation', 'quality', 'patient', 'people',
])

/**
 * What can follow "of" inside a job title: "Head of Product", "Director of
 * Digital Health", "Chief of Staff". Anything else after "of" is where they
 * work — "the CIO of Acme".
 */
const DEPARTMENT_WORDS = new Set([
  ...TITLE_MODIFIERS,
  'engineering', 'product', 'products', 'design', 'sales', 'operations', 'ops', 'informatics', 'medicine', 'research',
  'strategy', 'care', 'it', 'staff', 'finance', 'growth', 'partnerships', 'business', 'development', 'ux', 'ui',
  'regulatory', 'compliance', 'analytics', 'ai', 'pharmacy', 'population', 'services', 'platform', 'platforms',
  'sciences', 'affairs', 'communications', 'talent', 'hr', 'legal', 'policy', 'program', 'programs', 'management',
  'safety', 'security', 'software', 'and', 'the',
])

const TITLE_CONNECTORS = new Set(['of', 'and', '&'])

/**
 * A role phrase that also says where they work: "CIO of Acme", "Acme CMIO",
 * "Mass General Brigham Chief Medical Officer". Returns the job title and
 * whatever came with it (`other`), or null when the whole phrase is a title
 * ("Head of Product", "VP of Clinical Informatics").
 *
 * `other` is usually an organisation, but the caller decides: "Jane Doe CMIO"
 * is a person with a title, and it reads that way to `looksLikePersonName`.
 */
function splitRolePhrase(phrase: string): { role: string; other: string } | null {
  const text = bareRole(phrase)
  if (!text) return null

  // "the CIO of Acme": the last "of" whose left side is a title and whose right side is not a department.
  const ofs = [...text.matchAll(/\s+of\s+/gi)]
  for (let index = ofs.length - 1; index >= 0; index -= 1) {
    const found = ofs[index]
    const before = clean(text.slice(0, found.index))
    const after = clean(text.slice((found.index || 0) + found[0].length))
    if (!before || !after || !isRolePhrase(before)) continue
    const afterWords = tokens(after)
    if (afterWords.every((word) => DEPARTMENT_WORDS.has(word) || isRoleWord(word))) continue
    return { role: bareRole(before), other: after }
  }

  // "Acme CMIO": a title at the end, after something that is not a title.
  const words = text.split(' ')
  if (!isRoleWord(words[words.length - 1])) return null
  let start = words.length
  while (start > 0) {
    const word = words[start - 1]
    const lower = norm(word)
    if (isRoleWord(word) || RANK_WORDS.has(lower) || TITLE_MODIFIERS.has(lower) || TITLE_CONNECTORS.has(word.toLowerCase())) start -= 1
    else break
  }
  // A title opens with a rank or a role word, never with "Medical" or "of".
  while (start < words.length) {
    const word = words[start]
    if (isRoleWord(word) || RANK_WORDS.has(norm(word))) break
    start += 1
  }
  if (start === 0 || start >= words.length) return null
  const other = clean(words.slice(0, start).join(' '))
  const role = clean(words.slice(start).join(' '))
  if (!other || isRolePhrase(other)) return null
  return { role, other }
}

/** Earliest point where the "who" ends and the requester's own note begins. */
function findNoteStart(text: string): { index: number; skip: number } | null {
  const candidates: { index: number; skip: number }[] = []
  const add = (pattern: RegExp, keepMatch: boolean) => {
    const match = pattern.exec(text)
    if (match) candidates.push({ index: match.index, skip: keepMatch ? 0 : match[0].length })
  }
  add(/\s*[—–]\s*/, false)
  add(/\s+-{1,2}\s+/, false)
  add(/\s*;\s*/, false)
  // Conjunctions stay in the note ("who I met at HIMSS" reads as a note); a
  // bare comma before "met" does not.
  const word = NOTE_WORDS.exec(text)
  if (word) {
    const commaOnly = word[0].trim() === ','
    candidates.push({ index: word.index, skip: commaOnly ? word[0].length : word[0].length - word[0].trimStart().length })
  }
  // A sentence break — but not after "Dr." or "St." or an initial.
  const sentence = /\.\s+(?=[A-Z])/g
  let found: RegExpExecArray | null
  while ((found = sentence.exec(text))) {
    const before = text.slice(0, found.index).split(/\s+/).pop() || ''
    if (before.length <= 1 || ABBREVIATIONS.has(before.toLowerCase())) continue
    candidates.push({ index: found.index, skip: found[0].length })
    break
  }
  if (!candidates.length) return null
  return candidates.sort((a, b) => a.index - b.index)[0]
}

function stripLeading(text: string): string {
  let current = text
  for (let guard = 0; guard < 40; guard += 1) {
    const pattern = LEADING.find((candidate) => candidate.test(current))
    if (!pattern) break
    const next = current.replace(pattern, '')
    if (next === current) break
    current = next
  }
  return current
}

function stripTrailing(text: string): string {
  let current = text
  for (let guard = 0; guard < 20; guard += 1) {
    const pattern = TRAILING.find((candidate) => candidate.test(current))
    if (!pattern) break
    const next = current.replace(pattern, '')
    if (next === current) break
    current = next
  }
  return current
}

/**
 * Who a "prep …" message is about, from text Slack has ALREADY decoded.
 *
 * "Jane Doe, CMIO at Acme — met her at HIMSS" becomes name, role, organisation
 * and a note. Command words ("prep", "brief me on", "draft an email to") and
 * the time of the call ("tomorrow at 3pm") are stripped, because neither is
 * part of who. "someone at Acme" and a bare "Acme" are organisation only. An
 * email or a domain is kept exactly as typed, so the resolver can match on it.
 *
 * It is a best reading, not a verdict: the resolver tries a phrase both as a
 * person and as an organisation when the first reading finds nobody. Never
 * throws.
 */
export function parsePrepRequest(text: string): PrepRequest {
  const raw = clean(text)
  const result: PrepRequest = { name: '', organization: '', role: '', note: '', raw }
  try {
    const body = stripLeading(raw)

    const noteStart = findNoteStart(body)
    let head = body
    if (noteStart) {
      head = body.slice(0, noteStart.index)
      result.note = clean(body.slice(noteStart.index + noteStart.skip)).replace(/^[\s,:;—–-]+/, '')
    }

    const beforeTimes = head
    for (const pattern of TIME_PHRASES) head = head.replace(pattern, ' ')
    const hadTime = head !== beforeTimes || MENTIONS_A_WEEKDAY.test(beforeTimes)
    const withoutOrphans = (value: string) => (hadTime ? stripTrailing(stripOrphanPrepositions(stripTrailing(value))) : value)
    head = withoutOrphans(stripTrailing(stripLeading(clean(head))))

    // Parentheticals: a role ("Jane Doe (CMIO)") or an aside that belongs in the note.
    const asides: string[] = []
    head = head.replace(/\(([^()]*)\)/g, (_whole, inside: string) => {
      const aside = clean(inside)
      if (!aside) return ' '
      if (!result.role && isRolePhrase(aside) && !looksLikeEmail(aside)) result.role = bareRole(aside)
      else if (!looksLikeEmail(aside)) asides.push(aside)
      return ' '
    })
    if (asides.length) result.note = clean([asides.join('; '), result.note].filter(Boolean).join(' — '))

    head = clean(head.replace(/\b(?:dr|mr|mrs|ms|mx|prof)\.?\s+(?=[A-Za-z])/gi, ''))
    head = stripTrailing(head)

    // An address typed on its own IS the person, as far as matching goes. One
    // typed next to a name ("Jane Doe jane@mgb.org") stays in `raw`, where the
    // resolver matches it exactly, and leaves the name clean.
    const emails = head.match(EMAIL_PATTERN)
    if (emails) {
      const rest = stripTrailing(clean(head.replace(EMAIL_PATTERN, ' ')))
      if (!rest) {
        result.name = emails[0]
        return result
      }
      head = rest
    }

    const orgSplit = /\s+(?:at|from|@)\s+/i.exec(head) || /\s+with\s+/i.exec(head)
    let who = head
    if (orgSplit) {
      who = head.slice(0, orgSplit.index)
      result.organization = clean(head.slice(orgSplit.index + orgSplit[0].length))
    }

    const parts = who.split(',').map(clean).filter(Boolean)

    if (!orgSplit) {
      const rest = parts.slice(1)
      if (parts.length >= 3 && isRolePhrase(rest[rest.length - 1]) && rest.some((part) => !isRolePhrase(part))) {
        // "Jane Doe, Acme, CMIO": the title came last.
        result.name = parts[0]
        result.role = result.role || rest.filter(isRolePhrase).map(bareRole).join(', ')
        result.organization = rest.filter((part) => !isRolePhrase(part)).join(', ')
      } else if (parts.length >= 3) {
        result.name = parts[0]
        result.role = result.role || parts.slice(1, -1).join(', ')
        result.organization = parts[parts.length - 1]
      } else if (parts.length === 2) {
        result.name = parts[0]
        if (isRolePhrase(parts[1])) result.role = result.role || bareRole(parts[1])
        else result.organization = parts[1]
      } else if (parts.length === 1) {
        const phrase = parts[0]
        const possessive = /^(.+?)['’]s\s+(.+)$/.exec(phrase)
        if (looksLikeEmail(phrase)) result.name = phrase
        else if (looksLikeDomain(phrase)) result.organization = phrase
        else if (possessive && !looksLikeEmail(phrase)) {
          result.organization = clean(possessive[1])
          const tail = clean(possessive[2])
          if (isRolePhrase(tail)) result.role = result.role || bareRole(tail)
          else if (!isPlaceholderPerson(tail)) result.name = tail
        } else if (isRolePhrase(phrase)) result.role = result.role || bareRole(phrase)
        else if (isPlaceholderPerson(phrase)) {
          // "someone" with nothing else: nobody to find.
        } else if (looksLikePersonName(phrase)) result.name = phrase
        else result.organization = phrase
      }
    } else if (parts.length) {
      const [first, ...rest] = parts
      if (isPlaceholderPerson(first)) {
        // "someone at Acme"
      } else if (parts.length === 1 && isRolePhrase(first)) {
        result.role = result.role || bareRole(first)
      } else {
        result.name = clean(first.replace(/^(?:the|a|an)\s+/i, ''))
      }
      if (rest.length) result.role = result.role || bareRole(rest.join(', '))
    }

    result.name = withoutOrphans(stripTrailing(clean(result.name)))
    result.organization = withoutOrphans(stripTrailing(clean(result.organization).replace(/^[\s,:;.!?—–-]+/, '')))
    result.role = stripTrailing(clean(result.role))
    if (isPlaceholderPerson(result.name)) result.name = ''

    // "Jane at Acme, CMIO": a title after the organisation is still a title.
    const orgPieces = result.organization.split(',').map(clean).filter(Boolean)
    if (orgPieces.length >= 2 && isRolePhrase(orgPieces[orgPieces.length - 1]) && !looksLikeDomain(orgPieces[orgPieces.length - 1])) {
      if (!result.role) result.role = stripTrailing(bareRole(orgPieces[orgPieces.length - 1]))
      result.organization = orgPieces.slice(0, -1).join(', ')
    }

    // "the CIO of Acme", "Acme CMIO": a title that also says where they work.
    if (result.role && !result.organization) {
      const split = splitRolePhrase(result.role)
      if (split) {
        const other = stripTrailing(split.other)
        if (looksLikePersonName(other)) {
          // "Jane Doe CMIO" is a person with a title, unless we already have their name.
          if (!result.name) {
            result.name = other
            result.role = stripTrailing(split.role)
          }
        } else {
          result.organization = other
          result.role = stripTrailing(split.role)
        }
      }
    }
  } catch {
    // A request we cannot read is a request with nothing in it — the caller
    // answers with help, never with an error.
  }
  return result
}

// ── Matching people and organisations ────────────────────────────────────────

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'comcast.net',
  'verizon.net', 'att.net', 'sbcglobal.net',
])
const FREE_MAIL_LABELS = new Set(['gmail', 'googlemail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'aol', 'protonmail'])
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'nhs', 'or', 'ne'])

/**
 * "mgb.org" → "mgb", "bwh.harvard.edu" → "harvard", "acme.co.uk" → "acme".
 * Free-mail domains have no organisation behind them and return ''.
 */
function domainLabel(domain: string): string {
  const host = clean(domain).toLowerCase().replace(/^www\./, '')
  if (!host || FREE_MAIL_DOMAINS.has(host)) return ''
  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return ''
  parts.pop()
  if (parts.length >= 2 && SECOND_LEVEL.has(parts[parts.length - 1])) parts.pop()
  const label = parts[parts.length - 1] || ''
  return FREE_MAIL_LABELS.has(label) ? '' : label
}

/** Many contacts carry their email in `name` (the newsletter import did that). */
function contactEmail(contact: PrepContact): string {
  if (looksLikeEmail(contact.email)) return clean(contact.email).toLowerCase()
  if (looksLikeEmail(contact.name)) return clean(contact.name).toLowerCase()
  return ''
}

const emailDomain = (email: string) => email.split('@')[1] || ''

function acronyms(value: string): string[] {
  const words = tokens(value)
  if (words.length < 2) return []
  const all = words.map((word) => word[0]).join('')
  const skipped = words.filter((word) => !['of', 'the', 'and', 'for', 'at', 'in', 'de'].includes(word)).map((word) => word[0]).join('')
  return [...new Set([all, skipped])]
}

/**
 * Do two organisation names mean the same place?
 *
 * Equality after normalising, then word-level containment of at least four
 * characters ("Brigham" in "Mass General Brigham", but never "care" inside
 * "healthcare"), then acronyms of three letters or more ("MGB"), in either
 * direction. A domain is compared by its registrable label.
 */
function orgMatches(query: string, candidate: string | null | undefined): boolean {
  const queryText = looksLikeDomain(query) ? domainLabel(query) : query
  const q = norm(queryText)
  const c = norm(candidate)
  if (!q || !c) return false
  const qc = q.replace(/ /g, '')
  const cc = c.replace(/ /g, '')
  if (qc === cc) return true
  if (qc.length >= 4 && ` ${c} `.includes(` ${q} `)) return true
  if (cc.length >= 4 && ` ${q} `.includes(` ${c} `)) return true
  if (qc.length >= 3 && acronyms(c).includes(qc)) return true
  if (cc.length >= 3 && acronyms(q).includes(cc)) return true
  return false
}

function contactOrgMatches(query: string, contact: PrepContact): boolean {
  if (orgMatches(query, contact.organization)) return true
  const label = domainLabel(emailDomain(contactEmail(contact)))
  if (!label) return false
  const q = looksLikeDomain(query) ? domainLabel(query) : compact(query)
  if (q.length >= 3 && label === q) return true
  // "prep Mass General Brigham" should find the people whose only link to it is an @mgb.org address.
  return !looksLikeDomain(query) && label.length >= 3 && acronyms(query).includes(label)
}

/** The words of a person's name, reading a first.last email when the name IS an email. */
function nameTokens(contact: PrepContact): string[] {
  const name = clean(contact.name)
  if (name && !looksLikeEmail(name)) return tokens(name)
  const local = contactEmail(contact).split('@')[0]
  return /[._-]/.test(local) ? tokens(local.replace(/[._-]+/g, ' ')) : []
}

/**
 * How well a typed name fits a contact: 3 exact, 2 first and last, 1 a single
 * name that matches their first (or last) name. A one-word query can never be
 * better than 1 — "Jane" is a first-name match however few Janes there are.
 */
function personScore(query: string, contact: PrepContact): number {
  const typed = clean(query)
  if (!typed) return 0
  if (looksLikeEmail(typed)) return contactEmail(contact) === typed.toLowerCase() ? 3 : 0
  const q = tokens(typed)
  if (!q.length) return 0
  const c = nameTokens(contact)
  const first = norm(firstNameFor(contact))
  if (q.length === 1) {
    return q[0] === first || (c.length && (q[0] === c[0] || q[0] === c[c.length - 1])) ? 1 : 0
  }
  if (c.length && q.join(' ') === c.join(' ')) return 3
  const local = contactEmail(contact).split('@')[0]
  if (/[._-]/.test(local) && q.join(' ') === tokens(local.replace(/[._-]+/g, ' ')).join(' ')) return 3
  if (c.length >= 2 && q[0] === c[0] && q[q.length - 1] === c[c.length - 1]) return 2
  return 0
}

const IN_CONVERSATION = ['contacted', 'responded', 'meeting', 'opportunity']

/**
 * A note that says the requester already knows the person. Past-tense contact
 * or an ongoing relationship only — "wants to talk about AI" says nothing about
 * whether they have met.
 */
const TYPED_RELATIONSHIP =
  /\b(?:met|know|knows|knew|worked (?:with|together)|work with|used to work|introduced|intro(?:duction)? from|friend|(?:ex-?|former )?colleague|former (?:client|boss|manager)|spoke (?:with|to)|talked (?:with|to)|we'?ve spoken|referred)\b/i
const FINISHED = ['won', 'lost', 'dormant', 'closed']

function stageRank(contact: PrepContact): number {
  const status = clean(contact.status)
  if (IN_CONVERSATION.includes(status)) return 1
  if (FINISHED.includes(status)) return 2
  return 0
}

/**
 * The name to show for a contact — never an email address.
 *
 * Many records hold an email in `name`, and a label goes into a channel. A
 * first.last address gives an honest first name; anything else becomes
 * "someone at <org>".
 */
function personLabelFor(contact: PrepContact | undefined, organization: string): string {
  const name = clean(contact?.name)
  if (name && !looksLikeEmail(name)) return clipWords(withoutContactDetails(name), 80)
  const first = contact ? firstNameFor(contact) : ''
  if (first) return clipWords(first, 40)
  return organization ? `someone at ${clipWords(organization, 100)}` : 'someone'
}

type ChannelBlock = '' | 'doNotUse' | 'unavailable'

/**
 * Whether a channel is off limits for this person, and why. "Do not use" wins
 * over "unavailable" when both are recorded, because the reason matters in
 * the copy: one is their wish, the other is a missing number or address.
 */
function channelBlock(contact: PrepContact | undefined, channel: 'phone' | 'email'): ChannelBlock {
  const overrides = contact?.channelOverrides || []
  for (const state of ['doNotUse', 'unavailable'] as const) {
    if (overrides.some((override) => clean(override?.channel) === channel && clean(override?.state) === state)) return state
  }
  return ''
}

/** Neither a call nor an email is allowed: there is no outreach to prepare. */
const unreachable = (contact: PrepContact) => Boolean(channelBlock(contact, 'phone') && channelBlock(contact, 'email'))

/**
 * Reachable before unreachable (an organisation's outline is built around its
 * first contact, and it must not be the one person there we may not contact),
 * then not yet contacted (someone in conversation is already being handled),
 * then warmth, then name.
 */
function sortForCalling(contacts: PrepContact[]): PrepContact[] {
  return [...contacts].sort(
    (a, b) =>
      Number(unreachable(a)) - Number(unreachable(b)) ||
      stageRank(a) - stageRank(b) ||
      (WARMTH_RANK[clean(a.warmth)] ?? 5) - (WARMTH_RANK[clean(b.warmth)] ?? 5) ||
      personLabelFor(a, '').localeCompare(personLabelFor(b, '')) ||
      a._id.localeCompare(b._id),
  )
}

/**
 * Is one person at an organisation clearly the one to call?
 *
 * "prep Crossover Health" is built around whoever `sortForCalling` puts
 * first. That is a real choice when the first is reachable where the second
 * is not, or not yet contacted where the second is already in conversation,
 * or warmer. When the top two tie on all three, the order comes down to the
 * alphabet — and an outline for whoever sorts first is prep for a call nobody
 * chose. Then the caller should pick.
 */
export function clearlyFirst(contacts: PrepContact[]): boolean {
  const sorted = sortForCalling((contacts || []).filter((contact) => contact && contact._id))
  if (sorted.length < 2) return true
  const [a, b] = sorted
  const warmth = (contact: PrepContact) => WARMTH_RANK[clean(contact.warmth)] ?? 5
  return Number(unreachable(a)) !== Number(unreachable(b)) || stageRank(a) !== stageRank(b) || warmth(a) !== warmth(b)
}

// ── Resolution ───────────────────────────────────────────────────────────────

export type PrepCandidate = { label: string; contactId?: string; organization: string }

export type PrepTargetMatch =
  | { kind: 'contact'; contact: PrepContact }
  | { kind: 'organization'; organization: string; contacts: PrepContact[] }
  | { kind: 'ambiguous'; candidates: PrepCandidate[] }
  | { kind: 'none'; request: PrepRequest }

const MAX_CANDIDATES = 5

function candidateFor(contact: PrepContact): PrepCandidate {
  const organization = clean(contact.organization)
  const role = clipWords(withoutContactDetails(contact.role), 60)
  const person = personLabelFor(contact, organization)
  const where = organization && !person.startsWith('someone at') ? ` — ${clipWords(withoutContactDetails(organization), 80)}` : ''
  return { label: `${person}${role ? `, ${role}` : ''}${where}`, contactId: contact._id, organization }
}

function pickPeople(scored: { contact: PrepContact; score: number }[]): PrepTargetMatch {
  const top = Math.max(...scored.map((entry) => entry.score))
  const tier = sortForCalling(scored.filter((entry) => entry.score === top).map((entry) => entry.contact))
  if (tier.length === 1) return { kind: 'contact', contact: tier[0] }
  return { kind: 'ambiguous', candidates: tier.slice(0, MAX_CANDIDATES).map(candidateFor) }
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || ''
}

function resolveOrganization(query: string, contacts: PrepContact[], research: PrepResearch[]): PrepTargetMatch | null {
  if (!clean(query)) return null
  const hits = contacts.filter((contact) => contactOrgMatches(query, contact))
  const known = research.find((entry) => orgMatches(query, entry.organization))
  if (hits.length) {
    // Contacts with no organisation (matched on their email domain alone)
    // belong to whichever named place matched, not to a place of their own.
    const named = new Map<string, PrepContact[]>()
    const nameless: PrepContact[] = []
    for (const contact of hits) {
      const key = compact(contact.organization)
      if (!key) {
        nameless.push(contact)
        continue
      }
      if (!named.has(key)) named.set(key, [])
      named.get(key)!.push(contact)
    }
    let groups = [...named.values()]
    if (groups.length > 1) {
      const exact = groups.filter((group) => compact(group[0].organization) === compact(query))
      if (exact.length === 1) groups = exact
    }
    if (groups.length > 1) {
      // Two genuinely different places share the words typed; ask rather than pick.
      return {
        kind: 'ambiguous',
        candidates: groups
          .map((group) => mostCommon(group.map((contact) => clean(contact.organization))))
          .sort((a, b) => a.localeCompare(b))
          .slice(0, MAX_CANDIDATES)
          .map((organization) => ({ label: `Someone at ${organization}`, organization })),
      }
    }
    const group = [...(groups[0] || []), ...nameless]
    const organization =
      mostCommon(group.map((contact) => clean(contact.organization))) || clean(known?.organization) || clean(query)
    // "Brigham" finds the Mass General Brigham group; the @mgb.org people with
    // no organisation on their record work there too.
    const alsoThere = contacts.filter(
      (contact) => !compact(contact.organization) && !group.includes(contact) && contactOrgMatches(organization, contact),
    )
    return { kind: 'organization', organization, contacts: sortForCalling([...group, ...alsoThere]) }
  }
  if (known) return { kind: 'organization', organization: clean(known.organization), contacts: [] }
  return null
}

/**
 * Who, on file, a request is about.
 *
 * A typed email is matched exactly first. A name is matched on the full name,
 * on the first.last of an email (including contacts whose `name` IS an
 * email), on first and last name, and finally on a first name alone — which,
 * when it hits more than one person, is ambiguous unless the organisation
 * narrows it to one. "Name at Org" always prefers the person at that org.
 *
 * Asking for a named person who is not on file at an organisation we DO know
 * returns `none`, deliberately: the requester was specific, and an outline
 * about somebody else at the same place would be prep for the wrong call.
 * The outline for `none` still picks up that organisation's verified research.
 */
export function resolvePrepTarget(
  request: PrepRequest,
  contacts: PrepContact[],
  research: PrepResearch[] = [],
): PrepTargetMatch {
  const none: PrepTargetMatch = { kind: 'none', request }
  try {
    const people = (contacts || []).filter(
      (contact): contact is PrepContact => Boolean(contact && contact._id && !String(contact._id).startsWith('drafts.')),
    )
    const known = (research || []).filter((entry) => entry && clean(entry.organization))

    // Emails typed anywhere except the note (a note may mention a colleague's address).
    const outsideNote = request.note ? request.raw.replace(request.note, ' ') : request.raw
    const typedEmails = [...new Set((outsideNote.match(EMAIL_PATTERN) || []).map((email) => email.toLowerCase()))]
    for (const email of typedEmails) {
      const exact = people.filter((contact) => contactEmail(contact) === email)
      if (exact.length) return pickPeople(exact.map((contact) => ({ contact, score: 3 })))
    }

    let personQuery = isPlaceholderPerson(request.name) ? '' : clean(request.name)
    let orgQuery = clean(request.organization)
    if (looksLikeEmail(personQuery)) {
      // No exact address on file: read it as a name at a domain.
      const [local, domain] = personQuery.toLowerCase().split('@')
      personQuery = /[._-]/.test(local) ? local.replace(/[._-]+/g, ' ') : local
      if (!orgQuery && domainLabel(domain)) orgQuery = domain
    }
    if (!personQuery && !orgQuery) return none

    if (personQuery) {
      const scored = people
        .map((contact) => ({ contact, score: personScore(personQuery, contact) }))
        .filter((entry) => entry.score > 0)
      if (orgQuery) {
        const atOrg = scored.filter((entry) => contactOrgMatches(orgQuery, entry.contact))
        if (atOrg.length) return pickPeople(atOrg)
        const orgKnown =
          people.some((contact) => contactOrgMatches(orgQuery, contact)) ||
          known.some((entry) => orgMatches(orgQuery, entry.organization))
        const strong = scored.filter((entry) => entry.score >= 2)
        // The org is unknown to us but the full name is: they may have moved,
        // or it was misremembered. Offer them rather than guess either way.
        if (!orgKnown && strong.length) {
          return { kind: 'ambiguous', candidates: sortForCalling(strong.map((entry) => entry.contact)).slice(0, MAX_CANDIDATES).map(candidateFor) }
        }
        return none
      }
      if (scored.length) return pickPeople(scored)
      // A bare phrase read as a name may be an organisation ("prep Mass General").
      return resolveOrganization(personQuery, people, known) || none
    }

    const byOrg = resolveOrganization(orgQuery, people, known)
    if (byOrg) return byOrg
    // …and a single word read as an organisation may be a person ("prep Jane").
    const asPerson = people
      .map((contact) => ({ contact, score: personScore(orgQuery, contact) }))
      .filter((entry) => entry.score > 0)
    if (asPerson.length) return pickPeople(asPerson)
    return none
  } catch {
    return none
  }
}

// ── The outline ──────────────────────────────────────────────────────────────

export type CallOutline = {
  /**
   * The header, plain text: "Call prep: Jane Doe", "Meeting prep: Leo Park",
   * "Email first: Jane Smith", "Hold off: Jane Doe". Role and organisation are
   * on the `who` line under it; the notification adds the organisation.
   */
  title: string
  /**
   * `holdOff`: they may be neither called nor emailed. The outline carries no
   * opener, voicemail or email — only who they are, why to hold off, and the
   * background — because a script is an invitation to use it.
   */
  mode: 'cold' | 'followUp' | 'meeting' | 'emailFirst' | 'holdOff'
  /** Nothing on file; built only from the request's own words. */
  generic: boolean
  contactId?: string
  organization: string
  personLabel: string
  /** ONE line: role · org · warmth · where things stand. */
  who: string
  /** The first thing rendered. Spoken lines, short enough to read in ten seconds. */
  cheatSheet: { say: string; ask: string; ifNo: string; exit: string }
  /** CALL_ASK — guidance for the caller, never spoken. Empty on a hold-off, where there is no ask. */
  askNote: string
  /** Verified research only. */
  whyNow: { signal: string; quote: string; sourceUrl: string } | null
  questions: string[]
  offer: { title: string; oneLiner: string; proof: string } | null
  ifTheySay: { theySay: string; youSay: string }[]
  plan: string | null
  agenda: string[] | null
  /** About twenty seconds spoken; never asks for a call back. */
  voicemail: string
  email: string
  /** Unverified research context and unreviewed AI drafts, each labelled. */
  background: string[]
  /** The reviewed call brief only. */
  brief: string | null
  caveats: string[]
  reassurance: string
  /** Email / phone lines — ONLY when includeContactDetails. Never rendered into blocks. */
  contactDetails?: string[]
  /** Generic mode: what the requester typed. */
  fromYourMessage?: string[]
  /**
   * Everyone else on file at the organisation, when the outline is for one of
   * several people there ("prep Crossover Health"): so the caller can see WHO
   * it is for, and prep one of the others instead.
   */
  alsoAt?: PrepCandidate[]
  /** Where things stand with the person, in a few words: "not contacted yet", "last touch 15 Sep (Contacted)". */
  standing?: string
}

/**
 * The problem each offer is about, as a person would say it on the phone.
 * Fixed copy keyed on the offer, so the ask is concrete without claiming
 * anything about the prospect we have not been told.
 */
const OFFER_COPY: Record<string, { topic: string; problem: string }> = {
  'ai-pilot-premortem': { topic: 'what could quietly stall your AI pilot', problem: 'clinical AI pilots' },
  'human-factors-510k': { topic: 'the usability side of your next FDA submission', problem: 'human factors for FDA submissions' },
  'clinician-adoption-rescue': { topic: 'why clinicians work around a tool you’ve shipped', problem: 'clinical software adoption' },
  'design-eng-capacity': { topic: 'where your team is short of design or engineering hands', problem: 'design and engineering capacity' },
  'cost-efficiency-redesign': { topic: 'the workflows that cost your staff the most time', problem: 'workflow costs' },
}

/** No offer, or one whose title is too long to say: ask about their problem, not ours. */
const NO_OFFER_COPY = { topic: 'whatever’s most stuck for you right now', problem: 'this' }

const DEFAULT_OFFER_BY_SEGMENT: Record<string, string> = {
  pharma: 'ai-pilot-premortem',
  provider: 'ai-pilot-premortem',
  healthtech: 'ai-pilot-premortem',
  payer: 'ai-pilot-premortem',
  medDevice: 'human-factors-510k',
}

const PREMORTEM_SEGMENTS = new Set(['pharma', 'provider', 'healthtech', 'payer'])

/** Open questions per segment — to get them talking about a problem they own. */
const DISCOVERY_QUESTIONS: Record<string, string[]> = {
  pharma: [
    'Where is AI showing up in your medical or commercial teams right now?',
    'Which of those efforts matters most this year?',
    'Who has to say yes before it goes wider?',
  ],
  provider: [
    'Which clinical tools or AI pilots are you rolling out this year?',
    'Where are clinicians working around the software instead of with it?',
    'Who decides whether a pilot goes wider?',
  ],
  healthtech: [
    'Who has to adopt your product for it to work — and are they?',
    'What’s the next launch or pilot on your calendar?',
    'What do customers say when a deal stalls?',
  ],
  payer: [
    'Where do members or staff get stuck today?',
    'What has to land this year for your team?',
    'Who else would need to see a fix before it could go ahead?',
  ],
  medDevice: [
    'Where are you with the submission — formative, validation, or not started?',
    'Who owns the human factors work today, inside or outside?',
    'What would make the usability file easier to defend?',
  ],
  government: [
    'Which program are you most worried about people actually using?',
    'How do you hear from the people who use it?',
    'What has to be true by the end of the year?',
  ],
  research: [
    'What are you building that needs to reach people outside the lab?',
    'Who uses the tools your team makes today?',
    'Where does work stall between prototype and real use?',
  ],
  default: [
    'What’s the biggest thing on your plate this quarter?',
    'Where does software get in the way of the people who use it?',
    'Who else cares about that problem?',
  ],
}

const WARMTH_PHRASE: Record<string, string> = {
  hot: 'hot — would take a call',
  warm: 'warm — knows us',
  cool: 'cool — needs a re-intro',
  cold: 'cold — name only',
}

const statusTitle = (status: string) =>
  (OUTREACH_STATUS_OPTIONS.find((option) => option.value === status)?.title || '').split(' — ')[0]

type Touch = { at: string; statusAfter: string; channel: string; by: string }

function lastTouchOf(contact: PrepContact | undefined): Touch | null {
  if (!contact) return null
  let best: Touch | null = null
  let bestTime = Number.NEGATIVE_INFINITY
  for (const interaction of contact.interactions || []) {
    const at = time(interaction?.at)
    if (at !== null && at > bestTime) {
      best = {
        at: String(interaction.at),
        statusAfter: clean(interaction.statusAfter),
        channel: clean(interaction.channel),
        by: clean(interaction.by),
      }
      bestTime = at
    }
  }
  const contacted = time(contact.lastContactedAt)
  if (contacted !== null && contacted > bestTime) best = { at: String(contact.lastContactedAt), statusAfter: '', channel: '', by: '' }
  return best
}

/**
 * Was the last touch made by the person about to make this one? Compared on
 * the first name, because the board says "Juhan" and a spoken name may be
 * "Juhan Sonin". Unknown either way is NOT a match: "our call" is true
 * whoever made it, while "my call" said about a colleague's call is a
 * sentence the prospect can catch out.
 */
function touchedBy(touch: Touch, sender: string): boolean {
  const first = (value: string) => norm(value).split(' ')[0] || ''
  return Boolean(first(touch.by)) && first(touch.by) === first(sender)
}

/**
 * How to refer to the last touch out loud. Derived from the channel and the
 * status it left, never from the free-text notes — and careful not to say
 * "when we spoke" about a call nobody answered, or "my call" about one a
 * colleague made.
 */
function followUpClause(touch: Touch | null, sender: string): string {
  if (!touch) return 'following up on my earlier message'
  const day = formatDay(touch.at)
  if (!day) return 'following up on my earlier message'
  const whose = touchedBy(touch, sender) ? 'my' : 'our'
  const engaged = ['responded', 'meeting', 'opportunity', 'won', 'dormant'].includes(touch.statusAfter)
  if (['phone', 'video', 'inPerson'].includes(touch.channel)) {
    return engaged ? `following up on when we spoke on ${day}` : `following up on ${whose} call on ${day}`
  }
  if (['email', 'linkedin'].includes(touch.channel)) {
    return engaged ? `following up on your note from ${day}` : `following up on ${whose} note from ${day}`
  }
  return `following up on when we were last in touch, on ${day}`
}

/** The first sentence of a reviewed opener, minus its greeting, if it is short enough to say. */
function openerReason(opener: string): string {
  const withoutGreeting = clean(opener).replace(/^(?:hi|hello|hey|dear|good (?:morning|afternoon))\b[^,.!?—–-]*[,.!?—–-]\s*/i, '')
  const sentence = (withoutGreeting.match(/^.*?[.!?](?=\s|$)/) || [withoutGreeting])[0].trim()
  if (!sentence || sentence.length > 220) return ''
  return sentence
}

/** A verified signal as a spoken clause: "I read that Acme spun out AIwithCare". */
function signalClause(signal: string): string {
  const text = clean(signal).replace(/[.\s]+$/, '')
  if (!text || text.length > 240) return ''
  return `I read that ${text}`
}

function pickResearch(organization: string, research: PrepResearch[]) {
  const matching = organization ? (research || []).filter((entry) => entry && orgMatches(organization, entry.organization)) : []
  const verified = matching.find((entry) => {
    if (entry.verification?.status !== 'verified' || !clean(entry.recentSignal)) return false
    return (entry.verification.evidence || []).some((evidence) => clean(evidence?.quote))
  })
  return { matching, verified }
}

/**
 * Which offer to have ready: the contact's own suggestion, then the
 * organisation research's, then the segment's default, then the studio's
 * general one — whichever is first in the live catalogue.
 *
 * `assumed` marks the last resort. It is still worth having in the back
 * pocket, but it was chosen knowing nothing about them, so the spoken lines do
 * not name the problem it solves as though it were theirs.
 */
function pickOffer(
  contact: PrepContact | undefined,
  segment: string,
  research: PrepResearch[],
  offers: PrepOffer[],
): { offer: PrepOffer | null; assumed: boolean } {
  const available = (offers || []).filter((offer) => offer && clean(offer.key) && clean(offer.title))
  const keys: { key: string; assumed: boolean }[] = [
    { key: clean(contact?.suggestedOfferKey), assumed: false },
    ...research.map((entry) => ({ key: clean(entry.suggestedOfferKey), assumed: false })),
    { key: DEFAULT_OFFER_BY_SEGMENT[segment] || '', assumed: false },
    { key: 'clinician-adoption-rescue', assumed: true },
  ].filter((entry) => entry.key)
  for (const { key, assumed } of keys) {
    const offer = available.find((candidate) => clean(candidate.key) === key)
    if (offer) return { offer, assumed }
  }
  return { offer: null, assumed: true }
}

function offerTopic(offer: PrepOffer | null): { topic: string; problem: string } {
  if (!offer) return NO_OFFER_COPY
  const known = OFFER_COPY[clean(offer.key)]
  if (known) return known
  const title = clean(offer.title)
  return title.length <= 60 ? { topic: title, problem: 'this' } : NO_OFFER_COPY
}

/** "A fixed-scope…" → "a fixed-scope…", but "AI pilots" stays "AI pilots". */
const lowerFirst = (value: string) =>
  /^[A-Z](?=[a-z]|\s+[a-z])/.test(value) ? value.charAt(0).toLowerCase() + value.slice(1) : value

/** The studio's calendar date, YYYY-MM-DD. */
function studioDateKey(now: Date): string {
  if (Number.isNaN(now.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

const PHONE_BLOCK_REASON: Record<Exclude<ChannelBlock, ''>, string> = {
  doNotUse: 'they asked not to be called',
  unavailable: 'phone isn’t an option for them',
}

const EMAIL_BLOCK_REASON: Record<Exclude<ChannelBlock, ''>, string> = {
  doNotUse: 'they asked not to be emailed',
  unavailable: 'email isn’t an option for them',
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/**
 * Compose the outline for one call.
 *
 * The channels come first, because nothing else matters if we may not use
 * them: someone who may be neither called nor emailed gets `holdOff` and no
 * script at all; someone who may not be called is email only; someone who may
 * not be emailed never gets "email first", an email draft, or a voicemail or
 * sign-off that promises an email.
 *
 * Then mode decides the shape: a booked meeting gets an agenda instead of a
 * cold opener; someone with no relationship and no history gets "email
 * first", because a cold call with nothing behind it is the most stressful and
 * least useful call there is.
 *
 * `request` is what the person asked, when there was a message (not a button
 * press). It is read ONLY for whether a call or meeting is already booked —
 * "prep me for my meeting with Jane tomorrow" is meeting prep whatever Jane's
 * record says, and telling someone with a call at 3pm to "email first" would
 * put words in their mouth ("I sent you a note on Thursday") about an email
 * they never sent. For a `none` match the request inside the match is used.
 */
export function composeCallOutline(input: {
  match: Exclude<PrepTargetMatch, { kind: 'ambiguous' }>
  research: PrepResearch[]
  offers: PrepOffer[]
  evidence: PrepEvidence[]
  senderName: string
  includeContactDetails: boolean
  now: Date
  request?: PrepRequest | null
}): CallOutline {
  const { match, now } = input
  // What was typed about somebody NOT on file — the only source of their details.
  const request = match.kind === 'none' ? match.request : null
  // What was asked, whoever it resolved to — read only for booking words.
  const asked = request || input.request || null
  const contact = match.kind === 'contact' ? match.contact : match.kind === 'organization' ? (match.contacts || [])[0] : undefined

  const typedName = request ? (isPlaceholderPerson(request.name) ? '' : clean(request.name)) : ''
  const typedDomain = looksLikeEmail(typedName) ? emailDomain(typedName.toLowerCase()) : ''
  const organization = clean(
    contact?.organization ||
      (match.kind === 'organization' ? match.organization : '') ||
      request?.organization ||
      (typedDomain && domainLabel(typedDomain) ? typedDomain : ''),
  )
  const orgLabel = clipWords(withoutContactDetails(organization), 120)
  const role = clipWords(withoutContactDetails(contact ? contact.role : request?.role), 80)
  const sender = clipWords(input.senderName, 60) || '[your name]'

  const personLabel = contact
    ? personLabelFor(contact, orgLabel)
    : typedName && !looksLikeEmail(typedName)
      ? clipWords(withoutContactDetails(typedName), 80)
      : firstNameFor({ name: typedName })
        ? clipWords(firstNameFor({ name: typedName }), 40)
        : orgLabel
          ? `someone at ${orgLabel}`
          : 'someone'
  const first = clipWords(contact ? firstNameFor(contact) : firstNameFor({ name: typedName }), 40)
  const hasPerson = Boolean(contact) || Boolean(typedName)
  const greet = first ? `Hi ${first}` : 'Hi'

  const status = clean(contact?.status)
  const warmth = clean(contact?.warmth)
  // Somebody not on file whom the requester says they KNOW — "met him at
  // HIMSS", "worked with her at Partners" — is not a cold call, and treating
  // them as one (email first, "I came across your work") would have the
  // caller introduce themselves to a person they have already met. The note is
  // their own words, so it is used only as the reminder of how they know them.
  const typedNote = request ? clipWords(withoutContactDetails(request.note), 120) : ''
  const typedRelationship = Boolean(typedNote) && TYPED_RELATIONSHIP.test(typedNote)
  const howWeKnow =
    clipWords(withoutContactDetails(contact?.howWeKnow), 120) || (typedRelationship ? typedNote : '')
  const knowsUs = ['hot', 'warm', 'cool'].includes(warmth) || typedRelationship
  const reviewed = Boolean(clean(contact?.researchReviewedAt))
  const touch = lastTouchOf(contact)
  const touched =
    Boolean(touch) || (contact?.interactions || []).length > 0 || IN_CONVERSATION.includes(status) || FINISHED.includes(status)

  const phoneBlock = channelBlock(contact, 'phone')
  const emailBlock = channelBlock(contact, 'email')

  // A request that names a time or a meeting is a call that is happening;
  // telling that person to "email first" would be wrong. Same rule whoever
  // the request resolved to.
  const raw = asked ? String(asked.raw || '').replace(asked.note || '\u0000', ' ') : ''
  const requestIsMeeting = Boolean(asked) && /\bmeeting\b/i.test(raw)
  const requestIsBooked =
    Boolean(asked) &&
    (TIME_PHRASES.some((pattern) => new RegExp(pattern.source, 'i').test(raw)) || /\b(?:my|our) (?:call|chat)\b/i.test(raw))

  // "Email first" needs somebody to email: calling an organisation with nobody
  // on file is a switchboard call, which is its own (cold) opener.
  const noRelationship = !touched && !typedRelationship && (!warmth || warmth === 'cold' || warmth === 'unknown')
  let mode: CallOutline['mode']
  if (phoneBlock && emailBlock) mode = 'holdOff'
  else if (status === 'meeting' || requestIsMeeting) mode = 'meeting'
  else if (phoneBlock) mode = 'emailFirst'
  else if (!emailBlock && hasPerson && noRelationship && !requestIsBooked) mode = 'emailFirst'
  else mode = touched ? 'followUp' : 'cold'
  const holdOff = mode === 'holdOff'
  const holdOffReason =
    phoneBlock === 'doNotUse' && emailBlock === 'doNotUse'
      ? 'they asked not to be called or emailed'
      : phoneBlock && emailBlock
        ? `${PHONE_BLOCK_REASON[phoneBlock]}, and ${EMAIL_BLOCK_REASON[emailBlock]}`
        : ''

  const segment = clean(contact?.segment || contact?.researchSuggestedSegment)
  const { matching: researchForOrg, verified } = pickResearch(organization, input.research || [])
  const quoteEvidence = verified?.verification?.evidence?.find((evidence) => clean(evidence?.quote))
  // No "why now" for someone we must not contact: there is no now.
  const whyNow =
    verified && quoteEvidence && !holdOff
      ? {
          signal: withoutContactDetails(verified.recentSignal),
          // The quote is shown verbatim: it is what was checked against the page.
          quote: String(quoteEvidence.quote).trim(),
          sourceUrl: clean(quoteEvidence.textFragmentUrl || quoteEvidence.url),
        }
      : null

  const { offer: offerRecord, assumed: offerAssumed } = pickOffer(contact, segment, researchForOrg, input.offers)
  const evidenceById = new Map((input.evidence || []).filter((item) => item && item._id).map((item) => [item._id, item]))
  const evidenceTitles = (contact?.relevantEvidence || [])
    .map((ref) => evidenceById.get(clean(ref?.evidenceId)))
    .filter((item): item is PrepEvidence => Boolean(item && clean(item.title)))
    .filter((item, index, all) => all.findIndex((other) => other._id === item._id) === index)
    .slice(0, 2)
    .map((item) => `${clean(item.title)}${clean(item.client) ? ` (${clean(item.client)})` : ''}`)
  const offer =
    offerRecord && !holdOff
      ? {
          title: clean(offerRecord.title),
          oneLiner: clean(offerRecord.oneLiner),
          proof: [clean(offerRecord.proofPoints), evidenceTitles.length ? `Related work: ${evidenceTitles.join('; ')}.` : '']
            .filter(Boolean)
            .join(' '),
        }
      : null
  const { topic, problem } = offerAssumed ? NO_OFFER_COPY : offerTopic(offerRecord)

  const todayLong = formatWeekday(now)
  const deadline = formatWeekdayDate(replyDeadline(now))
  const clause = followUpClause(touch, sender)

  // ── Cheat sheet ──
  const permission = 'Have you got two minutes, or is this a bad time?'
  let say: string
  if (holdOff) {
    say = ''
  } else if (mode === 'meeting') {
    say = `Thanks for making the time${first ? `, ${first}` : ''}. Can I take two minutes on why I asked, then hand it over to you?`
  } else if (mode === 'followUp') {
    say = `${greet}, it’s ${sender} from GoInvo — ${clause}. Is now an OK time for two minutes?`
  } else if (mode === 'emailFirst' && phoneBlock) {
    say = `Thanks for getting back to me${first ? `, ${first}` : ''}. Is now a good time, or would another day suit you better?`
  } else if (mode === 'emailFirst') {
    say = `${greet}, it’s ${sender} from GoInvo — I sent you a short note on ${todayLong}. ${permission}`
  } else if (!hasPerson && orgLabel) {
    say = `Hi, it’s ${sender} from GoInvo — I’m hoping to reach whoever looks after ${problem === 'this' ? 'digital products' : problem} at ${orgLabel}. Is that you, or could you point me the right way?`
  } else {
    // One reason for calling, most personal first: how we know them, then a
    // reviewed opener, then what verified research found, then plain honesty.
    const reviewedOpener = reviewed ? openerReason(withoutContactDetails(contact?.suggestedOpener)) : ''
    const signal = whyNow ? signalClause(whyNow.signal) : ''
    const reason =
      (knowsUs && howWeKnow ? `[how you know them: ${howWeKnow}]` : '') ||
      reviewedOpener ||
      (signal ? `${signal}, and I had a thought about it` : '') ||
      'I’m calling out of the blue, so I’ll be quick'
    say = `${greet}, it’s ${sender} from GoInvo — ${reason}${/[.!?]$/.test(reason) ? '' : '.'} ${permission}`
  }

  // The sign-off never promises an email to someone we may not email, and
  // never thanks someone who asked not to be called for "picking up".
  const cheatSheet = holdOff
    ? { say: '', ask: '', ifNo: '', exit: '' }
    : mode === 'meeting'
      ? {
          say,
          ask: 'What would a useful next step look like for you — and who else should be part of it?',
          ifNo: 'That’s fine. Is there anything I could send that would help in the meantime?',
          exit: emailBlock
            ? 'Thanks for the time — how would you like me to follow up with what we heard and the next step?'
            : 'Thanks for the time — I’ll send a short note today with what we heard and the next step.',
        }
      : {
          say,
          ask: `Would it be worth 30 minutes together — free — on ${topic}? Who else should be in the room?`,
          ifNo: `Totally fair. Is there someone else who owns ${problem}? Otherwise I’ll leave you be.`,
          exit: emailBlock
            ? 'Thanks for picking up — I’ll let you get back to your day.'
            : phoneBlock
              ? 'Thanks for getting in touch — I’ll send a two-line note so you have it.'
              : 'Thanks for picking up — mind if I send a two-line note so you have it?',
        }

  // ── If they say… ──
  const whoIsThis = howWeKnow
    ? `It’s ${sender} from GoInvo — [remind them how you know each other: ${howWeKnow}].`
    : `I’m ${sender} at GoInvo, a design studio in Arlington — ${
        whyNow && signalClause(whyNow.signal)
          ? `${signalClause(whyNow.signal)}, and wanted to talk to whoever looks after it.`
          : role
            ? `I came across your work as ${role}${orgLabel ? ` at ${orgLabel}` : ''}.`
            : orgLabel
              ? `I came across ${orgLabel}’s work and wanted to reach whoever looks after ${problem === 'this' ? 'it' : problem}.`
              : 'I’m reaching out to people working on healthcare software.'
      }`
  // Nothing to answer on a call that must not happen — and a booked meeting
  // is not a cold call: "who is this, how did you get my number" has no place
  // in the prep for a meeting they said yes to.
  const ifTheySay = holdOff || mode === 'meeting' ? [] : [
    {
      theySay: 'Not a good time.',
      youSay: phoneBlock ? 'No problem — I’ll follow up by email instead.' : 'No problem — when would be better? I’ll call back then.',
    },
    {
      theySay: 'Just send me an email.',
      // Their say-so on the call is what lifts a "no email" — the caveat says to update the record.
      youSay: emailBlock ? 'Happy to — what’s the best address for you?' : 'Will do. Is there one thing you’d want it to cover?',
    },
    { theySay: 'Who is this? How did you get my number?', youSay: whoIsThis },
    { theySay: 'I’m not the right person.', youSay: 'Who would you point me to? Mind if I say you sent me?' },
    {
      theySay: 'We already have a vendor for that.',
      youSay: 'That’s fine — this isn’t about replacing anyone. Is there one problem that isn’t moving the way you’d like?',
    },
    {
      theySay: 'There’s no budget.',
      youSay: 'Understood. The 30 minutes is free, and if nothing comes of it, that’s fine too. Would later in the year be better?',
    },
    { theySay: 'Not interested.', youSay: 'Thanks for telling me straight. I won’t take more of your time.' },
  ]

  // ── Plan / agenda ──
  let plan: string | null = null
  if (holdOff) {
    plan = `Don’t call or email — ${holdOffReason}. Check their record in the Studio before any outreach; if something has changed, update it there and ask me again.`
  } else if (mode === 'emailFirst') {
    if (phoneBlock) {
      plan = `Email only — ${PHONE_BLOCK_REASON[phoneBlock]}. If there’s no reply by ${deadline}, one short follow-up email is plenty.`
    } else {
      plan = `Send it today. If there’s no reply by ${deadline}, call and open with “I sent you a note on ${todayLong}”.`
    }
  } else if (emailBlock && mode !== 'meeting') {
    plan = `Phone only — ${EMAIL_BLOCK_REASON[emailBlock]}, so there’s no email draft. If it goes to voicemail, try again another day.`
  }
  const agenda =
    mode === 'meeting'
      ? [
          '5 min — thanks, who we are, and why we asked. Keep it short.',
          '15 min — their problem. Ask the questions below, then mostly listen.',
          '10 min — agree one next step, and who else should be in the room.',
          emailBlock
            ? `After — ${EMAIL_BLOCK_REASON[emailBlock]}, so agree in the meeting how they’d like to hear back.`
            : 'After — send a short note within a day: what you heard, the next step, anything you promised.',
        ]
      : null

  // ── Questions ──
  const questions = holdOff
    ? []
    : [...(DISCOVERY_QUESTIONS[segment] || DISCOVERY_QUESTIONS.default), ...(PREMORTEM_SEGMENTS.has(segment) ? [PREMORTEM_QUESTION] : [])]

  // ── Voicemail (about twenty seconds; never asks for a call back) ──
  // None for someone we may not call — a voicemail script is a call script.
  // Nor does it promise an email to someone we may not email.
  const voicemail = phoneBlock
    ? ''
    : mode === 'meeting'
      ? emailBlock
        ? `${greet}, it’s ${sender} from GoInvo — I’m on for our meeting now. I’ll try you again in a few minutes, so there’s no need to call back. Thanks.`
        : `${greet}, it’s ${sender} from GoInvo — I’m on for our meeting now. I’ll email a couple of other times, so there’s no need to call back. Thanks.`
      : mode === 'followUp'
        ? emailBlock
          ? `${greet}, it’s ${sender} from GoInvo, ${clause}. I’ll try you again later in the week — no need to call back. Thanks, and have a good day.`
          : `${greet}, it’s ${sender} from GoInvo, ${clause}. I’ll send a short email so it’s all in one place — no need to call back. Thanks, and have a good day.`
        : emailBlock
          ? `${greet}, it’s ${sender} from GoInvo${knowsUs ? '' : ', a design studio in Arlington'}. I’ll try you again later in the week, so there’s no need to call back. Thanks, and have a good day.`
          : `${greet}, it’s ${sender} from GoInvo${knowsUs ? '' : ', a design studio in Arlington'}. I’m sending you a short email with the reason I called, so there’s no need to call back. Thanks, and have a good day.`

  // ── Email draft ──
  const hello = first ? `Hi ${first},` : 'Hi,'
  const signOff = `— ${sender}, GoInvo`
  let email: string
  if (holdOff || emailBlock) {
    // No draft for someone we may not email: a ready-to-send draft gets sent.
    email = ''
  } else if (mode === 'meeting') {
    email = [
      'Subject: Thanks for today',
      '',
      hello,
      '',
      'Thanks for the time today. Here’s what I heard:',
      '• [the problem, in their words]',
      '',
      'The next step we agreed:',
      '• [who does what, by when]',
      '',
      'If I got any of that wrong, tell me and I’ll fix it.',
      '',
      signOff,
    ].join('\n')
  } else if (mode === 'followUp') {
    email = [
      'Subject: Following up',
      '',
      hello,
      '',
      `${clause.charAt(0).toUpperCase()}${clause.slice(1)}. The offer stands: 30 minutes, free, on ${topic}.`,
      '',
      'If the timing’s wrong, one line back saying “not now” is genuinely useful, and I’ll stop nudging.',
      '',
      signOff,
    ].join('\n')
  } else if (verified && clean(verified.reachableAbout) && quoteEvidence) {
    const entry: CallSheetEntry = {
      organization: orgLabel,
      contacts: contact ? [contact] : typedName ? [{ name: typedName }] : [],
      signal: withoutContactDetails(verified.recentSignal),
      quote: String(quoteEvidence.quote),
      sourceUrl: clean(quoteEvidence.textFragmentUrl || quoteEvidence.url),
      opening: withoutContactDetails(verified.reachableAbout),
      offer: offerRecord ? { key: offerRecord.key, title: offerRecord.title, oneLiner: offerRecord.oneLiner } : null,
      context: '',
    }
    // draftOutreachNote already says "a short fixed-scope piece of work", so
    // a one-liner that opens "A fixed-scope…" said it twice in one sentence.
    const oneLiner = clean(offerRecord?.oneLiner)
      .replace(/[.\s]+$/, '')
      .replace(/^(?:an?\s+)?(?:short\s*,?\s+)?fixed[- ]scope\s*,?\s+/i, '')
    if (entry.offer) entry.offer = { ...entry.offer, oneLiner }
    // It also lowercases the whole one-liner, which turns "AI" into "ai" in
    // front of a prospect; put the capitals back.
    let note = draftOutreachNote(entry, sender)
    if (oneLiner) note = note.replace(oneLiner.toLowerCase(), lowerFirst(oneLiner))
    email = ['Subject: A quick thought from GoInvo', '', note].join('\n')
  } else {
    const reviewedOpener = reviewed ? withoutContactDetails(contact?.suggestedOpener).replace(/^(?:hi|hello|hey|dear)\b[^,.!?—–-]*[,.!?—–-]\s*/i, '') : ''
    email = [
      'Subject: A quick question from GoInvo',
      '',
      hello,
      '',
      `I’m ${sender} from GoInvo, a design studio in Arlington that works on healthcare software.`,
      // What the requester typed is NOT repeated here: it is under "From your
      // message" in the thread, and a relationship note ("met at HIMSS") is
      // already the line above — the draft carried it twice.
      ...(howWeKnow ? ['', `[Say how you know each other, in your own words: ${howWeKnow}]`] : []),
      ...(reviewedOpener ? ['', clipWords(reviewedOpener, 700)] : []),
      ...(offerRecord
        ? [
            '',
            `One thing we do that might fit: ${clean(offerRecord.title)}${
              clean(offerRecord.oneLiner) ? ` — ${lowerFirst(clean(offerRecord.oneLiner).replace(/[.\s]+$/, ''))}` : ''
            }.`,
          ]
        : []),
      '',
      'Would 30 minutes be useful — free, on a problem you already own? If the timing’s wrong, a one-line “not now” is genuinely helpful.',
      '',
      signOff,
    ].join('\n')
  }

  // ── Brief, background, caveats ──
  const brief = reviewed && clean(contact?.callBrief) ? clipWords(withoutContactDetails(contact?.callBrief), 1500) : null
  const background: string[] = []
  for (const entry of researchForOrg) {
    const context = clean(entry.context)
    if (context) background.push(`Not verified — don’t repeat as fact: ${clipWords(withoutContactDetails(context), 600)}`)
  }
  if (!reviewed && clean(contact?.callBrief)) {
    background.push(`AI call brief, not reviewed — don’t repeat as fact: ${clipWords(withoutContactDetails(contact?.callBrief), 600)}`)
  }
  if (!reviewed && clean(contact?.suggestedOpener)) {
    background.push(`AI opener, not reviewed — don’t use it as written: ${clipWords(withoutContactDetails(contact?.suggestedOpener), 400)}`)
  }

  const caveats: string[] = []
  const generic = match.kind === 'none' && researchForOrg.length === 0
  if (generic) caveats.push('Nothing on file for them yet — this is built from your message and the studio’s standard guidance.')
  else if (!contact) caveats.push(`Nobody${hasPerson ? ' by that name' : ''} is on file${orgLabel ? ` at ${orgLabel}` : ''} yet — only our research on the organization.`)
  if (holdOff) {
    caveats.push(`${capitalise(holdOffReason)} — check the Studio before any outreach.`)
  } else if (phoneBlock) {
    caveats.push(phoneBlock === 'doNotUse' ? 'They asked not to be called — email only.' : 'Phone is marked unavailable for them — email instead.')
  } else if (emailBlock) {
    caveats.push(
      emailBlock === 'doNotUse'
        ? 'They asked not to be emailed — keep it to the phone. If they ask for an email on the call, update their record in the Studio afterwards.'
        : 'Email is marked unavailable for them — keep it to the phone. If they give you an address on the call, add it in the Studio.',
    )
  }
  if (contact && (contact.personVerified === false || ['low', 'none'].includes(clean(contact.identityConfidence)))) {
    caveats.push('We couldn’t confirm this is the right person — check who you’re speaking to early.')
  }
  if (status === 'won') caveats.push('Already a client (marked Won) — this is an account conversation, not a pitch.')
  else if (['lost', 'closed', 'dormant'].includes(status)) {
    caveats.push(`Marked ${statusTitle(status)} on file — check the Studio for why before calling.`)
  }
  if (!reviewed && (clean(contact?.callBrief) || clean(contact?.suggestedOpener))) {
    caveats.push('Their research hasn’t been reviewed yet, so it’s only under Background — don’t read it out.')
  }
  // Who else is on file there travels as `alsoAt`, shown near the top where
  // the caller can see who the outline is for — not as a caveat at the bottom
  // of the thread that once read "Also on file at Crossover Health: someone."
  const alsoAt =
    match.kind === 'organization' && match.contacts.length > 1
      ? match.contacts.slice(1).map((other) => ({
          label: personLabelFor(other, ''),
          contactId: other._id,
          organization: clean(other.organization),
        }))
      : undefined

  // ── Who, in one line ──
  const standing = touch
    ? `last touch ${formatDay(touch.at)}${statusTitle(touch.statusAfter || status) ? ` (${statusTitle(touch.statusAfter || status)})` : ''}`
    : contact
      ? touched
        ? statusTitle(status) || 'in touch before'
        : `not contacted yet${statusTitle(status) ? ` (${statusTitle(status)})` : ''}`
      : 'not on file yet'
  // The same, short, for the line that says who an organisation's outline is for.
  const shortStanding = contact
    ? touch
      ? `last touch ${formatDay(touch.at)}`
      : touched
        ? statusTitle(status) || 'in touch before'
        : 'not contacted yet'
    : ''
  const identityDoubt =
    contact && (contact.personVerified === false || ['low', 'none'].includes(clean(contact.identityConfidence))) ? 'identity not confirmed' : ''
  const who = [
    role,
    orgLabel,
    contact ? WARMTH_PHRASE[warmth] || 'relationship unknown' : request ? 'from your message' : '',
    standing,
    identityDoubt,
  ]
    .filter(Boolean)
    .join(' · ')

  const reassurance = holdOff
    ? 'Nothing to do on this one today. If the record looks out of date, fix it in the Studio and ask me again.'
    : mode === 'meeting'
      ? 'You don’t have to pitch. Listen, take notes, and agree one next step — that’s a good meeting.'
      : mode === 'emailFirst'
        ? 'Today’s job is just the email. No reply for a few days is normal — that’s what the follow-up is for.'
        : 'Your only job on this call is to find out whether they own a problem we can help with. A quick no is a fine outcome — log it and move on.'

  // The title leads with what kind of prep this is, because it is also what a
  // notification shows: a hold-off says so before anyone reads further.
  const lead = holdOff ? 'Hold off' : mode === 'meeting' ? 'Meeting prep' : mode === 'emailFirst' ? 'Email first' : 'Call prep'
  const title = `${lead}: ${personLabel}`

  const outline: CallOutline = {
    title,
    mode,
    generic,
    ...(contact ? { contactId: contact._id } : {}),
    organization: orgLabel,
    personLabel,
    who,
    cheatSheet,
    askNote: holdOff ? '' : CALL_ASK,
    whyNow,
    questions,
    offer,
    ifTheySay,
    plan,
    agenda,
    voicemail,
    email,
    background,
    brief,
    caveats,
    reassurance,
    ...(shortStanding ? { standing: shortStanding } : {}),
    ...(alsoAt?.length ? { alsoAt } : {}),
  }

  if (input.includeContactDetails) {
    const details: string[] = []
    const address = contact ? contactEmail(contact) : ''
    if (address) details.push(`Email: ${address}`)
    if (clean(contact?.phone)) details.push(`Phone: ${clean(contact?.phone)}`)
    outline.contactDetails = details
  }

  if (request) {
    const typed = [
      typedName && !looksLikeEmail(typedName) ? `Name: ${clipWords(withoutContactDetails(typedName), 120)}` : '',
      clean(request.role) ? `Role: ${clipWords(withoutContactDetails(request.role), 120)}` : '',
      clean(request.organization) ? `Organization: ${clipWords(withoutContactDetails(request.organization), 160)}` : '',
      clean(request.note) ? `Note: ${clipWords(withoutContactDetails(request.note), 600)}` : '',
    ].filter(Boolean)
    outline.fromYourMessage = typed
  }

  return outline
}

// ── Block Kit ────────────────────────────────────────────────────────────────

/** Escape a record's text, then clip it without cutting an entity in half. */
const safe = (value: unknown, max: number) => clipSlackText(escapeSlackText(clean(value)), max)

const plainClip = (value: unknown, max: number) => clipWords(String(value ?? ''), max) || ' '

const section = (text: string): Block => ({
  type: 'section',
  text: { type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) },
})

const context = (text: string): Block => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) }],
})

const bullets = (items: string[], max: number) => items.map((item) => `• ${safe(item, max)}`).join('\n')

/** A button whose value would push the message over Slack's cap is dropped, not truncated into broken JSON. */
function actionButton(text: string, actionId: string, value: string | undefined, style?: 'primary'): Block | null {
  if (!value || value.length > SLACK_LIMITS.buttonValue) return null
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text: plainClip(text, SLACK_LIMITS.buttonText) },
    value,
    ...(style ? { style } : {}),
  }
}

/** "Jane Doe (Mass General Brigham)" — who, and where, in a notification. */
function whoAndWhere(outline: CallOutline): string {
  const person = clean(outline.personLabel)
  const org = clean(outline.organization)
  return !person.startsWith('someone') && org ? `${person} (${org})` : person || org || 'someone'
}

/**
 * "2 people on file at Crossover Health — this is for Sam Rivera (not
 * contacted yet). Also: Scott" — so an organisation's outline says whose call
 * it is, and one press preps the other person instead. Only people with a
 * real name are named; the rest are counted.
 */
function alsoAtBlock(outline: CallOutline): Block | null {
  const others = (outline.alsoAt || []).filter(Boolean)
  if (!others.length) return null
  const named = others.map((other) => clean(other.label)).filter((label) => label && !/^someone\b/i.test(label))
  const shown = named.slice(0, 3)
  const more = others.length - shown.length
  const standing = clean(outline.standing)
  const place = clean(outline.organization) || 'this organisation'
  const also = shown.length
    ? ` Also: ${shown.map((name) => safe(name, 80)).join(', ')}${more > 0 ? ` and ${more} more` : ''}.`
    : ` And ${more} more with no name on file.`
  const text =
    `${others.length + 1} people on file at ${safe(place, 120)} — this is for ${safe(outline.personLabel, 120)}` +
    `${standing ? ` (${safe(standing, 80)})` : ''}.${also}`
  // One other person: one press preps them. Several: which one a lone Prep
  // button meant would be a guess.
  const only = others.length === 1 && clean(others[0].contactId) ? others[0] : null
  const prep = only
    ? actionButton(LABEL.PREP, MARQUETA_ACTION.prepCall, encodeContactRef({ contactId: only.contactId, organization: only.organization }))
    : null
  return { ...section(text), ...(prep ? { accessory: prep } : {}) }
}

/** The four spoken lines, under a heading that says when they are for. */
function cheatSheetText(outline: CallOutline, heading: string): string {
  const cheatSheet = outline.cheatSheet || { say: '', ask: '', ifNo: '', exit: '' }
  return [
    `*${heading}*`,
    clean(cheatSheet.say) ? `*Say:* ${safe(cheatSheet.say, 700)}` : '',
    clean(cheatSheet.ask) ? `*Ask:* ${safe(cheatSheet.ask, 400)}` : '',
    clean(cheatSheet.ifNo) ? `*If no:* ${safe(cheatSheet.ifNo, 400)}` : '',
    clean(cheatSheet.exit) ? `*Exit:* ${safe(cheatSheet.exit, 300)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * An email draft in a code fence. The body is clipped BEFORE fencing, so the
 * closing fence always survives, and a stray ``` inside a record cannot close
 * the fence early.
 */
function fencedEmail(email: string, max: number): string {
  const body = clipSlackText(escapeSlackText(String(email).replace(/```/g, "'''")), Math.max(200, max))
  return `\`\`\`${body}\`\`\``
}

function ifTheySayText(outline: CallOutline): string {
  return [
    '*If they say…*',
    ...outline.ifTheySay.slice(0, 8).map((line) => `• _${safe(line.theySay, 120)}_ → ${safe(line.youSay, 320)}`),
  ].join('\n')
}

/**
 * "Call prep: Jane Doe" as a caller reads it: TWO messages, because what to
 * do must be on screen without scrolling.
 *
 * `first`, top to bottom: the header; who they are; (for an organisation) who
 * the outline is for and who else is there; THE ONE THING TO DO NOW — the four
 * spoken lines, or, when the right first touch is an email, the email itself;
 * then the actions (`Log it…`, `Add <Name> to outreach`, `Open Outreach`),
 * right under it, where a caller who has just hung up can find them; then the
 * reference below: agenda, why now, questions, what to say if they push back.
 * The actions used to come last, sixty phone lines down.
 *
 * `second` goes in the thread: the kit that is only needed if the call goes a
 * particular way — the offer, a voicemail, the email draft — plus the labelled
 * background that must not be read out. For an email-first outline the email
 * is already on top, so the thread holds what to say if they pick up instead,
 * and no voicemail: the first touch is not a call.
 *
 * A meeting has no "If they say…": that is cold-call pushback, and the other
 * person already said yes. A hold-off puts "Don't contact — check the Studio"
 * and its reason where the spoken lines would be, with no script under it to
 * read by mistake, and nothing green.
 *
 * `text` is the notification ("Call prep: Jane Doe (Mass General Brigham)");
 * `threadText` the second message's ("Offer, voicemail and email draft for
 * Jane Doe"). Contact details are never rendered here, whatever the outline
 * carries.
 */
export function buildCallOutlineMessages(
  outline: CallOutline,
  opts: { studioUrl?: string; logRef?: string; addRef?: string } = {},
): { first: Block[]; second: Block[]; text: string; threadText: string } {
  const holdOff = outline.mode === 'holdOff'
  const emailFirst = outline.mode === 'emailFirst' && Boolean(clean(outline.email))
  const first: Block[] = []
  first.push({ type: 'header', text: { type: 'plain_text', text: plainClip(outline.title, SLACK_LIMITS.headerText), emoji: false } })
  if (clean(outline.who)) first.push(context(safe(outline.who, 1000)))
  const also = alsoAtBlock(outline)
  if (also) first.push(also)

  // The one thing to do now.
  if (holdOff) {
    first.push(section(`*Don’t contact — check the Studio*\n${safe(outline.plan || 'They asked not to be called or emailed.', 800)}`))
  } else if (emailFirst) {
    const plan = outline.plan ? `\n*Plan* ${safe(outline.plan, 600)}` : ''
    const room = SLACK_LIMITS.sectionText - '*Today: send this email*\n'.length - plan.length - 10
    first.push(section(`*Today: send this email*\n${fencedEmail(outline.email, room)}${plan}`))
  } else {
    const heading = outline.mode === 'meeting' ? 'In the meeting' : 'On the call'
    const plan = outline.plan ? `\n*Plan* ${safe(outline.plan, 800)}` : ''
    first.push(section(`${cheatSheetText(outline, heading)}${plan}`))
  }

  const addLabel = outline.personLabel.startsWith('someone') && outline.organization ? outline.organization : outline.personLabel
  const elements = [
    // Green only when a call is what the message is asking for.
    actionButton(LABEL.LOG, MARQUETA_ACTION.logCall, opts.logRef, holdOff ? undefined : 'primary'),
    actionButton(addContactLabel(clipWords(addLabel, 50) || 'them'), MARQUETA_ACTION.addContact, opts.addRef),
    openViewButton('outreach', opts.studioUrl || ''),
  ].filter((element): element is Block => Boolean(element))
  if (elements.length) first.push({ type: 'actions', elements })

  if (outline.agenda?.length) first.push(section(`*Agenda (30 min)*\n${bullets(outline.agenda, 300)}`))
  if (outline.whyNow) {
    const quote = safe(outline.whyNow.quote, 1200)
      .split('\n')
      .map((line) => `>${line}`)
      .join('\n')
    const source = outline.whyNow.sourceUrl ? `\n${slackLink(outline.whyNow.sourceUrl, 'Source')}` : ''
    first.push(section(`*Why now*\n${safe(outline.whyNow.signal, 600)}\n${quote}${source}`))
  }
  if (outline.questions.length) first.push(section(`*Questions*\n${bullets(outline.questions.slice(0, 4), 300)}`))
  if (!emailFirst && outline.ifTheySay.length) first.push(section(ifTheySayText(outline)))
  if (clean(outline.reassurance)) first.push(context(safe(outline.reassurance, 400)))

  const second: Block[] = []
  const threadParts: string[] = []
  if (emailFirst) {
    const talking = cheatSheetText(outline, 'If you end up talking')
    if (talking.includes('*Say:*')) second.push(section(talking))
    if (outline.ifTheySay.length) second.push(section(ifTheySayText(outline)))
  }
  if (outline.offer) {
    threadParts.push('offer')
    second.push(
      section(
        [
          `*Offer to have ready:* ${safe(outline.offer.title, 200)}`,
          outline.offer.oneLiner ? safe(outline.offer.oneLiner, 600) : '',
          outline.offer.proof ? `_Proof:_ ${safe(outline.offer.proof, 900)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    )
  }
  if (clean(outline.askNote)) second.push(context(`_The ask — for you, not to read out:_ ${safe(outline.askNote, 600)}`))
  if (!emailFirst && clean(outline.voicemail)) {
    threadParts.push('voicemail')
    second.push(section(`*If it goes to voicemail* (about 20 seconds)\n${safe(outline.voicemail, 800)}`))
  }
  if (!emailFirst && clean(outline.email)) {
    threadParts.push('email draft')
    second.push(section(`*Email draft* — edit before sending\n${fencedEmail(outline.email, 2600)}`))
  }
  if (outline.brief) second.push(section(`*Call brief* (reviewed)\n${safe(outline.brief, 2500)}`))
  if (outline.background.length) {
    second.push(section(`*Background — for you, not for the call*\n${bullets(outline.background.slice(0, 6), 700)}`))
  }
  if (outline.caveats.length) second.push(section(`*Heads-up*\n${bullets(outline.caveats.slice(0, 8), 400)}`))
  if (outline.fromYourMessage?.length) {
    second.push(section(`*From your message*\n${bullets(outline.fromYourMessage.slice(0, 6), 700)}`))
  }

  const person = clean(outline.personLabel) || 'them'
  const list = threadParts.length > 1 ? `${threadParts.slice(0, -1).join(', ')} and ${threadParts[threadParts.length - 1]}` : threadParts[0] || ''
  const threadText = emailFirst
    ? `If ${person} picks up: what to say${outline.offer ? ', and the offer' : ''}`
    : list
      ? `${capitalise(list)} for ${person}`
      : `Background on ${person}`

  return {
    first: first.slice(0, 15),
    second: second.slice(0, 20),
    text: clipSlackText(escapeSlackText(`${clean(outline.title).split(':')[0]}: ${whoAndWhere(outline)}`), SLACK_LIMITS.fallbackText) || 'Call prep',
    threadText: clipSlackText(escapeSlackText(threadText), SLACK_LIMITS.fallbackText),
  }
}

/** A candidate's Log button: "Log Jane Doe, CMIO — Acme Health…". The "…" says it opens the form. */
export function logCandidateLabel(label: string): string {
  const name = clean(label) || 'them'
  // One ellipsis either way: a clipped name already ends where the form opens.
  const room = SLACK_LIMITS.buttonText - 'Log …'.length
  return `Log ${name.length > room ? name.slice(0, room).trimEnd() : name}…`
}

/**
 * "Which one did you mean?" — each candidate with its own button, so the
 * answer is one press rather than retyping the name more carefully.
 *
 * `action: 'prep'` (the default) gives each a Prep button. `action: 'log'`
 * is for a call reported in a message that fits more than one person ("called
 * Jane, left a voicemail" with two Janes on file): each button opens the log
 * form for THAT contact, already filled in with what was said (`note`,
 * `outcome`) — nothing is written until the form is sent. A candidate with no
 * contact on file cannot be logged against, and is left out.
 *
 * `heading` is plain text and is escaped like everything else.
 */
export function buildPrepCandidatesBlocks(
  candidates: PrepCandidate[],
  heading: string,
  opts: { action?: 'prep' | 'log'; label?: (candidate: PrepCandidate) => string; note?: string; outcome?: string } = {},
): Block[] {
  const logging = opts.action === 'log'
  const usable = (candidates || []).filter(
    (candidate) => candidate && (logging ? clean(candidate.contactId) : clean(candidate.contactId) || clean(candidate.organization)),
  )
  if (!usable.length) return []
  const blocks: Block[] = [section(safe(heading, 600) || 'Which one did you mean?')]
  usable.slice(0, MAX_CANDIDATES).forEach((candidate) => {
    const label = clean(candidate.label) || clean(candidate.organization) || 'Unnamed contact'
    const button = logging
      ? actionButton(
          opts.label ? opts.label(candidate) : logCandidateLabel(label),
          MARQUETA_ACTION.logCall,
          encodeContactRef({
            contactId: candidate.contactId,
            organization: candidate.organization,
            name: label,
            note: opts.note,
            outcome: opts.outcome,
          }),
        )
      : actionButton(LABEL.PREP, MARQUETA_ACTION.prepCall, encodeContactRef({ contactId: candidate.contactId, organization: candidate.organization }))
    blocks.push({ ...section(`*${safe(label, 400)}*`), ...(button ? { accessory: button } : {}) })
  })
  return blocks
}

export type PrepListEntry = {
  label: string
  temperature: 'replied' | 'knowsUs' | 'cold'
  detail: string
  contactId?: string
  organization: string
}

const TEMPERATURE_LABEL: Record<PrepListEntry['temperature'], string> = {
  replied: 'they replied',
  knowsUs: 'they know us',
  cold: 'cold — email first',
}

const PREP_LIST_MAX = 8

/** How to prep somebody who is not on the list — the command, as people can copy it. */
const PREP_ANYONE = askMarqueta('prep Sam Rivera at Acme')

/**
 * "Who should I call?" — the people worth a call, warmest first, each one a
 * Prep press away. A short list says it is short, plainly, and says how to
 * prep somebody who is not on file, because most calls are to people who are
 * not in the CMS yet. It always ends on that one hint.
 *
 * `heading` is mrkdwn the caller built (escaped).
 */
export function buildPrepListBlocks(entries: PrepListEntry[], opts: { heading: string }): Block[] {
  const list = (entries || []).filter((entry) => entry && (clean(entry.label) || clean(entry.organization)))
  if (!list.length) {
    return [section(`Nobody’s on your list yet. Before a call, say ${PREP_ANYONE}.`)]
  }
  const blocks: Block[] = [section(clipSlackText(opts.heading, 600) || '*Your calls*')]
  list.slice(0, PREP_LIST_MAX).forEach((entry) => {
    const label = clean(entry.label) || clean(entry.organization)
    const temperature = TEMPERATURE_LABEL[entry.temperature] || TEMPERATURE_LABEL.cold
    const text = [`*${safe(label, 300)}* — ${temperature}`, clean(entry.detail) ? safe(entry.detail, 600) : ''].filter(Boolean).join('\n')
    const button =
      clean(entry.contactId) || clean(entry.organization)
        ? actionButton(LABEL.PREP, MARQUETA_ACTION.prepCall, encodeContactRef({ contactId: entry.contactId, organization: entry.organization }))
        : null
    blocks.push({ ...section(text), ...(button ? { accessory: button } : {}) })
  })
  const more = list.length - PREP_LIST_MAX
  blocks.push(
    context(
      more > 0
        ? `+${more} more on Outreach. For someone not on file, say ${PREP_ANYONE}.`
        : `That’s everyone on your list. For someone not on file, say ${PREP_ANYONE}.`,
    ),
  )
  return blocks
}

// ── Adding someone who is not on file ────────────────────────────────────────

/**
 * The status a contact added from Slack starts at — exported so a caller can
 * ask what a log would do to the record this makes (`needsConfirmation`)
 * before it offers to add and log in one press.
 */
export const NEW_CONTACT_STATUS = 'new'

/**
 * The contact record for somebody first mentioned in Slack.
 *
 * Deterministic id, so a double press or a Slack retry lands on the same
 * record instead of a twin. Only what was TYPED is stored: no email, phone or
 * segment — none of those can be inferred honestly from a chat message — and
 * warmth stays "unknown", because a name in a message proves nothing about the
 * relationship. Contact details inside the note are removed for the same
 * reason; they belong in the Studio's own fields, entered on purpose.
 *
 * The id hashes what was TYPED — an email included — so two people added as
 * "jane@mgb.org" and "bob@acme.com" get two records. (Hashing the stored name
 * instead gave both the same id, and the second add silently found the first
 * person's record.) An email typed as the only name is not stored, but its
 * domain is, as the organisation, when none was typed: that is what the
 * outline already called them ("someone at mgb.org").
 *
 * Returns null when nothing usable is left — no name and no organisation, as
 * with "prep the CIO" or a free-mail address — because a record with neither
 * cannot be found, called or told apart from the next one. The caller asks for
 * a name or an organisation instead of writing a blank contact.
 */

export function newContactDocument(input: {
  name: string
  organization: string
  role: string
  note: string
  ownerName: string
  now: Date
}): Record<string, unknown> | null {
  const typedName = clean(input.name).slice(0, 120)
  const typedOrganization = clean(input.organization).slice(0, 180)
  const typedEmail = looksLikeEmail(typedName) ? typedName.toLowerCase() : ''
  const typedPerson = isPlaceholderPerson(typedName) ? '' : typedName
  const name = typedEmail ? '' : typedPerson
  const domain = typedEmail ? emailDomain(typedEmail) : ''
  const organization = typedOrganization || (domain && domainLabel(domain) ? domain : '')
  if (!name && !organization) return null
  const role = clean(input.role).slice(0, 120)
  const note = withoutContactDetails(input.note).slice(0, 1200)
  const owner = clean(input.ownerName).slice(0, 120)
  const date = studioDateKey(input.now)
  return {
    _id: `marketingContact.slack-${marketingOperationHash(`${norm(typedPerson)}|${norm(typedOrganization)}`)}`,
    _type: 'marketingContact',
    ...(name ? { name } : {}),
    ...(organization ? { organization } : {}),
    ...(role ? { role } : {}),
    status: NEW_CONTACT_STATUS,
    warmth: 'unknown',
    ...(owner ? { owner } : {}),
    ...(note ? { howWeKnow: note } : {}),
    sourceNotes: `Added from Slack by ${owner || 'someone'} on ${date}`,
  }
}
