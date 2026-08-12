/**
 * Recover assets that the 2018 -> Next migration left behind.
 *
 * THE OLD SITE'S S3 BUCKET IS STILL LIVE AND PUBLIC. No credentials:
 *
 *   https://s3.amazonaws.com/goinvo.com/<path>
 *   https://s3.amazonaws.com/www.goinvo.com/<path>
 *
 * so a dead `/old/images/history/foo.jpg` is
 * `https://s3.amazonaws.com/goinvo.com/images/history/foo.jpg`. This script
 * takes a list of dead URLs (or paths), pulls each from the first source that
 * has it, and writes it to its canonical `public/images/...` location.
 *
 * A note in CLAUDE.md used to say "do NOT chase S3". That was wrong and cost
 * real time twice: it was concluded from the one bucket `www.goinvo.com-2018`
 * (403, genuinely redirect-only) and generalised without testing the others.
 * Sources are tried in order of completeness, S3 first.
 *
 *   node scripts/recover-old-assets.mjs --list C:/tmp/timeline-media.txt
 *   node scripts/recover-old-assets.mjs --list ... --apply
 *   node scripts/recover-old-assets.mjs --path /old/images/history/foo.jpg --apply
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const PUBLIC_DIR = resolve(process.cwd(), 'public')

/** Every place a 2018 asset might still exist, most complete first. */
const SOURCES = [
  (path) => `https://s3.amazonaws.com/goinvo.com/${path}`,
  (path) => `https://s3.amazonaws.com/www.goinvo.com/${path}`,
  (path) => `https://raw.githubusercontent.com/goinvo/goinvo.com-2018-old-features/master/source/${path}`,
  (path) => `https://dd17w042cevyt.cloudfront.net/${path}`,
]

/** `/old/images/x.jpg`, a full URL, or `images/x.jpg` -> `images/x.jpg`. */
function toAssetPath(input) {
  let value = input.trim()
  if (!value) return null
  value = value.replace(/^https?:\/\/[^/]+/, '')
  // Legacy sheets carry Dropbox-style query strings (?dl=0) that are not part
  // of the object key.
  value = value.split('?')[0].split('#')[0]
  value = value.replace(/^\/?old\//, '').replace(/^\//, '')
  return value || null
}

const inputs = []
const listFile = flag('list')
if (listFile) inputs.push(...readFileSync(listFile, 'utf8').split('\n'))
if (flag('path')) inputs.push(flag('path'))
if (inputs.length === 0) throw new Error('Give me --list <file> or --path <url-or-path>.')

const paths = [...new Set(inputs.map(toAssetPath).filter(Boolean))]
console.log(`${paths.length} assets to recover into public/\n`)

const fetched = []
const missing = []
const skipped = []

for (const path of paths) {
  const destination = join(PUBLIC_DIR, path)
  if (existsSync(destination)) {
    skipped.push(path)
    continue
  }

  let saved = false
  for (const buildUrl of SOURCES) {
    const url = buildUrl(path)
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) continue
      const type = response.headers.get('content-type') || ''
      // A 200 that hands back an HTML error page is not the asset.
      if (/text\/html/i.test(type)) continue
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length === 0) continue

      if (apply) {
        mkdirSync(dirname(destination), { recursive: true })
        writeFileSync(destination, bytes)
      }
      fetched.push({ path, from: new URL(url).hostname, kb: Math.round(bytes.length / 1024) })
      saved = true
      break
    } catch {
      // Try the next source.
    }
  }
  if (!saved) missing.push(path)
  process.stdout.write(`  ${fetched.length + missing.length + skipped.length}/${paths.length}\r`)
}

console.log('\n')
const bySource = fetched.reduce((counts, item) => {
  counts[item.from] = (counts[item.from] || 0) + 1
  return counts
}, {})
console.log(`recovered: ${fetched.length}  (${JSON.stringify(bySource)})`)
console.log(`already present: ${skipped.length}`)
console.log(`NOT FOUND anywhere: ${missing.length}`)
for (const path of missing) console.log(`  ${path}`)
if (!apply) console.log('\nDry run. Re-run with --apply to write the files into public/.')
if (missing.length > 0) process.exitCode = 1
