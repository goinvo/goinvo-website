#!/usr/bin/env node
/**
 * Fix eligibility-engine Sanity content to match Gatsby layout.
 *
 * Issues fixed:
 * 1. Remove extra h2Large "Transforming Service Access..." (change doc title instead)
 * 2. Un-column 3 image+caption pairs (blocks 10, 19, 25) → full-width images + centered captions
 * 3. Convert quote block to regular paragraphs
 * 4. Reorder "Common Data Elements" section: text before iframe
 * 5. Move "Download..." button to right after journey-map image
 * 6. Center "Current Application Process" caption text
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import { randomBytes } from 'crypto'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

function genKey() {
  return randomBytes(6).toString('hex')
}

function makeTextBlock(text, style = 'normal', marks = []) {
  return {
    _type: 'block',
    _key: genKey(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: genKey(), text, marks }],
  }
}

async function main() {
  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'eligibility-engine'][0]{ _id, title, content }`
  )

  if (!doc) {
    console.error('Document not found')
    process.exit(1)
  }

  console.log('Current title:', doc.title)
  console.log('Current blocks:', doc.content.length)

  const old = doc.content

  // Helper: extract image from a columns block
  function extractImageFromColumns(columnsBlock) {
    const imgChild = columnsBlock.content.find((c) => c._type === 'image')
    if (imgChild) {
      // Return as standalone image (no longer inside columns)
      return { ...imgChild, _key: genKey() }
    }
    return null
  }

  // Helper: extract text from a columns block
  function extractTextFromColumns(columnsBlock, style = 'textCenter') {
    const textChild = columnsBlock.content.find((c) => c._type === 'block')
    if (textChild) {
      return { ...textChild, _key: genKey(), style }
    }
    return null
  }

  // Build new content array matching Gatsby order
  const newContent = []

  // Skip block 0 (h2Large "Transforming Service Access...") — becomes the title
  // Blocks 1-3: three intro paragraphs
  newContent.push(old[1], old[2], old[3])

  // Block 4: divider
  newContent.push(old[4])

  // Block 5: sectionTitle "Challenges of Accessing Services..."
  newContent.push(old[5])

  // Blocks 6-7: two paragraphs
  newContent.push(old[6], old[7])

  // Block 8: image (current-process) — full width, keep as-is
  newContent.push(old[8])

  // Block 9: "Current Application Process" — change to textCenter
  newContent.push({ ...old[9], style: 'textCenter' })

  // Block 10 (columns): extract journey-map image as full-width
  const journeyMapImg = extractImageFromColumns(old[10])
  if (journeyMapImg) newContent.push(journeyMapImg)

  // Block 13 (buttonGroup): move to right after journey-map image
  newContent.push(old[13])

  // Block 11: paragraph "Furthermore..."
  newContent.push(old[11])

  // Block 12 (quote): convert to two paragraphs
  // Quote text → regular paragraph (Gatsby shows this at w:600, which is the callout/blockquote width)
  // Quote author → regular paragraph (italic, as citation)
  const quoteBlock = old[12]
  newContent.push({
    _type: 'block',
    _key: genKey(),
    style: 'callout',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: genKey(),
        text: quoteBlock.text,
        marks: [],
      },
    ],
  })
  newContent.push({
    _type: 'block',
    _key: genKey(),
    style: 'callout',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: genKey(),
        text: quoteBlock.author,
        marks: ['em'],
      },
    ],
  })

  // Block 14: sectionTitle "Common Data Elements..."
  newContent.push(old[14])

  // Gatsby order: 3 paragraphs → image → caption → iframe → button
  // Sanity current: iframe (15) → 3 paras (16-18) → columns(19) → button(20)
  // Fix: 3 paras first, then image, then caption, then iframe, then button

  // Blocks 16-18: three paragraphs
  newContent.push(old[16], old[17], old[18])

  // Block 19 (columns): extract image as full-width
  const appDataImg = extractImageFromColumns(old[19])
  const appDataCaption = extractTextFromColumns(old[19], 'textCenter')
  if (appDataImg) newContent.push(appDataImg)
  if (appDataCaption) newContent.push(appDataCaption)

  // Block 15: iframeEmbed (moved to after image)
  newContent.push(old[15])

  // Block 20: buttonGroup "View Common data..."
  newContent.push(old[20])

  // Block 21: divider
  newContent.push(old[21])

  // Block 22: sectionTitle "The Power of a Centralized Resident Database"
  newContent.push(old[22])

  // Blocks 23-24: two paragraphs
  newContent.push(old[23], old[24])

  // Block 25 (columns): extract image as full-width + centered caption
  const streamlinedImg = extractImageFromColumns(old[25])
  const streamlinedCaption = extractTextFromColumns(old[25], 'textCenter')
  if (streamlinedImg) newContent.push(streamlinedImg)
  if (streamlinedCaption) newContent.push(streamlinedCaption)

  // Blocks 26-34: paragraph + video x3
  for (let i = 26; i <= 34; i++) {
    newContent.push(old[i])
  }

  // Block 35: divider
  newContent.push(old[35])

  // Block 36: sectionTitle "Anticipated Impact"
  newContent.push(old[36])

  // Blocks 37-43: paragraphs and list items (already correct in Sanity, just rendering issue)
  for (let i = 37; i <= 43; i++) {
    newContent.push(old[i])
  }

  // Block 44: divider
  newContent.push(old[44])

  // Block 45: sectionTitle "Footnotes"
  newContent.push(old[45])

  // Block 46: paragraph
  newContent.push(old[46])

  // Block 47: image
  newContent.push(old[47])

  // Block 48: divider
  newContent.push(old[48])

  // Block 49: sectionTitle "Authors"
  newContent.push(old[49])

  // Block 50: references
  newContent.push(old[50])

  console.log('New content blocks:', newContent.length)
  console.log('Removed:', doc.content.length - newContent.length, 'blocks')

  // Preview changes
  console.log('\n--- Changes ---')
  console.log('1. Title: "Eligibility Engine for Massachusetts" → "Transforming Service Access in Massachusetts"')
  console.log('2. Removed h2Large "Transforming Service Access..." (now the title)')
  console.log('3. Journey-map: columns → full-width image')
  console.log('4. Button "Download..." moved to after journey-map image')
  console.log('5. Quote → callout paragraphs')
  console.log('6. "Current Application Process" → textCenter')
  console.log('7. Common Data Elements: reordered (text → image → iframe)')
  console.log('8. Application-data: columns → full-width image + textCenter caption')
  console.log('9. Streamlined-process: columns → full-width image + textCenter caption')

  if (process.argv.includes('--write')) {
    await client
      .patch(doc._id)
      .set({
        title: 'Transforming Service Access in Massachusetts',
        content: newContent,
      })
      .commit()
    console.log('\n✓ Document updated successfully')
  } else {
    console.log('\nDry run. Pass --write to apply.')
  }
}

main().catch(console.error)
