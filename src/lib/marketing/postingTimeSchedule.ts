/**
 * SDK-free posting-time scheduling helpers — safe to import in client (Studio)
 * code. The research engine (`researchChannelPostingTimes`) lives in
 * `postingTimeResearch.ts`, which pulls in `@anthropic-ai/sdk`; it re-exports
 * these so server callers keep their existing import path while the calendar UI
 * imports straight from here (no SDK in the client bundle).
 */

export interface PostingTimeSlot {
  /** lowercase day, e.g. "wednesday" */
  dayOfWeek: string
  /** 24h "HH:MM" in the slot's timezone */
  time: string
  /** IANA timezone the time is expressed in (default America/New_York) */
  timezone: string
  /** "primary" | "secondary" | content-type label */
  label: string
  /** which channel content type this slot is best for, if specific */
  contentType?: string
  rationale: string
  confidence: 'strong' | 'medium' | 'early'
}

/** The fields the scheduler needs — tolerant of the stored (partial) slot shape. */
export interface SchedulableSlot {
  dayOfWeek?: string
  time?: string
  timezone?: string
  contentType?: string
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

// Minutes the IANA `tz` is ahead of UTC at `date` (DST-aware, via Intl).
function tzOffsetMinutes(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUtc - date.getTime()) / 60000
}

/**
 * The next UTC instant matching a recommended slot (day-of-week + wall-clock time
 * in the slot's timezone), at or after `from`. Used to default a calendar item's
 * publishAt from the channel's researched posting times. Optionally filter to the
 * slot(s) best for a given content type. Returns null if no usable slot.
 */
export function nextRecommendedPublishAt(
  slots: SchedulableSlot[] | undefined,
  from: Date = new Date(),
  contentType?: string,
): Date | null {
  if (!slots || slots.length === 0) return null
  const usable = contentType
    ? slots.filter((s) => !s.contentType || s.contentType === contentType)
    : slots
  let best: Date | null = null

  for (const slot of usable.length ? usable : slots) {
    const targetDay = DAY_INDEX[(slot.dayOfWeek || '').toLowerCase()]
    if (targetDay === undefined) continue
    const [hh, mm] = (slot.time || '12:00').split(':').map((n) => Number(n))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue
    const tz = slot.timezone || 'America/New_York'

    // Scan the next 14 days; build the slot's wall-clock instant in tz and keep
    // the soonest one that is >= from.
    for (let i = 0; i < 14; i += 1) {
      const probe = new Date(from.getTime() + i * 86400000)
      const local = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(probe)
      const parts = Object.fromEntries(local.map((x) => [x.type, x.value]))
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday as string)
      if (weekday !== targetDay) continue
      const guess = Date.UTC(+parts.year, +parts.month - 1, +parts.day, hh, mm)
      const instant = new Date(guess - tzOffsetMinutes(tz, new Date(guess)) * 60000)
      if (instant.getTime() >= from.getTime()) {
        if (!best || instant < best) best = instant
        break
      }
    }
  }
  return best
}
