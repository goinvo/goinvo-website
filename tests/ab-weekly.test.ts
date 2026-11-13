import { describe, expect, it } from 'vitest'
import { compareArms, fisherExact, normalCdf, significanceWords } from '@/lib/marketing/abWeekly'
import { parseMarquetaIntent } from '@/lib/marketing/marquetaChat'

/**
 * Rule: Marqueta's weekly A/B report says when a gap is real and when it is still
 * noise, with the right test for the counts, and never calls a handful of events a
 * result. Reference values are textbook, or an exact enumeration done outside this module (noted inline).
 */
describe('the significance check', () => {
  it('has a correct normal tail', () => {
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4)
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(-1.644854)).toBeCloseTo(0.05, 4)
  })

  it("matches Fisher's tea-tasting table (3 of 4 vs 1 of 4: two-sided p = 0.4857)", () => {
    expect(fisherExact({ visitors: 4, events: 3 }, { visitors: 4, events: 1 })).toBeCloseTo(0.4857, 3)
    // Exact enumeration with integer binomials (Python math.comb), independent of this module: 0.03635.
    expect(fisherExact({ visitors: 603, events: 0 }, { visitors: 748, events: 6 })).toBeCloseTo(0.03635, 4)
  })

  it('uses the z-test with enough events, and the exact test when an expected count is under 5', () => {
    // 40/1000 vs 62/1000: z = 2.236, two-sided p = 0.0254.
    const z = compareArms({ visitors: 1000, events: 40 }, { visitors: 1000, events: 62 })
    expect(z).toMatchObject({ kind: 'significant', higher: 'variant', test: 'z' })
    expect(z.kind === 'significant' && z.pValue).toBeCloseTo(0.0254, 3)
    const exact = compareArms({ visitors: 603, events: 0 }, { visitors: 748, events: 6 })
    expect(exact).toMatchObject({ kind: 'significant', test: 'fisher', events: 6 })
  })

  it('says how many more visitors a version needs at the gap seen so far (80% power)', () => {
    // 10% vs 11%: about 14,750 per version in total, so about 13,750 more at 1,000 each.
    const result = compareArms({ visitors: 1000, events: 100 }, { visitors: 1000, events: 110 })
    expect(result.kind).toBe('notYet')
    const more = result.kind === 'notYet' ? result.moreVisitorsPerVersion! : 0
    expect(Math.abs(more - 13_750) / 13_750).toBeLessThan(0.02)
  })

  it('refuses to test what it cannot', () => {
    expect(compareArms({ visitors: 60, events: 3 }, { visitors: 70, events: 9 }).kind).toBe('noData')
    expect(compareArms({ visitors: 500, events: 0 }, { visitors: 500, events: 0 }).kind).toBe('noData')
    expect(compareArms({ visitors: 500, events: 900 }, { visitors: 500, events: 20 }).kind).toBe('noData')
  })

  it('calls a significant result on few events a lead to confirm, not a result', () => {
    const labels = { control: 'Current', variant: 'Concept' }
    const few = significanceWords(compareArms({ visitors: 603, events: 0 }, { visitors: 748, events: 6 }), labels)
    expect(few).toBe('significant at 95% (p = 0.04, exact test): Concept is higher, but on only 6 events: a lead to confirm')
    const many = significanceWords(compareArms({ visitors: 1000, events: 40 }, { visitors: 1000, events: 62 }), labels)
    expect(many).toBe('significant at 95% (p = 0.03): Concept is higher')
  })
})

describe('asking Marqueta for the A/B tests', () => {
  it.each(['Marqueta, ab tests', 'Marqueta, A/B tests', 'Marqueta: how are the a/b tests doing this week?', 'Marqueta, split test results', 'Marqueta, experiment results'])('answers "%s" with the report', (text) => {
    expect(parseMarquetaIntent(text).kind).toBe('abTests')
  })

  it('still files a proposal to run a test as a proposal, and leaves other topics alone', () => {
    expect(parseMarquetaIntent('Marqueta, we should run an A/B test on the contact page').kind).not.toBe('abTests')
    expect(parseMarquetaIntent('Marqueta, how are we doing this week?').kind).not.toBe('abTests')
    expect(parseMarquetaIntent('Marqueta, runway').kind).toBe('runway')
  })
})
