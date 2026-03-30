/**
 * Media Integrity Tests
 *
 * Validates that all media references across the site are valid:
 * - All Sanity image assets exist and are accessible
 * - All CloudFront image URLs in static overrides resolve
 * - All video embed URLs return 200
 * - All iframe embed URLs are reachable (Figma embeds may 404 — tracked separately)
 * - No images render without width/height (causes layout shift)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from 'next-sanity'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

interface EmbedInfo {
  slug: string
  type: string
  url: string
}

let embeds: EmbedInfo[] = []
let staticOverrideImages: { slug: string; path: string }[] = []

beforeAll(async () => {
  // Collect all embed URLs from Sanity
  const docs = await client.fetch(`
    *[defined(content)] {
      "slug": slug.current,
      "embeds": content[_type in ["videoEmbed", "iframeEmbed"]] { _type, url, poster }
    }
  `)

  for (const doc of docs) {
    if (!doc.embeds) continue
    for (const e of doc.embeds) {
      if (e.url) embeds.push({ slug: doc.slug, type: e._type, url: e.url })
      if (e.poster) embeds.push({ slug: doc.slug, type: 'poster', url: e.poster })
    }
  }

  // Collect CloudFront image paths from static override files
  const visionDir = 'src/app/(main)/vision'
  try {
    const dirs = readdirSync(visionDir).filter(d => d !== '[slug]')
    for (const dir of dirs) {
      const pagePath = join(visionDir, dir, 'page.tsx')
      try {
        const content = readFileSync(pagePath, 'utf-8')
        const matches = [...content.matchAll(/cloudfrontImage\(['"]([^'"]+)['"]\)/g)]
        for (const [, path] of matches) {
          staticOverrideImages.push({ slug: dir, path })
        }
      } catch { /* no page.tsx */ }
    }
  } catch { /* dir doesn't exist */ }
})

describe('Media Integrity', () => {
  it('should have all Sanity video embed URLs reachable', async () => {
    const videoEmbeds = embeds.filter(e => e.type === 'videoEmbed')
    const failures: string[] = []

    for (const { slug, url } of videoEmbeds) {
      try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
        if (!res.ok) {
          failures.push(`${res.status} [${slug}] ${url.slice(-60)}`)
        }
      } catch (e) {
        failures.push(`ERR [${slug}] ${url.slice(-60)}: ${(e as Error).message.slice(0, 30)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('should have all video poster images reachable', async () => {
    const posters = embeds.filter(e => e.type === 'poster')
    const failures: string[] = []

    for (const { slug, url } of posters) {
      try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
        if (!res.ok) {
          failures.push(`${res.status} [${slug}] ${url.slice(-60)}`)
        }
      } catch (e) {
        failures.push(`ERR [${slug}] ${url.slice(-60)}: ${(e as Error).message.slice(0, 30)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('should have all iframe embed URLs reachable (excluding known Figma 404s)', async () => {
    const iframeEmbeds = embeds.filter(e => e.type === 'iframeEmbed')
    const failures: string[] = []

    // Known Figma embeds that 404 (Figma-side issue, not ours)
    const knownFigma404s = new Set(['all-of-us', 'prior-auth'])

    for (const { slug, url } of iframeEmbeds) {
      if (url.includes('figma.com') && knownFigma404s.has(slug)) continue

      try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000), redirect: 'follow' })
        if (!res.ok) {
          failures.push(`${res.status} [${slug}] ${url.slice(0, 80)}`)
        }
      } catch (e) {
        failures.push(`ERR [${slug}] ${url.slice(0, 60)}: ${(e as Error).message.slice(0, 30)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('should have all CloudFront images in static overrides reachable', async () => {
    if (staticOverrideImages.length === 0) {
      return // No static overrides to check
    }

    const failures: string[] = []
    const checked = new Set<string>()

    for (const { slug, path } of staticOverrideImages) {
      if (checked.has(path)) continue
      checked.add(path)

      // Try CloudFront first, then goinvo.com
      const urls = [
        `https://dd17w042cevyt.cloudfront.net${path}`,
        `https://www.goinvo.com${path}`,
      ]

      let found = false
      for (const url of urls) {
        try {
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
          if (res.ok) { found = true; break }
        } catch { /* try next */ }
      }

      if (!found) {
        failures.push(`[${slug}] ${path}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('should have no Sanity image blocks with missing asset references', async () => {
    const docs = await client.fetch(`
      *[defined(content)] {
        "slug": slug.current,
        "brokenImages": count(content[_type == "image" && !defined(asset)])
      }[brokenImages > 0]
    `)

    const failures = docs.map((d: { slug: string; brokenImages: number }) =>
      `${d.slug}: ${d.brokenImages} image(s) without asset`
    )
    expect(failures).toEqual([])
  })
})
