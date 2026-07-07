#!/usr/bin/env node
/**
 * End-to-end verification of the shareable draft-preview link feature.
 *
 * Exercises the full contract against a running app:
 *   - unauthenticated POST is rejected (401)
 *   - an authenticated POST mints a /preview/<token> link
 *   - opening that link in a fresh (no-login) browser renders the DRAFT as the
 *     real site page — NOT the Studio shell — with the Preview banner + marker
 *   - GET lists the active link; DELETE revokes it; the link then 404s to
 *     /preview/invalid (draft no longer served)
 *   - a link whose stored expiry is in the past is rejected (invalid)
 *
 * Prereqs: app running (default :3000), MARKETING_API_KEY + SANITY_API_WRITE_TOKEN
 * in .env.local, and a shareable draft at --doc.
 *
 * Usage:
 *   node scripts/verify-preview-share-links.mjs
 *   node scripts/verify-preview-share-links.mjs --base http://localhost:3000 \
 *     --doc a615ad54-48e5-47ca-a00e-8c610c605fa3 --expect "Surfacing Design Risk"
 */
import path from 'node:path'
import crypto from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import puppeteer from 'puppeteer'
import { createClient } from '@sanity/client'

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
const DOC_ID = arg('doc', 'a615ad54-48e5-47ca-a00e-8c610c605fa3')
const EXPECT = arg('expect', 'Surfacing Design Risk')

const API_KEY = process.env.MARKETING_API_KEY
if (!API_KEY) throw new Error('MARKETING_API_KEY is not set (check .env.local).')
const writeToken = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!writeToken) throw new Error('SANITY_API_WRITE_TOKEN is not set (check .env.local).')

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: writeToken,
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
    await page.waitForFunction((t) => (document.body?.innerText || '').includes(t), { timeout, polling: 500 }, text)
    return true
  } catch {
    return false
  }
}
const api = (method, urlPath, opts = {}) =>
  fetch(`${BASE}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
try {
  // ---- Auth: unauthenticated create is rejected ----
  const unauth = await fetch(`${BASE}/api/preview-share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId: DOC_ID }),
  })
  check('unauthenticated create is 401', unauth.status === 401, `status ${unauth.status}`)

  // ---- Create a link ----
  const createRes = await api('POST', '/api/preview-share', { body: { docId: DOC_ID, expiryDays: 7 } })
  const created = await createRes.json()
  check('authenticated create returns a /preview/ url', createRes.ok && /\/preview\/[A-Za-z0-9_-]+$/.test(created.url || ''), created.url || JSON.stringify(created))
  const shareUrl = created.url

  // ---- Open the link in a fresh no-login tab ----
  const page = await browser.newPage()
  await page.goto(shareUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })
  check('share link renders the draft (no login)', await waitForText(page, EXPECT, 60000), page.url())
  check('landed on the real site page, not the Studio shell', /\/vision\//.test(page.url()) && !(await bodyText(page)).includes('GoInvo CMS'))
  check('Preview Mode banner shown', await waitForText(page, 'Preview Mode', 15000))
  // The guard sets the marker in a post-hydration effect, so poll rather than read once.
  const markerSet = await page
    .waitForFunction(() => sessionStorage.getItem('sanity-preview-session') === '1', { timeout: 15000, polling: 300 })
    .then(() => true)
    .catch(() => false)
  check('per-tab preview marker set', markerSet)

  // The point of the marker: draft mode survives navigation within the tab
  // (without it the guard would treat the cookie as stale and disable it).
  await page.goto(`${BASE}/vision/a-design-diagnostic-for-clinical-software`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const renav = await waitForText(page, EXPECT, 30000)
  await new Promise((r) => setTimeout(r, 4000))
  check('draft survives same-tab re-navigation', renav && (await bodyText(page)).includes(EXPECT))

  // ---- List shows the active link ----
  const listRes = await api('GET', `/api/preview-share?docId=${DOC_ID}`)
  const listed = await listRes.json()
  check('list returns the active link', listRes.ok && Array.isArray(listed.links) && listed.links.length >= 1, JSON.stringify(listed.links))

  // ---- Revoke it, then the link must stop serving the draft ----
  const revokeRes = await api('DELETE', `/api/preview-share?id=${encodeURIComponent(created.id)}`)
  check('revoke succeeds', revokeRes.ok)
  const page2 = await browser.newPage()
  await page2.goto(shareUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForText(page2, 'preview link', 15000)
  const revokedText = await bodyText(page2)
  check('revoked link no longer serves the draft', page2.url().includes('/preview/invalid') && !revokedText.includes(EXPECT), page2.url())

  // ---- Expiry: a link whose stored expiry is in the past is rejected ----
  const expiredToken = crypto.randomBytes(32).toString('base64url')
  const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex')
  const seeded = await sanity.create({
    _type: 'previewShareLink',
    tokenHash: expiredHash,
    docId: DOC_ID,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 86400000).toISOString(),
    revokedAt: null,
  })
  const page3 = await browser.newPage()
  await page3.goto(`${BASE}/preview/${expiredToken}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForText(page3, 'preview link', 15000)
  check('expired link is rejected', page3.url().includes('/preview/invalid') && !(await bodyText(page3)).includes(EXPECT), page3.url())
  await sanity.delete(seeded._id).catch(() => {})

  // ---- Cleanup: remove any links this run left for the doc ----
  await sanity
    .delete({ query: `*[_type == "previewShareLink" && docId == $d]`, params: { d: DOC_ID } })
    .catch(() => {})
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\nRESULT: ${failures.length} FAILURE(S): ${failures.join('; ')}`)
  process.exit(1)
}
console.log('\nRESULT: ALL PASS')
