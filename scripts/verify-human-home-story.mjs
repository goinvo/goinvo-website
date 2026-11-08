import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const route = process.env.HUMAN_HOME_URL || 'http://127.0.0.1:3111/'
const out = path.resolve('.audit/human-home-story')
await fs.mkdir(out, { recursive: true })
let checks = 0
const failures = [], errors = [], results = []
const check = (value, label) => { checks++; if (!value) { failures.push(label); console.error(`FAIL: ${label}`) } }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const cases = [
  { id: 'clinical', href: '/work/clinical-evidence-engine', title: 'Clinical Evidence Engine', challenge: 'Trust in AI', situation: 'I can’t tell whether to trust an AI answer.', solutions: ['Keep evidence close.', 'Design around patient details.', 'Question the confidence.'], emphasis: ['Keep', 'Design', 'Question'], reasons: ['A claim without its source gets taken on faith. Beside it, the source can be checked at a glance.', 'Generic advice can be wrong for this patient. With their details in view, a clinician can tell.', 'A bare score asks for blind trust. Showing its inputs lets clinicians weigh it themselves.'], support: '.chat-prompt,.slip-receipt,.exp-text', focus: '.rec-card,.answer-bubble-wrap,.right' },
  { id: 'prior', href: '/work/prior-auth', title: 'Prior Authorization', challenge: 'Fragmented workflows', situation: 'My team spends more time finding information than reviewing it.', solutions: ['Keep context visible.', 'Read history in order.', 'Keep notes in context.'], emphasis: ['Keep', 'Read', 'Keep'], reasons: ['Without the patient in view, records get read out of context. Pinned above, every page is judged for them.', 'Scattered treatments hide the story. On one timeline, a reviewer sees it at a glance.', 'Notes in another window break the review. Beside the record, they’re taken while reading.'], support: '[data-fragment=request],[data-fragment=navigation],[data-fragment=clinical]', focus: '[data-fragment=patient],[data-fragment=history],[data-fragment=notes]' },
  { id: 'facto', href: '/work/ipsos-facto', title: 'Ipsos Facto', challenge: 'Research at scale', situation: 'AI isn’t tailored to my scale of research.', solutions: ['Guide the question.', 'Keep citations attached.', 'Name the limits.'], emphasis: ['Guide', 'Keep', 'Name'], reasons: ['A blank chat box leaves researchers guessing. Task prompts get them to a useful question faster.', 'An insight without sources can’t go in a report. With citations attached, each one can be traced.', 'Hidden caveats breed overconfidence. Named in the panel, they show where the evidence stops.'], support: '[data-node-id="1147:92683"]', focus: '[data-node-id="1147:92790"],[data-node-id="1147:105419"]' },
]
const response = await fetch(route)
check(response.status === 200 && (await response.text()).includes('noindex'), 'Review reachable and unindexed')
async function source(page, item) {
  check(await page.$$eval('[data-work-prototype]', els => els.length === 1), 'Exactly one coded preview mounted')
  await page.waitForSelector(`[data-work-prototype="${item.id}"][data-ready="true"]`)
  const element = await page.$('#work iframe'), frame = await element.contentFrame()
  await frame.waitForSelector(`[data-prototype="${item.id}"]`)
  await frame.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())) })
  check(await element.evaluate(el => getComputedStyle(el).opacity === '1' && !el.parentElement.querySelector('img')), `${item.id}: live frame replaces the loading still`)
  return frame
}
async function detail(frame, item) {
  return frame.evaluate(selectors => {
    const blur = node => Number(/blur\(([\d.]+)px\)/.exec(getComputedStyle(node).filter)?.[1] || 0)
    const supporting = [...document.querySelectorAll(selectors.support)].map(node => ({ blur: blur(node), opacity: Number(getComputedStyle(node).opacity) }))
    const focus = [...document.querySelectorAll(selectors.focus)].filter(node => node.getClientRects().length > 0)
    const nodes = [...new Set(focus.flatMap(node => [node, ...node.querySelectorAll('*')]))]
    return { spread: Number(getComputedStyle(document.querySelector('#prototype-root')).getPropertyValue('--spread')), supporting, focus: focus.length, blurredFocus: nodes.filter(node => blur(node) > 0).length, broken: [...document.images].filter(image => !image.naturalWidth).length, names: ['Emily Prentiss', 'Debra Ortiz', 'J. Green', 'Z. Castillo', 'Jennifer Lippiatt', 'Guidelines.com', 'Orphic', 'Nike'].filter(name => document.body.innerText.includes(name)) }
  }, item)
}
async function choose(page, width, id) {
  await page.evaluate(() => scrollTo(0, 0)); await pause(100)
  if (width >= 768) await page.click(`label[for="challenge-${id}"]`)
  else await page.select('#challenge-select', id)
}
async function scrub(page, value, wide) {
  await page.evaluate(({ value, wide }) => {
    const story = document.querySelector('#human'), panel = document.querySelector('#work')
    const top = panel.getBoundingClientRect().top + scrollY
    const target = wide ? story.offsetTop + (story.offsetHeight - innerHeight) * value : top - innerHeight * .55 + (panel.offsetHeight + innerHeight * .25) * value
    scrollTo(0, target)
  }, { value, wide })
  await pause(220)
}
const browser = await puppeteer.launch({ headless: true })
try {
  for (const [width, height] of [[2176, 1230], [1440, 900], [1265, 714], [768, 1024], [390, 844]]) {
    const context = await browser.createBrowserContext(), page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 })
    await page.goto(`${route}?motion=full`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => document.querySelector('[data-human-home]')?.dataset.motion === 'full')
    await page.waitForFunction(() => !document.querySelector('#challenge-select').disabled)
    await pause(300)
    check(await page.$eval('[data-explore-link]', el => el.textContent.includes('See how we think')), `${width}: the opening's prompt points at our thinking`)
    await page.evaluate(() => document.fonts.ready)
    await pause(220)
    await source(page, cases[0])
    const initial = await page.evaluate(() => {
      const copy = document.querySelector('[data-opening-copy]').getBoundingClientRect(), panel = document.querySelector('#work').getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - innerWidth, live: document.querySelector('#human').dataset.storyLive, openingBottom: Math.max(document.querySelector('fieldset')?.getBoundingClientRect().bottom || 0, document.querySelector('#challenge-label').getBoundingClientRect().bottom), // the last choice, not the block's empty bottom padding
       panel: { left: panel.left, width: panel.width, height: panel.height }, sections: [...document.querySelector('#human-main').children].map(el => el.id), italics: [...document.querySelectorAll('[data-opening-copy] p em')].map(el => { const s = getComputedStyle(el), p = getComputedStyle(el.parentElement), c = document.createElement('canvas').getContext('2d'); c.font = `normal ${p.fontWeight} ${p.fontSize} ${p.fontFamily}`; const normal = c.measureText('x').actualBoundingBoxAscent; c.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; return { difference: Math.abs(c.measureText('x').actualBoundingBoxAscent - normal), family: s.fontFamily === p.fontFamily, size: s.fontSize === p.fontSize } }) }
    })
    const wide = width >= 1100
    check(initial.overflow <= 1, `${width}: no horizontal overflow`)
    check(initial.sections.join(',') === 'human,ask,services,proof,evidence', `${width}: the search, overview, trust and large-organization evidence follow the single preview`)
    check(initial.italics.every(item => item.difference <= 1 && item.family && item.size), `${width}: any italic in the opening line matches its x-height`)
    check(initial.live === String(wide), `${width}: short shared canvas on desktop; ordinary phone/tablet flow`)
    if (wide) {
      const line = await page.evaluate(() => ({ choices: document.querySelector('fieldset').getBoundingClientRect().bottom, preview: document.querySelector('[data-inspection-zone]').getBoundingClientRect().bottom, top: Math.min(document.querySelector('#human-title').getBoundingClientRect().top, document.querySelector('#work-title').getBoundingClientRect().top), nav: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-header-height')) || 50 }))
      const fits = await page.evaluate(() => document.querySelector('[data-opening-copy]').style.paddingTop !== '')
      if (fits) check(Math.abs(line.choices - line.preview) < 2 && Math.abs((line.top - line.nav) - (height - 72 - line.choices)) < 24 && await page.evaluate(() => Math.abs(document.querySelector('#human-title').getBoundingClientRect().top - document.querySelector('[data-story-heading]').getBoundingClientRect().top) < 2), `${width}: the columns share a top and a bottom line, centred under the nav ${JSON.stringify(line)}`)
      check(initial.openingBottom <= height - 10 && Math.abs(initial.panel.left - width * .31) < 2, `${width}: choices and preview fit the opening screen`)
      check(await page.$eval('[data-explore-link]', el => { const r = el.getBoundingClientRect(); return r.bottom <= innerHeight - 10 && r.top >= innerHeight - 100 && Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2 && el.textContent.includes('See how we think') }), `${width}: the invitation sits centred at the bottom of the opening`)
    }
    check(await page.$eval('#challenge-label', el => el.innerText === 'What sounds familiar?' && el.getBoundingClientRect().height > 0), `${width}: visible situation guidance`)
    check(width >= 768 ? await page.$$eval('input[name=work-challenge]', els => els.length === 3 && els.every(el => !!el.getAttribute('aria-label'))) : await page.$eval('#challenge-select', el => el.options.length === 3 && el.getBoundingClientRect().height >= 44), `${width}: accessible customer-segment choices`)
    const choiceStyle = await page.evaluate(() => {
      const grid = getComputedStyle(document.querySelector('fieldset > div'))
      const visible = [...document.querySelectorAll('[data-situation]')].filter(el => el.getBoundingClientRect().height > 0)
      return { fonts: visible.map(el => parseFloat(getComputedStyle(el).fontSize)), rowGap: parseFloat(grid.rowGap), columnGap: parseFloat(grid.columnGap), padding: parseFloat(getComputedStyle(document.querySelector('fieldset label')).paddingTop) }
    })
    check(choiceStyle.fonts.length > 0 && choiceStyle.fonts.every(size => size >= 18 && size <= 22), `${width}: problem statements on the type scale ${JSON.stringify(choiceStyle)}`)
    if (width >= 768) check(choiceStyle.rowGap === (wide && height <= 800 ? 12 : 16) && choiceStyle.columnGap === 32 && choiceStyle.padding === (wide && height <= 800 ? 8 : 12), `${width}: roomier choices have measured gaps and padding (tighter on short screens)`)
    check(await page.$eval('#work-title', el => parseFloat(getComputedStyle(el).fontSize) >= 32), `${width}: prototype name reads as a heading`)
    if (width >= 768) {
      const dot = await page.evaluate(() => { const dots = document.querySelectorAll('[data-challenge-dot]'), label = document.querySelector('label[for="challenge-clinical"]').getBoundingClientRect(), r = dots[0]?.getBoundingClientRect(); return { count: dots.length, left: r && r.left - label.left, color: dots[0] && getComputedStyle(dots[0]).backgroundColor } })
      check(dot.count === 1 && dot.left < -8 && dot.color === 'rgb(184, 74, 14)' && await page.evaluate(() => Math.abs(document.querySelector('label[for="challenge-clinical"] [data-situation]').getBoundingClientRect().left - document.querySelector('#challenge-label').getBoundingClientRect().left) < 1), `${width}: one orange dot hangs in the margin; the situations align with the prompt ${JSON.stringify(dot)}`)
    }
    await page.screenshot({ path: path.join(out, `opening-${width}.png`) })
    const selections = []
    for (const item of cases) {
      await choose(page, width, item.id)
      await page.waitForFunction(title => document.querySelector('#work-title').textContent === title, {}, item.title)
      const frame = await source(page, item)
      await pause(160)
      const initialFrame = await detail(frame, item)
      check(initialFrame.spread === 0 && initialFrame.supporting.every(node => node.blur === 0), `${width} ${item.id}: initial view shows the sharp finished interface`)
      check(await page.$('[data-case-link]') === null && await page.$eval('[data-case-overlay]', (el, expected) => el.getAttribute('href') === expected.href && el.tabIndex === 0 && el.getAttribute('aria-label') === `Read the ${expected.title} case study`, item), `${width} ${item.id}: the preview itself is the one, labelled link to the case study`)
      check(await page.$('[data-case-summary]') === null && await page.$('[data-inspect-work]') === null, `${width} ${item.id}: no repeated result block and no hover inspection button`)
      check(await page.$eval(width >= 768 ? `label[for="challenge-${item.id}"] [data-situation]` : '[data-situation][aria-hidden=true]', (el, expected) => el.innerText.replace('•','').trim() === expected, item.situation), `${width} ${item.id}: situation is a first-person statement`)
      check(await page.$eval('[data-story-task]', el => el.innerText.startsWith('We ') && el.getBoundingClientRect().height > 0), `${width} ${item.id}: task explains what we designed`)
      if (wide) {
        check(await page.$eval('#work [data-page-cell]', el => Math.abs(el.getBoundingClientRect().width - el.parentElement.getBoundingClientRect().width) < 1), `${width} ${item.id}: at rest the interface fills the whole preview area`)
        // In the hero, hover opens the layers; leaving closes them again.
        await page.hover('[data-case-overlay]'); await pause(720)
        check((await detail(frame, item)).spread > .99, `${width} ${item.id}: hovering the hero preview opens its layers`)
        check(await page.$eval('[data-case-cue]', el => getComputedStyle(el).opacity === '1'), `${width} ${item.id}: hovering the preview offers the case study`)
        await page.mouse.move(0, 0); await pause(720)
        check((await detail(frame, item)).spread < .001, `${width} ${item.id}: leaving the preview restores the finished interface`)
        // The old flash: a still cursor the growing preview slides under must not open it.
        await page.mouse.move(width * .2, height * .7)
        const still = []
        for (const value of [.02, .04, .06, .08]) { await scrub(page, value, wide); still.push((await detail(frame, item)).spread) }
        check(still.every(value => value < .01), `${width} ${item.id}: scrolling under a still cursor does not flash the layers open ${JSON.stringify(still)}`)
        await page.mouse.move(0, 0)
      }
      await scrub(page, .7, wide)
      const open = await detail(frame, item)
      check(open.spread > .99, `${width} ${item.id}: scrolling on opens the actual component layers`)
      if (wide) check(await page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-story-heading]')).opacity) < .01 && Number(getComputedStyle(document.querySelector('[data-story-insight]')).opacity) > .99 && document.querySelector('[data-story-insight]').getAttribute('aria-hidden') === 'false'), `${width} ${item.id}: the title gives way to the insight in the exploded view`)
      check(await page.$eval('[data-story-insight]', el => el.innerText.includes('one detail at a time')), `${width} ${item.id}: the line about why details matter is shown`)
      check(open.supporting.length > 0 && open.supporting.every(node => node.blur >= 8 && node.opacity < .6), `${width} ${item.id}: supporting material softens`)
      check(open.focus === 3 || item.id === 'facto' && open.focus === 2, `${width} ${item.id}: real focal components present`)
      check(open.blurredFocus === 0 && open.broken === 0 && open.names.length === 0, `${width} ${item.id}: sharp, loaded and anonymized focal components`)
      check(await page.$$eval('#work li', (els, expected) => els.length === 3 && els.every((el, index) => el.querySelector('strong').textContent === expected.solutions[index] && el.querySelector('span').textContent === expected.reasons[index]), item), `${width} ${item.id}: actions explain the decision and its reasoning`)
      const annotationType = await page.$$eval(width >= 768 ? '[data-annotation-cell] strong' : '[data-action-list] strong', els => els.map(el => { const s = getComputedStyle(el), em = el.querySelector('em'), e = em && getComputedStyle(em); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, emphasis: em?.textContent, italic: e?.fontStyle, sameSize: s.fontSize === e?.fontSize, sameFamily: s.fontFamily === e?.fontFamily } }))
      check(annotationType.length === 3 && annotationType.every((s, i) => s.family.includes('adobe-jenson-pro') && s.size === '24px' && Number(s.weight) >= 600 && s.emphasis === item.emphasis[i] && s.italic === 'italic' && s.sameSize && s.sameFamily), `${width} ${item.id}: bold Jenson headlines with matching italic emphasis ${JSON.stringify(annotationType)}`)
      if (width >= 768) {
        const connectors = await page.$eval('#work [data-prototype-grid]', grid => ({
          lines: grid.querySelectorAll('[data-fragment-arrow]').length,
          dots: grid.querySelectorAll('marker[data-connector-dot] circle').length,
          heads: grid.querySelectorAll('marker path').length,
          rotating: [...grid.querySelectorAll('marker')].some(marker => marker.hasAttribute('orient')),
          fonts: [...grid.querySelectorAll('[data-annotation-cell]')].map(el => parseFloat(getComputedStyle(el).fontSize)),
          opacity: getComputedStyle(grid.querySelector('svg')).opacity,
        }))
        check(connectors.lines === 3 && connectors.dots === 1 && connectors.heads === 0 && !connectors.rotating, `${width} ${item.id}: lines end in orientation-independent dots`)
        check(connectors.opacity === '1' && connectors.fonts.length === 3 && connectors.fonts.every(value => value >= 18 && value <= 24.1), `${width} ${item.id}: solution labels visible at rest and readable`)
        const highlights = await page.$$eval('[data-annotation-cell]', els => els.map(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return { padding: s.padding, edge: s.borderLeftWidth, color: s.borderLeftColor, right: r.right } }))
        check(highlights.length === 3 && highlights.every(s => s.padding === '12px' && s.edge === '4px' && s.color === 'rgb(0, 115, 133)' && s.right <= width), `${width} ${item.id}: padded highlights use the secondary teal edge and fit the screen ${JSON.stringify(highlights)}`)
      }
      await page.screenshot({ path: path.join(out, `${item.id}-exploded-${width}.png`) })
      await scrub(page, .25, wide)
      const middle = await detail(frame, item)
      check(middle.spread > .1 && middle.spread < .9, `${width} ${item.id}: scroll continuously assembles the same preview`)
      check(await page.$$eval('[data-work-prototype]', els => els.length === 1), `${width} ${item.id}: no duplicate preview during transformation`)
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${item.id}: no overflow during transformation`)
      await page.screenshot({ path: path.join(out, `${item.id}-middle-${width}.png`) })
      await scrub(page, .98, wide)
      const closed = await detail(frame, item)
      check(closed.spread > .99, `${width} ${item.id}: the exploded view holds to the end of the scene`)
      check(await page.$eval('#contact a[href^="mailto:"]', (el, challenge) => new URL(el.href).searchParams.get('subject').includes(challenge), item.challenge), `${width} ${item.id}: project note preserves selected challenge`)
      await page.screenshot({ path: path.join(out, `${item.id}-assembled-${width}.png`) })
      selections.push({ id: item.id, spread: [open.spread, middle.spread, closed.spread] })
    }
    await choose(page, width, 'clinical'); await source(page, cases[0])
    if (width >= 768) {
      await page.mouse.move(0, 0)
      await page.focus('#challenge-clinical'); await page.keyboard.press('ArrowDown')
      await page.waitForFunction(() => document.querySelector('#challenge-prior').checked)
      check(await page.$eval('#work-title', el => el.textContent === 'Prior Authorization'), `${width}: native keyboard radio navigation changes the example`)
    }
    // Views: Ipsos Facto offers a second view, "Key moments", picked under its challenge.
    // It is a bento of real parts cut from several screens, with placeholder names only.
    await choose(page, width, 'facto'); await source(page, cases[2])
    check(await page.evaluate(() => scrollY === 0), `${width}: the view picker is reachable without scrolling the story`)
    if (width >= 768) await page.click('label[for="view-facto-bento"]')
    else await page.select('#view-select', 'facto-bento')
    const bentoFrame = await source(page, { id: 'facto-bento' })
    check(await page.evaluate(() => new URLSearchParams(location.search).get('view') === 'facto-bento' && scrollY === 0), `${width}: choosing a view keeps the place and goes in the address`)
    check(await page.$$eval('#work li strong', els => els.map(el => el.textContent).join('|') === 'Work in steps.|Compare every source at once.|Open the exact passage.'), `${width}: the view's own annotations replace the full screen's`)
    const bento = await bentoFrame.evaluate(() => ({ tiles: document.querySelectorAll('.prototype-part[data-fragment]').length, text: document.body.innerText, broken: [...document.images].filter(image => !image.naturalWidth).length }))
    check(bento.tiles === 5 && bento.broken === 0 && /Brand X/.test(bento.text) && !/Nestl|Nike|Ferrero|Nutella|Mintel|Heather/i.test(bento.text), `${width}: five real parts, every image loaded, placeholder names only`)
    await choose(page, width, 'prior'); await source(page, cases[1])
    check(await page.$('[data-view-picker]') === null && !new URLSearchParams(await page.evaluate(() => location.search)).has('view'), `${width}: views belong to the scene that has them`)
    // The AI search: once per run (each query is a model call). An example returns our
    // work; a query nothing fits says so, with the 404 illustration, and lists nothing.
    if (width === 1440) {
      await page.evaluate(() => document.querySelector('#ask').scrollIntoView()); await pause(400)
      await page.evaluate(() => [...document.querySelectorAll('#ask form button')].find(button => button.textContent === 'Government').click())
      await page.waitForFunction(() => document.querySelector('[data-search-results="main"]:not(.opacity-60)') || /Search failed|Nothing we/.test(document.querySelector('#ask').innerText), { timeout: 60000 })
      const found = await page.evaluate(() => ({ titles: [...document.querySelectorAll('[data-search-results="main"] h3')].length, live: document.querySelector('#ask [aria-live]').textContent, links: [...document.querySelectorAll('[data-search-results="main"] a')].every(a => a.getAttribute('href')?.startsWith('/')) }))
      check(found.titles > 0 && /results? for/.test(found.live) && found.links, `${width}: an example search returns our own work and announces it ${JSON.stringify(found)}`)
      const feature = await page.evaluate(() => { const picture = document.querySelector('[data-search-picture="feature"]').getBoundingClientRect(), title = document.querySelector('[data-search-feature] h3').getBoundingClientRect(), label = document.querySelector('[data-search-results="main"] [data-hand-note]').getBoundingClientRect(); return { left: Math.round(picture.left), width: Math.round(picture.width), titleRight: title.left >= picture.right && label.left >= picture.right && label.top < title.top, firstScreen: title.bottom <= innerHeight } })
      check(feature.left <= 1 && feature.width >= width * 0.55 && feature.titleRight && feature.firstScreen, `${width}: the best match leads, its picture off the left edge and most of the width, its title on the first screen ${JSON.stringify(feature)}`)
      await page.$eval('#ask-input', input => { input.value = '' }); await page.click('#ask-input', { clickCount: 3 }); await page.type('#ask-input', 'knitting patterns for zebras'); await page.keyboard.press('Enter')
      await page.waitForSelector('[data-search-empty] img', { timeout: 60000 })
      check(await page.evaluate(() => !document.querySelector('[data-search-results]') && /No strong matches/.test(document.querySelector('#ask [aria-live]').textContent) && decodeURIComponent(document.querySelector('[data-search-empty] img').getAttribute('src')).includes('404-ai') && document.querySelector('[data-search-empty]').innerText.includes('No results')), `${width}: a search nothing fits says so honestly, with the no-results illustration`)
      const art = await page.$eval('[data-search-empty-art]', box => { const r = box.getBoundingClientRect(); return { top: Math.round(r.top), right: Math.round(innerWidth - r.right), width: Math.round(r.width), mask: getComputedStyle(box).maskImage } })
      check((art.mask.match(/transparent|rgba\(0, 0, 0, 0\)/g) || []).length >= 2 && art.right <= 1 && art.width >= width * 0.7 && await page.evaluate(() => { const box = document.querySelector('[data-search-empty-art]'), art = box.getBoundingClientRect(), img = box.querySelector('img').getBoundingClientRect(), words = document.querySelector('[data-search-empty-words]'), title = words.querySelector('p').getBoundingClientRect(), form = document.querySelector('#ask form').getBoundingClientRect(); return img.right > art.right && art.top >= form.bottom && Math.abs(words.getBoundingClientRect().bottom - art.bottom) < 2 && words.querySelectorAll('li button').length === 4 && [...words.querySelectorAll('li button')].every(button => button.getBoundingClientRect().bottom <= innerHeight) && words.getBoundingClientRect().right <= img.left + img.width * 0.17 && Number(getComputedStyle(words).zIndex) > 0 }), `${width}: the girl takes 70% of the width (cropped to her, off the right edge, fading at both ends) with the words and suggestions on her empty side, above the fold ${JSON.stringify(art)}`)
      // Every suggestion has a stored answer: it comes back at once, without a model call.
      const suggestions = await page.$$eval('[data-search-empty] li button', buttons => buttons.map(button => button.textContent))
      const askedAt = Date.now()
      await page.evaluate(() => document.querySelector('[data-search-empty] li button').click())
      await page.waitForFunction(() => document.querySelector('[data-search-results="main"]:not(.opacity-60)'), { timeout: 20000 })
      check(suggestions.length === 4 && Date.now() - askedAt < 5000, `${width}: the four suggestions answer at once from stored results (${Date.now() - askedAt} ms)`)
      check(await page.$eval('#ask-note', note => /\bAI\b/.test(note.textContent)), `${width}: the disclaimer says the search uses AI`)
      // When Claude is down or out of credit the search still answers, and says why the answers are plainer.
      for (const [state, expect] of [['ai-unavailable', /Keyword matches[\s\S]*AI isn’t answering/], ['rate-limited', /Keyword matches[\s\S]*searched a lot/], ['error', /Search failed[\s\S]*Something broke/]]) {
        const sim = await context.newPage(); await sim.setViewport({ width, height })
        const simUrl = new URL(route); simUrl.searchParams.set('search-state', state)
        await sim.goto(simUrl.href, { waitUntil: 'load', timeout: 120000 })
        await sim.evaluate(() => document.querySelector('#ask').scrollIntoView())
        await sim.type('#ask-input', 'clinical decision support'); await sim.keyboard.press('Enter')
        const said = await sim.waitForFunction(pattern => { const text = document.querySelector('#ask').innerText; return new RegExp(pattern).test(text) && !/Searching our work/.test(document.querySelector('#ask [aria-live]').textContent) }, { timeout: 30000 }, expect.source).then(() => true, () => false)
        await sim.screenshot({ path: path.join(out, `search-${state}-${width}.png`) })
        check(said, `${width}: with the search ${state}, the reader is told plainly what happened`)
        if (state === 'error') check(await sim.evaluate(() => { const empty = document.querySelector('[data-search-empty="error"]'); return !!empty && [...empty.querySelectorAll('button')].some(button => /Try again/.test(button.textContent)) && empty.querySelectorAll('li button').length === 4 }), `${width}: a failed search offers Try again and the stored suggestions`)
        await sim.close()
      }
    }
    await page.evaluate(() => document.querySelector('#services').scrollIntoView()); await pause(700)
    check(await page.$$eval('[data-explore-link]', els => els.length === 1 && els[0].textContent.includes('Who we’ve done it for')), `${width}: the bottom prompt follows the reader to the next section`)
    {
      const shown = () => page.$eval('nav[aria-label="Next section"]', nav => nav.dataset.promptShown === 'true' && getComputedStyle(nav).opacity === '1')
      await page.mouse.move(width / 2, height / 2); await pause(450)
      const hiddenMidPage = !(await shown())
      let revealed = true
      if (width >= 768) { await page.mouse.move(width / 2, height - 40); await pause(450); revealed = await shown(); await page.mouse.move(width / 2, height / 2); await pause(450) }
      check(await page.$eval('nav[aria-label="Next section"]', nav => getComputedStyle(nav).pointerEvents === 'none'), `${width}: the prompt's full-width bar never takes a click meant for the page under it`)
      check(hiddenMidPage && revealed && !(await shown()), `${width}: past the opening the prompt stays out of the way until the pointer nears the bottom (hidden ${hiddenMidPage}, revealed ${revealed})`)
    }
    check(await page.$$eval('#services h3', els => els.length === 3), `${width}: three service-and-concern pairings`)
    check(await page.$$eval('#proof blockquote', els => els.length === 2 && els.every(el => el.getAttribute('cite')?.startsWith('https://www.goinvo.com/'))), `${width}: two attributed published testimonials`)
    // The logos are lazy: read them once they are on screen, not from the section above.
    await page.evaluate(() => document.querySelector('#proof ul').scrollIntoView({ block: 'center' }))
    await page.waitForFunction(() => [...document.querySelectorAll('#proof ul img')].every(el => el.complete && el.naturalWidth > 0), { timeout: 15000 }).catch(() => {})
    check(await page.$$eval('#proof ul img', els => els.length === 12 && els.every(el => el.complete && el.naturalWidth > 0 && el.alt)), `${width}: twelve real client logos`)
    await page.evaluate(() => document.querySelector('#evidence').scrollIntoView()); await pause(800)
    const people = await page.$$eval('[data-evidence-row]', els => ({ rows: els.length, outcomes: els.map(el => el.querySelector('[data-evidence-outcome]').textContent), links: els.map(el => el.querySelector('a').href), images: els.map(el => el.querySelector('img').alt) }))
    check(people.rows === 3 && people.outcomes.join('|') === '7% → 70%|200%|90+%' && people.links.every(href => href.startsWith('https://www.goinvo.com/work/')) && people.images.every(Boolean), `${width}: three large-organization cases with published outcomes ${JSON.stringify(people)}`)
    check(await page.$('#studio') === null, `${width}: "Small by design" is gone`)
    await page.screenshot({ path: path.join(out, `evidence-${width}.png`) })
    check(await page.$eval('#contact a[href^="https://calendly.com/"]', el => el.textContent.includes('Book a conversation')), `${width}: booking remains a secondary option`)
    await page.$eval('#contact', el => el.scrollIntoView()); await pause(700)
    check(await page.$('[data-explore-link]') === null, `${width}: the bottom prompt leaves once the contact form is in view`)
    const inquiry = await (await page.$('[data-inquiry-form] iframe')).contentFrame()
    await inquiry.waitForSelector('input[name="q4_yourEmail"]', { visible: true })
    const inquiryFields = await inquiry.$$eval('input,textarea', els => els.filter(el => ['q7_yourName','q4_yourEmail','q5_howCan'].includes(el.name)).map(el => ({ name: el.name, required: el.required })))
    check(inquiryFields.length === 3 && inquiryFields.filter(el => el.required).length === 2 && inquiryFields.some(el => el.name === 'q7_yourName' && !el.required), `${width}: existing inquiry form has optional name and required email/message`)
    check(await inquiry.$eval('button[type=submit],input[type=submit]', el => el.getBoundingClientRect().bottom <= innerHeight), `${width}: inquiry send button fits the embedded viewport`)
    check(await page.evaluate(() => { const css = getComputedStyle(document.documentElement), home = getComputedStyle(document.querySelector('[data-human-home]')); const a = document.createElement('div'); a.style.color=css.getPropertyValue('--color-black');document.body.appendChild(a);const ink=getComputedStyle(a).color;a.remove();return home.color === ink && home.backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(document.querySelector('#proof')).backgroundColor === 'rgb(246, 249, 250)' }), `${width}: homepage uses the live site's shared white, charcoal and cool-gray palette`)
    await page.evaluate(() => scrollTo(0, 0)); await pause(220)
    await page.click('[aria-label="Accessibility settings"]')
    await page.click('dialog input[type=checkbox]')
    check(await page.$eval('[data-story-task]', el => parseFloat(getComputedStyle(el).fontSize) === 20), `${width}: larger text setting`)
    await page.click('dialog input[type=checkbox]')
    await page.focus('dialog [role=switch]'); await page.keyboard.press('Space'); await page.keyboard.press('Escape')
    check(await page.$eval('[data-human-home]', el => el.dataset.motion === 'low'), `${width}: keyboard low-motion setting`)
    for (const item of cases) {
      await choose(page, width, item.id)
      const frame = await source(page, item), still = await detail(frame, item)
      check(still.spread === 0 && still.supporting.every(node => node.blur === 0), `${width} ${item.id}: low motion stays assembled and sharp`)
      check(await page.$eval('[data-case-overlay]', (el, href) => el.getAttribute('href') === href && el.tabIndex === 0, item.href), `${width} ${item.id}: low-motion preview still links to the case study`)
      check(await page.$eval('#work ul', el => getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity === '1'), `${width} ${item.id}: low-motion action list stays visible`)
      check(await page.$$eval('[data-action-list] > li', els => els.length === 3 && els.every(el => { const s = getComputedStyle(el); return s.padding === '12px' && s.borderLeftWidth === '4px' && s.borderLeftColor === 'rgb(0, 115, 133)' })), `${width} ${item.id}: still and phone annotations retain padded teal highlights`)
      check(await page.$$eval('[data-action-list] strong', (els, expected) => els.length === 3 && els.every((el, i) => getComputedStyle(el).fontFamily.includes('adobe-jenson-pro') && el.querySelector('em')?.textContent === expected[i]), item.emphasis), `${width} ${item.id}: still mode retains Jenson and italic keywords`)
      check(await page.$('[data-case-cue]') === null, `${width} ${item.id}: low motion needs no hover animation`)
    }
    await page.evaluate(() => scrollTo(0, 0)); await pause(150)
    await page.screenshot({ path: path.join(out, `low-${width}.png`), fullPage: true })
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
    const axe = await page.evaluate(async () => { const report = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { passes: report.passes.length, violations: report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(node => node.target) })) } })
    check(axe.passes > 0 && axe.violations.length === 0, `${width}: accessibility ${JSON.stringify(axe)}`)
    await page.reload({ waitUntil: 'networkidle2' })
    check(await page.$eval('[data-human-home]', el => el.dataset.motion === 'low'), `${width}: motion choice persists`)
    results.push({ width, initial, selections, people, axe })
    await context.close()
  }
  {
    // The preview becomes the case study's header: the site's card transition
    // machine runs collapsing > navigating > open > idle, lands on the case study
    // with its hero, and Back shrinks the hero into the same preview, restored.
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(`${route}?motion=full`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => !document.querySelector('#challenge-prior').disabled)
    await page.evaluate(() => document.querySelector('#challenge-prior').click())
    await page.waitForSelector('[data-work-prototype="prior"][data-ready="true"]', { timeout: 60000 }); await pause(500)
    const before = await page.$eval('[data-inspection-zone]', el => { const r = el.getBoundingClientRect(); return [r.top, r.left, r.width, r.height].map(Math.round) })
    const box = await (await page.$('[data-case-overlay]')).boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const phases = []
    const until = Date.now() + 30000
    while (Date.now() < until) {
      // A navigation can replace the page between two polls (a dev server compiling the route): read again.
      const now = await page.evaluate(() => `${document.querySelector('[data-transition-phase]')?.dataset.transitionPhase}|${location.pathname}|${!!document.querySelector('[data-card-morph]')}`).catch(() => null)
      if (!now) { await pause(50); continue }
      const [phase, where, morphing] = now.split('|')
      if (phases.at(-1) !== phase) phases.push(phase)
      if (phase === 'idle' && where === '/work/prior-auth' && morphing === 'false') break
      await pause(40)
    }
    check(/^collapsing>(navigating>)?open>idle$/.test(phases.join('>').replace(/^idle>/, '')) && new URL(page.url()).pathname === '/work/prior-auth', `Clicking the preview runs the card transition to its case study (${phases.join('>')} at ${new URL(page.url()).pathname})`)
    await pause(800)
    check(await page.evaluate(() => { const band = document.querySelector('[data-case-header]')?.getBoundingClientRect(), img = document.querySelector('[data-case-header-design]'); return !!band && band.width >= innerWidth - 20 && img?.complete && img.naturalWidth > 0 }), 'The case study opens with the prototype as its full-width header')
    await page.goBack()
    let landing = null
    const back = Date.now() + 4000
    while (Date.now() < back) { const r = await page.evaluate(() => { const m = document.querySelector('[data-card-morph="closing"] [data-card-design]') ?? document.querySelector('[data-card-morph="closing"]'); if (!m) return null; const b = m.getBoundingClientRect(); return [b.top, b.left, b.width, b.height].map(Math.round) }); if (r) landing = r; else if (landing) break; await pause(30) }
    await page.waitForFunction(() => document.querySelector('[data-transition-phase]')?.dataset.transitionPhase === 'idle' && !document.querySelector('[data-card-morph]'), { timeout: 30000 })
    check(landing && landing.every((value, index) => Math.abs(value - before[index]) <= 2) && await page.$eval('#work-title', el => el.textContent === 'Prior Authorization'), `Back shrinks the hero into the same preview, still chosen ${JSON.stringify({ before, landing })}`)
    await context.close()
  }
  {
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.setRequestInterception(true)
    page.on('request', request => { if (request.url().includes('/assets/clinical.html')) setTimeout(() => request.continue(), 2500); else request.continue() })
    await page.goto(`${route}?motion=full`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-work-prototype][data-delivery="live"]')
    const waiting = await page.evaluate(() => ({ bar: !!document.querySelector('[data-prototype-loading]'), still: !!document.querySelector('[data-work-prototype] > img'), hidden: getComputedStyle(document.querySelector('#work iframe')).opacity === '0' }))
    check(waiting.bar && !waiting.still && waiting.hidden, `A fast connection sees a loading bar, never placeholder content ${JSON.stringify(waiting)}`)
    await page.waitForSelector('[data-work-prototype="clinical"][data-ready="true"]', { timeout: 60000 })
    const shown = await page.evaluate(() => { const host = document.querySelector('[data-work-prototype]').getBoundingClientRect(), frame = document.querySelector('#work iframe').getBoundingClientRect(); return { bar: !!document.querySelector('[data-prototype-loading]'), fill: Math.max(frame.width * 1280 / 1640 / host.width, frame.height * 860 / 1220 / host.height) } })
    check(!shown.bar && Math.abs(shown.fill - 1) < 0.02, `The prototype arrives whole and at full size ${JSON.stringify(shown)}`)
    await context.close()
  }
  for (const [label, prepare] of [['?connection=slow', null], ['a 3g connection', page => page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'connection', { value: { effectiveType: '3g', saveData: false, downlink: 1.2 } }))]]) {
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    if (prepare) await prepare(page)
    await page.goto(`${route}?motion=full${label.startsWith('?') ? '&connection=slow' : ''}`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => { const img = document.querySelector('[data-work-prototype][data-delivery="still"] > img'); return img?.complete && img.naturalWidth > 0 }, { timeout: 30000 }).catch(() => {})
    const slow = await page.evaluate(() => ({ frame: !!document.querySelector('#work iframe'), image: (() => { const img = document.querySelector('[data-work-prototype] > img'); return img.complete && img.naturalWidth > 0 })(), actions: document.querySelector('[data-action-list]').getBoundingClientRect().height > 0 }))
    check(!slow.frame && slow.image && slow.actions, `On ${label} the still image stands in, with the design decisions listed ${JSON.stringify(slow)}`)
    await context.close()
  }
  {
    // Only the number fills in the proof section; the copy around it stays still.
    const context = await browser.createBrowserContext(), page = await context.newPage()
    await page.goto(`${route}?motion=full`, { waitUntil: 'networkidle2' })
    check(await page.evaluate(() => document.querySelectorAll('#proof [data-word-fill]').length === 0 && !!document.querySelector('#proof [data-experience-fill]')), 'Proof section has one fill, the number rising from the bottom')
    await context.close()
  }
  const context = await browser.createBrowserContext(), page = await context.newPage()
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await page.goto(route, { waitUntil: 'networkidle2' })
  check(await page.$eval('[data-human-home]', el => el.dataset.motion === 'low'), 'OS reduced-motion respected')
  await page.setJavaScriptEnabled(false); await page.reload({ waitUntil: 'networkidle2' })
  check(await page.$$eval('noscript a', els => els.length === 3 && els.every(el => !!el.href)), 'All three case links available without script')
  check(await page.$$eval('[data-work-prototype] img', els => els.length === 1 && els[0].complete && els[0].naturalWidth > 0), 'One still preview without script')
  check(errors.length === 0, `No client errors: ${errors.join('; ')}`)
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ checks, results, failures, errors }, null, 2))
  assert(results.length === 5 && checks > 0, 'Must check all five actual browser sizes')
  assert.equal(failures.length, 0, `${failures.length} checks failed; see report.json`)
  console.log(`PASS: ${checks} checks across five sizes; one preview, challenge selection with a sliding dot, click-through to the case study, scroll-only breakdown with the insight, solution callouts, dot endpoints, services, published proof, large-organization evidence, contact options, keyboard, low motion and accessibility.`)
} finally { await browser.close() }
