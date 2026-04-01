/**
 * Patch mount-sinai-consent case study content:
 * 1. Add missing image captions (5 images have empty captions)
 * 2. Convert inline reference paragraphs to a proper references block
 * 3. Remove the "References" h2 heading (now handled by the references block)
 *
 * Usage:
 *   node scripts/patch-mount-sinai-content.mjs          # dry run
 *   node scripts/patch-mount-sinai-content.mjs --write   # apply
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
const key = () => randomUUID().slice(0, 12)

// Captions from the Gatsby MDX source, keyed by alt text
const captionsByAlt = {
  'early draft': 'Early draft of genetic reporting for couples going through the IVF process.',
  'expert feedback': 'Genetic experts marking up printed comps with their feedback.',
  'system model': 'System model of the CaaS (consent as a service) software.',
}

// For the two "mobile-mockups" images, we use index order:
// First one (report) = "Sample genetic report for The Resilience Project."
// Second one (consent workflow) = "Electronic consent workflow for The Resilience Project."
const mockupCaptions = [
  'Sample genetic report for The Resilience Project.',
  'Electronic consent workflow for The Resilience Project.',
]

// Reference data from the Gatsby MDX frontmatter
const referenceItems = [
  { title: 'About Eric Schadt', link: 'http://en.wikipedia.org/wiki/Eric_Schadt' },
  { title: '', link: 'https://www.linkedin.com/pub/elissa-levin/4/888/aa' },
  { title: '', link: 'https://www.rmany.com/our-team/physicians/dr-alan-copperman' },
  { title: '', link: 'https://www.nytimes.com/2014/02/26/health/fda-meeting-considers-controversial-fertility-procedure.html?_r=0' },
  { title: '', link: 'http://www.washingtonpost.com/business/on-it/at-one-hospital-iphones-ipads-and-google-glass-become-key-medical-tools/2014/07/13/ce2657b0-0842-11e4-a0dd-f2b22a257353_story.html' },
  { title: '', link: 'http://www.pewinternet.org/fact-sheet/mobile/' },
  { title: '', link: 'http://groups.csail.mit.edu/mac/classes/6.805/student-papers/fall97-papers/fillingham-sig.html' },
  { title: '', link: 'http://en.wikipedia.org/wiki/Biometrics' },
  { title: '', link: 'http://www.resilienceproject.me/' },
  { title: '', link: 'https://en.wikipedia.org/wiki/Stephen_Friend' },
  { title: '', link: 'http://www.ted.com/talks/2004' },
]

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "mount-sinai-consent"][0]{ _id, content }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}\n`)

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // --- 1. Add missing image captions ---
  let mockupIdx = 0
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type !== 'image') continue
    if (block.caption && block.caption.trim() !== '') continue // already has caption

    const alt = block.alt || ''

    if (captionsByAlt[alt]) {
      console.log(`[1] Block ${i} (alt="${alt}"): Adding caption`)
      console.log(`    "${captionsByAlt[alt]}"`)
      content[i].caption = captionsByAlt[alt]
      changes++
    } else if (alt === 'mobile-mockups' && mockupIdx < mockupCaptions.length) {
      console.log(`[1] Block ${i} (alt="${alt}" #${mockupIdx + 1}): Adding caption`)
      console.log(`    "${mockupCaptions[mockupIdx]}"`)
      content[i].caption = mockupCaptions[mockupIdx]
      mockupIdx++
      changes++
    }
  }

  // --- 2. Convert inline reference paragraphs to references block ---
  let refH2Idx = -1
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type === 'block' && block.style === 'h2') {
      const text = (block.children || []).map(c => c.text || '').join('').trim()
      if (text === 'References') {
        refH2Idx = i
        break
      }
    }
  }

  if (refH2Idx >= 0) {
    // Count how many reference paragraphs follow the heading
    const refBlockIndices = [refH2Idx]
    for (let i = refH2Idx + 1; i < content.length; i++) {
      const block = content[i]
      if (block._type !== 'block' || block.style !== 'normal') break

      const fullText = (block.children || []).map(c => c.text || '').join('')
      const match = fullText.match(/^\d+\.?\s/)
      if (!match) break
      refBlockIndices.push(i)
    }

    const inlineRefCount = refBlockIndices.length - 1 // subtract the h2

    if (inlineRefCount > 0) {
      console.log(`\n[2] Converting ${inlineRefCount} inline references to references block`)

      const refItems = referenceItems.map(ref => ({
        _key: key(),
        title: ref.title,
        link: ref.link,
      }))

      refItems.forEach((ref, idx) =>
        console.log(`    ${idx + 1}. "${ref.title || '(no title)'}" → ${ref.link.substring(0, 60)}`)
      )

      const referencesBlock = {
        _type: 'references',
        _key: key(),
        items: refItems,
      }

      // Remove all old reference blocks (in reverse order)
      for (let i = refBlockIndices.length - 1; i >= 0; i--) {
        content.splice(refBlockIndices[i], 1)
      }

      // Insert references block at the position where the h2 was
      content.splice(refH2Idx, 0, referencesBlock)
      changes++
    }
  }

  // --- Summary ---
  console.log(`\nTotal changes: ${changes}`)

  if (changes === 0) {
    console.log('No changes to apply.')
    return
  }

  if (!WRITE) {
    console.log('Run with --write to apply.')
    return
  }

  await client.patch(doc._id).set({ content }).commit()
  console.log('✅ Patched successfully.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
