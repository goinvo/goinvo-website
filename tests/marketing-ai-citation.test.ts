import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_CITATION_PROMPTS,
  aggregateResults,
  buildPromptResult,
  checkAiCitation,
  detectGoinvoCitation,
  detectGoinvoMention,
  extractAnswerText,
  extractCitedUrls,
  extractCompetitors,
  runAiCitationPanel,
  type PromptResult,
} from '@/lib/marketing/aiCitation'

// Build a Responses-API payload in the LIVE shape verified against gpt-4.1 +
// web_search: there is no top-level output_text; the answer text lives in
// output[].content[] (type "output_text") and url citations live in that
// content's annotations[] (type "url_citation", with a `url`). A web_search_call
// item precedes the message item.
function mockResponsesPayload(answerText: string, citationUrls: string[]) {
  return {
    output: [
      { type: 'web_search_call', id: 'ws_1' },
      {
        type: 'message',
        id: 'msg_1',
        content: [
          {
            type: 'output_text',
            text: answerText,
            annotations: citationUrls.map((url, i) => ({
              type: 'url_citation',
              url,
              title: `Source ${i + 1}`,
              start_index: 0,
              end_index: 10,
            })),
          },
        ],
      },
    ],
  }
}

// A fetch stub that returns one canned Responses payload (status 200).
function okFetch(payload: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('payload extraction (live Responses shape)', () => {
  it('joins output_text content blocks when there is no top-level output_text', () => {
    const payload = mockResponsesPayload('GoInvo is a healthcare design studio.', [])
    expect(extractAnswerText(payload)).toBe('GoInvo is a healthcare design studio.')
  })

  it('collects url_citation URLs from annotations, de-duplicated', () => {
    const payload = mockResponsesPayload('text', [
      'https://www.goinvo.com/open-source-health-design?utm_source=openai',
      'https://www.koruux.com/?utm_source=openai',
      'https://www.goinvo.com/open-source-health-design?utm_source=openai',
    ])
    expect(extractCitedUrls(payload)).toEqual([
      'https://www.goinvo.com/open-source-health-design?utm_source=openai',
      'https://www.koruux.com/?utm_source=openai',
    ])
  })

  it('returns empty for a non-object payload without throwing', () => {
    expect(extractAnswerText(null)).toBe('')
    expect(extractCitedUrls(undefined)).toEqual([])
  })
})

describe('GoInvo detection', () => {
  it('detects a GoInvo mention case-insensitively, including "go invo"', () => {
    expect(detectGoinvoMention('GoInvo leads open source health design.')).toBe(true)
    expect(detectGoinvoMention('the studio goinvo works on FHIR')).toBe(true)
    expect(detectGoinvoMention('Go Invo is based in Boston')).toBe(true)
    expect(detectGoinvoMention('Koru UX and Fjord are strong agencies')).toBe(false)
  })

  it('detects a goinvo.com citation in URLs regardless of host casing / params', () => {
    expect(
      detectGoinvoCitation(['https://www.GoInvo.com/open-source?utm_source=openai']),
    ).toEqual(['https://www.GoInvo.com/open-source?utm_source=openai'])
    expect(detectGoinvoCitation(['https://www.koruux.com/'])).toEqual([])
  })
})

describe('buildPromptResult — the three scenarios', () => {
  it('mentions GoInvo + cites goinvo.com → both true', () => {
    const payload = mockResponsesPayload(
      'GoInvo leads the Open Source Health Design initiative for healthcare.',
      ['https://www.goinvo.com/open-source-health-design?utm_source=openai'],
    )
    const result = buildPromptResult('test prompt', payload)
    expect(result.goinvoMentioned).toBe(true)
    expect(result.goinvoCited).toBe(true)
    expect(result.citedGoinvoUrls).toEqual([
      'https://www.goinvo.com/open-source-health-design?utm_source=openai',
    ])
    expect(result.allCitedUrls).toHaveLength(1)
  })

  it('mentions a competitor only → both false', () => {
    const payload = mockResponsesPayload(
      [
        'Here are leading healthcare UX design agencies:',
        '1. **Koru UX** — an award-winning healthcare UX design agency',
        '2. **Fuselab Creative** — designs health apps',
      ].join('\n'),
      ['https://www.koruux.com/?utm_source=openai'],
    )
    const result = buildPromptResult('test prompt', payload)
    expect(result.goinvoMentioned).toBe(false)
    expect(result.goinvoCited).toBe(false)
    expect(result.citedGoinvoUrls).toEqual([])
    // The competitor heuristic should surface at least one rival firm name.
    expect(result.competitorsMentioned.length).toBeGreaterThan(0)
    expect(result.competitorsMentioned.map((c) => c.toLowerCase())).toContain('koru ux')
    expect(result.competitorsMentioned.map((c) => c.toLowerCase())).not.toContain('goinvo')
  })

  it('cites goinvo.com but the text does not name GoInvo → cited true, mentioned false', () => {
    const payload = mockResponsesPayload(
      'One studio leads open source health design and data visualization in healthcare.',
      ['https://www.goinvo.com/vision/determinants-of-health?utm_source=openai'],
    )
    const result = buildPromptResult('test prompt', payload)
    expect(result.goinvoMentioned).toBe(false)
    expect(result.goinvoCited).toBe(true)
    expect(result.citedGoinvoUrls).toHaveLength(1)
  })
})

describe('extractCompetitors (best-effort heuristic)', () => {
  it('pulls firm names from a list-style answer and excludes GoInvo + generic phrases', () => {
    const answer = [
      'Here are the best healthcare design agencies:',
      '1. **GoInvo** — open source health design',
      '2. **Koru UX** — award-winning UX design agency',
      '3. **Fuselab Creative** — healthcare UX design services',
      '4. **IDEO** — human-centered design firm',
    ].join('\n')
    const competitors = extractCompetitors(answer).map((c) => c.toLowerCase())
    expect(competitors).toContain('koru ux')
    expect(competitors).toContain('fuselab creative')
    expect(competitors).toContain('ideo')
    expect(competitors).not.toContain('goinvo')
    expect(competitors).not.toContain('healthcare design')
  })

  it('returns nothing when there is no firm/design context', () => {
    expect(extractCompetitors('The weather in Boston is pleasant today.')).toEqual([])
  })
})

describe('aggregateResults — rates and competitor tally', () => {
  function r(over: Partial<PromptResult>): PromptResult {
    return {
      prompt: 'p',
      answerText: '',
      goinvoMentioned: false,
      goinvoCited: false,
      citedGoinvoUrls: [],
      allCitedUrls: [],
      competitorsMentioned: [],
      ...over,
    }
  }

  it('computes mention/citation rates over ANSWERED prompts only', () => {
    const results = [
      r({ goinvoMentioned: true, goinvoCited: true }),
      r({ goinvoMentioned: true, goinvoCited: false }),
      r({ goinvoMentioned: false, goinvoCited: false }),
      r({ goinvoMentioned: false, goinvoCited: false }),
      r({ error: 'boom' }), // excluded from the denominator
    ]
    const agg = aggregateResults(results)
    expect(agg.answeredCount).toBe(4)
    expect(agg.mentionedCount).toBe(2)
    expect(agg.citedCount).toBe(1)
    expect(agg.mentionRate).toBe(0.5)
    expect(agg.citationRate).toBe(0.25)
  })

  it('tallies topCompetitors across prompts, most-mentioned first', () => {
    const results = [
      r({ competitorsMentioned: ['Koru UX', 'IDEO'] }),
      r({ competitorsMentioned: ['Koru UX', 'Fjord'] }),
      r({ competitorsMentioned: ['Koru UX'] }),
    ]
    const agg = aggregateResults(results)
    expect(agg.topCompetitors[0]).toEqual({ name: 'Koru UX', count: 3 })
    const names = agg.topCompetitors.map((c) => c.name)
    expect(names).toContain('IDEO')
    expect(names).toContain('Fjord')
  })

  it('returns zero rates (no throw) when every prompt errored', () => {
    const agg = aggregateResults([r({ error: 'a' }), r({ error: 'b' })])
    expect(agg.answeredCount).toBe(0)
    expect(agg.mentionRate).toBe(0)
    expect(agg.citationRate).toBe(0)
    expect(agg.topCompetitors).toEqual([])
  })
})

describe('checkAiCitation — graceful by design', () => {
  it('returns an error-flagged result (no throw) when there is no API key', async () => {
    const result = await checkAiCitation('test prompt', { apiKey: '' })
    expect(result.error).toMatch(/OPENAI_API_KEY/)
    expect(result.goinvoMentioned).toBe(false)
    expect(result.goinvoCited).toBe(false)
  })

  it('flags an error (no throw) on a non-200 response', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 429 })) as unknown as typeof fetch
    const result = await checkAiCitation('test prompt', { apiKey: 'sk-test', fetchImpl })
    expect(result.error).toMatch(/429/)
  })

  it('flags an error (no throw) when fetch rejects', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const result = await checkAiCitation('test prompt', { apiKey: 'sk-test', fetchImpl })
    expect(result.error).toMatch(/network down/)
  })

  it('parses a successful web-search response into mention/citation flags', async () => {
    const payload = mockResponsesPayload('GoInvo is a healthcare studio.', [
      'https://www.goinvo.com/?utm_source=openai',
    ])
    const result = await checkAiCitation('test prompt', { apiKey: 'sk-test', fetchImpl: okFetch(payload) })
    expect(result.error).toBeUndefined()
    expect(result.goinvoMentioned).toBe(true)
    expect(result.goinvoCited).toBe(true)
  })
})

describe('runAiCitationPanel — graceful panel', () => {
  it('returns a clearly-unavailable snapshot (no throw) when there is no API key', async () => {
    const snapshot = await runAiCitationPanel(['q1', 'q2'], { apiKey: '' })
    expect(snapshot.unavailable).toBe(true)
    expect(snapshot.unavailableReason).toMatch(/OPENAI_API_KEY/)
    expect(snapshot.results).toEqual([])
    expect(snapshot.promptCount).toBe(2)
    expect(snapshot.aggregate.mentionRate).toBe(0)
    // The lib does NOT stamp runDate — the route does.
    expect(snapshot.runDate).toBeUndefined()
  })

  it('runs the panel and still returns when one prompt errors mid-run', async () => {
    const goodPayload = mockResponsesPayload('GoInvo leads open source health design.', [
      'https://www.goinvo.com/open-source-health-design',
    ])
    // First prompt 200, second prompt 500 (errors), third prompt 200.
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call += 1
      if (call === 2) return new Response('server error', { status: 500 })
      return new Response(JSON.stringify(goodPayload), { status: 200 })
    }) as unknown as typeof fetch

    const snapshot = await runAiCitationPanel(['q1', 'q2', 'q3'], {
      apiKey: 'sk-test',
      fetchImpl,
      concurrency: 1, // deterministic ordering so the 2nd call is the error
    })

    expect(snapshot.unavailable).toBeFalsy()
    expect(snapshot.results).toHaveLength(3)
    expect(snapshot.promptCount).toBe(3)
    expect(snapshot.answeredCount).toBe(2)
    // The errored prompt is flagged but the panel carried on.
    const errored = snapshot.results.filter((rr) => rr.error)
    expect(errored).toHaveLength(1)
    expect(errored[0].error).toMatch(/500/)
    // Rates are over the 2 answered prompts (both mentioned + cited GoInvo).
    expect(snapshot.aggregate.mentionRate).toBe(1)
    expect(snapshot.aggregate.citationRate).toBe(1)
  })

  it('exposes a fixed 12-prompt panel for trend stability', () => {
    expect(AI_CITATION_PROMPTS).toHaveLength(12)
    expect(AI_CITATION_PROMPTS[0]).toBe('What are the best healthcare design agencies?')
  })
})
