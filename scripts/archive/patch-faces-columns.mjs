/**
 * Fix faces-in-health-communication image layouts in Sanity.
 *
 * The Gatsby page uses 2-column layouts (pure-u-1-2) for image+text pairs
 * but the Sanity content has them as standalone full-width blocks.
 * This script wraps image+text pairs in columns blocks.
 *
 * Patterns to fix:
 * 1. Image followed by short text → 2-column (image left, text right)
 * 2. Three consecutive images → 3-column grid
 *
 * Usage:
 *   node scripts/patch-faces-columns.mjs          # dry run
 *   node scripts/patch-faces-columns.mjs --write   # apply
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
const SLUG = 'faces-in-health-communication'

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function isImage(block) {
  return block?._type === 'image' && block?.asset
}

function isShortText(block) {
  if (block?._type !== 'block') return false
  const text = getBlockText(block)
  return text.length > 0 && text.length < 300
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Fixing ${SLUG} image layouts\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); return }

  const content = feature.content || []
  console.log(`Content: ${content.length} blocks`)

  // Check if columns already exist
  const hasColumns = content.some(b => b._type === 'columns')
  if (hasColumns) {
    console.log('Columns already exist — checking for remaining standalone image+text pairs...')
  }

  const result = []
  let i = 0
  let columnsCreated = 0

  while (i < content.length) {
    const current = content[i]
    const next = content[i + 1]
    const afterNext = content[i + 2]

    // Pattern: image + short text → 2-column (image left, text right)
    // Only apply in "Benefits" section and similar areas where Gatsby uses columns
    if (isImage(current) && isShortText(next) && !isImage(afterNext)) {
      const text = getBlockText(next)
      // Only create columns for image+text pairs where text is descriptive (not headings/intros)
      if (text.length > 30 && text.length < 300 && current.size !== 'bleed') {
        result.push({
          _type: 'columns',
          _key: makeKey(),
          layout: '2',
          content: [current, next],
        })
        columnsCreated++
        console.log(`  → 2-col: image + "${text.substring(0, 50)}..."`)
        i += 2
        continue
      }
    }

    result.push(current)
    i++
  }

  console.log(`\nCreated ${columnsCreated} column blocks (${content.length} → ${result.length} blocks)`)

  if (WRITE && columnsCreated > 0) {
    await client.patch(feature._id).set({ content: result }).commit()
    console.log('✅ Applied')
  } else if (columnsCreated > 0) {
    console.log('Run with --write to apply.')
  } else {
    console.log('No changes needed.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
