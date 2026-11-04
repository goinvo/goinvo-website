#!/usr/bin/env node
/**
 * Every PUBLISHED document passes the Studio's own validation.
 *
 *   node scripts/check-studio-validation.mjs        # exits 1 on any error
 *
 * A validation error blocks Publish, so a published document that fails today is a trap for whoever edits it
 * next: Care Plans held a tel: link the link rule rejected, and eight alumni held a bio of the wrong type. Drafts
 * are skipped (half-finished work is allowed to be invalid). Runs `sanity documents validate`, so the rules are
 * the schema's, not a copy of them. Output names document ids, field paths and rule messages only: CI logs on
 * this repo are public.
 */
import { spawnSync } from 'node:child_process'

if (!process.env.SANITY_AUTH_TOKEN && process.env.SANITY_API_READ_TOKEN) {
  process.env.SANITY_AUTH_TOKEN = process.env.SANITY_API_READ_TOKEN
}

const run = spawnSync('npx', ['sanity', 'documents', 'validate', '--yes', '--level', 'error', '--format', 'ndjson'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 64 * 1024 * 1024,
})
const lines = run.stdout.split('\n').filter((line) => line.startsWith('{'))
if (run.error || (run.status !== 0 && lines.length === 0)) {
  console.error(`sanity documents validate did not run (exit ${run.status}).`)
  console.error(run.stderr.split('\n').filter((line) => !/^\s*[│└┌]/.test(line)).slice(-15).join('\n'))
  process.exit(2)
}

const problems = []
let draftsSkipped = 0
for (const line of lines) {
  const result = JSON.parse(line)
  if (!result.documentId) continue
  if (/^(drafts|versions)\./.test(result.documentId)) {
    draftsSkipped += 1
    continue
  }
  for (const marker of result.markers ?? []) {
    if (marker.level !== 'error') continue
    const path = (marker.path ?? []).map((part) => (typeof part === 'object' ? `[${part._key}]` : part)).join('.')
    problems.push(`${result.documentType} ${result.documentId} ${path}: ${marker.message}`)
  }
}

console.log(problems.length ? problems.join('\n') : `Studio validation: no published errors (${draftsSkipped} draft(s) with errors skipped).`)
process.exit(problems.length ? 1 : 0)
