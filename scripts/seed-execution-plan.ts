#!/usr/bin/env tsx
/**
 * Seeds the Sep–Nov 2026 execution plan into the CMS as real documents:
 * 16 marketingOperation docs (PRIVATE outreach dataset) and 13 neutral
 * marketingCalendarItem docs (production dataset). The gated /action-plan page
 * renders these live.
 *
 * Dry-run by default:
 *   npx tsx scripts/seed-execution-plan.ts
 *
 * Apply:
 *   npx tsx scripts/seed-execution-plan.ts --write --confirm seed:exec-plan-2026q4
 *
 * Idempotent by construction: every document has a deterministic _id and the
 * write path is createIfNotExists only — the script NEVER patches. Re-runs are
 * no-ops and edits made in the Studio after seeding always survive. The
 * catalog (src/lib/marketing/executionPlanSeed.ts) is a birth certificate, not
 * a sync source: editing it later does not propagate to already-created docs.
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { MARKETING_OPERATION_TYPE } from '@/lib/marketing/operations'
import {
  buildSeedCalendarDocs,
  buildSeedOperationDocs,
} from '@/lib/marketing/executionPlanSeed'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const valueFor = (name: string) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const write = args.includes('--write')
const confirmation = valueFor('confirm')
const CONFIRM_TOKEN = 'seed:exec-plan-2026q4'
if (write && confirmation !== CONFIRM_TOKEN) {
  throw new Error(`To apply, pass --confirm ${CONFIRM_TOKEN}.`)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const productionDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Sanity project ID and write token are required.')

const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const outreachClient = createClient({ projectId, dataset: OUTREACH_DATASET, apiVersion, token, useCdn: false })
const productionClient = createClient({ projectId, dataset: productionDataset, apiVersion, token, useCdn: false })

type Row = {
  dataset: string
  action: 'create' | 'skip'
  _id: string
  date: string
  title: string
}

async function main() {
  const operationDocs = buildSeedOperationDocs().map((doc) => ({
    _type: MARKETING_OPERATION_TYPE,
    ...doc,
  })) as Array<{ _id: string; _type: string; title: string; dueAt?: string }>
  const calendarDocs = buildSeedCalendarDocs() as Array<{
    _id: string
    _type: string
    title?: string
    publishAt?: string
  }>

  const [existingOps, existingItems] = await Promise.all([
    outreachClient.fetch<string[]>('*[_id in $ids]._id', { ids: operationDocs.map((doc) => doc._id) }),
    productionClient.fetch<string[]>('*[_id in $ids]._id', { ids: calendarDocs.map((doc) => doc._id) }),
  ])
  const existingOpIds = new Set(existingOps)
  const existingItemIds = new Set(existingItems)

  const rows: Row[] = [
    ...operationDocs.map((doc): Row => ({
      dataset: OUTREACH_DATASET,
      action: existingOpIds.has(doc._id) ? 'skip' : 'create',
      _id: doc._id,
      date: (doc.dueAt || '').slice(0, 10),
      title: doc.title,
    })),
    ...calendarDocs.map((doc): Row => ({
      dataset: productionDataset,
      action: existingItemIds.has(doc._id) ? 'skip' : 'create',
      _id: doc._id,
      date: String(doc.publishAt || '').slice(0, 10),
      title: String(doc.title || ''),
    })),
  ]

  const widths = {
    dataset: Math.max(...rows.map((row) => row.dataset.length), 7),
    action: 6,
    id: Math.max(...rows.map((row) => row._id.length), 3),
    date: 10,
  }
  console.log(
    `${'dataset'.padEnd(widths.dataset)}  ${'action'.padEnd(widths.action)}  ${'_id'.padEnd(widths.id)}  ${'date'.padEnd(widths.date)}  title`,
  )
  for (const row of rows) {
    console.log(
      `${row.dataset.padEnd(widths.dataset)}  ${row.action.padEnd(widths.action)}  ${row._id.padEnd(widths.id)}  ${row.date.padEnd(widths.date)}  ${row.title}`,
    )
  }

  const creates = rows.filter((row) => row.action === 'create')
  const skips = rows.filter((row) => row.action === 'skip')
  console.log(
    `\n${rows.length} documents (${operationDocs.length} operations → ${OUTREACH_DATASET}, ` +
      `${calendarDocs.length} calendar items → ${productionDataset}): ` +
      `${creates.length} to create, ${skips.length} already exist.`,
  )

  if (!write) {
    console.log(`\nDry run — nothing written. Apply with:\n  npx tsx scripts/seed-execution-plan.ts --write --confirm ${CONFIRM_TOKEN}`)
    return
  }

  const opCreates = operationDocs.filter((doc) => !existingOpIds.has(doc._id))
  if (opCreates.length > 0) {
    let tx = outreachClient.transaction()
    for (const doc of opCreates) tx = tx.createIfNotExists(doc)
    await tx.commit()
  }
  const itemCreates = calendarDocs.filter((doc) => !existingItemIds.has(doc._id))
  if (itemCreates.length > 0) {
    let tx = productionClient.transaction()
    for (const doc of itemCreates) tx = tx.createIfNotExists(doc)
    await tx.commit()
  }
  console.log(`\nWrote ${opCreates.length} operations and ${itemCreates.length} calendar items.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
