/**
 * Batch Page Verification
 *
 * Runs page-tree.ts diff on all pages and reports:
 * - Button variant mismatches (primary vs secondary)
 * - Button position/styling differences
 * - Video autoplay mismatches
 * - Element count differences
 * - Heading style differences
 *
 * Usage:
 *   npx tsx scripts/batch-verify.ts                    # all pages
 *   npx tsx scripts/batch-verify.ts --section vision   # vision only
 *   npx tsx scripts/batch-verify.ts --section work     # case studies only
 */

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
        styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, backgroundColor: cs.backgroundColor, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, position: cs.position },
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

interface Issue {
  type: 'BUTTON_VARIANT' | 'BUTTON_MISSING' | 'BUTTON_EXTRA' | 'BUTTON_STYLE' | 'VIDEO_AUTOPLAY' | 'VIDEO_COUNT' | 'HEADING_TAG' | 'HEADING_STYLE' | 'ELEMENT_COUNT'
  severity: 'high' | 'medium' | 'low'
  detail: string
}

function compareTrees(a: TreeNode, b: TreeNode): Issue[] {
  const flatA = flatten(a)
  const flatB = flatten(b)
  const issues: Issue[] = []

  // ── Button comparison ────────────────────────────────────────────
  const isBtn = (n: TreeNode) => n.interactive && n.interactive.includes('button') && n.text.length > 2 && n.rect.width > 30
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
    const yDiff = Math.abs(ab.rect.y - bb.rect.y)
    if (yDiff > 100) {
      issues.push({ type: 'BUTTON_STYLE', severity: 'medium', detail: `"${ab.text || bb.text}" Y position off by ${yDiff}px` })
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

  // ── Heading comparison ───────────────────────────────────────────
  const hTags = new Set(['h1', 'h2', 'h3', 'h4'])
  const aH = flatA.filter(n => hTags.has(n.tag))
  const bH = flatB.filter(n => hTags.has(n.tag))
  for (let i = 0; i < Math.min(aH.length, bH.length); i++) {
    if (aH[i].tag !== bH[i].tag) {
      issues.push({ type: 'HEADING_TAG', severity: 'medium', detail: `"${(aH[i].text || bH[i].text).substring(0, 40)}": <${aH[i].tag}> → <${bH[i].tag}>` })
    }
    if (aH[i].styles.fontSize !== bH[i].styles.fontSize) {
      issues.push({ type: 'HEADING_STYLE', severity: 'low', detail: `"${(aH[i].text || bH[i].text).substring(0, 40)}": size ${aH[i].styles.fontSize} → ${bH[i].styles.fontSize}` })
    }
  }

  // ── Element count diffs ──────────────────────────────────────────
  const countA: Record<string, number> = {}
  const countB: Record<string, number> = {}
  for (const n of flatA) countA[n.tag] = (countA[n.tag] || 0) + 1
  for (const n of flatB) countB[n.tag] = (countB[n.tag] || 0) + 1
  for (const tag of ['img', 'ul', 'ol', 'iframe', 'video', 'blockquote']) {
    const a = countA[tag] || 0
    const b = countB[tag] || 0
    const diff = Math.abs(a - b)
    if (diff > 0) {
      issues.push({ type: 'ELEMENT_COUNT', severity: diff > 3 ? 'medium' : 'low', detail: `<${tag}>: ${a} → ${b} (${b - a > 0 ? '+' : ''}${b - a})` })
    }
  }

  return issues
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const sectionFilter = args.includes('--section') ? args[args.indexOf('--section') + 1] : null

  let pages: PageDef[] = []
  if (!sectionFilter || sectionFilter === 'vision') pages.push(...VISION_PAGES)
  if (!sectionFilter || sectionFilter === 'work') pages.push(...WORK_PAGES)

  const gatsbyBase = 'https://www.goinvo.com'
  const nextBase = 'http://localhost:3000'

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const results: { slug: string; section: string; issues: Issue[]; error?: string }[] = []

  for (const pd of pages) {
    const gatsbyUrl = `${gatsbyBase}${pd.gatsbyPath}`
    const nextUrl = `${nextBase}${pd.nextPath}`

    process.stderr.write(`[${results.length + 1}/${pages.length}] ${pd.slug}...`)
    try {
      await page.goto(gatsbyUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      await new Promise(r => setTimeout(r, 500))
      const treeA = await extractTree(page)

      await page.goto(nextUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      await new Promise(r => setTimeout(r, 500))
      const treeB = await extractTree(page)

      const issues = compareTrees(treeA, treeB)
      results.push({ slug: pd.slug, section: pd.section, issues })

      const high = issues.filter(i => i.severity === 'high').length
      const med = issues.filter(i => i.severity === 'medium').length
      process.stderr.write(` ${high}H ${med}M ${issues.length - high - med}L\n`)
    } catch (err: any) {
      results.push({ slug: pd.slug, section: pd.section, issues: [], error: err.message?.substring(0, 80) })
      process.stderr.write(` ERROR\n`)
    }
  }

  await browser.close()

  // ── Report ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  BATCH VERIFICATION REPORT')
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

main().catch(console.error)
