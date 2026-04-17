/**
 * Fix the 10 case studies whose `upNext` arrays differ from Gatsby
 * (per scripts/audit-up-next.mjs).
 *
 * Two failure modes:
 *
 *   A) Broken draft references. Several entries point at
 *      `drafts.caseStudy-X` instead of the published `caseStudy-X`. The
 *      drafts document was deleted/published and the upNext ref was
 *      never repointed. Replaces 6 such refs across 6 case studies.
 *
 *   B) Missing entries. 4 case studies lost an entry pointing at a
 *      vision feature (bathroom-to-healthroom / care-plans /
 *      killer-truths / understanding-ebola) when content was migrated.
 *      Each is added back as a proper `reference` (not externalUpNextItem)
 *      since each target now lives in our Sanity feature collection.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-up-next-mismatches.mjs           # dry
 *   node --env-file=.env.local scripts/fix-up-next-mismatches.mjs --write   # apply
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

const REF_REPLACEMENTS = {
  'drafts.caseStudy-fastercures-health-data-basics': 'caseStudy-fastercures-health-data-basics',
  'drafts.caseStudy-hgraph': 'caseStudy-hgraph',
}

// caseStudy slug → feature reference _id to append
const APPEND_FEATURE_REFS = {
  'infobionic-heart-monitoring': 'M7woOCHH1NDuICF5GJsUtB', // From Bathroom to Healthroom
  'mount-sinai-consent': 'M7woOCHH1NDuICF5GJsPTS',         // Care Plans that Drive Recovery
  'paintrackr': 'tl9t9UEN5oC6RJHCTXa01h',                  // Killer Truths
  'tabeeb-diagnostics': 'tl9t9UEN5oC6RJHCTXa8Fh',          // Understanding Ebola
}

// Gather affected case studies for both fix paths.
const affectedSlugs = Array.from(
  new Set([
    'commonhealth-smart-health-cards',
    'insidetracker-nutrition-science',
    'inspired-ehrs',
    'mitre-flux-notes',
    'mitre-shr',
    'staffplan',
    ...Object.keys(APPEND_FEATURE_REFS),
  ]),
)

const studies = await client.fetch(
  `*[_type == "caseStudy" && !(_id in path("drafts.**")) && slug.current in $slugs] | order(slug.current asc) {
    _id,
    "slug": slug.current,
    title,
    upNext[]{
      _key,
      _type,
      _ref,
      "deref": @->{ _id, "slug": slug.current, title }
    }
  }`,
  { slugs: affectedSlugs },
)

let fixCount = 0
const operations = []

for (const cs of studies) {
  const updatedUpNext = (cs.upNext || []).map((item) => {
    if (item._type !== 'reference') return item
    if (REF_REPLACEMENTS[item._ref]) {
      const newRef = REF_REPLACEMENTS[item._ref]
      console.log(`  ${cs.slug}: ${item._ref} → ${newRef}`)
      fixCount++
      return { _key: item._key, _type: 'reference', _ref: newRef }
    }
    return { _key: item._key, _type: 'reference', _ref: item._ref }
  })

  const appendId = APPEND_FEATURE_REFS[cs.slug]
  if (appendId && !updatedUpNext.some((i) => i._ref === appendId)) {
    console.log(`  ${cs.slug}: append ref → ${appendId}`)
    updatedUpNext.push({
      _key: `featref-${appendId.slice(-8)}-${Date.now().toString(36)}`,
      _type: 'reference',
      _ref: appendId,
    })
    fixCount++
  }

  // Only patch if we actually changed something for this doc
  const before = JSON.stringify(cs.upNext?.map((i) => ({ _ref: i._ref, _type: i._type })))
  const after = JSON.stringify(updatedUpNext.map((i) => ({ _ref: i._ref, _type: i._type })))
  if (before !== after) {
    operations.push({ id: cs._id, slug: cs.slug, upNext: updatedUpNext })
  }
}

console.log(`\nTotal individual fixes: ${fixCount} across ${operations.length} documents`)
if (!WRITE) {
  console.log('\nDry run — pass --write to apply.')
  process.exit(0)
}
if (!WRITE_TOKEN) {
  console.error('SANITY_WRITE_TOKEN required for --write')
  process.exit(1)
}

for (const op of operations) {
  await client.patch(op.id).set({ upNext: op.upNext }).commit()
  console.log(`✓ patched ${op.slug}`)
}
console.log(`\nApplied ${operations.length} patches.`)
