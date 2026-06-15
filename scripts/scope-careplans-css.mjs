// Scopes the legacy Care Plans stylesheets under `.legacy-careplans` so they
// only style the injected legacy markup — NOT the Next.js site chrome (header,
// footer, chat). The originals (esp. bootstrap.min.css) carry global `html`,
// `body`, `*`, `a`, `h1`… rules that otherwise bleed across the whole page on
// the careplans routes (e.g. turning the chat/header link colors wrong).
//
// Run:  node scripts/scope-careplans-css.mjs
// Output: public/stylesheets/legacy-careplans-scoped/{bootstrap.min.css,careplans.css,feature-elements.css}

import postcss from 'postcss'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PUBLIC = 'public/stylesheets'
const OUT_DIR = join(PUBLIC, 'legacy-careplans-scoped')
const SCOPE = '.legacy-careplans'
const ROOT_RE = /^(html|body|:root)$/i

const FILES = [
  ['vendor/bootstrap.min.css', 'bootstrap.min.css'],
  ['features/careplans.css', 'careplans.css'],
  ['feature-elements.css', 'feature-elements.css'],
]

// Prefix a single (already comma-split) selector so it only matches inside the
// `.legacy-careplans` wrapper.
function scopeOne(sel) {
  const s = sel.trim()
  if (!s || s.startsWith(SCOPE)) return s
  if (ROOT_RE.test(s)) return SCOPE // html/body/:root → the wrapper itself
  if (s === '*') return `${SCOPE} *`
  // `body.modal-open`, `html .foo` → swap the html/body root for the wrapper
  const rooted = s.match(/^(?:html|body)\b([\s\S]*)$/i)
  if (rooted) return `${SCOPE}${rooted[1]}`
  return `${SCOPE} ${s}`
}

function scopeCss(css) {
  const root = postcss.parse(css)
  root.walkRules((rule) => {
    const parent = rule.parent
    // leave @keyframes step selectors (0%, from, to…) untouched
    if (parent && parent.type === 'atrule' && /keyframes/i.test(parent.name)) return
    rule.selectors = rule.selectors.map(scopeOne)
  })
  return root.toString()
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [src, out] of FILES) {
  const css = readFileSync(join(PUBLIC, src), 'utf8')
  const scoped = scopeCss(css)
  writeFileSync(join(OUT_DIR, out), scoped)
  console.log(`scoped ${src} -> ${join(OUT_DIR, out)} (${scoped.length} bytes)`)
}
