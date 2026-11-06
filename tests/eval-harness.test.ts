/**
 * The eval harness, and the reason a score from it can be believed.
 *
 * The harness exists because a grader that cannot fail reports 100% forever.
 * So the harness is itself falsified here: an always-accept grader must be
 * caught and the run voided, and a suite with no canaries must be refused even
 * when every case passes. If either of those assertions ever goes green the
 * wrong way, every eval number downstream is decoration.
 */
import { describe, expect, it } from 'vitest'

import {
  formatRunSummary,
  runSuite,
  suiteHealth,
  type EvalCase,
  type Grade,
} from '@/lib/marketing/evalHarness'
import {
  gradeGrounding,
  GROUNDING_GOLDEN_SET,
  GROUNDING_SUITE,
  type GroundingInput,
} from '@/lib/marketing/evals/groundingGoldenSet'

const AT = '2026-09-27T12:00:00Z'

const tiny = (expect_: 'pass' | 'fail'): EvalCase<string>[] => [
  { id: 'c1', what: 'a case', expect: expect_, input: 'x' },
]

describe('runSuite', () => {
  it('scores a grader on whether it was RIGHT, not on whether it said yes', () => {
    // A canary the grader rejects is a correct result, even though ok is false.
    const cases: EvalCase<string>[] = [
      { id: 'good', what: 'should pass', expect: 'pass', input: 'good' },
      { id: 'bad', what: 'should fail', expect: 'fail', input: 'bad' },
    ]
    const grade = (input: string): Grade => ({ ok: input === 'good', detail: '' })
    const run = runSuite('t', cases, grade, AT)
    expect(run.correct).toBe(2)
    expect(run.score).toBe(1)
    expect(run.canaries).toBe(1)
    expect(run.canariesCaught).toBe(1)
    expect(suiteHealth(run).trustworthy).toBe(true)
  })

  it('counts a grader that throws as an incorrect result, not a crash', () => {
    const run = runSuite('t', tiny('pass'), () => {
      throw new Error('boom')
    }, AT)
    expect(run.correct).toBe(0)
    expect(run.results[0].detail).toContain('grader threw')
  })
})

describe('suiteHealth — the check that makes a score mean something', () => {
  it('FALSIFICATION: an always-accept grader scores 100% and is still voided', () => {
    // This is the whole point of the file. Without canaries the run below
    // would look perfect, because the grader accepts literally everything.
    const cases: EvalCase<string>[] = [
      { id: 'good', what: 'should pass', expect: 'pass', input: 'good' },
      { id: 'canary', what: 'CANARY: must be rejected', expect: 'fail', input: 'bad' },
    ]
    const alwaysAccept = (): Grade => ({ ok: true, detail: 'looks fine to me' })
    const run = runSuite('t', cases, alwaysAccept, AT)

    const health = suiteHealth(run)
    expect(health.state).toBe('grader-inert')
    expect(health.trustworthy).toBe(false)
    expect(health.detail).toContain('canaries were ACCEPTED')
    // And the report says so before it says the number.
    expect(formatRunSummary(run)).toContain('UNTRUSTWORTHY')
  })

  it('FALSIFICATION: a canary-free suite is refused even at a perfect score', () => {
    const run = runSuite('t', tiny('pass'), () => ({ ok: true, detail: '' }), AT)
    expect(run.score).toBe(1)
    const health = suiteHealth(run)
    expect(health.state).toBe('no-canaries')
    expect(health.trustworthy).toBe(false)
  })

  it('refuses an empty suite rather than scoring it 0 and moving on', () => {
    const run = runSuite('t', [], () => ({ ok: true, detail: '' }), AT)
    expect(suiteHealth(run).state).toBe('no-cases')
  })
})

describe('formatRunSummary — written to be read, not dumped', () => {
  it('leads with the doubt, then the number, then only the failures', () => {
    const cases: EvalCase<string>[] = [
      { id: 'ok1', what: 'fine', expect: 'pass', input: 'good' },
      { id: 'ok2', what: 'also fine', expect: 'pass', input: 'good' },
      { id: 'bust', what: 'should have been rejected', expect: 'fail', input: 'good' },
    ]
    const summary = formatRunSummary(runSuite('t', cases, () => ({ ok: true, detail: 'd' }), AT))
    expect(summary.indexOf('UNTRUSTWORTHY')).toBeLessThan(summary.indexOf('correct ('))
    // Passing cases are not listed. Only the one that needs attention is.
    expect(summary).toContain('bust')
    expect(summary).not.toContain('ok1')
  })

  it('says the canaries were caught when everything is right, so silence is not ambiguous', () => {
    const cases: EvalCase<string>[] = [
      { id: 'good', what: 'fine', expect: 'pass', input: 'good' },
      { id: 'canary', what: 'CANARY', expect: 'fail', input: 'bad' },
    ]
    const summary = formatRunSummary(
      runSuite('t', cases, (input) => ({ ok: input === 'good', detail: '' }), AT),
    )
    expect(summary).toContain('canaries were caught')
    expect(summary).not.toContain('UNTRUSTWORTHY')
  })
})

describe('the grounding golden set', () => {
  const run = () => runSuite(GROUNDING_SUITE, GROUNDING_GOLDEN_SET, gradeGrounding, AT)

  it('carries canaries, so it can detect its own grader going inert', () => {
    const result = run()
    expect(result.canaries).toBeGreaterThanOrEqual(4)
  })

  it('passes, with every canary caught', () => {
    const result = run()
    const health = suiteHealth(result)
    expect(health.trustworthy, formatRunSummary(result)).toBe(true)
    expect(result.correct, formatRunSummary(result)).toBe(result.total)
  })

  it('catches the over-specification that made 0 of 20 claims verifiable', () => {
    // The original failure in one case: a true-sounding sentence asserting a
    // number the source never gave.
    const verdict = gradeGrounding({
      claim: 'They cut readmissions by 23%.',
      quote: 'We have seen a meaningful reduction in readmissions.',
    })
    expect(verdict.ok).toBe(false)
    expect(verdict.detail).toContain('23')
  })

  it('does not cry wolf over the organisation naming itself', () => {
    // A checker with false positives gets switched off, which is its own failure.
    expect(
      gradeGrounding({
        claim: 'Pearl Health has expanded its provider network.',
        quote: 'We have expanded our provider network considerably.',
        organization: 'Pearlhealth',
      }).ok,
    ).toBe(true)
  })
})
