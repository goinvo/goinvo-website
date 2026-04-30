/**
 * Batch Page Verification
 *
 * Runs page-tree.ts diff on all pages and reports:
 * - Button variant mismatches (primary vs secondary)
 * - Button position/styling differences
 * - Video autoplay mismatches
 * - Content order mismatches
 * - Element count differences
 * - Heading style differences
 *
 * Usage:
 *   npx tsx scripts/batch-verify.ts                    # all pages
 *   npx tsx scripts/batch-verify.ts --section vision   # vision only
 *   npx tsx scripts/batch-verify.ts --section work     # case studies only
 *   npx tsx scripts/batch-verify.ts --mobile           # mobile viewport only
 *   npx tsx scripts/batch-verify.ts --all-viewports    # desktop then mobile
 *   npx tsx scripts/batch-verify.ts --clear-cache      # discard cached snapshots before running
 *   npx tsx scripts/batch-verify.ts --flush-non-clean  # discard cached snapshots only for pages with prior issues/errors
 *   npx tsx scripts/batch-verify.ts --clear-non-clean  # alias for --flush-non-clean
 *   npx tsx scripts/batch-verify.ts --no-cache         # bypass cache for this run
 */

import fs from 'node:fs'
import path from 'node:path'
import puppeteer, { type Page, type Browser } from 'puppeteer'

interface TreeNode {
  tag: string
  id: string
  classes: string[]
  text: string
  styles: Record<string, string>
  rect: { x: number; y: number; width: number; height: number }
  interactive: string | null
  src: string | null
  children: TreeNode[]
}

// ── Page definitions ──────────────────────────────────────────────────

interface PageDef {
  slug: string
  gatsbyPath: string
  nextPath: string
  section: 'vision' | 'work'
}

const VISION_PAGES: PageDef[] = [
  { slug: 'rethinking-ai-beyond-chat', gatsbyPath: '/vision/rethinking-ai-beyond-chat/', nextPath: '/vision/rethinking-ai-beyond-chat', section: 'vision' },
  { slug: 'human-centered-design-for-ai', gatsbyPath: '/vision/human-centered-design-for-ai/', nextPath: '/vision/human-centered-design-for-ai', section: 'vision' },
  { slug: 'healthcare-dollars-redux', gatsbyPath: '/vision/healthcare-dollars-redux/', nextPath: '/vision/healthcare-dollars-redux', section: 'vision' },
  { slug: 'fraud-waste-abuse-in-healthcare', gatsbyPath: '/vision/fraud-waste-abuse-in-healthcare/', nextPath: '/vision/fraud-waste-abuse-in-healthcare', section: 'vision' },
  { slug: 'history-of-health-design', gatsbyPath: '/vision/history-of-health-design/', nextPath: '/vision/history-of-health-design', section: 'vision' },
  { slug: 'virtual-diabetes-care', gatsbyPath: '/vision/virtual-diabetes-care/', nextPath: '/vision/virtual-diabetes-care', section: 'vision' },
  { slug: 'digital-health-trends-2022', gatsbyPath: '/vision/digital-health-trends-2022/', nextPath: '/vision/digital-health-trends-2022', section: 'vision' },
  { slug: 'faces-in-health-communication', gatsbyPath: '/vision/faces-in-health-communication/', nextPath: '/vision/faces-in-health-communication', section: 'vision' },
  { slug: 'health-design-thinking', gatsbyPath: '/vision/health-design-thinking/', nextPath: '/vision/health-design-thinking', section: 'vision' },
  { slug: 'own-your-health-data', gatsbyPath: '/vision/own-your-health-data/', nextPath: '/vision/own-your-health-data', section: 'vision' },
  { slug: 'precision-autism', gatsbyPath: '/vision/precision-autism/', nextPath: '/vision/precision-autism', section: 'vision' },
  { slug: 'test-treat-trace', gatsbyPath: '/vision/test-treat-trace/', nextPath: '/vision/test-treat-trace', section: 'vision' },
  { slug: 'physician-burnout', gatsbyPath: '/vision/physician-burnout/', nextPath: '/vision/physician-burnout', section: 'vision' },
  { slug: 'vapepocolypse', gatsbyPath: '/vision/vapepocolypse/', nextPath: '/vision/vapepocolypse', section: 'vision' },
  { slug: 'who-uses-my-health-data', gatsbyPath: '/vision/who-uses-my-health-data/', nextPath: '/vision/who-uses-my-health-data', section: 'vision' },
  { slug: 'open-source-healthcare', gatsbyPath: '/vision/open-source-healthcare/', nextPath: '/vision/open-source-healthcare', section: 'vision' },
  { slug: 'national-cancer-navigation', gatsbyPath: '/vision/national-cancer-navigation/', nextPath: '/vision/national-cancer-navigation', section: 'vision' },
  { slug: 'patient-centered-consent', gatsbyPath: '/vision/patient-centered-consent/', nextPath: '/vision/patient-centered-consent', section: 'vision' },
  { slug: 'eligibility-engine', gatsbyPath: '/vision/eligibility-engine/', nextPath: '/vision/eligibility-engine', section: 'vision' },
  { slug: 'ai-design-certification', gatsbyPath: '/vision/ai-design-certification/', nextPath: '/vision/ai-design-certification', section: 'vision' },
  { slug: 'loneliness-in-our-human-code', gatsbyPath: '/vision/loneliness-in-our-human-code/', nextPath: '/vision/loneliness-in-our-human-code', section: 'vision' },
  { slug: 'virtual-care', gatsbyPath: '/vision/virtual-care/', nextPath: '/vision/virtual-care', section: 'vision' },
  { slug: 'healthcare-dollars', gatsbyPath: '/vision/healthcare-dollars/', nextPath: '/vision/healthcare-dollars', section: 'vision' },
  { slug: 'open-pro', gatsbyPath: '/vision/open-pro/', nextPath: '/vision/open-pro', section: 'vision' },
]

const WORK_PAGES: PageDef[] = [
  { slug: 'ipsos-facto', gatsbyPath: '/work/ipsos-facto/', nextPath: '/work/ipsos-facto', section: 'work' },
  { slug: 'prior-auth', gatsbyPath: '/work/prior-auth/', nextPath: '/work/prior-auth', section: 'work' },
  { slug: 'public-sector', gatsbyPath: '/work/public-sector/', nextPath: '/work/public-sector', section: 'work' },
  { slug: 'all-of-us', gatsbyPath: '/work/all-of-us/', nextPath: '/work/all-of-us', section: 'work' },
  { slug: 'mitre-shr', gatsbyPath: '/work/mitre-shr/', nextPath: '/work/mitre-shr', section: 'work' },
  { slug: 'maya-ehr', gatsbyPath: '/work/maya-ehr/', nextPath: '/work/maya-ehr', section: 'work' },
  { slug: 'mass-snap', gatsbyPath: '/work/mass-snap/', nextPath: '/work/mass-snap', section: 'work' },
  { slug: 'national-cancer-navigation', gatsbyPath: '/work/national-cancer-navigation/', nextPath: '/work/national-cancer-navigation', section: 'work' },
  { slug: 'eligibility-engine', gatsbyPath: '/work/eligibility-engine/', nextPath: '/work/eligibility-engine', section: 'work' },
  { slug: 'wuxi-nextcode-familycode', gatsbyPath: '/work/wuxi-nextcode-familycode/', nextPath: '/work/wuxi-nextcode-familycode', section: 'work' },
  { slug: 'augmented-clinical-decision-support', gatsbyPath: '/work/augmented-clinical-decision-support/', nextPath: '/work/augmented-clinical-decision-support', section: 'work' },
  { slug: 'mitre-state-of-us-healthcare', gatsbyPath: '/work/mitre-state-of-us-healthcare/', nextPath: '/work/mitre-state-of-us-healthcare', section: 'work' },
  { slug: '3m-coderyte', gatsbyPath: '/work/3m-coderyte/', nextPath: '/work/3m-coderyte', section: 'work' },
  { slug: 'hgraph', gatsbyPath: '/work/hgraph/', nextPath: '/work/hgraph', section: 'work' },
  { slug: 'partners-insight', gatsbyPath: '/work/partners-insight/', nextPath: '/work/partners-insight', section: 'work' },
  { slug: 'mitre-flux-notes', gatsbyPath: '/work/mitre-flux-notes/', nextPath: '/work/mitre-flux-notes', section: 'work' },
  { slug: 'commonhealth-smart-health-cards', gatsbyPath: '/work/commonhealth-smart-health-cards/', nextPath: '/work/commonhealth-smart-health-cards', section: 'work' },
  { slug: 'fastercures-health-data-basics', gatsbyPath: '/work/fastercures-health-data-basics/', nextPath: '/work/fastercures-health-data-basics', section: 'work' },
  { slug: 'mount-sinai-consent', gatsbyPath: '/work/mount-sinai-consent/', nextPath: '/work/mount-sinai-consent', section: 'work' },
  { slug: 'inspired-ehrs', gatsbyPath: '/work/inspired-ehrs/', nextPath: '/work/inspired-ehrs', section: 'work' },
  { slug: 'ahrq-cds', gatsbyPath: '/work/ahrq-cds/', nextPath: '/work/ahrq-cds', section: 'work' },
  { slug: 'infobionic-heart-monitoring', gatsbyPath: '/work/infobionic-heart-monitoring/', nextPath: '/work/infobionic-heart-monitoring', section: 'work' },
  { slug: 'personal-genome-project-vision', gatsbyPath: '/work/personal-genome-project-vision/', nextPath: '/work/personal-genome-project-vision', section: 'work' },
  { slug: 'healthcare-dollars', gatsbyPath: '/work/healthcare-dollars/', nextPath: '/work/healthcare-dollars', section: 'work' },
  { slug: 'staffplan', gatsbyPath: '/work/staffplan/', nextPath: '/work/staffplan', section: 'work' },
  { slug: 'care-cards', gatsbyPath: '/work/care-cards/', nextPath: '/work/care-cards', section: 'work' },
  { slug: 'virtual-care', gatsbyPath: '/work/virtual-care/', nextPath: '/work/virtual-care', section: 'work' },
  { slug: 'partners-geneinsight', gatsbyPath: '/work/partners-geneinsight/', nextPath: '/work/partners-geneinsight', section: 'work' },
  { slug: 'insidetracker-nutrition-science', gatsbyPath: '/work/insidetracker-nutrition-science/', nextPath: '/work/insidetracker-nutrition-science', section: 'work' },
  { slug: 'paintrackr', gatsbyPath: '/work/paintrackr/', nextPath: '/work/paintrackr', section: 'work' },
  { slug: 'tabeeb-diagnostics', gatsbyPath: '/work/tabeeb-diagnostics/', nextPath: '/work/tabeeb-diagnostics', section: 'work' },
]

// ── Tree extraction ───────────────────────────────────────────────────

async function extractTree(page: Page): Promise<TreeNode> {
  return page.evaluate(`(function() {
    var SKIP_TAGS = ['script','style','link','meta','noscript','br','wbr'];
    var SVG_TAGS = ['svg','path','circle','rect','polygon','g','defs','use'];
    var SKIP_SEL = 'header.site-header, footer.site-footer, nav.site-nav, .header-nav, .mobile-nav, .twenty-eighteen > .header-nav, [data-sanity]';

    function directText(el) {
      var t = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].textContent.trim() + ' ';
      }
      return t.trim().substring(0, 150);
    }

    function build(el) {
      var tag = el.tagName.toLowerCase();
      if (SKIP_TAGS.indexOf(tag) >= 0) return null;
      if (SVG_TAGS.indexOf(tag) >= 0) {
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return { tag:'svg', id:'', classes:[], text:'', styles:{}, rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}, interactive:null, src:null, children:[] };
      }
      if (el.closest(SKIP_SEL)) return null;

      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && tag !== 'img') return null;

      var cs = getComputedStyle(el);
      var cls = (typeof el.className === 'string') ? el.className.trim() : '';

      var children = [];
      for (var i = 0; i < el.children.length; i++) {
        var cn = build(el.children[i]);
        if (cn) children.push(cn);
      }

      var dt = directText(el);

      if (['div','section','article','span','main'].indexOf(tag) >= 0 && !cls && !el.id && !dt) {
        if (children.length === 1) return children[0];
        if (children.length === 0) return null;
      }

      var inter = null;
      if (tag === 'a' && el.hasAttribute('href')) {
        if (cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) > 0) {
          var bgcA = cs.backgroundColor;
          inter = 'button-link:' + (bgcA !== 'rgba(0, 0, 0, 0)' && bgcA !== 'rgb(255, 255, 255)' && bgcA !== 'transparent' ? 'primary' : 'secondary');
        } else {
          inter = 'link';
        }
      }
      else if (tag === 'button') {
        var bgcB = cs.backgroundColor;
        inter = 'button:' + (bgcB !== 'rgba(0, 0, 0, 0)' && bgcB !== 'rgb(255, 255, 255)' && bgcB !== 'transparent' ? 'primary' : 'secondary');
      }
      else if (['input','select','textarea'].indexOf(tag) >= 0) inter = tag;
      else if (el.hasAttribute('onclick')) inter = 'onclick';

      var src = null;
      if (tag === 'img') src = (el.src || '').split('/').pop().split('?')[0];
      else if (tag === 'video') {
        var s = el.querySelector('source');
        src = s ? s.src.split('/').pop() : (el.src ? el.src.split('/').pop().split('?')[0] : 'video');
        if (el.autoplay || el.hasAttribute('autoplay')) inter = 'video:autoplay';
        else inter = 'video:controls';
      }
      else if (tag === 'iframe') src = (el.src || '').substring(0, 80);

      return {
        tag: tag, id: el.id || '', classes: cls ? cls.split(/\\s+/) : [],
        text: dt,
        styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, backgroundColor: cs.backgroundColor, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, position: cs.position, padding: cs.padding, borderWidth: cs.borderWidth, textAlign: cs.textAlign, display: cs.display },
        rect: { x:Math.round(rect.x), y:Math.round(rect.y), width:Math.round(rect.width), height:Math.round(rect.height) },
        interactive: inter, src: src, children: children,
      };
    }

    var root = document.querySelector('main') || document.querySelector('.app__body') || document.body;
    return build(root) || { tag:'empty', id:'', classes:[], text:'', styles:{}, rect:{x:0,y:0,width:0,height:0}, interactive:null, src:null, children:[] };
  })()`) as Promise<TreeNode>
}

// ── Flatten + compare ─────────────────────────────────────────────────

function flatten(node: TreeNode, list: TreeNode[] = []): TreeNode[] {
  list.push(node)
  for (const c of node.children) flatten(c, list)
  return list
}

function normalizeColor(c: string): string {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return c
  const [, r, g, b] = m
  if (r === '0' && g === '0' && b === '0') return c.includes('0)') ? 'transparent' : '#000'
  if (r === '255' && g === '255' && b === '255') return '#fff'
  return `#${(+r).toString(16).padStart(2, '0')}${(+g).toString(16).padStart(2, '0')}${(+b).toString(16).padStart(2, '0')}`
}

interface ContentOrderToken {
  key: string
  label: string
  index: number
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[^\w\s]/g, ' ').trim().toLowerCase()
}

function collectContentOrderTokens(nodes: TreeNode[]): ContentOrderToken[] {
  const orderedTags = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'img', 'video', 'iframe'])

  return nodes
    .filter(n => orderedTags.has(n.tag))
    .map((node): ContentOrderToken | null => {
      if (node.tag === 'img' || node.tag === 'video' || node.tag === 'iframe') {
        if (!isComparableMediaNode(node)) return null
        const source = (node.src || '').trim()
        if (!source) return null
        return { key: `${node.tag}:${source.toLowerCase()}`, label: `<${node.tag}> ${source}`, index: 0 }
      }

      const text = normalizeText(node.text)
      if (text.length < 24) return null
      return {
        key: `${node.tag}:${text.slice(0, 90)}`,
        label: `<${node.tag}> "${node.text.replace(/\s+/g, ' ').slice(0, 60)}"`,
        index: 0,
      }
    })
    .filter((token): token is ContentOrderToken => Boolean(token))
    .map((token, index) => ({ ...token, index }))
}

function isComparableMediaNode(node: TreeNode): boolean {
  if (node.tag === 'video' || node.tag === 'iframe') return node.rect.width > 40 && node.rect.height > 40
  // Gatsby's legacy lazy-image wrappers often leave real content images at
  // 0x0 in the DOM while the visible wrapper carries the layout. Image order is
  // checked with screenshots and rendered-size comparisons instead.
  return false
}

function uniqueOrderTokenMap(tokens: ContentOrderToken[]): Map<string, ContentOrderToken> {
  const counts = new Map<string, number>()
  for (const token of tokens) counts.set(token.key, (counts.get(token.key) || 0) + 1)

  const unique = new Map<string, ContentOrderToken>()
  for (const token of tokens) {
    if (counts.get(token.key) === 1) unique.set(token.key, token)
  }
  return unique
}

function countMediaBetween(nodes: TreeNode[], startIndex: number, endIndex: number): number {
  if (startIndex < 0 || endIndex < 0 || startIndex === endIndex) return 0

  const from = Math.min(startIndex, endIndex) + 1
  const to = Math.max(startIndex, endIndex)
  return nodes
    .slice(from, to)
    .filter(isComparableMediaNode)
    .length
}

function templateBoundaryIndex(nodes: TreeNode[]): number {
  const boundaryText = [
    'authors',
    'author',
    'contributors',
    'subscribe to our newsletter',
    'up next',
    'references',
    'about goinvo',
    'special thanks',
  ]
  const index = nodes.findIndex(node => {
    const text = normalizeText(node.text)
    return ['h2', 'h3', 'h4', 'p'].includes(node.tag) &&
      boundaryText.some(boundary => text === boundary || text.startsWith(`${boundary} `))
  })

  return index >= 0 ? index : nodes.length
}

interface Issue {
  type: 'BUTTON_VARIANT' | 'BUTTON_MISSING' | 'BUTTON_EXTRA' | 'BUTTON_STYLE' | 'VIDEO_AUTOPLAY' | 'VIDEO_COUNT' | 'HEADING_TAG' | 'HEADING_STYLE' | 'ELEMENT_COUNT' | 'CONTENT_MISMATCH' | 'CONTENT_ORDER' | 'EXTRA_CONTENT' | 'SPACING' | 'MOBILE_LAYOUT'
  severity: 'high' | 'medium' | 'low'
  detail: string
}

function compareTrees(a: TreeNode, b: TreeNode): Issue[] {
  const flatA = flatten(a)
  const flatB = flatten(b)
  const issues: Issue[] = []

  // ── Button comparison ────────────────────────────────────────────
  const navLabels = new Set(['work', 'services', 'about', 'vision', 'open design', 'contact'])
  const isBtn = (n: TreeNode) => n.interactive && n.interactive.includes('button') && n.text.length > 2 && n.rect.width > 30 && !navLabels.has(n.text.toLowerCase().trim())
  const aButtons = flatA.filter(isBtn)
  const bButtons = flatB.filter(isBtn)

  for (let i = 0; i < Math.min(aButtons.length, bButtons.length); i++) {
    const ab = aButtons[i], bb = bButtons[i]
    if (ab.interactive !== bb.interactive) {
      issues.push({ type: 'BUTTON_VARIANT', severity: 'high', detail: `"${ab.text || bb.text}": ${ab.interactive} → ${bb.interactive}` })
    }
    if (normalizeColor(ab.styles.backgroundColor || '') !== normalizeColor(bb.styles.backgroundColor || '')) {
      issues.push({ type: 'BUTTON_STYLE', severity: 'medium', detail: `"${ab.text || bb.text}" bg: ${normalizeColor(ab.styles.backgroundColor || '')} → ${normalizeColor(bb.styles.backgroundColor || '')}` })
    }
    // Button padding comparison
    if (ab.styles.padding !== bb.styles.padding) {
      issues.push({ type: 'BUTTON_STYLE', severity: 'medium', detail: `"${ab.text || bb.text}" padding: ${ab.styles.padding} → ${bb.styles.padding}` })
    }
    // Button border comparison
    if (ab.styles.borderWidth !== bb.styles.borderWidth) {
      issues.push({ type: 'BUTTON_STYLE', severity: 'medium', detail: `"${ab.text || bb.text}" border-width: ${ab.styles.borderWidth} → ${bb.styles.borderWidth}` })
    }
    const yDiff = Math.abs(ab.rect.y - bb.rect.y)
    if (yDiff > 100) {
      issues.push({ type: 'BUTTON_STYLE', severity: 'low', detail: `"${ab.text || bb.text}" Y position off by ${yDiff}px` })
    }
  }
  if (aButtons.length > bButtons.length) {
    for (let i = bButtons.length; i < aButtons.length; i++) {
      issues.push({ type: 'BUTTON_MISSING', severity: 'high', detail: `Missing: "${aButtons[i].text}" (${aButtons[i].interactive})` })
    }
  }
  if (bButtons.length > aButtons.length) {
    for (let i = aButtons.length; i < bButtons.length; i++) {
      issues.push({ type: 'BUTTON_EXTRA', severity: 'medium', detail: `Extra: "${bButtons[i].text}" (${bButtons[i].interactive})` })
    }
  }

  // ── Video autoplay ───────────────────────────────────────────────
  const aVideos = flatA.filter(n => n.tag === 'video')
  const bVideos = flatB.filter(n => n.tag === 'video')
  if (aVideos.length !== bVideos.length) {
    issues.push({ type: 'VIDEO_COUNT', severity: 'high', detail: `Video count: ${aVideos.length} → ${bVideos.length}` })
  }
  for (let i = 0; i < Math.min(aVideos.length, bVideos.length); i++) {
    if (aVideos[i].interactive !== bVideos[i].interactive) {
      issues.push({ type: 'VIDEO_AUTOPLAY', severity: 'high', detail: `"${aVideos[i].src || bVideos[i].src}": ${aVideos[i].interactive} → ${bVideos[i].interactive}` })
    }
  }

  // ── Background section comparison ───────────────────────────────
  // Detect colored background sections on Gatsby that are missing on Next.js
  const hasBg = (n: TreeNode) => {
    const bg = normalizeColor(n.styles.backgroundColor || '')
    return bg !== 'transparent' && bg !== '#fff' && bg !== '#000' && bg.length > 3
  }
  const aBgSections = flatA.filter(n => hasBg(n) && n.rect.width > 500 && n.rect.height > 100 && n.rect.y > 300)
  const bBgSections = flatB.filter(n => hasBg(n) && n.rect.width > 500 && n.rect.height > 100 && n.rect.y > 300)
  if (aBgSections.length > bBgSections.length + 2) {
    issues.push({ type: 'ELEMENT_COUNT', severity: 'medium', detail: `Background sections: ${aBgSections.length} on Gatsby → ${bBgSections.length} on Next.js (missing colored bg)` })
  }

  // ── Image column placement comparison ────────────────────────────
  // Content order comparison
  const contentFlatA = flatA.slice(0, templateBoundaryIndex(flatA))
  const contentFlatB = flatB.slice(0, templateBoundaryIndex(flatB))
  const aOrder = collectContentOrderTokens(contentFlatA)
  const bOrder = collectContentOrderTokens(contentFlatB)
  const aOrderByKey = uniqueOrderTokenMap(aOrder)
  const bOrderByKey = uniqueOrderTokenMap(bOrder)
  const sharedOrder = aOrder.filter(token => aOrderByKey.has(token.key) && bOrderByKey.has(token.key))
  let lastBToken: ContentOrderToken | null = null
  let orderIssues = 0
  for (const aToken of sharedOrder) {
    const bToken = bOrderByKey.get(aToken.key)
    if (!bToken) continue

    if (lastBToken && bToken.index < lastBToken.index) {
      orderIssues += 1
      if (orderIssues <= 5) {
        issues.push({
          type: 'CONTENT_ORDER',
          severity: 'high',
          detail: `${bToken.label} appears before ${lastBToken.label} on Next.js, but after it on Gatsby`,
        })
      }
      continue
    }

    lastBToken = bToken
  }

  const orderTextTags = new Set(['h1', 'h2', 'h3', 'h4', 'p'])
  const aTextOrder = contentFlatA
    .map((node, index) => ({ node, index, key: `${node.tag}:${normalizeText(node.text).slice(0, 90)}` }))
    .filter(item => orderTextTags.has(item.node.tag) && normalizeText(item.node.text).length >= 24)
  const bTextOrder = contentFlatB
    .map((node, index) => ({ node, index, key: `${node.tag}:${normalizeText(node.text).slice(0, 90)}` }))
    .filter(item => orderTextTags.has(item.node.tag) && normalizeText(item.node.text).length >= 24)
  const aTextCounts = new Map<string, number>()
  const bTextCounts = new Map<string, number>()
  for (const item of aTextOrder) aTextCounts.set(item.key, (aTextCounts.get(item.key) || 0) + 1)
  for (const item of bTextOrder) bTextCounts.set(item.key, (bTextCounts.get(item.key) || 0) + 1)
  const bTextByKey = new Map(bTextOrder.filter(item => bTextCounts.get(item.key) === 1).map(item => [item.key, item]))
  const sharedTextOrder = aTextOrder.filter(item => aTextCounts.get(item.key) === 1 && bTextByKey.has(item.key))

  for (let index = 1; index < sharedTextOrder.length; index += 1) {
    const previousA = sharedTextOrder[index - 1]
    const currentA = sharedTextOrder[index]
    const previousB = bTextByKey.get(previousA.key)
    const currentB = bTextByKey.get(currentA.key)
    if (!previousB || !currentB) continue

    const aMediaBetween = countMediaBetween(contentFlatA, previousA.index, currentA.index)
    const bMediaBetween = countMediaBetween(contentFlatB, previousB.index, currentB.index)
    if (aMediaBetween !== bMediaBetween) {
      issues.push({
        type: 'CONTENT_ORDER',
        severity: 'high',
        detail: `Media between "${previousA.node.text.slice(0, 38)}" and "${currentA.node.text.slice(0, 38)}": Gatsby ${aMediaBetween}, Next.js ${bMediaBetween}`,
      })
    }
  }

  // Detect images that are standalone on Gatsby but in a grid on Next.js (or vice versa)
  // Filter: skip hero (y < 300), unloaded (height 0), author headshots (width < 400 AND y > 80% of page)
  const filterContentImgs = (nodes: TreeNode[]) => {
    const maxY = Math.max(...nodes.map(n => n.rect.y), 1)
    return nodes.filter(n =>
      n.tag === 'img' && n.rect.width > 100 && n.rect.height > 10 && n.rect.y > 300 &&
      !(n.rect.width < 400 && n.rect.y > maxY * 0.75) // Skip author headshots near bottom
    )
  }
  const aImgs = filterContentImgs(flatA)
  const bImgs = filterContentImgs(flatB)
  const imgWidthMismatches = Math.min(aImgs.length, bImgs.length, 8)
  for (let i = 0; i < imgWidthMismatches; i++) {
    const wDiff = Math.abs(aImgs[i].rect.width - bImgs[i].rect.width)
    if (wDiff > 150) {
      // Large width difference suggests wrong column placement
      const aInGrid = aImgs[i].rect.width < 400
      const bInGrid = bImgs[i].rect.width < 400
      if (aInGrid !== bInGrid) {
        issues.push({ type: 'ELEMENT_COUNT', severity: 'medium', detail: `Image ${i + 1} layout: ${aInGrid ? 'in grid' : 'standalone'} (${aImgs[i].rect.width}px) → ${bInGrid ? 'in grid' : 'standalone'} (${bImgs[i].rect.width}px)` })
      }
    }
  }

  // ── Grid layout count comparison ────────────────────────────────
  // Detect when Next.js has side-by-side grids that Gatsby doesn't (wrong column layouts)
  const aGrids = flatA.filter(n => n.styles.display === 'grid' || n.styles.display === 'flex')
    .filter(n => n.children.length >= 2 && n.rect.width > 400 && n.rect.y > 300)
  const bGrids = flatB.filter(n => n.styles.display === 'grid' || n.styles.display === 'flex')
    .filter(n => n.children.length >= 2 && n.rect.width > 400 && n.rect.y > 300)
  if (bGrids.length > aGrids.length + 3) {
    issues.push({ type: 'ELEMENT_COUNT', severity: 'medium', detail: `Grid layouts: ${aGrids.length} on Gatsby → ${bGrids.length} on Next.js (possible side-by-side vs stacked mismatch)` })
  }

  // ── Button position relative to media ───────────────────────────
  // Check if buttons move from before to after a video/iframe
  for (let i = 0; i < Math.min(aButtons.length, bButtons.length); i++) {
    const ab = aButtons[i], bb = bButtons[i]
    for (const mediaTag of ['video', 'iframe']) {
      const aMedia = flatA.filter(n => n.tag === mediaTag)
      const bMedia = flatB.filter(n => n.tag === mediaTag)
      for (let m = 0; m < Math.min(aMedia.length, bMedia.length); m++) {
        const aBefore = ab.rect.y < aMedia[m].rect.y
        const bBefore = bb.rect.y < bMedia[m].rect.y
        if (aBefore !== bBefore) {
          issues.push({ type: 'BUTTON_STYLE', severity: 'medium', detail: `"${(ab.text || '').substring(0, 25)}" is ${aBefore ? 'before' : 'after'} ${mediaTag} on Gatsby but ${bBefore ? 'before' : 'after'} on Next.js` })
        }
      }
    }
  }

  // ── Heading comparison (text-based matching, not index-based) ────
  const hTags = new Set(['h1', 'h2', 'h3', 'h4'])
  const aH = flatA.filter(n => hTags.has(n.tag))
  const bH = flatB.filter(n => hTags.has(n.tag))
  const normH = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[\u201c\u201d\u2018\u2019\u0027\u2032\u0060]/g, "'").replace(/"/g, "'").trim()
  // Build a map of normalized text → tag for side A
  const aHMap = new Map<string, string>()
  for (const h of aH) { const k = normH(h.text); if (k.length > 5) aHMap.set(k, h.tag) }
  // Check B headings against A by text match
  for (const bNode of bH) {
    const k = normH(bNode.text)
    if (k.length <= 5) continue
    const aTag = aHMap.get(k)
    if (aTag && aTag !== bNode.tag) {
      // Skip template headings (these are rendered by code, not content)
      const skip = ['authors', 'author', 'contributors', 'subscribe to our newsletter', 'references', 'up next', 'about goinvo', 'special thanks to...', 'thank you for the feedback from...', 'problem', 'solution', 'results']
      if (!skip.includes(k)) {
        // h1→h2 is intentional (SEO: only one h1 per page) — demote to LOW
        const sev = (aTag === 'h1' && bNode.tag === 'h2') ? 'low' : 'medium'
        issues.push({ type: 'HEADING_TAG', severity: sev as 'medium' | 'low', detail: `"${bNode.text.substring(0, 40)}": <${aTag}> → <${bNode.tag}>` })
      }
    }
  }
  // Font size comparison — only for matched headings
  for (const bNode of bH) {
    const k = normH(bNode.text)
    const aNode = aH.find(a => normH(a.text) === k)
    if (aNode && aNode.styles.fontSize !== bNode.styles.fontSize) {
      const aSize = parseFloat(aNode.styles.fontSize)
      const bSize = parseFloat(bNode.styles.fontSize)
      const sizeDiff = Math.abs(aSize - bSize)
      issues.push({ type: 'HEADING_STYLE', severity: sizeDiff > 4 ? 'medium' : 'low', detail: `"${bNode.text.substring(0, 40)}": size ${aNode.styles.fontSize} → ${bNode.styles.fontSize}` })
    }
    // Text alignment comparison (catches centered vs left-aligned headings)
    if (aNode && aNode.styles.textAlign !== bNode.styles.textAlign && (aNode.styles.textAlign === 'center' || bNode.styles.textAlign === 'center')) {
      issues.push({ type: 'HEADING_STYLE', severity: 'medium', detail: `"${bNode.text.substring(0, 40)}": align ${aNode.styles.textAlign} → ${bNode.styles.textAlign}` })
    }
  }

  // ── Element count diffs ──────────────────────────────────────────
  const countA: Record<string, number> = {}
  const countB: Record<string, number> = {}
  for (const n of flatA) countA[n.tag] = (countA[n.tag] || 0) + 1
  for (const n of flatB) countB[n.tag] = (countB[n.tag] || 0) + 1
  for (const tag of ['img', 'iframe', 'video', 'blockquote', 'sup']) {
    const a = countA[tag] || 0
    const b = countB[tag] || 0
    const diff = Math.abs(a - b)
    if (diff > 0) {
      issues.push({ type: 'ELEMENT_COUNT', severity: diff > 3 ? 'medium' : 'low', detail: `<${tag}>: ${a} → ${b} (${b - a > 0 ? '+' : ''}${b - a})` })
    }
  }

  // ── Content link count comparison ──────────────────────────────────
  // Count non-nav, non-button links (text links, PDF links, etc.)
  const isContentLink = (n: TreeNode) => n.interactive === 'link' && n.text.length > 3 && n.rect.y > 300
  const aLinks = flatA.filter(isContentLink).length
  const bLinks = flatB.filter(isContentLink).length
  if (aLinks > bLinks + 3) {
    issues.push({ type: 'ELEMENT_COUNT', severity: 'medium', detail: `Content links: ${aLinks} → ${bLinks} (missing ${aLinks - bLinks} links)` })
  }

  // ── Content text comparison ─────────────────────────────────────
  // Check headings by text to find content from wrong pages
  // Normalize: lowercase, collapse whitespace, trim
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[\u201c\u201d\u2018\u2019\u0027\u2032\u0060]/g, "'").replace(/"/g, "'").trim()
  const aHTexts = new Set(aH.map(n => norm(n.text)).filter(t => t.length > 10))
  const bHTexts = new Set(bH.map(n => norm(n.text)).filter(t => t.length > 10))
  // Headings in B that don't exist in A = potentially wrong content
  // Get the page title (h1) to exclude from comparison — both sides render it
  const bH1Text = bH.find(n => n.tag === 'h1')?.text || ''
  const bH1Norm = norm(bH1Text)
  for (const bText of bHTexts) {
    if (!aHTexts.has(bText)) {
      // Skip template headings and the page title (h1)
      const templateHeadings = ['authors', 'author', 'contributors', 'subscribe to our newsletter', 'references', 'up next', 'about goinvo', 'special thanks to...']
      if (templateHeadings.includes(bText)) continue
      // Skip if it matches the page h1 title (rendered by template, may not be in Gatsby's extractable tree)
      if (bText === bH1Norm) continue
      issues.push({ type: 'EXTRA_CONTENT', severity: 'high', detail: `Heading not in Gatsby: "${bText.substring(0, 50)}"` })
    }
  }
  // Headings in A that don't exist in B = missing content
  for (const aText of aHTexts) {
    if (!bHTexts.has(aText)) {
      const templateHeadings = ['authors', 'author', 'contributors', 'subscribe to our newsletter', 'references', 'up next', 'about goinvo']
      if (!templateHeadings.includes(aText)) {
        issues.push({ type: 'CONTENT_MISMATCH', severity: 'medium', detail: `Heading missing from Next.js: "${aText.substring(0, 50)}"` })
      }
    }
  }

  return issues
}

// ── Self-audit (Next.js only, no Gatsby reference needed) ─────────────

function selfAuditTree(tree: TreeNode): Issue[] {
  const issues: Issue[] = []
  const flat = flatten(tree)
  const headings = flat.filter(n => /^h[1-6]$/.test(n.tag))

  // Detect consecutive h3 headings (4+) that look like a bullet list
  // These should likely be h4Bullet (orange diamond) not h3 (uppercase sans)
  // Exclude standard case study sections (Problem/Solution/Results) which are correctly h3
  const standardH3 = new Set(['problem', 'solution', 'results', 'outcome', 'process', 'background', 'approach', 'impact', 'challenge', 'authors', 'contributors', 'references'])
  let consecutiveH3 = 0
  let firstH3Text = ''
  for (const h of headings) {
    const isOrangeH3 = h.styles.color?.includes('227') || h.styles.color?.includes('rgb(227')
    if (h.tag === 'h3' && h.styles.textTransform === 'uppercase' && !standardH3.has(h.text.toLowerCase().trim()) && !isOrangeH3) {
      if (consecutiveH3 === 0) firstH3Text = h.text
      consecutiveH3++
    } else {
      if (consecutiveH3 >= 4) {
        issues.push({
          type: 'HEADING_STYLE',
          severity: 'medium',
          detail: `${consecutiveH3} consecutive uppercase h3 starting at "${firstH3Text.substring(0, 40)}" — may need h4Bullet (orange ◆) style instead`
        })
      }
      consecutiveH3 = 0
    }
  }
  if (consecutiveH3 >= 4) {
    issues.push({
      type: 'HEADING_STYLE',
      severity: 'medium',
      detail: `${consecutiveH3} consecutive uppercase h3 starting at "${firstH3Text.substring(0, 40)}" — may need h4Bullet (orange ◆) style instead`
    })
  }

  // Detect headings with no content between them (empty sections)
  for (let i = 0; i < headings.length - 1; i++) {
    const a = headings[i], b = headings[i + 1]
    const gap = b.rect.y - (a.rect.y + a.rect.height)
    if (gap < 5 && a.tag <= b.tag) {
      issues.push({
        type: 'SPACING',
        severity: 'low',
        detail: `Adjacent headings with no content: "${a.text.substring(0, 30)}" → "${b.text.substring(0, 30)}"`
      })
    }
  }

  return issues
}

function formatOverflowElement(el: OverflowElementSnapshot): string {
  const name = el.text || el.classes || el.tag
  return `<${el.tag}> "${name.substring(0, 36)}" ${el.width}px wide (${el.left}-${el.right})`
}

function formatTapTarget(target: TapTargetSnapshot): string {
  const label = target.label || target.tag
  return `"${label.substring(0, 32)}" ${target.width}x${target.height}px`
}

function tapTargetKey(target: TapTargetSnapshot): string {
  return `${target.tag}:${(target.label || '').replace(/\s+/g, ' ').trim().toLowerCase()}`
}

function auditMobileLayout(gatsbySnapshot: PageSnapshot, nextSnapshot: PageSnapshot): Issue[] {
  const issues: Issue[] = []
  const gatsbyMetrics = gatsbySnapshot.viewportMetrics
  const nextMetrics = nextSnapshot.viewportMetrics
  const nextOverflow = Math.max(0, nextMetrics.documentWidth - nextMetrics.viewportWidth)
  const gatsbyOverflow = Math.max(0, gatsbyMetrics.documentWidth - gatsbyMetrics.viewportWidth)

  if (nextOverflow > 3) {
    const likely = nextMetrics.overflowElements.slice(0, 3).map(formatOverflowElement).join('; ')
    const detail = `Horizontal overflow: Next.js document ${nextMetrics.documentWidth}px on ${nextMetrics.viewportWidth}px viewport (${nextOverflow}px overflow); Gatsby overflow ${gatsbyOverflow}px${likely ? `. Likely: ${likely}` : ''}`
    issues.push({
      type: 'MOBILE_LAYOUT',
      severity: nextOverflow > gatsbyOverflow + 3 ? 'high' : 'medium',
      detail,
    })
  }

  const gatsbyTapTargets = new Map(gatsbyMetrics.smallTapTargets.map(target => [tapTargetKey(target), target]))
  const regressedTapTargets = nextMetrics.smallTapTargets.filter(target => {
    const gatsbyTarget = gatsbyTapTargets.get(tapTargetKey(target))
    if (!gatsbyTarget) return false
    return target.width < gatsbyTarget.width - 3 || target.height < gatsbyTarget.height - 3
  })

  if (regressedTapTargets.length > 0) {
    issues.push({
      type: 'MOBILE_LAYOUT',
      severity: 'low',
      detail: `Smaller mobile tap targets than Gatsby: ${regressedTapTargets.slice(0, 4).map(formatTapTarget).join('; ')}`,
    })
  }

  return issues
}

// Cache page snapshots so long verification runs can resume.

type CaptureTarget = 'gatsby' | 'next'
type ViewportName = 'desktop' | 'mobile'

interface GridSnapshot {
  kids: number
  cols: number
  kidW: number
}

interface OverflowElementSnapshot {
  tag: string
  text: string
  classes: string
  width: number
  left: number
  right: number
  y: number
}

interface TapTargetSnapshot {
  tag: string
  label: string
  width: number
  height: number
  y: number
}

interface ViewportMetricsSnapshot {
  viewportWidth: number
  documentWidth: number
  overflowElements: OverflowElementSnapshot[]
  smallTapTargets: TapTargetSnapshot[]
}

interface PageSnapshot {
  cacheVersion: string
  capturedAt: string
  target: CaptureTarget
  url: string
  viewport: string
  tree: TreeNode
  supCount: number
  grids: GridSnapshot[]
  viewportMetrics: ViewportMetricsSnapshot
}

interface BatchResult {
  slug: string
  section: string
  issues: Issue[]
  error?: string
}

interface BatchResultsFile {
  cacheVersion?: string
  viewport?: string
  sectionFilter?: string | null
  results?: BatchResult[]
}

interface CacheStats {
  hits: number
  misses: number
  writes: number
}

const CACHE_VERSION = 'batch-verify-snapshot-v3'

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag)
  if (index === -1) return null
  const value = args[index + 1]
  return value && !value.startsWith('--') ? value : null
}

function cacheFileFor(cacheDir: string, viewport: string, pd: PageDef, target: CaptureTarget): string {
  return path.join(cacheDir, viewport, `${pd.section}__${pd.slug}__${target}.json`)
}

function readSnapshotCache(file: string, url: string, viewport: string, target: CaptureTarget): PageSnapshot | null {
  if (!fs.existsSync(file)) return null

  try {
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as PageSnapshot
    if (
      snapshot.cacheVersion !== CACHE_VERSION ||
      snapshot.url !== url ||
      snapshot.viewport !== viewport ||
      snapshot.target !== target ||
      !snapshot.tree ||
      !snapshot.viewportMetrics
    ) {
      return null
    }
    return snapshot
  } catch {
    return null
  }
}

function writeSnapshotCache(file: string, snapshot: PageSnapshot): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
}

function writeResultsFile(
  file: string,
  results: BatchResult[],
  pages: PageDef[],
  options: { cacheVersion: string; viewport: string; sectionFilter: string | null }
): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({
    ...options,
    generatedAt: new Date().toISOString(),
    pagesExpected: pages.length,
    pagesChecked: results.length,
    results,
  }, null, 2))
}

function removeCachedSnapshotsForPage(cacheDir: string, viewport: string, pd: PageDef): number {
  let removed = 0
  const targets: CaptureTarget[] = ['gatsby', 'next']
  for (const target of targets) {
    const file = cacheFileFor(cacheDir, viewport, pd, target)
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true })
      removed += 1
    }
  }
  return removed
}

function flushNonCleanCachedSnapshots(resultsFile: string, cacheDir: string, viewport: string, pages: PageDef[]): void {
  if (!fs.existsSync(resultsFile)) {
    throw new Error(`Cannot flush non-clean cache without a previous results file: ${resultsFile}`)
  }

  const prior = JSON.parse(fs.readFileSync(resultsFile, 'utf8')) as BatchResultsFile
  if (!Array.isArray(prior.results)) {
    throw new Error(`Previous results file is missing a results array: ${resultsFile}`)
  }

  const pagesByKey = new Map(pages.map(page => [`${page.section}/${page.slug}`, page]))
  let dirtyPages = 0
  let removedSnapshots = 0

  for (const result of prior.results) {
    if (!result.error && result.issues.length === 0) continue

    dirtyPages += 1
    const page = pagesByKey.get(`${result.section}/${result.slug}`)
    if (!page) continue

    removedSnapshots += removeCachedSnapshotsForPage(cacheDir, viewport, page)
  }

  console.error(`Flushed non-clean cache: ${dirtyPages} pages, ${removedSnapshots} snapshots removed`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function capturePageSnapshot(
  page: Page,
  url: string,
  target: CaptureTarget,
  viewport: string,
  timeoutMs: number
): Promise<PageSnapshot> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await sleep(1000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(300)

  const tree = await extractTree(page)
  const supCount = await page.evaluate(() => {
    const root = document.querySelector('main') || document.querySelector('.app__body') || document.body
    return root.querySelectorAll('sup').length
  })
  const gridSelector = target === 'gatsby' ? '[class*=grid],[style*=grid]' : '[class*=grid]'
  const grids = await page.evaluate((selector) => {
    const root = document.querySelector('main') || document.querySelector('.app__body') || document.body
    return Array.from(root.querySelectorAll(selector)).filter(el => {
      const cs = getComputedStyle(el)
      return cs.display === 'grid' && el.children.length >= 4
    }).map(el => ({
      kids: el.children.length,
      cols: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      kidW: Math.round(el.children[0].getBoundingClientRect().width),
    }))
  }, gridSelector)
  const viewportMetrics = await page.evaluate(`(function() {
    var root = document.querySelector('main') || document.querySelector('.app__body') || document.body;
    var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    var documentWidth = Math.ceil(Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      root.scrollWidth
    ));
    var leeway = 3;

    function classSummary(el) {
      var className = typeof el.className === 'string' ? el.className.trim() : '';
      return className ? className.split(/\\s+/).slice(0, 4).join('.') : '';
    }

    function textSummary(el) {
      var aria = el.getAttribute('aria-label') || el.getAttribute('alt') || '';
      var direct = Array.from(el.childNodes)
        .filter(function(node) { return node.nodeType === 3; })
        .map(function(node) { return node.textContent || ''; })
        .join(' ');
      return (aria || direct || (el.textContent || ''))
        .replace(/\\s+/g, ' ')
        .trim()
        .slice(0, 60);
    }

    function isVisibleElement(el, rect) {
      if (rect.width < 2 || rect.height < 2) return false;
      if (rect.left < -1000 || rect.top < -1000) return false;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      if (cs.position === 'fixed') return false;
      return true;
    }

    var overflowElements = Array.from(root.querySelectorAll('*'))
      .map(function(el) { return { el: el, rect: el.getBoundingClientRect() }; })
      .filter(function(item) {
        return isVisibleElement(item.el, item.rect) && (item.rect.left < -leeway || item.rect.right > viewportWidth + leeway);
      })
      .slice(0, 8)
      .map(function(item) {
        return {
          tag: item.el.tagName.toLowerCase(),
          text: textSummary(item.el),
          classes: classSummary(item.el),
          width: Math.round(item.rect.width),
          left: Math.round(item.rect.left),
          right: Math.round(item.rect.right),
          y: Math.round(item.rect.y),
        };
      });

    var smallTapTargets = Array.from(root.querySelectorAll('a,button,input,select,textarea,[role="button"]'))
      .map(function(el) {
        var rect = el.getBoundingClientRect();
        var cs = getComputedStyle(el);
        var tag = el.tagName.toLowerCase();
        var role = el.getAttribute('role') || '';
        var classes = classSummary(el);
        var isButtonLike = tag !== 'a' ||
          role === 'button' ||
          /\\b(btn|button)\\b/i.test(classes) ||
          (cs.display !== 'inline' && cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing || '0') > 0.5);

        return {
          el: el,
          rect: rect,
          isButtonLike: isButtonLike,
          tag: tag,
          label: textSummary(el),
        };
      })
      .filter(function(item) {
        return item.isButtonLike && isVisibleElement(item.el, item.rect) && (item.rect.width < 44 || item.rect.height < 44);
      })
      .slice(0, 8)
      .map(function(item) {
        return {
          tag: item.tag,
          label: item.label,
          width: Math.round(item.rect.width),
          height: Math.round(item.rect.height),
          y: Math.round(item.rect.y),
        };
      });

    return { viewportWidth: viewportWidth, documentWidth: documentWidth, overflowElements: overflowElements, smallTapTargets: smallTapTargets };
  })()`) as ViewportMetricsSnapshot

  return {
    cacheVersion: CACHE_VERSION,
    capturedAt: new Date().toISOString(),
    target,
    url,
    viewport,
    tree,
    supCount,
    grids,
    viewportMetrics,
  }
}

async function getPageSnapshot(
  page: Page,
  pd: PageDef,
  target: CaptureTarget,
  url: string,
  options: { cacheDir: string; enabled: boolean; viewport: string; timeoutMs: number; stats: CacheStats }
): Promise<PageSnapshot> {
  const file = cacheFileFor(options.cacheDir, options.viewport, pd, target)

  if (options.enabled) {
    const cached = readSnapshotCache(file, url, options.viewport, target)
    if (cached) {
      options.stats.hits += 1
      return cached
    }
  }

  options.stats.misses += 1
  const snapshot = await capturePageSnapshot(page, url, target, options.viewport, options.timeoutMs)

  if (options.enabled) {
    writeSnapshotCache(file, snapshot)
    options.stats.writes += 1
  }

  return snapshot
}

// ── Main ──────────────────────────────────────────────────────────────

async function runBatch(args: string[], viewport: ViewportName) {
  const sectionFilter = getArgValue(args, '--section')
  const mobile = viewport === 'mobile'
  const timeoutMs = Number(getArgValue(args, '--timeout-ms') || 60000)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid --timeout-ms value: ${getArgValue(args, '--timeout-ms')}`)
  }
  if (sectionFilter && sectionFilter !== 'vision' && sectionFilter !== 'work') {
    throw new Error(`Invalid --section value "${sectionFilter}". Expected "vision" or "work".`)
  }

  let pages: PageDef[] = []
  if (!sectionFilter || sectionFilter === 'vision') pages.push(...VISION_PAGES)
  if (!sectionFilter || sectionFilter === 'work') pages.push(...WORK_PAGES)
  if (pages.length === 0) throw new Error('No pages selected for batch verification.')

  const cacheDir = path.resolve(getArgValue(args, '--cache-dir') || path.join('.audit', 'batch-verify-cache'))
  const useCache = !args.includes('--no-cache')
  const resultsFile = path.join(cacheDir, `last-results-${viewport}-${sectionFilter || 'all'}.json`)
  const flushNonClean = args.includes('--flush-non-clean') || args.includes('--clear-non-clean')

  if (args.includes('--clear-cache') && flushNonClean) {
    throw new Error('Use either --clear-cache or --flush-non-clean, not both.')
  }
  if (args.includes('--clear-cache')) {
    fs.rmSync(cacheDir, { recursive: true, force: true })
    console.error(`Cleared cache: ${cacheDir}`)
  }
  if (flushNonClean) {
    flushNonCleanCachedSnapshots(resultsFile, cacheDir, viewport, pages)
  }

  const cacheStats: CacheStats = { hits: 0, misses: 0, writes: 0 }

  const gatsbyBase = 'https://www.goinvo.com'
  const nextBase = 'http://localhost:3000'

  console.error(`Cache: ${useCache ? 'enabled' : 'disabled'} (${cacheDir})`)
  console.error(`Navigation timeout: ${timeoutMs}ms`)

  const browser: Browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  // Desktop uses 1280x900; mobile uses 375x812 (iPhone 13).
  if (mobile) {
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    console.error(`Running in MOBILE mode (375×812)`)
  } else {
    await page.setViewport({ width: 1280, height: 900 })
    console.error('Running in DESKTOP mode (1280x900)')
  }

  const results: BatchResult[] = []

  for (const pd of pages) {
    const gatsbyUrl = `${gatsbyBase}${pd.gatsbyPath}`
    const nextUrl = `${nextBase}${pd.nextPath}`

    process.stderr.write(`[${results.length + 1}/${pages.length}] ${pd.slug}...`)
    try {
      const snapshotOptions = { cacheDir, enabled: useCache, viewport, timeoutMs, stats: cacheStats }
      const gatsbySnapshot = await getPageSnapshot(page, pd, 'gatsby', gatsbyUrl, snapshotOptions)
      const nextSnapshot = await getPageSnapshot(page, pd, 'next', nextUrl, snapshotOptions)

      const issues = compareTrees(gatsbySnapshot.tree, nextSnapshot.tree)

      const supsA = gatsbySnapshot.supCount
      const supsB = nextSnapshot.supCount
      if (supsA > supsB + 1) {
        issues.push({ type: 'ELEMENT_COUNT', severity: 'medium', detail: `<sup>: ${supsA} → ${supsB} (missing ${supsA - supsB})` })
      }

      const gridsA = gatsbySnapshot.grids
      const gridsB = nextSnapshot.grids
      // Compare grids with same item count
      for (const gA of gridsA) {
        const gB = gridsB.find(g => g.kids === gA.kids)
        if (gB && gA.cols !== gB.cols) {
          issues.push({ type: 'ELEMENT_COUNT', severity: 'high', detail: `Grid ${gA.kids} items: ${gA.cols} cols → ${gB.cols} cols (width ${gA.kidW}px → ${gB.kidW}px)` })
        }
      }

      // Self-audit: style consistency checks on Next.js page alone
      issues.push(...selfAuditTree(nextSnapshot.tree))
      if (viewport === 'mobile') {
        issues.push(...auditMobileLayout(gatsbySnapshot, nextSnapshot))
      }

      results.push({ slug: pd.slug, section: pd.section, issues })
      writeResultsFile(resultsFile, results, pages, { cacheVersion: CACHE_VERSION, viewport, sectionFilter })

      const high = issues.filter(i => i.severity === 'high').length
      const med = issues.filter(i => i.severity === 'medium').length
      process.stderr.write(` ${high}H ${med}M ${issues.length - high - med}L\n`)
    } catch (err: any) {
      results.push({ slug: pd.slug, section: pd.section, issues: [], error: (err?.message || String(err)).substring(0, 160) })
      writeResultsFile(resultsFile, results, pages, { cacheVersion: CACHE_VERSION, viewport, sectionFilter })
      process.stderr.write(` ERROR\n`)
    }
  }

  await browser.close()
  console.error(`Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses, ${cacheStats.writes} writes`)
  console.error(`Incremental results: ${resultsFile}`)

  // ── Report ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log(`  BATCH VERIFICATION REPORT (${viewport.toUpperCase()})`)
  console.log('═══════════════════════════════════════════════════════\n')

  // Summary
  let totalHigh = 0, totalMed = 0, totalLow = 0
  for (const r of results) {
    for (const i of r.issues) {
      if (i.severity === 'high') totalHigh++
      else if (i.severity === 'medium') totalMed++
      else totalLow++
    }
  }
  console.log(`Pages checked: ${results.length}`)
  console.log(`Viewport: ${viewport}`)
  console.log(`Total issues: ${totalHigh} HIGH, ${totalMed} MEDIUM, ${totalLow} LOW`)
  console.log(`Errors: ${results.filter(r => r.error).length}\n`)

  // Pages with HIGH issues
  const highPages = results.filter(r => r.issues.some(i => i.severity === 'high'))
  if (highPages.length) {
    console.log('── Pages with HIGH issues ──')
    for (const r of highPages) {
      console.log(`\n  ${r.section}/${r.slug}:`)
      for (const i of r.issues.filter(i => i.severity === 'high')) {
        console.log(`    [${i.type}] ${i.detail}`)
      }
    }
    console.log()
  }

  // Pages with MEDIUM issues
  const medPages = results.filter(r => r.issues.some(i => i.severity === 'medium') && !highPages.includes(r))
  if (medPages.length) {
    console.log('── Pages with MEDIUM issues (no HIGH) ──')
    for (const r of medPages) {
      console.log(`\n  ${r.section}/${r.slug}:`)
      for (const i of r.issues.filter(i => i.severity === 'medium')) {
        console.log(`    [${i.type}] ${i.detail}`)
      }
    }
    console.log()
  }

  // Clean pages
  const clean = results.filter(r => r.issues.length === 0 && !r.error)
  if (clean.length) {
    console.log(`── Clean pages (${clean.length}) ──`)
    console.log(`  ${clean.map(r => r.slug).join(', ')}`)
    console.log()
  }

  // Errors
  const errors = results.filter(r => r.error)
  if (errors.length) {
    console.log('── Errors ──')
    for (const r of errors) {
      console.log(`  ${r.slug}: ${r.error}`)
    }
  }
}

function selectViewports(args: string[]): ViewportName[] {
  const allViewports = args.includes('--all-viewports')
  const mobile = args.includes('--mobile')
  if (allViewports && mobile) {
    throw new Error('Use either --all-viewports or --mobile, not both.')
  }
  return allViewports ? ['desktop', 'mobile'] : [mobile ? 'mobile' : 'desktop']
}

function removeFlag(args: string[], flag: string): string[] {
  return args.filter(arg => arg !== flag)
}

async function main() {
  const rawArgs = process.argv.slice(2)
  const viewports = selectViewports(rawArgs)
  let args = rawArgs
  const flushNonClean = rawArgs.includes('--flush-non-clean') || rawArgs.includes('--clear-non-clean')

  if (rawArgs.includes('--clear-cache') && flushNonClean) {
    throw new Error('Use either --clear-cache or --flush-non-clean, not both.')
  }

  if (viewports.length > 1 && rawArgs.includes('--clear-cache')) {
    const cacheDir = path.resolve(getArgValue(rawArgs, '--cache-dir') || path.join('.audit', 'batch-verify-cache'))
    fs.rmSync(cacheDir, { recursive: true, force: true })
    console.error(`Cleared cache: ${cacheDir}`)
    args = removeFlag(rawArgs, '--clear-cache')
  }

  for (const viewport of viewports) {
    if (viewports.length > 1) {
      console.error(`\n=== ${viewport.toUpperCase()} batch verification ===`)
    }
    await runBatch(args, viewport)
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
