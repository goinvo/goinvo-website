/**
 * Add missing bullet lists to open-pro in Sanity.
 *
 * The Gatsby page has 16+ UL lists (under Progress, Limitations, Challenges,
 * Goals, Components, etc.) that were stored as flat paragraphs in Sanity.
 * This script extracts them from Gatsby and inserts them after the matching
 * heading blocks in Sanity content.
 *
 * Usage:
 *   node scripts/patch-open-pro-lists.mjs          # dry run
 *   node scripts/patch-open-pro-lists.mjs --write   # apply
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
const SLUG = 'open-pro'

function makeKey() { return randomUUID().slice(0, 12) }

function makeListItem(text, supNumbers = [], level = 1) {
  const children = [{ _type: 'span', _key: makeKey(), marks: [], text }]

  const markDefs = []
  if (supNumbers.length > 0) {
    const linkKey = makeKey()
    markDefs.push({ _key: linkKey, _type: 'link', href: '#references' })
    for (const num of supNumbers) {
      children.push({ _type: 'span', _key: makeKey(), marks: [linkKey, 'sup'], text: num })
    }
  }

  return {
    _type: 'block', _key: makeKey(), style: 'normal',
    listItem: 'bullet', level, markDefs, children,
  }
}

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Adding lists to ${SLUG}\n`)

  // 1. Extract lists from Gatsby
  console.log('Extracting lists from Gatsby...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://www.goinvo.com/vision/open-pro/', { waitUntil: 'networkidle2', timeout: 30000 })

  const gatsbyLists = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('ul').forEach(ul => {
      if (ul.closest('.header-nav, .footer, .mobile-nav, .social-links, .client-logos')) return
      const prev = ul.previousElementSibling
      const prevText = prev ? prev.textContent.trim().substring(0, 80) : ''
      const items = Array.from(ul.querySelectorAll(':scope > li')).map(li => {
        const sups = Array.from(li.querySelectorAll(':scope > sup, :scope > a > sup')).map(s => s.textContent.trim())
        let text = ''
        li.childNodes.forEach(n => {
          if (n.nodeName === 'SUP') return
          if (n.nodeName === 'A' && n.querySelector('sup')) return
          text += n.textContent || ''
        })
        return { text: text.trim(), sups }
      })
      if (items.length > 0) results.push({ anchor: prevText, items })
    })
    return results
  })

  await browser.close()
  console.log(`Found ${gatsbyLists.length} lists\n`)

  // 2. Fetch Sanity content
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); return }

  // Check if lists already exist
  const hasLists = (feature.content || []).some(b => b.listItem)
  if (hasLists) { console.log('Lists already exist — skipping.'); return }

  const content = feature.content || []
  const result = []

  // 3. Insert lists after matching anchor text in Sanity content
  for (let i = 0; i < content.length; i++) {
    result.push(content[i])
    const blockText = getBlockText(content[i])
    if (!blockText) continue

    for (const list of gatsbyLists) {
      if (!list.anchor) continue
      // Match if the block text starts with the anchor text (first 30 chars)
      const anchor = list.anchor.substring(0, 30).toLowerCase()
      if (blockText.toLowerCase().startsWith(anchor) || blockText.toLowerCase().includes(anchor)) {
        console.log(`  + ${list.items.length} items after "${blockText.substring(0, 50)}..."`)
        for (const item of list.items) {
          result.push(makeListItem(item.text, item.sups))
        }
        // Mark as used so we don't insert twice
        list.anchor = ''
        break
      }
    }
  }

  const added = result.length - content.length
  console.log(`\nTotal: ${added} list items added (${content.length} → ${result.length} blocks)`)

  if (WRITE && added > 0) {
    await client.patch(feature._id).set({ content: result }).commit()
    console.log('✅ Applied')
  } else if (added > 0) {
    console.log('Run with --write to apply.')
  } else {
    console.log('No matching anchors found — check content.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
