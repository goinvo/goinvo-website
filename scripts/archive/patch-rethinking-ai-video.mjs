/**
 * One-time Sanity patch: "Rethinking AI Beyond Chat" feature
 *
 * 1. Removes the duplicate h2 title block (page template already renders title in hero)
 * 2. Inserts a videoEmbed block after the first paragraph, before the first divider
 *
 * Usage: node scripts/patch-rethinking-ai-video.mjs [--dry-run]
 */

import { createClient } from '@sanity/client'

const PROJECT_ID = 'a1wsimxr'
const DATASET = 'production'
const TOKEN = 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu'
const CDN_BASE = 'https://dd17w042cevyt.cloudfront.net'

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

function randomKey() {
  return Math.random().toString(36).slice(2, 14)
}

function getBlockText(block) {
  if (block._type !== 'block' || !block.children) return ''
  return block.children.map(c => c.text || '').join('')
}

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('Fetching rethinking-ai-beyond-chat feature document...')

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "rethinking-ai-beyond-chat"][0]{ _id, title, content }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Found document: ${doc._id} — "${doc.title}"`)
  console.log(`Content blocks: ${doc.content?.length || 0}`)

  if (!doc.content || doc.content.length === 0) {
    console.error('No content blocks found!')
    process.exit(1)
  }

  // Log first few blocks for inspection
  console.log('\nFirst 5 content blocks:')
  doc.content.slice(0, 5).forEach((block, i) => {
    const text = getBlockText(block)
    console.log(`  [${i}] _type=${block._type}, style=${block.style || 'N/A'}, text="${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`)
  })

  let content = [...doc.content]

  // Step 1: Check for and remove duplicate title h2
  const firstBlock = content[0]
  if (
    firstBlock._type === 'block' &&
    firstBlock.style === 'h2' &&
    getBlockText(firstBlock).trim().toLowerCase() === doc.title.trim().toLowerCase()
  ) {
    console.log('\n✓ Found duplicate title h2 at index 0 — removing it.')
    content = content.slice(1)
  } else {
    console.log('\n✗ No duplicate title h2 found at index 0 — skipping removal.')
  }

  // Step 2: Check if videoEmbed already exists
  const hasVideo = content.some(b => b._type === 'videoEmbed')
  if (hasVideo) {
    console.log('\n✗ videoEmbed already exists — skipping insertion.')
  } else {
    // Find insertion point: after first paragraph, before first divider
    let insertIndex = -1
    for (let i = 0; i < content.length; i++) {
      if (content[i]._type === 'divider') {
        insertIndex = i
        break
      }
    }

    if (insertIndex === -1) {
      // Fallback: insert after first paragraph
      for (let i = 0; i < content.length; i++) {
        if (content[i]._type === 'block' && content[i].style === 'normal') {
          insertIndex = i + 1
          break
        }
      }
    }

    if (insertIndex === -1) {
      console.error('Could not find insertion point for video!')
      process.exit(1)
    }

    const videoBlock = {
      _type: 'videoEmbed',
      _key: randomKey(),
      url: `${CDN_BASE}/videos/features/rethinking-ai-beyond-chat/design-experiments-01-final2.mp4`,
      poster: `${CDN_BASE}/videos/features/rethinking-ai-beyond-chat/design-experiments-01-final.jpg`,
    }

    console.log(`\n✓ Inserting videoEmbed at index ${insertIndex}`)
    console.log(`  url: ${videoBlock.url}`)
    console.log(`  poster: ${videoBlock.poster}`)

    content.splice(insertIndex, 0, videoBlock)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would patch document with updated content array.')
    console.log(`  Total blocks: ${content.length} (was ${doc.content.length})`)
    return
  }

  // Patch the document
  console.log('\nPatching document...')
  await client.patch(doc._id).set({ content }).commit()
  console.log('✓ Done! Document patched successfully.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
