import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCannibalization,
  buildCtrGaps,
  buildDecay,
  buildIntentMismatches,
  buildIntentProfile,
  classifyIntent,
  ctrGapFor,
  decayActionFor,
  difficultyRerankFactor,
  enrichQueriesWithKeywordMetrics,
  expectedCtrForPosition,
  keyEventBoost,
  pageIntentFromPath,
  parseKeywordMetrics,
} from '@/app/api/marketing/seo/route'
import { tfKeyword, withTextFocus } from '@/lib/marketing/textfocus'

// These cover the additive OPPORTUNITY-ENGINE features (SEO suite revamp §12):
// the position-adjusted CTR-gap quick-win lane, keyword cannibalization, the
// GA4 key-events business-value boost, the content-decay watchlist (period
// comparison), and the search-intent classification + mismatch detection. All
// exercise the pure helpers exported from the route (no network), matching the
// route-helper test pattern in marketing-research-run.test.ts.

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

// A GSC [page] row (single dimension) for the decay period comparison.
function pageRow(page: string, impressions: number, clicks: number, position: number) {
  return { keys: [page], impressions, clicks, position, ctr: impressions > 0 ? clicks / impressions : 0 }
}

// A GSC [query] row (single dimension) for the intent profile.
function queryRow(query: string, impressions: number, clicks: number, position: number) {
  return { keys: [query], impressions, clicks, position, ctr: impressions > 0 ? clicks / impressions : 0 }
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

describe('buildDecay (content-decay watchlist — 90d vs prior 90d)', () => {
  it('flags a page that lost impressions, clicks, and position across both windows', () => {
    const recent = [pageRow('/vision/decaying/', 400, 8, 9)]
    const prior = [pageRow('/vision/decaying/', 1000, 30, 4)]
    const out = buildDecay(recent, prior)
    const watch = out.find((d) => d.path === '/vision/decaying')
    expect(watch).toBeDefined()
    // All three signals declined (impressions -60%, clicks -73%, position +5).
    expect(watch!.decliningSignals).toBe(3)
    expect(watch!.impressionsPctChange).toBeLessThan(0)
    expect(watch!.positionDelta).toBeGreaterThan(0)
    // A real, non-legacy page with a sustained decline → refresh.
    expect(watch!.action).toBe('refresh')
    // Copy gate: the refresh hint must demand a SUBSTANTIVE change, not a date bump.
    expect(watch!.fixHint).toMatch(/SUBSTANTIVE/)
    expect(watch!.fixHint).toMatch(/date/i)
  })

  it('does NOT flag a single-signal blip (only impressions dipped a little)', () => {
    // Impressions -10% (below the 20% floor), clicks/position steady → no flag.
    const recent = [pageRow('/vision/steady/', 900, 30, 4)]
    const prior = [pageRow('/vision/steady/', 1000, 30, 4)]
    expect(buildDecay(recent, prior)).toEqual([])
  })

  it('does NOT flag pages that never had real prior demand', () => {
    // Big % drop, but only 40 prior impressions → below the demand floor.
    const recent = [pageRow('/vision/tiny/', 5, 0, 20)]
    const prior = [pageRow('/vision/tiny/', 40, 4, 5)]
    expect(buildDecay(recent, prior)).toEqual([])
  })

  it('recommends consolidate for a fading legacy/duplicate URL', () => {
    const recent = [pageRow('/features/old-thing.html', 300, 2, 18)]
    const prior = [pageRow('/features/old-thing.html', 1200, 40, 6)]
    const out = buildDecay(recent, prior)
    const watch = out.find((d) => d.path === '/features/old-thing.html')
    expect(watch).toBeDefined()
    expect(watch!.action).toBe('consolidate')
    expect(watch!.fixHint).toMatch(/301-redirect/)
  })

  it('handles a page that vanished entirely from the recent window', () => {
    // No recent row at all → 0 impressions/clicks now, was strong before.
    const out = buildDecay([], [pageRow('/vision/gone/', 800, 25, 3)])
    const watch = out.find((d) => d.path === '/vision/gone')
    expect(watch).toBeDefined()
    expect(watch!.recentImpressions).toBe(0)
    expect(watch!.impressionsPctChange).toBeCloseTo(-1, 5)
    expect(watch!.action).toBe('refresh')
  })

  it('sorts by lost impressions × declining signals (biggest sustained loss first)', () => {
    const recent = [pageRow('/big/', 500, 10, 9), pageRow('/small/', 600, 12, 8)]
    const prior = [pageRow('/big/', 3000, 90, 4), pageRow('/small/', 1000, 40, 5)]
    const out = buildDecay(recent, prior)
    expect(out[0].path).toBe('/big')
    expect(out[0].score).toBeGreaterThan(out[1].score)
  })
})

describe('decayActionFor (refresh / consolidate / leave)', () => {
  it('always recommends consolidate for a legacy path regardless of magnitude', () => {
    expect(decayActionFor('/features/x.html', -0.5, 4, 3)).toBe('consolidate')
    expect(decayActionFor('/old/y', -0.25, 1, 2)).toBe('consolidate')
  })

  it('recommends refresh for a real page with a sustained (2+ signal) decline', () => {
    expect(decayActionFor('/vision/a', -0.4, 2, 3)).toBe('refresh')
    expect(decayActionFor('/vision/b', -0.25, 0.8, 2)).toBe('refresh')
  })
})

describe('classifyIntent (rule-based search-intent heuristic)', () => {
  it('classifies informational how/what/why queries', () => {
    expect(classifyIntent('how to design an ehr').intent).toBe('informational')
    expect(classifyIntent('what is open source healthcare').intent).toBe('informational')
    expect(classifyIntent('why interoperability matters').intent).toBe('informational')
  })

  it('classifies commercial provider-evaluation queries', () => {
    expect(classifyIntent('healthcare design agency').intent).toBe('commercial')
    expect(classifyIntent('best ux firm for medical software').intent).toBe('commercial')
    expect(classifyIntent('health design studio portfolio').intent).toBe('commercial')
  })

  it('classifies transactional ready-to-act queries above commercial ones', () => {
    expect(classifyIntent('hire a healthcare design agency').intent).toBe('transactional')
    expect(classifyIntent('ux design agency cost').intent).toBe('transactional')
    expect(classifyIntent('contact goinvo').intent).toBe('transactional')
  })

  it('classifies navigational brand/site lookups', () => {
    expect(classifyIntent('goinvo careers').intent).toBe('navigational')
    expect(classifyIntent('login').intent).toBe('navigational')
  })

  it('returns the matched signal words for auditability and an LLM-refinable confidence', () => {
    const r = classifyIntent('how to hire a design agency')
    // "hire" is transactional and beats "how"/"agency".
    expect(r.intent).toBe('transactional')
    expect(r.signals).toContain('hire')
    expect(r.confidence).toBeGreaterThan(0)
  })

  it('falls back: a long no-signal query reads informational, a short one navigational', () => {
    // No keyword from any rule matches → falls back on word count.
    expect(classifyIntent('precision medicine genomics visualization').intent).toBe('informational')
    expect(classifyIntent('mediopia').intent).toBe('navigational')
  })
})

describe('pageIntentFromPath (page-type intent from the URL shape)', () => {
  it('reads service/work/enterprise paths as commercial', () => {
    expect(pageIntentFromPath('/services')).toBe('commercial')
    expect(pageIntentFromPath('/work/care-plan')).toBe('commercial')
    expect(pageIntentFromPath('/enterprise')).toBe('commercial')
  })
  it('reads contact/quote paths as transactional', () => {
    expect(pageIntentFromPath('/contact')).toBe('transactional')
    expect(pageIntentFromPath('/get-started')).toBe('transactional')
  })
  it('reads vision/article/research paths as informational', () => {
    expect(pageIntentFromPath('/vision/open-source-healthcare')).toBe('informational')
    expect(pageIntentFromPath('/research/foo')).toBe('informational')
  })
})

describe('buildIntentProfile (classifies + ranks top non-brand queries)', () => {
  it('labels each query and sorts by impressions, dropping brand/junk/low-volume', () => {
    const rows = [
      queryRow('healthcare design agency', 800, 20, 3), // commercial
      queryRow('how to design an ehr', 1200, 10, 6), // informational
      queryRow('goinvo agency', 500, 5, 2), // brand → excluded
      queryRow('"exact" "phrase"', 900, 1, 4), // junk (quotes) → excluded
      queryRow('rare term', 5, 0, 9), // below the impressions floor → excluded
    ]
    const profile = buildIntentProfile(rows)
    const queries = profile.map((p) => p.query)
    expect(queries).toContain('healthcare design agency')
    expect(queries).toContain('how to design an ehr')
    expect(queries).not.toContain('goinvo agency')
    expect(queries).not.toContain('"exact" "phrase"')
    expect(queries).not.toContain('rare term')
    // Sorted by impressions (the informational one has more).
    expect(profile[0].query).toBe('how to design an ehr')
    expect(profile.find((p) => p.query === 'healthcare design agency')!.intent).toBe('commercial')
  })
})

describe('buildIntentMismatches (query intent vs ranking-page intent)', () => {
  it('flags a commercial query ranking a purely informational page', () => {
    const rows = [
      // A buy-stage "agency" query whose best page is a vision article.
      pageQueryRow('/vision/health-design/', 'healthcare design agency', 600, 5, 4),
    ]
    const out = buildIntentMismatches(rows)
    const m = out.find((x) => x.query === 'healthcare design agency')
    expect(m).toBeDefined()
    expect(m!.queryIntent).toBe('commercial')
    expect(m!.pageIntent).toBe('informational')
    expect(m!.fixHint).toMatch(/buy-stage/)
  })

  it('does NOT flag a commercial query already ranking a commercial (services/work) page', () => {
    const rows = [pageQueryRow('/work/ehr-redesign/', 'healthcare design agency', 600, 30, 3)]
    expect(buildIntentMismatches(rows)).toEqual([])
  })

  it('does NOT flag an informational query ranking an informational page (intents agree)', () => {
    const rows = [pageQueryRow('/vision/ehr-guide/', 'how to design an ehr', 600, 30, 3)]
    expect(buildIntentMismatches(rows)).toEqual([])
  })

  it('picks the BEST (most-impressions) ranking page and requires real total demand', () => {
    const rows = [
      // Two pages for one commercial query; the article draws the most impressions.
      pageQueryRow('/vision/article/', 'design agency for healthcare', 500, 4, 5),
      pageQueryRow('/work/case/', 'design agency for healthcare', 80, 6, 3),
      // A second commercial query with too little total demand → excluded.
      pageQueryRow('/vision/aside/', 'ux firm', 30, 0, 8),
    ]
    const out = buildIntentMismatches(rows)
    const m = out.find((x) => x.query === 'design agency for healthcare')
    expect(m).toBeDefined()
    // Best page is the high-impressions article → informational → mismatch.
    expect(m!.page).toBe('/vision/article')
    expect(m!.impressions).toBe(580) // total across both competing pages
    expect(out.find((x) => x.query === 'ux firm')).toBeUndefined()
  })

  it('ignores brand, junk, and legacy-path rows', () => {
    const rows = [
      pageQueryRow('/vision/a/', 'goinvo agency', 600, 5, 4), // brand → excluded
      pageQueryRow('/vision/b/', '"agency" "firm"', 600, 5, 4), // junk → excluded
      pageQueryRow('/features/old.html', 'design agency', 600, 5, 4), // legacy → excluded
    ]
    expect(buildIntentMismatches(rows)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// TextFocus keyword enrichment (marketingIdea: seo-keyword-enrichment).
// The opportunity engine folds keyword volume + difficulty (+ CPC) from a
// SINGLE batched tf_keyword call onto the ranked query opportunities. These
// cover: the raw-payload parser (string/number coercion), the modest difficulty
// re-rank, the enrichment merge, and — via a stubbed `fetch` — that the batch is
// ONE array-form call and that a down TextFocus leaves opportunities unchanged.
// ---------------------------------------------------------------------------

// A bare QueryOpportunity for the enrichment tests (only the fields the merge
// reads; the engine produces the rest).
function queryOpp(query: string, impressions: number, score: number) {
  return {
    query,
    impressions,
    clicks: 0,
    ctr: 0,
    position: 5,
    score,
    fix: 'ranking' as const,
    fixHint: '',
  }
}

describe('parseKeywordMetrics (tf_keyword batch → query→metrics map)', () => {
  it('parses the live keyed-object shape, coercing string OR number fields', () => {
    // The exact shape verified against the live API: keyed by the keyword, with
    // volume/difficulty/cost arriving as strings in some entries, numbers in
    // others. cost is the CPC.
    const raw = {
      'healthcare design': { id: 'healthcare design', volume: 720, difficulty: 37, cost: '3.00' },
      'open source healthcare': { id: 'open source healthcare', volume: '20', difficulty: '38', cost: '1.09' },
    }
    const map = parseKeywordMetrics(raw)
    expect(map.get('healthcare design')).toEqual({ volume: 720, difficulty: 37, cpc: 3 })
    expect(map.get('open source healthcare')).toEqual({ volume: 20, difficulty: 38, cpc: 1.09 })
  })

  it('degrades to an empty map on a missing/odd payload (no throw)', () => {
    expect(parseKeywordMetrics(null).size).toBe(0)
    expect(parseKeywordMetrics(undefined).size).toBe(0)
    expect(parseKeywordMetrics('nope').size).toBe(0)
    // An entry with no usable numeric field is dropped, not kept as undefined.
    expect(parseKeywordMetrics({ foo: { id: 'foo' } }).size).toBe(0)
    expect(parseKeywordMetrics({ foo: { volume: 'n/a', difficulty: '' } }).size).toBe(0)
  })
})

describe('difficultyRerankFactor (modest, bounded winnability adjustment)', () => {
  it('is neutral (1.0) for no difficulty and for the mid-difficulty value', () => {
    expect(difficultyRerankFactor(undefined)).toBe(1)
    expect(difficultyRerankFactor(50)).toBeCloseTo(1, 5)
  })

  it('boosts easy keywords and demotes hard ones, both modestly (±15% max)', () => {
    expect(difficultyRerankFactor(0)).toBeCloseTo(1.15, 5) // easiest
    expect(difficultyRerankFactor(100)).toBeCloseTo(0.85, 5) // hardest
    // A low-difficulty keyword reads as more winnable than a high-difficulty one.
    expect(difficultyRerankFactor(20)).toBeGreaterThan(difficultyRerankFactor(80))
    // The adjustment stays modest — never more than ±15%.
    expect(difficultyRerankFactor(0)).toBeLessThanOrEqual(1.15)
    expect(difficultyRerankFactor(100)).toBeGreaterThanOrEqual(0.85)
  })

  it('clamps out-of-range difficulty into the bounded factor', () => {
    expect(difficultyRerankFactor(-50)).toBeCloseTo(1.15, 5)
    expect(difficultyRerankFactor(500)).toBeCloseTo(0.85, 5)
  })
})

describe('enrichQueriesWithKeywordMetrics (attach volume/difficulty + re-rank)', () => {
  it('attaches volume/difficulty/cpc to covered queries and leaves others untouched', () => {
    const queries = [queryOpp('healthcare design', 1000, 1000), queryOpp('uncovered query', 500, 500)]
    const metrics = new Map([['healthcare design', { volume: 720, difficulty: 37, cpc: 3 }]])
    const out = enrichQueriesWithKeywordMetrics(queries, metrics)
    const covered = out.find((q) => q.query === 'healthcare design')!
    expect(covered.volume).toBe(720)
    expect(covered.difficulty).toBe(37)
    expect(covered.cpc).toBe(3)
    const uncovered = out.find((q) => q.query === 'uncovered query')!
    expect(uncovered.volume).toBeUndefined()
    expect(uncovered.difficulty).toBeUndefined()
  })

  it('keeps raw demand visible — impressions are never mutated by the re-rank', () => {
    const queries = [queryOpp('easy term', 1000, 1000)]
    const metrics = new Map([['easy term', { volume: 900, difficulty: 10 }]])
    const out = enrichQueriesWithKeywordMetrics(queries, metrics)
    expect(out[0].impressions).toBe(1000) // demand untouched
    // Easy keyword (difficulty 10) edges the score UP, modestly.
    expect(out[0].score).toBeGreaterThan(1000)
    expect(out[0].score).toBeLessThanOrEqual(1150) // ≤ +15%
  })

  it('folds difficulty into the order — a winnable runner-up can overtake a hard leader', () => {
    // Leader has marginally more demand, but is very hard; the runner-up is very
    // easy. The modest re-rank lets the winnable query overtake.
    const queries = [queryOpp('hard leader', 1000, 1000), queryOpp('easy runner up', 950, 950)]
    const metrics = new Map([
      ['hard leader', { volume: 100, difficulty: 95 }], // ×~0.865 → ~865
      ['easy runner up', { volume: 800, difficulty: 5 }], // ×~1.135 → ~1078
    ])
    const out = enrichQueriesWithKeywordMetrics(queries, metrics)
    expect(out[0].query).toBe('easy runner up')
    expect(out[0].score).toBeGreaterThan(out[1].score)
  })

  it('returns the queries unchanged (same order) when the metrics map is empty', () => {
    const queries = [queryOpp('a', 1000, 1000), queryOpp('b', 500, 500)]
    const out = enrichQueriesWithKeywordMetrics(queries, new Map())
    expect(out).toEqual(queries)
    expect(out[0].volume).toBeUndefined()
  })
})

// --- Integration: the single batched tf_keyword call + graceful down path ---
// Stub the global `fetch` so the real TextFocus client (textfocus.ts) runs
// through withTextFocus + tfKeyword exactly as the route does, without the
// network. Mirrors the fetch-stub pattern in marketing-textfocus.test.ts.
describe('batched TextFocus enrichment (route integration via stubbed fetch)', () => {
  const ORIGINAL_KEY = process.env.TEXTFOCUS_API_KEY

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // The two TextFocus ops the flow hits, in order: the free health-check
  // (tf_account) gate, then the ONE paid tf_keyword batch.
  function accountEnvelope() {
    return { result: { credits: { remaining: 700 } }, response: 200, message: 'ok' }
  }
  function keywordEnvelope(map: Record<string, unknown>) {
    return { result: map, response: 200, message: 'ok' }
  }

  // Capture every fetch so we can assert the keyword op is called exactly once.
  function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as { url?: string })?.url)
      calls.push({ url, init: init ?? {} })
      return handler(url, init ?? {})
    })
    vi.stubGlobal('fetch', fn)
    return calls
  }

  function keywordCalls(calls: Array<{ url: string; init: RequestInit }>) {
    return calls.filter((c) => c.url.includes('tf_keyword'))
  }
  function keywordField(call: { init: RequestInit }): string {
    const body = call.init.body
    const params = body instanceof URLSearchParams ? body : new URLSearchParams(String(body ?? ''))
    return params.get('keyword') ?? ''
  }

  // Replicate the route's enrichment step (one withTextFocus → one tfKeyword
  // batch in array form → parse → enrich) so the test drives the real wiring.
  async function enrichViaBatch(queries: ReturnType<typeof queryOpp>[]) {
    const batchTerms = queries.map((q) => q.query)
    return withTextFocus(async () => {
      const raw = await tfKeyword(JSON.stringify(batchTerms), { lang: 'en-US' })
      return enrichQueriesWithKeywordMetrics(queries, parseKeywordMetrics(raw))
    }, queries)
  }

  beforeEach(() => {
    process.env.TEXTFOCUS_API_KEY = 'test-key-123'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    if (ORIGINAL_KEY === undefined) delete process.env.TEXTFOCUS_API_KEY
    else process.env.TEXTFOCUS_API_KEY = ORIGINAL_KEY
  })

  it('makes ONE batched tf_keyword call (JSON-array form) for the top queries', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('tf_account')) return jsonResponse(accountEnvelope())
      if (url.includes('tf_keyword')) {
        return jsonResponse(
          keywordEnvelope({
            'healthcare design': { volume: 720, difficulty: 37, cost: '3.00' },
            'open source healthcare': { volume: '20', difficulty: '38', cost: '1.09' },
          }),
        )
      }
      return jsonResponse({}, 404)
    })

    const queries = [queryOpp('healthcare design', 1000, 1000), queryOpp('open source healthcare', 800, 800)]
    const out = await enrichViaBatch(queries)

    // Exactly ONE tf_keyword call (not one-per-query) — the credit/daily-cap rule.
    const kw = keywordCalls(calls)
    expect(kw).toHaveLength(1)
    // …and it used the array (batch) form carrying BOTH terms in one request.
    const field = keywordField(kw[0])
    expect(field).toBe(JSON.stringify(['healthcare design', 'open source healthcare']))
    expect(JSON.parse(field)).toEqual(['healthcare design', 'open source healthcare'])

    // Both opportunities came back enriched from the single batch.
    const hd = out.find((q) => q.query === 'healthcare design')!
    expect(hd.volume).toBe(720)
    expect(hd.difficulty).toBe(37)
    expect(hd.cpc).toBe(3)
    const osh = out.find((q) => q.query === 'open source healthcare')!
    expect(osh.volume).toBe(20)
    expect(osh.difficulty).toBe(38)
  })

  it('graceful: TextFocus down (health-check fails) → opportunities UNCHANGED, no keyword call, no throw', async () => {
    // The free health-check fails, so withTextFocus short-circuits to the
    // fallback and never spends a credit on tf_keyword.
    const calls = stubFetch((url) => {
      if (url.includes('tf_account')) return jsonResponse({ message: 'forbidden' }, 403)
      return jsonResponse({}, 500)
    })

    const queries = [queryOpp('healthcare design', 1000, 1000), queryOpp('open source healthcare', 800, 800)]
    const out = await enrichViaBatch(queries)

    // No tf_keyword call was made (the gate blocked it).
    expect(keywordCalls(calls)).toHaveLength(0)
    // Opportunities are returned exactly as today — no volume/difficulty fields.
    expect(out).toEqual(queries)
    expect(out[0].volume).toBeUndefined()
    expect(out[0].difficulty).toBeUndefined()
  })

  it('graceful: tf_keyword itself errors → opportunities UNCHANGED, still one call attempted, no throw', async () => {
    // Health-check passes but the batch call 500s. withTextFocus catches and
    // returns the fallback, so the engine keeps the demand-only opportunities.
    const calls = stubFetch((url) => {
      if (url.includes('tf_account')) return jsonResponse(accountEnvelope())
      return jsonResponse({ message: 'server error' }, 500)
    })

    const queries = [queryOpp('healthcare design', 1000, 1000)]
    const out = await enrichViaBatch(queries)

    expect(keywordCalls(calls)).toHaveLength(1) // attempted once, not retried per-query
    expect(out).toEqual(queries) // unchanged
    expect(out[0].volume).toBeUndefined()
  })
})
