/**
 * Page CSS scoping guard
 *
 * A stylesheet under src/app/**\/*.css is NOT scoped to its route. It is a
 * global stylesheet that one page happens to import, and once the browser has
 * fetched it, it is never unloaded — client-side navigation keeps it live for
 * the rest of the session.
 *
 * Two ported 2018 stylesheets were shipping selectors that took advantage of
 * that, both confirmed on production:
 *
 *   - zika.css declared `body { background: #232323; color: #fff }`, so
 *     visiting /vision/understanding-zika and clicking any link left the WHOLE
 *     SITE dark, homepage included.
 *   - careplans.css declared `header.fixed { ... !important }` against the
 *     shared site header, which kept overriding it after navigating away.
 *
 * The rule this enforces: every selector in a page stylesheet must begin with a
 * class or id, so it can only match inside its own page. Reaching something
 * outside the page (the header, the body canvas) is allowed ONLY through
 * `body:has(.page-wrapper)`, which releases as soon as the wrapper leaves the
 * DOM.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const APP_DIR = fileURLToPath(new URL('../src/app', import.meta.url))

function cssFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...cssFiles(full))
    } else if (entry.endsWith('.css') && entry !== 'globals.css') {
      found.push(full)
    }
  }
  return found
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every selector in the file, flattened across comma-separated groups. */
function selectors(css: string): string[] {
  const out: string[] = []
  for (const match of stripComments(css).matchAll(/(^|[}{;])\s*([^{}@;]+?)\{/g)) {
    for (const part of match[2].split(',')) {
      const trimmed = part.trim().replace(/\s+/g, ' ')
      if (trimmed) out.push(trimmed)
    }
  }
  return out
}

/**
 * A selector is confined if its FIRST compound is a class or id — anything
 * further right can only match inside that element. `body:has(.wrapper)` is the
 * sanctioned way to paint outside the page, because it stops matching the
 * instant the page unmounts.
 */
function escapesItsPage(selector: string): boolean {
  if (/^body:has\(\s*\./.test(selector)) return false
  // Keyframe offsets are not page selectors.
  if (/^(from|to|\d+(\.\d+)?%)$/.test(selector)) return false
  const firstCompound = selector.split(/[\s>+~]/)[0]
  return !/^[.#[:*]/.test(firstCompound)
}

const files = cssFiles(APP_DIR)

describe('page stylesheets stay on their own page', () => {
  it('finds the page stylesheets to check', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const file of files) {
    const relative = file.slice(file.indexOf('src')).replace(/\\/g, '/')

    it(`${relative} has no site-wide selectors`, () => {
      const offenders = [...new Set(selectors(readFileSync(file, 'utf8')).filter(escapesItsPage))]
      expect(
        offenders,
        `These selectors apply on EVERY route once this stylesheet loads, because an App ` +
          `Router page stylesheet is global and is never unloaded:\n` +
          offenders.map((s) => `  ${s}`).join('\n') +
          `\n\nScope each one under the page's wrapper class. To reach an element outside the ` +
          `page (the site header, the body canvas), use body:has(.page-wrapper) so it releases ` +
          `when the visitor navigates away. scripts/scope-page-css.mjs does this mechanically.`,
      ).toEqual([])
    })
  }
})
