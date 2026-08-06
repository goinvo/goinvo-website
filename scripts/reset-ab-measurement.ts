#!/usr/bin/env tsx
/**
 * Starts a clean first-party measurement window for one A/B flag.
 *
 * Dry-run by default:
 *   npx tsx scripts/reset-ab-measurement.ts --flag home-2026-variant
 *
 * Apply only after the visitor-deduping build is deployed:
 *   npx tsx scripts/reset-ab-measurement.ts --flag home-2026-variant \
 *     --write --confirm reset:home-2026-variant
 *
 * The previous Sanity readout is archived before the cumulative KV counters
 * are cleared. Only the explicitly named flag is touched.
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import {
  drainSignalId,
} from '@/lib/marketing/vercelDrain'
import {
  getKvClient,
  kvCounterKey,
  kvSourceKey,
} from '@/lib/marketing/drainSink'
import { home2026Experiment } from '@/lib/experiments/registry'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const valueFor = (name: string) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const flagKey = valueFor('flag')
const write = args.includes('--write')
const confirmation = valueFor('confirm')
if (!flagKey) throw new Error('Pass the exact flag with --flag. No default is used for a destructive reset.')
if (flagKey !== home2026Experiment.flagKey) {
  throw new Error(`This reset command is scoped to ${home2026Experiment.flagKey}; received ${flagKey}.`)
}
if (write && confirmation !== `reset:${flagKey}`) {
  throw new Error(`To apply, pass --confirm reset:${flagKey}.`)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Sanity project ID and write token are required.')

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})
const kv = getKvClient()
if (!kv) throw new Error('Vercel KV is not configured.')

type Signal = {
  _id: string
  _type: 'marketingPerformanceSignal'
  title?: string
  provider?: string
  sourceLabel?: string
  experiment?: { _type: 'reference'; _ref: string }
  pageUrl?: string
  metricDate?: string
  periodStart?: string
  periodEnd?: string
  metrics?: Array<Record<string, unknown>>
  variantEngagement?: Array<Record<string, unknown>>
  sectionEngagement?: Array<Record<string, unknown>>
  interpretation?: string
  recommendation?: string
  rawImport?: string
}

async function run() {
  const experiment = await client.fetch<{
    _id: string
    title?: string
    measurementStart?: string
  } | null>(
    `*[_type == "marketingExperiment" && flagKey == $flagKey][0]{
      _id, title, measurementStart
    }`,
    { flagKey },
  )
  if (!experiment) throw new Error(`No marketingExperiment found for ${flagKey}.`)

  const signalId = drainSignalId(flagKey)
  const signal = await client.fetch<Signal | null>(
    `*[_id == $signalId][0]{
      _id, _type, title, provider, sourceLabel, experiment, pageUrl,
      metricDate, periodStart, periodEnd, metrics, variantEngagement,
      sectionEngagement, interpretation, recommendation, rawImport
    }`,
    { signalId },
  )
  const counters = await kv.hgetall<Record<string, unknown>>(kvCounterKey(flagKey))
  const sourceCounters = await kv.hgetall<Record<string, unknown>>(kvSourceKey(flagKey))
  const counterFields = Object.keys(counters || {}).length
  const sourceFields = Object.keys(sourceCounters || {}).length

  console.log(`Experiment: ${experiment.title || experiment._id}`)
  console.log(`Flag: ${flagKey}`)
  console.log(`Measurement key in deployed code must be: ${home2026Experiment.measurementKey}`)
  console.log(`Counter fields to clear: ${counterFields}`)
  console.log(`Attribution fields to clear: ${sourceFields}`)
  console.log(`Readout to archive: ${signal?.title || '(none)'}`)

  if (!write) {
    console.log('Dry run only. Deploy the deduping build, then rerun with --write and the confirmation token.')
    return
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const date = nowIso.slice(0, 10)
  const archiveId = `marketing-ab-archive-${flagKey.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}-${nowIso.replace(/\D/g, '')}`

  if (signal) {
    await client.create({
      ...signal,
      _id: archiveId,
      title: `${signal.title || experiment.title || flagKey} – pre-dedupe archive ${date}`,
      status: 'archived',
      signalType: 'abTestVariantReadoutArchive',
      sourceLabel: `${signal.sourceLabel || 'First-party A/B readout'} (archived before visitor dedupe reset)`,
      rawImport: JSON.stringify({
        archivedAt: nowIso,
        reason: 'Reset cumulative counters after visitor-level exposure/event deduplication shipped.',
        measurementKey: home2026Experiment.measurementKey,
        priorSignal: signal,
      }, null, 2),
    })
  }

  await kv.del(kvCounterKey(flagKey))
  await kv.del(kvSourceKey(flagKey))

  const transaction = client.transaction().patch(
    experiment._id,
    (patch) => patch.set({ measurementStart: nowIso }),
  )
  if (signal) {
    const zeroMetrics = (signal.metrics || []).map((metric) => {
      const zeroMetric = { ...metric, value: 0 }
      delete zeroMetric.change
      return zeroMetric
    })
    transaction.patch(signal._id, (patch) => patch.set({
      metricDate: date,
      periodStart: date,
      periodEnd: date,
      metrics: zeroMetrics,
      variantEngagement: [],
      sectionEngagement: [],
      interpretation: `Measurement reset ${nowIso}. New counts are visitor-deduped for measurement key ${home2026Experiment.measurementKey}.`,
      rawImport: JSON.stringify({
        generatedFrom: 'visitor-dedupe-reset',
        resetAt: nowIso,
        flagKey,
        measurementKey: home2026Experiment.measurementKey,
        archivedSignalId: archiveId,
      }, null, 2),
    }))
  }
  await transaction.commit()

  console.log(`Reset complete. Archived prior readout as ${signal ? archiveId : '(no prior signal)'}.`)
  console.log(`New measurement window: ${nowIso}`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
