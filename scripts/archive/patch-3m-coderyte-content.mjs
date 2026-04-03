/**
 * Patch 3m-coderyte case study content:
 * 1. Split merged paragraph (block with key "dyjojc55oy") into two paragraphs.
 *    In Gatsby, "...there were no patients left to code." and "The software worked
 *    so well..." are separate <p> elements. In Sanity they were merged into one block.
 *
 * Usage:
 *   node scripts/patch-3m-coderyte-content.mjs          # dry run
 *   node scripts/patch-3m-coderyte-content.mjs --write   # apply
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
const key = () => randomUUID().slice(0, 12)

const SPLIT_KEY = 'dyjojc55oy'
const SPLIT_POINT = 'there were no patients left to code.'

async function main() {
  console.log(`${WRITE ? 'WRITE MODE' : 'DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "3m-coderyte"][0]{ _id, content }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}\n`)

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // --- 1. Split merged paragraph ---
  const blockIdx = content.findIndex(b => b._key === SPLIT_KEY)
  if (blockIdx === -1) {
    console.log(`[1] Block ${SPLIT_KEY} not found - may have been already patched.`)
  } else {
    const block = content[blockIdx]
    const fullText = (block.children || []).map(c => c.text || '').join('')

    const splitPos = fullText.indexOf(SPLIT_POINT)
    if (splitPos === -1) {
      console.log(`[1] Split point text not found in block ${blockIdx} - may have been already patched.`)
    } else {
      const textBefore = fullText.substring(0, splitPos + SPLIT_POINT.length)
      const textAfter = fullText.substring(splitPos + SPLIT_POINT.length).trimStart()

      if (textAfter.length === 0) {
        console.log(`[1] Block ${blockIdx} already ends at split point - no split needed.`)
      } else {
        console.log(`[1] Splitting block ${blockIdx} (key: ${SPLIT_KEY})`)
        console.log(`    Before: "${textBefore.substring(textBefore.length - 60)}"`)
        console.log(`    After:  "${textAfter.substring(0, 60)}"`)

        // Replace the original block with two blocks
        const block1 = {
          _type: 'block',
          _key: block._key,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: key(),
              marks: [],
              text: textBefore,
            },
          ],
        }

        const block2 = {
          _type: 'block',
          _key: key(),
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: key(),
              marks: [],
              text: textAfter,
            },
          ],
        }

        content.splice(blockIdx, 1, block1, block2)
        changes++
      }
    }
  }

  // --- Summary ---
  console.log(`\nTotal changes: ${changes}`)
  console.log(`New block count: ${content.length}`)

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
