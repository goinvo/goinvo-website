import { createClient, type SanityClient } from '@sanity/client'
import { NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { getServiceAccount, getGoogleAccessToken, ga4RunReport } from '@/lib/marketing/googleServiceAccount'
import { upsertDrainSignalForFlag } from '@/lib/marketing/drainSink'
import type { DrainAggregate, VariantEngagementInput } from '@/lib/marketing/vercelDrain'

// GA4-sourced A/B measurement. The homepage experiment fires its events
// (experiment_exposure + the tracked conversions) to GA4 with a `variant` event
// parameter, so this pulls per-variant counts from the GA4 Data API and writes
// them through the SAME upsertDrainSignalForFlag the Vercel drain uses — which
// unblocks the A/B suite. Run on demand or from a cron.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GA4_PROPERTY_ID = process.env.GOINVO_GA4_PROPERTY_ID || '321528631'
// Only count production-host traffic — never localhost / *.vercel.app preview
// sessions (which include synthetic test traffic from scripts/traffic-test.mjs).
const GA4_HOST = process.env.GOINVO_GA4_HOST || 'www.goinvo.com'

type ExperimentRow = {
  _id: string
  title?: string
  flagKey?: string
  targetPath?: string
  measurementStartDate?: string
  variants?: Array<{ key?: string; label?: string }>
  trackedMetrics?: Array<{ eventName?: string; source?: string }>
}

function getSanityClient(): SanityClient | null {
  if (!writeToken) return null
  return createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
}

export async function GET(request: Request) {
  // Gate the same way the drain-cron rollup is gated (it shares this drain sink
  // and is also a GET that writes via upsertDrainSignalForFlag): a shared secret
  // presented as `Authorization: Bearer ${secret}`, CRON_SECRET falling back to
  // MARKETING_VERCEL_DRAIN_SECRET. Fail closed when neither is configured.
  const secret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET (or MARKETING_VERCEL_DRAIN_SECRET) is not configured.' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const sa = getServiceAccount()
  if (!sa) {
    return NextResponse.json({ configured: false, message: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set.' })
  }
  const client = getSanityClient()
  if (!client) {
    return NextResponse.json({ configured: false, message: 'A Sanity write token is required to write the readout signal.' })
  }

  const url = new URL(request.url)
  const flagKey = url.searchParams.get('flagKey')
  const days = Math.min(Math.max(Number(url.searchParams.get('days') || 30), 1), 365)

  const experiments = await client.fetch<ExperimentRow[]>(
    `*[_type == "marketingExperiment" && status in ["running", "reviewing"]${flagKey ? ' && flagKey == $flagKey' : ''}]{
      _id, title, flagKey, targetPath, measurementStartDate, variants[]{key, label}, trackedMetrics[]{eventName, source}
    }`,
    flagKey ? { flagKey } : {},
  )
  if (!experiments.length) {
    return NextResponse.json({ configured: true, source: 'ga4', results: [], message: 'No running or reviewing experiments to measure.' })
  }

  let token: string
  try {
    token = await getGoogleAccessToken(sa, ['https://www.googleapis.com/auth/analytics.readonly'])
  } catch (error) {
    return NextResponse.json({ configured: true, error: error instanceof Error ? error.message : 'GA4 auth failed.' }, { status: 500 })
  }

  const metricDate = new Date().toISOString().slice(0, 10)
  const results: Array<Record<string, unknown>> = []

  for (const exp of experiments) {
    if (!exp.flagKey) continue
    const variantKeys = new Set((exp.variants || []).map((v) => v.key?.trim()).filter(Boolean) as string[])
    if (variantKeys.size < 2) {
      results.push({ flagKey: exp.flagKey, skipped: 'needs at least two variants' })
      continue
    }

    // The exposure event plus every tracked conversion event.
    const eventNames = new Set<string>(['experiment_exposure'])
    for (const metric of exp.trackedMetrics || []) {
      if (metric.eventName?.trim()) eventNames.add(metric.eventName.trim())
    }

    let rows
    try {
      rows = await ga4RunReport(token, GA4_PROPERTY_ID, {
        // Only count from the experiment's measurement-start date (set when the
        // instrumentation was fixed) so pre-fix, unreliable data never distorts
        // the readout. Falls back to the rolling window if unset.
        dateRanges: [{ startDate: exp.measurementStartDate || `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'eventName' }, { name: 'customEvent:variant' }, { name: 'pagePath' }],
        // totalUsers (unique users), NOT eventCount — so the readout is a true
        // per-visitor conversion rate (converting users / exposed users) that
        // can't exceed 100% just because one visitor fired an event many times.
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'eventName', inListFilter: { values: [...eventNames] } } },
              { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: GA4_HOST } } },
            ],
          },
        },
        limit: 2000,
      })
    } catch (error) {
      results.push({ flagKey: exp.flagKey, error: error instanceof Error ? error.message : 'GA4 query failed.' })
      continue
    }

    // Keep only rows whose variant belongs to this experiment (drops the
    // "(not set)" rows from the same events firing outside the test).
    const aggregates: DrainAggregate[] = []
    for (const row of rows) {
      const eventName = row.dimensionValues?.[0]?.value || ''
      const variant = row.dimensionValues?.[1]?.value || ''
      const pagePath = row.dimensionValues?.[2]?.value || '/'
      const count = Number(row.metricValues?.[0]?.value || 0)
      if (!eventName || !variantKeys.has(variant) || !Number.isFinite(count) || count <= 0) continue
      aggregates.push({ experimentId: exp._id, flagKey: exp.flagKey, variant, pagePath, eventName, count: Math.round(count) })
    }

    if (!aggregates.length) {
      results.push({ flagKey: exp.flagKey, aggregates: 0, note: 'No per-variant GA4 events in range yet.' })
      continue
    }

    // SECOND report: per-variant SESSION engagement (visits / bounce / avg time).
    // `variant` is an event-scoped custom dimension, so a session is attributed to
    // a variant when it fired experiment_exposure with that variant — these are
    // "sessions exposed to the variant", an acceptable per-variant engagement
    // approximation. Wrapped in its own try/catch so a failure here never breaks
    // the event-count path above (which has already produced `aggregates`).
    let variantEngagement: VariantEngagementInput[] | undefined
    try {
      const engagementRows = await ga4RunReport(token, GA4_PROPERTY_ID, {
        dateRanges: [{ startDate: exp.measurementStartDate || `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'customEvent:variant' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'experiment_exposure' } } },
              { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: GA4_HOST } } },
            ],
          },
        },
        limit: 2000,
      })
      const engagement: VariantEngagementInput[] = []
      for (const row of engagementRows) {
        const variant = row.dimensionValues?.[0]?.value || ''
        // Keep only variants in this experiment's variant set (drops "(not set)").
        if (!variant || !variantKeys.has(variant)) continue
        const sessions = Number(row.metricValues?.[0]?.value)
        const bounceRate = Number(row.metricValues?.[1]?.value)
        const averageSessionDuration = Number(row.metricValues?.[2]?.value)
        engagement.push({
          variantKey: variant,
          sessions: Number.isFinite(sessions) ? sessions : undefined,
          bounceRate: Number.isFinite(bounceRate) ? bounceRate : undefined,
          averageSessionDuration: Number.isFinite(averageSessionDuration) ? averageSessionDuration : undefined,
        })
      }
      if (engagement.length > 0) variantEngagement = engagement
    } catch {
      // Engagement is best-effort; leave it undefined and keep the count readout.
      variantEngagement = undefined
    }

    try {
      const upsert = await upsertDrainSignalForFlag(client, exp.flagKey, aggregates, { metricDate, variantEngagement })
      results.push({ flagKey: exp.flagKey, aggregates: aggregates.length, engagement: variantEngagement?.length || 0, updated: upsert.updated, warnings: upsert.warnings })
    } catch (error) {
      results.push({ flagKey: exp.flagKey, error: error instanceof Error ? error.message : 'Signal upsert failed.' })
    }
  }

  return NextResponse.json({ configured: true, source: 'ga4', range: { days, endDate: metricDate }, results })
}
