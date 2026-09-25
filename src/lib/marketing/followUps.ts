/**
 * Follow-ups: the people who already said something back, and are owed a reply.
 *
 * A follow-up is the warmest lead the studio has. Somebody picked up, or
 * replied, or booked a meeting, and a date was set to get back to them. It is
 * also the easiest thing to lose: it lives on a contact record, not on the
 * task board, so the weekly plan, the check-in and the digest could each list
 * ten tasks while three people who replied last week waited to hear from us.
 *
 * The obvious fix, mirroring each follow-up as a `marketingOperation`, is the
 * one this deliberately does not do. Two records for one fact drift the first
 * time somebody reschedules a call in the Studio and not on the board, and
 * then one of them is lying. The date stays on the contact — the single source
 * of truth the Studio's own "Follow-ups due" strip already reads — and this
 * module reads it live wherever it is needed: the check-in, the digest, "my
 * calls", and the planner's reserved time.
 *
 * What a follow-up line is allowed to say is narrow on purpose. Call notes are
 * free text, written for the person who made the call, and routinely hold
 * things nobody would post in a channel ("said the CMIO is on the way out").
 * So a line carries the STATUS a touch left the contact at — a fixed label
 * from the enum — and never a note, an outcome string or a next step. Even an
 * unrecognised `statusAfter` is not echoed: it is replaced by a neutral word,
 * because anything not in the enum is, by definition, free text.
 *
 * The same goes for the two fields a line DOES show, the name and the
 * organisation. Both are typed by people and filled by imports, and both turn
 * up holding an email address or a phone number ("Jane Doe 617-555-0123",
 * an organisation that is just "jd@x.org"). Contact details never go in a
 * channel, so both fields are scrubbed before they are shown.
 *
 * Pure: `now` is passed in, nothing is fetched, nothing reads the environment.
 */

import { firstNameFor } from './callSheet'
import { formatMinutes } from './effort'
import { FOLLOW_UP_STATUSES, OUTREACH_STATUS_OPTIONS } from './outreachEnums'
import { SLACK_LIMITS, clipSlackText, escapeSlackText } from './slackText'

export type FollowUpContact = {
  _id: string
  name?: string | null
  email?: string | null
  organization?: string | null
  owner?: string | null
  status?: string | null
  warmth?: string | null
  followUpAt?: string | null
  interactions?: { at?: string | null; by?: string | null; statusAfter?: string | null }[] | null
}

export type FollowUpTemperature = 'replied' | 'knowsUs' | 'cold'

export type FollowUpEntry = {
  contactId: string
  /** A name a person can say out loud — never an email address. */
  personLabel: string
  organization: string
  /** The board's name for whoever owns this contact; '' when nobody does. */
  ownerName: string
  /** The follow-up date, as an ISO instant. */
  dueAt: string
  overdue: boolean
  /** The most recent logged touch, as a status label only — never the notes. */
  lastTouch: { at: string; statusLabel: string } | null
  temperature: FollowUpTemperature
}

/** How far ahead "due" reaches by default: the week the check-in is about. */
export const DEFAULT_FOLLOW_UP_WINDOW_DAYS = 7

/**
 * What one follow-up costs, for the planner.
 *
 * A follow-up is a short call or a two-line note to someone who already knows
 * the thread — not a researched first touch. Fifteen minutes is generous for
 * one and honest across several, since some of them turn into a real
 * conversation.
 */
export const FOLLOW_UP_MINUTES_EACH = 15

/**
 * The most of a week follow-ups may reserve.
 *
 * Without a cap, a backlog of thirty overdue follow-ups would reserve the
 * whole week and the planner would schedule no other work at all — which
 * looks like diligence and is actually the plan giving up. A pile that size is
 * a triage problem for a person, not a scheduling problem, so the reservation
 * stops at 40% and the rest of the week stays planned.
 */
export const FOLLOW_UP_BUDGET_SHARE = 0.4

const DAY_MS = 86_400_000

/**
 * Follow-up dates are stored as UTC instants but mean a day in Arlington. A
 * follow-up set for 9am on the 21st is "Mon 21 Sep" to the team whatever the
 * server's clock says, so every date shown here is formatted in the studio's
 * zone, the same way the call outline formats "when we spoke on 12 Sep".
 */
const STUDIO_TIME_ZONE = 'America/New_York'

const REPLIED = new Set(['responded', 'meeting', 'opportunity'])
const KNOWS_US = new Set(['hot', 'warm', 'cool'])
const TEMPERATURE_RANK: Record<FollowUpTemperature, number> = { replied: 0, knowsUs: 1, cold: 2 }
const TEMPERATURE_TEXT: Record<FollowUpTemperature, string> = {
  replied: 'they replied',
  knowsUs: 'they know us',
  cold: 'cold',
}

/** Said in place of a status that is not in the enum — see the header. */
const UNKNOWN_STATUS_LABEL = 'Logged'
const NO_NAME_LABEL = 'someone with no name on file'

/** "Contacted — call/message made" → "Contacted": the part before the explanation. */
const STATUS_SHORT_LABEL: Record<string, string> = Object.fromEntries(
  OUTREACH_STATUS_OPTIONS.map((option) => [option.value, option.title.split(' — ')[0].trim()]),
)

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const time = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** The short label for a contact status, or a neutral word — never the raw value. */
export function followUpStatusLabel(status: string | null | undefined): string {
  return STATUS_SHORT_LABEL[clean(status)] || UNKNOWN_STATUS_LABEL
}

/**
 * An entry's status label, checked back against the enum before it is shown.
 *
 * Entries made here already carry an enum label, but an entry is a plain object
 * that can be built or cached anywhere. Re-checking costs nothing and keeps the
 * promise in the header true for entries this module did not make.
 */
const KNOWN_STATUS_LABELS = new Set(Object.values(STATUS_SHORT_LABEL))
const shownStatusLabel = (label: string) => (KNOWN_STATUS_LABELS.has(clean(label)) ? clean(label) : UNKNOWN_STATUS_LABEL)

const someoneAt = (organization: string) => (organization ? `someone at ${organization}` : NO_NAME_LABEL)

// ── Contact details out ──────────────────────────────────────────────────────

/**
 * What counts as a contact detail. These are callPrep.ts's patterns, character
 * for character, so the call outline and the follow-up line can never disagree
 * about whether "617-555-0123" is a phone number. (callPrep keeps its copy
 * private; the two belong in one shared helper when that file is next open.)
 * A run of digits is only a phone number at ten or more, so "Class of 2019"
 * and a seven-digit reference survive.
 */
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
const PHONE_PATTERN = /\+?\d[\d\s().-]{8,}\d/g
const PHONE_DIGITS = 10

/** Separators and brackets a removed detail leaves stranded at either end. */
const STRANDED_EDGES = /^[\s,;:|/·•()[\]{}<>–—-]+|[\s,;:|/·•()[\]{}<>–—-]+$/g
/** A label, or a trailing "at", whose value was the detail just removed: "tel:", "email", "someone at". */
const STRANDED_LABEL = /(?:^|\s)(?:tel|phone|ph|cell|mobile|mob|fax|e-?mail|mailto|at)\s*[.:]*$/i

/**
 * A name or an organisation with any email address or phone number taken out.
 *
 * Callers want a LABEL, so the detail is removed rather than replaced with
 * "[phone]" the way callPrep marks it inside prose: "Follow up with Jane Doe
 * [phone]" tells a channel nothing and reads like a bug. Only text that
 * actually held a detail is tidied afterwards, so an ordinary value such as
 * "Smith & Co." comes back exactly as it went in.
 */
function withoutContactDetails(value: unknown): string {
  const original = clean(value)
  const removed = original
    .replace(EMAIL_PATTERN, ' ')
    .replace(PHONE_PATTERN, (match) => (match.replace(/\D/g, '').length >= PHONE_DIGITS ? ' ' : match))
  if (removed === original) return original

  // "Jane Doe <jane@x.org>" leaves "<>", "someone at jd@x.org" leaves "at",
  // "Jane (tel: 617…)" leaves "( tel: )". Peel until nothing changes.
  let text = clean(removed.replace(/[([{<]\s*[)\]}>]/g, ' '))
  for (let pass = 0; pass < 5; pass += 1) {
    const next = clean(text.replace(STRANDED_EDGES, '').replace(STRANDED_LABEL, ''))
    if (next === text) break
    text = next
  }
  return text
}

/**
 * The first email address written in a value, so a first.last address in
 * `name` can still give a first name — and nothing else in the field (a phone
 * number, say) ever reaches `firstNameFor`, which would happily return it.
 */
const firstEmailIn = (value: unknown): string => clean(value).match(EMAIL_PATTERN)?.[0] || ''

/** Something a person could be called: it has a letter and no leftover "@". */
const isUsableName = (value: string) => /\p{L}/u.test(value) && !value.includes('@')

/**
 * An organisation as a follow-up may show it: scrubbed of contact details, and
 * empty when nothing but a contact detail was there. Empty is safe — the line
 * falls back to "someone with no name on file" rather than naming an address.
 */
export function followUpOrganization(value: unknown): string {
  const organization = withoutContactDetails(value)
  return /[\p{L}\p{N}]/u.test(organization) && !organization.includes('@') ? organization : ''
}

/**
 * Who to say we are following up with.
 *
 * The newsletter import put email addresses into `name` for most contacts, so
 * the name field cannot be trusted to be a name. A real name is used whole
 * (minus any phone number or address typed after it); an address yields a
 * first name only when `firstNameFor` can get one honestly (a first.last local
 * part); anything else becomes "someone at <org>". A contact detail is never
 * shown — it is not a name, and in a channel it is PII.
 */
export function followUpPersonLabel(contact: Pick<FollowUpContact, 'name' | 'email' | 'organization'>): string {
  const name = withoutContactDetails(contact.name)
  if (isUsableName(name)) return name
  const first = withoutContactDetails(firstNameFor({ name: firstEmailIn(contact.name), email: contact.email }))
  if (isUsableName(first)) return first
  return someoneAt(followUpOrganization(contact.organization))
}

type Interaction = NonNullable<FollowUpContact['interactions']>[number]

/**
 * Interactions newest first.
 *
 * They are appended in the order they were logged, but a call can be logged
 * the day after it happened with its real date, so the array order is not the
 * timeline. Dated entries sort by date (later position wins a tie); undated
 * ones keep their place after them, since there is nothing better to go on.
 */
function newestFirst(interactions: FollowUpContact['interactions']): { interaction: Interaction; at: number | null }[] {
  return (interactions || [])
    .map((interaction, index) => ({ interaction, at: time(interaction?.at), index }))
    .filter((entry) => entry.interaction && typeof entry.interaction === 'object')
    .sort((a, b) => {
      if (a.at !== null && b.at !== null) return b.at - a.at || b.index - a.index
      if (a.at !== null) return -1
      if (b.at !== null) return 1
      return b.index - a.index
    })
}

function temperatureOf(contact: FollowUpContact): FollowUpTemperature {
  if (REPLIED.has(clean(contact.status))) return 'replied'
  if (KNOWS_US.has(clean(contact.warmth).toLowerCase())) return 'knowsUs'
  return 'cold'
}

/**
 * Every follow-up due within the window (or already overdue), in the order
 * someone should work through them.
 *
 * The due rule is the Studio strip's own: a contact in a follow-up status whose
 * `followUpAt` falls on or before now + `withinDays`. "Overdue" is the instant
 * comparison the outreach pulse uses, so the digest's "3 overdue" and the lines
 * beneath it can never disagree.
 *
 * Order: overdue first — a promise already broken outranks one coming up —
 * then people who replied, then people who know us, then cold, then by date.
 *
 * The owner is the contact's owner, or failing that whoever last logged a
 * touch: somebody who made the call is the natural person to make the next
 * one. `resolveOwner` maps that raw name onto the board's name; it is only
 * called with a real name, because the resolver's fallback for nothing is
 * "Someone", and a follow-up owned by "Someone" is one nobody gets asked about.
 * An entry with no owner keeps `ownerName: ''` and is shown by
 * `unownedFollowUpsText` — it must be rendered somewhere, not skipped.
 */
export function listFollowUps(
  contacts: FollowUpContact[],
  opts: { now: Date; withinDays?: number; resolveOwner?: (raw: string) => string },
): FollowUpEntry[] {
  const now = opts.now.getTime()
  const withinDays =
    typeof opts.withinDays === 'number' && Number.isFinite(opts.withinDays) && opts.withinDays >= 0
      ? opts.withinDays
      : DEFAULT_FOLLOW_UP_WINDOW_DAYS
  const horizon = now + withinDays * DAY_MS

  const seen = new Set<string>()
  const rows: { entry: FollowUpEntry; due: number }[] = []

  for (const contact of contacts || []) {
    const contactId = clean(contact?._id)
    // A draft sitting next to its published record would list the same
    // person twice; the published one is the fact.
    if (!contactId || contactId.startsWith('drafts.') || seen.has(contactId)) continue
    if (!FOLLOW_UP_STATUSES.includes(clean(contact.status))) continue
    const due = time(contact.followUpAt)
    if (due === null || due > horizon) continue
    seen.add(contactId)

    const history = newestFirst(contact.interactions)
    const latestDated = history.find((entry) => entry.at !== null)
    const lastBy = clean(history.find((entry) => clean(entry.interaction.by))?.interaction.by)
    const rawOwner = clean(contact.owner) || lastBy
    const ownerName = rawOwner ? clean(opts.resolveOwner ? opts.resolveOwner(rawOwner) : rawOwner) : ''

    rows.push({
      due,
      entry: {
        contactId,
        personLabel: followUpPersonLabel(contact),
        // Scrubbed here, not only when rendered: callers also put this into
        // button values (a contact ref), which travel in the channel message.
        organization: followUpOrganization(contact.organization),
        ownerName,
        dueAt: new Date(due).toISOString(),
        overdue: due < now,
        lastTouch:
          latestDated && latestDated.at !== null
            ? {
                at: new Date(latestDated.at).toISOString(),
                statusLabel: followUpStatusLabel(latestDated.interaction.statusAfter),
              }
            : null,
        temperature: temperatureOf(contact),
      },
    })
  }

  return rows
    .sort(
      (a, b) =>
        Number(b.entry.overdue) - Number(a.entry.overdue) ||
        TEMPERATURE_RANK[a.entry.temperature] - TEMPERATURE_RANK[b.entry.temperature] ||
        a.due - b.due ||
        a.entry.personLabel.localeCompare(b.entry.personLabel) ||
        a.entry.contactId.localeCompare(b.entry.contactId),
    )
    .map((row) => row.entry)
}

/**
 * Follow-ups by owner, keyed by the lowercased board name ('' for nobody), in
 * the order `listFollowUps` produced — the check-in groups tasks the same
 * case-insensitive way, so "Juhan" and "juhan" land in one person's list.
 *
 * The '' group is easy to lose: a renderer that walks named people never
 * reaches it. Hand it to `unownedFollowUpsText`.
 */
export function groupFollowUpsByOwner(entries: FollowUpEntry[]): Record<string, FollowUpEntry[]> {
  const groups: Record<string, FollowUpEntry[]> = {}
  for (const entry of entries || []) {
    const key = clean(entry.ownerName).toLowerCase()
    ;(groups[key] ||= []).push(entry)
  }
  return groups
}

// ── Dates, in the studio's zone ──────────────────────────────────────────────

const STUDIO_DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function studioDay(ms: number): { weekday: string; day: string; month: string; year: string; key: string } {
  const parts = STUDIO_DAY_FORMAT.formatToParts(new Date(ms))
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  const [weekday, day, month, year] = [pick('weekday'), pick('day'), pick('month'), pick('year')]
  return { weekday, day, month, year, key: `${year}-${month}-${day}` }
}

/** "14 Sep", with the year only when it is not this year — last September is not this one. */
function dayMonth(ms: number, now: number): string {
  const date = studioDay(ms)
  return date.year === studioDay(now).year ? `${date.day} ${date.month}` : `${date.day} ${date.month} ${date.year}`
}

/** "Mon 21 Sep" */
function weekdayDate(ms: number, now: number): string {
  return `${studioDay(ms).weekday} ${dayMonth(ms, now)}`
}

function dueText(entry: FollowUpEntry, now: number): string {
  const due = time(entry.dueAt)
  if (due === null) return 'no date set'
  const today = studioDay(due).key === studioDay(now).key
  if (entry.overdue) return today ? 'due earlier today' : `overdue since ${weekdayDate(due, now)}`
  return today ? 'due today' : `due ${weekdayDate(due, now)}`
}

/**
 * Who a follow-up is with: a name and an organisation, both scrubbed.
 *
 * Contact details are PII in a channel. Entries built by `listFollowUps` are
 * already scrubbed, but an entry is a plain object that can be built or cached
 * anywhere, so the name and organisation are scrubbed again here rather than
 * trusted. A label that loses everything but "someone" to the scrub (a
 * hand-built "someone at jd@x.org") is rebuilt from what is left.
 */
function whoParts(entry: FollowUpEntry): { personLabel: string; organization: string; named: boolean } {
  const organization = followUpOrganization(entry.organization)
  const given = withoutContactDetails(entry.personLabel)
  const personLabel = isUsableName(given) && !/^someone$/i.test(given) ? given : someoneAt(organization)
  // "someone at MGB (MGB)" says the organisation twice.
  return { personLabel, organization, named: personLabel !== someoneAt(organization) }
}

/** "Jane Doe (MGB)" or "someone at MGB", escaped and then clipped, for mrkdwn. */
function whoFor(entry: FollowUpEntry): string {
  const { personLabel, organization, named } = whoParts(entry)
  const person = clipSlackText(escapeSlackText(personLabel), 120)
  const org = clipSlackText(escapeSlackText(organization), 80)
  return named && org ? `${person} (${org})` : person
}

/** A plain-text clip, for text that is not going into mrkdwn. */
const clipPlain = (value: string, max: number) => (value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`)

/** "last: Contacted on 14 Sep", from the status enum and a date only; '' with nothing dated logged. */
function lastTouchText(entry: FollowUpEntry, nowMs: number): string {
  const touch = entry.lastTouch ? time(entry.lastTouch.at) : null
  return entry.lastTouch && touch !== null
    ? `last: ${shownStatusLabel(entry.lastTouch.statusLabel)} on ${dayMonth(touch, nowMs)}`
    : ''
}

/** One follow-up's facts as plain text — see `followUpParts`. */
export type FollowUpParts = {
  contactId: string
  who: string
  due: string
  last: string
  temperature: string
  overdue: boolean
  /** The board's name for whoever owns it; '' when nobody does. */
  ownerName: string
}

/**
 * One follow-up as its separate facts, in PLAIN text:
 *
 *   who          "Jane Doe (MGB)" / "someone at MGB"
 *   due          "overdue since Tue 22 Sep" / "due today" / "due Fri 25 Sep"
 *   last         "last: Contacted on 14 Sep", or '' when nothing dated is logged
 *   temperature  "they replied" / "they know us" / "cold"
 *
 * For a surface that lays the pieces out itself — the Studio's "Follow-ups
 * due" rows, or a list that wants the date without the temperature — rather
 * than splitting `followUpLine`'s sentence back apart on " · ", which breaks
 * the first time a name contains one.
 *
 * The same guarantees as the line: the name and organisation are scrubbed of
 * contact details, and the other three are built only from dates, the status
 * enum and fixed words, so no note can arrive through any of them. What this
 * does NOT do is escape: React escapes on its own, and mrkdwn wants
 * `followUpLine`, which escapes before it clips.
 */
export function followUpParts(entry: FollowUpEntry, now: Date): FollowUpParts {
  const nowMs = now.getTime()
  const { personLabel, organization, named } = whoParts(entry)
  const person = clipPlain(personLabel, 120)
  const org = clipPlain(organization, 80)
  return {
    contactId: clean(entry.contactId),
    who: named && org ? `${person} (${org})` : person,
    due: dueText(entry, nowMs),
    last: lastTouchText(entry, nowMs),
    temperature: TEMPERATURE_TEXT[entry.temperature] || TEMPERATURE_TEXT.cold,
    overdue: Boolean(entry.overdue),
    ownerName: clean(entry.ownerName),
  }
}

/**
 * One follow-up as two pieces of mrkdwn, already escaped:
 *
 *   label   "*Follow up with Jane Doe (MGB)*"
 *   detail  "overdue since Mon 21 Sep · last: Contacted on 14 Sep · they know us"
 *
 * The detail is built only from dates, the status enum and the temperature —
 * there is no field on the entry a note could arrive through. Names and
 * organisations are scrubbed of contact details, escaped and then clipped, so
 * a record holding a phone number cannot post it, a record holding `<!here>`
 * cannot ping a channel and a 5,000-character name cannot push a section past
 * Slack's limit.
 *
 * The detail's pieces are `followUpParts`'s, escaped; the name keeps its own
 * escape-then-clip, so a clip can never land inside an `&amp;`.
 */
export function followUpLine(entry: FollowUpEntry, now: Date): { label: string; detail: string } {
  const parts = followUpParts(entry, now)
  return {
    label: `*Follow up with ${whoFor(entry)}*`,
    detail: [parts.due, escapeSlackText(parts.last), parts.temperature].filter(Boolean).join(' · '),
  }
}

/** How many ownerless follow-ups `unownedFollowUpsText` names before it just counts. */
const MAX_UNOWNED_NAMED = 3

/**
 * The follow-ups nobody owns, as one escaped mrkdwn line — '' when there are
 * none, so a caller can drop the block rather than post an empty one:
 *
 *   "Follow-ups nobody owns: Jane Doe (MGB), overdue since Mon 21 Sep ·
 *    someone at Acme, due Fri 25 Sep …and 2 more"
 *
 * Why this exists. `groupFollowUpsByOwner` files these under '' because
 * "Someone" would be worse — a person who does not exist, asked about work
 * nobody will do. But a check-in that renders one list per NAMED person never
 * reads the '' key, so without a line of their own these contacts fall out of
 * the message with no count and no trace. They are often the warmest leads on
 * file: somebody replied, a date was set, and then nobody was on the record to
 * chase it. They belong next to "Nobody has taken", where the team looks for
 * work without an owner.
 *
 * Pass the whole list or just the '' group; only entries with no owner are
 * named either way. Nothing is mentioned — there is nobody to mention.
 */
export function unownedFollowUpsText(entries: FollowUpEntry[], now: Date, max: number = MAX_UNOWNED_NAMED): string {
  const unowned = (entries || []).filter((entry) => entry && !clean(entry.ownerName))
  if (!unowned.length) return ''
  const nowMs = now.getTime()
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : MAX_UNOWNED_NAMED
  const named = unowned.slice(0, limit).map((entry) => `${whoFor(entry)}, ${dueText(entry, nowMs)}`)
  const more = unowned.length - named.length
  return clipSlackText(
    `Follow-ups nobody owns: ${named.join(' · ')}${more > 0 ? ` …and ${more} more` : ''}`,
    SLACK_LIMITS.sectionText,
  )
}

/**
 * Minutes to hold back from the week's plan for follow-ups:
 * 15 each, never more than 40% of the budget (see the constants above).
 */
export function followUpReservedMinutes(count: number, budgetMinutes: number): number {
  const due = typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  const budget = typeof budgetMinutes === 'number' && Number.isFinite(budgetMinutes) && budgetMinutes > 0 ? budgetMinutes : 0
  return Math.min(due * FOLLOW_UP_MINUTES_EACH, Math.floor(budget * FOLLOW_UP_BUDGET_SHARE))
}

/**
 * The planner's label for that reservation: "Follow-ups: 3 (~45m reserved)".
 *
 * When the cap bit, it says so — "reserved 1h 36m" for twelve follow-ups
 * would otherwise read as though someone thought eight minutes each was enough.
 */
export function followUpReservationLabel(count: number, reservedMinutes: number): string {
  const due = typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  const minutes = typeof reservedMinutes === 'number' && Number.isFinite(reservedMinutes) && reservedMinutes > 0 ? reservedMinutes : 0
  const capped = minutes < due * FOLLOW_UP_MINUTES_EACH
  return `Follow-ups: ${due} (~${formatMinutes(minutes)} reserved${capped ? `, capped at ${Math.round(FOLLOW_UP_BUDGET_SHARE * 100)}% of the week` : ''})`
}
