/**
 * Confine a ported legacy stylesheet to its own page.
 *
 * A page CSS file in the App Router is NOT scoped — it is a global stylesheet
 * that happens to be imported by one route. Once the browser has it (a plain
 * visit is enough; client-side navigation never unloads it), every bare
 * selector in it applies to every other page.
 *
 * understanding-zika/zika.css is a whole 2018 stylesheet dumped in verbatim,
 * `body { background: #232323; color: #fff }` and all. Visiting that page and
 * clicking any link left the ENTIRE SITE dark — the homepage included. Verified
 * on production before this fix.
 *
 * This rewrites every selector to sit under a page wrapper class:
 *   body            -> .wrapper           (body's own paint moves onto the wrapper)
 *   html            -> .wrapper
 *   h1, .row, ...   -> .wrapper h1, .wrapper .row, ...
 * At-rules (@media, @supports) are recursed into; @font-face, @keyframes and
 * their frame selectors are left alone.
 *
 *   node scripts/scope-page-css.mjs --file src/.../zika.css --scope understanding-zika
 *   node scripts/scope-page-css.mjs --file ... --scope ... --write
 */
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const write = args.includes('--write')
const file = flag('file')
const scopeClass = flag('scope')
if (!file || !scopeClass) throw new Error('Need --file <css> and --scope <class-name>')

const SCOPE = `.${scopeClass}`
/** At-rules whose inner selectors are not page selectors and must not be touched. */
const OPAQUE_AT_RULES = /^@(font-face|keyframes|-webkit-keyframes|counter-style|page|property|layer\s|import|charset|namespace)/i
/** At-rules that wrap ordinary rules, so we recurse into their body. */
const TRANSPARENT_AT_RULES = /^@(media|supports|container|layer)\b/i

/** Prefix one selector so it can only match inside the page wrapper. */
function scopeSelector(selector) {
  return selector
    .split(',')
    .map((part) => {
      const trimmed = part.trim()
      if (!trimmed) return trimmed

      // Already confined to this page.
      if (trimmed === SCOPE || trimmed.startsWith(`${SCOPE} `) || trimmed.startsWith(`${SCOPE}.`)) {
        return trimmed
      }

      // html/body paint the page canvas. There is no ancestor to scope them to,
      // so their declarations move onto the wrapper element itself — which is
      // why the wrapper needs to fill the viewport (see the min-height note in
      // the stylesheet).
      const root = trimmed.match(/^(html|body)\b(.*)$/i)
      if (root) return `${SCOPE}${root[2]}`

      // Keep a leading pseudo-class attached to the wrapper rather than
      // producing a descendant of it (e.g. `:root` variables).
      if (trimmed.startsWith(':root')) return `${SCOPE}${trimmed.slice(5)}`

      return `${SCOPE} ${trimmed}`
    })
    .join(', ')
}

/**
 * Split a rule prelude into the comments it contains and the selector text.
 *
 * Preludes carry comments — often a whole paragraph explaining the rule, and in
 * a minified legacy file the comment can sit between two rules with no newline.
 * Scoping must not touch a single character inside them: the first version of
 * this script rewrote comment bodies and emitted `.wrapper /* note *\/` as a
 * selector, which failed the CSS parser outright and 500'd the page.
 */
function splitPrelude(prelude) {
  const comments = []
  const selector = prelude.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match)
    return ' '
  })
  return { comments, selector }
}

/**
 * Walk the stylesheet brace by brace. A hand-rolled scanner rather than a CSS
 * parser dependency: this has to run on a minified 2018 file with nested media
 * queries, and it must not reformat anything it does not scope.
 *
 * Braces inside comments and strings (`content: "}"`) are skipped, or they
 * would desynchronise the depth counter.
 */
function scopeCss(css) {
  let out = ''
  let index = 0
  let selectorStart = 0
  let depth = 0
  /** Stack of booleans: is the current block opaque (leave its contents alone)? */
  const opaque = []

  while (index < css.length) {
    const char = css[index]

    // Skip comments wholesale — they may contain braces, quotes, anything.
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end === -1 ? css.length : end + 2
      continue
    }

    // Skip strings, which may contain braces.
    if (char === '"' || char === "'") {
      index += 1
      while (index < css.length && css[index] !== char) {
        if (css[index] === '\\') index += 1
        index += 1
      }
      index += 1
      continue
    }

    if (char === '{') {
      const prelude = css.slice(selectorStart, index)
      const { comments, selector } = splitPrelude(prelude)
      const trimmed = selector.trim()
      const isAtRule = trimmed.startsWith('@')
      const insideOpaque = opaque.some(Boolean)

      if (isAtRule || insideOpaque) {
        // At-rule preludes and keyframe/font-face selectors pass through whole.
        out += prelude
        opaque.push(
          insideOpaque || (OPAQUE_AT_RULES.test(trimmed) && !TRANSPARENT_AT_RULES.test(trimmed)),
        )
      } else {
        // Re-emit the comments first, then the scoped selector, so nothing
        // inside a comment is ever rewritten or swallowed.
        const leading = prelude.match(/^\s*/)[0]
        out += leading + comments.join('\n') + (comments.length ? '\n' : '') + scopeSelector(trimmed)
        opaque.push(false)
      }

      out += '{'
      depth += 1
      index += 1
      selectorStart = index
      continue
    }

    if (char === '}') {
      out += css.slice(selectorStart, index) + '}'
      opaque.pop()
      depth -= 1
      index += 1
      selectorStart = index
      continue
    }

    index += 1
  }

  out += css.slice(selectorStart)
  if (depth !== 0) throw new Error(`Unbalanced braces (depth ${depth}) — refusing to write`)
  return out
}

const original = readFileSync(file, 'utf8')
const scoped = scopeCss(original)

const count = (text) => [...text.matchAll(/(^|[}{;])\s*([^{}@;]+?)\{/g)].length
const bareBefore = [...original.matchAll(/(^|[}{;])\s*(body|html|h[1-6]|p|a|ul|ol|li|img|div|span)\s*[,{]/gi)].length
const bareAfter = [...scoped.matchAll(/(^|[}{;])\s*(body|html|h[1-6]|p|a|ul|ol|li|img|div|span)\s*[,{]/gi)].length

console.log(`  ${file}`)
console.log(`  rule blocks: ${count(original)} -> ${count(scoped)}  (must match)`)
console.log(`  selectors starting at a bare element: ${bareBefore} -> ${bareAfter}`)
console.log(`  bytes: ${original.length} -> ${scoped.length}`)

if (count(original) !== count(scoped)) throw new Error('Rule count changed — refusing to write')

if (write) {
  writeFileSync(file, scoped)
  console.log('  written')
} else {
  console.log('  dry run — pass --write to apply')
}
