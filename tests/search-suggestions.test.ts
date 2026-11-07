import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { EMPTY_STATE_QUERIES, EXAMPLE_QUERIES, SUGGESTED_QUERIES, storedAnswer } from '@/lib/search/suggested'

/**
 * Rule: every search the homepage suggests has a stored answer (instant, no model call),
 * and every stored answer is a real AI selection of our own pages. A suggestion without
 * one would make the "No results" screen offer a search that is slow or itself empty.
 * Rebuild with scripts/build-search-suggestions.mjs.
 */
describe('suggested searches', () => {
  it('offers examples beside the box and suggestions for when nothing fits', () => {
    expect(EXAMPLE_QUERIES.length).toBeGreaterThan(0)
    expect(EMPTY_STATE_QUERIES.length).toBeGreaterThan(0)
  })

  it.each(SUGGESTED_QUERIES.map(item => [item.query]))('has a stored, AI-selected answer: %s', query => {
    const answer = storedAnswer(query) as { aiGenerated?: boolean; results?: { href: string; title: string }[] } | null
    expect(answer, `no stored answer for "${query}"; run scripts/build-search-suggestions.mjs`).not.toBeNull()
    expect(answer!.aiGenerated).toBe(true)
    expect(answer!.results!.length).toBeGreaterThan(0)
    for (const result of answer!.results!) expect(result.href.startsWith('/'), `${result.title} links off the site`).toBe(true)
  })

  it('finds a stored answer however the question is typed', () => {
    const [first] = EMPTY_STATE_QUERIES
    expect(storedAnswer(`  ${first.query.toUpperCase()}?  `)).toBe(storedAnswer(first.query))
  })

  it('keeps the build script normalizing the same way as the module', () => {
    const script = readFileSync('scripts/build-search-suggestions.mjs', 'utf8')
    const source = readFileSync('src/lib/search/suggested.ts', 'utf8')
    const body = source.match(/export function normalizeQuery[^{]*\{\s*return (.*)$/m)?.[1]?.trim()
    expect(body, 'normalizeQuery body').toBeTruthy()
    expect(script.replace(/\s+/g, ' ')).toContain(body!.replace(/\s+/g, ' '))
  })
})
