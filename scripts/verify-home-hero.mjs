import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const base = process.env.HERO_TEST_BASE || 'http://localhost:3000'
const headline = 'Better business by Design.'
const subtitle = 'GoInvo is a business and systems reinvention studio.'
const positioning = [
  'We design businesses, systems, products, and software.',
  'Sometimes the problem is the business model.',
  'Sometimes it’s the organization, the technology, or the 17 systems that refuse to talk to each other.',
  'We work across all of it.',
  'From Fortune 500s to federal agencies.',
  'From healthcare to enterprise systems.',
  'From strategy to working software used by millions.',
  'We find the problems, create multiple right answers, and build the best ones.',
  'Small teams. Senior humans. Shipped.',
]
fs.mkdirSync('.audit', { recursive: true })
const browser = await puppeteer.launch({ headless: true })
const reports = []
const beacons = []
const errors = []
let analytics = 'PENDING'
let reducedMotion = 'PENDING'
let failure = null
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
  page.on('pageerror', (error) => errors.push(error.message))

  async function capture(url, name, width) {
    await page.setViewport({ width, height: 1080 })
    const response = await page.goto(url, { waitUntil: 'networkidle2' })
    assert.ok(response, `${name} returns a response`)
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
      if (!hero) throw new Error('Missing homepage hero section')
      const copy = hero.querySelector('p')
      const cta = hero.querySelector('a')
      const measure = (element) => {
        if (!element) throw new Error('Missing measured element')
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
        return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight), marginTop: parseFloat(style.marginTop), marginBottom: parseFloat(style.marginBottom), paddingTop: parseFloat(style.paddingTop), paddingBottom: parseFloat(style.paddingBottom), paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight) }
      }
      const clean = (text) => text.replace(/\s+/g, ' ').trim()
      const artwork = h1.querySelector('img')
      const work = document.querySelector('[data-experiment-section="selected-work"]')
      const about = document.querySelector('[data-experiment-section="why-goinvo"]')
      const adoption = hero.querySelector('[data-home-concept-reveal]')
      return {
        hero: measure(hero), heading: measure(h1), container: measure(h1.parentElement),
        copy: measure(copy), cta: measure(cta), ctaGroup: measure(cta.parentElement),
        artwork: artwork ? { ...measure(artwork), source: artwork.getAttribute('src'), alt: artwork.getAttribute('alt'), intrinsicWidth: Number(artwork.getAttribute('width')), intrinsicHeight: Number(artwork.getAttribute('height')) } : null,
        adoption: adoption ? measure(adoption) : null,
        selectedWork: work ? { ...measure(work), links: [...work.querySelectorAll('a[href]')].map((link) => link.getAttribute('href')) } : null,
        aboutText: about ? clean(about.innerText).replace(/'/g, '’') : null,
        h1: clean(h1.textContent), copyText: clean(copy.textContent),
        heroLinks: [...hero.querySelectorAll('a[href]')].map((link) => link.getAttribute('href')),
        heroVariant: hero.dataset.heroVariant || null,
        heroCount: document.querySelectorAll('main [data-experiment-section="hero"]').length,
        headingCount: document.querySelectorAll('main h1').length,
        sectionOrder: [...document.querySelectorAll('main section[data-experiment-section]')].map((section) => section.dataset.experimentSection),
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        brokenImages: [...hero.querySelectorAll('img')].filter((image) => !image.naturalWidth).length,
        runwayRows: hero.querySelectorAll('.eid-runway-row').length,
      }
    })
    await page.screenshot({ path: `.audit/home-hero-${name}-${width}.png` })
    if (name.startsWith('local-')) {
      const why = await page.$('[data-experiment-section="why-goinvo"]')
      assert.ok(why, `${name} has a Why GoInvo section to review`)
      await page.addStyleTag({ content: '[data-home-concept-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }' })
      await why.screenshot({ path: `.audit/home-why-goinvo-${name}-${width}.png` })
    }
    assert.equal(metrics.headingCount, 1)
    assert.equal(metrics.overflow, 0, `${name} no horizontal overflow`)
    assert.equal(metrics.brokenImages, 0, `${name} no broken hero images`)
    return metrics
  }

  for (const width of [1920, 1440, 390]) {
    for (const variant of ['control', 'runway']) {
      const target = 'https://www.goinvo.com/'
      const reference = await capture(`${target}?home-hero-runway-variant=${variant}`, `reference-${variant}`, width)
      const count = beacons.length
      const actual = await capture(`${base}/?home-hero-runway-variant=${variant}`, `local-${variant}`, width)
      assert.equal(beacons.length, count, 'Forced previews must not emit experiment beacons')
      const checks = []
      const check = (element, metric, actualValue, targetValue, tolerance = 3) => {
        const pass = typeof targetValue === 'number'
          ? typeof actualValue === 'number' && (Number.isNaN(actualValue) && Number.isNaN(targetValue) || Math.abs(actualValue - targetValue) <= tolerance)
          : actualValue === targetValue
        checks.push({ element, metric, actual: actualValue, target: targetValue, tolerance: typeof targetValue === 'number' ? tolerance : undefined, result: pass ? 'PASS' : 'FAIL' })
      }
      // Copy length and artwork intentionally change the boxes. Compare the
      // unchanged typography and CTA dimensions with their live references.
      for (const metric of ['fontSize', 'lineHeight', 'marginBottom']) check('copy', metric, actual.copy[metric], reference.copy[metric])
      for (const metric of ['width', 'height', 'fontSize', 'lineHeight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) {
        check('cta', metric, actual.cta[metric], reference.cta[metric])
      }

      const padding = width < 568 ? 20 : width < 864 ? 32 : 56
      const innerWidth = Math.min(width, 1280) - padding * 2
      const artworkWidth = Math.min(innerWidth, variant === 'control' ? 640 : 880)
      const artworkHeight = artworkWidth * 688 / 1200
      const clamp = (minimum, preferred, maximum) => Math.max(minimum, Math.min(preferred, maximum))
      const topPadding = variant === 'control' ? clamp(72, width * 0.1, 120) : clamp(72, width * 0.09, 140)
      const bottomPadding = variant === 'control' ? clamp(72, width * 0.1, 96) : clamp(230, width * 0.26, 320)
      check('hero', 'variant', actual.heroVariant, variant)
      check('hero', 'count', actual.heroCount, 1, 0)
      check('hero', 'width', actual.hero.width, width)
      check('hero', 'horizontalOverflow', actual.overflow, 0, 0)
      check('hero', 'brokenImages', actual.brokenImages, 0, 0)
      check('hero', 'headingCount', actual.headingCount, 1, 0)
      check('hero', 'runwayRows', actual.runwayRows, variant === 'runway' ? 10 : 0, 0)
      check('heading', 'accessibleText', actual.h1, headline)
      check('copy', 'text', actual.copyText, subtitle)
      check('container', 'width', actual.container.width, Math.min(width, 1280))
      check('container', 'paddingLeft', actual.container.paddingLeft, padding)
      check('container', 'paddingRight', actual.container.paddingRight, padding)
      check('container', 'paddingTop', actual.container.paddingTop, topPadding)
      check('container', 'paddingBottom', actual.container.paddingBottom, bottomPadding)
      check('heading', 'width', actual.heading.width, variant === 'control' ? artworkWidth : innerWidth)
      check('heading', 'height', actual.heading.height, artworkHeight)
      check('artwork', 'present', Boolean(actual.artwork), true)
      check('artwork', 'source', actual.artwork?.source?.includes('better-business-by-design.webp') || false, true)
      check('artwork', 'decorativeAlt', actual.artwork?.alt, '')
      check('artwork', 'intrinsicWidth', actual.artwork?.intrinsicWidth, 1200, 0)
      check('artwork', 'intrinsicHeight', actual.artwork?.intrinsicHeight, 688, 0)
      check('artwork', 'width', actual.artwork?.width, artworkWidth)
      check('artwork', 'height', actual.artwork?.height, artworkHeight)
      check('layout', 'headingToCopyGap', actual.copy.top - actual.heading.bottom, variant === 'control' ? 24 : 28)
      // Paragraphs have a 16px bottom margin. Flex children in the Ipsos hero
      // retain it alongside the CTA margin; block margins collapse in runway.
      check('layout', 'copyToCtaGap', actual.ctaGroup.top - actual.copy.bottom, variant === 'control' ? 56 : 44)
      if (variant === 'control') {
        check('adoption', 'present', Boolean(actual.adoption), true)
        check('layout', 'ctaToAdoptionGap', actual.adoption ? actual.adoption.top - actual.ctaGroup.bottom : null, 56)
      }
      const contentHeight = artworkHeight + (variant === 'control' ? 24 : 28) + actual.copy.height
        + (variant === 'control' ? 56 : 44) + actual.ctaGroup.height
        + (variant === 'control' ? 56 + (actual.adoption?.height || 0) : 0)
      check('hero', 'height', actual.hero.height, Math.max(topPadding + contentHeight + bottomPadding, variant === 'control' ? clamp(480, width * 0.6, 720) : 0))
      check('sections', 'leadingOrder', actual.sectionOrder.slice(0, 4).join(','), 'hero,selected-work,client-proof,services')
      check('sections', 'selectedWorkCount', actual.sectionOrder.filter((section) => section === 'selected-work').length, 1, 0)
      check('sections', 'workDirectlyAfterHero', actual.selectedWork ? actual.selectedWork.top - actual.hero.bottom : null, 0)
      for (const href of ['/work/ipsos-facto', '/work/3m-coderyte']) check('selectedWork', href, actual.selectedWork?.links.includes(href) || false, true)
      for (const href of ['#book', '/work']) check('heroLinks', href, actual.heroLinks.includes(href), true)
      for (const sentence of positioning) check('whyGoInvo', sentence, actual.aboutText?.includes(sentence) || false, true)
      for (const oldCopy of ['Focus and Range.', 'The generalist agencies', 'That depth is the moat']) check('whyGoInvo', `removed: ${oldCopy}`, actual.aboutText?.includes(oldCopy) || false, false)
      reports.push({ width, variant, actual, reference, checks })
    }
  }

  // Real assignment, with QA events intercepted: verify initial HTML matches
  // hydrated output, reload stickiness, CTA attribution, and exposure dedupe.
  const assignedVariants = new Set()
  for (const visitor of ['hero-qa-1', 'hero-qa-3']) {
    await page.setCookie({ name: 'goinvo_marketing_visitor_id', value: visitor, url: base })
    await page.goto(base, { waitUntil: 'networkidle2' })
    await page.evaluate(() => localStorage.clear())
    const before = beacons.length
    const response = await page.reload({ waitUntil: 'networkidle2' })
    const html = await response.text()
    const heading = await page.$eval('main h1', (element) => element.textContent)
    const variant = await page.$eval('[data-experiment-section="hero"]', (element) => element.dataset.heroVariant)
    assert.ok(['control', 'runway'].includes(variant), 'Assigned hero has an explicit variant marker')
    assignedVariants.add(variant)
    assert.equal(heading.trim(), headline)
    assert.ok(html.includes(heading), 'Hero is in the original server HTML')
    assert.ok(html.includes(`data-hero-variant="${variant}"`), 'Assigned variant is in the original server HTML')
    await page.waitForFunction(() => window.heroTestBeacons.some((event) => event.eventName === 'experiment_exposure'))
    const exposure = beacons.slice(before).find((event) => event.eventName === 'experiment_exposure')
    assert.ok(exposure, 'Assigned visit emits an exposure')
    assert.equal(exposure.experiment_id, 'home-hero-runway')
    assert.equal(exposure.variant, variant)
    await page.click('[data-experiment-section="hero"] a[href="#book"]')
    await page.waitForFunction(() => location.hash === '#book')
    await page.waitForFunction(() => window.heroTestBeacons.some((event) => event.eventName === 'qualified_discovery_call_click'))
    assert.ok(beacons.slice(before).some((event) => event.eventName === 'qualified_discovery_call_click' && event.variant === exposure.variant))
    const exposuresBefore = beacons.filter((event) => event.eventName === 'experiment_exposure').length
    await page.goto(base, { waitUntil: 'networkidle2' })
    assert.equal(await page.$eval('main h1', (element) => element.textContent), heading, 'Visitor keeps assignment')
    assert.equal(await page.$eval('[data-experiment-section="hero"]', (element) => element.dataset.heroVariant), variant, 'Visitor keeps the same hero variant')
    assert.equal(beacons.filter((event) => event.eventName === 'experiment_exposure').length, exposuresBefore, 'Reload does not double count exposure')
  }
  assert.deepEqual([...assignedVariants].sort(), ['control', 'runway'], 'Real-assignment checks cover both variants')
  analytics = 'PASS'
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(`${base}/?home-hero-runway-variant=runway`, { waitUntil: 'networkidle2' })
  assert.equal(await page.$eval('.eid-runway-belt', (element) => getComputedStyle(element).animationName), 'none')
  reducedMotion = 'PASS'
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`)
  for (const report of reports) {
    console.log(`${report.width}px ${report.variant}: ${report.checks.filter((check) => check.result === 'PASS').length}/${report.checks.length} metrics PASS`)
    for (const check of report.checks.filter((check) => check.result === 'FAIL')) console.log(check)
  }
  assert.equal(reports.length, 6, 'Checked three viewport widths for both hero variants')
  assert.ok(reports.every((report) => report.checks.length > 0 && report.checks.every((check) => check.result === 'PASS')), 'All content checks and measured dimensions must pass (dimensions within 3px)')
  console.log('PASS: SSR, sticky assignment, exposure dedupe, CTA attribution, preview exclusion, reduced motion, no browser errors')
} catch (error) {
  failure = error instanceof Error ? error.message : String(error)
  throw error
} finally {
  fs.writeFileSync('.audit/home-hero-verification.json', JSON.stringify({ reports, analytics, reducedMotion, browserErrors: errors, failure }, null, 2))
  await browser.close()
}
