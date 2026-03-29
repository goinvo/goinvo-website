/**
 * Comprehensive content patch for fraud-waste-abuse-in-healthcare.
 * Fixes all remaining content issues after previous patches.
 *
 * Changes:
 * 1. Fix missing spaces after colons in Fraud/Waste/Abuse definitions
 * 2. Convert definitions section (blocks 9-12) to a columns block (text LEFT, image RIGHT)
 * 3. Add HHS quote after paragraph about "most recent estimate" (before block 18 "30% FWA")
 * 4. Add FBI quote after "Fraud 10% + Waste 20%" heading
 * 5. Replace stat paragraphs (blocks 27-30) with a results block
 * 6. Convert Concept 1 section (blocks 34-38) to columns block (text LEFT, phone RIGHT)
 * 7. Fix ROI image size (block 23) — full → medium
 * 8. Add textColor marks on Fraud/Waste/Abuse terms (teal)
 * 9. Fix missing heading at block 0 — first h2 should be stripped by route (already handled)
 *
 * Usage: node scripts/patch-fwa-complete.mjs [--write]
 */

import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')
const key = () => randomUUID().slice(0, 12)

function span(text, marks = []) {
  return { _type: 'span', _key: key(), text, marks }
}

function textBlock(text, style = 'normal', markDefs = []) {
  return { _type: 'block', _key: key(), style, markDefs, children: [span(text)] }
}

function makeDefinitionBlock(term, definition, color = 'teal') {
  const colorKey = key()
  return {
    _type: 'block', _key: key(), style: 'normal',
    markDefs: [{ _type: 'textColor', _key: colorKey, color }],
    children: [
      { _type: 'span', _key: key(), text: `${term}: `, marks: ['strong', colorKey] },
      { _type: 'span', _key: key(), text: definition, marks: [] },
    ],
  }
}

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  // Work with a deep clone
  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // Helper to find block by text match
  const findBlock = (text, startFrom = 0) => {
    for (let i = startFrom; i < content.length; i++) {
      const b = content[i]
      if (b._type === 'block') {
        const t = (b.children || []).map(c => c.text || '').join('')
        if (t.includes(text)) return i
      }
    }
    return -1
  }

  // ─── 1. Convert definitions (blocks with "Fraud:", "Waste:", "Abuse:") + image → columns ───
  console.log('1. Converting definitions section to columns block...')
  const fraudIdx = findBlock('Fraud:')
  const wasteIdx = findBlock('Waste:')
  const abuseIdx = findBlock('Abuse:')

  if (fraudIdx >= 0 && wasteIdx >= 0 && abuseIdx >= 0) {
    // Find the image right after
    let imgIdx = abuseIdx + 1
    while (imgIdx < content.length && content[imgIdx]._type !== 'image') imgIdx++

    if (imgIdx < content.length && content[imgIdx]._type === 'image') {
      const imageBlock = content[imgIdx]
      console.log(`   Replacing blocks ${fraudIdx}-${imgIdx} with columns block`)

      const columnsBlock = {
        _type: 'columns', _key: key(), layout: '2',
        content: [
          makeDefinitionBlock('Fraud', 'intentional misuse of healthcare system resources.'),
          makeDefinitionBlock('Waste', 'unintentional misuse of healthcare system resources.'),
          makeDefinitionBlock('Abuse', 'misuse of healthcare system resources independent of intention.'),
          { ...imageBlock, _key: key() },
        ],
      }

      content.splice(fraudIdx, imgIdx - fraudIdx + 1, columnsBlock)
      changes++
    }
  }

  // ─── 2. Add HHS quote before "30% FWA" heading ───
  console.log('2. Adding HHS quote...')
  const fwaHeadingIdx = findBlock('30% FWA')
  if (fwaHeadingIdx >= 0) {
    // Check if quote already exists before it
    const prevBlock = content[fwaHeadingIdx - 1]
    if (prevBlock?._type !== 'quote') {
      const hhsQuote = {
        _type: 'quote', _key: key(),
        text: '30 percent of U.S. health spending (public and private) in 2009 — roughly $750 billion — was wasted on unnecessary services, excessive administrative costs, fraud, and other problems.',
        author: 'United States Department of Health and Human Services (HHS)',
      }
      content.splice(fwaHeadingIdx, 0, hhsQuote)
      console.log(`   Inserted at index ${fwaHeadingIdx}`)
      changes++
    } else {
      console.log('   Already exists, skipping')
    }
  }

  // ─── 3. Add FBI quote after "Fraud 10% + Waste 20%" heading ───
  console.log('3. Adding FBI quote...')
  const fraud10Idx = findBlock('Fraud 10%')
  if (fraud10Idx >= 0) {
    const nextBlock = content[fraud10Idx + 1]
    if (nextBlock?._type !== 'quote') {
      const fbiQuote = {
        _type: 'quote', _key: key(),
        text: 'Estimates of fraudulent billings to health care programs, both public and private, are estimated between 3 and 10 percent of total health care expenditures.',
        author: 'Federal Bureau of Investigation (FBI)',
      }
      content.splice(fraud10Idx + 1, 0, fbiQuote)
      console.log(`   Inserted at index ${fraud10Idx + 1}`)
      changes++
    } else {
      console.log('   Already exists, skipping')
    }
  }

  // ─── 4. Replace stat paragraphs with results block ───
  console.log('4. Replacing stat paragraphs with results block...')
  const dollarsInvestedIdx = findBlock('Dollars Invested In FWA Recovery')
  if (dollarsInvestedIdx >= 0) {
    // Check if already a results block
    if (content[dollarsInvestedIdx]._type === 'block') {
      const resultsBlock = {
        _type: 'results', _key: key(), background: 'gray',
        items: [
          { _type: 'object', _key: key(), stat: '$1.1B', description: 'Dollars Invested In FWA Recovery' },
          { _type: 'object', _key: key(), stat: '$1.9B', description: 'Dollars Recovered' },
          { _type: 'object', _key: key(), stat: '0.14%', description: 'Percent of Loss Recovered' },
          { _type: 'object', _key: key(), stat: '0.026%', description: 'Percent of Spending Put Towards Recovery' },
        ],
      }
      // Remove the 4 stat paragraphs and replace with results block
      content.splice(dollarsInvestedIdx, 4, resultsBlock)
      console.log(`   Replaced blocks ${dollarsInvestedIdx}-${dollarsInvestedIdx + 3}`)
      changes++
    } else {
      console.log('   Already a results block, skipping')
    }
  }

  // ─── 5. Convert Concept 1 section to columns block ───
  console.log('5. Converting Concept 1 to columns block...')
  const concept1Idx = findBlock('Concept 1: Health Accuracy Receipt')
  if (concept1Idx >= 0 && content[concept1Idx]._type === 'block') {
    // Find the phone image after the 3 paragraphs
    let phoneImgIdx = concept1Idx + 1
    while (phoneImgIdx < content.length && content[phoneImgIdx]._type === 'block') phoneImgIdx++

    if (phoneImgIdx < content.length && content[phoneImgIdx]._type === 'image') {
      const textBlocks = content.slice(concept1Idx, phoneImgIdx)
      const imageBlock = content[phoneImgIdx]

      const columnsBlock = {
        _type: 'columns', _key: key(), layout: '2',
        content: [
          ...textBlocks.map(b => ({ ...b, _key: key() })),
          { ...imageBlock, _key: key() },
        ],
      }
      content.splice(concept1Idx, phoneImgIdx - concept1Idx + 1, columnsBlock)
      console.log(`   Replaced blocks ${concept1Idx}-${phoneImgIdx}`)
      changes++
    }
  }

  // ─── 6. Fix ROI image size → medium ───
  console.log('6. Fixing ROI image size...')
  const roiHeadingIdx = findBlock('For every $1 Invested')
  if (roiHeadingIdx >= 0) {
    for (let i = roiHeadingIdx + 1; i < content.length; i++) {
      if (content[i]._type === 'image') {
        if (content[i].size !== 'medium') {
          console.log(`   Block ${i}: size ${content[i].size} → medium`)
          content[i].size = 'medium'
          content[i].align = 'center'
          changes++
        }
        break
      }
    }
  }

  // ─── 7. Add missing divider before "Recovering FWA" section ───
  console.log('7. Checking for missing dividers...')
  const recoveringIdx = findBlock('Recovering FWA')
  if (recoveringIdx >= 0 && content[recoveringIdx - 1]?._type !== 'divider') {
    content.splice(recoveringIdx, 0, { _type: 'divider', _key: key() })
    console.log(`   Added divider before "Recovering FWA"`)
    changes++
  }

  console.log(`\n${changes} changes`)

  if (WRITE && changes > 0) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('✅ Written to Sanity')
  } else if (!WRITE && changes > 0) {
    console.log('Run with --write to save')
  }
}

main().catch(console.error)
