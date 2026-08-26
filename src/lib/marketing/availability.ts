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
  if (status === 'reduced') {
    const entry = input.entries.find(
      (candidate) =>
        String(candidate.ownerName || '').trim().toLowerCase() ===
          String(input.ownerName).trim().toLowerCase() && isInForceOn(candidate, input.dateKey),
    )
    const hours = Number(entry?.weeklyHours)
    if (Number.isFinite(hours) && hours >= 0) return hours
  }
  return input.defaultHours
}

/**
 * Parse "away until friday" style text from a Slack message.
 *
 * Kept narrow on purpose. A parser that guesses is worse than one that asks:
 * anything it does not clearly understand returns null, and the bot replies
 * asking for a date rather than silently booking the wrong fortnight off.
 */
export function parseAvailabilityCommand(
  text: string,
  today: string,
): { status: AvailabilityStatus; from: string; until?: string; weeklyHours?: number } | null {
  const value = String(text || '').trim().toLowerCase()
  if (!value) return null

  const dates = [...value.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map((match) => match[1])
  const hoursMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?)\b/)

  if (/\b(back|available|returning|i'?m back)\b/.test(value)) {
    return { status: 'available', from: dates[0] || today }
  }
  if (/\b(away|out|off|holiday|vacation|pto|leave)\b/.test(value)) {
    return { status: 'away', from: dates[0] || today, until: dates[1] }
  }
  if (hoursMatch) {
    return {
      status: 'reduced',
      from: dates[0] || today,
      until: dates[1],
      weeklyHours: Number(hoursMatch[1]),
    }
  }
  return null
}
