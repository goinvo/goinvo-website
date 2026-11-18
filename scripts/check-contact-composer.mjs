// The contact page under the human design (?design=human): "How can we help?" asks one
// small question at a time instead of leaving a blank box. Rules: nothing is offered until
// the field is clicked; then exactly ONE question shows, the one that tells us most first;
// hovering an answer shows its sentence in the field without writing it; pressing writes
// it and brings the next question; nothing is offered mid-sentence and the question comes
// back when the sentence is finished; Skip moves on; after the last there are none; the
// visitor's own typing survives and the field keeps focus through a press; "Next" opens
// the contact form with the note already filled in; nothing spills sideways.
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

  const shown = () => page.evaluate(() => ({ groups: [...document.querySelectorAll('[data-composer-group]')].map((el) => el.dataset.composerGroup), options: document.querySelectorAll('[data-composer-option]').length, preview: document.querySelector('[data-composer-preview]')?.textContent ?? null }))
  await page.click(FIELD); await pause(600)
  let now = await shown()
  check(now.groups.join() === 'need' && now.options >= 3, `${width}: clicking the empty field offers one question, what you need ${JSON.stringify(now)}`)

  // Hover shows the sentence where it would land, and writes nothing.
  await page.$eval(option('A product direction'), (el) => el.scrollIntoView({ block: 'center' }))
  await page.hover(option('A product direction')); await pause(250)
  now = await shown()
  check(now.preview === 'We need a clear product direction.' && (await value(page)) === '', `${width}: hovering an answer previews its sentence in the field without writing it ${JSON.stringify([now.preview, await value(page)])}`)
  if (out) await page.screenshot({ path: `${out}/${width}-1-preview.png` })
  const aligned = await page.evaluate(() => { const box = document.querySelector('[data-composer-field]').getBoundingClientRect(); const ghost = document.querySelector('[data-composer-preview] span:last-child').getBoundingClientRect(); return { dx: Math.round(ghost.left - box.left), dy: Math.round(ghost.top - box.top), inside: ghost.right <= box.right + 1 && ghost.bottom <= box.bottom + 1 } })
  check(aligned.inside && aligned.dx >= 10 && aligned.dx <= 24 && aligned.dy >= 10 && aligned.dy <= 26, `${width}: the preview sits where the words would be typed ${JSON.stringify(aligned)}`)

  await press(page, 'A product direction'); await pause(500)
  now = await shown()
  const focused = await page.evaluate(() => document.activeElement?.matches('[data-composer-field]'))
  check((await value(page)) === 'We need a clear product direction.' && now.groups.join() === 'result' && now.preview === null && focused, `${width}: pressing writes the sentence, brings the next question, previews nothing under a still pointer, and keeps the field focused ${JSON.stringify([await value(page), now.groups, now.preview, focused])}`)

  // Mid-sentence there is nothing to pick; finishing the sentence brings the question back.
  await page.focus(FIELD); await page.keyboard.type(' Our intake form loses'); await pause(300)
  now = await shown()
  check(now.groups.length === 0 && now.options === 0, `${width}: nothing is offered mid-sentence ${JSON.stringify(now)}`)
  await page.keyboard.type(' half its applicants.'); await pause(400)
  now = await shown()
  check(now.groups.join() === 'result', `${width}: finishing the sentence brings the question back ${JSON.stringify(now.groups)}`)

  await press(page, 'More people using it'); await pause(400)
  check((await value(page)) === 'We need a clear product direction. Our intake form loses half its applicants. We want more people using our product.' && (await shown()).groups.join() === 'sector', `${width}: the answer is written after the visitor's own words ("${await value(page)}")`)
  await page.$eval('[data-composer-skip]', (el) => el.scrollIntoView({ block: 'center' })); await page.click('[data-composer-skip]'); await pause(400)
  check((await shown()).groups.join() === 'timing', `${width}: Skip moves to the next question and writes nothing`)
  await press(page, 'Just exploring'); await pause(400)
  const timed = await value(page)
  now = await shown()
  check(timed.endsWith('We’re exploring for now.') && now.groups.length === 0 && now.options === 0, `${width}: after the last question there are none left ("${timed}")`)
  check(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${width}: nothing spills sideways`)
  if (out) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${out}/${width}-2-done.png`, fullPage: true }) }

  await page.$eval('[data-composer-next]', (el) => el.scrollIntoView({ block: 'center' }))
  await page.click('[data-composer-next]')
  await page.waitForSelector('[data-composer-form] iframe', { timeout: 15000 }).catch(() => {})
  const src = await page.$eval('[data-composer-form] iframe', (el) => el.src).catch(() => '')
  const carried = src ? new URL(src).searchParams.get('howCan') : null
  check(carried === timed, `${width}: Next opens the form with the note filled in ("${carried}")`)
  if (out) { await pause(2500); await page.screenshot({ path: `${out}/${width}-3-form.png` }) }
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
