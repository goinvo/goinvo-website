/**
 * Writing model calls to the ledger, and reading them back.
 *
 * Server-only: it holds a write client. The arithmetic and the health rules are
 * in `modelLedger.ts` so they can be tested without Sanity.
 *
 * Recording is best-effort and never throws. A ledger write failing must not
 * take down the feature that made the call — losing a row is bad, losing a
 * drafted email because the meter fell over is worse. Failures are logged, and
 * `ledgerHealth` is what turns a run of silent write failures into a visible
 * "never recorded" rather than a quietly empty table.
 */
import { randomUUID } from 'node:crypto'

import { getMarketingWriteClientFor } from './client'
import { ledgerHealth, toRecord, type LedgerHealth, type ModelCall, type ModelCallRecord } from './modelLedger'

/** Registered in INTERNAL_MARKETING_TYPES — spend is not public. */
export const MODEL_CALL_TYPE = 'marketingModelCall'

/**
 * Record one call. Returns the stored record, or null if it could not be written.
 *
 * Callers do not check the return value; the point of returning it is that
 * tests and the health check can tell "wrote a row" from "swallowed an error".
 */
export async function recordModelCall(call: ModelCall, at: Date = new Date()): Promise<ModelCallRecord | null> {
  const record = toRecord(call, at.toISOString())
  try {
    const client = getMarketingWriteClientFor(MODEL_CALL_TYPE)
    await client.create({
      _type: MODEL_CALL_TYPE,
      _id: `${MODEL_CALL_TYPE}.${at.toISOString().slice(0, 10)}.${randomUUID()}`,
      at: record.at,
      feature: record.feature,
      model: record.model,
      inputTokens: record.usage.inputTokens,
      outputTokens: record.usage.outputTokens,
      cacheReadTokens: record.usage.cacheReadTokens || 0,
      cacheWriteTokens: record.usage.cacheWriteTokens || 0,
      latencyMs: record.latencyMs,
      ok: record.ok,
      stopReason: record.stopReason || null,
      errorKind: record.errorKind || null,
      costUsd: record.costUsd,
      costKnown: record.costKnown,
    })
    return record
  } catch (error) {
    // Deliberately swallowed. See the module note: metering must never be able
    // to fail the thing it meters.
    console.error('[modelLedger] could not record a model call', error)
    return null
  }
}

const RECENT_QUERY = `*[_type == $type] | order(at desc) [0...$limit] {
  at, feature, model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens,
  latencyMs, ok, stopReason, errorKind, costUsd, costKnown
}`

type StoredRow = {
  at?: string
  feature?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  latencyMs?: number
  ok?: boolean
  stopReason?: string | null
  errorKind?: string | null
  costUsd?: number | null
  costKnown?: boolean
}

/** Turn a stored row back into a record. Tolerant: a missing field is 0, not a throw. */
export function rowToRecord(row: StoredRow): ModelCallRecord {
  return {
    at: row.at || '',
    feature: row.feature || 'unlabelled',
    model: row.model || 'unknown',
    usage: {
      inputTokens: row.inputTokens || 0,
      outputTokens: row.outputTokens || 0,
      cacheReadTokens: row.cacheReadTokens || 0,
      cacheWriteTokens: row.cacheWriteTokens || 0,
    },
    latencyMs: row.latencyMs || 0,
    ok: row.ok !== false,
    stopReason: row.stopReason ?? null,
    errorKind: row.errorKind ?? null,
    costUsd: row.costUsd ?? null,
    costKnown: row.costKnown === true,
  }
}

export async function readRecentModelCalls(limit = 200): Promise<ModelCallRecord[]> {
  try {
    const client = getMarketingWriteClientFor(MODEL_CALL_TYPE)
    const rows = await client.fetch<StoredRow[]>(RECENT_QUERY, { type: MODEL_CALL_TYPE, limit })
    return (rows || []).map(rowToRecord)
  } catch (error) {
    console.error('[modelLedger] could not read model calls', error)
    return []
  }
}

/**
 * Is the meter running? Reads the ledger and asks `ledgerHealth`.
 *
 * A read failure returns an empty list, which `ledgerHealth` reports as
 * never-recorded rather than healthy — the conservative direction.
 */
export async function checkLedgerHealth(now: Date = new Date()): Promise<LedgerHealth> {
  return ledgerHealth(await readRecentModelCalls(), now)
}
