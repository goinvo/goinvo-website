/**
 * Who the team is, as Marqueta's Slack paths need to know it.
 *
 * Two questions keep coming up in every button handler and every scheduled
 * post, and each has one wrong answer that is easy to write:
 *
 *   - "What is this presser's name on the board?" The wrong answer is their
 *     Slack display name. The board says "Juhan"; Slack says "Juhan Sonin" or
 *     whatever the display name is this month, and writing that as an owner
 *     splits one person into two — two check-in groups, two loads when asking
 *     who has time, and a `mine` that finds nothing.
 *   - "Which Slack user is this owner?" The wrong answer is the id stored on
 *     the task. Claiming in Slack stamps `ownerSlackUserId` and nothing ever
 *     clears it, so after a reassignment in the Studio the task says "Eric"
 *     next to Juhan's id. The availability records — one per person, written
 *     when somebody links their identity — are the roster, and the roster wins.
 *
 * Server-only: the availability records live in the PRIVATE outreach dataset
 * (they carry names, Slack ids and who is on holiday), which is where the
 * digest already reads them. Read through `getOutreachClient`, pinned to that
 * dataset, so the router's escape hatch can never point these reads at the
 * world-readable one.
 */
import 'server-only'
import { getSlackUserDisplayName } from '@/lib/chat/slack'
import { resolveOwnerName, TEAM_AVAILABILITY_TYPE, type TeamMemberAvailability } from './availability'
import { getOutreachClient } from './outreachClient.server'
import type { AskTeamMember } from './ownerAsk'
import type { CheckInTeamMember } from './weeklyCheckIn'

/**
 * The projection every availability read uses, so a combined query (the
 * check-in reads tasks, contacts and the roster in one round trip) cannot
 * forget a field that `hoursForWeek` or the identity rules depend on.
 */
export const TEAM_AVAILABILITY_PROJECTION = `{ ownerName, slackUserId, status, from, until, weeklyHours, note }`

/** GROQ for the roster. Drafts excluded explicitly as well as by the client's perspective. */
export const TEAM_AVAILABILITY_QUERY = `*[_type == "${TEAM_AVAILABILITY_TYPE}" && !(_id in path("drafts.**"))]${TEAM_AVAILABILITY_PROJECTION}`

/** Only something Slack would turn into a mention counts as a person's identity. */
const SLACK_USER_ID = /^[UW][A-Z0-9]+$/

const text = (value: unknown) => String(value ?? '').trim()
const lower = (value: unknown) => text(value).toLowerCase()
const slackIdOf = (value: unknown) => (SLACK_USER_ID.test(text(value)) ? text(value) : '')

/**
 * Every availability record, tidied.
 *
 * THROWS when the records cannot be read. Callers choose what an unknown roster
 * means for them — a button press should say it could not check, a check-in
 * should not guess mentions — and an empty list returned on failure would look
 * exactly like "nobody has linked their Slack yet", which is a different fact.
 */
export async function loadTeamAvailability(): Promise<TeamMemberAvailability[]> {
  const rows = await getOutreachClient().fetch<Partial<Record<keyof TeamMemberAvailability, unknown>>[] | null>(
    TEAM_AVAILABILITY_QUERY,
  )
  return tidyAvailability(rows)
}

/**
 * Drop records with no name; trim names and ids; turn GROQ's nulls into absent
 * fields. Exported for callers that read the roster inside a larger query.
 *
 * The nulls matter: a projection returns `weeklyHours: null` for a record that
 * never set it, and `hoursForWeek` reads `Number(null)` as ZERO hours — so a
 * raw row made everybody without an allocation look fully booked, and nobody
 * would ever be asked to take anything. Absent means "the studio's default".
 */
export function tidyAvailability(
  rows: Partial<Record<keyof TeamMemberAvailability, unknown>>[] | null | undefined,
): TeamMemberAvailability[] {
  return (rows || [])
    .filter((row) => row && text(row.ownerName))
    .map((row) => {
      const hours = typeof row.weeklyHours === 'number' && Number.isFinite(row.weeklyHours) ? row.weeklyHours : undefined
      return {
        ownerName: text(row.ownerName),
        ...(slackIdOf(row.slackUserId) ? { slackUserId: slackIdOf(row.slackUserId) } : {}),
        status: row.status === 'away' || row.status === 'reduced' ? row.status : 'available',
        ...(text(row.from) ? { from: text(row.from) } : {}),
        ...(text(row.until) ? { until: text(row.until) } : {}),
        ...(hours !== undefined ? { weeklyHours: hours } : {}),
        ...(text(row.note) ? { note: text(row.note) } : {}),
      }
    })
}

/**
 * The board name of the person who pressed a button or wrote a message.
 *
 * The linked record wins (its `slackUserId` is this person), and in that case
 * Slack is never asked. Otherwise the display name — supplied, or looked up —
 * is matched EXACTLY against a record's name, and only then used as it is.
 * Never a first-name guess: that is how a bot credits the wrong colleague.
 *
 * Pass `entries` when the caller already has the roster; otherwise it is read,
 * and a failed read THROWS rather than falling back to the raw display name,
 * which would write "Juhan Sonin" as the owner of work the board files under
 * "Juhan".
 */
export async function resolvePresserName(input: {
  slackUserId?: string
  displayName?: string
  entries?: TeamMemberAvailability[]
}): Promise<string> {
  const entries = input.entries || (await loadTeamAvailability())
  const slackUserId = text(input.slackUserId)
  const linked = resolveOwnerName({ slackUserId, entries })
  if (slackUserId && entries.some((entry) => entry.slackUserId === slackUserId && text(entry.ownerName))) {
    return linked
  }
  let displayName = text(input.displayName)
  if (!displayName && slackUserId) {
    try {
      displayName = text(await getSlackUserDisplayName(slackUserId))
    } catch {
      displayName = ''
    }
  }
  return resolveOwnerName({ slackUserId, displayName, entries })
}

/**
 * The roster for `groupCheckInTasks`: every named record, with its Slack id
 * when it has a valid one. NOT deduplicated — two records naming different ids
 * for one person is evidence the check-in's identity rules need to see, so
 * they can mention nobody rather than possibly the wrong colleague.
 */
export function checkInRoster(entries: TeamMemberAvailability[]): CheckInTeamMember[] {
  return (entries || [])
    .filter((entry) => text(entry?.ownerName))
    .map((entry) => ({
      ownerName: text(entry.ownerName),
      ...(slackIdOf(entry.slackUserId) ? { slackUserId: slackIdOf(entry.slackUserId) } : {}),
    }))
}

/**
 * People who can be ASKED to take a task (ownerAsk.ts): mapped people only,
 * one per Slack id, in name order so the same roster always yields the same
 * asks. When two records claim one id, the first name alphabetically is kept;
 * an ask names a person, and a stable choice beats a random one.
 */
export function askableTeam(entries: TeamMemberAvailability[]): AskTeamMember[] {
  const byId = new Map<string, AskTeamMember>()
  const sorted = [...(entries || [])].sort((a, b) => text(a?.ownerName).localeCompare(text(b?.ownerName)))
  for (const entry of sorted) {
    const id = slackIdOf(entry?.slackUserId)
    const name = text(entry?.ownerName)
    if (!id || !name || byId.has(id)) continue
    byId.set(id, { name, slackUserId: id })
  }
  return [...byId.values()]
}

/**
 * The Slack id for a task's owner: the roster FIRST, the task's own id last.
 *
 * The same three rules as the check-in's identity resolution, for one task:
 *
 *   1. The roster knows this name → the roster's id. If the roster names two
 *      different ids for one name, there is no id — a missing mention costs a
 *      notification, a wrong one tells a colleague someone else's work is theirs.
 *   2. Otherwise the task's `ownerSlackUserId`, but only when the roster does
 *      not give that id to somebody else (the stale-id shape above).
 *   3. Otherwise none.
 *
 * Rule 2 is for a MENTION, where the worst case is a misdirected ping. It is
 * never evidence of who owns a task: when the roster cannot name the owner, the
 * stamped id is exactly the stale one. Ownership checks pass `null` for
 * `taskSlackUserId` and get the roster's answer alone (taskActions.server.ts).
 */
export function slackIdForOwner(
  entries: TeamMemberAvailability[],
  ownerName: string | undefined | null,
  taskSlackUserId?: string | null,
): string | undefined {
  const name = lower(ownerName)
  if (!name) return undefined
  const rosterIds = new Set(
    (entries || [])
      .filter((entry) => lower(entry?.ownerName) === name)
      .map((entry) => slackIdOf(entry.slackUserId))
      .filter(Boolean),
  )
  if (rosterIds.size === 1) return [...rosterIds][0]
  if (rosterIds.size > 1) return undefined
  const fromTask = slackIdOf(taskSlackUserId)
  if (!fromTask) return undefined
  const claimedBySomeoneElse = (entries || []).some(
    (entry) => slackIdOf(entry?.slackUserId) === fromTask && lower(entry.ownerName) !== name,
  )
  return claimedBySomeoneElse ? undefined : fromTask
}
