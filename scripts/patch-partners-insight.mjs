#!/usr/bin/env node
/**
 * Patch partners-insight: fix superscript references in Problem paragraph.
 *
 * The Gatsby source has <sup><a href="#references">1</a></sup> etc. in the
 * Problem paragraph, but Sanity stores them as plain text "(1)", "(2)", "(3)".
 * This script replaces the Problem paragraph with properly marked-up refCitation spans.
 *
 * Usage:
 *   node scripts/patch-partners-insight.mjs          # dry-run
 *   node scripts/patch-partners-insight.mjs --write   # apply
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import { randomBytes } from 'crypto'

dotenv.config({ path: '.env.local' })

const write = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

function key() {
  return randomBytes(6).toString('hex')
}

async function main() {
  const doc = await client.fetch(
    `*[_type == 'caseStudy' && slug.current == 'partners-insight'][0]{_id, content}`
  )
  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}`)

  // Find the Problem paragraph (block index 1 — the paragraph after "Problem" h3)
  const problemBlock = doc.content[1]
  if (!problemBlock || problemBlock._type !== 'block' || problemBlock.style !== 'normal') {
    console.error('Expected Problem paragraph at index 1, found:', problemBlock?._type, problemBlock?.style)
    process.exit(1)
  }

  const currentText = problemBlock.children.map(c => c.text).join('')
  console.log(`\nCurrent text (first 200 chars):\n  ${currentText.substring(0, 200)}...`)

  // Verify it contains (1), (2), (3) references
  if (!currentText.includes('(1)') || !currentText.includes('(2)') || !currentText.includes('(3)')) {
    console.log('\nParagraph does not contain (1), (2), (3) — may have already been patched.')
    process.exit(0)
  }

  // Build the new children array with refCitation marks
  // Original text with refs:
  // "...Massachusetts(1), requires...PHRC(2)). Insight...institutions(3). The software..."
  //
  // We need to split on (1), (2), (3) and insert refCitation-marked spans

  const ref1Key = key()
  const ref2Key = key()
  const ref3Key = key()

  const newChildren = [
    {
      _key: key(),
      _type: 'span',
      marks: [],
      text: 'Institutional review boards (IRBs) stand as gatekeepers of medical research, reviewing and ensuring proposed studies are ethical and legal, as they will eventually have a direct impact on long-term patient outcomes. Partners Healthcare (now Mass General Brigham), as the largest provider network in Massachusetts',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [ref1Key],
      text: '1',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [],
      text: ', requires all Partners-affiliated investigators to submit their studies and have them approved by the Partners Human Research Committee (PHRC',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [ref2Key],
      text: '2',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [],
      text: '). Insight, PHRC\u2019s electronic IRB portal, is the central point of ingest and administration for medical research for six major research institutions',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [ref3Key],
      text: '3',
    },
    {
      _key: key(),
      _type: 'span',
      marks: [],
      text: '. The software and processes suffered from serious usability issues that would impede turnaround times and delay research for weeks at a time.',
    },
  ]

  const newMarkDefs = [
    { _key: ref1Key, _type: 'refCitation', refNumber: '1' },
    { _key: ref2Key, _type: 'refCitation', refNumber: '2' },
    { _key: ref3Key, _type: 'refCitation', refNumber: '3' },
  ]

  console.log('\n--- Proposed changes ---')
  console.log('Block key:', problemBlock._key)
  console.log('New children spans:', newChildren.length)
  console.log('New markDefs:', newMarkDefs.length)
  console.log('\nNew text preview:')
  const newText = newChildren.map(c => {
    if (c.marks.length > 0) return `[sup:${c.text}]`
    return c.text
  }).join('')
  console.log(`  ${newText.substring(0, 200)}...`)

  if (!write) {
    console.log('\n[DRY RUN] Use --write to apply changes.')
    return
  }

  // Patch: replace the children and markDefs of the problem paragraph
  const blockKey = problemBlock._key
  await client
    .patch(doc._id)
    .set({
      [`content[_key=="${blockKey}"].children`]: newChildren,
      [`content[_key=="${blockKey}"].markDefs`]: newMarkDefs,
    })
    .commit()

  console.log('\n[DONE] Patched Problem paragraph with refCitation marks.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
