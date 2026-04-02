/**
 * Patch Missing Superscripts
 *
 * Compares Gatsby rendered HTML against Sanity content to find
 * superscript reference numbers missing from the Sanity document,
 * then patches them in via CLI.
 *
 * Usage:
 *   node scripts/patch-superscripts.mjs                 # all pages
 *   node scripts/patch-superscripts.mjs prior-auth      # single page
 *   node scripts/patch-superscripts.mjs --dry-run       # preview only
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

// Pages with known missing superscripts
const PAGES = [
  { slug: 'prior-auth', type: 'caseStudy', gatsbyPath: '/work/prior-auth/' },
  { slug: 'all-of-us', type: 'caseStudy', gatsbyPath: '/work/all-of-us/' },
  { slug: 'wuxi-nextcode-familycode', type: 'caseStudy', gatsbyPath: '/work/wuxi-nextcode-familycode/' },
  { slug: 'commonhealth-smart-health-cards', type: 'caseStudy', gatsbyPath: '/work/commonhealth-smart-health-cards/' },
  { slug: 'mount-sinai-consent', type: 'caseStudy', gatsbyPath: '/work/mount-sinai-consent/' },
  { slug: 'virtual-diabetes-care', type: 'feature', gatsbyPath: '/vision/virtual-diabetes-care/' },
  { slug: 'faces-in-health-communication', type: 'feature', gatsbyPath: '/vision/faces-in-health-communication/' },
  { slug: 'eligibility-engine', type: 'feature', gatsbyPath: '/vision/eligibility-engine/' },
  { slug: 'virtual-care', type: 'feature', gatsbyPath: '/vision/virtual-care/' },
  { slug: 'healthcare-dollars', type: 'feature', gatsbyPath: '/vision/healthcare-dollars/' },
]

async function getGatsbySuperscripts(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise(r => setTimeout(r, 1500))

  return page.evaluate(() => {
    const main = document.querySelector('.app__body') || document.body
    const sups = main.querySelectorAll('sup')
    return Array.from(sups).map(sup => {
      const supText = sup.textContent.trim()
      const parent = sup.closest('p, li, h1, h2, h3, h4, td, div')
      if (!parent) return null

      // Get text before the sup in the same parent
      const range = document.createRange()
      range.setStart(parent, 0)
      range.setEndBefore(sup)
      const textBefore = range.toString().trim()
      const context = textBefore.slice(-40).trim()

      return { supText, context }
    }).filter(Boolean)
  })
}

function patchContent(content, gatsbySupInfo) {
  let patched = 0

  for (const sup of gatsbySupInfo) {
    const { supText, context } = sup
    if (!supText || !context) continue

    let found = false
    for (let bi = 0; bi < content.length && !found; bi++) {
      const block = content[bi]
      if (block._type !== 'block') continue

      for (let ci = 0; ci < (block.children || []).length && !found; ci++) {
        const child = block.children[ci]
        const childText = child.text || ''

        // Try several context lengths for matching
        for (const ctxLen of [20, 15, 10, 7, 5]) {
          const contextEnd = context.slice(-ctxLen)
          if (!contextEnd) continue

          // Pattern 1: sup text already in the span (e.g., "sentence.1")
          const needle = contextEnd + supText
          const idx1 = childText.indexOf(needle)
          if (idx1 >= 0 && !child.marks?.includes('sup')) {
            const splitPoint = idx1 + contextEnd.length
            const textBefore = childText.substring(0, splitPoint)
            const textSup = supText
            const textAfter = childText.substring(splitPoint + supText.length)

            const newChildren = []
            if (textBefore) newChildren.push({ ...child, text: textBefore, _key: child._key })
            newChildren.push({
              _type: 'span', _key: child._key + 's' + patched,
              text: textSup, marks: [...(child.marks || []).filter(m => m !== 'sup'), 'sup'],
            })
            if (textAfter) newChildren.push({ ...child, text: textAfter, _key: child._key + 'a' + patched })

            block.children.splice(ci, 1, ...newChildren)
            patched++; found = true
            console.log(`  ${dryRun ? '[DRY]' : '✓'} Block ${bi}: split "...${contextEnd}${supText}"`)
            break
          }

          // Pattern 2: sup text NOT in span — need to INSERT it after the context
          const idx2 = childText.indexOf(contextEnd)
          if (idx2 >= 0) {
            const insertPoint = idx2 + contextEnd.length
            const textBefore = childText.substring(0, insertPoint)
            const textAfter = childText.substring(insertPoint)

            const newChildren = []
            if (textBefore) newChildren.push({ ...child, text: textBefore, _key: child._key })
            newChildren.push({
              _type: 'span', _key: child._key + 's' + patched,
              text: supText, marks: [...(child.marks || []).filter(m => m !== 'sup'), 'sup'],
            })
            if (textAfter) newChildren.push({ ...child, text: textAfter, _key: child._key + 'a' + patched })

            block.children.splice(ci, 1, ...newChildren)
            patched++; found = true
            console.log(`  ${dryRun ? '[DRY]' : '✓'} Block ${bi}: insert sup "${supText}" after "...${contextEnd}"`)
            break
          }
        }
      }
    }

    if (!found) {
      console.log(`  ⚠ Not found: sup "${supText}" after "...${context.slice(-20)}"`)
    }
  }

  return patched
}

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n')

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const bPage = await browser.newPage()
  await bPage.setViewport({ width: 1280, height: 900 })

  const pages = singleSlug ? PAGES.filter(p => p.slug === singleSlug) : PAGES
  if (singleSlug && pages.length === 0) {
    console.log(`Slug "${singleSlug}" not in PAGES list`)
    await browser.close()
    return
  }

  let totalPatched = 0

  for (const p of pages) {
    console.log(`\n=== ${p.slug} ===`)

    // Get superscript positions from Gatsby
    const sups = await getGatsbySuperscripts(bPage, `https://www.goinvo.com${p.gatsbyPath}`)
    console.log(`  Gatsby has ${sups.length} superscripts`)
    if (sups.length === 0) continue

    // Get Sanity document
    const doc = await client.fetch(
      `*[_type=="${p.type}" && slug.current=="${p.slug}"][0]{_id, content}`
    )
    if (!doc) { console.log(`  NOT FOUND`); continue }

    // Deep clone content
    const content = JSON.parse(JSON.stringify(doc.content))

    // Patch
    const patched = patchContent(content, sups)
    totalPatched += patched

    if (patched > 0 && !dryRun) {
      await client.patch(doc._id).set({ content }).commit()
      console.log(`  Saved ${patched} superscripts`)
    } else {
      console.log(`  ${dryRun ? 'Would patch' : 'Patched'}: ${patched}/${sups.length}`)
    }
  }

  await browser.close()
  console.log(`\nTotal patched: ${totalPatched}`)
}

main().catch(console.error)
