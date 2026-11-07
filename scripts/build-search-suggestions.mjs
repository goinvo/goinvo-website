#!/usr/bin/env node
/**
 * Stores the answers to the searches the homepage suggests (src/lib/search/suggested.json),
 * so they come back at once and cost no model call. Each answer is the real route's output:
 * lexical recall, Claude's selection and blurbs, the grounding guard.
 *
 * Usage: BASE=<site with the search route> node scripts/build-search-suggestions.mjs
 * (a preview deployment, or a local dev server with ANTHROPIC_API_KEY). Re-run it when the
 * portfolio changes. It refuses to store an answer that is not AI-selected or is empty:
 * a suggestion that finds nothing would be a broken promise on the "No results" screen.
 */
import fs from 'node:fs'

const FILE = 'src/lib/search/suggested.json'
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
// Keep in step with normalizeQuery in src/lib/search/suggested.ts (the test checks it).
const normalizeQuery = query => query.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '')

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const answers = {}
const problems = []
for (const { query } of data.queries) {
  const res = await fetch(`${BASE}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ query, fresh: true }) })
  const body = await res.json()
  delete body.cached
  if (!res.ok || !body.aiGenerated || !body.results?.length) { problems.push(`${query}: ${res.status} aiGenerated=${body.aiGenerated} results=${body.results?.length ?? 0} ${body.reason ?? body.error ?? ''}`); continue }
  answers[normalizeQuery(query)] = body
  console.log(`${query} → ${body.results.map(result => result.title).join(' | ')}`)
}
if (problems.length) { console.error('Not stored:\n' + problems.join('\n')); process.exit(1) }
fs.writeFileSync(FILE, JSON.stringify({ ...data, generatedAt: new Date().toISOString(), answers }, null, 2) + '\n')
console.log(`${Object.keys(answers).length} answers stored in ${FILE}`)
