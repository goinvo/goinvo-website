/**
 * "Why did Marqueta do this?", answered for one thing she produced.
 *
 * She now drafts copy, files it, plans weeks and spends money, and until this
 * existed the only way to find out why any of it happened was to read the code.
 * A system people cannot interrogate is a system people stop trusting, and the
 * honest response to "where did this number come from" cannot be "look at the
 * source".
 *
 * The shape of the answer is the design. Four things, in the order a person
 * actually asks them:
 *
 *   1. WHAT HAPPENED, in one sentence. Always present, never a list.
 *   2. WHAT IT RESTED ON. The verified evidence, quoted.
 *   3. WHAT IT COST. Model, time, money.
 *   4. WHAT IT CANNOT DO. The limits that mean this is safe to leave alone.
 *
 * Two rules carried from the rest of the suite, because an explanation that
 * quietly omits things is worse than none:
 *
 *   - ABSENCE IS STATED. No verified source says so out loud; an unrecorded
 *     cost says "not recorded" rather than showing nothing or, worse, £0.00.
 *     A gap a reader cannot see is a gap they will assume is a zero.
 *   - THE LIST IS CAPPED AND COUNTED. Three sources and "2 more" beats eleven
 *     sources nobody reads. The panel exists to be understood at a glance, and
 *     a wall of evidence is the same as no evidence.
 *
 * Pure. The caller fetches; this decides what is worth saying.
 */
import { formatCitationForSlack } from './marquetaCitations'
import type { ResearchCitation } from './marquetaCitations'
import type { ModelCallRecord } from './modelLedger'

/** How many sources to show before collapsing the rest into a count. */
export const MAX_SHOWN_SOURCES = 3

export type WhySubject = {
  /** What she produced. */
  title: string
  /** 'article' | 'socialPost' | … as stored on the calendar item. */
  contentType?: string | null
  /** Its calendar status. `drafting` with no date is the safe resting state. */
  status?: string | null
  /** Null means undated, which is what stops it publishing itself. */
  publishAt?: string | null
  /** Who asked, if anyone did. Absent for something she caught rather than drafted. */
  requestedBy?: string | null
  /** What they asked about. */
  topic?: string | null
  /** When the request arrived. */
  askedAt?: string | null
  /** Whether she was asked, or whether she caught it unprompted. */
  origin: 'asked' | 'caught'
}

export type WhyInput = {
  subject: WhySubject
  /** The verified research the draft was grounded in. Empty is a real answer. */
  citations: ResearchCitation[]
  /** The ledger row for the call that produced it, if one was recorded. */
  call?: ModelCallRecord | null
}

export type WhyGrounding = {
  state: 'verified' | 'none'
  lines: string[]
  /** Sources beyond the cap. Counted rather than hidden. */
  moreCount: number
  /** Said out loud when there is nothing. */
  absence: string | null
}

export type WhyCost = {
  state: 'recorded' | 'not-recorded'
  lines: string[]
  absence: string | null
}

export type WhyExplanation = {
  headline: string
  grounding: WhyGrounding
  cost: WhyCost
  limits: string[]
}

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const readableDate = (iso: string | null | undefined): string => {
  const at = Date.parse(clean(iso))
  if (!Number.isFinite(at)) return ''
  return new Date(at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "$0.0412" for a real cost, because rounding a fraction of a cent to £0.00 reads as free. */
export function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  return `$${value.toFixed(4)}`
}

/** "an article" / "a script" — a wrong article is the first thing a reader notices. */
function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
}

function headlineFor(subject: WhySubject): string {
  const what = clean(subject.contentType) || 'draft'
  const when = readableDate(subject.askedAt)
  if (subject.origin === 'caught') {
    return `She caught this in Slack and filed it as ${what}${when ? ` on ${when}` : ''}, because it looked like work somebody had proposed.`
  }
  const who = clean(subject.requestedBy) || 'Someone'
  const topic = clean(subject.topic)
  return (
    `${who} asked her to draft ${what === 'draft' ? 'this' : withArticle(what)}` +
    (topic ? ` on “${topic}”` : '') +
    (when ? `, on ${when}` : '') +
    '.'
  )
}

function groundingFor(citations: ResearchCitation[]): WhyGrounding {
  const verified = citations.filter((citation) => citation && citation.verified)
  if (!verified.length) {
    return {
      state: 'none',
      lines: [],
      moreCount: 0,
      // The same words the Slack card uses, so the two never disagree.
      absence: 'No verified source fit, so nothing here is cited as fact.',
    }
  }
  return {
    state: 'verified',
    lines: verified.slice(0, MAX_SHOWN_SOURCES).map((citation) => formatCitationForSlack(citation)),
    moreCount: Math.max(0, verified.length - MAX_SHOWN_SOURCES),
    absence: null,
  }
}

function costFor(call: ModelCallRecord | null | undefined): WhyCost {
  if (!call) {
    return {
      state: 'not-recorded',
      lines: [],
      // Not zero. A missing measurement and a free call look identical on a
      // screen unless one of them says so.
      absence: 'No model call was recorded for this. Either it predates the ledger, or the write failed.',
    }
  }
  const seconds = call.latencyMs > 0 ? `${(call.latencyMs / 1000).toFixed(1)}s` : 'unrecorded'
  const tokens = `${call.usage.inputTokens.toLocaleString()} in, ${call.usage.outputTokens.toLocaleString()} out`
  const money = call.costUsd === null ? 'cost unknown — this model has no price on file' : formatUsd(call.costUsd)
  return {
    state: 'recorded',
    lines: [`${call.model}, ${seconds}`, tokens, money],
    absence: null,
  }
}

function limitsFor(subject: WhySubject): string[] {
  const limits: string[] = []
  if (!clean(subject.publishAt)) limits.push('It has no date, so it cannot publish itself.')
  const status = clean(subject.status)
  if (status && status !== 'published') limits.push(`Status is ${status}, not published.`)
  limits.push('Nothing she writes goes out without someone scheduling it.')
  return limits
}

export function explainWhy(input: WhyInput): WhyExplanation {
  return {
    headline: headlineFor(input.subject),
    grounding: groundingFor(input.citations || []),
    cost: costFor(input.call),
    limits: limitsFor(input.subject),
  }
}

/**
 * The explanation as plain text.
 *
 * Kept beside the structure so the panel and any text rendering cannot drift,
 * and so the ordering rule is testable rather than a property of some JSX.
 */
export function formatWhy(explanation: WhyExplanation): string {
  const lines: string[] = [explanation.headline, '']

  lines.push('What it rested on')
  if (explanation.grounding.absence) lines.push(`  ${explanation.grounding.absence}`)
  for (const line of explanation.grounding.lines) lines.push(`  ${line}`)
  if (explanation.grounding.moreCount) lines.push(`  and ${explanation.grounding.moreCount} more`)

  lines.push('', 'What it cost')
  if (explanation.cost.absence) lines.push(`  ${explanation.cost.absence}`)
  for (const line of explanation.cost.lines) lines.push(`  ${line}`)

  lines.push('', 'What it cannot do')
  for (const limit of explanation.limits) lines.push(`  ${limit}`)

  return lines.join('\n')
}
