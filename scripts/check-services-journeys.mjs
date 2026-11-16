// The services page under the human design (?design=human), told from the buyer's side.
// Rules: the three services are on the first screen (no hero image above them), each with
// what you get, how long it takes and what it costs; choosing one shows its steps and what
// you hold at the end; choosing quickly never leaves the steps invisible; the tabs work by
// keyboard; the page stays short on words; nothing spills sideways.
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
/** The page's own words, the scheduler aside: more than this and it reads as a brochure. */
const WORD_LIMIT = 260
const HOLD = { direction: 'A Product Blueprint', usable: 'Interactions people can trust', ship: 'Working software' }

const settled = (page, id) => page.waitForFunction((want, hold) => {
  const panel = document.querySelector('[role="tabpanel"][data-journey-panel]')
  const steps = [...(panel?.querySelectorAll('[data-journey-step]') ?? [])]
  return panel?.dataset.journeyPanel === want && panel.querySelector('[data-journey-hold] h3')?.textContent === hold
    && steps.length === 3 && steps.every((el) => Number(getComputedStyle(el).opacity) > 0.99)
}, { timeout: 4000 }, id, HOLD[id]).then(() => true, () => false)

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
    const fact = (tab, name) => { const el = [...tab.querySelectorAll(`[data-journey-fact="${name}"]`)].find(visible); return el ? { text: el.textContent.trim(), bottom: Math.round(el.getBoundingClientRect().bottom) } : null }
    return {
      tabs: tabs.map((tab) => ({ id: tab.dataset.journeyTab, bottom: Math.round(tab.getBoundingClientRect().bottom), hold: fact(tab, 'hold'), length: fact(tab, 'length'), investment: fact(tab, 'investment') })),
      imagesAbove: imagesAbove.length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      words: root.innerText.split(/\s+/).filter(Boolean).length,
    }
  })
  check(first.tabs.length === 3 && first.tabs.every((tab) => tab.bottom <= height), `${width}: the three services are on the first screen ${JSON.stringify(first.tabs.map((tab) => tab.bottom))}`)
  // The important information, per service, without a scroll or a press.
  const facts = first.tabs.every((tab) => ['hold', 'length', 'investment'].every((name) => tab[name]?.text && tab[name].bottom <= height))
  check(facts && first.tabs.every((tab) => tab.hold.text.includes(HOLD[tab.id]) && /\$\d/.test(tab.investment.text)), `${width}: each service shows what you get, how long and the investment on the first screen ${JSON.stringify(first.tabs.map((tab) => [tab.hold?.text, tab.length?.text, tab.investment?.text]))}`)
  check(first.imagesAbove === 0, `${width}: no image above the services (${first.imagesAbove})`)
  // A phone's menu carries Contact; the services need the first screen.
  if (width < 768) check(await page.evaluate(() => ![...document.querySelectorAll('[data-design-only="human"] a')].some((a) => a.textContent.includes('Schedule a chat') && a.getBoundingClientRect().height > 0 && a.getBoundingClientRect().top < innerHeight)), `${width}: no "Schedule a chat" crowding the phone's first screen`)
  check(first.overflow <= 0, `${width}: nothing spills sideways (${first.overflow}px)`)
  check(first.words <= WORD_LIMIT, `${width}: the page stays short on words (${first.words} of ${WORD_LIMIT})`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-first-screen.png` })

  for (const id of ['direction', 'usable', 'ship']) {
    await page.click(`[data-journey-tab="${id}"]`)
    const ok = await settled(page, id)
    const state = await page.evaluate(() => ({ selected: document.querySelector('[data-journey-tab][aria-selected="true"]')?.dataset.journeyTab, overflow: document.documentElement.scrollWidth - innerWidth }))
    check(ok && state.selected === id && state.overflow <= 0, `${width} ${id}: shows its three steps and what you hold ${JSON.stringify(state)}`)
    if (out) {
      await page.evaluate(() => document.querySelector('[data-journey-tabs]').scrollIntoView({ block: 'start' }))
      await page.evaluate(() => scrollBy(0, -120)); await pause(300)
      await page.screenshot({ path: `${out}/${width}-${id}.png`, fullPage: false })
    }
  }

  // Three presses in a row: the last one wins and its steps are visible.
  for (const id of ['direction', 'usable', 'ship', 'usable']) await page.click(`[data-journey-tab="${id}"]`)
  check(await settled(page, 'usable'), `${width}: choosing quickly ends on the last choice, steps visible`)

  // Keyboard: arrows move between the questions, like any tab list.
  await page.click('[data-journey-tab="ship"]')
  await page.focus('[data-journey-tab][aria-selected="true"]')
  await page.keyboard.press('ArrowRight'); await pause(500)
  const afterArrow = await page.evaluate(() => ({ selected: document.querySelector('[aria-selected="true"]')?.dataset.journeyTab, focused: document.activeElement?.dataset.journeyTab }))
  check(afterArrow.selected === 'direction' && afterArrow.focused === 'direction', `${width}: ArrowRight wraps from the last question to the first ${JSON.stringify(afterArrow)}`)
  if (out && width !== 1280) { await page.evaluate(() => scrollTo(0, 0)); await pause(300); await page.screenshot({ path: `${out}/${width}-full.png`, fullPage: true }) }
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
