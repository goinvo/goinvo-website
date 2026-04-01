#!/usr/bin/env node
/**
 * Patch health-design-thinking:
 *   1. Add role/sub to the quote block (Bon Ku, MD)
 *   2. Insert 3 "Featured In The Book" card descriptions as linked text paragraphs
 *      (images skipped per instructions — text content only)
 *
 * Usage:
 *   node scripts/patch-health-design-thinking.mjs           # dry-run
 *   node scripts/patch-health-design-thinking.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const WRITE = process.argv.includes('--write')
const SLUG = 'health-design-thinking'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

/**
 * The 3 "Featured In The Book" cards from Gatsby.
 * These go between the h4 "Featured In The Book" and the buttonGroup "Order At MIT Press".
 */
const featuredCards = [
  {
    title: 'hGraph, page 46',
    caption: 'Your health in one picture.',
    link: '/work/hgraph',
  },
  {
    title: 'Care Plans, page 100-103',
    caption: 'A patient guide to manage day-to-day health based on health concerns, goals, and interventions.',
    link: '/vision/care-plans',
  },
  {
    title: 'Standard Health Record, page 107',
    caption: 'Prototyping and envisioning future applications of a national health data standard to drive its development.',
    link: '/work/mitre-shr',
  },
]

function makeKey() {
  return Math.random().toString(36).substring(2, 13)
}

/**
 * Build Portable Text blocks for the 3 featured cards.
 * Each card becomes a paragraph with a bold linked title followed by the caption.
 */
function buildCardBlocks() {
  return featuredCards.map(card => {
    const linkKey = makeKey()
    return {
      _type: 'block',
      _key: makeKey(),
      style: 'normal',
      markDefs: [
        {
          _key: linkKey,
          _type: 'link',
          href: card.link,
        },
      ],
      children: [
        {
          _type: 'span',
          _key: makeKey(),
          marks: ['strong', linkKey],
          text: card.title,
        },
        {
          _type: 'span',
          _key: makeKey(),
          marks: [],
          text: ` — ${card.caption}`,
        },
      ],
    }
  })
}

async function main() {
  // 1. Fetch the document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug: SLUG }
  )

  if (!doc) {
    console.error(`Document not found: ${SLUG}`)
    process.exit(1)
  }

  console.log(`Found: ${doc.title} (${doc._id})`)
  console.log(`Content blocks: ${doc.content.length}`)

  // 2. Find the quote block and add role
  const quoteIdx = doc.content.findIndex(b => b._type === 'quote' && b.author === 'Bon Ku, MD')
  if (quoteIdx === -1) {
    console.error('Quote block for Bon Ku not found!')
    process.exit(1)
  }

  const quoteBlock = doc.content[quoteIdx]
  const newRole = 'A practicing emergency physician, is Assistant Dean for Health and Design at Sidney Kimmel Medical College at Thomas Jefferson University, where he is also Director of the Health Design Lab.'

  console.log(`\n--- Patch 1: Add role to quote block [${quoteIdx}] ---`)
  console.log(`  Author: ${quoteBlock.author}`)
  console.log(`  Current role: ${quoteBlock.role || '(none)'}`)
  console.log(`  New role: ${newRole}`)

  // 3. Find the insertion point for card blocks
  // Cards go after "Featured In The Book" h4 and before the buttonGroup
  const featuredIdx = doc.content.findIndex(
    b => b._type === 'block' && b.style === 'h4' &&
    b.children?.[0]?.text === 'Featured In The Book'
  )
  const buttonGroupIdx = doc.content.findIndex(b => b._type === 'buttonGroup')

  if (featuredIdx === -1) {
    console.error('"Featured In The Book" heading not found!')
    process.exit(1)
  }

  console.log(`\n--- Patch 2: Insert card description blocks ---`)
  console.log(`  Insert after block [${featuredIdx}]: "Featured In The Book"`)
  console.log(`  Insert before block [${buttonGroupIdx}]: buttonGroup`)

  const cardBlocks = buildCardBlocks()
  cardBlocks.forEach((block, i) => {
    const text = block.children.map(c => c.text).join('')
    console.log(`  Card [${i}]: ${text.substring(0, 100)}`)
  })

  // 4. Build the new content array
  const newContent = [...doc.content]

  // Update quote role
  newContent[quoteIdx] = { ...newContent[quoteIdx], role: newRole }

  // Insert card blocks after "Featured In The Book" heading
  const insertAt = featuredIdx + 1
  newContent.splice(insertAt, 0, ...cardBlocks)

  console.log(`\n  New content length: ${newContent.length} (was ${doc.content.length})`)

  if (!WRITE) {
    console.log('\n[DRY RUN] No changes applied. Use --write to apply.')
    return
  }

  // 5. Apply the patch
  const result = await client
    .patch(doc._id)
    .set({ content: newContent })
    .commit()

  console.log(`\n[APPLIED] Updated ${result._id} at rev ${result._rev}`)

  // 6. Verify
  const updated = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{
      "contentLength": count(content),
      "quoteRole": content[_type == "quote"][0].role,
      "blockCount": count(content[_type == "block"]),
    }`,
    { slug: SLUG }
  )
  console.log(`Verified:`)
  console.log(`  Content blocks: ${updated.contentLength}`)
  console.log(`  Quote role: ${updated.quoteRole ? updated.quoteRole.substring(0, 60) + '...' : '(none)'}`)
  console.log(`  Text blocks: ${updated.blockCount}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
