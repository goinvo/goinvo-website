/**
 * Patch fraud-waste-abuse-in-healthcare:
 *
 * 1. Move "Calculations" heading and A1-A4 formulas paragraph INTO the
 *    backgroundSection (methodology) so they render on the teal background.
 * 2. Fix the Contributors paragraph: replace the single-line text with
 *    properly separated lines (one contributor per line).
 *
 * Usage:
 *   node scripts/patch-fwa-methodology.mjs            # dry run
 *   node scripts/patch-fwa-methodology.mjs --write     # apply
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

function makeKey() { return randomUUID().slice(0, 12) }

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  const content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // ─── Fix 1: Move Calculations into backgroundSection ─────────────────

  // Find the backgroundSection block
  const bgIdx = content.findIndex(b => b._type === 'backgroundSection' && b.color === 'teal')
  if (bgIdx < 0) {
    console.log('ERROR: backgroundSection not found')
    return
  }
  console.log(`  Found backgroundSection at index ${bgIdx}`)

  // Find the "Calculations" heading (should be right after the backgroundSection)
  const calcHeadingIdx = content.findIndex(b =>
    b._type === 'block' && b.style === 'h3' &&
    b.children?.[0]?.text === 'Calculations'
  )

  // Find the calculations paragraph (A1 - A4 formulas)
  const calcParaIdx = content.findIndex(b =>
    b._type === 'block' && b.style === 'normal' &&
    b.children?.[0]?.text?.startsWith('A1 - 30%')
  )

  if (calcHeadingIdx > 0 && calcParaIdx > 0) {
    console.log(`  Found "Calculations" heading at index ${calcHeadingIdx}`)
    console.log(`  Found calculations paragraph at index ${calcParaIdx}`)

    // Check if they're already inside the backgroundSection
    const bgContent = content[bgIdx].content || []
    const alreadyInside = bgContent.some(b =>
      b._type === 'block' && b.children?.[0]?.text === 'Calculations'
    )

    if (alreadyInside) {
      console.log('  Calculations already inside backgroundSection — skipping')
    } else {
      // Copy the blocks into the backgroundSection content array
      const calcHeading = content[calcHeadingIdx]
      const calcPara = content[calcParaIdx]

      content[bgIdx].content.push(calcHeading)
      content[bgIdx].content.push(calcPara)

      // Remove the blocks from top-level (remove higher index first to avoid shifting)
      const toRemove = [calcHeadingIdx, calcParaIdx].sort((a, b) => b - a)
      for (const idx of toRemove) {
        content.splice(idx, 1)
      }

      console.log('  ✅ Moved Calculations heading + formulas into backgroundSection')
      changes++
    }
  } else {
    console.log('  Calculations blocks not found at top level — may already be fixed')
  }

  // ─── Fix 2: Fix Contributors paragraph with proper line breaks ───────

  const contribIdx = content.findIndex(b =>
    b._type === 'block' && b.style === 'normal' &&
    b.children?.[0]?.text?.includes('Edwin Choi')
  )

  if (contribIdx > 0) {
    const oldText = content[contribIdx].children[0].text
    console.log(`  Found Contributors paragraph at index ${contribIdx}`)
    console.log(`    Current: "${oldText.substring(0, 60)}..."`)

    // Check if it already has line breaks (multiple children with \n)
    if (oldText.includes('\n')) {
      console.log('  Contributors already has line breaks — skipping')
    } else {
      // Replace with properly formatted text using \n line breaks
      const contributors = [
        'Edwin Choi, GoInvo',
        'Anesu Machoko, MetaDigital',
        'Philip Mattera, Good Jobs First',
        'Siobhan Standaert, Good Jobs First',
        'Jung Hoon Son, Clinicians.fyi',
      ]

      content[contribIdx].children = [{
        _type: 'span',
        _key: makeKey(),
        text: contributors.join('\n'),
        marks: [],
      }]

      console.log('  ✅ Fixed Contributors paragraph with line breaks')
      changes++
    }
  } else {
    console.log('  Contributors paragraph not found')
  }

  // ─── Summary & commit ────────────────────────────────────────────────

  console.log(`\n  ${changes} change(s) to apply`)

  if (WRITE && changes > 0) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('  ✅ Written to Sanity')
  } else if (!WRITE && changes > 0) {
    console.log('  Run with --write to save')
  }
}

main().catch(console.error)
