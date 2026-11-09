import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { redactSearchText, searchLogEntry, searchVia } from '@/lib/search/searchLog'
import { datasetForType } from '@/lib/marketing/datasetRouting'
import { LINE_SUGGESTION } from '@/lib/search/suggested'

const mocks = vi.hoisted(() => ({ afterQueue: [] as (() => unknown)[], recordSearch: vi.fn(async () => true) }))
vi.mock('next/server', async importOriginal => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (task: () => unknown) => void mocks.afterQueue.push(task) }
})
vi.mock('@/lib/search/index', () => ({ getSearchIndex: async () => [], resolveAnchor: () => null }))
vi.mock('@/lib/search/searchLog.server', () => ({ recordSearch: mocks.recordSearch, deploymentEnv: () => 'test', SITE_SEARCH_TYPE: 'marketingSiteSearch' }))

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

async function search(body: object, userAgent = BROWSER) {
  const { POST } = await import('@/app/api/search/route')
  const response = await POST(new NextRequest('http://localhost/api/search', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': userAgent }, body: JSON.stringify(body) }))
  for (const task of mocks.afterQueue.splice(0)) await task()
  return response
}

/**
 * Rule: every answered homepage search is kept for analytics, in the private dataset,
 * with nothing that identifies the visitor and no contact details they typed.
 */
describe('homepage search log', () => {
  beforeEach(() => { mocks.recordSearch.mockClear(); mocks.afterQueue.length = 0 })

  it('replaces contact details and long numbers, and keeps years and counts', () => {
    expect(redactSearchText('email me at jane.doe@example.org about our portal')).toBe('email me at [email] about our portal')
    expect(redactSearchText('call 617-555-0142 or +1 (617) 555 0142')).toBe('call [number] or [number]')
    expect(redactSearchText('member 123456789 cannot log in')).toBe('member [number] cannot log in')
    expect(redactSearchText('15 tools since 2026 for 3 teams')).toBe('15 tools since 2026 for 3 teams')
  })

  it('keeps what was asked, how, and what answered, in rank order', () => {
    const entry = searchLogEntry({
      query: 'Our nurses hate the EHR, ask jo@example.com',
      via: 'typed', source: 'ai', latencyMs: 812.4, env: 'preview', at: new Date('2026-11-09T12:00:00Z'),
      answer: { aiGenerated: true, results: [{ slug: 'maya-ehr', fit: 'direct' }, { slug: 'prior-auth', fit: 'adjacent' }], alsoRelated: [{ slug: 'guidelines' }], insight: 'Write to jo@example.com', persona: 'clinician' },
    })
    expect(entry).toMatchObject({ at: '2026-11-09T12:00:00.000Z', env: 'preview', query: 'Our nurses hate the EHR, ask [email]', via: 'typed', source: 'ai', aiGenerated: true, resultCount: 2, lead: 'maya-ehr', alsoRelated: ['guidelines'], insight: 'Write to [email]', persona: 'clinician', latencyMs: 812 })
    expect(entry.results.map(result => [result.rank, result.slug, result.fit])).toEqual([[1, 'maya-ehr', 'direct'], [2, 'prior-auth', 'adjacent']])
    expect(Object.keys(entry)).not.toEqual(expect.arrayContaining(['ip']))
  })

  it('reads an unknown start as typed', () => {
    expect(searchVia('example')).toBe('example')
    expect(searchVia('drop table')).toBe('typed')
  })

  it('is written to the private dataset', () => {
    expect(datasetForType('marketingSiteSearch', 'production')).not.toBe('production')
  })

  it('records an answered search through the real route, after the reply', async () => {
    const stored = await search({ query: LINE_SUGGESTION.query, via: 'line-suggestion' })
    expect(stored.status).toBe(200)
    expect(mocks.recordSearch).toHaveBeenCalledTimes(1)
    expect(mocks.recordSearch.mock.calls[0][0]).toMatchObject({ via: 'line-suggestion', source: 'stored', env: 'test', aiGenerated: true })
    expect((mocks.recordSearch.mock.calls[0][0] as { resultCount: number }).resultCount).toBeGreaterThan(0)

    await search({ query: 'knitting patterns for zebras' })
    expect(mocks.recordSearch).toHaveBeenCalledTimes(2)
    expect(mocks.recordSearch.mock.calls[1][0]).toMatchObject({ via: 'typed', source: 'none', resultCount: 0 })
  })

  it('does not record bots, the instant first paint, rebuilds or simulated states', async () => {
    await search({ query: LINE_SUGGESTION.query }, 'Mozilla/5.0 HeadlessChrome/130.0')
    await search({ query: 'knitting patterns for zebras', instant: true })
    await search({ query: 'knitting patterns for zebras', fresh: true })
    await search({ query: 'knitting patterns for zebras', simulate: 'ai-unavailable' })
    expect(mocks.recordSearch).not.toHaveBeenCalled()
  })
})
