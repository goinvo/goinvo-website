/**
 * Who is actually around this week.
 *
 * The weekly plan assigns work to a named owner and has, until now, had no way
 * to know that the owner is on holiday. The result is a plan that looks fine and
 * quietly does not happen — the same failure as the outreach plan that assumed a
 * warm network nobody had entered.
 *
 * Availability is stored as `marketingTeamAvailability` documents in the private
 * dataset, managed through the data API rather than a Studio schema (the same
 * approach as `previewShareLink` and the financial-posture record). One document
 * per person, so changing your status updates one thing.
 *
 * Pure and dependency-free: the rules are all date arithmetic and can be tested
 * without Slack or Sanity.
 */

export const TEAM_AVAILABILITY_TYPE = 'marketingTeamAvailability'

export type AvailabilityStatus = 'available' | 'reduced' | 'away'

export type TeamMemberAvailability = {
  /** The name used as `ownerName` on operations, e.g. "Juhan". */
  ownerName: string
  /** Slack user id, so the bot can @-mention and match interactions back. */
  slackUserId?: string
  status: AvailabilityStatus
  /** Inclusive ISO date (YYYY-MM-DD). Absent means "from now on". */
  from?: string
  /** Inclusive ISO date. Absent means "until further notice". */
  until?: string
  /** Hours they have this week, when reduced. */
  weeklyHours?: number
  note?: string
}

export function availabilityDocId(ownerName: string): string {
  const slug = String(ownerName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return `${TEAM_AVAILABILITY_TYPE}.${slug || 'unknown'}`
}

/**
 * The board's name for the person who pressed a button in Slack.
 *
 * The board says "Juhan"; Slack says "Juhan Sonin", or a nickname, or whatever
 * the display name is this month. Writing the Slack name as an owner splits one
 * person into two — two check-in groups, two loads when asking who has time,
 * and a `mine` that finds nothing. So the linked identity wins: the record
 * whose slackUserId matches names them. Failing that, a record whose name is
 * EXACTLY the display name. Only then the display name itself — never a
 * guessed first-name match, which is how a bot credits the wrong colleague.
 */
export function resolveOwnerName(input: {
  slackUserId?: string
  displayName?: string
  entries: Array<Pick<TeamMemberAvailability, 'ownerName' | 'slackUserId'>>
}): string {
  const id = String(input.slackUserId || '').trim()
  if (id) {
    const linked = input.entries.find((entry) => entry.slackUserId === id && String(entry.ownerName || '').trim())
    if (linked) return String(linked.ownerName).trim()
  }
  const display = String(input.displayName || '').trim()
  if (display) {
    const exact = input.entries.find(
      (entry) => String(entry.ownerName || '').trim().toLowerCase() === display.toLowerCase(),
    )
    if (exact) return String(exact.ownerName).trim()
    return display
  }
  return 'Someone'
}

const asDate = (value?: string | null) => String(value || '').slice(0, 10)

/**
 * Is this record in force on the given day?
 *
 * Both bounds are INCLUSIVE. "Away 1st to 5th" has to mean the person is away on
 * the 5th — an exclusive end date is the classic off-by-one that puts work on
 * somebody's last day back.
 */
export function isInForceOn(entry: TeamMemberAvailability, dateKey: string): boolean {
  const day = asDate(dateKey)
  if (!day) return false
  const from = asDate(entry.from)
  const until = asDate(entry.until)
  if (from && day < from) return false
  if (until && day > until) return false
  return true
}

export function statusOn(
  entries: TeamMemberAvailability[],
  ownerName: string,
  dateKey: string,
): AvailabilityStatus {
  const owner = String(ownerName || '').trim().toLowerCase()
  if (!owner) return 'available'
  const entry = entries.find(
    (candidate) =>
      String(candidate.ownerName || '').trim().toLowerCase() === owner && isInForceOn(candidate, dateKey),
  )
  return entry?.status || 'available'
}

/** Anyone who cannot take work on this day. */
export function whoIsAwayOn(entries: TeamMemberAvailability[], dateKey: string): string[] {
  return entries
    .filter((entry) => entry.status === 'away' && isInForceOn(entry, dateKey))
    .map((entry) => entry.ownerName)
}

export type OwnedTask = { _id: string; title: string; ownerName?: string; dueAt?: string }

export type Reassignment = {
  task: OwnedTask
  awayOwner: string
  /** Who could pick it up, best first. Empty when nobody is free. */
  candidates: string[]
}

/**
 * Work assigned to somebody who will not be there.
 *
 * Deliberately returns candidates rather than reassigning: moving work onto a
 * colleague without asking is how a plan loses the team's trust. The bot offers
 * it; a person takes it.
 */
export function findReassignments(input: {
  tasks: OwnedTask[]
  entries: TeamMemberAvailability[]
  team: string[]
  dateKey: string
}): Reassignment[] {
  const { tasks, entries, team, dateKey } = input
  const away = new Set(whoIsAwayOn(entries, dateKey).map((name) => name.toLowerCase()))
  if (away.size === 0) return []

  return tasks
    .filter((task) => task.ownerName && away.has(task.ownerName.trim().toLowerCase()))
    .map((task) => {
      const candidates = team.filter((member) => {
        const status = statusOn(entries, member, dateKey)
        return (
          status === 'available' &&
          member.trim().toLowerCase() !== String(task.ownerName).trim().toLowerCase()
        )
      })
      return { task, awayOwner: String(task.ownerName), candidates }
    })
}

/**
 * The hours to plan against, given who is around.
 *
 * A reduced week states its own hours; an away week is zero. Anything else is
 * the studio's normal budget.
 */
export function hoursForWeek(input: {
  entries: TeamMemberAvailability[]
  ownerName: string
  dateKey: string
  defaultHours: number
}): number {
  const status = statusOn(input.entries, input.ownerName, input.dateKey)
  if (status === 'away') return 0

  // weeklyHours is an ALLOCATION, not only a reduction. "Juhan does 4h of calls
  // and Shirley does 4h of content" is two available people with different
  // budgets, and reading the number only when status is "reduced" forced that
  // to be recorded as though both were working at less than normal capacity.
  const entry = input.entries.find(
    (candidate) =>
      String(candidate.ownerName || '').trim().toLowerCase() ===
        String(input.ownerName).trim().toLowerCase() && isInForceOn(candidate, input.dateKey),
  )
  const hours = Number(entry?.weeklyHours)
  if (Number.isFinite(hours) && hours >= 0) return hours
  return input.defaultHours
}

// ── Reading "away next week" ─────────────────────────────────────────────────

export type AvailabilityCommand = { status: AvailabilityStatus; from: string; until?: string; weeklyHours?: number }

const DAY_MS = 86_400_000
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar day — "2026-02-31" is not one, and Date.UTC would quietly make it 3 March. */
function isRealDay(key: string): boolean {
  if (!ISO_DAY.test(key)) return false
  const ms = Date.parse(`${key}T00:00:00Z`)
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === key
}

const addDays = (key: string, days: number) => new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
const weekdayOf = (key: string) => new Date(Date.parse(`${key}T00:00:00Z`)).getUTCDay()
/** Sunday of the Mon–Sun week holding this day. */
const sundayOf = (key: string) => addDays(key, (7 - weekdayOf(key)) % 7)
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
}
const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
}
const MONTH = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')
const WEEKDAY = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|')

/** One day somebody named, in any of the ways people write one. */
const DAY_TOKEN = new RegExp(
  [
    String.raw`(?<iso>\d{4}-\d{2}-\d{2})`,
    String.raw`(?<dm>\d{1,2})\s+(?<dmMonth>${MONTH})\b`,
    String.raw`(?<mdMonth>${MONTH})\s+(?<md>\d{1,2})\b`,
    String.raw`(?<next>next\s+)?(?<weekday>${WEEKDAY})\b`,
    String.raw`(?<relative>today|tonight|tomorrow)\b`,
  ]
    .map((part) => String.raw`\b${part}`)
    .join('|'),
  'g',
)

/** Words that say a day or a length of time. Any left over once the days are read means "ask", not "guess". */
const LEFTOVER_DATE_WORD = new RegExp(
  String.raw`\b(?:${MONTH}|${WEEKDAY}|weeks?|months?|fortnight|weekends?|days?|next|last|\d+)\b`,
)

/** The words that join two days into one stretch: "Mon to Fri", "28 Sep – 2 Oct". */
const RANGE_JOIN = /^(?:-|to|until|till|til|through|thru|through to|up to)$/

/**
 * A day-month with no year: this year's if it has not passed, next year's if
 * that is within six months ("2–6 Jan" said in December). Anything else — "1–5
 * Sep" said on 24 Sep — is null: more likely a slip than a booking eleven
 * months out, and asking costs one reply.
 */
function dayMonth(day: number, month: number, today: string, onOrAfter: string): string | null {
  const year = Number(today.slice(0, 4))
  for (const candidate of [year, year + 1]) {
    const key = `${candidate}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (!isRealDay(key)) return null
    if (key >= onOrAfter) return candidate === year || daysBetween(today, key) <= 183 ? key : null
  }
  return null
}

/** The next time this weekday comes round, on or after `onOrAfter` (the same day counts). */
const nextWeekday = (weekday: number, onOrAfter: string) => addDays(onOrAfter, (weekday - weekdayOf(onOrAfter) + 7) % 7)

type DayToken = { day: string | null; index: number; end: number }

type DayMatch = { groups: Record<string, string | undefined>; index: number; end: number; weekday?: number }

const isDateMatch = (groups: DayMatch['groups']) => Boolean(groups.iso || groups.dm || groups.md)

/**
 * "Fri 2 Oct" is ONE day, said two ways — and it is exactly how Marqueta
 * prints a date (`formatSlackDay`), so it is the form people copy back to her.
 * Read as two days it was a range: the weekday became "the next Friday" and
 * the date the end, so "away Fri 2 Oct" booked eight days off instead of one,
 * took that person out of the next week's plan and put their work up for
 * grabs. So a weekday written right next to a date (either order, a comma at
 * most between them) is folded into the date, and remembered, so the date can
 * be checked against it: "Fri 3 Oct" names no real day and is read as nothing.
 */
function foldWeekdayIntoDate(matches: DayMatch[], text: string): DayMatch[] {
  const folded: DayMatch[] = []
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    if (next && /^,?$/.test(text.slice(current.end, next.index).trim())) {
      const weekdayFirst = Boolean(current.groups.weekday) && isDateMatch(next.groups)
      const dateFirst = isDateMatch(current.groups) && Boolean(next.groups.weekday)
      if (weekdayFirst || dateFirst) {
        const [weekday, date] = weekdayFirst ? [current, next] : [next, current]
        folded.push({ groups: date.groups, index: current.index, end: next.end, weekday: WEEKDAYS[weekday.groups.weekday!] })
        index += 1
        continue
      }
    }
    folded.push(current)
  }
  return folded
}

/**
 * Parse what somebody said about their own time off into exact days.
 *
 * Understands: next week (next Monday to Sunday), this week or the rest of it,
 * today, tomorrow, a weekday ("away Fri" — the next one, today included),
 * "until Fri" (today to Friday), a date or a range ("1–5 Oct", "28 Sep – 2
 * Oct", "2026-10-01 2026-10-05"), a date with its weekday ("Fri 2 Oct", "Mon
 * 28 Sep – Sun 4 Oct" — how she writes dates herself), "back Mon" (away until
 * the day before), and out or off with any of those. Hours ("only 2 hours
 * this week") make it a reduced week.
 *
 * Returns NULL whenever it is unsure — "for 2 weeks", "in October", "next
 * Friday" (this one or the one after?), two days that are not one stretch, a
 * day already past — and never "from today with no end", which is how a
 * one-word message used to book somebody off indefinitely. A parser that
 * guesses is worse than one that asks: the reply asks for the days rather
 * than silently booking the wrong fortnight off.
 *
 * Bare "away" (or a holiday, PTO, leave) with no day at all means the rest of
 * this week — the same thing the Monday plan's "I’m away this week" button
 * books, and the reply says the dates out loud with Undo beside them. Bare
 * "out" and "off" do not: "I'm out" is as often lunch as a holiday, so they
 * need a day with them.
 *
 * `today` is the studio's `YYYY-MM-DD`. Pure.
 */
export function parseAvailabilityCommand(text: string, today: string): AvailabilityCommand | null {
  const value = String(text || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (!value || !isRealDay(today)) return null

  const hoursMatch = /(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/.exec(value)
  const back = /\b(?:back|available|returning)\b/.test(value)
  const awayWord = /\b(?:away|ooo|holiday|holidays|vacation|pto|leave|sick)\b/.test(value)
  const outOrOff = /\b(?:out|off)\b/.test(value)
  // "Away Mon, back Thu" is two statements; one record holds one of them.
  if (back && (awayWord || outOrOff)) return null
  if (!back && !awayWord && !outOrOff && !hoursMatch) return null

  // "1-5 oct" → "1 oct - 5 oct", "oct 1-5" → "oct 1 - oct 5": one token per day.
  const body = (hoursMatch ? value.replace(hoursMatch[0], ' ') : value)
    .replace(new RegExp(String.raw`\b(\d{1,2})\s*(?:-|to|until|till|through|thru)\s*(\d{1,2})\s+(${MONTH})\b`, 'g'), '$1 $3 - $2 $3')
    .replace(new RegExp(String.raw`\b(${MONTH})\s+(\d{1,2})\s*(?:-|to|until|till|through|thru)\s*(\d{1,2})\b`, 'g'), '$1 $2 - $1 $3')

  // Whole weeks, said as a phrase.
  const weekPhrases: Array<[RegExp, () => { from: string; until: string }]> = [
    [/\bnext week\b/g, () => ({ from: addDays(sundayOf(today), 1), until: addDays(sundayOf(today), 7) })],
    [/\b(?:(?:the )?rest of (?:the|this) week|this week|all week)\b/g, () => ({ from: today, until: sundayOf(today) })],
    [/\b(?:this (?:morning|afternoon|evening))\b/g, () => ({ from: today, until: today })],
  ]
  const phrases = weekPhrases.filter(([pattern]) => new RegExp(pattern.source).test(body))
  let rest = weekPhrases.reduce((current, [pattern]) => current.replace(pattern, ' '), body)

  const matches = foldWeekdayIntoDate(
    [...rest.matchAll(DAY_TOKEN)].map((match) => ({
      groups: match.groups || {},
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    })),
    rest,
  )
  const tokens: DayToken[] = []
  let previous = today
  for (const { groups, index, end, weekday } of matches) {
    let day: string | null = null
    if (groups.iso) day = isRealDay(groups.iso) ? groups.iso : null
    else if (groups.dm) day = dayMonth(Number(groups.dm), MONTHS[groups.dmMonth!], today, tokens.length ? previous : today)
    else if (groups.md) day = dayMonth(Number(groups.md), MONTHS[groups.mdMonth!], today, tokens.length ? previous : today)
    else if (groups.weekday) day = groups.next ? null : nextWeekday(WEEKDAYS[groups.weekday], tokens.length ? previous : today)
    else if (groups.relative) day = groups.relative === 'tomorrow' ? addDays(today, 1) : today
    // A weekday folded into a date has to be that date's weekday.
    if (day && weekday !== undefined && weekdayOf(day) !== weekday) day = null
    tokens.push({ day, index, end })
    if (day) previous = day
  }
  if (tokens.some((token) => !token.day)) return null
  for (const token of [...tokens].reverse()) rest = `${rest.slice(0, token.index)} ${rest.slice(token.end)}`
  if (LEFTOVER_DATE_WORD.test(rest)) return null

  let from: string
  let until: string | undefined
  let status: AvailabilityStatus = hoursMatch && !awayWord && !outOrOff && !back ? 'reduced' : back ? 'available' : 'away'

  if (phrases.length > 1 || (phrases.length && tokens.length)) return null
  if (phrases.length) {
    ;({ from, until } = phrases[0][1]())
  } else if (tokens.length === 2) {
    const [first, second] = tokens
    // "Until Mon to Fri" or "back 1–5 Oct" says two things at once — which
    // day is the last? Ask. ("From Mon to Fri" is fine: that is a range.)
    if (/\b(?:until|till|til|through|thru|by|back|returning)(?: on)?$/.test(body.slice(0, first.index).trim())) return null
    // Also nothing at all between them: "2026-09-28 2026-10-02" is how the
    // old help taught people to say a range.
    const joiner = body.slice(first.end, second.index).trim()
    const consecutive = daysBetween(first.day!, second.day!) === 1
    if (joiner && !RANGE_JOIN.test(joiner) && !(consecutive && /^(?:and|&|,)$/.test(joiner))) return null
    from = first.day!
    until = second.day!
  } else if (tokens.length === 1) {
    const [only] = tokens
    const lead = body.slice(0, only.index).trim()
    if (/\b(?:from|starting|since|after)$/.test(lead)) return null
    if (/\b(?:back|returning)(?: on)?$/.test(lead)) {
      // "Back Monday" is away until the day before, starting now.
      if (only.day === today) return { status: 'available', from: today }
      if (only.day! < today) return null
      status = 'away'
      from = today
      until = addDays(only.day!, -1)
    } else if (/\b(?:until|till|til|through|thru|to|up to|by)$/.test(lead)) {
      from = today
      until = only.day!
    } else {
      from = only.day!
      until = only.day!
    }
  } else if (tokens.length === 0) {
    if (status === 'available') return { status, from: today }
    if (/\bsick\b/.test(value)) {
      from = today
      until = today
    } else if (awayWord || status === 'reduced') {
      from = today
      until = sundayOf(today)
    } else {
      // Bare "out" or "off".
      return null
    }
  } else {
    return null
  }

  if (status === 'available') {
    // "Back 2026-10-05" said as a date is handled above; a bare "available
    // from" a later day would end a holiday today, so only now is certain.
    return from === today && !until ? { status, from } : null
  }
  if (from < today || (until !== undefined && until < from)) return null
  return {
    status,
    from,
    ...(until ? { until } : {}),
    ...(status === 'reduced' && hoursMatch ? { weeklyHours: Number(hoursMatch[1]) } : {}),
  }
}
