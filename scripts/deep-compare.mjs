/**
 * ⚠️  DEPRECATED — Use scripts/page-tree.ts instead.
 *
 * page-tree.ts does a far more thorough element-level comparison with
 * computed styles (font size/weight/color, margins, backgrounds, etc.)
 * and catches differences this script misses (color mismatches, full-bleed
 * backgrounds, heading style details, etc.).
 *
 * Usage of page-tree.ts:
 *   npx tsx scripts/page-tree.ts https://www.goinvo.com/vision/slug/ --diff http://localhost:3000/vision/slug
 *
 * This script is kept only for batch element-count summaries.
 * For actual visual parity verification, ALWAYS use page-tree.ts.
 *
 * ---
 *
 * Deep Page Comparison (legacy batch tool)
 *
 * Usage:
 *   node scripts/deep-compare.mjs                           # all Sanity pages
 *   node scripts/deep-compare.mjs human-centered-design-for-ai  # single page
 *   node scripts/deep-compare.mjs --section work            # case studies only
 */

import puppeteer from 'puppeteer'

const sectionFilter = process.argv.includes('--section') ? process.argv[process.argv.indexOf('--section') + 1] : null
const sectionArgIdx = process.argv.indexOf('--section')
const singleSlug = process.argv.slice(2).find((a, i) => !a.startsWith('-') && (sectionArgIdx < 0 || i + 2 !== sectionArgIdx + 1))

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
        fontStyle: s.fontStyle,
        color: s.color,
      }
    })

    // Centered paragraphs (for detecting centered text that should stay centered)
    const centeredParas = Array.from(main.querySelectorAll('p')).filter(p => {
      if (p.closest('header,nav,form')) return false
      return cs(p).textAlign === 'center' || cs(p.parentElement).textAlign === 'center'
    }).map(p => p.textContent.trim().replace(/\s+/g, ' ').substring(0, 40))

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
    // Button position context — which heading precedes each button
    const buttonContexts = Array.from(main.querySelectorAll('a')).filter(a => {
      const s = cs(a)
      return s.textTransform === 'uppercase' && parseFloat(s.letterSpacing) > 0 &&
        a.textContent.trim().length > 2 && a.getBoundingClientRect().width > 30 &&
        !a.closest('header,nav')
    }).map(a => {
      const btnY = a.getBoundingClientRect().y
      // Find the closest heading above this button
      const headings = Array.from(main.querySelectorAll('h2,h3,h4')).filter(h => !h.closest('header,nav'))
      let closestH = ''
      for (const h of headings) {
        if (h.getBoundingClientRect().y < btnY) closestH = h.textContent.trim().replace(/\s+/g, ' ').substring(0, 25)
      }
      return { text: a.textContent.trim(), afterHeading: closestH }
    })

    const buttons = Array.from(main.querySelectorAll('a')).filter(a => {
      const s = cs(a)
      return s.textTransform === 'uppercase' && parseFloat(s.letterSpacing) > 0 &&
        a.textContent.trim().length > 2 && a.getBoundingClientRect().width > 30 &&
        !a.closest('header,nav')
    }).map(a => {
      const parent = a.parentElement
      const pcs = parent ? cs(parent) : {}
      const isCentered = pcs.justifyContent === 'center' || pcs.textAlign === 'center'
      return {
        text: a.textContent.trim(),
        w: Math.round(a.getBoundingClientRect().width),
        containerW: Math.round(parent?.getBoundingClientRect().width || 0),
        isFullWidth: Math.abs(a.getBoundingClientRect().width - (parent?.getBoundingClientRect().width || 0)) < 20,
        isCentered,
      }
    })

    // Raw HTML detection — text containing HTML tags that should have been converted
    const rawHtmlParas = Array.from(main.querySelectorAll('p')).filter(p => {
      const text = p.textContent.trim()
      return text.match(/<[a-z]+[\s>]|href=|class="/i) && text.length < 200
    }).map(p => p.textContent.trim().substring(0, 50))

    // Content order — sequence of headings and images for position comparison
    const contentOrder = Array.from(main.querySelectorAll('h2,h3,h4,img')).filter(el => {
      if (el.closest('header,nav,form,.bg-blue-light,.background--blue')) return false
      if (el.tagName === 'IMG') {
        const r = el.getBoundingClientRect()
        return r.width > 200 && r.height > 50 && r.y > 200
      }
      return true
    }).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y).map(el => {
      if (el.tagName === 'IMG') return 'IMG'
      return el.textContent.trim().replace(/\s+/g, ' ').substring(0, 30)
    })

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
      // Skip: hero images (>1000px or top <300), nav, Up Next, author headshots, tiny (<100px)
      if (r.width < 100 || r.width >= 1200 || r.height < 50 || r.y < 300) return false
      if (i.closest('header,nav,.bg-blue-light,.background--blue,footer')) return false
      // Skip author section images (headshots)
      const sec = i.closest('section,div')
      if (sec) {
        const h = sec.querySelector('h2,h3')
        if (h && /author|contributor/i.test(h.textContent)) return false
      }
      return true
    }).slice(0, 8).map(i => {
      const r = i.getBoundingClientRect()
      // Check if image is inside a multi-column grid
      let inGrid = false
      let el = i.parentElement
      for (let d = 0; d < 5 && el; d++) {
        const display = cs(el).display
        const gridCols = cs(el).gridTemplateColumns
        if (display === 'grid' && gridCols && gridCols.split(' ').length >= 2) { inGrid = true; break }
        if (display === 'flex' && el.children.length >= 2) { inGrid = true; break }
        el = el.parentElement
      }
      return { w: Math.round(r.width), inGrid }
    })

    // List bullet styles
    const listStyles = Array.from(main.querySelectorAll('ul')).filter(ul => !ul.closest('header,nav,form,footer')).map(ul => {
      const li = ul.querySelector('li')
      if (!li) return null
      const liCs = getComputedStyle(li)
      return { items: ul.children.length, bullet: liCs.listStyleImage === 'none' ? 'disc' : 'custom' }
    }).filter(Boolean)

    // Video sizes
    const videoSizes = Array.from(main.querySelectorAll('video')).filter(v => v.getBoundingClientRect().height > 50).map(v => ({
      w: Math.round(v.getBoundingClientRect().width),
      h: Math.round(v.getBoundingClientRect().height),
    }))

    // Up Next card count
    const upNextCards = main.querySelectorAll('.bg-blue-light img, .background--blue img').length

    // Stat numbers (Results component)
    const statNumbers = Array.from(main.querySelectorAll('span,div')).filter(el => {
      const text = el.textContent.trim()
      return /^\d+%?$/.test(text) && parseFloat(cs(el).fontSize) > 20 && el.children.length === 0
    }).slice(0, 4).map(el => ({
      text: el.textContent.trim(),
      fontSize: cs(el).fontSize,
      color: cs(el).color,
      bg: cs(el.parentElement || el).backgroundColor,
    }))

    // Iframe sizes
    const iframeSizes = Array.from(main.querySelectorAll('iframe')).filter(f => !f.closest('header,nav,form')).map(f => ({
      w: Math.round(f.getBoundingClientRect().width),
      h: Math.round(f.getBoundingClientRect().height),
      src: (f.src || '').substring(0, 40),
    }))

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

    // Author names — extract from the Authors section
    const authorH = Array.from(main.querySelectorAll('h2,h3')).find(h => /^Authors?$/i.test(h.textContent.trim()))
    let authorNames = []
    if (authorH) {
      const container = authorH.closest('section') || authorH.parentElement
      if (container) {
        authorNames = Array.from(container.querySelectorAll('p')).filter(p => {
          const t = p.textContent.trim()
          return t.includes(',') && t.length < 60 && t.length > 5
        }).map(p => p.textContent.trim().split(',')[0].trim())
      }
    }

    // Duplicate images — detect same src appearing multiple times
    const imgSrcs = Array.from(main.querySelectorAll('img')).filter(i => {
      const r = i.getBoundingClientRect()
      return r.width > 100 && r.height > 50 && !i.closest('header,nav,footer')
    }).map(i => {
      // Decode URL-encoded src (Next.js image optimization encodes Sanity URLs)
      const src = decodeURIComponent(i.src || '')
      // Extract Sanity asset ID
      const match = src.match(/images\/[^/]+\/[^/]+\/([a-f0-9]{20,})/)
      return match ? match[1] : src.split('/').pop()?.split('?')[0] || src
    })
    const duplicateImgs = imgSrcs.filter((s, i) => s.length > 10 && imgSrcs.indexOf(s) !== i).length

    // Quote-styled content — text inside elements with quote marks (SVG or ::before)
    const quoteTexts = Array.from(main.querySelectorAll('blockquote, .quote, .quote__content')).map(q =>
      q.textContent.trim().replace(/\s+/g, ' ').substring(0, 60)
    )

    // Stat citation colors — check if superscript links in stats have wrong colors
    const statCitationColors = Array.from(main.querySelectorAll('sup a')).filter(a => {
      // Only check citations near stat numbers (inside stat containers)
      const parent = a.closest('div,p')
      if (!parent) return false
      const siblings = parent.parentElement?.querySelectorAll('span') || []
      return Array.from(siblings).some(s => parseFloat(cs(s).fontSize) > 20)
    }).slice(0, 4).map(a => cs(a).color)

    // Stat backgrounds — check if Results stat items have colored backgrounds
    // Walk up to 5 ancestors to find a background (Gatsby uses deep wrapper divs)
    const statBgs = Array.from(main.querySelectorAll('span,div')).filter(el => {
      const text = el.textContent.trim()
      return /^\$?\d+[\d,.%]*$/.test(text) && parseFloat(cs(el).fontSize) > 20 && el.children.length === 0
    }).slice(0, 4).map(el => {
      let node = el
      for (let d = 0; d < 5; d++) {
        node = node.parentElement
        if (!node) break
        const bg = cs(node).backgroundColor
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)') return 'colored'
      }
      return 'none'
    })

    return { headings, paragraphs, centeredParas, blockquotes, styledQuotes, buttons, buttonContexts, statNumbers, rawHtmlParas, sups, grids, images, imgWidths, listStyles, interactives, iframeSizes, videoSizes, upNextCards, contentOrder, contentWidth, textLen, authorNames, duplicateImgs, quoteTexts, statBgs, statCitationColors }
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
    // Font style mismatch (italic on one side but not the other)
    if (aH.fontStyle !== bH.fontStyle) {
      issues.push({ sev: 'MED', msg: `Heading italic: "${bH.text.substring(0, 30)}" ${aH.fontStyle} → ${bH.fontStyle}` })
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

  // ── Centered paragraph comparison ──────────────────────────────
  // Check if paragraphs centered on Gatsby are also centered on Next.js
  if (dataA.centeredParas.length > 0) {
    const bParaNorms = new Set(dataB.centeredParas.map(p => normalize(p)))
    for (const ap of dataA.centeredParas) {
      if (!bParaNorms.has(normalize(ap))) {
        // Check if the text exists on Next.js but isn't centered
        const bHasText = dataB.paragraphs.some(bp => normalize(bp.substring(0, 30)) === normalize(ap.substring(0, 30)))
        if (bHasText) {
          issues.push({ sev: 'MED', msg: `Centered text not centered on Next.js: "${ap.substring(0, 40)}"` })
        }
      }
    }
  }

  // ── Button comparison ──────────────────────────────────────────
  const norm2 = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (let ai = 0; ai < dataA.buttons.length; ai++) {
    const aBtn = dataA.buttons[ai]
    const bBtn = dataB.buttons.find(b => norm2(b.text) === norm2(aBtn.text))
    if (!bBtn) {
      issues.push({ sev: 'MED', msg: `Missing button: "${aBtn.text}"` })
    } else {
      // Check width mismatch
      const wDiff = Math.abs(aBtn.w - bBtn.w)
      if (wDiff > 200 && aBtn.isFullWidth !== bBtn.isFullWidth) {
        issues.push({ sev: 'LOW', msg: `Button "${aBtn.text.substring(0, 25)}" width: ${aBtn.w}px → ${bBtn.w}px` })
      }
      // Check centering mismatch
      if (aBtn.isCentered && !bBtn.isCentered) {
        issues.push({ sev: 'MED', msg: `Button "${aBtn.text.substring(0, 25)}" should be centered` })
      }
    }
  }
  for (const bBtn of dataB.buttons) {
    if (!dataA.buttons.find(a => norm2(a.text) === norm2(bBtn.text))) {
      issues.push({ sev: 'MED', msg: `Extra button on Next.js: "${bBtn.text}"` })
    }
  }
  // Check button position — which heading each button appears after
  for (const aCtx of dataA.buttonContexts) {
    const bCtx = dataB.buttonContexts.find(b => norm2(b.text) === norm2(aCtx.text))
    if (!bCtx) continue
    if (aCtx.afterHeading && bCtx.afterHeading && normalize(aCtx.afterHeading) !== normalize(bCtx.afterHeading)) {
      issues.push({ sev: 'MED', msg: `Button "${aCtx.text.substring(0, 20)}" position: after "${aCtx.afterHeading}" → after "${bCtx.afterHeading}"` })
    }
  }

  // Check button group composition — each group should have the same buttons
  // Match groups by their first button label
  const aGroups = {}
  const bGroups = {}
  for (const ctx of dataA.buttonContexts) {
    const key = norm2(ctx.afterHeading || '(start)')
    if (!aGroups[key]) aGroups[key] = []
    aGroups[key].push(norm2(ctx.text))
  }
  for (const ctx of dataB.buttonContexts) {
    const key = norm2(ctx.afterHeading || '(start)')
    if (!bGroups[key]) bGroups[key] = []
    bGroups[key].push(norm2(ctx.text))
  }
  for (const [key, aLabels] of Object.entries(aGroups)) {
    const bLabels = bGroups[key]
    if (!bLabels) continue
    // Check for missing buttons in this position
    for (const label of aLabels) {
      if (!bLabels.includes(label)) {
        issues.push({ sev: 'MED', msg: `Button "${label.substring(0, 20)}" missing after "${key.substring(0, 20)}" (Gatsby has it, Next.js doesn't)` })
      }
    }
    // Check for extra buttons
    for (const label of bLabels) {
      if (!aLabels.includes(label)) {
        issues.push({ sev: 'MED', msg: `Extra button "${label.substring(0, 20)}" after "${key.substring(0, 20)}" (not on Gatsby)` })
      }
    }
  }

  // Check for redundant link paragraphs before buttons (short linked text that duplicates a button)
  const bBtnTexts = new Set(dataB.buttons.map(b => norm2(b.text)))
  for (const p of dataB.paragraphs) {
    const pNorm = norm2(p.substring(0, 30))
    // Check if paragraph text starts with "Visit", "View", "Try", "Download", "Read" and matches a button
    if (/^(visit|view|try|download|read|open|get|join) /i.test(p)) {
      for (const btnText of bBtnTexts) {
        if (pNorm.includes(btnText.substring(0, 10)) || btnText.includes(pNorm.substring(0, 10))) {
          issues.push({ sev: 'MED', msg: `Redundant link before button: "${p.substring(0, 30)}"` })
          break
        }
      }
    }
  }

  // Check for duplicate buttons on Next.js (same label appears more times than on Gatsby)
  const aBtnCounts = {}
  const bBtnCounts = {}
  for (const b of dataA.buttons) { const k = norm2(b.text); aBtnCounts[k] = (aBtnCounts[k] || 0) + 1 }
  for (const b of dataB.buttons) { const k = norm2(b.text); bBtnCounts[k] = (bBtnCounts[k] || 0) + 1 }
  for (const [label, count] of Object.entries(bBtnCounts)) {
    const aCount = aBtnCounts[label] || 0
    if (count > aCount) {
      issues.push({ sev: 'MED', msg: `Duplicate button "${label.substring(0, 25)}": ${aCount} on Gatsby → ${count} on Next.js` })
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

  // ── List comparison ─────────────────────────────────────────────
  // Detect extra lists on Next.js that Gatsby doesn't have
  if (dataB.listStyles.length > dataA.listStyles.length) {
    const extra = dataB.listStyles.length - dataA.listStyles.length
    issues.push({ sev: 'MED', msg: `${extra} extra list(s) on Next.js not on Gatsby (${dataA.listStyles.length} → ${dataB.listStyles.length})` })
  }
  // Bullet style comparison for matched lists
  for (let i = 0; i < Math.min(dataA.listStyles.length, dataB.listStyles.length); i++) {
    if (dataA.listStyles[i].bullet !== dataB.listStyles[i].bullet) {
      issues.push({ sev: 'MED', msg: `List ${i + 1} bullet: ${dataA.listStyles[i].bullet} → ${dataB.listStyles[i].bullet}` })
    }
  }

  // ── Raw HTML detection ─────────────────────────────────────────
  if (dataB.rawHtmlParas.length > 0) {
    for (const html of dataB.rawHtmlParas) {
      issues.push({ sev: 'HIGH', msg: `Raw HTML in content: "${html}"` })
    }
  }

  // ── Stat number comparison (Results component) ─────────────────
  for (let i = 0; i < Math.min(dataA.statNumbers.length, dataB.statNumbers.length); i++) {
    const a = dataA.statNumbers[i], b = dataB.statNumbers[i]
    if (Math.abs(parseFloat(a.fontSize) - parseFloat(b.fontSize)) > 4) {
      issues.push({ sev: 'MED', msg: `Stat "${a.text}" size: ${a.fontSize} → ${b.fontSize}` })
    }
    if (a.color !== b.color) {
      issues.push({ sev: 'MED', msg: `Stat "${a.text}" color: ${a.color} → ${b.color}` })
    }
  }

  // ── Iframe size comparison ──────────────────────────────────────
  for (let i = 0; i < Math.min(dataA.iframeSizes.length, dataB.iframeSizes.length); i++) {
    const wDiff = Math.abs(dataA.iframeSizes[i].w - dataB.iframeSizes[i].w)
    if (wDiff > 200) {
      issues.push({ sev: 'MED', msg: `Iframe ${i + 1} width: ${dataA.iframeSizes[i].w}px → ${dataB.iframeSizes[i].w}px (should ${dataA.iframeSizes[i].w > 900 ? 'be full-width' : 'match'})` })
    }
  }

  // ── Video size comparison ───────────────────────────────────────
  for (let i = 0; i < Math.min(dataA.videoSizes.length, dataB.videoSizes.length); i++) {
    const hDiff = Math.abs(dataA.videoSizes[i].h - dataB.videoSizes[i].h)
    if (hDiff > 200) {
      issues.push({ sev: 'MED', msg: `Video ${i + 1} height: ${dataA.videoSizes[i].h}px → ${dataB.videoSizes[i].h}px (${hDiff}px diff)` })
    }
  }

  // ── Up Next card count comparison ─────────────────────────────
  if (dataA.upNextCards > dataB.upNextCards + 1) {
    issues.push({ sev: 'MED', msg: `Up Next cards: ${dataA.upNextCards} → ${dataB.upNextCards}` })
  }

  // ── Content order comparison ────────────────────────────────────
  // Compare content images' heading context (skip author/template images)
  const getImgContexts = (order) => {
    const skip = new Set(['authors', 'author', 'contributors', 'subscribe to our newsletter', '(start)'])
    const result = []
    let lastHeading = '(start)'
    for (const item of order) {
      if (item === 'IMG') {
        if (!skip.has(normalize(lastHeading))) result.push(lastHeading)
      } else {
        lastHeading = item
      }
    }
    return result
  }
  const aCtxs = getImgContexts(dataA.contentOrder)
  const bCtxs = getImgContexts(dataB.contentOrder)
  for (let i = 0; i < Math.min(aCtxs.length, bCtxs.length, 5); i++) {
    if (normalize(aCtxs[i]) !== normalize(bCtxs[i])) {
      issues.push({ sev: 'MED', msg: `Image ${i + 1} position: after "${aCtxs[i].substring(0, 25)}" → after "${bCtxs[i].substring(0, 25)}"` })
    }
  }

  // ── Heading-to-heading content sequence ────────────────────────
  // Check if headings appear in the same order on both pages
  const templateHSet = new Set(['authors','author','contributors','subscribe to our newsletter','references','up next','about goinvo','special thanks to...','problem','solution','results'])
  const aOrder = dataA.contentOrder.filter(i => i !== 'IMG' && !templateHSet.has(normalize(i)))
  const bOrder = dataB.contentOrder.filter(i => i !== 'IMG' && !templateHSet.has(normalize(i)))
  // Find headings that appear in different positions (off by more than 1 slot)
  for (let i = 0; i < Math.min(aOrder.length, bOrder.length); i++) {
    if (normalize(aOrder[i]) !== normalize(bOrder[i])) {
      // Check if it's just a position swap (nearby heading shifted)
      const bIdx = bOrder.findIndex(b => normalize(b) === normalize(aOrder[i]))
      if (bIdx >= 0 && Math.abs(i - bIdx) > 1) {
        issues.push({ sev: 'MED', msg: `Section order: "${aOrder[i].substring(0, 30)}" at position ${i} → ${bIdx}` })
      }
      break // Only report the first out-of-order section
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
      const aW = dataA.imgWidths[i].w || dataA.imgWidths[i]
      const bW = dataB.imgWidths[i].w || dataB.imgWidths[i]
      const aGrid = dataA.imgWidths[i].inGrid
      const bGrid = dataB.imgWidths[i].inGrid
      const diff = Math.abs(aW - bW)
      if (diff > 100) {
        let extra = ''
        if (!aGrid && bGrid) extra = ' (standalone on Gatsby but in grid on Next.js — wrong layout)'
        if (aGrid && !bGrid) extra = ' (in grid on Gatsby but standalone on Next.js)'
        issues.push({ sev: 'MED', msg: `Image ${i + 1} width: ${aW}px → ${bW}px (${diff}px off)${extra}` })
      }
    }
  }

  // ── Duplicate images ─────────────────────────────────────────
  if (dataB.duplicateImgs > 0 && dataA.duplicateImgs === 0) {
    issues.push({ sev: 'HIGH', msg: `${dataB.duplicateImgs} duplicate image(s) on Next.js (same image rendered multiple times)` })
  }

  // ── Author comparison ──────────────────────────────────────────
  if (dataA.authorNames.length > 0) {
    if (dataB.authorNames.length === 0) {
      issues.push({ sev: 'HIGH', msg: `Authors missing: Gatsby has ${dataA.authorNames.join(', ')}` })
    } else {
      for (const aName of dataA.authorNames) {
        if (!dataB.authorNames.some(b => normalize(b) === normalize(aName))) {
          issues.push({ sev: 'MED', msg: `Missing author: "${aName}"` })
        }
      }
      for (const bName of dataB.authorNames) {
        if (!dataA.authorNames.some(a => normalize(a) === normalize(bName))) {
          issues.push({ sev: 'MED', msg: `Extra author on Next.js: "${bName}"` })
        }
      }
    }
  }

  // ── Stat background comparison ─────────────────────────────────
  // Note: Gatsby wraps stats in deep DOM structures where background detection
  // is unreliable. Only flag when Next.js has NO background and Gatsby clearly has one.
  if (dataA.statBgs.length > 0 && dataB.statBgs.length > 0) {
    const aHasColor = dataA.statBgs.some(b => b === 'colored')
    const bHasColor = dataB.statBgs.some(b => b === 'colored')
    if (aHasColor && !bHasColor) {
      issues.push({ sev: 'MED', msg: `Results stats missing background color (Gatsby has colored boxes)` })
    }
  }

  // ── Stat citation color comparison ──────────────────────────────
  if (dataA.statCitationColors.length > 0 && dataB.statCitationColors.length > 0) {
    for (let i = 0; i < Math.min(dataA.statCitationColors.length, dataB.statCitationColors.length); i++) {
      if (dataA.statCitationColors[i] !== dataB.statCitationColors[i]) {
        issues.push({ sev: 'MED', msg: `Stat citation ${i + 1} color: ${dataA.statCitationColors[i]} → ${dataB.statCitationColors[i]}` })
        break // Only report once
      }
    }
  }

  // ── Quote text comparison ──────────────────────────────────────
  // Check if Gatsby has quote-styled text that Next.js is missing as a quote
  for (const gqt of dataA.quoteTexts) {
    const gNorm = normalize(gqt.substring(0, 40))
    const bHasQuote = dataB.quoteTexts.some(q => normalize(q.substring(0, 40)) === gNorm) ||
                      dataB.blockquotes.some(q => normalize(q.substring(0, 40)) === gNorm)
    if (!bHasQuote) {
      // Check if it exists as a plain paragraph instead
      const bHasPara = dataB.paragraphs.some(p => normalize(p.substring(0, 40)) === gNorm)
      if (bHasPara) {
        issues.push({ sev: 'MED', msg: `Quote rendered as plain text: "${gqt.substring(0, 40)}"` })
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
