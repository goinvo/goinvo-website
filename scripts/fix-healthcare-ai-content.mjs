#!/usr/bin/env node
/**
 * Re-migrate truncated content in healthcare-ai from the Gatsby source.
 * Compares each paragraph between Gatsby (puppeteer extraction) and Sanity,
 * patches any truncated text.
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function main() {
  // Step 1: Extract all paragraph text from Gatsby
  console.log('Extracting text from Gatsby...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://www.goinvo.com/vision/healthcare-ai/', { waitUntil: 'networkidle2', timeout: 30000 })
  await page.evaluate(async () => {
    for (let i = 0; i < document.body.scrollHeight; i += 500) {
      window.scrollTo(0, i)
      await new Promise(r => setTimeout(r, 100))
    }
  })

  const gatsbyParas = await page.evaluate(() => {
    const main = document.querySelector('.app__body') || document.body
    return Array.from(main.querySelectorAll('p, li')).filter(el => {
      const text = el.textContent.trim()
      return text.length > 20 && !el.closest('header,nav,footer,form')
    }).map(el => el.textContent.trim().replace(/\s+/g, ' '))
  })

  await browser.close()
  console.log(`Found ${gatsbyParas.length} paragraphs on Gatsby`)

  // Step 2: Get Sanity content
  const doc = await client.fetch(`*[_type == 'feature' && slug.current == 'healthcare-ai'][0]{ _id, content }`)

  // Step 3: Compare and patch truncated text
  let patches = 0

  function getAllBlocks(content) {
    const blocks = []
    for (const block of content) {
      if (block._type === 'block' && block.children) {
        blocks.push(block)
      }
      if (block._type === 'backgroundSection' && block.content) {
        blocks.push(...getAllBlocks(block.content))
      }
      if (block._type === 'columns' && block.content) {
        for (const item of block.content) {
          if (item._type === 'block' && item.children) {
            blocks.push(item)
          }
        }
      }
    }
    return blocks
  }

  const sanityBlocks = getAllBlocks(doc.content)

  for (const block of sanityBlocks) {
    const sanityText = block.children.map(c => c.text || '').join('').trim()
    if (sanityText.length < 20) continue

    // Find the matching Gatsby paragraph by prefix (first 30 chars)
    const prefix = sanityText.substring(0, 30).toLowerCase().replace(/\s+/g, ' ')
    const gatsbyMatch = gatsbyParas.find(g =>
      g.toLowerCase().replace(/\s+/g, ' ').startsWith(prefix)
    )

    if (!gatsbyMatch) continue

    const gatsbyClean = gatsbyMatch.replace(/\s+/g, ' ').trim()
    const sanityClean = sanityText.replace(/\s+/g, ' ').trim()

    // Check if Sanity text is truncated (shorter than Gatsby by more than 10 chars)
    if (gatsbyClean.length > sanityClean.length + 10) {
      const diff = gatsbyClean.length - sanityClean.length
      console.log(`\nTRUNCATED (-${diff} chars):`)
      console.log(`  Sanity:  "${sanityClean.substring(0, 60)}..." (${sanityClean.length})`)
      console.log(`  Gatsby:  "${gatsbyClean.substring(0, 60)}..." (${gatsbyClean.length})`)

      // Patch: replace the first span's text with the full Gatsby text
      // This is a simple approach — it loses any inline marks (bold, links) in the added text
      if (block.children.length === 1) {
        block.children[0].text = gatsbyClean
        patches++
        console.log(`  → PATCHED`)
      } else {
        // Multiple children (has inline formatting) — patch the last span to add missing text
        const lastSpan = block.children[block.children.length - 1]
        const currentEnd = sanityClean
        const gatsbyEnd = gatsbyClean.substring(currentEnd.length)
        if (gatsbyEnd.length > 0) {
          lastSpan.text = lastSpan.text + gatsbyEnd
          patches++
          console.log(`  → PATCHED (appended to last span)`)
        }
      }
    }
  }

  if (patches > 0) {
    if (process.argv.includes('--write')) {
      await client.patch(doc._id).set({ content: doc.content }).commit()
      console.log(`\n✓ Patched ${patches} truncated paragraphs`)
    } else {
      console.log(`\nDry run: ${patches} paragraphs would be patched. Use --write to apply.`)
    }
  } else {
    console.log('\nNo truncated paragraphs found.')
  }
}

main().catch(console.error)
