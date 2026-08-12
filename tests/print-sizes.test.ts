/**
 * Print size guard
 *
 * The shop states a physical size on 23 of its 31 cards. That is a promise
 * about an object someone receives in the post, and it fails silently in both
 * directions: a size keyed to a slug that does not exist simply renders nothing,
 * and a size edited to a non-standard sheet still renders perfectly happily.
 *
 * Two of the entries were not derived from anything — determinants-of-health and
 * healthcare-is-a-human-right are the only sizes anyone has confirmed, and
 * neither matches the proportions of its own artwork. They are pinned here so a
 * later sweep over this map cannot quietly "correct" them to something nobody
 * verified with the printer.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { PRINT_SIZE_BY_SLUG } from '../src/lib/shop/printSizes'

const knownSlugs = new Set(
  readFileSync(fileURLToPath(new URL('./fixtures/shop-product-slugs.txt', import.meta.url)), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
)

/** Standard US frame sizes, the only sheets we claim to print on. */
const STOCK_SHEETS = new Set(['11x14', '16x20', '18x24', '20x30', '24x36', '27x40'])

describe('print sizes', () => {
  it('reads the pinned catalog slugs', () => {
    expect(knownSlugs.size).toBe(31)
  })

  it('keeps the two confirmed sizes exactly as the shop has always stated them', () => {
    // Not derivable from the artwork — Determinants is a 42x50 in file sold as a
    // 24x36 print. Only a human who has seen the printed piece can change these.
    expect(PRINT_SIZE_BY_SLUG['determinants-of-health']).toBe('about 24 × 36 in')
    expect(PRINT_SIZE_BY_SLUG['healthcare-is-a-human-right']).toBe('about 11 × 14 in')
  })

  it('keys every size to a real product', () => {
    const orphans = Object.keys(PRINT_SIZE_BY_SLUG).filter((slug) => !knownSlugs.has(slug))
    expect(
      orphans,
      `These slugs are not in the catalog, so their size renders as nothing at all:\n${orphans.join('\n')}`,
    ).toEqual([])
  })

  it('quotes only sheet sizes a customer can buy a frame for', () => {
    const offenders: string[] = []
    for (const [slug, size] of Object.entries(PRINT_SIZE_BY_SLUG)) {
      const match = String(size).match(/^about (\d+(?:\.\d+)?) × (\d+(?:\.\d+)?) in$/)
      if (!match) {
        offenders.push(`${slug}: "${size}" is not in the form "about W × H in"`)
        continue
      }
      // Orientation is free; the sheet itself must be one we stock.
      const [w, h] = [Number(match[1]), Number(match[2])]
      const sheet = `${Math.min(w, h)}x${Math.max(w, h)}`
      if (!STOCK_SHEETS.has(sheet)) offenders.push(`${slug}: ${sheet} is not a stock sheet`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('gives the Spanish edition the same size as the English one', () => {
    // Same 42 x 50 in artwork — shipping two different sizes would be a bug.
    expect(PRINT_SIZE_BY_SLUG['determinants-of-health-spanish']).toBe(
      PRINT_SIZE_BY_SLUG['determinants-of-health'],
    )
  })

  it('states no size for the books or the banner-shaped pieces', () => {
    // Own Your Health Data and the journal are books; the rest fit no stock
    // sheet (HIE Data Access Workflow is nearly 5:1). A frame size on any of
    // these would be a promise we cannot keep.
    for (const slug of [
      'own-your-health-data',
      'open-source-healthcare',
      'hie-data-access',
      'care-plans-process',
      'ebola',
      'critical-mass',
      'insuring-price-increase',
      'shr-medical-encounter',
    ]) {
      expect(PRINT_SIZE_BY_SLUG[slug], `${slug} should not claim a frame size`).toBeUndefined()
    }
  })
})
