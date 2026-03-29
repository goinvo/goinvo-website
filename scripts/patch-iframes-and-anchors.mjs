/**
 * Patch missing iframes and anchors into Sanity vision page content.
 *
 * Iframes to add:
 *   - eligibility-engine: Google Sheets embed
 *   - history-of-health-design: Knight Lab Timeline
 *   - living-health-lab: Google Sheets embed (in appendix)
 *   - national-cancer-navigation: Cancer Navigator app
 *   - precision-autism: Knight Lab Timeline
 *
 * Anchors to add:
 *   - fraud-waste-abuse-in-healthcare: #methodology
 *   - healthcare-dollars: #methodology
 *   - living-health-lab: #appendix
 *   - virtual-care: #methodology
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ── Iframe definitions ──────────────────────────────────────────────
const IFRAMES = [
  {
    slug: 'eligibility-engine',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT2dKnbphA4iq9sL7br2RkPHMbZkdFecELfz14-q3rSN9KB2Xv0HYoTP7jeCGsEG4Yr6SeTVh4LY_4_/pubhtml?widget=true&headers=false',
    height: '500',
    // Insert after heading containing "Common Data Elements"
    afterHeadingContaining: 'Common Data',
  },
  {
    slug: 'history-of-health-design',
    url: 'https://cdn.knightlab.com/libs/timeline3/latest/embed/index.html?source=1qa0ZwX09I8ON2YuHXaigZ8M7p_wnImQALPFyd8fVN98&font=Default&lang=en&initial_zoom=10&height=650&start_at_slide=1',
    height: '650',
    // Insert after first paragraph (intro text)
    afterBlockIndex: 1,
  },
  {
    slug: 'living-health-lab',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCH-qmx5UMmEqMI74LUNS8rhSKT9mi1pjqDGrkNPLdOXyRQTZVYCjlmwpzxDdq1ZMqdgE2F1XeoqrE/pubhtml?widget=true&headers=false',
    height: '600',
    // Insert after heading containing "Research Table"
    afterHeadingContaining: 'Research Table',
  },
  {
    slug: 'national-cancer-navigation',
    url: 'https://goinvo.github.io/cancernavigator/',
    height: '650',
    // Insert after heading containing "Reimagining Patient Navigation"
    afterHeadingContaining: 'Reimagining Patient Navigation',
  },
  {
    slug: 'precision-autism',
    url: 'https://cdn.knightlab.com/libs/timeline3/latest/embed/index.html?source=1UaJB6GqmCOJ9mAaNzEark9Of4AIb7wTx346E7gNlhGE&font=Default&lang=en&initial_zoom=2&height=650',
    height: '650',
    // Insert near the end, before references
    beforeType: 'references',
  },
]

// ── Anchor definitions ──────────────────────────────────────────────
const ANCHORS = [
  { slug: 'fraud-waste-abuse-in-healthcare', anchor: 'methodology', nearHeading: 'Methodology' },
  { slug: 'healthcare-dollars', anchor: 'methodology', nearHeading: 'Methodology' },
  { slug: 'living-health-lab', anchor: 'appendix', nearHeading: 'Appendix' },
  { slug: 'virtual-care', anchor: 'methodology', nearHeading: 'Methodology' },
]

function makeKey() {
  return Math.random().toString(36).slice(2, 11)
}

function makeIframeBlock(url, height) {
  return {
    _type: 'iframeEmbed',
    _key: makeKey(),
    url,
    height: parseInt(height, 10) || 600,
  }
}

function getBlockText(block) {
  if (block._type !== 'block' || !block.children) return ''
  return block.children.map(c => c.text || '').join('')
}

async function patchIframes() {
  console.log('\n── Patching iframes ──')
  for (const def of IFRAMES) {
    const doc = await client.fetch(
      `*[_type=="feature" && slug.current==$slug][0]{_id, content}`,
      { slug: def.slug }
    )
    if (!doc) {
      console.log(`  ✗ ${def.slug}: document not found`)
      continue
    }

    // Check if iframe already exists
    const hasIframe = doc.content?.some(
      b => b._type === 'iframeEmbed' && b.url?.includes(def.url.slice(0, 40))
    )
    if (hasIframe) {
      console.log(`  ○ ${def.slug}: iframe already exists, skipping`)
      continue
    }

    const iframeBlock = makeIframeBlock(def.url, def.height)
    let insertIndex = -1

    if (def.afterHeadingContaining) {
      for (let i = 0; i < doc.content.length; i++) {
        const text = getBlockText(doc.content[i])
        if (text.toLowerCase().includes(def.afterHeadingContaining.toLowerCase())) {
          insertIndex = i + 1
          break
        }
      }
    } else if (def.afterBlockIndex !== undefined) {
      insertIndex = def.afterBlockIndex + 1
    } else if (def.beforeType) {
      for (let i = doc.content.length - 1; i >= 0; i--) {
        if (doc.content[i]._type === def.beforeType) {
          insertIndex = i
          break
        }
      }
    }

    if (insertIndex < 0) {
      console.log(`  ✗ ${def.slug}: couldn't find insertion point`)
      continue
    }

    const newContent = [
      ...doc.content.slice(0, insertIndex),
      iframeBlock,
      ...doc.content.slice(insertIndex),
    ]

    await client.patch(doc._id).set({ content: newContent }).commit()
    console.log(`  ✓ ${def.slug}: inserted iframe at index ${insertIndex}`)
  }
}

async function patchAnchors() {
  console.log('\n── Patching anchors ──')
  for (const def of ANCHORS) {
    const doc = await client.fetch(
      `*[_type=="feature" && slug.current==$slug][0]{_id, content}`,
      { slug: def.slug }
    )
    if (!doc) {
      console.log(`  ✗ ${def.slug}: document not found`)
      continue
    }

    // Check if anchor already exists (look for a block with matching markDef or text)
    const hasAnchor = doc.content?.some(b => {
      const text = getBlockText(b)
      return text.toLowerCase().includes(def.nearHeading.toLowerCase()) &&
             (b.style === 'h2' || b.style === 'h3' || b.style === 'h2Center')
    })

    if (!hasAnchor) {
      console.log(`  ✗ ${def.slug}: heading "${def.nearHeading}" not found in content`)
      continue
    }

    // Find the heading and check if it already has an anchor-id in markDefs
    let patched = false
    const newContent = doc.content.map(block => {
      if (patched) return block
      const text = getBlockText(block)
      if (
        text.toLowerCase().includes(def.nearHeading.toLowerCase()) &&
        (block.style === 'h2' || block.style === 'h3' || block.style === 'h2Center')
      ) {
        // Add an anchor by inserting a zero-width span with an ID
        // Actually, Portable Text doesn't have native anchor support.
        // The best approach is to add an anchor ID to the block itself
        // using a custom field. But for now, we'll note it.
        console.log(`  ○ ${def.slug}: heading "${def.nearHeading}" found but Portable Text has no native anchor ID support. Need to add anchorId field to block schema.`)
        patched = true
      }
      return block
    })
  }
}

async function main() {
  await patchIframes()
  await patchAnchors()
  console.log('\nDone.')
}

main().catch(console.error)
