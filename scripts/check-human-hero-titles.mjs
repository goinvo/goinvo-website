// Page hero titles under the human design (?design=human).
// Rule: a title's own line breaks keep its words apart, and only a span marked
// data-hero-lead is set as the lead. A rule that hid every <br> and restyled every
// span ran About's words together ("purpose:better") and dropped "design." into a
// small sans line.
// Usage: node scripts/check-human-hero-titles.mjs [base]   (default http://127.0.0.1:3000)
import puppeteer from 'puppeteer'

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const failures = []
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label) }

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

async function title(path) {
  await page.goto(`${base}${path}${path.includes('?') ? '&' : '?'}design=human`, { waitUntil: 'networkidle2', timeout: 120000 })
  await page.waitForSelector('[data-hero-text] h1', { timeout: 30000 })
  return page.evaluate(() => {
    const h1 = document.querySelector('[data-hero-text] h1'), size = el => parseFloat(getComputedStyle(el).fontSize)
    const lead = h1.querySelector('[data-hero-lead]')
    return {
      design: document.documentElement.dataset.design,
      words: h1.innerText.replace(/\s+/g, ' ').trim(),
      h1Size: size(h1),
      spans: [...h1.querySelectorAll(':scope > span:not([data-hero-lead])')].map(span => ({ text: span.innerText.trim(), size: size(span), display: getComputedStyle(span).display })),
      lead: lead && { size: size(lead), display: getComputedStyle(lead).display, sans: !/serif/i.test(getComputedStyle(lead).fontFamily.split(',')[0]) || /sans/i.test(getComputedStyle(lead).fontFamily.split(',')[0]) },
    }
  })
}

const about = await title('/about')
check(about.design === 'human', `the human design is on (${about.design})`)
check(about.words === 'Our shared purpose: better systems + better lives thru design.', `About's title keeps its words apart: "${about.words}"`)
check(about.spans.every(span => span.size === about.h1Size && span.display !== 'block'), `About's "design." stays in the title's type ${JSON.stringify(about.spans)}`)

const work = await title('/work')
check(Boolean(work.lead) && work.lead.display === 'block' && work.lead.size < work.h1Size && work.lead.sans, `Work's lead is still set as the lead ${JSON.stringify(work.lead)}`)

await browser.close()
console.log(failures.length ? `${failures.length} failed` : 'all passed')
process.exit(failures.length ? 1 : 0)
