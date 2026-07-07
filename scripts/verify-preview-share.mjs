#!/usr/bin/env node
/**
 * Verifies the out-of-Studio draft preview contract end-to-end:
 *
 *   1. A share-style preview link (/api/draft-mode/enable?sanity-preview-secret=…)
 *      opened in a plain tab — NO Sanity login — renders the draft, shows the
 *      Preview Mode banner, and keeps draft mode across navigation in that tab.
 *   2. Any OTHER tab reusing the same draft cookie auto-disables draft mode
 *      (the stale-cookie-leak protection DraftModeGuard exists for).
 *
 * Mints a real preview secret in the dataset (same lib the Studio uses, TTL'd
 * + self-cleaning), so this exercises validatePreviewUrl exactly like a
 * Presentation "Share" link.
 *
 * Prereqs: app running (default :3000), SANITY_API_WRITE_TOKEN in .env.local,
 * and a draft document at --path.
 *
 * Usage:
 *   node scripts/verify-preview-share.mjs
 *   node scripts/verify-preview-share.mjs --base http://localhost:3000 \
 *     --path /vision/a-design-diagnostic-for-clinical-software --expect "Design Diagnostic"
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import puppeteer from 'puppeteer'
import { createClient } from '@sanity/client'
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

function arg(name, fallback) {
  const argv = process.argv.slice(2)
  const inline = argv.find((a) => a.startsWith(`--${name}=`))
  if (inline) return inline.slice(`--${name}=`.length)
  const i = argv.indexOf(`--${name}`)
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1]
  return fallback
}

const BASE = arg('base', 'http://localhost:3000').replace(/\/+$/, '')
const ARTICLE_PATH = arg('path', '/vision/a-design-diagnostic-for-clinical-software')
const EXPECT = arg('expect', 'Design Diagnostic')

// Must match src/lib/draftPreview.ts (scripts can't import TS; if these drift
// the assertions below fail loudly, which is the point).
const PREVIEW_SESSION_HASH = 'sanity-preview'
const PREVIEW_SESSION_STORAGE_KEY = 'sanity-preview-session'

const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!token) throw new Error('SANITY_API_WRITE_TOKEN is not set (check .env.local).')
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (check .env.local).')

const client = createClient({
  projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const failures = []
const check = (name, ok, detail = '') => {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`)
}
const bodyText = (page) => page.evaluate(() => document.body?.innerText || '')
const waitForText = async (page, text, timeout = 30000) => {
  try {
    await page.waitForFunction(
      (t) => (document.body?.innerText || '').includes(t),
      { timeout, polling: 500 },
      text,
    )
    return true
  } catch {
    return false
  }
}

const { secret } = await createPreviewSecret(client, 'verify-preview-share', `${BASE}/studio`)
const enableUrl = `${BASE}/api/draft-mode/enable?sanity-preview-secret=${encodeURIComponent(secret)}&sanity-preview-pathname=${encodeURIComponent(ARTICLE_PATH)}`

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
try {
  // ---- Flow A: share-style link in a plain tab (no Studio login) ----
  const page1 = await browser.newPage()
  await page1.goto(enableUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })

  check('share link lands on the draft', await waitForText(page1, EXPECT, 60000), page1.url())
  check('Preview Mode banner shown', await waitForText(page1, 'Preview Mode', 15000))

  // give a broken guard time to disable + reload before re-asserting
  await new Promise((r) => setTimeout(r, 5000))
  check('draft survives (no guard reload)', (await bodyText(page1)).includes(EXPECT))

  const state = await page1.evaluate((key) => ({
    hash: window.location.hash,
    marker: (() => {
      try { return sessionStorage.getItem(key) } catch { return 'ERR' }
    })(),
  }), PREVIEW_SESSION_STORAGE_KEY)
  check('hash marker stripped', state.hash === '' && !page1.url().includes(`#${PREVIEW_SESSION_HASH}`), `hash="${state.hash}"`)
  check('per-tab session marker set', state.marker === '1', `marker=${state.marker}`)

  await page1.goto(`${BASE}${ARTICLE_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const renavOk = await waitForText(page1, EXPECT, 30000)
  await new Promise((r) => setTimeout(r, 4000))
  check('same-tab re-navigation keeps draft mode', renavOk && (await bodyText(page1)).includes(EXPECT))

  // ---- Flow B: another tab, same cookie = stale leak, must auto-disable ----
  const page2 = await browser.newPage()
  await page2.goto(`${BASE}${ARTICLE_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 8000))
  const t2 = await bodyText(page2)
  check('fresh tab does NOT leak draft content', !t2.includes(EXPECT), t2.slice(0, 100).replace(/\s+/g, ' '))

  const cookies = await browser.cookies()
  check('draft cookie cleared by stale-tab guard', !cookies.some((c) => c.name === '__prerender_bypass'))
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\nRESULT: ${failures.length} FAILURE(S): ${failures.join('; ')}`)
  process.exit(1)
}
console.log('\nRESULT: ALL PASS')
