/**
 * The grounding golden set: can a drafted sentence say only what its evidence says?
 *
 * This is the failure the suite already had once and fixed. Under the first
 * research prompt, **0 of 20 claims verified** — not fabrications, but
 * over-specification: sentences that were true in substance while asserting a
 * number, a date or a name the cited passage never contained. The fix was a
 * prompt rule. A prompt rule is not enforcement, so this is the enforcement.
 *
 * The grader is `findUncitedSpecifics`, which is deterministic and free: it
 * pulls the numbers, months and capitalised names out of a claim and checks
 * each one literally occurs in the quote. No model, so this runs in CI at no
 * cost and cannot itself hallucinate a verdict.
 *
 * It deliberately does not judge meaning. A draft with no uncited specifics can
 * still misread its source. This narrows the reviewer's job; it does not
 * replace them, and the suite should not be read as saying otherwise.
 *
 * CANARIES (`expect: 'fail'`) are the point of the file. They are drafts that
 * invent a specific, and the grader is required to catch every one. If a canary
 * ever passes, `suiteHealth` voids the whole run rather than reporting a score.
 */
import { findUncitedSpecifics } from '../sourceVerification'
import type { EvalCase, Grade } from '../evalHarness'

export type GroundingInput = {
  /** The sentence a draft would publish. */
  claim: string
  /** The verified passage it is allowed to rest on. */
  quote: string
  /** The subject organisation, whose own name is not an uncited specific. */
  organization?: string
}

/** A claim passes when every specific in it occurs in the quote it cites. */
export function gradeGrounding(input: GroundingInput): Grade {
  const uncited = findUncitedSpecifics(input.claim, input.quote, {
    ignore: input.organization ? [input.organization] : [],
  })
  return uncited.length
    ? { ok: false, detail: `asserts ${uncited.length} specific(s) absent from the quote: ${uncited.join(', ')}` }
    : { ok: true, detail: 'every specific in the claim occurs in the quote' }
}

export const GROUNDING_SUITE = 'grounding: a claim may only say what its quote says'

export const GROUNDING_GOLDEN_SET: EvalCase<GroundingInput>[] = [
  // ── Should pass ───────────────────────────────────────────────────────────
  {
    id: 'paraphrase-within-quote',
    what: 'a plain paraphrase that adds no specifics',
    expect: 'pass',
    tags: ['paraphrase'],
    input: {
      claim: 'They are expanding remote monitoring across their network.',
      quote: 'We are expanding remote monitoring across our network this year.',
    },
  },
  {
    id: 'number-present-in-quote',
    what: 'a number that genuinely appears in the quote',
    expect: 'pass',
    tags: ['number'],
    input: {
      claim: 'They run 38 sites.',
      quote: 'Our care model now runs across 38 sites.',
    },
  },
  {
    id: 'number-reformatted',
    what: 'the same number written differently ($116 million vs 116 million)',
    expect: 'pass',
    tags: ['number', 'formatting'],
    input: {
      claim: 'The round was $116 million.',
      quote: 'The company raised 116 million in its latest round.',
    },
  },
  {
    id: 'own-name-not-a-specific',
    what: 'the subject organisation naming itself in a first-person quote',
    expect: 'pass',
    tags: ['name'],
    input: {
      claim: 'Pearl Health has expanded its provider network.',
      quote: 'We have expanded our provider network considerably.',
      organization: 'Pearlhealth',
    },
  },
  {
    id: 'month-present-in-quote',
    what: 'a month that appears in the quote',
    expect: 'pass',
    tags: ['date'],
    input: {
      claim: 'They announced the programme in March.',
      quote: 'In March we announced the new programme.',
    },
  },

  // ── Canaries: the grader MUST reject these ────────────────────────────────
  {
    id: 'canary-invented-percentage',
    what: 'CANARY: a percentage the quote never states',
    expect: 'fail',
    tags: ['number', 'canary'],
    input: {
      claim: 'They cut readmissions by 23%.',
      quote: 'We have seen a meaningful reduction in readmissions.',
    },
  },
  {
    id: 'canary-invented-count',
    what: 'CANARY: a site count the quote never states',
    expect: 'fail',
    tags: ['number', 'canary'],
    input: {
      claim: 'They operate 42 clinics.',
      quote: 'We operate clinics across the region.',
    },
  },
  {
    id: 'canary-invented-month',
    what: 'CANARY: a month the quote never states',
    expect: 'fail',
    tags: ['date', 'canary'],
    input: {
      claim: 'The pilot began in September.',
      quote: 'The pilot began earlier this year.',
    },
  },
  {
    id: 'canary-invented-money',
    what: 'CANARY: a funding figure the quote never states',
    expect: 'fail',
    tags: ['number', 'canary'],
    input: {
      claim: 'They raised $40 million to expand.',
      quote: 'They raised new funding to expand.',
    },
  },
  {
    id: 'canary-number-changed',
    what: 'CANARY: the right shape of claim with the wrong number in it',
    expect: 'fail',
    tags: ['number', 'canary'],
    input: {
      claim: 'Their care model runs across 83 sites.',
      quote: 'Our care model now runs across 38 sites.',
    },
  },
]
