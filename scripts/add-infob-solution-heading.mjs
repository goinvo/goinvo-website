/**
 * Insert the missing centered "Solution" h2 before the "Doctors and nurses
 * can monitor a patient's arrhythmias…" paragraph on the
 * infobionic-heart-monitoring case study.
 *
 *   node --env-file=.env.local scripts/add-infob-solution-heading.mjs --write
 */
import { createClient } from 'next-sanity'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const cs = await client.fetch(
  `*[_type == "caseStudy" && !(_id in path("drafts.**")) && slug.current == "infobionic-heart-monitoring"][0]{ _id, content }`,
)
if (!cs) { console.error('not found'); process.exit(1) }

const getText = (b) =>
  b?._type === 'block'
    ? (b.children || []).map((c) => c.text || '').join('')
    : ''

const TARGET_PREFIX = 'Doctors and nurses can monitor'
const idx = cs.content.findIndex((b) => getText(b).trim().startsWith(TARGET_PREFIX))
if (idx < 0) { console.error(`not found: ${TARGET_PREFIX}`); process.exit(1) }

// Skip if already has a Solution h2 right before
for (let i = idx - 1; i >= Math.max(0, idx - 4); i--) {
  const b = cs.content[i]
  if (getText(b).trim() === 'Solution' && b.style === 'sectionTitle') {
    console.log(`Already has Solution at index ${i}; nothing to do.`)
    process.exit(0)
  }
}

const block = {
  _key: `infob-solution-heading-${Date.now().toString(36)}`,
  _type: 'block',
  style: 'sectionTitle',
  markDefs: [],
  children: [{ _key: 'span0', _type: 'span', marks: [], text: 'Solution' }],
}

console.log(`Will insert Solution h2 at index ${idx} (before "${TARGET_PREFIX}...")`)
if (!WRITE) { console.log('Dry run — pass --write to apply.'); process.exit(0) }
if (!WRITE_TOKEN) { console.error('SANITY_WRITE_TOKEN required'); process.exit(1) }

await client
  .patch(cs._id)
  .insert('before', `content[${idx}]`, [block])
  .commit()
console.log('✓ patched')
