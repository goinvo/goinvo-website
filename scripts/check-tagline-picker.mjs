// The homepage study's headline picker (review only). Rules: every candidate can be
// chosen in place, the URL records it, the paired line goes under it, each headline
// fits its column at desktop and phone sizes, and ?picker=off hides the picker.
// Usage: node scripts/check-tagline-picker.mjs [base] [--out dir]
import fs from 'node:fs'
import puppeteer from 'puppeteer'

const args = process.argv.slice(2)
const base = (args.find((arg) => !arg.startsWith('--')) || 'http://127.0.0.1:3000').replace(/\/$/, '')
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
if (out) fs.mkdirSync(out, { recursive: true })
const failures = []
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label) }
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const browser = await puppeteer.launch({ headless: true })
for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  // A desktop gets the floating picker; a phone, the one in the page above the headline.
  const P = width < 768 ? '[data-tagline-picker="inline"]' : '[data-tagline-picker="floating"]'
  await page.goto(`${base}/design-lab/human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(P, { visible: true, timeout: 30000 })
  await pause(1200) // let hydration finish: a press before it can lose its URL write
  // It starts as its bar, clear of the headline and the line under it: what is being judged.
  const bar = await page.evaluate(() => {
    const picker = [...document.querySelectorAll('[data-tagline-picker]')].find((el) => el.getBoundingClientRect().height > 0).getBoundingClientRect(), h1 = document.querySelector('#human-title'), under = h1.nextElementSibling
    const hits = (r) => r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top
    return { open: [...document.querySelectorAll('[data-tagline-picker]')].find((el) => el.getBoundingClientRect().height > 0).querySelector('[aria-expanded]').getAttribute('aria-expanded') === 'true', coversHeadline: hits(h1.getBoundingClientRect()), coversLineUnder: hits(under.getBoundingClientRect()) }
  })
  check(!bar.open && !bar.coversHeadline && !bar.coversLineUnder, `${width}: the picker starts as its bar, clear of the headline and the line under it ${JSON.stringify(bar)}`)
  await page.click(`${P} [aria-expanded]`)
  // Nothing of the site's own sits under the picker: every press reaches it.
  const covered = await page.evaluate(() => {
    const picker = [...document.querySelectorAll('[data-tagline-picker]')].find((el) => el.getBoundingClientRect().height > 0).getBoundingClientRect()
    return [...document.querySelectorAll('[aria-label="Accessibility settings"], button[aria-expanded="false"]')].filter((el) => !el.closest('[data-tagline-picker]')).map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top).length
  })
  check(covered === 0, `${width}: the picker overlaps none of the page's fixed controls (${covered})`)
  // Nor any control in the hero, with every challenge chosen: bottom left, the bar sat on
  // the Ipsos view links ("Full screen", "Key moments") and swallowed the press.
  for (const work of ['clinical', 'prior', 'facto']) {
    await page.goto(`${base}/design-lab/human?work=${work}`, { waitUntil: 'networkidle2', timeout: 180000 })
    await page.waitForSelector(P, { visible: true, timeout: 30000 }); await pause(900)
    const blocked = await page.evaluate(() => {
      const picker = [...document.querySelectorAll('[data-tagline-picker]')].find((el) => el.getBoundingClientRect().height > 0).getBoundingClientRect()
      return [...document.querySelectorAll('#human a, #human button, #human label, #human select, #human input')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' })
        .filter((el) => !el.matches('[data-case-overlay]') && !el.closest('[data-tagline-picker]')) // the preview is one big link; a corner of it stays clickable
        .filter((el) => { const r = el.getBoundingClientRect(); return r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top })
        .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30))
    })
    check(blocked.length === 0, `${width} ${work}: the picker sits on none of the hero's controls ${JSON.stringify(blocked)}`)
  }
  await page.goto(`${base}/design-lab/human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(P, { visible: true, timeout: 30000 }); await pause(900)
  await page.click(`${P} [aria-expanded]`) // open the list to choose from it
  const keys = await page.$$eval(`${P} [data-tagline-option]`, (els) => els.map((el) => [el.dataset.taglineOption, el.textContent.trim()]))
  check(keys.length >= 15, `${width}: the picker lists every candidate (${keys.length})`)
  const defaultTitle = await page.$eval('#human-title', (el) => el.textContent.trim())
  check(defaultTitle === keys[0][1], `${width}: without a choice the page shows the default headline ("${defaultTitle}")`)

  for (const [key, text] of keys) {
    await page.click(`${P} [data-tagline-option="${key}"]`)
    await page.waitForFunction((want) => document.querySelector('#human-title')?.textContent.trim() === want, { timeout: 5000 }, text).catch(() => {})
    await pause(450)
    const state = await page.evaluate(() => {
      const h1 = document.querySelector('#human-title'), column = h1.parentElement, r = h1.getBoundingClientRect()
      return {
        title: h1.textContent.trim(),
        param: new URL(location.href).searchParams.get('headline'),
        subline: h1.nextElementSibling?.textContent.trim().slice(0, 40),
        fits: h1.scrollWidth <= h1.clientWidth + 1 && r.right <= column.getBoundingClientRect().right + 1 && r.left >= 0,
        lines: Math.round(r.height / parseFloat(getComputedStyle(h1).lineHeight)),
        overflow: document.documentElement.scrollWidth - innerWidth,
        size: Math.round(parseFloat(getComputedStyle(h1).fontSize)),
      }
    })
    check(state.title === text && state.param === key && state.fits && state.overflow <= 0 && state.lines <= (width < 768 ? 7 : 5), `${width} ${key}: shown in place, in the URL, and fits ${JSON.stringify(state)}`)
    if (out && width !== 1280) {
      await page.evaluate(() => scrollTo(0, 0))
      await page.click(`${P} [aria-expanded]`); await pause(200)
      await page.screenshot({ path: `${out}/${width}-${key}.png` })
      await page.click(`${P} [aria-expanded]`); await pause(150)
    }
  }

  // A chosen line under it, then back to the pair.
  await page.select(`${P} select`, 'return'); await pause(300)
  const chosen = await page.evaluate(() => ({ param: new URL(location.href).searchParams.get('subline'), text: document.querySelector('#human-title').nextElementSibling.textContent }))
  check(chosen.param === 'return' && chosen.text.startsWith('91% of our clients'), `${width}: a chosen line under the headline is shown and recorded ${JSON.stringify(chosen)}`)
  await page.close()
}

const clean = await browser.newPage()
await clean.goto(`${base}/design-lab/human?headline=used&picker=off`, { waitUntil: 'networkidle2', timeout: 180000 })
await pause(800)
const cleanState = await clean.evaluate(() => ({ picker: Boolean(document.querySelector('[data-tagline-picker]')), title: document.querySelector('#human-title').textContent.trim(), under: document.querySelector('#human-title').nextElementSibling.textContent.slice(0, 30) }))
check(!cleanState.picker && cleanState.title === 'Software people actually use.' && cleanState.under.startsWith('Over 90% of Ipsos'), `a shared link opens on its headline and pair, and ?picker=off hides the picker ${JSON.stringify(cleanState)}`)
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
