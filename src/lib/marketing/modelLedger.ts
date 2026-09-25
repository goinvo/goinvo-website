/**
 * What every Claude call in this suite cost, how long it took, and which model
 * served it.
 *
 * Before this, nothing anywhere recorded model spend. `resolveMarketingModel`
 * picked a model and the bill was a surprise at the end of the month, with no
 * way to answer "which feature is expensive" or "did that change make calls
 * slower". Six routes call Claude; none of them left a trace.
 *
 * Two rules the rest of this file exists to enforce:
 *
 *   1. A NUMBER WE DID NOT MEASURE IS NOT ZERO. An unpriced model gives
 *      `costUsd: null`, never 0, so an unknown model shows up as unknown
 *      instead of quietly making the bill look smaller. Same for tokens.
 *   2. A LEDGER THAT RECORDS NOTHING MUST NOT LOOK HEALTHY. `ledgerHealth`
 *      separates never-recorded, recording-blanks and stale, because
 *      collapsing them is exactly how a dead meter reads as a cheap month.
 *      This is the same failure the heartbeat work was built around: the first
 *      `tickDidSomething` matched a digit in the text and found the YEAR.
 *
 * Pure and free: prices are a table, cost is arithmetic, health is a fold over
 * records. Nothing here touches Sanity or the network.
 */

/** Per-million-token list prices, Anthropic first-party API. */
export type ModelPrice = { inputPerMTok: number; outputPerMTok: number }

/**
 * Prices verified against Anthropic's published table. Models absent here are
 * not guessed at — they resolve to a null cost and are surfaced as unpriced.
 *
 * Keep this in step with MARKETING_ALLOWED_CLAUDE_MODELS in anthropicJson.ts;
 * `tests/model-ledger.test.ts` fails if an allowed model has no price.
 */
export const MODEL_PRICING: Record<string, ModelPrice> = {
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  // Not currently selectable in the suite, priced so a model change does not
  // silently start reporting unknown costs.
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-5-5': { inputPerMTok: 4, outputPerMTok: 20 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10 },
  'claude-fable-5-1': { inputPerMTok: 10, outputPerMTok: 50 },
}

/** Cache reads bill at about a tenth of input; writes at about 1.25x. */
export const CACHE_READ_MULTIPLIER = 0.1
export const CACHE_WRITE_MULTIPLIER = 1.25

export type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export type ModelCall = {
  /** Which part of the suite spent this. "assist", "generate", "posting-times"… */
  feature: string
  model: string
  usage: ModelUsage
  latencyMs: number
  ok: boolean
  /** Why the model stopped. A `max_tokens` stop is a truncated answer, not a win. */
  stopReason?: string | null
  /** Set when ok is false. The error class, never the message — messages leak. */
  errorKind?: string | null
}

export type ModelCallRecord = ModelCall & {
  at: string
  costUsd: number | null
  costKnown: boolean
}

const int = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

/** Normalise whatever the SDK handed back into the four counts we bill on. */
export function usageFromAnthropic(usage: unknown): ModelUsage {
  const u = (usage || {}) as Record<string, unknown>
  return {
    inputTokens: int(u.input_tokens),
    outputTokens: int(u.output_tokens),
    cacheReadTokens: int(u.cache_read_input_tokens),
    cacheWriteTokens: int(u.cache_creation_input_tokens),
  }
}

/**
 * What a call cost, or null when we cannot say.
 *
 * Null is the point. An unpriced model must not contribute 0 to a total that
 * someone then reads as the month's spend.
 */
export function costOf(model: string, usage: ModelUsage): number | null {
  const price = MODEL_PRICING[model]
  if (!price) return null
  const perToken = (perMTok: number) => perMTok / 1_000_000
  return (
    usage.inputTokens * perToken(price.inputPerMTok) +
    usage.outputTokens * perToken(price.outputPerMTok) +
    (usage.cacheReadTokens || 0) * perToken(price.inputPerMTok) * CACHE_READ_MULTIPLIER +
    (usage.cacheWriteTokens || 0) * perToken(price.inputPerMTok) * CACHE_WRITE_MULTIPLIER
  )
}

/** A call plus its derived cost, ready to store. */
export function toRecord(call: ModelCall, at: string): ModelCallRecord {
  const costUsd = costOf(call.model, call.usage)
  return { ...call, at, costUsd, costKnown: costUsd !== null }
}

/**
 * A record that claims success but measured nothing.
 *
 * This is the shape a broken meter takes: the write succeeds, the row exists,
 * and every number in it is zero. Treated as a defect rather than a cheap call,
 * because a successful Claude call cannot produce no output tokens and take no
 * time.
 */
export function isBlank(record: ModelCallRecord): boolean {
  if (!record.ok) return false
  return record.usage.outputTokens <= 0 || record.latencyMs <= 0
}

export type LedgerSummary = {
  calls: number
  failed: number
  blanks: number
  inputTokens: number
  outputTokens: number
  /** Only over calls whose model is priced. `unpricedCalls` says what is missing. */
  costUsd: number
  unpricedCalls: number
  p50LatencyMs: number
  p95LatencyMs: number
  byFeature: Array<{ feature: string; calls: number; costUsd: number; outputTokens: number }>
  byModel: Array<{ model: string; calls: number; costUsd: number }>
}

const percentile = (sorted: number[], fraction: number): number => {
  if (!sorted.length) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return sorted[index]
}

/**
 * Roll records up for a view.
 *
 * Ranked and truncated on purpose. The point of a spend view is to answer
 * "what should I look at" in one glance, so the caller gets the few lines that
 * carry the money, not a table of everything.
 */
export function summarize(records: ModelCallRecord[]): LedgerSummary {
  const latencies = records.map((r) => r.latencyMs).filter((ms) => ms > 0).sort((a, b) => a - b)
  const featureTotals = new Map<string, { calls: number; costUsd: number; outputTokens: number }>()
  const modelTotals = new Map<string, { calls: number; costUsd: number }>()

  let costUsd = 0
  let unpricedCalls = 0
  let inputTokens = 0
  let outputTokens = 0
  let failed = 0
  let blanks = 0

  for (const record of records) {
    inputTokens += record.usage.inputTokens
    outputTokens += record.usage.outputTokens
    if (!record.ok) failed += 1
    if (isBlank(record)) blanks += 1
    if (record.costUsd === null) unpricedCalls += 1
    else costUsd += record.costUsd

    const feature = featureTotals.get(record.feature) || { calls: 0, costUsd: 0, outputTokens: 0 }
    feature.calls += 1
    feature.costUsd += record.costUsd || 0
    feature.outputTokens += record.usage.outputTokens
    featureTotals.set(record.feature, feature)

    const model = modelTotals.get(record.model) || { calls: 0, costUsd: 0 }
    model.calls += 1
    model.costUsd += record.costUsd || 0
    modelTotals.set(record.model, model)
  }

  return {
    calls: records.length,
    failed,
    blanks,
    inputTokens,
    outputTokens,
    costUsd,
    unpricedCalls,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    byFeature: [...featureTotals.entries()]
      .map(([feature, totals]) => ({ feature, ...totals }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byModel: [...modelTotals.entries()]
      .map(([model, totals]) => ({ model, ...totals }))
      .sort((a, b) => b.costUsd - a.costUsd),
  }
}

export type LedgerHealth = {
  state: 'never-recorded' | 'recording-blanks' | 'stale' | 'ok'
  detail: string
  /** True only for `ok`. Anything else means the numbers cannot be trusted. */
  trustworthy: boolean
}

/** A ledger with nothing in it for this long is not a quiet week, it is broken. */
export const LEDGER_STALE_AFTER_HOURS = 24 * 14

/**
 * Is the meter actually running?
 *
 * The three failure states are kept apart deliberately. "No records at all"
 * means the gateway never fired; "records with no numbers in them" means it
 * fired but measured nothing; "nothing recently" means it stopped. Collapsing
 * them into one boolean is how a dead meter reports a cheap month, and reading
 * a total without checking this first is how that number gets believed.
 */
export function ledgerHealth(
  records: ModelCallRecord[],
  now: Date,
  staleAfterHours: number = LEDGER_STALE_AFTER_HOURS,
): LedgerHealth {
  if (!records.length) {
    return {
      state: 'never-recorded',
      detail: 'No model calls have ever been recorded. The gateway is not wired up, or nothing has called Claude.',
      trustworthy: false,
    }
  }

  const blanks = records.filter(isBlank)
  if (blanks.length === records.length) {
    return {
      state: 'recording-blanks',
      detail: `All ${records.length} recorded calls report no output tokens or no latency. The ledger is writing rows but measuring nothing.`,
      trustworthy: false,
    }
  }

  const newest = records
    .map((record) => Date.parse(record.at))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => b - a)[0]
  if (!newest) {
    return {
      state: 'recording-blanks',
      detail: 'No record carries a readable timestamp, so the ledger cannot be aged.',
      trustworthy: false,
    }
  }

  const hours = (now.getTime() - newest) / 3_600_000
  if (hours > staleAfterHours) {
    return {
      state: 'stale',
      detail: `The most recent model call was ${Math.floor(hours)} hours ago, past the ${staleAfterHours}-hour mark. Spend has stopped being recorded.`,
      trustworthy: false,
    }
  }

  const blankNote = blanks.length ? ` ${blanks.length} of them measured nothing and are excluded.` : ''
  return {
    state: 'ok',
    detail: `${records.length} calls recorded, most recent ${Math.floor(hours)} hours ago.${blankNote}`,
    trustworthy: true,
  }
}
