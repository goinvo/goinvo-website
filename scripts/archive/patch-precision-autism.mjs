/**
 * Patch precision-autism:
 *
 * Add the missing "Special thanks to..." list with 3 names:
 * - Elizabeth Horn
 * - Clare Southern
 * - Michael Snyder
 *
 * The heading already exists in Sanity but the list items are missing.
 *
 * Usage:
 *   node scripts/patch-precision-autism.mjs            # dry run
 *   node scripts/patch-precision-autism.mjs --write     # apply
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')

function makeKey() { return randomUUID().slice(0, 12) }

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'precision-autism'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  const content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // Find the "Special thanks to..." heading
  const thanksIdx = content.findIndex(b =>
    b._type === 'block' &&
    b.children?.[0]?.text?.includes('Special thanks to')
  )

  if (thanksIdx < 0) {
    console.log('  "Special thanks to..." heading not found')
    return
  }

  console.log(`  Found "Special thanks to..." heading at index ${thanksIdx}`)

  // Check if a list already follows the heading
  const nextBlock = content[thanksIdx + 1]
  if (nextBlock && nextBlock._type === 'block' && nextBlock.listItem === 'bullet') {
    console.log('  List already exists after heading — skipping')
    return
  }

  // Create the 3 list items
  const names = ['Elizabeth Horn', 'Clare Southern', 'Michael Snyder']
  const listBlocks = names.map(name => ({
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{
      _type: 'span',
      _key: makeKey(),
      text: name,
      marks: [],
    }],
  }))

  // Insert the list items after the heading
  content.splice(thanksIdx + 1, 0, ...listBlocks)
  console.log(`  ✅ Added ${names.length} list items after "Special thanks to..." heading`)
  changes++

  // ─── Summary & commit ────────────────────────────────────────────────

  console.log(`\n  ${changes} change(s) to apply`)

  if (WRITE && changes > 0) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('  ✅ Written to Sanity')
  } else if (!WRITE && changes > 0) {
    console.log('  Run with --write to save')
  }
}

main().catch(console.error)
