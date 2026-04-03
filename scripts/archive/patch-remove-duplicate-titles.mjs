/**
 * Bulk remove duplicate title h2 blocks from features.
 *
 * Many features have their title as the first content block (h2),
 * but the page template already renders the title in the hero section.
 * This removes those duplicate blocks.
 *
 * Usage: node scripts/patch-remove-duplicate-titles.mjs [--dry-run]
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry-run')

function getBlockText(block) {
  if (block._type !== 'block' || !block.children) return ''
  return block.children.map(c => c.text || '').join('')
}

async function main() {
  console.log('Fetching all features with content...\n')

  const features = await client.fetch(
    `*[_type == "feature" && defined(content)]{ _id, title, "slug": slug.current, content }`
  )

  console.log(`Found ${features.length} features with content.\n`)

  let fixed = 0
  let skipped = 0

  for (const doc of features) {
    if (!doc.content || doc.content.length === 0) continue

    const firstBlock = doc.content[0]
    if (firstBlock._type !== 'block') continue
    if (firstBlock.style !== 'h1' && firstBlock.style !== 'h2') continue

    const firstText = getBlockText(firstBlock).trim().toLowerCase()
    const titleText = (doc.title || '').trim().toLowerCase()

    if (firstText !== titleText) continue

    console.log(`✓ ${doc.slug}: removing duplicate ${firstBlock.style} "${getBlockText(firstBlock).slice(0, 60)}"`)

    if (!DRY_RUN) {
      const newContent = doc.content.slice(1)
      await client.patch(doc._id).set({ content: newContent }).commit()
    }

    fixed++
  }

  skipped = features.length - fixed
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. Fixed: ${fixed}, Skipped: ${skipped}`)
}

main().catch(err => { console.error(err); process.exit(1) })
