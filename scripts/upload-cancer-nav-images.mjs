/**
 * Upload 14 problem/solution images to Sanity and insert them into
 * the national-cancer-navigation feature document content.
 *
 * Images: 1-prob.png through 7-prob.png and 1-solve.png through 7-solve.png
 * Insertion point: after the paragraph following "7 Underlying Problems" heading
 *
 * The renderer's groupConsecutiveImages() automatically pairs consecutive top-level
 * image blocks side-by-side, so we insert them as 14 flat image blocks.
 *
 * Usage:
 *   node scripts/upload-cancer-nav-images.mjs          # live run
 *   node scripts/upload-cancer-nav-images.mjs --dry-run # preview only
 */

import { createClient } from '@sanity/client'
import https from 'https'
import http from 'http'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const CDN_BASE = 'https://dd17w042cevyt.cloudfront.net'
const IMAGE_PATH = '/images/features/national-cancer-navigation'

// Alt text for each image (Gatsby source had no alt text; using descriptive labels)
const altText = {
  '1-prob': 'Problem 1: Fragmented care coordination',
  '1-solve': 'Solution 1: Integrated patient navigation',
  '2-prob': 'Problem 2: Delayed diagnosis and detection',
  '2-solve': 'Solution 2: Streamlined diagnostic pathways',
  '3-prob': 'Problem 3: Financial toxicity and cost barriers',
  '3-solve': 'Solution 3: Financial navigation and assistance',
  '4-prob': 'Problem 4: Mental health and psychosocial distress',
  '4-solve': 'Solution 4: Integrated mental health support',
  '5-prob': 'Problem 5: Health disparities and inequitable access',
  '5-solve': 'Solution 5: Equitable, culturally competent care',
  '6-prob': 'Problem 6: Inadequate patient education and communication',
  '6-solve': 'Solution 6: Clear patient education and shared decision-making',
  '7-prob': 'Problem 7: Lack of standardized health records',
  '7-solve': 'Solution 7: Portable, shareable standardized health record',
}

function randomKey() {
  return Math.random().toString(36).slice(2, 14)
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'sanity-migration/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function uploadImage(filename) {
  const url = `${CDN_BASE}${IMAGE_PATH}/${filename}`
  console.log(`  Uploading: ${url}`)
  const buffer = await fetchBuffer(url)
  const asset = await client.assets.upload('image', buffer, {
    contentType: 'image/png',
    filename,
  })
  console.log(`  -> Asset ID: ${asset._id}`)
  return asset._id
}

async function main() {
  // Fetch the document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "national-cancer-navigation"][0]{
      _id, title, content
    }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Found document: ${doc._id} ("${doc.title}")`)
  console.log(`Content blocks: ${doc.content.length}`)

  // Print all block summaries to help identify structure
  console.log('\nDocument structure:')
  doc.content.forEach((block, i) => {
    if (block._type === 'block') {
      const text = (block.children || []).map(c => c.text || '').join('').slice(0, 80)
      console.log(`  [${i}] block(${block.style || 'normal'}): ${text}`)
    } else {
      console.log(`  [${i}] ${block._type}`)
    }
  })

  // Find the insertion point: after the paragraph following "7 Underlying Problems" heading
  // In the Gatsby source, the paragraph starts "Our research aims to organize..."
  let insertAfterIdx = -1
  for (let i = 0; i < doc.content.length; i++) {
    const block = doc.content[i]
    if (block._type === 'block') {
      const text = (block.children || []).map(c => c.text || '').join('')
      if (text.includes('7 Underlying Problems')) {
        console.log(`\nFound "7 Underlying Problems" heading at index ${i}`)
        // Look for the paragraph after this heading
        for (let j = i + 1; j < doc.content.length; j++) {
          const next = doc.content[j]
          if (next._type === 'block') {
            const nextText = (next.children || []).map(c => c.text || '').join('')
            // Insert after the "Our research aims..." paragraph
            if (nextText.includes('Our research aims') || nextText.includes('research aims')) {
              insertAfterIdx = j
              console.log(`Inserting after block [${j}]: "${nextText.slice(0, 60)}..."`)
              break
            }
          }
        }
        // Fallback: if no "Our research aims" paragraph found, insert right after the heading
        if (insertAfterIdx === -1) {
          insertAfterIdx = i
          console.log(`Fallback: inserting after the heading at index ${i}`)
        }
        break
      }
    }
  }

  // Second fallback: look for "CancerNavigator@goinvo.com" mention in the same paragraph
  if (insertAfterIdx === -1) {
    for (let i = 0; i < doc.content.length; i++) {
      const block = doc.content[i]
      if (block._type === 'block') {
        const text = (block.children || []).map(c => c.text || '').join('')
        if (text.includes('CancerNavigator@goinvo.com')) {
          insertAfterIdx = i
          console.log(`\nFound CancerNavigator email paragraph at index ${i}, inserting after it`)
          break
        }
      }
    }
  }

  if (insertAfterIdx === -1) {
    console.error('\nCould not find insertion point! Please review the document structure above.')
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would upload 14 images and insert them as 14 consecutive image blocks.')
    console.log('The renderer will auto-pair them into 7 side-by-side columns.')
    console.log('\nImages to upload:')
    for (let i = 1; i <= 7; i++) {
      console.log(`  ${i}-prob.png  (${altText[`${i}-prob`]})`)
      console.log(`  ${i}-solve.png (${altText[`${i}-solve`]})`)
    }
    return
  }

  // Upload all 14 images
  console.log('\nUploading 14 images...')
  const assetIds = {}
  for (let i = 1; i <= 7; i++) {
    const probFile = `${i}-prob.png`
    const solveFile = `${i}-solve.png`
    assetIds[`${i}-prob`] = await uploadImage(probFile)
    assetIds[`${i}-solve`] = await uploadImage(solveFile)
  }

  console.log('\nAll images uploaded. Building image blocks...')

  // Build 14 flat top-level image blocks (prob then solve for each pair).
  // The PortableTextRenderer's groupConsecutiveImages() will auto-pair
  // each prob+solve into a 2-column side-by-side layout at render time.
  const imageBlocks = []
  for (let i = 1; i <= 7; i++) {
    imageBlocks.push({
      _type: 'image',
      _key: randomKey(),
      asset: { _type: 'reference', _ref: assetIds[`${i}-prob`] },
      alt: altText[`${i}-prob`],
      size: 'full',
    })
    imageBlocks.push({
      _type: 'image',
      _key: randomKey(),
      asset: { _type: 'reference', _ref: assetIds[`${i}-solve`] },
      alt: altText[`${i}-solve`],
      size: 'full',
    })
  }

  console.log(`Built ${imageBlocks.length} image blocks`)

  // Splice the image blocks in after insertAfterIdx
  const newContent = [
    ...doc.content.slice(0, insertAfterIdx + 1),
    ...imageBlocks,
    ...doc.content.slice(insertAfterIdx + 1),
  ]

  console.log(`\nUpdating document (${doc.content.length} -> ${newContent.length} blocks)...`)

  await client
    .patch(doc._id)
    .set({ content: newContent })
    .commit()

  console.log('Done! Document updated successfully.')
  console.log(`Inserted ${imageBlocks.length} image blocks after content index ${insertAfterIdx}`)
  console.log('The renderer will auto-pair them into 7 side-by-side prob/solve columns.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
