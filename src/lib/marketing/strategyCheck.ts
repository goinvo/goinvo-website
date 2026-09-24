/**
 * The monthly strategy check: is the plan still the right plan for the money?
 *
 * The runway already asks whether the NUMBER is still true. Nothing asked the
 * question that number exists to answer. The posture was derived, the plan was
 * written against it, and then both ran on their own: the runway could slide
 * from Rebuild into Survival overnight and the plan would carry on filling the
 * week with content and positioning work chosen for a studio with six months
 * in hand. The arithmetic moved; the decision it was supposed to drive did not.
 *
 * So once a month — on the same clock as the runway, so the two money questions
 * arrive together instead of as two separate nags — Marqueta lays out what the
 * money says and how outreach actually went, and asks one question with two
 * answers: still the right plan, or it needs a rethink. A rethink becomes a
 * DECISION on the board, suggested to the person who asked for it, never
 * assigned; confirming records who said so and against which posture.
 *
 * Recording the posture the plan was confirmed against is the whole trick. A
 * confirmation is only good for the reality it was given in: when the runway
 * crosses a line, the check comes due at once, however recently somebody said
 * "still right" — because they said it about a different studio.
 *
 * Silence is the default. When neither the runway nor the strategy is due,
 * the digest says nothing about money at all; a permanent banner about money
 * in a team channel is a banner people learn to scroll past.
 *
 * Marqueta does not do bookkeeping. "Money" here is the runway date, signed
 * commitments and the pipeline as people logged it — counts and the estimated
 * values typed on contacts, nothing reconciled against an invoice.
 *
 * Dates are UTC throughout. The check runs on Vercel (UTC) and its tests run on
 * laptops in Boston; a local-time month would put the last evening of September
 * in October depending on which machine did the arithmetic.
 *
 * Pure: no fetch, no Sanity, no environment. `strategyCheck.server.ts` reads the
 * records; this decides what they mean and how to say it.
 */

import {
  DEFAULT_FINANCIAL_POSTURE_ID,
  getFinancialPosture,
  type FinancialPostureId,
} from './financialPosture'
import { encodeStrategyValue, MARQUETA_ACTION } from './marquetaActions'
import { describePulse, type OutreachPulse } from './outreachPulse'
import { formatRunwayDate, RUNWAY_STALE_DAYS, type RunwayWin } from './runway'
import { clipSlackText, escapeSlackText, SLACK_LIMITS } from './slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * How long a "still the right plan" stands. Deliberately the runway's own
 * number: the two monthly money questions should come due in the same digest,
 * not on two different Mondays that each feel like a nag.
 */
export const STRATEGY_REVIEW_INTERVAL_DAYS = RUNWAY_STALE_DAYS

const MS_PER_DAY = 86_400_000

/** The one decision this check files. Every rethink reads the same, so they are easy to find later. */
const RETHINK_QUESTION = 'What should change about the plan, given the runway and how outreach is going?'

/**
 * Below this many touches in a month, a posture that says "outreach leads" is
 * not being followed. Five is roughly one a week plus a follow-up — a floor,
 * not a target; the question it triggers is about hours, not about blame.
 */
const LOW_OUTREACH_TOUCHES = 5

/** The postures in which outreach is the strategy rather than one lever among several. */
const OUTREACH_LEADS = new Set<string>(['survival', 'rebuild'])

/**
 * One phrase per posture for the question, in the posture's own terms — so
 * "does the mix match?" names the mix it is supposed to match. Paraphrases the
 * strategy text in financialPosture.ts, which remains the source of truth.
 */
const POSTURE_FOCUS: Record<FinancialPostureId, string> = {
  survival: 'outreach leads, and only work that can close inside the runway',
  rebuild: 'outreach leads while the pipeline refills behind it',
  stable: 'a balance: outreach alongside content and measurement',
  growth: 'long-horizon bets (SEO, thought leadership, experiments) do the heavy lifting',
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** What is stored on the posture doc when somebody answers the check. */
export type StrategyReviewRecord = {
  /** When a person last answered. */
  confirmedAt?: string
  /** Their board name, for "checked by Juhan on 5 Oct". */
  confirmedBy?: string
  verdict?: 'stillRight' | 'rethink'
  /** The month the answer was about ("2026-10"). */
  monthKey?: string
  /** The posture the answer was given against — what makes a posture change re-ask. */
  postureAtReview?: string
}

const parse = (value: string | null | undefined): number | null => {
  if (!value) return null
  const at = Date.parse(String(value).length <= 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(at) ? null : at
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/** "2026-09", in UTC. The key a strategy button carries so a stale press is recognisable. */
export function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7)
}

/** "September 2026". Anything that is not a month key comes back as it was, rather than as a wrong month. */
export function monthLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''))
  if (!match) return String(key || '')
  const month = Number(match[2])
  if (month < 1 || month > 12) return String(key)
  return `${MONTH_NAMES[month - 1]} ${match[1]}`
}

/**
 * The UTC bounds of a calendar month, relative to `now`: 0 is this month, -1
 * last month. `from` is inclusive and `to` exclusive, which is what
 * `summarizeOutreach` expects — so the last second of the month is counted
 * once, not twice.
 */
export function monthWindow(now: Date, offsetMonths: number): { from: string; to: string } {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + Math.trunc(offsetMonths || 0)
  return {
    from: new Date(Date.UTC(year, month, 1)).toISOString(),
    to: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
  }
}

const postureTitle = (id: string | null | undefined) => getFinancialPosture(id)?.title || String(id || 'unknown')

/**
 * Is it time to ask whether the plan still fits the money?
 *
 * In order:
 *
 * 1. Not while a rethink is already on the board. That decision IS the open
 *    question about the plan; asking "still right?" next to it invites two
 *    contradictory answers to the same thing. If the posture has moved since,
 *    the reason says so, so nobody is told "all quiet" when it is not.
 * 2. The posture changed since the answer was given. This outranks the
 *    calendar: a confirmation holds only for the reality it was given in, so a
 *    plan confirmed for Rebuild on Monday is unconfirmed the moment the runway
 *    reads Survival on Tuesday.
 * 3. Never answered at all.
 * 4. The answer is as old as the runway's own stale line.
 *
 * `currentPostureId` is the RESOLVED posture (runway or a newer manual bin),
 * the same one the planner is using — the question is about the plan in force.
 */
export function strategyReviewDue(
  record: StrategyReviewRecord | null | undefined,
  now: Date,
  currentPostureId: string,
  opts: { openRethink?: boolean } = {},
): { due: boolean; reason: string } {
  const before = record?.postureAtReview
  const moved = Boolean(before && currentPostureId && before !== currentPostureId)
  const movedLine = moved
    ? `The runway moved us from ${postureTitle(before)} to ${postureTitle(currentPostureId)} — the plan you confirmed was set for ${postureTitle(before)}.`
    : ''

  if (opts.openRethink) {
    return {
      due: false,
      reason: ['A rethink of the plan is already on the board.', movedLine].filter(Boolean).join(' '),
    }
  }

  if (moved) return { due: true, reason: movedLine }

  const confirmedAt = parse(record?.confirmedAt)
  if (confirmedAt === null) {
    return { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }
  }

  const ageDays = Math.floor((now.getTime() - confirmedAt) / MS_PER_DAY)
  const by = record?.confirmedBy ? ` by ${String(record.confirmedBy).replace(/\s+/g, ' ').trim()}` : ''
  if (ageDays >= STRATEGY_REVIEW_INTERVAL_DAYS) {
    return {
      due: true,
      reason: `The plan was last checked against the money on ${formatRunwayDate(record?.confirmedAt)}${by}, ${ageDays} days ago.`,
    }
  }

  const next = formatRunwayDate(new Date(confirmedAt + STRATEGY_REVIEW_INTERVAL_DAYS * MS_PER_DAY).toISOString())
  return {
    due: false,
    reason: `Checked on ${formatRunwayDate(record?.confirmedAt)}${by}; the next check is due ${next}, sooner if the runway crosses a line.`,
  }
}

/** One logged touch, as much of it as the pipeline reads. */
export type PipelineInteraction = { at?: string | null; statusAfter?: string | null; value?: number | null }

/**
 * Where the pipeline stands: contact statuses, the estimates people typed, and
 * the call log that says when anything was actually won.
 */
export type PipelineContact = {
  status?: string | null
  estimatedValue?: number | null
  /** For naming a win ("Jane Doe (Acme)"). Never an email or a phone number — see `winLabelFor`. */
  name?: string | null
  organization?: string | null
  /**
   * The call log, in any order (it is sorted by `at` here).
   *
   * Required, though null is fine: every win is read from it. A projection that
   * forgot it would report "Won this month: none" and never ask the runway
   * about a win — the same quiet answer as a month nobody won anything in, so
   * nobody would notice. Making the key required turns that into a type error.
   */
  interactions: PipelineInteraction[] | null | undefined
}

/**
 * The GROQ projection that feeds the strategy check, so every caller reads the
 * same fields and nobody forgets `interactions`.
 *
 * A superset of `PULSE_CONTACT_PROJECTION`: one fetch serves
 * `summarizeOutreach`, `summarizePipeline` and `latestWin`.
 */
export const PIPELINE_CONTACT_PROJECTION = `{
  _id, name, organization, status, followUpAt, estimatedValue,
  "interactions": interactions[]{ at, by, channel, statusAfter, value }
}`

export type StrategySnapshot = {
  monthKey: string
  /** The runway line (describeRunway), stated as the number, not the bin. */
  money: string
  postureId: string
  postureTitle: string
  postureStrategy: string
  thisMonth: OutreachPulse
  lastMonth: OutreachPulse | null
  /** This month against last, honestly: a month in progress is never called "down". */
  trend: string
  pipeline: {
    inMeeting: number
    inOpportunity: number
    /** Sum of estimates typed on meeting/opportunity contacts. 0 when nobody has estimated. */
    estimatedValue: number
    wonThisMonth: number
    wonValueThisMonth: number
  }
  gates: { title: string; dueAt?: string; status?: string; overdue: boolean }[]
  /** The one question the check asks. */
  question: string
}

const finiteNonNegative = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0

/** A moment a contact became won, found in its call log. */
type Win = { at: number; iso: string; value: number; contact: PipelineContact }

/**
 * Every moment a contact BECAME won — not every touch that left it won.
 *
 * Won is absorbing (callLog.ts): a voicemail left for a client already won is
 * logged with `statusAfter: 'won'`, and so is every touch the Studio form logs
 * against a won contact, since it defaults to the contact's current status and
 * asks for the closed value again. Counting won-state touches therefore counted
 * one client as a fresh win every time somebody rang them — two "wins" in a
 * September where nothing was won, fed into the money line and into a runway
 * question that would have come back after every routine call.
 *
 * So a win is an entry whose `statusAfter` is won when the contact's previous
 * known state was not. The log is sorted by `at` (a backdated entry is read
 * where it happened, not where it was appended), and an entry that recorded no
 * status is skipped: it says nothing about where the contact stood, so it can
 * neither start nor break a run of won. Won, then lost, then won again is two
 * wins — that is a client coming back.
 *
 * Two consequences, both deliberate. A follow-on engagement with a client
 * already marked won is not a new win here; signed work is recorded against
 * the runway ("We signed something"), which is where money that extends the
 * date belongs. And a contact whose status was set to won by editing the field,
 * with nothing in its log, has no moment of winning to find — its first logged
 * touch afterwards reads as the win, once. The log form is how a win is marked.
 */
function wins(contacts: PipelineContact[]): Win[] {
  const found: Win[] = []
  for (const contact of contacts || []) {
    if (!contact) continue
    const log = (contact.interactions || [])
      .map((entry, index) => ({ entry, index, at: parse(entry?.at) }))
      .filter((row): row is { entry: PipelineInteraction; index: number; at: number } => row.at !== null)
      .sort((a, b) => a.at - b.at || a.index - b.index)
    let previous = ''
    for (const { entry, at } of log) {
      const after = String(entry.statusAfter || '').trim()
      if (!after) continue
      if (after === 'won' && previous !== 'won') {
        found.push({ at, iso: String(entry.at), value: finiteNonNegative(entry.value), contact })
      }
      previous = after
    }
  }
  return found
}

/**
 * Wins inside a window, with the values typed on them. `from` inclusive and
 * `to` exclusive, like `summarizeOutreach`, so a pulse's own window can be
 * passed straight in.
 */
export function winsInWindow(
  contacts: PipelineContact[],
  window: { from: string; to: string },
): { count: number; value: number } {
  const from = parse(window?.from) ?? Number.NEGATIVE_INFINITY
  const to = parse(window?.to) ?? Number.POSITIVE_INFINITY
  let count = 0
  let value = 0
  for (const win of wins(contacts)) {
    if (win.at < from || win.at >= to) continue
    count += 1
    value += win.value
  }
  return { count, value }
}

/** Does a value look like a contact detail? An address, or a phone-length run of digits. */
const looksLikeContactDetail = (value: string) =>
  value.includes('@') || (value.match(/\d/g) || []).length >= 10

/**
 * "Jane Doe (Acme)", for a line that is posted in a channel.
 *
 * The newsletter import put email addresses into `name` for most contacts, so
 * the name cannot be trusted to be a name. Anything that looks like a contact
 * detail is left out entirely rather than scrubbed — the organisation alone is
 * a fine label, and a half-cleaned address is not. Nothing usable gives ''
 * (the runway says "A deal").
 */
function winLabelFor(contact: PipelineContact): string {
  const flat = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim()
  const name = flat(contact.name)
  const organization = flat(contact.organization)
  const usableName = name && !looksLikeContactDetail(name) ? name : ''
  const usableOrg = organization && !looksLikeContactDetail(organization) ? organization : ''
  if (usableName && usableOrg && usableName.toLowerCase() !== usableOrg.toLowerCase()) {
    return `${usableName} (${usableOrg})`
  }
  return usableName || usableOrg
}

/**
 * The most recent moment anything was won, for the runway check-in's
 * `latestWin`: "Jane Doe (Acme) was marked won on 20 Aug — did it extend the
 * runway?".
 *
 * A transition, never a later touch with a client already won (see `wins`) —
 * otherwise that question would come back after every call logged with an
 * existing client. Entries dated after `now` are ignored: a mistyped future
 * date would otherwise outlast every confirmation and keep the question open
 * until the calendar caught up.
 */
export function latestWin(contacts: PipelineContact[], now: Date): RunwayWin | null {
  const limit = now.getTime()
  let latest: Win | null = null
  for (const win of wins(contacts)) {
    if (win.at > limit) continue
    if (!latest || win.at > latest.at) latest = win
  }
  return latest ? { at: latest.iso, label: winLabelFor(latest.contact) } : null
}

/**
 * The pipeline as a count, not a forecast.
 *
 * Contacts in `meeting` and `opportunity` are the live conversations; their
 * estimates are summed as typed, never inferred — a contact without an estimate
 * adds a conversation and no money.
 *
 * Wins are the contacts that BECAME won inside the month's window (`wins`),
 * read from their call logs. Not from contact status, because a contact won in
 * March still reads `won` in September; and not from the pulse's `won`, which
 * counts every touch that left a contact at won — including each routine call
 * to a client already won. `thisMonth` supplies only the window.
 */
export function summarizePipeline(contacts: PipelineContact[], thisMonth: OutreachPulse): StrategySnapshot['pipeline'] {
  let inMeeting = 0
  let inOpportunity = 0
  let estimatedValue = 0
  for (const contact of contacts || []) {
    const status = String(contact?.status || '')
    if (status !== 'meeting' && status !== 'opportunity') continue
    if (status === 'meeting') inMeeting += 1
    else inOpportunity += 1
    estimatedValue += finiteNonNegative(contact.estimatedValue)
  }
  const won = winsInWindow(contacts, { from: thisMonth?.from, to: thisMonth?.to })
  return {
    inMeeting,
    inOpportunity,
    estimatedValue,
    wonThisMonth: won.count,
    wonValueThisMonth: won.value,
  }
}

/** "$120,000". Whole dollars: these are estimates, and cents would claim otherwise. */
function formatMoney(value: number): string {
  return `$${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * "Pipeline: 3 in meeting/opportunity, ~$120,000 estimated · Won this month: 1 ($40,000)".
 *
 * Zeros are said plainly rather than rendered as "~$0", which reads like a
 * measured value instead of a missing one.
 */
function pipelineLine(pipeline: StrategySnapshot['pipeline']): string {
  const live = pipeline.inMeeting + pipeline.inOpportunity
  const conversations =
    live === 0
      ? 'Pipeline: nothing in meeting or opportunity yet'
      : `Pipeline: ${live} in meeting/opportunity, ${
          pipeline.estimatedValue > 0 ? `~${formatMoney(pipeline.estimatedValue)} estimated` : 'no value estimated yet'
        }`
  const won =
    pipeline.wonThisMonth === 0
      ? 'Won this month: none'
      : `Won this month: ${pipeline.wonThisMonth}${
          pipeline.wonValueThisMonth > 0 ? ` (${formatMoney(pipeline.wonValueThisMonth)})` : ''
        }`
  return `${conversations} · ${won}`
}

/**
 * This month against last, without pretending a month in progress is over.
 *
 * Only the full-month total exists for last month, so "down" would be a lie on
 * the 5th. It says the two numbers and which day of the month it is, and only
 * calls a direction when it is already settled (this month has passed last).
 */
function describeTrend(thisMonth: OutreachPulse, lastMonth: OutreachPulse | null, now: Date): string {
  const touches = thisMonth.touches
  if (!lastMonth) return `${plural(touches, 'touch', 'touches')} logged this month; nothing to compare against for last month.`
  const before = lastMonth.touches
  if (touches === 0 && before === 0) return 'No outreach logged this month or last.'
  if (before === 0) return `${plural(touches, 'touch', 'touches')} logged this month; none last month.`
  if (touches >= before) return `${plural(touches, 'touch', 'touches')} logged this month — already past last month's ${before}.`
  const day = now.getUTCDate()
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  return `${plural(touches, 'touch', 'touches')} logged so far this month (day ${day} of ${daysInMonth}), against ${before} in all of last month.`
}

/**
 * The question worth asking this month.
 *
 * When the posture says outreach leads and almost nothing was logged, the
 * question is about hours — the plan is not wrong, it is not happening, and
 * asking "is the mix right?" would let that slide. Otherwise it asks whether
 * the work matches what the posture says it should be.
 */
function strategyQuestion(postureId: string, title: string, thisMonth: OutreachPulse): string {
  const focus = POSTURE_FOCUS[postureId as FinancialPostureId]
  const touches = plural(thisMonth.touches, 'touch', 'touches')
  if (OUTREACH_LEADS.has(postureId) && thisMonth.touches < LOW_OUTREACH_TOUCHES) {
    return `Runway says ${title}: outreach leads. ${touches} logged this month — is outreach getting the hours it needs?`
  }
  if (OUTREACH_LEADS.has(postureId)) {
    const booked = thisMonth.meetings ? ` and ${plural(thisMonth.meetings, 'meeting')} booked` : ''
    return `Runway says ${title}: ${focus}. ${touches} logged this month${booked} — is the rest of the plan staying out of its way?`
  }
  return `Runway says ${title}: ${focus || 'plan to the posture'}. Is that where the hours went this month?`
}

export function buildStrategySnapshot(input: {
  now: Date
  runwaySummary: string
  postureId: string
  thisMonth: OutreachPulse
  lastMonth: OutreachPulse | null
  pipelineContacts: PipelineContact[]
  gates: { title: string; dueAt?: string; status?: string }[]
}): StrategySnapshot {
  const posture = getFinancialPosture(input.postureId)
  const postureId = posture?.id || String(input.postureId || DEFAULT_FINANCIAL_POSTURE_ID)
  const title = posture?.title || postureId
  const now = input.now.getTime()

  const gates = (input.gates || []).map((gate) => {
    const due = parse(gate.dueAt)
    const closed = gate.status === 'done' || gate.status === 'dismissed'
    return {
      title: String(gate.title || 'Untitled decision'),
      ...(gate.dueAt ? { dueAt: gate.dueAt } : {}),
      ...(gate.status ? { status: gate.status } : {}),
      overdue: !closed && due !== null && due < now,
    }
  })

  return {
    monthKey: monthKey(input.now),
    money: String(input.runwaySummary || ''),
    postureId,
    postureTitle: title,
    postureStrategy: posture?.strategy || '',
    thisMonth: input.thisMonth,
    lastMonth: input.lastMonth,
    trend: describeTrend(input.thisMonth, input.lastMonth, input.now),
    pipeline: summarizePipeline(input.pipelineContacts, input.thisMonth),
    gates,
    question: strategyQuestion(postureId, title, input.thisMonth),
  }
}

/** At most three gates, overdue ones named as such. Record text, so escaped. */
function gateLines(gates: StrategySnapshot['gates']): string[] {
  const open = gates.filter((gate) => gate.status !== 'done' && gate.status !== 'dismissed')
  if (open.length === 0) return []
  const shown = open.slice(0, 3).map((gate) => {
    const when = gate.dueAt ? ` — ${gate.overdue ? 'overdue since' : 'due'} ${formatRunwayDate(gate.dueAt)}` : ''
    return `${clipSlackText(escapeSlackText(gate.title), 150)}${when}`
  })
  const more = open.length > 3 ? ` (and ${open.length - 3} more)` : ''
  return [`Decision gates: ${shown.join('; ')}${more}`]
}

/** Join escaped lines into one section's text, clipped to what Slack accepts. */
const sectionText = (lines: string[]) => clipSlackText(lines.filter(Boolean).join('\n'), SLACK_LIMITS.sectionText)

/**
 * The digest's one card about money: the runway question and the strategy
 * question, together.
 *
 * They are the same conversation — "how much time do we have" and "are we
 * spending it on the right things" — and asked separately they read as two
 * nags from two bots. The runway half is `buildRunwayBlocks` (slackDelegation),
 * passed in already built so its buttons and modals stay exactly as they are;
 * this only adds the heading and, when due, the strategy half.
 *
 * When the runway is quiet but the strategy is due, the runway line is still
 * stated, in the strategy section — "does the plan fit the money?" is not a
 * question anybody can answer without the money.
 *
 * Nothing due, nothing said: returns [] and the digest omits the card.
 */
export function buildMoneyAndDirectionBlocks(input: {
  snapshot: StrategySnapshot
  strategyDue: { due: boolean; reason: string }
  runwayBlocks: Block[]
}): Block[] {
  const runway = input.runwayBlocks || []
  // The runway group opens with its own divider; one per card is enough.
  let start = 0
  while (start < runway.length && runway[start]?.type === 'divider') start += 1
  const runwayBody = runway.slice(start)
  const strategyDue = Boolean(input.strategyDue?.due)

  if (runwayBody.length === 0 && !strategyDue) return []

  const blocks: Block[] = [
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: '*Money and direction*' } },
    ...runwayBody,
  ]

  if (!strategyDue) return blocks

  const { snapshot } = input
  const lines = [
    `*Is the plan still right for ${escapeSlackText(monthLabel(snapshot.monthKey))}?*`,
    input.strategyDue.reason ? `_${clipSlackText(escapeSlackText(input.strategyDue.reason), 600)}_` : '',
    runwayBody.length === 0 && snapshot.money ? `Money: ${clipSlackText(escapeSlackText(snapshot.money), 600)}` : '',
    snapshot.postureStrategy
      ? `Plan for *${escapeSlackText(snapshot.postureTitle)}*: ${clipSlackText(escapeSlackText(snapshot.postureStrategy), 600)}`
      : '',
    escapeSlackText(snapshot.trend),
    escapeSlackText(pipelineLine(snapshot.pipeline)),
    ...gateLines(snapshot.gates),
    `*${clipSlackText(escapeSlackText(snapshot.question), 600)}*`,
  ]

  blocks.push({ type: 'section', text: { type: 'mrkdwn', text: sectionText(lines) } })
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: MARQUETA_ACTION.strategyConfirm,
        text: { type: 'plain_text', text: 'Still the right plan' },
        style: 'primary',
        value: encodeStrategyValue(snapshot.monthKey),
      },
      {
        type: 'button',
        action_id: MARQUETA_ACTION.strategyRethink,
        text: { type: 'plain_text', text: 'Needs a rethink' },
        value: encodeStrategyValue(snapshot.monthKey),
      },
    ],
  })
  return blocks
}

/**
 * The answer to "@Marqueta strategy": the same facts as the digest card, as
 * one message, without buttons — the check itself is answered on the digest,
 * where there is one card for the whole team rather than one per person who
 * happened to ask.
 */
export function strategyAnswerText(snapshot: StrategySnapshot, due: { due: boolean; reason: string }): string {
  const lines = [
    `*Strategy — ${escapeSlackText(monthLabel(snapshot.monthKey))}*`,
    snapshot.money ? `Money: ${clipSlackText(escapeSlackText(snapshot.money), 600)}` : '',
    snapshot.postureStrategy
      ? `Plan for *${escapeSlackText(snapshot.postureTitle)}*: ${clipSlackText(escapeSlackText(snapshot.postureStrategy), 600)}`
      : `Posture: *${escapeSlackText(snapshot.postureTitle)}*`,
    escapeSlackText(snapshot.trend),
    escapeSlackText(pipelineLine(snapshot.pipeline)),
    ...gateLines(snapshot.gates),
    escapeSlackText(snapshot.question),
    due?.reason
      ? `_${clipSlackText(escapeSlackText(due.reason), 600)}${due.due ? ' I will ask on the next digest.' : ''}_`
      : '',
  ]
  return sectionText(lines)
}

/**
 * The answer to "@Marqueta runway" (and money, and finances): the runway line,
 * any disagreement between the date and a hand-set bin, the check-in if one is
 * due, and the pipeline — because "how are we for money?" asked in a studio
 * that does not do its bookkeeping in Slack means "how long, and what is
 * coming".
 *
 * Every input is plain text and escaped here. `checkInLine` in particular can
 * now carry a won contact's name.
 */
export function moneyAnswerText(input: {
  runwaySummary: string
  disagreement?: string | null
  checkInLine?: string
  pipeline: StrategySnapshot['pipeline']
}): string {
  const lines = [
    `*Runway* ${clipSlackText(escapeSlackText(input.runwaySummary || 'No runway recorded.'), 600)}`,
    input.disagreement ? `_${clipSlackText(escapeSlackText(input.disagreement), 600)}_` : '',
    input.checkInLine ? clipSlackText(escapeSlackText(input.checkInLine), 600) : '',
    escapeSlackText(pipelineLine(input.pipeline)),
  ]
  return sectionText(lines)
}

/**
 * The answer to "@Marqueta pipeline": this week, this month, and what is live.
 *
 * Counts only. `byPerson` is deliberately never shown: in a channel it is a
 * leaderboard, and a leaderboard of who made the most cold calls is the fastest
 * way to make sure nobody logs the calls they did make.
 *
 * Wins are said once, in the pipeline line, from `summarizePipeline`. The
 * pulse's own `won` counts every touch that left a contact at won, so a month
 * of calls to one existing client would read "2 won" directly above "Won this
 * month: none" — the pulse lines are described with their won count removed.
 */
export function pipelineAnswerText(
  week: OutreachPulse,
  month: OutreachPulse,
  pipeline: StrategySnapshot['pipeline'],
): string {
  const withoutWins = (pulse: OutreachPulse): OutreachPulse => ({ ...pulse, won: 0, wonValue: 0 })
  return sectionText([
    '*Pipeline*',
    escapeSlackText(describePulse(withoutWins(week), 'Outreach this week')),
    escapeSlackText(describePulse(withoutWins(month), 'This month')),
    escapeSlackText(pipelineLine(pipeline)),
  ])
}

/**
 * The board key for a rethink: one per CHECK, not one per month.
 *
 * A month is not one check. A rethink filed on 5 Oct can be settled on the 8th,
 * and on the 13th the runway can cross into Survival and bring the check due
 * again. Keyed by month alone, that second "Needs a rethink" named the closed
 * decision's `_id`, `createIfNotExists` did nothing, the verdict was still
 * recorded — and the board showed no rethink at all, to a team that had just
 * asked for one.
 *
 * What identifies a check is the answer it follows: every verdict stamps a new
 * `confirmedAt`, so the review record read BEFORE this press names the check
 * being answered. Two people pressing on the same card read the same record and
 * get the same key, which is what keeps a double press to one decision; the
 * next check follows a different answer and gets a new one. With no answer on
 * record the key is the plain month, as it always was.
 *
 * For this to hold, the caller records the verdict whenever it files one, and
 * reads the review record before writing either.
 */
export function strategyReviewSourceKey(
  monthKey: string,
  priorReview: StrategyReviewRecord | null | undefined,
): string {
  const prior = parse(priorReview?.confirmedAt)
  if (prior === null) return `strategy-review/${monthKey}`
  return `strategy-review/${monthKey}/after-${new Date(prior).toISOString().replace(/[-:.]/g, '')}`
}

const VERDICT_WORDS: Record<NonNullable<StrategyReviewRecord['verdict']>, string> = {
  stillRight: 'still the right plan',
  rethink: 'needs a rethink',
}

/**
 * The board decision behind "Needs a rethink".
 *
 * Returned ready for `normalizeMarketingOperationInput`, which derives the
 * deterministic `_id` from `sourceKey` — one decision per check (see
 * `strategyReviewSourceKey`), however many times the button is pressed or
 * Slack retries the press, and a fresh one when a later check in the same
 * month asks again after the first was settled.
 *
 * `priorReview` is the review record as it stood BEFORE this press — required,
 * null when there is none, so a caller cannot fall back to the per-month key by
 * leaving it out.
 *
 * The person who asked is the SUGGESTED owner, not the owner. Pressing "this
 * needs a rethink" is raising a hand about the plan, not volunteering to
 * rewrite it; setting `ownerName` from that press would be assigning work
 * nobody accepted.
 */
export function buildStrategyDecisionOperation(input: {
  monthKey: string
  personName: string
  now: Date
  question?: string
  priorReview: StrategyReviewRecord | null
}): Record<string, unknown> {
  const at = input.now.toISOString()
  const label = monthLabel(input.monthKey)
  const person = String(input.personName || '').replace(/\s+/g, ' ').trim()
  const question = String(input.question || '').replace(/\s+/g, ' ').trim()
  const prior = input.priorReview
  // A verdict the record should not hold is left unsaid, not guessed at.
  const priorWords = (prior?.verdict && VERDICT_WORDS[prior.verdict]) || ''
  const priorBy = String(prior?.confirmedBy || '').replace(/\s+/g, ' ').trim()
  // What the last answer was, so a second rethink in a month says why it is
  // not a duplicate of the first.
  const previously =
    parse(prior?.confirmedAt) !== null && priorWords
      ? ` The last answer was "${priorWords}", on ${formatRunwayDate(prior?.confirmedAt)}${priorBy ? ` by ${priorBy}` : ''}.`
      : ''
  return {
    sourceKey: strategyReviewSourceKey(input.monthKey, prior),
    title: `Rethink the marketing plan (${label})`,
    summary: `${person || 'Someone'} said in Slack that the plan needs a rethink for ${label}.${previously}`,
    whyNow: question || 'The monthly check said the plan no longer fits the money or how outreach is going.',
    nextAction: 'Talk it through, then change the plan (or confirm it) in the Studio and note what changed here.',
    humanQuestion: RETHINK_QUESTION,
    kind: 'decision',
    status: 'needsHuman',
    priority: 'urgent',
    origin: 'manual',
    autonomy: 'humanReview',
    targetView: 'strategy',
    dueAt: new Date(input.now.getTime() + 7 * MS_PER_DAY).toISOString(),
    ...(person ? { suggestedOwner: person } : {}),
    activity: [
      {
        at,
        actor: 'person',
        action: 'Asked for a rethink from Slack',
        ...(person ? { outcome: `By ${person}` } : {}),
      },
    ],
    lastEvaluatedAt: at,
  }
}
