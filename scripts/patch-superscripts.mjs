/**
 * Batch add 'sup' marks to reference citation spans across all vision pages.
 *
 * Finds spans that have a link to #references or #methodology and short
 * reference-like text (e.g. "1", "A2", "5,6") but are missing the 'sup' mark.
 *
 * Usage:
 *   node scripts/patch-superscripts.mjs          # dry run
 *   node scripts/patch-superscripts.mjs --write   # apply
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

  const docs = await client.fetch(
    `*[_type == 'feature']{ _id, slug, title, content }`
  )
  console.log(`Found ${docs.length} feature documents\n`)

  let totalChanges = 0
  let totalPages = 0

  for (const doc of docs) {
    const slug = doc.slug?.current
    if (!slug) continue

    let content = JSON.parse(JSON.stringify(doc.content || []))
    let changes = 0

    function fixBlocks(blocks) {
      for (const block of blocks) {
        // Recurse into backgroundSection and columns content
        if (block._type === 'backgroundSection' && block.content) {
          fixBlocks(block.content)
        }
        if (block._type === 'columns' && block.content) {
          fixBlocks(block.content)
        }

        if (block._type !== 'block' || !block.children) continue

        const markDefs = block.markDefs || []
        // Find link marks that point to #references or #methodology
        const refLinkKeys = new Set(
          markDefs
            .filter(md => md._type === 'link' && (
              md.href === '#references' ||
              md.href === '#methodology' ||
              md.href?.startsWith('#ref') ||
              md.href?.startsWith('#fn')
            ))
            .map(md => md._key)
        )

        if (refLinkKeys.size === 0) continue

        for (const span of block.children) {
          if (span._type !== 'span') continue
          const marks = span.marks || []

          // Check if this span has a reference link mark
          const hasRefLink = marks.some(m => refLinkKeys.has(m))
          if (!hasRefLink) continue

          // Check if the text looks like a reference number/label
          const text = (span.text || '').trim()
          // Match: numbers (1, 12), letter+numbers (A1, A2), comma lists (1,2,3),
          // or short ref labels
          if (!text.match(/^[A-Z]?\d[\d,\s]*$/i) && text.length > 10) continue

          // Add 'sup' mark if not already present
          if (!marks.includes('sup')) {
            span.marks = [...marks, 'sup']
            changes++
          }
        }
      }
    }

    fixBlocks(content)

    if (changes > 0) {
      totalChanges += changes
      totalPages++
      console.log(`  ${slug}: ${changes} sup mark(s) added`)

      if (WRITE) {
        await client.patch(doc._id).set({ content }).commit()
      }
    }
  }

  console.log(`\n${totalChanges} sup mark(s) added across ${totalPages} page(s).`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
