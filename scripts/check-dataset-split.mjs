#!/usr/bin/env node
/**
 * Is the marketing dataset split doing what it claims?
 *
 * Wraps /api/marketing/health/dataset and prints it as a table. Every failure
 * mode in this migration is silent — a missed query returns [] rather than an
 * error — so this is the check to run before and after every step.
 *
 *   node scripts/check-dataset-split.mjs                 # against localhost
 *   node scripts/check-dataset-split.mjs --base https://www.goinvo.com
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const valueFor = (name) => {
  const inline = args.find((a) => a.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const base = valueFor('base') || 'http://localhost:3000'
const key = process.env.MARKETING_API_KEY
if (!key) throw new Error('MARKETING_API_KEY is required to read the health route.')

const response = await fetch(`${base}/api/marketing/health/dataset`, {
  headers: { Authorization: `Bearer ${key}` },
})
if (!response.ok) {
  throw new Error(`Health route returned ${response.status}: ${(await response.text()).slice(0, 200)}`)
}
const health = await response.json()

const pad = (value, width) => String(value).padEnd(width)
const num = (value, width) => String(value).padStart(width)

console.log(
  `public=${health.publicDataset}  internal=${health.internalDataset}  ` +
    `internalTypes=${health.internalTypeCount}  ok=${health.ok}`,
)
console.log('')
console.log(pad('TYPE', 30), pad('CONFIGURED', 12), num('IN-DS', 6), num('OTHER', 6), num('ANON', 6))
let anonTotal = 0
for (const row of health.rows) {
  anonTotal += row.anonymouslyReadable
  const empty =
    row.countInConfiguredDataset === 0 && row.countInOtherDataset === 0 && row.anonymouslyReadable === 0
  if (empty) continue
  const flags = [row.missing ? 'MISSING' : '', row.leaking ? 'LEAKING' : ''].filter(Boolean).join(' ')
  console.log(
    pad(row.type, 30),
    pad(row.configuredDataset, 12),
    num(row.countInConfiguredDataset, 6),
    num(row.countInOtherDataset, 6),
    num(row.anonymouslyReadable, 6),
    flags,
  )
}
console.log('')
console.log(`anonymously readable across all listed types: ${anonTotal}`)
if (health.missing.length) console.log(`MISSING (moved but empty): ${health.missing.join(', ')}`)
if (health.leaking.length) console.log(`LEAKING (private but public-readable): ${health.leaking.join(', ')}`)
process.exitCode = health.ok ? 0 : 1
