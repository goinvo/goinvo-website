/**
 * Write Marqueta's capture scenes (src/lib/marketing/marquetaCaptures.ts) as
 * JSON for Rendomat to draw as Slack screens in intro and help videos.
 *
 *   npx tsx scripts/export-marqueta-captures.ts                       # print a summary
 *   npx tsx scripts/export-marqueta-captures.ts --out <file.json>     # write the file
 *
 * Rendomat reads it from data/marqueta-intro/captures.json. Re-export whenever
 * Marqueta's messages change, so the videos show what she posts today.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { buildMarquetaCaptures } from '../src/lib/marketing/marquetaCaptures'

const outIndex = process.argv.indexOf('--out')
const out = outIndex > -1 ? process.argv[outIndex + 1] : ''
const file = buildMarquetaCaptures({ generatedAt: new Date().toISOString() })

if (out) {
  const target = resolve(out)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${file.captures.length} captures to ${target}`)
} else {
  for (const capture of file.captures) {
    console.log(`${capture.id.padEnd(12)} ${capture.steps.map((step) => `${step.kind}:${step.id}`).join(' → ')}`)
  }
}
