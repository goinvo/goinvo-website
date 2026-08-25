#!/usr/bin/env tsx
/**
 * Why did these pages not yield their quote?
 *
 * Headless Chrome already executes the page's JavaScript, so "client-side
 * rendering" is not the remaining explanation — a heavier browser or a VM would
 * run exactly the same engine. Before building anything further, find out what
 * is actually happening, because the fixes are completely different:
 *
 *   bot-wall      Cloudflare/Akamai interstitial — needs a real profile, or a
 *                 cache/archive copy instead.
 *   consent-wall  a cookie banner covering the article — dismissible.
 *   login/paywall — no technical fix; use an archive or drop the claim.
 *   thin          rendered fine but almost no text — probably an app shell.
 *   no-match      page read perfectly and the quote simply is not in it. This is
 *                 the honest failure: the claim, not the fetcher.
 *
 *   npx tsx scripts/diagnose-unfetchable.ts [--limit N]
 */
import path from 'node:path'
import puppeteer, { type Browser } from 'puppeteer'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { quoteAppearsIn } from '@/lib/marketing/sourceVerification'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 25

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Sanity project id and a write token are required.')

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})

const BOT_WALL = [
  'just a moment', 'checking your browser', 'enable javascript and cookies',
  'access denied', 'request blocked', 'are you a robot', 'unusual traffic',
  'cf-browser-verification', 'attention required', 'ddos protection',
]
const CONSENT_WALL = [
  'accept all cookies', 'we value your privacy', 'manage preferences',
  'this site uses cookies', 'consent', 'privacy preference',
]
const PAY_WALL = [
  'subscribe to continue', 'subscribers only', 'sign in to read',
  'create a free account', 'already a subscriber', 'to continue reading',
]

function classify(text: string, quote: string, status: number): string {
  const lower = text.toLowerCase()
  const head = lower.slice(0, 3000)
  if (status >= 400) return `http-${status}`
  if (BOT_WALL.some((needle) => head.includes(needle))) return 'bot-wall'
  if (PAY_WALL.some((needle) => head.includes(needle))) return 'paywall'
  if (text.length < 600) return 'thin'
  if (quoteAppearsIn(text, quote)) return 'MATCH (fixed by scrolling/consent)'
  if (CONSENT_WALL.some((needle) => head.includes(needle)) && text.length < 3000) return 'consent-wall'
  return 'no-match'
}

async function main() {
  const docs = await client.fetch<
    { _id: string; organization: string; quote: string; quoteUrl?: string; quoteCheck?: { status?: string } }[]
  >(
    `*[_type == "marketingOrgResearch" && quoteCheck.status == "quote-absent"]{
       _id, organization, quote, quoteUrl, quoteCheck
     }`,
  )
  const targets = docs.slice(0, limit)
  console.log(`${docs.length} claims still missing their quote · diagnosing ${targets.length}`)
  console.log('')

  const browser: Browser = await puppeteer.launch({ headless: 'new' as never, args: ['--no-sandbox'] })
  const tally: Record<string, number> = {}

  for (const doc of targets) {
    const url = doc.quoteUrl
    if (!url || !url.startsWith('http')) {
      tally['no-url'] = (tally['no-url'] || 0) + 1
      console.log(`  ${doc.organization.slice(0, 26).padEnd(27)} no-url`)
      continue
    }
    const page = await browser.newPage()
    let verdict = 'error'
    let title = ''
    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      )
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      // Scroll: lazy-loaded article bodies only attach once they approach the
      // viewport, and a top-of-page render misses them entirely.
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight))
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const text = await page.evaluate(() => document.body?.innerText || '')
      title = await page.title()
      verdict = classify(String(text).replace(/\s+/g, ' '), doc.quote, response?.status() ?? 0)
    } catch (error) {
      verdict = `error:${(error as Error).message.slice(0, 28)}`
    } finally {
      await page.close().catch(() => {})
    }
    tally[verdict] = (tally[verdict] || 0) + 1
    console.log(`  ${doc.organization.slice(0, 26).padEnd(27)}${verdict.padEnd(34)}${title.slice(0, 40)}`)
  }

  await browser.close()
  console.log('')
  for (const [verdict, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`${verdict.padEnd(36)} ${count}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
