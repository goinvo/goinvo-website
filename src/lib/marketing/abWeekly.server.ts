import 'server-only'
import type { SanityClient } from '@sanity/client'
import { AB_EXPERIMENT_PROJECTION, reportExperiment, snapshotOf, type AbSnapshot, type AbTestReport } from '@/lib/marketing/abWeekly'
import { utcIsoWeekKey } from '@/lib/marketing/weeklyCheckIn.server'
import type { MarketingExperiment } from '@/sanity/tools/marketingTool'

/** Listed in INTERNAL_MARKETING_TYPES: read and written only in the private outreach dataset. */
export const AB_SNAPSHOT_TYPE = 'marketingAbSnapshot'
export const abSnapshotId = (week: string) => `${AB_SNAPSHOT_TYPE}.${week}`

type Reader = Pick<SanityClient, 'fetch'>

interface StoredSnapshot {
  week: string
  takenAt: string
  countsJson?: string
}

/** The newest snapshot taken in an EARLIER week: what "this week" is measured against. */
export async function readPreviousSnapshot(client: Reader, week: string): Promise<AbSnapshot | undefined> {
  const stored = await client.fetch<StoredSnapshot | null>(
    `*[_type == $type && week < $week] | order(week desc)[0]{week, takenAt, countsJson}`,
    { type: AB_SNAPSHOT_TYPE, week },
  )
  if (!stored?.countsJson) return undefined
  try {
    return { week: stored.week, takenAt: stored.takenAt, counts: JSON.parse(stored.countsJson) }
  } catch {
    return undefined
  }
}

export interface AbWeeklyReport {
  week: string
  reports: AbTestReport[]
  /** Last week's snapshot existed, so "this week" numbers are real. */
  hasPrevious: boolean
}

/** Every running test, read the way the Studio reads it, against last week's counts. */
export async function loadAbWeeklyReport(client: Reader, now: Date): Promise<AbWeeklyReport> {
  const week = utcIsoWeekKey(now)
  const [experiments, previous] = await Promise.all([
    client.fetch<MarketingExperiment[]>(`*[_type == "marketingExperiment" && status == "running"] | order(title asc)${AB_EXPERIMENT_PROJECTION}`),
    readPreviousSnapshot(client, week),
  ])
  const reports = (experiments || []).map((experiment) => reportExperiment(experiment, previous)).filter((report): report is AbTestReport => Boolean(report))
  return { week, reports, hasPrevious: Boolean(previous) }
}

/**
 * Keeps this week's counts so next Monday can say what changed. One record per ISO
 * week, replaced on a re-run, so a forced repost never splits the week in two.
 */
export async function saveAbSnapshot(client: Pick<SanityClient, 'createOrReplace'>, report: AbWeeklyReport, now: Date) {
  const snapshot = snapshotOf(report.reports, report.week, now.toISOString())
  await client.createOrReplace({
    _id: abSnapshotId(report.week),
    _type: AB_SNAPSHOT_TYPE,
    week: snapshot.week,
    takenAt: snapshot.takenAt,
    countsJson: JSON.stringify(snapshot.counts),
  })
  return snapshot
}
