// The services page under the human design (?design=human), told from the buyer's side.
// Rules: the three services are on the first screen (no hero image above them); choosing
// one shows its steps, what you hold at the end, and the engagement; the tabs work by
// keyboard; nothing spills sideways. Screenshots of each choice go to --out.
// Usage: node scripts/check-services-journeys.mjs [base] [--out dir]
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
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(`${base}/services?design=human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector('[data-journey-tabs]', { visible: true, timeout: 30000 })
  await pause(600)

  const first = await page.evaluate(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const root = document.querySelector('[data-journey-tabs]').closest('[data-design-only="human"]') || document
    const tabs = [...document.querySelectorAll('[data-journey-tab]')].filter(visible)
    const imagesAbove = [...root.querySelectorAll('img')].filter((img) => visible(img) && img.getBoundingClientRect().top < tabs[0].getBoundingClientRect().top)
    return {
      tabs: tabs.map((tab) => ({ text: tab.querySelector('.text-title')?.textContent, top: Math.round(tab.getBoundingClientRect().top), bottom: Math.round(tab.getBoundingClientRect().bottom) })),
      h1: document.querySelector('#services-title')?.textContent,
      imagesAbove: imagesAbove.length,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }
  })
  const fold = height
  const onFirstScreen = first.tabs.every((tab) => tab.bottom <= fold)
  check(first.tabs.length === 3 && onFirstScreen, `${width}: the three services are on the first screen ${JSON.stringify(first.tabs)}`)
  check(first.imagesAbove === 0, `${width}: no image above the services (${first.imagesAbove})`)
  // A phone's menu carries Contact; the services need the first screen.
  if (width < 768) check(await page.evaluate(() => ![...document.querySelectorAll('[data-design-only="human"] a')].some((a) => a.textContent.includes('Schedule a chat') && a.getBoundingClientRect().height > 0 && a.getBoundingClientRect().top < innerHeight)), `${width}: no "Schedule a chat" crowding the phone's first screen`)
  check(first.overflow <= 0, `${width}: nothing spills sideways (${first.overflow}px)`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-first-screen.png` })

  for (const id of ['direction', 'usable', 'ship']) {
    await page.click(`[data-journey-tab="${id}"]`)
    // The steps arrive one after another; wait for the last to settle (never more than 3s).
    await page.waitForFunction((want) => {
      const panel = document.querySelector('[role="tabpanel"][data-journey-panel]')
      return panel?.dataset.journeyPanel === want && [...panel.querySelectorAll('[data-journey-step]')].every((el) => Number(getComputedStyle(el).opacity) > 0.99)
    }, { timeout: 3000 }, id).catch(() => {})
    const panel = await page.evaluate(() => {
      const panel = document.querySelector('[role="tabpanel"][data-journey-panel]')
      return {
        id: panel.dataset.journeyPanel,
        steps: panel.querySelectorAll('[data-journey-step]').length,
        hold: panel.querySelector('[data-journey-hold] h3')?.textContent,
        investment: panel.querySelector('[data-journey-hold] dd.font-serif')?.textContent,
        selected: document.querySelector('[data-journey-tab][aria-selected="true"]')?.dataset.journeyTab,
        stepOpacity: Math.min(...[...panel.querySelectorAll('[data-journey-step]')].map((el) => Number(getComputedStyle(el).opacity))),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }
    })
    check(panel.id === id && panel.selected === id && panel.steps === 3 && panel.hold && panel.investment && panel.stepOpacity > 0.99 && panel.overflow <= 0, `${width} ${id}: shows its steps, what you hold and the investment ${JSON.stringify(panel)}`)
    if (out) {
      await page.evaluate(() => document.querySelector('[data-journey-tabs]').scrollIntoView({ block: 'start' }))
      await page.evaluate(() => scrollBy(0, -120)); await pause(300)
      await page.screenshot({ path: `${out}/${width}-${id}.png`, fullPage: false })
    }
  }

  // Keyboard: arrows move between the questions, like any tab list.
  await page.focus('[data-journey-tab][aria-selected="true"]')
  await page.keyboard.press('ArrowRight'); await pause(500)
  const afterArrow = await page.evaluate(() => ({ selected: document.querySelector('[aria-selected="true"]')?.dataset.journeyTab, focused: document.activeElement?.dataset.journeyTab }))
  check(afterArrow.selected === 'direction' && afterArrow.focused === 'direction', `${width}: ArrowRight wraps from the last question to the first ${JSON.stringify(afterArrow)}`)
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
