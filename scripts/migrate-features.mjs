/**
 * Migration Script: Gatsby Vision/Feature Pages → Sanity
 *
 * Reads features.json for metadata, parses React JSX from internal vision pages
 * to extract text content as Portable Text, uploads hero images from CloudFront,
 * and creates feature documents via the Sanity API.
 *
 * Usage: node scripts/migrate-features.mjs
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import https from 'https'
import http from 'http'

// ─── Config ──────────────────────────────────────────────────────────────────
const PROJECT_ID = 'a1wsimxr'
const DATASET = 'production'
const TOKEN = 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu'
const CDN_BASE = 'https://dd17w042cevyt.cloudfront.net'
const GATSBY_DIR = 'c:/Users/quest/Programming/GoInvo/goinvo.com/src'
const FEATURES_JSON = join(GATSBY_DIR, 'data/features.json')
const VISION_PAGES_DIR = join(GATSBY_DIR, 'pages/vision')

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function uploadImage(imageUrl) {
  try {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : CDN_BASE + imageUrl
    console.log(`  📷 Uploading: ${fullUrl}`)
    const buffer = await fetchBuffer(fullUrl)
    const ext = fullUrl.split('.').pop().split('?')[0].toLowerCase()
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      ext === 'svg' ? 'image/svg+xml' :
      'image/jpeg'
    const asset = await client.assets.upload('image', buffer, {
      contentType,
      filename: fullUrl.split('/').pop(),
    })
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
  } catch (err) {
    console.log(`  ⚠️  Failed to upload ${imageUrl}: ${err.message}`)
    return null
  }
}

function randomKey() {
  return Math.random().toString(36).slice(2, 14)
}

// ─── JSX Content Parser ─────────────────────────────────────────────────────
// Extracts text content from React JSX into Portable Text blocks.
// Handles common patterns: headings, paragraphs, images, dividers, videos.
// Skips interactive components (charts, carousels, etc.)

function parseJsxContent(source) {
  const blocks = []

  // Extract the render() method's JSX content
  const renderMatch = source.match(/render\s*\(\s*\)\s*\{[\s\S]*?return\s*\(([\s\S]*)\)\s*\}\s*\}/)
  if (!renderMatch) return blocks

  const jsx = renderMatch[1]

  // Extract frontmatter
  const frontmatterMatch = source.match(/const\s+frontmatter\s*=\s*\{([\s\S]*?)\}/)
  let metaTitle = ''
  let metaDescription = ''

  if (frontmatterMatch) {
    const fm = frontmatterMatch[1]
    const titleMatch = fm.match(/metaTitle\s*:\s*['"`]([\s\S]*?)['"`]/)
    if (titleMatch) metaTitle = titleMatch[1]
    const descMatch = fm.match(/metaDescription\s*:\s*['"`]([\s\S]*?)['"`]/)
    if (descMatch) metaDescription = descMatch[1]
  }

  // Parse paragraph blocks: <p ...>content</p>
  // Parse heading blocks: <h1-h4 ...>content</h1-h4>
  // Parse image blocks: <Image src="..." />
  // Parse divider blocks: <Divider />
  // Parse video elements

  const tagRegex = /<(h[1-4]|p|Image|Divider|Video|video)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g

  let match
  while ((match = tagRegex.exec(jsx)) !== null) {
    const tag = match[1]
    const attrs = match[2] || ''
    const innerHtml = match[3] || ''

    if (tag === 'Divider') {
      blocks.push({
        _type: 'divider',
        _key: randomKey(),
      })
      continue
    }

    if (tag === 'Image') {
      const srcMatch = attrs.match(/src="([^"]+)"/) || attrs.match(/src=\{[^}]*['"`]([^'"`]+)['"`]/)
      const altMatch = attrs.match(/alt="([^"]*)"/)
      const captionMatch = attrs.match(/caption="([^"]*)"/)

      if (srcMatch) {
        const src = srcMatch[1] || srcMatch[2]
        blocks.push({
          _type: 'image',
          _key: randomKey(),
          _imageSrc: src, // temporary, will be uploaded later
          alt: altMatch ? altMatch[1] : '',
          caption: captionMatch ? captionMatch[1] : '',
        })
      }
      continue
    }

    if (tag === 'Video' || tag === 'video') {
      // Try to extract video source
      const srcMatch = attrs.match(/src="([^"]+)"/) || attrs.match(/src=\{[^}]*['"`]([^'"`]+)['"`]/)
      const sourceMatch = innerHtml.match(/src="([^"]+)"/) || innerHtml.match(/src=\{[^}]*['"`]([^'"`]+)['"`]/)
      const videoSrc = srcMatch ? (srcMatch[1] || srcMatch[2]) : sourceMatch ? (sourceMatch[1] || sourceMatch[2]) : null

      if (videoSrc) {
        const fullUrl = videoSrc.startsWith('http') ? videoSrc : CDN_BASE + videoSrc
        blocks.push({
          _type: 'videoEmbed',
          _key: randomKey(),
          url: fullUrl,
        })
      }
      continue
    }

    // Headings
    if (tag.match(/^h[1-4]$/)) {
      const level = tag
      const text = cleanJsxText(innerHtml)
      if (text.trim()) {
        blocks.push({
          _type: 'block',
          _key: randomKey(),
          style: level === 'h1' ? 'h2' : level === 'h4' ? 'h3' : level,
          markDefs: [],
          children: parseInlineContent(innerHtml),
        })
      }
      continue
    }

    // Paragraphs
    if (tag === 'p') {
      const text = cleanJsxText(innerHtml)
      if (text.trim()) {
        // Check if it's a caption
        const isCaption = attrs.includes('caption')
        if (isCaption && blocks.length > 0 && blocks[blocks.length - 1]._type === 'image') {
          // Attach caption to previous image
          blocks[blocks.length - 1].caption = text.trim()
          continue
        }

        blocks.push({
          _type: 'block',
          _key: randomKey(),
          style: 'normal',
          markDefs: [],
          children: parseInlineContent(innerHtml),
        })
      }
      continue
    }
  }

  return { blocks, metaTitle, metaDescription }
}

function cleanJsxText(html) {
  return html
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/\{[^}]*\}/g, '') // strip JSX expressions
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

function parseInlineContent(html) {
  const children = []
  let remaining = html
    .replace(/\{['"`]\s*['"`]\}/g, '') // remove empty JSX string expressions
    .replace(/<br\s*\/?>/g, '\n')

  // Simple regex-based inline parser
  const inlineRegex = /<(strong|b|em|i|a)\b([^>]*)>([\s\S]*?)<\/\1>/g
  let lastIndex = 0
  let inlineMatch

  while ((inlineMatch = inlineRegex.exec(remaining)) !== null) {
    // Text before this match
    const before = remaining.slice(lastIndex, inlineMatch.index)
    const beforeText = cleanJsxText(before)
    if (beforeText) {
      children.push({
        _type: 'span',
        _key: randomKey(),
        marks: [],
        text: beforeText,
      })
    }

    const inlineTag = inlineMatch[1]
    const inlineAttrs = inlineMatch[2]
    const innerText = cleanJsxText(inlineMatch[3])

    if (innerText) {
      const marks = []
      if (inlineTag === 'strong' || inlineTag === 'b') marks.push('strong')
      if (inlineTag === 'em' || inlineTag === 'i') marks.push('em')

      if (inlineTag === 'a') {
        const hrefMatch = inlineAttrs.match(/href="([^"]+)"/)
        if (hrefMatch) {
          const linkKey = randomKey()
          // We'll need to add markDefs to the parent block
          children.push({
            _type: 'span',
            _key: randomKey(),
            marks: [linkKey],
            text: innerText,
            _linkDef: { _type: 'link', _key: linkKey, href: hrefMatch[1] },
          })
          lastIndex = inlineMatch.index + inlineMatch[0].length
          continue
        }
      }

      children.push({
        _type: 'span',
        _key: randomKey(),
        marks,
        text: innerText,
      })
    }

    lastIndex = inlineMatch.index + inlineMatch[0].length
  }

  // Remaining text after last match
  const after = remaining.slice(lastIndex)
  const afterText = cleanJsxText(after)
  if (afterText) {
    children.push({
      _type: 'span',
      _key: randomKey(),
      marks: [],
      text: afterText,
    })
  }

  // If no children were found, add the whole text as a span
  if (children.length === 0) {
    const text = cleanJsxText(html)
    if (text) {
      children.push({
        _type: 'span',
        _key: randomKey(),
        marks: [],
        text,
      })
    }
  }

  return children
}

// Post-process blocks to extract link markDefs from spans
function finalizeBlocks(blocks) {
  return blocks.map((block) => {
    if (block._type !== 'block') return block

    const markDefs = [...(block.markDefs || [])]
    const children = (block.children || []).map((child) => {
      if (child._linkDef) {
        markDefs.push(child._linkDef)
        const { _linkDef, ...rest } = child
        return rest
      }
      return child
    })

    return { ...block, markDefs, children }
  })
}

// ─── Main Migration ──────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting vision/feature migration...\n')

  // Read features.json
  const featuresJson = JSON.parse(readFileSync(FEATURES_JSON, 'utf-8'))
  console.log(`📂 Found ${featuresJson.length} features in features.json\n`)

  // First, delete existing feature documents to avoid duplicates
  console.log('🗑️  Checking for existing feature documents...')
  const existing = await client.fetch('*[_type == "feature"]{ _id }')
  if (existing.length > 0) {
    console.log(`  Deleting ${existing.length} existing feature documents...`)
    for (const doc of existing) {
      await client.delete(doc._id)
    }
    console.log('  ✅ Cleared existing features\n')
  }

  // Process each feature
  const results = { created: 0, errors: 0, imagesUploaded: 0 }

  for (let i = 0; i < featuresJson.length; i++) {
    const feature = featuresJson[i]
    const slug = feature.id
    const order = i + 1

    console.log(`\n─── ${slug} (order: ${order}) ───`)

    // Determine if this is an internal page
    const isInternalVision = feature.link?.startsWith('/vision/')
    const isExternal = feature.externalLink === true || (!isInternalVision && feature.link?.startsWith('http'))

    // Upload hero image
    let heroImage = null
    if (feature.image) {
      // Check if it's a video URL (not an image)
      if (feature.image.endsWith('.mp4') || feature.image.endsWith('.webm')) {
        console.log(`  📹 Hero is video: ${feature.image}`)
      } else {
        heroImage = await uploadImage(feature.image)
        if (heroImage) results.imagesUploaded++
      }
    }

    // Parse content from JSX for internal pages
    let contentBlocks = []
    let metaDescription = ''
    let metaTitle = ''

    if (isInternalVision) {
      const visionSlug = feature.link.replace('/vision/', '').replace(/\/$/, '')
      const jsxPath = join(VISION_PAGES_DIR, visionSlug, 'index.js')

      if (existsSync(jsxPath)) {
        console.log(`  📄 Parsing JSX: ${visionSlug}/index.js`)
        const source = readFileSync(jsxPath, 'utf-8')
        const parsed = parseJsxContent(source)
        contentBlocks = parsed.blocks || []
        metaDescription = parsed.metaDescription || ''
        metaTitle = parsed.metaTitle || ''

        // Upload inline images
        for (let b = 0; b < contentBlocks.length; b++) {
          if (contentBlocks[b]._type === 'image' && contentBlocks[b]._imageSrc) {
            const uploaded = await uploadImage(contentBlocks[b]._imageSrc)
            if (uploaded) {
              const caption = contentBlocks[b].caption
              const alt = contentBlocks[b].alt
              contentBlocks[b] = {
                ...uploaded,
                _key: contentBlocks[b]._key,
                alt: alt || '',
                caption: caption || '',
              }
              results.imagesUploaded++
            } else {
              // Remove failed images
              contentBlocks[b] = null
            }
          }
        }
        contentBlocks = contentBlocks.filter(Boolean)
        contentBlocks = finalizeBlocks(contentBlocks)

        console.log(`  📝 Extracted ${contentBlocks.length} content blocks`)
      } else {
        console.log(`  ⚠️  No index.js found at ${jsxPath}`)
      }
    }

    // Build the external link URL
    let externalLinkUrl = null
    if (isExternal) {
      externalLinkUrl = feature.link
    }

    // Build video URL
    let videoUrl = null
    if (feature.video) {
      videoUrl = feature.video.startsWith('http')
        ? feature.video
        : CDN_BASE + feature.video
    }

    // Filter out empty categories
    const categories = (feature.categories || []).filter((c) => c && c.trim())

    // Create the document
    const doc = {
      _type: 'feature',
      title: feature.title,
      slug: { _type: 'slug', current: slug },
      description: feature.caption || '',
      categories: categories.length > 0 ? categories : undefined,
      date: feature.date || undefined,
      client: feature.client || 'Feature',
      hiddenWorkPage: feature.hiddenWorkPage || false,
      order,
      metaDescription: metaDescription || feature.caption || '',
    }

    if (heroImage) doc.image = heroImage
    if (externalLinkUrl) doc.externalLink = externalLinkUrl
    if (videoUrl) doc.video = videoUrl
    if (contentBlocks.length > 0) doc.content = contentBlocks

    try {
      await client.create(doc)
      console.log(`  ✅ Created: ${feature.title}`)
      results.created++
    } catch (err) {
      console.log(`  ❌ Error creating ${slug}: ${err.message}`)
      results.errors++
    }
  }

  console.log('\n\n✅ Migration complete!')
  console.log(`   ${results.created} features created`)
  console.log(`   ${results.imagesUploaded} images uploaded`)
  if (results.errors > 0) console.log(`   ${results.errors} errors`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
