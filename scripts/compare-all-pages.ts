/**
 * Full site comparison: vision pages + case studies + main pages
 *
 * Compares DOM structure between Gatsby (live) and Next.js (localhost).
 * Reports heading mismatches, missing content, count differences, and
 * rendered-layout drift on main/work pages.
 *
 * Usage:
 *   npx tsx scripts/compare-all-pages.ts
 *   npx tsx scripts/compare-all-pages.ts --section work
 *   npx tsx scripts/compare-all-pages.ts --section main
 */

import puppeteer, { type Page } from 'puppeteer'

const GATSBY_BASE_URL = 'https://goinvo.com'
const NEXTJS_BASE_URL = 'http://localhost:3000'

const CASE_STUDY_SLUGS = [
  '3m-coderyte', 'ahrq-cds', 'all-of-us', 'care-cards',
  'commonhealth-smart-health-cards', 'fastercures-health-data-basics',
  'hgraph', 'infobionic-heart-monitoring', 'insidetracker-nutrition-science',
  'inspired-ehrs', 'ipsos-facto', 'mass-snap', 'maya-ehr',
  'mitre-flux-notes', 'mitre-shr', 'mitre-state-of-us-healthcare',
  'mount-sinai-consent', 'paintrackr', 'partners-geneinsight',
  'partners-insight', 'personal-genome-project-vision', 'prior-auth',
  'public-sector', 'staffplan', 'tabeeb-diagnostics', 'wuxi-nextcode-familycode',
]

const MAIN_PAGES = [
  { path: '/', label: 'Homepage' },
  { path: '/about', label: 'About' },
  { path: '/about/careers', label: 'Careers' },
  { path: '/about/open-office-hours', label: 'Open Office Hours' },
  { path: '/about/studio-timeline', label: 'Studio Timeline' },
  { path: '/services', label: 'Services' },
  { path: '/work', label: 'Work' },
  { path: '/vision', label: 'Vision' },
  { path: '/contact', label: 'Contact' },
  { path: '/enterprise', label: 'Enterprise' },
  { path: '/government', label: 'Government' },
  { path: '/ai', label: 'AI' },
  { path: '/patient-engagement', label: 'Patient Engagement' },
  { path: '/open-source-health-design', label: 'Open Source Health Design' },
]

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
}

interface RenderHeroMetric {
  text: string
  boxWidth: number
  boxHeight: number
  headingWidth: number
  headingHeight: number
  lineCount: number | null
}

interface RenderCardImageMetric {
  title: string
  parentWidth: number
  parentHeight: number
  imageWidth: number
  imageHeight: number
  topOffset: number
  bottomOffset: number
  rightGap: number
  heightOccupancy: number
}

interface RenderCaseStudyHeaderMetric {
  titleText: string
  titleMarginBottom: number
  titleClientGap: number
}

interface RenderCaseStudyMetadataMetric {
  timeText: string | null
  tagsText: string | null
  timeTop: number | null
  tagsTop: number | null
  introResultsBodyBottom: number | null
  processTop: number | null
}

interface RenderArticleImageMetric {
  src: string
  width: number
  height: number
}

interface RenderMetrics {
  hero: RenderHeroMetric | null
  cardImages: RenderCardImageMetric[]
  caseStudyHeader: RenderCaseStudyHeaderMetric | null
  caseStudyMetadata: RenderCaseStudyMetadataMetric | null
  articleImages: RenderArticleImageMetric[]
}

interface PageElement {
  tag: string
  text: string
  classes: string
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function extractHeadings(html: string): PageElement[] {
  const results: PageElement[] = []
  const regex = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    const attrs = match[2]
    const text = stripTags(match[3]).substring(0, 100)
    const classMatch = attrs.match(/class(?:Name)?="([^"]*)"/)
    if (text.length > 0) {
      results.push({ tag: `h${match[1]}`, text, classes: classMatch?.[1] || '' })
    }
  }

  return results
}

function getContentArea(html: string): string {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)
  if (mainMatch) return mainMatch[1]

  const bodyMatch = html.match(/<div class="app__body">([\s\S]*?)(?:<div class="footer">|$)/i)
  if (bodyMatch) return bodyMatch[1]

  return html
}

function pageUrl(base: string, path: string): string {
  if (path === '/') return `${base}/`
  return `${base}${path}/`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function preparePageForCapture(page: Page): Promise<void> {
  await page.evaluate(`(async function () {
    const step = Math.max(window.innerHeight * 0.75, 400);
    const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

    for (let y = 0; y <= maxScroll; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    window.scrollTo(0, maxScroll);
    await new Promise((resolve) => setTimeout(resolve, 400));
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
  })()`)
}

async function measureRenderedLayout(page: Page, url: string): Promise<RenderMetrics> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await sleep(800)
  await preparePageForCapture(page)

  return page.evaluate(`(function () {
    const transparent = new Set(['rgba(0, 0, 0, 0)', 'transparent']);
    const root = document.querySelector('main') || document.querySelector('.app__body') || document.body;

    const parsePx = (value) => {
      const parsed = Number.parseFloat(value || '0');
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const normalize = (value) => (value || '').trim().replace(/\\s+/g, ' ').toLowerCase();

    const lineCount = (el) => {
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const height = parsePx(style.lineHeight) || parsePx(style.fontSize) * 1.2;
      if (!height) return null;
      return Math.round((rect.height / height) * 10) / 10;
    };

    const findMeasuredContainer = (el) => {
      let current = el && el.parentElement ? el.parentElement : null;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        const rect = current.getBoundingClientRect();
        const targetRect = el ? el.getBoundingClientRect() : null;
        const hasPadding =
          parsePx(style.paddingTop) > 0 ||
          parsePx(style.paddingRight) > 0 ||
          parsePx(style.paddingBottom) > 0 ||
          parsePx(style.paddingLeft) > 0;
        const hasMeasuredBackground = !transparent.has(style.backgroundColor);
        const className = typeof current.className === 'string' ? current.className : '';
        const canContain = !!targetRect && rect.width >= targetRect.width + 20 && rect.height >= targetRect.height;

        if (canContain && (hasMeasuredBackground || hasPadding || className.includes('content-padding'))) {
          return current;
        }
        current = current.parentElement;
      }

      return el && el.parentElement ? el.parentElement : null;
    };

    const heroHeading = Array.from(document.querySelectorAll('h1'))
      .filter((el) => !el.closest('header, footer, nav'))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || null;

    const hero = (function () {
      if (!heroHeading) return null;
      const heroBox = findMeasuredContainer(heroHeading);
      if (!heroBox) return null;

      const headingRect = heroHeading.getBoundingClientRect();
      const boxRect = heroBox.getBoundingClientRect();
      return {
        text: (heroHeading.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 80),
        boxWidth: Math.round(boxRect.width),
        boxHeight: Math.round(boxRect.height),
        headingWidth: Math.round(headingRect.width),
        headingHeight: Math.round(headingRect.height),
        lineCount: lineCount(heroHeading),
      };
    })();

    const headingNodes = Array.from(root.querySelectorAll('h2, h3, h4'))
      .filter((el) => !el.closest('header, footer, nav, section#references'))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const paragraphNodes = Array.from(root.querySelectorAll('p'))
      .filter((el) => !el.closest('header, footer, nav, section#references'))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const caseStudyHeader = (function () {
      if (!heroHeading) return null;

      const titleRect = heroHeading.getBoundingClientRect();
      const clientParagraph = paragraphNodes.find((el) => {
        const text = normalize(el.textContent);
        const rect = el.getBoundingClientRect();
        return text.startsWith('for ') && rect.top >= titleRect.bottom - 4 && rect.top <= titleRect.bottom + 120;
      });
      if (!clientParagraph) return null;

      const clientRect = clientParagraph.getBoundingClientRect();
      return {
        titleText: (heroHeading.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 80),
        titleMarginBottom: Math.round(parsePx(getComputedStyle(heroHeading).marginBottom)),
        titleClientGap: Math.round(clientRect.top - titleRect.bottom),
      };
    })();

    const caseStudyMetadata = (function () {
      const introResultsHeading = headingNodes.find((el) => normalize(el.textContent) === 'results');
      const processHeading = headingNodes.find((el) => normalize(el.textContent) === 'process');
      const timeParagraph = paragraphNodes.find((el) => normalize(el.textContent).startsWith('time:'));
      const tagsParagraph = paragraphNodes.find((el) => normalize(el.textContent).startsWith('tags:'));

      if (!introResultsHeading && !timeParagraph && !tagsParagraph) return null;

      let introResultsBodyBottom = null;
      if (introResultsHeading) {
        const resultsBottom = introResultsHeading.getBoundingClientRect().bottom;
        const introBodyParagraph = paragraphNodes.find((el) => {
          const text = normalize(el.textContent);
          const rect = el.getBoundingClientRect();
          return rect.top >= resultsBottom - 2 && !text.startsWith('time:') && !text.startsWith('tags:');
        });
        if (introBodyParagraph) {
          introResultsBodyBottom = Math.round(introBodyParagraph.getBoundingClientRect().bottom);
        }
      }

      return {
        timeText: timeParagraph ? (timeParagraph.textContent || '').trim().replace(/\\s+/g, ' ') : null,
        tagsText: tagsParagraph ? (tagsParagraph.textContent || '').trim().replace(/\\s+/g, ' ') : null,
        timeTop: timeParagraph ? Math.round(timeParagraph.getBoundingClientRect().top) : null,
        tagsTop: tagsParagraph ? Math.round(tagsParagraph.getBoundingClientRect().top) : null,
        introResultsBodyBottom,
        processTop: processHeading ? Math.round(processHeading.getBoundingClientRect().top) : null,
      };
    })();

    const articleImages = Array.from(root.querySelectorAll('img'))
      .filter((img) => !img.closest('a, section#references, header, footer, nav'))
      .filter((img) => !img.closest('.hero, [class*="hero"]'))
      .map((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.width <= 250 || rect.height <= 150) return null;

        return {
          src: (img.getAttribute('src') || '').split('/').pop().split('?')[0] || 'image',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
        };
      })
      .filter((sample) => sample !== null)
      .sort((a, b) => a.top - b.top)
      .slice(0, 4)
      .map((sample) => ({
        src: sample.src,
        width: sample.width,
        height: sample.height,
      }));

    const cardImages = Array.from(root.querySelectorAll('a'))
      .map((link) => {
        const heading = link.querySelector('h2, h3, h4');
        const img = link.querySelector('img');
        if (!heading || !img) return null;

        const cardRect = link.getBoundingClientRect();
        if (cardRect.width < 500 || cardRect.height < 200) return null;

        const parent = img.parentElement;
        if (!parent) return null;

        const parentRect = parent.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        if (parentRect.width < 250 || parentRect.height < 180 || imgRect.width < 180) return null;

        return {
          title: (heading.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 70),
          parentWidth: Math.round(parentRect.width),
          parentHeight: Math.round(parentRect.height),
          imageWidth: Math.round(imgRect.width),
          imageHeight: Math.round(imgRect.height),
          topOffset: Math.round(imgRect.top - parentRect.top),
          bottomOffset: Math.round(parentRect.bottom - imgRect.bottom),
          rightGap: Math.round(cardRect.right - parentRect.right),
          heightOccupancy: Number((imgRect.height / parentRect.height).toFixed(2)),
        };
      })
      .filter((sample) => sample !== null)
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 6);

    return {
      hero,
      cardImages,
      caseStudyHeader,
      caseStudyMetadata,
      articleImages,
    };
  })()`) as Promise<RenderMetrics>
}

function compareRenderedLayout(label: string, gatsby: RenderMetrics, nextjs: RenderMetrics): Issue[] {
  const issues: Issue[] = []

  if (gatsby.hero && nextjs.hero) {
    const diffs: string[] = []
    const boxWidthDiff = Math.abs(gatsby.hero.boxWidth - nextjs.hero.boxWidth)
    const headingWidthDiff = Math.abs(gatsby.hero.headingWidth - nextjs.hero.headingWidth)
    const headingHeightDiff = Math.abs(gatsby.hero.headingHeight - nextjs.hero.headingHeight)
    const lineCountDiff =
      gatsby.hero.lineCount !== null && nextjs.hero.lineCount !== null
        ? Math.abs(gatsby.hero.lineCount - nextjs.hero.lineCount)
        : 0

    if (boxWidthDiff > 30) diffs.push(`content box width ${gatsby.hero.boxWidth}px -> ${nextjs.hero.boxWidth}px`)
    if (headingWidthDiff > 30) diffs.push(`heading width ${gatsby.hero.headingWidth}px -> ${nextjs.hero.headingWidth}px`)
    if (headingHeightDiff > 12) diffs.push(`heading height ${gatsby.hero.headingHeight}px -> ${nextjs.hero.headingHeight}px`)
    if (lineCountDiff > 0.4) diffs.push(`line wrap ~${gatsby.hero.lineCount} -> ~${nextjs.hero.lineCount} lines`)

    if (diffs.length > 0) {
      const severity: Issue['severity'] =
        boxWidthDiff > 60 || headingHeightDiff > 24 || lineCountDiff > 0.8 ? 'high' : 'medium'
      issues.push({
        severity,
        category: 'HERO_WRAP',
        message: `"${gatsby.hero.text || label}": ${diffs.join('; ')}`,
      })
    }
  }

  if (gatsby.caseStudyHeader && nextjs.caseStudyHeader) {
    const diffs: string[] = []
    const marginDiff = Math.abs(gatsby.caseStudyHeader.titleMarginBottom - nextjs.caseStudyHeader.titleMarginBottom)
    const gapDiff = Math.abs(gatsby.caseStudyHeader.titleClientGap - nextjs.caseStudyHeader.titleClientGap)

    if (marginDiff > 4) {
      diffs.push(`title margin-bottom ${gatsby.caseStudyHeader.titleMarginBottom}px -> ${nextjs.caseStudyHeader.titleMarginBottom}px`)
    }
    if (gapDiff > 4) {
      diffs.push(`title-to-client gap ${gatsby.caseStudyHeader.titleClientGap}px -> ${nextjs.caseStudyHeader.titleClientGap}px`)
    }

    if (diffs.length > 0) {
      issues.push({
        severity: marginDiff > 10 || gapDiff > 10 ? 'high' : 'medium',
        category: 'CASE_STUDY_HEADER_GAP',
        message: `"${gatsby.caseStudyHeader.titleText || label}": ${diffs.join('; ')}`,
      })
    }
  }

  if (gatsby.caseStudyMetadata && nextjs.caseStudyMetadata) {
    const diffs: string[] = []
    const labels: Array<{ name: 'Time' | 'Tags'; gTop: number | null; nTop: number | null }> = [
      { name: 'Time', gTop: gatsby.caseStudyMetadata.timeTop, nTop: nextjs.caseStudyMetadata.timeTop },
      { name: 'Tags', gTop: gatsby.caseStudyMetadata.tagsTop, nTop: nextjs.caseStudyMetadata.tagsTop },
    ]

    for (const entry of labels) {
      const gAfterResults =
        gatsby.caseStudyMetadata.introResultsBodyBottom !== null && entry.gTop !== null
          ? entry.gTop >= gatsby.caseStudyMetadata.introResultsBodyBottom - 4
          : null
      const nAfterResults =
        nextjs.caseStudyMetadata.introResultsBodyBottom !== null && entry.nTop !== null
          ? entry.nTop >= nextjs.caseStudyMetadata.introResultsBodyBottom - 4
          : null
      const gBeforeProcess =
        gatsby.caseStudyMetadata.processTop !== null && entry.gTop !== null
          ? entry.gTop < gatsby.caseStudyMetadata.processTop
          : null
      const nBeforeProcess =
        nextjs.caseStudyMetadata.processTop !== null && entry.nTop !== null
          ? entry.nTop < nextjs.caseStudyMetadata.processTop
          : null

      if (gAfterResults !== null && nAfterResults !== null && gAfterResults !== nAfterResults) {
        diffs.push(`${entry.name} block after intro Results ${gAfterResults ? 'yes' : 'no'} -> ${nAfterResults ? 'yes' : 'no'}`)
      }
      if (gBeforeProcess !== null && nBeforeProcess !== null && gBeforeProcess !== nBeforeProcess) {
        diffs.push(`${entry.name} block before Process ${gBeforeProcess ? 'yes' : 'no'} -> ${nBeforeProcess ? 'yes' : 'no'}`)
      }
    }

    if (diffs.length > 0) {
      issues.push({
        severity: 'high',
        category: 'CASE_STUDY_METADATA_ORDER',
        message: `"${label}": ${diffs.join('; ')}`,
      })
    }
  }

  if (gatsby.articleImages.length !== nextjs.articleImages.length) {
    issues.push({
      severity: 'medium',
      category: 'CASE_STUDY_IMAGE_COUNT',
      message: `"${label}": content image sample count ${gatsby.articleImages.length} -> ${nextjs.articleImages.length}`,
    })
  }

  const articleImageSampleCount = Math.min(gatsby.articleImages.length, nextjs.articleImages.length, 3)
  for (let i = 0; i < articleImageSampleCount; i++) {
    const g = gatsby.articleImages[i]
    const n = nextjs.articleImages[i]
    const widthDiff = Math.abs(g.width - n.width)
    const heightDiff = Math.abs(g.height - n.height)

    if (widthDiff > 40 || heightDiff > 40) {
      issues.push({
        severity: widthDiff > 120 ? 'high' : 'medium',
        category: 'CASE_STUDY_IMAGE_SIZE',
        message: `"${g.src || `image #${i + 1}`}": ${g.width}x${g.height}px -> ${n.width}x${n.height}px`,
      })
    }
  }

  const cardSampleCount = Math.min(gatsby.cardImages.length, nextjs.cardImages.length, 3)
  for (let i = 0; i < cardSampleCount; i++) {
    const g = gatsby.cardImages[i]
    const n = nextjs.cardImages[i]
    const diffs: string[] = []
    const parentWidthDiff = Math.abs(g.parentWidth - n.parentWidth)
    const rightGapDiff = Math.abs(g.rightGap - n.rightGap)
    const occupancyDiff = Math.abs(g.heightOccupancy - n.heightOccupancy)
    const topOffsetDiff = Math.abs(g.topOffset - n.topOffset)
    const bottomOffsetDiff = Math.abs(g.bottomOffset - n.bottomOffset)

    if (parentWidthDiff > 30) diffs.push(`image column width ${g.parentWidth}px -> ${n.parentWidth}px`)
    if (rightGapDiff > 8) diffs.push(`image column right gap ${g.rightGap}px -> ${n.rightGap}px`)
    if (occupancyDiff > 0.12) diffs.push(`image height occupancy ${g.heightOccupancy} -> ${n.heightOccupancy}`)
    if (topOffsetDiff > 20 || bottomOffsetDiff > 20) {
      diffs.push(`vertical padding top/bottom ${g.topOffset}px/${g.bottomOffset}px -> ${n.topOffset}px/${n.bottomOffset}px`)
    }

    if (diffs.length > 0) {
      const severity: Issue['severity'] =
        parentWidthDiff > 50 || rightGapDiff > 16 || occupancyDiff > 0.2 ? 'high' : 'medium'
      issues.push({
        severity,
        category: 'CARD_IMAGE_LAYOUT',
        message: `"${g.title || n.title}": ${diffs.join('; ')}`,
      })
    }
  }

  return issues
}

function compare(label: string, gatsbyHtml: string, nextjsHtml: string): Issue[] {
  const issues: Issue[] = []
  const gatsbyContent = getContentArea(gatsbyHtml)
  const nextContent = getContentArea(nextjsHtml)
  const gatsbyHeadings = extractHeadings(gatsbyContent)
  const nextHeadings = extractHeadings(nextContent)

  for (const nextHeading of nextHeadings) {
    const found = gatsbyHeadings.some((gatsbyHeading) => {
      const gatsbySnippet = normalizeText(gatsbyHeading.text).substring(0, 25)
      const nextSnippet = normalizeText(nextHeading.text).substring(0, 25)
      return gatsbySnippet.includes(nextSnippet) || nextSnippet.includes(gatsbySnippet)
    })

    if (!found && nextHeading.text.length > 3) {
      issues.push({
        severity: 'critical',
        category: 'EXTRA_HEADING',
        message: `<${nextHeading.tag}> "${nextHeading.text}" in Next.js only`,
      })
    }
  }

  for (const gatsbyHeading of gatsbyHeadings) {
    const found = nextHeadings.some((nextHeading) => {
      const gatsbySnippet = normalizeText(gatsbyHeading.text).substring(0, 25)
      const nextSnippet = normalizeText(nextHeading.text).substring(0, 25)
      return gatsbySnippet.includes(nextSnippet) || nextSnippet.includes(gatsbySnippet)
    })

    if (!found && gatsbyHeading.text.length > 3) {
      issues.push({
        severity: 'high',
        category: 'MISSING_HEADING',
        message: `<${gatsbyHeading.tag}> "${gatsbyHeading.text}" in Gatsby only`,
      })
    }
  }

  const counts: Array<[string, number, number, number, 'high' | 'medium']> = [
    ['images', (gatsbyContent.match(/<img\b/gi) || []).length, (nextContent.match(/<img\b/gi) || []).length, 3, 'high'],
    ['videos', (gatsbyContent.match(/<video\b/gi) || []).length, (nextContent.match(/<video\b/gi) || []).length, 1, 'high'],
    ['iframes', (gatsbyContent.match(/<iframe\b/gi) || []).length, (nextContent.match(/<iframe\b/gi) || []).length, 1, 'high'],
    ['lists', (gatsbyContent.match(/<[uo]l\b/gi) || []).length, (nextContent.match(/<[uo]l\b/gi) || []).length, 2, 'medium'],
    ['superscripts', (gatsbyContent.match(/<sup\b/gi) || []).length, (nextContent.match(/<sup\b/gi) || []).length, 3, 'medium'],
    ['quotes', (gatsbyContent.match(/<blockquote\b|class="[^"]*quote[^"]*"/gi) || []).length, (nextContent.match(/<blockquote\b|class="[^"]*quote[^"]*"/gi) || []).length, 1, 'medium'],
  ]

  for (const [name, gatsbyValue, nextValue, threshold, severity] of counts) {
    if (Math.abs(gatsbyValue - nextValue) >= threshold) {
      issues.push({
        severity,
        category: 'COUNT',
        message: `${name}: Gatsby=${gatsbyValue} Next.js=${nextValue}`,
      })
    }
  }

  return issues
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.category}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GoInvo-Compare/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const section = args.find((arg) => arg.startsWith('--section='))?.split('=')[1] ||
    (args.includes('--section') ? args[args.indexOf('--section') + 1] : 'all')

  const pages: Array<{ path: string; label: string }> = []

  if (section === 'all' || section === 'work') {
    for (const slug of CASE_STUDY_SLUGS) {
      pages.push({ path: `/work/${slug}`, label: `work/${slug}` })
    }
  }

  if (section === 'all' || section === 'main') {
    pages.push(...MAIN_PAGES)
  }

  console.log(`\nComparing ${pages.length} ${section} page(s)...\n`)

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const gatsbyPage = await browser.newPage()
  const nextjsPage = await browser.newPage()

  let totalIssues = 0
  let criticalCount = 0
  let cleanPages = 0

  try {
    for (const page of pages) {
      process.stdout.write(`  ${page.label}... `)

      try {
        const gatsbyUrl = pageUrl(GATSBY_BASE_URL, page.path)
        const nextjsUrl = pageUrl(NEXTJS_BASE_URL, page.path)

        const [gatsbyHtml, nextHtml] = await Promise.all([
          fetchPage(gatsbyUrl),
          fetchPage(nextjsUrl),
        ])

        if (!gatsbyHtml) {
          console.log('Gatsby not found')
          continue
        }
        if (!nextHtml) {
          console.log('Next.js unreachable')
          continue
        }

        const [gatsbyMetrics, nextjsMetrics] = await Promise.all([
          measureRenderedLayout(gatsbyPage, gatsbyUrl),
          measureRenderedLayout(nextjsPage, nextjsUrl),
        ])

        const issues = dedupeIssues([
          ...compare(page.label, gatsbyHtml, nextHtml),
          ...compareRenderedLayout(page.label, gatsbyMetrics, nextjsMetrics),
        ])

        totalIssues += issues.length
        criticalCount += issues.filter((issue) => issue.severity === 'critical').length

        if (issues.length === 0) {
          cleanPages++
          console.log('OK')
          continue
        }

        const criticals = issues.filter((issue) => issue.severity === 'critical').length
        const highs = issues.filter((issue) => issue.severity === 'high').length
        console.log(`FAIL ${issues.length} issues (${criticals}C ${highs}H)`)

        for (const issue of issues.filter((item) => item.severity === 'critical' || item.severity === 'high')) {
          const icon = issue.severity === 'critical' ? 'CRIT' : 'HIGH'
          console.log(`     ${icon} [${issue.category}] ${issue.message}`)
        }

        const remaining = issues.filter((issue) => issue.severity !== 'critical' && issue.severity !== 'high').length
        if (remaining > 0) {
          console.log(`     +${remaining} medium/low`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(`ERROR ${message}`)
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\n${'-'.repeat(60)}`)
  console.log(`Pages: ${pages.length} | Clean: ${cleanPages} | Issues: ${totalIssues} (${criticalCount} critical)`)
  console.log()
}

main().catch(console.error)
