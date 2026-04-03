/**
 * One-time Sanity patch: "partners-geneinsight" case study
 *
 * Adds a superscript footnote "1" linking to #references after "variants detected"
 * in the body text.
 *
 * Usage: node scripts/patch-geneinsight-footnote.mjs [--dry-run]
 */

import { createClient } from '@sanity/client'

const PROJECT_ID = 'a1wsimxr'
const DATASET = 'production'
const TOKEN = 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu'

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

const DRY_RUN = process.argv.includes('--dry-run')
const NEEDLE = 'variants detected'

async function main() {
  console.log('Fetching partners-geneinsight case study...')

  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "partners-geneinsight"][0]{ _id, title, content }`
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

  // Find the block and span containing "variants detected"
  let targetBlockIndex = -1
  let targetSpanIndex = -1

  for (let bi = 0; bi < doc.content.length; bi++) {
    const block = doc.content[bi]
    if (block._type !== 'block' || !block.children) continue
    for (let si = 0; si < block.children.length; si++) {
      const span = block.children[si]
      if (span.text && span.text.includes(NEEDLE)) {
        targetBlockIndex = bi
        targetSpanIndex = si
        break
      }
    }
    if (targetBlockIndex >= 0) break
  }

  if (targetBlockIndex === -1) {
    console.error(`Could not find text containing "${NEEDLE}"!`)
    process.exit(1)
  }

  const block = doc.content[targetBlockIndex]
  const span = block.children[targetSpanIndex]
  console.log(`\nFound "${NEEDLE}" in block[${targetBlockIndex}], span[${targetSpanIndex}]`)
  console.log(`  Full span text: "${span.text}"`)

  // Check if footnote link already exists in this block
  const hasFootnote = block.children.some(
    c => c.text === '1' && c.marks && c.marks.length > 0
  )
  if (hasFootnote) {
    console.log('\n✗ Footnote "1" already exists in this block — skipping.')
    return
  }

  // Split the span text around "variants detected"
  const needleIdx = span.text.indexOf(NEEDLE)
  const afterNeedle = span.text.slice(needleIdx + NEEDLE.length) // e.g., "." or ""

  // Text before and including "variants detected"
  const beforeText = span.text.slice(0, needleIdx + NEEDLE.length)

  // Create the link mark
  const linkKey = randomKey()
  const linkMarkDef = {
    _type: 'link',
    _key: linkKey,
    href: '#references',
  }

  // Build new children array
  const newChildren = [...block.children]
  const newSpans = []

  // Span 1: everything up to and including "variants detected"
  newSpans.push({
    ...span,
    _key: span._key || randomKey(),
    text: beforeText,
  })

  // Span 2: the footnote "1" with link mark
  newSpans.push({
    _type: 'span',
    _key: randomKey(),
    text: '1',
    marks: [linkKey],
  })

  // Span 3: the remaining text (period, etc.)
  if (afterNeedle) {
    newSpans.push({
      _type: 'span',
      _key: randomKey(),
      text: afterNeedle,
      marks: span.marks || [],
    })
  }

  // Replace the original span with the new spans
  newChildren.splice(targetSpanIndex, 1, ...newSpans)

  // Add the link markDef to the block
  const newMarkDefs = [...(block.markDefs || []), linkMarkDef]

  console.log(`\n✓ Splitting span into ${newSpans.length} parts:`)
  newSpans.forEach((s, i) => console.log(`  span[${i}]: text="${s.text}", marks=${JSON.stringify(s.marks || [])}`))
  console.log(`  Added markDef: { _type: "link", href: "#references" }`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would patch document with updated block.')
    return
  }

  // Build the updated content
  const newContent = [...doc.content]
  newContent[targetBlockIndex] = {
    ...block,
    children: newChildren,
    markDefs: newMarkDefs,
  }

  console.log('\nPatching document...')
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('✓ Done! Document patched successfully.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
