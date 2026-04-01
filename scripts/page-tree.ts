/**
 * Page Structure Tree
 *
 * Crawls a page with Puppeteer and outputs a component tree with:
 * - Semantic structure (sections, headings, content blocks)
 * - Computed styles on every element
 * - Dimensions and positioning
 * - Interactive attributes
 *
 * Usage:
 *   npx tsx scripts/page-tree.ts https://www.goinvo.com/vision/ai-design-certification/
 *   npx tsx scripts/page-tree.ts http://localhost:3000/vision/ai-design-certification
 *   npx tsx scripts/page-tree.ts <url> --json          # JSON output
 *   npx tsx scripts/page-tree.ts <url> --diff <url2>   # Side-by-side diff
 *
 * Output: indented tree with styles, or JSON for programmatic use
 */

import puppeteer, { type Page } from 'puppeteer'
import { writeFileSync } from 'fs'

interface TreeNode {
  tag: string
  id: string
  classes: string[]
  text: string           // direct text content (not from children)
  styles: {
    fontSize: string
    fontWeight: string
    fontFamily: string
    fontStyle: string
    color: string
    backgroundColor: string
    textTransform: string
    textAlign: string
    letterSpacing: string
    lineHeight: string
    marginTop: string
    marginRight: string
    marginBottom: string
    marginLeft: string
    paddingTop: string
    paddingRight: string
    paddingBottom: string
    paddingLeft: string
    display: string
    position: string
    borderRadius: string
    boxShadow: string
    listStyleType: string
    listStyleImage: string
  }
  rect: { x: number; y: number; width: number; height: number }
  interactive: string | null   // 'link', 'button', 'input', 'onclick', etc.
  src: string | null           // for img, video, iframe
  children: TreeNode[]
}

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
      if (tag === 'a' && el.hasAttribute('href')) inter = 'link';
      else if (tag === 'button') inter = 'button';
      else if (['input','select','textarea'].indexOf(tag) >= 0) inter = tag;
      else if (el.hasAttribute('onclick')) inter = 'onclick';

      var src = null;
      if (tag === 'img') src = (el.src || '').split('/').pop().split('?')[0];
      else if (tag === 'video') { var s = el.querySelector('source'); src = s ? s.src.split('/').pop() : 'video'; }
      else if (tag === 'iframe') src = (el.src || '').substring(0, 80);

      return {
        tag: tag,
        id: el.id || '',
        classes: cls ? cls.split(/\\s+/) : [],
        text: dt,
        styles: {
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/"/g,'').trim(),
          fontStyle: cs.fontStyle,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          textTransform: cs.textTransform,
          textAlign: cs.textAlign,
          letterSpacing: cs.letterSpacing,
          lineHeight: cs.lineHeight,
          marginTop: cs.marginTop,
          marginRight: cs.marginRight,
          marginBottom: cs.marginBottom,
          marginLeft: cs.marginLeft,
          paddingTop: cs.paddingTop,
          paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          display: cs.display,
          position: cs.position,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.substring(0, 60),
          listStyleType: cs.listStyleType,
          listStyleImage: cs.listStyleImage === 'none' ? '' : 'custom',
        },
        rect: { x:Math.round(rect.x), y:Math.round(rect.y), width:Math.round(rect.width), height:Math.round(rect.height) },
        interactive: inter,
        src: src,
        children: children,
      };
    }

    var root = document.querySelector('main') || document.querySelector('.app__body') || document.body;
    return build(root) || { tag:'empty', id:'', classes:[], text:'', styles:{}, rect:{x:0,y:0,width:0,height:0}, interactive:null, src:null, children:[] };
  })()`) as Promise<TreeNode>
}

// ── Pretty print ───────────────────────────────────────────────────────

function normalizeColor(c: string): string {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return c
  const [, r, g, b] = m
  if (r === '0' && g === '0' && b === '0') return c.includes('0)') ? 'transparent' : '#000'
  if (r === '255' && g === '255' && b === '255') return '#fff'
  return `#${(+r).toString(16).padStart(2, '0')}${(+g).toString(16).padStart(2, '0')}${(+b).toString(16).padStart(2, '0')}`
}

function printTree(node: TreeNode, indent: string = '', lines: string[] = []): string[] {
  const { tag, id, classes, text, styles, rect, interactive, src, children } = node

  // Build the element line
  let line = `${indent}<${tag}`
  if (id) line += `#${id}`
  if (classes.length) line += `.${classes.slice(0, 3).join('.')}`
  if (classes.length > 3) line += `...(+${classes.length - 3})`
  line += '>'

  // Content
  if (src) line += ` [${src}]`
  if (text) line += ` "${text.substring(0, 70)}${text.length > 70 ? '...' : ''}"`
  if (interactive) line += ` (${interactive})`

  // Styles — compact format, only non-default values
  const styleParts: string[] = []
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'a', 'span', 'strong', 'em', 'blockquote', 'figcaption', 'button', 'label'].includes(tag)) {
    styleParts.push(styles.fontSize)
    styleParts.push(`w${styles.fontWeight}`)
    if (styles.fontStyle !== 'normal') styleParts.push(styles.fontStyle)
    if (styles.textTransform !== 'none') styleParts.push(styles.textTransform)
    if (styles.letterSpacing !== 'normal' && styles.letterSpacing !== '0px') styleParts.push(`ls:${styles.letterSpacing}`)
    styleParts.push(normalizeColor(styles.color))
  }
  if (tag === 'img' || tag === 'div' || tag === 'section') {
    if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      styleParts.push(`bg:${normalizeColor(styles.backgroundColor)}`)
    }
  }
  if (styles.display !== 'block' && styles.display !== 'inline' && !['div', 'section', 'p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'img', 'figure'].includes(tag)) {
    styleParts.push(`d:${styles.display}`)
  }
  if (styles.position === 'fixed' || styles.position === 'sticky') {
    styleParts.push(`pos:${styles.position}`)
  }
  if (styles.borderRadius && styles.borderRadius !== '0px') {
    styleParts.push(`r:${styles.borderRadius}`)
  }
  if (styles.boxShadow) {
    styleParts.push('shadow')
  }
  if (styles.listStyleImage === 'custom') {
    styleParts.push('bullet:custom')
  }

  // Dimensions for significant elements
  if (['img', 'video', 'iframe', 'canvas'].includes(tag)) {
    styleParts.push(`${rect.width}x${rect.height}`)
  }

  // Margins for headings and paragraphs
  if (['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'blockquote'].includes(tag)) {
    const mt = parseFloat(styles.marginTop)
    const mb = parseFloat(styles.marginBottom)
    if (mt > 0 || mb > 0) styleParts.push(`m:${Math.round(mt)}/${Math.round(mb)}`)
  }

  if (styleParts.length) line += `  {${styleParts.join(' ')}}`

  lines.push(line)

  for (const child of children) {
    printTree(child, indent + '  ', lines)
  }

  return lines
}

// ── Diff two trees ─────────────────────────────────────────────────────

function flattenTree(node: TreeNode, path: string = '', list: { path: string; node: TreeNode }[] = []): { path: string; node: TreeNode }[] {
  const key = `${path}/${node.tag}${node.id ? '#' + node.id : ''}${node.classes.length ? '.' + node.classes[0] : ''}`
  list.push({ path: key, node })
  for (let i = 0; i < node.children.length; i++) {
    flattenTree(node.children[i], `${key}[${i}]`, list)
  }
  return list
}

function diffTrees(treeA: TreeNode, treeB: TreeNode, labelA: string, labelB: string): string[] {
  const flatA = flattenTree(treeA)
  const flatB = flattenTree(treeB)
  const lines: string[] = []

  // Compare element counts by tag
  const countA: Record<string, number> = {}
  const countB: Record<string, number> = {}
  for (const { node } of flatA) countA[node.tag] = (countA[node.tag] || 0) + 1
  for (const { node } of flatB) countB[node.tag] = (countB[node.tag] || 0) + 1

  lines.push('=== Element Counts ===')
  lines.push(`${'Tag'.padEnd(15)} ${labelA.padEnd(8)} ${labelB.padEnd(8)} Diff`)
  const allTags = new Set([...Object.keys(countA), ...Object.keys(countB)])
  for (const tag of [...allTags].sort()) {
    const a = countA[tag] || 0
    const b = countB[tag] || 0
    if (a !== b) {
      lines.push(`${tag.padEnd(15)} ${String(a).padEnd(8)} ${String(b).padEnd(8)} ${b - a > 0 ? '+' : ''}${b - a}`)
    }
  }

  // Compare matching elements by tag + text
  lines.push('')
  lines.push('=== Style Differences ===')

  const headingTags = new Set(['h1', 'h2', 'h3', 'h4'])
  const aHeadings = flatA.filter(f => headingTags.has(f.node.tag))
  const bHeadings = flatB.filter(f => headingTags.has(f.node.tag))

  for (let i = 0; i < Math.min(aHeadings.length, bHeadings.length); i++) {
    const a = aHeadings[i].node
    const b = bHeadings[i].node
    const diffs: string[] = []

    if (a.tag !== b.tag) diffs.push(`tag: ${a.tag} → ${b.tag}`)
    for (const prop of ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing'] as const) {
      if (a.styles[prop] !== b.styles[prop]) {
        diffs.push(`${prop}: ${a.styles[prop]} → ${b.styles[prop]}`)
      }
    }

    if (diffs.length) {
      lines.push(`  <${a.tag}> "${a.text?.substring(0, 40) || b.text?.substring(0, 40)}"`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  return lines
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const url = args.find(a => a.startsWith('http'))
  const jsonMode = args.includes('--json')
  const diffIdx = args.indexOf('--diff')
  const url2 = diffIdx >= 0 ? args[diffIdx + 1] : null

  if (!url) {
    console.log('Usage:')
    console.log('  npx tsx scripts/page-tree.ts <url>')
    console.log('  npx tsx scripts/page-tree.ts <url> --json')
    console.log('  npx tsx scripts/page-tree.ts <url> --diff <url2>')
    process.exit(1)
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  console.error(`Fetching ${url}...`)
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 1000))
  const tree = await extractTree(page)

  if (url2) {
    console.error(`Fetching ${url2}...`)
    await page.goto(url2, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1000))
    const tree2 = await extractTree(page)

    const diffLines = diffTrees(tree, tree2, 'A', 'B')
    console.log(diffLines.join('\n'))

    console.log('\n=== Tree A ===')
    console.log(printTree(tree).join('\n'))
    console.log('\n=== Tree B ===')
    console.log(printTree(tree2).join('\n'))
  } else if (jsonMode) {
    console.log(JSON.stringify(tree, null, 2))
  } else {
    console.log(printTree(tree).join('\n'))
  }

  await browser.close()
}

main().catch(console.error)
