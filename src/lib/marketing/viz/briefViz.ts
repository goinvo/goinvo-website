/**
 * The audience brief's two charts, as data: who on the list could buy at all,
 * and how much of the research on them survives verification.
 *
 * Both are counts the brief already makes in prose and tables; drawing them
 * makes the two uncomfortable findings — a mostly non-buyer list, and research
 * that thins out at every check — visible before anyone reads a number.
 */
import type { SegmentRow } from '../audienceBrief'

export type ShareSlice = { key: string; label: string; value: number; tone: 'accent' | 'context' | 'unknown' }

/** The list, split into the part that could commission work and the part that cannot. */
export function buyerShare(segments: { rows: SegmentRow[]; unclassified: number }): ShareSlice[] {
  const buyer = segments.rows.filter((row) => row.isBuyer).reduce((sum, row) => sum + row.count, 0)
  const other = segments.rows.filter((row) => !row.isBuyer).reduce((sum, row) => sum + row.count, 0)
  return [
    { key: 'buyer', label: 'Could buy', value: buyer, tone: 'accent' },
    { key: 'other', label: 'Peers, students, other', value: other, tone: 'context' },
    { key: 'unclassified', label: 'Unclassified', value: segments.unclassified, tone: 'unknown' },
  ]
}

export type CoverageBar = { key: string; label: string; value: number; short: boolean }

/** Each targeted segment against the size a campaign needs. Short ones are the point. */
export function segmentCoverage(rows: SegmentRow[], targeted: readonly string[], threshold: number, label: (segment: string) => string): CoverageBar[] {
  const counts = new Map(rows.map((row) => [row.segment, row.count]))
  return targeted
    .map((segment) => ({ key: segment, label: label(segment), value: counts.get(segment) ?? 0, short: (counts.get(segment) ?? 0) < threshold }))
    .sort((a, b) => b.value - a.value)
}

export function coverageInsight(bars: CoverageBar[], threshold: number): string {
  const short = bars.filter((bar) => bar.short)
  if (!bars.length) return ''
  if (!short.length) return `Every targeted segment has at least ${threshold} people to start from.`
  const names = short.map((bar) => `${bar.label} (${bar.value})`).join(', ')
  return `${names} ${short.length === 1 ? 'is' : 'are'} below the ${threshold} people a campaign needs — choosing ${short.length === 1 ? 'it' : 'them'} means cold outreach from scratch.`
}

export type ResearchRecord = { verification?: { status?: string | null } | null; quoteCheck?: { status?: string | null } | null }

export type ResearchStage = { key: string; label: string; count: number; fromPrevious: number | null; isLeak: boolean; detail?: string }

/**
 * From "we can name the organisation" to "we can say this on a call": each
 * stage is a check the claim had to pass. A quote counts as found when the
 * quote check found it OR the verifier later bound it to a source (the checks
 * ran in that order, and a verified claim necessarily has a present quote).
 */
export function researchFunnel(organisations: number, research: ResearchRecord[]): ResearchStage[] {
  const researched = research.length
  const quoted = research.filter(
    (record) =>
      record.quoteCheck?.status === 'quote-present' ||
      record.verification?.status === 'verified' ||
      record.verification?.status === 'overreach',
  ).length
  const verified = research.filter((record) => record.verification?.status === 'verified').length
  const counts = [
    { key: 'orgs', label: 'Organisations named', count: organisations, detail: 'distinct employers on the list' },
    { key: 'researched', label: 'Researched', count: researched, detail: 'a live signal with a cited source' },
    { key: 'quoted', label: 'Quote on the page', count: quoted, detail: 'the quoted words really are on the cited page' },
    { key: 'verified', label: 'Claim verified', count: verified, detail: 'the claim says nothing the quote does not' },
  ]
  const stages = counts.map((stage, index) => ({
    ...stage,
    fromPrevious: index === 0 ? null : counts[index - 1].count ? stage.count / counts[index - 1].count : 0,
    isLeak: false,
  }))
  // The weakest check after the first step (researching every name is a choice, not a leak).
  let leak = -1
  let worst = Infinity
  stages.forEach((stage, index) => {
    if (index < 2 || stage.fromPrevious === null || counts[index - 1].count < 3) return
    if (stage.fromPrevious < worst) {
      worst = stage.fromPrevious
      leak = index
    }
  })
  if (leak > 0) stages[leak].isLeak = true
  return stages
}

export function researchInsight(stages: ResearchStage[]): string {
  const verified = stages[stages.length - 1]?.count ?? 0
  const researched = stages[1]?.count ?? 0
  if (!researched) return 'No organisation has been researched yet.'
  return `${verified} of ${researched} researched organisations have a claim we can stand behind on a call. Only those lead the openings below; the rest are shown as unverified.`
}
