/**
 * Patch the Calculations block in fraud-waste-abuse-in-healthcare.
 * Splits inline reference numbers out of formula text into sup-marked spans.
 *
 * Usage: node scripts/patch-fwa-calcs.mjs [--write]
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

/**
 * Split a text string at reference markers, returning an array of
 * { text, isSup } segments.
 *
 * Reference markers in formulas:
 * - Single digits preceded by a space or % sign: "10% 3" → "10% " + sup("3")
 * - "A1", "A2" etc preceded by space or %: "30% A1" → "30% " + sup("A1")
 */
function splitRefs(text) {
  const segments = []
  // Match: (space)(A?\d{1,2})(space or end) — standalone ref numbers only
  // Negative lookbehind: not preceded by . (decimal) or $ (currency)
  // Negative lookahead: not followed by % or . (decimal/percentage)
  const regex = /(\s)(A\d{1,2}|\d{1,2})(?=\s|$)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    const refStart = match.index + match[1].length
    const ref = match[2]

    // Skip if preceded by a decimal point (e.g., "0.14" → don't match "14")
    const charBefore = text[match.index - 1]
    if (charBefore === '.' || charBefore === '$') continue

    // Skip if the ref is "0" (not a valid reference)
    if (ref === '0' || ref === '00') continue

    // Skip if the preceding text ends with a decimal number pattern
    const beforeText = text.slice(0, match.index + 1)
    if (beforeText.match(/\d\.\d*\s$/)) continue

    if (refStart > lastIndex) {
      segments.push({ text: text.slice(lastIndex, refStart), isSup: false })
    }
    segments.push({ text: ref, isSup: true })
    lastIndex = refStart + ref.length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isSup: false })
  }

  return segments.length > 0 ? segments : [{ text, isSup: false }]
}

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]`
  )
  if (!doc) { console.log('Document not found'); return }

  const content = JSON.parse(JSON.stringify(doc.content))

  // Find the Calculations block by its _key
  const calcIdx = content.findIndex(b =>
    b._type === 'block' && b.children?.[0]?.text?.startsWith('A1 - 30%')
  )

  if (calcIdx < 0) { console.log('Calculations block not found'); return }

  const block = content[calcIdx]
  console.log('Found Calculations block at index', calcIdx)

  const newChildren = []
  let patchCount = 0

  for (const span of block.children) {
    const text = span.text || ''
    const segments = splitRefs(text)

    // If no refs found, keep span as-is
    if (segments.length === 1 && !segments[0].isSup) {
      newChildren.push(span)
      continue
    }

    console.log(`  Splitting: "${text.substring(0, 50)}"`)
    for (const seg of segments) {
      if (seg.isSup) {
        console.log(`    → sup("${seg.text}")`)
        newChildren.push({
          _type: 'span',
          _key: randomUUID().slice(0, 12),
          text: seg.text,
          marks: [...(span.marks || []), 'sup'],
        })
        patchCount++
      } else {
        newChildren.push({
          _type: 'span',
          _key: randomUUID().slice(0, 12),
          text: seg.text,
          marks: span.marks || [],
        })
      }
    }
  }

  content[calcIdx] = { ...block, children: newChildren }

  console.log(`\n${patchCount} superscripts extracted`)

  if (WRITE && patchCount > 0) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('✅ Written to Sanity')
  } else if (!WRITE) {
    console.log('Run with --write to save')
  }
}

main().catch(console.error)
