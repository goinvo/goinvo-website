/**
 * Pure composition helpers for the gated /action-plan page ("Execution Plan").
 *
 * Everything here is dependency-free (dates.ts only): the page maps GROQ rows
 * into the input shapes below, and unit tests drive the same functions with
 * fixtures — no Sanity client, no React, no network.
 *
 * The plan's identity constants (prefixes, window) live here so the page, the
 * seed catalog, and the tests can never drift apart.
 */

import { addDays, monthLabel, startOfMonth, toDateInputValue } from './dates'

// ── Identity constants ───────────────────────────────────────────────────────

/** sourceKey prefix for the plan's marketingOperation docs (private dataset). */
export const EXEC_PLAN_OP_PREFIX = 'exec-plan-2026q4/'
/** _id prefix for the plan's marketingCalendarItem docs (production dataset). */
export const EXEC_PLAN_CALENDAR_PREFIX = 'mcal-plan2026q4-'

export const PLAN_START = '2026-09-01'
export const PLAN_END = '2026-11-30'
export const PLAN_MONTHS = ['2026-09', '2026-10', '2026-11'] as const

export type PlanPhaseKey = 'phase1' | 'phase2' | 'phase3' | 'gate'

export interface PlanPhaseDef {
  key: Exclude<PlanPhaseKey, 'gate'>
  title: string
  summary: string
  startsOn: string
  endsOn: string
}

/** The three phase bars. Decision gates render as markers, not a bar. */
export const PLAN_PHASES: PlanPhaseDef[] = [
  {
    key: 'phase1',
    title: 'Warm-network call waves',
    summary: 'Four call waves through the ranked list — the network finally gets tested.',
    startsOn: '2026-09-01',
    endsOn: '2026-11-20',
  },
  {
    key: 'phase2',
    title: 'Lead-magnet ship',
    summary: 'Pre-mortem article, scorecard, and gated facilitator kit — instrumented first-party.',
    startsOn: '2026-09-11',
    endsOn: '2026-10-21',
  },
  {
    key: 'phase3',
    title: 'Committee-pass assets',
    summary: 'The stage-two answers a buying committee checks: security posture, price bands, continuity.',
    startsOn: '2026-10-23',
    endsOn: '2026-11-18',
  },
]

const PHASE_KEYS = new Set<string>(['phase1', 'phase2', 'phase3', 'gate'])

/** Maps a plan operation's sourceKey to its phase, or null for foreign keys. */
export function planPhaseForSourceKey(sourceKey: string): PlanPhaseKey | null {
  if (!sourceKey.startsWith(EXEC_PLAN_OP_PREFIX)) return null
  const segment = sourceKey.slice(EXEC_PLAN_OP_PREFIX.length).split('/')[0]
  return PHASE_KEYS.has(segment) ? (segment as PlanPhaseKey) : null
}

// ── Segment labels (shared with /outreach-plan) ──────────────────────────────

export const SEGMENT_LABELS: Record<string, string> = {
  healthtech: 'Healthtech',
  research: 'Research / academic',
  government: 'Government',
  provider: 'Providers',
  pharma: 'Pharma',
  medDevice: 'Med-device',
  payer: 'Payers',
  other: 'Other',
}

// ── Input row shapes (page maps GROQ results into these) ─────────────────────

export interface PlanOperation {
  _id: string
  title: string
  status: string
  priority?: string
  kind?: string
  ownerName?: string
  dueAt?: string
  blocker?: string
  humanQuestion?: string
  nextAction?: string
  summary?: string
  sourceKey: string
}

export interface PlanContentItem {
  _id: string
  title: string
  status: string
  publishAt?: string
  contentType?: string
  channel?: string
  brief?: string
}

export interface PlanFollowUp {
  _id: string
  name?: string
  organization?: string
  status?: string
  followUpAt?: string
  nextStep?: string
}

// ── Month navigation ─────────────────────────────────────────────────────────

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

function monthKeyToDate(key: string): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

/**
 * Resolves a ?month=YYYY-MM param to a month inside the plan window.
 * Anything outside the window clamps to the nearest edge; garbage or absence
 * falls back to the current month (clamped).
 */
export function parsePlanMonth(raw: string | undefined, now: Date = new Date()): Date {
  const first = PLAN_MONTHS[0]
  const last = PLAN_MONTHS[PLAN_MONTHS.length - 1]
  const clamp = (key: string) => (key < first ? first : key > last ? last : key)
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return monthKeyToDate(clamp(raw))
  return monthKeyToDate(clamp(monthKeyOf(startOfMonth(now))))
}

export interface PlanMonthNav {
  prev: string | null
  next: string | null
  label: string
}

/** Prev/next month keys within the window (null at the edges) + display label. */
export function planMonthNav(month: Date): PlanMonthNav {
  const key = monthKeyOf(month)
  const index = (PLAN_MONTHS as readonly string[]).indexOf(key)
  return {
    prev: index > 0 ? PLAN_MONTHS[index - 1] : null,
    next: index >= 0 && index < PLAN_MONTHS.length - 1 ? PLAN_MONTHS[index + 1] : null,
    label: monthLabel(month),
  }
}

// ── Calendar grid ────────────────────────────────────────────────────────────

export interface PlanCalendarCell {
  date: Date
  dateKey: string
  inMonth: boolean
  isToday: boolean
}

/**
 * The Studio calendar's fixed 6×7 grid: 42 cells starting on the Sunday on or
 * before the 1st. Re-implemented here (matching semantics) rather than
 * importing the Studio-typed domain module into a public page.
 */
export function buildPlanCalendarCells(month: Date, now: Date = new Date()): PlanCalendarCell[] {
  const first = startOfMonth(month)
  const start = addDays(first, -first.getDay())
  const todayKey = toDateInputValue(now)
  const cells: PlanCalendarCell[] = []
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index)
    const dateKey = toDateInputValue(date)
    cells.push({
      date,
      dateKey,
      inMonth: date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear(),
      isToday: dateKey === todayKey,
    })
  }
  return cells
}

// ── Merged plan entries ──────────────────────────────────────────────────────

export type PlanEntryKind = 'operation' | 'content' | 'followUp'

export interface PlanCalendarEntry {
  kind: PlanEntryKind
  id: string
  title: string
  dateKey: string
  status: string
  owner?: string
  detail?: string
  done: boolean
  overdue: boolean
}

const OPERATION_DONE_STATUSES = new Set(['done', 'dismissed'])
const CONTENT_DONE_STATUSES = new Set(['published', 'canceled'])
const ENTRY_KIND_ORDER: Record<PlanEntryKind, number> = { operation: 0, content: 1, followUp: 2 }

/**
 * Merges the three streams (operations by dueAt, content items by publishAt,
 * contact follow-ups by followUpAt) into a per-day map keyed by YYYY-MM-DD.
 * Undated rows are skipped. "Done" = op done/dismissed or content
 * published/canceled; "overdue" = dated before today and not done.
 */
export function mergePlanEntries(input: {
  operations: PlanOperation[]
  contentItems: PlanContentItem[]
  followUps: PlanFollowUp[]
  now?: Date
}): Map<string, PlanCalendarEntry[]> {
  const todayKey = toDateInputValue(input.now ?? new Date())
  const entries: PlanCalendarEntry[] = []

  for (const op of input.operations) {
    const dateKey = toDateInputValue(op.dueAt)
    if (!dateKey) continue
    const done = OPERATION_DONE_STATUSES.has(op.status)
    entries.push({
      kind: 'operation',
      id: op._id,
      title: op.title,
      dateKey,
      status: op.status,
      owner: op.ownerName || undefined,
      detail: op.blocker || undefined,
      done,
      overdue: dateKey < todayKey && !done,
    })
  }

  for (const item of input.contentItems) {
    const dateKey = toDateInputValue(item.publishAt)
    if (!dateKey) continue
    const done = CONTENT_DONE_STATUSES.has(item.status)
    entries.push({
      kind: 'content',
      id: item._id,
      title: item.title,
      dateKey,
      status: item.status,
      detail: [item.contentType, item.channel].filter(Boolean).join(' · ') || undefined,
      done,
      overdue: dateKey < todayKey && !done,
    })
  }

  for (const followUp of input.followUps) {
    const dateKey = toDateInputValue(followUp.followUpAt)
    if (!dateKey) continue
    entries.push({
      kind: 'followUp',
      id: followUp._id,
      title: followUp.name || 'Contact follow-up',
      dateKey,
      status: followUp.status || 'due',
      detail: followUp.nextStep || undefined,
      done: false,
      overdue: dateKey < todayKey,
    })
  }

  entries.sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey) ||
    ENTRY_KIND_ORDER[a.kind] - ENTRY_KIND_ORDER[b.kind] ||
    a.title.localeCompare(b.title),
  )

  const byDay = new Map<string, PlanCalendarEntry[]>()
  for (const entry of entries) {
    const bucket = byDay.get(entry.dateKey)
    if (bucket) bucket.push(entry)
    else byDay.set(entry.dateKey, [entry])
  }
  return byDay
}

// ── Phase progress ───────────────────────────────────────────────────────────

export interface PhaseProgress {
  total: number
  done: number
  percent: number
  overdue: number
}

/**
 * Progress for one phase from its plan operations. Dismissed ops leave the
 * denominator (they were removed from the plan, not completed).
 */
export function phaseProgress(
  phase: PlanPhaseKey,
  operations: PlanOperation[],
  now: Date = new Date(),
): PhaseProgress {
  const todayKey = toDateInputValue(now)
  const scoped = operations.filter(
    (op) => planPhaseForSourceKey(op.sourceKey) === phase && op.status !== 'dismissed',
  )
  const done = scoped.filter((op) => op.status === 'done').length
  const overdue = scoped.filter((op) => {
    const dateKey = toDateInputValue(op.dueAt)
    return Boolean(dateKey) && dateKey < todayKey && op.status !== 'done'
  }).length
  return {
    total: scoped.length,
    done,
    percent: scoped.length ? Math.round((done / scoped.length) * 100) : 0,
    overdue,
  }
}

// ── Next-two-weeks action list ───────────────────────────────────────────────

export interface PlanWeekGroup {
  weekStartKey: string
  label: string
  entries: PlanCalendarEntry[]
}

function mondayOf(dateKey: string): Date {
  const date = new Date(`${dateKey}T12:00:00`)
  return addDays(date, -((date.getDay() + 6) % 7))
}

function weekLabel(weekStart: Date): string {
  return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

/**
 * The working queue: entries in the next 14 days (from today, clamped to the
 * plan start), grouped by Monday-anchored week. Overdue open items float into
 * the first group so they cannot silently age out of view.
 */
export function groupNextTwoWeeks(
  entries: Map<string, PlanCalendarEntry[]>,
  now: Date = new Date(),
): PlanWeekGroup[] {
  const todayKey = toDateInputValue(now)
  const startKey = todayKey < PLAN_START ? PLAN_START : todayKey
  const endKey = toDateInputValue(addDays(new Date(`${startKey}T12:00:00`), 14))

  const all = [...entries.values()].flat()
  const inWindow = all.filter((entry) => entry.dateKey >= startKey && entry.dateKey < endKey)
  const overdueOpen = all.filter((entry) => entry.overdue && !entry.done && entry.dateKey < startKey)

  const groups = new Map<string, PlanCalendarEntry[]>()
  const put = (weekStart: Date, entry: PlanCalendarEntry) => {
    const key = toDateInputValue(weekStart)
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }

  for (const entry of inWindow) put(mondayOf(entry.dateKey), entry)
  // Overdue open items join the FIRST upcoming group (not a phantom past week)
  // so they sit at the top of the working queue instead of aging out of view.
  if (overdueOpen.length > 0) {
    const firstKey = [...groups.keys()].sort()[0] ?? toDateInputValue(mondayOf(startKey))
    for (const entry of overdueOpen) put(new Date(`${firstKey}T12:00:00`), entry)
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStartKey, groupEntries]) => ({
      weekStartKey,
      label: weekLabel(new Date(`${weekStartKey}T12:00:00`)),
      entries: groupEntries.sort(
        (a, b) =>
          a.dateKey.localeCompare(b.dateKey) ||
          ENTRY_KIND_ORDER[a.kind] - ENTRY_KIND_ORDER[b.kind] ||
          a.title.localeCompare(b.title),
      ),
    }))
}

// ── Live-composed supporting documents ───────────────────────────────────────

export interface PlanOffer {
  key?: string
  title?: string
  oneLiner?: string
  description?: string
  priceBand?: string
  idealBuyer?: string
  proofPoints?: string
}

export interface ScriptContact {
  researchSuggestedSegment?: string
  suggestedOpener?: string
  suggestedOfferKey?: string
  evidenceIds?: string[]
}

export interface PlanEvidence {
  _id: string
  title?: string
  client?: string
  segments?: string[]
  businessOutcomes?: string[]
  highlights?: Array<{ metric?: string; detail?: string }>
}

/** The call structure's fixed lines — kept in step with /outreach-plan. */
export const PREMORTEM_QUESTION =
  '“It’s 18 months out and the pilot quietly died — what killed it?”'
export const CALL_ASK =
  'One free 30-minute working session on a problem they already own — name who should be in the room and what gets scoped. That is the entire ask.'

export interface CallScript {
  segment: string
  segmentLabel: string
  contactCount: number
  openerExamples: string[]
  premortemQuestion: string
  offer: PlanOffer | null
  evidenceBullets: string[]
  ask: string
}

/**
 * Composes the per-segment call script from live CMS rows: the segment's real
 * openers set the register, the modal suggested offer is the pitch, and the
 * most-referenced evidence becomes the proof bullets. Returns null when the
 * segment has no researched contacts.
 */
export function composeCallScript(
  segment: string,
  contacts: ScriptContact[],
  offers: PlanOffer[],
  evidence: PlanEvidence[],
): CallScript | null {
  const segmentContacts = contacts.filter((contact) => contact.researchSuggestedSegment === segment)
  if (segmentContacts.length === 0) return null

  const openerExamples: string[] = []
  for (const contact of segmentContacts) {
    const opener = contact.suggestedOpener?.trim()
    if (opener && !openerExamples.includes(opener)) openerExamples.push(opener)
    if (openerExamples.length >= 3) break
  }

  const offerCounts = new Map<string, number>()
  for (const contact of segmentContacts) {
    const key = contact.suggestedOfferKey?.trim()
    if (key) offerCounts.set(key, (offerCounts.get(key) || 0) + 1)
  }
  const rankedOfferKeys = [...offerCounts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
  let offer: PlanOffer | null = null
  for (const key of rankedOfferKeys) {
    const match = offers.find((candidate) => candidate.key === key)
    if (match) {
      offer = match
      break
    }
  }

  const referenceCounts = new Map<string, number>()
  for (const contact of segmentContacts) {
    for (const id of contact.evidenceIds || []) {
      referenceCounts.set(id, (referenceCounts.get(id) || 0) + 1)
    }
  }
  const evidenceBullets = evidence
    .map((item) => ({
      item,
      references: referenceCounts.get(item._id) || 0,
      segmentMatch: item.segments?.includes(segment) ? 1 : 0,
    }))
    .filter((entry) => entry.references > 0 || entry.segmentMatch > 0)
    .sort((a, b) => b.references - a.references || b.segmentMatch - a.segmentMatch)
    .slice(0, 3)
    .map(({ item }) => {
      const outcome = item.businessOutcomes?.[0] || item.highlights?.[0]?.metric || ''
      const client = item.client ? ` (${item.client})` : ''
      return `${item.title || 'Untitled evidence'}${client}${outcome ? ` — ${outcome}` : ''}`
    })

  return {
    segment,
    segmentLabel: SEGMENT_LABELS[segment] || segment,
    contactCount: segmentContacts.length,
    openerExamples,
    premortemQuestion: PREMORTEM_QUESTION,
    offer,
    evidenceBullets,
    ask: CALL_ASK,
  }
}

export interface EmailTemplate {
  key: 'firstTouch' | 'followUp'
  title: string
  subject: string
  body: string
}

function offerLine(offer: PlanOffer): string {
  const price = offer.priceBand?.trim()
  return `• ${offer.title || offer.key} — ${offer.oneLiner || ''}${price ? ` (${price})` : ''}`
}

/**
 * Email skeletons merged with the live offer catalog. A pure function of
 * offers by design: contact data cannot leak into a template because it never
 * enters this function.
 */
export function composeEmailTemplates(offers: PlanOffer[]): EmailTemplate[] {
  const offerLines = offers.slice(0, 3).map(offerLine).join('\n')
  const firstTouch: EmailTemplate = {
    key: 'firstTouch',
    title: 'First touch — warm contact',
    subject: '{{firstName}} — a working session on {{theirProblem}}',
    body: [
      'Hi {{firstName}},',
      '',
      '{{personalOpener}}',
      '',
      '{{evidenceLine}}',
      '',
      offerLines
        ? `We’ve packaged what we do into fixed-scope engagements. Most relevant to you:\n${offerLines}`
        : 'We’ve packaged what we do into fixed-scope engagements.',
      '',
      'No pitch: I’d like to offer a free 30-minute working session on a problem you already own. If it’s useful, you’ll know exactly what working with us looks like before signing anything.',
      '',
      'Would {{proposedTimes}} work?',
      '',
      '— {{sender}}',
    ].join('\n'),
  }
  const followUp: EmailTemplate = {
    key: 'followUp',
    title: 'Follow-up — no reply',
    subject: 'Re: a working session on {{theirProblem}}',
    body: [
      'Hi {{firstName}},',
      '',
      'Floating this back up — the offer of a free 30-minute working session stands.',
      '',
      offerLines ? `If it helps to see it framed:\n${offerLines}` : '{{evidenceLine}}',
      '',
      'If the timing is wrong, one line back saying “not now” is genuinely useful and I’ll stop nudging.',
      '',
      '— {{sender}}',
    ].join('\n'),
  }
  return [firstTouch, followUp]
}
