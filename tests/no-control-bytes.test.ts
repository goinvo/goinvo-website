/**
 * No source file may contain a raw control byte.
 *
 * This exists because of a real one. `src/app/api/marketing/generate/route.ts`
 * carried a regex character class that was meant to read `\x00-\x1f\x7f` as
 * escape sequences, but the file held the LITERAL bytes those escapes describe.
 * The regex still worked, so every test passed and nothing complained — while
 * git classified the file as binary and showed `Bin 0 -> 3714 bytes` instead of
 * a diff. A reviewer could not see the code at all, and the file was one
 * encoding conversion away from breaking silently.
 *
 * Passing tests were no protection, so the rule is enforced on the bytes.
 * Tab, newline and carriage return are the only control characters a source
 * file has any business containing.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SCANNED_DIRS = ['src', 'tests', 'scripts']
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json']
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build'])

/** Tab (9), newline (10) and carriage return (13) are the allowed ones. */
const ALLOWED = new Set([9, 10, 13])
const isControlByte = (byte: number) => (byte < 0x20 && !ALLOWED.has(byte)) || byte === 0x7f

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
    else if (SCANNED_EXTENSIONS.some((extension) => entry.endsWith(extension))) found.push(full)
  }
  return found
}

/** Every offending byte in a file, with enough context to find it by eye. */
function offences(file: string): string[] {
  const bytes = readFileSync(file)
  const hits: string[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    if (isControlByte(bytes[i])) {
      const line = bytes.subarray(0, i).toString('utf8').split('\n').length
      hits.push(`${relative(ROOT, file)}:${line} byte 0x${bytes[i].toString(16).padStart(2, '0')}`)
    }
  }
  return hits
}

describe('no raw control bytes in source', () => {
  it('detects a control byte when there is one, so a pass means something', () => {
    // Falsify the rule once, in memory, to prove the check actually fires.
    // Without this a broken detector would report a clean tree forever.
    expect(isControlByte(0x00)).toBe(true)
    expect(isControlByte(0x1f)).toBe(true)
    expect(isControlByte(0x7f)).toBe(true)
    expect(isControlByte(0x09)).toBe(false)
    expect(isControlByte(0x0a)).toBe(false)
    expect(isControlByte('a'.charCodeAt(0))).toBe(false)
  })

  it('scans a non-trivial number of files, so an empty sweep cannot pass', () => {
    const files = SCANNED_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)))
    expect(files.length).toBeGreaterThan(100)
  })

  it('finds none in src, tests or scripts', () => {
    const files = SCANNED_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)))
    const found = files.flatMap(offences)
    expect(found, `raw control bytes found:\n${found.join('\n')}`).toEqual([])
  })
})
