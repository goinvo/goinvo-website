#!/usr/bin/env tsx
/**
 * Read-only inspection of the homepage A/B test measurement state in Sanity.
 * Prints the experiment's variants, tracked event names, and every linked
 * performance-signal metric (variantKey / eventName / value), then reports
 * whether per-variant exposure and event counts exist. Does NOT mutate anything.
 *
 *   npx tsx scripts/inspect-ab-drain.ts [--flag home-2026-variant]
 */
import path from 'path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

const cwd = process.cwd()
loadEnv({ path: path.resolve(cwd, '.env.local'), quiet: true })
loadEnv({ quiet: true })

const flagKey = (() => {
  const argv = process.argv.slice(2)
  const inline = argv.find((arg) => arg.startsWith('--flag='))
  if (inline) return inline.slice('--flag='.length)
  const index = argv.indexOf('--flag')
  return index === -1 ? 'home-2026-variant' : argv[index + 1]
})()

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

if (!projectId) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local')

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
  perspective: 'previewDrafts',
})

type Metric = { label?: string; value?: number; unit?: string; change?: string; variantKey?: string; eventName?: string }
type Experiment = {
  _id: string
  title?: string
  status?: string
  flagKey?: string
  variants?: Array<{ key?: string; label?: string }>
  trackedMetrics?: Array<{ key?: string; label?: string; eventName?: string; source?: string }>
  performanceSignals?: Array<{ _id: string; title?: string; provider?: string; status?: string; metrics?: Metric[] }>
}

async function run() {
  const experiments = await client.fetch<Experiment[]>(
    `*[_type == "marketingExperiment" && flagKey == $flagKey]{
      _id, title, status, flagKey,
      variants[]{key, label},
      trackedMetrics[]{key, label, eventName, source},
      "performanceSignals": performanceSignals[]->{_id, title, provider, status, metrics[]{label, value, unit, change, variantKey, eventName}}
    }`,
    { flagKey },
  )

  if (experiments.length === 0) {
    console.log(`No marketingExperiment found with flagKey="${flagKey}".`)
    console.log('The drain endpoint joins events to experiments by flagKey, so this flag must exist on a marketingExperiment.')
    return
  }

  for (const experiment of experiments) {
    const variants = (experiment.variants || []).map((v) => v.key).filter(Boolean) as string[]
    const trackedEvents = (experiment.trackedMetrics || []).map((m) => m.eventName).filter(Boolean) as string[]
    console.log(`\n=== ${experiment.title || experiment._id} (${experiment._id}) ===`)
    console.log(`status: ${experiment.status}  flagKey: ${experiment.flagKey}`)
    console.log(`variants: ${variants.join(', ') || '(none)'}`)
    console.log(`tracked event names: ${trackedEvents.join(', ') || '(none)'}`)

    const allMetrics = (experiment.performanceSignals || []).flatMap((s) => s.metrics || [])
    console.log(`linked signals: ${(experiment.performanceSignals || []).length}, total metric rows: ${allMetrics.length}`)
    for (const signal of experiment.performanceSignals || []) {
      console.log(`  - signal "${signal.title}" [${signal.provider}/${signal.status}] metrics: ${(signal.metrics || []).length}`)
      for (const metric of signal.metrics || []) {
        console.log(`      • ${metric.eventName || '(no event)'} | variant=${metric.variantKey || '(none)'} | value=${metric.value ?? '—'}${metric.change ? ` | ${metric.change}` : ''}`)
      }
    }

    // Mirror the suite's measurement-readiness check.
    const exposureFor = (v: string) => allMetrics.find((m) => m.variantKey === v && m.eventName === 'experiment_exposure')
    const hasVariantExposure = variants.length >= 2 && variants.every((v) => typeof exposureFor(v)?.value === 'number')
    const conversionEvents = trackedEvents.filter((e) => e !== 'experiment_exposure')
    const hasVariantEvents = conversionEvents.length > 0 && conversionEvents.every((event) =>
      variants.every((v) => typeof allMetrics.find((m) => m.variantKey === v && m.eventName === event)?.value === 'number'),
    )
    const measurable = hasVariantExposure && hasVariantEvents

    console.log(`\nper-variant exposure present: ${hasVariantExposure}`)
    console.log(`per-variant event counts present: ${hasVariantEvents}`)
    console.log(`=> measurement state: ${measurable ? 'MEASURABLE (suite shows Running/Reviewing)' : 'BLOCKED (suite shows Measurement blocked)'}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
