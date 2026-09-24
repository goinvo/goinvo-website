/**
 * How outreach is actually going, counted from what people logged.
 *
 * The strategy says outreach leads. Nothing measured whether it was happening:
 * the weekly plan could schedule ten calls and the digest would announce them
 * again the following Monday with no way to tell if any were made. The call log
 * on each contact already records every touch — who, when, how, and where the
 * contact stood afterwards — so the pulse is a count over that, not a new thing
 * anybody has to keep up to date.
 *
 * Pure and deterministic: `now` and the window are passed in.
 */
import { FOLLOW_UP_STATUSES } from './outreachEnums'

/** The contact fields the pulse reads (a GROQ projection, not the whole record). */
export type PulseInteraction = {
  at?: string | null
  by?: string | null
  channel?: string | null
  statusAfter?: string | null
  value?: number | null
}

export type PulseContact = {
  _id: string
  status?: string | null
  followUpAt?: string | null
  interactions?: PulseInteraction[] | null
}

export type OutreachPulse = {
  /** Inclusive window start (ISO date or datetime). */
  from: string
  /** Exclusive window end. */
  to: string
  /** Every logged touch in the window. */
  touches: number
  /** Distinct people touched. */
  people: number
  calls: number
  emails: number
  /** Touches that MOVED the contact to `responded` (not ones that found them there). */
  replies: number
  /** Touches that moved the contact to `meeting`. */
  meetings: number
  /** Touches that moved the contact to `opportunity`. */
  opportunities: number
  won: number
  wonValue: number
  /** Follow-ups due on or before the end of the window, as of `now`. */
  followUpsDue: number
  /** Follow-ups whose date has already passed, as of `now`. */
  followUpsOverdue: number
  /** Touches per person, by the name on the log. Sorted busiest first. */
  byPerson: { name: string; touches: number }[]
}

/**
 * The GROQ projection that feeds `summarizeOutreach`, so every caller reads
 * the same fields and nobody forgets `interactions`.
 */
export const PULSE_CONTACT_PROJECTION = `{
  _id, status, followUpAt,
  "interactions": interactions[]{ at, by, channel, statusAfter, value }
}`

const time = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function summarizeOutreach(
  contacts: PulseContact[],
  window: { from: string; to: string; now: Date },
): OutreachPulse {
  const from = time(window.from) ?? 0
  const to = time(window.to) ?? Number.POSITIVE_INFINITY
  const now = window.now.getTime()

  const pulse: OutreachPulse = {
    from: window.from,
    to: window.to,
    touches: 0,
    people: 0,
    calls: 0,
    emails: 0,
    replies: 0,
    meetings: 0,
    opportunities: 0,
    won: 0,
    wonValue: 0,
    followUpsDue: 0,
    followUpsOverdue: 0,
    byPerson: [],
  }

  const byPerson = new Map<string, number>()

  for (const contact of contacts || []) {
    let touched = false
    // Progress is a MOVE into a state, not a touch that left the contact there.
    // A voicemail for someone already in `meeting` keeps them in `meeting`
    // (logging never moves a contact backwards), and counting that touch as
    // "1 meeting booked" would report progress nobody made. So the touches are
    // walked in time order — including ones before the window, which set the
    // starting point — and only a change of state counts.
    const ordered = [...(contact.interactions || [])]
      .map((interaction) => ({ interaction, at: time(interaction?.at) }))
      .filter((entry): entry is { interaction: PulseInteraction; at: number } => entry.at !== null)
      .sort((a, b) => a.at - b.at)
    let previous: string | null = null
    for (const { interaction, at } of ordered) {
      const status = String(interaction.statusAfter || '') || null
      const moved = Boolean(status) && status !== previous
      if (status) previous = status
      if (at < from || at >= to) continue
      touched = true
      pulse.touches += 1
      if (interaction.channel === 'phone') pulse.calls += 1
      if (interaction.channel === 'email') pulse.emails += 1
      if (moved && status === 'responded') pulse.replies += 1
      if (moved && status === 'meeting') pulse.meetings += 1
      if (moved && status === 'opportunity') pulse.opportunities += 1
      if (moved && status === 'won') {
        pulse.won += 1
        if (typeof interaction.value === 'number' && Number.isFinite(interaction.value)) {
          pulse.wonValue += interaction.value
        }
      }
      const who = String(interaction.by || '').trim() || 'Someone'
      byPerson.set(who, (byPerson.get(who) || 0) + 1)
    }
    if (touched) pulse.people += 1

    // Follow-ups are a state, not an event: counted as of now, whatever the
    // window, because an overdue follow-up from last month is still overdue.
    const followUp = time(contact.followUpAt)
    if (followUp !== null && FOLLOW_UP_STATUSES.includes(String(contact.status || ''))) {
      if (followUp < to) pulse.followUpsDue += 1
      if (followUp < now) pulse.followUpsOverdue += 1
    }
  }

  pulse.byPerson = [...byPerson.entries()]
    .map(([name, touches]) => ({ name, touches }))
    .sort((a, b) => b.touches - a.touches || a.name.localeCompare(b.name))

  return pulse
}

/**
 * One line a person can read, and that says the uncomfortable thing plainly:
 * a week with no touches is reported as a week with no touches.
 */
export function describePulse(pulse: OutreachPulse, label = 'This week'): string {
  if (pulse.touches === 0) {
    const due = pulse.followUpsDue
      ? ` ${pulse.followUpsDue} follow-up${pulse.followUpsDue === 1 ? '' : 's'} waiting${pulse.followUpsOverdue ? `, ${pulse.followUpsOverdue} overdue` : ''}.`
      : ''
    return `${label}: no outreach logged yet.${due}`
  }
  const parts = [
    `${pulse.touches} touch${pulse.touches === 1 ? '' : 'es'} (${pulse.people} ${pulse.people === 1 ? 'person' : 'people'})`,
    pulse.replies ? `${pulse.replies} repl${pulse.replies === 1 ? 'y' : 'ies'}` : '',
    pulse.meetings ? `${pulse.meetings} meeting${pulse.meetings === 1 ? '' : 's'} booked` : '',
    pulse.opportunities ? `${pulse.opportunities} opportunit${pulse.opportunities === 1 ? 'y' : 'ies'}` : '',
    pulse.won ? `${pulse.won} won` : '',
  ].filter(Boolean)
  const due = pulse.followUpsDue
    ? ` · ${pulse.followUpsDue} follow-up${pulse.followUpsDue === 1 ? '' : 's'} due${pulse.followUpsOverdue ? ` (${pulse.followUpsOverdue} overdue)` : ''}`
    : ''
  return `${label}: ${parts.join(' · ')}${due}.`
}
