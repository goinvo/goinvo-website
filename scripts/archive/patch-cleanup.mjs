/**
 * Bulk cleanup script for Sanity content issues:
 * 1. Remove broken image blocks (no asset) from ipsos-facto
 * 2. Remove empty paragraphs from multiple case studies
 * 3. Remove duplicate consecutive blocks from coronavirus
 * 4. Remove duplicate documents (visual-storytelling-with-genai, fraud-waste-abuse)
 *
 * Usage: node scripts/patch-cleanup.mjs [--dry-run]
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

// --- 1. Remove broken images from ipsos-facto ---
async function fixIpsosFact() {
  console.log('\n=== Fix ipsos-facto broken images ===')
  const docs = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "ipsos-facto"]{ _id, content }`
  )

  for (const doc of docs) {
    const brokenIndices = []
    doc.content.forEach((block, i) => {
      if (block._type === 'image' && !block.asset) {
        brokenIndices.push(i)
      }
    })

    if (brokenIndices.length === 0) {
      console.log(`${doc._id}: no broken images found`)
      continue
    }

    console.log(`${doc._id}: removing ${brokenIndices.length} broken images at indices ${brokenIndices.join(', ')}`)

    if (!DRY_RUN) {
      const newContent = doc.content.filter((_, i) => !brokenIndices.includes(i))
      await client.patch(doc._id).set({ content: newContent }).commit()
      console.log('  ✓ Patched')
    }
  }
}

// --- 2. Remove empty paragraphs from case studies ---
async function fixEmptyParagraphs() {
  console.log('\n=== Remove empty paragraphs from case studies ===')
  const docs = await client.fetch(
    `*[_type == "caseStudy" && defined(content)]{ _id, "slug": slug.current, content }`
  )

  for (const doc of docs) {
    const emptyIndices = []
    doc.content.forEach((block, i) => {
      if (block._type === 'block' && block.style === 'normal') {
        const text = getBlockText(block).trim()
        if (text === '') emptyIndices.push(i)
      }
    })

    if (emptyIndices.length === 0) continue

    console.log(`${doc.slug}: removing ${emptyIndices.length} empty paragraphs at indices ${emptyIndices.join(', ')}`)

    if (!DRY_RUN) {
      const newContent = doc.content.filter((_, i) => !emptyIndices.includes(i))
      await client.patch(doc._id).set({ content: newContent }).commit()
      console.log('  ✓ Patched')
    }
  }
}

// --- 3. Remove duplicate consecutive blocks from coronavirus ---
async function fixCoronavirusDuplicates() {
  console.log('\n=== Fix coronavirus duplicate blocks ===')
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "coronavirus"][0]{ _id, content }`
  )

  if (!doc) { console.error('Not found!'); return }

  const toRemove = new Set()
  for (let i = 0; i < doc.content.length - 1; i++) {
    if (doc.content[i]._type === 'block' && doc.content[i + 1]._type === 'block') {
      const thisText = getBlockText(doc.content[i]).trim()
      const nextText = getBlockText(doc.content[i + 1]).trim()
      if (thisText && thisText === nextText) {
        console.log(`  Duplicate at ${i}/${i + 1}: "${thisText.slice(0, 60)}..."`)
        toRemove.add(i + 1) // remove the second occurrence
      }
    }
  }

  if (toRemove.size === 0) {
    console.log('No duplicates found.')
    return
  }

  console.log(`Removing ${toRemove.size} duplicate blocks`)

  if (!DRY_RUN) {
    const newContent = doc.content.filter((_, i) => !toRemove.has(i))
    await client.patch(doc._id).set({ content: newContent }).commit()
    console.log('  ✓ Patched')
  }
}

// --- 4. Remove duplicate documents ---
async function fixDuplicateDocuments() {
  console.log('\n=== Check for duplicate documents ===')

  for (const slug of ['visual-storytelling-with-genai', 'fraud-waste-abuse-in-healthcare']) {
    const docs = await client.fetch(
      `*[_type == "feature" && slug.current == "${slug}"]{ _id, _createdAt, "blockCount": count(content) } | order(_createdAt asc)`
    )

    if (docs.length <= 1) {
      console.log(`${slug}: no duplicates (${docs.length} doc)`)
      continue
    }

    console.log(`${slug}: ${docs.length} documents found:`)
    docs.forEach((d, i) => {
      console.log(`  [${i}] ${d._id} (created: ${d._createdAt}, blocks: ${d.blockCount})`)
    })

    // Keep the one with more content, or the published (non-draft) version
    const published = docs.find(d => !d._id.startsWith('drafts.'))
    const draft = docs.find(d => d._id.startsWith('drafts.'))

    if (published && draft) {
      console.log(`  Keeping published (${published._id}), removing draft (${draft._id})`)
      if (!DRY_RUN) {
        await client.delete(draft._id)
        console.log('  ✓ Deleted draft')
      }
    } else {
      // Both are same type — keep the one with more blocks
      const sorted = [...docs].sort((a, b) => (b.blockCount || 0) - (a.blockCount || 0))
      const keep = sorted[0]
      const remove = sorted.slice(1)
      console.log(`  Keeping ${keep._id} (${keep.blockCount} blocks)`)
      for (const doc of remove) {
        console.log(`  Removing ${doc._id} (${doc.blockCount} blocks)`)
        if (!DRY_RUN) {
          await client.delete(doc._id)
          console.log('  ✓ Deleted')
        }
      }
    }
  }
}

async function main() {
  await fixIpsosFact()
  await fixEmptyParagraphs()
  await fixCoronavirusDuplicates()
  await fixDuplicateDocuments()
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}All cleanup done.`)
}

main().catch(err => { console.error(err); process.exit(1) })
