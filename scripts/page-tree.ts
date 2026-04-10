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
    borderTopWidth: string
    borderTopColor: string
    borderTopStyle: string
  }
  rect: { x: number; y: number; width: number; height: number }
  interactive: string | null   // 'link', 'button', 'input', 'onclick', etc.
  src: string | null           // for img, video, iframe
  broken?: boolean             // true if image element failed to load
  brCount?: number             // count of <br> elements inside (for line break diff)
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
      var broken = false;
      if (tag === 'img') {
        src = (el.src || '').split('/').pop().split('?')[0];
        // Detect broken/unloaded images: complete=true but naturalWidth=0 means
        // the image failed to load. complete=false means it never started.
        // Skip pixel/spacer images (very small natural dimensions) and lazy
        // images that are below the fold (loading=lazy + not yet loaded).
        var loading = el.getAttribute('loading') || 'eager';
        if (rect.width > 20 && rect.height > 20) {
          if (el.complete && el.naturalWidth === 0) broken = true;
          else if (!el.complete && loading !== 'lazy') broken = true;
        }
      }
      else if (tag === 'video') {
        var s = el.querySelector('source');
        src = s ? s.src.split('/').pop() : (el.src ? el.src.split('/').pop().split('?')[0] : 'video');
        if (el.autoplay || el.hasAttribute('autoplay')) inter = 'video:autoplay';
        else inter = 'video:controls';
      }
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
          borderTopWidth: cs.borderTopWidth,
          borderTopColor: cs.borderTopColor,
          borderTopStyle: cs.borderTopStyle,
        },
        rect: { x:Math.round(rect.x), y:Math.round(rect.y), width:Math.round(rect.width), height:Math.round(rect.height) },
        interactive: inter,
        src: src,
        broken: broken,
        brCount: (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') ? el.querySelectorAll(':scope > br').length : 0,
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
  const { tag, id, classes, text, styles, rect, interactive, src, broken, children } = node

  // Build the element line
  let line = `${indent}<${tag}`
  if (id) line += `#${id}`
  if (classes.length) line += `.${classes.slice(0, 3).join('.')}`
  if (classes.length > 3) line += `...(+${classes.length - 3})`
  line += '>'

  // Content
  if (src) line += ` [${src}]`
  if (broken) line += ` ⚠ BROKEN-IMAGE`
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
  // Background and border for button-like elements (CTA detection)
  if (interactive && interactive.includes('button')) {
    if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      styleParts.push(`bg:${normalizeColor(styles.backgroundColor)}`)
    }
    if (styles.borderTopWidth && styles.borderTopWidth !== '0px') {
      styleParts.push(`border:${styles.borderTopWidth} ${normalizeColor(styles.borderTopColor)}`)
    }
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

  // Compare matching headings by text similarity
  lines.push('')
  lines.push('=== Heading Differences ===')

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
    // Check numbering gutter — numbered headings should have negative left margin
    const aText = a.text || ''
    const bText = b.text || ''
    const isNumbered = /^\d+[\.\)]\s/.test(aText) || /^\d+[\.\)]\s/.test(bText)
    if (isNumbered) {
      const aMl = parseFloat(a.styles.marginLeft || '0')
      const bMl = parseFloat(b.styles.marginLeft || '0')
      if (aMl < 0 && bMl >= 0) diffs.push(`GUTTER MISSING: marginLeft: ${a.styles.marginLeft} → ${b.styles.marginLeft}`)
      if (aMl >= 0 && bMl < 0) diffs.push(`GUTTER EXTRA: marginLeft: ${a.styles.marginLeft} → ${b.styles.marginLeft}`)
    }

    if (diffs.length) {
      lines.push(`  <${a.tag}> "${aText.substring(0, 40) || bText.substring(0, 40)}"`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  // Compare paragraphs (first 5)
  lines.push('')
  lines.push('=== Paragraph Differences (first 5) ===')
  const aParagraphs = flatA.filter(f => f.node.tag === 'p').slice(0, 5)
  const bParagraphs = flatB.filter(f => f.node.tag === 'p').slice(0, 5)
  for (let i = 0; i < Math.min(aParagraphs.length, bParagraphs.length); i++) {
    const a = aParagraphs[i].node
    const b = bParagraphs[i].node
    const diffs: string[] = []
    if (a.styles.color !== b.styles.color) diffs.push(`color: ${normalizeColor(a.styles.color)} → ${normalizeColor(b.styles.color)}`)
    if (a.styles.marginBottom !== b.styles.marginBottom) diffs.push(`marginBottom: ${a.styles.marginBottom} → ${b.styles.marginBottom}`)
    if (a.styles.marginTop !== b.styles.marginTop) diffs.push(`marginTop: ${a.styles.marginTop} → ${b.styles.marginTop}`)
    if (diffs.length) {
      lines.push(`  <p> "${a.text?.substring(0, 40)}"`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  // Compare lists
  lines.push('')
  lines.push('=== List Differences ===')
  const aLists = flatA.filter(f => f.node.tag === 'ul' || f.node.tag === 'ol')
  const bLists = flatB.filter(f => f.node.tag === 'ul' || f.node.tag === 'ol')
  if (aLists.length !== bLists.length) {
    lines.push(`  Count: ${aLists.length} → ${bLists.length}`)
  }
  for (let i = 0; i < Math.min(aLists.length, bLists.length); i++) {
    const a = aLists[i].node
    const b = bLists[i].node
    const diffs: string[] = []
    if (a.styles.listStyleImage !== b.styles.listStyleImage) diffs.push(`bullet: ${a.styles.listStyleImage || 'default'} → ${b.styles.listStyleImage || 'default'}`)
    if (a.children.length !== b.children.length) diffs.push(`items: ${a.children.length} → ${b.children.length}`)
    // Check nesting: count nested ul/ol inside list items
    const countNested = (node: TreeNode): number => node.children.reduce((sum, c) => sum + (c.tag === 'ul' || c.tag === 'ol' ? 1 : 0) + countNested(c), 0)
    const aNested = countNested(a)
    const bNested = countNested(b)
    if (aNested !== bNested) diffs.push(`nested lists: ${aNested} → ${bNested} (sub-bullet hierarchy differs)`)
    if (diffs.length) {
      lines.push(`  <${a.tag}> (${a.children.length} items)`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  // Check for background-colored sections
  lines.push('')
  lines.push('=== Background Sections ===')
  const aBg = flatA.filter(f => f.node.styles.backgroundColor && f.node.styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && f.node.styles.backgroundColor !== 'rgb(255, 255, 255)')
  const bBg = flatB.filter(f => f.node.styles.backgroundColor && f.node.styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && f.node.styles.backgroundColor !== 'rgb(255, 255, 255)')
  if (aBg.length !== bBg.length) {
    lines.push(`  Count: ${aBg.length} → ${bBg.length}`)
  }

  // Check for missing/extra interactive elements
  lines.push('')
  lines.push('=== Interactive Elements ===')
  const aInteractive = flatA.filter(f => f.node.interactive).map(f => `${f.node.tag}:${f.node.interactive}`)
  const bInteractive = flatB.filter(f => f.node.interactive).map(f => `${f.node.tag}:${f.node.interactive}`)
  if (aInteractive.length !== bInteractive.length) {
    lines.push(`  Count: ${aInteractive.length} → ${bInteractive.length}`)
  }

  // Check for videos, iframes
  const aMedia = flatA.filter(f => ['video', 'iframe', 'canvas'].includes(f.node.tag))
  const bMedia = flatB.filter(f => ['video', 'iframe', 'canvas'].includes(f.node.tag))
  if (aMedia.length !== bMedia.length) {
    lines.push(`  Media (video/iframe/canvas): ${aMedia.length} → ${bMedia.length}`)
  }

  // Check for line break differences in paragraph text (haiku/poetry blocks)
  lines.push('')
  lines.push('=== Line Break Differences ===')
  // Compare brCount on paragraphs that exist on both sides
  const aPars = flatA.filter(f => f.node.tag === 'p' && (f.node.brCount || 0) > 0)
  const bPars = flatB.filter(f => f.node.tag === 'p' && (f.node.brCount || 0) > 0)
  const allBPars = flatB.filter(f => f.node.tag === 'p')
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().substring(0, 30)
  let lineBreakDiffs = 0
  for (const { node: a } of aPars) {
    const key = normalize(a.text || '')
    if (key.length < 10) continue
    // Find a fuzzy match in B paragraphs (any, not just those with BR)
    const matchB = allBPars.find(f => normalize(f.node.text || '') === key)
    if (matchB) {
      const aCount = a.brCount || 0
      const bCount = matchB.node.brCount || 0
      if (aCount !== bCount) {
        lineBreakDiffs++
        if (lineBreakDiffs <= 5) lines.push(`  ⚠ "${key}…" — ${labelA}: ${aCount} BR, ${labelB}: ${bCount} BR`)
      }
    }
  }
  if (lineBreakDiffs === 0) lines.push(`  No line break differences found`)
  else if (lineBreakDiffs > 5) lines.push(`  …and ${lineBreakDiffs - 5} more`)

  // Check for broken images (failed to load)
  lines.push('')
  lines.push('=== Broken Images ===')
  const aBroken = flatA.filter(f => f.node.broken).map(f => f.node.src || '(unknown)')
  const bBroken = flatB.filter(f => f.node.broken).map(f => f.node.src || '(unknown)')
  if (aBroken.length || bBroken.length) {
    if (aBroken.length) {
      lines.push(`  ${labelA} has ${aBroken.length} broken image(s):`)
      for (const s of aBroken.slice(0, 10)) lines.push(`    ⚠ ${s}`)
    }
    if (bBroken.length) {
      lines.push(`  ${labelB} has ${bBroken.length} broken image(s):`)
      for (const s of bBroken.slice(0, 10)) lines.push(`    ⚠ ${s}`)
    }
  } else {
    lines.push(`  All images loaded successfully on both sides`)
  }

  // Check for fixed/sticky elements
  const aFixed = flatA.filter(f => f.node.styles.position === 'fixed' || f.node.styles.position === 'sticky')
  const bFixed = flatB.filter(f => f.node.styles.position === 'fixed' || f.node.styles.position === 'sticky')
  if (aFixed.length !== bFixed.length) {
    lines.push(`  Fixed/sticky: ${aFixed.length} → ${bFixed.length}`)
  }

  // ── Button / CTA Comparison ──────────────────────────────────────────
  lines.push('')
  lines.push('=== Button / CTA Differences ===')
  const isBtn = (f: { node: TreeNode }) => f.node.interactive && f.node.interactive.includes('button')
  const aButtons = flatA.filter(isBtn)
  const bButtons = flatB.filter(isBtn)
  if (aButtons.length !== bButtons.length) {
    lines.push(`  Count: ${aButtons.length} → ${bButtons.length}`)
  }
  for (let i = 0; i < Math.min(aButtons.length, bButtons.length); i++) {
    const a = aButtons[i].node
    const b = bButtons[i].node
    const diffs: string[] = []
    // Variant (primary vs secondary)
    if (a.interactive !== b.interactive) diffs.push(`variant: ${a.interactive} → ${b.interactive}`)
    // Background color
    if (normalizeColor(a.styles.backgroundColor) !== normalizeColor(b.styles.backgroundColor)) {
      diffs.push(`bg: ${normalizeColor(a.styles.backgroundColor)} → ${normalizeColor(b.styles.backgroundColor)}`)
    }
    // Text color
    if (normalizeColor(a.styles.color) !== normalizeColor(b.styles.color)) {
      diffs.push(`color: ${normalizeColor(a.styles.color)} → ${normalizeColor(b.styles.color)}`)
    }
    // Font size
    if (a.styles.fontSize !== b.styles.fontSize) diffs.push(`fontSize: ${a.styles.fontSize} → ${b.styles.fontSize}`)
    // Border
    if (a.styles.borderTopWidth !== b.styles.borderTopWidth || normalizeColor(a.styles.borderTopColor) !== normalizeColor(b.styles.borderTopColor)) {
      diffs.push(`border: ${a.styles.borderTopWidth} ${normalizeColor(a.styles.borderTopColor)} → ${b.styles.borderTopWidth} ${normalizeColor(b.styles.borderTopColor)}`)
    }
    // Position (vertical placement relative to page)
    const yDiff = Math.abs(a.rect.y - b.rect.y)
    if (yDiff > 50) diffs.push(`Y position: ${a.rect.y}px → ${b.rect.y}px (${yDiff}px off)`)
    // Width
    const wDiff = Math.abs(a.rect.width - b.rect.width)
    if (wDiff > 20) diffs.push(`width: ${a.rect.width}px → ${b.rect.width}px`)
    // Text content
    const aLabel = a.text || ''
    const bLabel = b.text || ''
    if (aLabel.toLowerCase() !== bLabel.toLowerCase() && aLabel && bLabel) {
      diffs.push(`label: "${aLabel}" → "${bLabel}"`)
    }

    if (diffs.length) {
      lines.push(`  <${a.tag}> "${aLabel || bLabel}"`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  // ── Button position relative to media (videos, iframes, images) ──────
  // Check if a button that's BEFORE a video on Gatsby ends up AFTER it on Next.js (or vice versa)
  const aAllElements = flatA.filter(f => f.node.rect.y > 0)
  const bAllElements = flatB.filter(f => f.node.rect.y > 0)
  for (let i = 0; i < Math.min(aButtons.length, bButtons.length); i++) {
    const aBtn = aButtons[i].node
    const bBtn = bButtons[i].node
    const aLabel = (aBtn.text || '').substring(0, 25)
    // Find nearest video/iframe on each site relative to this button
    for (const mediaTag of ['video', 'iframe']) {
      const aMedia = aAllElements.filter(f => f.node.tag === mediaTag)
      const bMedia = bAllElements.filter(f => f.node.tag === mediaTag)
      for (let m = 0; m < Math.min(aMedia.length, bMedia.length); m++) {
        const aBefore = aBtn.rect.y < aMedia[m].node.rect.y
        const bBefore = bBtn.rect.y < bMedia[m].node.rect.y
        if (aBefore !== bBefore) {
          const aPos = aBefore ? 'before' : 'after'
          const bPos = bBefore ? 'before' : 'after'
          lines.push(`  POSITION: "${aLabel}" is ${aPos} ${mediaTag} on Gatsby but ${bPos} on Next.js`)
        }
      }
    }
  }

  // ── Video autoplay comparison ─────────────────────────────────────────
  lines.push('')
  lines.push('=== Video Autoplay ===')
  const aVideos = flatA.filter(f => f.node.tag === 'video')
  const bVideos = flatB.filter(f => f.node.tag === 'video')
  if (aVideos.length !== bVideos.length) {
    lines.push(`  Count: ${aVideos.length} → ${bVideos.length}`)
  }
  for (let i = 0; i < Math.min(aVideos.length, bVideos.length); i++) {
    const a = aVideos[i].node
    const b = bVideos[i].node
    if (a.interactive !== b.interactive) {
      lines.push(`  <video> "${a.src || b.src}"`)
      lines.push(`    autoplay: ${a.interactive} → ${b.interactive}`)
    }
  }

  // Report unmatched buttons
  if (aButtons.length > bButtons.length) {
    for (let i = bButtons.length; i < aButtons.length; i++) {
      lines.push(`  MISSING in B: <${aButtons[i].node.tag}> "${aButtons[i].node.text}" (${aButtons[i].node.interactive})`)
    }
  }
  if (bButtons.length > aButtons.length) {
    for (let i = aButtons.length; i < bButtons.length; i++) {
      lines.push(`  EXTRA in B: <${bButtons[i].node.tag}> "${bButtons[i].node.text}" (${bButtons[i].node.interactive})`)
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
