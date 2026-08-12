/**
 * Check every link stored in the CMS, and optionally repair the relative ones.
 *
 * Links inside Sanity rich text are invisible to a repo grep and to
 * check-shop-links.mjs (which only walks rendered shop pages), so a dead one can
 * sit on a live case study indefinitely. That is exactly how
 * /work/mitre-shr shipped a "Flux Notes" link that resolved to /mitre-flux-notes
 * (404) instead of /work/mitre-flux-notes.
 *
 * RELATIVE hrefs are the dangerous class: `../foo/` resolves against the page's
 * depth, so the same string is correct on /vision/x and broken on /work/x. They
 * are always rewritable to an absolute path, and --fix does that.
 *
 *   node scripts/check-cms-links.mjs                 # report only
 *   node scripts/check-cms-links.mjs --fix           # rewrite relative hrefs
 *   node scripts/check-cms-links.mjs --external      # also HTTP-check off-site links
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from 'next-sanity'

const args = process.argv.slice(2)
const fix = args.includes('--fix')
const checkExternal = args.includes('--external')
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const BASE = arg('base', 'https://www.goinvo.com').replace(/\/+$/, '')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN,
})

/** Where a document of this type is published, so relative links can be resolved. */
const PAGE_PREFIX = { caseStudy: '/work/', feature: '/vision/' }

/**
 * Dead link -> where it should point, applied by --fix.
 *
 * Each of these was verified to 404 in production and its replacement verified
 * to 200. They are listed rather than inferred because the right target is a
 * content decision: `/work/cds-connect/` is not a typo of a live slug, it is the
 * 2018 URL for what is now `/work/ahrq-cds`. Guessing would silently point a
 * proof point at the wrong case study.
 */
const LINK_REPAIRS = {
  // 2018 slugs that were renamed during the Next migration.
  '/work/cds-connect/': '/work/ahrq-cds',
  '/vision/hgraph/': '/work/hgraph',
  '/work/infobionic/': '/work/infobionic-heart-monitoring',
  // The old site served case studies under /features/; they live under /work/ now.
  '/features/care-cards': '/work/care-cards',
  // Recovered from the 2018 S3 bucket to its canonical path (it was never migrated).
  '/features/ebola/understanding_ebola.pdf': '/images/features/ebola/understanding_ebola.pdf',
  // Serve these directly instead of through the /old/ compatibility redirect.
  'https://www.goinvo.com/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf':
    '/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf',
  'https://www.goinvo.com/old/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf':
    '/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf',
  'https://www.goinvo.com/old/images/features/killer-truths/Killer_Truths_Slide.png':
    '/images/features/killer-truths/Killer_Truths_Slide.png',
}

/** Walk a document and yield every string that is a link. */
function collectLinks(node, path, out) {
  if (typeof node === 'string') {
    if (/(href|url)$/i.test(path) && node.trim()) out.push({ path, value: node.trim() })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((value, index) => collectLinks(value, `${path}[${index}]`, out))
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      collectLinks(value, path ? `${path}.${key}` : key, out)
    }
  }
}

/**
 * Resolve a relative href the way a browser would, against the page the document
 * renders at. `/work/mitre-shr` has base `/work/`, so `../x/` becomes `/x/`.
 */
function resolveRelative(href, pagePath) {
  try {
    // The site canonicalises without a trailing slash, so keeping one would only
    // buy the visitor a redirect hop on every click.
    return new URL(href, `${BASE}${pagePath}`).pathname.replace(/(.)\/$/, '$1')
  } catch {
    return null
  }
}

const docs = await client.fetch('*[!(_id in path("drafts.**"))]{...}')
console.log(`Scanning links in ${docs.length} published documents at ${BASE}...\n`)

const relative = []
const internal = new Map()
const external = new Set()
const repairable = []

for (const doc of docs) {
  const links = []
  collectLinks(doc, '', links)
  const prefix = PAGE_PREFIX[doc._type]
  const pagePath = prefix && doc.slug?.current ? `${prefix}${doc.slug.current}` : null

  for (const link of links) {
    const { value } = link
    if (/^(mailto:|tel:|#|data:)/i.test(value)) continue

    // Match repairs on the value AND on its path, because the same dead link is
    // stored both ways (`/work/cds-connect/` in one doc, the full
    // `https://www.goinvo.com/work/cds-connect/` in another).
    const asPath = /^https?:\/\//i.test(value) ? new URL(value).pathname : value
    const target = LINK_REPAIRS[value] || LINK_REPAIRS[asPath]
    if (target) repairable.push({ doc, ...link, target })

    if (value.startsWith('../') || value.startsWith('./')) {
      relative.push({ doc, ...link, pagePath, resolved: pagePath ? resolveRelative(value, pagePath) : null })
      continue
    }
    if (value.startsWith('/')) {
      if (!internal.has(value)) internal.set(value, [])
      internal.get(value).push(doc._id)
      continue
    }
    if (/^https?:\/\//i.test(value)) {
      // Our own absolute URLs are internal links wearing a hostname.
      const url = new URL(value)
      if (/(^|\.)goinvo\.com$/i.test(url.hostname)) {
        const path = url.pathname + url.search
        if (!internal.has(path)) internal.set(path, [])
        internal.get(path).push(doc._id)
      } else if (checkExternal) {
        external.add(value)
      }
    }
  }
}

const status = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(45_000),
    })
    return response.status
  } catch {
    return 0
  }
}

async function checkAll(paths, label) {
  const broken = []
  let done = 0
  const entries = [...paths]
  for (let index = 0; index < entries.length; index += 8) {
    await Promise.all(
      entries.slice(index, index + 8).map(async ([path, owners]) => {
        const code = await status(path.startsWith('/') ? `${BASE}${path}` : path)
        if (code >= 400 || code === 0) broken.push({ path, owners, code })
        done += 1
        process.stdout.write(`  ${label} ${done}/${entries.length}\r`)
      }),
    )
  }
  console.log('')
  return broken
}

console.log(`RELATIVE hrefs: ${relative.length}`)
for (const item of relative) {
  const code = item.resolved ? await status(`${BASE}${item.resolved}`) : '?'
  console.log(`  ${item.doc._id}  ${item.value}`)
  console.log(`      on ${item.pagePath || '(unknown page)'} -> ${item.resolved || '?'}  [${code}]`)
}

const brokenInternal = await checkAll(internal, 'internal')
console.log(`\nBROKEN internal links: ${brokenInternal.length}`)
for (const item of brokenInternal) {
  console.log(`  ${item.code}  ${item.path}\n      in ${[...new Set(item.owners)].join(', ')}`)
}

let brokenExternal = []
if (checkExternal) {
  brokenExternal = await checkAll([...external].map((url) => [url, []]), 'external')
  console.log(`\nBROKEN external links: ${brokenExternal.length}`)
  for (const item of brokenExternal) console.log(`  ${item.code}  ${item.path}`)
}

console.log(`\nKNOWN-BAD links with a mapped replacement: ${repairable.length}`)
for (const item of repairable) {
  console.log(`  ${item.doc._id}  ${item.value}  ->  ${item.target}`)
}

if (fix && repairable.length > 0) {
  console.log('\nApplying mapped repairs...')
  for (const item of repairable) {
    await client.patch(item.doc._id).set({ [item.path]: item.target }).commit()
    console.log(`  patched ${item.doc._id}  ${item.path}`)
  }
}

if (fix && relative.length > 0) {
  console.log('\nRewriting relative hrefs to absolute paths...')
  for (const item of relative) {
    if (!item.resolved) {
      console.log(`  SKIP ${item.doc._id} ${item.value} (cannot resolve: no page path)`)
      continue
    }
    // A resolved path that 404s is a real broken link, not just a fragile one;
    // rewriting it would only freeze the 404 in place.
    const code = await status(`${BASE}${item.resolved}`)
    const target = code >= 400 ? await repair(item) : item.resolved
    if (!target) {
      console.log(`  SKIP ${item.doc._id} ${item.value} -> ${item.resolved} is ${code}, no fix known`)
      continue
    }
    await client.patch(item.doc._id).set({ [item.path]: target }).commit()
    console.log(`  ${item.doc._id}  ${item.value}  ->  ${target}`)
  }
}

/**
 * A relative link that resolves to a 404 usually lost its section prefix
 * (`../mitre-flux-notes/` from /work/ climbs one level too far). Try the link's
 * own page section before giving up.
 */
async function repair(item) {
  const slug = item.value.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '').replace(/\/$/, '')
  if (!slug || slug.includes('/')) return null
  for (const prefix of [item.pagePath?.replace(/\/[^/]*$/, '/'), '/work/', '/vision/']) {
    if (!prefix) continue
    const candidate = `${prefix}${slug}`
    if ((await status(`${BASE}${candidate}`)) < 400) return candidate
  }
  return null
}

const failures = fix ? 0 : brokenInternal.length + brokenExternal.length + relative.length
if (failures > 0) process.exitCode = 1
