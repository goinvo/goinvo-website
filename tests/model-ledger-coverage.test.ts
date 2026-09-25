/**
 * Every Claude call in the suite must reach the ledger.
 *
 * The gateway (`generateClaudeText`) records automatically, so anything going
 * through it is metered for free. The risk is a file that constructs its own
 * Anthropic client and calls the API directly — `postingTimeResearch.ts`
 * already did, and it was invisible to the meter until it was instrumented by
 * hand. A second one would be invisible again, and nothing would fail.
 *
 * So the rule is enforced structurally rather than remembered: a file may
 * construct an Anthropic client only if it also records to the ledger. Adding a
 * new unmetered caller fails here, naming the file.
 *
 * This checks wiring, not behaviour. `tests/model-ledger.test.ts` covers
 * whether the numbers are right; this covers whether they are collected at all.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SCANNED = ['src']
const SKIP_DIRS = new Set(['node_modules', '.next', '.git'])

/** The gateway itself, which IS the recording mechanism. */
const GATEWAY = 'src/lib/marketing/anthropicJson.ts'

function sourceFiles(dir: string): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let isDir = false
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) found.push(...sourceFiles(full))
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) found.push(full)
  }
  return found
}

const posix = (path: string) => relative(ROOT, path).split('\\').join('/')

/** Files that build their own Anthropic client instead of using the gateway. */
function directClientFiles(): string[] {
  return sourceFiles(join(ROOT, ...SCANNED))
    .filter((file) => /new Anthropic\s*\(/.test(readFileSync(file, 'utf8')))
    .map(posix)
}

describe('model ledger coverage', () => {
  it('finds the gateway, so an empty scan cannot pass', () => {
    // If the scanner silently matched nothing, every assertion below would be
    // vacuously true. The gateway must always be in the list.
    expect(directClientFiles()).toContain(GATEWAY)
  })

  it('records a call in every file that talks to Anthropic directly', () => {
    const unmetered = directClientFiles()
      .filter((file) => file !== GATEWAY)
      .filter((file) => !readFileSync(join(ROOT, file), 'utf8').includes('recordModelCall'))

    expect(
      unmetered,
      `these files call Anthropic without recording to the ledger, so their spend is invisible:\n${unmetered.join('\n')}\n` +
        'Either route the call through generateClaudeText, or call recordModelCall around it.',
    ).toEqual([])
  })

  it('labels every gateway call site with a feature, so spend can be attributed', () => {
    const callers = sourceFiles(join(ROOT, 'src'))
      .map((file) => ({ file: posix(file), text: readFileSync(file, 'utf8') }))
      .filter(({ file, text }) => file !== GATEWAY && text.includes('generateClaudeText({'))

    // Every call site passes a feature. Without one the ledger has a single
    // "unlabelled" bucket and cannot answer which feature is expensive.
    const unlabelled = callers
      .filter(({ text }) => {
        const sites = text.split('generateClaudeText({').length - 1
        const labelled = text.split(/generateClaudeText\(\{\s*\n\s*feature:/).length - 1
        return labelled < sites
      })
      .map(({ file }) => file)

    expect(unlabelled, `generateClaudeText call sites with no feature label:\n${unlabelled.join('\n')}`).toEqual([])
    expect(callers.length).toBeGreaterThan(0)
  })
})
