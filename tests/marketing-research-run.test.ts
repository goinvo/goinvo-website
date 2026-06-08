import { describe, expect, it } from 'vitest'
import {
  buildAnalyticsSignalResearchResults,
  buildSemrushKeywordDifficultyUrl,
  buildSemrushKeywordOverviewUrl,
  parseSemrushKeywordDifficulty,
  parseSemrushKeywordOverview,
  summarizeHtmlSource,
} from '@/app/api/marketing/research/run/route'

describe('marketing research run Semrush helpers', () => {
  it('builds Semrush URLs for overview and difficulty reports with a regional database', () => {
    const overview = buildSemrushKeywordOverviewUrl({
      apiKey: 'test-key',
      keywords: ['housing data', 'health data privacy'],
      database: 'us',
    })
    const difficulty = buildSemrushKeywordDifficultyUrl({
      apiKey: 'test-key',
      keywords: ['housing data', 'health data privacy'],
      database: 'us',
    })

    expect(overview).toContain('type=phrase_these')
    expect(overview).toContain('database=us')
    expect(overview).toContain('export_columns=Ph%2CNq%2CCp%2CCo%2CNr%2CIn')
    expect(new URL(overview).searchParams.get('phrase')).toBe('housing data;health data privacy')

    expect(difficulty).toContain('type=phrase_kdi')
    expect(difficulty).toContain('database=us')
    expect(difficulty).toContain('export_columns=Ph%2CKd')
  })

  it('parses provider keyword scores without inventing missing fields', () => {
    const overview = parseSemrushKeywordOverview(
      [
        'Keyword;Search Volume;CPC;Competition;Number of Results;Intent',
        'housing data;590;2.50;0.14;14000000;1',
        'health data privacy;90;8.40;0.48;2400000;2',
      ].join('\n'),
    )
    const difficulty = parseSemrushKeywordDifficulty(
      ['Keyword;Keyword Difficulty Index', 'housing data;47.10', 'health data privacy;71.35'].join('\n'),
    )

    expect(overview).toEqual([
      expect.objectContaining({
        keyword: 'housing data',
        volume: 590,
        cpc: 2.5,
        competition: 0.14,
        resultsCount: 14000000,
        intent: '1',
      }),
      expect.objectContaining({
        keyword: 'health data privacy',
        volume: 90,
        cpc: 8.4,
        competition: 0.48,
        resultsCount: 2400000,
        intent: '2',
      }),
    ])
    expect(difficulty).toEqual([
      expect.objectContaining({ keyword: 'housing data', difficulty: 47.1 }),
      expect.objectContaining({ keyword: 'health data privacy', difficulty: 71.35 }),
    ])
  })

  it('extracts readable source summaries for research findings', () => {
    const summary = summarizeHtmlSource(
      [
        '<html><head><title>Housing data in Boston</title><meta name="description" content="Boston housing costs are rising faster than wages."></head>',
        '<body><h1>Housing Truths</h1><h2>Cost burden</h2><p>Housing data shows that renters are facing growing affordability pressure across Boston neighborhoods.</p></body></html>',
      ].join(''),
      'https://example.com/housing',
    )

    expect(summary.title).toBe('Housing data in Boston')
    expect(summary.summary).toBe('Boston housing costs are rising faster than wages.')
    expect(summary.headings).toContain('Housing Truths')
    expect(summary.text).toContain('renters are facing growing affordability pressure')
  })

  it('turns first-party performance signals into analytics research results without fake SEO scores', () => {
    const results = buildAnalyticsSignalResearchResults(
      {
        _id: 'project-1',
        title: 'Housing Truths research project',
        canonicalUrl: 'https://housingtruths.org',
      },
      [
        {
          _id: 'signal-1',
          title: 'Boston housing query lift',
          provider: 'gsc',
          status: 'suggestsUpdate',
          signalType: 'query',
          sourceLabel: 'Search Console export',
          query: 'boston housing statistics',
          pageUrl: 'https://housingtruths.org/boston',
          metrics: [{ label: 'Clicks', value: 42, unit: 'clicks', change: '+18%' }],
          interpretation: 'People are finding the Boston housing page through data-oriented queries.',
          recommendation: 'Prioritize a Boston-specific content opportunity and link it from social.',
        },
      ],
    )

    expect(results).toEqual([
      expect.objectContaining({
        title: 'Boston housing query lift analytics signal',
        provider: 'analytics',
        sourceMethod: 'performance-signal:gsc',
        scoreSource: 'provider',
        keyword: 'boston housing statistics',
        canonicalUrl: 'https://housingtruths.org/boston',
        performanceSignalId: 'signal-1',
        priority: 'high',
      }),
    ])
    expect(results[0].rawProviderMetadata).toMatchObject({
      provider: 'gsc',
      metrics: [expect.objectContaining({ label: 'Clicks', value: 42 })],
    })
  })
})
