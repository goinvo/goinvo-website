/**
 * Patch ipsos-facto case study content:
 * 1. Fix "poor UX choice" -> "poor UX." in block q8kr25b208
 *    (Gatsby MDX has "poor UX." with period, Sanity has "poor UX choice" without period)
 * 2. Fix em dashes: restore 3 instances where Gatsby uses em dash (—) but Sanity
 *    uses semicolon or comma:
 *    - Block frt8fqp24x: "finished; it's" -> "finished — it's"
 *    - Block zjasy9s2p59: "tipping point, where" -> "tipping point — where"
 *    - Block nyr7ng7pmhk: "ambitions, so" -> "ambitions — so"
 *
 * Usage:
 *   node scripts/patch-ipsos-facto-content.mjs          # dry run
 *   node scripts/patch-ipsos-facto-content.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
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

/**
 * Each fix targets a specific block by _key and replaces text in the first span child.
 */
const FIXES = [
  {
    label: 'Fix "poor UX choice" -> "poor UX."',
    blockKey: 'q8kr25b208',
    find: 'poor UX choice',
    replace: 'poor UX.',
  },
  {
    label: 'Fix semicolon -> em dash in "finished; it\'s"',
    blockKey: 'frt8fqp24x',
    find: "finished; it's",
    replace: "finished \u2014 it's",
  },
  {
    label: 'Fix comma -> em dash in "tipping point, where"',
    blockKey: 'zjasy9s2p59',
    find: 'tipping point, where',
    replace: 'tipping point \u2014 where',
  },
  {
    label: 'Fix comma -> em dash in "ambitions, so"',
    blockKey: 'nyr7ng7pmhk',
    find: 'ambitions, so',
    replace: 'ambitions \u2014 so',
  },
]

async function main() {
  console.log(`${WRITE ? 'WRITE MODE' : 'DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "ipsos-facto"][0]{ _id, content }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}\n`)

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  for (const fix of FIXES) {
    const blockIdx = content.findIndex(b => b._key === fix.blockKey)
    if (blockIdx === -1) {
      console.log(`[SKIP] ${fix.label}: block ${fix.blockKey} not found`)
      continue
    }

    const block = content[blockIdx]
    let applied = false

    for (const child of block.children || []) {
      if (child.text && child.text.includes(fix.find)) {
        const before = child.text
        child.text = child.text.replace(fix.find, fix.replace)
        console.log(`[FIX] ${fix.label}`)
        console.log(`  Block ${blockIdx} (key: ${fix.blockKey})`)
        console.log(`  Before: "...${before.substring(Math.max(0, before.indexOf(fix.find) - 20), before.indexOf(fix.find) + fix.find.length + 20)}..."`)
        console.log(`  After:  "...${child.text.substring(Math.max(0, child.text.indexOf(fix.replace) - 20), child.text.indexOf(fix.replace) + fix.replace.length + 20)}..."`)
        applied = true
        changes++
        break
      }
    }

    if (!applied) {
      console.log(`[SKIP] ${fix.label}: text "${fix.find}" not found in block (may be already patched)`)
    }
  }

  // --- Summary ---
  console.log(`\nTotal changes: ${changes}`)

  if (changes === 0) {
    console.log('No changes to apply.')
    return
  }

  if (!WRITE) {
    console.log('Run with --write to apply.')
    return
  }

  await client.patch(doc._id).set({ content }).commit()
  console.log('Patched successfully.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
