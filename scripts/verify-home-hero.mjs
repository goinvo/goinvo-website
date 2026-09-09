import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const base = process.env.HERO_TEST_BASE || 'http://localhost:3000'
const browser = await puppeteer.launch({ headless: true })
const reports = []
const beacons = []
try {
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.exposeFunction('recordHeroBeacon', (body) => beacons.push(JSON.parse(body)))
  await page.evaluateOnNewDocument(() => {
    window.heroTestBeacons = []
    const sendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url, body) => {
      if (String(url).includes('/api/marketing/analytics/collect')) {
        if (!(body instanceof Blob)) throw new Error('Expected a JSON Blob beacon')
        void body.text().then(async (text) => {
          await window.recordHeroBeacon(text)
          window.heroTestBeacons.push(JSON.parse(text))
        })
        return true // Never seed QA counts into shared KV.
      }
      return sendBeacon(url, body)
    }
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  async function capture(url, name, width) {
    await page.setViewport({ width, height: 1080 })
    const response = await page.goto(url, { waitUntil: 'networkidle2' })
    assert.equal(response.status(), 200, `${name} returns 200`)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => {
      const hero = document.querySelector('main h1')?.closest('section')
      return hero && [...hero.querySelectorAll('img')].every((image) => image.complete)
    })
    // Freeze the animation at the same point for comparable screenshots.
    await page.evaluate(() => document.querySelector('.eid-runway-belt')?.getAnimations().forEach((animation) => {
      animation.pause()
      animation.currentTime = 0
    }))
    await page.addStyleTag({ content: '.eid-runway-belt { animation-play-state: paused !important; } .eid-reveal { animation: none !important; opacity: 1 !important; }' })
    const metrics = await page.evaluate(() => {
      const h1 = document.querySelector('main h1')
      if (!h1) throw new Error('Missing homepage heading')
      const hero = h1.closest('section')
      const measure = (element) => {
        if (!element) throw new Error('Missing measured element')
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
        return { width: rect.width, height: rect.height, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight), paddingTop: parseFloat(style.paddingTop), paddingBottom: parseFloat(style.paddingBottom) }
      }
      return { hero: measure(hero), heading: measure(h1), copy: measure(hero.querySelector('p')), cta: measure(hero.querySelector('a')), h1: h1.textContent, headingCount: document.querySelectorAll('main h1').length, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), brokenImages: [...hero.querySelectorAll('img')].filter((image) => !image.naturalWidth).length, runwayRows: hero.querySelectorAll('.eid-runway-row').length }
    })
    await page.screenshot({ path: `.audit/home-hero-${name}-${width}.png` })
    assert.equal(metrics.headingCount, 1)
    assert.equal(metrics.overflow, 0, `${name} no horizontal overflow`)
    assert.equal(metrics.brokenImages, 0, `${name} no broken hero images`)
    return metrics
  }

  for (const width of [1440, 390]) {
    for (const variant of ['control', 'runway']) {
      const target = variant === 'control' ? 'https://www.goinvo.com/' : 'https://goinvo-website-next-git-homepage-handwritten-hero-goinvo.vercel.app/'
      const reference = await capture(`${target}?home-hero-runway-variant=${variant}`, `reference-${variant}`, width)
      const count = beacons.length
      const actual = await capture(`${base}/?home-hero-runway-variant=${variant}`, `local-${variant}`, width)
      assert.equal(beacons.length, count, 'Forced previews must not emit experiment beacons')
      const checks = []
      for (const element of ['hero', 'heading', 'copy', 'cta']) {
        for (const metric of Object.keys(actual[element])) {
          const a = actual[element][metric], t = reference[element][metric]
          const pass = Number.isNaN(a) && Number.isNaN(t) || Math.abs(a - t) <= 3
          checks.push({ element, metric, actual: a, target: t, result: pass ? 'PASS' : 'FAIL' })
        }
      }
      reports.push({ width, variant, actual, reference, checks })
    }
  }

  // Real assignment, with QA events intercepted: verify initial HTML matches
  // hydrated output, reload stickiness, CTA attribution, and exposure dedupe.
  for (const visitor of ['hero-qa-1', 'hero-qa-2']) {
    await page.setCookie({ name: 'goinvo_marketing_visitor_id', value: visitor, url: base })
    await page.goto(base, { waitUntil: 'networkidle2' })
    await page.evaluate(() => localStorage.clear())
    const before = beacons.length
    const response = await page.reload({ waitUntil: 'networkidle2' })
    const html = await response.text()
    const heading = await page.$eval('main h1', (element) => element.textContent)
    assert.ok(html.includes(heading), 'Hero is in the original server HTML')
    const exposure = beacons.slice(before).find((event) => event.eventName === 'experiment_exposure')
    assert.ok(exposure, 'Assigned visit emits an exposure')
    assert.equal(exposure.experiment_id, 'home-hero-runway')
    assert.equal(exposure.variant, heading === 'Everything is designed' ? 'runway' : 'control')
    await page.click('[data-experiment-section="hero"] a[href="#book"]')
    await page.waitForFunction(() => location.hash === '#book')
    await page.waitForFunction(() => window.heroTestBeacons.some((event) => event.eventName === 'qualified_discovery_call_click'))
    assert.ok(beacons.slice(before).some((event) => event.eventName === 'qualified_discovery_call_click' && event.variant === exposure.variant))
    const exposuresBefore = beacons.filter((event) => event.eventName === 'experiment_exposure').length
    await page.goto(base, { waitUntil: 'networkidle2' })
    assert.equal(await page.$eval('main h1', (element) => element.textContent), heading, 'Visitor keeps assignment')
    assert.equal(beacons.filter((event) => event.eventName === 'experiment_exposure').length, exposuresBefore, 'Reload does not double count exposure')
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(`${base}/?home-hero-runway-variant=runway`, { waitUntil: 'networkidle2' })
  assert.equal(await page.$eval('.eid-runway-belt', (element) => getComputedStyle(element).animationName), 'none')
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`)
  fs.writeFileSync('.audit/home-hero-verification.json', JSON.stringify({ reports, analytics: 'PASS', reducedMotion: 'PASS', browserErrors: errors }, null, 2))
  for (const report of reports) {
    console.log(`${report.width}px ${report.variant}: ${report.checks.filter((check) => check.result === 'PASS').length}/${report.checks.length} metrics PASS`)
    for (const check of report.checks.filter((check) => check.result === 'FAIL')) console.log(check)
  }
  assert.ok(reports.every((report) => report.checks.every((check) => check.result === 'PASS')), 'All measured dimensions must match within 3px')
  console.log('PASS: SSR, sticky assignment, exposure dedupe, CTA attribution, preview exclusion, reduced motion, no browser errors')
} finally {
  await browser.close()
}
