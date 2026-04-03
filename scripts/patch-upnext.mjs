/**
 * Patch Up Next entries to match Gatsby
 *
 * Scrapes the Gatsby live site for each case study's "Up Next" links,
 * resolves them to Sanity document IDs, and patches the upNext array.
 *
 * Usage:
 *   node scripts/patch-upnext.mjs              # all case studies
 *   node scripts/patch-upnext.mjs mitre-shr    # single page
 *   node scripts/patch-upnext.mjs --dry-run    # preview only
 */

import { createClient } from '@sanity/client'
import puppeteer from 'puppeteer'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || 'sk193iVVrPLplMQlWPjZuFNuvIjtYY0hYw4Jfv7zGvzg4bX1xtm5WC9fbZtnEWVdWk3Ft4CGvOqg058qJBXv9ybliMn1TUnv6INGxFPXNRLlsKFGjOUIQFcPnTZ6y6BO1kfkytu4rvnJ0dWIizHd5U5kp3UTEj3MNCsnKB9BSvF1ryQ5Whmu',
  useCdn: false,
})

const dryRun = process.argv.includes('--dry-run')
const singleSlug = process.argv.slice(2).find(a => !a.startsWith('-'))

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n')

  // Get all case study and feature IDs
  const caseStudies = await client.fetch('*[_type=="caseStudy"]{_id, "slug": slug.current, upNext}')
  const features = await client.fetch('*[_type=="feature"]{_id, "slug": slug.current}')

  const slugToDoc = {}
  for (const d of caseStudies) if (d.slug) slugToDoc[d.slug] = { id: d._id, type: 'caseStudy' }
  for (const d of features) if (d.slug) slugToDoc[d.slug] = { id: d._id, type: 'feature' }

  const toFix = singleSlug
    ? caseStudies.filter(d => d.slug === singleSlug)
    : caseStudies.filter(d => (d.upNext?.length || 0) < 3)

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  let totalFixed = 0

  for (const doc of toFix) {
    if (!doc.slug) continue

    // Get Gatsby upNext links
    await page.goto(`https://www.goinvo.com/work/${doc.slug}/`, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 1500))

    const gatsbyLinks = await page.evaluate(() => {
      const section = document.querySelector('.background--blue')
      if (!section) return []
      return Array.from(section.querySelectorAll('a[href]')).map(a => {
        const href = a.getAttribute('href') || ''
        // Match /work/slug/ or /vision/slug/
        const match = href.match(/\/(work|vision)\/([^/]+)/)
        return match ? match[2] : null
      }).filter(Boolean)
    }).catch(() => [])

    if (gatsbyLinks.length === 0) continue
    if (gatsbyLinks.length <= (doc.upNext?.length || 0)) continue

    // Build upNext refs
    const newRefs = []
    for (const slug of gatsbyLinks) {
      const target = slugToDoc[slug]
      if (target) {
        newRefs.push({
          _type: 'reference',
          _ref: target.id,
          _key: Math.random().toString(36).substring(2, 8),
        })
      } else {
        console.log(`  ⚠ ${doc.slug}: "${slug}" not found in Sanity`)
      }
    }

    if (newRefs.length > (doc.upNext?.length || 0)) {
      const final = newRefs.slice(0, 3)
      if (dryRun) {
        console.log(`${doc.slug}: would set ${final.length} upNext (was ${doc.upNext?.length || 0})`)
      } else {
        await client.patch(doc._id).set({ upNext: final }).commit()
        console.log(`${doc.slug}: ${doc.upNext?.length || 0} → ${final.length} upNext`)
        totalFixed++
      }
    }
  }

  await browser.close()
  console.log(`\n${dryRun ? 'Would fix' : 'Fixed'}: ${totalFixed} pages`)
}

main().catch(console.error)
