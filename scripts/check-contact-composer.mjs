// The contact page under the human design (?design=human): "How can we help?" asks one
// small question at a time instead of leaving a blank box. Rules: nothing is offered until
// the field is clicked; then exactly ONE question shows, INSIDE the text box (its answers
// along the box's bottom edge), the one that tells us most first;
// hovering an answer shows its sentence in the field without writing it; pressing writes
// it and brings the next question; nothing is offered mid-sentence and the question comes
// back when the sentence is finished; Skip moves on; after the last there are none; the
// visitor's own typing survives and the field keeps focus through a press; the box grows
// with the text up to a cap and cannot be dragged.
// ONE step: name and email are on the first screen above the note, and one Send button
// sends all three. Send without them names what is missing and sends nothing. When the
// server says sent, the visitor is thanked; when it does not, the JotForm appears with all
// three filled in, and the visitor is never told it was sent. The email, phone and address
// sit together as one group. Nothing spills sideways.
// This script never submits anything: /api/contact is answered here, in the browser.
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
  // Answer the send ourselves: no real submission ever leaves this script.
  const sends = []
  let reply = { status: 200, body: { sent: true } }
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (request.url().endsWith('/api/contact') && request.method() === 'POST') { sends.push(JSON.parse(request.postData() || '{}')); return request.respond({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) }) }
    return request.continue()
  })
  await page.goto(`${base}/contact?design=human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(FIELD, { visible: true, timeout: 30000 })
  await pause(800)

  const top = await page.evaluate((height) => { const at = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().bottom) : null }; const details = [...document.querySelectorAll('[data-contact-details] a')].map((a) => a.getBoundingClientRect()); return { name: at('[data-composer-name]'), email: at('[data-composer-email]'), field: at('[data-composer-field]'), order: at('[data-composer-email]') <= document.querySelector('[data-composer-field]').getBoundingClientRect().top, steps: document.querySelectorAll('[data-composer-next]').length, gaps: details.slice(1).map((r, i) => Math.round(r.top - details[i].bottom)), height } }, height)
  check(top.name !== null && top.email !== null && top.name <= height && top.email <= height && top.order && top.steps === 0, `${width}: name and email are on the first screen, above the note, with no second step ${JSON.stringify(top)}`)
  check(top.gaps.length === 2 && top.gaps.every((gap) => gap >= 0 && gap <= 8), `${width}: the email, phone and address sit together as one group (gaps ${JSON.stringify(top.gaps)}px)`)
  const start = await page.evaluate(() => ({ options: document.querySelectorAll('[data-composer-option]').length, frames: document.querySelectorAll('[data-design-only="human"] iframe').length, fieldTop: Math.round(document.querySelector('[data-composer-field]').getBoundingClientRect().top) }))
  check(start.options === 0 && start.frames === 0 && start.fieldTop < height, `${width}: it opens as one field on the first screen, no options and no form yet ${JSON.stringify(start)}`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-closed.png` })

  const shown = () => page.evaluate(() => ({ groups: [...document.querySelectorAll('[data-composer-group]')].map((el) => el.dataset.composerGroup), options: document.querySelectorAll('[data-composer-option]').length, preview: document.querySelector('[data-composer-preview]')?.textContent ?? null }))
  await page.click(FIELD); await pause(600)
  let now = await shown()
  check(now.groups.join() === 'need' && now.options >= 3, `${width}: clicking the empty field offers one question, what you need ${JSON.stringify(now)}`)

  const inside = await page.evaluate(() => { const box = document.querySelector('[data-composer-box]').getBoundingClientRect(); const field = document.querySelector('[data-composer-field]').getBoundingClientRect(); const pills = [...document.querySelectorAll('[data-composer-option], [data-composer-skip]')].map((el) => el.getBoundingClientRect()); return { pills: pills.length, within: pills.every((r) => r.left >= box.left && r.right <= box.right && r.top >= field.bottom - 1 && r.bottom <= box.bottom), fieldInBox: field.top >= box.top && field.bottom <= box.bottom } })
  check(inside.pills >= 4 && inside.within && inside.fieldInBox, `${width}: the answers sit inside the text box, under the words ${JSON.stringify(inside)}`)

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

  // The box grows with the text, stops at a cap, and cannot be dragged.
  const boxHeight = () => page.$eval('[data-composer-grow]', (el) => Math.round(el.getBoundingClientRect().height))
  const before = await boxHeight()
  await page.focus(FIELD); await page.keyboard.type(' ' + 'A longer note about the project, its users and the deadline. '.repeat(4)); await pause(300)
  const grown = await boxHeight()
  await page.$eval(FIELD, (el) => { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(el, el.value + ' More detail on the project.'.repeat(20)); el.dispatchEvent(new Event('input', { bubbles: true })) }); await pause(300)
  const capped = await boxHeight()
  const drag = await page.$eval(FIELD, (el) => ({ resize: getComputedStyle(el).resize, scrolls: el.scrollHeight > el.clientHeight + 4 }))
  check(grown > before + 20 && capped <= 260 && capped >= grown && drag.resize === 'none' && drag.scrolls, `${width}: the box grows with the text (${before} → ${grown}px), stops at a cap (${capped}px) and then scrolls; it cannot be dragged ${JSON.stringify(drag)}`)

  // Send with nothing but the note: it names what is missing and sends nothing.
  const send = async () => { await page.$eval('[data-composer-send]', (el) => el.scrollIntoView({ block: 'center' })); await page.click('[data-composer-send]'); await pause(700) }
  await send()
  const missing = await page.evaluate(() => ({ alerts: [...document.querySelectorAll('[data-contact-composer] [role="alert"]')].map((el) => el.textContent.trim()), focused: document.activeElement?.matches('[data-composer-name]') }))
  check(sends.length === 0 && missing.alerts.length === 2 && missing.focused, `${width}: Send without a name and email says what is missing, goes to the first one, and sends nothing ${JSON.stringify(missing)}`)

  // The server cannot send: the visitor is NOT thanked, and the form itself appears, filled in.
  await page.type('[data-composer-name]', 'Test Person'); await page.type('[data-composer-email]', 'test.person@example.org')
  const note = (await value(page)).trim()
  reply = { status: 502, body: { sent: false } }
  await send()
  await page.waitForSelector('[data-composer-fallback] iframe', { timeout: 15000 }).catch(() => {})
  const fell = await page.evaluate(() => { const frame = document.querySelector('[data-composer-fallback] iframe'); const query = frame ? Object.fromEntries(new URL(frame.src).searchParams) : null; return { query, thanked: !!document.querySelector('[data-composer-sent]'), typed: document.querySelector('[data-composer-field]')?.value.trim() } })
  check(sends.length === 1 && sends[0].name === 'Test Person' && sends[0].email === 'test.person@example.org' && sends[0].message === note.slice(0, 1000), `${width}: one Send carries the name, the email and the note together ${JSON.stringify([sends.length, sends[0]?.name, sends[0]?.email, sends[0]?.message?.length])}`)
  check(!fell.thanked && fell.query?.yourName === 'Test Person' && fell.query?.yourEmail === 'test.person@example.org' && fell.query?.howCan === note.slice(0, 1000) && fell.typed === note, `${width}: when it cannot send, nobody is thanked and the form appears with all three filled in ${JSON.stringify([fell.thanked, fell.query && Object.keys(fell.query)])}`)
  if (out) { await pause(2500); await page.screenshot({ path: `${out}/${width}-3-fallback.png` }) }

  // The server sends: the visitor is thanked, by name, and the form is gone.
  await page.reload({ waitUntil: 'networkidle2' }); await page.waitForSelector(FIELD, { visible: true }); await pause(800)
  reply = { status: 200, body: { sent: true } }
  await page.type('[data-composer-name]', 'Test Person'); await page.type('[data-composer-email]', 'test.person@example.org')
  await page.click(FIELD); await pause(500); await press(page, 'A product direction'); await pause(300)
  await send()
  const thanked = await page.evaluate(() => ({ text: document.querySelector('[data-composer-sent]')?.textContent || '', form: !!document.querySelector('[data-composer-field]'), frames: document.querySelectorAll('[data-contact-composer] iframe').length }))
  check(sends.length === 2 && /Thank you, Test\./.test(thanked.text) && thanked.text.includes('test.person@example.org') && !thanked.form && thanked.frames === 0, `${width}: when it is sent, the visitor is thanked by name and told where the reply goes ${JSON.stringify(thanked)}`)
  if (out) await page.screenshot({ path: `${out}/${width}-4-sent.png` })
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
