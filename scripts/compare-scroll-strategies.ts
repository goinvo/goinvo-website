#!/usr/bin/env tsx
/**
 * Which scrolling strategy actually recovers lazy-loaded text?
 *
 * A more elaborate scroll already lost to a naive one once in this codebase:
 * an eight-step scroll that returned to the top recovered NOTHING, while a
 * single scroll to the bottom recovered eleven claims. The difference was that
 * scrolling back up re-virtualises long lists. So this measures rather than
 * assumes, on the claims that are still unresolved.
 *
 * Strategies:
 *   none         no scrolling at all — the baseline
 *   single       one scroll to scrollHeight, then settle (what ships today)
 *   progressive  scroll, re-measure, repeat until the height stops growing,
 *                and STAY at the bottom
 *
 *   npx tsx scripts/compare-scroll-strategies.ts [--limit N]
 */
import path from 'node:path'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { quoteAppearsIn } from '@/lib/marketing/sourceVerification'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 14

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:
    process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

type Strategy = 'none' | 'single' | 'progressive'

async function applyScroll(page: Page, strategy: Strategy): Promise<void> {
  if (strategy === 'none') return

  if (strategy === 'single') {
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight))
    await new Promise((resolve) => setTimeout(resolve, 1400))
    return
  }

  // progressive: keep going while the page keeps growing, and never scroll back
  // up. The waits live in Node, NOT inside page.evaluate — an async evaluate
  // holding a multi-second loop returned zero characters on every single page,
  // which is a silent total failure rather than a partial one.
  let previous = -1
  for (let round = 0; round < 10; round += 1) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
      return document.body.scrollHeight
    })
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (height === previous) break
    previous = height
  }
  await new Promise((resolve) => setTimeout(resolve, 1400))
}

async function readWith(browser: Browser, url: string, strategy: Strategy): Promise<string> {
  const page = await browser.newPage()
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    )
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await applyScroll(page, strategy)
    const text = await page.evaluate(() => document.body?.innerText || '')
    return String(text).replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  } finally {
    await page.close().catch(() => {})
  }
}

async function main() {
  const docs = await client.fetch<{ organization: string; quote: string; quoteUrl?: string }[]>(
    `*[_type == "marketingOrgResearch" && quoteCheck.status == "quote-absent" && defined(quoteUrl)]{
       organization, quote, quoteUrl
     }`,
  )
  const targets = docs.slice(0, limit)
  const strategies: Strategy[] = ['none', 'single', 'progressive']
  const wins: Record<Strategy, number> = { none: 0, single: 0, progressive: 0 }
  const chars: Record<Strategy, number> = { none: 0, single: 0, progressive: 0 }

  console.log(`comparing scroll strategies on ${targets.length} unresolved claims`)
  console.log('')

  const browser = await puppeteer.launch({ headless: 'new' as never, args: ['--no-sandbox'] })
  for (const doc of targets) {
    const row: string[] = []
    for (const strategy of strategies) {
      const text = await readWith(browser, doc.quoteUrl!, strategy)
      const match = quoteAppearsIn(text, doc.quote)
      if (match) wins[strategy] += 1
      chars[strategy] += text.length
      row.push(`${strategy}:${match ? 'HIT ' : '-   '}${String(text.length).padStart(6)}`)
    }
    console.log(`  ${doc.organization.slice(0, 24).padEnd(25)} ${row.join('  ')}`)
  }
  await browser.close()

  console.log('')
  for (const strategy of strategies) {
    console.log(
      `${strategy.padEnd(12)} recovered ${String(wins[strategy]).padStart(2)}/${targets.length}` +
        `   total chars read ${chars[strategy]}`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
