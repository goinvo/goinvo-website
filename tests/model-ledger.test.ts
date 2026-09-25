/**
 * The model ledger, and the reason it is allowed to be believed.
 *
 * Two things are pinned here beyond the arithmetic:
 *
 *   1. An unpriced model costs `null`, not 0. A total that quietly absorbs
 *      unknown models understates the bill, and nobody would ever see it.
 *   2. `ledgerHealth` is falsified once, on purpose. A health check that cannot
 *      fail is decoration, and this suite has already shipped one of those —
 *      the first `tickDidSomething` matched a digit anywhere in the detail
 *      string and found the YEAR in "0 item(s) planned for 2026-W36", so an
 *      inert run reported itself productive.
 */
import { describe, expect, it } from 'vitest'

import { MARKETING_ALLOWED_CLAUDE_MODELS } from '@/lib/marketing/anthropicJson'
import { datasetForType, isInternalMarketingType } from '@/lib/marketing/datasetRouting'
import { MODEL_CALL_TYPE } from '@/lib/marketing/modelLedger.server'
import {
  costOf,
  isBlank,
  ledgerHealth,
  MODEL_PRICING,
  summarize,
  toRecord,
  usageFromAnthropic,
  type ModelCall,
} from '@/lib/marketing/modelLedger'

const NOW = new Date('2026-09-25T18:00:00Z')
const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString()

const call = (over: Partial<ModelCall> = {}): ModelCall => ({
  feature: 'assist',
  model: 'claude-opus-4-8',
  usage: { inputTokens: 1000, outputTokens: 500 },
  latencyMs: 4200,
  ok: true,
  stopReason: 'end_turn',
  ...over,
})

describe('the ledger is private', () => {
  it('never routes model spend to the public dataset', () => {
    // The landmine this repo has already stepped on twice: getMarketingWriteClientFor
    // passes an unlisted marketing type straight through to the PUBLIC dataset and
    // reports success. Spend, and the feature names that reveal what the studio is
    // working on, must not land there.
    expect(isInternalMarketingType(MODEL_CALL_TYPE)).toBe(true)
    expect(datasetForType(MODEL_CALL_TYPE, 'production')).not.toBe('production')
  })
})

describe('pricing table', () => {
  it('prices every model the suite is allowed to pick, so spend is never unknown by default', () => {
    for (const model of MARKETING_ALLOWED_CLAUDE_MODELS) {
      expect(MODEL_PRICING[model], `${model} is selectable but has no price`).toBeDefined()
    }
  })
})

describe('costOf', () => {
  it('bills input and output at the published per-million rates', () => {
    // Opus 4.8: $5/MTok in, $25/MTok out. 1M in + 1M out = $30.
    expect(costOf('claude-opus-4-8', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(30, 6)
    // Haiku 4.5: $1 + $5.
    expect(costOf('claude-haiku-4-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(6, 6)
  })

  it('bills cache reads at a tenth of input and writes at 1.25x', () => {
    const reads = costOf('claude-opus-4-8', { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000 })
    const writes = costOf('claude-opus-4-8', { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1_000_000 })
    expect(reads).toBeCloseTo(0.5, 6)
    expect(writes).toBeCloseTo(6.25, 6)
  })

  it('returns null for an unpriced model rather than pretending it was free', () => {
    // The whole point. A 0 here would silently shrink the month's total.
    expect(costOf('some-model-we-have-never-priced', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeNull()
    expect(toRecord(call({ model: 'some-model-we-have-never-priced' }), at(0)).costKnown).toBe(false)
  })
})

describe('usageFromAnthropic', () => {
  it('reads the four counts the API actually returns', () => {
    expect(
      usageFromAnthropic({
        input_tokens: 120,
        output_tokens: 340,
        cache_read_input_tokens: 90,
        cache_creation_input_tokens: 10,
      }),
    ).toEqual({ inputTokens: 120, outputTokens: 340, cacheReadTokens: 90, cacheWriteTokens: 10 })
  })

  it('treats a missing or nonsense usage block as zeros rather than throwing', () => {
    expect(usageFromAnthropic(undefined)).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(usageFromAnthropic({ input_tokens: -5, output_tokens: 'lots' }).inputTokens).toBe(0)
  })
})

describe('isBlank — a successful call that measured nothing', () => {
  it('flags a success with no output tokens or no latency', () => {
    expect(isBlank(toRecord(call({ usage: { inputTokens: 10, outputTokens: 0 } }), at(0)))).toBe(true)
    expect(isBlank(toRecord(call({ latencyMs: 0 }), at(0)))).toBe(true)
  })

  it('does not flag a genuine failure, which legitimately has no tokens', () => {
    expect(isBlank(toRecord(call({ ok: false, usage: { inputTokens: 0, outputTokens: 0 } }), at(0)))).toBe(false)
  })

  it('does not flag a normal call', () => {
    expect(isBlank(toRecord(call(), at(0)))).toBe(false)
  })
})

describe('summarize', () => {
  it('totals only priced calls and says how many it could not price', () => {
    const records = [
      toRecord(call({ feature: 'assist' }), at(1)),
      toRecord(call({ feature: 'generate', model: 'claude-haiku-4-5' }), at(2)),
      toRecord(call({ feature: 'generate', model: 'mystery-model' }), at(3)),
    ]
    const summary = summarize(records)
    expect(summary.calls).toBe(3)
    expect(summary.unpricedCalls).toBe(1)
    // Opus 1000 in / 500 out = 0.005 + 0.0125; Haiku = 0.001 + 0.0025.
    expect(summary.costUsd).toBeCloseTo(0.005 + 0.0125 + 0.001 + 0.0025, 6)
  })

  it('ranks features by spend, so a view can show the few that matter', () => {
    const summary = summarize([
      toRecord(call({ feature: 'cheap', model: 'claude-haiku-4-5' }), at(1)),
      toRecord(call({ feature: 'dear', model: 'claude-opus-4-8' }), at(1)),
    ])
    expect(summary.byFeature[0].feature).toBe('dear')
  })

  it('reports latency percentiles from real calls only', () => {
    const summary = summarize(
      [100, 200, 300, 400, 5000].map((ms) => toRecord(call({ latencyMs: ms }), at(1))),
    )
    expect(summary.p50LatencyMs).toBe(300)
    expect(summary.p95LatencyMs).toBe(5000)
  })
})

describe('ledgerHealth — the check that keeps the numbers honest', () => {
  it('FALSIFICATION: an empty ledger is never-recorded, not a cheap month', () => {
    // If this ever returns ok, every figure downstream is meaningless.
    const health = ledgerHealth([], NOW)
    expect(health.state).toBe('never-recorded')
    expect(health.trustworthy).toBe(false)
  })

  it('FALSIFICATION: rows full of zeros are recording-blanks, not free calls', () => {
    const blanks = [
      toRecord(call({ usage: { inputTokens: 0, outputTokens: 0 }, latencyMs: 0 }), at(1)),
      toRecord(call({ usage: { inputTokens: 0, outputTokens: 0 }, latencyMs: 0 }), at(2)),
    ]
    const health = ledgerHealth(blanks, NOW)
    expect(health.state).toBe('recording-blanks')
    expect(health.trustworthy).toBe(false)
    expect(summarize(blanks).blanks).toBe(2)
  })

  it('calls a ledger that stopped being written stale', () => {
    const health = ledgerHealth([toRecord(call(), at(24 * 30))], NOW)
    expect(health.state).toBe('stale')
    expect(health.trustworthy).toBe(false)
  })

  it('is ok only when there are recent records with real numbers in them', () => {
    const health = ledgerHealth([toRecord(call(), at(2))], NOW)
    expect(health.state).toBe('ok')
    expect(health.trustworthy).toBe(true)
  })

  it('stays ok when only some calls are blank, and says how many', () => {
    const health = ledgerHealth(
      [toRecord(call(), at(1)), toRecord(call({ usage: { inputTokens: 0, outputTokens: 0 } }), at(1))],
      NOW,
    )
    expect(health.state).toBe('ok')
    expect(health.detail).toContain('1')
  })
})
