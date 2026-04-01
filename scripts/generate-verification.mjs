import fs from 'fs'
import path from 'path'

const features = JSON.parse(fs.readFileSync('src/data/features.json', 'utf-8'))

let caseStudies = []
try {
  const order = JSON.parse(fs.readFileSync('C:/Users/quest/Programming/GoInvo/goinvo.com/src/data/case-study-order.json', 'utf-8'))
  caseStudies = order.all || []
} catch(e) { /* ignore */ }

const SLUG_MAP = {
  'bathroom-to-healthroom': 'from-bathroom-to-healthroom',
  'care-plans': 'careplans',
  'healing-us-healthcare': 'us-healthcare',
  'oral-history-goinvo': 'an-oral-history',
  'understanding-ebola': 'ebola',
  'understanding-zika': 'zika',
}

const LEGACY_ONLY = new Set([
  'disrupt', 'print-big', 'killer-truths', 'ebola-care-guideline',
  'digital-healthcare', 'redesign-democracy', 'health-visualizations',
  'experiments', 'bathroom-to-healthroom', 'care-plans', 'healing-us-healthcare',
  'oral-history-goinvo', 'understanding-ebola', 'understanding-zika',
])

const staticDirs = fs.readdirSync('src/app/(main)/vision').filter(d => {
  const p = path.join('src/app/(main)/vision', d)
  return fs.statSync(p).isDirectory() && d !== '[slug]'
})

// Read audit data
const auditData = {}
const reportDir = '.audit/deep-reports'
if (fs.existsSync(reportDir)) {
  for (const file of fs.readdirSync(reportDir)) {
    if (file === '_summary.json' || !file.endsWith('.json')) continue
    const slug = file.replace('.json', '')
    try {
      const r = JSON.parse(fs.readFileSync(path.join(reportDir, file), 'utf-8'))
      auditData[slug] = {
        total: (r.summary?.totalDiffs || 0) + (r.missingElements?.length || 0) + (r.extraElements?.length || 0),
        critical: r.summary?.critical || 0,
        high: r.summary?.high || 0,
        missing: r.missingElements?.length || 0,
        extra: r.extraElements?.length || 0,
      }
    } catch(e) { /* ignore */ }
  }
}

let out = `# GoInvo Website — Page Verification Checklist

Generated: ${new Date().toISOString().split('T')[0]}
Next.js: http://localhost:3000
Gatsby (live): https://www.goinvo.com

## How to verify
1. Open both URLs side by side
2. Compare: hero image, title, headings, paragraph text, images, lists, buttons, author section, references, newsletter
3. Check interactive elements: carousels, sticky navs, videos, scroll effects
4. Mark status: ✅ Match | ⚠️ Minor diffs | ❌ Major issues | 🔲 Not checked

---

## Vision Pages

| # | Title | Next.js | Gatsby | Type | Audit | ✓ |
|---|-------|---------|--------|------|-------|---|
`

const visionPages = features
  .filter(f => f.link.startsWith('/vision/') && !f.externalLink)
  .map(f => {
    const slug = f.link.replace('/vision/', '').replace(/\/$/, '')
    const gatsbySlug = SLUG_MAP[slug] || slug
    const isLegacy = LEGACY_ONLY.has(slug)
    const isStatic = staticDirs.includes(slug)
    const gatsbyBase = isLegacy ? 'https://www.goinvo.com/features/' : 'https://www.goinvo.com/vision/'
    return { slug, title: f.title, gatsbySlug, isLegacy, isStatic, gatsbyBase }
  })

const multiParts = [
  { parent: 'disrupt', slug: 'disrupt/part-2', title: 'Disrupt Part 2: From Horse to Horsepower' },
  { parent: 'disrupt', slug: 'disrupt/part-3', title: 'Disrupt Part 3: The Coming Disruption' },
  { parent: 'disrupt', slug: 'disrupt/part-4', title: 'Disrupt Part 4: Crowdsourcing Innovation' },
  { parent: 'disrupt', slug: 'disrupt/part-5', title: 'Disrupt Part 5: The Future of Design' },
  { parent: 'disrupt', slug: 'disrupt/part-6', title: 'Disrupt Part 6: Fukushima and Fragility' },
  { parent: 'care-plans', slug: 'care-plans/part-2', title: 'Care Plans Part 2: The Current Landscape' },
  { parent: 'care-plans', slug: 'care-plans/part-3', title: 'Care Plans Part 3: The Future' },
]

let n = 1
for (const p of visionPages) {
  const a = auditData[p.slug]
  const issues = a ? `${a.total} (${a.critical}C ${a.high}H)` : '—'
  const type = p.isLegacy ? 'Legacy' : p.isStatic ? 'Static' : 'Sanity'
  out += `| ${n} | ${p.title} | [/vision/${p.slug}](http://localhost:3000/vision/${p.slug}) | [Live](${p.gatsbyBase}${p.gatsbySlug}/) | ${type} | ${issues} | 🔲 |\n`
  n++

  // Insert sub-parts
  const parts = multiParts.filter(mp => mp.parent === p.slug)
  for (const part of parts) {
    const legacySlug = p.gatsbySlug || p.slug
    out += `| ${n} | ↳ ${part.title} | [/${part.slug}](http://localhost:3000/vision/${part.slug}) | [Live](https://www.goinvo.com/features/${legacySlug}/${part.slug.split('/')[1]}.html) | Legacy | — | 🔲 |\n`
    n++
  }
}

out += `
**Vision total: ${n - 1} pages**

---

## Case Studies

| # | Slug | Next.js | Gatsby | Audit | ✓ |
|---|------|---------|--------|-------|---|
`

n = 1
for (const slug of caseStudies) {
  const a = auditData[slug]
  const issues = a ? `${a.total} (${a.critical}C ${a.high}H)` : '—'
  out += `| ${n} | ${slug} | [/work/${slug}](http://localhost:3000/work/${slug}) | [Live](https://www.goinvo.com/work/${slug}/) | ${issues} | 🔲 |\n`
  n++
}

out += `
**Case studies total: ${n - 1} pages**

---

## Main Pages

| # | Page | Next.js | Gatsby | ✓ |
|---|------|---------|--------|---|
`

const mainPages = [
  ['Home', '/'],
  ['Work (listing)', '/work'],
  ['Services', '/services'],
  ['About', '/about'],
  ['About > Careers', '/about/careers'],
  ['About > Open Office Hours', '/about/open-office-hours'],
  ['About > Studio Timeline', '/about/studio-timeline'],
  ['Vision (listing)', '/vision'],
  ['Contact', '/contact'],
  ['AI', '/ai'],
  ['Enterprise', '/enterprise'],
  ['Government', '/government'],
  ['Patient Engagement', '/patient-engagement'],
  ['Open Source Health Design', '/open-source-health-design'],
  ['404 Page', '/nonexistent-page-test'],
]

n = 1
for (const [name, route] of mainPages) {
  out += `| ${n} | ${name} | [${route}](http://localhost:3000${route}) | [Live](https://www.goinvo.com${route === '/' ? '' : route}/) | 🔲 |\n`
  n++
}

out += `
**Main pages total: ${n - 1} pages**

---

**Grand total: ${visionPages.length + multiParts.length + caseStudies.length + mainPages.length} pages**
`

fs.writeFileSync('VERIFICATION.md', out)
console.log('Written to VERIFICATION.md')
console.log(`Vision: ${visionPages.length} + ${multiParts.length} parts`)
console.log(`Case studies: ${caseStudies.length}`)
console.log(`Main pages: ${mainPages.length}`)
console.log(`Total: ${visionPages.length + multiParts.length + caseStudies.length + mainPages.length}`)
