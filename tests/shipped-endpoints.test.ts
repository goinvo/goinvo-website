import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every API path a shipped component calls must have a route that exists.
 *
 * This is the check that would have caught the storefront's support dialog
 * posting to /api/newsletter/subscribe: that route belongs to lead-magnet work
 * that has not shipped, so in production the form 404'd on every submission
 * while looking perfectly functional. A component is not finished until the
 * things it depends on exist.
 */

const ROOT = process.cwd()

function walk(dir: string, matches: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...walk(full, matches))
    else if (matches(full)) found.push(full)
  }
  return found
}

/** Resolve an /api path against the App Router, letting [dynamic] match anything. */
function routeExistsFor(apiPath: string): boolean {
  const segments = apiPath.replace(/^\/api\//, '').split('/').filter(Boolean)
  let candidates = [resolve(ROOT, 'src/app/api')]

  for (const segment of segments) {
    const next: string[] = []
    for (const dir of candidates) {
      if (!existsSync(dir)) continue
      const exact = join(dir, segment)
      if (existsSync(exact) && statSync(exact).isDirectory()) next.push(exact)
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (/^\[.+\]$/.test(entry) && statSync(full).isDirectory()) next.push(full)
      }
    }
    if (next.length === 0) return false
    candidates = next
  }

  return candidates.some((dir) => existsSync(join(dir, 'route.ts')) || existsSync(join(dir, 'route.tsx')))
}

describe('Shipped components only call endpoints that exist', () => {
  it('finds a route file for every /api path fetched from the client', () => {
    const files = [
      ...walk(resolve(ROOT, 'src/components'), (file) => file.endsWith('.tsx') || file.endsWith('.ts')),
      ...walk(resolve(ROOT, 'src/app'), (file) => file.endsWith('.tsx')),
    ]

    const missing: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/fetch\(\s*['"`](\/api\/[A-Za-z0-9/_-]+)['"`]/g)) {
        if (!routeExistsFor(match[1])) {
          missing.push(`${file.replace(ROOT, '').replace(/\\/g, '/')} -> ${match[1]}`)
        }
      }
    }

    expect(missing, 'these components call routes that do not exist').toEqual([])
  })

  it('actually detects a missing route, so a green result means something', () => {
    expect(routeExistsFor('/api/shop/config')).toBe(true)
    // The route whose absence caused the 404'd signup form. It exists now, and
    // this asserts it stays: removing it silently would break the capture again.
    expect(routeExistsFor('/api/newsletter/subscribe')).toBe(true)
    expect(routeExistsFor('/api/definitely-not-a-route')).toBe(false)
    expect(routeExistsFor('/api/shop/config/deeper-than-the-route')).toBe(false)
  })
})
