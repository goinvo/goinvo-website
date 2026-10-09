/**
 * The studio's intent: where we want to be, and how we will know we got there.
 *
 * A general's first job is not the plan. It is the intent the plan serves — the
 * end state, stated plainly enough that anyone can tell whether a move helps.
 * Everything else Marqueta does as a strategist (surveying the terrain, the
 * sitrep, allocating the week, planning backwards) is judged against this one
 * record. Without it she can only report; with it she can say "that pain is an
 * opening for objective 2" or "we said med-device, and spent nothing there".
 *
 * Kept small on purpose: one end state, at most three objectives, and for each
 * the ONE number that says we got there plus the early signs that it is
 * working. Three objectives is already a split focus; more is a wish list.
 *
 * She drafts; people decide. A draft is never acted on as if approved, the
 * digest says so out loud, and approval is checked against the studio's
 * Team permissions setting (`teamAccess.ts`: anyone, or named approvers). Every
 * version is kept in `history` with who did what, so "who changed our goals?"
 * always has an answer.
 *
 * Private by nature (it names targets and the runway it was written against):
 * the record lives in the outreach dataset and the type is in
 * INTERNAL_MARKETING_TYPES. Nothing in this file holds the studio's actual
 * goals — those are data, written at runtime, never committed.
 *
 * Pure: validation, versioning, permission, prompts and Slack rendering are all
 * testable without a client. The `.server` companion reads and writes.
 */

import { extractJsonObject } from './marquetaGenerate'
import { LABEL, formatSlackDay, countLabel } from './marquetaStyle'
import { clipSlackText, escapeSlackText, SLACK_LIMITS } from './slackText'
import { describeApproval, type TeamAccess } from './teamAccess'

export const STRATEGY_INTENT_DOC_ID = 'marketingStrategyIntent'
export const STRATEGY_INTENT_TYPE = 'marketingStrategyIntent'

/** More than three objectives is a wish list, not a focus. */
export const MAX_OBJECTIVES = 3
const MAX_LIST = 6

export type IntentObjective = {
  /** Stable slug, so plans and sitreps can point at an objective across versions. */
  key: string
  /** What we want to be true, in one sentence. */
  statement: string
  /** The one number that says we got there ("signed med-device engagements"). */
  measure: string
  /** The value that counts as success, and the date it is due. */
  target: number | null
  by: string | null
  /** The last known value, and when it was read. Null = nobody has measured it. */
  current: number | null
  currentAsOf: string | null
  /** Early signs it is working, read weekly (discovery calls booked, replies). */
  leadingIndicators: string[]
}

export type IntentAssumption = {
  statement: string
  /** When to check it is still true. An assumption with no date is never checked. */
  checkBy: string | null
}

export type IntentHistoryEntry = {
  version: number
  status: IntentStatus
  by: string
  at: string
  note: string
}

export type IntentStatus = 'draft' | 'approved'

export type StrategyIntent = {
  status: IntentStatus
  version: number
  /** Where we want to see ourselves at the horizon, in two or three sentences. */
  endState: string
  /** YYYY-MM-DD the end state is for. */
  horizon: string | null
  objectives: IntentObjective[]
  /** What we deliberately will not do — the other half of focus. */
  notDoing: string[]
  /** What limits us (hours, runway posture, people). */
  constraints: string[]
  /** What has to stay true for this to be the right intent. */
  assumptions: IntentAssumption[]
  /** What the latest draft was built from, so a revision keeps that context. Private. */
  contextNotes: string
  draftedBy: string
  draftedAt: string
  /** What changed in this version, in a sentence. */
  changeNote: string
  approvedBy: string | null
  approvedSlackUserId: string | null
  approvedAt: string | null
  history: IntentHistoryEntry[]
}

/* ---------------------------------------------------------------------------
 * Validation and versioning.
 * ------------------------------------------------------------------------- */

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
const text = (value: unknown, max: number): string => clean(value).slice(0, max)
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const day = (value: unknown): string | null => {
  const candidate = clean(value).slice(0, 10)
  return ISO_DAY.test(candidate) && !Number.isNaN(Date.parse(candidate)) ? candidate : null
}
const num = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}
const list = (value: unknown, max: number, each: number): string[] =>
  Array.isArray(value) ? value.map((entry) => text(entry, each)).filter(Boolean).slice(0, max) : []

export function slugifyKey(value: string): string {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'objective'
  )
}

function normalizeObjective(raw: unknown, index: number, taken: Set<string>): IntentObjective | null {
  const record = (raw || {}) as Record<string, unknown>
  const statement = text(record.statement, 300)
  if (!statement) return null
  let key = slugifyKey(clean(record.key) || statement)
  while (taken.has(key)) key = `${key}-${index + 1}`
  taken.add(key)
  return {
    key,
    statement,
    measure: text(record.measure, 160),
    target: num(record.target),
    by: day(record.by),
    current: num(record.current),
    currentAsOf: day(record.currentAsOf),
    leadingIndicators: list(record.leadingIndicators, 4, 160),
  }
}

/** Read a stored or proposed intent defensively. Returns null when there is nothing usable. */
export function normalizeIntent(raw: unknown): StrategyIntent | null {
  const record = (raw || {}) as Record<string, unknown>
  const taken = new Set<string>()
  const objectives = (Array.isArray(record.objectives) ? record.objectives : [])
    .map((objective, index) => normalizeObjective(objective, index, taken))
    .filter((objective): objective is IntentObjective => Boolean(objective))
    .slice(0, MAX_OBJECTIVES)
  const endState = text(record.endState, 900)
  if (!endState && !objectives.length) return null

  const history = (Array.isArray(record.history) ? record.history : [])
    .map((entry) => {
      const e = (entry || {}) as Record<string, unknown>
      return {
        version: num(e.version) ?? 0,
        status: e.status === 'approved' ? ('approved' as const) : ('draft' as const),
        by: text(e.by, 80),
        at: clean(e.at),
        note: text(e.note, 400),
      }
    })
    .filter((entry) => entry.version > 0 && entry.at)

  return {
    status: record.status === 'approved' ? 'approved' : 'draft',
    version: Math.max(1, Math.trunc(num(record.version) ?? 1)),
    endState,
    horizon: day(record.horizon),
    objectives,
    notDoing: list(record.notDoing, MAX_LIST, 200),
    constraints: list(record.constraints, MAX_LIST, 200),
    assumptions: (Array.isArray(record.assumptions) ? record.assumptions : [])
      .map((entry) => {
        const e = (entry || {}) as Record<string, unknown>
        return { statement: text(e.statement ?? entry, 240), checkBy: day(e.checkBy) }
      })
      .filter((entry) => entry.statement)
      .slice(0, MAX_LIST),
    contextNotes: text(record.contextNotes, 6000),
    draftedBy: text(record.draftedBy, 80) || 'Marqueta',
    draftedAt: clean(record.draftedAt),
    changeNote: text(record.changeNote, 400),
    approvedBy: text(record.approvedBy, 80) || null,
    approvedSlackUserId: text(record.approvedSlackUserId, 40) || null,
    approvedAt: clean(record.approvedAt) || null,
    history,
  }
}

/**
 * What stops this intent being approvable, in plain words. Empty = ready.
 *
 * An objective without a number and a date cannot be worked backwards from or
 * measured, which is the whole reason to have one — so approval waits for it.
 */
export function intentProblems(intent: StrategyIntent, now: Date): string[] {
  const problems: string[] = []
  if (!intent.endState) problems.push('There is no end state — say where we want to be.')
  if (!intent.horizon) problems.push('There is no horizon date for the end state.')
  else if (Date.parse(intent.horizon) < now.getTime()) problems.push(`The horizon (${intent.horizon}) is already past.`)
  if (!intent.objectives.length) problems.push('There are no objectives.')
  intent.objectives.forEach((objective, index) => {
    const name = `Objective ${index + 1}`
    if (!objective.measure) problems.push(`${name} has no measure — what number says we got there?`)
    if (objective.target === null) problems.push(`${name} has no target value.`)
    if (!objective.by) problems.push(`${name} has no date.`)
  })
  return problems
}

/** A new draft version from a proposal, keeping the history and what it was built from. */
export function nextDraft(
  current: StrategyIntent | null,
  proposed: StrategyIntent,
  input: { by: string; at: string; note: string },
): StrategyIntent {
  const version = (current?.version || 0) + 1
  return {
    ...proposed,
    status: 'draft',
    version,
    contextNotes: proposed.contextNotes || current?.contextNotes || '',
    draftedBy: input.by,
    draftedAt: input.at,
    changeNote: input.note,
    approvedBy: null,
    approvedSlackUserId: null,
    approvedAt: null,
    history: [
      ...(current?.history || []),
      { version, status: 'draft', by: input.by, at: input.at, note: input.note.slice(0, 400) },
    ],
  }
}

/** The same version, approved. Refuses (null) an intent that still has problems. */
export function approveIntent(
  intent: StrategyIntent,
  input: { by: string; slackUserId?: string; at: string; now: Date },
): StrategyIntent | null {
  if (intentProblems(intent, input.now).length) return null
  return {
    ...intent,
    status: 'approved',
    approvedBy: input.by,
    approvedSlackUserId: input.slackUserId || null,
    approvedAt: input.at,
    history: [
      ...intent.history,
      { version: intent.version, status: 'approved', by: input.by, at: input.at, note: 'Approved.' },
    ],
  }
}

/** The intent as the model sees it: no history, no names. */
export function intentForPrompt(intent: StrategyIntent | null) {
  if (!intent) return null
  return {
    status: intent.status,
    endState: intent.endState,
    horizon: intent.horizon,
    objectives: intent.objectives.map((objective) => ({
      key: objective.key,
      statement: objective.statement,
      measure: objective.measure,
      target: objective.target,
      by: objective.by,
      current: objective.current,
      leadingIndicators: objective.leadingIndicators,
    })),
    notDoing: intent.notDoing,
    constraints: intent.constraints,
    assumptions: intent.assumptions,
  }
}

/* ---------------------------------------------------------------------------
 * Drafting and revising with the model.
 * ------------------------------------------------------------------------- */

export const INTENT_SYSTEM = [
  'You help GoInvo, a small Boston healthcare design studio, state its strategic intent the way a good general',
  'states commander\'s intent: where we want to be, plainly enough that anyone can tell whether a move helps.',
  '',
  'Rules:',
  `- One end state (2-3 sentences) and at most ${MAX_OBJECTIVES} objectives. Fewer is better.`,
  '- Every objective has ONE measure (a countable number), a target value and a date, plus 1-3 leading',
  '  indicators that move weeks earlier than the measure. Prefer pipeline numbers (qualified conversations,',
  '  signed engagements) over reach (views, followers).',
  '- Say what we will NOT do. Focus is choosing.',
  '- List the assumptions that must stay true, each with a date to re-check it.',
  '- Ground everything in the records you are given. Do not invent numbers, clients or facts. Where a number',
  '  is unknown, leave current null; do not guess it.',
  '- Plain words, no jargon, no military vocabulary in the output.',
  'Reply with ONLY a JSON object in the shape of outputContract.',
].join('\n')

export function intentOutputContract() {
  return {
    endState: 'Where we want to be at the horizon, 2-3 sentences',
    horizon: 'YYYY-MM-DD',
    objectives: [
      {
        key: 'short-kebab-key',
        statement: 'What we want to be true',
        measure: 'The one countable number that says we got there',
        target: 3,
        by: 'YYYY-MM-DD',
        current: null,
        leadingIndicators: ['An early sign, read weekly'],
      },
    ],
    notDoing: ['Something we deliberately will not do'],
    constraints: ['What limits us'],
    assumptions: [{ statement: 'What must stay true', checkBy: 'YYYY-MM-DD' }],
    changeNote: 'One sentence: what this version changes and why',
  }
}

/**
 * The user turn for a first draft (no `current`) or a revision (`current` plus
 * the person's `instruction`). A revision is told to change only what was asked
 * and to say in `changeNote` what it changed — pushback, not a rewrite.
 */
export function buildIntentUserMessage(input: {
  records: Record<string, unknown>
  current?: StrategyIntent | null
  instruction?: string
  today: string
}): string {
  const revising = Boolean(input.current && input.instruction)
  return JSON.stringify({
    task: revising
      ? 'Revise the current intent as the team asked. Change only what the instruction asks for; keep the rest. If the instruction conflicts with the records, follow the instruction and name the conflict in changeNote.'
      : 'Draft the studio intent from the records. Treat it as a proposal for the team to edit and approve.',
    today: input.today,
    ...(revising ? { instruction: input.instruction, currentIntent: intentForPrompt(input.current || null) } : {}),
    records: input.records,
    outputContract: intentOutputContract(),
  })
}

/** The model's draft as an intent (unversioned — `nextDraft` versions it). Null when unusable. */
export function parseIntentDraft(textOut: string, contextNotes = ''): { intent: StrategyIntent; changeNote: string } | null {
  const parsed = extractJsonObject<Record<string, unknown>>(textOut)
  if (!parsed) return null
  const intent = normalizeIntent({ ...parsed, status: 'draft', version: 1, contextNotes })
  if (!intent || !intent.objectives.length) return null
  return { intent, changeNote: text(parsed.changeNote, 400) }
}

/* ---------------------------------------------------------------------------
 * Slack.
 * ------------------------------------------------------------------------- */

type Block = Record<string, unknown>
const esc = (value: unknown, max: number) => clipSlackText(escapeSlackText(clean(value)), max)

/** The value an intent card's buttons carry: which version they were drawn for. */
export function encodeIntentValue(version: number): string {
  return JSON.stringify({ v: version })
}

export function decodeIntentValue(raw: string | undefined): { version: number } | null {
  try {
    const parsed = JSON.parse(String(raw || '')) as { v?: unknown }
    const version = Number(parsed?.v)
    return Number.isInteger(version) && version > 0 ? { version } : null
  } catch {
    return null
  }
}

function objectiveLine(objective: IntentObjective, index: number, now: Date): string {
  const target =
    objective.target !== null ? `${objective.target}${objective.by ? ` by ${formatSlackDay(objective.by, now)}` : ''}` : 'no target yet'
  const current = objective.current !== null ? ` · now ${objective.current}` : ' · not measured yet'
  const early = objective.leadingIndicators.length ? `\n   _Early signs:_ ${esc(objective.leadingIndicators.join('; '), 400)}` : ''
  return `*${index + 1}. ${esc(objective.statement, 300)}*\n   ${esc(objective.measure || 'no measure yet', 160)}: ${esc(target, 80)}${current}${early}`
}

/**
 * The intent as a card: status first (a draft must never read as decided),
 * then the end state, the objectives with their numbers, what we won't do and
 * what we are assuming. Two buttons: Approve (only when this person may, and
 * only when nothing blocks it) and Change…, which takes the pushback in words.
 */
export function buildIntentBlocks(input: {
  intent: StrategyIntent
  now: Date
  access: TeamAccess
  /** May the person this card is for approve it? Decides whether Approve is drawn. */
  viewerCanApprove: boolean
  actionIds: { approve: string; change: string }
}): Block[] {
  const { intent, now } = input
  const problems = intentProblems(intent, now)
  const status =
    intent.status === 'approved'
      ? `Approved by ${esc(intent.approvedBy || 'someone', 60)}${intent.approvedAt ? ` on ${formatSlackDay(intent.approvedAt, now)}` : ''} · version ${intent.version}`
      : `*DRAFT* · version ${intent.version} · drafted by ${esc(intent.draftedBy, 60)}${intent.draftedAt ? ` on ${formatSlackDay(intent.draftedAt, now)}` : ''} — not decided yet`

  const blocks: Block[] = [
    { type: 'header', text: { type: 'plain_text', text: 'Our intent', emoji: false } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: clipSlackText(status, SLACK_LIMITS.sectionText) }] },
    section(`*Where we want to be${intent.horizon ? ` by ${formatSlackDay(intent.horizon, now)}` : ''}:* ${esc(intent.endState, 900)}`),
  ]
  if (intent.objectives.length) {
    blocks.push(section(intent.objectives.map((objective, index) => objectiveLine(objective, index, now)).join('\n')))
  }
  const extras = [
    intent.notDoing.length ? `*We won’t:* ${esc(intent.notDoing.join('; '), 700)}` : '',
    intent.constraints.length ? `*Limits:* ${esc(intent.constraints.join('; '), 500)}` : '',
    intent.assumptions.length
      ? `*Assuming:* ${esc(
          intent.assumptions
            .map((assumption) => `${assumption.statement}${assumption.checkBy ? ` (check ${assumption.checkBy})` : ''}`)
            .join('; '),
          700,
        )}`
      : '',
  ].filter(Boolean)
  if (extras.length) blocks.push(section(extras.join('\n')))
  if (intent.changeNote && intent.status === 'draft') {
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_What changed:_ ${esc(intent.changeNote, 400)}` }] })
  }
  if (intent.status === 'draft' && problems.length) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Before it can be approved: ${esc(problems.slice(0, 4).join(' '), 900)}` }],
    })
  }

  const value = encodeIntentValue(intent.version)
  const elements: Block[] = []
  if (intent.status === 'draft' && input.viewerCanApprove && !problems.length) {
    elements.push(button(input.actionIds.approve, LABEL.INTENT_APPROVE, value, true))
  }
  elements.push(button(input.actionIds.change, LABEL.INTENT_CHANGE, value))
  blocks.push({ type: 'actions', block_id: 'mq_intent_actions', elements })
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: clipSlackText(
          `${escapeSlackText(describeApproval(input.access))} ${countLabel(intent.history.length, 'version')} on record.`,
          SLACK_LIMITS.sectionText,
        ),
      },
    ],
  })
  return blocks
}

function section(textValue: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text: clipSlackText(textValue, SLACK_LIMITS.sectionText) } }
}

function button(actionId: string, label: string, value: string, primary = false): Block {
  return {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text: label, emoji: true },
    value,
    ...(primary ? { style: 'primary' } : {}),
  }
}

/** The form behind Change…: one question, answered in words. */
export const INTENT_CHANGE_CALLBACK = 'goinvo_marqueta_intent_change_modal'
export const INTENT_CHANGE_BLOCK = 'goinvo_intent_change_block'
export const INTENT_CHANGE_INPUT = 'goinvo_intent_change_input'

export function buildIntentChangeView(metadata: string): Block {
  return {
    type: 'modal',
    callback_id: INTENT_CHANGE_CALLBACK,
    private_metadata: metadata.slice(0, SLACK_LIMITS.privateMetadata),
    title: { type: 'plain_text', text: 'Change our intent' },
    submit: { type: 'plain_text', text: 'Send' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: INTENT_CHANGE_BLOCK,
        label: { type: 'plain_text', text: 'What should change, and why?' },
        element: {
          type: 'plain_text_input',
          action_id: INTENT_CHANGE_INPUT,
          multiline: true,
          max_length: 1500,
          placeholder: { type: 'plain_text', text: 'e.g. Drop the pharma objective for now — we have no way in. Make it 2 objectives.' },
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'Marqueta redrafts with your change and posts the new version here. Nothing is approved until someone approves it.' },
        ],
      },
    ],
  }
}

export type IntentChangeMetadata = { channel: string; threadTs: string; version: number }

export function encodeIntentChangeMetadata(meta: IntentChangeMetadata): string {
  return JSON.stringify({ c: meta.channel, t: meta.threadTs, v: meta.version })
}

export function decodeIntentChangeMetadata(raw: string | undefined): IntentChangeMetadata | null {
  try {
    const parsed = JSON.parse(String(raw || '')) as Record<string, unknown>
    const channel = clean(parsed.c)
    const version = Number(parsed.v)
    if (!channel || !Number.isInteger(version)) return null
    return { channel, threadTs: clean(parsed.t), version }
  } catch {
    return null
  }
}

/** Read the words typed into the Change… form. */
export function readIntentChangeSubmission(values: unknown): string {
  const state = (values || {}) as Record<string, Record<string, { value?: string | null }>>
  return text(state?.[INTENT_CHANGE_BLOCK]?.[INTENT_CHANGE_INPUT]?.value, 1500)
}
