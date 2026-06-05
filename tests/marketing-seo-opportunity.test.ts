import { describe, expect, it } from 'vitest'
import {
  buildCannibalization,
  buildCtrGaps,
  ctrGapFor,
  expectedCtrForPosition,
  keyEventBoost,
} from '@/app/api/marketing/seo/route'

// These cover the three additive OPPORTUNITY-ENGINE features (SEO suite revamp
// §12): the position-adjusted CTR-gap quick-win lane, keyword cannibalization,
// and the GA4 key-events business-value boost. All exercise the pure helpers
// exported from the route (no network), matching the route-helper test pattern
// in marketing-research-run.test.ts.

// A GSC [page, query] row, as searchAnalytics returns it.
function pageQueryRow(
  page: string,
  query: string,
  impressions: number,
  clicks: number,
  position: number,
) {
  return { keys: [page, query], impressions, clicks, position, ctr: impressions > 0 ? clicks / impressions : 0 }
}

describe('expectedCtrForPosition (position→expected-CTR baseline curve)', () => {
  it('returns the documented anchors at integer page-1 positions', () => {
    expect(expectedCtrForPosition(1)).toBeCloseTo(0.28, 5)
    expect(expectedCtrForPosition(2)).toBeCloseTo(0.15, 5)
    expect(expectedCtrForPosition(3)).toBeCloseTo(0.11, 5)
    expect(expectedCtrForPosition(10)).toBeCloseTo(0.025, 5)
  })

  it('decays monotonically across page 1 (a better position never earns less)', () => {
    for (let p = 1; p < 10; p += 1) {
      expect(expectedCtrForPosition(p)).toBeGreaterThan(expectedCtrForPosition(p + 1))
    }
  })

  it('interpolates between two integer rungs for a fractional position', () => {
    const mid = expectedCtrForPosition(1.5)
    expect(mid).toBeLessThan(expectedCtrForPosition(1))
    expect(mid).toBeGreaterThan(expectedCtrForPosition(2))
    // Linear midpoint between 0.28 and 0.15.
    expect(mid).toBeCloseTo((0.28 + 0.15) / 2, 5)
  })

  it('floors page-2+ to a low single-digit value and clamps deep positions', () => {
    expect(expectedCtrForPosition(15)).toBeLessThan(0.025)
    expect(expectedCtrForPosition(20)).toBeCloseTo(0.005, 5)
    expect(expectedCtrForPosition(50)).toBeCloseTo(0.005, 5)
  })

  it('guards against zero/negative/NaN positions', () => {
    expect(expectedCtrForPosition(0)).toBe(0)
    expect(expectedCtrForPosition(-3)).toBe(0)
    expect(expectedCtrForPosition(Number.NaN)).toBe(0)
  })
})

describe('ctrGapFor (flags ranks-but-no-click queries)', () => {
  it('flags a #2 page earning 1% when ~15% is expected', () => {
    const gap = ctrGapFor(2, 0.01, 1000)
    expect(gap).not.toBeNull()
    expect(gap!.expectedCtr).toBeCloseTo(0.15, 5)
    expect(gap!.gap).toBeCloseTo(0.14, 5)
    expect(gap!.relative).toBeGreaterThan(0.4)
  })

  it('does NOT flag a query that already earns its expected CTR', () => {
    expect(ctrGapFor(2, 0.16, 1000)).toBeNull()
  })

  it('does NOT flag low-impression noise even with a large relative gap', () => {
    // Position 2, 0% CTR, but only 20 impressions → below the min-impressions bar.
    expect(ctrGapFor(2, 0, 20)).toBeNull()
  })

  it('does NOT flag a page-2 ranking (that is a ranking problem, not a CTR one)', () => {
    expect(ctrGapFor(14, 0, 5000)).toBeNull()
  })

  it('requires both an absolute AND a relative shortfall', () => {
    // pos 1, expected 28%, ctr 26.5% → gap 1.5pts (< 2pt absolute floor) → no flag
    expect(ctrGapFor(1, 0.265, 5000)).toBeNull()
  })
})

describe('buildCtrGaps (title/meta rewrite quick-win lane)', () => {
  it('surfaces a page-1 underperformer and ranks by clicks left on the table', () => {
    const rows = [
      // Big gap, lots of impressions → most missed clicks → ranks first.
      pageQueryRow('/vision/big/', 'health design firm', 5000, 100, 2), // 2% vs 15%
      // Smaller absolute miss.
      pageQueryRow('/vision/small/', 'open source ehr', 300, 6, 3), // 2% vs 11%
      // Healthy CTR → excluded.
      pageQueryRow('/vision/ok/', 'goinvo studio process', 1000, 170, 2), // 17% vs 15%
    ]
    const gaps = buildCtrGaps(rows)
    const queries = gaps.map((g) => g.query)
    expect(queries).toContain('health design firm')
    expect(queries).toContain('open source ehr')
    expect(queries).not.toContain('goinvo studio process')
    // Sorted by missed clicks (the bigger-demand gap first).
    expect(gaps[0].query).toBe('health design firm')
    expect(gaps[0].missedClicks).toBeGreaterThan(gaps[1].missedClicks)
    expect(gaps[0].fixHint).toContain('Rewrite the page title')
  })

  it('excludes brand, junk, and legacy-path rows', () => {
    const rows = [
      pageQueryRow('/vision/a/', 'goinvo healthcare', 4000, 20, 2), // brand → excluded
      pageQueryRow('/vision/b/', '"exact phrase" "second"', 4000, 20, 2), // junk (quotes) → excluded
      pageQueryRow('/features/old-thing.html', 'legacy keyword', 4000, 20, 2), // legacy path → excluded
    ]
    expect(buildCtrGaps(rows)).toEqual([])
  })

  it('returns one actionable row per (page, query) with the snippet detail', () => {
    const rows = [pageQueryRow('/vision/x/', 'ehr usability', 2000, 40, 1)] // 2% vs 28%
    const gaps = buildCtrGaps(rows)
    expect(gaps).toHaveLength(1)
    // normalizePath strips the trailing slash so /work and /work/ merge.
    expect(gaps[0]).toMatchObject({ query: 'ehr usability', page: '/vision/x', position: 1 })
    expect(gaps[0].url).toBe('https://www.goinvo.com/vision/x')
    expect(gaps[0].expectedCtr).toBeCloseTo(0.28, 5)
  })
})

describe('buildCannibalization (multiple pages competing for one query)', () => {
  it('flags a query two pages compete for and lists both with positions', () => {
    const rows = [
      pageQueryRow('/vision/care-plans/', 'care plans', 600, 30, 4),
      pageQueryRow('/work/care-plan/', 'care plans', 400, 10, 9),
      // A different query that only one page draws → NOT cannibalization.
      pageQueryRow('/vision/solo/', 'debug logging', 800, 40, 3),
    ]
    const out = buildCannibalization(rows)
    const carePlans = out.find((c) => c.query === 'care plans')
    expect(carePlans).toBeDefined()
    expect(carePlans!.pages).toHaveLength(2)
    // normalizePath strips trailing slashes.
    expect(carePlans!.pages.map((p) => p.path).sort()).toEqual(['/vision/care-plans', '/work/care-plan'])
    expect(carePlans!.impressions).toBe(1000)
    expect(carePlans!.bestPosition).toBe(4) // the better of #4 and #9
    expect(out.find((c) => c.query === 'debug logging')).toBeUndefined()
  })

  it('does NOT flag a single dominant page with one trace-impression competitor', () => {
    const rows = [
      pageQueryRow('/vision/main/', 'health visualization', 2000, 100, 2),
      pageQueryRow('/vision/aside/', 'health visualization', 5, 0, 40), // below the per-page floor
    ]
    expect(buildCannibalization(rows)).toEqual([])
  })

  it('ignores brand/junk/legacy and requires real total demand', () => {
    const rows = [
      // Brand query across two pages → excluded.
      pageQueryRow('/a/', 'goinvo', 500, 5, 3),
      pageQueryRow('/b/', 'goinvo', 500, 5, 4),
      // Two pages but tiny total demand → below the min-total floor.
      pageQueryRow('/c/', 'rare term', 40, 1, 3),
      pageQueryRow('/d/', 'rare term', 40, 1, 4),
    ]
    expect(buildCannibalization(rows)).toEqual([])
  })

  it('sorts by demand × number of competing pages (most valuable consolidation first)', () => {
    const rows = [
      // High demand, 2 pages.
      pageQueryRow('/p1/', 'big query', 1000, 20, 5),
      pageQueryRow('/p2/', 'big query', 900, 18, 6),
      // Lower demand, but 3 pages.
      pageQueryRow('/q1/', 'three way', 300, 5, 5),
      pageQueryRow('/q2/', 'three way', 250, 4, 6),
      pageQueryRow('/q3/', 'three way', 200, 3, 7),
    ]
    const out = buildCannibalization(rows)
    expect(out).toHaveLength(2)
    // big query: 1900 × 2 = 3800 ; three way: 750 × 3 = 2250 → big query first.
    expect(out[0].query).toBe('big query')
    expect(out[0].score).toBeGreaterThan(out[1].score)
  })
})

describe('keyEventBoost (business-value score multiplier)', () => {
  it('is a no-op (1.0) when a page has zero leads — demand score is unchanged', () => {
    expect(keyEventBoost(0)).toBe(1)
    expect(keyEventBoost(-5)).toBe(1)
    expect(keyEventBoost(Number.NaN)).toBe(1)
  })

  it('boosts converting pages above 1.0 and grows with more leads', () => {
    const one = keyEventBoost(1)
    const ten = keyEventBoost(10)
    expect(one).toBeGreaterThan(1)
    expect(ten).toBeGreaterThan(one)
  })

  it('caps the boost so a single huge page cannot dominate (≤ +100%)', () => {
    expect(keyEventBoost(1_000_000)).toBeLessThanOrEqual(2)
  })
})
