/**
 * Extract inline SVGs from the Gatsby loneliness-in-our-human-code page
 * and upload them to Sanity as image assets.
 *
 * The Gatsby page has 31 data-URI SVGs (icons, illustrations) that need
 * to be extracted as .svg files, uploaded to Sanity, and inserted into
 * the feature's content blocks.
 *
 * Usage:
 *   node scripts/extract-loneliness-svgs.mjs             # extract + dry run
 *   node scripts/extract-loneliness-svgs.mjs --write      # extract + upload + patch
 */
import { createClient } from '@sanity/client'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
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
const SLUG = 'loneliness-in-our-human-code'
const OUT_DIR = 'scripts/extracted-svgs/loneliness'

function makeKey() { return randomUUID().slice(0, 12) }

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Extracting SVGs from ${SLUG}\n`)

  // 1. Extract SVGs from Gatsby page using Puppeteer
  console.log('Launching Puppeteer...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://www.goinvo.com/vision/loneliness-in-our-human-code/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  })

  const svgData = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('.app__body img[src^="data:image/svg"]').forEach((img, i) => {
      const r = img.getBoundingClientRect()
      if (r.width > 30) {
        // Decode the base64 SVG
        const src = img.src
        const base64 = src.replace(/^data:image\/svg\+xml;base64,/, '')
        const svgContent = atob(base64)

        // Try to find context (preceding heading or text)
        let context = ''
        let el = img.closest('div')
        while (el && !context) {
          const prev = el.previousElementSibling
          if (prev) {
            const text = prev.textContent?.trim().substring(0, 60)
            if (text) context = text
          }
          el = el.parentElement
        }

        results.push({
          index: i,
          width: Math.round(r.width),
          height: Math.round(r.height),
          svg: svgContent,
          context: context || `icon-${i}`,
        })
      }
    })
    return results
  })

  await browser.close()
  console.log(`Extracted ${svgData.length} SVGs\n`)

  // 2. Save SVGs to disk
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  for (const svg of svgData) {
    const filename = `loneliness-icon-${String(svg.index).padStart(2, '0')}.svg`
    const filepath = `${OUT_DIR}/${filename}`
    writeFileSync(filepath, svg.svg)
    console.log(`  Saved: ${filename} (${svg.width}x${svg.height}) — ${svg.context.substring(0, 50)}`)
    svg.filename = filename
    svg.filepath = filepath
  }

  console.log(`\nSaved ${svgData.length} SVGs to ${OUT_DIR}/`)

  // 3. Upload to Sanity and patch content
  if (!WRITE) {
    console.log('\nRun with --write to upload to Sanity and patch content.')
    return
  }

  console.log('\nUploading to Sanity...')
  const uploadedAssets = []
  for (const svg of svgData) {
    try {
      const buffer = Buffer.from(svg.svg)
      const asset = await client.assets.upload('image', buffer, {
        filename: svg.filename,
        contentType: 'image/svg+xml',
      })
      uploadedAssets.push({ ...svg, assetId: asset._id })
      console.log(`  Uploaded: ${svg.filename} → ${asset._id}`)
    } catch (err) {
      console.log(`  WARN: Failed to upload ${svg.filename}: ${err.message}`)
    }
  }

  console.log(`\nUploaded ${uploadedAssets.length}/${svgData.length} SVGs`)

  // 4. Fetch current Sanity content and insert image blocks
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Feature not found'); return }

  // Insert SVG images into the content — add them as a grid after the first content section
  // The SVGs are icons that appear throughout the article in various positions.
  // For simplicity, we'll add them as individual image blocks interspersed through content.
  const content = feature.content || []
  const imageBlocks = uploadedAssets.map(a => ({
    _type: 'image',
    _key: makeKey(),
    alt: a.context.substring(0, 100),
    asset: { _type: 'reference', _ref: a.assetId },
    size: 'small',
  }))

  // Find good insertion points — after text blocks that match the SVG context
  // For now, append all SVG images before the author section
  const authorIdx = content.findIndex(b =>
    b._type === 'block' && (b.style === 'sectionTitle' || b.style === 'h2') &&
    (b.children || []).some(c => /authors?/i.test(c.text || ''))
  )
  const insertIdx = authorIdx > 0 ? authorIdx : content.length

  const patched = [
    ...content.slice(0, insertIdx),
    ...imageBlocks,
    ...content.slice(insertIdx),
  ]

  await client.patch(feature._id).set({ content: patched }).commit()
  console.log(`✅ Inserted ${imageBlocks.length} SVG image blocks into content`)
}

main().catch(err => { console.error(err); process.exit(1) })
