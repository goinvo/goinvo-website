#!/usr/bin/env node
/**
 * CMS invariants the public site depends on, checked against the live dataset.
 *
 *   node scripts/check-cms-integrity.mjs                       # check; exits 1 on any problem
 *   node scripts/check-cms-integrity.mjs --repair              # show the repairs it would make
 *   node scripts/check-cms-integrity.mjs --repair --apply --backup <file outside the repo>
 *
 * Each invariant is a failure we have had, none of which raised an error:
 * - one-switch:  a vision piece's Selected Feature is an explicit true/false, and the retired
 *                hiddenWorkPage flag is gone (it used to override it silently).
 * - ranks:       no two published items of an orderable type share an orderRank, and none sits on
 *                the minimum rank (a bulk write put several there; the Studio showed them as
 *                duplicates and the site's order between them was arbitrary).
 * - about-page:  who appears on the about page is decided by Show on About page / Is Alumni, not by
 *                the document id (a Studio-created person has a random id).
 * - slugs:       published work and vision slugs are servable (no "untitled-", lowercase only).
 * - anchors:     text a page's code splits the CMS body on (src/lib/contentAnchors.json) is still in
 *                that published piece; editing it away silently moves a section.
 *
 * Output names document ids and problems only: CI logs on this repo are public.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import lexorank from 'lexorank'
import { createClient } from 'next-sanity'

const { LexoRank } = lexorank
const args = process.argv.slice(2)
const repair = args.includes('--repair')
const apply = args.includes('--apply')
const backupIndex = args.indexOf('--backup')
const backupPath = backupIndex >= 0 ? args[backupIndex + 1] : null

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

const token = apply
  ? process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN
  : process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN
if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !token) {
  console.error('Needs NEXT_PUBLIC_SANITY_PROJECT_ID and a Sanity token (the production dataset is private).')
  process.exit(2)
}
if (apply) {
  if (!backupPath) {
    console.error('--apply needs --backup <file>: every document patched is saved there first.')
    process.exit(2)
  }
  if (resolve(backupPath).toLowerCase().startsWith(process.cwd().toLowerCase())) {
    console.error('Put the backup outside the repository: it holds draft content and this repo is public.')
    process.exit(2)
  }
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
  perspective: 'raw',
})

const ORDERABLE_TYPES = ['feature', 'caseStudy', 'teamMember']
const MIN = LexoRank.min().toString()
const isDraft = (id) => id.startsWith('drafts.')
const isPublished = (id) => !isDraft(id) && !id.startsWith('versions.')
const bare = (id) => id.replace(/^drafts\./, '')

const problems = []
/** id → patch object ({ set, unset }) */
const patches = new Map()
function patch(id, set = {}, unset = []) {
  const current = patches.get(id) ?? { set: {}, unset: [] }
  Object.assign(current.set, set)
  current.unset.push(...unset)
  patches.set(id, current)
}

// one-switch
const features = await client.fetch(`*[_type == "feature"]{_id, featured, hiddenWorkPage}`)
for (const doc of features) {
  const effective = typeof doc.featured === 'boolean' ? doc.featured : doc.hiddenWorkPage !== true
  const legacy = doc.hiddenWorkPage !== undefined && doc.hiddenWorkPage !== null
  const unset = typeof doc.featured !== 'boolean'
  if (legacy || (unset && isPublished(doc._id))) {
    problems.push(`one-switch  ${doc._id}: ${legacy ? 'still has hiddenWorkPage' : 'Selected Feature is unset'}`)
    patch(doc._id, { featured: effective }, legacy ? ['hiddenWorkPage'] : [])
  }
}

// ranks
for (const type of ORDERABLE_TYPES) {
  const docs = await client.fetch(`*[_type == $type && defined(orderRank)] | order(orderRank asc){_id, orderRank}`, { type })
  const published = docs.filter((doc) => isPublished(doc._id))
  const draftRank = new Map(docs.filter((doc) => isDraft(doc._id)).map((doc) => [bare(doc._id), doc.orderRank]))
  const counts = new Map()
  for (const doc of published) counts.set(doc.orderRank, (counts.get(doc.orderRank) ?? 0) + 1)

  for (let i = 0; i < published.length; ) {
    const rank = published[i].orderRank
    let end = i
    while (end + 1 < published.length && published[end + 1].orderRank === rank) end++
    if (end > i || rank === MIN) {
      const run = published.slice(i, end + 1)
      problems.push(`ranks       ${type}: ${run.length} item(s) on ${rank}${rank === MIN ? ' (the minimum)' : ''}: ${run.map((d) => d._id).join(', ')}`)
      // Spread the run between its neighbours, keeping the order the API returns today.
      const below = i > 0 ? LexoRank.parse(published[i - 1].orderRank) : LexoRank.min()
      const above = end + 1 < published.length ? LexoRank.parse(published[end + 1].orderRank) : LexoRank.max()
      let next = below
      for (const doc of run) {
        next = next.between(above)
        const value = next.toString()
        patch(doc._id, { orderRank: value })
        if (draftRank.get(doc._id) === rank) patch(`drafts.${doc._id}`, { orderRank: value })
      }
    }
    i = end + 1
  }
}

// about-page
const notStaff = await client.fetch(
  `*[_type == "teamMember" && !(_id match "team-*") && !(_id match "drafts.team-*") && isAlumni != true && showOnAboutPage != false]._id`,
)
for (const id of notStaff) {
  problems.push(`about-page  ${id}: not staff, but nothing but its id keeps it off the about page`)
  patch(id, { showOnAboutPage: false })
}

// slugs (reported, never repaired: a slug change moves a public URL)
const slugs = await client.fetch(`*[_type in ["feature", "caseStudy"] && !(_id in path("drafts.**"))]{_id, "slug": slug.current}`)
for (const { _id, slug } of slugs) {
  if (!slug) continue
  if (slug.startsWith('untitled-')) problems.push(`slugs       ${_id}: slug starts with "untitled-" (hidden from listings)`)
  else if (!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)) problems.push(`slugs       ${_id}: slug is not lowercase letters, digits and hyphens`)
}

// anchors (reported, never repaired: the fix is to edit the text back, or the anchor and the page together)
const anchors = JSON.parse(readFileSync(new URL('../src/lib/contentAnchors.json', import.meta.url), 'utf8'))
const anchorBodies = await client.fetch(
  `*[_type == "feature" && slug.current in $slugs && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{
    _id, "slug": slug.current, "text": pt::text(content)
  }`,
  { slugs: anchors.map((anchor) => anchor.slug) },
)
for (const anchor of anchors) {
  const doc = anchorBodies.find((body) => body.slug === anchor.slug)
  if (!doc) problems.push(`anchors     ${anchor.slug}: no published piece with this slug`)
  else if (!doc.text?.includes(anchor.text)) problems.push(`anchors     ${doc._id}: the text the page splits on is gone (${anchor.why})`)
}

console.log(problems.length ? problems.join('\n') : 'CMS integrity: no problems.')

if (!repair) process.exit(problems.length ? 1 : 0)

console.log(`\n${patches.size} document(s) to patch${apply ? '' : ' (dry run; add --apply --backup <file>)'}`)
for (const [id, { set, unset }] of patches) console.log(`  ${id}  set ${JSON.stringify(set)}${unset.length ? ` unset ${unset.join(',')}` : ''}`)
if (!apply || patches.size === 0) process.exit(0)

const ids = [...patches.keys()]
const before = await client.fetch(`*[_id in $ids]`, { ids })
writeFileSync(backupPath, JSON.stringify(before, null, 2))
console.log(`backed up ${before.length} document(s) to ${backupPath}`)

const tx = client.transaction()
for (const doc of before) {
  const { set, unset } = patches.get(doc._id)
  tx.patch(doc._id, (p) => {
    let next = p.ifRevisionId(doc._rev).set(set)
    if (unset.length) next = next.unset(unset)
    return next
  })
}
await tx.commit({ visibility: 'sync' })
console.log(`patched ${before.length} document(s) in one transaction`)
