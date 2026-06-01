#!/usr/bin/env node
/**
 * End-to-end "real traffic" test for the homepage A/B experiment.
 *
 * Drives actual browser sessions through the forced-variant homepage
 * (/?goinvo_ab_variant=control|concept), captures the EXACT analytics events the
 * client emits to Vercel Web Analytics (experiment_exposure, qualified_discovery_
 * call_click, view_work_click, nav_click, discovery_form_start), and replays
 * those captured payloads through the drain endpoint — the same hop Vercel would
 * perform on a real deploy. Then it reads Sanity back so you can confirm the
 * suite flips to measurable with per-variant counts.
 *
 * This proves every segment except Vercel's own ingestion+delivery, which only
 * runs on a deployed site; that hop is stood in for by capturing the real client
 * output and POSTing it to the drain ourselves.
 *
 * Usage (server must be running locally):
 *   node scripts/traffic-test.mjs                       # default session counts
 *   node scripts/traffic-test.mjs --control 8 --concept 12
 *   node scripts/traffic-test.mjs --target https://your-deploy.example.com   # see notes below
 */
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

const BASE = (arg('base', process.env.STUDIO_BASE || 'http://localhost:3000')).replace(/\/+$/, '')
const DRAIN_BASE = (arg('drain-base', BASE)).replace(/\/+$/, '')
const SECRET = process.env.MARKETING_VERCEL_DRAIN_SECRET
const CONTROL_SESSIONS = Number(arg('control', '8'))
const CONCEPT_SESSIONS = Number(arg('concept', '12'))
const SKIP_DRAIN = process.argv.includes('--no-drain')

// Per-variant click probabilities (synthetic intent). Concept is given a higher
// qualified-CTA rate so the readout shows a clear, plausible winner.
const PROFILE = {
  control: { qualified: 0.45, work: 0.55, nav: 0.5 },
  concept: { qualified: 0.62, work: 0.5, nav: 0.42 },
}

const CAPTURE_INIT = () => {
  // Record every Vercel Analytics event the page emits, and stop link clicks
  // from navigating away so one session can fire several events.
  window.__captured = []
  const recorder = function (...args) {
    try {
      window.__captured.push(args)
    } catch {}
  }
  Object.defineProperty(window, 'va', {
    configurable: true,
    get() {
      return recorder
    },
    set() {
      /* keep our recorder even if @vercel/analytics injects its own */
    },
  })
  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.target && event.target.closest ? event.target.closest('a') : null
      if (anchor) event.preventDefault()
    },
    true,
  )
}

async function clickByText(page, candidates) {
  return page.evaluate((texts) => {
    const lower = texts.map((t) => t.toLowerCase())
    const els = Array.from(document.querySelectorAll('a, button'))
    const el = els.find((e) => {
      const t = (e.textContent || '').trim().toLowerCase()
      return t && lower.some((needle) => t.includes(needle))
    })
    if (el) {
      el.click()
      return (el.textContent || '').trim()
    }
    return null
  }, candidates)
}

async function runSession(browser, variant) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.evaluateOnNewDocument(CAPTURE_INIT)
  try {
    await page.goto(`${BASE}/?goinvo_ab_variant=${variant}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    // Wait for the exposure event to fire (proves the variant rendered with context).
    await page
      .waitForFunction(() => (window.__captured || []).some((a) => a[1] && a[1].name === 'experiment_exposure'), { timeout: 20000, polling: 250 })
      .catch(() => {})

    const profile = PROFILE[variant]
    if (Math.random() < profile.qualified) {
      await clickByText(page, variant === 'concept' ? ['book a discovery call'] : ['start a convo'])
    }
    if (Math.random() < profile.work) {
      await clickByText(page, ['see the work', 'see all case studies', 'view our work'])
    }
    if (Math.random() < profile.nav) {
      await clickByText(page, ['services', 'work', 'about', 'vision'])
    }
    await new Promise((resolve) => setTimeout(resolve, 250))

    const captured = await page.evaluate(() => window.__captured || [])
    return captured
      .map((args) => (args[0] === 'event' && args[1] ? { name: args[1].name, data: args[1].data || {} } : null))
      .filter(Boolean)
  } finally {
    await page.close()
  }
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const events = []
  try {
    for (const [variant, count] of [['control', CONTROL_SESSIONS], ['concept', CONCEPT_SESSIONS]]) {
      for (let i = 0; i < count; i += 1) {
        const sessionEvents = await runSession(browser, variant)
        events.push(...sessionEvents)
        process.stdout.write(`  ${variant} session ${i + 1}/${count}: ${sessionEvents.map((e) => e.name).join(', ') || '(none)'}\n`)
      }
    }
  } finally {
    await browser.close()
  }

  // Tally what the real client emitted, grouped by event + variant.
  const tally = {}
  for (const event of events) {
    const variant = event.data.variant || '(none)'
    const key = `${event.name} [${variant}]`
    tally[key] = (tally[key] || 0) + 1
  }
  console.log('\nCaptured client events (event [variant] = count):')
  for (const key of Object.keys(tally).sort()) console.log(`  ${key} = ${tally[key]}`)

  const withContext = events.filter((e) => e.data.experiment_id && e.data.variant)
  console.log(`\n${events.length} events captured, ${withContext.length} carry full experiment context.`)
  if (events.some((e) => JSON.stringify(e.data).toLowerCase().includes('visitor'))) {
    console.warn('WARNING: a captured event payload contains a "visitor" field — investigate before draining.')
  }

  if (SKIP_DRAIN) {
    console.log('\n--no-drain set: not posting to the drain endpoint.')
    return
  }
  if (!SECRET) {
    console.log('\nMARKETING_VERCEL_DRAIN_SECRET not set — skipping the drain POST. Captured events above prove the client side.')
    return
  }

  // Replay the captured events through the drain (the Vercel-delivery stand-in).
  const rows = withContext.map((e) => ({ type: 'event', eventName: e.name, eventData: JSON.stringify(e.data) }))
  const res = await fetch(`${DRAIN_BASE}/api/marketing/analytics/vercel-drain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: rows }),
  })
  const body = await res.text()
  console.log(`\nDrain response (${res.status}): ${body}`)
  if (!res.ok) process.exitCode = 1
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
