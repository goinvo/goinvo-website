#!/usr/bin/env tsx
/**
 * Simulates a Vercel Web Analytics drain delivery against the local endpoint so
 * the marketing suite can be exercised end to end without waiting for real
 * traffic. It posts experiment_exposure plus the homepage test's tracked
 * conversion events for both the control and concept variants.
 *
 * Usage:
 *   npx tsx scripts/seed-ab-drain.ts
 *   npx tsx scripts/seed-ab-drain.ts --base http://localhost:3000 --concept-edge
 *
 * Requires MARKETING_VERCEL_DRAIN_SECRET in .env.local (or the environment) and
 * the dev/prod server running so the route can upsert the Sanity signal.
 */
import path from 'path'
import { config as loadEnv } from 'dotenv'

const cwd = process.cwd()
loadEnv({ path: path.resolve(cwd, '.env.local'), quiet: true })
loadEnv({ quiet: true })

type DrainRow = {
  type?: string
  eventName?: string
  eventData: string
  count: number
}

function parseArgs(argv: string[]) {
  const valueFor = (name: string) => {
    const inline = argv.find((arg) => arg.startsWith(`--${name}=`))
    if (inline) return inline.slice(`--${name}=`.length)
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : argv[index + 1]
  }
  return {
    base: valueFor('base') || process.env.MARKETING_DRAIN_BASE_URL || 'http://localhost:3000',
    flagKey: valueFor('flag') || 'home-2026-variant',
    experimentId: valueFor('experiment') || 'home-2026',
    pagePath: valueFor('path') || '/',
    // When set, concept beats control on every metric (a clear winner readout).
    conceptEdge: argv.includes('--concept-edge'),
  }
}

function buildRows(args: ReturnType<typeof parseArgs>): DrainRow[] {
  const dims = (variant: string) => ({
    experiment_id: args.experimentId,
    flag_key: args.flagKey,
    variant,
    page_path: args.pagePath,
  })

  const counts = args.conceptEdge
    ? {
        control: { exposure: 420, qualified_discovery_call_click: 21, view_work_click: 130, discovery_form_start: 12 },
        concept: { exposure: 415, qualified_discovery_call_click: 34, view_work_click: 134, discovery_form_start: 19 },
      }
    : {
        control: { exposure: 380, qualified_discovery_call_click: 18, view_work_click: 118, discovery_form_start: 9 },
        concept: { exposure: 372, qualified_discovery_call_click: 24, view_work_click: 121, discovery_form_start: 13 },
      }

  const rows: DrainRow[] = []
  for (const variant of ['control', 'concept'] as const) {
    rows.push({ type: 'event', eventName: 'experiment_exposure', eventData: JSON.stringify(dims(variant)), count: counts[variant].exposure })
    for (const eventName of ['qualified_discovery_call_click', 'view_work_click', 'discovery_form_start'] as const) {
      rows.push({ type: 'event', eventName, eventData: JSON.stringify(dims(variant)), count: counts[variant][eventName] })
    }
  }
  return rows
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  // Guard: this fabricates synthetic per-variant counts. Refuse to write them to
  // any non-local target (which would pollute the real production readout)
  // unless an explicit --force-prod opt-in is passed.
  const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(args.base)
  if (!isLocalTarget && !process.argv.includes('--force-prod')) {
    throw new Error(`Refusing to seed SYNTHETIC drain data to non-local target "${args.base}". Pass --force-prod only if you truly intend to.`)
  }
  const secret = process.env.MARKETING_VERCEL_DRAIN_SECRET
  if (!secret) {
    throw new Error('Set MARKETING_VERCEL_DRAIN_SECRET in .env.local before seeding drain events.')
  }

  const url = `${args.base.replace(/\/+$/, '')}/api/marketing/analytics/vercel-drain`
  const body = JSON.stringify({ events: buildRows(args) })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body,
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Drain endpoint returned ${response.status}: ${text}`)
  }

  console.log(`Posted simulated drain events to ${url}`)
  console.log(text)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
