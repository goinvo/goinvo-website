/**
 * The monthly strategy check, joined to the records.
 *
 * `strategyCheck.ts` decides what the money and the outreach log mean and how
 * to say it; this reads them and records the answer. Server-only: every input
 * is private — contacts and their call logs, the runway, the decision gates on
 * the board.
 *
 * Where things live, and why the reads are split the way they are:
 *
 * - Contacts, the gates and any open rethink are operations/contacts in the
 *   outreach dataset, read in ONE query through `getOutreachClient` (pinned to
 *   that dataset, published perspective, so a document open in the Studio is
 *   not counted twice).
 * - The runway and the stored strategy answer sit on the
 *   `marketingFinancialPosture` document, read and written through the same
 *   client `runway.server.ts` uses, so the two money records can never end up
 *   in different datasets.
 *
 * The one rule that is easy to break here: the review record must be read
 * BEFORE anything is written. The rethink's board key is derived from the
 * answer it follows (`strategyReviewSourceKey`), which is what keeps two people
 * pressing the same card to one decision while still filing a fresh one for a
 * later check in the same month.
 */
import 'server-only'
import { getMarketingWriteClientFor } from './client'
import { FINANCIAL_POSTURE_DOC_ID, FINANCIAL_POSTURE_DOC_TYPE } from './financialPosture'
import {
  MARKETING_OPERATION_TYPE,
  marketingOperationHash,
  normalizeMarketingOperationInput,
  type MarketingOperationActivity,
} from './operations'
import { getOutreachClient } from './outreachClient.server'
import { summarizeOutreach, type PulseContact } from './outreachPulse'
import type { RunwayWin } from './runway'
import { readRunway, type RunwayState } from './runway.server'
import {
  buildStrategyDecisionOperation,
  buildStrategySnapshot,
  latestWin,
  monthKey as monthKeyFor,
  monthLabel,
  monthWindow,
  PIPELINE_CONTACT_PROJECTION,
  strategyAnswerText,
  strategyReviewDue,
  strategyReviewSourceKey,
  type PipelineContact,
  type StrategyReviewRecord,
  type StrategySnapshot,
} from './strategyCheck'

/** One contact as the pipeline, the pulse and the win detection all read it. */
export type StrategyContact = PipelineContact & PulseContact

/**
 * Every rethink's board key starts with this — derived from the key function
 * itself (an empty month gives just the prefix), so the lookup and the keys it
 * looks for cannot drift apart.
 */
const RETHINK_PREFIX = strategyReviewSourceKey('', null)

const GATE_PREFIX = 'exec-plan-2026q4/gate'

export const STRATEGY_DATA_QUERY = `{
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**"))]${PIPELINE_CONTACT_PROJECTION},
  "gates": *[_type == "${MARKETING_OPERATION_TYPE}" && string::startsWith(sourceKey, $gatePrefix)
    && !(status in ["done", "dismissed"]) && !(_id in path("drafts.**"))]
    | order(coalesce(dueAt, "9999") asc){ title, dueAt, status },
  "openRethink": *[_type == "${MARKETING_OPERATION_TYPE}" && string::startsWith(sourceKey, $rethinkPrefix)
    && !(status in ["done", "dismissed"]) && !(_id in path("drafts.**"))]
    | order(_createdAt desc)[0]{ _id, title, activity }
}`

const postureClient = () => getMarketingWriteClientFor(FINANCIAL_POSTURE_DOC_TYPE)

type OpenRethink = { _id: string; title?: string; activity?: MarketingOperationActivity[] | null }

export type StrategyLoad = {
  snapshot: StrategySnapshot
  /** The stored answer as it stood BEFORE anything this request writes. */
  review: StrategyReviewRecord | null
  due: { due: boolean; reason: string }
  runway: RunwayState
  /** The most recent contact that became won — the runway check-in already weighed it. */
  latestWin: RunwayWin | null
  openRethink: OpenRethink | null
  /** Loaded anyway; handed back so a caller can count another window without a second read. */
  contacts: StrategyContact[]
}

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/**
 * Everything the strategy card and "@Marqueta strategy" need, read once.
 *
 * The latest win is found from the same contacts and passed to the runway
 * read, so a deal won since the runway was last confirmed makes the runway ask
 * "did it extend the date?" — in this answer as in the digest. THROWS on a
 * failed read; an answer about money built from half the records is worse than
 * none.
 */
export async function loadStrategySnapshot(now: Date = new Date()): Promise<StrategyLoad> {
  const [data, review] = await Promise.all([
    getOutreachClient().fetch<{
      contacts?: StrategyContact[] | null
      gates?: { title?: string | null; dueAt?: string | null; status?: string | null }[] | null
      openRethink?: OpenRethink | null
    } | null>(STRATEGY_DATA_QUERY, { gatePrefix: GATE_PREFIX, rethinkPrefix: RETHINK_PREFIX }),
    postureClient().fetch<StrategyReviewRecord | null>(`*[_id == $id][0].strategyReview`, {
      id: FINANCIAL_POSTURE_DOC_ID,
    }),
  ])

  const contacts = (data?.contacts || []).filter((contact) => contact && contact._id)
  const win = latestWin(contacts, now)
  const runway = await readRunway(now, { latestWin: win })
  const thisMonth = summarizeOutreach(contacts, { ...monthWindow(now, 0), now })
  const lastMonth = summarizeOutreach(contacts, { ...monthWindow(now, -1), now })
  const gates = (data?.gates || [])
    .filter(Boolean)
    .map((gate) => ({
      title: clean(gate.title) || 'Untitled decision',
      ...(gate.dueAt ? { dueAt: gate.dueAt } : {}),
      ...(gate.status ? { status: gate.status } : {}),
    }))

  const snapshot = buildStrategySnapshot({
    now,
    runwaySummary: runway.summary,
    postureId: runway.resolved.id,
    thisMonth,
    lastMonth,
    pipelineContacts: contacts,
    gates,
  })
  const openRethink = data?.openRethink && data.openRethink._id ? data.openRethink : null
  const storedReview = review && typeof review === 'object' ? review : null
  return {
    snapshot,
    review: storedReview,
    due: strategyReviewDue(storedReview, now, runway.resolved.id, { openRethink: Boolean(openRethink) }),
    runway,
    latestWin: win,
    openRethink,
    contacts,
  }
}

export type StrategyVerdictResult = {
  ok: boolean
  /** One plain-text line for the thread; the caller escapes it. */
  message: string
  /** The press was for an earlier month's card: nothing was written. */
  stale?: boolean
  /** For a stale press: this month's answer (mrkdwn, already escaped), so "here is this month's" is followed by it. */
  answer?: string
  /** The rethink decision this press filed or joined. */
  operationId?: string
  /** True when this press created the decision (false when it joined an open one). */
  filed?: boolean
}

const RETHINK_ACTION = 'Asked for a rethink from Slack'
/** The same person asking twice inside this window is one ask (a retry, or a double-tap). */
const REPEAT_WINDOW_MS = 10 * 60 * 1000

/**
 * Record an answer to "is the plan still right?".
 *
 * - A press on an earlier month's card writes nothing: that question was about
 *   a different month's money. It says so, and hands back this month's answer.
 * - "Still the right plan" stamps who said so, when, and against which posture
 *   — the posture is what makes a later runway change re-open the question.
 * - "Needs a rethink" files ONE decision on the board, suggested to the person
 *   who asked (never assigned), or — when a rethink is already open — adds
 *   their voice to it instead of filing a second. The verdict is written every
 *   time, AFTER the decision: if the verdict write fails, the next press reads
 *   the same prior answer, derives the same key, and converges on the same
 *   decision rather than filing a twin.
 *
 * Never throws.
 */
export async function recordStrategyVerdict(input: {
  verdict: 'stillRight' | 'rethink'
  personName: string
  monthKey: string
  now?: Date
}): Promise<StrategyVerdictResult> {
  const now = input.now || new Date()
  const current = monthKeyFor(now)
  const person = clean(input.personName) || 'Someone'

  if (clean(input.monthKey) !== current) {
    let answer: string | undefined
    try {
      const loaded = await loadStrategySnapshot(now)
      answer = strategyAnswerText(loaded.snapshot, loaded.due)
    } catch (error) {
      console.error('[marqueta] strategy snapshot failed', error)
    }
    const earlier = /^\d{4}-\d{2}$/.test(clean(input.monthKey)) ? `${monthLabel(clean(input.monthKey))}’s` : 'an earlier month’s'
    return {
      ok: false,
      stale: true,
      message: `That was ${earlier} check — here is this month’s.`,
      ...(answer ? { answer } : {}),
    }
  }

  try {
    const loaded = await loadStrategySnapshot(now)
    const label = monthLabel(current)
    let operationId: string | undefined
    let filed = false

    if (input.verdict === 'rethink') {
      const open = loaded.openRethink
      if (open) {
        operationId = open._id
        const last = (open.activity || [])[(open.activity || []).length - 1]
        const repeat =
          last?.action === RETHINK_ACTION &&
          last?.outcome === `By ${person}` &&
          Math.abs(now.getTime() - Date.parse(last.at)) <= REPEAT_WINDOW_MS
        if (!repeat) {
          const at = now.toISOString()
          // Append-only, so two voices landing together both survive without a
          // revision check to fight over.
          await getOutreachClient()
            .patch(open._id)
            .setIfMissing({ activity: [] })
            .set({ lastEvaluatedAt: at })
            .insert('after', 'activity[-1]', [
              {
                _key: `activity-${marketingOperationHash(`${at}:${RETHINK_ACTION}:${person}`)}`,
                at,
                actor: 'person',
                action: RETHINK_ACTION,
                outcome: `By ${person}`,
              },
            ])
            .commit()
        }
      } else {
        const normalized = normalizeMarketingOperationInput(
          buildStrategyDecisionOperation({
            monthKey: current,
            personName: person,
            now,
            question: loaded.snapshot.question,
            priorReview: loaded.review,
          }),
        )
        operationId = normalized._id
        await getOutreachClient().createIfNotExists({
          ...normalized,
          _id: normalized._id!,
          _type: MARKETING_OPERATION_TYPE,
        })
        filed = true
      }
    }

    const review: StrategyReviewRecord = {
      confirmedAt: now.toISOString(),
      confirmedBy: person,
      verdict: input.verdict,
      monthKey: current,
      postureAtReview: loaded.runway.resolved.id,
    }
    await postureClient().createIfNotExists({ _id: FINANCIAL_POSTURE_DOC_ID, _type: FINANCIAL_POSTURE_DOC_TYPE })
    await postureClient().patch(FINANCIAL_POSTURE_DOC_ID).set({ strategyReview: review }).commit()

    if (input.verdict === 'stillRight') {
      return {
        ok: true,
        message:
          `Noted — ${person} says the plan is still right for ${label}. I’ll ask again in a month, or sooner if the runway crosses a line.` +
          (loaded.openRethink ? ' The rethink already on the board stays open until someone settles it.' : ''),
      }
    }
    return {
      ok: true,
      operationId,
      filed,
      message: filed
        ? `Filed “Rethink the marketing plan (${label})” as a decision on the board, suggested to ${person}. It’s on the This week tab.`
        : `A rethink is already on the board — I’ve noted that ${person} asked for one too.`,
    }
  } catch (error) {
    console.error('[marqueta] strategy verdict failed', error)
    return { ok: false, message: 'I couldn’t record that just now. The Studio’s Strategy tab has the plan.' }
  }
}
