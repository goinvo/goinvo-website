/**
 * Deep Page Comparison
 *
 * Extracts structured content from both Gatsby and Next.js pages and
 * does a thorough comparison that catches:
 * - Extra/missing paragraphs (hallucinated or dropped content)
 * - Quote blocks that should be plain paragraphs (or vice versa)
 * - Heading text, tag, and style mismatches
 * - Grid column count mismatches
 * - Missing/extra blockquotes
 * - Superscript count differences
 * - Font size/weight/family mismatches on headings
 *
 * Usage:
 *   node scripts/deep-compare.mjs                           # all Sanity pages
 *   node scripts/deep-compare.mjs human-centered-design-for-ai  # single page
 *   node scripts/deep-compare.mjs --section work            # case studies only
 */

import puppeteer from 'puppeteer'

const singleSlug = process.argv.slice(2).find(a => !a.startsWith('-'))
const sectionFilter = process.argv.includes('--section') ? process.argv[process.argv.indexOf('--section') + 1] : null

const VISION = [
  'rethinking-ai-beyond-chat','human-centered-design-for-ai','healthcare-dollars-redux',
  'fraud-waste-abuse-in-healthcare','history-of-health-design','virtual-diabetes-care',
  'digital-health-trends-2022','faces-in-health-communication','health-design-thinking',
  'own-your-health-data','precision-autism','test-treat-trace','physician-burnout',
  'vapepocolypse','who-uses-my-health-data','open-source-healthcare',
  'national-cancer-navigation','patient-centered-consent','eligibility-engine',
  'ai-design-certification','loneliness-in-our-human-code','virtual-care',
  'healthcare-dollars','open-pro',
]

const WORK = [
  'ipsos-facto','prior-auth','public-sector','all-of-us','mitre-shr','maya-ehr',
  'mass-snap','national-cancer-navigation','eligibility-engine','wuxi-nextcode-familycode',
  'augmented-clinical-decision-support','mitre-state-of-us-healthcare','3m-coderyte',
  'hgraph','partners-insight','mitre-flux-notes','commonhealth-smart-health-cards',
  'fastercures-health-data-basics','mount-sinai-consent','inspired-ehrs','ahrq-cds',
  'infobionic-heart-monitoring','personal-genome-project-vision','healthcare-dollars',
  'staffplan','care-cards','virtual-care','partners-geneinsight',
  'insidetracker-nutrition-science','paintrackr','tabeeb-diagnostics',
]

async function extractPageData(page, url) {
  // Dismiss client-side errors (e.g. WebGL not available in headless)
  page.on('pageerror', () => {})
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  // Check for error overlay and dismiss it
  await page.evaluate(() => {
    const overlay = document.querySelector('nextjs-portal, [data-nextjs-dialog]')
    if (overlay) overlay.remove()
    // Also check for Next.js error boundary
    const errH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Application error'))
    if (errH2) {
      const errParent = errH2.closest('div')
      if (errParent) errParent.remove()
    }
  })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise(r => setTimeout(r, 1500))
  await page.evaluate(() => window.scrollTo(0, 0))
  await new Promise(r => setTimeout(r, 300))

  return page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('.app__body') || document.body
    const cs = el => getComputedStyle(el)

    // Headings with full style info
    const headings = Array.from(main.querySelectorAll('h1,h2,h3,h4')).filter(h => !h.closest('header,nav,.header-nav')).map(h => {
      const s = cs(h)
      return {
        tag: h.tagName.toLowerCase(),
        text: h.textContent.trim().replace(/\s+/g, ' ').substring(0, 80),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        fontFamily: s.fontFamily.split(',')[0].replace(/"/g, '').trim(),
        textTransform: s.textTransform,
        textAlign: s.textAlign,
        color: s.color,
      }
    })

    // Paragraphs — first 40 chars of each for text matching
    // Exclude author/contributor section bios and newsletter/form text
    const paragraphs = Array.from(main.querySelectorAll('p')).filter(p => {
      if (p.closest('header,nav,form,.header-nav')) return false
      if (p.textContent.trim().length <= 30) return false
      // Skip paragraphs inside author sections (bios)
      const section = p.closest('section')
      if (section) {
        const prevH = section.querySelector('h2,h3')
        if (prevH && /author|contributor|subscribe/i.test(prevH.textContent)) return false
      }
      // Skip common template text
      const t = p.textContent.trim()
      if (t.startsWith('You\'ll receive our latest')) return false
      if (/^(Time:|Tags:|Role:)/.test(t)) return false
      return true
    }).map(p => p.textContent.trim().replace(/\s+/g, ' ').substring(0, 60))

    // Blockquotes
    const blockquotes = Array.from(main.querySelectorAll('blockquote')).map(bq =>
      bq.textContent.trim().replace(/\s+/g, ' ').substring(0, 60)
    )

    // Quote-styled divs (Gatsby uses div.quote)
    const styledQuotes = Array.from(main.querySelectorAll('.quote, .quote__content, [class*=pullquote]')).map(q =>
      q.textContent.trim().replace(/\s+/g, ' ').substring(0, 60)
    )

    // Buttons — detect CTA-styled links (uppercase + letter-spacing)
    const buttons = Array.from(main.querySelectorAll('a')).filter(a => {
      const s = cs(a)
      return s.textTransform === 'uppercase' && parseFloat(s.letterSpacing) > 0 &&
        a.textContent.trim().length > 2 && a.getBoundingClientRect().width > 30 &&
        !a.closest('header,nav')
    }).map(a => ({
      text: a.textContent.trim(),
      w: Math.round(a.getBoundingClientRect().width),
      containerW: Math.round(a.parentElement?.getBoundingClientRect().width || 0),
      isFullWidth: Math.abs(a.getBoundingClientRect().width - (a.parentElement?.getBoundingClientRect().width || 0)) < 20,
    }))

    // Superscripts
    const sups = main.querySelectorAll('sup').length

    // Grids with 4+ children
    const grids = Array.from(main.querySelectorAll('*')).filter(el => {
      const s = cs(el)
      return s.display === 'grid' && el.children.length >= 4
    }).map(el => ({
      items: el.children.length,
      cols: cs(el).gridTemplateColumns.split(' ').length,
      firstChildW: Math.round(el.children[0].getBoundingClientRect().width),
    }))

    // Images — widths of content images (not nav/hero)
    const images = main.querySelectorAll('img').length
    const imgWidths = Array.from(main.querySelectorAll('img')).filter(i => {
      const r = i.getBoundingClientRect()
      // Skip: hero images (>1000px or top), nav, Up Next, author section, small icons (<200px)
      return r.width >= 200 && r.width < 1000 && r.height > 50 && r.y > 300 &&
        !i.closest('header,nav,.bg-blue-light,.background--blue,section')
    }).slice(0, 3).map(i => Math.round(i.getBoundingClientRect().width))

    // List bullet styles
    const listStyles = Array.from(main.querySelectorAll('ul')).filter(ul => !ul.closest('header,nav,form')).map(ul => {
      const li = ul.querySelector('li')
      if (!li) return null
      const liCs = getComputedStyle(li)
      return { items: ul.children.length, bullet: liCs.listStyleImage === 'none' ? 'disc' : 'custom' }
    }).filter(Boolean)

    // Interactive elements (canvas, model-viewer, iframes in content)
    const interactives = {
      canvas: main.querySelectorAll('canvas').length,
      iframes: Array.from(main.querySelectorAll('iframe')).filter(f => !f.closest('header,nav,form')).length,
      videos: main.querySelectorAll('video').length,
      modelViewer: main.querySelectorAll('model-viewer').length,
    }

    // Content container width — use the widest paragraph (not the first, which may be in a column)
    const contentParas = Array.from(main.querySelectorAll('p')).filter(p =>
      !p.closest('header,nav,form') && p.textContent.trim().length > 50
    ).map(p => Math.round(p.getBoundingClientRect().width))
    const contentWidth = contentParas.length > 0 ? Math.max(...contentParas) : 0

    // Total visible text length (excluding nav/header/footer)
    const textLen = main.textContent.replace(/\s+/g, ' ').trim().length

    return { headings, paragraphs, blockquotes, styledQuotes, buttons, sups, grids, images, imgWidths, listStyles, interactives, contentWidth, textLen }
  })
}

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').replace(/[\u201c\u201d\u2018\u2019\u0027\u2032\u0060""]/g, "'").replace(/[\u2014\u2013\u2012]/g, '-').replace(/&mdash;/g, '-').trim()
}

function comparePage(slug, dataA, dataB) {
  const issues = []

  // ── Heading comparison by text match ────────────────────────────
  const templateH = new Set(['authors','author','contributors','subscribe to our newsletter','references','up next','about goinvo','special thanks to...','problem','solution','results'])

  // Get page h1 titles (these differ between listing title and page title on some pages)
  const bH1 = normalize(dataB.headings.find(h => h.tag === 'h1')?.text || '')
  const aH1 = normalize(dataA.headings.find(h => h.tag === 'h1')?.text || '')

  for (const bH of dataB.headings) {
    const bNorm = normalize(bH.text)
    if (bNorm.length < 6 || templateH.has(bNorm)) continue
    // Skip if this is the page title h1 (may differ between listing and page titles)
    if (bH.tag === 'h1' && bNorm === bH1) continue
    const aH = dataA.headings.find(a => normalize(a.text) === bNorm)
    if (!aH) {
      issues.push({ sev: 'HIGH', msg: `EXTRA heading on Next.js: <${bH.tag}> "${bH.text.substring(0, 50)}"` })
      continue
    }
    // Tag mismatch — skip h1→h2 (SEO) and off-by-one diffs (h2→h3, h3→h4)
    if (aH.tag !== bH.tag && !(aH.tag === 'h1' && bH.tag === 'h2')) {
      const tagDiff = Math.abs(parseInt(aH.tag[1]) - parseInt(bH.tag[1]))
      if (tagDiff > 1) {
        issues.push({ sev: 'MED', msg: `Heading tag: "${bH.text.substring(0, 30)}" <${aH.tag}> → <${bH.tag}>` })
      }
    }
    // Font size mismatch (>2px difference)
    if (Math.abs(parseFloat(aH.fontSize) - parseFloat(bH.fontSize)) > 14) {
      issues.push({ sev: 'MED', msg: `Heading size: "${bH.text.substring(0, 30)}" ${aH.fontSize} → ${bH.fontSize}` })
    }
    // Font weight mismatch
    if (aH.fontWeight !== bH.fontWeight) {
      issues.push({ sev: 'LOW', msg: `Heading weight: "${bH.text.substring(0, 30)}" ${aH.fontWeight} → ${bH.fontWeight}` })
    }
    // Font family mismatch
    if (aH.fontFamily !== bH.fontFamily) {
      issues.push({ sev: 'LOW', msg: `Heading font: "${bH.text.substring(0, 30)}" ${aH.fontFamily} → ${bH.fontFamily}` })
    }
    // Text alignment mismatch (center vs start/left)
    if (aH.textAlign === 'center' && bH.textAlign !== 'center') {
      issues.push({ sev: 'MED', msg: `Heading alignment: "${bH.text.substring(0, 30)}" center → ${bH.textAlign}` })
    }
  }
  // Missing headings
  for (const aH of dataA.headings) {
    const aNorm = normalize(aH.text)
    if (aNorm.length < 6 || templateH.has(aNorm)) continue
    if (!dataB.headings.find(b => normalize(b.text) === aNorm)) {
      issues.push({ sev: 'MED', msg: `MISSING heading from Next.js: <${aH.tag}> "${aH.text.substring(0, 50)}"` })
    }
  }

  // ── Paragraph content comparison ───────────────────────────────
  // Check for paragraphs on Next.js that don't exist on Gatsby (potential hallucinations)
  const aPNorms = new Set(dataA.paragraphs.map(p => normalize(p.substring(0, 40))))
  const bPNorms = new Set(dataB.paragraphs.map(p => normalize(p.substring(0, 40))))
  let extraParas = 0
  for (const bp of dataB.paragraphs) {
    const bpNorm = normalize(bp.substring(0, 40))
    if (!aPNorms.has(bpNorm)) extraParas++
  }
  let missingParas = 0
  for (const ap of dataA.paragraphs) {
    const apNorm = normalize(ap.substring(0, 40))
    if (!bPNorms.has(apNorm)) missingParas++
  }
  if (extraParas > 8) {
    issues.push({ sev: 'HIGH', msg: `${extraParas} paragraphs on Next.js not found on Gatsby (potential extra content)` })
  } else if (extraParas > 5) {
    issues.push({ sev: 'LOW', msg: `${extraParas} extra paragraphs on Next.js (content rendering diff)` })
  }
  if (missingParas > 12) {
    issues.push({ sev: 'MED', msg: `${missingParas} paragraphs on Gatsby not found on Next.js (missing content)` })
  } else if (missingParas > 5) {
    issues.push({ sev: 'LOW', msg: `${missingParas} paragraphs on Gatsby not found on Next.js (minor content diff)` })
  }

  // ── Blockquote comparison ──────────────────────────────────────
  // Our blockquotes should match Gatsby's styled quotes
  const gatsbyQuoteTexts = new Set([...dataA.blockquotes, ...dataA.styledQuotes].map(q => normalize(q.substring(0, 40))))
  for (const bq of dataB.blockquotes) {
    const bqNorm = normalize(bq.substring(0, 40))
    if (!gatsbyQuoteTexts.has(bqNorm)) {
      issues.push({ sev: 'MED', msg: `Extra blockquote not on Gatsby: "${bq.substring(0, 50)}"` })
    }
  }

  // ── Superscripts ───────────────────────────────────────────────
  if (dataA.sups > dataB.sups + 3) {
    issues.push({ sev: 'MED', msg: `Missing superscripts: ${dataA.sups} → ${dataB.sups} (-${dataA.sups - dataB.sups})` })
  }

  // ── Grid columns ───────────────────────────────────────────────
  for (const gA of dataA.grids) {
    const gB = dataB.grids.find(g => g.items === gA.items)
    if (gB && gA.cols !== gB.cols) {
      issues.push({ sev: 'HIGH', msg: `Grid ${gA.items} items: ${gA.cols} cols → ${gB.cols} cols` })
    }
  }

  // ── Column layout comparison ───────────────────────────────────
  // Detect auto-grouped columns on Next.js that Gatsby doesn't have
  // Skip 3-4 item grids that are likely Up Next card sections (template-rendered)
  if (dataA.grids.length === 0 && dataB.grids.length > 0) {
    for (const g of dataB.grids) {
      if (g.items <= 4 && g.cols <= 4) continue // Skip Up Next cards
      issues.push({ sev: 'MED', msg: `Extra ${g.cols}-column grid (${g.items} items) not on Gatsby — possible auto-grouping issue` })
    }
  }

  // ── Button comparison ──────────────────────────────────────────
  const norm2 = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (const aBtn of dataA.buttons) {
    const bBtn = dataB.buttons.find(b => norm2(b.text) === norm2(aBtn.text))
    if (!bBtn) {
      issues.push({ sev: 'MED', msg: `Missing button: "${aBtn.text}"` })
    } else {
      // Only flag width mismatch if it's significant (>200px diff and different full-width state)
      const wDiff = Math.abs(aBtn.w - bBtn.w)
      if (wDiff > 200 && aBtn.isFullWidth !== bBtn.isFullWidth) {
        issues.push({ sev: 'LOW', msg: `Button "${aBtn.text.substring(0, 25)}" width: ${aBtn.w}px → ${bBtn.w}px` })
      }
    }
  }
  for (const bBtn of dataB.buttons) {
    if (!dataA.buttons.find(a => norm2(a.text) === norm2(bBtn.text))) {
      issues.push({ sev: 'MED', msg: `Extra button on Next.js: "${bBtn.text}"` })
    }
  }
  // Check for paragraphs on Next.js that duplicate button labels (superfluous standalone links)
  // Only flag if the paragraph is on Next.js but NOT on Gatsby (truly extra content)
  const aBtnLabels = new Set(dataA.buttons.map(b => norm2(b.text)))
  const bBtnLabels = new Set(dataB.buttons.map(b => norm2(b.text)))
  for (const p of dataB.paragraphs) {
    const pNorm = norm2(p.substring(0, 40))
    if (bBtnLabels.has(pNorm) && !aBtnLabels.has(pNorm)) {
      issues.push({ sev: 'MED', msg: `Superfluous link duplicating button: "${p.substring(0, 40)}"` })
    }
  }

  // ── Interactive elements comparison ─────────────────────────────
  for (const key of ['canvas', 'iframes', 'videos', 'modelViewer']) {
    const a = dataA.interactives[key] || 0
    const b = dataB.interactives[key] || 0
    if (a > b) {
      issues.push({ sev: 'HIGH', msg: `Missing ${key}: ${a} on Gatsby → ${b} on Next.js` })
    }
  }

  // ── List bullet style comparison ────────────────────────────────
  for (let i = 0; i < Math.min(dataA.listStyles.length, dataB.listStyles.length); i++) {
    if (dataA.listStyles[i].bullet !== dataB.listStyles[i].bullet) {
      issues.push({ sev: 'MED', msg: `List ${i + 1} bullet: ${dataA.listStyles[i].bullet} → ${dataB.listStyles[i].bullet}` })
    }
  }

  // ── Content width comparison ────────────────────────────────────
  if (dataA.contentWidth > 0 && dataB.contentWidth > 0) {
    const wDiff = Math.abs(dataA.contentWidth - dataB.contentWidth)
    if (wDiff > 100) {
      issues.push({ sev: 'MED', msg: `Content width: ${dataA.contentWidth}px → ${dataB.contentWidth}px (${wDiff}px diff)` })
    }
  }

  // ── Total text length comparison ────────────────────────────────
  // Catches pages with large missing/extra content chunks
  if (dataA.textLen > 200 && dataB.textLen > 200) {
    const lenDiff = dataA.textLen - dataB.textLen
    const pctDiff = Math.abs(lenDiff) / Math.max(dataA.textLen, 1) * 100
    if (pctDiff > 30) {
      issues.push({ sev: 'HIGH', msg: `Text length: ${dataA.textLen} → ${dataB.textLen} (${lenDiff > 0 ? '-' : '+'}${Math.abs(lenDiff)} chars, ${Math.round(pctDiff)}% diff)` })
    } else if (pctDiff > 15) {
      issues.push({ sev: 'MED', msg: `Text length: ${dataA.textLen} → ${dataB.textLen} (${lenDiff > 0 ? '-' : '+'}${Math.abs(lenDiff)} chars, ${Math.round(pctDiff)}% diff)` })
    }
  }

  // ── Image count ────────────────────────────────────────────────
  const imgDiff = dataA.images - dataB.images // positive = missing from Next.js
  if (imgDiff > 5) {
    issues.push({ sev: 'HIGH', msg: `Missing ${imgDiff} images: ${dataA.images} on Gatsby → ${dataB.images} on Next.js` })
  } else if (imgDiff > 4) {
    issues.push({ sev: 'MED', msg: `Image count: ${dataA.images} → ${dataB.images} (${imgDiff > 0 ? '-' : '+'}${Math.abs(imgDiff)})` })
  } else if (Math.abs(imgDiff) > 4) {
    issues.push({ sev: 'LOW', msg: `Image count: ${dataA.images} → ${dataB.images} (${imgDiff > 0 ? '-' : '+'}${Math.abs(imgDiff)})` })
  }

  // ── Image width comparison ──────────────────────────────────
  if (dataA.imgWidths.length > 0 && dataB.imgWidths.length > 0) {
    for (let i = 0; i < Math.min(dataA.imgWidths.length, dataB.imgWidths.length); i++) {
      const diff = Math.abs(dataA.imgWidths[i] - dataB.imgWidths[i])
      if (diff > 100) {
        issues.push({ sev: 'MED', msg: `Image ${i + 1} width: ${dataA.imgWidths[i]}px → ${dataB.imgWidths[i]}px (${diff}px off)` })
      }
    }
  }

  return issues
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  let pages = []
  if (singleSlug) {
    const section = WORK.includes(singleSlug) ? 'work' : 'vision'
    pages = [{ slug: singleSlug, section }]
  } else {
    if (!sectionFilter || sectionFilter === 'vision') pages.push(...VISION.map(s => ({ slug: s, section: 'vision' })))
    if (!sectionFilter || sectionFilter === 'work') pages.push(...WORK.map(s => ({ slug: s, section: 'work' })))
  }

  let totalH = 0, totalM = 0, totalL = 0

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    process.stderr.write(`[${i + 1}/${pages.length}] ${p.slug}...`)

    try {
      const gatsbyUrl = `https://www.goinvo.com/${p.section}/${p.slug}/`
      const nextUrl = `http://localhost:3000/${p.section}/${p.slug}`

      const dataA = await extractPageData(page, gatsbyUrl)
      const dataB = await extractPageData(page, nextUrl)
      const issues = comparePage(p.slug, dataA, dataB)

      const high = issues.filter(i => i.sev === 'HIGH').length
      const med = issues.filter(i => i.sev === 'MED').length
      const low = issues.filter(i => i.sev === 'LOW').length
      totalH += high; totalM += med; totalL += low

      if (high > 0 || med > 0) {
        process.stderr.write(` ${high}H ${med}M ${low}L\n`)
        console.log(`\n  ${p.section}/${p.slug}:`)
        for (const iss of issues.filter(i => i.sev === 'HIGH')) console.log(`    [HIGH] ${iss.msg}`)
        for (const iss of issues.filter(i => i.sev === 'MED')) console.log(`    [MED]  ${iss.msg}`)
      } else {
        process.stderr.write(` OK\n`)
      }
    } catch (err) {
      process.stderr.write(` ERROR: ${err.message?.substring(0, 50)}\n`)
    }
  }

  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  Pages: ${pages.length} | HIGH: ${totalH} | MED: ${totalM} | LOW: ${totalL}`)
  console.log(`${'═'.repeat(55)}`)

  await browser.close()
}

main().catch(console.error)
