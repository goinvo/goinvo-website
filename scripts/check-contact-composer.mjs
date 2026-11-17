// The contact page under the human design (?design=human): "How can we help?" offers
// options instead of a blank box. Rules: the options appear when the field is clicked;
// pressing one writes its sentence into the field and pressing it again takes it out;
// the visitor's own typing survives; the field keeps focus through a press; "Next"
// opens the contact form with the note already filled in; nothing spills sideways.
// Usage: node scripts/check-contact-composer.mjs [base] [--out dir]
import fs from 'node:fs'
import puppeteer from 'puppeteer'

const args = process.argv.slice(2)
const base = (args.find((arg) => !arg.startsWith('--')) || 'http://127.0.0.1:3000').replace(/\/$/, '')
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
if (out) fs.mkdirSync(out, { recursive: true })
const failures = []
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label) }
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const FIELD = '[data-composer-field]'
const option = (label) => `[data-composer-option="${label}"]`
const value = (page) => page.$eval(FIELD, (el) => el.value)
// Bring an option to the middle of the screen first: the site's chat launcher floats over the bottom edge.
const press = async (page, label) => { await page.$eval(option(label), (el) => el.scrollIntoView({ block: 'center' })); await page.click(option(label)) }

const browser = await puppeteer.launch({ headless: true })
for (const [width, height] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(`${base}/contact?design=human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(FIELD, { visible: true, timeout: 30000 })
  await pause(800)

  const start = await page.evaluate(() => ({ options: document.querySelectorAll('[data-composer-option]').length, frames: document.querySelectorAll('[data-design-only="human"] iframe').length, fieldTop: Math.round(document.querySelector('[data-composer-field]').getBoundingClientRect().top) }))
  check(start.options === 0 && start.frames === 0 && start.fieldTop < height, `${width}: it opens as one field on the first screen, no options and no form yet ${JSON.stringify(start)}`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-closed.png` })

  await page.click(FIELD); await pause(600)
  const groups = await page.$$eval('[data-composer-group]', (els) => els.map((el) => [el.dataset.composerGroup, el.querySelectorAll('[data-composer-option]').length]))
  check(groups.length === 4 && groups.every(([, count]) => count >= 3), `${width}: clicking the field offers the options ${JSON.stringify(groups)}`)

  await page.type(FIELD, 'Our intake form loses half its applicants.')
  await press(page, 'More people using it'); await press(page, 'Healthcare'); await pause(200)
  const filled = await value(page)
  const focused = await page.evaluate(() => document.activeElement?.matches('[data-composer-field]'))
  check(filled === 'Our intake form loses half its applicants. We want more people using our product. We work in healthcare.' && focused, `${width}: two presses write two sentences after the visitor's own, and the field keeps focus ("${filled}")`)
  const pressed = await page.$$eval('[data-composer-option][aria-pressed="true"]', (els) => els.map((el) => el.dataset.composerOption))
  check(pressed.join('|') === 'More people using it|Healthcare', `${width}: the pressed options show as on ${JSON.stringify(pressed)}`)

  await press(page, 'More people using it'); await pause(200)
  check(await value(page) === 'Our intake form loses half its applicants. We work in healthcare.', `${width}: pressing an option again takes only its sentence out ("${await value(page)}")`)

  await press(page, 'This quarter'); await press(page, 'Just exploring'); await pause(200)
  const timed = await value(page)
  check(timed.endsWith('We’re exploring for now.') && !timed.includes('this quarter'), `${width}: timing keeps one answer ("${timed}")`)
  check(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${width}: nothing spills sideways with the options open`)
  if (out) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${out}/${width}-1-options.png`, fullPage: true }) }

  await page.$eval('[data-composer-next]', (el) => el.scrollIntoView({ block: 'center' }))
  await page.click('[data-composer-next]')
  await page.waitForSelector('[data-composer-form] iframe', { timeout: 15000 }).catch(() => {})
  const src = await page.$eval('[data-composer-form] iframe', (el) => el.src).catch(() => '')
  const carried = src ? new URL(src).searchParams.get('howCan') : null
  check(carried === timed, `${width}: Next opens the form with the note filled in ("${carried}")`)
  if (out) { await pause(2500); await page.screenshot({ path: `${out}/${width}-2-form.png` }) }
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
