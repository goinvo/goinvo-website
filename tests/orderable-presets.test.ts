import { describe, expect, it } from 'vitest'

import {
  getNeedsOrderingIds,
  getPresetDocumentIds,
  sortDocumentsByPreset,
} from '../src/sanity/orderable/presets'
import {
  getNamedOrderPresetId,
  getOrderPresetSlug,
} from '../src/sanity/orderable/ids'
import {
  isFeaturedFeatureDocument,
  partitionFeatureDocuments,
} from '../src/sanity/orderable/groups'
import type { OrderPreset, SanityDocumentWithOrder } from '../src/sanity/orderable/types'

function document(_id: string, orderRank?: string): SanityDocumentWithOrder {
  return {
    _id,
    _type: 'caseStudy',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    _rev: 'rev',
    ...(orderRank ? { orderRank } : {}),
  }
}

function preset(documentIds: string[]): OrderPreset {
  return {
    _id: 'orderPreset.caseStudy',
    _type: 'orderPreset',
    orderType: 'caseStudy',
    documentIds,
  }
}

describe('order presets', () => {
  it('keeps the legacy default preset id for the Default preset', () => {
    expect(getNamedOrderPresetId('caseStudy', 'Default')).toBe('orderPreset.caseStudy')
  })

  it('slugifies named preset ids', () => {
    expect(getOrderPresetSlug('Gatsby: Healthcare & AI')).toBe('gatsby-healthcare-and-ai')
    expect(getNamedOrderPresetId('caseStudy', 'Gatsby: Healthcare & AI')).toBe(
      'orderPreset.caseStudy.gatsby-healthcare-and-ai',
    )
  })

  it('counts only rankless documents when no preset has been saved', () => {
    const docs = [document('a', '0|a:'), document('drafts.b'), document('c', '0|c:')]

    expect(getNeedsOrderingIds(docs, null)).toEqual(new Set(['drafts.b']))
    expect(getNeedsOrderingIds(docs, null).size).toBe(1)
  })

  it('counts documents missing from an existing preset as needing order', () => {
    const docs = [document('a', '0|a:'), document('drafts.b', '0|b:'), document('c', '0|c:')]

    expect(getNeedsOrderingIds(docs, preset(['a', 'c']))).toEqual(new Set(['drafts.b']))
    expect(getNeedsOrderingIds(docs, preset(['a', 'c'])).size).toBe(1)
  })

  it('loads configured pages in preset order and keeps new pages first', () => {
    const docs = [document('a', '0|a:'), document('drafts.b', '0|b:'), document('c', '0|c:')]

    expect(sortDocumentsByPreset(docs, preset(['c', 'a'])).map((doc) => doc._id)).toEqual([
      'drafts.b',
      'c',
      'a',
    ])
  })

  it('saves canonical ids so draft overlays do not duplicate preset entries', () => {
    const docs = [document('drafts.a', '0|a:'), document('a', '0|a:'), document('c', '0|c:')]

    expect(getPresetDocumentIds(docs)).toEqual(['a', 'c'])
  })
})

describe('orderable feature groups', () => {
  it('uses the positive featured flag when it exists', () => {
    expect(isFeaturedFeatureDocument({ ...document('a'), featured: true })).toBe(true)
    expect(isFeaturedFeatureDocument({ ...document('b'), featured: false })).toBe(false)
  })

  it('falls back to the legacy hiddenWorkPage flag for migrated features', () => {
    expect(isFeaturedFeatureDocument({ ...document('a'), hiddenWorkPage: false })).toBe(true)
    expect(isFeaturedFeatureDocument({ ...document('b'), hiddenWorkPage: true })).toBe(false)
    expect(isFeaturedFeatureDocument(document('c'))).toBe(true)
  })

  it('partitions feature documents into featured and non-featured groups', () => {
    const docs = [
      { ...document('featured'), featured: true },
      { ...document('legacy-featured'), hiddenWorkPage: false },
      { ...document('non-featured'), featured: false },
      { ...document('legacy-hidden'), hiddenWorkPage: true },
    ]

    const groups = partitionFeatureDocuments(docs)

    expect(groups.featured.map((doc) => doc._id)).toEqual(['featured', 'legacy-featured'])
    expect(groups.nonFeatured.map((doc) => doc._id)).toEqual(['non-featured', 'legacy-hidden'])
  })
})
