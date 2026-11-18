// The services page under the human design (?design=human), told from the buyer's side.
// Rules: the first screen says what we do in one sentence and shows the three services (no
// hero image above them), each with its own picture, what you get, how long it takes and
// what it costs; the page then says what working with us is like (who, in the room, between
// sessions) and shows the hours we share with a team in each place, matching the arithmetic;
// choosing a service shows its steps and what you hold at the end; choosing quickly never
// leaves the steps invisible; the tabs work by keyboard; the page stays short on words;
// nothing spills sideways.
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
const WORD_LIMIT = 460
/** Shared working hours with a 9-to-5 Eastern studio, by place (hours ahead of Eastern). */
const SHARED = { boston: 8, pacific: 5, europe: 3, asia: 0 }
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
  await page.waitForSelector('[data-service-rows]', { visible: true, timeout: 30000 })
  await pause(600)

  const first = await page.evaluate(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const root = document.querySelector('[data-journey-tabs]').closest('[data-design-only="human"]') || document
    const tabs = [...document.querySelectorAll('[data-service-row]')].filter(visible)
    const imagesAbove = [...root.querySelectorAll('img')].filter((img) => visible(img) && img.getBoundingClientRect().top < tabs[0].getBoundingClientRect().top)
    const fact = (tab, name) => { const el = [...tab.querySelectorAll(`[data-journey-fact="${name}"]`)].find(visible); return el ? { text: el.textContent.trim(), bottom: Math.round(el.getBoundingClientRect().bottom) } : null }
    return {
      tabs: tabs.map((tab) => ({ image: (() => { const img = [...tab.querySelectorAll('img')].find(visible); return img ? { src: img.currentSrc || img.src, loaded: img.complete && img.naturalWidth > 0, bottom: Math.round(img.getBoundingClientRect().bottom), width: Math.round(img.getBoundingClientRect().width) } : null })(), id: tab.dataset.serviceRow, bottom: Math.round(tab.getBoundingClientRect().bottom), hold: fact(tab, 'hold'), length: fact(tab, 'length'), investment: fact(tab, 'investment') })),
      imagesAbove: imagesAbove.length,
      whatWeDo: (() => { const el = root.querySelector('[data-what-we-do]'); return el ? { text: el.textContent.trim(), bottom: Math.round(el.getBoundingClientRect().bottom) } : null })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      words: root.innerText.split(/\s+/).filter(Boolean).length,
    }
  })
  check(!!first.whatWeDo && /design studio/.test(first.whatWeDo.text) && /in person/.test(first.whatWeDo.text) && first.whatWeDo.bottom <= height, `${width}: the first screen says what we do, in one sentence ${JSON.stringify(first.whatWeDo)}`)
  check(first.tabs.length === 3 && first.tabs.every((tab) => tab.bottom <= height), `${width}: the three services are on the first screen ${JSON.stringify(first.tabs.map((tab) => tab.bottom))}`)
  // The important information, per service, without a scroll or a press.
  const facts = first.tabs.every((tab) => ['hold', 'length', 'investment'].every((name) => tab[name]?.text && tab[name].bottom <= height))
  check(facts && first.tabs.every((tab) => tab.hold.text.includes(HOLD[tab.id]) && /\$\d/.test(tab.investment.text)), `${width}: each service shows what you get, how long and the investment on the first screen ${JSON.stringify(first.tabs.map((tab) => [tab.hold?.text, tab.length?.text, tab.investment?.text]))}`)
  // One picture per service, its own, painted, on the first screen.
  const pictures = first.tabs.map((tab) => tab.image)
  check(pictures.every((image) => image?.loaded && image.width >= 80 && image.bottom <= height) && new Set(pictures.map((image) => image?.src)).size === 3, `${width}: each service has its own picture on the first screen ${JSON.stringify(pictures.map((image) => image && [image.loaded, image.width, image.bottom]))}`)
  // No picture twice anywhere on the page: seven places, seven pictures, all painted.
  const all = await page.evaluate(async () => {
    const root = document.querySelector('[data-journey-tabs]').closest('[data-design-only="human"]') || document
    const imgs = [...root.querySelectorAll('[data-service-row] img, [data-sector] img, [data-working] img')].filter((img) => img.getBoundingClientRect().width > 0)
    for (const img of imgs) { img.loading = 'eager'; await img.decode().catch(() => {}) }
    return imgs.map((img) => ({ file: new URL(img.currentSrc || img.src).searchParams.get('url') || new URL(img.currentSrc || img.src).pathname, loaded: img.naturalWidth > 0 }))
  })
  check(all.length === 8 && all.every((img) => img.loaded) && new Set(all.map((img) => img.file)).size === 8, `${width}: eight pictures on the page, none used twice ${JSON.stringify(all.map((img) => img.file.split('/').pop()))}`)
  check(first.imagesAbove === 0, `${width}: no image above the services (${first.imagesAbove})`)
  // A phone's menu carries Contact; the services need the first screen.
  if (width < 768) check(await page.evaluate(() => ![...document.querySelectorAll('[data-design-only="human"] a')].some((a) => a.textContent.includes('Schedule a chat') && a.getBoundingClientRect().height > 0 && a.getBoundingClientRect().top < innerHeight)), `${width}: no "Schedule a chat" crowding the phone's first screen`)
  check(first.overflow <= 0, `${width}: nothing spills sideways (${first.overflow}px)`)
  check(first.words <= WORD_LIMIT, `${width}: the page stays short on words (${first.words} of ${WORD_LIMIT})`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-first-screen.png` })

  // What working with us is like: three ways, and the shared hours for each place.
  const ways = await page.evaluate(() => [...document.querySelectorAll('[data-working-way]')].filter((el) => el.getBoundingClientRect().height > 0).map((el) => el.dataset.workingWay))
  check(ways.join() === 'people,room,async', `${width}: working with us is told in three parts ${JSON.stringify(ways)}`)
  for (const [place, hours] of Object.entries(SHARED)) {
    await page.click(`[data-place="${place}"]`)
    await pause(900)
    const band = await page.evaluate(() => {
      const root = document.querySelector('[data-hours-band]')
      const track = root.querySelector('[data-shared]')?.parentElement
      const sharedWidth = [...root.querySelectorAll('[data-shared]')].reduce((sum, el) => sum + el.getBoundingClientRect().width, 0)
      return { hours: track ? Math.round((sharedWidth / track.getBoundingClientRect().width) * 24 * 10) / 10 : 0, summary: root.querySelector('[data-hours-summary]').textContent.trim(), means: root.querySelector('[data-hours-means]').textContent.trim().length, pressed: root.querySelector('[aria-pressed="true"]')?.dataset.place, overflow: document.documentElement.scrollWidth - innerWidth }
    })
    const says = hours === 0 ? /^No shared/.test(band.summary) : hours === 8 ? /All eight/.test(band.summary) : band.summary.includes(`About ${hours} shared hours`)
    check(band.pressed === place && Math.abs(band.hours - hours) < 0.2 && says && band.means > 20 && band.overflow <= 0, `${width} ${place}: the band draws ${hours} shared hours and says so ${JSON.stringify(band)}`)
    if (out && place === 'europe') { await page.evaluate(() => document.querySelector('[data-working]').scrollIntoView({ block: 'start' })); await pause(300); await page.screenshot({ path: `${out}/${width}-working.png`, fullPage: false }); await page.evaluate(() => document.querySelector('[data-hours-band]').scrollIntoView({ block: 'center' })); await pause(300); await page.screenshot({ path: `${out}/${width}-hours.png`, fullPage: false }) }
  }

  // A service on the first screen leads to its own engagement below.
  await page.evaluate(() => scrollTo(0, 0))
  await page.click('[data-service-row="ship"]')
  check(await settled(page, 'ship'), `${width}: pressing a service on the first screen opens its engagement`)
  // The page is still gliding to the engagement; a press aimed mid-glide lands on whatever passes under it.
  await pause(1500)
  check(await page.evaluate(() => { const top = document.getElementById('how').getBoundingClientRect().top; return top > -40 && top < 200 }), `${width}: and brings that section to the top of the screen`)

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
