/**
 * Patch missing videos into visual-storytelling-with-genai and precision-autism.
 *
 * Usage: node scripts/patch-missing-videos.mjs [--dry-run]
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const CDN = 'https://dd17w042cevyt.cloudfront.net'
const DRY_RUN = process.argv.includes('--dry-run')

function randomKey() {
  return Math.random().toString(36).slice(2, 14)
}

function getBlockText(block) {
  if (block._type !== 'block' || !block.children) return ''
  return block.children.map(c => c.text || '').join('')
}

async function patchVisualStorytelling() {
  console.log('=== visual-storytelling-with-genai ===')
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "visual-storytelling-with-genai"][0]{ _id, content }`
  )
  if (!doc) { console.error('Not found!'); return }

  // Check if video already exists
  if (doc.content.some(b => b._type === 'videoEmbed')) {
    console.log('videoEmbed already exists — skipping.')
    return
  }

  // Find the image with caption starting with "4. Animation"
  // Video goes BEFORE this block
  let insertIdx = -1
  for (let i = 0; i < doc.content.length; i++) {
    if (doc.content[i]._type === 'image' && doc.content[i].caption &&
        doc.content[i].caption.startsWith('4. Animation')) {
      insertIdx = i
      break
    }
  }

  if (insertIdx === -1) {
    // Fallback: find h3 "GenAI motivates creative experimentation" and insert before it
    for (let i = 0; i < doc.content.length; i++) {
      if (doc.content[i]._type === 'block' && getBlockText(doc.content[i]).includes('GenAI motivates')) {
        insertIdx = i
        break
      }
    }
  }

  if (insertIdx === -1) {
    console.error('Could not find insertion point!')
    return
  }

  const videoBlock = {
    _type: 'videoEmbed',
    _key: randomKey(),
    url: `${CDN}/videos/features/visual-storytelling-with-genai/genai-trauma-room-characters-animation.mp4`,
    poster: `${CDN}/images/features/visual-storytelling-with-genai/genai-trauma-room-hero.jpg`,
  }

  console.log(`Inserting videoEmbed at index ${insertIdx}`)
  console.log(`  url: ${videoBlock.url}`)

  if (!DRY_RUN) {
    const newContent = [...doc.content]
    newContent.splice(insertIdx, 0, videoBlock)
    await client.patch(doc._id).set({ content: newContent }).commit()
    console.log('✓ Patched successfully.')
  } else {
    console.log('[DRY RUN]')
  }
}

async function patchPrecisionAutism() {
  console.log('\n=== precision-autism ===')
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "precision-autism"][0]{ _id, content }`
  )
  if (!doc) { console.error('Not found!'); return }

  // Check if video already exists
  if (doc.content.some(b => b._type === 'videoEmbed')) {
    console.log('videoEmbed already exists — skipping.')
    return
  }

  // Video goes after the intro paragraph ("Living with autism...") and before the divider.
  // Find the divider
  let insertIdx = -1
  for (let i = 0; i < doc.content.length; i++) {
    if (doc.content[i]._type === 'divider') {
      insertIdx = i
      break
    }
  }

  if (insertIdx === -1) {
    console.error('Could not find divider insertion point!')
    return
  }

  const videoBlock = {
    _type: 'videoEmbed',
    _key: randomKey(),
    url: `${CDN}/videos/features/precision-autism/autism_atmosphere_10_720.mp4`,
    poster: `${CDN}/images/features/precision-autism/autism_data_display_spacey_v2.jpg`,
  }

  console.log(`Inserting videoEmbed at index ${insertIdx}`)
  console.log(`  url: ${videoBlock.url}`)

  if (!DRY_RUN) {
    const newContent = [...doc.content]
    newContent.splice(insertIdx, 0, videoBlock)
    await client.patch(doc._id).set({ content: newContent }).commit()
    console.log('✓ Patched successfully.')
  } else {
    console.log('[DRY RUN]')
  }
}

async function main() {
  await patchVisualStorytelling()
  await patchPrecisionAutism()
  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
