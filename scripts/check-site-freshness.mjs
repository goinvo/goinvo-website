#!/usr/bin/env node
/**
 * Does the live site show what the CMS has published?
 *
 *   node scripts/check-site-freshness.mjs [--base https://www.goinvo.com] [--grace-minutes 15]
 *
 * The CMS can be right while the site is wrong: a published change only reaches goinvo.com when the
 * cache is purged (the Sanity publish webhook, /api/sanity/revalidate). If that stops firing, every
 * check on the CMS side still passes and editors conclude "Sanity isn't saving". This compares the
 * rendered pages with the published documents instead:
 *   - the /vision Spotlight, item by item, against Content → Spotlight;
 *   - the most recently changed work and vision pages: their page shows the published title.
 * Changes younger than the grace period are skipped (the site regenerates on the next visit).
 *
 * Exits 1 on a mismatch. Prints only public URLs and published titles (CI logs are public).
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from 'next-sanity'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : fallback
}
const BASE = arg('base', 'https://www.goinvo.com').replace(/\/+$/, '')
const GRACE_MS = Number(arg('grace-minutes', '15')) * 60_000

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}
const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !token) {
  console.error('Needs NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_READ_TOKEN (the production dataset is private).')
  process.exit(2)
}
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
  perspective: 'published',
})

const now = Date.now()
const recent = (updatedAt) => now - Date.parse(updatedAt) < GRACE_MS
const failures = []
const notes = []

const decode = (html) =>
  html
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')

/** Fetch a page; on a mismatch fetch once more, since the first visit after a purge can serve the old copy. */
async function pageMatches(path, matches) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${BASE}${path}`, { headers: { 'user-agent': 'goinvo-freshness-check' } })
    const html = decode(await response.text())
    if (response.ok && matches(html)) return { ok: true }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 15_000))
    else return { ok: false, status: response.status, html }
  }
}

// 1. The /vision Spotlight, in order.
const spotlight = await client.fetch(`*[_id == "visionSpotlight"][0]{
  _updatedAt,
  "items": items[]{ _type == "reference" => { "href": coalesce(@->externalLink, "/vision/" + @->slug.current) },
                    _type == "spotlightCard" => { "href": link } }.href
}`)
const expected = (spotlight?.items ?? []).filter(Boolean)
if (!expected.length) {
  notes.push('Spotlight is empty in the CMS; nothing to compare.')
} else if (recent(spotlight._updatedAt)) {
  notes.push('Spotlight changed within the grace period; skipped.')
} else {
  const spotlightLinks = (html) => {
    const start = html.indexOf('>Spotlight<')
    if (start < 0) return []
    const hrefs = [...html.slice(start).matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(BASE, ''))
    return [...new Set(hrefs)].slice(0, expected.length)
  }
  let shown = []
  const result = await pageMatches('/vision', (html) => {
    shown = spotlightLinks(html)
    return JSON.stringify(shown) === JSON.stringify(expected)
  })
  if (!result.ok) failures.push(`/vision Spotlight shows [${shown.join(', ')}], the CMS has [${expected.join(', ')}]`)
}

// 2. The most recently changed work and vision pages show their published title.
const latest = await client.fetch(`{
  "feature": *[_type == "feature" && defined(slug.current) && !defined(externalLink)] | order(_updatedAt desc)[0]{title, "path": "/vision/" + slug.current, _updatedAt},
  "caseStudy": *[_type == "caseStudy" && defined(slug.current) && hidden != true] | order(_updatedAt desc)[0]{title, "path": "/work/" + slug.current, _updatedAt}
}`)
for (const doc of Object.values(latest)) {
  if (!doc?.title) continue
  if (recent(doc._updatedAt)) {
    notes.push(`${doc.path} changed within the grace period; skipped.`)
    continue
  }
  const result = await pageMatches(doc.path, (html) => html.includes(doc.title))
  if (!result.ok) failures.push(`${doc.path} (HTTP ${result.status}) does not show its published title "${doc.title}"`)
}

for (const note of notes) console.log(`note: ${note}`)
if (failures.length) {
  console.error(`The live site is behind the CMS:\n- ${failures.join('\n- ')}`)
  console.error('Check the Sanity publish webhook (/api/sanity/revalidate) and its delivery log.')
  process.exit(1)
}
console.log(`Site freshness: ${BASE} matches the published CMS.`)
