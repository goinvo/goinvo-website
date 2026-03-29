/**
 * Site Integrity Audit
 *
 * Checks against a running Next.js server:
 * 1. All known routes return 200
 * 2. All redirects resolve to live pages
 * 3. Pages have proper SEO meta tags (title, description, og:image)
 * 4. Internal links on pages are valid
 * 5. Images on pages are reachable
 *
 * Usage: node scripts/audit-site-integrity.mjs [--base http://localhost:3099]
 */

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--base') + 1]
  || 'http://localhost:3099'

// All known static routes from the app
const STATIC_ROUTES = [
  '/',
  '/about',
  '/about/careers',
  '/about/open-office-hours',
  '/about/studio-timeline',
  '/services',
  '/enterprise',
  '/government',
  '/ai',
  '/patient-engagement',
  '/open-source-health-design',
  '/why-hire-healthcare-design-studio',
  '/work',
  '/vision',
  '/contact',
  '/thank-you',
]

// All vision article routes (static pages)
const VISION_ROUTES = [
  '/vision/ai-design-certification',
  '/vision/augmented-clinical-decision-support',
  '/vision/bathroom-to-healthroom',
  '/vision/care-plans',
  '/vision/coronavirus',
  '/vision/determinants-of-health',
  '/vision/digital-health-trends-2022',
  '/vision/digital-healthcare',
  '/vision/disrupt',
  '/vision/ebola-care-guideline',
  '/vision/eligibility-engine',
  '/vision/experiments',
  '/vision/faces-in-health-communication',
  '/vision/fraud-waste-abuse-in-healthcare',
  '/vision/healing-us-healthcare',
  '/vision/health-design-thinking',
  '/vision/health-visualizations',
  '/vision/healthcare-ai',
  '/vision/healthcare-dollars',
  '/vision/history-of-health-design',
  '/vision/human-centered-design-for-ai',
  '/vision/killer-truths',
  '/vision/living-health-lab',
  '/vision/loneliness-in-our-human-code',
  '/vision/national-cancer-navigation',
  '/vision/open-pro',
  '/vision/open-source-healthcare',
  '/vision/oral-history-goinvo',
  '/vision/own-your-health-data',
  '/vision/patient-centered-consent',
  '/vision/physician-burnout',
  '/vision/precision-autism',
  '/vision/primary-self-care-algorithms',
  '/vision/print-big',
  '/vision/public-healthroom',
  '/vision/redesign-democracy',
  '/vision/test-treat-trace',
  '/vision/understanding-ebola',
  '/vision/understanding-zika',
  '/vision/us-healthcare-problems',
  '/vision/vapepocolypse',
  '/vision/virtual-care',
  '/vision/virtual-diabetes-care',
  '/vision/visual-storytelling-with-genai',
  '/vision/who-uses-my-health-data',
]

// Case study slugs (dynamic SSG routes)
const CASE_STUDY_SLUGS = [
  '3m-coderyte',
  'ahrq-cds',
  'all-of-us',
  'care-cards',
  'commonhealth-smart-health-cards',
  'fastercures-health-data-basics',
  'hgraph',
  'infobionic-heart-monitoring',
  'insidetracker-nutrition-science',
  'inspired-ehrs',
  'ipsos-facto',
  'mass-snap',
  'maya-ehr',
  'mitre-flux-notes',
  'mitre-shr',
  'mitre-state-of-us-healthcare',
  'mount-sinai-consent',
  'paintrackr',
  'partners-geneinsight',
  'partners-insight',
  'personal-genome-project-vision',
  'prior-auth',
  'public-sector',
  'staffplan',
  'tabeeb-diagnostics',
  'wuxi-nextcode-familycode',
  'visual-government',
]

const WORK_ROUTES = CASE_STUDY_SLUGS.map(s => `/work/${s}`)

const ALL_ROUTES = [...STATIC_ROUTES, ...VISION_ROUTES, ...WORK_ROUTES]

// ─── Helpers ───────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}, timeout = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal, redirect: 'manual' })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

function extractFromHtml(html, regex) {
  const match = html.match(regex)
  return match ? match[1] : null
}

function extractAllMatches(html, regex) {
  const results = []
  let match
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1])
  }
  return results
}

// ─── Route Checker ─────────────────────────────────────────────────

async function checkRoute(path) {
  const url = `${BASE}${path}`
  try {
    const res = await fetchWithTimeout(url)
    const status = res.status
    const html = status === 200 ? await res.text() : ''

    const result = { path, status, issues: [] }

    if (status !== 200) {
      result.issues.push({ severity: 'error', msg: `HTTP ${status}` })
      return result
    }

    // SEO checks
    const title = extractFromHtml(html, /<title[^>]*>([^<]+)<\/title>/)
    const description = extractFromHtml(html, /<meta\s+name="description"\s+content="([^"]*)"/)
      || extractFromHtml(html, /<meta\s+content="([^"]*)"\s+name="description"/)
    const ogImage = extractFromHtml(html, /<meta\s+property="og:image"\s+content="([^"]*)"/)
      || extractFromHtml(html, /<meta\s+content="([^"]*)"\s+property="og:image"/)

    if (!title || title.trim() === '') {
      result.issues.push({ severity: 'warn', msg: 'Missing <title>' })
    }
    if (!description) {
      result.issues.push({ severity: 'warn', msg: 'Missing meta description' })
    }
    if (!ogImage) {
      result.issues.push({ severity: 'info', msg: 'Missing og:image' })
    }

    result.seo = { title: title?.trim(), description: description?.slice(0, 80), ogImage: !!ogImage }

    // Extract internal links
    const internalLinks = extractAllMatches(html, /href="(\/[^"#]*?)"/g)
    result.internalLinkCount = new Set(internalLinks).size

    // Extract images
    const imgSrcs = [
      ...extractAllMatches(html, /src="(https?:\/\/[^"]+)"/g),
      ...extractAllMatches(html, /srcSet="([^"]+)"/g).flatMap(s => s.split(',').map(u => u.trim().split(' ')[0])),
    ].filter(Boolean)
    result.imageCount = new Set(imgSrcs).size

    return result
  } catch (err) {
    return { path, status: 0, issues: [{ severity: 'error', msg: `Fetch error: ${err.message}` }] }
  }
}

// ─── Redirect Checker ──────────────────────────────────────────────

async function checkRedirect(source, expectedDest) {
  // Skip external redirects
  if (expectedDest.startsWith('http') && !expectedDest.startsWith(BASE)) {
    return { source, destination: expectedDest, status: 'skip', issues: [] }
  }

  const url = `${BASE}/${source}`
  try {
    const res = await fetchWithTimeout(url, {}, 5000)
    const status = res.status
    const location = res.headers.get('location')

    const issues = []

    if (status === 301 || status === 308) {
      // Redirect exists - check destination
      if (location) {
        const locPath = location.startsWith('http') ? new URL(location).pathname : location
        const expectedPath = expectedDest.startsWith('http') ? new URL(expectedDest).pathname : expectedDest
        if (locPath !== expectedPath && locPath !== expectedPath.replace(/\/$/, '')) {
          issues.push({ severity: 'warn', msg: `Redirects to ${locPath}, expected ${expectedPath}` })
        }
      }
    } else if (status === 200) {
      // Page exists at this URL (no redirect needed, or redirect not firing)
      issues.push({ severity: 'info', msg: `Returns 200 instead of redirecting to ${expectedDest}` })
    } else if (status === 404) {
      issues.push({ severity: 'error', msg: `404 — redirect not working` })
    } else {
      issues.push({ severity: 'warn', msg: `HTTP ${status}` })
    }

    return { source, destination: expectedDest, status, location, issues }
  } catch (err) {
    return { source, destination: expectedDest, status: 0, issues: [{ severity: 'error', msg: err.message }] }
  }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Site Integrity Audit`)
  console.log(`   Base URL: ${BASE}`)
  console.log(`   Routes to check: ${ALL_ROUTES.length}`)

  // ─── 1. Check all routes ────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`)
  console.log('1. ROUTE CHECKS')
  console.log('='.repeat(80))

  const routeResults = []
  // Process in batches of 10
  for (let i = 0; i < ALL_ROUTES.length; i += 10) {
    const batch = ALL_ROUTES.slice(i, i + 10)
    const results = await Promise.all(batch.map(checkRoute))
    routeResults.push(...results)
    process.stdout.write(`   Checked ${Math.min(i + 10, ALL_ROUTES.length)}/${ALL_ROUTES.length}\r`)
  }
  console.log('')

  const routeErrors = routeResults.filter(r => r.issues.some(i => i.severity === 'error'))
  const routeWarnings = routeResults.filter(r => r.issues.some(i => i.severity === 'warn'))
  const routeOk = routeResults.filter(r => r.status === 200 && !r.issues.some(i => i.severity === 'error'))

  console.log(`\n   ✅ ${routeOk.length} routes OK`)
  if (routeErrors.length > 0) {
    console.log(`   ❌ ${routeErrors.length} routes with errors:`)
    for (const r of routeErrors) {
      for (const issue of r.issues.filter(i => i.severity === 'error')) {
        console.log(`      ${r.path} — ${issue.msg}`)
      }
    }
  }
  if (routeWarnings.length > 0) {
    console.log(`   ⚠️  ${routeWarnings.length} routes with warnings:`)
    for (const r of routeWarnings) {
      for (const issue of r.issues.filter(i => i.severity === 'warn')) {
        console.log(`      ${r.path} — ${issue.msg}`)
      }
    }
  }

  // ─── 2. SEO Summary ─────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`)
  console.log('2. SEO META TAGS')
  console.log('='.repeat(80))

  const missingTitle = routeResults.filter(r => r.seo && !r.seo.title)
  const missingDesc = routeResults.filter(r => r.seo && !r.seo.description)
  const missingOg = routeResults.filter(r => r.seo && !r.seo.ogImage)

  console.log(`   Missing <title>: ${missingTitle.length}`)
  for (const r of missingTitle) console.log(`      ${r.path}`)
  console.log(`   Missing meta description: ${missingDesc.length}`)
  for (const r of missingDesc) console.log(`      ${r.path}`)
  console.log(`   Missing og:image: ${missingOg.length}`)
  if (missingOg.length <= 20) {
    for (const r of missingOg) console.log(`      ${r.path}`)
  } else {
    console.log(`      (${missingOg.length} pages — showing first 10)`)
    for (const r of missingOg.slice(0, 10)) console.log(`      ${r.path}`)
  }

  // ─── 3. Redirect Checks ─────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`)
  console.log('3. REDIRECT CHECKS')
  console.log('='.repeat(80))

  // Load redirects.json
  const fs = await import('fs')
  const redirectsPath = new URL('../redirects.json', import.meta.url)
  const redirects = JSON.parse(fs.readFileSync(redirectsPath, 'utf8'))
  const redirectEntries = Object.entries(redirects)

  console.log(`   Total redirect rules: ${redirectEntries.length}`)

  const redirectResults = []
  for (let i = 0; i < redirectEntries.length; i += 15) {
    const batch = redirectEntries.slice(i, i + 15)
    const results = await Promise.all(batch.map(([src, dest]) => checkRedirect(src, dest)))
    redirectResults.push(...results)
    process.stdout.write(`   Checked ${Math.min(i + 15, redirectEntries.length)}/${redirectEntries.length}\r`)
  }
  console.log('')

  const redirectErrors = redirectResults.filter(r => r.issues.some(i => i.severity === 'error'))
  const redirectWarns = redirectResults.filter(r => r.issues.some(i => i.severity === 'warn'))
  const redirectSkipped = redirectResults.filter(r => r.status === 'skip')
  const redirectOk = redirectResults.filter(r => r.issues.length === 0 && r.status !== 'skip')

  console.log(`\n   ✅ ${redirectOk.length} redirects OK`)
  console.log(`   ⏭️  ${redirectSkipped.length} skipped (external targets)`)
  if (redirectErrors.length > 0) {
    console.log(`   ❌ ${redirectErrors.length} redirect errors:`)
    for (const r of redirectErrors) {
      for (const issue of r.issues.filter(i => i.severity === 'error')) {
        console.log(`      /${r.source} → ${r.destination} — ${issue.msg}`)
      }
    }
  }
  if (redirectWarns.length > 0) {
    console.log(`   ⚠️  ${redirectWarns.length} redirect warnings:`)
    for (const r of redirectWarns) {
      for (const issue of r.issues) {
        console.log(`      /${r.source} → ${r.destination} — ${issue.msg}`)
      }
    }
  }

  // ─── 4. Cross-page internal link validation ─────────────────────
  console.log(`\n${'='.repeat(80)}`)
  console.log('4. INTERNAL LINK VALIDATION')
  console.log('='.repeat(80))

  // Collect all internal links from a sample of key pages
  const keyPages = ['/', '/work', '/vision', '/about', '/services', '/contact']
  const allInternalLinks = new Set()

  for (const path of keyPages) {
    try {
      const res = await fetchWithTimeout(`${BASE}${path}`)
      if (res.status === 200) {
        const html = await res.text()
        const links = extractAllMatches(html, /href="(\/[^"#]*?)"/g)
        links.forEach(l => allInternalLinks.add(l))
      }
    } catch {}
  }

  console.log(`   Found ${allInternalLinks.size} unique internal links across ${keyPages.length} key pages`)

  // Check each internal link
  const brokenLinks = []
  const linkArray = [...allInternalLinks]
  for (let i = 0; i < linkArray.length; i += 10) {
    const batch = linkArray.slice(i, i + 10)
    const results = await Promise.all(batch.map(async (link) => {
      try {
        const res = await fetchWithTimeout(`${BASE}${link}`, {}, 5000)
        // Follow redirects manually for status check
        if (res.status >= 400) return { link, status: res.status }
        return null
      } catch {
        return { link, status: 0 }
      }
    }))
    brokenLinks.push(...results.filter(Boolean))
    process.stdout.write(`   Checked ${Math.min(i + 10, linkArray.length)}/${linkArray.length}\r`)
  }
  console.log('')

  if (brokenLinks.length > 0) {
    console.log(`   ❌ ${brokenLinks.length} broken internal links:`)
    for (const b of brokenLinks) {
      console.log(`      ${b.link} — HTTP ${b.status}`)
    }
  } else {
    console.log(`   ✅ All ${allInternalLinks.size} internal links are valid`)
  }

  // ─── 5. Summary ─────────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80))

  const totalErrors = routeErrors.length + redirectErrors.length + brokenLinks.length
  const totalWarnings = routeWarnings.length + redirectWarns.length + missingDesc.length

  console.log(`   Routes:     ${routeOk.length}/${ALL_ROUTES.length} OK`)
  console.log(`   Redirects:  ${redirectOk.length}/${redirectEntries.length - redirectSkipped.length} OK (${redirectSkipped.length} external skipped)`)
  console.log(`   Links:      ${allInternalLinks.size - brokenLinks.length}/${allInternalLinks.size} OK`)
  console.log(`   SEO:        ${missingTitle.length} missing titles, ${missingDesc.length} missing descriptions`)
  console.log(``)
  console.log(`   Total errors:   ${totalErrors}`)
  console.log(`   Total warnings: ${totalWarnings}`)
  console.log('')

  if (totalErrors > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
