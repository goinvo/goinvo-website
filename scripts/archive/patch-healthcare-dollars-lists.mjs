/**
 * Convert flat paragraph text to structured bullet lists for healthcare-dollars.
 *
 * The Sanity content has blocks like "Column 1, National health expenditure
 * section $3,500B , 2017 National Health Expenditure 1" which should be
 * proper bullet lists with bold dollar amounts.
 *
 * Usage:
 *   node scripts/patch-healthcare-dollars-lists.mjs          # dry run
 *   node scripts/patch-healthcare-dollars-lists.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'
import puppeteer from 'puppeteer'
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
const SLUG = 'healthcare-dollars'

function makeKey() { return randomUUID().slice(0, 12) }

function makeBoldListItem(boldText, restText, level = 1) {
  const strongKey = makeKey()
  return {
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level,
    markDefs: [],
    children: [
      { _type: 'span', _key: makeKey(), marks: ['strong'], text: boldText },
      { _type: 'span', _key: makeKey(), marks: [], text: restText },
    ],
  }
}

function makeListItem(text, level = 1) {
  return {
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level,
    markDefs: [],
    children: [{ _type: 'span', _key: makeKey(), marks: [], text }],
  }
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Converting healthcare-dollars methodology to lists\n`)

  // 1. Extract list data from Gatsby using Puppeteer
  console.log('Extracting lists from Gatsby...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://www.goinvo.com/vision/healthcare-dollars/', { waitUntil: 'networkidle2', timeout: 30000 })

  const lists = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('ul').forEach((ul) => {
      if (ul.closest('.header-nav, .footer, .mobile-nav, .social-links')) return
      const items = Array.from(ul.querySelectorAll(':scope > li')).map(li => {
        const strong = li.querySelector('strong')
        const boldText = strong ? strong.textContent.trim() : ''
        // Get text after the bold part
        let restText = ''
        if (strong) {
          const fullText = li.textContent.trim()
          const boldIdx = fullText.indexOf(boldText)
          restText = fullText.substring(boldIdx + boldText.length).trim()
          // Clean up superscript numbers at end
          restText = restText.replace(/(\d+)$/, '')
        } else {
          restText = li.textContent.trim()
        }
        // Check for nested ULs
        const nestedUl = li.querySelector('ul')
        const nestedItems = nestedUl ? Array.from(nestedUl.querySelectorAll(':scope > li')).map(nli => {
          const ns = nli.querySelector('strong')
          return {
            bold: ns ? ns.textContent.trim() : '',
            rest: ns ? nli.textContent.trim().substring(nli.textContent.trim().indexOf(ns.textContent.trim()) + ns.textContent.trim().length).trim().replace(/(\d+)$/, '') : nli.textContent.trim(),
          }
        }) : []
        return { bold: boldText, rest: restText, nested: nestedItems }
      })
      if (items.length > 0) results.push(items)
    })
    return results
  })

  await browser.close()
  console.log(`Found ${lists.length} lists with ${lists.reduce((s, l) => s + l.length, 0)} total items\n`)

  // 2. Build Portable Text list blocks from extracted data
  const listBlocks = []
  for (const list of lists) {
    for (const item of list) {
      if (item.bold) {
        listBlocks.push(makeBoldListItem(item.bold, ', ' + item.rest))
      } else {
        listBlocks.push(makeListItem(item.rest))
      }
      // Add nested items at level 2
      for (const nested of item.nested) {
        if (nested.bold) {
          listBlocks.push(makeBoldListItem(nested.bold, ', ' + nested.rest, 2))
        } else {
          listBlocks.push(makeListItem(nested.rest, 2))
        }
      }
    }
  }

  console.log(`Generated ${listBlocks.length} list item blocks`)

  // 3. Fetch Sanity content and replace the flat "Column" paragraphs
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); return }

  console.log(`Sanity: "${feature.title}" — ${feature.content?.length || 0} blocks`)

  // Check if lists already exist
  const hasLists = (feature.content || []).some(b => b.listItem)
  if (hasLists) {
    console.log('Lists already exist — skipping.')
    return
  }

  const content = feature.content || []

  // Find the "Column" paragraph blocks (blocks that start with "Column")
  const columnIndices = []
  content.forEach((b, i) => {
    if (b._type === 'block') {
      const text = (b.children || []).map(c => c.text || '').join('')
      if (text.startsWith('Column ')) {
        columnIndices.push(i)
      }
    }
  })

  console.log(`Found ${columnIndices.length} "Column" paragraph blocks to replace`)

  if (columnIndices.length === 0) {
    console.log('No Column paragraphs found — inserting lists after Methodology heading')
    // Insert after the Methodology sectionTitle
    const methIdx = content.findIndex(b =>
      b._type === 'block' && (b.style === 'sectionTitle') &&
      (b.children || []).some(c => /methodology/i.test(c.text || ''))
    )
    if (methIdx >= 0) {
      const patched = [
        ...content.slice(0, methIdx + 1),
        ...listBlocks,
        ...content.slice(methIdx + 1),
      ]
      if (WRITE) {
        await client.patch(feature._id).set({ content: patched }).commit()
        console.log(`✅ Inserted ${listBlocks.length} list blocks after Methodology`)
      } else {
        console.log(`Would insert ${listBlocks.length} list blocks after Methodology`)
      }
    }
    return
  }

  // Replace the Column paragraphs with list blocks
  const firstCol = columnIndices[0]
  const lastCol = columnIndices[columnIndices.length - 1]

  const patched = [
    ...content.slice(0, firstCol),
    ...listBlocks,
    ...content.slice(lastCol + 1),
  ]

  const removed = lastCol - firstCol + 1
  const added = listBlocks.length
  console.log(`Replacing ${removed} "Column" blocks with ${added} list item blocks`)

  if (WRITE) {
    await client.patch(feature._id).set({ content: patched }).commit()
    console.log(`✅ Applied — ${patched.length} total blocks`)
  } else {
    console.log('Run with --write to apply.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
