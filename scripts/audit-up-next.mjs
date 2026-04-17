/**
 * Compare every case study's `upNext` array against the corresponding
 * Gatsby page's "Up next" cards. Flags counts that disagree, missing
 * titles, or external-vs-internal mismatches.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-up-next.mjs
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Pull every published case study with its upNext shape (so we can compare
// titles + types — references vs external link items).
const caseStudies = await client.fetch(
  `*[_type == "caseStudy" && !(_id in path("drafts.**")) && defined(slug.current)] | order(slug.current asc) {
    _id,
    title,
    "slug": slug.current,
    "upNext": upNext[]{
      _key,
      _type,
      // Reference: deref to its title + slug
      "deref": @->{ _id, _type, title, "slug": slug.current },
      // External: project the inline fields
      title,
      url
    }
  }`,
)

console.log(`Fetched ${caseStudies.length} case studies from Sanity`)

const STRIP_RE = /[\s\u00A0]+/g
const norm = (s) => (s || '').replace(STRIP_RE, ' ').trim().toLowerCase()

const mismatches = []
const missingFromGatsby = []
const errors = []

for (const cs of caseStudies) {
  const url = `https://www.goinvo.com/work/${cs.slug}/`
  let html
  try {
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        missingFromGatsby.push({ slug: cs.slug, status: res.status })
      } else {
        errors.push({ slug: cs.slug, error: `HTTP ${res.status}` })
      }
      continue
    }
    html = await res.text()
  } catch (e) {
    errors.push({ slug: cs.slug, error: e.message })
    continue
  }

  // Extract the "Up next" block: it's an h3 followed by columns of card anchors
  // Match <h3 ...>Up next</h3>...the next major closing
  const upNextMatch = html.match(/<h3[^>]*>Up next<\/h3>[\s\S]*?(?=<\/div><\/div><\/div>|<h2[^>]*>References)/i)
  const block = upNextMatch ? upNextMatch[0] : ''

  // Each card is an <a ...> inside the up-next block. Capture href + bold text.
  const cardRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<p class=["']text--bold["']>([^<]+)<\/p>/g
  const gatsbyCards = []
  let m
  while ((m = cardRegex.exec(block)) !== null) {
    gatsbyCards.push({ href: m[1], title: m[2].trim() })
  }

  const sanityCards = (cs.upNext || []).map((item) => {
    if (item._type === 'externalUpNextItem') {
      return { type: 'external', title: item.title, href: item.url }
    }
    return { type: 'reference', title: item.deref?.title, slug: item.deref?.slug }
  })

  // Compare counts
  const issues = []
  if (gatsbyCards.length !== sanityCards.length) {
    issues.push(`COUNT: gatsby=${gatsbyCards.length}, sanity=${sanityCards.length}`)
  }

  // Compare item-by-item by normalized title
  const sanityTitles = sanityCards.map((c) => norm(c.title))
  for (const gc of gatsbyCards) {
    if (!sanityTitles.includes(norm(gc.title))) {
      issues.push(`MISSING_IN_SANITY: "${gc.title}" → ${gc.href}`)
    }
  }
  const gatsbyTitles = gatsbyCards.map((c) => norm(c.title))
  for (const sc of sanityCards) {
    if (!gatsbyTitles.includes(norm(sc.title))) {
      issues.push(`EXTRA_IN_SANITY: "${sc.title}" (${sc.type})`)
    }
  }

  if (issues.length) {
    mismatches.push({ slug: cs.slug, title: cs.title, gatsbyCount: gatsbyCards.length, sanityCount: sanityCards.length, issues, gatsbyCards, sanityCards })
  }
}

console.log('')
console.log(`=== Mismatches (${mismatches.length}) ===`)
for (const m of mismatches) {
  console.log(`\n${m.slug} — ${m.title}`)
  for (const issue of m.issues) console.log(`  ${issue}`)
}

if (missingFromGatsby.length) {
  console.log('')
  console.log(`=== Slugs not on Gatsby (${missingFromGatsby.length}) — likely Sanity-only/new ===`)
  for (const x of missingFromGatsby) console.log(`  ${x.slug} (HTTP ${x.status})`)
}

if (errors.length) {
  console.log('')
  console.log(`=== Errors (${errors.length}) ===`)
  for (const e of errors) console.log(`  ${e.slug}: ${e.error}`)
}

console.log('')
console.log(`Done. ${mismatches.length} mismatches, ${missingFromGatsby.length} not-on-gatsby, ${errors.length} errors out of ${caseStudies.length} total`)
