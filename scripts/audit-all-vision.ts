/**
 * Batch audit all custom vision pages.
 *
 * Usage:
 *   npx tsx scripts/audit-all-vision.ts
 *
 * Prerequisites:
 *   - Next.js dev server running on localhost:3000
 *   - ANTHROPIC_API_KEY in .env.local
 *   - `npx playwright install chromium`
 */

import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

const pages = [
  '/vision/eligibility-engine',
  '/vision/healthcare-ai',
  '/vision/augmented-clinical-decision-support',
  '/vision/faces-in-health-communication',
  '/vision/living-health-lab',
  '/vision/primary-self-care-algorithms',
  '/vision/coronavirus',
  '/vision/determinants-of-health',
  '/vision/visual-storytelling-with-genai',
  '/vision/history-of-health-design',
  '/vision/precision-autism',
  '/vision/national-cancer-navigation',
  '/vision/us-healthcare-problems',
  '/vision/experiments',
]

const scriptPath = path.resolve(__dirname, 'audit-page.ts')
const summaryPath = path.resolve(__dirname, '../.audit/page-diffs/summary.md')

async function main() {
  console.log(`\n=== Batch Vision Page Audit ===`)
  console.log(`Auditing ${pages.length} pages...\n`)

  const results: { page: string; status: 'pass' | 'fail'; error?: string }[] = []

  for (const page of pages) {
    console.log(`\n--- ${page} ---`)
    try {
      execSync(`npx tsx "${scriptPath}" "${page}"`, {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120000,
      })
      results.push({ page, status: 'pass' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ Failed: ${msg}`)
      results.push({ page, status: 'fail', error: msg })
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000))
  }

  // Write summary
  const summary = `# Vision Page Audit Summary

> Generated: ${new Date().toISOString()}

| Page | Status |
|------|--------|
${results.map((r) => `| ${r.page} | ${r.status === 'pass' ? '✅' : `❌ ${r.error?.slice(0, 50)}`} |`).join('\n')}

## Reports
${results
  .filter((r) => r.status === 'pass')
  .map((r) => {
    const slug = r.page.replace(/^\//, '').replace(/\//g, '_')
    return `- [${r.page}](${slug}/audit-report.md)`
  })
  .join('\n')}
`

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true })
  fs.writeFileSync(summaryPath, summary, 'utf-8')
  console.log(`\n\n=== Summary saved: ${summaryPath} ===`)
  console.log(`\n${results.filter((r) => r.status === 'pass').length}/${results.length} pages audited successfully`)
}

main().catch(console.error)
