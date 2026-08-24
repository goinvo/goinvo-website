#!/usr/bin/env node
/**
 * Move internal marketing documents out of the world-readable production
 * dataset and into the private one.
 *
 * Three phases, deliberately separate, because the risky one is last:
 *
 *   --copy    write the documents into the private dataset. Production is
 *             untouched, so nothing can break; both datasets simply hold the
 *             same records until cutover.
 *   --verify  compare the two datasets document by document.
 *   --delete  remove them from production. THIS is what closes the leak, and
 *             it is the only irreversible phase, so it is opt-in and refuses
 *             to run unless the copy verifies first.
 *
 * Dry-run by default. Ids are preserved across datasets, so the copy is
 * idempotent: re-running it overwrites identical documents rather than
 * creating duplicates.
 *
 *   node scripts/split-marketing-dataset.mjs --wave 1 --copy
 *   node scripts/split-marketing-dataset.mjs --wave 1 --copy --apply
 *   node scripts/split-marketing-dataset.mjs --wave 1 --verify
 *   node scripts/split-marketing-dataset.mjs --wave 1 --delete --apply --confirm delete:wave1
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

/**
 * Wave 1: the marketing core. These reference each other densely, so they move
 * as one set — a half-moved graph is a broken graph.
 */
const WAVE_1 = [
  'marketingCalendarItem',
  'marketingCampaign',
  'marketingChannel',
  'marketingFunnel',
  'marketingAnalyticsSource',
  'marketingAudienceProfile',
  'marketingMessagePillar',
  'marketingProofPoint',
  'marketingCta',
  'marketingTrackingRule',
  'marketingQualityGate',
  'marketingExperiment',
  'marketingPerformanceSignal',
  'marketingLinkItem',
  'marketingIdea',
  'marketingTemplate',
  'marketingResearchProject',
  'marketingResearchResult',
  'marketingResearchRun',
  'marketingResearchPlan',
  'marketingSettings',
  'marketingCitationCheck',
  'aiCitationSnapshot',
  'marketingLeadMagnet',
]

/** Wave 2/3: independent of the core, moved separately. */
const WAVE_2 = ['previewShareLink']
const WAVE_3 = ['cmsFeedback']

const WAVES = { 1: WAVE_1, 2: WAVE_2, 3: WAVE_3 }

const args = process.argv.slice(2)
const has = (flag) => args.includes(`--${flag}`)
const valueFor = (name) => {
  const inline = args.find((a) => a.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const wave = String(valueFor('wave') || '1')
const types = WAVES[wave]
if (!types) throw new Error(`Unknown wave "${wave}". Use --wave 1, 2 or 3.`)

const apply = has('apply')
const doCopy = has('copy')
const doVerify = has('verify')
const doDelete = has('delete')
if (!doCopy && !doVerify && !doDelete) {
  throw new Error('Choose a phase: --copy, --verify, or --delete.')
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const publicDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const internalDataset =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Sanity project id and a write token are required.')
if (publicDataset === internalDataset) {
  throw new Error('The public and internal datasets are the same. That is not a split.')
}

const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'
const mk = (dataset) => createClient({ projectId, dataset, apiVersion, token, useCdn: false })
const publicClient = mk(publicDataset)
const internalClient = mk(internalDataset)

const QUERY = `*[_type in $types && !(_id in path("drafts.**"))]`

function stripSystemFields(doc) {
  // _rev and the timestamps belong to the source dataset; carrying them over
  // makes the write fail or lie about when the record was created there.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to drop
  const { _rev, _createdAt, _updatedAt, ...rest } = doc
  return rest
}

/**
 * Weaken every stored reference that points outside the wave.
 *
 * Weakening the schema field only governs NEW writes - documents already in the
 * dataset still carry their original strong references. A strong reference to a
 * document that will not exist in the target dataset fails the whole copy with
 * a mutationError, so the stored value is weakened in transit. The _ref itself
 * is preserved, which is what the client-side joins re-resolve.
 */
function weakenOutsideRefs(value, inWave) {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((entry) => weakenOutsideRefs(entry, inWave))
  const out = {}
  for (const [key, entry] of Object.entries(value)) out[key] = weakenOutsideRefs(entry, inWave)
  if (out._type === 'reference' && typeof out._ref === 'string' && !inWave.has(out._ref)) {
    out._weak = true
  }
  return out
}


async function loadBoth() {
  const [fromPublic, fromInternal] = await Promise.all([
    publicClient.fetch(QUERY, { types }),
    internalClient.fetch(QUERY, { types }),
  ])
  return { fromPublic, fromInternal }
}

function countByType(docs) {
  return docs.reduce((acc, doc) => ((acc[doc._type] = (acc[doc._type] || 0) + 1), acc), {})
}

function report(label, counts) {
  const keys = Object.keys(counts).sort()
  if (keys.length === 0) {
    console.log(`${label}: none`)
    return
  }
  console.log(`${label}:`)
  for (const key of keys) console.log(`  ${key.padEnd(30)} ${String(counts[key]).padStart(5)}`)
}

async function copyPhase() {
  const { fromPublic, fromInternal } = await loadBoth()
  const existing = new Set(fromInternal.map((doc) => doc._id))
  report(`In ${publicDataset}`, countByType(fromPublic))
  console.log('')
  console.log(
    `${fromPublic.length} documents to copy into ${internalDataset}; ` +
      `${fromPublic.filter((doc) => existing.has(doc._id)).length} already there (will be overwritten identically).`,
  )
  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply.')
    return
  }
  // ONE transaction for the whole wave. Sanity validates strong references at
  // the END of a transaction, so batching breaks any reference whose target
  // lands in a later batch - which is exactly how the first attempt failed, on
  // a research result pointing at its own run.
  const inWave = new Set(fromPublic.map((doc) => doc._id))
  let tx = internalClient.transaction()
  for (const doc of fromPublic) {
    tx = tx.createOrReplace(weakenOutsideRefs(stripSystemFields(doc), inWave))
  }
  await tx.commit()
  console.log(`Copied ${fromPublic.length} documents in one transaction. Production is untouched.`)
}

async function verifyPhase() {
  const { fromPublic, fromInternal } = await loadBoth()
  const internalById = new Map(fromInternal.map((doc) => [doc._id, doc]))
  const inWaveIds = new Set(fromPublic.map((doc) => doc._id))
  const missing = []
  const differing = []
  for (const doc of fromPublic) {
    const other = internalById.get(doc._id)
    if (!other) {
      missing.push(doc._id)
      continue
    }
    // Compare against what the copy actually writes: outside-the-wave refs
    // are weakened in transit, so the raw source would never match.
    const a = JSON.stringify(weakenOutsideRefs(stripSystemFields(doc), inWaveIds))
    const b = JSON.stringify(stripSystemFields(other))
    if (a !== b) differing.push(doc._id)
  }
  console.log(`${publicDataset}: ${fromPublic.length} documents`)
  console.log(`${internalDataset}: ${fromInternal.length} documents of these types`)
  console.log(`missing in ${internalDataset}: ${missing.length}`)
  console.log(`present but different: ${differing.length}`)
  for (const id of missing.slice(0, 10)) console.log(`  MISSING  ${id}`)
  for (const id of differing.slice(0, 10)) console.log(`  DIFFERS  ${id}`)
  const ok = missing.length === 0 && differing.length === 0 && fromPublic.length > 0
  console.log(ok ? '\nVerified: every document copied faithfully.' : '\nNOT VERIFIED — do not delete.')
  process.exitCode = ok ? 0 : 1
  return ok
}

async function deletePhase() {
  const confirm = valueFor('confirm')
  if (confirm !== `delete:wave${wave}`) {
    throw new Error(`To delete, pass --confirm delete:wave${wave}.`)
  }
  const ok = await verifyPhase()
  if (!ok) throw new Error('Refusing to delete: the copy does not verify.')
  const { fromPublic } = await loadBoth()
  console.log(`\n${fromPublic.length} documents would be deleted from ${publicDataset}.`)
  if (!apply) {
    console.log('Dry run — nothing deleted. Re-run with --apply.')
    return
  }
  const BATCH = 50
  let removed = 0
  for (let i = 0; i < fromPublic.length; i += BATCH) {
    let tx = publicClient.transaction()
    for (const doc of fromPublic.slice(i, i + BATCH)) tx = tx.delete(doc._id)
    await tx.commit()
    removed += Math.min(BATCH, fromPublic.length - i)
    console.log(`  deleted ${removed}/${fromPublic.length}`)
  }
  console.log(`\nDeleted ${removed} documents from ${publicDataset}. The leak is closed for wave ${wave}.`)
}

console.log(`wave ${wave} · ${types.length} types · ${publicDataset} -> ${internalDataset}\n`)
if (doCopy) await copyPhase()
else if (doVerify) await verifyPhase()
else if (doDelete) await deletePhase()
