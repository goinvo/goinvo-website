// The services page under the human design (?design=human): clean, scoped, simple, actionable.
// Rules, from the survey in docs/research/services-pages-2026-11-18.md:
//  - the first screen IS the services (the owner's calls, 2026-11-18): the headline, then
//    the three services side by side (no what-we-do paragraph: the homepage says it), each as its picture, its name
//    and the problem it answers and NOTHING else (no facts, no price, no button: all at once
//    was too much); on a phone the first service starts on the first screen;
//  - pressing a service opens its details under the cards: what it is, what you get, who,
//    how long, the investment, one line of evidence and one button to act on; one service is
//    open at a time and a second press closes it; every service opens to the same parts;
//  - each service has its own picture; there is no step sequence (it read as a template);
//  - the other way in comes last: "…or tell us what you're working on", after the three;
//  - proof is one section; there is no chart and no tab list; the page stays under 320 words (the surveyed pages run 206 to 1,175, median about 450);
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
const WORD_LIMIT = 320
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
  await page.waitForSelector('[data-services]', { visible: true, timeout: 30000 })
  await pause(600)

  const first = await page.evaluate((height) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const root = document.querySelector('[data-services]').closest('[data-design-only="human"]') || document
    const onScreen = (el) => visible(el) && el.getBoundingClientRect().top < height && el.getBoundingClientRect().bottom > 0
    const leaves = [...root.querySelectorAll('h1,h2,h3,p,a,button,li,dd,dt,span')].filter((el) => onScreen(el) && el.children.length === 0)
    const text = [...new Set(leaves.map((el) => el.textContent.trim()).filter(Boolean))].join(' ')
    return {
      words: text.split(/\s+/).filter(Boolean).length,
      text,
      intro: [...root.querySelectorAll('h1 ~ p, h1 + p, [data-what-we-do]')].filter((el) => !el.closest('[data-services]') && !el.closest('[data-service-talk]') && el.closest('section') === root.querySelector('h1').closest('section')).length,
      services: [...root.querySelectorAll('[data-service]')].filter(visible).map((el) => { const at = (sel) => { const r = el.querySelector(sel).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) } }; return { id: el.dataset.service, picture: at('img'), label: at('p'), heading: at('h2'), expanded: el.querySelector('[data-service-open]').getAttribute('aria-expanded'), extras: el.querySelectorAll('dl, [data-service-ask], [data-service-outcome]').length } }),
      panels: root.querySelectorAll('[data-service-panel]').length,
      // The other way in is ONE link, worded as the alternative, after the three services.
      act: (() => { const links = [...root.querySelectorAll('a')].filter((a) => visible(a) && /tell us what you’re working on/i.test(a.textContent)); const last = [...root.querySelectorAll('[data-service]')].pop(); return links.length === 1 && !!last && /^…or tell us/.test((links[0].querySelector('[data-link-label]') || links[0]).textContent.trim()) && !!links[0].closest('[data-service-talk]') && links[0].getBoundingClientRect().top >= last.getBoundingClientRect().bottom - 1 })(),
      // The page's prose. The contact form's own labels and buttons are controls, not copy to read.
      pageWords: (() => { const form = root.querySelector('[data-contact-composer]'); const count = (text) => text.split(/\s+/).filter(Boolean).length; return count(root.innerText) - (form ? count(form.innerText) : 0) })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      charts: root.querySelectorAll('[data-hours-band], [role="tablist"]').length,
    }
  }, height)
  // No "GoInvo is a design studio…" paragraph: the homepage already says it (the owner's call, 2026-11-18).
  check(first.intro === 0 && !/is a design studio/.test(first.text), `${width}: the headline goes straight to the services, with no what-we-do paragraph (${first.intro})`)
  const wide = width >= 1024
  check(first.services.map((service) => service.id).join() === IDS.join() && (wide ? first.services.every((service) => service.picture.top > 0 && service.heading.bottom <= height) : first.services[0].picture.top < height), wide ? `${width}: all three services are above the fold: picture, name and problem ${JSON.stringify(first.services.map((service) => service.heading.bottom))} of ${height}` : `${width}: the first service starts on the first screen (its picture at ${first.services[0]?.picture.top} of ${height})`)
  if (wide) { const same = (part, edge) => new Set(first.services.map((service) => service[part][edge])).size === 1; check(same('picture', 'top') && same('picture', 'bottom') && same('label', 'top') && same('heading', 'top'), `${width}: the same part sits on the same line in all three ${JSON.stringify(first.services.map((service) => [service.picture.top, service.label.top, service.heading.top]))}`) }
  check(first.panels === 0 && first.services.every((service) => service.expanded === 'false' && service.extras === 0) && !/\$\d/.test(first.text), `${width}: at rest a service is its picture, name and problem only: nothing open, no facts, no price ${JSON.stringify(first.services.map((service) => [service.expanded, service.extras]))}`)
  // The headline is about the services (the three problems under it), not the homepage's line.
  const title = await page.$eval('#services-title', (el) => el.textContent.trim())
  check(title === 'What are you trying to solve?', `${width}: the headline asks the question the three services answer ("${title}")`)
  check(first.act, `${width}: the other way in comes last: “…or tell us what you’re working on”, after the three services`)
  check(first.charts === 0, `${width}: no chart and no tab list on the page (${first.charts})`)
  check(first.pageWords <= WORD_LIMIT, `${width}: the page stays short on words (${first.pageWords} of ${WORD_LIMIT})`)
  check(first.overflow <= 0, `${width}: nothing spills sideways (${first.overflow}px)`)
  if (out) await page.screenshot({ path: `${out}/${width}-0-first-screen.png` })

  // Press a service: its details open under the cards, one at a time; the same parts in each.
  const openService = async (id) => { await page.$eval(`[data-service-open="${id}"]`, (el) => { el.scrollIntoView({ block: 'center' }); el.click() }); await pause(900) }
  const blocks = []
  for (const id of IDS) {
    await openService(id)
    blocks.push(await page.evaluate(async (id, height) => {
      const card = document.querySelector(`[data-service="${id}"]`), panel = document.querySelector(`[data-service-panel="${id}"]`)
      const img = card.querySelector('img')
      if (img) { img.loading = 'eager'; await img.decode().catch(() => {}) }
      const fact = (name) => panel?.querySelector(`[data-service-fact="${name}"] dd`)?.textContent.trim() || ''
      const box = panel?.getBoundingClientRect()
      return {
        id,
        open: [...document.querySelectorAll('[data-service-panel]')].map((el) => el.dataset.servicePanel).join(),
        expanded: [...document.querySelectorAll('[data-service-open][aria-expanded="true"]')].map((el) => el.dataset.serviceOpen).join(),
        inView: !!box && box.top >= 0 && box.bottom <= height + 1,
        below: !!box && box.top >= card.getBoundingClientRect().bottom - 1,
        picture: img ? { file: new URL(img.currentSrc || img.src).searchParams.get('url') || new URL(img.currentSrc || img.src).pathname, loaded: img.naturalWidth > 0 } : null,
        hold: fact('hold'), team: fact('team'), length: fact('length'), investment: fact('investment'),
        steps: panel ? panel.querySelectorAll('[data-service-steps], ol').length : -1,
        heading: card.querySelector('h2')?.textContent.replace(/\+$/, '').trim() || '',
        links: panel ? [...panel.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height > 0).length : 0,
        ask: panel ? panel.querySelectorAll('[data-service-ask]').length : 0,
        shape: panel ? [...panel.querySelectorAll('p, dl, dt, button')].map((node) => node.tagName).join() : '',
      }
    }, id, height))
    if (out) await page.screenshot({ path: `${out}/${width}-${id}.png` })
  }
  for (const block of blocks) check(block.open === block.id && block.expanded === block.id && block.below && block.inView && block.ask === 1, `${width} ${block.id}: pressing it opens its details under the cards, in view, and closes the one before ${JSON.stringify([block.open, block.expanded, block.below, block.inView])}`)
  await openService(IDS[2])
  check(await page.evaluate(() => document.querySelectorAll('[data-service-panel]').length === 0 && document.querySelectorAll('[data-service-open][aria-expanded="true"]').length === 0), `${width}: a second press closes it`)
  check(blocks.map((block) => block.id).join() === IDS.join(), `${width}: three services, in order ${JSON.stringify(blocks.map((block) => block.id))}`)
  for (const block of blocks) {
    const complete = block.hold === HOLD[block.id] && !!block.team && /\d/.test(block.length) && /\$\d/.test(block.investment) && block.steps === 0 && /\?$/.test(block.heading) && block.links >= 1
    check(complete, `${width} ${block.id}: what you get, who, how long, the cost and a link, with no step sequence ${JSON.stringify([block.hold, block.team, block.length, block.investment, block.steps, block.links])}`)
  }
  check(new Set(blocks.map((block) => block.shape)).size === 1, `${width}: every service is the same block ${JSON.stringify(blocks.map((block) => block.shape))}`)
  const pictures = blocks.map((block) => block.picture)
  check(pictures.every((picture) => picture?.loaded) && new Set(pictures.map((picture) => picture?.file)).size === 3, `${width}: each service has its own picture, painted ${JSON.stringify(pictures.map((picture) => picture?.file.split('/').pop()))}`)

  // A service fills the contact form.
  const ASK = { direction: ['We need a clear product direction.', 'A product direction'], usable: ['We need an AI tool people will trust and use.', 'An AI tool people trust'], ship: ['We need a product designed and shipped.', 'A product designed and shipped'] }
  const field = () => page.$eval('#talk [data-composer-field]', (el) => el.value)
  const pressAsk = async (id) => { if (!(await page.$(`[data-service-panel="${id}"]`))) await openService(id); await page.$eval(`[data-service-ask="${id}"]`, (el) => el.scrollIntoView({ block: 'center' })); await pause(300); await page.click(`[data-service-ask="${id}"]`); await pause(1700) }
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
