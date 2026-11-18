// The ONE review panel (src/components/review/ReviewSwitches.tsx): the pages to review, the
// design options and, on the homepage study, the headline candidates. Rules: there is one
// review control on a page, not two; it starts folded, clear of the headline and of every
// control in the hero; every headline can be chosen in place, the URL records it, the
// paired line goes under it, and each fits its column at desktop and phone sizes; the panel
// links every page that has a new design and is on each of them; the design switch changes
// the page; and ?picker=off hides the panel.
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
  const P = '[data-review-ui]'
  const ALL = `${P} [data-headline-all]`
  await page.goto(`${base}/design-lab/human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(P, { visible: true, timeout: 30000 })
  await pause(1200) // let hydration finish: a press before it can lose its URL write
  // It starts as its bar, clear of the headline and the line under it: what is being judged.
  const bar = await page.evaluate(() => {
    const picker = document.querySelector('[data-review-ui]').getBoundingClientRect(), h1 = document.querySelector('#human-title'), under = h1.nextElementSibling
    const hits = (r) => r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top
    return { open: document.querySelector('[data-review-ui]').querySelector('[data-review-toggle]').getAttribute('aria-expanded') === 'true', coversHeadline: hits(h1.getBoundingClientRect()), coversLineUnder: hits(under.getBoundingClientRect()) }
  })
  check(!bar.open && !bar.coversHeadline && !bar.coversLineUnder, `${width}: the picker starts as its bar, clear of the headline and the line under it ${JSON.stringify(bar)}`)
  const controls = await page.evaluate(() => ({ review: document.querySelectorAll('[data-review-ui]').length, old: document.querySelectorAll('[data-tagline-picker]').length, stepper: document.querySelectorAll('[data-review-ui] [data-headline-stepper]').length }))
  check(controls.review === 1 && controls.old === 0 && controls.stepper === 1, `${width}: one review control on the page, with the headline stepper in it ${JSON.stringify(controls)}`)
  // Nothing of the site's own sits under the picker: every press reaches it.
  const covered = await page.evaluate(() => {
    const picker = document.querySelector('[data-review-ui]').getBoundingClientRect()
    return [...document.querySelectorAll('[aria-label="Accessibility settings"], button[aria-expanded="false"]')].filter((el) => !el.closest('[data-review-ui]')).map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top).length
  })
  check(covered === 0, `${width}: the picker overlaps none of the page's fixed controls (${covered})`)
  // Nor any control in the hero, with every challenge chosen: bottom left, the bar sat on
  // the Ipsos view links ("Full screen", "Key moments") and swallowed the press.
  for (const work of ['clinical', 'prior', 'facto']) {
    await page.goto(`${base}/design-lab/human?work=${work}`, { waitUntil: 'networkidle2', timeout: 180000 })
    await page.waitForSelector(P, { visible: true, timeout: 30000 }); await pause(900)
    const blocked = await page.evaluate(() => {
      const picker = document.querySelector('[data-review-ui]').getBoundingClientRect()
      return [...document.querySelectorAll('#human a, #human button, #human label, #human select, #human input')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' })
        .filter((el) => !el.matches('[data-case-overlay]') && !el.closest('[data-review-ui]')) // the preview is one big link; a corner of it stays clickable
        .filter((el) => { const r = el.getBoundingClientRect(); return r.left < picker.right && r.right > picker.left && r.top < picker.bottom && r.bottom > picker.top })
        .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30))
    })
    check(blocked.length === 0, `${width} ${work}: the picker sits on none of the hero's controls ${JSON.stringify(blocked)}`)
  }
  await page.goto(`${base}/design-lab/human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(P, { visible: true, timeout: 30000 }); await pause(900)
  await page.click(`${P} [data-review-toggle]`); await pause(200) // open the panel,
  // The three directions under review are one press each, and each shows its lead line.
  const leads = { human: 'Complexity, made human.', impact: 'Design for impact.', ship: 'Designs that ship, with stewardship.' }
  for (const [lead, text] of Object.entries(leads)) {
    await page.$eval(`${P} [data-direction="${lead}"]`, (el) => el.click()); await pause(450)
    const shown = await page.evaluate((key) => ({ title: document.querySelector('#human-title').textContent.trim(), param: new URL(location.href).searchParams.get('headline'), pressed: [...document.querySelectorAll('[data-direction][aria-pressed="true"]')].map((el) => el.dataset.direction), under: document.querySelector('#human-title').nextElementSibling.textContent.trim().length }), lead)
    check(shown.title === text && shown.param === lead && shown.pressed.length === 1 && shown.pressed[0] === lead && shown.under > 20, `${width}: the ${lead} direction shows its lead line with a line under it ${JSON.stringify(shown)}`)
  }
  await page.$eval(`${P} [data-direction="impact"]`, (el) => el.click()); await pause(300)
  await page.click(ALL); await pause(200) // then the list to choose from it
  const keys = await page.$$eval(`${P} [data-tagline-option]`, (els) => els.map((el) => [el.dataset.taglineOption, el.textContent.trim()]))
  check(keys.length >= 15, `${width}: the picker lists every candidate (${keys.length})`)
  const defaultTitle = await page.$eval('#human-title', (el) => el.textContent.trim())
  check(defaultTitle === keys[0][1], `${width}: without a choice the page shows the default headline ("${defaultTitle}")`)

  for (const [key, text] of keys) {
    await page.$eval(`${P} [data-tagline-option="${key}"]`, (el) => el.click())
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
      await page.screenshot({ path: `${out}/${width}-${key}.png` })
    }
  }

  // A chosen line under it, then back to the pair.
  await page.select(`${P} [data-headline-subline]`, 'return'); await pause(300)
  const chosen = await page.evaluate(() => ({ param: new URL(location.href).searchParams.get('subline'), text: document.querySelector('#human-title').nextElementSibling.textContent }))
  check(chosen.param === 'return' && chosen.text.startsWith('91% of our clients'), `${width}: a chosen line under the headline is shown and recorded ${JSON.stringify(chosen)}`)

  // The stepper in the bar moves to the next headline with the panel folded.
  await page.click(`${P} [data-review-toggle]`); await pause(200)
  const beforeStep = await page.$eval('#human-title', (el) => el.textContent.trim())
  await page.click(`${P} [aria-label="Next headline"]`); await pause(500)
  const afterStep = await page.evaluate(() => ({ title: document.querySelector('#human-title').textContent.trim(), panel: Boolean(document.querySelector('[data-review-panel]')) }))
  check(afterStep.title !== beforeStep && !afterStep.panel, `${width}: the arrows in the folded bar step the headline ("${afterStep.title}")`)

  // The pages are linked from the panel, the panel is on each of them, and the design switch works there.
  await page.click(`${P} [data-review-toggle]`); await pause(200)
  const links = await page.$$eval(`${P} [data-review-page]`, (els) => els.map((el) => [el.getAttribute('href'), el.getAttribute('aria-current')]))
  check(JSON.stringify(links.map((l) => l[0])) === JSON.stringify(['/design-lab/human', '/services', '/contact']) && links[0][1] === 'page', `${width}: the panel links every page with a new design and marks this one ${JSON.stringify(links)}`)
  for (const href of ['/services', '/contact']) {
    await page.goto(`${base}${href}?design=human`, { waitUntil: 'networkidle2', timeout: 180000 })
    await page.waitForSelector(P, { visible: true, timeout: 30000 }); await pause(900)
    // Measured folded, as it arrives on a first visit (it remembers being opened).
    if (await page.$('[data-review-panel]')) { await page.click(`${P} [data-review-toggle]`); await pause(200) }
    const there = await page.evaluate(() => {
      const bar = document.querySelector('[data-review-ui]').getBoundingClientRect()
      const hits = (r) => r.width > 2 && r.left < bar.right && r.right > bar.left && r.top < bar.bottom && r.bottom > bar.top
      const blocked = [...document.querySelectorAll('main a, main button, main input, main textarea, header a, header button, [data-chat-launcher], [data-chat-teaser]')].filter((el) => !el.closest('[data-review-ui]') && getComputedStyle(el).visibility !== 'hidden' && hits(el.getBoundingClientRect())).map((el) => (el.textContent || el.tagName).trim().slice(0, 30))
      return { design: document.documentElement.dataset.design, human: Boolean(document.querySelector('[data-design-only="human"]')), stepper: document.querySelectorAll('[data-headline-stepper]').length, blocked, panelOpen: Boolean(document.querySelector('[data-review-panel]')) }
    })
    check(there.design === 'human' && there.stepper === 0 && there.blocked.length === 0, `${width} ${href}: the panel is here, with no headline controls, sitting on none of the page's controls ${JSON.stringify(there)}`)
    if (!there.panelOpen) { await page.click(`${P} [data-review-toggle]`); await pause(200) }
    const current = await page.$eval(`${P} [data-review-page="${href}"]`, (el) => el.getAttribute('aria-current'))
    await page.$eval(`${P} input[name="review-design"][value="classic"]`, (el) => el.click()); await pause(300)
    const classic = await page.evaluate(() => ({ design: document.documentElement.dataset.design ?? null, panel: Boolean(document.querySelector('[data-review-ui]')) }))
    await page.$eval(`${P} input[name="review-design"][value="human"]`, (el) => el.click()); await pause(300)
    const back = await page.evaluate(() => document.documentElement.dataset.design)
    check(current === 'page' && classic.design === null && classic.panel && back === 'human', `${width} ${href}: marked as this page; Classic and New switch the design and the panel stays ${JSON.stringify([current, classic, back])}`)
    if (out) await page.screenshot({ path: `${out}/${width}-panel${href.replace('/', '-')}.png` })
  }
  // A link in the panel goes to the page.
  await page.$eval(`${P} [data-review-page="/design-lab/human"]`, (el) => el.click())
  await page.waitForFunction(() => location.pathname === '/design-lab/human', { timeout: 60000 }).catch(() => {})
  await page.waitForSelector('#human-title', { timeout: 60000 }).catch(() => {})
  check(await page.evaluate(() => location.pathname === '/design-lab/human' && Boolean(document.querySelector('#human-title'))), `${width}: a page link in the panel opens that page`)
  await page.close()
}

const clean = await browser.newPage()
await clean.goto(`${base}/design-lab/human?headline=used&picker=off`, { waitUntil: 'networkidle2', timeout: 180000 })
await pause(800)
const cleanState = await clean.evaluate(() => ({ picker: Boolean(document.querySelector('[data-review-ui]')), title: document.querySelector('#human-title').textContent.trim(), under: document.querySelector('#human-title').nextElementSibling.textContent.slice(0, 30) }))
check(!cleanState.picker && cleanState.title === 'Software people actually use.' && cleanState.under.startsWith('Over 90% of Ipsos'), `a shared link opens on its headline and pair, and ?picker=off hides the picker ${JSON.stringify(cleanState)}`)
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
