#!/usr/bin/env tsx
/**
 * Reconciles the homepage A/B test's tracked metrics so the analytics drain can
 * match them per variant and the suite classifies them correctly:
 *
 *   - Event names: experiment_conversion -> qualified_discovery_call_click,
 *                  form_start -> discovery_form_start (idempotent).
 *   - comparison kind: discovery_form_start -> conceptual (concept-only capture),
 *                      everything else -> comparative (sets only when unset).
 *   - Adds a "Top navbar clicks" (nav_click, comparative) metric if absent.
 *
 * Scoped to experiments with flagKey "home-2026-variant" (override with --flag).
 * Read-only by default; pass --write to apply. Patches drafts too if present.
 *
 *   npx tsx scripts/migrate-ab-events.ts            # dry run
 *   npx tsx scripts/migrate-ab-events.ts --write    # apply
 */
import path from 'path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const argv = process.argv.slice(2)
const write = argv.includes('--write')
const flagKey = (() => {
  const inline = argv.find((arg) => arg.startsWith('--flag='))
  if (inline) return inline.slice('--flag='.length)
  const index = argv.indexOf('--flag')
  return index === -1 ? 'home-2026-variant' : argv[index + 1]
})()

const EVENT_MIGRATION: Record<string, string> = {
  experiment_conversion: 'qualified_discovery_call_click',
  form_start: 'discovery_form_start',
}

const CONCEPTUAL_EVENTS = new Set(['discovery_form_start'])

const NAV_METRIC = {
  _type: 'experimentMetric',
  key: 'top-navbar-clicks',
  label: 'Top navbar clicks',
  role: 'diagnostic',
  comparison: 'comparative',
  source: 'vercelEvent',
  eventName: 'nav_click',
  unit: 'events',
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Set NEXT_PUBLIC_SANITY_PROJECT_ID and a write token before migrating.')

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

type Metric = { _key?: string; key?: string; label?: string; eventName?: string; comparison?: string; role?: string; source?: string; unit?: string }
type Experiment = { _id: string; title?: string; trackedMetrics?: Metric[] }

function randomKey() {
  return `nav-${randomUUID().slice(0, 8)}`
}

async function run() {
  const experiments = await client.fetch<Experiment[]>(
    `*[_type == "marketingExperiment" && flagKey == $flagKey]{_id, title, trackedMetrics[]{_key, key, label, eventName, comparison, role, source, unit}}`,
    { flagKey },
  )

  if (experiments.length === 0) {
    console.log(`No experiments found with flagKey "${flagKey}".`)
    return
  }

  let patched = 0
  for (const experiment of experiments) {
    const metrics = experiment.trackedMetrics || []
    const eventChanges: Array<{ _key: string; field: string; from: string; to: string }> = []

    for (const metric of metrics) {
      if (!metric._key) continue
      const migratedEvent = metric.eventName && EVENT_MIGRATION[metric.eventName] ? EVENT_MIGRATION[metric.eventName] : metric.eventName
      if (migratedEvent && migratedEvent !== metric.eventName) {
        eventChanges.push({ _key: metric._key, field: 'eventName', from: metric.eventName || '', to: migratedEvent })
      }
      const targetComparison = migratedEvent && CONCEPTUAL_EVENTS.has(migratedEvent) ? 'conceptual' : 'comparative'
      if (!metric.comparison) {
        eventChanges.push({ _key: metric._key, field: 'comparison', from: '(unset)', to: targetComparison })
      } else if (migratedEvent && CONCEPTUAL_EVENTS.has(migratedEvent) && metric.comparison !== 'conceptual') {
        // A concept-only metric should not stay comparative.
        eventChanges.push({ _key: metric._key, field: 'comparison', from: metric.comparison, to: 'conceptual' })
      }
    }

    const hasNav = metrics.some((metric) => metric.eventName === 'nav_click' || metric.key === 'top-navbar-clicks')

    console.log(`\n${experiment.title || experiment._id} (${experiment._id})`)
    if (eventChanges.length === 0 && hasNav) {
      console.log('  already reconciled.')
      continue
    }
    for (const change of eventChanges) {
      console.log(`  [${change._key}] ${change.field}: ${change.from} -> ${change.to}`)
    }
    if (!hasNav) console.log(`  + add metric: Top navbar clicks (nav_click, comparative)`)

    if (write) {
      let tx = client.patch(experiment._id)
      for (const change of eventChanges) {
        tx = tx.set({ [`trackedMetrics[_key=="${change._key}"].${change.field}`]: change.to })
      }
      if (!hasNav) {
        tx = tx.setIfMissing({ trackedMetrics: [] }).append('trackedMetrics', [{ _key: randomKey(), ...NAV_METRIC }])
      }
      await tx.commit()
      patched += 1
      console.log('  ✓ applied')
    }
  }

  console.log(write ? `\nApplied to ${patched} experiment(s).` : '\nDry run — re-run with --write to apply.')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
