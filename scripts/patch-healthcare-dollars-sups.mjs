/**
 * Fix healthcare-dollars list items by adding back superscript reference numbers.
 *
 * The previous migration stripped the <sup> reference numbers from list items.
 * This script re-extracts the full data from Gatsby (with superscripts) and
 * patches the existing list blocks in Sanity.
 *
 * Usage:
 *   node scripts/patch-healthcare-dollars-sups.mjs          # dry run
 *   node scripts/patch-healthcare-dollars-sups.mjs --write   # apply
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

function buildListBlock(boldText, restText, supNumbers, level = 1) {
  const refLinkKey = makeKey()
  const children = []

  if (boldText) {
    children.push({ _type: 'span', _key: makeKey(), marks: ['strong'], text: boldText })
  }
  children.push({ _type: 'span', _key: makeKey(), marks: [], text: restText })

  // Add superscript references
  for (const num of supNumbers) {
    children.push({
      _type: 'span',
      _key: makeKey(),
      marks: [refLinkKey, 'sup'],
      text: num,
    })
  }

  return {
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level,
    markDefs: supNumbers.length > 0 ? [{
      _key: refLinkKey,
      _type: 'link',
      href: '#references',
    }] : [],
    children,
  }
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Fixing healthcare-dollars superscripts\n`)

  // 1. Extract list items with superscripts from Gatsby
  console.log('Extracting from Gatsby...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://www.goinvo.com/vision/healthcare-dollars/', { waitUntil: 'networkidle2', timeout: 30000 })

  const allItems = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('ul').forEach(ul => {
      if (ul.closest('.header-nav, .footer, .mobile-nav, .social-links')) return
      const items = Array.from(ul.querySelectorAll(':scope > li')).map(li => {
        const strong = li.querySelector(':scope > strong')
        const boldText = strong ? strong.textContent.trim() : ''

        // Get sup elements with their reference numbers
        const sups = Array.from(li.querySelectorAll(':scope > sup')).map(s => s.textContent.trim())

        // Get text between strong and sup
        let restText = ''
        const nodes = li.childNodes
        let afterStrong = !strong
        for (const node of nodes) {
          if (node === strong) { afterStrong = true; continue }
          if (node.nodeName === 'SUP') continue
          if (node.nodeName === 'UL') continue
          if (afterStrong) restText += node.textContent || ''
        }
        restText = restText.trim()

        // Check for nested UL
        const nestedUl = li.querySelector(':scope > ul')
        const nested = nestedUl ? Array.from(nestedUl.querySelectorAll(':scope > li')).map(nli => {
          const ns = nli.querySelector(':scope > strong')
          const nSups = Array.from(nli.querySelectorAll(':scope > sup')).map(s => s.textContent.trim())
          let nRest = ''
          for (const n of nli.childNodes) {
            if (n === ns || n.nodeName === 'SUP' || n.nodeName === 'UL') continue
            nRest += n.textContent || ''
          }
          return { bold: ns ? ns.textContent.trim() : '', rest: nRest.trim(), sups: nSups }
        }) : []

        return { bold: boldText, rest: restText, sups, nested }
      })
      results.push(items)
    })
    return results
  })

  await browser.close()

  const totalItems = allItems.reduce((s, l) => s + l.reduce((s2, i) => s2 + 1 + i.nested.length, 0), 0)
  const totalSups = allItems.reduce((s, l) => s + l.reduce((s2, i) => s2 + i.sups.length + i.nested.reduce((s3, n) => s3 + n.sups.length, 0), 0), 0)
  console.log(`Found ${allItems.length} lists, ${totalItems} items, ${totalSups} superscript references\n`)

  // 2. Build Portable Text list blocks with superscripts
  const listBlocks = []
  for (const list of allItems) {
    for (const item of list) {
      listBlocks.push(buildListBlock(item.bold, item.rest ? ', ' + item.rest : '', item.sups))
      for (const nested of item.nested) {
        listBlocks.push(buildListBlock(nested.bold, nested.rest ? ', ' + nested.rest : '', nested.sups, 2))
      }
    }
  }

  console.log(`Generated ${listBlocks.length} list blocks with superscripts`)

  // 3. Fetch Sanity content and replace existing list blocks
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); return }

  const content = feature.content || []
  const firstListIdx = content.findIndex(b => b.listItem)
  const lastListIdx = content.length - 1 - [...content].reverse().findIndex(b => b.listItem)

  if (firstListIdx < 0) {
    console.log('No existing list blocks found')
    return
  }

  console.log(`Replacing blocks ${firstListIdx}–${lastListIdx} (${lastListIdx - firstListIdx + 1} blocks) with ${listBlocks.length} new blocks`)

  // Preview a few items
  listBlocks.slice(0, 3).forEach((b, i) => {
    const text = b.children.map(c => c.text).join('')
    const hasSup = b.children.some(c => c.marks?.includes('sup'))
    console.log(`  ${i}: ${text.substring(0, 80)}${hasSup ? ' [has sup]' : ''}`)
  })

  if (WRITE) {
    const patched = [
      ...content.slice(0, firstListIdx),
      ...listBlocks,
      ...content.slice(lastListIdx + 1),
    ]
    await client.patch(feature._id).set({ content: patched }).commit()
    console.log(`\n✅ Applied — ${patched.length} total blocks`)
  } else {
    console.log('\nRun with --write to apply.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
