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
import {
  getPageTreeBaselineSet,
  listPageTreeBaselineSets,
  type PageTreeBaselinePage,
} from './page-tree-baselines'

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

interface FlatNode {
  path: string
  node: TreeNode
  parentPath: string | null
}

interface MatchedFlatNodePair {
  a: FlatNode
  b: FlatNode
}

type ViewportName = 'desktop' | 'mobile'

interface ViewportPreset {
  name: ViewportName
  width: number
  height: number
  deviceScaleFactor?: number
  isMobile?: boolean
  hasTouch?: boolean
}

interface ResponsiveIssue {
  tag: string
  text: string
  src: string | null
  left: number
  right: number
  width: number
  height: number
  overflowLeft: number
  overflowRight: number
  scrollWidth?: number
  clientWidth?: number
}

interface ResponsiveDiagnostics {
  viewportWidth: number
  viewportHeight: number
  documentScrollWidth: number
  documentScrollHeight: number
  horizontalOverflowPx: number
  overflowingElementCount: number
  overflowingElements: ResponsiveIssue[]
  oversizedMediaCount: number
  oversizedMedia: ResponsiveIssue[]
  clippedTextCount: number
  clippedText: ResponsiveIssue[]
  tinyTapTargetCount: number
  tinyTapTargets: ResponsiveIssue[]
}

interface PageSnapshot {
  tree: TreeNode
  responsive: ResponsiveDiagnostics
}

const VIEWPORT_PRESETS: Record<ViewportName, ViewportPreset> = {
  desktop: { name: 'desktop', width: 1280, height: 900 },
  mobile: {
    name: 'mobile',
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
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

    // Full recursive text content — more accurate for matching than
    // directText which misses text inside child spans/strongs/etc.
    function fullText(el) {
      return (el.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 150);
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
      // Allow zero-size elements if they have text content (hidden carousel slides,
      // collapsed accordion panels, tab content that's display:none). These still
      // contain real content that should be compared even if not visible.
      var hasText = el.textContent && el.textContent.trim().length > 0;
      if (rect.width === 0 && rect.height === 0 && tag !== 'img' && !hasText) return null;

      var cs = getComputedStyle(el);
      var cls = (typeof el.className === 'string') ? el.className.trim() : '';

      var children = [];
      for (var i = 0; i < el.children.length; i++) {
        var cn = build(el.children[i]);
        if (cn) children.push(cn);
      }

      // Use fullText for text-container elements (p, h1-h4, li, etc.)
      // so that text split across child spans gets captured correctly.
      // directText only gets bare text nodes, missing <span>-wrapped content.
      var isTextContainer = ['p','h1','h2','h3','h4','h5','h6','li','figcaption','blockquote','label','td','th'].indexOf(tag) >= 0;
      var dt = isTextContainer ? fullText(el) : directText(el);

      // Collapse anonymous wrappers UNLESS they carry styling context
      // (background color, border) that the diff needs to detect.
      var hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'rgb(255, 255, 255)';
      var hasBorder = cs.borderTopWidth && parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none';
      if (['div','section','article','span','main'].indexOf(tag) >= 0 && !cls && !el.id && !dt && !hasBg && !hasBorder) {
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

async function preparePageForCapture(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 400)
    const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)

    for (let y = 0; y <= maxScroll; y += step) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    window.scrollTo(0, maxScroll)
    await new Promise(resolve => setTimeout(resolve, 400))
    window.scrollTo(0, 0)
    await new Promise(resolve => setTimeout(resolve, 250))
  })
}

async function collectResponsiveDiagnostics(page: Page): Promise<ResponsiveDiagnostics> {
  return page.evaluate(`(function() {
    var SKIP_SEL = 'header.site-header, footer.site-footer, nav.site-nav, .header-nav, .mobile-nav, .twenty-eighteen > .header-nav, [data-sanity]';
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var tolerance = 12;
    var maxItems = 8;
    var doc = document.documentElement;
    var body = document.body;
    var documentScrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    var documentScrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
    var horizontalOverflowPx = Math.max(0, Math.round(documentScrollWidth - viewportWidth));

    function isTransparent(value) {
      return value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
    }

    function normalizeText(value) {
      return (value || '').replace(/\\s+/g, ' ').trim();
    }

    function textSnippet(el) {
      return normalizeText(el.textContent).substring(0, 70);
    }

    function sourceName(el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        var imgSrc = el.currentSrc || el.src || '';
        return imgSrc ? imgSrc.split('/').pop().split('?')[0] : null;
      }
      if (tag === 'iframe') return (el.src || '').substring(0, 90) || null;
      if (tag === 'video') {
        var source = el.currentSrc || el.src || '';
        if (!source) {
          var nestedSource = el.querySelector('source');
          source = nestedSource ? nestedSource.src : '';
        }
        return source ? source.split('/').pop().split('?')[0] : 'video';
      }
      return null;
    }

    function isVisible(el, rect) {
      if (el.closest(SKIP_SEL)) return false;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) {
        return false;
      }
      return rect.width > 0 && rect.height > 0;
    }

    function hasScrollableAncestor(el) {
      var parent = el.parentElement;
      while (parent && parent !== document.body) {
        var styles = getComputedStyle(parent);
        var parentRect = parent.getBoundingClientRect();
        var canScrollX = styles.overflowX === 'auto' || styles.overflowX === 'scroll';
        if (canScrollX && parent.scrollWidth > parent.clientWidth + tolerance) {
          return true;
        }
        if (canScrollX && parentRect.width + tolerance < el.getBoundingClientRect().width) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    function toIssue(el, rect) {
      return {
        tag: el.tagName.toLowerCase(),
        text: textSnippet(el),
        src: sourceName(el),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        overflowLeft: Math.max(0, Math.round(-rect.left)),
        overflowRight: Math.max(0, Math.round(rect.right - viewportWidth)),
      };
    }

    function uniqueIssues(issues) {
      var seen = new Set();
      var result = [];
      for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];
        var key = issue.tag + '|' + (issue.src || '') + '|' + issue.text.substring(0, 40) + '|' + issue.left + '|' + issue.right;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(issue);
      }
      return result;
    }

    function sortBySeverity(issues) {
      return issues.slice().sort(function(a, b) {
        var aSeverity = Math.max(a.overflowLeft, a.overflowRight, a.width, a.height);
        var bSeverity = Math.max(b.overflowLeft, b.overflowRight, b.width, b.height);
        return bSeverity - aSeverity;
      });
    }

    var overflowingElements = [];
    var allElements = Array.from(document.body.querySelectorAll('*'));
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var rect = el.getBoundingClientRect();
      if (!isVisible(el, rect)) continue;
      if (Math.abs(rect.left) > viewportWidth * 2 || Math.abs(rect.right) > viewportWidth * 3) continue;
      if (rect.width < 24 || rect.height < 12) continue;

      var issue = toIssue(el, rect);
      if (issue.overflowLeft <= tolerance && issue.overflowRight <= tolerance) continue;
      if (hasScrollableAncestor(el)) continue;

      var tag = issue.tag;
      var isContainer = tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main';
      if (isContainer && issue.overflowLeft + issue.overflowRight < 20 && issue.width < viewportWidth + 20) {
        continue;
      }

      overflowingElements.push(issue);
    }

    var oversizedMedia = [];
    var mediaElements = Array.from(document.querySelectorAll('img, video, iframe, canvas, svg, table, pre'));
    for (var j = 0; j < mediaElements.length; j++) {
      var media = mediaElements[j];
      var mediaRect = media.getBoundingClientRect();
      if (!isVisible(media, mediaRect)) continue;
      if (Math.abs(mediaRect.left) > viewportWidth * 2 || Math.abs(mediaRect.right) > viewportWidth * 3) continue;
      if (mediaRect.width < 60 || mediaRect.height < 24) continue;

      var mediaIssue = toIssue(media, mediaRect);
      if (mediaIssue.width <= viewportWidth + tolerance && mediaIssue.overflowLeft <= tolerance && mediaIssue.overflowRight <= tolerance) {
        continue;
      }
      if (hasScrollableAncestor(media)) continue;
      oversizedMedia.push(mediaIssue);
    }

    var clippedText = [];
    var textElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, li, figcaption, blockquote, span'));
    for (var k = 0; k < textElements.length; k++) {
      var textEl = textElements[k];
      var textRect = textEl.getBoundingClientRect();
      if (!isVisible(textEl, textRect)) continue;
      if (textRect.width < 60 || textRect.height < 12) continue;

      var text = textSnippet(textEl);
      if (text.length < 12) continue;

      var textStyles = getComputedStyle(textEl);
      if (textStyles.display === 'inline') continue;

      var overflowX = ['hidden', 'clip', 'auto', 'scroll'].indexOf(textStyles.overflowX) >= 0;
      var overflowY = ['hidden', 'clip', 'auto', 'scroll'].indexOf(textStyles.overflowY) >= 0;
      var clipStyled = overflowX || overflowY || textStyles.textOverflow === 'ellipsis' || textStyles.whiteSpace === 'nowrap';
      var clippedHorizontally = textEl.scrollWidth > textEl.clientWidth + 12;
      var clippedVertically = textEl.scrollHeight > textEl.clientHeight + 8;

      if (!clipStyled || (!clippedHorizontally && !clippedVertically)) continue;

      var textIssue = toIssue(textEl, textRect);
      textIssue.scrollWidth = Math.round(textEl.scrollWidth);
      textIssue.clientWidth = Math.round(textEl.clientWidth);
      clippedText.push(textIssue);
    }

    var tinyTapTargets = [];
    var interactiveElements = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], summary'));
    for (var m = 0; m < interactiveElements.length; m++) {
      var interactive = interactiveElements[m];
      var interactiveRect = interactive.getBoundingClientRect();
      if (!isVisible(interactive, interactiveRect)) continue;
      if (interactiveRect.width >= 44 && interactiveRect.height >= 44) continue;

      var interactiveTag = interactive.tagName.toLowerCase();
      var interactiveStyles = getComputedStyle(interactive);
      var verticalPadding = parseFloat(interactiveStyles.paddingTop || '0') + parseFloat(interactiveStyles.paddingBottom || '0');
      var horizontalPadding = parseFloat(interactiveStyles.paddingLeft || '0') + parseFloat(interactiveStyles.paddingRight || '0');
      var isButtonishAnchor =
        interactiveTag !== 'a' ||
        verticalPadding >= 12 ||
        horizontalPadding >= 16 ||
        !isTransparent(interactiveStyles.backgroundColor) ||
        parseFloat(interactiveStyles.borderTopWidth || '0') > 0 ||
        interactiveStyles.textTransform === 'uppercase' ||
        interactiveStyles.display === 'inline-flex' ||
        interactiveStyles.display === 'flex';

      if (!isButtonishAnchor) continue;

      tinyTapTargets.push(toIssue(interactive, interactiveRect));
    }

    var uniqueOverflowingElements = uniqueIssues(overflowingElements);
    var uniqueOversizedMedia = uniqueIssues(oversizedMedia);
    var uniqueClippedText = uniqueIssues(clippedText);
    var uniqueTinyTapTargets = uniqueIssues(tinyTapTargets);

    return {
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,
      documentScrollWidth: documentScrollWidth,
      documentScrollHeight: documentScrollHeight,
      horizontalOverflowPx: horizontalOverflowPx,
      overflowingElementCount: uniqueOverflowingElements.length,
      overflowingElements: sortBySeverity(uniqueOverflowingElements).slice(0, maxItems),
      oversizedMediaCount: uniqueOversizedMedia.length,
      oversizedMedia: sortBySeverity(uniqueOversizedMedia).slice(0, maxItems),
      clippedTextCount: uniqueClippedText.length,
      clippedText: sortBySeverity(uniqueClippedText).slice(0, maxItems),
      tinyTapTargetCount: uniqueTinyTapTargets.length,
      tinyTapTargets: sortBySeverity(uniqueTinyTapTargets).slice(0, maxItems),
    };
  })()`) as Promise<ResponsiveDiagnostics>
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
  // Border on any large container (card/callout detection)
  if (tag === 'div' || tag === 'section') {
    if (styles.borderTopWidth && styles.borderTopWidth !== '0px' && parseFloat(styles.borderTopWidth) >= 2) {
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

function flattenTree(node: TreeNode, path: string = '', list: FlatNode[] = [], parentPath: string | null = null): FlatNode[] {
  const key = `${path}/${node.tag}${node.id ? '#' + node.id : ''}${node.classes.length ? '.' + node.classes[0] : ''}`
  list.push({ path: key, node, parentPath })
  for (let i = 0; i < node.children.length; i++) {
    flattenTree(node.children[i], `${key}[${i}]`, list, key)
  }
  return list
}

function normalizeTextContent(value: string | undefined): string {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .toLowerCase()
}

function pickNearestByY(candidates: FlatNode[], targetY: number, usedPaths: Set<string>): FlatNode | null {
  let best: FlatNode | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (usedPaths.has(candidate.path)) continue

    const distance = Math.abs(candidate.node.rect.y - targetY)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

function matchTextEntries(
  aEntries: FlatNode[],
  bEntries: FlatNode[],
  {
    minTextLength = 1,
    exactPrefixLength = 80,
    fallbackPrefixLength = 24,
    sameTagOnly = true,
  }: {
    minTextLength?: number
    exactPrefixLength?: number
    fallbackPrefixLength?: number
    sameTagOnly?: boolean
  } = {},
): MatchedFlatNodePair[] {
  const buildKey = (entry: FlatNode, prefixLength: number): string => {
    const text = normalizeTextContent(entry.node.text).slice(0, prefixLength)
    return sameTagOnly ? `${entry.node.tag}:${text}` : text
  }

  const bExact = new Map<string, FlatNode[]>()
  const bFallback = new Map<string, FlatNode[]>()

  for (const entry of bEntries) {
    const normalized = normalizeTextContent(entry.node.text)
    if (normalized.length < minTextLength) continue

    const exactKey = buildKey(entry, exactPrefixLength)
    const fallbackKey = buildKey(entry, fallbackPrefixLength)

    const exactBucket = bExact.get(exactKey) ?? []
    exactBucket.push(entry)
    bExact.set(exactKey, exactBucket)

    const fallbackBucket = bFallback.get(fallbackKey) ?? []
    fallbackBucket.push(entry)
    bFallback.set(fallbackKey, fallbackBucket)
  }

  const usedPaths = new Set<string>()
  const matches: MatchedFlatNodePair[] = []

  for (const entry of aEntries) {
    const normalized = normalizeTextContent(entry.node.text)
    if (normalized.length < minTextLength) continue

    const exactMatch = pickNearestByY(
      bExact.get(buildKey(entry, exactPrefixLength)) ?? [],
      entry.node.rect.y,
      usedPaths,
    )
    const fallbackMatch =
      exactMatch ||
      normalized.length < fallbackPrefixLength
        ? null
        : pickNearestByY(
            bFallback.get(buildKey(entry, fallbackPrefixLength)) ?? [],
            entry.node.rect.y,
            usedPaths,
          )
    const match = exactMatch ?? fallbackMatch
    if (!match) continue

    usedPaths.add(match.path)
    matches.push({ a: entry, b: match })
  }

  return matches
}

function getDescendantEntries(entry: FlatNode, flat: FlatNode[]): FlatNode[] {
  const prefix = `${entry.path}[`
  return flat.filter(candidate => candidate.path.startsWith(prefix))
}

function getDominantTextEntry(entry: FlatNode, flat: FlatNode[]): FlatNode {
  const textTags = new Set(['p', 'span', 'strong', 'em', 'a', 'li', 'figcaption'])
  const baseText = normalizeTextContent(entry.node.text)
  const baseLength = baseText.length
  const candidates = [entry, ...getDescendantEntries(entry, flat)].filter(candidate =>
    textTags.has(candidate.node.tag) && normalizeTextContent(candidate.node.text).length >= 6
  )

  if (candidates.length === 0) return entry

  return candidates.sort((left, right) => {
    const leftText = normalizeTextContent(left.node.text)
    const rightText = normalizeTextContent(right.node.text)
    const leftLength = leftText.length
    const rightLength = rightText.length
    const leftCoverage = baseLength > 0 ? Math.min(leftLength, baseLength) / Math.max(leftLength, baseLength) : 1
    const rightCoverage = baseLength > 0 ? Math.min(rightLength, baseLength) / Math.max(rightLength, baseLength) : 1
    const leftFontSize = Number.parseFloat(left.node.styles.fontSize || '0')
    const rightFontSize = Number.parseFloat(right.node.styles.fontSize || '0')

    const leftScore = (leftCoverage >= 0.82 ? 1000 : 0) + leftFontSize * 10 + leftLength
    const rightScore = (rightCoverage >= 0.82 ? 1000 : 0) + rightFontSize * 10 + rightLength

    if (rightScore !== leftScore) return rightScore - leftScore
    return right.path.length - left.path.length
  })[0]
}

function collectLeafTextNodes(node: TreeNode): TreeNode[] {
  const textTags = new Set(['p', 'span', 'strong', 'em', 'a', 'li', 'figcaption'])
  const childLeaves = node.children.flatMap(child => collectLeafTextNodes(child))
  const currentNode = textTags.has(node.tag) && normalizeTextContent(node.text).length >= 6 ? [node] : []
  return [...currentNode, ...childLeaves]
}

function getRepresentativeParagraphNode(entry: FlatNode): TreeNode {
  const paragraph = entry.node
  const paragraphTextLength = normalizeTextContent(paragraph.text).length
  const parentFontSize = Number.parseFloat(paragraph.styles.fontSize || '0')
  const leafTextNodes = paragraph.children.flatMap(child => collectLeafTextNodes(child))
  const totalLeafTextLength = leafTextNodes.reduce((sum, node) => sum + normalizeTextContent(node.text).length, 0)
  const leafCoverage = paragraphTextLength > 0 ? totalLeafTextLength / paragraphTextLength : 0
  const leafColors = new Set(
    leafTextNodes
      .filter(node => normalizeTextContent(node.text).length >= 12)
      .map(node => normalizeColor(node.styles.color))
  )

  const bestLeaf = [...leafTextNodes].sort((left, right) => {
    const leftLength = normalizeTextContent(left.text).length
    const rightLength = normalizeTextContent(right.text).length
    const leftFontSize = Number.parseFloat(left.styles.fontSize || '0')
    const rightFontSize = Number.parseFloat(right.styles.fontSize || '0')
    const leftScore = leftFontSize * 10 + leftLength
    const rightScore = rightFontSize * 10 + rightLength
    return rightScore - leftScore
  })[0]

  const bestLeafFontSize = bestLeaf ? Number.parseFloat(bestLeaf.styles.fontSize || '0') : 0
  if (bestLeaf && leafCoverage >= 0.55 && bestLeafFontSize >= parentFontSize + 2) {
    return {
      ...bestLeaf,
      text: paragraph.text,
      styles: {
        ...bestLeaf.styles,
        color: leafColors.size > 1 ? paragraph.styles.color : bestLeaf.styles.color,
        marginTop: paragraph.styles.marginTop,
        marginBottom: paragraph.styles.marginBottom,
      },
    }
  }

  return paragraph
}

function diffTrees(treeA: TreeNode, treeB: TreeNode, labelA: string, labelB: string): string[] {
  const flatA = flattenTree(treeA)
  const flatB = flattenTree(treeB)
  const flatAByPath = new Map(flatA.map(entry => [entry.path, entry]))
  const flatBByPath = new Map(flatB.map(entry => [entry.path, entry]))
  const lines: string[] = []
  const transparent = new Set(['rgba(0, 0, 0, 0)', 'transparent'])
  const white = new Set(['rgb(255, 255, 255)', '#fff', '#ffffff'])
  const parsePx = (value: string | undefined): number => {
    const parsed = Number.parseFloat(value ?? '0')
    return Number.isFinite(parsed) ? parsed : 0
  }
  const isVisibleBackground = (color: string | undefined): boolean => {
    if (!color) return false
    return !transparent.has(color)
  }
  const isWhiteBackground = (color: string | undefined): boolean => {
    if (!color) return false
    return white.has(color)
  }
  const getAncestors = (entry: FlatNode, map: Map<string, FlatNode>): FlatNode[] => {
    const ancestors: FlatNode[] = []
    let parent = entry.parentPath ? map.get(entry.parentPath) ?? null : null
    while (parent) {
      ancestors.push(parent)
      parent = parent.parentPath ? map.get(parent.parentPath) ?? null : null
    }
    return ancestors
  }
  const findNearestMeasuredContainer = (entry: FlatNode, map: Map<string, FlatNode>): FlatNode | null => {
    return getAncestors(entry, map).find(ancestor => {
      const hasPadding =
        parsePx(ancestor.node.styles.paddingTop) > 0 ||
        parsePx(ancestor.node.styles.paddingRight) > 0 ||
        parsePx(ancestor.node.styles.paddingBottom) > 0 ||
        parsePx(ancestor.node.styles.paddingLeft) > 0
      const carriesHeroBoxStyling =
        isVisibleBackground(ancestor.node.styles.backgroundColor) ||
        hasPadding ||
        ancestor.node.classes.some(cls => cls.includes('content-padding'))
      const closeToHeading = Math.abs(ancestor.node.rect.y - entry.node.rect.y) <= 200
      const plausibleBoxHeight = ancestor.node.rect.height <= Math.max(entry.node.rect.height * 4, 700)
      return carriesHeroBoxStyling &&
        closeToHeading &&
        plausibleBoxHeight &&
        ancestor.node.rect.width >= entry.node.rect.width + 20 &&
        ancestor.node.rect.height >= entry.node.rect.height
    }) ?? null
  }
  const lineCount = (node: TreeNode): number | null => {
    const lineHeight = parsePx(node.styles.lineHeight) || parsePx(node.styles.fontSize) * 1.2
    if (!lineHeight) return null
    return Math.round((node.rect.height / lineHeight) * 10) / 10
  }
  const percent = (value: number): string => `${Math.round(value * 100)}%`

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
  const headingPairs = matchTextEntries(aHeadings, bHeadings, {
    minTextLength: 3,
    fallbackPrefixLength: 16,
    sameTagOnly: false,
  })

  if (aHeadings.length !== bHeadings.length) {
    lines.push(`  Count: ${aHeadings.length} -> ${bHeadings.length}`)
  }

  for (const { a: aEntry, b: bEntry } of headingPairs) {
    const a = aEntry.node
    const b = bEntry.node
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

  const matchedHeadingA = new Set(headingPairs.map(pair => pair.a.path))
  const matchedHeadingB = new Set(headingPairs.map(pair => pair.b.path))
  const unmatchedHeadingA = aHeadings.filter(entry => !matchedHeadingA.has(entry.path))
  const unmatchedHeadingB = bHeadings.filter(entry => !matchedHeadingB.has(entry.path))
  if (unmatchedHeadingA.length || unmatchedHeadingB.length) {
    lines.push(`  Unmatched headings: ${labelA} ${unmatchedHeadingA.length}, ${labelB} ${unmatchedHeadingB.length}`)
    for (const entry of unmatchedHeadingA.slice(0, 2)) {
      lines.push(`    ${labelA} only: <${entry.node.tag}> "${(entry.node.text || '').substring(0, 50)}"`)
    }
    for (const entry of unmatchedHeadingB.slice(0, 2)) {
      lines.push(`    ${labelB} only: <${entry.node.tag}> "${(entry.node.text || '').substring(0, 50)}"`)
    }
  } else if (headingPairs.length === 0) {
    lines.push('  Unable to match headings by text')
  }

  lines.push('')
  lines.push('=== Hero Wrap Differences ===')
  const aHeroHeading = aHeadings.find(f => f.node.tag === 'h1' && (f.node.text || '').length > 10)
  const bHeroHeading = bHeadings.find(f => f.node.tag === 'h1' && (f.node.text || '').length > 10)
  if (aHeroHeading && bHeroHeading) {
    const diffs: string[] = []
    const aHeading = aHeroHeading.node
    const bHeading = bHeroHeading.node
    const aHeroBox = findNearestMeasuredContainer(aHeroHeading, flatAByPath)
    const bHeroBox = findNearestMeasuredContainer(bHeroHeading, flatBByPath)
    const widthDiff = Math.abs(aHeading.rect.width - bHeading.rect.width)
    const heightDiff = Math.abs(aHeading.rect.height - bHeading.rect.height)
    if (widthDiff > 40) diffs.push(`h1 width: ${aHeading.rect.width}px -> ${bHeading.rect.width}px`)
    if (heightDiff > 12) diffs.push(`h1 height: ${aHeading.rect.height}px -> ${bHeading.rect.height}px`)

    const aLines = lineCount(aHeading)
    const bLines = lineCount(bHeading)
    if (aLines !== null && bLines !== null && Math.abs(aLines - bLines) > 0.4) {
      diffs.push(`line wrap: ~${aLines} lines -> ~${bLines} lines`)
    }

    if (aHeroBox && bHeroBox) {
      const aBg = normalizeColor(aHeroBox.node.styles.backgroundColor)
      const bBg = normalizeColor(bHeroBox.node.styles.backgroundColor)
      const compareHeroBoxes =
        isVisibleBackground(aHeroBox.node.styles.backgroundColor) &&
        isVisibleBackground(bHeroBox.node.styles.backgroundColor)
      if (compareHeroBoxes) {
        if (Math.abs(aHeroBox.node.rect.width - bHeroBox.node.rect.width) > 30) {
          diffs.push(`hero content box width: ${aHeroBox.node.rect.width}px -> ${bHeroBox.node.rect.width}px`)
        }
        if (Math.abs(aHeroBox.node.rect.height - bHeroBox.node.rect.height) > 20) {
          diffs.push(`hero content box height: ${aHeroBox.node.rect.height}px -> ${bHeroBox.node.rect.height}px`)
        }
        if (aBg !== bBg && (!white.has(aBg) || !white.has(bBg))) {
          diffs.push(`hero content box bg: ${aBg} -> ${bBg}`)
        }
      }
    }

    if (diffs.length) {
      lines.push(`  <h1> "${(aHeading.text || bHeading.text).substring(0, 50)}"`)
      for (const diff of diffs) lines.push(`    ${diff}`)
    } else {
      lines.push('  Hero wrap metrics match')
    }
  } else {
    lines.push('  Unable to compare hero headings')
  }

  // Compare paragraphs across the full page using text + vertical position.
  lines.push('')
  lines.push('=== Paragraph Differences (matched across page) ===')
  const aParagraphs = flatA.filter(f => f.node.tag === 'p' && normalizeTextContent(f.node.text).length >= 12)
  const bParagraphs = flatB.filter(f => f.node.tag === 'p' && normalizeTextContent(f.node.text).length >= 12)
  const paragraphPairs = matchTextEntries(aParagraphs, bParagraphs, {
    minTextLength: 12,
    fallbackPrefixLength: 28,
  })
  if (aParagraphs.length !== bParagraphs.length) {
    lines.push(`  Count: ${aParagraphs.length} -> ${bParagraphs.length}`)
  }
  let paragraphDiffs = 0
  for (const { a: aEntry, b: bEntry } of paragraphPairs) {
    const a = getRepresentativeParagraphNode(aEntry)
    const b = getRepresentativeParagraphNode(bEntry)
    const diffs: string[] = []
    if (a.styles.fontSize !== b.styles.fontSize) diffs.push(`fontSize: ${a.styles.fontSize} â†’ ${b.styles.fontSize}`)
    if (a.styles.fontWeight !== b.styles.fontWeight) diffs.push(`fontWeight: ${a.styles.fontWeight} â†’ ${b.styles.fontWeight}`)
    if (a.styles.lineHeight !== b.styles.lineHeight) diffs.push(`lineHeight: ${a.styles.lineHeight} â†’ ${b.styles.lineHeight}`)
    if (a.styles.color !== b.styles.color) diffs.push(`color: ${normalizeColor(a.styles.color)} → ${normalizeColor(b.styles.color)}`)
    if (a.styles.marginBottom !== b.styles.marginBottom) diffs.push(`marginBottom: ${a.styles.marginBottom} → ${b.styles.marginBottom}`)
    if (a.styles.marginTop !== b.styles.marginTop) diffs.push(`marginTop: ${a.styles.marginTop} → ${b.styles.marginTop}`)
    if (diffs.length) {
      paragraphDiffs++
      if (paragraphDiffs <= 12) {
        lines.push(`  <p> "${a.text?.substring(0, 40)}"`)
        for (const d of diffs) lines.push(`    ${d}`)
      }
    }
  }

  if (paragraphDiffs > 12) lines.push(`  ...and ${paragraphDiffs - 12} more paragraph style differences`)
  const matchedParagraphA = new Set(paragraphPairs.map(pair => pair.a.path))
  const matchedParagraphB = new Set(paragraphPairs.map(pair => pair.b.path))
  const unmatchedParagraphA = aParagraphs.filter(entry => !matchedParagraphA.has(entry.path))
  const unmatchedParagraphB = bParagraphs.filter(entry => !matchedParagraphB.has(entry.path))
  if (unmatchedParagraphA.length || unmatchedParagraphB.length) {
    lines.push(`  Unmatched paragraphs: ${labelA} ${unmatchedParagraphA.length}, ${labelB} ${unmatchedParagraphB.length}`)
  } else if (paragraphDiffs === 0) {
    lines.push(`  No paragraph style differences in ${paragraphPairs.length} matched paragraphs`)
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
    // Compare nested list padding (indent detection)
    if (aNested > 0 || bNested > 0) {
      const getNestedPadding = (node: TreeNode): string[] => {
        const result: string[] = []
        for (const c of node.children) {
          if (c.tag === 'ul' || c.tag === 'ol') result.push(c.styles.paddingLeft)
          result.push(...getNestedPadding(c))
        }
        return result
      }
      const aPads = getNestedPadding(a).join(',')
      const bPads = getNestedPadding(b).join(',')
      if (aPads !== bPads) diffs.push(`nested padding: ${aPads || 'none'} → ${bPads || 'none'}`)
    }
    if (diffs.length) {
      lines.push(`  <${a.tag}> (${a.children.length} items)`)
      for (const d of diffs) lines.push(`    ${d}`)
    }
  }

  // ── Text-transform on ALL text elements (not just headings) ────────
  // Catches uppercase/lowercase mismatches on paragraphs, captions, tags
  lines.push('')
  lines.push('=== Text Transform Mismatches ===')
  const textTags = new Set(['p', 'span', 'strong', 'em', 'a', 'li', 'figcaption', 'label', 'h1', 'h2', 'h3', 'h4'])
  const aTextEntries = flatA.filter(f => textTags.has(f.node.tag) && normalizeTextContent(f.node.text).length >= 6)
  const bTextEntries = flatB.filter(f => textTags.has(f.node.tag) && normalizeTextContent(f.node.text).length >= 6)
  const textPairs = matchTextEntries(aTextEntries, bTextEntries, {
    minTextLength: 6,
    fallbackPrefixLength: 18,
    sameTagOnly: false,
  })
  let ttMismatches = 0
  for (const { a: aEntry, b: bEntry } of textPairs) {
    const a = aEntry.node
    const b = bEntry.node
    if (a.styles.textTransform !== b.styles.textTransform && a.text && a.text.length > 5) {
      ttMismatches++
      if (ttMismatches <= 3) {
        lines.push(`  <${a.tag}> "${(a.text || '').substring(0, 35)}"`)
        lines.push(`    textTransform: ${a.styles.textTransform} → ${b.styles.textTransform}`)
      }
    }
  }
  if (ttMismatches > 3) lines.push(`  …and ${ttMismatches - 3} more`)
  if (ttMismatches === 0) lines.push(`  No text-transform mismatches across ${textPairs.length} matched text nodes`)

  // ── Video count check ───────────────────────────────────────────────
  lines.push('')
  lines.push('=== Video Check ===')
  const aVids = flatA.filter(f => f.node.tag === 'video')
  const bVids = flatB.filter(f => f.node.tag === 'video')
  if (aVids.length !== bVids.length) {
    lines.push(`  Video count: ${aVids.length} → ${bVids.length}`)
  } else {
    lines.push(`  Video count matches (${aVids.length})`)
  }

  // ── Duplicate text detection ───────────────────────────────────────
  // Compares how many times each text appears on BOTH sides. Only flags
  // when B has MORE copies than A (extra duplication), not when both
  // sides have the same number of intentional repetitions.
  lines.push('')
  lines.push(`=== Extra Duplicates (${labelB} has more copies than ${labelA}) ===`)
  const textCount = (flat: typeof flatA) => {
    const map = new Map<string, number>()
    for (const { node } of flat) {
      if (node.text && node.text.length > 20 && ['h1','h2','h3','h4','p'].includes(node.tag)) {
        const key = node.text.substring(0, 60)
        map.set(key, (map.get(key) || 0) + 1)
      }
    }
    return map
  }
  const aTextCounts = textCount(flatA)
  const bTextCounts = textCount(flatB)
  let dupeCount = 0
  for (const [text, bCount] of bTextCounts) {
    const aCount = aTextCounts.get(text) || 0
    if (bCount > aCount && bCount > 1) {
      dupeCount++
      if (dupeCount <= 3) lines.push(`  ⚠ "${text}" — ${labelA}: ${aCount}×, ${labelB}: ${bCount}× (+${bCount - aCount} extra)`)
    }
  }
  if (dupeCount > 3) lines.push(`  …and ${dupeCount - 3} more extra duplicates`)
  if (dupeCount === 0) lines.push(`  No extra duplicates`)

  // ── Extra content detection ────────────────────────────────────────
  // Catches paragraphs in B that don't have a fuzzy match in A
  // (e.g. academic quote definitions migrated but never on the live site)
  lines.push('')
  lines.push(`=== Extra Content (in ${labelB} but not ${labelA}) ===`)
  const aPTexts = new Set(flatA.filter(f => f.node.tag === 'p' && f.node.text && f.node.text.length > 30)
    .map(f => (f.node.text || '').substring(0, 30).toLowerCase()))
  const bParagraphs2 = flatB.filter(f => f.node.tag === 'p' && f.node.text && f.node.text.length > 30)
  let extraCount = 0
  for (const { node } of bParagraphs2) {
    const key = (node.text || '').substring(0, 30).toLowerCase()
    if (!aPTexts.has(key)) {
      extraCount++
      if (extraCount <= 3) lines.push(`  ⚠ "${(node.text || '').substring(0, 50)}…"`)
    }
  }
  if (extraCount > 3) lines.push(`  …and ${extraCount - 3} more extra paragraphs`)
  if (extraCount === 0) lines.push(`  No extra content`)

  // ── Image layout comparison ────────────────────────────────────────
  // Catches side-by-side vs stacked mismatches (e.g. image next to text
  // when it should be above text)
  lines.push('')
  lines.push('=== Image Layout Comparison ===')
  const aImages = flatA.filter(f => f.node.tag === 'img' && f.node.rect.width > 100)
  const bImages = flatB.filter(f => f.node.tag === 'img' && f.node.rect.width > 100)
  let layoutMismatches = 0
  for (let i = 0; i < Math.min(aImages.length, bImages.length); i++) {
    const aImg = aImages[i].node
    const bImg = bImages[i].node
    const aWpct = Math.round((aImg.rect.width / 1280) * 100)
    const bWpct = Math.round((bImg.rect.width / 1280) * 100)
    // Flag if one image is <40% width (side-by-side) and the other is >70% (full-width)
    if ((aWpct < 40 && bWpct > 70) || (aWpct > 70 && bWpct < 40)) {
      layoutMismatches++
      if (layoutMismatches <= 3) {
        lines.push(`  ⚠ Image #${i + 1} [${aImg.src || ''}]: ${aWpct}%w → ${bWpct}%w (${aWpct < 40 ? 'side-by-side→full' : 'full→side-by-side'})`)
      }
    }
  }
  if (layoutMismatches > 3) lines.push(`  …and ${layoutMismatches - 3} more layout mismatches`)
  if (layoutMismatches === 0) lines.push(`  Image layouts match`)

  lines.push('')
  lines.push('=== Image Occupancy Differences ===')
  const buildImageSamples = (flat: FlatNode[], map: Map<string, FlatNode>) =>
    flat
      .map(entry => {
        if (entry.node.tag !== 'img') return null
        if (entry.node.rect.width <= 250 || entry.node.rect.height <= 120) return null
        const ancestors = getAncestors(entry, map)
        if (!ancestors.some(ancestor => ancestor.node.tag === 'a')) return null
        const parent = entry.parentPath ? map.get(entry.parentPath) ?? null : null
        if (!parent) return null
        if (parent.node.rect.width <= 300 || parent.node.rect.height <= 220) return null
        if (parent.node.rect.width > 650) return null

        const topOffset = entry.node.rect.y - parent.node.rect.y
        const bottomOffset = parent.node.rect.height - entry.node.rect.height - topOffset
        const leftOffset = entry.node.rect.x - parent.node.rect.x
        const rightOffset = parent.node.rect.width - entry.node.rect.width - leftOffset

        return {
          src: entry.node.src || '(unknown)',
          widthRatio: entry.node.rect.width / parent.node.rect.width,
          heightRatio: entry.node.rect.height / parent.node.rect.height,
          topOffset,
          bottomOffset,
          leftOffset,
          rightOffset,
        }
      })
      .filter((sample): sample is NonNullable<typeof sample> => sample !== null)

  const aImageSamples = buildImageSamples(flatA, flatAByPath)
  const bImageSamples = buildImageSamples(flatB, flatBByPath)
  let occupancyMismatches = 0
  for (let i = 0; i < Math.min(aImageSamples.length, bImageSamples.length); i++) {
    const a = aImageSamples[i]
    const b = bImageSamples[i]
    const diffs: string[] = []
    if (Math.abs(a.heightRatio - b.heightRatio) > 0.18) {
      diffs.push(`height occupancy: ${percent(a.heightRatio)} -> ${percent(b.heightRatio)}`)
    }
    if (Math.abs(a.topOffset - b.topOffset) > 20 || Math.abs(a.bottomOffset - b.bottomOffset) > 20) {
      diffs.push(`vertical padding: top ${Math.round(a.topOffset)}px / bottom ${Math.round(a.bottomOffset)}px -> top ${Math.round(b.topOffset)}px / bottom ${Math.round(b.bottomOffset)}px`)
    }
    if (Math.abs(a.leftOffset - b.leftOffset) > 20 || Math.abs(a.rightOffset - b.rightOffset) > 20) {
      diffs.push(`horizontal padding: left ${Math.round(a.leftOffset)}px / right ${Math.round(a.rightOffset)}px -> left ${Math.round(b.leftOffset)}px / right ${Math.round(b.rightOffset)}px`)
    }
    if (diffs.length) {
      occupancyMismatches++
      if (occupancyMismatches <= 5) {
        lines.push(`  <img> "${a.src}"`)
        for (const diff of diffs) lines.push(`    ${diff}`)
      }
    }
  }
  if (aImageSamples.length !== bImageSamples.length) {
    lines.push(`  Sample count: ${aImageSamples.length} -> ${bImageSamples.length}`)
  }
  if (occupancyMismatches === 0 && aImageSamples.length === bImageSamples.length) {
    lines.push('  Image occupancy metrics match')
  } else if (occupancyMismatches > 5) {
    lines.push(`  …and ${occupancyMismatches - 5} more occupancy mismatches`)
  }

  // Check for background-colored sections — compare which text lives
  // inside a colored background on one site but not the other.
  // This catches "card" styling differences where Gatsby wraps content
  // in a .background--gray div but Next.js renders it as plain unstyled text.
  lines.push('')
  lines.push('=== Background Sections ===')
  const isBgColored = (f: { node: TreeNode }) => {
    const textLength = normalizeTextContent(f.node.text).length
    return Boolean(
      f.node.styles.backgroundColor &&
      f.node.styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      f.node.styles.backgroundColor !== 'rgb(255, 255, 255)' &&
      f.node.rect.width > 200 &&
      f.node.rect.height > 40 &&
      f.node.rect.height <= 260 &&
      textLength <= 220
    )
  }
  const aBg = flatA.filter(isBgColored)
  const bBg = flatB.filter(isBgColored)
  if (aBg.length !== bBg.length) {
    lines.push(`  Count: ${aBg.length} → ${bBg.length}`)
  }
  // Extract text snippets inside bg sections for each side
  const bgText = (flat: typeof flatA) => {
    const bgNodes = flat.filter(isBgColored)
    const texts = new Map<string, string>()
    for (const { node } of bgNodes) {
      // Walk children to collect text
      const walk = (n: TreeNode) => {
        const normalized = normalizeTextContent(n.text).slice(0, 40)
        if (normalized.length > 15 && !texts.has(normalized)) {
          texts.set(normalized, (n.text || '').substring(0, 40))
        }
        for (const c of n.children) walk(c)
      }
      walk(node)
    }
    return texts
  }
  const aBgTexts = bgText(flatA)
  const bBgTexts = bgText(flatB)
  // Report text in A's bg sections but missing from B's bg sections
  let bgMismatches = 0
  for (const [t] of aBgTexts) {
    if (!bBgTexts.has(t)) {
      bgMismatches++
      if (bgMismatches <= 5) lines.push(`  ⚠ ${labelA} has bg-styled: "${t}…" — ${labelB} renders unstyled`)
    }
  }
  for (const [t] of bBgTexts) {
    if (!aBgTexts.has(t)) {
      bgMismatches++
      if (bgMismatches <= 5) lines.push(`  ⚠ ${labelB} has bg-styled: "${t}…" — ${labelA} renders unstyled`)
    }
  }
  if (bgMismatches > 5) lines.push(`  …and ${bgMismatches - 5} more bg-style mismatches`)
  if (bgMismatches === 0 && aBg.length === bBg.length) lines.push(`  Background sections match`)

  // Gray quote bands should be full-bleed, not trapped inside the article width.
  lines.push('')
  lines.push('=== Quote Background Width ===')
  const findQuoteBackgroundNodes = (
    flat: FlatNode[],
  ): FlatNode[] => flat.filter((entry) => {
    if (!isVisibleBackground(entry.node.styles.backgroundColor) || isWhiteBackground(entry.node.styles.backgroundColor)) {
      return false
    }
    if (entry.node.rect.width < 300 || entry.node.rect.height < 100) return false

    const descendants = getDescendantEntries(entry, flat)
    const quoteParagraph = descendants.find((candidate) =>
      candidate.node.tag === 'p' &&
      parsePx(candidate.node.styles.fontSize) >= 20 &&
      normalizeTextContent(candidate.node.text).length >= 30
    )
    const quoteCaption = descendants.find((candidate) =>
      candidate.node.tag === 'p' &&
      parsePx(candidate.node.styles.fontSize) <= 16 &&
      normalizeTextContent(candidate.node.text).length >= 10
    )

    return Boolean(quoteParagraph && quoteCaption)
  })
  const quoteKey = (entry: FlatNode, flat: FlatNode[]): string => {
    const descendants = getDescendantEntries(entry, flat)
    const quoteParagraph = descendants.find((candidate) =>
      candidate.node.tag === 'p' &&
      parsePx(candidate.node.styles.fontSize) >= 20 &&
      normalizeTextContent(candidate.node.text).length >= 30
    )
    return normalizeTextContent(quoteParagraph?.node.text || entry.node.text).slice(0, 50)
  }
  const aQuoteNodes = findQuoteBackgroundNodes(flatA)
  const bQuoteNodes = findQuoteBackgroundNodes(flatB)
  if (aQuoteNodes.length !== bQuoteNodes.length) {
    lines.push(`  Count: ${aQuoteNodes.length} → ${bQuoteNodes.length}`)
  }
  let quoteWidthMismatches = 0
  const usedQuotePaths = new Set<string>()
  for (const aEntry of aQuoteNodes) {
    const key = quoteKey(aEntry, flatA)
    const bCandidates = bQuoteNodes.filter((candidate) =>
      !usedQuotePaths.has(candidate.path) &&
      quoteKey(candidate, flatB) === key
    )
    const bEntry = pickNearestByY(bCandidates, aEntry.node.rect.y, usedQuotePaths)
    if (!bEntry) continue
    usedQuotePaths.add(bEntry.path)

    const widthDiff = Math.abs(aEntry.node.rect.width - bEntry.node.rect.width)
    if (widthDiff > 80) {
      quoteWidthMismatches++
      if (quoteWidthMismatches <= 5) {
        lines.push(
          `  ⚠ Quote "${key.slice(0, 28)}…" background width: ${aEntry.node.rect.width}px → ${bEntry.node.rect.width}px`
        )
      }
    }
  }
  if (quoteWidthMismatches === 0 && aQuoteNodes.length === bQuoteNodes.length) {
    lines.push('  Quote background widths match')
  } else if (quoteWidthMismatches > 5) {
    lines.push(`  …and ${quoteWidthMismatches - 5} more quote width mismatches`)
  }

  // Newsletter cards should not inherit an extra tinted section background
  // unless the reference page does the same.
  lines.push('')
  lines.push('=== Newsletter Background ===')
  const findNewsletterHeading = (flat: FlatNode[]): FlatNode | null =>
    flat.find((entry) =>
      entry.node.tag === 'h2' &&
      normalizeTextContent(entry.node.text).includes('subscribe to our newsletter')
    ) ?? null
  const findNearestTintedAncestor = (
    entry: FlatNode | null,
    map: Map<string, FlatNode>,
  ): FlatNode | null => {
    if (!entry) return null
    return getAncestors(entry, map).find((ancestor) =>
      isVisibleBackground(ancestor.node.styles.backgroundColor) &&
      !isWhiteBackground(ancestor.node.styles.backgroundColor) &&
      ancestor.node.rect.width >= entry.node.rect.width
    ) ?? null
  }
  const aNewsletterHeading = findNewsletterHeading(flatA)
  const bNewsletterHeading = findNewsletterHeading(flatB)
  const aNewsletterBg = findNearestTintedAncestor(aNewsletterHeading, flatAByPath)
  const bNewsletterBg = findNearestTintedAncestor(bNewsletterHeading, flatBByPath)
  if (aNewsletterBg || bNewsletterBg) {
    if (!aNewsletterBg && bNewsletterBg) {
      lines.push(`  ⚠ ${labelB} adds a tinted newsletter wrapper (${normalizeColor(bNewsletterBg.node.styles.backgroundColor)}) that ${labelA} does not have`)
    } else if (aNewsletterBg && !bNewsletterBg) {
      lines.push(`  ⚠ ${labelA} has a tinted newsletter wrapper (${normalizeColor(aNewsletterBg.node.styles.backgroundColor)}) that ${labelB} is missing`)
    } else if (aNewsletterBg && bNewsletterBg && aNewsletterBg.node.styles.backgroundColor !== bNewsletterBg.node.styles.backgroundColor) {
      lines.push(`  ⚠ newsletter wrapper bg: ${normalizeColor(aNewsletterBg.node.styles.backgroundColor)} → ${normalizeColor(bNewsletterBg.node.styles.backgroundColor)}`)
    } else {
      lines.push('  Newsletter background wrappers match')
    }
  } else {
    lines.push('  Newsletter background wrappers match')
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
    // Padding (compare vertical and horizontal as shorthand if uniform, otherwise full)
    const aPadV = `${a.styles.paddingTop} ${a.styles.paddingBottom}`
    const bPadV = `${b.styles.paddingTop} ${b.styles.paddingBottom}`
    const aPadH = `${a.styles.paddingLeft} ${a.styles.paddingRight}`
    const bPadH = `${b.styles.paddingLeft} ${b.styles.paddingRight}`
    if (aPadV !== bPadV || aPadH !== bPadH) {
      const fmt = (top: string, right: string, bottom: string, left: string) =>
        (top === bottom && left === right) ? `${top} ${left}` : `${top} ${right} ${bottom} ${left}`
      const aP = fmt(a.styles.paddingTop, a.styles.paddingRight, a.styles.paddingBottom, a.styles.paddingLeft)
      const bP = fmt(b.styles.paddingTop, b.styles.paddingRight, b.styles.paddingBottom, b.styles.paddingLeft)
      diffs.push(`padding: ${aP} → ${bP}`)
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

function formatViewport(viewport: ViewportPreset): string {
  return `${viewport.name} (${viewport.width}x${viewport.height})`
}

function parseViewportPresets(args: string[], defaultNames: ViewportName[]): ViewportPreset[] {
  const requested = args.includes('--mobile')
    ? ['mobile']
    : (getArgValue(args, '--viewports')?.split(',').map(value => value.trim()).filter(Boolean) ?? defaultNames)

  const invalid = requested.filter(
    (name): name is string => !(name in VIEWPORT_PRESETS),
  )

  if (invalid.length > 0) {
    throw new Error(
      `Unknown viewport preset(s): ${invalid.join(', ')}. Available presets: ${Object.keys(VIEWPORT_PRESETS).join(', ')}`,
    )
  }

  return [...new Set(requested)].map(name => VIEWPORT_PRESETS[name as ViewportName])
}

async function applyViewport(page: Page, viewport: ViewportPreset): Promise<void> {
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
  })
}

async function loadSnapshotForUrl(page: Page, url: string, viewport: ViewportPreset): Promise<PageSnapshot> {
  let lastError: unknown

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await applyViewport(page, viewport)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
      await new Promise(resolve => setTimeout(resolve, 1000))
      await preparePageForCapture(page)
      const [tree, responsive] = await Promise.all([
        extractTree(page),
        collectResponsiveDiagnostics(page),
      ])
      return { tree, responsive }
    } catch (error) {
      lastError = error
      if (attempt === 2) break
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function issueSignature(issue: ResponsiveIssue): string {
  return `${issue.tag}|${issue.src || ''}|${issue.text.substring(0, 40)}`
}

function formatResponsiveIssue(issue: ResponsiveIssue): string {
  const content = issue.src
    ? `[${issue.src}]`
    : issue.text
      ? `"${issue.text.substring(0, 60)}${issue.text.length > 60 ? '...' : ''}"`
      : ''
  const overflowParts: string[] = []
  if (issue.overflowLeft > 0) overflowParts.push(`left ${issue.overflowLeft}px`)
  if (issue.overflowRight > 0) overflowParts.push(`right ${issue.overflowRight}px`)
  const dimensions = `${issue.width}x${issue.height}`
  const overflow = overflowParts.length > 0 ? `, overflow ${overflowParts.join(' / ')}` : ''
  const clipping = issue.scrollWidth && issue.clientWidth
    ? `, scroll ${issue.scrollWidth}px vs client ${issue.clientWidth}px`
    : ''
  return `<${issue.tag}>${content ? ` ${content}` : ''} (${dimensions}${overflow}${clipping})`
}

function additionalIssues(base: ResponsiveIssue[], candidate: ResponsiveIssue[]): ResponsiveIssue[] {
  const baseSignatures = new Set(base.map(issueSignature))
  return candidate.filter(issue => !baseSignatures.has(issueSignature(issue)))
}

function diffResponsiveDiagnostics(
  diagnosticsA: ResponsiveDiagnostics,
  diagnosticsB: ResponsiveDiagnostics,
  labelA: string,
  labelB: string,
  viewport: ViewportPreset,
): string[] {
  const lines: string[] = []
  const compareIssueGroup = (
    title: string,
    countA: number,
    countB: number,
    issuesA: ResponsiveIssue[],
    issuesB: ResponsiveIssue[],
    emptyMessage: string,
  ) => {
    lines.push('')
    lines.push(`=== ${title} ===`)

    const extras = additionalIssues(issuesA, issuesB)
    const countWorse = countB > countA
    if (!countWorse && extras.length === 0) {
      lines.push(`  ${emptyMessage}`)
      return
    }

    if (countA !== countB) {
      lines.push(`  Count: ${countA} → ${countB}`)
    }

    const examples = (extras.length > 0 ? extras : issuesB).slice(0, 5)
    for (const issue of examples) {
      lines.push(`  ⚠ ${labelB} ${formatResponsiveIssue(issue)}`)
    }
  }

  lines.push('')
  lines.push('=== Responsive Overflow ===')
  const extraOverflowingElements = additionalIssues(
    diagnosticsA.overflowingElements,
    diagnosticsB.overflowingElements,
  )
  if (diagnosticsB.horizontalOverflowPx <= 4 && extraOverflowingElements.length === 0) {
    lines.push('  No additional overflow detected')
  } else {
    lines.push(
      `  Document overflow: ${labelA} ${diagnosticsA.horizontalOverflowPx}px → ${labelB} ${diagnosticsB.horizontalOverflowPx}px`,
    )
    if (diagnosticsA.overflowingElementCount !== diagnosticsB.overflowingElementCount) {
      lines.push(
        `  Off-screen elements: ${diagnosticsA.overflowingElementCount} → ${diagnosticsB.overflowingElementCount}`,
      )
    }

    const examples = (extraOverflowingElements.length > 0
      ? extraOverflowingElements
      : diagnosticsB.overflowingElements).slice(0, 5)
    for (const issue of examples) {
      lines.push(`  ⚠ ${labelB} ${formatResponsiveIssue(issue)}`)
    }
  }

  compareIssueGroup(
    'Responsive Media Sizing',
    diagnosticsA.oversizedMediaCount,
    diagnosticsB.oversizedMediaCount,
    diagnosticsA.oversizedMedia,
    diagnosticsB.oversizedMedia,
    'No additional oversized media detected',
  )

  compareIssueGroup(
    'Responsive Text Clipping',
    diagnosticsA.clippedTextCount,
    diagnosticsB.clippedTextCount,
    diagnosticsA.clippedText,
    diagnosticsB.clippedText,
    'No additional text clipping detected',
  )

  if (viewport.name === 'mobile') {
    compareIssueGroup(
      'Responsive Tap Targets',
      diagnosticsA.tinyTapTargetCount,
      diagnosticsB.tinyTapTargetCount,
      diagnosticsA.tinyTapTargets,
      diagnosticsB.tinyTapTargets,
      'No additional undersized tap targets detected',
    )
  }

  return lines
}

function buildResponsiveSelfAudit(diagnostics: ResponsiveDiagnostics, viewport: ViewportPreset): string[] {
  const lines: string[] = []
  lines.push('=== Responsive Self Audit ===')

  const issueLines: string[] = []
  if (diagnostics.horizontalOverflowPx > 4) {
    issueLines.push(`  Document overflow: ${diagnostics.horizontalOverflowPx}px`)
  }
  if (diagnostics.overflowingElementCount > 0) {
    issueLines.push(`  Off-screen elements: ${diagnostics.overflowingElementCount}`)
    for (const issue of diagnostics.overflowingElements.slice(0, 4)) {
      issueLines.push(`    ⚠ ${formatResponsiveIssue(issue)}`)
    }
  }
  if (diagnostics.oversizedMediaCount > 0) {
    issueLines.push(`  Oversized media: ${diagnostics.oversizedMediaCount}`)
    for (const issue of diagnostics.oversizedMedia.slice(0, 4)) {
      issueLines.push(`    ⚠ ${formatResponsiveIssue(issue)}`)
    }
  }
  if (diagnostics.clippedTextCount > 0) {
    issueLines.push(`  Clipped text blocks: ${diagnostics.clippedTextCount}`)
    for (const issue of diagnostics.clippedText.slice(0, 4)) {
      issueLines.push(`    ⚠ ${formatResponsiveIssue(issue)}`)
    }
  }
  if (viewport.name === 'mobile' && diagnostics.tinyTapTargetCount > 0) {
    issueLines.push(`  Undersized tap targets: ${diagnostics.tinyTapTargetCount}`)
    for (const issue of diagnostics.tinyTapTargets.slice(0, 4)) {
      issueLines.push(`    ⚠ ${formatResponsiveIssue(issue)}`)
    }
  }

  if (issueLines.length === 0) {
    lines.push('  No responsive issues detected')
  } else {
    lines.push(...issueLines)
  }

  return lines
}

function buildDiffReport(
  snapshotA: PageSnapshot,
  snapshotB: PageSnapshot,
  labelA: string,
  labelB: string,
  viewport: ViewportPreset,
): string[] {
  return [
    ...diffTrees(snapshotA.tree, snapshotB.tree, labelA, labelB),
    ...diffResponsiveDiagnostics(snapshotA.responsive, snapshotB.responsive, labelA, labelB, viewport),
  ]
}

function getArgValue(args: string[], flag: string): string | null {
  const inline = args.find(arg => arg.startsWith(`${flag}=`))
  if (inline) return inline.substring(flag.length + 1)

  const index = args.indexOf(flag)
  if (index >= 0 && index < args.length - 1) return args[index + 1]
  return null
}

function printUsage(): void {
  console.log('Usage:')
  console.log('  npx tsx scripts/page-tree.ts <url>')
  console.log('  npx tsx scripts/page-tree.ts <url> --json')
  console.log('  npx tsx scripts/page-tree.ts <url> --diff <url2>')
  console.log('  npx tsx scripts/page-tree.ts <url> --diff <url2> --viewports desktop,mobile')
  console.log('  npx tsx scripts/page-tree.ts <url> --mobile')
  console.log('  npx tsx scripts/page-tree.ts --list-baselines')
  console.log('  npx tsx scripts/page-tree.ts --baseline vision-approved [--limit 3] [--viewports desktop,mobile]')
}

function summarizeDiffLines(diffLines: string[]): string[] {
  const focusSections = new Set([
    'Hero Wrap Differences',
    'Image Layout Comparison',
    'Image Occupancy Differences',
    'Broken Images',
    'Responsive Overflow',
    'Responsive Media Sizing',
    'Responsive Text Clipping',
    'Responsive Tap Targets',
  ])
  const harmlessLines = new Set([
    'Hero wrap metrics match',
    'Unable to compare hero headings',
    'Image layouts match',
    'Image occupancy metrics match',
    'All images loaded successfully on both sides',
    'No additional overflow detected',
    'No additional oversized media detected',
    'No additional text clipping detected',
    'No additional undersized tap targets detected',
  ])

  const findings: string[] = []
  let currentSection = ''
  let currentViewport = ''

  for (const line of diffLines) {
    if (line.startsWith('=== ') && line.endsWith(' ===')) {
      const heading = line.replace(/^===\s*/, '').replace(/\s*===$/, '')
      if (heading.startsWith('Viewport: ')) {
        currentViewport = heading.replace('Viewport: ', '').trim()
        currentSection = ''
      } else {
        currentSection = heading
      }
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) continue

    if (!focusSections.has(currentSection)) continue
    if (harmlessLines.has(trimmed) || trimmed.startsWith('No ')) continue
    if (trimmed.startsWith('Sample count:')) continue

    const viewportPrefix = currentViewport ? `[${currentViewport}]` : ''
    findings.push(`${viewportPrefix}[${currentSection}] ${trimmed}`)
  }

  return [...new Set(findings)]
}

async function runBaselineBatch(
  baselineName: string,
  viewports: ViewportPreset[],
  limit?: number,
): Promise<void> {
  const baselinePages = getPageTreeBaselineSet(baselineName)
  if (baselinePages.length === 0) {
    console.error(`Unknown baseline set "${baselineName}".`)
    console.error(`Available baseline sets: ${listPageTreeBaselineSets().join(', ')}`)
    process.exit(1)
  }

  const selectedPages = typeof limit === 'number' && limit > 0
    ? baselinePages.slice(0, limit)
    : baselinePages

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  const results: {
    baseline: PageTreeBaselinePage
    findings: string[]
    error?: string
  }[] = []

  for (let index = 0; index < selectedPages.length; index++) {
    const baseline = selectedPages[index]
    const gatsbyUrl = `https://www.goinvo.com${baseline.path}/`
    const nextUrl = `http://localhost:3000${baseline.path}`
    process.stderr.write(
      `[${index + 1}/${selectedPages.length}] ${baseline.label} [${viewports.map(viewport => viewport.name).join(', ')}]... `,
    )

    try {
      const allFindings: string[] = []

      for (const viewport of viewports) {
        const gatsbySnapshot = await loadSnapshotForUrl(page, gatsbyUrl, viewport)
        const nextSnapshot = await loadSnapshotForUrl(page, nextUrl, viewport)
        const diffLines = buildDiffReport(gatsbySnapshot, nextSnapshot, 'Gatsby', 'Next.js', viewport)
        const viewportDiffLines = viewports.length > 1
          ? [`=== Viewport: ${formatViewport(viewport)} ===`, ...diffLines]
          : diffLines
        allFindings.push(...summarizeDiffLines(viewportDiffLines))
      }

      const findings = allFindings.filter(finding =>
        !baseline.allowedFindings?.some(allowed => finding.includes(allowed))
      )
      results.push({ baseline, findings })
      process.stderr.write(findings.length === 0 ? 'clean\n' : `${findings.length} finding(s)\n`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ baseline, findings: [], error: message })
      process.stderr.write('error\n')
    }
  }

  await browser.close()

  const clean = results.filter(result => result.findings.length === 0 && !result.error)
  const errors = results.filter(result => result.error)
  const flagged = results.filter(result => result.findings.length > 0)

  console.log(`Baseline set: ${baselineName}`)
  console.log(`Pages checked: ${results.length}`)
  console.log(`Clean: ${clean.length}`)
  console.log(`Flagged: ${flagged.length}`)
  console.log(`Errors: ${errors.length}`)
  console.log()

  if (flagged.length > 0) {
    console.log('Flagged pages:')
    for (const result of flagged) {
      console.log(`- ${result.baseline.label} (${result.baseline.path})`)
      for (const finding of result.findings.slice(0, 6)) {
        console.log(`  ${finding}`)
      }
      if (result.findings.length > 6) {
        console.log(`  ...and ${result.findings.length - 6} more`)
      }
    }
    console.log()
  }

  if (clean.length > 0) {
    console.log(`Clean pages: ${clean.map(result => result.baseline.slug).join(', ')}`)
    console.log()
  }

  if (errors.length > 0) {
    console.log('Errors:')
    for (const result of errors) {
      console.log(`- ${result.baseline.label}: ${result.error}`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const url = args.find(a => a.startsWith('http'))
  const jsonMode = args.includes('--json')
  const diffIdx = args.indexOf('--diff')
  const url2 = diffIdx >= 0 ? args[diffIdx + 1] : null
  const baselineName = getArgValue(args, '--baseline')
  const limitArg = getArgValue(args, '--limit')
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined
  const listBaselines = args.includes('--list-baselines')
  const viewports = parseViewportPresets(args, baselineName ? ['desktop', 'mobile'] : ['desktop'])

  if (listBaselines) {
    console.log(listPageTreeBaselineSets().join('\n'))
    return
  }

  if (baselineName) {
    await runBaselineBatch(baselineName, viewports, limit)
    return
  }

  if (!url) {
    printUsage()
    process.exit(1)
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  if (url2) {
    const outputLines: string[] = []

    for (const viewport of viewports) {
      console.error(`Fetching ${url} [${formatViewport(viewport)}]...`)
      const snapshotA = await loadSnapshotForUrl(page, url, viewport)
      console.error(`Fetching ${url2} [${formatViewport(viewport)}]...`)
      const snapshotB = await loadSnapshotForUrl(page, url2, viewport)
      const diffLines = buildDiffReport(snapshotA, snapshotB, 'A', 'B', viewport)

      if (viewports.length > 1) {
        outputLines.push(`=== Viewport: ${formatViewport(viewport)} ===`)
      }
      outputLines.push(...diffLines)
      if (viewports.length > 1) {
        outputLines.push('')
      } else {
        outputLines.push('')
        outputLines.push('=== Tree A ===')
        outputLines.push(...printTree(snapshotA.tree))
        outputLines.push('')
        outputLines.push('=== Tree B ===')
        outputLines.push(...printTree(snapshotB.tree))
      }
    }

    console.log(outputLines.join('\n').trim())
  } else if (jsonMode) {
    const snapshots = []
    for (const viewport of viewports) {
      console.error(`Fetching ${url} [${formatViewport(viewport)}]...`)
      const snapshot = await loadSnapshotForUrl(page, url, viewport)
      snapshots.push({
        viewport: formatViewport(viewport),
        tree: snapshot.tree,
        responsive: snapshot.responsive,
      })
    }

    console.log(JSON.stringify(viewports.length === 1 ? snapshots[0] : snapshots, null, 2))
  } else {
    const outputLines: string[] = []
    for (const viewport of viewports) {
      console.error(`Fetching ${url} [${formatViewport(viewport)}]...`)
      const snapshot = await loadSnapshotForUrl(page, url, viewport)
      if (viewports.length > 1) {
        outputLines.push(`=== Viewport: ${formatViewport(viewport)} ===`)
      }
      outputLines.push(...printTree(snapshot.tree))
      outputLines.push('')
      outputLines.push(...buildResponsiveSelfAudit(snapshot.responsive, viewport))
      outputLines.push('')
    }
    console.log(outputLines.join('\n').trim())
  }

  await browser.close()
}

main().catch(console.error)
