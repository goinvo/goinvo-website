import { createClient, type SanityClient } from '@sanity/client'
import { NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { getServiceAccount, getGoogleAccessToken, ga4RunReport } from '@/lib/marketing/googleServiceAccount'
import { buildVariantEngagementEntries, drainSignalId } from '@/lib/marketing/vercelDrain'
import type { VariantEngagementInput } from '@/lib/marketing/vercelDrain'

// GA4-sourced A/B ENGAGEMENT refresh. The exposure/conversion COUNTS on each
// `marketing-vercel-drain-<flagKey>` signal are owned authoritatively by the
// Vercel drain (drain-cron rolls up Vercel KV counters via upsertDrainSignalForFlag).
// This route must NOT touch those metrics. It only adds per-variant SESSION
// engagement (sessions / bounceRate / averageSessionDuration) pulled from GA4 and
// patches it onto the EXISTING signal so the Vercel visit/conversion counts stay
// intact. Run on demand or from a cron.

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
      _id, title, flagKey, targetPath, measurementStartDate, variants[]{key, label}
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

    // Per-variant SESSION engagement (sessions / bounce / avg time). `variant` is
    // an event-scoped custom dimension, so a session is attributed to a variant
    // when it fired experiment_exposure with that variant — these are "sessions
    // exposed to the variant", an acceptable per-variant engagement approximation.
    // This is the ONLY thing GA4 contributes: the exposure/conversion COUNTS on the
    // signal stay owned by the Vercel drain and are never written here.
    try {
      const engagementRows = await ga4RunReport(token, GA4_PROPERTY_ID, {
        // Only count from the experiment's measurement-start date (set when the
        // instrumentation was fixed) so pre-fix, unreliable data never distorts
        // the readout. Falls back to the rolling window if unset.
        dateRanges: [{ startDate: exp.measurementStartDate || `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'customEvent:variant' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'experiment_exposure' } } },
              // Only production-host traffic — never localhost / preview / test sessions.
              { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: GA4_HOST } } },
            ],
          },
        },
        limit: 2000,
      })
      const engagementInputs: VariantEngagementInput[] = []
      for (const row of engagementRows) {
        const variant = row.dimensionValues?.[0]?.value || ''
        // Keep only variants in this experiment's variant set (drops "(not set)").
        if (!variant || !variantKeys.has(variant)) continue
        const sessions = Number(row.metricValues?.[0]?.value)
        const bounceRate = Number(row.metricValues?.[1]?.value)
        const averageSessionDuration = Number(row.metricValues?.[2]?.value)
        engagementInputs.push({
          variantKey: variant,
          sessions: Number.isFinite(sessions) ? sessions : undefined,
          bounceRate: Number.isFinite(bounceRate) ? bounceRate : undefined,
          averageSessionDuration: Number.isFinite(averageSessionDuration) ? averageSessionDuration : undefined,
        })
      }

      const variantEngagement = buildVariantEngagementEntries(engagementInputs, variantKeys)
      if (variantEngagement.length === 0) {
        results.push({ flagKey: exp.flagKey, engagement: 0, note: 'No per-variant GA4 engagement in range yet.' })
        continue
      }

      // Targeted patch onto the EXISTING Vercel-sourced signal. We never CREATE a
      // signal here — the Vercel drain owns the metrics, so GA4 must never produce
      // a metrics-less signal. Fetch-guard the patch so a missing signal leaves
      // nothing behind: we only set { variantEngagement } when the drain signal
      // already exists, leaving every Vercel-sourced metric untouched.
      const signalId = drainSignalId(exp.flagKey)
      const existing = await client.fetch<{ _id: string } | null>(
        `*[_id == $signalId][0]{_id}`,
        { signalId },
      )
      if (!existing) {
        results.push({ flagKey: exp.flagKey, engagement: variantEngagement.length, updated: false, note: 'No Vercel drain signal yet — run the Vercel drain first; engagement is only added to an existing signal.' })
        continue
      }
      await client.patch(signalId).set({ variantEngagement }).commit()
      results.push({ flagKey: exp.flagKey, engagement: variantEngagement.length, updated: true })
    } catch (error) {
      // Engagement is best-effort and per-experiment: a failure here never affects
      // the Vercel-sourced metrics or the other experiments in this run.
      results.push({ flagKey: exp.flagKey, error: error instanceof Error ? error.message : 'GA4 engagement refresh failed.' })
    }
  }

  return NextResponse.json({ configured: true, source: 'ga4', range: { days, endDate: metricDate }, results })
}
