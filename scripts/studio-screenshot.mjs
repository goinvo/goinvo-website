#!/usr/bin/env node
/**
 * Headlessly authenticates the embedded Sanity Studio and screenshots a tool
 * view (default /studio/marketing) — no interactive OAuth per run.
 *
 * It injects the Sanity USER SESSION token (from `sanity login`) into the
 * localStorage key the Studio auth store reads (`__studio_auth_token_<projectId>`)
 * BEFORE the Studio bundle loads, then navigates and asserts the authenticated
 * dashboard rendered (not the login screen). Fails loudly on missing token or a
 * login wall — never silently "passes".
 *
 * Prereqs:
 *   - `sanity login` has been run (creates ~/.config/sanity/config.json), OR
 *     SANITY_AUTH_TOKEN is set to a user session token.
 *   - The app is running (npx next start) at STUDIO_BASE (default :3000).
 *
 * Usage:
 *   node scripts/studio-screenshot.mjs
 *   node scripts/studio-screenshot.mjs --path /studio/marketing --out studio-marketing.png
 *   node scripts/studio-screenshot.mjs --expect "Measurement blocked"
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import puppeteer from 'puppeteer'

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

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
if (!PROJECT_ID) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (check .env.local).')

const BASE = (arg('base', process.env.STUDIO_BASE || 'http://localhost:3000')).replace(/\/+$/, '')
const TOOL_PATH = arg('path', '/studio/marketing')
const OUT = arg('out', 'studio-marketing.png')
const EXPECT = arg('expect', 'Marketing')
const TAB = arg('tab', '') // e.g. "A/B Tests" — clicked after the workspace loads
const TOOL_URL = `${BASE}${TOOL_PATH}`

function resolveSessionToken() {
  // Prefer the CLI user-session token from `sanity login`. The reliable signal
  // that it is a usable Studio session is authType === 'normal' — NOT the token
  // prefix (valid session tokens can start with 'sk' too).
  const cfg = path.join(os.homedir(), '.config', 'sanity', 'config.json')
  if (fs.existsSync(cfg)) {
    const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'))
    if (parsed.authToken && (!parsed.authType || parsed.authType === 'normal')) return parsed.authToken
  }
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN
  throw new Error(
    `No Sanity user session token found. Run \`npx sanity login\` (writes ${cfg}) or set SANITY_AUTH_TOKEN to a user session token.`,
  )
}

async function run() {
  const token = resolveSessionToken()
  const storageKey = `__studio_auth_token_${PROJECT_ID}`
  const storageValue = JSON.stringify({ token, time: new Date().toISOString() })

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })
  const failures = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1100 })
    await page.evaluateOnNewDocument(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: storageKey, value: storageValue },
    )
    page.on('response', (r) => {
      if (r.url().includes('/users/me') && r.status() === 401) failures.push('GET /users/me returned 401 — token rejected')
    })

    // Studio keeps a live/listen connection open, so networkidle never settles —
    // wait for DOM, then poll until the workspace data has actually loaded
    // (not the login wall and not the "Loading marketing workspace…" placeholder).
    await page.goto(TOOL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page
      .waitForFunction(
        () => {
          const t = document.body.innerText || ''
          if (!t.trim().length) return false
          if (/Choose login provider|Sign in with|Continue with Google|Log in to/i.test(t)) return false
          return !/Loading marketing workspace/i.test(t)
        },
        { timeout: 60000, polling: 500 },
      )
      .catch(() => failures.push('Timed out waiting for the authenticated marketing workspace to load.'))

    if (TAB) {
      const clicked = await page.evaluate((tabName) => {
        const els = Array.from(document.querySelectorAll('button, a, [role="tab"]'))
        const el = els.find((e) => (e.textContent || '').trim().toLowerCase() === tabName.toLowerCase())
        if (el) {
          el.click()
          return true
        }
        return false
      }, TAB)
      if (!clicked) failures.push(`Could not find a "${TAB}" tab to click.`)
      else await new Promise((resolve) => setTimeout(resolve, 1800))
    }

    if (EXPECT) {
      await page
        .waitForFunction((expect) => (document.body.innerText || '').toLowerCase().includes(String(expect).toLowerCase()), { timeout: 30000, polling: 500 }, EXPECT)
        .catch(() => failures.push(`Expected text "${EXPECT}" not found after navigation.`))
    }

    const bodyText = await page.evaluate(() => document.body.innerText || '')
    if (/Choose login provider|Sign in with|Continue with Google/i.test(bodyText)) failures.push('Login screen is showing — not authenticated.')

    // Studio scrolls inside its own container, so fullPage only sees the viewport.
    // Optionally scroll the tallest scrollable element to a fraction of its height.
    const SCROLL = arg('scroll', '')
    if (SCROLL) {
      await page.evaluate((frac) => {
        const els = Array.from(document.querySelectorAll('*')).filter((e) => e.scrollHeight > e.clientHeight + 40)
        const target = els.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || document.scrollingElement
        if (target) target.scrollTop = target.scrollHeight * (frac === 'bottom' ? 1 : Number(frac) || 0.5)
      }, SCROLL)
      await new Promise((resolve) => setTimeout(resolve, 700))
    }

    await page.screenshot({ path: OUT, fullPage: true })
    console.log(`Screenshot written to ${OUT}`)
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error('FAIL:\n - ' + failures.join('\n - '))
    process.exitCode = 1
    return
  }
  console.log(`OK: authenticated ${TOOL_URL} rendered (expected "${EXPECT}").`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
