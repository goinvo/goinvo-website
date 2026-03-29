/**
 * Automatically patch superscript marks into Sanity Portable Text content
 * by comparing against the Gatsby source JSX.
 *
 * Strategy:
 * 1. Parse Gatsby JSX for each slug to find all <sup> occurrences and the
 *    text that immediately precedes each one.
 * 2. Fetch the Sanity document for that slug.
 * 3. Walk all text blocks and find spans whose text ends with a superscript
 *    number that should be marked as "sup".
 * 4. Split those spans: regular text + sup-marked number span.
 *
 * Usage:
 *   node scripts/patch-superscripts-auto.mjs               # dry run (default)
 *   DRY_RUN=false node scripts/patch-superscripts-auto.mjs  # actually patch
 *   node scripts/patch-superscripts-auto.mjs <slug>         # single slug
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

// ─── Config ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN !== 'false'

const TARGET_SLUGS = [
  'coronavirus',
  'living-health-lab',
  'open-pro',
  'patient-centered-consent',
  'virtual-care',
]

const GATSBY_VISION_DIR =
  'C:/Users/quest/Programming/GoInvo/goinvo.com/src/pages/vision'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const newKey = () => randomUUID().replace(/-/g, '').slice(0, 12)

/**
 * Parse Gatsby JSX source and extract superscript "signals":
 * objects describing the text just before each <sup> and the sup content.
 *
 * We handle three JSX patterns:
 *   text<sup>N</sup>
 *   text<sup><a href="#references">N</a></sup>
 *   text<sup>,</sup>  (comma separator between Reference components — skip)
 *   <Reference>N</Reference>  (component form — treated as inline sup)
 *
 * Returns an array of: { supText: string, precedingText: string }
 */
function extractGatsbySups(source) {
  const signals = []

  // ── Pattern A: inline <sup>…</sup> with optional <a> wrapper ─────────────
  // Matches:  someText<sup>19,20</sup>
  //           someText<sup><a href="#references">1</a></sup>
  //           someText<sup>\n  <a href="#references">\n    1\n  </a>\n</sup>
  const supRe =
    /<sup>\s*(?:<a[^>]*>)?\s*([\d,\s]+)\s*(?:<\/a>)?\s*<\/sup>/g
  let m
  while ((m = supRe.exec(source)) !== null) {
    const supText = m[1].replace(/\s+/g, '').trim() // e.g. "19,20"
    if (!supText || supText === ',') continue // skip comma separators

    // Grab ~200 chars of preceding source text to extract the closest word/phrase
    const before = source.slice(Math.max(0, m.index - 300), m.index)
    const precedingText = extractPrecedingText(before)
    if (precedingText) {
      signals.push({ supText, precedingText, pattern: 'sup' })
    }
  }

  // ── Pattern B: <Reference>N</Reference> component ─────────────────────────
  // These are used in living-health-lab; each Reference is rendered as a
  // superscript citation link.
  const refRe = /<Reference>\s*([\d,]+)\s*<\/Reference>/g
  while ((m = refRe.exec(source)) !== null) {
    const supText = m[1].trim()
    const before = source.slice(Math.max(0, m.index - 300), m.index)
    const precedingText = extractPrecedingText(before)
    if (precedingText) {
      signals.push({ supText, precedingText, pattern: 'Reference' })
    }
  }

  return signals
}

/**
 * Given the raw JSX source immediately before a <sup> tag, extract the last
 * meaningful text fragment — the word or phrase that the superscript attaches to.
 *
 * We strip JSX syntax (tags, braces, whitespace) and return the last ~80 chars
 * of plain text.
 */
function extractPrecedingText(rawBefore) {
  // Remove JSX/HTML tags
  let text = rawBefore.replace(/<[^>]+>/g, ' ')
  // Remove JSX expression braces, template literals, string delimiters
  text = text.replace(/\{[^}]*\}/g, ' ')
  // Collapse whitespace and trim
  text = text.replace(/\s+/g, ' ').trim()
  // Take the last 120 characters as context
  return text.slice(-120).trim()
}

/**
 * Build a set of "expected superscripts" from the Gatsby source for a slug.
 *
 * Returns a Map<supText, Set<precedingFragment>> where precedingFragment is a
 * normalised trailing substring of the preceding text that we can match
 * against Sanity span text.
 */
function buildExpectedSups(slug) {
  const filePath = path.join(GATSBY_VISION_DIR, slug, 'index.js')
  let source
  try {
    source = readFileSync(filePath, 'utf8')
  } catch {
    console.error(`  Cannot read Gatsby source: ${filePath}`)
    return []
  }

  const signals = extractGatsbySups(source)
  console.log(`  Gatsby source: found ${signals.length} superscript signal(s)`)
  return signals
}

// ─── Sanity helpers ──────────────────────────────────────────────────────────

/**
 * Flatten all text blocks (recursing into backgroundSection and columns)
 * and return them as an array of { block, path } where path is the array of
 * indices needed to reach block inside doc.content.
 */
function collectBlocks(content, basePath = []) {
  const results = []
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    const p = [...basePath, i]
    if (block._type === 'block' && block.children) {
      results.push({ block, path: p })
    }
    if (block._type === 'backgroundSection' && block.content) {
      results.push(...collectBlocks(block.content, [...p, 'content']))
    }
    if (block._type === 'columns' && block.content) {
      results.push(...collectBlocks(block.content, [...p, 'content']))
    }
  }
  return results
}

/**
 * Get the full plain text of a block (concat all children span texts).
 */
function blockText(block) {
  return (block.children || []).map(c => c.text || '').join('')
}

/**
 * Normalise text for fuzzy matching: collapse whitespace, trim, lowercase.
 */
function norm(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Check whether a Sanity span already has a "sup" mark.
 */
function hasSup(span) {
  return (span.marks || []).includes('sup')
}

// ─── Core patching logic ─────────────────────────────────────────────────────

/**
 * For a given signal { supText, precedingText }, scan all blocks in the
 * Sanity document content and try to find a span that:
 *   (a) ends with the supText digits (like "...every year1"), AND
 *   (b) the text before those digits fuzzy-matches the signal's precedingText
 *
 * If found and not already sup-marked, split the span and mark the number part.
 *
 * Returns true if a change was made.
 */
function applySignalToContent(content, signal) {
  const { supText, precedingText } = signal

  // Build a regex that matches the sup digits at the end of a span text.
  // The sup might be "1", "19,20", "2,11", "3,4" etc.
  // We need to escape the comma for regex and allow optional spaces.
  const escapedSup = supText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match the sup at the end of the span text (possibly with trailing space/period)
  const supAtEndRe = new RegExp(`(${escapedSup})\\s*$`)

  // Last ~60 chars of precedingText for matching
  const shortPreceding = norm(precedingText).slice(-60)

  const allBlocks = collectBlocks(content)

  for (const { block, path } of allBlocks) {
    const children = block.children
    if (!children) continue

    for (let si = 0; si < children.length; si++) {
      const span = children[si]
      if (span._type !== 'span') continue
      if (hasSup(span)) continue // already marked

      const spanText = span.text || ''
      const supMatch = supAtEndRe.exec(spanText)
      if (!supMatch) continue

      // The text before the sup number in this span
      const textBefore = spanText.slice(0, supMatch.index)

      // Build context: text of all prior spans + this span's text before the number
      const priorText = children
        .slice(0, si)
        .map(c => c.text || '')
        .join('')
      const fullContextBefore = norm(priorText + textBefore).slice(-60)

      // Fuzzy match: does the Sanity context end similarly to the Gatsby signal?
      const similarity = computeSimilarity(fullContextBefore, shortPreceding)
      if (similarity < 0.4) continue

      // Found a match — now split the span
      const matchedSup = supMatch[1] // the actual sup text found

      return {
        matched: true,
        path,
        spanIndex: si,
        spanKey: span._key,
        textBefore,
        matchedSup,
        similarity,
        blockText: blockText(block).slice(0, 80),
      }
    }
  }

  return { matched: false }
}

/**
 * Simple similarity: what fraction of the shorter string's trigrams appear in
 * the longer string. Falls back to substring check.
 */
function computeSimilarity(a, b) {
  if (!a || !b) return 0
  if (a.includes(b.slice(-30)) || b.includes(a.slice(-30))) return 1.0

  // Trigram overlap
  const triA = trigrams(a)
  const triB = trigrams(b)
  if (triA.size === 0 || triB.size === 0) return 0
  let shared = 0
  for (const t of triA) if (triB.has(t)) shared++
  return shared / Math.min(triA.size, triB.size)
}

function trigrams(s) {
  const set = new Set()
  for (let i = 0; i <= s.length - 3; i++) {
    set.add(s.slice(i, i + 3))
  }
  return set
}

/**
 * Apply a split: take block.children[spanIndex], split at textBefore/matchedSup,
 * replace with up to 3 spans: pre-text (existing marks), sup span.
 * Mutates content in place.
 */
function applySplit(content, matchInfo) {
  const { path, spanIndex, textBefore, matchedSup } = matchInfo

  // Navigate to the block via path
  let target = content
  for (let pi = 0; pi < path.length; pi++) {
    const key = path[pi]
    if (key === 'content') {
      target = target.content
    } else {
      target = target[key]
    }
  }
  const block = target
  const span = block.children[spanIndex]
  const originalText = span.text || ''

  // Text after the sup (e.g. trailing punctuation like ".")
  const afterText = originalText.slice(
    (span.text || '').indexOf(textBefore) + textBefore.length + matchedSup.length
  )

  const newSpans = []

  // 1. Pre-text span (keep original marks, just update text)
  if (textBefore.length > 0) {
    newSpans.push({
      ...span,
      _key: span._key, // keep key for the main span
      text: textBefore,
    })
  }

  // 2. Sup-marked span
  newSpans.push({
    _type: 'span',
    _key: newKey(),
    text: matchedSup,
    marks: [...(span.marks || []).filter(m => m !== 'sup'), 'sup'],
  })

  // 3. After-text span (if any text follows the sup number in the same span)
  if (afterText.length > 0) {
    newSpans.push({
      _type: 'span',
      _key: newKey(),
      text: afterText,
      marks: (span.marks || []).filter(m => m !== 'sup'),
    })
  }

  // If textBefore is empty, the first original span is replaced entirely
  if (textBefore.length === 0) {
    // Remove the _key carry-over — assign fresh key to sup span
    newSpans[0]._key = newKey()
  }

  block.children.splice(spanIndex, 1, ...newSpans)
}

// ─── Per-slug processing ──────────────────────────────────────────────────────

async function processSlug(slug) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Slug: ${slug}`)

  // 1. Parse Gatsby source
  const signals = buildExpectedSups(slug)
  if (signals.length === 0) {
    console.log('  No superscript signals found in Gatsby source.')
    return
  }

  // 2. Fetch Sanity document
  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == $slug][0]`,
    { slug }
  )
  if (!doc) {
    console.log(`  No Sanity document found for slug "${slug}"`)
    return
  }
  console.log(`  Sanity doc: "${doc.title}" (${doc._id})`)

  // 3. Work on a deep clone
  let content = JSON.parse(JSON.stringify(doc.content || []))
  const changes = []

  // 4. For each signal, try to find and fix the span
  for (const signal of signals) {
    const result = applySignalToContent(content, signal)
    if (result.matched) {
      console.log(
        `  [MATCH] sup="${signal.supText}" | similarity=${result.similarity.toFixed(2)}`
      )
      console.log(
        `    Block text: "…${result.blockText}"`
      )
      console.log(
        `    Split: "${result.textBefore}" + sup("${result.matchedSup}")`
      )
      changes.push({ signal, matchInfo: result })
      // Apply the split immediately so subsequent signals see updated content
      applySplit(content, result)
    } else {
      console.log(
        `  [SKIP]  sup="${signal.supText}" — no matching span found (may already be patched or text differs)`
      )
      console.log(`    Preceding: "…${norm(signal.precedingText).slice(-60)}"`)
    }
  }

  if (changes.length === 0) {
    console.log('  No changes needed.')
    return
  }

  console.log(`\n  ${changes.length} span(s) to patch.`)

  if (!DRY_RUN) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('  Patched and saved to Sanity.')
  } else {
    console.log('  DRY_RUN=true — not saving. Set DRY_RUN=false to apply.')
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const argSlug = process.argv[2]
  const slugs = argSlug ? [argSlug] : TARGET_SLUGS

  console.log(`patch-superscripts-auto.mjs`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE MODE'}`)
  console.log(`Slugs: ${slugs.join(', ')}`)

  for (const slug of slugs) {
    await processSlug(slug)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('Done.')
  if (DRY_RUN) {
    console.log('Run with DRY_RUN=false to apply changes.')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
