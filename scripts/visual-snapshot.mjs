// Before/after visual snapshots of the main pages, pixel-diffed. For refactors that
// must not change what a visitor sees (CSS layering, token moves): capture before,
// change, capture after, compare. Capture the baseline twice first to learn the
// noise floor (live widgets, video) so a real change is told apart from flicker.
//
//   node scripts/visual-snapshot.mjs capture <name>          (server on :3111, or BASE=)
//   DESIGN=human node scripts/visual-snapshot.mjs capture <name>   (with the review switch on)
//   node scripts/visual-snapshot.mjs compare <before> <after>
//
// Output: .audit/visual-snapshots/<name>/<page>@<width>.png, and for compare a
// report plus diff images (changed pixels in red) in .audit/visual-snapshots/diff-<before>-<after>/.
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'
import sharp from 'sharp'

const base = process.env.BASE || 'http://127.0.0.1:3111'
const root = path.resolve('.audit/visual-snapshots')
const pages = ['/', '/work', '/work/guidelines', '/work/prior-auth', '/services', '/about', '/vision', '/contact', '/vision/determinants-of-health', '/design-lab/human']
const widths = [[1440, 900], [390, 844]]
const file = (page, width) => `${page === '/' ? 'home' : page.slice(1).replace(/\//g, '_')}@${width}.png`
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const [command, a, b] = process.argv.slice(2)

if (command === 'capture') {
  if (!a) throw new Error('capture <name>')
  const dir = path.join(root, a)
  await fs.mkdir(dir, { recursive: true })
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const [width, height] of widths) {
      const page = await browser.newPage()
      await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 })
      // The review switch is a cookie read before first paint; set it (or clear it) up front.
      await page.setCookie({ name: 'goinvo-design', value: process.env.DESIGN === 'human' ? 'human' : '', url: base })
      for (const p of pages) {
        await page.goto(base + p, { waitUntil: 'load', timeout: 180000 })
        // Freeze what moves on its own; scroll through once so scroll reveals have run.
        await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important} iframe[src*="eocampaign"],[class*="ChatWidget"],div.fixed.right-4.bottom-4{visibility:hidden!important}' })
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } scrollTo(0, 0) })
        // Entrance animations (a hero fading in) must have finished, or the capture
        // catches them mid-way and reports a change that is only timing.
        await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming?.().iterations === Infinity), { timeout: 8000, polling: 100 }).catch(() => {})
        await pause(2000)
        await page.screenshot({ path: path.join(dir, file(p, width)), fullPage: true })
        console.log('captured', p, width)
      }
      await page.close()
    }
  } finally { await browser.close() }
} else if (command === 'compare') {
  if (!a || !b) throw new Error('compare <before> <after>')
  const out = path.join(root, `diff-${a}-${b}`)
  await fs.mkdir(out, { recursive: true })
  const rows = []
  for (const [width] of widths) for (const p of pages) {
    const name = file(p, width)
    const [x, y] = await Promise.all([a, b].map(n => sharp(path.join(root, n, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })))
    const w = Math.min(x.info.width, y.info.width), h = Math.min(x.info.height, y.info.height)
    const diff = Buffer.alloc(w * h * 4)
    let changed = 0
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      const i = (row * x.info.width + col) * 4, j = (row * y.info.width + col) * 4, k = (row * w + col) * 4
      const delta = Math.max(Math.abs(x.data[i] - y.data[j]), Math.abs(x.data[i + 1] - y.data[j + 1]), Math.abs(x.data[i + 2] - y.data[j + 2]))
      if (delta > 24) { changed++; diff[k] = 255; diff[k + 3] = 255 } else { diff[k] = diff[k + 1] = diff[k + 2] = x.data[i] * 0.3; diff[k + 3] = 255 }
    }
    const heightChange = y.info.height - x.info.height
    const percent = (100 * changed / (w * h)).toFixed(3)
    rows.push({ page: p, width, percent: Number(percent), heightChange })
    if (changed) await sharp(diff, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(out, name))
    console.log(`${p.padEnd(32)} ${String(width).padStart(4)}  ${percent.padStart(7)}% changed  height ${heightChange >= 0 ? '+' : ''}${heightChange}px`)
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(rows, null, 2))
} else {
  console.log('usage: capture <name> | compare <before> <after>')
}
