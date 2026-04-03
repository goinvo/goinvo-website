/**
 * Fix textColor on Fraud/Waste/Abuse definition terms: teal → charcoal.
 * Gatsby uses text--teal which maps to $color-dark-teal (#24434d),
 * NOT the bright teal (#007385). Our 'charcoal' textColor maps to
 * text-tertiary (#24434d), matching the original.
 *
 * Usage:
 *   node scripts/patch-fwa-textcolor.mjs          # dry run
 *   node scripts/patch-fwa-textcolor.mjs --write   # apply
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

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  for (let i = 0; i < content.length; i++) {
    const block = content[i]

    // Check columns blocks (the definitions are inside a columns block)
    if (block._type === 'columns' && block.content) {
      for (const inner of block.content) {
        if (inner._type === 'block') {
          changes += fixTextColor(inner, i)
        }
      }
    }

    // Also check top-level blocks in case structure changed
    if (block._type === 'block') {
      changes += fixTextColor(block, i)
    }
  }

  // Also fix pie chart image size inside the columns block
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type === 'columns' && block.content) {
      for (const inner of block.content) {
        if (inner._type === 'image' && inner.asset?._ref && inner.size !== 'small') {
          console.log(`  Block ${i}: changing image size ${inner.size || 'unset'} → small (Gatsby uses max-width: 250px)`)
          inner.size = 'small'
          changes++
        }
      }
    }
  }

  if (changes === 0) {
    console.log('No changes needed.')
    return
  }

  console.log(`\n${changes} change(s) to apply.`)

  if (WRITE) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('✅ Patched.')
  } else {
    console.log('Run with --write to apply.')
  }
}

function fixTextColor(block, blockIdx) {
  let count = 0
  const terms = ['Fraud:', 'Waste:', 'Abuse:']

  // Check if any child span contains one of the target terms
  for (const child of (block.children || [])) {
    const text = (child.text || '').trim()
    if (!terms.some(t => text.startsWith(t))) continue

    // Find textColor markDefs referenced by this span that use teal
    for (const md of (block.markDefs || [])) {
      if (md._type === 'textColor' && md.color === 'teal' && child.marks?.includes(md._key)) {
        console.log(`  Block ${blockIdx}: changing textColor teal → charcoal on "${text.slice(0, 20)}..."`)
        md.color = 'charcoal'
        count++
      }
    }
  }
  return count
}

main().catch(console.error)
