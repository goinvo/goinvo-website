/**
 * Check every link and image the shop pages hand a visitor.
 *
 * The storefront links out to 31 poster PDFs on CloudFront plus a pile of
 * "Learn more" destinations, several of them external and years old. A dead
 * download is invisible from the page itself — the card looks perfect — so this
 * follows every one of them and reports the status.
 *
 *   node scripts/check-shop-links.mjs                    # production
 *   node scripts/check-shop-links.mjs --base http://localhost:3000
 */
import puppeteer from 'puppeteer'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const BASE = arg('base', 'https://www.goinvo.com').replace(/\/+$/, '')
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600_000 })

/** Collect every href/src a visitor could follow on one page. */
async function collectTargets(path, { forceSection = false } = {}) {
  const page = await browser.newPage()
  await page.setUserAgent(BROWSER_UA)
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 150_000 })
  if (forceSection) {
    await page.waitForSelector('#goinvo-at-home', { timeout: 60_000 }).catch(() => {})
    await page.evaluate(() => document.getElementById('goinvo-at-home')?.scrollIntoView({ block: 'center' }))
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  // Scroll the whole page so lazy images resolve their real src.
  await page.evaluate(async () => {
    const step = 800
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })

  const found = await page.evaluate(() => {
    const out = []
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href') || ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
      out.push({ kind: 'link', url: anchor.href, label: (anchor.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) })
    }
    for (const image of document.querySelectorAll('img')) {
      const src = image.currentSrc || image.src
      if (src && !src.startsWith('data:')) out.push({ kind: 'image', url: src, label: image.getAttribute('alt') || '' })
    }
    return out
  })
  await page.close()
  return found.map((item) => ({ ...item, page: path }))
}

const targets = [
  ...(await collectTargets('/vision/health-visualizations')),
  ...(await collectTargets('/?home-shop-section-variant=present', { forceSection: true })),
]

// Dedupe by URL, remembering every page and label that points at it.
const byUrl = new Map()
for (const target of targets) {
  const entry = byUrl.get(target.url) || { ...target, labels: new Set(), pages: new Set() }
  entry.labels.add(target.label)
  entry.pages.add(target.page)
  byUrl.set(target.url, entry)
}

console.log(`Checking ${byUrl.size} unique targets from ${targets.length} references...\n`)

async function statusOf(url) {
  // HEAD first (cheap); some CDNs and old hosts refuse it, so fall back to a
  // ranged GET rather than reporting a false failure.
  for (const init of [
    { method: 'HEAD' },
    { method: 'GET', headers: { Range: 'bytes=0-2048' } },
  ]) {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'follow',
        headers: { 'User-Agent': BROWSER_UA, ...(init.headers || {}) },
        signal: AbortSignal.timeout(30_000),
      })
      if (response.status < 400) return { status: response.status, finalUrl: response.url }
      if (init.method === 'GET') return { status: response.status, finalUrl: response.url }
    } catch (error) {
      if (init.method === 'GET') return { status: 0, error: String(error).slice(0, 80) }
    }
  }
  return { status: 0, error: 'unreachable' }
}

const results = []
const entries = [...byUrl.values()]
const CONCURRENCY = 6
for (let i = 0; i < entries.length; i += CONCURRENCY) {
  const batch = entries.slice(i, i + CONCURRENCY)
  const settled = await Promise.all(
    batch.map(async (entry) => ({ ...entry, ...(await statusOf(entry.url)) })),
  )
  results.push(...settled)
  process.stdout.write(`  checked ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}\r`)
}
console.log('\n')

const broken = results.filter((result) => result.status === 0 || result.status >= 400)
for (const result of results.sort((a, b) => b.status - a.status)) {
  if (result.status >= 400 || result.status === 0) {
    console.log(`  ${String(result.status || 'ERR').padEnd(4)} ${result.url}`)
    console.log(`       as "${[...result.labels].filter(Boolean).join('", "') || result.kind}" on ${[...result.pages].join(', ')}`)
    if (result.error) console.log(`       ${result.error}`)
  }
}

console.log(`\n${results.length - broken.length}/${results.length} OK, ${broken.length} broken.`)
await browser.close()
if (broken.length > 0) process.exitCode = 1
