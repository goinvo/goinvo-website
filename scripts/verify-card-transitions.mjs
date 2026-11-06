// Chaos suite for the card transition machine (src/context/PageTransitionContext.tsx).
// Drives it the way people do — double clicks, Back mid-morph, links mid-morph,
// Forward, rapid history, modifier clicks, keyboard, reduced motion — on the
// homepage study AND the live work grid, then checks the same invariants after
// every scenario: machine idle, no overlay or white sheet left behind, the page
// visible and usable, on the page the address says, and no page errors.
//
// Usage: node scripts/verify-card-transitions.mjs   (dev server on :3111, or BASE=<url>)
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const base = process.env.BASE || 'http://127.0.0.1:3111'
const concept = '/design-lab/human'
const out = path.resolve('.audit/card-transitions')
await fs.mkdir(out, { recursive: true })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let checks = 0
const failures = [], log = []
const check = (ok, label) => { checks++; log.push(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) { failures.push(label); console.error(`FAIL: ${label}`) } }

const phaseOf = page => page.evaluate(() => document.querySelector('[data-transition-phase]')?.dataset.transitionPhase ?? 'none')
const waitPhase = (page, phase, timeout = 30000) => page.waitForFunction(p => document.querySelector('[data-transition-phase]')?.dataset.transitionPhase === p, { timeout, polling: 20 }, phase)

/** Everything a settled page must be, whatever happened before it. */
async function settled(page, label, expectPath) {
  // Idle AND on the expected page. Idle alone is also true right after a click,
  // before the run starts (it waits a moment for the still to decode), and that
  // once let this helper measure mid-reveal and report a healthy run as stuck.
  // Polled in our own loop: page.waitForFunction can reject mid-navigation.
  const idleBy = Date.now() + 30000
  while (Date.now() < idleBy) {
    const idle = await page.evaluate(want => document.querySelector('[data-transition-phase]')?.dataset.transitionPhase === 'idle' && !document.querySelector('[data-card-morph]') && !document.querySelector('[data-card-scrim]') && (!want || location.pathname === want), expectPath || null).catch(() => false)
    if (idle) break
    await pause(50)
  }
  // The incoming page's own fade-in: wait for it to finish rather than guess;
  // a page still mid-fade after 6s is stuck, and that is a failure.
  // Settled means: on the expected address, page fully visible, and STILL so
  // 300ms later. Right after a click the old page is fully visible too, and during
  // a swap there is a moment with no <main> at all; neither may pass for settled.
  let steady = 0
  const until = Date.now() + 8000
  while (Date.now() < until && steady < 6) {
    const ok = await page.evaluate(want => { const main = document.querySelector('#main-content'); return !!main && getComputedStyle(main).opacity === '1' && (!want || location.pathname === want) }, expectPath || null).catch(() => false)
    steady = ok ? steady + 1 : 0
    await pause(50)
  }
  const s = await page.evaluate(() => {
    const main = document.querySelector('#main-content'), style = main && getComputedStyle(main), box = main?.getBoundingClientRect()
    const centre = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return {
      phase: document.querySelector('[data-transition-phase]')?.dataset.transitionPhase,
      morph: !!document.querySelector('[data-card-morph]'), scrim: !!document.querySelector('[data-card-scrim]'),
      path: location.pathname, opacity: style?.opacity, clip: style?.clipPath, height: Math.round(box?.height || 0),
      overflow: getComputedStyle(document.body).overflow, covered: !!centre?.closest('[data-card-morph],[data-card-scrim]'),
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 48) || '',
      visibility: document.visibilityState,
    }
  })
  // Are frames running at all? (A hidden page gets none, and its timers are throttled.)
  s.frames = await page.evaluate(() => new Promise(resolve => { let n = 0; const tick = () => { n++; if (n < 5) requestAnimationFrame(tick) }; requestAnimationFrame(tick); setTimeout(() => resolve(n), 400) }))
  const ok = s.phase === 'idle' && !s.morph && !s.scrim && s.opacity === '1' && !String(s.clip).includes('100%') && s.height > 400 && s.overflow !== 'hidden' && !s.covered && (!expectPath || s.path === expectPath) && s.h1.length > 0
  if (!ok) s.log = await page.evaluate(() => (window.__transitionLog || []).slice(-14).join(' | ')).catch(() => '')
  check(ok, `${label}: settles clean on ${expectPath || s.path} ${ok ? '' : JSON.stringify(s)}`)
  return s
}

async function openConcept(page, work = 'prior') {
  await page.goto(`${base}${concept}?motion=full&work=${work}`, { waitUntil: 'networkidle2', timeout: 180000 })
  await page.waitForSelector(`[data-work-prototype="${work}"][data-ready="true"]`, { timeout: 120000 })
  await pause(500)
}
async function clickPreview(page, options = {}) {
  const box = await (await page.$('[data-case-overlay]')).boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options)
}
const target = '/work/prior-auth'

const browser = await puppeteer.launch({ headless: true })
const errors = []
async function fresh(options = {}) {
  const context = await browser.createBrowserContext(), page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  if (options.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  page.on('pageerror', error => errors.push(`${options.name} at ${new URL(page.url()).pathname}: ${(error.stack || error.message).split(String.fromCharCode(10)).slice(0, 4).join(' | ').slice(0, 400)}`))
  return { context, page }
}

try {
  // Warm the routes so dev compiles don't stretch every phase.
  { const { context, page } = await fresh({ name: 'warm' }); for (const p of [concept, target, '/work/ipsos-facto', `${concept}/work/clinical-evidence-engine`, '/work', '/services', '/about', '/vision', '/']) await page.goto(base + p, { waitUntil: 'load', timeout: 180000 }).catch(() => {}); await context.close() }

  {
    const name = 'open and back'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    const start = await page.evaluate(() => history.length)
    await clickPreview(page)
    await settled(page, `${name}: open`, target)
    check(await page.evaluate(() => history.length) === start + 1, `${name}: one history entry per open`)
    check(await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !!document.querySelector('#main-content')?.contains(a) }), `${name}: focus moves into the case study`)
    await page.goBack()
    await settled(page, `${name}: back`, concept)
    check(await page.evaluate(() => document.activeElement?.matches('[data-case-overlay]')), `${name}: focus returns to the preview it opened`)
    check(await page.$eval('#work-title', el => el.textContent === 'Prior Authorization'), `${name}: the chosen prototype is restored`)
    await clickPreview(page)
    await settled(page, `${name}: a second run after returning still opens`, target)
    await context.close()
  }

  {
    const name = 'double click'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    const start = await page.evaluate(() => history.length)
    const box = await (await page.$('[data-case-overlay]')).boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2 })
    // The click waits (briefly) for the still to decode before the run starts.
    await waitPhase(page, 'collapsing', 5000).catch(() => {})
    const token = await page.$eval('[data-transition-phase]', el => el.dataset.transitionToken)
    await settled(page, name, target)
    check(token === '1' && await page.evaluate(() => history.length) === start + 1, `${name}: one run, one history entry (token ${token})`)
    await context.close()
  }

  {
    const name = 'Back while collapsing'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await page.evaluate(() => history.pushState(history.state, '', location.href + '#step')) // a same-page history entry to go back to
    await clickPreview(page)
    await waitPhase(page, 'collapsing', 5000)
    await page.goBack()
    await pause(1500)
    await settled(page, name, concept)
    check(!(await page.evaluate(() => location.hash)), `${name}: the cancelled open never lands later`)
    await context.close()
  }

  {
    const name = 'Back while navigating'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await page.evaluate(() => history.pushState(history.state, '', location.href + '#step'))
    await clickPreview(page)
    // A production build with the route prefetched can pass through 'navigating'
    // faster than a poll sees it; Back during 'open' must also land on the concept.
    await page.waitForFunction(() => ['navigating', 'open'].includes(document.querySelector('[data-transition-phase]')?.dataset.transitionPhase), { timeout: 5000, polling: 'raf' })
    await page.goBack()
    await pause(4000) // long enough for the abandoned route request to come back
    await settled(page, name, concept)
    await context.close()
  }

  {
    const name = 'link while collapsing'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await clickPreview(page)
    await waitPhase(page, 'collapsing', 5000)
    await page.evaluate(() => document.querySelector('header a[href="/services"]').click())
    await pause(3000)
    await settled(page, name, '/services')
    await context.close()
  }

  {
    const name = 'link while navigating'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await clickPreview(page)
    await page.waitForFunction(() => ['navigating', 'open'].includes(document.querySelector('[data-transition-phase]')?.dataset.transitionPhase), { timeout: 5000, polling: 'raf' })
    await page.evaluate(() => document.querySelector('header a[href="/about"]').click())
    await pause(4000)
    await settled(page, `${name} (the newer navigation wins)`, '/about')
    await context.close()
  }

  {
    const name = 'Back then Forward'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await clickPreview(page)
    await settled(page, `${name}: open`, target)
    await page.goBack(); await settled(page, `${name}: back`, concept)
    await page.goForward(); await settled(page, `${name}: forward shows the case study plainly`, target)
    check(await page.evaluate(() => [...document.querySelectorAll('img')].some(img => img.getBoundingClientRect().width > 800 && img.getBoundingClientRect().top < 500 && img.complete && img.naturalWidth > 0)), `${name}: forward shows the hero`)
    await context.close()
  }

  {
    const name = 'Back during the closing morph, then Forward'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await clickPreview(page)
    await settled(page, `${name}: open`, target)
    await page.goBack()
    await waitPhase(page, 'closing', 5000).catch(() => {})
    await page.goForward()
    await pause(2500)
    await settled(page, name, target)
    await context.close()
  }

  {
    const name = 'rapid history'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await clickPreview(page)
    await settled(page, `${name}: open`, target)
    for (let i = 0; i < 3; i++) { await page.goBack({ waitUntil: 'commit' }).catch(() => {}); await pause(120); await page.goForward({ waitUntil: 'commit' }).catch(() => {}); await pause(120) }
    await pause(2500)
    const s = await settled(page, name)
    check(s.path === target ? /Cancer Treatment/i.test(s.h1) : s.path === concept, `${name}: what shows matches the address (${s.path}: ${s.h1})`)
    await context.close()
  }

  {
    const name = 'modifier click'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await page.keyboard.down('Control'); await clickPreview(page); await page.keyboard.up('Control')
    await pause(800)
    check(await phaseOf(page) === 'idle' && new URL(page.url()).pathname === concept && !(await page.$('[data-card-morph]')), `${name}: opens a new tab, no morph here`)
    await context.close()
  }

  {
    const name = 'keyboard'
    const { context, page } = await fresh({ name })
    await openConcept(page)
    await page.focus('[data-case-overlay]'); await page.keyboard.press('Enter')
    await waitPhase(page, 'collapsing', 5000).catch(() => {})
    await settled(page, name, target)
    await context.close()
  }

  {
    const name = 'reduced motion'
    const { context, page } = await fresh({ name, reduced: true })
    await page.goto(`${base}${concept}?work=prior`, { waitUntil: 'networkidle2', timeout: 180000 })
    await page.waitForSelector('[data-work-prototype="prior"]', { timeout: 120000 }); await pause(500)
    let sawMorph = false
    const watch = setInterval(async () => { try { if (await page.$('[data-card-morph]')) sawMorph = true } catch { /* navigating */ } }, 30)
    await clickPreview(page)
    await settled(page, `${name}: open`, target)
    await page.goBack(); await settled(page, `${name}: back`, concept)
    clearInterval(watch)
    check(!sawMorph, `${name}: no morph drawn, either way`)
    await context.close()
  }

  {
    const name = 'work grid'
    const { context, page } = await fresh({ name })
    await page.goto(`${base}/work`, { waitUntil: 'networkidle2', timeout: 180000 }); await pause(800)
    // A card well down the grid, so the return has to come back to a scrolled page.
    const index = await page.$$eval('[data-card-image]', els => Math.min(els.length - 1, 9))
    await page.evaluate(i => document.querySelectorAll('[data-card-image]')[i].scrollIntoView({ block: 'center' }), index); await pause(600)
    const before = await page.evaluate(i => { const r = document.querySelectorAll('[data-card-image]')[i].getBoundingClientRect(); return { rect: [r.top, r.left, r.width, r.height].map(Math.round), scrollY: Math.round(scrollY) } }, index)
    const card = (await page.$$('[data-card-image]'))[index], box = await card.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const opened = await settled(page, `${name}: open`)
    check(opened.path.startsWith('/work/'), `${name}: a grid card opens its case study (${opened.path})`)
    await page.goBack()
    let landing = null
    const until = Date.now() + 4000
    while (Date.now() < until) { const r = await page.evaluate(() => { const m = document.querySelector('[data-card-morph="closing"]'); if (!m) return null; const b = m.getBoundingClientRect(); return [b.top, b.left, b.width, b.height].map(Math.round) }); if (r) landing = r; else if (landing) break; await pause(30) }
    await settled(page, `${name}: back`, '/work')
    const after = await page.evaluate(i => { const r = document.querySelectorAll('[data-card-image]')[i].getBoundingClientRect(); return { rect: [r.top, r.left, r.width, r.height].map(Math.round), scrollY: Math.round(scrollY) } }, index)
    check(Math.abs(after.scrollY - before.scrollY) <= 4, `${name}: Back returns to where the grid was scrolled ${JSON.stringify({ before: before.scrollY, after: after.scrollY })}`)
    check(!landing || landing.every((v, i) => Math.abs(v - after.rect[i]) <= 4), `${name}: the reverse morph lands on the card it came from ${JSON.stringify({ landing, card: after.rect })}`)
    await context.close()
  }

  // Where the morph ends vs where the page draws the header: any gap is a visible jump.
  async function handoff(page) {
    const rect = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.top, r.left, r.width, r.height].map(Math.round) }, sel)
    let band = null, seen = false
    const until = Date.now() + 30000
    while (Date.now() < until) { const b = await rect('[data-card-band]'); if (b) { band = b; seen = true } if (seen && !b && await rect('[data-case-header]')) break; await pause(25) }
    await pause(600)
    const header = await rect('[data-case-header]')
    return band && header ? Math.max(...band.map((v, i) => Math.abs(v - header[i]))) : null
  }

  {
    const name = 'prototype case study from the work grid'
    const { context, page } = await fresh({ name })
    await page.goto(`${base}/work`, { waitUntil: 'networkidle2', timeout: 180000 }); await pause(800)
    const found = await page.evaluate(() => { const a = document.querySelector('a[href="/work/prior-auth"] [data-card-image]'); if (!a) return false; a.scrollIntoView({ block: 'center' }); return true })
    check(found, `${name}: the grid lists Prior Authorization`)
    if (found) {
      await pause(600)
      const before = await page.evaluate(() => Math.round(scrollY))
      const box = await (await page.$('a[href="/work/prior-auth"] [data-card-image]')).boundingBox()
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      const gap = await handoff(page)
      check(gap !== null && gap <= 1, `${name}: the card lands on the prototype band with no jump (gap ${gap}px)`)
      await settled(page, `${name}: open`, '/work/prior-auth')
      await page.goBack()
      await settled(page, `${name}: back`, '/work')
      check(Math.abs(await page.evaluate(() => Math.round(scrollY)) - before) <= 4, `${name}: Back returns to where the grid was scrolled`)
    }
    await context.close()
  }

  for (const [width, height] of [[390, 844], [768, 1024]]) {
    const name = `homepage preview at ${width}px`
    const { context, page } = await fresh({ name })
    await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 })
    await openConcept(page)
    await page.evaluate(() => document.querySelector('[data-case-overlay]').scrollIntoView({ block: 'center' })); await pause(500)
    await page.evaluate(() => document.querySelector('[data-case-overlay]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
    const gap = await handoff(page)
    check(gap !== null && gap <= 1, `${name}: lands on the band with no jump (gap ${gap}px)`)
    await settled(page, `${name}: open`, target)
    await page.goBack()
    await settled(page, `${name}: back`, concept)
    await context.close()
  }

  {
    const name = 'other pages'
    const { context, page } = await fresh({ name })
    await page.goto(`${base}/`, { waitUntil: 'networkidle2', timeout: 180000 })
    await settled(page, `${name}: home`, '/')
    for (const href of ['/work', '/services', '/about', '/vision']) {
      await page.evaluate(h => document.querySelector(`header a[href="${h}"]`)?.click(), href)
      await settled(page, `${name}: header link to ${href}`, href)
    }
    await page.goBack(); await settled(page, `${name}: Back`, '/about')
    await page.evaluate(() => document.querySelector('header a[href="/work"]').click()); await settled(page, `${name}: to work`, '/work')
    await page.goto(`${base}${concept}`, { waitUntil: 'networkidle2' })
    check(await page.$eval('header a[href="/design-lab/human#contact"]', el => el.textContent.trim() === 'Let’s talk').catch(() => false), `${name}: the study's header offers Let's talk`)
    await page.goto(`${base}/services`, { waitUntil: 'networkidle2' })
    check(await page.$eval('header a[href="/contact"]', el => el.textContent.trim() === 'Contact').catch(() => false), `${name}: every other page keeps Contact`)
    await context.close()
  }

  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`)
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ checks, failures, log }, null, 2))
  console.log(log.join('\n'))
  console.log(failures.length ? `\n${failures.length} of ${checks} checks failed` : `\nPASS: ${checks} checks`)
  process.exitCode = failures.length ? 1 : 0
} finally { await browser.close() }
