/**
 * Surveying the terrain: what the field keeps complaining about.
 *
 * Rules pinned here, each of which would fail silently:
 *   - a web complaint survives only if the search really returned its URL, and
 *     the dropped ones are counted, not hidden;
 *   - a pain points at real signals by id; an invented id resolves to nothing
 *     and a pain with no real signal is dropped;
 *   - "opening" needs our work behind it, or it is only worth watching;
 *   - a signal seen in an earlier week is not counted again (trends would
 *     otherwise rise on re-reads of the same report);
 *   - trends are arithmetic: one extra mention of a rare pain is not a surge.
 */
import { describe, expect, it } from 'vitest'

import { numberWork } from '@/lib/marketing/marquetaSuggest'
import {
  freshSignals,
  painTrend,
  parseAppStoreReviews,
  parseFdaEvents,
  parseHnHits,
  parsePubmedSummaries,
  parseTerrain,
  rankPains,
  signalKey,
  withTrends,
  type TerrainPain,
  type TerrainSignal,
} from '@/lib/marketing/terrainRecon'

const LONG = 'The pump paused delivery and the screen gave no clear reason, so the nurse restarted it twice.'

describe('source parsers', () => {
  it('reads an openFDA report: its own words, a link to the public record, the date', () => {
    const [entry] = parseFdaEvents({
      results: [
        {
          mdr_report_key: '50115422',
          date_received: '20260803',
          mdr_text: [
            { text_type_code: 'Additional Manufacturer Narrative', text: 'Initial.' },
            { text_type_code: 'Description of Event or Problem', text: LONG },
          ],
          device: [{ brand_name: 'iLet', generic_name: 'insulin pump', device_report_product_code: 'QFG' }],
        },
      ],
    })
    expect(entry).toMatchObject({ source: 'fda', quote: LONG, publishedAt: '2026-08-03', verified: true })
    expect(entry.url).toBe('https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/detail.cfm?mdrfoi__id=50115422&pc=QFG')
  })

  it('keeps only 1-2 star App Store reviews inside the window', () => {
    const review = (rating: string, updated: string) => ({
      'im:rating': { label: rating },
      updated: { label: updated },
      title: { label: 'Cannot see results' },
      content: { label: 'Every update logs me out and my test results take a week to show up in the app.' },
    })
    const found = parseAppStoreReviews(
      { feed: { entry: [review('1', '2026-10-01T00:00:00Z'), review('5', '2026-10-01T00:00:00Z'), review('2', '2026-08-01T00:00:00Z')] } },
      { appId: '382952264', appName: 'MyChart', since: new Date('2026-09-20T00:00:00Z') },
    )
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ source: 'appstore', title: 'MyChart review (1★)' })
  })

  it('reads Hacker News comments with the markup stripped', () => {
    const [entry] = parseHnHits({
      hits: [{ objectID: '42', created_at: '2026-10-02T10:00:00Z', story_title: 'Epic', comment_text: '<p>Our EHR makes nurses chart the same vitals in three places &amp; nobody can fix it.</p>' }],
    })
    expect(entry.url).toBe('https://news.ycombinator.com/item?id=42')
    expect(entry.quote).toBe('Our EHR makes nurses chart the same vitals in three places & nobody can fix it.')
  })

  it('reads PubMed titles as evidence of a pain', () => {
    const [entry] = parsePubmedSummaries({
      result: { uids: ['42818468'], '42818468': { title: 'Usability and workflow implications of an EHR-integrated phenotyping tool.', source: 'medRxiv', sortpubdate: '2026/09/23 00:00' } },
    })
    expect(entry).toMatchObject({ source: 'pubmed', url: 'https://pubmed.ncbi.nlm.nih.gov/42818468/', publishedAt: '2026-09-23' })
  })

  it('ignores fragments too short to be a complaint', () => {
    expect(parseHnHits({ hits: [{ objectID: '1', comment_text: 'Agreed.' }] })).toEqual([])
  })
})

describe('freshSignals: a re-read is not a new complaint', () => {
  it('drops signals earlier scans saw, and duplicates within this one', () => {
    const a = parseHnHits({ hits: [{ objectID: '1', comment_text: LONG }] })[0]
    const b = parseHnHits({ hits: [{ objectID: '2', comment_text: `${LONG} Again.` }] })[0]
    expect(freshSignals([a, a, b], [a.key]).map((entry) => entry.key)).toEqual([b.key])
    expect(signalKey('hn', a.url, a.quote)).toBe(a.key)
  })
})

const WORK = numberWork([{ title: 'Determinants of Health', url: 'https://www.goinvo.com/vision/determinants-of-health', kind: 'essay' }])
const signals: TerrainSignal[] = parseHnHits({
  hits: [
    { objectID: '1', comment_text: LONG },
    { objectID: '2', comment_text: `${LONG} It happened again on the next shift.` },
  ],
})

describe('parseTerrain: only what we can stand behind', () => {
  const answer = (body: Record<string, unknown>) => JSON.stringify(body)

  it('keeps a web complaint only when the search returned its URL, and counts the rest', () => {
    const parsed = parseTerrain(
      answer({
        webSignals: [
          { id: 'X1', url: 'https://www.reddit.com/r/nursing/comments/abc/charting/?utm_source=x', title: 'Charting', quote: 'We spend more time clicking boxes than with patients, every single shift.' },
          { id: 'X2', url: 'https://example.org/made-up', title: 'Invented', quote: 'A complaint nobody searched for, written by the model.' },
        ],
        pains: [{ key: 'charting-burden', label: 'Charting eats the shift', signalIds: ['S1', 'X1', 'X2'], stance: 'watch' }],
      }),
      { signals, work: WORK, searchedUrls: ['https://www.reddit.com/r/nursing/comments/abc/charting'], objectiveKeys: [] },
    )!
    expect(parsed.webSignals.map((entry) => entry.url)).toEqual(['https://www.reddit.com/r/nursing/comments/abc/charting/?utm_source=x'])
    expect(parsed.webSignals[0].verified).toBe(false) // confirmed only after the page fetch
    expect(parsed.droppedWeb).toBe(1)
    expect(parsed.pains[0].signalKeys).toHaveLength(2)
  })

  it('drops a pain whose signals are all invented', () => {
    const parsed = parseTerrain(
      answer({ pains: [{ key: 'ghost', label: 'A pain with no evidence', signalIds: ['S9', 'X7'] }] }),
      { signals, work: WORK, searchedUrls: [], objectiveKeys: [] },
    )!
    expect(parsed.pains).toEqual([])
  })

  it('downgrades an "opening" with none of our work behind it, and filters unknown objectives', () => {
    const parsed = parseTerrain(
      answer({
        pains: [
          { key: 'a', label: 'With proof', signalIds: ['S1'], stance: 'opening', ourWork: ['W1'], objectiveKeys: ['real', 'invented'] },
          { key: 'b', label: 'No proof', signalIds: ['S2'], stance: 'opening', ourWork: ['W9'] },
        ],
      }),
      { signals, work: WORK, searchedUrls: [], objectiveKeys: ['real'] },
    )!
    expect(parsed.pains.map((pain) => [pain.key, pain.stance])).toEqual([
      ['a', 'opening'],
      ['b', 'watch'],
    ])
    expect(parsed.pains[0].ourWork).toEqual([{ title: 'Determinants of Health', url: 'https://www.goinvo.com/vision/determinants-of-health' }])
    expect(parsed.pains[0].objectiveKeys).toEqual(['real'])
  })

  it('refuses an answer that is not the contract', () => {
    expect(parseTerrain('no json here', { signals, work: WORK, searchedUrls: [], objectiveKeys: [] })).toBeNull()
  })
})

describe('trends: arithmetic, not the model’s say-so', () => {
  it('calls a never-seen pain new, a real jump rising, a real drop fading', () => {
    expect(painTrend(3, [])).toBe('new')
    expect(painTrend(3, [0, 0])).toBe('new')
    expect(painTrend(9, [3, 4, 5])).toBe('rising')
    expect(painTrend(1, [5, 6, 5])).toBe('fading')
    expect(painTrend(5, [4, 5, 6])).toBe('steady')
  })

  it('does not call one extra mention of a rare pain a surge', () => {
    expect(painTrend(2, [1, 1, 1])).toBe('steady')
  })

  it('reads history oldest first, from the last scans only', () => {
    const [pain] = withTrends(
      [{ key: 'k', label: 'L', summary: '', signalKeys: ['s'], count: 8, segments: [], stance: 'watch', whyItMatters: '', ourWork: [], objectiveKeys: [] }],
      [
        { week: '2026-W38', pains: [{ key: 'k', count: 2 }] },
        { week: '2026-W36', pains: [{ key: 'k', count: 1 }] },
        { week: '2026-W37', pains: [] },
      ],
    )
    expect(pain.history).toEqual([1, 0, 2])
    expect(pain.trend).toBe('rising')
  })

  it('ranks rising before steady, openings before watch', () => {
    const pain = (key: string, trend: TerrainPain['trend'], stance: TerrainPain['stance']): TerrainPain => ({
      key, label: key, summary: '', signalKeys: [], count: 1, trend, history: [], segments: [], stance, whyItMatters: '', ourWork: [], objectiveKeys: [],
    })
    expect(rankPains([pain('a', 'steady', 'opening'), pain('b', 'rising', 'watch'), pain('c', 'rising', 'opening')]).map((entry) => entry.key)).toEqual(['c', 'b', 'a'])
  })
})
