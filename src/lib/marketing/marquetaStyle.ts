/**
 * Marqueta's message design system, in code.
 *
 * Every Slack message she sends used to be written by hand in the file that
 * sent it, and it showed: one verb did different writes in different messages,
 * the same place had three names ("the plan", "the board", "the Studio"), and
 * dates came out as ISO strings in one message and "Mon 21 Sep" in the next.
 * A person pressing buttons on reflex learns a label once; if the same words
 * do something else in another message, the reflex lands on the wrong thing.
 *
 * So the words live here, once:
 *
 *   - `LABEL` is every button label. A label ending in "…" opens a form, and no
 *     other label does. The same label always means the same action and the
 *     same write. tests/marqueta-style.test.ts fails on a label typed anywhere
 *     else, and on any of the `RETIRED_LABELS`.
 *   - `VIEW_TITLE` is the exact name of each Studio tab a link opens, so "Open
 *     This week" lands on a tab that says "This week".
 *   - Dates, durations and counts have one format each (`formatSlackDay`,
 *     `formatEffort`, `countLabel`) — never an ISO date, never "(s)".
 *   - `stateNote`, `errorLine` and `askMarqueta` are the three sentences every
 *     package would otherwise write its own version of.
 *
 * Dates are rendered in America/New_York, where the studio is: a task due at
 * 02:00 UTC on Friday is due on Thursday evening to everyone reading it. The
 * zone is named explicitly (never the machine's), so Vercel and a laptop in
 * Boston render the same day. A bare `YYYY-MM-DD` is a calendar date, not an
 * instant, and is never shifted.
 *
 * Pure: no fetch, no environment.
 */

import { formatMinutes } from './effort'
import { decodeSlackText, escapeSlackText } from './slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Her name and icon, set per message (the app itself is shared with the website chat). */
export const MARQUETA_IDENTITY = { username: 'Marqueta', iconEmoji: ':chart_with_upwards_trend:' } as const

/** Emoji appear only as a state prefix on a line — never in headers, buttons or decoration. */
export const STATE_EMOJI = { done: ':white_check_mark:', away: ':palm_tree:', risk: ':warning:' } as const

/**
 * The Studio tabs Slack links to, by their exact tab titles. Pinned against
 * `MARKETING_TOOL_VIEWS` in tests, so renaming a tab cannot leave Slack
 * sending people to a name they will not find.
 */
export const VIEW_TITLE = { thisWeek: 'This week', outreach: 'Outreach', calendar: 'Calendar' } as const
export type MarquetaView = keyof typeof VIEW_TITLE

/**
 * Every button label. ★ in the plan = `style: 'primary'`, at most one per card
 * and always leftmost; which one is primary is the builder's call, not the
 * label's.
 */
export const LABEL = {
  TAKE: 'I’ll take it',
  NOT_ME: 'Not me',
  HAND_BACK: 'Hand back',
  DETAILS: 'Details…',
  ANSWER: 'Answer…',
  DONE: 'Done',
  REOPEN: 'Reopen',
  STUCK: 'Stuck…',
  UNSTUCK: 'Unstuck',
  KEEP_NEXT_WEEK: 'Keep — next week',
  DROP: 'Drop it',
  PREP: 'Prep',
  LOG: 'Log it…',
  UNDO: 'Undo',
  RUNWAY_OK: 'Still right',
  RUNWAY_SIGNED: 'We signed something…',
  RUNWAY_CHANGED: 'It changed…',
  PLAN_FITS: 'Plan still fits',
  PLAN_RETHINK: 'Needs a rethink',
  IDEA_KEEP: 'Keep it',
  IDEA_DISCARD: 'Not an idea',
  DRAFT_DISCARD: 'Not for the calendar',
  AWAY: 'I’m away this week',
} as const

/**
 * Labels that meant something else, or the same thing in other words. Kept as
 * data so the drift test can refuse them anywhere they reappear — and so the
 * reason each went is written down next to the list.
 *
 *   - "Take it over", "Hand it back", "Not me this week": three labels for the
 *     two moves `Hand back` / `Not me` now make, one of them green.
 *   - "What's involved", "Prep this call", "Log how it went", "Log result",
 *     "Log interaction": long forms of `Details…`, `Prep`, `Log it…`.
 *   - "Open the plan", "Open the board", "Open in Studio", "Open it and set a
 *     date": links named after nothing the Studio calls itself.
 *   - "Still the right plan", "It has changed": the runway and the strategy
 *     used one label for two different records.
 */
export const RETIRED_LABELS = [
  'Take it over',
  'Hand it back',
  'Not me this week',
  'What’s involved',
  'Prep this call',
  'Log how it went',
  'Log result',
  'Log interaction',
  'Open the plan',
  'Open the board',
  'Open in Studio',
  'Open it and set a date',
  'Still the right plan',
  'It has changed',
] as const

/**
 * The one label with a name in it. Clipped so the whole label stays under
 * Slack's 75-character button limit, which would otherwise reject the message.
 */
export function addContactLabel(name: string, andLog = false): string {
  const tail = andLog ? ' and log it' : ' to outreach'
  const room = 75 - 'Add '.length - tail.length
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim() || 'them'
  const fitted = clean.length > room ? `${clean.slice(0, room - 1).trimEnd()}…` : clean
  return `Add ${fitted}${tail}`
}

// ── Dates, durations, counts ────────────────────────────────────────────────

const STUDIO_TIME_ZONE = 'America/New_York'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

const studioDayParts = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

/**
 * The studio's calendar day for a date or an instant, as `YYYY-MM-DD`; null
 * when there is no readable date. For day arithmetic that has to agree with
 * what `formatSlackDay` prints ("due today", "overdue since").
 */
export function slackDayKey(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && DATE_ONLY.test(value.trim())) return value.trim()
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value))
  if (!Number.isFinite(ms)) return null
  const parts = Object.fromEntries(studioDayParts.formatToParts(new Date(ms)).map((part) => [part.type, part.value]))
  const pad = (part: string | undefined) => String(part || '').padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

type Day = { year: number; month: number; day: number; weekday: number }

function dayOf(value: string | Date | null | undefined): Day | null {
  const key = slackDayKey(value)
  const match = key ? DATE_ONLY.exec(key) : null
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  // "2026-02-31" is not a day; Date.UTC would quietly roll it into March.
  if (date.getUTCMonth() !== month - 1) return null
  return { year, month, day, weekday: date.getUTCDay() }
}

/** "Mon 21 Sep", with the year only when it is not this year's. '' for no date. */
export function formatSlackDay(date: string | Date, now: Date): string {
  const day = dayOf(date)
  if (!day) return ''
  const thisYear = dayOf(now)?.year
  const year = thisYear !== undefined && thisYear !== day.year ? ` ${day.year}` : ''
  return `${WEEKDAYS[day.weekday]} ${day.day} ${MONTHS[day.month - 1]}${year}`
}

/**
 * "Mon 28 Sep – Sun 4 Oct"; "Mon 21 – Sun 27 Sep" inside one month; one day
 * when both ends are the same day; "from Mon 28 Sep" with no end.
 */
export function formatSlackRange(from: string, until: string, now: Date): string {
  const start = dayOf(from)
  const end = dayOf(until)
  if (!start && !end) return ''
  if (!end) return `from ${formatSlackDay(from, now)}`
  if (!start) return `until ${formatSlackDay(until, now)}`
  const endText = formatSlackDay(until, now)
  if (start.year === end.year && start.month === end.month) {
    if (start.day === end.day) return endText
    return `${WEEKDAYS[start.weekday]} ${start.day} – ${endText}`
  }
  // The start keeps the same rule as a single day: its year only when it is not this year's.
  return `${formatSlackDay(from, now)} – ${endText}`
}

/** "~30m", "~1h 30m", "~2h" — an estimate says so. '' when there is no estimate. */
export function formatEffort(minutes: number): string {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return ''
  return `~${formatMinutes(value)}`
}

/** "Week of Mon 21 Sep" — never "2026-W39", which nobody reads as a date. */
export function weekOfLabel(weekStart: string, now: Date): string {
  const day = formatSlackDay(weekStart, now)
  return day ? `Week of ${day}` : 'This week'
}

/** "1 task" / "6 tasks" — never "6 task(s)". */
export function countLabel(n: number, one: string, many = `${one}s`): string {
  const count = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0
  return `${count} ${count === 1 ? one : many}`
}

const ISO_WEEK = /\b(\d{4})-W(\d{2})\b/g
const ISO_DAY = /\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?(?![\d:])/g
const PARENTHETICAL_PLURAL = /\b(\d+) ([A-Za-z]+)\(s\)/g

/** Monday of an ISO week ("2026-W39" → "2026-09-21"); '' for a week that does not exist. */
function isoWeekMonday(year: number, week: number): string {
  if (week < 1 || week > 53) return ''
  const jan4 = Date.UTC(year, 0, 4)
  const week1Monday = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 86_400_000
  return new Date(week1Monday + (week - 1) * 7 * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Text written for a log or a record, made fit for Slack: "2026-W39" becomes
 * "the week of Mon 21 Sep", "2026-09-26" becomes "Sat 26 Sep", "3 task(s)"
 * becomes "3 tasks".
 *
 * For prose Marqueta did not write for Slack but has to show there — a domain
 * registry's note, a heartbeat step recorded by the tick. Rewritten where it
 * is shown rather than where it is stored: the heartbeat's `week` is compared
 * by machines, the registry's note is read by other tools, and records written
 * before the design system still say "2026-W36". Anything that is not a real
 * week or day is left exactly as it was, never dropped.
 */
export function slackReadable(text: string, now: Date): string {
  return String(text ?? '')
    .replace(ISO_WEEK, (match, year: string, week: string) => {
      const monday = isoWeekMonday(Number(year), Number(week))
      return monday ? weekOfLabel(monday, now).replace(/^Week of/, 'the week of') : match
    })
    .replace(ISO_DAY, (match) => formatSlackDay(match, now) || match)
    .replace(PARENTHETICAL_PLURAL, (_match, count: string, word: string) => countLabel(Number(count), word))
}

// ── Blocks ──────────────────────────────────────────────────────────────────

/**
 * A link button named after the tab it opens: "Open This week".
 *
 * Null without an absolute http(s) URL — Slack rejects the WHOLE message for
 * one button whose url it cannot parse, which looks exactly like the message
 * never being sent. Callers filter it out (`actionsRow` does).
 */
export function openViewButton(view: MarquetaView, url: string): Block | null {
  const href = String(url || '').trim()
  if (!/^https?:\/\//i.test(href) || !VIEW_TITLE[view]) return null
  return { type: 'button', text: { type: 'plain_text', text: `Open ${VIEW_TITLE[view]}`, emoji: true }, url: href }
}

/**
 * One `actions` block from whichever elements exist, or none at all: Slack
 * rejects an actions block with no elements, and a message's last block is
 * often a row whose only button depends on configuration.
 */
export function actionsRow(elements: Array<Block | null | undefined | false>, blockId?: string): Block[] {
  const present = (elements || []).filter((element): element is Block => Boolean(element))
  if (!present.length) return []
  return [{ type: 'actions', ...(blockId ? { block_id: blockId } : {}), elements: present }]
}

// ── Sentences ───────────────────────────────────────────────────────────────

export type StateNoteKind =
  | 'done'
  | 'taken'
  | 'handedBack'
  | 'dropped'
  | 'snoozed'
  | 'stuck'
  | 'unstuck'
  | 'reopened'
  | 'passed'
  | 'answered'

const MENTION = /^<@[UW][A-Z0-9]+>$/

/**
 * Who, safe for mrkdwn: a real mention as it is, anything else decoded, escaped
 * and stripped of the characters that would end the italics it sits in.
 */
function noteWho(who: string): string {
  const raw = String(who ?? '').trim()
  if (MENTION.test(raw)) return raw
  const plain = escapeSlackText(decodeSlackText(raw)).replace(/[_*~`]/g, ' ').replace(/\s+/g, ' ').trim()
  return plain || 'Someone'
}

/**
 * The italic line a press leaves on the card it redrew, so the room sees what
 * changed without anyone re-reading the task. No task title: the note sits on
 * the card that names it. No pronouns: a gender guessed from a name is a guess.
 */
export function stateNote(kind: StateNoteKind, who: string, now: Date): string {
  const person = noteWho(who)
  const day = formatSlackDay(now, now)
  const on = day ? ` · ${day}` : ''
  switch (kind) {
    case 'done':
      return `_Done by ${person}${on}_`
    case 'taken':
      return `_Taken by ${person}${on}_`
    case 'handedBack':
      return `_Handed back by ${person} — anyone can take it_`
    case 'dropped':
      return `_Dropped by ${person} — Reopen brings it back_`
    case 'snoozed':
      return `_Moved to next week by ${person}_`
    case 'stuck':
      return `_Stuck — ${person} added what’s in the way_`
    case 'unstuck':
      return `_Unstuck by ${person}_`
    case 'reopened':
      return `_Reopened by ${person}_`
    case 'passed':
      return `_${person} passed — still needs someone_`
    case 'answered':
      return `_Answered by ${person}${on}_`
    default:
      return `_Updated by ${person}${on}_`
  }
}

/**
 * Every failure, one shape: what could not be done, that nothing changed, and
 * where to do it instead. "Nothing changed" is the part people need most — a
 * failure that might have half-happened is the one they redo by hand twice.
 */
export function errorLine(verb: string, whereInstead: string): string {
  const what = String(verb ?? '').trim() || 'do that'
  const where = String(whereInstead ?? '').trim()
  const ended = where && !/[.!?]$/.test(where) ? `${where}.` : where
  return `Couldn’t ${what} — nothing changed.${ended ? ` ${ended}` : ''}`
}

/**
 * How to ask her for something, as a phrase people can copy: `Marqueta, my
 * calls`. Never "@Marqueta" — typed, that is plain text and never reaches her —
 * and never "DM me", because DMs are not wired up.
 */
export function askMarqueta(command: string): string {
  const said = String(command ?? '').replace(/`/g, '’').replace(/\s+/g, ' ').trim()
  return said ? `\`Marqueta, ${said}\`` : '`Marqueta, help`'
}

/**
 * Swap every block in a GROUP — ids `mq_money`, `mq_money_runway`,
 * `mq_money_next`… for the prefix `mq_money` — for `next`, at the position of
 * the first one, and leave every other block the very same object.
 *
 * A press redraws only its own part of a message — the money question, say —
 * because rebuilding the whole message would need every other record re-read,
 * and any drift would silently rewrite someone else's part. Returns the SAME
 * array when nothing matches, so a caller can tell "not on this message" (an
 * older post) from "redrawn".
 *
 * Matched on a whole id segment: the prefix itself, or the prefix followed by
 * `_` (a prefix that already ends in `_` matches whatever follows it). So
 * `mq_money` never swallows an unrelated `mq_moneyball`.
 *
 * NOT for a task card. A card's two ids are `mq_task_<id>` and
 * `mq_task_actions_<id>` — no shared prefix covers exactly one card, and
 * `mq_task_ab` is a segment-prefix of another task's `mq_task_ab_2`. Redraw a
 * card with `replaceCheckInTask`, which matches both ids exactly.
 */
export function replaceBlocksByPrefix(blocks: Block[], blockIdPrefix: string, next: Block[]): Block[] {
  if (!Array.isArray(blocks) || !blockIdPrefix) return blocks
  const group = blockIdPrefix.endsWith('_') ? blockIdPrefix : `${blockIdPrefix}_`
  const matches = (block: Block) =>
    typeof block?.block_id === 'string' && (block.block_id === blockIdPrefix || block.block_id.startsWith(group))
  const at = blocks.findIndex(matches)
  if (at === -1) return blocks
  const out: Block[] = []
  blocks.forEach((block, index) => {
    if (index === at) out.push(...(next || []))
    if (!matches(block)) out.push(block)
  })
  return out
}
