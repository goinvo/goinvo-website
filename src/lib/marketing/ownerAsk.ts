/**
 * Who to ASK to take a task nobody has picked up. Never who to assign it to.
 *
 * An unowned task on the board is a task nobody is doing, and a digest that
 * lists it under "anyone" is asking the whole room — which in practice means
 * asking no one. The fix is to put a name on the question. But setting
 * `ownerName` on somebody's behalf is how a plan loses the team's trust (the
 * same reason "Not me this week" never reassigns), so this only proposes an
 * @-mention with a take button. The person decides.
 *
 * The rules, each of which exists because the alternative is worse:
 *
 *   - Nobody is asked about the same task twice. After two different people
 *     have been asked, the task is `exhausted`: the honest next question is
 *     whether it is worth doing at all, and the caller offers Drop.
 *   - Nobody away is asked, and nobody is asked past their hours for the week
 *     (what they already own plus what this round has asked of them).
 *   - At most two asks per person per round. Three @-mentions in one message
 *     reads as a pile-on.
 *   - The plan's `suggestedOwner` is preferred when they have room, since
 *     somebody already thought it was theirs.
 *   - The copy makes NO claim about anyone's capacity. "You have the most free
 *     time" is a statement about a colleague's week made in front of their
 *     colleagues, from numbers that are only an estimate. The capacity maths
 *     picks whom to ask; it is never said out loud.
 *
 * Pure and deterministic — same inputs, same asks — so a double cron fire
 * cannot ask two different people about the same thing.
 */

import { hoursForWeek, statusOn, type TeamMemberAvailability } from './availability'
import { formatMinutes } from './effort'
import { clipSlackText, escapeSlackText, SLACK_LIMITS, slackMention } from './slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** A teammate we can actually @-mention: mapped people only, one per Slack id. */
export type AskTeamMember = { name: string; slackUserId: string }

export type AskTask = {
  _id: string
  title: string
  ownerName?: string
  suggestedOwner?: string
  minutes: number
  kind?: string
  /** Everyone already asked about this task, from the task's ask history. */
  askedSlackUserIds?: string[]
}

export type OwnerAsk = { taskId: string; name: string; slackUserId: string; reason: 'suggested' | 'open' }

const MAX_PRIOR_ASKS = 2

const text = (value: unknown) => String(value ?? '').trim()
const lower = (value: unknown) => text(value).toLowerCase()
const minutesOf = (value: unknown) => {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0
}

export function proposeOwnerAsks(input: {
  tasks: AskTask[]
  team: AskTeamMember[]
  availability: TeamMemberAvailability[]
  ownedMinutesByName: Record<string, number>
  dateKey: string
  defaultHours: number
  maxAsksPerPerson?: number
}): { asks: OwnerAsk[]; exhausted: string[] } {
  const maxAsks = Math.max(0, Math.floor(input.maxAsksPerPerson ?? 2))
  const availability = input.availability || []

  // Owned minutes keyed case-insensitively: the board says "Juhan", a record
  // may say "juhan", and they are the same person's week.
  const owned = new Map<string, number>()
  for (const [name, minutes] of Object.entries(input.ownedMinutesByName || {})) {
    const key = lower(name)
    if (key) owned.set(key, (owned.get(key) || 0) + minutesOf(minutes))
  }

  const seenIds = new Set<string>()
  const people = (input.team || [])
    .filter((member) => {
      const id = text(member?.slackUserId)
      if (!id || !text(member?.name) || seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })
    .map((member) => {
      const name = text(member.name)
      const away = statusOn(availability, name, input.dateKey) === 'away'
      const hours = away
        ? 0
        : hoursForWeek({ entries: availability, ownerName: name, dateKey: input.dateKey, defaultHours: input.defaultHours })
      return {
        name,
        slackUserId: text(member.slackUserId),
        capacity: Math.max(0, Number.isFinite(hours) ? hours : 0) * 60,
        load: owned.get(lower(name)) || 0,
        asks: 0,
      }
    })

  const asks: OwnerAsk[] = []
  const exhausted: string[] = []
  const seenTasks = new Set<string>()

  for (const task of input.tasks || []) {
    const taskId = text(task?._id)
    if (!taskId || seenTasks.has(taskId)) continue
    seenTasks.add(taskId)
    if (text(task.ownerName) || text(task.kind) === 'decision') continue

    // Distinct people, not entries: a retried write that recorded the same ask
    // twice has still only asked one person.
    const asked = new Set((task.askedSlackUserIds || []).map(text).filter(Boolean))
    if (asked.size >= MAX_PRIOR_ASKS) {
      exhausted.push(taskId)
      continue
    }

    const minutes = minutesOf(task.minutes)
    // Room for at least a minute, so somebody with no hours this week is never
    // asked even about a task nobody has estimated.
    const fits = (person: (typeof people)[number]) =>
      !asked.has(person.slackUserId) &&
      person.asks < maxAsks &&
      person.capacity - person.load >= Math.max(minutes, 1)

    const eligible = people.filter(fits)
    const suggestedName = lower(task.suggestedOwner)
    const suggested = suggestedName ? eligible.find((person) => lower(person.name) === suggestedName) : undefined
    const pick =
      suggested ||
      [...eligible].sort(
        (a, b) =>
          b.capacity - b.load - (a.capacity - a.load) ||
          a.name.localeCompare(b.name) ||
          a.slackUserId.localeCompare(b.slackUserId),
      )[0]
    if (!pick) continue

    pick.load += minutes
    pick.asks += 1
    asks.push({ taskId, name: pick.name, slackUserId: pick.slackUserId, reason: suggested ? 'suggested' : 'open' })
  }

  return { asks, exhausted }
}

/**
 * One ask, as a sentence. The effort estimate is the only number in it, and it
 * is about the task — never about the person.
 */
export function describeAsk(ask: OwnerAsk, minutes: number): string {
  const who = slackMention(text(ask.slackUserId) || undefined, text(ask.name) || 'someone')
  const effort = minutesOf(minutes) ? ` (~${formatMinutes(minutesOf(minutes))})` : ''
  const base = `${who} could you take this one?${effort}`
  return ask.reason === 'suggested' ? `${base} The plan had you in mind.` : base
}

/** "*Could you take these?*" and one line per ask, in a single section; [] when there is nothing to ask. */
export function buildAskBlocks(asks: Array<OwnerAsk & { title: string; minutes: number }>): Block[] {
  const lines = (asks || [])
    .filter((ask) => ask && text(ask.taskId))
    .map((ask) => {
      const title = clipSlackText(escapeSlackText(text(ask.title).replace(/\s+/g, ' ') || 'Untitled task'), 150)
      return `• *${title}* — ${describeAsk(ask, ask.minutes)}`
    })
  if (!lines.length) return []
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: clipSlackText(['*Could you take these?*', ...lines].join('\n'), SLACK_LIMITS.sectionText) },
    },
  ]
}

/**
 * The asks' mentions, for the message's top-level `text`. Slack builds the
 * notification from that field, so a mention that only lives in the blocks can
 * reach somebody's screen without ever reaching their phone.
 */
export function askMentionsText(asks: OwnerAsk[]): string {
  const counts = new Map<string, { mention: string; count: number }>()
  for (const ask of asks || []) {
    if (!ask) continue
    const key = text(ask.slackUserId) || `name:${lower(ask.name)}`
    const entry = counts.get(key)
    if (entry) entry.count += 1
    else counts.set(key, { mention: slackMention(text(ask.slackUserId) || undefined, text(ask.name) || 'someone'), count: 1 })
  }
  const people = [...counts.values()]
  if (!people.length) return ''
  const mentions = people.map((person) => person.mention).join(' ')
  if (people.length > 1) return `${mentions} — could you take a task each?`
  const count = people[0].count
  if (count === 1) return `${mentions} — could you take a task?`
  return `${mentions} — could you take ${count === 2 ? 'a couple of' : count} tasks?`
}
