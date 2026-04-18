/**
 * Insert the missing "Solution" and "Results" section headers on the
 * ahrq-cds case study. Each goes before specific h4 blocks from Gatsby's
 * ordering.
 *
 *   node --env-file=.env.local scripts/add-ahrq-section-headings.mjs --write
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

const INSERTIONS = [
  { before: 'Promoting CDS Connect with education built in', title: 'Solution' },
  { before: 'Initial CDS tools jumpstarted repository', title: 'Results' },
]

const cs = await client.fetch(
  `*[_type == "caseStudy" && !(_id in path("drafts.**")) && slug.current == "ahrq-cds"][0]{ _id, title, content }`,
)
if (!cs) { console.error('ahrq-cds not found'); process.exit(1) }

const getText = (b) =>
  b?._type === 'block' && Array.isArray(b.children)
    ? b.children.map((c) => c.text || '').join('')
    : ''

const content = cs.content.slice()

// Process from the end forward so later indexes don't shift earlier ones.
const withIndexes = INSERTIONS
  .map((ins) => ({ ...ins, idx: content.findIndex((b) => getText(b).trim().startsWith(ins.before)) }))
  .filter((ins) => {
    if (ins.idx < 0) { console.warn(`not found: ${ins.before}`); return false }
    // Skip if an h2 with this title already precedes
    for (let i = ins.idx - 1; i >= Math.max(0, ins.idx - 3); i--) {
      if (getText(content[i]).trim() === ins.title && content[i].style === 'sectionTitle') {
        console.log(`Already has ${ins.title} heading before "${ins.before}"`)
        return false
      }
    }
    return true
  })
  .sort((a, b) => b.idx - a.idx)

for (const ins of withIndexes) {
  const block = {
    _key: `ahrq-${ins.title.toLowerCase()}-heading-${Date.now().toString(36)}-${ins.idx}`,
    _type: 'block',
    style: 'sectionTitle',
    markDefs: [],
    children: [{ _key: 'span0', _type: 'span', marks: [], text: ins.title }],
  }
  content.splice(ins.idx, 0, block)
  console.log(`Inserted ${ins.title} at index ${ins.idx} (before "${ins.before}")`)
}

if (withIndexes.length === 0) { console.log('Nothing to do.'); process.exit(0) }
if (!WRITE) { console.log('\nDry run — pass --write to apply.'); process.exit(0) }
if (!WRITE_TOKEN) { console.error('SANITY_WRITE_TOKEN required'); process.exit(1) }

await client.patch(cs._id).set({ content }).commit()
console.log('✓ patched')
