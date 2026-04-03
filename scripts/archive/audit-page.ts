/**
 * Page Audit Script
 *
 * Compares a Next.js page against the old Gatsby goinvo.com page.
 *
 * Usage:
 *   npx tsx scripts/audit-page.ts <path> [--width 1280] [--old-base https://www.goinvo.com]
 *
 * Examples:
 *   npx tsx scripts/audit-page.ts /vision/coronavirus
 *   npx tsx scripts/audit-page.ts /about --width 375
 *   npx tsx scripts/audit-page.ts /vision/determinants-of-health
 *
 * Prerequisites:
 *   - Next.js dev server running on localhost:3000
 *   - ANTHROPIC_API_KEY in .env.local
 *   - `npx playwright install chromium`
 */

import { chromium, type Page } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local')
  process.exit(1)
}

// Parse args
const args = process.argv.slice(2)
let pagePath = args[0]
if (!pagePath) {
  console.error('Usage: npx tsx scripts/audit-page.ts <path>')
  console.error('Example: npx tsx scripts/audit-page.ts vision/coronavirus')
  process.exit(1)
}
// Normalize: strip leading slash, then re-add it (avoids Git Bash path expansion)
pagePath = '/' + pagePath.replace(/^\/+/, '').replace(/\/+$/, '')

const widthIdx = args.indexOf('--width')
const viewport = { width: widthIdx >= 0 ? parseInt(args[widthIdx + 1]) : 1280, height: 900 }

const oldBaseIdx = args.indexOf('--old-base')
const OLD_BASE = oldBaseIdx >= 0 ? args[oldBaseIdx + 1] : 'https://www.goinvo.com'
const newBaseIdx = args.indexOf('--new-base')
const NEW_BASE = newBaseIdx >= 0 ? args[newBaseIdx + 1] : (process.env.NEW_BASE || 'http://localhost:3001')

const AUDIT_DIR = path.resolve(__dirname, '../.audit/page-diffs')
const slug = pagePath.replace(/^\//, '').replace(/\//g, '_') || 'home'
const outDir = path.join(AUDIT_DIR, slug)

async function captureFullPage(page: Page, url: string, label: string): Promise<{ screenshots: string[]; html: string }> {
  console.log(`  Navigating to ${url}...`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  } catch {
    // networkidle can time out on heavy pages; try load then domcontentloaded
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    } catch {
      await page.goto(url, { waitUntil: 'commit', timeout: 60000 })
      await page.waitForTimeout(5000)
    }
  }

  // Scroll through the page to trigger lazy loading
  await autoScroll(page)

  // Wait a bit for animations to settle
  await page.waitForTimeout(1000)

  // Take multiple viewport-sized screenshots (top, middle, bottom)
  const pageHeight = await page.evaluate('document.body.scrollHeight') as number
  const sections = Math.min(4, Math.ceil(pageHeight / viewport.height))
  const screenshotPaths: string[] = []

  for (let i = 0; i < sections; i++) {
    const scrollY = Math.min(i * viewport.height, Math.max(0, pageHeight - viewport.height))
    await page.evaluate(`window.scrollTo(0, ${scrollY})`)
    await page.waitForTimeout(300)
    const sectionPath = path.join(outDir, `${label}-${i + 1}.png`)
    await page.screenshot({ path: sectionPath })
    screenshotPaths.push(sectionPath)
  }
  const screenshotPath = screenshotPaths[0]
  console.log(`  ${sections} screenshots saved for ${label}`)

  // Extract text content and structure
  // NOTE: Use page.evaluate with a string to avoid tsx/esbuild __name injection
  const extracted = await page.evaluate(`
    (function() {
      function extractContent(el, depth) {
        depth = depth || 0;
        var lines = [];
        var tag = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].indexOf(tag) >= 0) {
          if (tag === 'iframe') {
            var iframeSrc = el.getAttribute('src') || '';
            lines.push('  '.repeat(depth) + '[iframe: ' + iframeSrc + ']');
          }
          return lines.join('\\n');
        }
        var st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return '';
        var textContent = Array.from(el.childNodes)
          .filter(function(n) { return n.nodeType === Node.TEXT_NODE; })
          .map(function(n) { return (n.textContent || '').trim(); })
          .filter(Boolean)
          .join(' ');
        if (textContent) {
          var prefix = '';
          if (['h1','h2','h3','h4','h5','h6'].indexOf(tag) >= 0) prefix = '[' + tag.toUpperCase() + '] ';
          else if (tag === 'a') prefix = '[link: ' + (el.getAttribute('href') || '') + '] ';
          else if (tag === 'li') prefix = '• ';
          lines.push('  '.repeat(depth) + prefix + textContent);
        }
        if (tag === 'img') {
          var imgSrc = el.getAttribute('src') || el.getAttribute('data-src') || '';
          var alt = el.getAttribute('alt') || '';
          lines.push('  '.repeat(depth) + '[img: ' + (alt || 'no alt') + ' | ' + imgSrc.slice(0, 100) + ']');
        }
        if (tag === 'video') {
          var poster = el.getAttribute('poster') || '';
          lines.push('  '.repeat(depth) + '[video: poster=' + poster.slice(0, 80) + ']');
        }
        for (var i = 0; i < el.children.length; i++) {
          var childContent = extractContent(el.children[i], depth + 1);
          if (childContent) lines.push(childContent);
        }
        return lines.join('\\n');
      }
      var body = document.querySelector('body');
      return body ? extractContent(body) : '';
    })()
  `)

  const extractedStr = String(extracted || '')
  const htmlPath = path.join(outDir, `${label}-content.txt`)
  fs.writeFileSync(htmlPath, extractedStr, 'utf-8')
  console.log(`  Content extracted: ${htmlPath}`)

  return { screenshots: screenshotPaths, html: extractedStr }
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0
      const distance = 500
      const timer = setInterval(() => {
        window.scrollBy(0, distance)
        totalHeight += distance
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer)
          window.scrollTo(0, 0)
          resolve()
        }
      }, 100)
    })
  })
}

async function analyzeDiff(
  oldContent: string,
  newContent: string,
  oldScreenshots: string[],
  newScreenshots: string[],
  pagePath: string
): Promise<string> {
  console.log('  Sending to Claude for analysis...')

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  // Build image content blocks (limit to 3 per side to stay under token limits)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageBlocks: any[] = []

  const maxImages = 3
  for (let i = 0; i < Math.min(maxImages, oldScreenshots.length); i++) {
    const data = fs.readFileSync(oldScreenshots[i]).toString('base64')
    imageBlocks.push({
      type: 'text' as const,
      text: `OLD page screenshot ${i + 1}/${Math.min(maxImages, oldScreenshots.length)}:`,
    })
    imageBlocks.push({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/png' as const, data },
    })
  }
  for (let i = 0; i < Math.min(maxImages, newScreenshots.length); i++) {
    const data = fs.readFileSync(newScreenshots[i]).toString('base64')
    imageBlocks.push({
      type: 'text' as const,
      text: `NEW page screenshot ${i + 1}/${Math.min(maxImages, newScreenshots.length)}:`,
    })
    imageBlocks.push({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/png' as const, data },
    })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are auditing a website migration from Gatsby to Next.js. Compare the OLD page (goinvo.com) with the NEW page (localhost) for the route: ${pagePath}

I'm providing:
1. Screenshots of both pages (full-page captures)
2. Extracted text content from both pages

Create a detailed audit report with these sections:

## Content Differences
- Missing text, paragraphs, or sections
- Text that differs between old and new
- Missing or different headings

## Image Differences
- Missing images
- Images with different sizing or placement
- Missing alt text

## Layout & Style Differences
- Spacing differences (margins, padding)
- Typography differences (font sizes, weights, colors)
- Color differences
- Width/alignment differences
- Responsive layout differences

## Component Differences
- Missing interactive elements (videos, iframes, carousels)
- Different button styles or placements
- Missing links or navigation elements

## Author Section Differences
- Missing author photos
- Different author layout
- Missing contributor information

## Priority Fixes
List the most impactful differences that should be fixed first, ordered by visibility/importance.

Be very specific — reference exact text, sections, and visual positions. If something looks correct, don't mention it.

OLD PAGE CONTENT:
\`\`\`
${oldContent.slice(0, 15000)}
\`\`\`

NEW PAGE CONTENT:
\`\`\`
${newContent.slice(0, 15000)}
\`\`\``,
          },
          ...imageBlocks,
        ],
      },
    ],
  })

  const analysis =
    response.content[0].type === 'text' ? response.content[0].text : ''
  return analysis
}

async function main() {
  console.log(`\n=== Page Audit: ${pagePath} ===`)
  console.log(`Old: ${OLD_BASE}${pagePath}`)
  console.log(`New: ${NEW_BASE}${pagePath}`)
  console.log(`Viewport: ${viewport.width}x${viewport.height}\n`)

  // Create output directory
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  })

  try {
    // Capture old page
    console.log('Capturing OLD page...')
    const oldPage = await context.newPage()
    const old = await captureFullPage(oldPage, `${OLD_BASE}${pagePath}`, 'old')
    await oldPage.close()

    // Capture new page
    console.log('Capturing NEW page...')
    const newPage = await context.newPage()
    const nw = await captureFullPage(newPage, `${NEW_BASE}${pagePath}`, 'new')
    await newPage.close()

    // Analyze with Claude
    console.log('Analyzing differences...')
    const analysis = await analyzeDiff(
      old.html,
      nw.html,
      old.screenshots,
      nw.screenshots,
      pagePath
    )

    // Write report
    const reportPath = path.join(outDir, 'audit-report.md')
    const report = `# Page Audit: ${pagePath}

> Generated: ${new Date().toISOString()}
> Viewport: ${viewport.width}x${viewport.height}
> Old: ${OLD_BASE}${pagePath}
> New: ${NEW_BASE}${pagePath}

${analysis}
`
    fs.writeFileSync(reportPath, report, 'utf-8')
    console.log(`\n✅ Report saved: ${reportPath}`)

    // Print summary
    console.log('\n--- AUDIT SUMMARY ---')
    console.log(analysis.slice(0, 2000))
    if (analysis.length > 2000) console.log('\n... (see full report)')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})
