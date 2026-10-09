/**
 * Reading, drafting, revising and approving the studio's intent.
 *
 * Server-only. The intent and the authority setting live in the private
 * outreach dataset. Drafts come from the model, grounded in records the studio
 * already holds (runway and posture, the hours budget, the quarter's plan, the
 * offers and pillars) plus whatever context the first draft was seeded with —
 * never from code, because the studio's goals are data.
 *
 * Every write records who did it. Approval is refused, with the reason, when the
 * person is not allowed by the setting, when the card they pressed is out of
 * date, or when the draft still has a problem that makes it unmeasurable.
 */

import { generateClaudeText, isAnthropicConfigured, resolveMarketingModel } from './anthropicJson'
import { getMarketingWriteClientFor } from './client'
import { readRunway } from './runway.server'
import {
  approveIntent,
  buildIntentUserMessage,
  INTENT_SYSTEM,
  intentProblems,
  nextDraft,
  normalizeIntent,
  parseIntentDraft,
  STRATEGY_INTENT_DOC_ID,
  STRATEGY_INTENT_TYPE,
  type StrategyIntent,
} from './strategyIntent'
import { canApproveIntent, describeApproval } from './teamAccess'
import { readTeamAccess } from './teamAccess.server'

const intentClient = () => getMarketingWriteClientFor(STRATEGY_INTENT_TYPE)

async function readIntentRecord(): Promise<Record<string, unknown> | null> {
  return intentClient().fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id: STRATEGY_INTENT_DOC_ID })
}

export async function readIntent(): Promise<StrategyIntent | null> {
  const raw = await readIntentRecord()
  return raw ? normalizeIntent(raw) : null
}

/**
 * The seeded context, read from the raw record: a freshly seeded record has
 * notes but no goals yet, which `normalizeIntent` (rightly) reads as no intent.
 */
async function readContextNotes(): Promise<string> {
  const raw = await readIntentRecord().catch(() => null)
  return typeof raw?.contextNotes === 'string' ? raw.contextNotes.slice(0, 6000) : ''
}

async function writeIntent(intent: StrategyIntent): Promise<void> {
  await intentClient().createOrReplace({ _id: STRATEGY_INTENT_DOC_ID, _type: STRATEGY_INTENT_TYPE, ...intent })
}

/**
 * What a draft is grounded in: the studio's own records, read now. Each read
 * fails soft — a missing record is a smaller draft, never a failed one — and
 * the absence is named so the model does not fill the gap with a guess.
 */
export async function gatherIntentRecords(now: Date): Promise<Record<string, unknown>> {
  // Through the dataset router (both types are internal), not the pinned
  // outreach client: these are reads for a draft, and the router keeps this
  // module usable from the seed script, outside Next's server-only boundary.
  const operations = getMarketingWriteClientFor('marketingOperation')
  const offersClient = getMarketingWriteClientFor('marketingOffer')
  const [runway, hours, plan, offers, pillars] = await Promise.all([
    readRunway(now).catch(() => null),
    getMarketingWriteClientFor('marketingSettings')
      .fetch<number | null>(`*[_id == "marketingSettings"][0].weeklyMarketingHours`)
      .catch(() => null),
    operations
      .fetch<{ title?: string; status?: string; kind?: string; sourceKey?: string; dueAt?: string }[]>(
        `*[_type == "marketingOperation" && sourceKey match "exec-plan-*"] | order(dueAt asc)[0...40]{ title, status, kind, sourceKey, dueAt }`,
      )
      .catch(() => []),
    offersClient
      .fetch<{ title?: string; oneLiner?: string; idealBuyer?: string; status?: string }[]>(
        `*[_type == "marketingOffer"][0...12]{ title, oneLiner, idealBuyer, status }`,
      )
      .catch(() => []),
    getMarketingWriteClientFor('marketingMessagePillar')
      .fetch<{ title?: string; coreClaim?: string }[]>(`*[_type == "marketingMessagePillar"][0...8]{ title, coreClaim }`)
      .catch(() => []),
  ])
  return {
    runway: runway ? { summary: runway.summary, posture: runway.resolved.id } : 'unknown — no runway record could be read',
    weeklyMarketingHours: typeof hours === 'number' ? hours : 'unknown',
    quarterPlan: (plan || []).map((op) => ({ title: op.title, status: op.status, kind: op.kind, due: op.dueAt || null })),
    offers: offers || [],
    messagePillars: pillars || [],
  }
}

export type IntentDraftResult =
  | { ok: true; intent: StrategyIntent }
  | { ok: false; reason: 'not-configured' | 'no-intent' | 'failed'; message: string }

/**
 * Draft (no instruction) or revise (with the person's words) the intent.
 *
 * A revision keeps the current intent's context notes and history; the new
 * version is always a DRAFT, because pushing back is not the same as deciding.
 */
export async function draftIntent(input: { by: string; instruction?: string; now?: Date }): Promise<IntentDraftResult> {
  const now = input.now || new Date()
  if (!isAnthropicConfigured()) {
    return { ok: false, reason: 'not-configured', message: 'I can’t draft right now — the AI key isn’t set.' }
  }
  const current = await readIntent().catch(() => null)
  const instruction = (input.instruction || '').trim()
  if (instruction && !current) {
    return { ok: false, reason: 'no-intent', message: 'There’s no intent to change yet. Ask me to draft one first.' }
  }
  try {
    const [records, model, seededNotes] = await Promise.all([
      gatherIntentRecords(now),
      resolveMarketingModel(getMarketingWriteClientFor('marketingSettings')),
      readContextNotes(),
    ])
    const contextNotes = current?.contextNotes || seededNotes
    const { text, stopReason } = await generateClaudeText({
      feature: 'marqueta-intent',
      model,
      maxTokens: 2400,
      timeoutMs: 90_000,
      system: INTENT_SYSTEM,
      user: buildIntentUserMessage({
        records: contextNotes ? { ...records, whatWeHaveAlreadyDecided: contextNotes } : records,
        current,
        instruction: instruction || undefined,
        today: now.toISOString().slice(0, 10),
      }),
    })
    if (stopReason === 'max_tokens') {
      return { ok: false, reason: 'failed', message: 'The draft ran too long and got cut off. Try again.' }
    }
    const parsed = parseIntentDraft(text, contextNotes)
    if (!parsed) return { ok: false, reason: 'failed', message: 'I drafted something but it came back unreadable. Try again?' }
    const note = parsed.changeNote || (instruction ? `Revised: ${instruction.slice(0, 200)}` : 'First draft, from our records.')
    const intent = nextDraft(current, parsed.intent, {
      by: instruction ? `Marqueta, asked by ${input.by}` : `Marqueta, for ${input.by}`,
      at: now.toISOString(),
      note,
    })
    await writeIntent(intent)
    return { ok: true, intent }
  } catch (error) {
    console.error('[marqueta] intent draft failed', error instanceof Error ? error.name : 'UnknownError')
    return { ok: false, reason: 'failed', message: 'Something went wrong drafting that. Try again in a moment.' }
  }
}

export type IntentApprovalResult =
  | { ok: true; intent: StrategyIntent }
  | { ok: false; reason: 'missing' | 'not-allowed' | 'stale' | 'problems' | 'already'; message: string; intent?: StrategyIntent }

/** Approve the version the person was looking at — or say exactly why not. */
export async function approveIntentAs(input: {
  version: number
  personName: string
  slackUserId?: string
  now?: Date
}): Promise<IntentApprovalResult> {
  const now = input.now || new Date()
  const [current, access] = await Promise.all([readIntent(), readTeamAccess()])
  if (!current) return { ok: false, reason: 'missing', message: 'There’s no intent to approve yet.' }
  // An unreadable setting never widens who may approve.
  if (!access) {
    return { ok: false, reason: 'not-allowed', message: 'I couldn’t read Team permissions just now, so I can’t check who may approve. Try again in a minute.', intent: current }
  }
  if (!canApproveIntent(access, input.personName)) {
    return { ok: false, reason: 'not-allowed', message: describeApproval(access), intent: current }
  }
  if (current.version !== input.version) {
    return {
      ok: false,
      reason: 'stale',
      message: `That was version ${input.version}; it’s on version ${current.version} now. Here’s the latest.`,
      intent: current,
    }
  }
  if (current.status === 'approved') {
    return { ok: false, reason: 'already', message: `Version ${current.version} is already approved.`, intent: current }
  }
  const approved = approveIntent(current, {
    by: input.personName,
    slackUserId: input.slackUserId,
    at: now.toISOString(),
    now,
  })
  if (!approved) {
    return { ok: false, reason: 'problems', message: intentProblems(current, now).join(' '), intent: current }
  }
  await writeIntent(approved)
  return { ok: true, intent: approved }
}

/**
 * Seed what the first draft is built from (the decisions already taken), then
 * draft from it. Used once, by a person, from a script that keeps the notes out
 * of the repository: they are business facts and belong in the private dataset.
 */
export async function seedIntentContext(input: { notes: string; by: string; now?: Date }): Promise<IntentDraftResult> {
  const current = await readIntent().catch(() => null)
  const now = input.now || new Date()
  const seeded: StrategyIntent = current
    ? { ...current, contextNotes: input.notes.slice(0, 6000) }
    : {
        status: 'draft',
        version: 0,
        endState: '',
        horizon: null,
        objectives: [],
        notDoing: [],
        constraints: [],
        assumptions: [],
        contextNotes: input.notes.slice(0, 6000),
        draftedBy: input.by,
        draftedAt: now.toISOString(),
        changeNote: '',
        approvedBy: null,
        approvedSlackUserId: null,
        approvedAt: null,
        history: [],
      }
  // Stored before drafting so a failed draft does not lose the notes.
  await intentClient().createOrReplace({ _id: STRATEGY_INTENT_DOC_ID, _type: STRATEGY_INTENT_TYPE, ...seeded })
  return draftIntent({ by: input.by, now })
}
