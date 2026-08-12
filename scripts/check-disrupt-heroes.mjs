/**
 * Prove the Disrupt heroes actually paint, on phones and on desktop.
 *
 * Every Disrupt part opens with a full-bleed hero. Below 800px no <video> is
 * substituted, so the hero is the fallback <img class="placeholder"> — and that
 * image was `visibility: hidden` in the ported CSS, a leftover from the 2018
 * site where the artwork came from `background-image` rules that were never
 * carried over. Result: a correctly-sized, correctly-loaded, completely
 * invisible hero. Twelve white voids.
 *
 * Checking `naturalWidth > 0` would have passed the whole time, so this samples
 * the rendered PIXELS: it screenshots the hero box and decodes it in-page on a
 * canvas, then fails if the region is essentially blank. It measures the six part
 * links over that same hero the same way.
 *
 *   node scripts/check-disrupt-heroes.mjs --base http://localhost:3000
 */
import puppeteer from 'puppeteer'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const BASE = arg('base', 'http://localhost:3000').replace(/\/+$/, '')
const PARTS = ['/vision/disrupt', ...[2, 3, 4, 5, 6].map((n) => `/vision/disrupt/part-${n}`)]

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
]

// A hero that is painting artwork has plenty of non-background pixels. A white
// void has almost none; the threshold only has to separate those two worlds.
const MIN_INK_FRACTION = 0.1

// Antialiased text spans a wide luminance range across its own box; text
// painted in its own background spans none.
const MIN_TEXT_LUMINANCE_RANGE = 40


const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const failures = []

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  })
  await page.setUserAgent(
    viewport.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  )

  for (const path of PARTS) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 120_000 })
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const heroes = await page.evaluate(() => {
      return [...document.querySelectorAll('.video-container')].map((container) => {
        const rect = container.getBoundingClientRect()
        const media = container.querySelector('img, video')
        return {
          top: rect.top + window.scrollY,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          kind: media ? media.tagName.toLowerCase() : 'none',
          hidden: media ? getComputedStyle(media).visibility === 'hidden' : true,
        }
      })
    })

    if (heroes.length === 0) {
      failures.push(`${viewport.name} ${path}: no hero container found at all`)
      continue
    }

    for (const [index, hero] of heroes.entries()) {
      if (hero.width < 2 || hero.height < 2) {
        failures.push(`${viewport.name} ${path} hero ${index + 1}: collapsed to ${hero.width}x${hero.height}`)
        continue
      }

      // Scroll the hero into view; the fade-on-scroll handler sets opacity from
      // the hero's distance to the viewport, so an off-screen capture is not
      // evidence either way.
      await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - 40)), hero.top)
      await new Promise((resolve) => setTimeout(resolve, 700))

      const box = await page.evaluate((i) => {
        const container = document.querySelectorAll('.video-container')[i]
        const rect = container.getBoundingClientRect()
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }, index)

      const clip = {
        x: Math.max(0, Math.round(box.x)),
        y: Math.max(0, Math.round(box.y)),
        width: Math.min(Math.round(box.width), viewport.width),
        height: Math.min(Math.round(box.height), viewport.height - Math.max(0, Math.round(box.y))),
      }
      if (clip.width < 2 || clip.height < 2) continue

      const shot = await page.screenshot({ clip, encoding: 'base64' })

      // Decode in the page: no image library needed, and it reads exactly the
      // pixels the browser painted.
      const ink = await page.evaluate(async (dataUrl) => {
        const image = new Image()
        await new Promise((resolve, reject) => {
          image.onload = resolve
          image.onerror = reject
          image.src = `data:image/png;base64,${dataUrl}`
        })
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let inked = 0
        let total = 0
        for (let i = 0; i < data.length; i += 4) {
          total += 1
          // "Not near-white" is the test: a void is the page background.
          if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) inked += 1
        }
        return inked / Math.max(total, 1)
      }, shot)

      if (ink < MIN_INK_FRACTION) {
        failures.push(
          `${viewport.name} ${path} hero ${index + 1}: renders blank ` +
            `(${(ink * 100).toFixed(1)}% non-white, media=<${hero.kind}>, visibility-hidden=${hero.hidden})`,
        )
      }
    }

    // The six part links, measured from PIXELS rather than from the cascade.
    //
    // These sit in the sticky teal bar over the hero, which is the one place a
    // white-on-white regression would hide. Deriving contrast by walking the DOM
    // for an ancestor background is not good enough — tried it, and it called
    // 107 plainly-readable links broken, because the painted backdrop is
    // frequently not the nearest ancestor that declares a colour. Screenshotting
    // the whole page and cropping is not good enough either: a full-page capture
    // reflows and relocates sticky chrome, so the crop lands on the wrong
    // pixels. What is reliable is what worked for the heroes — scroll it into
    // view, clip in viewport coordinates, read the pixels back.
    await page.evaluate(() => window.scrollTo(0, 0))
    await new Promise((resolve) => setTimeout(resolve, 600))

    // On a phone the six links live behind the chevron, exactly as they did on
    // the 2018 site. Measuring them collapsed reads the bare teal bar and calls
    // legible links invisible, so open the menu the way a visitor would first.
    await page.evaluate(() => {
      const list = document.querySelector('#article-nav ol')
      if (list && !list.classList.contains('open')) {
        document.querySelector('#article-nav .mobile-menu')?.click()
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 900))

    const navLinks = await page.evaluate(() => {
      const nav = document.querySelector('#article-nav')
      if (!nav) return []
      return [...nav.querySelectorAll('a')]
        .filter((a) => a.offsetParent !== null && a.innerText.trim())
        .map((a) => {
          const rect = a.getBoundingClientRect()
          return {
            text: a.innerText.trim().slice(0, 32),
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          }
        })
    })

    if (navLinks.length === 0) {
      failures.push(`${viewport.name} ${path}: part navigation rendered no links`)
    }

    for (const link of navLinks) {
      const clip = {
        x: Math.max(0, Math.round(link.x)),
        y: Math.max(0, Math.round(link.y)),
        width: Math.round(link.width),
        height: Math.round(link.height),
      }
      if (clip.width < 4 || clip.height < 4) continue
      if (clip.x + clip.width > viewport.width || clip.y + clip.height > viewport.height) continue

      const shot = await page.screenshot({ clip, encoding: 'base64' })
      const range = await page.evaluate(async (dataUrl) => {
        const image = new Image()
        await new Promise((resolve, reject) => {
          image.onload = resolve
          image.onerror = reject
          image.src = `data:image/png;base64,${dataUrl}`
        })
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let min = 255
        let max = 0
        for (let i = 0; i < data.length; i += 4) {
          const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
          if (luma < min) min = luma
          if (luma > max) max = luma
        }
        return max - min
      }, shot)

      // Legible text swings far more than this across its own box; text painted
      // in its own background does not swing at all.
      if (range < MIN_TEXT_LUMINANCE_RANGE) {
        failures.push(
          `${viewport.name} ${path}: part link "${link.text}" is invisible (luminance range ${Math.round(range)})`,
        )
      }
    }

    process.stdout.write(`  ${viewport.name} ${path}: ${heroes.length} heroes checked\n`)
  }

  await page.close()
}

await browser.close()

console.log('')
if (failures.length === 0) {
  console.log('All Disrupt heroes paint and all part links are legible.')
} else {
  for (const failure of failures) console.log(`  FAIL  ${failure}`)
  console.log(`\n${failures.length} problems.`)
  process.exitCode = 1
}
