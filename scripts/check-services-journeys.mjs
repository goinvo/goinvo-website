// The services page under the human design (?design=human): clean, scoped, simple, actionable.
// Rules, from the survey in docs/research/services-pages-2026-11-18.md:
//  - the first screen is ONE statement: the headline, the what-we-do sentence, one way to act,
//    and the three questions as an index; no picture, no price, at most 70 words;
//  - below it the page is one block repeated three times, each with its own picture, what
//    you get, who you work with, how long, the investment and one link to act on; no step
//    sequence (it read as a template and added nothing to the message);
//  - each question in the index lands on its own block;
//  - proof is one section; there is no chart and no tab list; the page stays under 380 words (the surveyed pages run 206 to 1,175, median about 450);
//  - pressing a service's "Ask us about this" lands on the contact form with that service's
//    sentence in the box and the NEXT question offered (never the one just answered, and
//    only one question at a time); a second service replaces the first; the
//    visitor's own words survive; booking a call is folded away until asked for;
//  - its testimonial is not one a homepage also shows;
//  - nothing spills sideways.
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
const WORD_LIMIT = 380
const FIRST_SCREEN_WORDS = 70
const IDS = ['direction', 'usable', 'ship']
const HOLD = { direction: 'A Product Blueprint', usable: 'Interactions people can trust', ship: 'Working software' }

// The testimonial here is not one the homepage shows (either homepage: the new design's
// and the live one's). Read from the sources, so it holds whatever the pages render today.
{
  const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const mine = read('src/components/services/servicesJourneys.ts').match(/SERVICES_TESTIMONIAL = \{[\s\S]*?name: '([^']+)'/)?.[1]
  const surname = mine?.split(/[ ,]/).filter(Boolean).find((word, at) => at > 0) || ''
  const homes = ['src/components/home-story/storyContent.ts', 'src/components/home/HomeConceptContent.tsx', 'src/components/home/HomeContent.tsx']
  const shared = homes.filter((file) => surname && read(file).includes(surname))
  check(!!mine && shared.length === 0, `the services testimonial (${mine}) is not also on a homepage ${JSON.stringify(shared)}`)
  if (args.includes('--sources-only')) { console.log(failures.length ? `${failures.length} failed` : 'all passed'); process.exit(failures.length ? 1 : 0) }
}

const browser = await puppeteer.launch({ headless: true })
for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(`${base}/services?design=human`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector('[data-service-index]', { visible: true, timeout: 30000 })
  await pause(600)

  const first = await page.evaluate((height) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const root = document.querySelector('[data-service-index]').closest('[data-design-only="human"]') || document
    const onScreen = (el) => visible(el) && el.getBoundingClientRect().top < height && el.getBoundingClientRect().bottom > 0
    const leaves = [...root.querySelectorAll('h1,h2,h3,p,a,button,li,dd,dt,span')].filter((el) => onScreen(el) && el.children.length === 0)
    const text = [...new Set(leaves.map((el) => el.textContent.trim()).filter(Boolean))].join(' ')
    const sentence = root.querySelector('[data-what-we-do]')
    return {
      words: text.split(/\s+/).filter(Boolean).length,
      text,
      sentence: sentence ? { text: sentence.textContent.trim(), bottom: Math.round(sentence.getBoundingClientRect().bottom) } : null,
      links: [...root.querySelectorAll('[data-service-link]')].filter(visible).map((el) => ({ id: el.dataset.serviceLink, bottom: Math.round(el.getBoundingClientRect().bottom) })),
      images: [...root.querySelectorAll('img')].filter((img) => visible(img) && img.getBoundingClientRect().top < height * 0.8).length,
      act: [...root.querySelectorAll('a')].some((a) => onScreen(a) && /Tell us what you’re working on/.test(a.textContent)),
      // The page's prose. The contact form's own labels and buttons are controls, not copy to read.
      pageWords: (() => { const form = root.querySelector('[data-contact-composer]'); const count = (text) => text.split(/\s+/).filter(Boolean).length; return count(root.innerText) - (form ? count(form.innerText) : 0) })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      charts: root.querySelectorAll('[data-hours-band], [role="tablist"]').length,
    }
  }, height)
  check(!!first.sentence && /design studio/.test(first.sentence.text) && /in person or from anywhere/.test(first.sentence.text) && first.sentence.bottom <= height, `${width}: the first screen says what we do, in one sentence ${JSON.stringify(first.sentence)}`)
  check(first.links.map((link) => link.id).join() === IDS.join() && first.links.every((link) => link.bottom <= height), `${width}: the three questions are on the first screen as an index ${JSON.stringify(first.links)}`)
  check(first.act, `${width}: the first screen has one way to act (Tell us what you’re working on)`)
  check(first.images === 0 && !/\$\d/.test(first.text), `${width}: no picture and no price on the first screen (${first.images} pictures)`)
  check(first.words <= FIRST_SCREEN_WORDS, `${width}: the first screen is one statement (${first.words} of ${FIRST_SCREEN_WORDS} words)`)
  check(first.charts === 0, `${width}: no chart and no tab list on the page (${first.charts})`)
  check(first.pageWords <= WORD_LIMIT, `${width}: the page stays short on words (${first.pageWords} of ${WORD_LIMIT})`)
  check(first.overflow <= 0, `${width}: nothing spills sideways (${first.overflow}px)`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-first-screen.png` })

  // One block, three times: the same parts in each, and a picture of its own.
  const blocks = await page.evaluate(async () => {
    const list = [...document.querySelectorAll('[data-service]')].filter((el) => el.getBoundingClientRect().height > 0)
    const result = []
    for (const el of list) {
      const img = el.querySelector('img')
      if (img) { img.loading = 'eager'; img.scrollIntoView(); await img.decode().catch(() => {}) }
      const fact = (name) => el.querySelector(`[data-service-fact="${name}"] dd`)?.textContent.trim() || ''
      result.push({
        id: el.dataset.service,
        picture: img ? { file: new URL(img.currentSrc || img.src).searchParams.get('url') || new URL(img.currentSrc || img.src).pathname, loaded: img.naturalWidth > 0 } : null,
        hold: fact('hold'), team: fact('team'), length: fact('length'), investment: fact('investment'),
        steps: el.querySelectorAll('[data-service-steps], ol').length,
        heading: el.querySelector('h2')?.textContent.trim() || '',
        links: [...el.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height > 0).length,
        shape: [...el.querySelectorAll('h2, dl, dt')].map((node) => node.tagName).join(),
      })
    }
    return result
  })
  check(blocks.map((block) => block.id).join() === IDS.join(), `${width}: three services, in order ${JSON.stringify(blocks.map((block) => block.id))}`)
  for (const block of blocks) {
    const complete = block.hold === HOLD[block.id] && !!block.team && /\d/.test(block.length) && /\$\d/.test(block.investment) && block.steps === 0 && /\?$/.test(block.heading) && block.links >= 1
    check(complete, `${width} ${block.id}: what you get, who, how long, the cost and a link, with no step sequence ${JSON.stringify([block.hold, block.team, block.length, block.investment, block.steps, block.links])}`)
  }
  check(new Set(blocks.map((block) => block.shape)).size === 1, `${width}: every service is the same block ${JSON.stringify(blocks.map((block) => block.shape))}`)
  const pictures = blocks.map((block) => block.picture)
  check(pictures.every((picture) => picture?.loaded) && new Set(pictures.map((picture) => picture?.file)).size === 3, `${width}: each service has its own picture, painted ${JSON.stringify(pictures.map((picture) => picture?.file.split('/').pop()))}`)

  // The index is the way in: each question lands on its own block.
  for (const id of IDS) {
    await page.evaluate(() => scrollTo(0, 0)); await pause(400)
    await page.click(`[data-service-link="${id}"] a`)
    await pause(1600)
    const top = await page.evaluate((id) => Math.round(document.querySelector(`[data-service="${id}"]`).getBoundingClientRect().top), id)
    check(top > -40 && top < 200, `${width} ${id}: its question on the first screen lands on its block (top ${top})`)
    if (out) await page.screenshot({ path: `${out}/${width}-${id}.png` })
  }

  // A service fills the contact form.
  const ASK = { direction: ['We need a clear product direction.', 'A product direction'], usable: ['We need an AI tool people will trust and use.', 'An AI tool people trust'], ship: ['We need a product designed and shipped.', 'A product designed and shipped'] }
  const field = () => page.$eval('#talk [data-composer-field]', (el) => el.value)
  const pressAsk = async (id) => { await page.$eval(`[data-service-ask="${id}"]`, (el) => el.scrollIntoView({ block: 'center' })); await pause(300); await page.click(`[data-service-ask="${id}"]`); await pause(1700) }
  check(await page.evaluate(() => !document.querySelector('#talk [data-booking]') && !!document.querySelector('#talk [data-booking-toggle]')), `${width}: the calendar is folded away until asked for`)
  await pressAsk('usable')
  const one = await page.evaluate(() => ({ top: Math.round(document.getElementById('talk').getBoundingClientRect().top), groups: [...document.querySelectorAll('#talk [data-composer-group]')].map((el) => el.dataset.composerGroup) }))
  check((await field()) === ASK.usable[0] && one.groups.join() === 'result' && one.top > -40 && one.top < 200, `${width}: pressing a service lands on the form with its sentence written and the next question offered ${JSON.stringify([await field(), one])}`)
  await page.focus('#talk [data-composer-field]'); await page.keyboard.type(' Call me after 3pm.')
  await pressAsk('ship')
  check((await field()) === `Call me after 3pm. ${ASK.ship[0]}`, `${width}: a second service replaces the first and keeps the visitor’s words ${JSON.stringify(await field())}`)
  await pressAsk('ship')
  check((await field()) === `Call me after 3pm. ${ASK.ship[0]}`, `${width}: the same service twice is written once`)
  await page.$eval('#talk [data-booking-toggle]', (el) => el.scrollIntoView({ block: 'center' })); await page.click('#talk [data-booking-toggle]'); await pause(600)
  check(await page.evaluate(() => !!document.querySelector('#talk [data-booking]')), `${width}: "Or choose a time to talk" opens the calendar`)
  if (out) { await page.$eval('#talk', (el) => el.scrollIntoView({ block: 'start' })); await pause(400); await page.screenshot({ path: `${out}/${width}-talk.png` }) }

  const proof = await page.evaluate(() => ({ stats: document.querySelectorAll('[data-stat]').length, sectors: document.querySelectorAll('[data-sectors] a').length, quote: !!document.querySelector('blockquote'), talk: !!document.getElementById('talk') }))
  check(proof.stats === 4 && proof.sectors === 4 && proof.quote && proof.talk, `${width}: proof in one section, then a time to talk ${JSON.stringify(proof)}`)
  if (out && width !== 1280) { await page.evaluate(() => scrollTo(0, 0)); await pause(300); await page.screenshot({ path: `${out}/${width}-full.png`, fullPage: true }) }
  await page.close()
}
await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
