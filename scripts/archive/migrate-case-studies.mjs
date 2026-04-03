/**
 * Migration Script: Gatsby MDX Case Studies → Sanity
 *
 * Parses all 26 MDX case study files from the Gatsby project,
 * converts them to Sanity documents with Portable Text content,
 * uploads hero images from CloudFront, and creates documents via the API.
 *
 * Usage: node scripts/migrate-case-studies.mjs
 */

import { createClient } from '@sanity/client'
import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import https from 'https'
import http from 'http'

// ─── Config ──────────────────────────────────────────────────────────────────
const PROJECT_ID = 'a1wsimxr'
const DATASET = 'production'
const TOKEN = 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu'
const CDN_BASE = 'https://dd17w042cevyt.cloudfront.net'
const GATSBY_DIR = 'c:/Users/quest/Programming/GoInvo/goinvo.com/src/case-studies'

// Display order from case-study-order.json
const DISPLAY_ORDER = [
  'ipsos-facto', 'prior-auth', 'public-sector', 'all-of-us', 'mitre-shr',
  'maya-ehr', 'mass-snap', 'wuxi-nextcode-familycode',
  'mitre-state-of-us-healthcare', '3m-coderyte', 'hgraph', 'partners-insight',
  'mitre-flux-notes', 'commonhealth-smart-health-cards',
  'fastercures-health-data-basics', 'mount-sinai-consent', 'inspired-ehrs',
  'ahrq-cds', 'infobionic-heart-monitoring', 'personal-genome-project-vision',
  'staffplan', 'care-cards', 'partners-geneinsight',
  'insidetracker-nutrition-science', 'paintrackr', 'tabeeb-diagnostics',
]

// Category slug → display title mapping
const CATEGORY_MAP = {
  'health-it-and-infrastructure': 'Health IT & Infrastructure',
  'enterprise': 'Enterprise',
  'healthcare': 'Healthcare',
  'medical-research': 'Medical Research',
  'open-source': 'Open Source',
  'government': 'Government',
  'AI': 'AI',
  'public-health-and-policy': 'Public Health & Policy',
  'patient-engagement': 'Patient Engagement',
  'care-management': 'Care Management',
  'precision-medicine-and-genomics': 'Precision Medicine & Genomics',
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateKey() {
  return Math.random().toString(36).slice(2, 14)
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, (res) => {
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

// ─── Parse MDX frontmatter ──────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }

  const yamlStr = match[1]
  const body = match[2]
  const meta = {}

  // Simple YAML parser for our known structure
  let currentKey = null
  let currentArray = null

  /** Strip surrounding single or double quotes from a YAML value. */
  function stripQuotes(s) {
    if (!s) return s
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      return s.slice(1, -1)
    }
    return s
  }

  for (const line of yamlStr.split('\n')) {
    // Array item
    const arrayItem = line.match(/^\s+-\s+["']?(.*?)["']?\s*$/)
    if (arrayItem && currentArray) {
      currentArray.push(stripQuotes(arrayItem[1]))
      continue
    }

    // Object in array (for results/references)
    const objectField = line.match(/^\s+(\w+)\s*:\s*["']?(.*?)["']?\s*$/)
    if (objectField && currentArray && currentArray.length > 0) {
      const last = currentArray[currentArray.length - 1]
      if (typeof last === 'object') {
        last[objectField[1]] = stripQuotes(objectField[2])
      }
      continue
    }

    // New array object start
    const arrayObjStart = line.match(/^\s+-\s+(\w+)\s*:\s*["']?(.*?)["']?\s*$/)
    if (arrayObjStart && currentArray) {
      const obj = {}
      obj[arrayObjStart[1]] = stripQuotes(arrayObjStart[2])
      currentArray.push(obj)
      continue
    }

    // Top-level key
    const keyVal = line.match(/^(\w+)\s*:\s*["']?(.*?)["']?\s*$/)
    if (keyVal) {
      const key = keyVal[1]
      let val = stripQuotes(keyVal[2])

      // Check if this starts an array (next line is array item)
      if (val === '') {
        currentKey = key
        currentArray = []
        meta[key] = currentArray
        continue
      }

      // Boolean
      if (val === 'true') val = true
      else if (val === 'false') val = false

      meta[key] = val
      currentKey = key
      currentArray = null
    }
  }

  return { meta, body }
}

// ─── MDX → Portable Text conversion ────────────────────────────────────────

/** Collect a multi-line JSX component starting at index i until closing `/>`. */
function collectComponent(lines, startIdx) {
  let block = lines[startIdx].trim()
  let idx = startIdx
  if (!block.includes('/>')) {
    idx++
    while (idx < lines.length && !lines[idx].includes('/>')) {
      block += ' ' + lines[idx].trim()
      idx++
    }
    if (idx < lines.length) block += ' ' + lines[idx].trim()
  }
  return { block, endIdx: idx }
}

/** Extract a LightboxGallery image from collected component text. */
function parseLightboxGallery(componentText) {
  const imgSrc = componentText.match(/image="([^"]*)"/)
  const imgAlt = componentText.match(/alt="([^"]*)"/)
  if (!imgSrc) return null
  return {
    _type: 'image',
    _key: generateKey(),
    _sanityAsset: `image@${CDN_BASE}${imgSrc[1]}`,
    alt: imgAlt ? imgAlt[1] : '',
  }
}

function mdxToPortableText(body, meta) {
  // Remove import statements
  const lines = body
    .replace(/^import .+$/gm, '')
    .trim()
    .split('\n')

  const blocks = []
  let i = 0

  // ── Strip duplicate title at the start ──
  // In Gatsby, the body `# Title` IS the visible title. Our page template
  // renders the title from metadata, so the body's h1 is redundant.
  // Skip it, and also skip the "for CLIENT" line if it follows.
  while (i < lines.length && lines[i].trim() === '') i++
  if (i < lines.length && lines[i].match(/^#\s+/)) {
    i++ // skip the h1 title line
    // Skip blank lines after the h1
    while (i < lines.length && lines[i].trim() === '') i++
    // Skip "for CLIENT" line (case-insensitive match against frontmatter client)
    if (i < lines.length && meta.client) {
      const nextTrimmed = lines[i].trim()
      if (nextTrimmed.toLowerCase() === `for ${meta.client}`.toLowerCase()) {
        i++
      }
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
    if (trimmed === '') {
      i++
      continue
    }

    // Divider component
    if (trimmed.match(/^<Divider\s*\/?>$/)) {
      blocks.push({
        _type: 'divider',
        _key: generateKey(),
        style: 'default',
      })
      i++
      continue
    }

    // Quote component (multi-line)
    const quoteStart = line.match(/<Quote\s+quotee="([^"]*)"(?:\s+quoteeSub="([^"]*)")?/)
    if (quoteStart) {
      let quoteText = ''
      i++
      while (i < lines.length && !lines[i].includes('</Quote>')) {
        quoteText += lines[i].trim() + ' '
        i++
      }
      i++ // skip </Quote>
      blocks.push({
        _type: 'quote',
        _key: generateKey(),
        text: quoteText.trim(),
        author: quoteStart[1],
        role: quoteStart[2] || '',
      })
      continue
    }

    // Video component (multi-line) — extract webm/mov sources + poster
    if (trimmed.startsWith('<Video')) {
      const { block: videoBlock, endIdx } = collectComponent(lines, i)
      i = endIdx

      // Extract all src values and prefer webm over mov
      const allSrcs = [...videoBlock.matchAll(/src:\s*'([^']*)'/g)]
      const webmSrc = allSrcs.find((m) => m[1].endsWith('.webm'))
      const movSrc = allSrcs.find((m) => m[1].endsWith('.mov'))
      const videoSrc = webmSrc?.[1] || movSrc?.[1] || allSrcs[0]?.[1] || ''

      const posterMatch = videoBlock.match(/poster="([^"]*)"/)

      blocks.push({
        _type: 'videoEmbed',
        _key: generateKey(),
        url: videoSrc ? CDN_BASE + videoSrc : '',
        poster: posterMatch ? CDN_BASE + posterMatch[1] : '',
        caption: '',
      })
      i++
      continue
    }

    // ── Column groups: <div class="pure-u-lg-1-N"> ──
    // Detect consecutive column wrapper divs and group their images into
    // a Sanity `columns` block for side-by-side rendering.
    const colDivMatch = trimmed.match(/^<div\s+class="pure-u[^"]*-(\d+)-(\d+)"/)
    if (colDivMatch) {
      const totalCols = parseInt(colDivMatch[2])
      const columnImages = []

      // Collect all consecutive column divs
      while (i < lines.length) {
        const curTrimmed = lines[i].trim()
        if (!curTrimmed.match(/^<div\s+class="pure-u/)) break

        // Advance past the opening <div>
        i++
        // Scan inside the div for LightboxGallery or images
        while (i < lines.length) {
          const inner = lines[i].trim()
          if (inner.match(/^<\/div>/)) {
            i++
            break
          }
          if (inner.match(/<LightboxGallery/)) {
            const { block: lbBlock, endIdx } = collectComponent(lines, i)
            i = endIdx + 1
            const img = parseLightboxGallery(lbBlock)
            if (img) columnImages.push(img)
            continue
          }
          i++
        }
      }

      if (columnImages.length > 0) {
        blocks.push({
          _type: 'columns',
          _key: generateKey(),
          layout: String(totalCols),
          content: columnImages,
        })
      }

      // Check for caption immediately after the column group
      if (i < lines.length) {
        const capMatch = lines[i].trim().match(/^<p[^>]*text--caption[^>]*>(.*?)<\/p>$/)
        if (capMatch) {
          const capText = capMatch[1].replace(/<[^>]+>/g, '').replace(/^_|_$/g, '').trim()
          if (capText && blocks.length > 0) {
            const prev = blocks[blocks.length - 1]
            if (prev._type === 'columns') {
              prev.caption = capText
            }
          }
          i++
        }
      }
      continue
    }

    // LightboxGallery component (standalone, full-width) → image block
    const lbMatch = trimmed.match(/<LightboxGallery/)
    if (lbMatch) {
      const { block: lbBlock, endIdx } = collectComponent(lines, i)
      i = endIdx
      const imgSrc = lbBlock.match(/image="([^"]*)"/)
      const imgAlt = lbBlock.match(/alt="([^"]*)"/)
      if (imgSrc) {
        blocks.push({
          _type: 'image',
          _key: generateKey(),
          _sanityAsset: `image@${CDN_BASE}${imgSrc[1]}`,
          alt: imgAlt ? imgAlt[1] : '',
          caption: '',
          size: 'large',
        })
      }
      i++
      continue
    }

    // Generic <div> wrappers — skip tags, process inner content on next iteration
    if (trimmed.match(/^<div\b[^>]*>/) || trimmed.match(/^<\/div>/)) {
      i++
      continue
    }

    // <p> with caption class → caption for preceding image/video/columns
    const captionP = trimmed.match(/^<p[^>]*class="[^"]*text--caption[^"]*"[^>]*>(.*?)<\/p>$/)
    if (captionP) {
      let capText = captionP[1].replace(/<[^>]+>/g, '').replace(/^_|_$/g, '').trim()
      if (capText && blocks.length > 0) {
        const prev = blocks[blocks.length - 1]
        if (prev._type === 'image' || prev._type === 'videoEmbed' || prev._type === 'columns') {
          prev.caption = capText
        } else {
          blocks.push(makeTextBlock(capText, 'normal'))
        }
      }
      i++
      continue
    }

    // Heading (h2/h3/h4)
    const h2Match = line.match(/^##\s+(.+)$/)
    const h3Match = line.match(/^###\s+(.+)$/)
    const h4Match = line.match(/^####\s+(.+)$/)

    if (h2Match || h3Match || h4Match) {
      const text = (h2Match || h3Match || h4Match)[1]
      const style = h2Match ? 'h2' : h3Match ? 'h3' : 'h4'
      blocks.push(makeTextBlock(text, style))
      i++
      continue
    }

    // Heading with # (h1 → h2 since page template renders the h1)
    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match) {
      blocks.push(makeTextBlock(h1Match[1], 'h2'))
      i++
      continue
    }

    // Image: ![alt](/path)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const alt = imgMatch[1]
      const src = imgMatch[2]
      let caption = ''
      if (i + 1 < lines.length && lines[i + 1].match(/^_(.+)_$/)) {
        caption = lines[i + 1].match(/^_(.+)_$/)[1]
        i++
      }
      blocks.push({
        _type: 'image',
        _key: generateKey(),
        _sanityAsset: `image@${CDN_BASE}${src}`,
        alt: alt || caption || '',
        caption: caption,
        size: 'large',
      })
      i++
      continue
    }

    // Italic-only line (standalone caption without preceding image)
    if (line.match(/^_(.+)_$/) && blocks.length > 0 && blocks[blocks.length - 1]._type === 'image') {
      i++
      continue
    }

    // List items: - text (bullet list)
    if (trimmed.match(/^-\s+/)) {
      while (i < lines.length && lines[i].trim().match(/^-\s+/)) {
        const itemText = lines[i].trim().replace(/^-\s+/, '')
        const parsed = parseInlineMarkdown(itemText)
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          children: parsed.children,
          markDefs: parsed.markDefs,
        })
        i++
      }
      continue
    }

    // <span> metadata lines (Time, Tags)
    if (trimmed.startsWith('<span')) {
      const textContent = line.replace(/<[^>]+>/g, '').trim()
      if (textContent) {
        blocks.push(makeTextBlock(textContent, 'normal'))
      }
      i++
      continue
    }

    // Other HTML elements (p tags, sup, etc.) — extract text content
    if (trimmed.startsWith('<') && !trimmed.startsWith('<Divider') && !trimmed.startsWith('<Quote') && !trimmed.startsWith('<Video') && !trimmed.startsWith('<LightboxGallery')) {
      const textContent = line.replace(/<[^>]+>/g, '').replace(/^_|_$/g, '').trim()
      if (textContent) {
        blocks.push(makeTextBlock(textContent, 'normal'))
      }
      i++
      continue
    }

    // Regular paragraph — collect multi-line paragraphs
    let para = line
    i++
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      para += ' ' + lines[i].trim()
      i++
    }
    blocks.push(makeTextBlock(para.trim(), 'normal'))
  }

  return blocks
}

function isBlockStart(line) {
  const trimmed = line.trim()
  return (
    line.match(/^#{1,4}\s/) ||
    line.match(/^!\[/) ||
    trimmed.match(/^</) ||
    trimmed.match(/^-\s+/) ||
    trimmed === ''
  )
}

function makeTextBlock(text, style = 'normal') {
  // Parse inline markdown: **bold**, *italic*, [link](url), `code`
  const spans = parseInlineMarkdown(text)

  return {
    _type: 'block',
    _key: generateKey(),
    style,
    children: spans.children,
    markDefs: spans.markDefs,
  }
}

function parseInlineMarkdown(text) {
  const children = []
  const markDefs = []

  // Strip &mdash; etc
  text = text
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<sup>.*?<\/sup>/g, '') // Strip superscript ref markers
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags

  // Simple regex-based inline parsing
  // We'll tokenize: **bold**, *italic*, [text](url), plain text
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index)
      if (plain) {
        children.push({
          _type: 'span',
          _key: generateKey(),
          text: plain,
          marks: [],
        })
      }
    }

    if (match[1]) {
      // Bold: **text**
      children.push({
        _type: 'span',
        _key: generateKey(),
        text: match[2],
        marks: ['strong'],
      })
    } else if (match[3]) {
      // Italic: *text*
      children.push({
        _type: 'span',
        _key: generateKey(),
        text: match[4],
        marks: ['em'],
      })
    } else if (match[5]) {
      // Link: [text](url)
      const linkKey = generateKey()
      markDefs.push({
        _type: 'link',
        _key: linkKey,
        href: match[7],
        blank: match[7].startsWith('http'),
      })
      children.push({
        _type: 'span',
        _key: generateKey(),
        text: match[6],
        marks: [linkKey],
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining.trim()) {
      children.push({
        _type: 'span',
        _key: generateKey(),
        text: remaining,
        marks: [],
      })
    }
  }

  // If no children were added, add the whole text as plain
  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: generateKey(),
      text: text,
      marks: [],
    })
  }

  return { children, markDefs }
}

// ─── Image upload ───────────────────────────────────────────────────────────

const imageCache = new Map()

async function uploadImageFromUrl(imageUrl) {
  if (imageCache.has(imageUrl)) return imageCache.get(imageUrl)

  const fullUrl = imageUrl.startsWith('http') ? imageUrl : CDN_BASE + imageUrl
  console.log(`  📷 Uploading: ${fullUrl}`)

  try {
    const buffer = await fetchBuffer(fullUrl)
    const filename = basename(imageUrl)
    const asset = await client.assets.upload('image', buffer, { filename })
    const ref = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
    imageCache.set(imageUrl, ref)
    return ref
  } catch (err) {
    console.error(`  ⚠️  Failed to upload ${fullUrl}: ${err.message}`)
    return null
  }
}

// ─── Upload images referenced in portable text ──────────────────────────────

async function uploadPortableTextImages(blocks) {
  for (const block of blocks) {
    if (block._type === 'image' && block._sanityAsset) {
      const url = block._sanityAsset.replace('image@', '')
      try {
        const buffer = await fetchBuffer(url)
        const filename = basename(url)
        const asset = await client.assets.upload('image', buffer, { filename })
        block.asset = { _type: 'reference', _ref: asset._id }
        delete block._sanityAsset
      } catch (err) {
        console.error(`  ⚠️  Failed to upload inline image ${url}: ${err.message}`)
        // Remove the broken image block
        block._type = 'block'
        block.style = 'normal'
        block.children = [{ _type: 'span', _key: generateKey(), text: `[Image: ${block.alt || 'unavailable'}]`, marks: [] }]
        block.markDefs = []
        delete block._sanityAsset
        delete block.alt
        delete block.caption
        delete block.size
      }
    }
    // Recursively handle images inside columns
    if (block._type === 'columns' && block.content) {
      await uploadPortableTextImages(block.content)
    }
  }
}

// ─── Main migration ─────────────────────────────────────────────────────────

async function run() {
  console.log('🚀 Starting case study migration...\n')

  // Step 1: Create categories
  console.log('📂 Creating categories...')
  const categoryIds = {}

  for (const [slug, title] of Object.entries(CATEGORY_MAP)) {
    const id = `category-${slug}`
    await client.createOrReplace({
      _id: id,
      _type: 'category',
      title,
      slug: { _type: 'slug', current: slug },
    })
    categoryIds[slug] = id
    console.log(`  ✓ ${title} (${slug})`)
  }
  console.log('')

  // Step 2: Parse all MDX files
  console.log('📄 Parsing MDX files...')
  const files = readdirSync(GATSBY_DIR).filter((f) => f.endsWith('.mdx'))
  const caseStudies = []

  for (const file of files) {
    const slug = file.replace('.mdx', '')
    const content = readFileSync(join(GATSBY_DIR, file), 'utf-8')
    const { meta, body } = parseFrontmatter(content)
    const portableText = mdxToPortableText(body, meta)

    caseStudies.push({ slug, meta, portableText })
    console.log(`  ✓ Parsed: ${slug} — "${meta.title}"`)
  }
  console.log('')

  // Step 3: Create case study documents (without upNext first)
  console.log('📝 Creating case study documents...')
  const caseStudyIdMap = {} // slug → _id

  for (const cs of caseStudies) {
    const slug = cs.slug
    const order = DISPLAY_ORDER.indexOf(slug)
    const docId = `caseStudy-${slug}`
    caseStudyIdMap[slug] = docId

    console.log(`\n─── ${slug} (order: ${order >= 0 ? order + 1 : 'unlisted'}) ───`)

    // Upload hero image
    let heroImage = null
    if (cs.meta.image) {
      heroImage = await uploadImageFromUrl(cs.meta.image)
    }

    // Upload inline images in portable text
    await uploadPortableTextImages(cs.portableText)

    // Build categories array
    const categories = (cs.meta.categories || []).map((catSlug) => {
      const catId = categoryIds[catSlug]
      if (!catId) {
        console.log(`  ⚠️  Unknown category: ${catSlug}`)
        return null
      }
      return { _type: 'reference', _ref: catId, _key: generateKey() }
    }).filter(Boolean)

    // Build results array (from frontmatter)
    const results = (cs.meta.results || [])
      .filter((r) => typeof r === 'object')
      .map((r) => ({
        _type: 'object',
        _key: generateKey(),
        stat: r.stat || '',
        description: r.description || '',
      }))

    // Build references array (from frontmatter)
    const references = (cs.meta.references || [])
      .filter((r) => typeof r === 'object')
      .map((r) => ({
        _type: 'object',
        _key: generateKey(),
        title: r.title || '',
        link: r.link || '',
      }))

    const doc = {
      _id: docId,
      _type: 'caseStudy',
      title: cs.meta.title || slug,
      slug: { _type: 'slug', current: slug },
      client: cs.meta.client || '',
      caption: cs.meta.caption || '',
      hidden: cs.meta.hidden === true,
      metaDescription: cs.meta.metaDescription || '',
      order: order >= 0 ? order + 1 : 99,
      content: cs.portableText,
    }

    if (heroImage) doc.image = heroImage
    if (categories.length > 0) doc.categories = categories
    if (results.length > 0) doc.results = results
    if (references.length > 0) doc.references = references

    await client.createOrReplace(doc)
    console.log(`  ✅ Created: ${cs.meta.title}`)
  }

  // Step 4: Set upNext references
  console.log('\n\n🔗 Setting upNext references...')
  for (const cs of caseStudies) {
    const upNextSlugs = cs.meta.upNext || []
    if (upNextSlugs.length === 0) continue

    const upNext = upNextSlugs
      .map((refSlug) => {
        const refId = caseStudyIdMap[refSlug]
        if (!refId) {
          console.log(`  ⚠️  upNext ref not found: ${refSlug} (in ${cs.slug})`)
          return null
        }
        return { _type: 'reference', _ref: refId, _key: generateKey() }
      })
      .filter(Boolean)

    if (upNext.length > 0) {
      await client.patch(caseStudyIdMap[cs.slug]).set({ upNext }).commit()
      console.log(`  ✓ ${cs.slug} → [${upNextSlugs.join(', ')}]`)
    }
  }

  console.log('\n\n✅ Migration complete!')
  console.log(`   ${caseStudies.length} case studies created`)
  console.log(`   ${Object.keys(categoryIds).length} categories created`)
  console.log(`   ${imageCache.size} images uploaded`)
}

run().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
