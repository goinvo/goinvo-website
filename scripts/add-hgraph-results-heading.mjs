/**
 * Insert the missing centered "Results" h2 before the
 * "hGraph Press & Accolades" subheading on the hgraph case study.
 *
 *   node --env-file=.env.local scripts/add-hgraph-results-heading.mjs           # dry
 *   node --env-file=.env.local scripts/add-hgraph-results-heading.mjs --write   # apply
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
  `*[_type == "caseStudy" && !(_id in path("drafts.**")) && slug.current == "hgraph"][0]{ _id, title, content }`,
)
if (!cs) { console.error('hgraph not found'); process.exit(1) }

const getText = (b) =>
  b?._type === 'block' && Array.isArray(b.children)
    ? b.children.map((c) => c.text || '').join('')
    : ''

const pressIdx = cs.content.findIndex((b) =>
  getText(b).trim().startsWith('hGraph Press & Accolades'),
)
if (pressIdx < 0) {
  console.error('Couldn\'t find "hGraph Press & Accolades" block')
  process.exit(1)
}

// If a Results h2 already sits right above, nothing to do.
const prior = cs.content[pressIdx - 1]
if (prior && getText(prior).trim() === 'Results' && prior.style === 'sectionTitle') {
  console.log('Already has Results heading before Press & Accolades — nothing to do.')
  process.exit(0)
}

// Look a couple blocks further back too (skip any dividers/empties).
for (let i = pressIdx - 1; i >= Math.max(0, pressIdx - 4); i--) {
  const b = cs.content[i]
  if (getText(b).trim() === 'Results' && b.style === 'sectionTitle') {
    console.log(`Already has a Results sectionTitle at index ${i}; nothing to do.`)
    process.exit(0)
  }
}

const newBlock = {
  _key: `hgraph-results-heading-${Date.now().toString(36)}`,
  _type: 'block',
  style: 'sectionTitle',
  markDefs: [],
  children: [{ _key: 'span0', _type: 'span', marks: [], text: 'Results' }],
}

console.log(`Will insert Results h2 at index ${pressIdx} (before "hGraph Press & Accolades")`)
if (!WRITE) { console.log('\nDry run — pass --write to apply.'); process.exit(0) }
if (!WRITE_TOKEN) { console.error('SANITY_WRITE_TOKEN required'); process.exit(1) }

await client
  .patch(cs._id)
  .insert('before', `content[${pressIdx}]`, [newBlock])
  .commit()
console.log('✓ patched')
