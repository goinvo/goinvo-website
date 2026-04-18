/**
 * Normalize textColor markDefs so they use the schema-current `color`
 * field instead of the legacy `value` field.
 *
 *   node --env-file=.env.local scripts/normalize-text-color-marks.mjs           # dry
 *   node --env-file=.env.local scripts/normalize-text-color-marks.mjs --write   # apply
 *
 * Previously the schema wrote the selected color to markDef.value. The
 * schema now uses markDef.color (and PortableTextRenderer still falls
 * back to .value for safety) — this script backfills any old docs so
 * everything is consistent in Sanity.
 */
import { createClient } from 'next-sanity'

const WRITE = process.argv.includes('--write')
const TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: TOKEN,
})

const docs = await client.fetch(
  `*[_type in ["caseStudy","feature"] && count(content[defined(markDefs) && count(markDefs[_type == "textColor" && !defined(color) && defined(value)]) > 0]) > 0]{
     _id, _rev, title, content
   }`,
)

console.log(`Found ${docs.length} doc(s) with legacy value-shaped textColor marks`)
if (docs.length === 0) process.exit(0)

let totalMarks = 0
const patches = []
for (const doc of docs) {
  const newContent = doc.content.map((block) => {
    if (!block.markDefs || !Array.isArray(block.markDefs)) return block
    let changed = false
    const markDefs = block.markDefs.map((md) => {
      if (md._type !== 'textColor') return md
      if (md.color != null) return md
      if (typeof md.value === 'string' && md.value.length > 0) {
        changed = true
        totalMarks++
        // Preserve everything else, promote value -> color, drop value.
        const { value, ...rest } = md
        return { ...rest, color: value }
      }
      return md
    })
    return changed ? { ...block, markDefs } : block
  })
  patches.push({ _id: doc._id, _rev: doc._rev, content: newContent, title: doc.title })
}

console.log(`Will patch ${patches.length} doc(s), promoting ${totalMarks} markDef(s).`)
for (const p of patches) console.log(`  ${p._id}\t${p.title}`)

if (!WRITE) {
  console.log('\nDry run — pass --write to apply.')
  process.exit(0)
}
if (!TOKEN) { console.error('SANITY_WRITE_TOKEN is required to --write'); process.exit(1) }

let tx = client.transaction()
for (const p of patches) tx = tx.patch(p._id, (patch) => patch.ifRevisionId(p._rev).set({ content: p.content }))
await tx.commit()

console.log(`Applied. Migrated ${totalMarks} markDef(s) across ${patches.length} doc(s).`)
