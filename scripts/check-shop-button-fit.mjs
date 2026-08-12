/**
 * Check that the storefront's buttons contain their own text.
 *
 * "Add to cart" carried a trailing "$30 · $6 shipping per order" that overflowed
 * its container on the live site. Page-level overflow checks miss this: the
 * document does not scroll sideways, one grid cell just spills past its box, so
 * the page looks fine to every check we had and wrong to a person.
 *
 * Measures each control's content width against its box at the widths where the
 * card grid changes shape.
 *
 *   node scripts/check-shop-button-fit.mjs --base http://localhost:3000
 */
import puppeteer from 'puppeteer'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const BASE = arg('base', 'http://localhost:3000').replace(/\/+$/, '')
const PATH = '/vision/health-visualizations'
const WIDTHS = [390, 414, 768, 1024, 1280, 1440]
// Sub-pixel rounding makes an exactly-fitting element report a fraction over.
const SLACK = 1.5

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const failures = []

for (const width of WIDTHS) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768 })
  await page.goto(`${BASE}${PATH}`, { waitUntil: 'networkidle2', timeout: 120_000 })
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
  })
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const overflowing = await page.evaluate((slack) => {
    const problems = []
    const controls = [...document.querySelectorAll('button, a')].filter(
      (element) => element.offsetParent !== null && element.innerText.trim(),
    )

    for (const control of controls) {
      const box = control.getBoundingClientRect()
      if (box.width < 40) continue

      // An `overflow: hidden` element crops on purpose — the poster tiles are
      // clickable links whose image is deliberately wider than its 4:3 frame.
      // Measuring those as overflow reports the design as a bug.
      const style = getComputedStyle(control)
      if (/hidden|clip|scroll|auto/.test(style.overflowX)) continue

      // The element's own box vs what it needs to lay out its children.
      if (control.scrollWidth - control.clientWidth > slack) {
        problems.push({
          text: control.innerText.trim().replace(/\s+/g, ' ').slice(0, 46),
          box: Math.round(box.width),
          needs: control.scrollWidth,
          kind: 'text overflows its button',
        })
        continue
      }

      // A child spilling past the parent's edges: the grid cell case, where the
      // button itself never reports a scroll overflow.
      for (const child of control.children) {
        const childBox = child.getBoundingClientRect()
        if (childBox.width === 0) continue
        if (childBox.right - box.right > slack || box.left - childBox.left > slack) {
          problems.push({
            text: control.innerText.trim().replace(/\s+/g, ' ').slice(0, 46),
            box: Math.round(box.width),
            needs: Math.round(childBox.right - box.left),
            kind: 'child spills past the button edge',
          })
          break
        }
      }
    }
    return problems
  }, SLACK)

  for (const problem of overflowing) {
    failures.push(
      `${width}px: "${problem.text}" — ${problem.kind} (box ${problem.box}px, needs ${problem.needs}px)`,
    )
  }
  console.log(`  ${width}px: ${overflowing.length} overflowing controls`)
}

await browser.close()

console.log('')
if (failures.length === 0) {
  console.log('Every storefront button contains its own text at all widths.')
} else {
  for (const failure of failures) console.log(`  FAIL  ${failure}`)
  console.log(`\n${failures.length} problems.`)
  process.exitCode = 1
}
