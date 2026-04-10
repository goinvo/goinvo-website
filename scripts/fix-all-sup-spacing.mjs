/**
 * Strip trailing spaces from spans immediately preceding sup-marked
 * children across ALL features. Reports per-page count.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-all-sup-spacing.mjs           # dry run
 *   node --env-file=.env.local scripts/fix-all-sup-spacing.mjs --write   # apply
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'

const WRITE = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

const features = await client.fetch(`*[_type == 'feature'] { _id, slug, content }`)
console.log(`Scanning ${features.length} features...\n`)

let totalFixed = 0
let pagesFixed = 0

for (const doc of features) {
  if (!doc.content) continue
  const newContent = JSON.parse(JSON.stringify(doc.content))

  let fixed = 0
  const processBlock = (block) => {
    if (block._type !== 'block' || !block.children) return
    for (let i = 0; i < block.children.length - 1; i++) {
      const cur = block.children[i]
      const next = block.children[i + 1]
      if (!cur.text || !next.marks) continue
      if (next.marks.includes('sup') && cur.text.endsWith(' ') && !cur.marks?.includes('sup')) {
        cur.text = cur.text.replace(/ +$/, '')
        fixed++
      }
    }
  }

  const walk = (items) => {
    for (const item of items) {
      if (item._type === 'block') processBlock(item)
      if (item._type === 'columns' && item.content) walk(item.content)
    }
  }
  walk(newContent)

  if (fixed > 0) {
    console.log(`  ${doc.slug?.current || doc._id}: ${fixed} fixes`)
    totalFixed += fixed
    pagesFixed++
    if (WRITE) {
      await client.patch(doc._id).set({ content: newContent }).commit()
    }
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`Total: ${totalFixed} fixes across ${pagesFixed} pages`)
if (!WRITE) console.log('(Dry run — pass --write to apply)')
