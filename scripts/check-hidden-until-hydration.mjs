#!/usr/bin/env node
/**
 * Finds first-screen content that waits for JavaScript: text or images the server HTML
 * ships invisible (opacity 0 until an animation library hydrates), and content that jumps
 * when hydration inserts something above it (a hero added by an effect).
 *
 * Each route is rendered twice at a phone viewport, once with JavaScript off (what the
 * server HTML paints before hydration) and once with it on, then compared:
 *   - hidden:  an element in the first screen is visible with JS but not without it
 *   - jump:    the page's first heading sits more than 16px lower once JS has run
 *   - shift:   the JS render's layout shifts (PerformanceObserver) add up past 0.1. This
 *              catches a box that moves while its text does not: a stand-in held inside
 *              <main> kept the text still but let <main> itself move 270px (CLS 0.23).
 *
 * Both cost the Lighthouse score (LCP render delay, CLS) and are real for any visitor on a
 * slow phone. Found 2026-09-28: the /work hero shipped as style="opacity:0", case-study
 * text shipped inside Reveal at opacity 0, and case-study heroes were inserted after
 * hydration (a 0.33 layout shift).
 *
 * Usage: node scripts/check-hidden-until-hydration.mjs [--base https://www.goinvo.com] [route ...]
 * Exits 1 when any route has a finding.
 */
import puppeteer from 'puppeteer'

const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
const base = (baseIndex >= 0 ? args.splice(baseIndex, 2)[1] : 'https://www.goinvo.com').replace(/\/$/, '')
const routes = args.length
  ? args
  : ['/', '/work', '/about', '/vision', '/work/mitre-flux-notes', '/vision/determinants-of-health']

const VIEWPORT = { width: 412, height: 823, deviceScaleFactor: 1, isMobile: true }
const JUMP_PX = 16
const MAX_CLS = 0.1

async function snapshot(browser, url, js) {
  const page = await browser.newPage()
  await page.setJavaScriptEnabled(js)
  await page.setViewport(VIEWPORT)
  if (js) {
    // A mid-range phone on slow 4G, as Lighthouse emulates. Unthrottled, hydration usually
    // lands before the first paint, so a late-inserted hero never registers as a shift.
    const cdp = await page.createCDPSession()
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    })
    await page.evaluateOnNewDocument(() => {
      window.__layoutShifts = []
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue
          window.__layoutShifts.push({
            value: entry.value,
            nodes: (entry.sources || []).map((source) => source.node && (source.node.id ? `#${source.node.id}` : source.node.nodeName)).filter(Boolean),
          })
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
  }
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 })
  // Let entry animations finish so "visible with JS" means settled, not mid-fade.
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const result = await page.evaluate((viewportHeight) => {
    const effectiveOpacity = (element) => {
      let opacity = 1
      for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') return 0
        opacity *= Number(style.opacity)
      }
      return opacity
    }
    const describe = (element) => {
      const id = element.id ? `#${element.id}` : ''
      const cls = typeof element.className === 'string' && element.className
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : ''
      const text = (element.getAttribute('aria-label') || element.textContent || element.getAttribute('src') || '')
        .trim().replace(/\s+/g, ' ').slice(0, 60)
      return `${element.tagName.toLowerCase()}${id}${cls} "${text}"`
    }
    // Leaf-ish content: images and elements that hold their own text.
    const candidates = [...document.querySelectorAll('body *')].filter((element) => {
      if (element.closest('header, script, style, noscript, template')) return false
      if (element.tagName === 'IMG') return true
      return [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim().length > 2)
    })
    const items = {}
    for (const element of candidates) {
      const rect = element.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4 || rect.top >= viewportHeight || rect.bottom <= 0) continue
      items[describe(element)] = effectiveOpacity(element)
    }
    const heading = document.querySelector('main h1, h1')
    const shifts = window.__layoutShifts || []
    return {
      items,
      headingTop: heading ? Math.round(heading.getBoundingClientRect().top + scrollY) : null,
      cls: shifts.reduce((sum, shift) => sum + shift.value, 0),
      shiftNodes: [...new Set(shifts.flatMap((shift) => shift.nodes))],
    }
  }, VIEWPORT.height)
  await page.close()
  return result
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
let findings = 0
for (const route of routes) {
  const url = base + route
  const off = await snapshot(browser, url, false)
  const on = await snapshot(browser, url, true)
  const hidden = Object.entries(on.items)
    .filter(([key, opacity]) => opacity > 0.5 && key in off.items && off.items[key] < 0.05)
    .map(([key]) => key)
  const jump = off.headingTop != null && on.headingTop != null ? on.headingTop - off.headingTop : 0
  const problems = []
  if (hidden.length) problems.push(`${hidden.length} first-screen element(s) invisible until JS: ${hidden.slice(0, 4).join('; ')}`)
  if (Math.abs(jump) > JUMP_PX) problems.push(`first heading moves ${jump}px once JS runs (${off.headingTop} -> ${on.headingTop})`)
  if (on.cls > MAX_CLS) problems.push(`layout shift ${on.cls.toFixed(3)} during load (moved: ${on.shiftNodes.join(', ') || 'unattributed'})`)
  // Content present only with JS (e.g. a hero inserted by an effect) shows up as the jump above.
  if (problems.length) {
    findings += problems.length
    console.log(`FAIL ${route}\n  - ${problems.join('\n  - ')}`)
  } else {
    console.log(`PASS ${route} (${Object.keys(on.items).length} first-screen elements checked, heading ${on.headingTop ?? 'none'}, CLS ${on.cls.toFixed(3)})`)
  }
}
await browser.close()
console.log(findings ? `\n${findings} finding(s) on ${base}` : `\nNo findings on ${base}`)
process.exit(findings ? 1 : 0)
