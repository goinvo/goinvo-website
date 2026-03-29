/**
 * Full Site Audit Script
 *
 * Programmatically compares every page between the Gatsby site (goinvo.com)
 * and the Next.js site (localhost) by extracting DOM structure, CSS properties,
 * text content, images, links, and metadata.
 *
 * Usage:
 *   npx tsx scripts/audit-full-site.ts [--new-base http://localhost:3000]
 *
 * Prerequisites:
 *   - Next.js dev server running
 *   - `npx playwright install chromium`
 */

import { chromium, type Page, type Browser } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const args = process.argv.slice(2)
const newBaseIdx = args.indexOf('--new-base')
const NEW_BASE = newBaseIdx >= 0 ? args[newBaseIdx + 1] : 'http://localhost:3000'
const OLD_BASE = 'https://www.goinvo.com'
const AUDIT_DIR = path.resolve(__dirname, '../.audit/full-site-audit')
const viewport = { width: 1280, height: 900 }

// All pages to audit (excluding dynamic case study/vision detail pages)
const PAGES = [
  '/',
  '/about',
  '/about/careers',
  '/about/open-office-hours',
  '/about/studio-timeline',
  '/services',
  '/work',
  '/vision',
  '/contact',
  '/enterprise',
  '/government',
  '/ai',
  '/patient-engagement',
  '/open-source-health-design',
  '/why-hire-healthcare-design-studio',
]

interface ElementInfo {
  tag: string
  text: string
  classes: string
  href?: string
  src?: string
  alt?: string
  css: Record<string, string>
}

interface PageData {
  url: string
  title: string
  metaDescription: string
  headings: { level: string; text: string }[]
  paragraphs: string[]
  images: { src: string; alt: string; width: number; height: number; naturalWidth: number; naturalHeight: number }[]
  links: { href: string; text: string; isExternal: boolean }[]
  iframes: { src: string }[]
  buttons: { text: string; href?: string }[]
  forms: { id: string; action: string }[]
  sections: { tag: string; classes: string; childCount: number; bgColor: string; bgImage: string }[]
  cssSnapshot: {
    bodyFont: string
    bodyColor: string
    bodyBg: string
    h1Font: string
    h1Size: string
    h1Color: string
    h1Weight: string
    h2Font: string
    h2Size: string
    h2Color: string
    h2Weight: string
    linkColor: string
    maxWidth: string
  }
  elementCounts: Record<string, number>
  pageHeight: number
  errors: string[]
}

async function extractPageData(page: Page, url: string): Promise<PageData> {
  const errors: string[] = []

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 })
    } catch {
      try {
        await page.goto(url, { waitUntil: 'commit', timeout: 45000 })
        await page.waitForTimeout(5000)
      } catch (e) {
        errors.push(`Failed to load: ${e}`)
        return {
          url, title: '', metaDescription: '', headings: [], paragraphs: [],
          images: [], links: [], iframes: [], buttons: [], forms: [], sections: [],
          cssSnapshot: {} as PageData['cssSnapshot'], elementCounts: {}, pageHeight: 0, errors,
        }
      }
    }
  }

  // Auto-scroll to trigger lazy loading
  // NOTE: Use string-based evaluate to avoid tsx/esbuild __name injection
  await page.evaluate(`
    (async function() {
      await new Promise(function(resolve) {
        var totalHeight = 0;
        var distance = 500;
        var timer = setInterval(function() {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    })()
  `)
  await page.waitForTimeout(1000)

  // NOTE: Use string-based evaluate to avoid tsx/esbuild __name injection
  const data = await page.evaluate(`
    (function() {
      function getCS(el) { return window.getComputedStyle(el); }

      var title = document.title || '';
      var metaEl = document.querySelector('meta[name="description"]');
      var metaDescription = metaEl ? (metaEl.getAttribute('content') || '') : '';

      var headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(function(h) {
        return { level: h.tagName, text: (h.textContent || '').trim().slice(0, 200) };
      });

      var paragraphs = Array.from(document.querySelectorAll('p')).map(function(p) {
        return (p.textContent || '').trim();
      }).filter(function(t) { return t.length > 0; });

      var images = Array.from(document.querySelectorAll('img')).map(function(img) {
        return {
          src: (img.src || img.dataset.src || '').slice(0, 200),
          alt: img.alt || '',
          width: img.offsetWidth,
          height: img.offsetHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      });

      var links = Array.from(document.querySelectorAll('a[href]')).map(function(a) {
        return {
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').trim().slice(0, 100),
          isExternal: a.hostname !== window.location.hostname,
        };
      });

      var iframes = Array.from(document.querySelectorAll('iframe')).map(function(f) {
        return { src: (f.getAttribute('src') || '').slice(0, 200) };
      });

      var buttons = Array.from(document.querySelectorAll('button, a.button, [class*="button"], [class*="Button"], [role="button"]')).map(function(b) {
        return { text: (b.textContent || '').trim().slice(0, 100), href: b.href || undefined };
      });

      var forms = Array.from(document.querySelectorAll('form')).map(function(f) {
        return { id: f.id || '', action: f.action || '' };
      });

      var sections = Array.from(document.querySelectorAll('section, [class*="section"], main > div > div')).slice(0, 30).map(function(s) {
        var cs = getCS(s);
        return {
          tag: s.tagName,
          classes: (s.className && typeof s.className === 'string') ? s.className.slice(0, 200) : '',
          childCount: s.children.length,
          bgColor: cs.backgroundColor,
          bgImage: cs.backgroundImage.slice(0, 200),
        };
      });

      var body = document.body;
      var bodyCS = getCS(body);
      var h1 = document.querySelector('h1');
      var h1CS = h1 ? getCS(h1) : null;
      var h2 = document.querySelector('h2');
      var h2CS = h2 ? getCS(h2) : null;
      var link = document.querySelector('a');
      var linkCS = link ? getCS(link) : null;
      var maxWidthEl = document.querySelector('.max-width, .max-width-content, [class*="max-width"]');
      var maxWidthCS = maxWidthEl ? getCS(maxWidthEl) : null;

      var cssSnapshot = {
        bodyFont: bodyCS.fontFamily.slice(0, 100),
        bodyColor: bodyCS.color,
        bodyBg: bodyCS.backgroundColor,
        h1Font: h1CS ? h1CS.fontFamily.slice(0, 100) : '',
        h1Size: h1CS ? h1CS.fontSize : '',
        h1Color: h1CS ? h1CS.color : '',
        h1Weight: h1CS ? h1CS.fontWeight : '',
        h2Font: h2CS ? h2CS.fontFamily.slice(0, 100) : '',
        h2Size: h2CS ? h2CS.fontSize : '',
        h2Color: h2CS ? h2CS.color : '',
        h2Weight: h2CS ? h2CS.fontWeight : '',
        linkColor: linkCS ? linkCS.color : '',
        maxWidth: maxWidthCS ? maxWidthCS.maxWidth : '',
      };

      var tags = ['h1','h2','h3','h4','h5','h6','p','img','a','button','form','iframe','video','section','nav','footer','header','ul','ol','li','table','input','textarea','select'];
      var elementCounts = {};
      tags.forEach(function(tag) { elementCounts[tag] = document.querySelectorAll(tag).length; });

      var pageHeight = document.body.scrollHeight;

      return {
        title: title, metaDescription: metaDescription, headings: headings, paragraphs: paragraphs,
        images: images, links: links, iframes: iframes, buttons: buttons, forms: forms,
        sections: sections, cssSnapshot: cssSnapshot, elementCounts: elementCounts, pageHeight: pageHeight,
      };
    })()
  `) as Omit<PageData, 'url' | 'errors'>

  return { ...data, url, errors }
}

function compareParagraphs(oldParagraphs: string[], newParagraphs: string[]): { missing: string[]; added: string[]; } {
  // Normalize for comparison
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const oldNorm = oldParagraphs.map(normalize)
  const newNorm = newParagraphs.map(normalize)

  const missing = oldParagraphs.filter((_, i) => !newNorm.some(n => n.includes(oldNorm[i]?.slice(0, 50) || '___NEVER___')))
  const added = newParagraphs.filter((_, i) => !oldNorm.some(o => o.includes(newNorm[i]?.slice(0, 50) || '___NEVER___')))

  return { missing: missing.slice(0, 20), added: added.slice(0, 20) }
}

function compareLinks(oldLinks: PageData['links'], newLinks: PageData['links']): { missing: string[]; added: string[] } {
  const oldHrefs = new Set(oldLinks.map(l => l.href.replace(/\/$/, '')))
  const newHrefs = new Set(newLinks.map(l => l.href.replace(/\/$/, '')))

  const missing = [...oldHrefs].filter(h => !newHrefs.has(h) && !h.startsWith('#') && !h.startsWith('javascript'))
  const added = [...newHrefs].filter(h => !oldHrefs.has(h) && !h.startsWith('#') && !h.startsWith('javascript'))

  return { missing: missing.slice(0, 30), added: added.slice(0, 30) }
}

function compareImages(oldImgs: PageData['images'], newImgs: PageData['images']): string[] {
  const diffs: string[] = []

  // Compare counts
  if (oldImgs.length !== newImgs.length) {
    diffs.push(`Image count: OLD=${oldImgs.length}, NEW=${newImgs.length}`)
  }

  // Check for missing alt text in new
  const newMissingAlt = newImgs.filter(i => !i.alt && i.width > 50)
  if (newMissingAlt.length > 0) {
    diffs.push(`${newMissingAlt.length} images in NEW missing alt text (>50px wide)`)
  }

  // Check for significantly different image sizes
  for (const oldImg of oldImgs) {
    if (!oldImg.src || oldImg.width < 50) continue
    const oldFilename = oldImg.src.split('/').pop()?.split('?')[0] || ''
    const match = newImgs.find(n => {
      const newFilename = n.src.split('/').pop()?.split('?')[0] || ''
      return newFilename === oldFilename || n.alt === oldImg.alt
    })
    if (!match) {
      diffs.push(`Missing image: ${oldImg.alt || oldFilename} (${oldImg.width}x${oldImg.height})`)
    }
  }

  return diffs.slice(0, 20)
}

function compareCss(oldCss: PageData['cssSnapshot'], newCss: PageData['cssSnapshot']): string[] {
  const diffs: string[] = []
  const keys = Object.keys(oldCss) as (keyof PageData['cssSnapshot'])[]

  for (const key of keys) {
    const oldVal = oldCss[key]
    const newVal = newCss[key]
    if (!oldVal && !newVal) continue
    if (oldVal !== newVal) {
      diffs.push(`**${key}**: OLD=\`${oldVal}\` → NEW=\`${newVal}\``)
    }
  }

  return diffs
}

function compareElementCounts(oldCounts: Record<string, number>, newCounts: Record<string, number>): string[] {
  const diffs: string[] = []
  const allTags = new Set([...Object.keys(oldCounts), ...Object.keys(newCounts)])

  for (const tag of allTags) {
    const oldCount = oldCounts[tag] || 0
    const newCount = newCounts[tag] || 0
    const diff = newCount - oldCount
    if (diff !== 0 && (Math.abs(diff) > 1 || ['h1', 'h2', 'nav', 'footer', 'header', 'form', 'iframe', 'video'].includes(tag))) {
      const sign = diff > 0 ? '+' : ''
      diffs.push(`\`<${tag}>\`: ${oldCount} → ${newCount} (${sign}${diff})`)
    }
  }

  return diffs
}

function generatePageReport(pagePath: string, oldData: PageData, newData: PageData): string {
  const lines: string[] = []
  lines.push(`## ${pagePath}`)
  lines.push('')

  if (oldData.errors.length > 0 || newData.errors.length > 0) {
    lines.push('### Errors')
    oldData.errors.forEach(e => lines.push(`- OLD: ${e}`))
    newData.errors.forEach(e => lines.push(`- NEW: ${e}`))
    lines.push('')
  }

  // Title & Meta
  if (oldData.title !== newData.title) {
    lines.push(`### Title`)
    lines.push(`- OLD: \`${oldData.title}\``)
    lines.push(`- NEW: \`${newData.title}\``)
    lines.push('')
  }
  if (oldData.metaDescription !== newData.metaDescription) {
    lines.push(`### Meta Description`)
    lines.push(`- OLD: \`${oldData.metaDescription.slice(0, 150)}\``)
    lines.push(`- NEW: \`${newData.metaDescription.slice(0, 150)}\``)
    lines.push('')
  }

  // Heading structure
  const oldH = oldData.headings.map(h => `${h.level}: ${h.text}`).join('\n')
  const newH = newData.headings.map(h => `${h.level}: ${h.text}`).join('\n')
  if (oldH !== newH) {
    lines.push('### Heading Structure')
    lines.push('<details><summary>Show diff</summary>')
    lines.push('')
    lines.push('**OLD:**')
    oldData.headings.forEach(h => lines.push(`- ${h.level}: ${h.text.slice(0, 100)}`))
    lines.push('')
    lines.push('**NEW:**')
    newData.headings.forEach(h => lines.push(`- ${h.level}: ${h.text.slice(0, 100)}`))
    lines.push('')
    lines.push('</details>')
    lines.push('')
  }

  // Element counts
  const countDiffs = compareElementCounts(oldData.elementCounts, newData.elementCounts)
  if (countDiffs.length > 0) {
    lines.push('### Element Count Differences')
    countDiffs.forEach(d => lines.push(`- ${d}`))
    lines.push('')
  }

  // CSS differences
  const cssDiffs = compareCss(oldData.cssSnapshot, newData.cssSnapshot)
  if (cssDiffs.length > 0) {
    lines.push('### CSS Differences')
    cssDiffs.forEach(d => lines.push(`- ${d}`))
    lines.push('')
  }

  // Image differences
  const imgDiffs = compareImages(oldData.images, newData.images)
  if (imgDiffs.length > 0) {
    lines.push('### Image Differences')
    imgDiffs.forEach(d => lines.push(`- ${d}`))
    lines.push('')
  }

  // Iframe differences
  if (oldData.iframes.length !== newData.iframes.length) {
    lines.push('### Iframe Differences')
    lines.push(`- OLD iframes: ${oldData.iframes.length} — ${oldData.iframes.map(f => f.src.slice(0, 80)).join(', ')}`)
    lines.push(`- NEW iframes: ${newData.iframes.length} — ${newData.iframes.map(f => f.src.slice(0, 80)).join(', ')}`)
    lines.push('')
  }

  // Link differences
  const linkDiffs = compareLinks(oldData.links, newData.links)
  if (linkDiffs.missing.length > 0 || linkDiffs.added.length > 0) {
    lines.push('### Link Differences')
    if (linkDiffs.missing.length > 0) {
      lines.push(`**Missing links (in OLD, not in NEW):** ${linkDiffs.missing.length}`)
      linkDiffs.missing.slice(0, 15).forEach(l => lines.push(`- \`${l}\``))
      if (linkDiffs.missing.length > 15) lines.push(`- ... and ${linkDiffs.missing.length - 15} more`)
    }
    if (linkDiffs.added.length > 0) {
      lines.push(`**Added links (in NEW, not in OLD):** ${linkDiffs.added.length}`)
      linkDiffs.added.slice(0, 10).forEach(l => lines.push(`- \`${l}\``))
    }
    lines.push('')
  }

  // Content (paragraphs) differences
  const paraDiffs = compareParagraphs(oldData.paragraphs, newData.paragraphs)
  if (paraDiffs.missing.length > 0) {
    lines.push('### Missing Content (in OLD, not in NEW)')
    lines.push('<details><summary>Show missing paragraphs</summary>')
    lines.push('')
    paraDiffs.missing.slice(0, 15).forEach(p => lines.push(`- "${p.slice(0, 200)}"${p.length > 200 ? '...' : ''}`))
    lines.push('')
    lines.push('</details>')
    lines.push('')
  }

  // Page height
  const heightDiff = Math.abs(oldData.pageHeight - newData.pageHeight)
  if (heightDiff > 200) {
    lines.push(`### Page Height`)
    lines.push(`- OLD: ${oldData.pageHeight}px, NEW: ${newData.pageHeight}px (diff: ${heightDiff}px)`)
    lines.push('')
  }

  // If no diffs found
  if (lines.length <= 2) {
    lines.push('No significant differences found.')
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  return lines.join('\n')
}

async function main() {
  console.log('=== Full Site Audit ===')
  console.log(`OLD: ${OLD_BASE}`)
  console.log(`NEW: ${NEW_BASE}`)
  console.log(`Pages: ${PAGES.length}`)
  console.log('')

  fs.mkdirSync(AUDIT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  const report: string[] = []
  report.push('# Full Site Audit Report')
  report.push('')
  report.push(`> Generated: ${new Date().toISOString()}`)
  report.push(`> OLD: ${OLD_BASE}`)
  report.push(`> NEW: ${NEW_BASE}`)
  report.push(`> Viewport: ${viewport.width}x${viewport.height}`)
  report.push('')

  // Summary table
  const summaryRows: string[] = []
  summaryRows.push('| Page | Elements | CSS | Images | Links | Content | Height |')
  summaryRows.push('|------|----------|-----|--------|-------|---------|--------|')

  const allPageData: { path: string; old: PageData; new: PageData }[] = []

  for (const pagePath of PAGES) {
    console.log(`\n--- Auditing: ${pagePath} ---`)

    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })

    // Take screenshot of each
    const oldPage = await context.newPage()
    const newPage = await context.newPage()

    console.log(`  Extracting OLD: ${OLD_BASE}${pagePath}`)
    const oldData = await extractPageData(oldPage, `${OLD_BASE}${pagePath}`)

    console.log(`  Extracting NEW: ${NEW_BASE}${pagePath}`)
    const newData = await extractPageData(newPage, `${NEW_BASE}${pagePath}`)

    // Take screenshots
    try {
      await oldPage.goto(`${OLD_BASE}${pagePath}`, { waitUntil: 'load', timeout: 30000 })
      await oldPage.waitForTimeout(1000)
      const slug = pagePath.replace(/^\//, '').replace(/\//g, '_') || 'home'
      await oldPage.screenshot({ path: path.join(AUDIT_DIR, `${slug}-old.png`), fullPage: true })
      await newPage.goto(`${NEW_BASE}${pagePath}`, { waitUntil: 'load', timeout: 30000 })
      await newPage.waitForTimeout(1000)
      await newPage.screenshot({ path: path.join(AUDIT_DIR, `${slug}-new.png`), fullPage: true })
    } catch (e) {
      console.log(`  Warning: screenshot failed: ${e}`)
    }

    await oldPage.close()
    await newPage.close()
    await context.close()

    allPageData.push({ path: pagePath, old: oldData, new: newData })

    // Summary counts
    const elemDiffs = compareElementCounts(oldData.elementCounts, newData.elementCounts).length
    const cssDiffs = compareCss(oldData.cssSnapshot, newData.cssSnapshot).length
    const imgDiffs = compareImages(oldData.images, newData.images).length
    const linkDiffs = compareLinks(oldData.links, newData.links)
    const linkCount = linkDiffs.missing.length + linkDiffs.added.length
    const paraDiffs = compareParagraphs(oldData.paragraphs, newData.paragraphs)
    const contentCount = paraDiffs.missing.length
    const heightDiff = Math.abs(oldData.pageHeight - newData.pageHeight)

    const flag = (n: number) => n > 0 ? `${n}` : '-'
    const heightFlag = heightDiff > 200 ? `${heightDiff}px` : '-'
    summaryRows.push(`| ${pagePath} | ${flag(elemDiffs)} | ${flag(cssDiffs)} | ${flag(imgDiffs)} | ${flag(linkCount)} | ${flag(contentCount)} | ${heightFlag} |`)

    console.log(`  Done: ${elemDiffs} elem, ${cssDiffs} css, ${imgDiffs} img, ${linkCount} link, ${contentCount} content diffs`)
  }

  report.push('## Summary')
  report.push('')
  report.push(...summaryRows)
  report.push('')
  report.push('Numbers indicate count of differences found in each category. `-` means no differences.')
  report.push('')

  // Detailed reports
  report.push('## Detailed Page Reports')
  report.push('')

  for (const { path: pagePath, old: oldData, new: newData } of allPageData) {
    report.push(generatePageReport(pagePath, oldData, newData))
  }

  // Write report
  const reportPath = path.join(AUDIT_DIR, 'audit-report.md')
  fs.writeFileSync(reportPath, report.join('\n'), 'utf-8')
  console.log(`\n\n✅ Full report saved: ${reportPath}`)

  // Also write raw JSON data for further analysis
  const jsonPath = path.join(AUDIT_DIR, 'audit-data.json')
  fs.writeFileSync(jsonPath, JSON.stringify(allPageData, null, 2), 'utf-8')
  console.log(`📊 Raw data saved: ${jsonPath}`)

  await browser.close()
}

main().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})
