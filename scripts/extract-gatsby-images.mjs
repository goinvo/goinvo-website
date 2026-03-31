/**
 * Extract all content images from Gatsby vision pages using Puppeteer,
 * upload them to Sanity, and insert them into the content at the right positions.
 *
 * Uses text context matching to determine where each image should be inserted.
 *
 * Usage:
 *   node scripts/extract-gatsby-images.mjs oral-history-goinvo         # dry run
 *   node scripts/extract-gatsby-images.mjs oral-history-goinvo --write  # apply
 *   node scripts/extract-gatsby-images.mjs --all                        # all pages
 *   node scripts/extract-gatsby-images.mjs --all --write                # apply all
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
const ALL = process.argv.includes('--all')
const SLUG_ARG = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])

function makeKey() { return randomUUID().slice(0, 12) }

/**
 * Page configs: slug → Gatsby URL + image extraction settings
 */
const PAGES = {
  'oral-history-goinvo': {
    gatsbyUrl: 'https://www.goinvo.com/features/an-oral-history/',
    // Images are interview photos interspersed with speaker quotes
    // They appear inside colored sidebar sections and between text blocks
    extractSelector: 'body img',
    minWidth: 50,
    skipPatterns: ['logo', 'chatlio', 'nav', 'footer', 'social'],
  },
  'bathroom-to-healthroom': {
    gatsbyUrl: 'https://www.goinvo.com/features/from-bathroom-to-healthroom/',
    extractSelector: 'body img',
    minWidth: 50,
    skipPatterns: ['logo', 'chatlio', 'nav', 'footer'],
  },
  'care-plans': {
    gatsbyUrl: 'https://www.goinvo.com/features/careplans/',
    extractSelector: 'body img',
    minWidth: 50,
    skipPatterns: ['logo', 'chatlio', 'nav', 'footer', 'contrib/'],
  },
  'digital-healthcare': {
    gatsbyUrl: 'https://www.goinvo.com/features/digital-healthcare/',
    extractSelector: 'body img',
    minWidth: 50,
    skipPatterns: ['logo', 'chatlio', 'nav', 'footer'],
  },
}

async function extractImagesFromGatsby(browser, config) {
  const page = await browser.newPage()
  await page.goto(config.gatsbyUrl, { waitUntil: 'networkidle2', timeout: 30000 })

  const images = await page.evaluate((selector, minWidth, skipPatterns) => {
    const results = []
    const allElements = document.querySelectorAll(selector)

    allElements.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < minWidth) return

      let src = ''
      if (el.tagName === 'IMG') {
        src = el.src
      } else if (el.tagName === 'SVG') {
        // Serialize inline SVG
        src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(el))
      }

      if (!src) return
      if (skipPatterns.some(p => src.toLowerCase().includes(p))) return

      // Get surrounding text context
      let prevText = ''
      let nextText = ''
      let parent = el.closest('div, section, article')
      if (parent) {
        const prev = parent.previousElementSibling
        if (prev) prevText = (prev.textContent || '').trim().substring(0, 100)
        const next = parent.nextElementSibling
        if (next) nextText = (next.textContent || '').trim().substring(0, 100)
      }

      results.push({
        index: i,
        src,
        alt: el.alt || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isDataUri: src.startsWith('data:'),
        prevText,
        nextText,
      })
    })

    return results
  }, config.extractSelector, config.minWidth, config.skipPatterns)

  await page.close()
  return images
}

async function uploadImage(src, filename) {
  try {
    let buffer, contentType
    if (src.startsWith('data:image/svg+xml;base64,')) {
      buffer = Buffer.from(src.replace('data:image/svg+xml;base64,', ''), 'base64')
      contentType = 'image/svg+xml'
    } else if (src.startsWith('data:')) {
      return null // skip other data URIs
    } else {
      const resp = await fetch(src)
      if (!resp.ok) { console.log(`      WARN: ${resp.status} fetching ${filename}`); return null }
      buffer = Buffer.from(await resp.arrayBuffer())
      contentType = resp.headers.get('content-type') || 'image/jpeg'
    }

    const asset = await client.assets.upload('image', buffer, { filename, contentType })
    return asset._id
  } catch (e) {
    console.log(`      WARN: Failed ${filename}: ${e.message}`)
    return null
  }
}

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function findInsertIndex(content, prevText, nextText) {
  if (!prevText && !nextText) return -1

  // Try matching prevText (text before the image on Gatsby)
  const prevNorm = prevText.toLowerCase().replace(/\s+/g, ' ').substring(0, 60)
  if (prevNorm.length > 10) {
    for (let i = 0; i < content.length; i++) {
      const blockText = getBlockText(content[i]).toLowerCase().replace(/\s+/g, ' ')
      if (blockText.includes(prevNorm) || prevNorm.includes(blockText.substring(0, 40))) {
        return i + 1 // Insert after the matching block
      }
    }
  }

  // Try matching nextText (text after the image on Gatsby)
  const nextNorm = nextText.toLowerCase().replace(/\s+/g, ' ').substring(0, 60)
  if (nextNorm.length > 10) {
    for (let i = 0; i < content.length; i++) {
      const blockText = getBlockText(content[i]).toLowerCase().replace(/\s+/g, ' ')
      if (blockText.includes(nextNorm) || nextNorm.includes(blockText.substring(0, 40))) {
        return i // Insert before the matching block
      }
    }
  }

  return -1
}

async function patchPage(slug, browser) {
  const config = PAGES[slug]
  if (!config) { console.log(`  ⚠ No config for "${slug}"`); return }

  console.log(`\n  📄 ${slug}`)
  console.log(`     Gatsby: ${config.gatsbyUrl}`)

  // 1. Extract images from Gatsby
  console.log('     Extracting images from Gatsby...')
  const images = await extractImagesFromGatsby(browser, config)
  console.log(`     Found ${images.length} content images`)

  if (images.length === 0) return

  // 2. Get current Sanity content
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug }
  )
  if (!feature) { console.log('     Not found in Sanity'); return }

  const existingImages = (feature.content || []).filter(b => b._type === 'image').length
  console.log(`     Sanity: ${feature.content?.length || 0} blocks, ${existingImages} existing images`)

  // 3. Filter to images not already in Sanity (by checking if src is already referenced)
  // Simple heuristic: if we already have most images, skip
  const content = feature.content || []

  // 4. Upload and insert images
  let uploaded = 0
  let inserted = 0
  const newContent = [...content]
  // Track insertion offset as we add blocks
  let offset = 0

  for (const img of images) {
    const filename = img.isDataUri
      ? `${slug}-svg-${img.index}.svg`
      : (img.src.split('/').pop()?.split('?')[0] || `image-${img.index}.jpg`)

    // Find where this image should go in the content
    const insertIdx = findInsertIndex(content, img.prevText, img.nextText)

    if (WRITE) {
      const assetId = await uploadImage(img.src, filename)
      if (!assetId) continue
      uploaded++

      const imageBlock = {
        _type: 'image',
        _key: makeKey(),
        alt: img.alt || img.prevText.substring(0, 80) || filename.replace(/\.\w+$/, ''),
        asset: { _type: 'reference', _ref: assetId },
        size: img.width > 600 ? 'full' : img.width > 300 ? 'large' : 'medium',
      }

      if (insertIdx >= 0) {
        newContent.splice(insertIdx + offset, 0, imageBlock)
        offset++
        inserted++
        console.log(`     ✓ ${filename} → inserted at block ${insertIdx}`)
      } else {
        // Can't find position — append before authors section
        const authorIdx = newContent.findIndex(b =>
          b._type === 'block' && (b.style === 'sectionTitle' || b.style === 'h2') &&
          (b.children || []).some(c => /authors?/i.test(c.text || ''))
        )
        const appendIdx = authorIdx > 0 ? authorIdx : newContent.length
        newContent.splice(appendIdx + offset, 0, imageBlock)
        offset++
        inserted++
        console.log(`     ✓ ${filename} → appended (no position match)`)
      }
    } else {
      const posInfo = insertIdx >= 0 ? `→ block ${insertIdx}` : '→ no match (append)'
      console.log(`     ${filename} (${img.width}x${img.height}) ${posInfo}`)
    }
  }

  if (WRITE && inserted > 0) {
    await client.patch(feature._id).set({ content: newContent }).commit()
    console.log(`     ✅ Uploaded ${uploaded}, inserted ${inserted} images`)
  } else if (!WRITE) {
    console.log(`     Would upload ${images.length} images`)
  }
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Extracting & uploading Gatsby images\n`)

  const browser = await puppeteer.launch({ headless: true })

  const slugs = ALL ? Object.keys(PAGES) : SLUG_ARG ? [SLUG_ARG] : []
  if (slugs.length === 0) {
    console.log('Usage: node scripts/extract-gatsby-images.mjs <slug> [--write]')
    console.log('       node scripts/extract-gatsby-images.mjs --all [--write]')
    console.log('\nAvailable:', Object.keys(PAGES).join(', '))
    await browser.close()
    return
  }

  for (const slug of slugs) {
    await patchPage(slug, browser)
  }

  await browser.close()
  if (!WRITE) console.log('\nRun with --write to upload and insert.')
}

main().catch(err => { console.error(err); process.exit(1) })
