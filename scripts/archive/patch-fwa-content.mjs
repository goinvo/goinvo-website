/**
 * Fix FWA Sanity content:
 * 1. Add refNumber/refTarget citations to results block items
 * 2. Move "Calculations" heading + content into methodology backgroundSection
 *
 * Usage:
 *   node scripts/patch-fwa-content.mjs          # dry run
 *   node scripts/patch-fwa-content.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
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

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // ─── 1. Add refNumber/refTarget to results block items ───
  console.log('1. Adding citations to results block items...')
  const citations = [
    { stat: '$1.1B', refNumber: '4', refTarget: 'references' },
    { stat: '$1.9B', refNumber: '4', refTarget: 'references' },
    { stat: '0.14%', refNumber: 'A3', refTarget: 'methodology' },
    { stat: '0.026%', refNumber: 'A4', refTarget: 'methodology' },
  ]

  for (let i = 0; i < content.length; i++) {
    if (content[i]._type !== 'results') continue
    for (const item of (content[i].items || [])) {
      const match = citations.find(c => c.stat === item.stat)
      if (match && !item.refNumber) {
        console.log(`   ${item.stat}: adding citation ${match.refNumber} → #${match.refTarget}`)
        item.refNumber = match.refNumber
        item.refTarget = match.refTarget
        changes++
      }
    }
  }

  // ─── 2. Move "Calculations" heading + calc block into backgroundSection ───
  console.log('\n2. Moving Calculations into methodology backgroundSection...')

  const bgIdx = content.findIndex(b => b._type === 'backgroundSection')
  if (bgIdx === -1) {
    console.log('   ⚠️  No backgroundSection found')
  } else {
    const bgSection = content[bgIdx]
    const bgText = (bgSection.content || []).map(b => (b.children || []).map(c => c.text || '').join('')).join(' ')

    if (bgText.includes('Calculations') || bgText.includes('A1 - 30%')) {
      console.log('   Calculations already inside backgroundSection')
    } else {
      // Find "Calculations" heading and calc content AFTER the bgSection
      let calcHeadingIdx = -1
      let calcEndIdx = -1
      for (let i = bgIdx + 1; i < content.length; i++) {
        if (content[i]._type === 'block') {
          const text = (content[i].children || []).map(c => c.text || '').join('')
          if (text === 'Calculations' && calcHeadingIdx === -1) {
            calcHeadingIdx = i
          }
          if (calcHeadingIdx >= 0 && (text.startsWith('A1 ') || text.includes('US healthcare spending lost to FWA'))) {
            calcEndIdx = i
          }
        }
        // Stop at divider or next major section
        if (calcHeadingIdx >= 0 && calcEndIdx >= 0 && content[i]._type === 'divider') break
      }

      if (calcHeadingIdx >= 0 && calcEndIdx >= 0) {
        const blocksToMove = content.splice(calcHeadingIdx, calcEndIdx - calcHeadingIdx + 1)
        bgSection.content = bgSection.content || []
        bgSection.content.push(...blocksToMove)
        changes++
        console.log(`   Moved ${blocksToMove.length} block(s) into backgroundSection`)
      } else {
        console.log(`   ⚠️  Could not find Calculations blocks (heading=${calcHeadingIdx}, content=${calcEndIdx})`)
      }
    }
  }

  if (changes === 0) {
    console.log('\nNo changes needed.')
    return
  }

  console.log(`\n${changes} change(s) to apply.`)

  if (WRITE) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('✅ Patched.')
  } else {
    console.log('Run with --write to apply.')
  }
}

main().catch(console.error)
