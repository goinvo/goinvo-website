/**
 * Fetch every page in the sitemap and report anything that is not a 200.
 *
 * The unit suite has a version of this (tests/page-render.test.ts) but it only
 * runs against a local server, so it cannot catch what production actually
 * serves: a broken redirect, an ISR page that failed to regenerate, a route
 * that only 500s with real CMS data. This one points at the deployed site.
 *
 *   node scripts/check-site-pages.mjs
 *   node scripts/check-site-pages.mjs --base https://goinvo-website-next-xxxx.vercel.app
 */
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const BASE = arg('base', 'https://www.goinvo.com').replace(/\/+$/, '')
const CONCURRENCY = Number(arg('concurrency', '8'))
// A real browser UA: the site's bot filter treats headless/curl agents
// differently, and a filtered response is not what a visitor gets.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const sitemapResponse = await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': UA } })
if (!sitemapResponse.ok) throw new Error(`sitemap.xml returned ${sitemapResponse.status}`)

const sitemap = await sitemapResponse.text()
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1])
  // The sitemap names the canonical host; follow whichever base was asked for.
  .map((url) => url.replace(/^https?:\/\/[^/]+/, BASE))

if (urls.length === 0) throw new Error('sitemap.xml listed no URLs')
console.log(`Checking ${urls.length} pages from the sitemap at ${BASE}...\n`)

const failures = []
let checked = 0

for (let index = 0; index < urls.length; index += CONCURRENCY) {
  const batch = urls.slice(index, index + CONCURRENCY)
  await Promise.all(
    batch.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': UA },
          redirect: 'follow',
          signal: AbortSignal.timeout(45_000),
        })
        if (response.status >= 400) failures.push(`${response.status}  ${url}`)
      } catch (error) {
        failures.push(`ERR  ${url}  ${String(error).slice(0, 60)}`)
      }
      checked += 1
      process.stdout.write(`  ${checked}/${urls.length}\r`)
    }),
  )
}

console.log('\n')
for (const failure of failures) console.log(`  ${failure}`)
console.log(`${urls.length - failures.length}/${urls.length} pages OK, ${failures.length} failing.`)
if (failures.length > 0) process.exitCode = 1
