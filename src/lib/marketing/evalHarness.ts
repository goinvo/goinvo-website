/**
 * A graded run over a fixed set of cases, built so that a perfect score means
 * something.
 *
 * The suite this repo already learned the hard way: a check that cannot fail
 * reports success forever and nobody notices. `tickDidSomething` matched a
 * digit anywhere in its own summary and found the YEAR. A "rebalancing" was a
 * constant added to logits, which softmax makes a no-op. Both looked healthy.
 *
 * An eval is the same trap wearing a percentage. A grader that returns `ok`
 * unconditionally scores 100% on every case, and 100% is exactly what you hope
 * to see, so nobody investigates. So every suite here carries CANARIES:
 * cases the grader is required to FAIL. If a canary passes, the grader is inert
 * and the whole run is untrustworthy no matter what the score says.
 *
 * That is a negative control, and it is not optional — `suiteHealth` refuses to
 * call a canary-free suite trustworthy at all.
 *
 * Pure. No model calls, no network, no clock beyond what the caller passes in,
 * so the offline suite runs in CI for nothing. A grader that needs a live model
 * goes through `generateClaudeText`, which means its spend lands on the ledger
 * rather than being invisible.
 */

/** Whether the grader is supposed to accept this case, or reject it. */
export type Expectation = 'pass' | 'fail'

export type EvalCase<Input> = {
  id: string
  /** What this case is checking, in a line a person can read in a failure report. */
  what: string
  input: Input
  /**
   * `fail` marks a CANARY: deliberately bad input the grader must reject. A
   * canary the grader accepts is the signal that the grader has stopped working.
   */
  expect: Expectation
  tags?: string[]
}

/** What a grader says about one case. */
export type Grade = { ok: boolean; detail: string }

export type CaseResult = {
  id: string
  what: string
  expect: Expectation
  /** What the grader said. */
  ok: boolean
  /** Whether the grader said the right thing. This is what scores. */
  correct: boolean
  detail: string
  tags: string[]
}

export type SuiteRun = {
  suite: string
  at: string
  results: CaseResult[]
  total: number
  /** Cases the grader judged correctly, canaries included. */
  correct: number
  /** 0..1 over every case. */
  score: number
  canaries: number
  /** Canaries the grader correctly rejected. All of them, or the run is void. */
  canariesCaught: number
}

export function runSuite<Input>(
  suite: string,
  cases: EvalCase<Input>[],
  grade: (input: Input) => Grade,
  at: string,
): SuiteRun {
  const results: CaseResult[] = cases.map((testCase) => {
    let verdict: Grade
    try {
      verdict = grade(testCase.input)
    } catch (error) {
      // A grader that throws is a failed grader, not a failed case. Recorded as
      // an incorrect result either way, so it cannot pass silently.
      verdict = { ok: false, detail: `grader threw: ${String(error).slice(0, 160)}` }
    }
    return {
      id: testCase.id,
      what: testCase.what,
      expect: testCase.expect,
      ok: verdict.ok,
      correct: verdict.ok === (testCase.expect === 'pass'),
      detail: verdict.detail,
      tags: testCase.tags || [],
    }
  })

  const canaryResults = results.filter((result) => result.expect === 'fail')
  const correct = results.filter((result) => result.correct).length

  return {
    suite,
    at,
    results,
    total: results.length,
    correct,
    score: results.length ? correct / results.length : 0,
    canaries: canaryResults.length,
    canariesCaught: canaryResults.filter((result) => result.correct).length,
  }
}

export type SuiteHealth = {
  state: 'no-cases' | 'no-canaries' | 'grader-inert' | 'ok'
  detail: string
  /** False means the score must not be reported as a result. */
  trustworthy: boolean
}

/**
 * Can this run's score be believed?
 *
 * Kept separate from the score on purpose. A number and a reason to doubt it
 * must not be averaged into one figure, because the number is what gets quoted
 * and the doubt is what gets dropped.
 */
export function suiteHealth(run: SuiteRun): SuiteHealth {
  if (!run.total) {
    return {
      state: 'no-cases',
      detail: `Suite "${run.suite}" ran no cases. An empty suite scores 0 and proves nothing.`,
      trustworthy: false,
    }
  }
  if (!run.canaries) {
    return {
      state: 'no-canaries',
      detail: `Suite "${run.suite}" has no canaries, so a grader that accepts everything would score 100%. Add at least one case with expect: 'fail'.`,
      trustworthy: false,
    }
  }
  if (run.canariesCaught < run.canaries) {
    const missed = run.results.filter((result) => result.expect === 'fail' && !result.correct)
    return {
      state: 'grader-inert',
      detail:
        `${run.canaries - run.canariesCaught} of ${run.canaries} canaries were ACCEPTED by the grader, so it is not actually checking. ` +
        `First: ${missed[0]?.id} — ${missed[0]?.what}.`,
      trustworthy: false,
    }
  }
  return {
    state: 'ok',
    detail: `${run.total} cases, ${run.canaries} canaries all caught.`,
    trustworthy: true,
  }
}

/**
 * A run, as a person should read it.
 *
 * Ordered by what changes a decision: whether the number can be trusted, then
 * the number, then only what failed. A passing case has nothing to say, so it
 * says nothing — a report that lists every success buries the one line that
 * matters.
 */
export function formatRunSummary(run: SuiteRun): string {
  const health = suiteHealth(run)
  const lines: string[] = []

  if (!health.trustworthy) {
    lines.push(`UNTRUSTWORTHY (${health.state}) — ${health.detail}`)
    lines.push('The score below is not a result.')
  }

  lines.push(`${run.suite}: ${run.correct}/${run.total} correct (${Math.round(run.score * 100)}%)`)

  const failures = run.results.filter((result) => !result.correct)
  if (!failures.length) {
    if (health.trustworthy) lines.push(`All correct, and all ${run.canaries} canaries were caught.`)
    return lines.join('\n')
  }

  lines.push('')
  lines.push(`${failures.length} incorrect:`)
  for (const failure of failures) {
    const kind = failure.expect === 'fail' ? 'CANARY ACCEPTED' : 'rejected'
    lines.push(`  ${failure.id}  [${kind}]  ${failure.what}`)
    if (failure.detail) lines.push(`      ${failure.detail}`)
  }
  return lines.join('\n')
}
