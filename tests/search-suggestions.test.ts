import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { EXAMPLE_QUERIES, LINE_SUGGESTION, SUGGESTED_QUERIES, storedAnswer } from '@/lib/search/suggested'

/**
 * Rule: every search the homepage suggests has a stored answer (instant, no model call),
 * and every stored answer is a real AI selection of our own pages. A suggestion without
 * one would make the "No results" screen offer a search that is slow or itself empty.
 * Rebuild with scripts/build-search-suggestions.mjs.
 */
describe('suggested searches', () => {
  it('offers one suggestion on the empty line and the others beside the box', () => {
    expect(SUGGESTED_QUERIES).toContain(LINE_SUGGESTION)
    expect(EXAMPLE_QUERIES.length).toBeGreaterThan(0)
    expect(EXAMPLE_QUERIES).not.toContain(LINE_SUGGESTION)
  })

  it.each(SUGGESTED_QUERIES.map(item => [item.label, item]))('suggests a problem in a reader\'s own words, not a category: %s', (_, item) => {
    // What the reader sees is exactly what is searched, and it is a sentence, not a topic.
    expect(item.query).toBe(item.label)
    expect(item.label.split(/\s+/).length, `"${item.label}" reads as a category`).toBeGreaterThanOrEqual(4)
  })

  it.each(SUGGESTED_QUERIES.map(item => [item.query]))('has a stored, AI-selected answer: %s', query => {
    const answer = storedAnswer(query) as { aiGenerated?: boolean; results?: { href: string; title: string }[] } | null
    expect(answer, `no stored answer for "${query}"; run scripts/build-search-suggestions.mjs`).not.toBeNull()
    expect(answer!.aiGenerated).toBe(true)
    expect(answer!.results!.length).toBeGreaterThan(0)
    for (const result of answer!.results!) expect(result.href.startsWith('/'), `${result.title} links off the site`).toBe(true)
  })

  it('finds a stored answer however the question is typed', () => {
    const [first] = SUGGESTED_QUERIES
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
