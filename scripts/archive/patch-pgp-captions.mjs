/**
 * Patch image captions for personal-genome-project-vision.
 *
 * Usage: node scripts/patch-pgp-captions.mjs [--dry-run]
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

// Map: image filename substring → caption text
const captionMap = {
  'pgp-meeting2': 'Lisa Caldwell leading user experience discussion.',
  'pgp-timeline2': 'Kimberly Chang and Reshma Mehta, the GoInvo team, map out possible solutions to the current ecosystem.',
}

async function main() {
  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "personal-genome-project-vision"][0]{ _id, content, "imageUrls": content[_type == "image"]{_key, "url": asset->url} }`
  )

  if (!doc) { console.error('Not found!'); return }

  console.log(`Document: ${doc._id}`)
  console.log(`Images:`)
  doc.imageUrls?.forEach(img => console.log(`  ${img._key}: ${(img.url || '').slice(-50)}`))

  let patched = 0
  const newContent = doc.content.map((block, i) => {
    if (block._type !== 'image') return block

    // Check the image URL against our caption map
    const imgInfo = doc.imageUrls?.find(img => img._key === block._key)
    const url = imgInfo?.url || ''

    for (const [filenameFragment, caption] of Object.entries(captionMap)) {
      if (url.includes(filenameFragment) || (block.caption === '' && i === 13 && filenameFragment === 'pgp-meeting2') || (block.caption === '' && i === 26 && filenameFragment === 'pgp-timeline2')) {
        // Check by index as fallback
        if ((filenameFragment === 'pgp-meeting2' && i === 13) || (filenameFragment === 'pgp-timeline2' && i === 26) || url.includes(filenameFragment)) {
          console.log(`\n✓ Image[${i}]: setting caption to "${caption.slice(0, 60)}..."`)
          patched++
          return { ...block, caption }
        }
      }
    }

    return block
  })

  if (patched === 0) {
    console.log('\nNo captions to update.')
    return
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would update ${patched} captions.`)
    return
  }

  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log(`\n✓ Updated ${patched} captions.`)
}

main().catch(err => { console.error(err); process.exit(1) })
