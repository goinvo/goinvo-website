/**
 * Find list items that paint two markers, or none at all.
 *
 * Both failures shipped to production and neither is visible to a DOM or link
 * check: /vision/determinants-of-health drew the star twice (a page stylesheet
 * kept Gatsby's `list-style-image` while globals.css draws the same star with
 * `.ul li::before`, and `list-style-type: none` does not suppress an image
 * marker), while /vision/coronavirus drew nothing at all (Tailwind's preflight
 * strips `list-style` and the ported rule assumed the browser default).
 *
 *   node scripts/check-list-markers.mjs --base https://www.goinvo.com
 */
import puppeteer from 'puppeteer'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}
const BASE = arg('base', 'http://localhost:3000').replace(/\/+$/, '')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': UA } })).text()
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
if (routes.length === 0) throw new Error('sitemap.xml listed no URLs')

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setUserAgent(UA)
await page.setViewport({ width: 1280, height: 900 })

const problems = []
let checked = 0

for (const route of routes) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await new Promise((resolve) => setTimeout(resolve, 800))

    const found = await page.evaluate(() => {
      const out = []
      for (const item of document.querySelectorAll('li')) {
        if (!item.innerText.trim()) continue
        const box = item.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) continue

        const style = getComputedStyle(item)
        if (style.display !== 'list-item') continue

        const before = getComputedStyle(item, '::before')
        // A native marker: either a type (disc/decimal/...) or an image.
        const nativeMarker =
          style.listStyleType !== 'none' || style.listStyleImage !== 'none'
        // A drawn marker: a ::before that paints something.
        const drawnMarker =
          before.content !== 'none' &&
          (before.backgroundImage !== 'none' || (before.content !== '""' && before.content !== 'none'))

        // Plenty of lists are deliberately unmarked: menus, card grids, link
        // rails. Naming classes is not enough (the mobile menu is `space-y-3`),
        // so judge by role and by content — a list whose every item is just a
        // link is navigation, not prose.
        const inChrome = item.closest('nav, header, footer, [role="navigation"], [role="menu"], [role="tablist"]')
        const items = list ? [...list.children].filter((c) => c.tagName === 'LI') : []
        const allLinks =
          items.length > 0 &&
          items.every((c) => {
            const text = c.innerText.trim()
            const link = c.querySelector('a')
            return link && link.innerText.trim() === text
          })
        const laidOut = list && /flex|grid/.test(getComputedStyle(list).display)
        const list = item.parentElement

        // Distinguish a DELIBERATE reset from an accidental one. Tailwind's
        // preflight strips list-style from every ul/ol via a bare element
        // selector; a designer opting a list out writes a rule that names the
        // list. Both compute to `none`, so only the authoring source separates
        // them — and getting this wrong reports the design as a bug (verified:
        // .divisions ul and the office-hours topic list are both `list-style:
        // none` in the 2018 stylesheets too).
        const deliberatelyUnmarked = (() => {
          const scan = (rules) => {
            for (const rule of rules) {
              if (rule.cssRules) {
                if (scan(rule.cssRules)) return true
                continue
              }
              if (!rule.selectorText || !/list-style/.test(rule.style?.cssText || '')) continue
              // A bare element selector is the framework reset, not a decision.
              if (/^\s*(\*|html|body|ul|ol|li)(\s*,\s*(\*|html|body|ul|ol|li))*\s*$/i.test(rule.selectorText)) continue
              try {
                if (rule.selectorText.split(',').some((s) => list && list.matches(s.trim()))) return true
              } catch {}
            }
            return false
          }
          for (const sheet of document.styleSheets) {
            try {
              if (scan(sheet.cssRules)) return true
            } catch {}
          }
          return false
        })()

        const decorative =
          deliberatelyUnmarked ||
          !!inChrome ||
          allLinks ||
          laidOut ||
          /flex|grid|nav|menu|list-none|unstyled|tab|pagination|social|breadcrumb|carousel|slider|rslides/i.test(
            (list?.className || '') + ' ' + item.className,
          )

        if (nativeMarker && drawnMarker) {
          out.push({
            kind: 'two markers',
            list: item.parentElement?.className || '(none)',
            text: item.innerText.trim().slice(0, 44).replace(/\s+/g, ' '),
          })
        } else if (!nativeMarker && !drawnMarker && !decorative) {
          out.push({
            kind: 'no marker',
            list: item.parentElement?.className || '(none)',
            text: item.innerText.trim().slice(0, 44).replace(/\s+/g, ' '),
          })
        }
      }
      // One entry per distinct list, not per item.
      const seen = new Set()
      return out.filter((o) => {
        const key = o.kind + o.list
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    })

    if (found.length) problems.push({ route, found })
  } catch {
    // Route availability is covered by check-site-pages.mjs.
  }
  checked += 1
  process.stdout.write(`  ${checked}/${routes.length}\r`)
}

await browser.close()

console.log('\n')
for (const problem of problems) {
  console.log(`  ${problem.route}`)
  for (const item of problem.found) {
    console.log(`      ${item.kind}  list="${item.list}"  "${item.text}"`)
  }
}
console.log(`${routes.length - problems.length}/${routes.length} routes have correctly marked lists.`)
if (problems.length > 0) process.exitCode = 1
