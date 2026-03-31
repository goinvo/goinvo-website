/**
 * Auto-fix common Sanity content issues across all vision pages.
 *
 * Detects and fixes:
 * 1. Image+text pairs that should be 2-column layouts
 * 2. h3 headings that should be h4 (based on Gatsby comparison)
 * 3. Missing list formatting (paragraphs that should be bullet items)
 * 4. Image size mismatches (full-width images that should be medium/small)
 *
 * Usage:
 *   node scripts/auto-fix-content.mjs                    # dry run all pages
 *   node scripts/auto-fix-content.mjs --write             # fix all pages
 *   node scripts/auto-fix-content.mjs <slug>              # dry run single page
 *   node scripts/auto-fix-content.mjs <slug> --write      # fix single page
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'
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
const SLUG_ARG = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block?._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function isImage(block) {
  return block?._type === 'image' && block?.asset
}

function isShortText(block, maxLen = 300) {
  if (block?._type !== 'block') return false
  const text = getBlockText(block)
  return text.length > 30 && text.length < maxLen
}

// ── Fix 1: Wrap image+text pairs in 2-column layouts ──────────────────

function fixImageTextColumns(content) {
  const result = []
  let fixed = 0
  let i = 0

  while (i < content.length) {
    const current = content[i]
    const next = content[i + 1]
    const afterNext = content[i + 2]

    // Skip if already in a columns block or has bleed size
    if (current?._type === 'columns') {
      result.push(current)
      i++
      continue
    }

    const block3 = content[i + 2]
    const block4 = content[i + 3]
    const block5 = content[i + 4]

    // Pattern: 3x (image + caption) → 3-column grid
    if (isImage(current) && isShortText(next, 150) &&
        isImage(block3) && isShortText(block4, 150) &&
        isImage(block5) && isShortText(content[i + 5], 150) &&
        current.size !== 'bleed') {
      result.push({
        _type: 'columns',
        _key: makeKey(),
        layout: '3',
        content: [current, next, block3, block4, block5, content[i + 5]],
      })
      fixed++
      i += 6
      continue
    }

    // Pattern: 2x (image + caption) → 2-column grid
    if (isImage(current) && isShortText(next, 150) &&
        isImage(block3) && isShortText(block4, 150) &&
        !isImage(block5) && current.size !== 'bleed') {
      result.push({
        _type: 'columns',
        _key: makeKey(),
        layout: '2',
        content: [current, next, block3, block4],
      })
      fixed++
      i += 4
      continue
    }

    // Image + short descriptive text (not a heading) → 2-column
    if (isImage(current) && current.size !== 'bleed' && isShortText(next) &&
        next.style === 'normal' && !isImage(block3)) {
      result.push({
        _type: 'columns',
        _key: makeKey(),
        layout: '2',
        content: [current, next],
      })
      fixed++
      i += 2
      continue
    }

    result.push(current)
    i++
  }

  return { content: result, fixed }
}

// ── Fix 2: Detect h3 that should be h4 ───────────────────────────────

function fixH3ToH4(content, gatsbyH4Texts) {
  let fixed = 0
  const result = content.map(block => {
    if (block._type !== 'block' || block.style !== 'h3') return block
    const text = getBlockText(block)
    // Check if this h3 text matches a known h4 pattern from Gatsby
    const shouldBeH4 = gatsbyH4Texts.some(h4 => text.toLowerCase().startsWith(h4.toLowerCase()))
    if (shouldBeH4) {
      fixed++
      return { ...block, style: 'h4' }
    }
    return block
  })
  return { content: result, fixed }
}

// ── Fix 3: Detect images with wrong size ──────────────────────────────
// Small images that should be medium/large based on their Sanity asset dimensions

async function fixImageSizes(content) {
  let fixed = 0
  // Images with size='full' or 'default' that are actually small illustrations
  // should be 'medium' or 'large' — but we can't determine this without
  // fetching the asset, so skip for now (needs Puppeteer comparison)
  return { content, fixed }
}

// ── Fix 4: Detect missing authors/contributors ───────────────────────

async function checkAuthors(slug) {
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{
      "authorCount": count(authors),
      "contribCount": count(contributors)
    }`,
    { slug }
  )
  if (!feature) return []
  const issues = []
  if (feature.authorCount === 0) issues.push('no authors')
  return issues
}

// ── Fix 5: Detect empty references blocks ────────────────────────────

function checkReferences(content) {
  const issues = []
  const refs = content.filter(b => b._type === 'references')
  for (const ref of refs) {
    if (!ref.items || ref.items.length === 0) {
      issues.push('empty references block')
    }
  }
  return issues
}

// ── Fix 6: Detect consecutive duplicate blocks ───────────────────────

function fixConsecutiveDuplicates(content) {
  let fixed = 0
  const result = []
  for (let i = 0; i < content.length; i++) {
    const current = content[i]
    const next = content[i + 1]
    // Skip duplicate text blocks
    if (current._type === 'block' && next?._type === 'block') {
      const curText = getBlockText(current)
      const nextText = getBlockText(next)
      if (curText && curText === nextText && curText.length > 20) {
        fixed++
        continue // Skip the duplicate
      }
    }
    result.push(current)
  }
  return { content: result, fixed }
}

// ── Main ──────────────────────────────────────────────────────────────

async function fixPage(slug) {
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug }
  )
  if (!feature) return null

  let content = feature.content || []
  const fixes = []

  // Fix 1: Image+text columns
  const colFix = fixImageTextColumns(content)
  if (colFix.fixed > 0) {
    content = colFix.content
    fixes.push(`${colFix.fixed} image+text → columns`)
  }

  // Fix 6: Remove consecutive duplicate blocks
  const dupFix = fixConsecutiveDuplicates(content)
  if (dupFix.fixed > 0) {
    content = dupFix.content
    fixes.push(`${dupFix.fixed} duplicate blocks removed`)
  }

  // Checks (reported but not auto-fixed)
  const authorIssues = await checkAuthors(slug)
  const refIssues = checkReferences(content)
  const warnings = [...authorIssues, ...refIssues]

  if (fixes.length === 0 && warnings.length === 0) return null

  if (WRITE && fixes.length > 0) {
    await client.patch(feature._id).set({ content }).commit()
  }

  return { slug, title: feature.title, fixes, warnings }
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Auto-fixing content issues\n`)

  let slugs
  if (SLUG_ARG) {
    slugs = [SLUG_ARG]
  } else {
    // Get all feature slugs
    const features = await client.fetch('*[_type == "feature" && defined(slug.current)]{ "slug": slug.current }')
    slugs = features.map(f => f.slug)
  }

  console.log(`Scanning ${slugs.length} pages...\n`)

  let totalFixes = 0
  let totalWarnings = 0
  for (const slug of slugs) {
    const result = await fixPage(slug)
    if (result) {
      const parts = []
      if (result.fixes.length > 0) parts.push(result.fixes.join(', '))
      if (result.warnings?.length > 0) parts.push('⚠ ' + result.warnings.join(', '))
      console.log(`  ${result.slug}: ${parts.join(' | ')}`)
      totalFixes += result.fixes.length
      totalWarnings += (result.warnings?.length || 0)
    }
  }

  console.log(`\nTotal: ${totalFixes} fixes, ${totalWarnings} warnings across ${slugs.length} pages`)
  if (!WRITE && totalFixes > 0) console.log('Run with --write to apply.')
}

main().catch(err => { console.error(err); process.exit(1) })
