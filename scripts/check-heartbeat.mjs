#!/usr/bin/env node
/**
 * Did the weekly marketing tick actually run?
 *
 * The tick plans the week and posts the digest, and it reports its own death by
 * producing silence — which is exactly the failure nobody notices. So something
 * OUTSIDE the thing being watched has to ask.
 *
 * That independence is the whole point: a watchdog sharing a failure domain
 * with its subject is decoration. This runs in GitHub Actions, so a broken
 * Vercel deploy, an expired token, a deleted cron or a Sanity outage all
 * surface here. It exits non-zero when the schedule is unhealthy, which is what
 * makes GitHub email somebody — the check already existed and could be asked in
 * Slack, but nothing ever pushed.
 *
 *   node scripts/check-heartbeat.mjs
 *
 * Needs SANITY_API_READ_TOKEN (or a write token) and the project id. Read-only:
 * it never writes, so it cannot itself break the thing it is watching.
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const token =
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN
const dataset =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach'

if (!projectId || !token) {
  // A watchdog that cannot see is worse than none, because its silence reads as
  // "everything is fine". Fail loudly.
  console.error('check-heartbeat: NEXT_PUBLIC_SANITY_PROJECT_ID and a Sanity token are required.')
  process.exit(2)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})

/** Kept in step with HEARTBEAT_STALE_DAYS in src/lib/marketing/heartbeat.ts. */
const STALE_DAYS = 10
const MS_PER_DAY = 86_400_000

const record = await client.fetch(
  `*[_id == "marketingHeartbeat"][0]{ week, ranAt, lastHealthyAt, error, steps }`,
)

if (!record || !record.ranAt) {
  console.error('UNHEALTHY: the weekly marketing tick has never run.')
  console.error('  Nothing is scheduled, so the plan, the digest and the runway check-in are inert.')
  console.error('  Deploy the vercel.json cron and set CRON_SECRET + MARKETING_API_KEY.')
  process.exit(1)
}

const ranAt = Date.parse(record.ranAt)
const days = Math.floor((Date.now() - ranAt) / MS_PER_DAY)
const failedStep = (record.steps || []).find((step) => !step.ok)
const problem = record.error || (failedStep ? `${failedStep.name} — ${failedStep.detail}` : null)

if (problem) {
  console.error(`UNHEALTHY: the tick last ran ${days} day(s) ago for ${record.week} and failed.`)
  console.error(`  ${problem}`)
  process.exit(1)
}

if (days >= STALE_DAYS) {
  console.error(`UNHEALTHY: the tick has not run for ${days} days (it is weekly).`)
  console.error(`  Last successful run: ${record.lastHealthyAt || 'unknown'} for ${record.week}.`)
  process.exit(1)
}

// A run that succeeded while doing nothing is the shape of an inert mechanism,
// so say what it moved rather than only that it passed.
const did = (record.steps || []).map((step) => `${step.name}=${step.count ?? '?'}`).join(' ')
console.log(`OK: tick ran ${days} day(s) ago for ${record.week}. ${did}`)
if ((record.steps || []).every((step) => !step.count)) {
  console.error('WARNING: the tick succeeded but moved nothing. Check that it is really planning work.')
  process.exit(1)
}
