/**
 * Sanity Content Integrity Tests
 *
 * Validates that all Sanity CMS content is structurally correct:
 * - No broken asset references
 * - No malformed URLs in embeds/links
 * - No empty content blocks
 * - No double-numbered ordered lists
 * - No consecutive dividers (quote components already render dividers)
 * - All image blocks have valid asset refs
 * - All video/iframe embeds have valid URLs
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from 'next-sanity'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

interface SanityBlock {
  _type: string
  _key?: string
  style?: string
  children?: Array<{ text?: string; marks?: string[] }>
  markDefs?: Array<{ _type: string; href?: string }>
  asset?: { _ref?: string }
  url?: string
  poster?: string
  listItem?: string
  items?: Array<{ title?: string; link?: string }>
  content?: SanityBlock[]
  buttons?: Array<{ label?: string; url?: string }>
}

interface Doc {
  _id: string
  _type: string
  slug: string
  title: string
  content: SanityBlock[]
}

let allDocs: Doc[] = []

beforeAll(async () => {
  allDocs = await client.fetch(
    `*[defined(content) && length(content) > 0] {
      _id, _type, title,
      "slug": slug.current,
      content
    }`
  )
})

describe('Sanity Content Integrity', () => {
  it('should have documents to test', () => {
    expect(allDocs.length).toBeGreaterThan(0)
  })

  it('should have no image blocks without asset references', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'image' && !block.asset?._ref) {
          broken.push(`${doc._type}/${doc.slug}: image block missing asset ref`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no malformed URLs in video/iframe embeds', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'videoEmbed' || block._type === 'iframeEmbed') {
          const url = block.url || ''
          if (url.includes('\n') || url.includes('\r') || url.includes(')}') || url.includes('className')) {
            broken.push(`${doc._type}/${doc.slug}: ${block._type} has malformed URL: ${url.slice(0, 60)}`)
          }
          if (block._type === 'videoEmbed' && block.poster) {
            const poster = block.poster
            if (poster.includes('\n') || poster.includes(')}')) {
              broken.push(`${doc._type}/${doc.slug}: videoEmbed has malformed poster: ${poster.slice(0, 60)}`)
            }
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no malformed URLs in inline links', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'block' && block.markDefs) {
          for (const md of block.markDefs) {
            if (md._type === 'link' && md.href) {
              if (md.href.includes('\n') || md.href.includes('\r') || md.href.includes(')}')) {
                broken.push(`${doc._type}/${doc.slug}: link has malformed href: ${md.href.slice(0, 60)}`)
              }
            }
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no double-numbered ordered list items', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'block' && block.listItem === 'number') {
          const text = (block.children || []).map(c => c.text || '').join('')
          if (/^\d+[\.\)]\s/.test(text)) {
            broken.push(`${doc._type}/${doc.slug}: ordered list item starts with number: "${text.slice(0, 50)}"`)
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no consecutive divider blocks', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (let i = 0; i < doc.content.length - 1; i++) {
        if (doc.content[i]._type === 'divider' && doc.content[i + 1]._type === 'divider') {
          broken.push(`${doc._type}/${doc.slug}: consecutive dividers at index ${i}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no divider immediately after a quote block', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (let i = 0; i < doc.content.length - 1; i++) {
        if (doc.content[i]._type === 'quote' && doc.content[i + 1]._type === 'divider') {
          broken.push(`${doc._type}/${doc.slug}: divider after quote at index ${i} (Quote component already renders its own dividers)`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no excessive empty paragraphs (more than 2 per document)', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      let emptyCount = 0
      for (const block of doc.content) {
        if (block._type === 'block' && block.style === 'normal') {
          const text = (block.children || []).map(c => c.text || '').join('').trim()
          if (text === '') emptyCount++
        }
      }
      if (emptyCount > 2) {
        broken.push(`${doc._type}/${doc.slug}: ${emptyCount} empty paragraphs`)
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no buttonGroup blocks with empty buttons array', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'buttonGroup') {
          if (!block.buttons || block.buttons.length === 0) {
            broken.push(`${doc._type}/${doc.slug}: buttonGroup with no buttons`)
          }
          for (const btn of block.buttons || []) {
            if (!btn.label || !btn.url) {
              broken.push(`${doc._type}/${doc.slug}: button missing label or url`)
            }
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no references blocks with empty items', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'references') {
          if (!block.items || block.items.length === 0) {
            broken.push(`${doc._type}/${doc.slug}: references block with no items`)
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no deprecated h2Center style (use sectionTitle instead)', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'block' && block.style === 'h2Center') {
          const text = (block.children || []).map(c => c.text || '').join('').slice(0, 40)
          broken.push(`${doc._type}/${doc.slug}: deprecated h2Center style on "${text}"`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('should have no deprecated ctaButton blocks (use buttonGroup instead)', () => {
    const broken: string[] = []
    for (const doc of allDocs) {
      for (const block of doc.content) {
        if (block._type === 'ctaButton') {
          broken.push(`${doc._type}/${doc.slug}: deprecated ctaButton block`)
        }
      }
    }
    expect(broken).toEqual([])
  })
})
