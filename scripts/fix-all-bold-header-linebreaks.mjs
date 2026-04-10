/**
 * For each feature, find blocks where the FIRST span is bold/strong
 * and the SECOND span starts with non-bold normal text. Insert a \n
 * span between them so the bold span renders as a "header line"
 * above the body text — matching Gatsby's "<strong>Title</strong>
 * <br/> body" pattern.
 *
 * Skip blocks that already have a \n separator.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-all-bold-header-linebreaks.mjs        # dry
 *   node --env-file=.env.local scripts/fix-all-bold-header-linebreaks.mjs --write
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'

const WRITE = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

const features = await client.fetch(`*[_type == 'feature'] { _id, slug, content }`)
console.log(`Scanning ${features.length} features...\n`)

let totalFixed = 0
let pagesFixed = 0

const isStrong = (c) => c.marks?.includes('strong')
const isPlain = (c) => !c.marks?.length || (c.marks?.length === 1 && c.marks[0] === 'em')

for (const doc of features) {
  if (!doc.content) continue
  const newContent = JSON.parse(JSON.stringify(doc.content))

  let fixed = 0
  const processBlock = (block) => {
    if (block._type !== 'block' || block.style !== 'normal' || !block.children) return
    if (block.children.length < 2) return
    // Skip if first child isn't strong
    const first = block.children[0]
    const second = block.children[1]
    if (!isStrong(first)) return
    // First child must be a short header-like text (no period mid-sentence except at end)
    const firstText = (first.text || '').trim()
    if (!firstText || firstText.length > 80 || firstText.length < 2) return
    // Second child must be plain or em, starting with capital letter or space
    if (!second.text) return
    if (second.text.startsWith('\n')) return // already has newline
    // If second text starts with a sentence (capital letter after optional space), it's likely a separate "body"
    const trimmed = second.text.trimStart()
    if (!/^[A-Z]/.test(trimmed)) return
    // Skip if first text ends with sentence punctuation that joins inline (like ":" which suggests it's a label)
    if (/:$/.test(firstText)) return

    // Insert \n span between first and second
    block.children[0].text = first.text.replace(/ +$/, '')
    block.children.splice(1, 0, {
      _key: `br-${Math.random().toString(36).slice(2, 8)}`,
      _type: 'span',
      marks: [],
      text: '\n',
    })
    fixed++
  }

  const walk = (items) => {
    for (const item of items) {
      if (item._type === 'block') processBlock(item)
      if (item._type === 'columns' && item.content) walk(item.content)
    }
  }
  walk(newContent)

  if (fixed > 0) {
    console.log(`  ${doc.slug?.current || doc._id}: ${fixed} fixes`)
    totalFixed += fixed
    pagesFixed++
    if (WRITE) {
      await client.patch(doc._id).set({ content: newContent }).commit()
    }
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`Total: ${totalFixed} fixes across ${pagesFixed} pages`)
if (!WRITE) console.log('(Dry run — pass --write to apply)')
