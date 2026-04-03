/**
 * Legacy Feature Migration Script
 *
 * Fetches old /features/ pages from goinvo.com and generates Next.js
 * static page stubs under /vision/. Also updates features.json links
 * and adds redirects.
 *
 * These 12 features live at goinvo.com/features/... as pre-Gatsby static
 * HTML pages. When the new site replaces the old one, those URLs will be
 * dead. This script:
 *
 * 1. Fetches each legacy feature page HTML
 * 2. Extracts title, description, hero image, content sections
 * 3. Generates a Next.js page.tsx file with the content
 * 4. Updates features.json to use internal /vision/SLUG/ links
 * 5. Adds /features/SLUG → /vision/SLUG redirects to redirects.json
 *
 * Usage: npx tsx scripts/migrate-legacy-features.ts [--dry-run]
 */

import * as fs from 'fs'
import * as path from 'path'

const LEGACY_FEATURES = [
  { id: 'print-big', url: 'https://www.goinvo.com/features/print-big/', slug: 'print-big' },
  { id: 'killer-truths', url: 'https://www.goinvo.com/features/killer-truths/', slug: 'killer-truths' },
  { id: 'care-plans', url: 'https://www.goinvo.com/features/careplans/', slug: 'care-plans' },
  { id: 'understanding-zika', url: 'https://www.goinvo.com/features/zika/', slug: 'understanding-zika' },
  { id: 'digital-healthcare', url: 'https://www.goinvo.com/features/digital-healthcare/', slug: 'digital-healthcare' },
  { id: 'healing-us-healthcare', url: 'https://www.goinvo.com/features/us-healthcare/', slug: 'healing-us-healthcare' },
  { id: 'disrupt', url: 'https://www.goinvo.com/features/disrupt/', slug: 'disrupt' },
  { id: 'bathroom-to-healthroom', url: 'https://www.goinvo.com/features/from-bathroom-to-healthroom/', slug: 'bathroom-to-healthroom' },
  { id: 'oral-history-goinvo', url: 'https://www.goinvo.com/features/an-oral-history/', slug: 'oral-history-goinvo' },
  { id: 'redesign-democracy', url: 'https://www.goinvo.com/features/redesign-democracy/', slug: 'redesign-democracy' },
  { id: 'understanding-ebola', url: 'https://www.goinvo.com/features/ebola/', slug: 'understanding-ebola' },
  { id: 'ebola-care-guideline', url: 'https://www.goinvo.com/features/ebola-care-guideline/', slug: 'ebola-care-guideline' },
]

interface ExtractedContent {
  title: string
  metaDescription: string
  heroImage: string
  sections: { tag: string; text: string; html: string }[]
  images: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function extractContent(html: string, url: string): ExtractedContent {
  // Extract title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = h1Match ? stripHtml(h1Match[1]) : titleMatch ? titleMatch[1].replace(' - GoInvo', '').trim() : 'Untitled'

  // Extract meta description
  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
  const metaDescription = metaMatch ? metaMatch[1] : ''

  // Extract hero image
  const heroMatch = html.match(/class="[^"]*hero[^"]*"[\s\S]*?(?:background-image:\s*url\(([^)]+)\)|src="([^"]+)")/i)
  const heroImage = heroMatch ? (heroMatch[1] || heroMatch[2] || '').replace(/['"]/g, '') : ''

  // Extract all headings and paragraphs
  const sections: { tag: string; text: string; html: string }[] = []
  const sectionRegex = /<(h[1-4]|p|blockquote|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi
  let match
  while ((match = sectionRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const html_content = match[2]
    const text = stripHtml(html_content)
    if (text.length > 0) {
      sections.push({ tag, text: text.substring(0, 200), html: html_content })
    }
  }

  // Extract all image URLs
  const images: string[] = []
  const imgRegex = /src="(\/[^"]*\.(?:jpg|jpeg|png|gif|svg|webp))"/gi
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  return { title, metaDescription, heroImage, sections, images }
}

function generatePage(feature: typeof LEGACY_FEATURES[0], content: ExtractedContent): string {
  const heroPath = content.heroImage
    ? content.heroImage.startsWith('http')
      ? content.heroImage
      : content.heroImage
    : ''

  return `import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: ${JSON.stringify(content.title)},
  description: ${JSON.stringify(content.metaDescription || content.title)},
}

export default function ${toPascalCase(feature.slug)}Page() {
  return (
    <div>
      ${heroPath ? `<SetCaseStudyHero image={cloudfrontImage('${heroPath}')} />` : ''}

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            ${escapeJsx(content.title)}
          </h1>

          {/* TODO: Port full content from ${feature.url} */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="${feature.url}" target="_blank" rel="noopener noreferrer">
              ${feature.url}
            </a>
          </p>

${content.sections.slice(0, 10).map(s => {
  if (s.tag === 'p') return `          <p className="leading-relaxed mb-4">${escapeJsx(s.text)}</p>`
  if (s.tag.startsWith('h')) return `          <h2 className="font-serif text-2xl mt-8 mb-4">${escapeJsx(s.text)}</h2>`
  return ''
}).filter(Boolean).join('\n')}

${content.images.slice(0, 5).map(img =>
  `          <Image
            src={cloudfrontImage('${img}')}
            alt="${escapeJsx(content.title)}"
            width={1200}
            height={800}
            className="w-full h-auto mb-8"
          />`
).join('\n')}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
`
}

function toPascalCase(str: string): string {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

function escapeJsx(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/'/g, "&apos;").replace(/"/g, '&quot;')
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoInvo-Migration/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const baseDir = path.resolve(__dirname, '..')

  console.log(`\n🔄 Migrating ${LEGACY_FEATURES.length} legacy features${dryRun ? ' (DRY RUN)' : ''}...\n`)

  // Load redirects.json
  const redirectsPath = path.join(baseDir, 'redirects.json')
  const redirects = JSON.parse(fs.readFileSync(redirectsPath, 'utf-8'))

  // Load features.json
  const featuresPath = path.join(baseDir, 'src/data/features.json')
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'))

  for (const feature of LEGACY_FEATURES) {
    process.stdout.write(`  ${feature.id}... `)

    const html = await fetchPage(feature.url)
    if (!html) {
      console.log('⚠️  Could not fetch')
      continue
    }

    const content = extractContent(html, feature.url)
    const pageDir = path.join(baseDir, 'src/app/(main)/vision', feature.slug)
    const pagePath = path.join(pageDir, 'page.tsx')

    // Check if page already exists
    if (fs.existsSync(pagePath)) {
      console.log('⏭️  Page already exists')
      continue
    }

    const pageContent = generatePage(feature, content)

    if (dryRun) {
      console.log(`✅ Would create ${pagePath} (${content.title})`)
      console.log(`     Hero: ${content.heroImage || 'none'}`)
      console.log(`     Sections: ${content.sections.length}, Images: ${content.images.length}`)
    } else {
      // Create directory
      fs.mkdirSync(pageDir, { recursive: true })
      fs.writeFileSync(pagePath, pageContent)

      // Add redirect: /features/old-path → /vision/slug
      const oldPath = new URL(feature.url).pathname.replace(/\/$/, '')
      redirects[oldPath] = `/vision/${feature.slug}/`
      redirects[oldPath + '/'] = `/vision/${feature.slug}/`

      // Update features.json link
      const featureEntry = features.find((f: any) => f.id === feature.id)
      if (featureEntry) {
        featureEntry.link = `/vision/${feature.slug}/`
        delete featureEntry.externalLink
      }

      console.log(`✅ Created (${content.title}, ${content.sections.length} sections, ${content.images.length} images)`)
    }
  }

  if (!dryRun) {
    // Write updated files
    fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2))
    fs.writeFileSync(featuresPath, JSON.stringify(features, null, 2))
    console.log('\n✅ Updated redirects.json and features.json')
  }

  console.log('\n⚠️  Generated pages contain extracted content stubs.')
  console.log('   Each page needs manual review to match the original styling.')
  console.log('   Run: npx tsx scripts/compare-pages.ts SLUG to verify.\n')
}

main().catch(console.error)
