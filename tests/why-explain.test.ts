/**
 * The "why did Marqueta do this" explanation.
 *
 * What is pinned here is mostly about what the panel REFUSES to hide. An
 * explanation that silently omits a missing cost, or truncates its sources
 * without saying so, is worse than no explanation: the reader believes they
 * have the whole picture. So absence is asserted, not just permitted.
 */
import { describe, expect, it } from 'vitest'

import type { ResearchCitation } from '@/lib/marketing/marquetaCitations'
import type { ModelCallRecord } from '@/lib/marketing/modelLedger'
import {
  explainWhy,
  formatUsd,
  formatWhy,
  MAX_SHOWN_SOURCES,
  type WhySubject,
} from '@/lib/marketing/whyExplain'

const subject = (over: Partial<WhySubject> = {}): WhySubject => ({
  title: 'Why sponsors stall',
  contentType: 'article',
  status: 'drafting',
  publishAt: null,
  requestedBy: 'Ada',
  topic: 'why sponsors stall',
  askedAt: '2026-09-25T10:00:00Z',
  origin: 'asked',
  ...over,
})

const citation = (n: number, verified = true): ResearchCitation =>
  ({
    organization: `Org ${n}`,
    signal: `signal ${n}`,
    quote: `quote ${n}`,
    sourceUrl: `https://example.org/${n}`,
    sourceTitle: `Source ${n}`,
    verified,
    context: '',
  }) as ResearchCitation

const call = (over: Partial<ModelCallRecord> = {}): ModelCallRecord => ({
  at: '2026-09-25T10:00:05Z',
  feature: 'marqueta-generate',
  model: 'claude-opus-4-8',
  usage: { inputTokens: 12_000, outputTokens: 1_400 },
  latencyMs: 8200,
  ok: true,
  stopReason: 'end_turn',
  errorKind: null,
  costUsd: 0.095,
  costKnown: true,
  ...over,
})

describe('the headline', () => {
  it('says who asked and what for, in one sentence', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: call() })
    expect(why.headline).toContain('Ada')
    expect(why.headline).toContain('why sponsors stall')
    // en-GB abbreviates September as "Sept", so assert the parts rather than
    // a guessed string — the shape of the date is what matters here.
    expect(why.headline).toMatch(/25 Sept? 2026/)
    expect(why.headline).toContain('an article')
    expect(why.headline.split('\n')).toHaveLength(1)
  })

  it('distinguishes something she caught from something she was asked for', () => {
    const caught = explainWhy({
      subject: subject({ origin: 'caught', requestedBy: null, topic: null }),
      citations: [],
    })
    expect(caught.headline).toContain('caught this in Slack')
    expect(caught.headline).not.toContain('asked her')
  })
})

describe('grounding — absence is said out loud', () => {
  it('states plainly when nothing was verified, rather than showing an empty list', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: call() })
    expect(why.grounding.state).toBe('none')
    expect(why.grounding.absence).toContain('nothing here is cited as fact')
    expect(formatWhy(why)).toContain('nothing here is cited as fact')
  })

  it('ignores unverified research entirely — a lead is not evidence', () => {
    const why = explainWhy({ subject: subject(), citations: [citation(1, false)], call: call() })
    expect(why.grounding.state).toBe('none')
    expect(why.grounding.lines).toEqual([])
  })

  it('caps the list and COUNTS the remainder rather than silently truncating', () => {
    const many = [1, 2, 3, 4, 5].map((n) => citation(n))
    const why = explainWhy({ subject: subject(), citations: many, call: call() })
    expect(why.grounding.lines).toHaveLength(MAX_SHOWN_SOURCES)
    expect(why.grounding.moreCount).toBe(5 - MAX_SHOWN_SOURCES)
    expect(formatWhy(why)).toContain(`and ${5 - MAX_SHOWN_SOURCES} more`)
  })
})

describe('cost — a missing measurement is not zero', () => {
  it('says the call was never recorded instead of showing nothing', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: null })
    expect(why.cost.state).toBe('not-recorded')
    expect(why.cost.absence).toContain('No model call was recorded')
    // The failure this guards: a reader seeing no cost and concluding it was free.
    expect(formatWhy(why)).not.toMatch(/\$0\.00\b/)
  })

  it('says the price is unknown for an unpriced model rather than printing $0', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: call({ costUsd: null, costKnown: false }) })
    expect(why.cost.lines.join(' ')).toContain('cost unknown')
    expect(why.cost.lines.join(' ')).not.toContain('$0')
  })

  it('reports the model, the time and the money when it was recorded', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: call() })
    const text = why.cost.lines.join(' | ')
    expect(text).toContain('claude-opus-4-8')
    expect(text).toContain('8.2s')
    expect(text).toContain('12,000 in')
    expect(text).toContain('$0.095')
  })
})

describe('formatUsd — small amounts must not round to nothing', () => {
  it('keeps enough precision that a fraction of a cent is visible', () => {
    expect(formatUsd(0.0004)).toBe('$0.0004')
    expect(formatUsd(0.095)).toBe('$0.095')
    expect(formatUsd(2.5)).toBe('$2.50')
    // The bug this avoids: a real cost displayed as $0.00 and read as free.
    expect(formatUsd(0.0004)).not.toBe('$0.00')
  })
})

describe('limits — why this is safe to leave alone', () => {
  it('leads with the fact that an undated draft cannot publish itself', () => {
    const why = explainWhy({ subject: subject(), citations: [], call: call() })
    expect(why.limits[0]).toContain('no date')
    expect(why.limits.join(' ')).toContain('not published')
  })

  it('drops the undated line once something is actually scheduled', () => {
    const why = explainWhy({
      subject: subject({ publishAt: '2026-10-01T12:00:00Z', status: 'scheduled' }),
      citations: [],
      call: call(),
    })
    expect(why.limits.join(' ')).not.toContain('no date')
  })
})

describe('formatWhy — ordered the way a person asks', () => {
  it('puts what happened before evidence, evidence before cost, cost before limits', () => {
    const text = formatWhy(explainWhy({ subject: subject(), citations: [citation(1)], call: call() }))
    const headline = text.indexOf('Ada')
    const rested = text.indexOf('What it rested on')
    const cost = text.indexOf('What it cost')
    const limits = text.indexOf('What it cannot do')
    expect(headline).toBeLessThan(rested)
    expect(rested).toBeLessThan(cost)
    expect(cost).toBeLessThan(limits)
  })
})
