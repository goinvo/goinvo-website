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
 * A press on the money group (runway or strategy) is answered in place:
 * `renderMoneyAndDirection` re-reads everything after the write and draws the
 * receipt plus whatever question is due next, for the caller to swap into the
 * message by block id.
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
import { errorLine } from './marquetaStyle'
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
  answerMrkdwn,
  buildMoneyAndDirectionBlocks,
  buildStrategyDecisionOperation,
  buildStrategySnapshot,
  latestWin,
  monthKey as monthKeyFor,
  monthLabel,
  monthWindow,
  PIPELINE_CONTACT_PROJECTION,
  strategyAnswer,
  strategyReviewDue,
  strategyReviewSourceKey,
  STRATEGY_REVIEW_INTERVAL_DAYS,
  type MoneyReceipt,
  type PipelineContact,
  type StrategyReviewRecord,
  type StrategySnapshot,
} from './strategyCheck'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** What a money press did, for `renderMoneyAndDirection` — the same type the pure builder takes. */
export type { MoneyReceipt }

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

/**
 * The money-and-direction group as it stands now, for a press to redraw in
 * place (`replaceBlocksByPrefix(blocks, 'mq_money', …)`): the receipt for what
 * the press did, then the next question that is due, if any — the strategy
 * question follows a confirmed runway in the same spot, one at a time.
 *
 * Read fresh AFTER the press's write, so the receipt's numbers and whether
 * anything is still due are the records', not the button's. Every block id
 * starts with `mq_money`.
 *
 * Never throws. If the re-read fails, the receipt is still drawn — without
 * numbers, and with no question, since none can be asked about a number this
 * could not read. With no receipt and nothing readable, [].
 */
export async function renderMoneyAndDirection(input: { now?: Date; receipt?: MoneyReceipt | null }): Promise<Block[]> {
  const now = input.now || new Date()
  const receipt = input.receipt || null
  const studioBaseUrl = String(process.env.MARKETING_PUBLIC_BASE_URL || '').trim() || undefined
  let loaded: StrategyLoad | null = null
  try {
    loaded = await loadStrategySnapshot(now)
  } catch (error) {
    console.error('[marqueta] money redraw read failed', error)
  }
  if (!loaded) return receipt ? buildMoneyAndDirectionBlocks({ now, runway: null, receipt, studioBaseUrl }) : []
  return buildMoneyAndDirectionBlocks({
    now,
    runway: loaded.runway,
    snapshot: loaded.snapshot,
    strategyDue: loaded.due,
    receipt,
    studioBaseUrl,
  })
}

export type StrategyVerdictResult = {
  ok: boolean
  /** One plain-text line for the thread, when the press cannot be redrawn in place. The caller escapes it. */
  message: string
  /** The press was for an earlier month's card: nothing was written. */
  stale?: boolean
  /** For a stale press: this month's answer, as mrkdwn (already escaped). */
  answer?: string
  /** …and as blocks, carrying this month's buttons. */
  answerBlocks?: Block[]
  /** The rethink decision this press filed or joined — for the receipt's Open This week link. */
  decisionTaskId?: string
  /**
   * True when this press filed the decision; false when it joined one already
   * open. For a `repeat`, whether the ask it repeats was the one that filed it —
   * so a double-tap redraws the presser's own receipt, not "asked … too".
   */
  filed?: boolean
  /**
   * The same person pressed "Needs a rethink" again within a few minutes (a
   * double-tap, or Slack retrying): nothing new was added to the decision.
   */
  repeat?: boolean
}

const RETHINK_ACTION = 'Asked for a rethink from Slack'
/** The same person asking twice inside this window is one ask (a retry, or a double-tap). */
const REPEAT_WINDOW_MS = 10 * 60 * 1000

/**
 * Record an answer to "does the plan still fit the money?".
 *
 * - A press on an earlier month's card writes nothing: that question was about
 *   a different month's money. It says so, and hands back this month's answer
 *   (as text and as blocks, with this month's buttons).
 * - "Plan still fits" stamps who said so, when, and against which posture —
 *   the posture is what makes a later runway change re-open the question.
 * - "Needs a rethink" files ONE decision on This week, suggested to the person
 *   who asked (never assigned), or — when a rethink is already open — adds
 *   their voice to it instead of filing a second. The same person again within
 *   a few minutes is the same ask: nothing is added, and the result says
 *   `repeat`, with `filed` as their first press had it. The verdict is written every
 *   time, AFTER the decision: if the verdict write fails, the next press reads
 *   the same prior answer, derives the same key, and converges on the same
 *   decision rather than filing a twin.
 *
 * `message` is the thread fallback for a message that has no money group to
 * redraw (one posted before the group had ids); a press on one that does is
 * answered by `renderMoneyAndDirection` with a receipt instead.
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
    let answer: ReturnType<typeof strategyAnswer> | null = null
    try {
      const loaded = await loadStrategySnapshot(now)
      answer = strategyAnswer({ now, snapshot: loaded.snapshot, due: loaded.due, runway: loaded.runway })
    } catch (error) {
      console.error('[marqueta] strategy snapshot failed', error)
    }
    // "August’s", with the year only when it is not this one (rule 7).
    const earlier = /^\d{4}-\d{2}$/.test(clean(input.monthKey)) ? `${monthName(clean(input.monthKey), now)}’s` : 'an earlier month’s'
    return {
      ok: false,
      stale: true,
      message: `That was ${earlier} check — here is this month’s.`,
      ...(answer ? { answer: answerMrkdwn(answer), answerBlocks: answer.blocks } : {}),
    }
  }

  // Whether the rethink decision is already on the board when something
  // fails: "nothing changed" must only ever be said when it is true.
  let filedBeforeFailure = false
  try {
    const loaded = await loadStrategySnapshot(now)
    const month = monthName(current, now)
    let operationId: string | undefined
    let filed = false
    let repeat = false

    if (input.verdict === 'rethink') {
      const open = loaded.openRethink
      if (open) {
        operationId = open._id
        const asks = (open.activity || []).filter((entry) => entry?.action === RETHINK_ACTION)
        const last = (open.activity || [])[(open.activity || []).length - 1]
        repeat =
          last?.action === RETHINK_ACTION &&
          last?.outcome === `By ${person}` &&
          Math.abs(now.getTime() - Date.parse(last.at)) <= REPEAT_WINDOW_MS
        // A repeat answers as the ask it repeats. The decision is filed with
        // its filer's ask as the first entry, so a double-tap by whoever filed
        // it still reads "asked for a rethink", never "asked … too" — which
        // would tell the room a second person had asked.
        if (repeat) filed = asks[0]?.outcome === `By ${person}`
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
        filedBeforeFailure = true
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
      const next = monthName(monthKeyFor(new Date(now.getTime() + STRATEGY_REVIEW_INTERVAL_DAYS * 86_400_000)), now)
      return {
        ok: true,
        message:
          `Plan confirmed for ${month} by ${person} — I’ll ask again in ${next}, or sooner if the runway crosses a line.` +
          (loaded.openRethink ? ' The rethink already on This week stays open until someone settles it.' : ''),
      }
    }
    return {
      ok: true,
      decisionTaskId: operationId,
      filed,
      ...(repeat ? { repeat: true } : {}),
      message: filed
        ? `${person} asked for a rethink — it’s a decision on This week, suggested to ${person}.`
        : `${person} asked for a rethink too — it’s already a decision on This week.`,
    }
  } catch (error) {
    console.error('[marqueta] strategy verdict failed', error)
    return {
      ok: false,
      message: filedBeforeFailure
        ? 'The rethink is on This week, but I couldn’t record the answer — press again and it joins the same decision.'
        : errorLine('record that', 'Answer it on This week in the Studio.'),
    }
  }
}

/** "September" — the year only when it is not this one. */
function monthName(key: string, now: Date): string {
  const label = monthLabel(key)
  const year = ` ${now.getUTCFullYear()}`
  return label.endsWith(year) ? label.slice(0, -year.length) : label
}
